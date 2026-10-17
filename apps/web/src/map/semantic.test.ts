import { describe, expect, it } from 'vitest';
import { RIVERS, SEMANTIC_ZOOM } from './config';
import { semanticState } from './semantic';

const W = 2048;
const M_PER_CELL = 19_568;

describe('zoom semántico v0', () => {
  it('de cerca relieve completo; de lejos plano, con más relleno y solo los ríos grandes', () => {
    const near = semanticState(30, W, M_PER_CELL, 30);
    const far = semanticState(600, W, M_PER_CELL, 30);
    expect(near.relief).toBe(1);
    expect(near.heightScale).toBeCloseTo(30 / M_PER_CELL, 12);
    expect(near.riverMinT).toBe(0);
    expect(near.fillOpacity).toBeCloseTo(SEMANTIC_ZOOM.fillNear, 9);
    expect(far.relief).toBe(0);
    expect(far.heightScale).toBe(0);
    expect(far.shadeScale).toBeGreaterThan(0); // queda un sombreado mínimo
    expect(far.fillOpacity).toBeCloseTo(SEMANTIC_ZOOM.fillFar, 9);
    expect(far.riverMinT).toBeCloseTo(RIVERS.farMinFlowT, 9);
    expect(far.provinceBorderAlpha).toBe(0);
    expect(near.provinceBorderAlpha).toBeGreaterThan(0);
  });

  it('el relieve baja de forma monótona con la distancia', () => {
    let previous = Infinity;
    for (let d = 25; d <= 600; d += 5) {
      const { relief } = semanticState(d, W, M_PER_CELL, 30);
      expect(relief).toBeLessThanOrEqual(previous);
      previous = relief;
    }
  });

  it('las distancias se escalan con el ancho del mundo (el chico se ve igual)', () => {
    const medium = semanticState(300, 2048, M_PER_CELL, 30);
    const small = semanticState(150, 1024, 2 * M_PER_CELL, 30);
    expect(small.relief).toBeCloseTo(medium.relief, 12);
  });
});
