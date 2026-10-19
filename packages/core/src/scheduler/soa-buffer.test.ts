import { describe, expect, it } from 'vitest';
import { EventBus } from '../events';
import { IdAllocator } from '../store';
import { ContractError, createPipeline, createSoaBuffer, type SystemDef } from './index';

const fields = {
  pop: { type: 'ref', unit: 'id', ref: 'pop' },
  kind: { type: 'u8', unit: 'enum' },
  persons: { type: 'f64', unit: 'persons' },
} as const;

describe('SoaBuffer', () => {
  it('push y lectura por columna, en orden de llegada', () => {
    const b = createSoaBuffer('popDeltas', fields, { capacity: 4 });
    b.push({ pop: 7, kind: 1, persons: 12.5 });
    b.push({ pop: 3, persons: -2 });
    expect(b.size).toBe(2);
    expect([...b.column('pop').subarray(0, b.size)]).toEqual([7, 3]);
    expect([...b.column('kind').subarray(0, b.size)]).toEqual([1, 0]);
    expect([...b.column('persons').subarray(0, b.size)]).toEqual([12.5, -2]);
  });

  it('crece varias veces por encima de la capacidad inicial sin perder datos (L-007)', () => {
    const b = createSoaBuffer('popDeltas', fields, { capacity: 2 });
    const n = 1000; // > 2 × 2⁸: nueve reasignaciones
    for (let i = 0; i < n; i++) b.push({ pop: i + 1, kind: i % 3, persons: i * 0.5 });
    expect(b.size).toBe(n);
    const pop = b.column('pop');
    const kind = b.column('kind');
    const persons = b.column('persons');
    for (let i = 0; i < n; i++) {
      expect(pop[i]).toBe(i + 1);
      expect(kind[i]).toBe(i % 3);
      expect(persons[i]).toBe(i * 0.5);
    }
  });

  it('camino caliente: reserve + columnas tomadas una vez + append', () => {
    const b = createSoaBuffer('popDeltas', fields, { capacity: 1 });
    b.reserve(500);
    const pop = b.column('pop');
    const persons = b.column('persons');
    for (let i = 0; i < 500; i++) {
      const at = b.append();
      pop[at] = i + 1;
      persons[at] = i;
    }
    expect(b.column('pop')).toBe(pop); // append no reasignó
    expect(b.column('persons')[499]).toBe(499);
  });

  it('append sin lugar reservado falla en vez de escribir en una columna vieja', () => {
    const b = createSoaBuffer('popDeltas', fields, { capacity: 2 });
    b.append();
    b.append();
    expect(() => b.append()).toThrow(/reserve/);
  });

  it('clear vacía y un ítem nuevo no ve datos viejos', () => {
    const b = createSoaBuffer('popDeltas', fields, { capacity: 4 });
    b.push({ pop: 9, kind: 2, persons: 100 });
    b.clear();
    expect(b.size).toBe(0);
    const at = b.append();
    expect(b.column('pop')[at]).toBe(0);
    expect(b.column('kind')[at]).toBe(0);
    expect(b.column('persons')[at]).toBe(0);
  });

  it('push valida tipos y rangos', () => {
    const b = createSoaBuffer('popDeltas', fields);
    expect(() => b.push({ kind: 300 })).toThrow(/fuera de rango/);
    expect(() => b.push({ persons: Number.NaN })).toThrow(/NaN/);
    expect(() => b.push({ pop: -1 })).toThrow(/fuera de rango/);
  });

  it('valida nombres y unidades como un esquema', () => {
    expect(() => createSoaBuffer('Mal', fields)).toThrow(/nombre inválido/);
    expect(() =>
      createSoaBuffer('ok', { 'mal-campo': { type: 'u8', unit: 'enum' } } as const),
    ).toThrow(/campo inválido/);
  });

  it('el pipeline exige que quede vacío al final del tick (I9)', () => {
    const b = createSoaBuffer('popDeltas', fields);
    const producer: SystemDef<null> = {
      contract: {
        name: 'demography',
        phase: 'consumption',
        cadence: { kind: 'annual' },
        reads: [],
        writes: [],
        emits: [],
        produces: ['popDeltas'],
      },
      run: () => {
        b.push({ pop: 1, persons: 1 });
      },
    };
    let consume = true;
    const consumer: SystemDef<null> = {
      contract: {
        name: 'ledger',
        phase: 'consolidation',
        cadence: { kind: 'annual' },
        reads: [],
        writes: [],
        emits: [],
        consumes: ['popDeltas'],
      },
      run: () => {
        if (consume) b.clear();
      },
    };
    const pipeline = createPipeline([producer, consumer], [b]);
    const ids = new IdAllocator<'event'>();
    pipeline.runTick(null, { year: 1, events: new EventBus({ year: 1, ids }) });
    consume = false;
    expect(() =>
      pipeline.runTick(null, { year: 2, events: new EventBus({ year: 2, ids }) }),
    ).toThrow(ContractError);
  });
});
