// Estado dinámico de P1 (docs/model.md §5): las tablas que existen hoy. Cada sistema de P1.3
// agrega sus campos con su contrato. Todo lo que está acá va al snapshot y al hash (ADR-004).
import { store } from '@ws/core';

export const worldSchema = store.defineSchema('world', 1, {
  year: { type: 'i32', unit: 'year', doc: 'próximo año a simular' },
  startYear: { type: 'i32', unit: 'year' },
  endYear: { type: 'i32', unit: 'year' },
  nextEventId: { type: 'u32', unit: 'id', doc: 'asignador de ids de eventos (bus)' },
  staticHashA: { type: 'u32', unit: 'bits', doc: 'hash del WorldStatic (mitad alta)' },
  staticHashB: { type: 'u32', unit: 'bits', doc: 'hash del WorldStatic (mitad baja)' },
});

/** Provincias de tierra: misma id que `ProvinceStatic` (1..count). */
export const provinceSchema = store.defineSchema('province', 1, {
  owner: { type: 'ref', unit: 'id', ref: 'polity', doc: 'dueño: ledger (M1); 0 = sin dueño' },
});

/** Pop = provincia × cultura × religión × estrato (clave única por provincia, I5). */
export const popSchema = store.defineSchema('pop', 1, {
  province: { type: 'ref', unit: 'id', ref: 'province' },
  culture: {
    type: 'ref',
    unit: 'id',
    ref: 'culture',
    doc: 'P1.0: 0 (las culturas llegan en P1.3)',
  },
  religion: { type: 'ref', unit: 'id', ref: 'religion', doc: 'P1: 0 = ninguna (P8)' },
  stratum: { type: 'u8', unit: 'enum', doc: 'índice de Strata (content)' },
  size: { type: 'f64', unit: 'persons' },
});

export const politySchema = store.defineSchema('polity', 1, {
  founded: { type: 'i32', unit: 'year' },
  ended: { type: 'i32', unit: 'year', doc: '0 = activa' },
  endReason: { type: 'u8', unit: 'enum', doc: '0 = activa' },
  capital: { type: 'ref', unit: 'id', ref: 'province' },
  colorSeed: { type: 'u32', unit: 'id', doc: 'color estable (P2)' },
});

/** Estado vacío (sin filas): `initialize` lo puebla y `Sim.load` lo carga de un snapshot. */
export function createState(provinceCount: number) {
  return {
    world: new store.Globals(worldSchema),
    province: store.createTable<'province', typeof provinceSchema.fields>(provinceSchema, {
      capacity: provinceCount,
    }),
    pop: store.createTable<'pop', typeof popSchema.fields>(popSchema, {
      capacity: provinceCount * 2,
    }),
    polity: store.createSparseTable<'polity', typeof politySchema.fields>(politySchema),
  };
}

export type SimState = ReturnType<typeof createState>;

/** Partes del estado en orden fijo: el orden es parte del formato del snapshot. */
export function partsOf(state: SimState) {
  return [state.world, state.province, state.pop, state.polity] as const;
}

/** ¿La polity existe y está activa? (las refs "vivas" apuntan a entidades vivas, I6) */
export function isActivePolity(state: SimState, id: number): boolean {
  return state.polity.get(id)?.ended === 0;
}
