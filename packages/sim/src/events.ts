// Tipos de evento de la simulación (docs/model.md §11). Cada uno con umbral y significancia
// (H-08) y plantilla es/en en `@ws/i18n` (`events.<clave>`; lo exige un test).
import { events } from '@ws/core';
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

export interface TerritoryChangedData {
  readonly [key: string]: number | string;
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
      significance: (draft) => TERRITORY_SIGNIFICANCE[draft.data.cause],
    }),
  };
}

export type SimEventTypes = ReturnType<typeof createEventTypes>;
