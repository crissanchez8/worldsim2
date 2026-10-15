import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createSparseTable, createTable, defineSchema, Globals } from '../store';
import {
  ByteReader,
  ByteWriter,
  deserializeState,
  hashPart,
  hashState,
  serializeState,
} from './index';

const ENGINE = '0.0.0-test';
// Golden del hash de estado: si cambia, cambió el formato o el hash (sube ENGINE_VERSION).
const GOLDEN_STATE_HASH = '877b14a0153e633b';

const provinceSchema = defineSchema('province', 1, {
  area: { type: 'f64', unit: 'km2' },
  fertility: { type: 'f32', unit: 'fraction' },
  owner: { type: 'ref', unit: 'id', ref: 'polity' },
  elevation: { type: 'i16', unit: 'm' },
  biome: { type: 'u8', unit: 'enum' },
  coastal: { type: 'bool', unit: 'flag' },
});
const characterSchema = defineSchema('character', 1, {
  name: { type: 'str', unit: 'text' },
  born: { type: 'i32', unit: 'year' },
  children: { type: 'refs', unit: 'id', ref: 'character' },
  traits: { type: 'f64s', unit: 'score' },
});
const worldSchema = defineSchema('world', 1, {
  year: { type: 'i32', unit: 'year' },
  seaLevel: { type: 'f64', unit: 'm' },
});

function emptyState() {
  return {
    provinces: createTable(provinceSchema),
    characters: createSparseTable(characterSchema),
    world: new Globals(worldSchema),
  };
}
type State = ReturnType<typeof emptyState>;
const partsOf = (s: State) => [s.world, s.provinces, s.characters] as const;

const provinceRow = fc.record({
  area: fc.double({ noNaN: true }),
  fertility: fc.float({ noNaN: true }),
  owner: fc.nat({ max: 0xffffffff }),
  elevation: fc.integer({ min: -32768, max: 32767 }),
  biome: fc.nat({ max: 255 }),
  coastal: fc.integer({ min: 0, max: 1 }),
  keep: fc.boolean(),
});
const characterRow = fc.record({
  name: fc.string({ unit: 'grapheme', maxLength: 12 }),
  born: fc.integer({ min: -12000, max: 1900 }),
  children: fc.array(fc.nat({ max: 0xffffffff }), { maxLength: 4 }),
  traits: fc.array(fc.double({ noNaN: true }), { maxLength: 4 }),
  keep: fc.boolean(),
});
const stateArb = fc.record({
  provinces: fc.array(provinceRow, { maxLength: 40 }),
  characters: fc.array(characterRow, { maxLength: 15 }),
  year: fc.integer({ min: -12000, max: 1900 }),
  seaLevel: fc.double({ noNaN: true }),
  compact: fc.boolean(),
});

type Spec = typeof stateArb extends fc.Arbitrary<infer T> ? T : never;

function build(spec: Spec): State {
  const s = emptyState();
  s.world.set('year', spec.year);
  s.world.set('seaLevel', spec.seaLevel);
  for (const { keep, ...row } of spec.provinces) {
    const id = s.provinces.add(row);
    if (!keep) s.provinces.remove(id);
  }
  for (const { keep, ...row } of spec.characters) {
    const id = s.characters.add(row);
    if (!keep) s.characters.remove(id);
  }
  if (spec.compact) s.provinces.compact();
  return s;
}

describe('serialize · ida y vuelta', () => {
  it('serializar → cargar → serializar da los mismos bytes y el mismo hash', () => {
    fc.assert(
      fc.property(stateArb, (spec) => {
        const a = build(spec);
        const bytes = serializeState(partsOf(a), ENGINE);
        const b = emptyState();
        deserializeState(bytes, partsOf(b), ENGINE);
        expect(serializeState(partsOf(b), ENGINE)).toEqual(bytes);
        expect(hashState(partsOf(b))).toBe(hashState(partsOf(a)));

        // Valores idénticos bit a bit (incluye −0)
        expect([...b.provinces.ids()]).toEqual([...a.provinces.ids()]);
        for (const id of a.provinces.ids()) {
          for (const key of provinceSchema.order) {
            expect(Object.is(b.provinces.get(id, key), a.provinces.get(id, key))).toBe(true);
          }
        }
        expect([...b.characters.entries()]).toEqual([...a.characters.entries()]);
        expect(b.world.get('year')).toBe(a.world.get('year'));

        // El asignador continúa donde estaba: el próximo id es el mismo
        expect(b.provinces.add()).toBe(a.provinces.add());
        expect(b.characters.add()).toBe(a.characters.add());
      }),
    );
  });

  it('la compactación no cambia el hash', () => {
    fc.assert(
      fc.property(stateArb, (spec) => {
        const s = build({ ...spec, compact: false });
        const before = hashState(partsOf(s));
        s.provinces.compact();
        expect(hashState(partsOf(s))).toBe(before);
      }),
    );
  });
});

/** Un valor válido para la columna y distinto del actual. */
function otherValue(key: (typeof provinceSchema.order)[number], old: number): number {
  switch (key) {
    case 'coastal':
      return 1 - old;
    case 'biome':
      return (old + 1) % 256;
    case 'elevation':
      return old === 32767 ? 0 : old + 1;
    case 'owner':
      return (old + 1) % 4294967296;
    case 'area':
    case 'fertility':
      return old === 0 ? 1 : -old;
  }
}

describe('serialize · el hash cubre todo el estado', () => {
  it('mutar cualquier celda de cualquier columna cambia el hash', () => {
    fc.assert(
      fc.property(
        stateArb.filter((s) => s.provinces.some((p) => p.keep)),
        fc.nat(),
        fc.constantFrom(...provinceSchema.order),
        (spec, pick, key) => {
          const s = build(spec);
          const ids = [...s.provinces.ids()];
          const id = ids[pick % ids.length] ?? 0;
          const before = hashState(partsOf(s));
          const old = s.provinces.get(id, key);
          const changed = otherValue(key, old);
          s.provinces.set(id, key, changed);
          expect(s.provinces.get(id, key)).not.toBe(old);
          expect(hashState(partsOf(s))).not.toBe(before);
        },
      ),
    );
  });

  it('cambian el hash: un global, un string, una lista, una baja y el asignador', () => {
    const base = () => {
      const s = emptyState();
      const a = s.provinces.add({ area: 10 });
      s.provinces.add({ area: 20 });
      const c = s.characters.add({ name: 'Ilu', children: [a], traits: [0.5] });
      return { s, a, c };
    };
    const h0 = hashState(partsOf(base().s));
    const variants: ((x: ReturnType<typeof base>) => void)[] = [
      ({ s }) => {
        s.world.set('year', 1);
      },
      ({ s, c }) => {
        s.characters.set(c, 'name', 'Ilú');
      },
      ({ s, c }) => {
        s.characters.set(c, 'children', []);
      },
      ({ s, c }) => {
        s.characters.set(c, 'traits', [-0.5]);
      },
      ({ s, a }) => {
        s.provinces.remove(a);
      },
      ({ s }) => {
        s.provinces.allocator.next(); // un id asignado y descartado también es estado
      },
    ];
    for (const mutate of variants) {
      const x = base();
      mutate(x);
      expect(hashState(partsOf(x.s))).not.toBe(h0);
    }
  });

  it('distingue 0 de −0', () => {
    const a = emptyState();
    const b = emptyState();
    a.provinces.add({ area: 0 });
    b.provinces.add({ area: -0 });
    expect(hashState(partsOf(a))).not.toBe(hashState(partsOf(b)));
  });

  it('hashPart localiza qué parte cambió', () => {
    const s = emptyState();
    s.provinces.add({ area: 1 });
    const world = hashPart(s.world);
    const provinces = hashPart(s.provinces);
    s.provinces.set(1, 'area', 2);
    expect(hashPart(s.world)).toBe(world);
    expect(hashPart(s.provinces)).not.toBe(provinces);
  });

  it('golden: hash de un estado fijo', () => {
    const s = emptyState();
    s.world.set('year', -12000);
    s.world.set('seaLevel', -120);
    s.provinces.add({
      area: 1234.5,
      fertility: 0.75,
      owner: 3,
      elevation: 250,
      biome: 4,
      coastal: 1,
    });
    s.provinces.add({ area: 99, elevation: -40 });
    s.characters.add({ name: 'Ñandú', born: -11950, traits: [1, 2.5] });
    expect(hashState(partsOf(s))).toBe(GOLDEN_STATE_HASH);
  });
});

describe('serialize · errores explícitos', () => {
  const sample = () => {
    const s = emptyState();
    s.provinces.add({ area: 5 });
    return s;
  };

  it('NaN en una columna escrita directo → error con ubicación (camino rápido y lento)', () => {
    const s = sample();
    s.provinces.column('area')[0] = NaN;
    expect(() => serializeState(partsOf(s), ENGINE)).toThrow(/province\.area#1: NaN/);
    s.provinces.remove(s.provinces.add()); // fila muerta → camino valor por valor
    expect(() => serializeState(partsOf(s), ENGINE)).toThrow(/province\.area#1: NaN/);
  });

  it('camino rápido y lento producen los mismos bytes', () => {
    fc.assert(
      fc.property(stateArb, (spec) => {
        const slow = build({ ...spec, compact: false });
        const extra = slow.provinces.add();
        const fast = build({ ...spec, compact: false });
        fast.provinces.add();
        slow.provinces.remove(extra); // slow tiene una fila muerta: fuerza el camino lento…
        fast.provinces.remove(extra);
        fast.provinces.compact(); // …fast está compacta: camino rápido
        expect(serializeState(partsOf(fast), ENGINE)).toEqual(
          serializeState(partsOf(slow), ENGINE),
        );
      }),
    );
  });

  it('magic, formato y versión de motor', () => {
    const bytes = serializeState(partsOf(sample()), ENGINE);
    const badMagic = bytes.slice();
    badMagic[0] = 0;
    expect(() => {
      deserializeState(badMagic, partsOf(emptyState()), ENGINE);
    }).toThrow(/magic/);
    const badFormat = bytes.slice();
    badFormat[4] = 99;
    expect(() => {
      deserializeState(badFormat, partsOf(emptyState()), ENGINE);
    }).toThrow(/formato/);
    expect(() => {
      deserializeState(bytes, partsOf(emptyState()), '9.9.9');
    }).toThrow(/motor/);
  });

  it('esquema incompatible', () => {
    const bytes = serializeState(partsOf(sample()), ENGINE);
    const other = defineSchema('province', 2, provinceSchema.fields);
    const s = emptyState();
    expect(() => {
      deserializeState(bytes, [s.world, createTable(other), s.characters], ENGINE);
    }).toThrow(/esquema incompatible/);
  });

  it('datos truncados o sobrantes', () => {
    const bytes = serializeState(partsOf(sample()), ENGINE);
    expect(() => {
      deserializeState(bytes.slice(0, bytes.length - 3), partsOf(emptyState()), ENGINE);
    }).toThrow(/truncados/);
    const extra = new Uint8Array(bytes.length + 1);
    extra.set(bytes);
    expect(() => {
      deserializeState(extra, partsOf(emptyState()), ENGINE);
    }).toThrow(/sobran/);
  });

  it('cargar sobre una tabla no vacía falla', () => {
    const bytes = serializeState(partsOf(sample()), ENGINE);
    expect(() => {
      deserializeState(bytes, partsOf(sample()), ENGINE);
    }).toThrow(/no vacía/);
  });
});

describe('bytes · crecimiento del buffer', () => {
  it('escribe bien más allá de la capacidad inicial (1 KiB) con todos los tipos', () => {
    const w = new ByteWriter();
    const n = 5000;
    for (let i = 0; i < n; i++) {
      w.u8(i & 0xff);
      w.i16(-i);
      w.u32(i * 7919);
      w.f64(i / 3);
      w.f32(i);
      w.str('ñ');
    }
    const r = new ByteReader(w.finish());
    for (let i = 0; i < n; i++) {
      expect(r.u8()).toBe(i & 0xff);
      expect(r.i16()).toBe(-i | 0); // los enteros no tienen −0
      expect(r.u32()).toBe(i * 7919);
      expect(r.f64()).toBe(i / 3);
      expect(r.f32()).toBe(i);
      expect(r.str()).toBe('ñ');
    }
    r.end();
  });

  it('estado grande: ida y vuelta de 20.000 filas', () => {
    const a = emptyState();
    for (let i = 0; i < 20000; i++)
      a.provinces.add({ area: i * 1.5, elevation: (i % 60000) - 30000 });
    const bytes = serializeState(partsOf(a), ENGINE);
    expect(bytes.length).toBeGreaterThan(100_000);
    const b = emptyState();
    deserializeState(bytes, partsOf(b), ENGINE);
    expect(hashState(partsOf(b))).toBe(hashState(partsOf(a)));
  });
});

describe('bytes · varuint', () => {
  it('ida y vuelta hasta 2^53', () => {
    fc.assert(
      fc.property(fc.array(fc.nat({ max: Number.MAX_SAFE_INTEGER })), (values) => {
        const w = new ByteWriter();
        for (const v of values) w.varuint(v);
        const r = new ByteReader(w.finish());
        expect(values.map(() => r.varuint())).toEqual(values);
        r.end();
      }),
    );
  });
});
