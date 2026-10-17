// Protocolo del Worker de simulación (P1.5, D49): el Worker simula por tandas hasta un objetivo que
// le marca la reproducción, graba la historia y manda lotes transferibles; el hilo principal arma un
// espejo de la historia y reproduce desde ahí. Un archivo `.wsim` entra por el mismo camino.
import type { HistoryBatch, HistoryData } from '@ws/history';
import type { WorldStatic } from '@ws/worldgen';

export type SimRequest =
  /** Arranca con el mundo (copiado) y, si viene, la historia guardada que continúa. */
  | { readonly type: 'init'; readonly world: WorldStatic; readonly file?: Uint8Array }
  /** Simular hasta el estado k (años completados). */
  | { readonly type: 'target'; readonly k: number }
  /** Hash del estado completo exacto en k (keyframe + re-simulación). */
  | { readonly type: 'fullState'; readonly id: number; readonly k: number }
  /** Bytes del `.wsim` de lo simulado hasta ahora. */
  | { readonly type: 'save'; readonly id: number };

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
    }
  | {
      readonly type: 'batch';
      readonly batch: HistoryBatch;
      /** Años simulados (k de la cabeza). */
      readonly head: number;
      /** Costo medio de un año simulado en esta sesión del Worker (ms). */
      readonly msPerYear: number;
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
