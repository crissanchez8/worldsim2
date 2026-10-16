import type { Season } from '../time';

/** Referencia tipada a una entidad (los tipos los define el modelo de dominio, no core). */
export interface EntityRef {
  readonly kind: string;
  readonly id: number;
}

/** Causa de un evento: otro evento (anterior) o un hecho del estado en un año. */
export type Cause =
  | { readonly kind: 'event'; readonly id: number }
  | {
      readonly kind: 'fact';
      readonly entity: EntityRef;
      readonly field: string;
      readonly year: number;
    };

/** Datos estructurados de un evento: JSON sin NaN ni infinitos (los eventos guardan datos, no texto). */
export type EventData =
  number | string | boolean | null | readonly EventData[] | { readonly [key: string]: EventData };

export interface GameEvent<D extends EventData = EventData> {
  readonly id: number;
  readonly type: string;
  readonly year: number;
  readonly season?: Season;
  readonly actors: readonly EntityRef[];
  readonly place?: EntityRef;
  readonly causes: readonly Cause[];
  readonly data: D;
  /** Importancia en [0, 1]: decide qué se muestra y qué se cuenta. */
  readonly significance: number;
}

/** Lo que un sistema entrega al emitir (el bus completa id, tipo, año y significancia). */
export interface EventDraft<D extends EventData = EventData> {
  readonly actors: readonly EntityRef[];
  readonly place?: EntityRef;
  readonly causes?: readonly Cause[];
  readonly data: D;
  readonly season?: Season;
}
