// Buffers de flujo calientes del tick (docs/model.md §8), en SoA. Los consume el `ledger` (M1).
import { scheduler } from '@ws/core';

/** Tipo de delta de población (`popDeltas.kind`). */
export const PopDeltaKind = { birth: 0, death: 1, transfer: 2 } as const;

/**
 * Causa de un delta de población (`popDeltas.cause`): de nacimiento o muerte, o de
 * transferencia. La contabilidad del ledger (I2) se lleva por causa.
 */
export const POP_DELTA_CAUSES = [
  'natural', // nacimientos y muertes por edad
  'famine',
  'war',
  'disease',
  'migration', // transferencia pop → otra provincia (P4)
  'assimilation', // transferencia de cultura (P4)
  'conversion', // transferencia de religión (P8)
  'mobility', // transferencia de estrato (P4)
  'flood', // migración forzada por sumersión (P3)
  'merge', // el ledger fusiona un pop de menos de 1 persona con el más parecido
  'dispersal', // el ledger: el último pop de una provincia quedó en menos de 1 persona
] as const;
export type PopDeltaCause = (typeof POP_DELTA_CAUSES)[number];
export const popDeltaCause = (key: PopDeltaCause): number => POP_DELTA_CAUSES.indexOf(key);

/**
 * Causas de cambio de dueño de una provincia (`territoryRequests.cause`) y su prioridad
 * (docs/model.md §8): sumersión > tratado > colapso/secesión > cesión por guerra >
 * formación/absorción > expansión a tierra sin dueño. A igual prioridad gana la primera emitida.
 */
export const TERRITORY_CAUSES = [
  'expansion',
  'formation',
  'absorption',
  'warCession',
  'secession',
  'collapse',
  'treaty',
  'submersion',
] as const;
export type TerritoryCause = (typeof TERRITORY_CAUSES)[number];
export const territoryCause = (key: TerritoryCause): number => TERRITORY_CAUSES.indexOf(key);

/** Prioridad por causa (mayor gana), en el orden de `TERRITORY_CAUSES`. */
export const TERRITORY_PRIORITY: readonly number[] = [0, 1, 1, 2, 3, 3, 4, 5];

export function createBuffers() {
  return {
    /** Variaciones de `Pop.size`: nacimientos, muertes y transferencias (con la clave destino). */
    popDeltas: scheduler.createSoaBuffer('popDeltas', {
      pop: { type: 'ref', unit: 'id', ref: 'pop' },
      kind: { type: 'u8', unit: 'enum', doc: 'PopDeltaKind' },
      cause: { type: 'u8', unit: 'enum', doc: 'POP_DELTA_CAUSES' },
      persons: { type: 'f64', unit: 'persons', doc: '≥ 0; el signo lo da kind' },
      toProvince: { type: 'ref', unit: 'id', ref: 'province', doc: 'transferencia: clave destino' },
      toCulture: { type: 'ref', unit: 'id', ref: 'culture' },
      toReligion: { type: 'ref', unit: 'id', ref: 'religion' },
      toStratum: { type: 'u8', unit: 'enum' },
    }),
    /** Alimento producido en el año por provincia (production → demography; P6: → markets). */
    productionOutput: scheduler.createSoaBuffer(
      'productionOutput',
      {
        province: { type: 'ref', unit: 'id', ref: 'province' },
        food: { type: 'f64', unit: 'tons' },
      },
      { capacity: 2048 },
    ),
    /** Solicitudes de cambio de dueño de provincias. */
    territoryRequests: scheduler.createSoaBuffer(
      'territoryRequests',
      {
        province: { type: 'ref', unit: 'id', ref: 'province' },
        newOwner: { type: 'ref', unit: 'id', ref: 'polity', doc: '0 = sin dueño' },
        cause: { type: 'u8', unit: 'enum', doc: 'TERRITORY_CAUSES' },
        causeEvent: { type: 'u32', unit: 'id', ref: 'event', doc: '0 = sin evento causa' },
      },
      { capacity: 256 },
    ),
  };
}

export type SimBuffers = ReturnType<typeof createBuffers>;
