import { describe, expect, it } from 'vitest';
import { Biomes, classifyBiome, MapTypes, WorldSizes } from './index';

describe('Biomes', () => {
  it('la última fila no tiene condiciones: toda celda de tierra tiene bioma', () => {
    const last = Biomes.rows.at(-1);
    expect(last).toBeDefined();
    expect([last?.tMin, last?.tMax, last?.pMin, last?.pMax, last?.minElevation]).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it('clasifica casos de referencia (tipo Whittaker)', () => {
    const at = (t: number, p: number, h = 100) => Biomes.at(classifyBiome(t, p, h)).key;
    expect(at(-20, 200)).toBe('ice');
    expect(at(-5, 300)).toBe('tundra');
    expect(at(1, 500)).toBe('taiga');
    expect(at(-1, 900, 3500)).toBe('alpine');
    expect(at(25, 100)).toBe('desert');
    expect(at(10, 400)).toBe('grassland');
    expect(at(12, 900)).toBe('temperateForest');
    expect(at(25, 800)).toBe('savanna');
    expect(at(26, 2500)).toBe('tropicalForest');
  });

  it('cada bioma de la tabla es alcanzable', () => {
    const seen = new Set<number>();
    for (let t = -30; t <= 32; t += 1) {
      for (let p = 0; p <= 4000; p += 50) {
        for (const h of [0, 3500]) seen.add(classifyBiome(t, p, h));
      }
    }
    expect(seen.size).toBe(Biomes.rows.length);
  });
});

describe('MapTypes y WorldSizes', () => {
  it('las placas continentales no superan a las placas', () => {
    for (const m of MapTypes.rows) expect(m.continentalPlates).toBeLessThanOrEqual(m.plates);
  });

  it('los anchos son potencias de 2 (el render repite texturas que dividen el ancho)', () => {
    for (const s of WorldSizes.rows) expect(s.width & (s.width - 1)).toBe(0);
  });
});
