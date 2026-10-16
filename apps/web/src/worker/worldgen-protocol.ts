// Protocolo del Worker de worldgen (DEVELOPMENT_PLAN §8): el hilo principal pide un mundo y
// recibe el progreso por etapa y el `WorldStatic` con sus buffers transferidos (sin copia).
import {
  generateWorld,
  transferables,
  type WorldgenStage,
  type WorldParams,
  type WorldStatic,
} from '@ws/worldgen';

export interface WorldgenRequest {
  /** Identifica la respuesta (un cliente puede tener varios pedidos en vuelo). */
  readonly id: number;
  readonly params: WorldParams;
}

export type WorldgenResponse =
  | {
      readonly type: 'progress';
      readonly id: number;
      readonly stage: WorldgenStage;
      readonly index: number;
      readonly total: number;
    }
  | {
      readonly type: 'done';
      readonly id: number;
      readonly world: WorldStatic;
      /** Tiempo de `generateWorld` dentro del Worker (ms). */
      readonly generateMs: number;
      /** Reloj absoluto al enviar (ms, `timeOrigin + now`): el cliente mide la transferencia. */
      readonly postedAt: number;
    }
  | { readonly type: 'error'; readonly id: number; readonly message: string };

export type Post = (message: WorldgenResponse, transfer?: Transferable[]) => void;

/** Reloj absoluto en ms, comparable entre el Worker y la página. */
export function absoluteNow(): number {
  return performance.timeOrigin + performance.now();
}

/**
 * Atiende un pedido: genera el mundo avisando cada etapa y lo envía con sus buffers transferidos.
 * Separado del `onmessage` del Worker para probarlo en Node.
 */
export function handleWorldgenRequest(request: WorldgenRequest, post: Post): void {
  const { id, params } = request;
  try {
    const t0 = performance.now();
    const world = generateWorld(params, (stage, index, total) => {
      post({ type: 'progress', id, stage, index, total });
    });
    const generateMs = performance.now() - t0;
    post({ type: 'done', id, world, generateMs, postedAt: absoluteNow() }, transferables(world));
  } catch (error) {
    post({ type: 'error', id, message: error instanceof Error ? error.message : String(error) });
  }
}
