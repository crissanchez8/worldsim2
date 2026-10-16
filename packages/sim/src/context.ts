// Lo que reciben los sistemas en cada tick: estado (snapshot + hash), mundo estático, buffers,
// tipos de evento y vistas derivadas. Solo `state` es estado; lo demás se reconstruye.
import type { scheduler } from '@ws/core';
import type { WorldStatic } from '@ws/worldgen';
import type { SimBuffers } from './buffers';
import type { Derived } from './derive';
import type { SimEventTypes } from './events';
import type { SimState } from './state';

/** Contabilidad del último tick del ledger (I2). Es un reporte, no estado. */
export interface LedgerTally {
  /** persons nacidas. */
  births: number;
  /** persons muertas, por índice de `POP_DELTA_CAUSES` (incluye `dispersal`). */
  readonly deaths: Float64Array;
  /** persons transferidas entre pops (conservan; incluye `merge`). */
  transferred: number;
  /** Pops creados y eliminados por el ledger. */
  popsCreated: number;
  popsRemoved: number;
  /** Provincias que cambiaron de dueño. */
  territoryChanges: number;
}

export interface SimContext {
  readonly world: WorldStatic;
  readonly state: SimState;
  readonly buffers: SimBuffers;
  readonly types: SimEventTypes;
  derived: Derived;
  ledger: LedgerTally;
}

export type SimSystem = scheduler.SystemDef<SimContext>;
