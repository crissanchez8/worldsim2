// El "por qué" de los stats de P1 para el inspector (P1.6, model.md §5.12): base del sistema dueño,
// términos de las innovaciones conocidas (contenido, sobre el bitset) y modificadores del estado
// (tabla `modifier`; en P1 no hay filas). Usa las mismas bases que los sistemas: un test lo ata a
// sus funciones, así el inspector no puede contar otra cosa que la que simula el motor.
import type { events, modifiers } from '@ws/core';
import { PRODUCTION, SETTLEMENTS, KNOWLEDGE, STATECRAFT, WAR } from './config';
import type { SimContext } from './context';
import {
  innovationTerms,
  type InnovationTerm,
  P1_STATS,
  type P1Stat,
  withInnovations,
} from './stats';

export interface StatExplanation {
  readonly stat: P1Stat;
  readonly unit: string;
  /** Base del sistema dueño, antes de innovaciones y modificadores. */
  readonly base: number;
  /** Factor del sistema fuera del stat (p. ej. la difusión base); 1 = ninguno. */
  readonly scale: number;
  readonly innovations: readonly InnovationTerm[];
  /** Modificadores activos del estado (fuente, operación, valor). */
  readonly modifiers: readonly modifiers.ExplainTerm[];
  readonly value: number;
}

function explainStat(
  w: SimContext,
  target: events.EntityRef,
  stat: P1Stat,
  base: number,
  bits: number,
  year: number,
  scale = 1,
): StatExplanation {
  const withKnown = withInnovations(stat, base, bits);
  const e = w.state.modifier.explain(target, stat, withKnown, year);
  return {
    stat,
    unit: P1_STATS[stat].unit,
    base,
    scale,
    innovations: innovationTerms(stat, bits),
    modifiers: [...e.add, ...e.mul, ...e.caps, ...e.floors],
    value: e.value * scale,
  };
}

function bitsOf(w: SimContext, province: number): number {
  return w.state.province.column('knownInnovations')[province - 1] ?? 0;
}

/** Stats de una provincia: rendimientos, alcance agrícola, difusión y fracción urbana base. */
export function explainProvince(w: SimContext, province: number, year: number): StatExplanation[] {
  const bits = bitsOf(w, province);
  const target = { kind: 'province', id: province };
  return [
    explainStat(w, target, 'cropYield', PRODUCTION.cropYieldT, bits, year),
    explainStat(w, target, 'forageYield', PRODUCTION.forageYieldT, bits, year),
    explainStat(w, target, 'cropReach', PRODUCTION.cropReachBase, bits, year),
    explainStat(w, target, 'diffusionRate', 1, bits, year, KNOWLEDGE.diffusionBase),
    explainStat(w, target, 'urbanShare', SETTLEMENTS.urbanBase, bits, year),
  ];
}

/** Stats de una polity: fuerza militar y alcance (innovaciones de su capital). */
export function explainPolity(w: SimContext, polity: number, year: number): StatExplanation[] {
  const capital = w.state.polity.get(polity)?.capital ?? 0;
  const bits = capital === 0 ? 0 : bitsOf(w, capital);
  const target = { kind: 'polity', id: polity };
  const army = (w.derived.polityPopulation[polity] ?? 0) * WAR.armyShare;
  return [
    explainStat(w, target, 'combatStrength', army, bits, year),
    explainStat(w, target, 'reach', STATECRAFT.reachDays, bits, year),
  ];
}
