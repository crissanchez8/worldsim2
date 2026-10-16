import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createRng, defineStreams, rngUint32, rngUniform, seedFromString, Streams } from './index';

// Golden del RNG: si cambia, cambió el azar de TODOS los mundos (sube ENGINE_VERSION).
const GOLDEN_UINT32 = [3938258523, 2451884904, 382652803];
const GOLDEN_UNIFORM = 0.3148339510458915;
const GOLDEN_SEED = 869025140;

const rng = createRng(42);
const test = rng.stream(Streams.test);

function inc(counts: number[], i: number): void {
  counts[i] = (counts[i] ?? 0) + 1;
}

/** Estadístico chi-cuadrado de conteos contra frecuencia uniforme. */
function chiSquare(counts: readonly number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  const expected = total / counts.length;
  return counts.reduce((acc, c) => acc + ((c - expected) * (c - expected)) / expected, 0);
}

function correlation(xs: readonly number[], ys: readonly number[]): number {
  const n = xs.length;
  let mx = 0;
  let my = 0;
  for (let i = 0; i < n; i++) {
    mx += xs[i] ?? 0;
    my += ys[i] ?? 0;
  }
  mx /= n;
  my /= n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = (xs[i] ?? 0) - mx;
    const dy = (ys[i] ?? 0) - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  return sxy / Math.sqrt(sxx * syy);
}

// Valores críticos de chi-cuadrado con p = 0,001 (el test es determinista: no hay flakiness).
const CHI2_99_P001 = 148.23;
const CHI2_6_P001 = 22.46;

describe('rng · determinismo', () => {
  it('mismas coordenadas → misma secuencia', () => {
    const a = test.at(7, -12000);
    const b = createRng(42).stream(Streams.test).at(7, -12000);
    for (let i = 0; i < 100; i++) expect(a.uint32()).toBe(b.uint32());
  });

  it('cambiar cualquier coordenada cambia la secuencia', () => {
    const base = test.at(7, -12000).uint32();
    expect(createRng(43).stream(Streams.test).at(7, -12000).uint32()).not.toBe(base);
    expect(rng.stream(Streams.bench).at(7, -12000).uint32()).not.toBe(base);
    expect(test.sub(1).at(7, -12000).uint32()).not.toBe(base);
    expect(test.at(8, -12000).uint32()).not.toBe(base);
    expect(test.at(7, -11999).uint32()).not.toBe(base);
  });

  it('el orden de consulta entre entidades no importa (por contador, sin estado global)', () => {
    const first = [test.at(1, 100).uniform(), test.at(2, 100).uniform()];
    const second = [test.at(2, 100).uniform(), test.at(1, 100).uniform()];
    expect(second).toEqual([first[1], first[0]]);
  });

  it('el acceso sin asignaciones coincide con Draw', () => {
    const d = test.sub(3).at(9, -500);
    expect(d.uint32()).toBe(rngUint32(42, Streams.test, 3, 9, -500, 0));
    expect(d.uniform()).toBe(rngUniform(42, Streams.test, 3, 9, -500, 1));
  });

  it('seedFromString es estable', () => {
    expect(seedFromString('Pangea')).toBe(seedFromString('Pangea'));
    expect(seedFromString('Pangea')).not.toBe(seedFromString('pangea'));
  });

  it('golden: primeros valores fijos', () => {
    const d = test.at(7, -12000);
    expect([d.uint32(), d.uint32(), d.uint32()]).toEqual(GOLDEN_UINT32);
    expect(test.at(1500, 1900).uniform()).toBe(GOLDEN_UNIFORM);
    expect(seedFromString('worldSim2')).toBe(GOLDEN_SEED);
  });

  it('rechaza coordenadas no enteras', () => {
    expect(() => test.at(1.5, 0)).toThrow();
    expect(() => test.at(1, 0.5)).toThrow();
    expect(() => createRng(-0.5)).toThrow();
  });
});

describe('rng · calidad estadística', () => {
  it('uniform es uniforme a lo largo del contador (chi², 100 bins)', () => {
    const counts = new Array<number>(100).fill(0);
    const d = test.at(1, 1);
    for (let i = 0; i < 200_000; i++) inc(counts, Math.floor(d.uniform() * 100));
    expect(chiSquare(counts)).toBeLessThan(CHI2_99_P001);
  });

  it('uniform es uniforme a lo largo de entidades con k = 0 (chi², 100 bins)', () => {
    const counts = new Array<number>(100).fill(0);
    for (let e = 0; e < 200_000; e++) inc(counts, Math.floor(test.at(e, 1).uniform() * 100));
    expect(chiSquare(counts)).toBeLessThan(CHI2_99_P001);
  });

  it('uniform es uniforme a lo largo de años con k = 0 (chi², 100 bins)', () => {
    const counts = new Array<number>(100).fill(0);
    for (let y = -100_000; y < 100_000; y++) inc(counts, Math.floor(test.at(5, y).uniform() * 100));
    expect(chiSquare(counts)).toBeLessThan(CHI2_99_P001);
  });

  it('cada bit de uint32 está balanceado', () => {
    const ones = new Array<number>(32).fill(0);
    const n = 100_000;
    for (let e = 0; e < n; e++) {
      const x = test.at(e, 7).uint32();
      for (let b = 0; b < 32; b++) ones[b] = (ones[b] ?? 0) + ((x >>> b) & 1);
    }
    for (const c of ones) expect(Math.abs(c / n - 0.5)).toBeLessThan(0.01);
  });

  it('streams, entidades y pasos consecutivos no están correlacionados', () => {
    const n = 50_000;
    const a: number[] = [];
    const b: number[] = [];
    const c: number[] = [];
    const next: number[] = [];
    for (let e = 0; e < n; e++) {
      const d = test.at(e, 1);
      a.push(d.uniform());
      next.push(d.uniform());
      b.push(rng.stream(Streams.demography).at(e, 1).uniform());
      c.push(test.at(e + 1, 1).uniform());
    }
    expect(Math.abs(correlation(a, b))).toBeLessThan(0.02);
    expect(Math.abs(correlation(a, c))).toBeLessThan(0.02);
    expect(Math.abs(correlation(a, next))).toBeLessThan(0.02);
  });

  it('int(7) es uniforme (chi²)', () => {
    const counts = new Array<number>(7).fill(0);
    const d = test.at(2, 2);
    for (let i = 0; i < 70_000; i++) inc(counts, d.int(7));
    expect(chiSquare(counts)).toBeLessThan(CHI2_6_P001);
  });

  it('normal tiene media 0 y varianza 1', () => {
    const d = test.at(3, 3);
    const n = 100_000;
    let sum = 0;
    let sumSq = 0;
    for (let i = 0; i < n; i++) {
      const x = d.normal();
      sum += x;
      sumSq += x * x;
    }
    const mean = sum / n;
    expect(Math.abs(mean)).toBeLessThan(0.015);
    expect(Math.abs(sumSq / n - mean * mean - 1)).toBeLessThan(0.02);
  });

  it('weighted respeta las proporciones y nunca elige pesos 0', () => {
    const weights = [0, 1, 0, 3, 6];
    const counts = new Array<number>(weights.length).fill(0);
    const d = test.at(4, 4);
    const n = 100_000;
    for (let i = 0; i < n; i++) inc(counts, d.weighted(weights));
    expect(counts[0]).toBe(0);
    expect(counts[2]).toBe(0);
    expect(Math.abs((counts[3] ?? 0) / n - 0.3)).toBeLessThan(0.01);
    expect(Math.abs((counts[4] ?? 0) / n - 0.6)).toBeLessThan(0.01);
  });
});

describe('rng · propiedades', () => {
  const coords = fc.tuple(fc.nat({ max: 0xffffffff }), fc.integer({ min: -20000, max: 3000 }));

  it('int(n) ∈ [0, n)', () => {
    fc.assert(
      fc.property(coords, fc.integer({ min: 1, max: 2 ** 32 }), ([e, y], n) => {
        const v = test.at(e, y).int(n);
        expect(Number.isInteger(v) && v >= 0 && v < n).toBe(true);
      }),
    );
  });

  it('intBetween incluye ambos extremos y no se sale', () => {
    fc.assert(
      fc.property(coords, fc.integer({ min: -100, max: 100 }), fc.nat(50), ([e, y], min, span) => {
        const v = test.at(e, y).intBetween(min, min + span);
        expect(v >= min && v <= min + span).toBe(true);
      }),
    );
  });

  it('shuffle es una permutación', () => {
    fc.assert(
      fc.property(coords, fc.array(fc.integer(), { maxLength: 60 }), ([e, y], xs) => {
        const shuffled = test.at(e, y).shuffle([...xs]);
        const cmp = (a: number, b: number) => a - b;
        expect([...shuffled].sort(cmp)).toEqual([...xs].sort(cmp));
      }),
    );
  });

  it('uniform ∈ [0, 1)', () => {
    fc.assert(
      fc.property(coords, ([e, y]) => {
        const u = test.at(e, y).uniform();
        expect(u >= 0 && u < 1).toBe(true);
      }),
    );
  });
});

describe('rng · registro de streams', () => {
  it('los ids del registro son únicos', () => {
    // eslint-disable-next-line no-restricted-properties -- test de unicidad, el orden no importa
    const ids = Object.values(Streams);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('defineStreams rechaza duplicados y fuera de rango', () => {
    expect(() => defineStreams({ a: 1, b: 1 })).toThrow(/comparten id 1/);
    expect(() => defineStreams({ a: 0 })).toThrow();
    expect(() => defineStreams({ a: 0x10000 })).toThrow();
  });
});
