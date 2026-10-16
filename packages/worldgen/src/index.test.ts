import { describe, expect, it } from 'vitest';
import { createGridWorld, hashWorldStatic, neighborsOf, validateWorldStatic } from './index';

describe('mundo de grilla (fixture de P1.0)', () => {
  it('es determinista y su hash depende de la seed', () => {
    const a = createGridWorld({ seed: 1, width: 12, height: 6 });
    const b = createGridWorld({ seed: 1, width: 12, height: 6 });
    const c = createGridWorld({ seed: 2, width: 12, height: 6 });
    expect(a.hash).toBe(b.hash);
    expect(a.hash).not.toBe(c.hash);
    expect(a.hash).toBe('b869886bdb091c50');
  });

  it('wrap E-O: la primera y la última columna son vecinas', () => {
    const w = createGridWorld({ seed: 1, width: 12, height: 6 });
    expect([...neighborsOf(w.graph, 1)]).toEqual([2, 12, 13]);
    expect([...neighborsOf(w.graph, 12)]).toContain(1);
  });

  it('el grafo es simétrico y creciente (validateWorldStatic)', () => {
    const w = createGridWorld({ seed: 3, width: 20, height: 10 });
    expect(() => {
      validateWorldStatic(w);
    }).not.toThrow();
    // control negativo: una arista sin vuelta falla
    const broken = { ...w, graph: { ...w.graph, neighbors: w.graph.neighbors.slice() } };
    broken.graph.neighbors[0] = 3;
    expect(() => {
      validateWorldStatic(broken);
    }).toThrow(/sin vuelta|no crecientes/);
  });

  it('cualquier cambio de datos cambia el hash', () => {
    const w = createGridWorld({ seed: 1, width: 12, height: 6 });
    const area = w.provinces.area.slice();
    area[5] = (area[5] ?? 0) + 1;
    expect(hashWorldStatic({ ...w, provinces: { ...w.provinces, area } })).not.toBe(w.hash);
  });
});
