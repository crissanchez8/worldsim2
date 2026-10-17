import { describe, expect, it } from 'vitest';
import {
  Biomes,
  classifyBiome,
  Eras,
  Innovations,
  MapTypes,
  SettlementLevels,
  WorldSizes,
} from './index';

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

describe('Innovations, Eras y SettlementLevels', () => {
  it('cada prerrequisito existe y está antes en la tabla (grafo acíclico)', () => {
    Innovations.rows.forEach((row, i) => {
      for (const pre of row.prerequisites) expect(Innovations.indexOf(pre)).toBeLessThan(i);
    });
  });

  it('entran en el bitset de 32 bits de Province.knownInnovations', () => {
    expect(Innovations.rows.length).toBeLessThanOrEqual(32);
  });

  it('los requisitos de asentamiento y las entradas de era existen', () => {
    for (const row of Innovations.rows) {
      if (row.requires.settlement) SettlementLevels.indexOf(row.requires.settlement);
    }
    for (const era of Eras.rows) for (const key of era.enteredBy) Innovations.indexOf(key);
    expect(Eras.rows[0]?.enteredBy).toEqual([]);
  });

  it('los niveles de asentamiento crecen', () => {
    const mins = SettlementLevels.rows.map((r) => r.minUrban);
    expect([...mins].sort((a, b) => a - b)).toEqual(mins);
  });
});
