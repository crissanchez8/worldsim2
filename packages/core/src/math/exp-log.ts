/*
 * exp y log portados de fdlibm (e_exp.c, e_log.c), versión FreeBSD.
 * ====================================================
 * Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.
 *
 * Developed at SunSoft, a Sun Microsystems, Inc. business.
 * Permission to use, copy, modify, and distribute this
 * software is freely granted, provided that this notice
 * is preserved.
 * ====================================================
 * Solo usan + − × ÷ y manipulación de bits: resultados idénticos en todo motor IEEE-754.
 */
import { highWord, lowWord, pow2, withHighWord } from './bits';

const LN2_HI = 6.9314718036912381649e-1;
const LN2_LO = 1.90821492927058770002e-10;
const INV_LN2 = 1.442695040888963387;
const O_THRESHOLD = 7.09782712893383973096e2;
const U_THRESHOLD = -7.4513321910194110842e2;
const TWO_M1000 = 9.3326361850321887899e-302; // 2^−1000
const TWO_54 = 1.8014398509481984e16;

const EP1 = 1.66666666666666019037e-1;
const EP2 = -2.77777777770155933842e-3;
const EP3 = 6.61375632143793436117e-5;
const EP4 = -1.6533902205465251539e-6;
const EP5 = 4.13813679705723846039e-8;

/** e^x, error < 1 ulp. */
export function exp(x: number): number {
  const hxs = highWord(x);
  const xsb = hxs < 0 ? 1 : 0;
  const hx = hxs & 0x7fffffff;

  if (hx >= 0x40862e42) {
    // |x| ≥ 709.78…
    if (hx >= 0x7ff00000) {
      if (x !== x) return x;
      return xsb === 0 ? x : 0; // e^+∞ = +∞, e^−∞ = 0
    }
    if (x > O_THRESHOLD) return Infinity;
    if (x < U_THRESHOLD) return 0;
  }

  let hi = 0;
  let lo = 0;
  let k = 0;
  if (hx > 0x3fd62e42) {
    // |x| > 0.5·ln2: reducción x = k·ln2 + r
    if (hx < 0x3ff0a2b2) {
      hi = xsb === 0 ? x - LN2_HI : x + LN2_HI;
      lo = xsb === 0 ? LN2_LO : -LN2_LO;
      k = 1 - xsb - xsb;
    } else {
      k = Math.trunc(INV_LN2 * x + (xsb === 0 ? 0.5 : -0.5));
      hi = x - k * LN2_HI;
      lo = k * LN2_LO;
    }
    x = hi - lo;
  } else if (hx < 0x3e300000) {
    // |x| < 2^−28
    return 1 + x;
  }

  const t = x * x;
  const c = x - t * (EP1 + t * (EP2 + t * (EP3 + t * (EP4 + t * EP5))));
  if (k === 0) return 1 - ((x * c) / (c - 2) - x);
  const y = 1 - (lo - (x * c) / (2 - c) - hi);
  if (k >= -1021) return k === 1024 ? y * 2 * pow2(1023) : y * pow2(k);
  return y * pow2(k + 1000) * TWO_M1000;
}

const LG1 = 6.66666666666673513e-1;
const LG2 = 3.999999999940941908e-1;
const LG3 = 2.857142874366239149e-1;
const LG4 = 2.222219843214978396e-1;
const LG5 = 1.818357216161805012e-1;
const LG6 = 1.531383769920937332e-1;
const LG7 = 1.479819860511658591e-1;

/** Logaritmo natural, error < 1 ulp. */
export function log(x: number): number {
  let hx = highWord(x);
  const lx = lowWord(x);
  let k = 0;

  if (hx < 0x00100000) {
    // x < 2^−1022
    if (((hx & 0x7fffffff) | lx) === 0) return -Infinity; // log(±0)
    if (hx < 0) return NaN; // log(negativo)
    k -= 54; // subnormal: escalar
    x *= TWO_54;
    hx = highWord(x);
  }
  if (hx >= 0x7ff00000) return x + x; // +∞ o NaN

  k += (hx >> 20) - 1023;
  hx &= 0x000fffff;
  const i0 = (hx + 0x95f64) & 0x100000;
  x = withHighWord(x, hx | (i0 ^ 0x3ff00000)); // normaliza x o x/2 a [√2/2, √2)
  k += i0 >> 20;
  const f = x - 1;
  const dk = k;

  if ((0x000fffff & (2 + hx)) < 3) {
    // −2^−20 ≤ f < 2^−20
    if (f === 0) return k === 0 ? 0 : dk * LN2_HI + dk * LN2_LO;
    const R = f * f * (0.5 - 0.3333333333333333 * f);
    return k === 0 ? f - R : dk * LN2_HI - (R - dk * LN2_LO - f);
  }

  const s = f / (2 + f);
  const z = s * s;
  const w = z * z;
  const t1 = w * (LG2 + w * (LG4 + w * LG6));
  const t2 = z * (LG1 + w * (LG3 + w * (LG5 + w * LG7)));
  const R = t2 + t1;
  if (((hx - 0x6147a) | (0x6b851 - hx)) > 0) {
    const hfsq = 0.5 * f * f;
    return k === 0
      ? f - (hfsq - s * (hfsq + R))
      : dk * LN2_HI - (hfsq - (s * (hfsq + R) + dk * LN2_LO) - f);
  }
  return k === 0 ? f - s * (f - R) : dk * LN2_HI - (s * (f - R) - dk * LN2_LO - f);
}

/** e^x − 1, preciso cerca de 0 (truco de Kahan sobre exp/log). */
export function expm1(x: number): number {
  if (x !== x || x === Infinity) return x;
  if (x === -Infinity) return -1;
  const u = exp(x);
  if (u === 1) return x;
  const um1 = u - 1;
  if (um1 === -1) return -1;
  if (u === Infinity) return Infinity;
  return (um1 * x) / log(u);
}

/** ln(1 + x), preciso cerca de 0 (truco de Goldberg). */
export function log1p(x: number): number {
  if (x === Infinity) return x;
  const u = 1 + x;
  if (u === 1) return x;
  return (log(u) * x) / (u - 1);
}

const LOG2_E = 1.4426950408889634;
const LOG10_E = 0.4342944819032518;

/** log₂(x). Exacto para potencias de 2 normales. */
export function log2(x: number): number {
  const hx = highWord(x);
  if (hx >= 0x00100000 && hx < 0x7ff00000 && lowWord(x) === 0 && (hx & 0xfffff) === 0) {
    return (hx >> 20) - 1023;
  }
  return log(x) * LOG2_E;
}

/** log₁₀(x). */
export function log10(x: number): number {
  return log(x) * LOG10_E;
}

function isOddInteger(y: number): boolean {
  return Number.isInteger(y) && Math.abs(y % 2) === 1;
}

/** x^n para n entero con |n| ≤ 64, por cuadrados sucesivos. */
function powInt(x: number, n: number): number {
  let base = x;
  let e = Math.abs(n);
  let result = 1;
  while (e > 0) {
    if (e % 2 === 1) result *= base;
    base *= base;
    e = Math.floor(e / 2);
  }
  return n < 0 ? 1 / result : result;
}

/**
 * x^y con la semántica de casos especiales de `Math.pow` de JavaScript.
 * Exponentes enteros chicos por cuadrados; y = 0,5 por `sqrt`; el resto como exp(y·ln x)
 * (error relativo ≈ |y·ln x|·2^−53).
 */
export function pow(x: number, y: number): number {
  if (y !== y) return NaN;
  if (y === 0) return 1;
  if (x !== x) return NaN;

  const ax = Math.abs(x);
  if (y === Infinity || y === -Infinity) {
    if (ax === 1) return NaN;
    return ax > 1 === y > 0 ? Infinity : 0;
  }
  if (Number.isInteger(y) && Math.abs(y) <= 64) return powInt(x, y);
  if (x === 0 || ax === Infinity) {
    const odd = isOddInteger(y);
    const big = (ax === Infinity) === y > 0; // resultado ∞ o 0
    const negative = (x < 0 || Object.is(x, -0)) && odd;
    if (big) return negative ? -Infinity : Infinity;
    return negative ? -0 : 0;
  }
  if (x < 0) {
    if (!Number.isInteger(y)) return NaN;
    const magnitude = exp(y * log(ax));
    return isOddInteger(y) ? -magnitude : magnitude;
  }
  if (y === 0.5) return Math.sqrt(x);
  return exp(y * log(x));
}
