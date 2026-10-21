// Asa de prueba de la vista en vivo (`window.__live`): la usan el E2E de guardar y continuar y
// las mediciones. No es UI: no lleva textos.
import { NO_LEVEL } from '@ws/history';
import type { SavedWorld, WorldStore } from '../storage/world-store';
import type { Speed } from './config';
import type { LiveSession, LiveStatus } from './live-session';
import { saveLive } from './save';
import { eraBands, type EraBand, type Marker } from './timeline';

export interface LiveDebug {
  status(): LiveStatus | null;
  setSpeed(speed: Speed): void;
  scrub(k: number): void;
  /** Lo que muestra el mapa en k: provincias con dueño, polities y asentamientos (count). */
  frame(k: number): { owned: number; polities: number; settlements: number } | null;
  /** Datos crudos del marco k (maquetas de P2.2): dueño y nivel por provincia y capitales. */
  frameData(k: number): {
    owner: number[];
    level: number[];
    capitals: [number, number][];
  } | null;
  /** Nombres del registro (maquetas de P2.2): polities y asentamientos con su provincia. */
  names(): { polities: [number, string][]; settlements: [number, string, number][] };
  /** Bandas de eras y marcadores de la línea de tiempo hasta k (maquetas de P2.2). */
  timeline(k: number): { bands: EraBand[]; markers: readonly Marker[] };
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
    frameData: (k) => {
      const f = session.history?.frameAtIndex(k);
      if (!f) return null;
      return { owner: [...f.owner], level: [...f.level], capitals: [...f.capitals] };
    },
    names: () => ({
      polities: [...session.registry.polities].map(([id, r]) => [id, r.name]),
      settlements: [...session.registry.settlements].map(([id, r]) => [id, r.name, r.province]),
    }),
    timeline: (k) => ({
      bands: eraBands(session.history?.data.aggregates.era ?? [], k),
      markers: session.markers.visible(k),
    }),
    hash: async (k) => (await session.fullState(k)).hash,
    save: async () => (await saveLive(session, store)).id,
    saves: () => store.list(),
    remove: (id) => store.remove(id),
  };
}
