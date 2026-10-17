import type { events } from '@ws/core';
import { Sim } from '@ws/sim';
import { generateWorld, type WorldStatic } from '@ws/worldgen';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  captureFrame,
  canContinue,
  cloneFrame,
  decodeWsim,
  dequantizePopulation,
  encodeWsim,
  History,
  type HistoryData,
  quantizePopulation,
  type VisualFrame,
} from './index';

// Una corrida de 6.000 años en el mundo chico, grabada, con la "verdad" (estado real) tomada en
// algunos años para comparar las consultas a la fecha. Las latencias (D45) no se miden acá
// (frágiles en paralelo): las mide `ws run --wsim` sobre el mundo medium.
vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

/** Copia profunda de lo visible, como la que hace `postMessage` con `viewData`. */
function copyData(d: HistoryData): HistoryData {
  const a = d.aggregates;
  return {
    ...d,
    visual: d.visual.map(cloneFrame),
    deltas: d.deltas.map((x) => x.slice()),
    series: d.series.map((x) => ({ population: x.population.slice(), urban: x.urban.slice() })),
    aggregates: {
      population: [...a.population],
      polities: [...a.polities],
      largestPolity: [...a.largestPolity],
      era: [...a.era],
      urbanization: [...a.urbanization],
    },
    events: d.events.map((x) => [...x]),
    keyframes: new Map(),
  };
}

const YEARS = 6000;
const PROBES = [-11950, -11001, -9001, -9000, -7777, -6500, -6001];

let world: WorldStatic;
let sim: Sim;
let history: History;
/** Espejo del hilo principal: arranca con `viewData` y recibe lotes (copiados como en postMessage). */
let mirror: History;
const truth = new Map<number, { frame: VisualFrame; hash: string; population: Float64Array }>();
const allEvents: events.GameEvent[] = [];

beforeAll(() => {
  world = generateWorld({ seed: 1, size: 'small', mapType: 'continents', landFraction: 0.3 });
  sim = Sim.create(world);
  history = History.start(sim);
  mirror = History.fromData(world, copyData(history.viewData()));
  for (let i = 0; i < YEARS; i++) {
    const result = sim.step();
    history.record(sim, result);
    // Lotes de largo variable, como las tandas del Worker.
    if (i % 37 === 0 || i === YEARS - 1) mirror.append(history.drain());
    allEvents.push(...result.events);
    if (PROBES.includes(result.year)) {
      truth.set(result.year, {
        frame: captureFrame(sim.ctx),
        hash: sim.hash(),
        population: sim.ctx.derived.provincePopulation.slice(),
      });
    }
  }
});

function expectSameFrame(a: VisualFrame, b: VisualFrame): void {
  expect([...a.owner]).toEqual([...b.owner]);
  expect([...a.level]).toEqual([...b.level]);
  expect([...a.culture]).toEqual([...b.culture]);
  expect([...a.innovations]).toEqual([...b.innovations]);
  expect([...a.capitals.entries()].sort((x, y) => x[0] - y[0])).toEqual(
    [...b.capitals.entries()].sort((x, y) => x[0] - y[0]),
  );
}

describe('historia · consultas a la fecha', () => {
  it('el mapa de cualquier año es el del estado real de ese año', () => {
    expect(history.years).toBe(YEARS);
    for (const [year, t] of truth) expectSameFrame(history.mapAt(year), t.frame);
    // La corrida tuvo de todo: dueños, asentamientos e innovaciones (propiedad observable).
    const last = truth.get(-6001)?.frame;
    expect(last?.owner.some((o) => o !== 0)).toBe(true);
    expect(last?.level.some((l) => l !== 255)).toBe(true);
    expect(last?.innovations.some((b) => b !== 0)).toBe(true);
  });

  it('la población a la fecha sale de la serie (exacta en las muestras, interpolada entre)', () => {
    // Muestras en k = 1000, 3000 y 6000 (fin de −11001, −9001 y −6001).
    for (const year of [-11001, -9001, -6001]) {
      const t = truth.get(year);
      const s = history.seriesAt(year);
      for (let p = 1; p <= world.provinces.count; p++) {
        const real = t?.population[p] ?? 0;
        expect(Math.abs((s.population[p] ?? 0) - real)).toBeLessThanOrEqual(real * 0.002 + 1);
      }
    }
    // Entre muestras: interpolación lineal, acotada por los vecinos.
    const t = truth.get(-9000);
    const s = history.seriesAt(-9000);
    const lo = history.seriesAt(-9001);
    const hi = history.seriesAt(-8991);
    let near = 0;
    for (let p = 1; p <= world.provinces.count; p++) {
      const v = s.population[p] ?? 0;
      const a = lo.population[p] ?? 0;
      const b = hi.population[p] ?? 0;
      expect(v).toBeGreaterThanOrEqual(Math.min(a, b) - 1e-6);
      expect(v).toBeLessThanOrEqual(Math.max(a, b) + 1e-6);
      const real = t?.population[p] ?? 0;
      if (Math.abs(v - real) <= real * 0.05 + 1) near++;
    }
    expect(near / world.provinces.count).toBeGreaterThan(0.9);
  });

  it('cuantización de la población: ida y vuelta con error relativo chico', () => {
    for (const persons of [1, 12, 1500, 2.3e5, 7.7e7, 9e9]) {
      const back = dequantizePopulation(quantizePopulation(persons));
      expect(Math.abs(back - persons) / persons).toBeLessThan(0.002);
    }
    expect(quantizePopulation(0)).toBe(0);
  });

  it('estado completo exacto a una fecha: keyframe + re-simulación', () => {
    for (const year of [-11950, -9000, -6500]) {
      expect(history.fullStateAt(year).hash()).toBe(truth.get(year)?.hash);
    }
  });

  it('los eventos de un rango son los del log, en orden', () => {
    const expected = allEvents.filter((e) => e.year >= -7000 && e.year <= -6500);
    expect(history.eventsBetween(-7000, -6500)).toEqual(expected);
  });

  it('las polities a la fecha se arman desde las provincias', () => {
    const f = history.mapAt(-6001);
    const id = f.owner.find((o) => o !== 0) ?? 0;
    const at = history.polityAt(id, -6001);
    expect(at.provinces.length).toBeGreaterThan(0);
    expect(at.population).toBeGreaterThan(0);
  });
});

describe('historia · espejo del hilo principal (lotes del Worker, D49)', () => {
  it('con los lotes, el espejo ve lo mismo que la historia del Worker', () => {
    expect(mirror.years).toBe(YEARS);
    for (const [year, t] of truth) expectSameFrame(mirror.mapAt(year), t.frame);
    expect(mirror.data.aggregates).toEqual(history.data.aggregates);
    expect(mirror.data.series.length).toBe(history.data.series.length);
    expect([...(mirror.data.series.at(-1)?.population ?? [])]).toEqual([
      ...(history.data.series.at(-1)?.population ?? []),
    ]);
    expect(mirror.eventsBetween(-7000, -6500)).toEqual(history.eventsBetween(-7000, -6500));
    // Sin keyframes completos: el estado exacto se pide al Worker.
    expect(mirror.data.keyframes.size).toBe(0);
    expect(() => mirror.fullStateAt(-9000)).toThrow(/keyframe/);
  });

  it('un lote fuera de orden se rechaza; uno vacío no cambia nada', () => {
    const empty = history.drain();
    expect(empty.deltas.length).toBe(0);
    mirror.append(empty);
    expect(mirror.years).toBe(YEARS);
    expect(() => {
      mirror.append({ ...empty, fromK: YEARS + 5 });
    }).toThrow(/lote/);
  });
});

describe('historia · .wsim v0', () => {
  it('ida y vuelta: mapa, agregados, eventos y continuación exacta', () => {
    const bytes = encodeWsim(world.params, world.hash, history.data, sim.snapshot());
    const file = decodeWsim(bytes);
    expect(file.header.worldHash).toBe(world.hash);
    expect(file.header.years).toBe(YEARS);
    expect(canContinue(file.header)).toBe(true);
    const loaded = History.fromData(world, file.data);
    for (const [year, t] of truth) expectSameFrame(loaded.mapAt(year), t.frame);
    expect(loaded.data.aggregates.population).toEqual(history.data.aggregates.population);
    // La serie va en diferencias en el archivo: vuelve idéntica.
    expect(loaded.data.series.length).toBe(history.data.series.length);
    loaded.data.series.forEach((s, i) => {
      expect([...s.population]).toEqual([...(history.data.series[i]?.population ?? [])]);
      expect([...s.urban]).toEqual([...(history.data.series[i]?.urban ?? [])]);
    });
    expect(loaded.eventsBetween(-7000, -6500)).toEqual(history.eventsBetween(-7000, -6500));
    // En el archivo los keyframes van cada 1.000 años: el estado completo se re-simula desde ahí.
    expect([...file.data.keyframes.keys()].every((k) => k % 1000 === 0)).toBe(true);
    expect(loaded.fullStateAt(-7777).hash()).toBe(truth.get(-7777)?.hash);
    // El estado final exacto continúa la corrida con hash idéntico.
    const resumed = Sim.load(world, file.final);
    expect(resumed.hash()).toBe(sim.hash());
  });

  it('rechaza lo que no es un .wsim', () => {
    const bytes = encodeWsim(world.params, world.hash, history.data, sim.snapshot());
    const broken = bytes.slice();
    broken[0] = 0;
    expect(() => decodeWsim(broken)).toThrow(/magic/);
  });
});
