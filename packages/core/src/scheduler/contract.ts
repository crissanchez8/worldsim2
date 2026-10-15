import type { EventBus } from '../events/bus';
import type { Season } from '../time';
import type { Phase } from './phases';

/**
 * Cadencia de un sistema (docs/model.md §7):
 * - `annual`: todos los años.
 * - `everyNYears`: si el índice astronómico del año es múltiplo de `years`.
 * - `seasonal`: 4 sub-pasos por año (estación 0–3).
 * - `onEvent`: corre todos los años pero solo procesa su cola (p. ej. muertes del año).
 */
export type Cadence =
  | { readonly kind: 'annual' }
  | { readonly kind: 'everyNYears'; readonly years: number }
  | { readonly kind: 'seasonal' }
  | { readonly kind: 'onEvent' };

/**
 * Contrato de un sistema. Los campos se nombran `parte.campo` (p. ej. `province.owner`):
 * - `parte.*`   todos los campos y filas de una parte;
 * - `parte.#rows` altas y bajas de filas;
 * - `parte.own` parte con dueño por fila (`Name`, `Modifier`…): varios sistemas pueden
 *   declararla; la propiedad de cada fila la hace cumplir la propia tabla.
 */
export interface SystemContract {
  readonly name: string;
  readonly phase: Phase;
  readonly cadence: Cadence;
  readonly reads: readonly string[];
  readonly writes: readonly string[];
  /** Claves de los tipos de evento que puede emitir. */
  readonly emits: readonly string[];
  /** Buffers a los que escribe y del que consume (nombres). */
  readonly produces?: readonly string[];
  readonly consumes?: readonly string[];
}

export interface TickInfo {
  readonly year: number;
  /** Solo en sistemas estacionales. */
  readonly season?: Season;
  readonly events: EventBus;
}

export interface SystemDef<W> {
  readonly contract: SystemContract;
  run(world: W, tick: TickInfo): void;
}
