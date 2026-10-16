/* eslint-disable no-restricted-syntax -- oráculo: Math nativo SOLO para medir precisión en tests */
import { describe, expect, it } from 'vitest';
import * as M from './index';

function sweep(a: number, b: number, n: number, logScale = false): number[] {
  const out: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push(logScale ? a * Math.pow(b / a, t) : a + (b - a) * t);
  }
  return out;
}

/** Peor caso de |ours − oracle| − (relTol·|oracle| + absTol); ≤ 0 es pasar. */
function worst(
  ours: (x: number) => number,
  oracle: (x: number) => number,
  xs: number[],
  relTol: number,
  absTol = 0,
): { excess: number; at: number } {
  let excess = -Infinity;
  let at = Number.NaN;
  for (const x of xs) {
    const a = ours(x);
    const b = oracle(x);
    if (Object.is(a, b)) continue;
    const e = Math.abs(a - b) - (relTol * Math.abs(b) + absTol);
    if (e > excess) {
      excess = e;
      at = x;
    }
  }
  return { excess, at };
}

const N = 20000;
// Cotas ≈ 4–5 ulp: la implementación mide ≤ 2,2 ulp contra V8 (ADR-003).
const REL = 1e-15;

describe('core/math · precisión vs Math nativo', () => {
  it.each([
    ['exp', M.exp, Math.exp, sweep(-745, 709, N), REL, 0],
    ['log', M.log, Math.log, sweep(1e-300, 1e300, N, true), REL, 0],
    ['log ~1', M.log, Math.log, sweep(0.5, 2, N), REL, 1e-16],
    ['expm1', M.expm1, Math.expm1, sweep(-1, 1, N), REL, 0],
    ['expm1 chico', M.expm1, Math.expm1, sweep(1e-12, 1e-1, N, true), REL, 0],
    ['log1p', M.log1p, Math.log1p, sweep(1e-12, 1, N, true), REL, 0],
    ['log2', M.log2, Math.log2, sweep(1e-10, 1e10, N, true), REL, 0],
    ['log10', M.log10, Math.log10, sweep(1e-10, 1e10, N, true), REL, 0],
    ['sin', M.sin, Math.sin, sweep(-1e4, 1e4, N), REL, 1e-16],
    ['cos', M.cos, Math.cos, sweep(-1e4, 1e4, N), REL, 1e-16],
    ['tan', M.tan, Math.tan, sweep(-10, 10, N), REL, 1e-16],
    ['atan', M.atan, Math.atan, sweep(-1e6, 1e6, N), REL, 0],
    ['atan chico', M.atan, Math.atan, sweep(-3, 3, N), REL, 0],
    ['asin', M.asin, Math.asin, sweep(-1, 1, N), REL, 1e-16],
    ['acos', M.acos, Math.acos, sweep(-1, 1, N), REL, 1e-16],
    ['tanh', M.tanh, Math.tanh, sweep(-25, 25, N), REL, 0],
  ] as const)('%s', (_name, ours, oracle, xs, rel, abs) => {
    const { excess, at } = worst(ours, oracle, xs, rel, abs);
    expect(excess, `peor caso en x = ${at}`).toBeLessThanOrEqual(0);
  });

  it('pow: error relativo ≤ 1e-13 con |y·ln x| ≤ 70', () => {
    for (const x of sweep(1e-3, 1e3, 300, true)) {
      const { excess, at } = worst(
        (y) => M.pow(x, y),
        (y) => Math.pow(x, y),
        sweep(-10, 10, 300),
        1e-13,
      );
      expect(excess, `x = ${x}, y = ${at}`).toBeLessThanOrEqual(0);
    }
  });

  it('atan2 e hypot en una grilla 2D', () => {
    for (const y of sweep(-50, 50, 200)) {
      expect(
        worst(
          (x) => M.atan2(y, x),
          (x) => Math.atan2(y, x),
          sweep(-50, 50, 200),
          REL,
        ).excess,
      ).toBeLessThanOrEqual(0);
      expect(
        worst(
          (x) => M.hypot(y, x),
          (x) => Math.hypot(y, x),
          sweep(-1e3, 1e3, 200),
          REL,
        ).excess,
      ).toBeLessThanOrEqual(0);
    }
  });
});

const SPECIAL = [0, -0, 1, -1, 0.5, -0.5, 2, -2, 3, -3, Infinity, -Infinity, NaN];

describe('core/math · casos especiales idénticos a Math (Object.is)', () => {
  it.each([
    ['exp', M.exp, Math.exp],
    ['log', M.log, Math.log],
    ['expm1', M.expm1, Math.expm1],
    ['log1p', M.log1p, Math.log1p],
    ['log2', M.log2, Math.log2],
    ['sin', M.sin, Math.sin],
    ['cos', M.cos, Math.cos],
    ['tan', M.tan, Math.tan],
    ['atan', M.atan, Math.atan],
    ['tanh', M.tanh, Math.tanh],
  ] as const)('%s', (_name, ours, oracle) => {
    for (const x of [...SPECIAL, 1e-320, -1e-320, 1e-10, 710, -746]) {
      const a = ours(x);
      const b = oracle(x);
      // Para valores finitos no especiales basta la precisión; acá se exige igualdad exacta
      // en ceros, infinitos, NaN y valores triviales.
      if (Object.is(b, 0) || Object.is(b, -0) || !Number.isFinite(b) || b === 1 || b === -1) {
        expect(Object.is(a, b), `${_name}(${x}) = ${a}, esperado ${b}`).toBe(true);
      } else {
        expect(Math.abs(a - b)).toBeLessThanOrEqual(REL * Math.abs(b));
      }
    }
  });

  it('pow: semántica de JavaScript en toda la grilla de especiales', () => {
    for (const x of SPECIAL) {
      for (const y of [...SPECIAL, 0.25, 65, -65]) {
        const a = M.pow(x, y);
        const b = Math.pow(x, y);
        if (Number.isFinite(b) && b !== 0) {
          expect(Math.abs(a - b), `pow(${x}, ${y})`).toBeLessThanOrEqual(1e-13 * Math.abs(b));
        } else {
          expect(Object.is(a, b), `pow(${x}, ${y}) = ${a}, esperado ${b}`).toBe(true);
        }
      }
    }
  });

  it('atan2: ceros con signo e infinitos', () => {
    for (const y of SPECIAL) {
      for (const x of SPECIAL) {
        const a = M.atan2(y, x);
        const b = Math.atan2(y, x);
        expect(Object.is(a, b) || Math.abs(a - b) <= REL * Math.abs(b), `atan2(${y}, ${x})`).toBe(
          true,
        );
      }
    }
  });

  it('exactitudes útiles', () => {
    expect(M.pow(2, 10)).toBe(1024);
    expect(M.pow(9, 0.5)).toBe(3);
    expect(M.log2(1024)).toBe(10);
    expect(M.log2(0.125)).toBe(-3);
    expect(M.exp(0)).toBe(1);
    expect(M.log(1)).toBe(0);
  });
});
