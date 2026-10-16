// Mensajes entre el hilo principal y el Worker del spike B.
import type { HistoryStats } from './history';

export type ToWorker =
  | {
      readonly type: 'start';
      readonly years: number;
      readonly sliceMs: number;
      readonly hash: boolean;
    }
  | { readonly type: 'pause' }
  | { readonly type: 'resume' }
  | { readonly type: 'view'; readonly k: number; readonly request: number }
  | { readonly type: 'fullState'; readonly k: number; readonly request: number };

export type FromWorker =
  | {
      readonly type: 'init';
      readonly width: number;
      readonly height: number;
      readonly owners: Uint32Array;
      readonly cultures: Uint16Array;
      readonly startYear: number;
    }
  | {
      readonly type: 'batch';
      /** Deltas visuales concatenados (transferidos, sin copia). */
      readonly deltas: Uint32Array;
      /** ms de cada año del lote (transferido). */
      readonly stepMs: Float32Array;
      readonly head: number;
      readonly headYear: number;
      readonly hash: string | null;
      readonly history: HistoryStats;
    }
  | {
      readonly type: 'view';
      readonly request: number;
      readonly k: number;
      readonly owners: Uint32Array;
      readonly cultures: Uint16Array;
      readonly ms: number;
    }
  | {
      readonly type: 'fullState';
      readonly request: number;
      readonly k: number;
      readonly hash: string;
      readonly ms: number;
    }
  | { readonly type: 'done'; readonly totalMs: number };
