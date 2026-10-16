// Simulación ficticia del spike B: headless y determinista (corre igual en Worker, navegador y
// Node; la usa también el spike C). Expone el paso anual y los hashes por año.
import { ENGINE_VERSION, events, scheduler, serialize, store, time } from '@ws/core';
import { DEFAULT_CONFIG, type SimConfig } from './config';
import { computeDerived, SYSTEMS, type SimWorld } from './systems';
import type { MapView } from './visual';
import {
  buildNeighbors,
  createBuffers,
  createEventTypes,
  createState,
  emptyDerived,
  partsOf,
  populate,
  type State,
} from './world';

export { DEFAULT_CONFIG, DYNAMICS, type SimConfig } from './config';
export { applyDelta, cloneView, deltaYear, encodeDelta, type MapView } from './visual';

export interface YearResult {
  readonly year: number;
  readonly events: readonly events.GameEvent[];
}

export interface Sim {
  readonly world: SimWorld;
  /** Próximo año a simular. */
  readonly year: number;
  /** Simula un año. `guard` activa el guard de contratos (lento; para tests). */
  step(options?: { guard?: boolean }): YearResult;
  stateHash(): string;
  /** Vista del mapa del estado actual. */
  view(): MapView;
  snapshot(): Uint8Array;
}

function makeSim(config: SimConfig, state: State): Sim {
  const buffers = createBuffers();
  const world: SimWorld = {
    config,
    state,
    neighbors: buildNeighbors(config),
    buffers,
    types: createEventTypes(),
    derived: emptyDerived(),
  };
  world.derived = computeDerived(state); // M3: el derivado se recalcula, no se guarda
  const pipeline = scheduler.createPipeline(SYSTEMS, [
    buffers.popDeltas,
    buffers.territoryRequests,
  ]);
  const parts = partsOf(state);

  return {
    world,
    get year() {
      return state.world.get('year');
    },
    step(options = {}) {
      const year = state.world.get('year');
      const ids = new store.IdAllocator<'event'>(state.world.get('nextEventId'));
      const bus = new events.EventBus({ year, ids, checks: options.guard === true });
      pipeline.runTick(world, {
        year,
        events: bus,
        ...(options.guard ? { guard: { parts } } : {}),
      });
      state.world.set('nextEventId', ids.peek());
      state.world.set('year', time.nextYear(year));
      return { year, events: bus.drain() };
    },
    stateHash() {
      return serialize.hashState(parts);
    },
    view() {
      const n = state.province.size;
      const owners = new Uint32Array(n);
      owners.set(state.province.column('owner').subarray(0, n));
      return { owners, cultures: world.derived.majorityCulture.slice(1, n + 1) };
    },
    snapshot() {
      return serialize.serializeState(parts, ENGINE_VERSION);
    },
  };
}

/** Mundo nuevo desde la seed. */
export function createSim(config: SimConfig = DEFAULT_CONFIG): Sim {
  const state = createState(config);
  populate(state, config);
  return makeSim(config, state);
}

/** Mundo cargado desde un snapshot (para rebobinar el estado completo y re-simular). */
export function loadSim(bytes: Uint8Array, config: SimConfig = DEFAULT_CONFIG): Sim {
  const state = createState(config);
  serialize.deserializeState(bytes, partsOf(state), ENGINE_VERSION);
  return makeSim(config, state);
}

/** Hash del año = estado al final del año + eventos del año (lo comparan los spikes B y C). */
export function yearHash(sim: Sim, result: YearResult): string {
  return `${sim.stateHash()}:${events.hashEvents(result.events)}`;
}
