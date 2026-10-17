// Estado de UI (P1.6, zustand, D54): el mundo abierto, sus sesiones (mapa y simulación), el estado
// de la reproducción para React y la selección del inspector con sus migas. No es estado del motor.
import type { WorldgenStage, WorldStatic } from '@ws/worldgen';
import { create } from 'zustand';
import type { LiveSession, LiveStatus } from '../live/live-session';
import type { MapSession } from '../map/map-session';
import type { EntityRef } from '../worker/sim-protocol';

export type Boot =
  | {
      readonly kind: 'generating';
      readonly stage: WorldgenStage;
      readonly index: number;
      readonly total: number;
    }
  | { readonly kind: 'map' }
  | { readonly kind: 'ready' }
  | { readonly kind: 'error'; readonly message: string };

/** Migas del inspector (cuántas entidades atrás se puede volver). */
const MAX_TRAIL = 20;

export interface UiState {
  readonly boot: Boot;
  readonly world: WorldStatic | null;
  readonly session: LiveSession | null;
  readonly map: MapSession | null;
  readonly status: LiveStatus | null;
  readonly liveError: string | null;
  readonly selected: EntityRef | null;
  readonly trail: readonly EntityRef[];
  /** Mundo ya generado en "Crear" para la URL `key` (la vista en vivo no lo regenera). */
  readonly pending: { readonly key: string; readonly world: WorldStatic } | null;
  readonly saving: boolean;
  readonly savedYear: number | null;
  readonly patch: (partial: Partial<Omit<UiState, 'patch' | 'select' | 'back'>>) => void;
  /** Selecciona una entidad (la anterior queda en las migas); null cierra el inspector. */
  readonly select: (ref: EntityRef | null) => void;
  readonly back: () => void;
}

export const useUi = create<UiState>()((set, get) => ({
  boot: { kind: 'map' },
  world: null,
  session: null,
  map: null,
  status: null,
  liveError: null,
  selected: null,
  trail: [],
  pending: null,
  saving: false,
  savedYear: null,
  patch: (partial) => {
    set(partial);
  },
  select: (ref) => {
    const { selected, trail } = get();
    if (ref === null) {
      set({ selected: null, trail: [] });
      return;
    }
    if (selected?.kind === ref.kind && selected.id === ref.id) return;
    set({ selected: ref, trail: selected ? [...trail, selected].slice(-MAX_TRAIL) : trail });
  },
  back: () => {
    const { trail } = get();
    const previous = trail.at(-1) ?? null;
    set({ selected: previous, trail: trail.slice(0, -1) });
  },
}));
