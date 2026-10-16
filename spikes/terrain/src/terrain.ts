// Terreno por chunks con LOD y wrap E-O, para WebGPURenderer (WebGPU o WebGL2).
// Enfoque: el heightmap vive en la GPU como textura R16F; cada nivel de LOD es UNA grilla plana
// compartida por todos los chunks y el vertex shader la desplaza leyendo la textura en XZ de
// mundo. La textura repite en U, así que cualquier copia de un chunk lee las alturas correctas.
import {
  abs,
  dot,
  float,
  max,
  mix,
  modelWorldMatrix,
  normalize,
  positionLocal,
  positionWorld,
  smoothstep,
  sqrt,
  texture,
  uniform,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';
import {
  BufferAttribute,
  BufferGeometry,
  ClampToEdgeWrapping,
  DataTexture,
  DataUtils,
  Group,
  HalfFloatType,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  MeshBasicNodeMaterial,
  RedFormat,
  RepeatWrapping,
  RGBAFormat,
  Sphere,
  SRGBColorSpace,
  UnsignedByteType,
  Vector3,
} from 'three/webgpu';
import type { Node } from 'three/webgpu';
import {
  CHUNK_SIZE,
  LOD_STEPS,
  MAX_DEPTH_M,
  MAX_LAND_M,
  METERS_TO_UNITS,
  SHADING_EXAGGERATION,
  SKIRT_DEPTH,
  SPLAT_MACRO_CELLS,
  SPLAT_TILE_CELLS,
} from './config';
import type { Heightmap } from './heightmap';
import { distanceToChunk, lodForDistance, nearestCopyX } from './lod';
import type { SplatTextures } from './textures';

/** Dirección del sol (desde el terreno hacia el sol), sin normalizar. */
const SUN_DIRECTION = new Vector3(-0.5, 0.75, -0.35);
/** Luz ambiente y del sol (adimensional, multiplica el albedo lineal). */
const AMBIENT = 0.32;
const SUN = 0.9;
/** Pendiente (1 − n.y) en la que empieza y termina la transición pasto → roca. */
const ROCK_SLOPE: readonly [number, number] = [0.1, 0.28];
/** Altura de la nieve como fracción de MAX_LAND_M: en el ecuador y en los polos. */
const SNOWLINE_EQUATOR = 0.6;
const SNOWLINE_POLE = -0.05;
/** Ancho de la transición de nieve, en fracción de MAX_LAND_M. */
const SNOW_BLEND = 0.1;
/** Franja de playa sobre el nivel del mar, en m. */
const BEACH_M = 40;
/** Transición agua → tierra, en m de elevación (de −20 m a +5 m). */
const COAST_BLEND_M: readonly [number, number] = [-20, 5];
/** Cuánto le quita la roca a la nieve en pendientes fuertes (adimensional). */
const ROCK_OVER_SNOW = 0.6;
/** Latitud normalizada (|lat| ∈ [0, 1]) en la que la línea de nieve empieza y termina de bajar. */
const SNOWLINE_LAT: readonly [number, number] = [0.5, 0.95];
/** Colores lineales del agua y la arena. */
const WATER_SHALLOW = vec3(0.05, 0.22, 0.3);
const WATER_DEEP = vec3(0.005, 0.03, 0.09);
const SAND = vec3(0.55, 0.48, 0.3);

export interface TerrainStats {
  /** Chunks visibles por nivel de LOD (antes del frustum culling). */
  readonly lodCounts: readonly number[];
}

/** Bytes de buffers de geometría que crea el terreno (posiciones + índices, todos los LOD). */
export interface GeometryBytes {
  readonly vertices: number;
  readonly triangles: number;
  readonly bytes: number;
}

interface Chunk {
  readonly x0: number;
  readonly z0: number;
  readonly meshes: readonly Mesh[];
  lod: number;
}

/**
 * Grilla de un chunk con paso `step`, en coordenadas locales [0, size]². Agrega un faldón en el
 * borde (vértices con y = −1, que el shader baja SKIRT_DEPTH) para tapar las grietas entre LODs.
 */
function createChunkGeometry(size: number, step: number, yMin: number, yMax: number) {
  const n = size / step;
  const row = n + 1;
  const gridVerts = row * row;
  const skirtVerts = 4 * row;
  const positions = new Float32Array((gridVerts + skirtVerts) * 3);
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      const v = (j * row + i) * 3;
      positions[v] = i * step;
      positions[v + 2] = j * step;
    }
  }

  // Bordes en orden: norte (j = 0), sur (j = n), oeste (i = 0), este (i = n).
  const edges: number[][] = [[], [], [], []];
  for (let k = 0; k <= n; k++) {
    edges[0]?.push(k);
    edges[1]?.push(n * row + k);
    edges[2]?.push(k * row);
    edges[3]?.push(k * row + n);
  }
  let next = gridVerts;
  const skirtOf: number[][] = [];
  for (const edge of edges) {
    const ids: number[] = [];
    for (const top of edge) {
      const v = next * 3;
      positions[v] = positions[top * 3] ?? 0;
      positions[v + 1] = -1;
      positions[v + 2] = positions[top * 3 + 2] ?? 0;
      ids.push(next++);
    }
    skirtOf.push(ids);
  }

  const gridTris = 2 * n * n;
  // Faldones con las dos caras (4 triángulos por tramo): evita pensar el winding de cada borde.
  const skirtTris = 4 * 4 * n;
  const IndexArray = gridVerts + skirtVerts > 65535 ? Uint32Array : Uint16Array;
  const indices = new IndexArray((gridTris + skirtTris) * 3);
  let t = 0;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const a = j * row + i;
      const b = a + row;
      // Cara hacia +Y: (a, b, a+1) y (b, b+1, a+1).
      indices[t++] = a;
      indices[t++] = b;
      indices[t++] = a + 1;
      indices[t++] = b;
      indices[t++] = b + 1;
      indices[t++] = a + 1;
    }
  }
  for (let e = 0; e < 4; e++) {
    const top = edges[e] ?? [];
    const bottom = skirtOf[e] ?? [];
    for (let k = 0; k < n; k++) {
      const a = top[k] ?? 0;
      const b = top[k + 1] ?? 0;
      const c = bottom[k] ?? 0;
      const d = bottom[k + 1] ?? 0;
      indices.set([a, c, b, b, c, d, a, b, c, b, d, c], t);
      t += 12;
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setIndex(new BufferAttribute(indices, 1));
  // El desplazamiento ocurre en la GPU: el volumen para el frustum culling se fija a mano.
  const half = size / 2;
  const midY = (yMin + yMax) / 2;
  const halfY = (yMax - yMin) / 2;
  geometry.boundingSphere = new Sphere(
    new Vector3(half, midY, half),
    Math.sqrt(2 * half * half + halfY * halfY),
  );
  return {
    geometry,
    vertices: gridVerts + skirtVerts,
    triangles: gridTris + skirtTris,
    bytes: positions.byteLength + indices.byteLength,
  };
}

function createHeightTexture(map: Heightmap): DataTexture {
  const half = new Uint16Array(map.elevation.length);
  for (let i = 0; i < half.length; i++) half[i] = DataUtils.toHalfFloat(map.elevation[i] ?? 0);
  const tex = new DataTexture(half, map.width, map.height, RedFormat, HalfFloatType);
  tex.wrapS = RepeatWrapping; // E-O: el mundo se repite
  tex.wrapT = ClampToEdgeWrapping; // N-S: los polos son el borde
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

function createSplatTexture(data: Uint8Array, size: number): DataTexture {
  const tex = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function createMaterial(map: Heightmap, height: DataTexture, splat: readonly DataTexture[]) {
  const [grassTex, rockTex, snowTex] = splat;
  if (!grassTex || !rockTex || !snowTex) throw new Error('splat: faltan texturas');
  const material = new MeshBasicNodeMaterial();
  const mapSize = vec2(map.width, map.height);
  const metersToUnits = uniform(METERS_TO_UNITS);
  const skirtDepth = uniform(SKIRT_DEPTH);
  const sunDir = uniform(SUN_DIRECTION.clone().normalize());

  // Vértice: XZ de mundo → elevación (los océanos quedan planos a nivel del mar).
  const worldXZ = modelWorldMatrix.mul(vec4(positionLocal.x, 0, positionLocal.z, 1)).xz;
  const elevV = texture(height, worldXZ.add(0.5).div(mapSize)).r;
  const y = max(elevV, 0).mul(metersToUnits).add(positionLocal.y.mul(skirtDepth));
  material.positionNode = vec3(positionLocal.x, y, positionLocal.z);

  // Fragmento: normal por diferencias centrales sobre el heightmap (detalle independiente del LOD).
  const xz = positionWorld.xz;
  const uv = xz.add(0.5).div(mapSize);
  const du = vec2(1 / map.width, 0);
  const dv = vec2(0, 1 / map.height);
  const elev = texture(height, uv).r;
  const shade = metersToUnits.mul(SHADING_EXAGGERATION);
  const land = (o: Node<'vec2'>) => max(texture(height, uv.add(o)).r, 0).mul(shade);
  const hL = land(du.negate());
  const hR = land(du);
  const hD = land(dv.negate());
  const hU = land(dv);
  const n = normalize(vec3(hL.sub(hR), 2, hD.sub(hU)));

  // Splat de 3 texturas por pendiente y altura; la línea de nieve baja hacia los polos.
  const slope = float(1).sub(n.y);
  const lat = abs(uv.y.mul(2).sub(1));
  const snowline = mix(
    float(SNOWLINE_EQUATOR),
    float(SNOWLINE_POLE),
    smoothstep(SNOWLINE_LAT[0], SNOWLINE_LAT[1], lat),
  );
  const hN = elev.div(MAX_LAND_M);
  const rockW = smoothstep(ROCK_SLOPE[0], ROCK_SLOPE[1], slope);
  const snowW = smoothstep(snowline, snowline.add(SNOW_BLEND), hN).mul(
    float(1).sub(rockW.mul(ROCK_OVER_SNOW)),
  );
  // Cada textura se muestrea a dos escalas y se promedia: la repetición de 4 celdas no se ve.
  const tileUV = xz.div(SPLAT_TILE_CELLS);
  const macroUV = xz.div(SPLAT_MACRO_CELLS);
  const twoScales = (t: DataTexture) =>
    texture(t, tileUV).rgb.add(texture(t, macroUV).rgb).mul(0.5);
  const grass = twoScales(grassTex);
  const rock = twoScales(rockTex);
  const snow = twoScales(snowTex);
  const notSnow = float(1).sub(snowW);
  const albedoLand = grass
    .mul(float(1).sub(rockW).mul(notSnow))
    .add(rock.mul(rockW.mul(notSnow)))
    .add(snow.mul(snowW));
  const albedo = mix(SAND, albedoLand, smoothstep(0, BEACH_M, elev));
  const lambert = max(dot(n, sunDir), 0);
  const lit = albedo.mul(lambert.mul(SUN).add(AMBIENT));

  const depth01 = elev.negate().div(MAX_DEPTH_M).clamp(0, 1);
  const water = mix(WATER_SHALLOW, WATER_DEEP, sqrt(depth01)).mul(
    max(sunDir.y, 0).mul(SUN).add(AMBIENT),
  );
  const coast = smoothstep(COAST_BLEND_M[0], COAST_BLEND_M[1], elev);
  material.colorNode = mix(water, lit, coast);
  return material;
}

export class Terrain {
  readonly group = new Group();
  readonly geometry: GeometryBytes;
  /** Bytes de las texturas que sube el terreno (heightmap + splat con mipmaps). */
  readonly textureBytes: number;
  private readonly chunks: Chunk[] = [];
  private readonly worldWidth: number;
  private readonly lodCounts: number[] = LOD_STEPS.map(() => 0);

  constructor(map: Heightmap, splat: SplatTextures) {
    this.worldWidth = map.width;
    const heightTex = createHeightTexture(map);
    const splatTex = [splat.grass, splat.rock, splat.snow].map((d) =>
      createSplatTexture(d, splat.size),
    );
    const material = createMaterial(map, heightTex, splatTex);

    const yMax = Math.max(map.maxM, 0) * METERS_TO_UNITS;
    const lods = LOD_STEPS.map((step) => createChunkGeometry(CHUNK_SIZE, step, -SKIRT_DEPTH, yMax));
    this.geometry = lods.reduce(
      (acc, l) => ({
        vertices: acc.vertices + l.vertices,
        triangles: acc.triangles + l.triangles,
        bytes: acc.bytes + l.bytes,
      }),
      { vertices: 0, triangles: 0, bytes: 0 },
    );
    const splatBytes = splat.size * splat.size * 4 * (4 / 3); // RGBA8 + cadena de mipmaps
    this.textureBytes = map.width * map.height * 2 + 3 * Math.round(splatBytes);

    for (let z0 = 0; z0 < map.height; z0 += CHUNK_SIZE) {
      for (let x0 = 0; x0 < map.width; x0 += CHUNK_SIZE) {
        const meshes = lods.map(({ geometry }) => {
          const mesh = new Mesh(geometry, material);
          mesh.position.set(x0, 0, z0);
          mesh.visible = false;
          this.group.add(mesh);
          return mesh;
        });
        this.chunks.push({ x0, z0, meshes, lod: -1 });
      }
    }
  }

  get chunkCount(): number {
    return this.chunks.length;
  }

  /**
   * Reposiciona cada chunk en su copia más cercana a la cámara (wrap E-O) y elige su LOD.
   * `forcedLod` fija el nivel para todos (medición del peor caso).
   */
  update(camera: Vector3, lodBaseDistance: number, forcedLod: number | null): TerrainStats {
    this.lodCounts.fill(0);
    for (const chunk of this.chunks) {
      const x = nearestCopyX(chunk.x0, CHUNK_SIZE, camera.x, this.worldWidth);
      const lod =
        forcedLod ??
        lodForDistance(
          distanceToChunk(camera.x, camera.y, camera.z, x, chunk.z0, CHUNK_SIZE),
          lodBaseDistance,
          LOD_STEPS.length,
        );
      if (lod !== chunk.lod) {
        const previous = chunk.meshes[chunk.lod];
        if (previous) previous.visible = false;
        chunk.lod = lod;
      }
      const mesh = chunk.meshes[lod];
      if (mesh) {
        mesh.visible = true;
        mesh.position.x = x;
      }
      this.lodCounts[lod] = (this.lodCounts[lod] ?? 0) + 1;
    }
    return { lodCounts: this.lodCounts };
  }
}
