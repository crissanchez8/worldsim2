import { D8_DX, D8_DY, generateWorld, NO_DIR, Water } from '@ws/worldgen';
import { describe, expect, it } from 'vitest';
import { buildRiverGeometry, flowT, smoothRiver, traceRivers } from './rivers';
import { wrap } from './wrap';

/** Los tests que generan un mundo real tardan segundos; con `pnpm check` en paralelo, más (ms). */
const REAL_WORLD_TIMEOUT_MS = 30_000;

/** Direcciones D8 por nombre (orden de `D8_DX`/`D8_DY`). */
const E = 0;
const S = 2;
const NE = 7;

/** Ráster de prueba: todo tierra con caudal 0 y sin desagüe; los casos marcan sus celdas. */
function blank(width: number, height: number) {
  const n = width * height;
  return {
    width,
    height,
    water: new Uint8Array(n),
    flow: new Float32Array(n),
    flowDir: new Uint8Array(n).fill(NO_DIR),
  };
}

type Raster = ReturnType<typeof blank>;

function set(r: Raster, x: number, y: number, flow: number, dir: number, water = 0): void {
  const i = y * r.width + x;
  r.flow[i] = flow;
  r.flowDir[i] = dir;
  r.water[i] = water;
}

function points(line: { x: Float32Array; z: Float32Array }): [number, number][] {
  return [...line.x].map((x, k) => [x, line.z[k] ?? NaN]);
}

describe('traceRivers', () => {
  it('confluencia: dos afluentes y el tramo de abajo son tres líneas; el umbral corta los chicos', () => {
    // Afluentes desde (1,1) y (3,1) bajan a (2,2); de ahí al sur hasta el mar en (2,5).
    const r = blank(6, 6);
    set(r, 1, 1, 60, 1); // SE → (2,2)
    set(r, 3, 1, 70, 3); // SO → (2,2)
    set(r, 2, 2, 130, S);
    set(r, 2, 3, 140, S);
    set(r, 2, 4, 150, S);
    set(r, 2, 5, 0, NO_DIR, Water.ocean);
    set(r, 5, 0, 10, S); // por debajo del umbral: no es río
    const lines = traceRivers(r, 50);
    expect(lines.map(points)).toEqual([
      [
        [1, 1],
        [2, 2],
      ],
      [
        [3, 1],
        [2, 2],
      ],
      [
        [2, 2],
        [2, 3],
        [2, 4],
        [2, 5],
      ],
    ]);
    // En la desembocadura el caudal sigue al último tramo de tierra.
    expect([...(lines[2]?.flow ?? [])]).toEqual([130, 140, 150, 150]);
  });

  it('cada tramo de río está en exactamente una línea (con lagos y su salida)', () => {
    // Río que entra a un lago en (3,1), el lago desagua por (4,1) a tierra y sigue al este.
    const r = blank(8, 3);
    set(r, 1, 1, 80, E);
    set(r, 2, 1, 90, E); // → lago
    set(r, 3, 1, 100, E, Water.lake); // celda de salida del lago
    set(r, 4, 1, 120, E);
    set(r, 5, 1, 130, E);
    set(r, 6, 1, 0, NO_DIR, Water.ocean);
    const lines = traceRivers(r, 50);
    // El lago tiene un solo afluente: el río sigue de largo por la salida.
    expect(lines.map(points)).toEqual([
      [
        [1, 1],
        [2, 1],
        [3, 1],
        [4, 1],
        [5, 1],
        [6, 1],
      ],
    ]);
  });

  it('un río que cruza la costura E-O tiene X continua', () => {
    const r = blank(8, 3);
    set(r, 5, 1, 60, E);
    set(r, 6, 1, 70, E);
    set(r, 7, 1, 80, E);
    set(r, 0, 1, 90, NE);
    set(r, 1, 0, 0, NO_DIR, Water.ocean);
    const [line] = traceRivers(r, 50);
    expect(points(line ?? { x: new Float32Array(), z: new Float32Array() })).toEqual([
      [5, 1],
      [6, 1],
      [7, 1],
      [8, 1],
      [9, 0],
    ]);
  });

  it(
    'en un mundo real: cada celda de río aparece como un único tramo y sigue su flowDir',
    () => {
      const world = generateWorld({
        seed: 7,
        size: 'small',
        mapType: 'continents',
        landFraction: 0.3,
      });
      const r = world.raster;
      const minFlow = 50;
      const lines = traceRivers(r, minFlow);
      const seen = new Map<number, number>();
      for (const line of lines) {
        for (let k = 0; k + 1 < line.x.length; k++) {
          const x = wrap(line.x[k] ?? 0, r.width);
          const y = line.z[k] ?? 0;
          const i = y * r.width + x;
          seen.set(i, (seen.get(i) ?? 0) + 1);
          const dir = r.flowDir[i] ?? NO_DIR;
          expect(dir).not.toBe(NO_DIR);
          expect((line.x[k + 1] ?? 0) - (line.x[k] ?? 0)).toBe(D8_DX[dir]);
          expect((line.z[k + 1] ?? 0) - y).toBe(D8_DY[dir]);
          // Ríos sin tramos cuesta arriba sobre tierra (la superficie de los lagos es plana).
          const j = (line.z[k + 1] ?? 0) * r.width + wrap(line.x[k + 1] ?? 0, r.width);
          if (r.water[i] === Water.land && r.water[j] === Water.land) {
            expect(r.elevation[j]).toBeLessThanOrEqual(r.elevation[i] ?? 0);
          }
        }
      }
      // Todas las celdas de tierra con caudal ≥ umbral y desagüe están, una vez cada una.
      let expected = 0;
      for (let i = 0; i < r.width * r.height; i++) {
        if (r.water[i] !== Water.land || (r.flow[i] ?? 0) < minFlow) continue;
        const dir = r.flowDir[i] ?? NO_DIR;
        const y = Math.floor(i / r.width) + (D8_DY[dir] ?? 0);
        if (dir === NO_DIR || y < 0 || y >= r.height) continue;
        expected++;
        expect(seen.get(i), `celda ${i}`).toBe(1);
      }
      expect(expected).toBeGreaterThan(1000);
      for (const count of seen.values()) expect(count).toBe(1);
    },
    REAL_WORLD_TIMEOUT_MS,
  );
});

describe('smoothRiver y flowT', () => {
  it('Chaikin conserva los extremos y duplica los puntos por iteración', () => {
    const line = {
      x: Float32Array.from([0, 1, 2]),
      z: Float32Array.from([0, 1, 0]),
      flow: Float32Array.from([50, 60, 70]),
    };
    const once = smoothRiver(line, 1);
    expect(once.x.length).toBe(6);
    expect([once.x[0], once.z[0], once.x[5], once.z[5]]).toEqual([0, 0, 2, 0]);
    expect(once.x[1]).toBeCloseTo(0.25, 6);
    expect(once.z[1]).toBeCloseTo(0.25, 6);
    expect(smoothRiver(line, 2).x.length).toBe(12);
    expect(smoothRiver(line, 0)).toEqual(line);
  });

  it('flowT es log, acotado a [0, 1]', () => {
    expect(flowT(50, 50, 5000)).toBe(0);
    expect(flowT(500, 50, 5000)).toBeCloseTo(0.5, 6);
    expect(flowT(5000, 50, 5000)).toBe(1);
    expect(flowT(10, 50, 5000)).toBe(0);
    expect(flowT(1e9, 50, 5000)).toBe(1);
  });
});

describe('buildRiverGeometry (cintas por columna de chunks)', () => {
  const line = (xs: number[], zs: number[]) => ({
    x: Float32Array.from(xs),
    z: Float32Array.from(zs),
    flow: Float32Array.from(xs.map(() => 100)),
  });

  it('un tramo por quad, en coordenadas locales de su columna', () => {
    const geo = buildRiverGeometry([line([10, 11, 12], [5, 5, 6])], 512, 128, () => 0.5);
    expect(geo).toHaveLength(1);
    const [g] = geo;
    expect(g?.column).toBe(0);
    expect(g?.index.length).toBe(2 * 6);
    expect(g?.flowT.length).toBe(3 * 2);
    expect([...(g?.center.subarray(0, 4) ?? [])]).toEqual([10, 5, 10, 5]);
    // Normal de inglete: los dos lados son opuestos.
    expect(g?.offset[0]).toBeCloseTo(-(g?.offset[2] ?? 0), 6);
  });

  it('un río que cruza la costura queda en las columnas de cada lado, sin cortarse', () => {
    // De x = 509 a x = 515 (= 3 del otro lado) en un mundo de 512 con chunks de 128.
    const geo = buildRiverGeometry(
      [line([509, 510, 511, 512, 513, 514, 515], [1, 1, 1, 1, 1, 1, 1])],
      512,
      128,
      () => 0,
    );
    expect(geo.map((g) => g.column)).toEqual([0, 3]);
    const last = geo.find((g) => g.column === 3);
    const first = geo.find((g) => g.column === 0);
    // Columna 3 (x0 = 384): local = X − 384 → 125…128 (el tramo 511→512 tiene su medio en 511,5).
    expect(Math.min(...(last?.center.filter((_, k) => k % 2 === 0) ?? []))).toBe(125);
    expect(Math.max(...(last?.center.filter((_, k) => k % 2 === 0) ?? []))).toBe(128);
    // Columna 0: el mismo punto 512 aparece como local 0 → las dos piezas se tocan.
    expect(Math.min(...(first?.center.filter((_, k) => k % 2 === 0) ?? []))).toBe(0);
    expect(Math.max(...(first?.center.filter((_, k) => k % 2 === 0) ?? []))).toBe(3);
  });

  it('las columnas sin ríos no generan geometría', () => {
    const geo = buildRiverGeometry([line([130, 131], [0, 0])], 512, 128, () => 0);
    expect(geo.map((g) => g.x0)).toEqual([128]);
  });
});
