import { scheduler } from '@ws/core';
import { LANGUAGES, resources } from '@ws/i18n';
import { createGridWorld } from '@ws/worldgen';
import { describe, expect, it } from 'vitest';
import {
  createEventTypes,
  DEFAULT_SYSTEMS,
  Sim,
  type SimSystem,
  totalPopulation,
  yearHash,
} from './index';
import { testLoad } from './test-support/load';

const world = createGridWorld({ seed: 1, width: 12, height: 6 });
const systems = (seed = 1): readonly SimSystem[] => [...testLoad(seed), ...DEFAULT_SYSTEMS];

describe('Sim · estado inicial', () => {
  it('provincias con la misma id que el mundo estático y forrajeros en la tierra habitable', () => {
    const sim = Sim.create(world);
    const { state } = sim.ctx;
    expect(state.province.size).toBe(world.provinces.count);
    expect(state.pop.size).toBeGreaterThan(0);
    expect(totalPopulation(state)).toBeGreaterThan(0);
    expect(sim.year).toBe(-12000);
    expect(sim.ctx.derived.provincePopulation.length).toBe(world.provinces.count + 1);
  });

  it('el año salta del 1 a.C. al 1 d.C. y la corrida termina en endYear', () => {
    const sim = Sim.create(world, { startYear: -2, endYear: 2 });
    expect([sim.step().year, sim.step().year, sim.step().year, sim.step().year]).toEqual([
      -2, -1, 1, 2,
    ]);
    expect(sim.finished).toBe(true);
  });
});

describe('Sim · determinismo y continuidad', () => {
  it('300 años con la carga de prueba: guard de contratos e invariantes en cada tick', () => {
    const sim = Sim.create(world, {}, { checks: true, systems: systems() });
    let changes = 0;
    let created = 0;
    let removed = 0;
    for (let i = 0; i < 300; i++) {
      const r = sim.step();
      changes += r.tally.territoryChanges;
      created += r.tally.popsCreated;
      removed += r.tally.popsRemoved;
    }
    // La carga ejercitó de verdad lo que el ledger hace (L-004: propiedad observable).
    expect(changes).toBeGreaterThan(50);
    expect(created).toBeGreaterThan(50);
    expect(removed).toBeGreaterThan(5);
    expect(sim.ctx.state.polity.size).toBeGreaterThan(3);
  });

  it('misma seed → mismos hashes por año; otra seed → distintos', () => {
    const run = (seed: number) => {
      const sim = Sim.create(world, {}, { systems: systems(seed) });
      return Array.from({ length: 60 }, () => yearHash(sim, sim.step()));
    };
    const a = run(1);
    expect(run(1)).toEqual(a);
    expect(run(2)).not.toEqual(a);
  });

  it('golden: hash a los 200 años (si cambia a propósito, subir ENGINE_VERSION y actualizar)', () => {
    const sim = Sim.create(world, {}, { systems: systems() });
    for (let i = 0; i < 200; i++) sim.step();
    expect(sim.hash()).toBe('2ca7a8b082b8eec9');
  });

  it('guardar/cargar a mitad de corrida → continuación idéntica, año por año', () => {
    const a = Sim.create(world, {}, { systems: systems() });
    for (let i = 0; i < 80; i++) a.step();
    const b = Sim.load(world, a.snapshot(), { systems: systems() });
    expect(b.hash()).toBe(a.hash());
    for (let i = 0; i < 80; i++) expect(yearHash(b, b.step())).toBe(yearHash(a, a.step()));
  });

  it('un snapshot no carga sobre otro mundo', () => {
    const sim = Sim.create(world);
    const other = createGridWorld({ seed: 9, width: 12, height: 6 });
    expect(() => Sim.load(other, sim.snapshot())).toThrow(/otro mundo/);
  });
});

describe('Sim · contratos', () => {
  it('el guard detecta una escritura no declarada', () => {
    const rogue: SimSystem = {
      contract: {
        name: 'rogue',
        phase: 'consumption',
        cadence: { kind: 'annual' },
        reads: ['pop.size'],
        writes: [],
        emits: [],
      },
      run(w) {
        const size = w.state.pop.column('size');
        size[0] = (size[0] ?? 0) + 1;
      },
    };
    const sim = Sim.create(world, {}, { checks: true, systems: [rogue, ...DEFAULT_SYSTEMS] });
    expect(() => sim.step()).toThrow(scheduler.ContractError);
  });

  it('cada tipo de evento tiene plantilla es/en', () => {
    const { registry } = createEventTypes();
    for (const lng of LANGUAGES) {
      const templates = resources[lng].common.events as Readonly<
        Record<string, Readonly<Record<string, string>> | undefined>
      >;
      for (const key of registry.keys()) {
        const [domain = '', verb = ''] = key.split('.');
        expect(templates[domain]?.[verb], `${lng}: ${key}`).toBeTypeOf('string');
      }
    }
  });
});
