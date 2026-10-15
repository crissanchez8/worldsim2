import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { ByteReader, ByteWriter } from '../serialize';
import { IdAllocator } from '../store';
import {
  EventBus,
  EventError,
  type EventData,
  EventRegistry,
  type GameEvent,
  hashEvents,
  readEvent,
  writeEvent,
} from './index';

function setup(year = -3200) {
  const registry = new EventRegistry();
  const founded = registry.define<{ population: number }>({
    key: 'settlement.founded',
    threshold: 0.1,
    significance: (d) => Math.min(1, d.data.population / 10000),
  });
  const battle = registry.define<{ dead: number }>({
    key: 'battle.fought',
    threshold: 0,
    significance: () => 0.5,
    validate: (data) => {
      if (data.dead < 0) throw new Error('bajas negativas');
    },
  });
  const ids = new IdAllocator<'event'>();
  const bus = new EventBus({ year, ids });
  return { registry, founded, battle, ids, bus };
}

describe('core/events · registro', () => {
  it('claves dominio.verbo, únicas, con plantilla i18n', () => {
    const { registry, founded } = setup();
    expect(founded.template).toBe('events.settlement.founded');
    expect(() =>
      registry.define({ key: 'settlement.founded', threshold: 0, significance: () => 0 }),
    ).toThrow(/repetida/);
    expect(() => registry.define({ key: 'Malo', threshold: 0, significance: () => 0 })).toThrow();
    expect(() => registry.define({ key: 'a.b', threshold: 2, significance: () => 0 })).toThrow();
  });
});

describe('core/events · bus', () => {
  it('asigna ids monótonos, completa año y significancia, en orden de emisión', () => {
    const { bus, founded, battle } = setup();
    const a = bus.emit(founded, {
      actors: [{ kind: 'settlement', id: 3 }],
      data: { population: 5000 },
    });
    const b = bus.emit(battle, {
      actors: [{ kind: 'army', id: 1 }],
      place: { kind: 'province', id: 9 },
      causes: [{ kind: 'event', id: a ?? 0 }],
      data: { dead: 120 },
      season: 2,
    });
    expect([a, b]).toEqual([1, 2]);
    const events = bus.drain();
    expect(events.map((e) => [e.id, e.type, e.year, e.significance])).toEqual([
      [1, 'settlement.founded', -3200, 0.5],
      [2, 'battle.fought', -3200, 0.5],
    ]);
    expect(events[1]?.season).toBe(2);
    expect(bus.size).toBe(0); // drain deja el bus vacío (I9)
  });

  it('bajo el umbral no se registra ni consume id', () => {
    const { bus, founded, ids } = setup();
    expect(bus.emit(founded, { actors: [], data: { population: 10 } })).toBeNull();
    expect(ids.peek()).toBe(1);
    expect(bus.size).toBe(0);
  });

  it('causas: deben existir y ser anteriores', () => {
    const { bus, battle, founded } = setup();
    const draft = (id: number) => ({
      actors: [],
      causes: [{ kind: 'event' as const, id }],
      data: { dead: 1 },
    });
    expect(() => bus.emit(battle, draft(1))).toThrow(/causa inexistente/);
    bus.emit(founded, { actors: [], data: { population: 10 } }); // descartado: no es causa válida
    expect(() => bus.emit(battle, draft(1))).toThrow(/causa inexistente/);
    const ok = bus.emit(battle, { actors: [], data: { dead: 1 } }) ?? 0;
    expect(bus.emit(battle, draft(ok))).toBe(ok + 1);
  });

  it('las causas de ticks anteriores se aceptan (el log no está en el estado, M2)', () => {
    const ids = new IdAllocator<'event'>(500);
    const registry = new EventRegistry();
    const t = registry.define({ key: 'war.declared', threshold: 0, significance: () => 1 });
    const bus = new EventBus({ year: 1, ids });
    expect(bus.emit(t, { actors: [], causes: [{ kind: 'event', id: 499 }], data: null })).toBe(500);
  });

  it('hechos causales: no pueden estar en el futuro', () => {
    const { bus, battle } = setup(100);
    const fact = (year: number) => ({
      actors: [],
      causes: [
        { kind: 'fact' as const, entity: { kind: 'province', id: 1 }, field: 'owner', year },
      ],
      data: { dead: 0 },
    });
    expect(bus.emit(battle, fact(100))).toBe(1);
    expect(() => bus.emit(battle, fact(101))).toThrow(/futuro/);
  });

  it('datos: valida el tipo y rechaza NaN o infinitos', () => {
    const { bus, battle, registry } = setup();
    expect(() => bus.emit(battle, { actors: [], data: { dead: -1 } })).toThrow(/negativas/);
    const raw = registry.define<EventData>({
      key: 'test.raw',
      threshold: 0,
      significance: () => 0,
    });
    expect(() => bus.emit(raw, { actors: [], data: { x: Number.NaN } })).toThrow(/finito/);
    expect(() => bus.emit(raw, { actors: [], data: [1, Infinity] })).toThrow(/finito/);
  });

  it('el emisor solo puede emitir lo declarado en su contrato', () => {
    const { bus, founded, battle } = setup();
    bus.setEmitter('settlements', new Set(['settlement.founded']));
    expect(bus.emit(founded, { actors: [], data: { population: 5000 } })).toBe(1);
    expect(() => bus.emit(battle, { actors: [], data: { dead: 1 } })).toThrow(EventError);
  });
});

describe('core/events · codec', () => {
  const ref = fc.record({
    kind: fc.constantFrom('province', 'polity', 'army'),
    id: fc.nat({ max: 0xffffffff }),
  });
  const json: fc.Arbitrary<EventData> = fc.letrec<{ v: EventData }>((tie) => ({
    v: fc.oneof(
      { depthSize: 'small' },
      fc.double({ noNaN: true, noDefaultInfinity: true }).map((x) => (Object.is(x, -0) ? 0 : x)),
      fc.string(),
      fc.boolean(),
      fc.constant(null),
      fc.array(tie('v'), { maxLength: 3 }),
      fc.dictionary(fc.string({ minLength: 1, maxLength: 5 }), tie('v'), { maxKeys: 3 }),
    ),
  })).v;
  const event: fc.Arbitrary<GameEvent> = fc.record({
    id: fc.integer({ min: 1, max: 1e9 }),
    type: fc.constant('battle.fought'),
    year: fc.integer({ min: -12000, max: 1900 }).filter((y) => y !== 0),
    actors: fc.array(ref, { maxLength: 4 }),
    causes: fc.array(
      fc.oneof(
        fc.record({ kind: fc.constant('event' as const), id: fc.integer({ min: 1, max: 1e9 }) }),
        fc.record({
          kind: fc.constant('fact' as const),
          entity: ref,
          field: fc.constantFrom('owner', 'size'),
          year: fc.integer({ min: -12000, max: 1900 }),
        }),
      ),
      { maxLength: 3 },
    ),
    data: json,
    significance: fc.double({ min: 0, max: 1, noNaN: true }),
  });

  it('ida y vuelta', () => {
    fc.assert(
      fc.property(event, (e) => {
        const w = new ByteWriter();
        writeEvent(w, e);
        const r = new ByteReader(w.finish());
        expect(readEvent(r)).toEqual(e);
        r.end();
      }),
    );
  });

  it('hashEvents distingue contenido y orden', () => {
    const { bus, founded, battle } = setup();
    bus.emit(founded, { actors: [], data: { population: 5000 } });
    bus.emit(battle, { actors: [], data: { dead: 3 } });
    const events = bus.drain();
    expect(hashEvents(events)).not.toBe(hashEvents([...events].reverse()));
    expect(hashEvents(events)).toBe(hashEvents(events.map((e) => ({ ...e }))));
  });
});
