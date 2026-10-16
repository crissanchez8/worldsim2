import { describe, expect, it } from 'vitest';
import {
  applyDelta,
  cloneView,
  createSim,
  DEFAULT_CONFIG,
  encodeDelta,
  loadSim,
  yearHash,
} from './index';

const SMALL = { ...DEFAULT_CONFIG, width: 20, height: 10, years: 200 };

describe('spike B · simulación ficticia', () => {
  it('respeta los contratos con el guard activo (50 años)', () => {
    const sim = createSim(SMALL);
    for (let i = 0; i < 50; i++) sim.step({ guard: true });
    expect(sim.year).toBe(-11950);
  });

  it('es determinista: misma seed → mismos hashes por año', () => {
    const run = () => {
      const sim = createSim(SMALL);
      return Array.from({ length: 100 }, () => yearHash(sim, sim.step()));
    };
    expect(run()).toEqual(run());
  });

  it('cambia el territorio y emite eventos', () => {
    const sim = createSim(SMALL);
    let territory = 0;
    for (let i = 0; i < 200; i++)
      territory += sim.step().events.filter((e) => e.type === 'territory.changed').length;
    expect(territory).toBeGreaterThan(5);
  });

  it('cargar un snapshot y seguir da los mismos hashes (guardar/cargar)', () => {
    const a = createSim(SMALL);
    for (let i = 0; i < 60; i++) a.step();
    const b = loadSim(a.snapshot(), SMALL);
    for (let i = 0; i < 40; i++) {
      const ra = a.step();
      const rb = b.step();
      expect(yearHash(b, rb)).toBe(yearHash(a, ra));
    }
  });

  it('los deltas visuales reconstruyen la vista de cada año', () => {
    const sim = createSim(SMALL);
    const start = sim.view();
    const replay = cloneView(start);
    let prev = start;
    for (let i = 0; i < 150; i++) {
      const r = sim.step();
      const next = sim.view();
      applyDelta(replay, encodeDelta(r.year, prev, next));
      prev = next;
      expect(replay.owners).toEqual(next.owners);
      expect(replay.cultures).toEqual(next.cultures);
    }
  });
});
