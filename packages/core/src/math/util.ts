import { exp, expm1 } from './exp-log';

export const PI = 3.141592653589793;
export const TAU = 6.283185307179586;
export const DEG_TO_RAD = PI / 180;
export const RAD_TO_DEG = 180 / PI;

export function clamp(x: number, min: number, max: number): number {
  return x < min ? min : x > max ? max : x;
}

export function clamp01(x: number): number {
  return clamp(x, 0, 1);
}

/** Interpolación lineal: a cuando t = 0, b cuando t = 1. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Inversa de lerp: en qué fracción de [a, b] está x (sin acotar). */
export function invLerp(a: number, b: number, x: number): number {
  return (x - a) / (b - a);
}

/** Lleva x de [inMin, inMax] a [outMin, outMax] (sin acotar). */
export function remap(x: number, inMin: number, inMax: number, outMin: number, outMax: number) {
  return lerp(outMin, outMax, invLerp(inMin, inMax, x));
}

/** Hermite cúbica entre edge0 y edge1, acotada a [0, 1]. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01(invLerp(edge0, edge1, x));
  return t * t * (3 - 2 * t);
}

/** Módulo con resultado en [0, period): para coordenadas con wrap este-oeste (cilindro). */
export function wrap(x: number, period: number): number {
  let r = x - Math.floor(x / period) * period;
  // Bordes de redondeo: x/period puede irse a −0 (x subnormal negativo) o r redondear a period.
  if (r < 0) r += period;
  if (r >= period) r -= period;
  return r;
}

/** Diferencia más corta de a hacia b en un dominio periódico, en [−period/2, period/2). */
export function wrapDelta(a: number, b: number, period: number): number {
  return wrap(b - a + period / 2, period) - period / 2;
}

/** Tangente hiperbólica. */
export function tanh(x: number): number {
  if (x !== x) return x;
  const ax = Math.abs(x);
  if (ax > 22) return x > 0 ? 1 : -1;
  if (ax < 3.725290298461914e-9) return x; // 2^−28
  let z: number;
  if (ax >= 1) {
    z = 1 - 2 / (expm1(2 * ax) + 2);
  } else {
    const t = expm1(-2 * ax);
    z = -t / (t + 2);
  }
  return x < 0 ? -z : z;
}

/** Sigmoide logística 1 / (1 + e^−x), estable para |x| grande. */
export function sigmoid(x: number): number {
  if (x >= 0) return 1 / (1 + exp(-x));
  const e = exp(x);
  return e / (1 + e);
}

/** √(a² + b²) sin overflow intermedio. */
export function hypot(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  if (a === Infinity || b === Infinity) return Infinity;
  if (a !== a || b !== b) return NaN;
  if (a < b) [a, b] = [b, a];
  if (a === 0) return 0;
  const r = b / a;
  return a * Math.sqrt(1 + r * r);
}
