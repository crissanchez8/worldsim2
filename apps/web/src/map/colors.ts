// Colores por provincia (RGBA8 por id) y paleta de biomas. La API del mapa recibe un array de
// colores por provincia: el relleno político (P1.5: un color estable por id de polity con
// `colorFromSeed`; el coloreo de grafo es P2.4) y modos de prueba (bioma dominante, id).
import { Biomes } from '@ws/content';
import type { ProvinceStatic } from '@ws/worldgen';
import { PALETTE } from './config';

export type Rgb = readonly [number, number, number];

export const COLOR_MODES = ['political', 'biome', 'id', 'none'] as const;
export type ColorMode = (typeof COLOR_MODES)[number];

export function isColorMode(value: string): value is ColorMode {
  return (COLOR_MODES as readonly string[]).includes(value);
}

/** Color provisorio de cada bioma, en el orden de `Biomes` (índice = valor del ráster). */
export function biomeColors(): Rgb[] {
  const palette: Readonly<Record<string, Rgb>> = PALETTE.biome;
  return Biomes.rows.map((row) => {
    const color = palette[row.key];
    if (!color) throw new Error(`mapa: el bioma "${row.key}" no tiene color`);
    return color;
  });
}

/** Bytes por provincia en el array de colores (RGBA8). */
export const COLOR_STRIDE = 4;

function channel(v: number): number {
  return Math.min(255, Math.max(0, Math.round(v * 255)));
}

/** HSL (h, s, l ∈ [0, 1]) → sRGB 0–255. */
export function hslToRgb(h: number, s: number, l: number): Rgb {
  const k = (n: number) => (n + h * 12) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [channel(f(0)), channel(f(8)), channel(f(4))];
}

/** Mezcla de enteros de 32 bits (avalancha): semillas cercanas dan colores lejanos. */
function mix32(seed: number): number {
  let h = seed >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Saturación y luminosidad de los colores por semilla (fraction): pastel legible sobre el relieve. */
const SEED_SATURATION = [0.45, 0.7] as const;
const SEED_LIGHTNESS = [0.48, 0.66] as const;

/** Color estable para una semilla entera (p. ej. `colorSeed` de una polity o el id de prueba). */
export function colorFromSeed(seed: number): Rgb {
  const h = mix32(seed);
  const hue = (h & 0xffff) / 0x10000;
  const s =
    SEED_SATURATION[0] + (((h >>> 16) & 0xff) / 255) * (SEED_SATURATION[1] - SEED_SATURATION[0]);
  const l = SEED_LIGHTNESS[0] + ((h >>> 24) / 255) * (SEED_LIGHTNESS[1] - SEED_LIGHTNESS[0]);
  return hslToRgb(hue, s, l);
}

function fill(count: number, colorOf: (id: number) => Rgb | null): Uint8Array {
  const out = new Uint8Array((count + 1) * COLOR_STRIDE);
  for (let id = 1; id <= count; id++) {
    const c = colorOf(id);
    if (!c) continue;
    out.set([c[0], c[1], c[2], 255], id * COLOR_STRIDE);
  }
  return out;
}

/** Relleno político: un color por polity dueña (los ids no se reutilizan); sin dueño, sin relleno. */
export function politicalColors(owner: ArrayLike<number>, count: number): Uint8Array {
  return fill(count, (id) => {
    const polity = owner[id] ?? 0;
    return polity === 0 ? null : colorFromSeed(polity);
  });
}

/**
 * Colores por modo. `none` = sin relleno (alfa 0: tampoco hay fronteras políticas); `political`
 * sin dueños todavía (antes del primer año) = sin relleno.
 */
export function provinceColors(
  mode: ColorMode,
  provinces: Pick<ProvinceStatic, 'count' | 'dominantBiome'>,
  owner?: ArrayLike<number>,
): Uint8Array {
  switch (mode) {
    case 'political':
      return owner ? politicalColors(owner, provinces.count) : fill(provinces.count, () => null);
    case 'biome': {
      const colors = biomeColors();
      return fill(provinces.count, (id) => colors[provinces.dominantBiome[id] ?? 0] ?? null);
    }
    case 'id':
      return fill(provinces.count, colorFromSeed);
    case 'none':
      return fill(provinces.count, () => null);
  }
}
