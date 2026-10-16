// Texturas de GPU y materiales TSL del mapa (un solo código para WebGPU y WebGL2, ADR-006).
//
// Terreno: el vertex shader desplaza la grilla del chunk leyendo la altura en XZ de mundo; el
// fragment calcula normales por diferencias centrales (el detalle de luz no depende del LOD), el
// color del bioma, el agua por profundidad (lagos aparte), el relleno por provincia y las
// fronteras (comparando el texel vecino a ~1,5 px: ids distintos = frontera de provincia, colores
// distintos = frontera política).
import {
  abs,
  attribute,
  cameraPosition,
  dot,
  float,
  floor,
  fwidth,
  instancedBufferAttribute,
  length,
  max,
  min,
  mix,
  mod,
  modelWorldMatrix,
  normalize,
  normalLocal,
  positionLocal,
  positionWorld,
  round,
  smoothstep,
  sqrt,
  sRGBTransferEOTF,
  step,
  texture,
  uniform,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';
import {
  ClampToEdgeWrapping,
  DataTexture,
  DoubleSide,
  HalfFloatType,
  type InstancedBufferAttribute,
  LinearFilter,
  MeshBasicNodeMaterial,
  NearestFilter,
  NoColorSpace,
  RepeatWrapping,
  RGBAFormat,
  RGFormat,
  UnsignedByteType,
} from 'three/webgpu';
import type { Node } from 'three/webgpu';
import { BORDERS, LIGHT, MARKERS, MAX_DEPTH_M, PALETTE, RIVERS, SKIRT_DEPTH } from './config';
import { COLOR_TABLE_WIDTH } from './textures';

export function createMapUniforms() {
  return {
    /** Elevación (m) → altura (celdas): exageración × relieve del zoom semántico. */
    heightScale: uniform(0),
    /** Lo mismo para el sombreado. */
    shadeScale: uniform(0),
    fillOpacity: uniform(0),
    provinceBorderAlpha: uniform(0),
    riverMinT: uniform(0),
    /** 2·tan(fov/2) / alto del canvas (px CSS): celdas por px por celda de distancia. */
    pxScale: uniform(0.001),
    /** X de la cámara (wrap de los marcadores instanciados). */
    cameraX: uniform(0),
    /** Provincia seleccionada (0 = ninguna). */
    selected: uniform(0),
  };
}
export type MapUniforms = ReturnType<typeof createMapUniforms>;

export interface MapTextures {
  /** RG16F lineal: elevación (m), máscara de lago. Repite en U (wrap E-O). */
  readonly height: DataTexture;
  /** RGBA8 lineal: color del bioma premultiplicado por la máscara de tierra. */
  readonly surface: DataTexture;
  /** RG8 NEAREST: id de provincia de 16 bits. */
  readonly ids: DataTexture;
  /** RGBA8 NEAREST: color por provincia (tabla de `COLOR_TABLE_WIDTH` de ancho). */
  readonly colors: DataTexture;
  /** Columnas y filas del ráster (celdas). */
  readonly cols: number;
  readonly rows: number;
}

function dataTexture(
  data: Uint8Array | Uint16Array,
  width: number,
  height: number,
  format: typeof RGBAFormat | typeof RGFormat,
  type: typeof UnsignedByteType | typeof HalfFloatType,
  filter: typeof LinearFilter | typeof NearestFilter,
  repeatU: boolean,
): DataTexture {
  const tex = new DataTexture(data, width, height, format, type);
  tex.colorSpace = NoColorSpace;
  tex.wrapS = repeatU ? RepeatWrapping : ClampToEdgeWrapping;
  tex.wrapT = ClampToEdgeWrapping;
  tex.magFilter = filter;
  tex.minFilter = filter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

export function createMapTextures(
  width: number,
  height: number,
  texels: {
    readonly height: Uint16Array;
    readonly surface: Uint8Array;
    readonly ids: Uint8Array;
    readonly colors: Uint8Array;
  },
): MapTextures {
  const tableHeight = texels.colors.length / 4 / COLOR_TABLE_WIDTH;
  return {
    height: dataTexture(texels.height, width, height, RGFormat, HalfFloatType, LinearFilter, true),
    surface: dataTexture(
      texels.surface,
      width,
      height,
      RGBAFormat,
      UnsignedByteType,
      LinearFilter,
      true,
    ),
    ids: dataTexture(texels.ids, width, height, RGFormat, UnsignedByteType, NearestFilter, true),
    colors: dataTexture(
      texels.colors,
      COLOR_TABLE_WIDTH,
      tableHeight,
      RGBAFormat,
      UnsignedByteType,
      NearestFilter,
      false,
    ),
    cols: width,
    rows: height,
  };
}

/** Color sRGB 0–255 → vec3 lineal (constante del shader). */
function linear(rgb: readonly number[]) {
  const f = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return vec3(f(rgb[0] ?? 0), f(rgb[1] ?? 0), f(rgb[2] ?? 0));
}

const SUN = (() => {
  const [x, y, z] = LIGHT.sun;
  const len = Math.hypot(x, y, z);
  return { x: x / len, y: y / len, z: z / len };
})();
/** Luz del agua (plana): ambiente + sol a la altura del sol. */
const WATER_LIGHT = LIGHT.ambient + LIGHT.sunIntensity * Math.max(SUN.y, 0);
/**
 * Costa del mar: transición por elevación (m). La elevación es un campo continuo y su cruce por
 * cero filtrado da una costa suave; una máscara binaria filtrada deja escalones de una celda.
 */
const COAST_ELEVATION_M = [-20, 5] as const;
/** Orilla de los lagos: máscara de lago filtrada (fraction). */
const LAKE_SHORE = [0.35, 0.65] as const;
/** Opacidad de las fronteras políticas y del realce de la selección (fraction). */
const POLITICAL_BORDER_ALPHA = 0.85;
const SELECTION_ALPHA = 0.3;
/** Diferencia de color (RGBA 0–1) desde la que dos provincias son de polities distintas. */
const COLOR_EPSILON = 0.002;
/**
 * Elevación extra de los ríos por celda de distancia a la cámara (celdas/celda): de lejos el LOD
 * grueso tapa los valles con la cuerda de sus triángulos.
 */
const RIVER_LIFT_PER_DISTANCE = 0.003;

type Vec2Node = Node<'vec2'>;
type FloatNode = Node<'float'>;

/** sRGB → lineal en el shader (los tipos de three devuelven un `Node` sin tipo). */
function decodeSrgb(color: Node<'vec3'>): Node<'vec3'> {
  return sRGBTransferEOTF(color) as unknown as Node<'vec3'>;
}

function uvOf(xz: Vec2Node, width: number, height: number): Vec2Node {
  return xz.add(0.5).div(vec2(width, height));
}

/** Altura del relieve dibujado en el XZ de mundo (la misma en terreno, ríos y marcadores). */
function surfaceHeight(tx: MapTextures, u: MapUniforms, xz: Vec2Node): FloatNode {
  const elev = texture(tx.height, uvOf(xz, tx.cols, tx.rows)).r;
  return max(elev, 0).mul(u.heightScale);
}

export function terrainMaterial(tx: MapTextures, u: MapUniforms): MeshBasicNodeMaterial {
  const material = new MeshBasicNodeMaterial();
  const W = tx.cols;
  const H = tx.rows;
  const tableHeight = tx.colors.image.height;

  // Vértice: XZ de mundo → altura; el faldón (y = −1 en la grilla) baja SKIRT_DEPTH.
  const worldXZ = modelWorldMatrix.mul(vec4(positionLocal.x, 0, positionLocal.z, 1)).xz;
  material.positionNode = vec3(
    positionLocal.x,
    surfaceHeight(tx, u, worldXZ).add(positionLocal.y.mul(SKIRT_DEPTH)),
    positionLocal.z,
  );

  // Fragmento.
  const xz = positionWorld.xz;
  const uv = uvOf(xz, W, H);
  const hs = texture(tx.height, uv);
  const elev = hs.r;
  const lake = hs.g;
  const du = vec2(1 / W, 0);
  const dv = vec2(0, 1 / H);
  const h = (o: Vec2Node) => max(texture(tx.height, uv.add(o)).r, 0).mul(u.shadeScale);
  const n = normalize(vec3(h(du.negate()).sub(h(du)), 2, h(dv.negate()).sub(h(dv))));
  const light = max(dot(n, vec3(SUN.x, SUN.y, SUN.z)), 0)
    .mul(LIGHT.sunIntensity)
    .add(LIGHT.ambient);

  const surf = texture(tx.surface, uv);
  const landMask = surf.a;
  const landColor = decodeSrgb(surf.rgb.div(max(landMask, 1 / 255)));
  const land = smoothstep(COAST_ELEVATION_M[0], COAST_ELEVATION_M[1], elev).mul(
    float(1).sub(smoothstep(LAKE_SHORE[0], LAKE_SHORE[1], lake)),
  );

  const depth01 = elev.negate().div(MAX_DEPTH_M).clamp(0, 1);
  const ocean = mix(linear(PALETTE.waterShallow), linear(PALETTE.waterDeep), sqrt(depth01));
  // Lago donde la elevación filtrada es de tierra (> 0) pero manda la máscara de lago.
  const lakeShare = step(0, elev);
  const water = mix(ocean, linear(PALETTE.lake), lakeShare).mul(WATER_LIGHT);

  // Provincias: id del texel (NEAREST) y su color en la tabla.
  const idAt = (p: Vec2Node): FloatNode => {
    const t = texture(tx.ids, p);
    return round(t.r.mul(255)).add(round(t.g.mul(255)).mul(256));
  };
  const colorOf = (id: FloatNode) =>
    texture(
      tx.colors,
      vec2(
        mod(id, COLOR_TABLE_WIDTH).add(0.5).div(COLOR_TABLE_WIDTH),
        floor(id.div(COLOR_TABLE_WIDTH)).add(0.5).div(tableHeight),
      ),
    );
  // Vecinos en diagonal a ~1,5 px de pantalla: detecta bordes verticales y horizontales.
  const offset = fwidth(xz)
    .mul(BORDERS.politicalPx * 0.5)
    .div(vec2(W, H));
  const idC = idAt(uv);
  const idA = idAt(uv.add(offset));
  const idB = idAt(uv.sub(offset));
  const colC = colorOf(idC);
  const colA = colorOf(idA);
  const colB = colorOf(idB);
  const isLand = (id: FloatNode) => step(0.5, id);
  const differs = (a: FloatNode, b: FloatNode) => step(0.5, abs(a.sub(b)));
  const provinceEdge = max(
    differs(idA, idC).mul(isLand(idA)),
    differs(idB, idC).mul(isLand(idB)),
  ).mul(isLand(idC));
  const politicalEdge = max(
    step(COLOR_EPSILON, length(colA.sub(colC))).mul(isLand(idA)),
    step(COLOR_EPSILON, length(colB.sub(colC))).mul(isLand(idB)),
  ).mul(isLand(idC));

  const fill = decodeSrgb(colC.rgb);
  const landLit = mix(landColor, fill, colC.a.mul(u.fillOpacity)).mul(light);
  const base = mix(water, landLit, land);
  const withProvinces = mix(
    base,
    linear(PALETTE.provinceBorder),
    provinceEdge.mul(u.provinceBorderAlpha).mul(land),
  );
  const withPolitics = mix(
    withProvinces,
    linear(PALETTE.politicalBorder),
    politicalEdge.mul(POLITICAL_BORDER_ALPHA).mul(land),
  );
  const selected = float(1).sub(differs(idC, u.selected)).mul(isLand(idC)).mul(land);
  material.colorNode = mix(withPolitics, linear(PALETTE.selection), selected.mul(SELECTION_ALPHA));
  return material;
}

/** Cintas de río: ancho en px por caudal (con tope en celdas), sobre el relieve. */
export function riverMaterial(tx: MapTextures, u: MapUniforms): MeshBasicNodeMaterial {
  const material = new MeshBasicNodeMaterial();
  const offset = attribute<'vec2'>('riverOffset', 'vec2');
  const t = attribute<'float'>('riverFlowT', 'float');
  const center = modelWorldMatrix.mul(vec4(positionLocal.x, 0, positionLocal.z, 1)).xz;
  const dist = length(cameraPosition.sub(vec3(center.x, 0, center.y)));
  const halfPx = mix(float(RIVERS.minWidthPx), float(RIVERS.maxWidthPx), t).mul(0.5);
  const halfWidth = min(halfPx.mul(dist).mul(u.pxScale), RIVERS.maxWidthCells / 2).mul(
    step(u.riverMinT, t),
  );
  const d = offset.mul(halfWidth);
  const y = surfaceHeight(tx, u, center.add(d))
    .add(RIVERS.liftCells)
    .add(dist.mul(RIVER_LIFT_PER_DISTANCE));
  material.positionNode = vec3(positionLocal.x.add(d.x), y, positionLocal.z.add(d.y));
  material.colorNode = linear(PALETTE.river).mul(WATER_LIGHT);
  // El sentido de los triángulos depende del lado de la cinta: se dibujan las dos caras.
  material.side = DoubleSide;
  return material;
}

/**
 * Marcadores instanciados: `positions` = (x, z, radio px, —) y `colors` = (r, g, b lineal, —)
 * por instancia. La X se lleva a la copia más cercana a la cámara en el shader (wrap E-O).
 */
export function markerMaterial(
  tx: MapTextures,
  u: MapUniforms,
  positions: InstancedBufferAttribute,
  colors: InstancedBufferAttribute,
): MeshBasicNodeMaterial {
  const material = new MeshBasicNodeMaterial();
  const W = tx.cols;
  const inst = instancedBufferAttribute(positions) as unknown as Node<'vec4'>;
  const col = instancedBufferAttribute(colors) as unknown as Node<'vec4'>;
  const x = inst.x.add(round(u.cameraX.sub(inst.x).div(W)).mul(W));
  const z = inst.y;
  const base = surfaceHeight(tx, u, vec2(x, z));
  const dist = length(cameraPosition.sub(vec3(x, base, z)));
  const r = min(inst.z.mul(dist).mul(u.pxScale), MARKERS.maxRadiusCells);
  material.positionNode = vec3(
    x.add(positionLocal.x.mul(r)),
    base.add(positionLocal.y.mul(r).mul(MARKERS.heightRatio)),
    z.add(positionLocal.z.mul(r)),
  );
  // Tapa más clara que los costados: se lee el volumen sin iluminación.
  material.colorNode = col.rgb.mul(mix(float(0.7), float(1), max(normalLocal.y, 0)));
  return material;
}
