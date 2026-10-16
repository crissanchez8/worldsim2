import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  createSparseTable,
  createTable,
  defineSchema,
  describeSchema,
  IdAllocator,
  type Id,
} from './index';

const province = defineSchema('province', 1, {
  area: { type: 'f64', unit: 'km2' },
  population: { type: 'f64', unit: 'persons' },
  owner: { type: 'ref', unit: 'id', ref: 'polity' },
  biome: { type: 'u8', unit: 'enum' },
  coastal: { type: 'bool', unit: 'flag' },
  elevation: { type: 'i16', unit: 'm', default: -1 },
});

const character = defineSchema('character', 1, {
  name: { type: 'str', unit: 'text' },
  born: { type: 'i32', unit: 'year' },
  children: { type: 'refs', unit: 'id', ref: 'character' },
  traits: { type: 'f64s', unit: 'score' },
});

describe('IdAllocator', () => {
  it('es monótono y nunca reutiliza', () => {
    const ids = new IdAllocator();
    expect([ids.next(), ids.next(), ids.next()]).toEqual([1, 2, 3]);
    ids.ensureAbove(10);
    expect(ids.next()).toBe(11);
    ids.ensureAbove(5);
    expect(ids.next()).toBe(12);
  });
});

describe('defineSchema', () => {
  it('fija el orden de declaración y una descripción canónica', () => {
    expect(province.order).toEqual([
      'area',
      'population',
      'owner',
      'biome',
      'coastal',
      'elevation',
    ]);
    expect(describeSchema(province)).toBe(
      'province@1{area:f64:km2,population:f64:persons,owner:ref:id>polity,biome:u8:enum,coastal:bool:flag,elevation:i16:m}',
    );
  });

  it('rechaza nombres que reordenarían las claves', () => {
    expect(() => defineSchema('x', 1, { '1': { type: 'f64', unit: 'ratio' } })).toThrow();
  });
});

describe('Table (SoA)', () => {
  it('alta, lectura, escritura y valores por defecto', () => {
    const t = createTable(province);
    const a = t.add({ area: 120.5, population: 3000 });
    expect(t.get(a, 'area')).toBe(120.5);
    expect(t.get(a, 'elevation')).toBe(-1);
    t.set(a, 'owner', 7);
    expect(t.get(a, 'owner')).toBe(7);
  });

  it('valida rangos y rechaza NaN', () => {
    const t = createTable(province);
    const a = t.add();
    expect(() => {
      t.set(a, 'biome', 256);
    }).toThrow();
    expect(() => {
      t.set(a, 'coastal', 2);
    }).toThrow();
    expect(() => {
      t.set(a, 'owner', -1);
    }).toThrow();
    expect(() => {
      t.set(a, 'elevation', 1.5);
    }).toThrow();
    expect(() => {
      t.set(a, 'area', NaN);
    }).toThrow(/NaN/);
  });

  it('crece más allá de la capacidad inicial', () => {
    const t = createTable(province, { capacity: 2 });
    for (let i = 0; i < 1000; i++) t.add({ area: i });
    expect(t.size).toBe(1000);
    expect(t.get(1000, 'area')).toBe(999);
  });

  it('modelo: altas, bajas, escrituras y compactación aleatorias', () => {
    type Cmd =
      | { op: 'add'; area: number; owner: number }
      | { op: 'remove'; pick: number }
      | { op: 'set'; pick: number; area: number }
      | { op: 'compact' };
    const cmd: fc.Arbitrary<Cmd> = fc.oneof(
      fc.record({
        op: fc.constant('add' as const),
        area: fc.double({ noNaN: true }),
        owner: fc.nat({ max: 0xffffffff }),
      }),
      fc.record({ op: fc.constant('remove' as const), pick: fc.nat() }),
      fc.record({
        op: fc.constant('set' as const),
        pick: fc.nat(),
        area: fc.double({ noNaN: true }),
      }),
      fc.record({ op: fc.constant('compact' as const) }),
    );

    fc.assert(
      fc.property(
        fc.array(cmd, { maxLength: 200 }),
        fc.integer({ min: 1, max: 8 }),
        (cmds, cap) => {
          const t = createTable(province, { capacity: cap });
          const model = new Map<number, { area: number; owner: number }>();
          const everAllocated = new Set<number>();
          const removed: number[] = [];

          for (const c of cmds) {
            const liveIds = [...model.keys()];
            if (c.op === 'add') {
              const id = t.add({ area: c.area, owner: c.owner });
              expect(everAllocated.has(id)).toBe(false); // nunca reutiliza
              everAllocated.add(id);
              model.set(id, { area: c.area, owner: c.owner });
            } else if (c.op === 'remove' && liveIds.length > 0) {
              const id = liveIds[c.pick % liveIds.length] ?? 0;
              t.remove(id);
              model.delete(id);
              removed.push(id);
            } else if (c.op === 'set' && liveIds.length > 0) {
              const id = liveIds[c.pick % liveIds.length] ?? 0;
              t.set(id, 'area', c.area);
              const row = model.get(id);
              if (row) row.area = c.area;
            } else if (c.op === 'compact') {
              t.compact();
              expect(t.rowCount).toBe(t.size);
            }

            // Invariantes tras cada comando
            const ids = [...t.ids()];
            expect(ids).toEqual([...model.keys()]); // mismo conjunto y orden creciente
            for (let i = 1; i < ids.length; i++)
              expect((ids[i] ?? 0) > (ids[i - 1] ?? 0)).toBe(true);
            expect(t.size).toBe(model.size);
            for (const [id, v] of model) {
              expect(Object.is(t.get(id, 'area'), v.area)).toBe(true);
              expect(t.get(id, 'owner')).toBe(v.owner);
            }
            for (const id of removed) expect(t.rowOf(id)).toBe(-1);
          }
        },
      ),
    );
  });

  it('insert exige ids crecientes', () => {
    const t = createTable(province);
    t.insert(5 as Id<'province'>);
    expect(() => {
      t.insert(5 as Id<'province'>);
    }).toThrow();
    expect(t.add()).toBe(6);
  });
});

describe('SparseTable', () => {
  it('alta, lectura, escritura y orden por id', () => {
    const t = createSparseTable(character);
    const a = t.add({ name: 'Aldo', born: -3200 });
    const b = t.add({ name: 'Bera', children: [a] });
    expect(t.require(a).name).toBe('Aldo');
    expect(t.require(b).children).toEqual([a]);
    t.set(a, 'traits', [0.5, 0.25]);
    expect(t.require(a).traits).toEqual([0.5, 0.25]);
    expect([...t.ids()]).toEqual([a, b]);
  });

  it('los arrays guardados son copias congeladas', () => {
    const t = createSparseTable(character);
    const kids = [1, 2];
    const a = t.add({ children: kids });
    kids.push(3);
    expect(t.require(a).children).toEqual([1, 2]);
    expect(Object.isFrozen(t.require(a).children)).toBe(true);
  });

  it('valida tipos', () => {
    const t = createSparseTable(character);
    const a = t.add();
    expect(() => {
      t.set(a, 'born', 1.5);
    }).toThrow();
    expect(() => {
      t.set(a, 'children', [-1]);
    }).toThrow();
  });

  it('no reutiliza ids tras bajas', () => {
    fc.assert(
      fc.property(fc.array(fc.boolean(), { maxLength: 100 }), (ops) => {
        const t = createSparseTable(character);
        const seen = new Set<number>();
        for (const add of ops) {
          const live = [...t.ids()];
          if (add || live.length === 0) {
            const id = t.add();
            expect(seen.has(id)).toBe(false);
            seen.add(id);
          } else {
            t.remove(live[0] ?? 0);
          }
          const ids = [...t.ids()];
          for (let i = 1; i < ids.length; i++) expect((ids[i] ?? 0) > (ids[i - 1] ?? 0)).toBe(true);
        }
      }),
    );
  });
});
