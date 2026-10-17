// Cliente tipado del Worker de worldgen: una promesa por pedido + callback de progreso.
import type { WorldgenStage, WorldParams, WorldStatic } from '@ws/worldgen';
import { absoluteNow, type WorldgenRequest, type WorldgenResponse } from './worldgen-protocol';

/** Lo mínimo de un `Worker` que usa el cliente (los tests pasan uno falso). */
export interface WorkerLike {
  postMessage(message: WorldgenRequest): void;
  onmessage: ((event: MessageEvent<WorldgenResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  terminate(): void;
}

export type ProgressCallback = (stage: WorldgenStage, index: number, total: number) => void;

export interface WorldgenResult {
  readonly world: WorldStatic;
  /** `generateWorld` dentro del Worker (ms). */
  readonly generateMs: number;
  /** Del envío en el Worker a la recepción en la página (ms): la transferencia. */
  readonly transferMs: number;
  /** Del pedido a la recepción, en la página (ms). */
  readonly wallMs: number;
}

interface Pending {
  readonly resolve: (result: WorldgenResult) => void;
  readonly reject: (error: Error) => void;
  readonly onProgress: ProgressCallback | undefined;
  readonly startedAt: number;
}

export class WorldgenClient {
  private readonly worker: WorkerLike;
  private readonly pending = new Map<number, Pending>();
  private nextId = 1;
  private disposed = false;

  constructor(worker: WorkerLike) {
    this.worker = worker;
    worker.onmessage = (event) => {
      this.receive(event.data);
    };
    worker.onerror = (event) => {
      this.failAll(new Error(`worldgen: el Worker falló (${event.message})`));
    };
  }

  generate(params: WorldParams, onProgress?: ProgressCallback): Promise<WorldgenResult> {
    if (this.disposed) return Promise.reject(new Error('worldgen: cliente cerrado'));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, onProgress, startedAt: absoluteNow() });
      this.worker.postMessage({ id, params });
    });
  }

  /** Termina el Worker y rechaza lo pendiente. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.worker.terminate();
    this.failAll(new Error('worldgen: cliente cerrado'));
  }

  private receive(message: WorldgenResponse): void {
    const entry = this.pending.get(message.id);
    if (!entry) return;
    switch (message.type) {
      case 'progress':
        entry.onProgress?.(message.stage, message.index, message.total);
        return;
      case 'done': {
        this.pending.delete(message.id);
        const now = absoluteNow();
        entry.resolve({
          world: message.world,
          generateMs: message.generateMs,
          transferMs: Math.max(0, now - message.postedAt),
          wallMs: now - entry.startedAt,
        });
        return;
      }
      case 'error':
        this.pending.delete(message.id);
        entry.reject(new Error(`worldgen: ${message.message}`));
        return;
    }
  }

  private failAll(error: Error): void {
    const entries = [...this.pending.values()];
    this.pending.clear();
    for (const entry of entries) entry.reject(error);
  }
}

/** Crea el Worker real (Vite lo empaqueta como módulo aparte). */
export function createWorldgenClient(): WorldgenClient {
  const worker = new Worker(new URL('./worldgen.worker.ts', import.meta.url), {
    type: 'module',
    name: 'worldgen',
  });
  return new WorldgenClient(worker);
}
