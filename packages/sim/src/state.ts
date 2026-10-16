// Estado dinámico de P1 (docs/model.md §5, con los cambios de D53). Todo lo que está acá va al
// snapshot y al hash (ADR-004). Dueño de cada campo en el comentario `doc` (escritor único).
//
// Δ de P1 respecto de model.md v1.0 (se reflejan en v1.1 al cerrar la fase):
// - `Province.cropShare` (fracción cultivada de la tierra cultivable) en lugar de `landUse` ×5;
// - `Title` mínimo (uno por polity) con `heir` (dueño characters);
// - batallas, tratados e invenciones quedan solo como eventos (M2: no tienen consecuencias
//   futuras en P1); la guerra activa vive en `war` (diplomacy) y `front` (military).
import { modifiers, store } from '@ws/core';
import { P1_STATS } from './stats';

export const worldSchema = store.defineSchema('world', 1, {
  year: { type: 'i32', unit: 'year', doc: 'próximo año a simular (scheduler)' },
  startYear: { type: 'i32', unit: 'year' },
  endYear: { type: 'i32', unit: 'year' },
  nextEventId: { type: 'u32', unit: 'id', doc: 'asignador de ids de eventos (bus)' },
  staticHashA: { type: 'u32', unit: 'bits', doc: 'hash del WorldStatic (mitad alta)' },
  staticHashB: { type: 'u32', unit: 'bits', doc: 'hash del WorldStatic (mitad baja)' },
});

/** Provincias de tierra: misma id que `ProvinceStatic` (1..count). */
export const provinceSchema = store.defineSchema('province', 2, {
  owner: { type: 'ref', unit: 'id', ref: 'polity', doc: 'ledger (M1); 0 = sin dueño' },
  cropShare: { type: 'f32', unit: 'fraction', doc: 'production: parte cultivada de lo cultivable' },
  foodSecurity: { type: 'f32', unit: 'fraction', doc: 'demography: alimento / necesidad (≤ 1)' },
  knownInnovations: { type: 'u32', unit: 'bits', doc: 'knowledge: bit i = Innovations[i]' },
});

/** Pop = provincia × cultura × religión × estrato (clave única por provincia, I5). Dueño: ledger. */
export const popSchema = store.defineSchema('pop', 1, {
  province: { type: 'ref', unit: 'id', ref: 'province' },
  culture: { type: 'ref', unit: 'id', ref: 'culture' },
  religion: { type: 'ref', unit: 'id', ref: 'religion', doc: 'P1: 0 = ninguna (P8)' },
  stratum: { type: 'u8', unit: 'enum', doc: 'índice de Strata (content)' },
  size: { type: 'f64', unit: 'persons' },
});

/** Asentamientos (uno por provincia como máximo en P1). Dueño: settlements. */
export const settlementSchema = store.defineSchema('settlement', 1, {
  province: { type: 'ref', unit: 'id', ref: 'province' },
  urbanShare: { type: 'f32', unit: 'fraction', doc: 'parte de la población de la provincia' },
  level: { type: 'u8', unit: 'enum', doc: 'índice de SettlementLevels' },
  founded: { type: 'i32', unit: 'year' },
  name: { type: 'ref', unit: 'id', ref: 'name' },
});

/** Culturas placeholder de P1 (P4 las vuelve dinámicas). Creadas al iniciar. */
export const cultureSchema = store.defineSchema('culture', 1, {
  name: { type: 'ref', unit: 'id', ref: 'name' },
  originProvince: { type: 'ref', unit: 'id', ref: 'province' },
  founded: { type: 'i32', unit: 'year' },
  language: { type: 'ref', unit: 'id', ref: 'language' },
});

export const languageSchema = store.defineSchema('language', 1, {
  name: { type: 'ref', unit: 'id', ref: 'name' },
  phonologySeed: { type: 'u32', unit: 'id', doc: 'seed de la fonología (@ws/lang)' },
});

/** Nombres guardados al asignarse (dueño por fila: el sistema que nombra, columna `owner`). */
export const nameSchema = store.defineSchema('name', 1, {
  text: { type: 'str', unit: 'text', doc: 'romanizado' },
  language: { type: 'ref', unit: 'id', ref: 'language' },
  assigned: { type: 'i32', unit: 'year' },
  owner: { type: 'str', unit: 'text', doc: 'sistema que creó la fila' },
});

/** Polities. Dueño: statecraft, salvo `warCooldownUntil` (diplomacy). */
export const politySchema = store.defineSchema('polity', 2, {
  name: { type: 'ref', unit: 'id', ref: 'name' },
  founded: { type: 'i32', unit: 'year' },
  ended: { type: 'i32', unit: 'year', doc: '0 = activa' },
  endReason: { type: 'u8', unit: 'enum', doc: 'POLITY_END_REASONS; 0 = activa' },
  capital: { type: 'ref', unit: 'id', ref: 'province' },
  colorSeed: { type: 'u32', unit: 'id', doc: 'color estable (P2)' },
  primaryTitle: { type: 'ref', unit: 'id', ref: 'title' },
  succession: { type: 'u8', unit: 'enum', doc: 'índice de Laws (P1: primogenitura)' },
  warCooldownUntil: { type: 'i32', unit: 'year', doc: 'diplomacy: no declara antes de este año' },
});

/** Títulos (P1: uno por polity). Dueño: statecraft; `holder`: succession; `heir`: characters. */
export const titleSchema = store.defineSchema('title', 1, {
  polity: { type: 'ref', unit: 'id', ref: 'polity' },
  level: { type: 'u8', unit: 'enum', doc: 'P1: 0 = título principal' },
  holder: { type: 'ref', unit: 'id', ref: 'person', doc: 'succession' },
  heir: { type: 'ref', unit: 'id', ref: 'person', doc: 'characters' },
  created: { type: 'i32', unit: 'year' },
  destroyed: { type: 'i32', unit: 'year', doc: '0 = vigente' },
});

/** Personas (registro permanente, M6; P1: gobernantes y herederos). Dueño: characters. */
export const personSchema = store.defineSchema('person', 1, {
  name: { type: 'ref', unit: 'id', ref: 'name' },
  sex: { type: 'u8', unit: 'enum', doc: '0 mujer, 1 varón' },
  father: { type: 'ref', unit: 'id', ref: 'person' },
  mother: { type: 'ref', unit: 'id', ref: 'person' },
  born: { type: 'i32', unit: 'year' },
  died: { type: 'i32', unit: 'year', doc: '0 = vivo' },
  deathCause: { type: 'u8', unit: 'enum', doc: 'DEATH_CAUSES' },
  culture: { type: 'ref', unit: 'id', ref: 'culture' },
});

/** Guerras (P1: un polity por bando). Dueño: diplomacy. */
export const warSchema = store.defineSchema('war', 1, {
  attacker: { type: 'ref', unit: 'id', ref: 'polity' },
  defender: { type: 'ref', unit: 'id', ref: 'polity' },
  started: { type: 'i32', unit: 'year' },
  ended: { type: 'i32', unit: 'year', doc: '0 = activa' },
  outcome: { type: 'u8', unit: 'enum', doc: 'WAR_OUTCOMES; 0 = en curso' },
});

/** Frente de cada guerra (lo que la guerra va dejando). Dueño: military. */
export const frontSchema = store.defineSchema('front', 1, {
  war: { type: 'ref', unit: 'id', ref: 'war' },
  score: { type: 'f32', unit: 'score', doc: '[−100, 100]; + favorece al atacante' },
  attackerExhaustion: { type: 'f32', unit: 'fraction' },
  defenderExhaustion: { type: 'f32', unit: 'fraction' },
  gained: { type: 'u16', unit: 'count', doc: 'provincias cedidas al atacante' },
  lastContact: { type: 'i32', unit: 'year', doc: 'último año con batalla' },
});

/** Motivos de fin de una polity (`Polity.endReason`). */
export const POLITY_END_REASONS = ['active', 'absorbed', 'conquered'] as const;
/** Causas de muerte de una persona (`Person.deathCause`). */
export const DEATH_CAUSES = ['alive', 'natural'] as const;
/** Resultados de una guerra (`War.outcome`). */
export const WAR_OUTCOMES = [
  'ongoing',
  'attackerVictory',
  'defenderVictory',
  'whitePeace',
] as const;

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
    settlement: store.createTable<'settlement', typeof settlementSchema.fields>(settlementSchema, {
      capacity: provinceCount,
    }),
    culture: store.createSparseTable<'culture', typeof cultureSchema.fields>(cultureSchema),
    language: store.createSparseTable<'language', typeof languageSchema.fields>(languageSchema),
    name: store.createSparseTable<'name', typeof nameSchema.fields>(nameSchema),
    polity: store.createSparseTable<'polity', typeof politySchema.fields>(politySchema),
    title: store.createSparseTable<'title', typeof titleSchema.fields>(titleSchema),
    person: store.createSparseTable<'person', typeof personSchema.fields>(personSchema),
    war: store.createSparseTable<'war', typeof warSchema.fields>(warSchema),
    front: store.createSparseTable<'front', typeof frontSchema.fields>(frontSchema),
    modifier: new modifiers.ModifierStore(P1_STATS),
  };
}

export type SimState = ReturnType<typeof createState>;

/** Partes del estado en orden fijo: el orden es parte del formato del snapshot. */
export function partsOf(state: SimState) {
  return [
    state.world,
    state.province,
    state.pop,
    state.settlement,
    state.culture,
    state.language,
    state.name,
    state.polity,
    state.title,
    state.person,
    state.war,
    state.front,
    state.modifier,
  ] as const;
}

/** ¿La polity existe y está activa? (las refs "vivas" apuntan a entidades vivas, I6) */
export function isActivePolity(state: SimState, id: number): boolean {
  return state.polity.get(id)?.ended === 0;
}
