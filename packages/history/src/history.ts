// Historia de una corrida (P1.4; ADR-008 opción B, D44 y D50). Rebobinar es VER: la cabeza de la
// simulación no retrocede. El grabador corre fuera del pipeline (después de cada paso; no es un
// sistema ni estado), así re-simular para el estado completo no vuelve a grabar.
//
// Índice k = años completados: k = 0 es el estado inicial; el año calendario Y queda en
// k = tickIndex(Y, startYear) + 1 (el estado al final de Y).
import { Eras } from '@ws/content';
import { type events, time } from '@ws/core';
import { Sim, type SimOptions, summarize, type TickResult } from '@ws/sim';
import type { WorldStatic } from '@ws/worldgen';
import { deflateSync, inflateSync } from 'fflate';
import {
  applyDelta,
  captureFrame,
  captureSeries,
  cloneFrame,
  dequantizePopulation,
  emptyFrame,
  encodeDelta,
  NO_LEVEL,
  type SeriesSample,
  type VisualFrame,
} from './frame';

export const HISTORY = {
  /** Keyframe completo y visual en memoria cada tantos años (years; D44: 100). */
  keyframeEvery: 100,
  /** Serie de población y fracción urbana por provincia cada tantos años (years; D50: 10). */
  seriesEvery: 10,
  /** Nivel de compresión de los keyframes (deflate 0–9). */
  deflateLevel: 6,
} as const;

/** Agregados mundiales por año (k = 0..years): gráficos del resumen y ritmo por era (D48). */
export interface Aggregates {
  readonly population: number[];
  readonly polities: number[];
  readonly largestPolity: number[];
  /** Índice de Eras de la era dominante. */
  readonly era: number[];
  readonly urbanization: number[];
}

/** Todo lo grabado: lo que el `.wsim` lleva (con keyframes completos más espaciados). */
export interface HistoryData {
  readonly startYear: number;
  readonly keyframeEvery: number;
  readonly seriesEvery: number;
  /** Marcos visuales en k = 0, keyframeEvery, 2·keyframeEvery… */
  readonly visual: VisualFrame[];
  /** Delta visual del año k (índice k − 1). */
  readonly deltas: Uint32Array[];
  /** Series en k = 0, seriesEvery, 2·seriesEvery… */
  readonly series: SeriesSample[];
  readonly aggregates: Aggregates;
  /** Eventos del año k (índice k − 1). */
  readonly events: events.GameEvent[][];
  /** Snapshots completos comprimidos por k (en memoria cada keyframeEvery; en el archivo, menos). */
  readonly keyframes: Map<number, Uint8Array>;
}

export interface ProvinceAt {
  readonly owner: number;
  readonly level: number;
  readonly culture: number;
  readonly innovations: number;
  /** persons (interpolado entre muestras de la serie). */
  readonly population: number;
  /** fraction. */
  readonly urbanShare: number;
}

export interface PolityAt {
  readonly provinces: readonly number[];
  /** persons. */
  readonly population: number;
  readonly capital: number;
}

export class History {
  readonly world: WorldStatic;
  readonly data: HistoryData;
  private last: VisualFrame;

  private constructor(world: WorldStatic, data: HistoryData, last: VisualFrame) {
    this.world = world;
    this.data = data;
    this.last = last;
  }

  /** Empieza a grabar desde el estado actual de la simulación (k = 0). */
  static start(sim: Sim): History {
    const ctx = sim.ctx;
    const first = captureFrame(ctx);
    const data: HistoryData = {
      startYear: sim.year,
      keyframeEvery: HISTORY.keyframeEvery,
      seriesEvery: HISTORY.seriesEvery,
      visual: [cloneFrame(first)],
      deltas: [],
      series: [captureSeries(ctx)],
      aggregates: { population: [], polities: [], largestPolity: [], era: [], urbanization: [] },
      events: [],
      keyframes: new Map([[0, deflateSync(sim.snapshot(), { level: HISTORY.deflateLevel })]]),
    };
    const h = new History(ctx.world, data, first);
    h.pushAggregates(sim);
    return h;
  }

  /** Historia ya grabada (por ejemplo, la de un `.wsim`), sobre su mundo regenerado. */
  static fromData(world: WorldStatic, data: HistoryData): History {
    const k = data.deltas.length;
    const base = Math.floor(k / data.keyframeEvery);
    const frame = cloneFrame(
      data.visual[base] ?? data.visual[0] ?? emptyFrame(world.provinces.count),
    );
    for (let i = base * data.keyframeEvery; i < k; i++) {
      const d = data.deltas[i];
      if (d) applyDelta(frame, d);
    }
    return new History(world, data, frame);
  }

  /** Años grabados (k máximo). */
  get years(): number {
    return this.data.deltas.length;
  }

  get startYear(): number {
    return this.data.startYear;
  }

  /** Año calendario del estado k (k ≥ 1); el k = 0 es el inicio de `startYear`. */
  yearOf(k: number): number {
    return time.addYears(this.data.startYear, k - 1);
  }

  /** k del estado al final del año `year` (acotado a lo grabado; 0 antes del primer año). */
  indexOf(year: number): number {
    const k = time.tickIndex(year, this.data.startYear) + 1;
    return Math.max(0, Math.min(this.years, k));
  }

  /** Graba el año recién simulado. Devuelve su delta visual (para mandarlo al hilo principal). */
  record(sim: Sim, result: TickResult): Uint32Array {
    const ctx = sim.ctx;
    const frame = captureFrame(ctx);
    const delta = encodeDelta(this.last, frame);
    this.last = frame;
    const d = this.data;
    d.deltas.push(delta);
    d.events.push([...result.events]);
    const k = d.deltas.length;
    if (k % d.keyframeEvery === 0) {
      d.visual.push(cloneFrame(frame));
      d.keyframes.set(k, deflateSync(sim.snapshot(), { level: HISTORY.deflateLevel }));
    }
    if (k % d.seriesEvery === 0) d.series.push(captureSeries(ctx));
    this.pushAggregates(sim);
    return delta;
  }

  private pushAggregates(sim: Sim): void {
    const s = summarize(sim.ctx, sim.year);
    const a = this.data.aggregates;
    a.population.push(s.population);
    a.polities.push(s.activePolities);
    a.largestPolity.push(s.largestPolity);
    a.era.push(Eras.indexOf(s.dominantEra));
    a.urbanization.push(s.urbanization);
  }

  /** Marco del mapa al final de `year`: keyframe visual + deltas (D45: ≤ 16 ms). */
  mapAt(year: number): VisualFrame {
    return this.frameAtIndex(this.indexOf(year));
  }

  frameAtIndex(k: number): VisualFrame {
    const d = this.data;
    const target = Math.max(0, Math.min(k, this.years));
    const base = Math.min(Math.floor(target / d.keyframeEvery), d.visual.length - 1);
    const frame = cloneFrame(
      d.visual[base] ?? d.visual[0] ?? emptyFrame(this.world.provinces.count),
    );
    for (let i = base * d.keyframeEvery; i < target; i++) {
      const delta = d.deltas[i];
      if (delta) applyDelta(frame, delta);
    }
    return frame;
  }

  /** Población (persons) y fracción urbana por provincia al final de `year`, interpoladas. */
  seriesAt(year: number): { readonly population: Float64Array; readonly urban: Float32Array } {
    const d = this.data;
    const k = this.indexOf(year);
    const n = this.world.provinces.count;
    const i0 = Math.min(Math.floor(k / d.seriesEvery), d.series.length - 1);
    const i1 = Math.min(i0 + 1, d.series.length - 1);
    const t = i1 === i0 ? 0 : (k - i0 * d.seriesEvery) / d.seriesEvery;
    const a = d.series[i0];
    const b = d.series[i1];
    const population = new Float64Array(n + 1);
    const urban = new Float32Array(n + 1);
    for (let p = 1; p <= n; p++) {
      const pa = dequantizePopulation(a?.population[p] ?? 0);
      const pb = dequantizePopulation(b?.population[p] ?? 0);
      population[p] = pa + (pb - pa) * t;
      const ua = (a?.urban[p] ?? 0) / 255;
      const ub = (b?.urban[p] ?? 0) / 255;
      urban[p] = ua + (ub - ua) * t;
    }
    return { population, urban };
  }

  /** Resumen de una provincia a la fecha (D50). */
  provinceAt(province: number, year: number): ProvinceAt {
    const f = this.mapAt(year);
    const s = this.seriesAt(year);
    return {
      owner: f.owner[province] ?? 0,
      level: f.level[province] ?? NO_LEVEL,
      culture: f.culture[province] ?? 0,
      innovations: f.innovations[province] ?? 0,
      population: s.population[province] ?? 0,
      urbanShare: s.urban[province] ?? 0,
    };
  }

  /** Resumen de una polity a la fecha: se agrega en el cliente desde las provincias (D50). */
  polityAt(polity: number, year: number): PolityAt {
    const f = this.mapAt(year);
    const s = this.seriesAt(year);
    const provinces: number[] = [];
    let population = 0;
    for (let p = 1; p < f.owner.length; p++) {
      if (f.owner[p] !== polity) continue;
      provinces.push(p);
      population += s.population[p] ?? 0;
    }
    return { provinces, population, capital: f.capitals.get(polity) ?? 0 };
  }

  /** Eventos de los años [from, to] (calendario, ambos incluidos). */
  eventsBetween(from: number, to: number): events.GameEvent[] {
    const out: events.GameEvent[] = [];
    const k0 = this.indexOf(from);
    const k1 = this.indexOf(to);
    for (let k = Math.max(1, k0); k <= k1; k++) out.push(...(this.data.events[k - 1] ?? []));
    return out;
  }

  /**
   * Estado completo exacto al final de `year`: el keyframe anterior más cercano + re-simulación
   * determinista (D45: ≤ 500 ms en vivo con keyframes cada 100 años).
   */
  fullStateAt(year: number, options: SimOptions = {}): Sim {
    const k = this.indexOf(year);
    let base = -1;
    for (const key of this.data.keyframes.keys()) if (key <= k && key > base) base = key;
    const packed = this.data.keyframes.get(base);
    if (!packed) throw new Error(`historia: no hay keyframe antes del año ${year}`);
    const sim = Sim.load(this.world, inflateSync(packed), options);
    for (let i = base; i < k; i++) sim.step();
    return sim;
  }

  /** Tamaños en memoria (bytes). */
  stats(): {
    readonly years: number;
    readonly keyframes: number;
    readonly keyframeBytes: number;
    readonly visualBytes: number;
    readonly deltaBytes: number;
    readonly seriesBytes: number;
    readonly events: number;
  } {
    const d = this.data;
    let keyframeBytes = 0;
    for (const k of d.keyframes.values()) keyframeBytes += k.byteLength;
    const n = this.world.provinces.count + 1;
    return {
      years: this.years,
      keyframes: d.keyframes.size,
      keyframeBytes,
      visualBytes: d.visual.length * n * 13,
      deltaBytes: d.deltas.reduce((s, x) => s + x.byteLength, 0),
      seriesBytes: d.series.length * n * 3,
      events: d.events.reduce((s, x) => s + x.length, 0),
    };
  }
}
