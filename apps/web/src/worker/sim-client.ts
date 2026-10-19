// Cliente tipado del Worker de simulación: eventos de la corrida (listo, lotes, errores) y una
// promesa por pedido (estado completo, guardar).
import type { WorldStatic } from '@ws/worldgen';
import type { EntityRef, SimRequest, SimResponse } from './sim-protocol';

/** Lo mínimo de un `Worker` que usa el cliente. */
export interface SimWorkerLike {
  postMessage(message: SimRequest, transfer?: Transferable[]): void;
  onmessage: ((event: MessageEvent<SimResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  terminate(): void;
}

export type SimReady = Extract<SimResponse, { type: 'ready' }>;
export type SimBatch = Extract<SimResponse, { type: 'batch' }>;
export type SimSaved = Omit<Extract<SimResponse, { type: 'saved' }>, 'type' | 'id'>;
export type SimFullState = Omit<Extract<SimResponse, { type: 'fullState' }>, 'type' | 'id'>;
export type SimInspected = Omit<Extract<SimResponse, { type: 'inspected' }>, 'type' | 'id'>;

export interface SimClientEvents {
  onReady(ready: SimReady): void;
  onBatch(batch: SimBatch): void;
  onError(message: string): void;
}

interface Pending {
  readonly resolve: (value: SimSaved | SimFullState | SimInspected) => void;
  readonly reject: (error: Error) => void;
}

export class SimClient {
  private readonly worker: SimWorkerLike;
  private readonly pending = new Map<number, Pending>();
  private nextId = 1;
  private disposed = false;

  constructor(worker: SimWorkerLike, events: SimClientEvents) {
    this.worker = worker;
    worker.onmessage = (event) => {
      const m = event.data;
      switch (m.type) {
        case 'ready':
          events.onReady(m);
          return;
        case 'batch':
          events.onBatch(m);
          return;
        case 'fullState':
        case 'inspected':
        case 'saved': {
          const { type: _type, id, ...rest } = m;
          this.pending.get(id)?.resolve(rest);
          this.pending.delete(id);
          return;
        }
        case 'error': {
          const entry = m.id === undefined ? undefined : this.pending.get(m.id);
          if (entry && m.id !== undefined) {
            this.pending.delete(m.id);
            entry.reject(new Error(m.message));
          } else events.onError(m.message);
          return;
        }
      }
    };
    worker.onerror = (event) => {
      events.onError(`simulación: el Worker falló (${event.message})`);
    };
  }

  /** El mundo va copiado (el mapa se queda con el suyo); el archivo, transferido. */
  init(world: WorldStatic, file?: Uint8Array): void {
    this.worker.postMessage(
      { type: 'init', world, ...(file ? { file } : {}) },
      file ? [file.buffer as ArrayBuffer] : [],
    );
  }

  setTarget(k: number): void {
    this.worker.postMessage({ type: 'target', k });
  }

  fullState(k: number): Promise<SimFullState> {
    return this.request((id) => ({ type: 'fullState', id, k })) as Promise<SimFullState>;
  }

  inspect(k: number, entity: EntityRef): Promise<SimInspected> {
    return this.request((id) => ({ type: 'inspect', id, k, entity })) as Promise<SimInspected>;
  }

  save(): Promise<SimSaved> {
    return this.request((id) => ({ type: 'save', id })) as Promise<SimSaved>;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.worker.terminate();
    const entries = [...this.pending.values()];
    this.pending.clear();
    for (const e of entries) e.reject(new Error('simulación: cliente cerrado'));
  }

  private request(
    make: (id: number) => SimRequest,
  ): Promise<SimSaved | SimFullState | SimInspected> {
    if (this.disposed) return Promise.reject(new Error('simulación: cliente cerrado'));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage(make(id));
    });
  }
}

export function createSimClient(events: SimClientEvents): SimClient {
  const worker = new Worker(new URL('./sim.worker.ts', import.meta.url), {
    type: 'module',
    name: 'sim',
  });
  return new SimClient(worker, events);
}
