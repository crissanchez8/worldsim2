// Estadísticas de cuadros del recorrido de medición (puras, sin DOM).

/** Percentil p ∈ [0, 100] con interpolación lineal entre rangos. `values` no necesita orden. */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  const a = sorted[lo] ?? NaN;
  const b = sorted[hi] ?? NaN;
  return a + (b - a) * (rank - lo);
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return NaN;
  let s = 0;
  for (const v of values) s += v;
  return s / values.length;
}

/** Un cuadro "se cae" a 60 Hz si tarda más de 1,5 períodos de 16,7 ms. */
const JANK_MS = 25;

export interface FrameSummary {
  readonly frames: number;
  /** Duración medida, en s (del primer al último cuadro). */
  readonly seconds: number;
  /** fps promedio = cuadros / segundos. */
  readonly fpsAvg: number;
  /** fps del percentil 5 (= 1000 / p95 del tiempo de cuadro): el "piso" habitual. */
  readonly fpsP5: number;
  /** fps del percentil 1 (= 1000 / p99 del tiempo de cuadro). */
  readonly fpsP1: number;
  readonly frameMsAvg: number;
  readonly frameMsP95: number;
  readonly frameMsMax: number;
  /** Cuadros de más de JANK_MS (tirones visibles). */
  readonly janks: number;
  /** Tiempo de CPU del cuadro (actualizar + enviar a la GPU), en ms. */
  readonly cpuMsAvg: number;
  readonly cpuMsP95: number;
  /** Tiempo de GPU del pase de render (timestamp queries), en ms; NaN si no hay soporte. */
  readonly gpuMsAvg: number;
  readonly gpuMsP95: number;
  readonly gpuSamples: number;
  /**
   * Cuadros en vuelo en la GPU (enviados y sin terminar), promedio y máximo. Si crece, la GPU no
   * da abasto aunque los fps digan otra cosa. NaN si el backend no permite medirlo.
   */
  readonly gpuQueueAvg: number;
  readonly gpuQueueMax: number;
}

export class FrameRecorder {
  private readonly frameMs: number[] = [];
  private readonly cpuMs: number[] = [];
  private readonly gpuMs: number[] = [];
  private readonly gpuQueue: number[] = [];

  push(frameMs: number, cpuMs: number, gpuQueue: number | null): void {
    this.frameMs.push(frameMs);
    this.cpuMs.push(cpuMs);
    if (gpuQueue !== null) this.gpuQueue.push(gpuQueue);
  }

  pushGpu(ms: number): void {
    if (Number.isFinite(ms) && ms > 0) this.gpuMs.push(ms);
  }

  get frames(): number {
    return this.frameMs.length;
  }

  summary(): FrameSummary {
    let total = 0;
    let janks = 0;
    let max = 0;
    for (const ms of this.frameMs) {
      total += ms;
      if (ms > JANK_MS) janks++;
      if (ms > max) max = ms;
    }
    const seconds = total / 1000;
    return {
      frames: this.frameMs.length,
      seconds,
      fpsAvg: this.frameMs.length / seconds,
      fpsP5: 1000 / percentile(this.frameMs, 95),
      fpsP1: 1000 / percentile(this.frameMs, 99),
      frameMsAvg: mean(this.frameMs),
      frameMsP95: percentile(this.frameMs, 95),
      frameMsMax: max,
      janks,
      cpuMsAvg: mean(this.cpuMs),
      cpuMsP95: percentile(this.cpuMs, 95),
      gpuMsAvg: mean(this.gpuMs),
      gpuMsP95: percentile(this.gpuMs, 95),
      gpuSamples: this.gpuMs.length,
      gpuQueueAvg: mean(this.gpuQueue),
      gpuQueueMax: this.gpuQueue.length === 0 ? NaN : Math.max(...this.gpuQueue),
    };
  }
}
