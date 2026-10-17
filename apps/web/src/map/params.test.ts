import { rng } from '@ws/core';
import { describe, expect, it } from 'vitest';
import { DEFAULT_VERTICAL_EXAGGERATION } from './config';
import { DEFAULT_SEED, parseSeed, readMapParams } from './params';

describe('parámetros de la URL', () => {
  it('sin parámetros: mundo mediano de continentes, semilla por defecto, WebGPU automático', () => {
    const p = readMapParams('');
    expect(p.world).toEqual({
      seed: DEFAULT_SEED,
      size: 'medium',
      mapType: 'continents',
      landFraction: 0.3,
    });
    expect(p.backend).toBe('auto');
    expect(p.exaggeration).toBe(DEFAULT_VERTICAL_EXAGGERATION);
    expect(p.colors).toBe('biome');
    expect(p.tour).toBe(false);
    expect(p.repeat).toBe(1);
  });

  it('lee mundo, backend y medición; descarta valores inválidos', () => {
    const p = readMapParams(
      '?seed=42&size=small&map=archipelago&backend=webgl2&tour=1&repeat=4&lod=0&exaggeration=10&colors=id',
    );
    expect(p.world).toEqual({ seed: 42, size: 'small', mapType: 'archipelago', landFraction: 0.2 });
    expect([p.backend, p.tour, p.repeat, p.forcedLod, p.exaggeration, p.colors]).toEqual([
      'webgl2',
      true,
      4,
      0,
      10,
      'id',
    ]);
    const bad = readMapParams('?size=huge&map=x&land=2&repeat=999&lod=9&colors=rojo&dpr=-1');
    expect(bad.world.size).toBe('medium');
    expect(bad.world.mapType).toBe('continents');
    expect(bad.world.landFraction).toBe(0.3);
    expect([bad.repeat, bad.forcedLod, bad.colors, bad.dpr]).toEqual([1, null, 'biome', null]);
  });

  it('la semilla puede ser un número u32 o un texto', () => {
    expect(parseSeed('7')).toBe(7);
    expect(parseSeed('4294967295')).toBe(4294967295);
    expect(parseSeed('4294967296')).toBe(rng.seedFromString('4294967296'));
    expect(parseSeed('Tierra Media')).toBe(rng.seedFromString('Tierra Media'));
    expect(parseSeed(null)).toBe(DEFAULT_SEED);
  });
});
