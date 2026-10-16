/* eslint-disable @typescript-eslint/no-non-null-assertion -- índices < 512 por construcción;
   evita una rama por lectura en el lazo más caliente del spike (≈30 M llamadas por mapa). */
// Ruido de gradiente 3D ("improved noise" de Perlin, 2002) con la permutación sacada del RNG de
// @ws/core. Solo usa + − × ÷ y Math.floor: bit a bit igual en todo motor JS.
import type { Draw } from '@ws/core/rng';

/** Tabla de permutación duplicada (512 entradas) para evitar el módulo en el lazo caliente. */
export type Perm = Uint8Array;

export function createPerm(draw: Draw): Perm {
  const base: number[] = [];
  for (let i = 0; i < 256; i++) base.push(i);
  draw.shuffle(base);
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = base[i & 255] ?? 0;
  return perm;
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function grad(hash: number, x: number, y: number, z: number): number {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

/** Ruido en ≈[−1, 1], continuo, con período 256 en cada eje. */
export function noise3(perm: Perm, x: number, y: number, z: number): number {
  const fx = Math.floor(x);
  const fy = Math.floor(y);
  const fz = Math.floor(z);
  const X = fx & 255;
  const Y = fy & 255;
  const Z = fz & 255;
  x -= fx;
  y -= fy;
  z -= fz;
  const u = fade(x);
  const v = fade(y);
  const w = fade(z);
  const A = perm[X]! + Y;
  const AA = perm[A]! + Z;
  const AB = perm[A + 1]! + Z;
  const B = perm[X + 1]! + Y;
  const BA = perm[B]! + Z;
  const BB = perm[B + 1]! + Z;
  const x1 = x - 1;
  const y1 = y - 1;
  const z1 = z - 1;
  const g000 = grad(perm[AA]!, x, y, z);
  const g100 = grad(perm[BA]!, x1, y, z);
  const g010 = grad(perm[AB]!, x, y1, z);
  const g110 = grad(perm[BB]!, x1, y1, z);
  const g001 = grad(perm[AA + 1]!, x, y, z1);
  const g101 = grad(perm[BA + 1]!, x1, y, z1);
  const g011 = grad(perm[AB + 1]!, x, y1, z1);
  const g111 = grad(perm[BB + 1]!, x1, y1, z1);
  const x00 = g000 + u * (g100 - g000);
  const x10 = g010 + u * (g110 - g010);
  const x01 = g001 + u * (g101 - g001);
  const x11 = g011 + u * (g111 - g011);
  const y0 = x00 + v * (x10 - x00);
  const y1v = x01 + v * (x11 - x01);
  return y0 + w * (y1v - y0);
}

/** fBm: suma de octavas con lacunaridad 2. Resultado ≈[−1, 1]. */
export function fbm3(
  perm: Perm,
  x: number,
  y: number,
  z: number,
  octaves: number,
  gain: number,
): number {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  let f = 1;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise3(perm, x * f, y * f, z * f);
    norm += amp;
    amp *= gain;
    f *= 2;
  }
  return sum / norm;
}

/** fBm "ridged": crestas afiladas (1 − |ruido|)², para cordilleras. Resultado en [0, 1]. */
export function ridged3(
  perm: Perm,
  x: number,
  y: number,
  z: number,
  octaves: number,
  gain: number,
): number {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  let f = 1;
  for (let o = 0; o < octaves; o++) {
    const r = 1 - Math.abs(noise3(perm, x * f, y * f, z * f));
    sum += amp * r * r;
    norm += amp;
    amp *= gain;
    f *= 2;
  }
  return sum / norm;
}
