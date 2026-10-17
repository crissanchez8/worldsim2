import { Biomes } from '@ws/content';
import { describe, expect, it } from 'vitest';
import { PALETTE } from './config';
import { biomeColors, COLOR_STRIDE, colorFromSeed, hslToRgb, provinceColors } from './colors';

describe('colores por provincia', () => {
  const provinces = { count: 4, dominantBiome: Uint8Array.from([255, 0, 3, 3, 8]) };

  it('modo bioma: cada provincia toma el color de su bioma dominante, opaco', () => {
    const rgba = provinceColors('biome', provinces);
    expect(rgba.length).toBe((provinces.count + 1) * COLOR_STRIDE);
    const key = (i: number) => Biomes.at(i).key as keyof typeof PALETTE.biome;
    expect([...rgba.subarray(4, 8)]).toEqual([...PALETTE.biome[key(0)], 255]);
    expect([...rgba.subarray(8, 12)]).toEqual([...PALETTE.biome[key(3)], 255]);
    expect([...rgba.subarray(16, 20)]).toEqual([...PALETTE.biome[key(8)], 255]);
    // El id 0 (agua) no tiene color.
    expect([...rgba.subarray(0, 4)]).toEqual([0, 0, 0, 0]);
  });

  it('modo id: un color estable por provincia, distinto entre vecinas', () => {
    const a = provinceColors('id', provinces);
    expect(provinceColors('id', provinces)).toEqual(a);
    const colors = [1, 2, 3, 4].map((id) => [...a.subarray(id * 4, id * 4 + 3)].join(','));
    expect(new Set(colors).size).toBe(4);
    expect([...a.subarray(4, 8)]).toEqual([...colorFromSeed(1), 255]);
  });

  it('modo sin relleno: alfa 0 en todas (no hay relleno ni fronteras políticas)', () => {
    const rgba = provinceColors('none', provinces);
    for (let id = 0; id <= provinces.count; id++) expect(rgba[id * 4 + 3]).toBe(0);
  });

  it('todos los biomas del contenido tienen color', () => {
    expect(biomeColors()).toHaveLength(Biomes.rows.length);
  });

  it('colorFromSeed: semillas cercanas dan tonos lejanos; HSL correcto en los primarios', () => {
    expect(hslToRgb(0, 1, 0.5)).toEqual([255, 0, 0]);
    expect(hslToRgb(1 / 3, 1, 0.5)).toEqual([0, 255, 0]);
    expect(hslToRgb(2 / 3, 1, 0.5)).toEqual([0, 0, 255]);
    const distinct = new Set(Array.from({ length: 200 }, (_, i) => colorFromSeed(i).join(',')));
    expect(distinct.size).toBeGreaterThan(190);
  });
});
