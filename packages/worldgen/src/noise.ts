// Ruido de gradiente 3D ("improved noise" de Perlin, 2002), reescrito del spike A (D47) bajo el
// lint del motor. La permutación sale del RNG por contador; solo usa + − × ÷ y Math.floor, así
// que da los mismos bits en todo motor JS. Muestreado sobre un cilindro, no tiene costura E-O.
import type { rng } from '@ws/core';
import { math } from '@ws/core';

/** Tabla de permutación duplicada (512 entradas) para evitar el módulo en el lazo caliente. */
export type Perm = Uint8Array;

export function createPerm(draw: rng.Draw): Perm {
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
  const dx = x - fx;
  const dy = y - fy;
  const dz = z - fz;
  const u = fade(dx);
  const v = fade(dy);
  const w = fade(dz);
  const A = (perm[X] ?? 0) + Y;
  const AA = (perm[A] ?? 0) + Z;
  const AB = (perm[A + 1] ?? 0) + Z;
  const B = (perm[X + 1] ?? 0) + Y;
  const BA = (perm[B] ?? 0) + Z;
  const BB = (perm[B + 1] ?? 0) + Z;
  const x1 = dx - 1;
  const y1 = dy - 1;
  const z1 = dz - 1;
  const g000 = grad(perm[AA] ?? 0, dx, dy, dz);
  const g100 = grad(perm[BA] ?? 0, x1, dy, dz);
  const g010 = grad(perm[AB] ?? 0, dx, y1, dz);
  const g110 = grad(perm[BB] ?? 0, x1, y1, dz);
  const g001 = grad(perm[AA + 1] ?? 0, dx, dy, z1);
  const g101 = grad(perm[BA + 1] ?? 0, x1, dy, z1);
  const g011 = grad(perm[AB + 1] ?? 0, dx, y1, z1);
  const g111 = grad(perm[BB + 1] ?? 0, x1, y1, z1);
  const x00 = g000 + u * (g100 - g000);
  const x10 = g010 + u * (g110 - g010);
  const x01 = g001 + u * (g101 - g001);
  const x11 = g011 + u * (g111 - g011);
  const y0 = x00 + v * (x10 - x00);
  const y1v = x01 + v * (x11 - x01);
  return y0 + w * (y1v - y0);
}

/** fBm: suma de octavas con lacunaridad 2. Resultado ≈[−1, 1]. */
export function fbm3(perm: Perm, x: number, y: number, z: number, octaves: number, gain: number) {
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
) {
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

/**
 * Coordenadas del cilindro de cada columna: el ruido 3D se muestrea en (cx, cy, y) con radio
 * `width / 2π`, así 1 celda de arco = 1 unidad (ruido isótropo) y la columna 0 es vecina de la
 * `width − 1`.
 */
export function cylinderColumns(width: number): {
  readonly cx: Float64Array;
  readonly cy: Float64Array;
} {
  const radius = width / math.TAU;
  const cx = new Float64Array(width);
  const cy = new Float64Array(width);
  for (let x = 0; x < width; x++) {
    const theta = (math.TAU * x) / width;
    cx[x] = radius * math.cos(theta);
    cy[x] = radius * math.sin(theta);
  }
  return { cx, cy };
}
