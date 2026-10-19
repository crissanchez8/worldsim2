// Ríos (funciones puras): trazado siguiendo `flowDir` (D8) desde las celdas con caudal ≥ umbral,
// suavizado y armado de cintas por columna de chunks (para reposicionarlas con el wrap E-O igual
// que el terreno).
import { D8_DX, D8_DY, NO_DIR, Water, type WorldRaster } from '@ws/worldgen';
import { wrap } from './wrap';

export interface RiverLine {
  /** Centros de celda en coordenadas de mundo. X continua: puede salir de [0, ancho) al cruzar la costura. */
  readonly x: Float32Array;
  readonly z: Float32Array;
  /** Caudal en cada vértice (m3_per_s). */
  readonly flow: Float32Array;
}

type RiverRaster = Pick<WorldRaster, 'width' | 'height' | 'water' | 'flow' | 'flowDir'>;

/** Celda aguas abajo de `i`, o −1 (sin desagüe o fuera de los polos). */
function downstream(r: RiverRaster, i: number): number {
  const dir = r.flowDir[i] ?? NO_DIR;
  if (dir === NO_DIR) return -1;
  const x = i % r.width;
  const y = (i - x) / r.width;
  const ny = y + (D8_DY[dir] ?? 0);
  if (ny < 0 || ny >= r.height) return -1;
  return ny * r.width + wrap(x + (D8_DX[dir] ?? 0), r.width);
}

/**
 * Tramos de río: cada celda de tierra con caudal ≥ `minFlow` desagua en su vecina D8, y cada lago
 * desagua por su celda de salida si la vecina de tierra es río. Los tramos se encadenan en líneas
 * que empiezan en las nacientes, las confluencias y las salidas de lagos, y terminan en el mar, en
 * un lago o en la próxima confluencia. Cada tramo está en exactamente una línea.
 */
export function traceRivers(r: RiverRaster, minFlow: number): RiverLine[] {
  const cells = r.width * r.height;
  const down = new Int32Array(cells).fill(-1);
  const inDegree = new Uint8Array(cells);
  for (let i = 0; i < cells; i++) {
    const w = r.water[i];
    if (w === Water.ocean) continue;
    const d = downstream(r, i);
    if (d < 0) continue;
    const isRiver = w === Water.land && (r.flow[i] ?? 0) >= minFlow;
    const isOutlet = w === Water.lake && r.water[d] === Water.land && (r.flow[d] ?? 0) >= minFlow;
    if (!isRiver && !isOutlet) continue;
    down[i] = d;
    if (inDegree[d] !== 255) inDegree[d] = (inDegree[d] ?? 0) + 1;
  }

  const lines: RiverLine[] = [];
  const xs: number[] = [];
  const zs: number[] = [];
  const flows: number[] = [];
  for (let start = 0; start < cells; start++) {
    if (down[start] === -1 || inDegree[start] === 1) continue;
    xs.length = zs.length = flows.length = 0;
    let cur = start;
    let x = start % r.width;
    const y0 = (start - x) / r.width;
    xs.push(x);
    zs.push(y0);
    flows.push(r.flow[cur] ?? 0);
    for (let guard = 0; guard < cells; guard++) {
      const d = down[cur] ?? -1;
      const dir = r.flowDir[cur] ?? 0;
      x += D8_DX[dir] ?? 0;
      const dx = d % r.width;
      xs.push(x);
      zs.push((d - dx) / r.width);
      // En la desembocadura (mar o lago) el ancho sigue el del último tramo de tierra.
      flows.push(r.water[d] === Water.land ? (r.flow[d] ?? 0) : (r.flow[cur] ?? 0));
      if (down[d] === -1 || inDegree[d] !== 1) break;
      cur = d;
    }
    lines.push({
      x: Float32Array.from(xs),
      z: Float32Array.from(zs),
      flow: Float32Array.from(flows),
    });
  }
  return lines;
}

/** Suavizado de Chaikin (cada iteración duplica los tramos); conserva los extremos. */
export function smoothRiver(line: RiverLine, iterations: number): RiverLine {
  let { x, z, flow } = line;
  for (let it = 0; it < iterations && x.length > 1; it++) {
    const n = x.length;
    const ox = new Float32Array(2 * n);
    const oz = new Float32Array(2 * n);
    const of = new Float32Array(2 * n);
    ox[0] = x[0] ?? 0;
    oz[0] = z[0] ?? 0;
    of[0] = flow[0] ?? 0;
    for (let k = 0; k < n - 1; k++) {
      const ax = x[k] ?? 0;
      const az = z[k] ?? 0;
      const af = flow[k] ?? 0;
      const bx = x[k + 1] ?? 0;
      const bz = z[k + 1] ?? 0;
      const bf = flow[k + 1] ?? 0;
      ox[2 * k + 1] = 0.75 * ax + 0.25 * bx;
      oz[2 * k + 1] = 0.75 * az + 0.25 * bz;
      of[2 * k + 1] = 0.75 * af + 0.25 * bf;
      ox[2 * k + 2] = 0.25 * ax + 0.75 * bx;
      oz[2 * k + 2] = 0.25 * az + 0.75 * bz;
      of[2 * k + 2] = 0.25 * af + 0.75 * bf;
    }
    ox[2 * n - 1] = x[n - 1] ?? 0;
    oz[2 * n - 1] = z[n - 1] ?? 0;
    of[2 * n - 1] = flow[n - 1] ?? 0;
    x = ox;
    z = oz;
    flow = of;
  }
  return { x, z, flow };
}

/** Caudal relativo en escala log: 0 en `minFlow`, 1 en `maxFlow` (acotado). */
export function flowT(flow: number, minFlow: number, maxFlow: number): number {
  const t = Math.log(flow / minFlow) / Math.log(maxFlow / minFlow);
  return Math.min(1, Math.max(0, t));
}

/** Cintas de una columna de chunks, en coordenadas locales a la columna (X − x0). */
export interface RiverColumnGeometry {
  readonly column: number;
  readonly x0: number;
  /** vec2 (x local, z) del eje, 2 vértices por punto (un lado y el otro). */
  readonly center: Float32Array;
  /** vec2 normal de inglete × escala, con el signo del lado: el shader suma `offset · ancho/2`. */
  readonly offset: Float32Array;
  /** Caudal relativo (0–1) por vértice. */
  readonly flowT: Float32Array;
  readonly index: Uint32Array;
}

/** Tope de la escala del inglete (ratio): en curvas cerradas el ancho no explota. */
const MAX_MITER = 3;

/**
 * Arma las cintas de todas las líneas, repartidas por columna de chunks según el punto medio de
 * cada tramo. Un tramo que cruza la costura queda en la columna de su punto medio, con las X de
 * esa copia: la columna se reposiciona como cualquier chunk y el río no se corta.
 */
export function buildRiverGeometry(
  lines: readonly RiverLine[],
  width: number,
  chunkSize: number,
  toT: (flow: number) => number,
): RiverColumnGeometry[] {
  const columns = width / chunkSize;
  const buckets = Array.from({ length: columns }, () => ({
    center: [] as number[],
    offset: [] as number[],
    t: [] as number[],
    index: [] as number[],
  }));

  for (const line of lines) {
    const n = line.x.length;
    if (n < 2) continue;
    // Normal unitaria de cada tramo.
    const nx = new Float32Array(n - 1);
    const nz = new Float32Array(n - 1);
    for (let k = 0; k < n - 1; k++) {
      const dx = (line.x[k + 1] ?? 0) - (line.x[k] ?? 0);
      const dz = (line.z[k + 1] ?? 0) - (line.z[k] ?? 0);
      const len = Math.hypot(dx, dz) || 1;
      nx[k] = -dz / len;
      nz[k] = dx / len;
    }
    // Normal de inglete por vértice (promedio de los tramos vecinos, escalada).
    const vertexOffset = (k: number): [number, number] => {
      const a = Math.max(0, k - 1);
      const b = Math.min(n - 2, k);
      const ax = nx[a] ?? 0;
      const az = nz[a] ?? 0;
      let mx = ax + (nx[b] ?? 0);
      let mz = az + (nz[b] ?? 0);
      const len = Math.hypot(mx, mz);
      if (len < 1e-6) return [ax, az];
      mx /= len;
      mz /= len;
      const scale = Math.min(MAX_MITER, 1 / Math.max(1e-3, mx * ax + mz * az));
      return [mx * scale, mz * scale];
    };

    let runColumn = -1;
    let runShift = 0;
    let runPrev = -1; // índice (en el bucket) del par de vértices anterior
    for (let k = 0; k < n - 1; k++) {
      const mid = ((line.x[k] ?? 0) + (line.x[k + 1] ?? 0)) / 2;
      const midWrapped = wrap(mid, width);
      const column = Math.min(columns - 1, Math.floor(midWrapped / chunkSize));
      const shift = mid - midWrapped + column * chunkSize;
      const bucket = buckets[column];
      if (!bucket) continue;
      const push = (v: number): number => {
        const [ox, oz] = vertexOffset(v);
        const cx = (line.x[v] ?? 0) - shift;
        const cz = line.z[v] ?? 0;
        const t = toT(line.flow[v] ?? 0);
        const first = bucket.t.length;
        bucket.center.push(cx, cz, cx, cz);
        bucket.offset.push(ox, oz, -ox, -oz);
        bucket.t.push(t, t);
        return first;
      };
      if (column !== runColumn || shift !== runShift) {
        runColumn = column;
        runShift = shift;
        runPrev = push(k);
      }
      const next = push(k + 1);
      bucket.index.push(runPrev, runPrev + 1, next, runPrev + 1, next + 1, next);
      runPrev = next;
    }
  }

  return buckets
    .map((b, column) => ({
      column,
      x0: column * chunkSize,
      center: Float32Array.from(b.center),
      offset: Float32Array.from(b.offset),
      flowT: Float32Array.from(b.t),
      index: Uint32Array.from(b.index),
    }))
    .filter((g) => g.index.length > 0);
}
