/*
 * sin, cos, tan, atan, atan2 portados de fdlibm (k_sin.c, k_cos.c, e_rem_pio2.c, s_atan.c,
 * e_atan2.c), versión FreeBSD.
 * ====================================================
 * Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.
 *
 * Developed at SunPro, a Sun Microsystems, Inc. business.
 * Permission to use, copy, modify, and distribute this
 * software is freely granted, provided that this notice
 * is preserved.
 * ====================================================
 * La reducción de argumento es la "media" de fdlibm (Cody–Waite con π/2 en tres partes):
 * error < 1 ulp para |x| ≤ 2^20·π/2 ≈ 1,6e6. Más allá sigue siendo determinista pero pierde
 * precisión (el motor no necesita ángulos tan grandes).
 */
import { highWord, lowWord } from './bits';

const S1 = -1.66666666666666324348e-1;
const S2 = 8.33333333332248946124e-3;
const S3 = -1.98412698298579493134e-4;
const S4 = 2.75573137070700676789e-6;
const S5 = -2.50507602534068634195e-8;
const S6 = 1.58969099521155010221e-10;

/** sin en [−π/4, π/4]; y es la cola de x (x + y con precisión extendida). */
function kSin(x: number, y: number, hasTail: boolean): number {
  const z = x * x;
  const w = z * z;
  const r = S2 + z * (S3 + z * S4) + z * w * (S5 + z * S6);
  const v = z * x;
  if (!hasTail) return x + v * (S1 + z * r);
  return x - (z * (0.5 * y - v * r) - y - v * S1);
}

const C1 = 4.16666666666666019037e-2;
const C2 = -1.38888888888741095749e-3;
const C3 = 2.48015872894767294178e-5;
const C4 = -2.75573143513906633035e-7;
const C5 = 2.0875723212981748279e-9;
const C6 = -1.13596475577881948265e-11;

/** cos en [−π/4, π/4]. */
function kCos(x: number, y: number): number {
  const z = x * x;
  let w = z * z;
  const r = z * (C1 + z * (C2 + z * C3)) + w * w * (C4 + z * (C5 + z * C6));
  const hz = 0.5 * z;
  w = 1 - hz;
  return w + (1 - w - hz + (z * r - x * y));
}

const INV_PIO2 = 6.36619772367581382433e-1;
const PIO2_1 = 1.57079632673412561417; // primeros 33 bits de π/2
const PIO2_1T = 6.07710050650619224932e-11;
const PIO2_2 = 6.0771005063039659766e-11;
const PIO2_2T = 2.02226624879595063154e-21;
const PIO2_3 = 2.0222662487111664558e-21;
const PIO2_3T = 8.47842766036889956997e-32;
const TO_INT = 6755399441055744; // 1,5·2^52: redondeo a entero (mitad a par) exacto

// Resultado de la reducción: x ≡ y0 + y1 (mod π/2).
let y0 = 0;
let y1 = 0;

/** Reduce x a [−π/4, π/4] y devuelve el cuadrante n (los resultados quedan en y0, y1). */
function remPio2(x: number): number {
  const ix = highWord(x) & 0x7fffffff;
  const fn = x * INV_PIO2 + TO_INT - TO_INT;
  const n = fn | 0;
  let r = x - fn * PIO2_1;
  let w = fn * PIO2_1T;
  const j = ix >> 20;
  y0 = r - w;
  let i = j - ((highWord(y0) >> 20) & 0x7ff);
  if (i > 16) {
    // cancelación: segunda iteración (118 bits de π/2)
    let t = r;
    w = fn * PIO2_2;
    r = t - w;
    w = fn * PIO2_2T - (t - r - w);
    y0 = r - w;
    i = j - ((highWord(y0) >> 20) & 0x7ff);
    if (i > 49) {
      // tercera iteración (151 bits)
      t = r;
      w = fn * PIO2_3;
      r = t - w;
      w = fn * PIO2_3T - (t - r - w);
      y0 = r - w;
    }
  }
  y1 = r - y0 - w;
  return n;
}

/** Seno, error < 1 ulp para |x| ≤ 1,6e6. */
export function sin(x: number): number {
  const ix = highWord(x) & 0x7fffffff;
  if (ix <= 0x3fe921fb) return ix < 0x3e500000 ? x : kSin(x, 0, false);
  if (ix >= 0x7ff00000) return NaN;
  switch (remPio2(x) & 3) {
    case 0:
      return kSin(y0, y1, true);
    case 1:
      return kCos(y0, y1);
    case 2:
      return -kSin(y0, y1, true);
    default:
      return -kCos(y0, y1);
  }
}

/** Coseno, error < 1 ulp para |x| ≤ 1,6e6. */
export function cos(x: number): number {
  const ix = highWord(x) & 0x7fffffff;
  if (ix <= 0x3fe921fb) return ix < 0x3e46a09e ? 1 : kCos(x, 0);
  if (ix >= 0x7ff00000) return NaN;
  switch (remPio2(x) & 3) {
    case 0:
      return kCos(y0, y1);
    case 1:
      return -kSin(y0, y1, true);
    case 2:
      return -kCos(y0, y1);
    default:
      return kSin(y0, y1, true);
  }
}

/** Tangente (cociente de los núcleos sobre la misma reducción). */
export function tan(x: number): number {
  const ix = highWord(x) & 0x7fffffff;
  if (ix <= 0x3fe921fb) return ix < 0x3e400000 ? x : kSin(x, 0, false) / kCos(x, 0);
  if (ix >= 0x7ff00000) return NaN;
  const n = remPio2(x);
  const s = kSin(y0, y1, true);
  const c = kCos(y0, y1);
  return (n & 1) === 0 ? s / c : -c / s;
}

const ATAN_HI = [
  4.63647609000806093515e-1, 7.85398163397448278999e-1, 9.82793723247329054082e-1,
  1.570796326794896558,
] as const;
const ATAN_LO = [
  2.26987774529616870924e-17, 3.06161699786838301793e-17, 1.39033110312309984516e-17,
  6.12323399573676603587e-17,
] as const;
const AT0 = 3.33333333333329318027e-1;
const AT1 = -1.99999999998764832476e-1;
const AT2 = 1.42857142725034663711e-1;
const AT3 = -1.1111110405462355788e-1;
const AT4 = 9.09088713343650656196e-2;
const AT5 = -7.69187620504482999495e-2;
const AT6 = 6.66107313738753120669e-2;
const AT7 = -5.83357013379057348645e-2;
const AT8 = 4.97687799461593236017e-2;
const AT9 = -3.6531572744216915527e-2;
const AT10 = 1.62858201153657823623e-2;

/** Arcotangente, error < 1 ulp. */
export function atan(x: number): number {
  const hx = highWord(x);
  const ix = hx & 0x7fffffff;
  if (ix >= 0x44100000) {
    // |x| ≥ 2^66
    if (x !== x) return x;
    return hx > 0 ? ATAN_HI[3] + ATAN_LO[3] : -ATAN_HI[3] - ATAN_LO[3];
  }
  let id: number;
  if (ix < 0x3fdc0000) {
    // |x| < 0,4375
    if (ix < 0x3e400000) return x; // |x| < 2^−27
    id = -1;
  } else {
    x = Math.abs(x);
    if (ix < 0x3ff30000) {
      if (ix < 0x3fe60000) {
        id = 0;
        x = (2 * x - 1) / (2 + x);
      } else {
        id = 1;
        x = (x - 1) / (x + 1);
      }
    } else if (ix < 0x40038000) {
      id = 2;
      x = (x - 1.5) / (1 + 1.5 * x);
    } else {
      id = 3;
      x = -1 / x;
    }
  }
  const z = x * x;
  const w = z * z;
  const s1 = z * (AT0 + w * (AT2 + w * (AT4 + w * (AT6 + w * (AT8 + w * AT10)))));
  const s2 = w * (AT1 + w * (AT3 + w * (AT5 + w * (AT7 + w * AT9))));
  if (id < 0) return x - x * (s1 + s2);
  const hi = ATAN_HI[id as 0 | 1 | 2 | 3];
  const lo = ATAN_LO[id as 0 | 1 | 2 | 3];
  const result = hi - (x * (s1 + s2) - lo - x);
  return hx < 0 ? -result : result;
}

const PI = 3.141592653589793116;
const PI_LO = 1.2246467991473532e-16;
const PI_O_2 = 1.570796326794896558;
const PI_O_4 = 7.85398163397448279e-1;

/** atan2(y, x) con la semántica IEEE de ceros e infinitos. */
export function atan2(y: number, x: number): number {
  if (x !== x || y !== y) return NaN;
  const hx = highWord(x);
  const ix = hx & 0x7fffffff;
  const lx = lowWord(x);
  const hy = highWord(y);
  const iy = hy & 0x7fffffff;
  const ly = lowWord(y);
  if (x === 1) return atan(y);
  let m = ((hy >>> 31) & 1) | ((hx >>> 30) & 2); // 2·signo(x) + signo(y)

  if ((iy | ly) === 0) {
    // y = ±0
    if (m < 2) return y;
    return m === 2 ? PI : -PI;
  }
  if ((ix | lx) === 0) return hy < 0 ? -PI_O_2 : PI_O_2; // x = ±0
  if (ix === 0x7ff00000) {
    // x = ±∞
    if (iy === 0x7ff00000) {
      return [PI_O_4, -PI_O_4, 3 * PI_O_4, -3 * PI_O_4][m] ?? NaN;
    }
    return [0, -0, PI, -PI][m] ?? NaN;
  }
  if (iy === 0x7ff00000) return hy < 0 ? -PI_O_2 : PI_O_2;

  const k = (iy - ix) >> 20;
  let z: number;
  if (k > 60) {
    // |y/x| > 2^60
    z = PI_O_2 + 0.5 * PI_LO;
    m &= 1;
  } else if (hx < 0 && k < -60) {
    z = 0; // |y|/x < −2^−60
  } else {
    z = atan(Math.abs(y / x));
  }
  switch (m) {
    case 0:
      return z;
    case 1:
      return -z;
    case 2:
      return PI - (z - PI_LO);
    default:
      return z - PI_LO - PI;
  }
}

/** Arcoseno vía atan2 (preciso cerca de ±1 gracias a (1−x)(1+x)). */
export function asin(x: number): number {
  return atan2(x, Math.sqrt((1 - x) * (1 + x)));
}

/** Arcocoseno vía atan2. */
export function acos(x: number): number {
  return atan2(Math.sqrt((1 - x) * (1 + x)), x);
}
