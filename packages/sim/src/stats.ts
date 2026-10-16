// Stats de P1 (docs/model.md §5.12): valor = base del sistema dueño × efectos de las innovaciones
// conocidas (contenido, derivados del bitset de la provincia) + modificadores del estado (tabla
// `modifier`). `explainStat` devuelve los términos con su fuente para el inspector.
import { Innovations } from '@ws/content';
import { type events, modifiers } from '@ws/core';

export const P1_STATS = modifiers.defineStats({
  cropYield: {
    unit: 'tons_per_year',
    combine: 'multiplicative',
    min: 0,
    doc: 'por km2 cultivado (production)',
  },
  forageYield: {
    unit: 'tons_per_year',
    combine: 'multiplicative',
    min: 0,
    doc: 'por km2 forrajeado con habitabilidad 1 (production)',
  },
  birthRate: { unit: 'per_year', combine: 'additive', min: 0, doc: 'demography' },
  deathRate: { unit: 'per_year', combine: 'additive', min: 0, doc: 'demography' },
  diffusionRate: { unit: 'per_year', combine: 'multiplicative', min: 0, doc: 'knowledge' },
  combatStrength: { unit: 'score', combine: 'multiplicative', min: 0, doc: 'military' },
  urbanShare: { unit: 'fraction', combine: 'additive', min: 0, max: 1, doc: 'settlements' },
  reach: { unit: 'days', combine: 'additive', min: 0, doc: 'statecraft' },
});

export type P1Stat = keyof typeof P1_STATS;

/** Efectos de innovación por stat, precalculados: [índice de innovación, op, valor]. */
const EFFECTS = new Map<string, { index: number; op: 'mul' | 'add'; value: number }[]>();
Innovations.rows.forEach((row, index) => {
  for (const e of row.effects) {
    const list = EFFECTS.get(e.stat) ?? [];
    list.push({ index, op: e.op, value: e.value });
    EFFECTS.set(e.stat, list);
  }
});

/** Bit de una innovación en `Province.knownInnovations`. */
export function innovationBit(key: string): number {
  return 1 << Innovations.indexOf(key);
}

export function knows(bits: number, bit: number): boolean {
  return (bits & bit) !== 0;
}

/**
 * Base efectiva de un stat: la base del sistema con los efectos de las innovaciones conocidas
 * (las `add` primero y después las `mul` si el stat es aditivo; al revés si es multiplicativo).
 */
export function withInnovations(stat: P1Stat, base: number, bits: number): number {
  const list = EFFECTS.get(stat);
  if (!list || bits === 0) return base;
  const additive = P1_STATS[stat].combine === 'additive';
  let add = 0;
  let mul = 1;
  for (const e of list) {
    if ((bits & (1 << e.index)) === 0) continue;
    if (e.op === 'mul') mul *= e.value;
    else add += e.value;
  }
  return additive ? (base + add) * mul : base * mul + add;
}

/** Término de una innovación en la explicación de un stat. */
export interface InnovationTerm {
  readonly source: events.EntityRef;
  readonly op: 'mul' | 'add';
  readonly value: number;
}

/** Términos de innovación de un stat para el inspector (fuente = la innovación). */
export function innovationTerms(stat: P1Stat, bits: number): InnovationTerm[] {
  return (EFFECTS.get(stat) ?? [])
    .filter((e) => (bits & (1 << e.index)) !== 0)
    .map((e) => ({ source: { kind: 'innovation', id: e.index }, op: e.op, value: e.value }));
}
