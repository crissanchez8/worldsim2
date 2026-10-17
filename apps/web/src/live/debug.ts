// Asa de prueba de la vista en vivo (`window.__live`): la usan el E2E de guardar y continuar y
// las mediciones. No es UI: no lleva textos.
import { NO_LEVEL } from '@ws/history';
import type { SavedWorld, WorldStore } from '../storage/world-store';
import type { Speed } from './config';
import type { LiveSession, LiveStatus } from './live-session';
import { saveLive } from './save';

export interface LiveDebug {
  status(): LiveStatus | null;
  setSpeed(speed: Speed): void;
  scrub(k: number): void;
  /** Lo que muestra el mapa en k: provincias con dueño, polities y asentamientos (count). */
  frame(k: number): { owned: number; polities: number; settlements: number } | null;
  /** Hash del estado completo exacto en k (keyframe + re-simulación en el Worker). */
  hash(k: number): Promise<string>;
  /** Guarda en el store del navegador y devuelve el id. */
  save(): Promise<number>;
  saves(): Promise<SavedWorld[]>;
  remove(id: number): Promise<void>;
}

declare global {
  interface Window {
    __live?: LiveDebug;
  }
}

export function liveDebug(
  session: LiveSession,
  store: WorldStore,
  status: () => LiveStatus | null,
): LiveDebug {
  return {
    status,
    setSpeed: (speed) => {
      session.setSpeed(speed);
    },
    scrub: (k) => {
      session.scrub(k);
    },
    frame: (k) => {
      const f = session.history?.frameAtIndex(k);
      if (!f) return null;
      let owned = 0;
      let settlements = 0;
      for (let p = 1; p < f.owner.length; p++) {
        if ((f.owner[p] ?? 0) !== 0) owned++;
        if ((f.level[p] ?? NO_LEVEL) !== NO_LEVEL) settlements++;
      }
      return { owned, polities: f.capitals.size, settlements };
    },
    hash: async (k) => (await session.fullState(k)).hash,
    save: async () => (await saveLive(session, store)).id,
    saves: () => store.list(),
    remove: (id) => store.remove(id),
  };
}
