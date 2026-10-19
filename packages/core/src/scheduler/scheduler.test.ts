import { describe, expect, it } from 'vitest';
import { EventBus, EventRegistry } from '../events';
import { createTable, defineSchema, Globals, IdAllocator } from '../store';
import { nextYear } from '../time';
import {
  type Cadence,
  ContractError,
  createBuffer,
  createPipeline,
  type Phase,
  type SystemDef,
  type TickInfo,
} from './index';

const provinceSchema = defineSchema('province', 1, {
  owner: { type: 'ref', unit: 'id', ref: 'polity' },
  roads: { type: 'u8', unit: 'score' },
});
const worldSchema = defineSchema('world', 1, { seaLevel: { type: 'f64', unit: 'm' } });

function makeWorld() {
  const province = createTable(provinceSchema);
  province.add();
  province.add();
  return { province, world: new Globals(worldSchema) };
}
type World = ReturnType<typeof makeWorld>;
const partsOf = (w: World) => [w.world, w.province];

function system(
  name: string,
  phase: Phase,
  run: (w: World, t: TickInfo) => void = () => undefined,
  extra: Partial<SystemDef<World>['contract']> & { cadence?: Cadence } = {},
): SystemDef<World> {
  return {
    contract: {
      name,
      phase,
      cadence: { kind: 'annual' },
      reads: [],
      writes: [],
      emits: [],
      ...extra,
    },
    run,
  };
}

function bus(year: number, ids = new IdAllocator<'event'>()) {
  return new EventBus({ year, ids });
}

describe('scheduler · validación estática', () => {
  it('el orden de la lista respeta las fases', () => {
    expect(() => createPipeline([system('a', 'markets'), system('b', 'environment')])).toThrow(
      /fase posterior/,
    );
  });

  it('nombres únicos y campos bien formados', () => {
    expect(() => createPipeline([system('a', 'markets'), system('a', 'markets')])).toThrow(
      /repetido/,
    );
    expect(() =>
      createPipeline([system('a', 'markets', undefined, { writes: ['Province'] })]),
    ).toThrow(/mal formado/);
  });

  it('escritor único: dos sistemas no pueden declarar el mismo campo (ni solaparse con .*)', () => {
    expect(() =>
      createPipeline([
        system('a', 'production', undefined, { writes: ['province.owner'] }),
        system('b', 'state', undefined, { writes: ['province.owner'] }),
      ]),
    ).toThrow(/escritor único/);
    expect(() =>
      createPipeline([
        system('a', 'production', undefined, { writes: ['province.*'] }),
        system('b', 'state', undefined, { writes: ['province.roads'] }),
      ]),
    ).toThrow(/escritor único/);
    // dueño por fila: varios pueden declararlo
    expect(() =>
      createPipeline([
        system('a', 'production', undefined, { writes: ['modifier.own'] }),
        system('b', 'state', undefined, { writes: ['modifier.own'] }),
      ]),
    ).not.toThrow();
  });

  it('buffers: registrados, un solo consumidor, productores antes que el consumidor', () => {
    const deltas = createBuffer<number>('popDeltas');
    expect(() =>
      createPipeline([system('a', 'production', undefined, { produces: ['popDeltas'] })]),
    ).toThrow(/no registrado/);
    expect(() =>
      createPipeline([system('a', 'production', undefined, { produces: ['popDeltas'] })], [deltas]),
    ).toThrow(/0 consumidores/);
    expect(() =>
      createPipeline(
        [
          system('ledger', 'consolidation', undefined, { consumes: ['popDeltas'] }),
          system('late', 'chronicle', undefined, { produces: ['popDeltas'] }),
        ],
        [deltas],
      ),
    ).toThrow(/produce después/);
  });
});

describe('scheduler · ejecución', () => {
  it('corre en orden y respeta cadencias en 1.000 años', () => {
    const counts = new Map<string, number>();
    const count = (name: string) => () => {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    };
    const pipeline = createPipeline<World>([
      system('environment', 'environment', count('environment')),
      system('succession', 'society', count('succession'), { cadence: { kind: 'onEvent' } }),
      system('military', 'war', count('military'), { cadence: { kind: 'seasonal' } }),
      system('culture', 'cultureFaith', count('culture'), {
        cadence: { kind: 'everyNYears', years: 10 },
      }),
      system('language', 'cultureFaith', count('language'), {
        cadence: { kind: 'everyNYears', years: 25 },
      }),
    ]);
    const w = makeWorld();
    let year = -12000;
    let first: readonly string[] = [];
    for (let i = 0; i < 1000; i++) {
      const report = pipeline.runTick(w, { year, events: bus(year) });
      if (i === 0) first = report.ran;
      year = nextYear(year);
    }
    expect(counts.get('environment')).toBe(1000);
    expect(counts.get('military')).toBe(4000);
    expect(counts.get('culture')).toBe(100);
    expect(counts.get('language')).toBe(40);
    expect(counts.get('succession')).toBe(1000);
    expect(first.slice(0, 3)).toEqual(['environment', 'succession', 'military@0']);
  });

  it('el sistema recibe año, estación y bus; solo emite lo declarado', () => {
    const registry = new EventRegistry();
    const battle = registry.define({ key: 'battle.fought', threshold: 0, significance: () => 0.5 });
    const seen: (number | undefined)[] = [];
    const pipeline = createPipeline<World>([
      system(
        'military',
        'war',
        (_w, t) => {
          seen.push(t.season);
          t.events.emit(battle, {
            actors: [],
            data: null,
            ...(t.season === undefined ? {} : { season: t.season }),
          });
        },
        { cadence: { kind: 'seasonal' }, emits: ['battle.fought'] },
      ),
    ]);
    const b = bus(5);
    pipeline.runTick(makeWorld(), { year: 5, events: b });
    expect(seen).toEqual([0, 1, 2, 3]);
    expect(b.drain().map((e) => e.season)).toEqual([0, 1, 2, 3]);

    const sneaky = createPipeline<World>([
      system('diplomacy', 'diplomacy', (_w, t) => {
        t.events.emit(battle, { actors: [], data: null });
      }),
    ]);
    expect(() => sneaky.runTick(makeWorld(), { year: 5, events: bus(5) })).toThrow(
      /sin declararlo/,
    );
  });

  it('los buffers tienen que quedar vacíos al final del tick (I9)', () => {
    const deltas = createBuffer<number>('popDeltas');
    const forgetful = createPipeline<World>(
      [
        system(
          'demography',
          'consumption',
          () => {
            deltas.push(1);
          },
          { produces: ['popDeltas'] },
        ),
        system('ledger', 'consolidation', () => undefined, { consumes: ['popDeltas'] }),
      ],
      [deltas],
    );
    expect(() => forgetful.runTick(makeWorld(), { year: 1, events: bus(1) })).toThrow(
      /no quedó vacío/,
    );
  });
});

describe('scheduler · guard de contratos', () => {
  // Mundo nuevo en cada llamada: el mismo `run` se evalúa varias veces y una escritura
  // repetida sobre el mismo mundo no cambiaría nada.
  const guarded = (systems: SystemDef<World>[]) => () => {
    const w = makeWorld();
    return createPipeline(systems).runTick(w, {
      year: 1,
      events: bus(1),
      guard: { parts: partsOf(w) },
    });
  };

  it('un sistema que escribe fuera de su contrato hace fallar el tick', () => {
    const run = guarded([
      system(
        'settlements',
        'settlements',
        (w) => {
          w.province.set(1, 'owner', 9); // no declarado
        },
        { writes: ['province.roads'] },
      ),
    ]);
    expect(run).toThrow(ContractError);
    expect(run).toThrow(/settlements escribió "province.owner"/);
  });

  it('escrituras directas a la columna también se detectan', () => {
    const run = guarded([
      system('environment', 'environment', (w) => {
        w.province.column('roads')[0] = 3;
      }),
    ]);
    expect(run).toThrow(/province.roads/);
  });

  it('altas de filas sin declarar #rows se detectan', () => {
    const run = guarded([
      system('statecraft', 'state', (w) => w.province.add(), { writes: ['province.owner'] }),
    ]);
    expect(run).toThrow(/province.#rows/);
  });

  it('lo declarado pasa: campo exacto, parte.* y globals', () => {
    const run = guarded([
      system(
        'environment',
        'environment',
        (w) => {
          w.world.set('seaLevel', -100);
        },
        { writes: ['world.seaLevel'] },
      ),
      system(
        'ledger',
        'consolidation',
        (w) => {
          w.province.set(1, 'owner', 2);
          w.province.add();
        },
        { writes: ['province.*'] },
      ),
    ]);
    expect(run).not.toThrow();
  });

  it('propiedad por campo: quien crea filas inicia todos sus campos sin tocar los de otro', () => {
    // statecraft es dueño de las filas y de roads; ledger, de owner (en filas existentes).
    const run = guarded([
      system(
        'statecraft',
        'state',
        (w) => {
          w.province.add({ owner: 0, roads: 1 });
          w.province.set(1, 'roads', 2);
        },
        { writes: ['province.#rows', 'province.roads'] },
      ),
      system(
        'ledger',
        'consolidation',
        (w) => {
          w.province.set(3, 'owner', 7); // la fila que creó statecraft en este tick
        },
        { writes: ['province.owner'] },
      ),
    ]);
    expect(run).not.toThrow();
  });

  it('quien crea filas no puede cambiar un campo ajeno en filas que ya existían', () => {
    const run = guarded([
      system(
        'statecraft',
        'state',
        (w) => {
          w.province.add();
          w.province.set(1, 'owner', 5);
        },
        { writes: ['province.#rows', 'province.roads'] },
      ),
    ]);
    expect(run).toThrow(/statecraft escribió "province.owner"/);
  });

  it('las bajas de filas cuentan como #rows', () => {
    const run = guarded([
      system('rogue', 'state', (w) => {
        w.province.remove(2);
      }),
    ]);
    expect(run).toThrow(/province.#rows/);
  });

  it('campos declarados que no existen en el estado → error (typos)', () => {
    const run = guarded([system('a', 'markets', undefined, { reads: ['province.ownr'] })]);
    expect(run).toThrow(/no existe en el estado/);
  });
});
