// Tipos de evento de la simulación (docs/model.md §11). Cada uno con umbral y significancia
// (H-08) y plantilla es/en en `@ws/i18n` (`events.<clave>`; lo exige un test). Los datos son
// solo números y claves: el texto se arma en la UI (regla de oro 8).
import { events, math } from '@ws/core';
import type { TerritoryCause } from './buffers';

/** Significancia de un cambio de dueño según su causa (score [0, 1]; model §11: 0,05–0,5). */
const TERRITORY_SIGNIFICANCE: Readonly<Record<TerritoryCause, number>> = {
  expansion: 0.05,
  formation: 0.15,
  absorption: 0.25,
  warCession: 0.3,
  secession: 0.35,
  collapse: 0.4,
  treaty: 0.3,
  submersion: 0.2,
};

/** Escala logarítmica de una magnitud a [0, 1]: `ref` da 0,5 y cada ×10 suma `step`. */
function logScale(value: number, ref: number, step = 0.15): number {
  if (!(value > 0)) return 0;
  return math.clamp(0.5 + step * math.log10(value / ref), 0, 1);
}

type Data = Readonly<Record<string, number | string | boolean>>;

export interface TerritoryChangedData extends Data {
  readonly from: number;
  readonly to: number;
  readonly cause: TerritoryCause;
  /** Solicitudes perdedoras sobre la misma provincia (quedan como hecho del evento). */
  readonly overruled: number;
}

export function createEventTypes() {
  const registry = new events.EventRegistry();
  return {
    registry,
    territoryChanged: registry.define<TerritoryChangedData>({
      key: 'territory.changed',
      threshold: 0.05,
      significance: (d) => TERRITORY_SIGNIFICANCE[d.data.cause],
    }),
    subsistenceShifted: registry.define<{
      readonly cropShare: number;
      readonly population: number;
    }>({
      key: 'subsistence.shifted',
      threshold: 0.1,
      significance: (d) => 0.1 + 0.3 * logScale(d.data.population, 100_000),
    }),
    famineStarted: registry.define<{ readonly foodSecurity: number; readonly population: number }>({
      key: 'famine.started',
      threshold: 0.6, // H-08: solo hambrunas con decenas de miles de personas sin alimento
      significance: (d) => logScale(d.data.population * (1 - d.data.foodSecurity), 10_000),
    }),
    famineEnded: registry.define<{ readonly population: number }>({
      key: 'famine.ended',
      threshold: 0.4,
      significance: (d) => logScale(d.data.population, 200_000),
    }),
    innovationInvented: registry.define<{
      readonly innovation: number;
      readonly firstInWorld: boolean;
    }>({
      key: 'innovation.invented',
      threshold: 0.3,
      significance: (d) => (d.data.firstInWorld ? 0.9 : 0.35),
    }),
    settlementFounded: registry.define<{ readonly level: number; readonly firstInWorld: boolean }>({
      key: 'settlement.founded',
      threshold: 0.05,
      significance: (d) => (d.data.firstInWorld ? 0.6 : 0.05),
    }),
    settlementGrew: registry.define<{
      readonly from: number;
      readonly to: number;
      readonly urban: number;
      readonly firstInWorld: boolean;
    }>({
      key: 'settlement.grew',
      threshold: 0.1,
      significance: (d) => Math.min(1, 0.1 + 0.12 * d.data.to + (d.data.firstInWorld ? 0.3 : 0)),
    }),
    settlementDeclined: registry.define<{
      readonly from: number;
      readonly to: number;
      readonly urban: number;
    }>({
      key: 'settlement.declined',
      threshold: 0.1,
      significance: (d) => Math.min(1, 0.05 + 0.12 * d.data.from),
    }),
    polityFormed: registry.define<{ readonly capital: number; readonly population: number }>({
      key: 'polity.formed',
      threshold: 0.2,
      significance: (d) => 0.2 + 0.3 * logScale(d.data.population, 100_000),
    }),
    polityAbsorbed: registry.define<{ readonly by: number; readonly provinces: number }>({
      key: 'polity.absorbed',
      threshold: 0.3,
      significance: (d) => Math.min(1, 0.3 + 0.05 * d.data.provinces),
    }),
    polityCollapsed: registry.define<{ readonly founded: number; readonly years: number }>({
      key: 'polity.collapsed',
      threshold: 0.3,
      significance: (d) => Math.min(1, 0.3 + d.data.years / 2000),
    }),
    personDied: registry.define<{
      readonly age: number;
      readonly ruler: boolean;
      readonly realm: number;
    }>({
      key: 'person.died',
      threshold: 0.15,
      significance: (d) => (d.data.ruler ? 0.1 + 0.4 * logScale(d.data.realm, 1_000_000) : 0.05),
    }),
    rulerSucceeded: registry.define<{
      readonly title: number;
      readonly previous: number;
      readonly relation: string;
      readonly realm: number;
    }>({
      key: 'ruler.succeeded',
      threshold: 0.1,
      significance: (d) => 0.1 + 0.4 * logScale(d.data.realm, 1_000_000),
    }),
    warDeclared: registry.define<{
      readonly war: number;
      readonly ratio: number;
      readonly realm: number;
    }>({
      key: 'war.declared',
      threshold: 0.3,
      significance: (d) => 0.3 + 0.4 * logScale(d.data.realm, 1_000_000),
    }),
    warEnded: registry.define<{
      readonly war: number;
      readonly outcome: string;
      readonly years: number;
      readonly gained: number;
    }>({
      key: 'war.ended',
      threshold: 0.3,
      significance: (d) => Math.min(1, 0.3 + 0.08 * d.data.gained + d.data.years / 200),
    }),
    treatySigned: registry.define<{
      readonly war: number;
      readonly kind: string;
      readonly gained: number;
    }>({
      key: 'treaty.signed',
      threshold: 0.2,
      significance: (d) => Math.min(1, 0.2 + 0.08 * d.data.gained),
    }),
    battleFought: registry.define<{
      readonly war: number;
      readonly attackerLosses: number;
      readonly defenderLosses: number;
      readonly attackerWon: boolean;
    }>({
      key: 'battle.fought',
      threshold: 0.1,
      significance: (d) => logScale(d.data.attackerLosses + d.data.defenderLosses, 5_000, 0.2),
    }),
  };
}

export type SimEventTypes = ReturnType<typeof createEventTypes>;
