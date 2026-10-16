// Texturas procedurales del splat (pasto, roca, nieve): RGBA8 en sRGB, repetibles sin costura.
// Se generan en código con el RNG de @ws/core: no hay assets externos ni licencias que anotar.
import { createRng, Streams } from '@ws/core/rng';
import type { Draw } from '@ws/core/rng';

/** Sub-streams del stream `spike` para las texturas (no reasignar; 1 y 2 son del heightmap). */
const SUB_GRASS = 11;
const SUB_ROCK = 12;
const SUB_SNOW = 13;

/**
 * Período de la octava base, en celdas de la grilla de ruido por lado de textura. Sin octavas muy
 * bajas: la variación grande la pone la segunda escala del shader.
 */
const BASE_PERIOD = 8;

type Rgb = readonly [number, number, number];

/** Ruido de valor 2D repetible: grillas de P×P valores al azar, interpoladas con suavizado. */
class TileableNoise {
  private readonly lattices: Float32Array[] = [];
  private readonly periods: number[] = [];

  constructor(draw: Draw, basePeriod: number, octaves: number) {
    for (let o = 0; o < octaves; o++) {
      const p = basePeriod << o;
      const lattice = new Float32Array(p * p);
      for (let i = 0; i < lattice.length; i++) lattice[i] = draw.uniform();
      this.lattices.push(lattice);
      this.periods.push(p);
    }
  }

  /** u, v en [0, 1): fBm en [0, 1]. `gain` atenúa cada octava. */
  fbm(u: number, v: number, gain: number): number {
    let sum = 0;
    let amp = 1;
    let norm = 0;
    for (let o = 0; o < this.lattices.length; o++) {
      const lattice = this.lattices[o];
      const p = this.periods[o];
      if (lattice === undefined || p === undefined) break;
      sum += amp * sampleLattice(lattice, p, u * p, v * p);
      norm += amp;
      amp *= gain;
    }
    return sum / norm;
  }
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

function sampleLattice(lattice: Float32Array, p: number, x: number, y: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smooth(x - x0);
  const ty = smooth(y - y0);
  const ix0 = ((x0 % p) + p) % p;
  const iy0 = ((y0 % p) + p) % p;
  const ix1 = (ix0 + 1) % p;
  const iy1 = (iy0 + 1) % p;
  const a = lattice[iy0 * p + ix0] ?? 0;
  const b = lattice[iy0 * p + ix1] ?? 0;
  const c = lattice[iy1 * p + ix0] ?? 0;
  const d = lattice[iy1 * p + ix1] ?? 0;
  const top = a + (b - a) * tx;
  const bottom = c + (d - c) * tx;
  return top + (bottom - top) * ty;
}

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function fill(size: number, shade: (u: number, v: number) => Rgb): Uint8Array {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b] = shade(x / size, y / size);
      const i = (y * size + x) * 4;
      data[i] = Math.round(Math.min(255, Math.max(0, r)));
      data[i + 1] = Math.round(Math.min(255, Math.max(0, g)));
      data[i + 2] = Math.round(Math.min(255, Math.max(0, b)));
      data[i + 3] = 255;
    }
  }
  return data;
}

export interface SplatTextures {
  readonly size: number;
  readonly grass: Uint8Array;
  readonly rock: Uint8Array;
  readonly snow: Uint8Array;
}

export function generateSplatTextures(seed: number, size: number): SplatTextures {
  const spike = createRng(seed).stream(Streams.spike);
  const octaves = Math.log2(size / BASE_PERIOD) - 1; // la última octava ≈ 4 texels por celda

  const g = new TileableNoise(spike.sub(SUB_GRASS).at(0, 0), BASE_PERIOD, octaves);
  const grass = fill(size, (u, v) => {
    const n = g.fbm(u, v, 0.55);
    const base = mixRgb([62, 92, 38], [112, 128, 58], n);
    return mixRgb(base, [128, 118, 70], Math.max(0, n - 0.6) * 1.5);
  });

  const r = new TileableNoise(spike.sub(SUB_ROCK).at(0, 0), BASE_PERIOD, octaves);
  const rock = fill(size, (u, v) => {
    const n = r.fbm(u, v, 0.65);
    const crack = Math.abs(n - 0.5) < 0.025 ? 0.55 : 1;
    const c = mixRgb([88, 80, 72], [156, 148, 138], n);
    return [c[0] * crack, c[1] * crack, c[2] * crack];
  });

  const s = new TileableNoise(spike.sub(SUB_SNOW).at(0, 0), BASE_PERIOD, octaves);
  const snow = fill(size, (u, v) => mixRgb([206, 216, 232], [250, 252, 255], s.fbm(u, v, 0.5)));

  return { size, grass, rock, snow };
}
