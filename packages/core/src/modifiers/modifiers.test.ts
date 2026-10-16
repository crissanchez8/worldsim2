import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { deserializeState, hashState, serializeState } from '../serialize';
import { defineStats, type Explanation, ModifierStore } from './index';

const stats = defineStats({
  stability: { unit: 'score', combine: 'additive', min: -100, max: 100 },
  cropYield: { unit: 'ratio', combine: 'multiplicative', min: 0 },
});
const polity = { kind: 'polity', id: 1 };
const province = { kind: 'province', id: 7 };
const law = (id: number) => ({ kind: 'law', id });

/** Recalcula el valor desde la explicación, en el mismo orden (debe dar idéntico). */
function recompute(e: Explanation): number {
  let v = e.base;
  if (e.combine === 'additive') {
    for (const t of e.add) v += t.value;
    for (const t of e.mul) v *= t.value;
  } else {
    for (const t of e.mul) v *= t.value;
    for (const t of e.add) v += t.value;
  }
  for (const t of e.caps) v = Math.min(v, t.value);
  for (const t of e.floors) v = Math.max(v, t.value);
  return e.clampedTo ?? v;
}

describe('core/modifiers · agregación', () => {
  it('additive: (base + Σ add) × Π mul', () => {
    const m = new ModifierStore(stats);
    const base = { target: polity, stat: 'stability' as const, owner: 'statecraft', start: 1 };
    m.add({ ...base, op: 'add', value: 2, source: law(1) });
    m.add({ ...base, op: 'add', value: 3, source: law(2) });
    m.add({ ...base, op: 'mul', value: 1.5, source: law(3) });
    expect(m.value(polity, 'stability', 10, 5)).toBe(22.5);
  });

  it('multiplicative: base × Π mul + Σ add', () => {
    const m = new ModifierStore(stats);
    const base = { target: province, stat: 'cropYield' as const, owner: 'production', start: 1 };
    m.add({ ...base, op: 'mul', value: 1.5, source: { kind: 'innovation', id: 2 } });
    m.add({ ...base, op: 'add', value: 5, source: { kind: 'building', id: 9 } });
    expect(m.value(province, 'cropYield', 10, 1)).toBe(20);
  });

  it('topes, pisos y rango del stat', () => {
    const m = new ModifierStore(stats);
    const base = { target: polity, stat: 'stability' as const, owner: 'statecraft', start: 1 };
    m.add({ ...base, op: 'add', value: 500, source: law(1) });
    const e = m.explain(polity, 'stability', 0, 1);
    expect(e.value).toBe(100);
    expect(e.clampedTo).toBe(100);
    m.add({ ...base, op: 'min', value: 40, source: law(2) });
    expect(m.value(polity, 'stability', 0, 1)).toBe(40);
    m.add({ ...base, op: 'max', value: 60, source: law(3) });
    expect(m.value(polity, 'stability', 0, 1)).toBe(60);
  });

  it('vencimiento: activo si start ≤ año < expires; 0 = permanente', () => {
    const m = new ModifierStore(stats);
    const base = {
      target: polity,
      stat: 'stability' as const,
      owner: 'statecraft',
      op: 'add' as const,
    };
    m.add({ ...base, value: 10, source: law(1), start: -50, expires: 10 });
    m.add({ ...base, value: 1, source: law(2), start: -50 });
    expect(m.value(polity, 'stability', 0, -51)).toBe(0);
    expect(m.value(polity, 'stability', 0, -50)).toBe(11);
    expect(m.value(polity, 'stability', 0, 9)).toBe(11);
    expect(m.value(polity, 'stability', 0, 10)).toBe(1);
    expect(() => m.add({ ...base, value: 1, source: law(3), start: 5, expires: 5 })).toThrow();
  });

  it('valida stat y valor', () => {
    const m = new ModifierStore(stats);
    const bad = { target: polity, op: 'add' as const, source: law(1), owner: 'x', start: 1 };
    expect(() => m.add({ ...bad, stat: 'nope' as 'stability', value: 1 })).toThrow(/desconocido/);
    expect(() => m.add({ ...bad, stat: 'stability', value: Number.NaN })).toThrow(/finito/);
  });
});

describe('core/modifiers · explain y orden', () => {
  const modArb = fc.record({
    op: fc.constantFrom('add' as const, 'mul' as const, 'min' as const, 'max' as const),
    value: fc.double({ min: -1000, max: 1000, noNaN: true }),
    sourceKind: fc.constantFrom('law', 'trait', 'event', 'building'),
    sourceId: fc.nat({ max: 20 }),
    owner: fc.constantFrom('statecraft', 'characters'),
    start: fc.integer({ min: -100, max: 100 }).filter((y) => y !== 0),
  });

  it('explain reconstruye exactamente el valor', () => {
    fc.assert(
      fc.property(
        fc.array(modArb, { maxLength: 30 }),
        fc.double({ min: -50, max: 50, noNaN: true }),
        (mods, base) => {
          const m = new ModifierStore(stats);
          for (const x of mods) {
            m.add({
              target: polity,
              stat: 'stability',
              op: x.op,
              value: x.value,
              source: { kind: x.sourceKind, id: x.sourceId },
              owner: x.owner,
              start: x.start,
            });
          }
          const e = m.explain(polity, 'stability', base, 100);
          expect(Object.is(recompute(e), e.value)).toBe(true);
          expect(e.add.length + e.mul.length + e.caps.length + e.floors.length).toBe(mods.length);
        },
      ),
    );
  });

  it('el resultado no depende del orden en que se crearon los modificadores (bit a bit)', () => {
    // Stat sin rango y solo sumas y productos: el redondeo acumulado depende del orden, así que
    // si la implementación aplicara por orden de alta, alguna permutación daría otro resultado.
    const free = defineStats({ free: { unit: 'ratio', combine: 'additive' } });
    const term = fc.oneof(
      fc.record({
        op: fc.constant('add' as const),
        value: fc.double({ min: -10, max: 10, noNaN: true }),
      }),
      fc.record({
        op: fc.constant('mul' as const),
        value: fc.double({ min: 0.5, max: 2, noNaN: true }),
      }),
    );
    const withSource = fc.record({
      t: term,
      sourceKind: fc.constantFrom('law', 'trait'),
      sourceId: fc.nat({ max: 3 }),
    });
    const listAndPermutation = fc
      .array(withSource, { minLength: 3, maxLength: 25 })
      .chain((list) =>
        fc.tuple(
          fc.constant(list),
          fc.shuffledSubarray(list, { minLength: list.length, maxLength: list.length }),
        ),
      );
    fc.assert(
      fc.property(listAndPermutation, ([list, permuted]) => {
        const build = (items: typeof list) => {
          const m = new ModifierStore(free);
          for (const x of items) {
            m.add({
              target: polity,
              stat: 'free',
              op: x.t.op,
              value: x.t.value,
              source: { kind: x.sourceKind, id: x.sourceId },
              owner: 'x',
              start: 1,
            });
          }
          return m.value(polity, 'free', 0.1, 1);
        };
        expect(Object.is(build(permuted), build(list))).toBe(true);
      }),
      { numRuns: 300 },
    );
  });
});

describe('core/modifiers · dueño por fila, limpieza y serialización', () => {
  it('solo el dueño puede borrar', () => {
    const m = new ModifierStore(stats);
    const id = m.add({
      target: polity,
      stat: 'stability',
      op: 'add',
      value: 1,
      source: law(1),
      owner: 'statecraft',
      start: 1,
    });
    expect(() => {
      m.remove(id, 'diplomacy');
    }).toThrow(/dueño por fila/);
    m.remove(id, 'statecraft');
    expect(m.size).toBe(0);
  });

  it('removeTarget borra todo lo de una entidad (I16)', () => {
    const m = new ModifierStore(stats);
    const base = { op: 'add' as const, value: 1, source: law(1), owner: 'x', start: 1 };
    m.add({ ...base, target: polity, stat: 'stability' });
    m.add({ ...base, target: polity, stat: 'cropYield' });
    m.add({ ...base, target: province, stat: 'cropYield' });
    expect(m.removeTarget(polity)).toBe(2);
    expect(m.size).toBe(1);
  });

  it('purgeExpired no cambia ningún valor presente ni futuro', () => {
    const m = new ModifierStore(stats);
    const base = {
      target: polity,
      stat: 'stability' as const,
      op: 'add' as const,
      owner: 'x',
      start: 1,
    };
    m.add({ ...base, value: 5, source: law(1), expires: 10 });
    m.add({ ...base, value: 2, source: law(2) });
    const before = [10, 11, 50].map((y) => m.value(polity, 'stability', 0, y));
    expect(m.purgeExpired(10)).toBe(1);
    expect([10, 11, 50].map((y) => m.value(polity, 'stability', 0, y))).toEqual(before);
  });

  it('ida y vuelta: mismo hash y el índice se reconstruye', () => {
    const a = new ModifierStore(stats);
    a.add({
      target: polity,
      stat: 'stability',
      op: 'add',
      value: 7,
      source: law(1),
      owner: 'statecraft',
      start: -5,
      expires: 40,
    });
    a.add({
      target: province,
      stat: 'cropYield',
      op: 'mul',
      value: 1.25,
      source: { kind: 'innovation', id: 4 },
      owner: 'production',
      start: 1,
    });
    const bytes = serializeState([a], '0.0.0');
    const b = new ModifierStore(stats);
    deserializeState(bytes, [b], '0.0.0');
    expect(hashState([b])).toBe(hashState([a]));
    expect(b.value(polity, 'stability', 1, 10)).toBe(8);
    expect(b.value(province, 'cropYield', 4, 10)).toBe(5);
  });
});
