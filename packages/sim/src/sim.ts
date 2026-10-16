// Fachada de la simulación: crea o carga el estado, corre el tick anual y expone snapshot y
// hash. Headless y determinista: corre igual en el Worker, en Node y en los tests.
import { ENGINE_VERSION, events, scheduler, serialize, store, time } from '@ws/core';
import { CONTENT_HASH } from '@ws/content';
import type { WorldStatic } from '@ws/worldgen';
import { createBuffers } from './buffers';
import { SIM_DEFAULTS } from './config';
import type { LedgerTally, SimContext, SimSystem } from './context';
import { computeDerived } from './derive';
import { createEventTypes } from './events';
import { initialize, type SimParams, splitHash } from './init';
import { checkInvariants, totalPopulation } from './invariants';
import { emptyTally } from './ledger';
import { createState, partsOf, type SimState } from './state';
import { DEFAULT_SYSTEMS } from './systems';

/**
 * Versión de los snapshots: motor + contenido. Un estado solo continúa con el mismo motor y el
 * mismo contenido (docs/model.md §15); `deserializeState` rechaza cualquier otra.
 */
export const STATE_VERSION = `${ENGINE_VERSION}+${CONTENT_HASH}`;

export interface SimOptions {
  /** Guard de contratos, validación de eventos e invariantes por tick (dev y tests; lento). */
  readonly checks?: boolean;
  /** Solo los invariantes por tick, sin el guard (barato: `ws health`). Por defecto = checks. */
  readonly invariants?: boolean;
  /** Sistemas del pipeline (por defecto los de esta versión; los tests suman productores). */
  readonly systems?: readonly SimSystem[];
}

export interface TickResult {
  /** Año simulado. */
  readonly year: number;
  readonly events: readonly events.GameEvent[];
  readonly tally: LedgerTally;
}

export class Sim {
  readonly ctx: SimContext;
  private readonly pipeline: scheduler.Pipeline<SimContext>;
  private readonly parts: ReturnType<typeof partsOf>;
  private readonly checks: boolean;
  private readonly invariants: boolean;

  private constructor(world: WorldStatic, state: SimState, options: SimOptions) {
    const buffers = createBuffers();
    this.ctx = {
      world,
      state,
      buffers,
      types: createEventTypes(),
      derived: computeDerived(state, world), // M3: lo derivado se recalcula, no se guarda
      ledger: emptyTally(),
    };
    this.pipeline = scheduler.createPipeline(options.systems ?? DEFAULT_SYSTEMS, [
      buffers.productionOutput,
      buffers.popDeltas,
      buffers.territoryRequests,
    ]);
    this.parts = partsOf(state);
    this.checks = options.checks ?? false;
    this.invariants = options.invariants ?? this.checks;
  }

  /** Corrida nueva sobre un mundo estático. */
  static create(world: WorldStatic, params: Partial<SimParams> = {}, options: SimOptions = {}) {
    const state = createState(world.provinces.count);
    initialize(state, world, {
      startYear: params.startYear ?? SIM_DEFAULTS.startYear,
      endYear: params.endYear ?? SIM_DEFAULTS.endYear,
    });
    return new Sim(world, state, options);
  }

  /** Continúa desde un snapshot sobre el mismo mundo estático (lo verifica por hash). */
  static load(world: WorldStatic, snapshot: Uint8Array, options: SimOptions = {}): Sim {
    const state = createState(world.provinces.count);
    serialize.deserializeState(snapshot, partsOf(state), STATE_VERSION);
    const [a, b] = splitHash(world.hash);
    if (state.world.get('staticHashA') !== a || state.world.get('staticHashB') !== b) {
      throw new Error('el snapshot es de otro mundo estático (hash distinto)');
    }
    return new Sim(world, state, options);
  }

  /** Próximo año a simular. */
  get year(): number {
    return this.ctx.state.world.get('year');
  }

  get endYear(): number {
    return this.ctx.state.world.get('endYear');
  }

  /** ¿Ya se simuló el último año? (no hay año 0: la comparación numérica alcanza) */
  get finished(): boolean {
    return this.year > this.endYear;
  }

  /** Simula un año. */
  step(): TickResult {
    const { state } = this.ctx;
    const year = state.world.get('year');
    const ids = new store.IdAllocator<'event'>(state.world.get('nextEventId'));
    const bus = new events.EventBus({ year, ids, checks: this.checks });
    const before = this.invariants ? totalPopulation(state) : 0;
    this.pipeline.runTick(this.ctx, {
      year,
      events: bus,
      ...(this.checks ? { guard: { parts: this.parts } } : {}),
    });
    state.world.set('nextEventId', ids.peek());
    state.world.set('year', time.nextYear(year));
    if (this.invariants) checkInvariants(this.ctx, before);
    return { year, events: bus.drain(), tally: this.ctx.ledger };
  }

  /** Hash del estado (sin cabecera): si está en el estado, está en el hash. */
  hash(): string {
    return serialize.hashState(this.parts);
  }

  snapshot(): Uint8Array {
    return serialize.serializeState(this.parts, STATE_VERSION);
  }
}

/** Hash de un año = estado al final del año + eventos del año (determinismo, ADR-004). */
export function yearHash(sim: Sim, result: TickResult): string {
  return `${sim.hash()}:${events.hashEvents(result.events)}`;
}
