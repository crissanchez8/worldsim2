// Historia del spike B (§8.4 del plan): keyframes completos comprimidos + keyframes visuales +
// deltas visuales anuales. Rebobinar es VER: la cabeza de la simulación no retrocede.
//
// Índice k = años completados (0 = estado inicial). Keyframes cada `every` años.
import { deflateSync, inflateSync } from 'fflate';
import {
  applyDelta,
  cloneView,
  encodeDelta,
  loadSim,
  type MapView,
  type Sim,
  type SimConfig,
} from './sim';

export interface HistoryStats {
  readonly years: number;
  readonly fullKeyframes: number;
  readonly fullKeyframeBytes: number;
  readonly visualKeyframeBytes: number;
  readonly deltaBytes: number;
}

export class History {
  private readonly config: SimConfig;
  private readonly every: number;
  private readonly full: Uint8Array[] = [];
  private readonly visual: MapView[] = [];
  private readonly deltas: Uint32Array[] = [];
  private last: MapView;
  private fullBytes = 0;
  private deltaBytes = 0;

  constructor(config: SimConfig, sim: Sim) {
    this.config = config;
    this.every = config.keyframeEvery;
    this.last = sim.view();
    this.visual.push(cloneView(this.last));
    this.pushFull(sim);
  }

  get years(): number {
    return this.deltas.length;
  }

  private pushFull(sim: Sim): void {
    const packed = deflateSync(sim.snapshot(), { level: 6 });
    this.full.push(packed);
    this.fullBytes += packed.byteLength;
  }

  /** Registra el año recién simulado y devuelve su delta visual codificado. */
  record(year: number, sim: Sim): Uint32Array {
    const view = sim.view();
    const delta = encodeDelta(year, this.last, view);
    this.deltas.push(delta);
    this.deltaBytes += delta.byteLength;
    this.last = view;
    if (this.deltas.length % this.every === 0) {
      this.visual.push(cloneView(view));
      this.pushFull(sim);
    }
    return delta;
  }

  /** Vista del mapa tras k años completados (keyframe visual + deltas). */
  viewAt(k: number): MapView {
    const target = Math.max(0, Math.min(k, this.deltas.length));
    const base = Math.floor(target / this.every);
    const view = cloneView(this.visual[base] ?? this.visual[0] ?? this.last);
    for (let i = base * this.every; i < target; i++) {
      const d = this.deltas[i];
      if (d) applyDelta(view, d);
    }
    return view;
  }

  /** Estado completo tras k años: keyframe completo + re-simulación determinista. */
  simAt(k: number): Sim {
    const target = Math.max(0, Math.min(k, this.deltas.length));
    const base = Math.floor(target / this.every);
    const packed = this.full[base];
    if (!packed) throw new Error(`no hay keyframe ${base}`);
    const sim = loadSim(inflateSync(packed), this.config);
    for (let i = base * this.every; i < target; i++) sim.step();
    return sim;
  }

  stats(): HistoryStats {
    return {
      years: this.deltas.length,
      fullKeyframes: this.full.length,
      fullKeyframeBytes: this.fullBytes,
      visualKeyframeBytes:
        this.visual.length * (this.last.owners.byteLength + this.last.cultures.byteLength),
      deltaBytes: this.deltaBytes,
    };
  }
}
