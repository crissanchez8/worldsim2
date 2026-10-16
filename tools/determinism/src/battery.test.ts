import { describe, expect, it } from 'vitest';
import { fullRunYears, runYears, scenarioWorld, staticChecks } from './battery';

describe('batería de determinismo', () => {
  it('es reproducible en el mismo proceso (control antes de comparar entre motores)', () => {
    const world = scenarioWorld();
    expect(staticChecks(world)).toEqual(staticChecks(scenarioWorld()));
    const a: string[] = [];
    const b: string[] = [];
    runYears(world, 200, (_i, h) => a.push(h));
    runYears(scenarioWorld(), 200, (_i, h) => b.push(h));
    expect(a).toHaveLength(200);
    expect(b).toEqual(a);
  });

  it('la corrida completa va de 12.000 a.C. a 1900 (sin año 0)', () => {
    expect(fullRunYears(scenarioWorld())).toBe(13_900);
  });

  it('cubre las 18 funciones de core/math', () => {
    expect(Object.keys(staticChecks(scenarioWorld()).math)).toHaveLength(18);
  });
});
