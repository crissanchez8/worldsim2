import { createGridWorld } from '@ws/worldgen';
import { describe, expect, it } from 'vitest';
import { MARKERS } from './config';
import { battleInstances, MARKER_FLOATS, settlementInstances, testMarkers } from './markers';

describe('marcadores', () => {
  it('asentamientos: posición, radio por nivel (acotado) y color lineal', () => {
    const data = settlementInstances([
      { x: 10.5, y: 20, level: 0 },
      { x: 3, y: 4, level: 9 },
      { x: 3, y: 4, level: -2 },
    ]);
    expect(data.length).toBe(3 * MARKER_FLOATS);
    expect([data[0], data[1], data[2]]).toEqual([10.5, 20, MARKERS.settlementRadiusPx[0]]);
    expect(data[MARKER_FLOATS + 2]).toBe(MARKERS.settlementRadiusPx.at(-1));
    expect(data[2 * MARKER_FLOATS + 2]).toBe(MARKERS.settlementRadiusPx[0]);
    for (let k = 4; k < 7; k++) {
      expect(data[k]).toBeGreaterThan(0);
      expect(data[k]).toBeLessThanOrEqual(1);
    }
  });

  it('batallas: el radio crece con la recencia', () => {
    const data = battleInstances([
      { x: 0, y: 0, recency: 0 },
      { x: 0, y: 0, recency: 1 },
    ]);
    expect(data[2]).toBe(MARKERS.battleRadiusPx[0]);
    expect(data[MARKER_FLOATS + 2]).toBe(MARKERS.battleRadiusPx[1]);
  });

  it('los datos de prueba son deterministas y caen dentro del mundo', () => {
    const world = createGridWorld({ seed: 1, width: 16, height: 8 });
    const a = testMarkers(world);
    expect(testMarkers(world)).toEqual(a);
    for (const m of [...a.settlements, ...a.battles]) {
      expect(m.x).toBeGreaterThanOrEqual(0);
      expect(m.x).toBeLessThan(world.raster.width);
      expect(m.y).toBeGreaterThanOrEqual(0);
      expect(m.y).toBeLessThan(world.raster.height);
    }
  });
});
