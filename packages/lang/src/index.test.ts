import { rng } from '@ws/core';
import { describe, expect, it } from 'vitest';
import { createPhonology, makeName } from './index';

const draw = (entity: number) => rng.createRng(7).stream(rng.Streams.naming).sub(9).at(entity, 0);

describe('idioma v1', () => {
  it('la fonología es determinista por seed y varía entre seeds', () => {
    expect(createPhonology(1)).toEqual(createPhonology(1));
    const inventories = new Set(
      Array.from({ length: 20 }, (_, s) => createPhonology(s).consonants.join(',')),
    );
    expect(inventories.size).toBeGreaterThan(15);
  });

  it('los nombres son reproducibles, legibles y con mayúscula inicial', () => {
    const ph = createPhonology(3);
    const names = Array.from({ length: 300 }, (_, k) => makeName(ph, 'place', draw(k)));
    expect(names).toEqual(Array.from({ length: 300 }, (_, k) => makeName(ph, 'place', draw(k))));
    for (const name of names) {
      expect(name).toMatch(/^[A-Z][a-z]+$/);
      expect(name.length).toBeGreaterThanOrEqual(2);
      expect(name.length).toBeLessThanOrEqual(24);
      expect(name.toLowerCase()).not.toMatch(/(.)\1\1|aa|ee|ii|oo|uu/);
    }
    expect(new Set(names).size).toBeGreaterThan(200); // variedad dentro de un idioma
  });

  it('dos idiomas suenan distinto (pocas coincidencias de nombres)', () => {
    const a = createPhonology(10);
    const b = createPhonology(11);
    const na = new Set(Array.from({ length: 200 }, (_, k) => makeName(a, 'person', draw(k))));
    const nb = Array.from({ length: 200 }, (_, k) => makeName(b, 'person', draw(k)));
    expect(nb.filter((n) => na.has(n)).length).toBeLessThan(10);
  });
});
