// Guardar la corrida en vivo como mundo guardado (bytes del `.wsim` + metadatos para la lista).
import { ENGINE_VERSION } from '@ws/core';
import type { WorldStore } from '../storage/world-store';
import type { LiveSession } from './live-session';

export interface SaveResult {
  readonly id: number;
  /** Último año guardado (calendario). */
  readonly year: number;
}

export async function saveLive(session: LiveSession, store: WorldStore): Promise<SaveResult> {
  const saved = await session.save();
  const world = session.world;
  const id = await store.save(
    {
      params: world.params,
      worldHash: world.hash,
      engineVersion: ENGINE_VERSION,
      years: saved.head,
      lastYear: saved.year,
      savedAt: Date.now(),
      size: saved.bytes.length,
    },
    saved.bytes,
  );
  return { id, year: saved.year };
}
