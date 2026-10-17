// Sesión en vivo (P1.5): une el Worker de simulación, el espejo de la historia, el reloj por era y
// el director. Corre su propio bucle de cuadros: avanza la reproducción, avisa al mapa cuando cambia
// el año mostrado, le marca al Worker hasta dónde simular (D49) y le pasa a React un estado resumido.
import type { events } from '@ws/core';
import { History, PlaybackClock, type VisualFrame } from '@ws/history';
import type { WorldStatic } from '@ws/worldgen';
import {
  createSimClient,
  type SimBatch,
  type SimClient,
  type SimClientEvents,
  type SimFullState,
  type SimInspected,
  type SimReady,
  type SimSaved,
} from '../worker/sim-client';
import { LIVE, type Speed } from './config';
import { Director } from './director';
import { Registry } from './registry';
import { RulerIndex } from './ruler-index';
import { MarkerIndex } from './timeline';
import type { EntityRef } from '../worker/sim-protocol';

export interface LiveStatus {
  /** Estado mostrado (k) y su año calendario. */
  readonly k: number;
  readonly year: number;
  /** Índice de Eras de la era dominante del estado mostrado. */
  readonly era: number;
  /** Años simulados. */
  readonly head: number;
  readonly endK: number;
  readonly speed: Speed;
  readonly waiting: boolean;
  readonly finished: boolean;
  /** Costo medio de un año en la última tanda del Worker (ms). */
  readonly msPerYear: number;
  /** false = historia de otra versión del motor: solo se mira. */
  readonly canContinue: boolean;
  readonly engineVersion: string;
}

export interface LiveCallbacks {
  /** El año mostrado cambió: el mapa se actualiza con este marco. */
  onFrame(frame: VisualFrame, k: number): void;
  onStatus(status: LiveStatus): void;
  onError(message: string): void;
}

/** Bucle de cuadros (los tests pasan uno manual). */
export interface FrameLoop {
  request(run: (timeMs: number) => void): number;
  cancel(handle: number): void;
}

const browserLoop: FrameLoop = {
  request: (run) => requestAnimationFrame(run),
  cancel: (handle) => {
    cancelAnimationFrame(handle);
  },
};

export interface LiveOptions {
  /** `.wsim` guardado que se continúa (o se mira, si es de otra versión). */
  readonly file?: Uint8Array;
  readonly createClient?: (events: SimClientEvents) => SimClient;
  readonly loop?: FrameLoop;
}

export class LiveSession {
  readonly world: WorldStatic;
  readonly markers = new MarkerIndex();
  /** Registros permanentes de las entidades (a la cabeza de la simulación: filtrar por fecha). */
  readonly registry = new Registry();
  /** Gobernante de cada polity a la fecha (eventos de sucesión). */
  readonly rulers = new RulerIndex();
  private readonly eventsById = new Map<number, events.GameEvent>();
  private indexedYears = 0;
  private readonly callbacks: LiveCallbacks;
  private readonly client: SimClient;
  private readonly loop: FrameLoop;
  private historyValue: History | null = null;
  private clock: PlaybackClock | null = null;
  private directorValue: Director | null = null;
  private ready: SimReady | null = null;
  private head = 0;
  private msPerYear = 0;
  private shownK = -1;
  private sentTarget = -1;
  private lastTime: number | null = null;
  private lastStatusAt = -Infinity;
  private frameHandle: number | null = null;
  private readonly drawListeners = new Set<() => void>();
  private disposed = false;

  constructor(world: WorldStatic, callbacks: LiveCallbacks, options: LiveOptions = {}) {
    this.world = world;
    this.callbacks = callbacks;
    this.loop = options.loop ?? browserLoop;
    const events: SimClientEvents = {
      onReady: (ready) => {
        this.onReady(ready);
      },
      onBatch: (batch) => {
        this.onBatch(batch);
      },
      onError: (message) => {
        if (!this.disposed) callbacks.onError(message);
      },
    };
    this.client = (options.createClient ?? createSimClient)(events);
    this.client.init(world, options.file);
  }

  get history(): History | null {
    return this.historyValue;
  }

  get director(): Director | null {
    return this.directorValue;
  }

  get endK(): number {
    return this.ready?.endK ?? 0;
  }

  get simulated(): number {
    return this.head;
  }

  /** El estado más avanzado que ya se mostró (lo de más adelante no se revela, D49). */
  get seen(): number {
    return Math.floor(this.directorValue?.seen ?? 0);
  }

  /** Año calendario del estado k (el k = 0 se muestra como el año de inicio). */
  yearAt(k: number): number {
    const history = this.historyValue;
    if (!history) return 0;
    return k <= 0 ? history.startYear : history.yearOf(k);
  }

  /** Evento por id (para enlazar causas). */
  eventById(id: number): events.GameEvent | undefined {
    return this.eventsById.get(id);
  }

  setSpeed(speed: Speed): void {
    if (!this.directorValue) return;
    this.directorValue.speed = speed;
    this.publish();
  }

  /** Lleva la reproducción al estado k (acotado a lo simulado). */
  scrub(k: number): void {
    if (!this.directorValue) return;
    this.directorValue.scrub(Math.min(k, this.head));
    this.update(true);
  }

  save(): Promise<SimSaved> {
    return this.client.save();
  }

  /** Detalle exacto de una entidad en k (el "por qué" del inspector). */
  inspect(k: number, entity: EntityRef): Promise<SimInspected> {
    return this.client.inspect(k, entity);
  }

  /** Estado completo exacto en k (para el "por qué" y para verificar determinismo). */
  fullState(k: number): Promise<SimFullState> {
    return this.client.fullState(k);
  }

  /** Avisa en cada cuadro (la línea de tiempo se redibuja). Devuelve cómo desuscribirse. */
  onDraw(listener: () => void): () => void {
    this.drawListeners.add(listener);
    return () => {
      this.drawListeners.delete(listener);
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.frameHandle !== null) this.loop.cancel(this.frameHandle);
    this.client.dispose();
    this.drawListeners.clear();
  }

  private onReady(ready: SimReady): void {
    if (this.disposed) return;
    this.ready = ready;
    this.registry.apply(ready.registry);
    const history = History.fromData(this.world, ready.data);
    this.historyValue = history;
    const clock = new PlaybackClock(ready.endK);
    for (const era of history.data.aggregates.era) clock.push(era);
    this.clock = clock;
    this.head = history.years;
    this.indexEvents(history.data.events);
    // Una historia cargada sigue desde donde se guardó; una nueva, desde el principio.
    this.directorValue = new Director(clock, this.head);
    this.update(true);
    this.schedule();
  }

  private onBatch(message: SimBatch): void {
    const history = this.historyValue;
    const clock = this.clock;
    if (this.disposed || !history || !clock) return;
    const before = history.data.aggregates.era.length;
    history.append(message.batch);
    const eras = history.data.aggregates.era;
    for (let i = before; i < eras.length; i++) clock.push(eras[i] ?? 0);
    this.head = message.head;
    this.msPerYear = message.msPerYear;
    if (message.registry) this.registry.apply(message.registry);
    this.indexEvents(history.data.events);
  }

  private indexEvents(log: readonly (readonly events.GameEvent[])[]): void {
    this.markers.update(log);
    this.rulers.update(log);
    for (let i = this.indexedYears; i < log.length; i++) {
      for (const e of log[i] ?? []) this.eventsById.set(e.id, e);
    }
    this.indexedYears = log.length;
  }

  private schedule(): void {
    if (this.disposed) return;
    this.frameHandle = this.loop.request((time) => {
      this.frameHandle = null;
      const dt = this.lastTime === null ? 0 : (time - this.lastTime) / 1000;
      this.lastTime = time;
      this.directorValue?.tick(dt, this.head);
      this.update(false, time);
      this.schedule();
    });
  }

  private update(force: boolean, time = this.lastTime ?? 0): void {
    const director = this.directorValue;
    const history = this.historyValue;
    if (!director || !history) return;
    const k = Math.floor(director.playhead);
    if (k !== this.shownK) {
      this.shownK = k;
      this.callbacks.onFrame(history.frameAtIndex(k), k);
    }
    const target = director.target();
    const endK = this.endK;
    if (
      target !== this.sentTarget &&
      (Math.abs(target - this.sentTarget) >= LIVE.targetStepYears || target === endK)
    ) {
      this.sentTarget = target;
      this.client.setTarget(target);
    }
    for (const listener of this.drawListeners) listener();
    if (force || time - this.lastStatusAt >= LIVE.uiUpdateMs) {
      this.lastStatusAt = time;
      this.publish();
    }
  }

  private publish(): void {
    const director = this.directorValue;
    const history = this.historyValue;
    const ready = this.ready;
    if (!director || !history || !ready) return;
    const k = Math.floor(director.playhead);
    this.callbacks.onStatus({
      k,
      year: k === 0 ? history.startYear : history.yearOf(k),
      era: history.data.aggregates.era[k] ?? 0,
      head: this.head,
      endK: ready.endK,
      speed: director.speed,
      waiting: director.waiting,
      finished: k >= ready.endK,
      msPerYear: this.msPerYear,
      canContinue: ready.canContinue,
      engineVersion: ready.engineVersion,
    });
  }
}
