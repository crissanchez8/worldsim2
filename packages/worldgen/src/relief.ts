// Relieve v1 (P1.1, DEVELOPMENT_PLAN §12.1–2): placas simples + ruido fractal sobre el cilindro,
// nivel del mar por percentil, erosión térmica y limpieza de islotes. P3 lo reemplaza por
// tectónica con deriva y erosión hidráulica.
import type { MapTypes } from '@ws/content';
import { math, rng } from '@ws/core';
import { PLATES, REFERENCE_WIDTH, RELIEF } from './config';
import { createPerm, cylinderColumns, fbm3, ridged3 } from './noise';
import { cells, D8_DX, D8_DY, type Grid, wrapDx } from './raster';

type MapType = (typeof MapTypes.rows)[number];

export interface Plate {
  /** Centro (celdas). */
  readonly x: number;
  readonly y: number;
  /** Peso en el Voronoi multiplicativo (ratio). */
  readonly weight: number;
  readonly continental: boolean;
  /** Velocidad (adimensional, |v| ≤ 1; celdas por unidad de tiempo arbitraria). */
  readonly vx: number;
  readonly vy: number;
}

const SUB_PLATES = 1;
const SUB_CONTINENTAL = 2;
const SUB_WARP_X = 3;
const SUB_WARP_Y = 4;
const SUB_CONTINENTS = 5;
const SUB_RIDGES = 6;

export function createPlates(seed: number, g: Grid, type: MapType): Plate[] {
  const stream = rng.createRng(seed).stream(rng.Streams.worldgenPlates);
  const base = Array.from({ length: type.plates }, (_, k) => {
    const d = stream.sub(SUB_PLATES).at(k, 0);
    const angle = d.range(0, math.TAU);
    const speed = d.range(PLATES.speedMin, PLATES.speedMax);
    return {
      x: d.range(0, g.width),
      y: d.range(0, g.height),
      weight: d.range(PLATES.weightMin, PLATES.weightMax),
      vx: speed * math.cos(angle),
      vy: speed * math.sin(angle),
    };
  });

  // Placas continentales: al azar o, en pangea, vecinas de una placa inicial.
  const pick = stream.sub(SUB_CONTINENTAL).at(0, 0);
  const continental = new Set<number>();
  if (type.clustered) {
    const first = pick.int(base.length);
    const p0 = base[first];
    const order = base
      .map((p, k) => ({ k, d: math.hypot(wrapDx(g.width, p0?.x ?? 0, p.x), p.y - (p0?.y ?? 0)) }))
      .sort((a, b) => a.d - b.d || a.k - b.k);
    for (const { k } of order.slice(0, type.continentalPlates)) continental.add(k);
  } else {
    const ids = pick.shuffle(base.map((_, k) => k));
    for (const k of ids.slice(0, type.continentalPlates)) continental.add(k);
  }
  return base.map((p, k) => ({ ...p, continental: continental.has(k) }));
}

export interface PlateField {
  /** Placa más cercana y segunda más cercana de cada celda (índices). */
  readonly first: Uint8Array;
  readonly second: Uint8Array;
  /** Diferencia de distancias ponderadas a la segunda y a la primera (celdas): ~0 en el borde. */
  readonly gap: Float32Array;
}

/** Voronoi multiplicativo de las placas, con los bordes distorsionados por ruido. */
export function plateField(seed: number, g: Grid, plates: readonly Plate[]): PlateField {
  const { width, height } = g;
  const n = width * height;
  const stream = rng.createRng(seed).stream(rng.Streams.worldgenPlates);
  const px = createPerm(stream.sub(SUB_WARP_X).at(0, 0));
  const py = createPerm(stream.sub(SUB_WARP_Y).at(0, 0));
  const { cx, cy } = cylinderColumns(width);
  const f = 1 / cells(width, PLATES.warpWavelengthCells, REFERENCE_WIDTH);
  const amp = cells(width, PLATES.warpCells, REFERENCE_WIDTH);
  const first = new Uint8Array(n);
  const second = new Uint8Array(n);
  const gap = new Float32Array(n);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ux = (cx[x] ?? 0) * f;
      const uy = (cy[x] ?? 0) * f;
      const uz = y * f;
      const wx = x + amp * fbm3(px, ux, uy, uz, 4, 0.5);
      const wy = y + amp * fbm3(py, ux, uy, uz + 37.5, 4, 0.5);
      let d1 = Infinity;
      let d2 = Infinity;
      let k1 = 0;
      let k2 = 0;
      for (let k = 0; k < plates.length; k++) {
        const p = plates[k];
        if (p === undefined) continue;
        const dx = wrapDx(width, p.x, wx);
        const dy = wy - p.y;
        const d = Math.sqrt(dx * dx + dy * dy) / p.weight;
        if (d < d1) {
          d2 = d1;
          k2 = k1;
          d1 = d;
          k1 = k;
        } else if (d < d2) {
          d2 = d;
          k2 = k;
        }
      }
      const i = y * width + x;
      first[i] = k1;
      second[i] = k2;
      gap[i] = d2 - d1;
    }
  }
  return { first, second, gap };
}

/** Levantamiento (unidades de relieve) del borde entre la placa `a` (la de la celda) y `b`. */
function boundaryUplift(g: Grid, a: Plate, b: Plate): number {
  const nx = wrapDx(g.width, a.x, b.x);
  const ny = b.y - a.y;
  const len = Math.sqrt(nx * nx + ny * ny);
  if (len === 0) return 0;
  // Convergencia: velocidad de a relativa a b, proyectada sobre la dirección a → b.
  const conv = ((a.vx - b.vx) * nx + (a.vy - b.vy) * ny) / len;
  if (conv > 0) {
    if (a.continental && b.continental) return PLATES.upliftContinental * conv;
    if (a.continental) return PLATES.upliftSubduction * conv;
    if (b.continental) return PLATES.trenchSubduction * conv;
    return PLATES.upliftArc * conv;
  }
  return (a.continental ? PLATES.riftContinental : PLATES.ridgeOceanic) * -conv;
}

/** Relieve crudo (unidades de relieve, sin nivel del mar): placas + bordes + ruido. */
export function rawRelief(
  seed: number,
  g: Grid,
  type: MapType,
  plates: readonly Plate[],
  field: PlateField,
): Float64Array {
  const { width, height } = g;
  const stream = rng.createRng(seed).stream(rng.Streams.worldgenNoise);
  const pc = createPerm(stream.sub(SUB_CONTINENTS).at(0, 0));
  const pr = createPerm(stream.sub(SUB_RIDGES).at(0, 0));
  const { cx, cy } = cylinderColumns(width);
  const fc = 1 / cells(width, RELIEF.continentWavelengthCells, REFERENCE_WIDTH);
  const fr = 1 / cells(width, RELIEF.ridgeWavelengthCells, REFERENCE_WIDTH);
  // Octavas hasta ~2 celdas: el mundo chico usa una menos.
  const shift = Math.round(math.log2(REFERENCE_WIDTH / width));
  const oc = Math.max(1, RELIEF.continentOctaves - shift);
  const or = Math.max(1, RELIEF.ridgeOctaves - shift);
  const blendW = cells(width, PLATES.blendWidthCells, REFERENCE_WIDTH);
  const boundW = cells(width, PLATES.boundaryWidthCells, REFERENCE_WIDTH);

  // Levantamiento por par de placas (tabla P×P).
  const count = plates.length;
  const uplift = new Float64Array(count * count);
  for (let a = 0; a < count; a++) {
    for (let b = 0; b < count; b++) {
      const pa = plates[a];
      const pb = plates[b];
      if (pa && pb && a !== b) uplift[a * count + b] = boundaryUplift(g, pa, pb);
    }
  }

  const out = new Float64Array(width * height);
  for (let y = 0; y < height; y++) {
    const lat = Math.abs(((y + 0.5) / height) * 2 - 1);
    const polar = RELIEF.polarSink * math.smoothstep(RELIEF.polarSinkFrom, 1, lat);
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const a = field.first[i] ?? 0;
      const b = field.second[i] ?? 0;
      const gp = field.gap[i] ?? 0;
      const baseA = plates[a]?.continental ? PLATES.continentalBase : PLATES.oceanicBase;
      const baseB = plates[b]?.continental ? PLATES.continentalBase : PLATES.oceanicBase;
      const blend = 0.5 * (1 - math.smoothstep(0, blendW, gp));
      const base = baseA * (1 - blend) + baseB * blend;
      const q = gp / boundW;
      const up = (uplift[a * count + b] ?? 0) * math.exp(-q * q);
      const ux = cx[x] ?? 0;
      const uy = cy[x] ?? 0;
      const noise = type.noiseWeight * fbm3(pc, ux * fc, uy * fc, y * fc, oc, RELIEF.gain);
      const ridge = ridged3(pr, ux * fr, uy * fr, y * fr, or, RELIEF.gain);
      const rough =
        ridge * ridge * (RELIEF.ridgeWeight + RELIEF.ridgeUpliftBoost * Math.max(0, up));
      out[i] = base + up + noise + rough - polar;
    }
  }
  return out;
}

/** Umbral tal que la fracción de celdas con valor ≥ umbral sea `landFraction` (histograma). */
export function seaLevelThreshold(raw: Float64Array, landFraction: number): number {
  let min = Infinity;
  let max = -Infinity;
  for (const v of raw) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!(max > min)) return min;
  const bins = RELIEF.seaLevelBins;
  const counts = new Uint32Array(bins);
  const scale = bins / (max - min);
  for (const v of raw) {
    const b = Math.min(bins - 1, Math.floor((v - min) * scale));
    counts[b] = (counts[b] ?? 0) + 1;
  }
  const target = landFraction * raw.length;
  let above = 0;
  for (let b = bins - 1; b >= 0; b--) {
    above += counts[b] ?? 0;
    if (above >= target) return min + b / scale;
  }
  return min;
}

/** Relieve en metros: tierra en [0, maxLand] con curva hipsométrica, océano en [−maxDepth, 0). */
export function toMeters(raw: Float64Array, threshold: number): Float32Array {
  let min = Infinity;
  let max = -Infinity;
  for (const v of raw) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const landSpan = Math.max(1e-9, max - threshold);
  const seaSpan = Math.max(1e-9, threshold - min);
  const out = new Float32Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    const v = raw[i] ?? 0;
    out[i] =
      v >= threshold
        ? RELIEF.maxLandM * math.pow((v - threshold) / landSpan, RELIEF.landCurve)
        : -RELIEF.maxDepthM * ((threshold - v) / seaSpan);
  }
  return out;
}

/** Erosión térmica (Jacobi, pares E y S): el material cae donde el desnivel supera el talud. */
export function thermalErosion(g: Grid, elevation: Float32Array): void {
  const { width, height } = g;
  const talus = (RELIEF.talusM * REFERENCE_WIDTH) / width; // celdas más grandes → más desnivel admitido
  const delta = new Float64Array(width * height);
  for (let it = 0; it < RELIEF.erosionIterations; it++) {
    delta.fill(0);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const h = elevation[i] ?? 0;
        // Cada par de vecinos se procesa una vez: el de la derecha (con wrap) y el de abajo.
        for (let k = 0; k < 2; k++) {
          const j = k === 0 ? y * width + ((x + 1) % width) : y + 1 < height ? i + width : -1;
          if (j < 0) continue;
          const d = h - (elevation[j] ?? 0);
          const excess = Math.abs(d) - talus;
          if (excess <= 0) continue;
          const m = (RELIEF.erosionRate * excess) / 2;
          const s = d > 0 ? m : -m;
          delta[i] = (delta[i] ?? 0) - s;
          delta[j] = (delta[j] ?? 0) + s;
        }
      }
    }
    for (let i = 0; i < elevation.length; i++) elevation[i] = (elevation[i] ?? 0) + (delta[i] ?? 0);
  }
}

/** Hunde las masas de tierra (8-conexas, con wrap) de menos de `minLandmassCells` celdas. */
export function sinkIslets(g: Grid, elevation: Float32Array): number {
  const { width, height } = g;
  const n = width * height;
  const seen = new Uint8Array(n);
  const stack: number[] = [];
  const component: number[] = [];
  let sunk = 0;
  for (let start = 0; start < n; start++) {
    if (seen[start] || (elevation[start] ?? 0) < 0) continue;
    seen[start] = 1;
    stack.push(start);
    component.length = 0;
    while (stack.length > 0) {
      const i = stack.pop() ?? 0;
      component.push(i);
      const x = i % width;
      const y = (i - x) / width;
      for (let k = 0; k < 8; k++) {
        const ny = y + (D8_DY[k] ?? 0);
        if (ny < 0 || ny >= height) continue;
        const j = ny * width + ((x + (D8_DX[k] ?? 0) + width) % width);
        if (seen[j] || (elevation[j] ?? 0) < 0) continue;
        seen[j] = 1;
        stack.push(j);
      }
    }
    if (component.length < RELIEF.minLandmassCells) {
      for (const i of component) elevation[i] = RELIEF.sunkenDepthM;
      sunk += component.length;
    }
  }
  return sunk;
}

/** Fracción de celdas sobre el nivel del mar (fraction). */
export function landFractionOf(elevation: Float32Array): number {
  let land = 0;
  for (const v of elevation) if (v >= 0) land++;
  return land / elevation.length;
}
