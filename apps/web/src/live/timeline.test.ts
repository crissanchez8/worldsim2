import type { events } from '@ws/core';
import { describe, expect, it } from 'vitest';
import { eraBands, kToX, MarkerIndex, xToK } from './timeline';

const ev = (significance: number, type = 'x'): events.GameEvent => ({
  id: 1,
  type,
  year: 0,
  actors: [],
  causes: [],
  data: {},
  significance,
});

describe('línea de tiempo', () => {
  it('bandas de eras por tramos, solo hasta lo visto', () => {
    const era = [0, 0, 0, 1, 1, 2, 2, 2];
    expect(eraBands(era, 7)).toEqual([
      { from: 0, to: 3, era: 0 },
      { from: 3, to: 5, era: 1 },
      { from: 5, to: 8, era: 2 },
    ]);
    expect(eraBands(era, 3)).toEqual([
      { from: 0, to: 3, era: 0 },
      { from: 3, to: 4, era: 1 },
    ]);
  });

  it('marcadores: solo los significativos, incrementales y filtrados por lo visto', () => {
    const index = new MarkerIndex(0.6);
    const log: events.GameEvent[][] = [[ev(0.2)], [ev(0.9, 'polity.formed')], []];
    index.update(log);
    log.push([ev(0.7), ev(0.1)]);
    index.update(log);
    expect(index.visible(10).map((m) => m.k)).toEqual([2, 4]);
    expect(index.visible(3).map((m) => m.type)).toEqual(['polity.formed']);
    expect(index.visible(1)).toEqual([]);
  });

  it('del puntero al estado, acotado a lo simulado', () => {
    expect(kToX(6950, 13900, 1000)).toBe(500);
    expect(xToK(500, 13900, 1000, 13900)).toBe(6950);
    expect(xToK(900, 13900, 1000, 2000)).toBe(2000);
    expect(xToK(-5, 13900, 1000, 2000)).toBe(0);
  });
});
