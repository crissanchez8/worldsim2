// Protocolo del Worker de simulación (P1.5, D49): el Worker simula por tandas hasta un objetivo que
// le marca la reproducción, graba la historia y manda lotes transferibles; el hilo principal arma un
// espejo de la historia y reproduce desde ahí. Un archivo `.wsim` entra por el mismo camino.
import type { HistoryBatch, HistoryData } from '@ws/history';
import type { StatExplanation } from '@ws/sim';
import type { WorldStatic } from '@ws/worldgen';
import type { RegistryDelta } from '../live/registry';

export const ENTITY_KINDS = [
  'province',
  'settlement',
  'polity',
  'person',
  'culture',
  'war',
] as const;
export type EntityKind = (typeof ENTITY_KINDS)[number];

export interface EntityRef {
  readonly kind: EntityKind;
  readonly id: number;
}

/** Lo que solo sale del estado completo exacto a una fecha (el "por qué" del inspector, D50). */
export type EntityDetail =
  | {
      readonly kind: 'province';
      readonly id: number;
      /** fraction. */
      readonly cropShare: number;
      /** Alimento / necesidad (fraction, ≤ 1). */
      readonly foodSecurity: number;
      /** persons. */
      readonly population: number;
      /** Población por cultura (persons), de mayor a menor. */
      readonly cultures: readonly { readonly culture: number; readonly persons: number }[];
      readonly stats: readonly StatExplanation[];
    }
  | {
      readonly kind: 'polity';
      readonly id: number;
      readonly provinces: number;
      /** persons. */
      readonly population: number;
      readonly ruler: number;
      readonly heir: number;
      readonly stats: readonly StatExplanation[];
    }
  | {
      readonly kind: 'settlement';
      readonly id: number;
      /** fraction de la provincia. */
      readonly urbanShare: number;
      /** false = ya no existía a esa fecha. */
      readonly exists: boolean;
    }
  | {
      readonly kind: 'person';
      readonly id: number;
      /** Polities que gobierna a la fecha. */
      readonly rules: readonly number[];
      /** Polities de las que es heredero a la fecha. */
      readonly heirOf: readonly number[];
    }
  | { readonly kind: 'culture' | 'war'; readonly id: number };

export type SimRequest =
  /** Arranca con el mundo (copiado) y, si viene, la historia guardada que continúa. */
  | { readonly type: 'init'; readonly world: WorldStatic; readonly file?: Uint8Array }
  /** Simular hasta el estado k (años completados). */
  | { readonly type: 'target'; readonly k: number }
  /** Hash del estado completo exacto en k (keyframe + re-simulación). */
  | { readonly type: 'fullState'; readonly id: number; readonly k: number }
  /** Bytes del `.wsim` de lo simulado hasta ahora. */
  | { readonly type: 'save'; readonly id: number }
  /** Detalle exacto de una entidad en el estado k (el "por qué"). */
  | {
      readonly type: 'inspect';
      readonly id: number;
      readonly k: number;
      readonly entity: EntityRef;
    };

export type SimResponse =
  | {
      readonly type: 'ready';
      /** Lo visible de la historia hasta ahora (sin keyframes completos). */
      readonly data: HistoryData;
      /** Último k de la corrida. */
      readonly endK: number;
      /** false = archivo de otra versión del motor: se ve, no se continúa. */
      readonly canContinue: boolean;
      readonly engineVersion: string;
      /** Registro completo de entidades (vacío si la historia es de otra versión). */
      readonly registry: RegistryDelta;
    }
  | {
      readonly type: 'batch';
      readonly batch: HistoryBatch;
      /** Años simulados (k de la cabeza). */
      readonly head: number;
      /** Costo medio de un año simulado en esta sesión del Worker (ms). */
      readonly msPerYear: number;
      /** Registros nuevos o cambiados (como mucho cada LIVE.registryMs). */
      readonly registry?: RegistryDelta;
    }
  | {
      readonly type: 'inspected';
      readonly id: number;
      readonly k: number;
      readonly detail: EntityDetail;
      /** Re-simulación incluida (ms). */
      readonly ms: number;
    }
  | {
      readonly type: 'fullState';
      readonly id: number;
      readonly k: number;
      readonly hash: string;
      /** Re-simulación incluida (ms). */
      readonly ms: number;
    }
  | {
      readonly type: 'saved';
      readonly id: number;
      readonly bytes: Uint8Array;
      readonly head: number;
      /** Último año simulado (calendario). */
      readonly year: number;
    }
  | { readonly type: 'error'; readonly id?: number; readonly message: string };

export type SimPost = (message: SimResponse, transfer?: Transferable[]) => void;
