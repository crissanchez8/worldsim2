import { performance } from 'node:perf_hooks';

export interface Stats {
  readonly avg: number;
  readonly p50: number;
  readonly p95: number;
  readonly samples: number;
}

export function stats(values: readonly number[]): Stats {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0;
  const avg = sorted.reduce((a, b) => a + b, 0) / Math.max(1, sorted.length);
  return { avg, p50: at(0.5), p95: at(0.95), samples: sorted.length };
}

/** Tiempo (ms) de `reps` repeticiones de `fn`, después de `warmup` repeticiones. */
export function time(fn: () => unknown, reps: number, warmup = Math.ceil(reps / 5)): number[] {
  for (let i = 0; i < warmup; i++) fn();
  const out: number[] = [];
  for (let i = 0; i < reps; i++) {
    const t0 = performance.now();
    fn();
    out.push(performance.now() - t0);
  }
  return out;
}

let sink = 0;
/** Evita que el JIT elimine trabajo cuyo resultado no se usa. */
export function consume(value: number): void {
  sink = (sink + value) % 1e9;
}
export function sinkValue(): number {
  return sink;
}

/**
 * Calibración: un lazo entero fijo. Las métricas se dividen por este tiempo para comparar
 * máquinas distintas de forma gruesa (el CI no corre en la máquina de la línea base).
 */
export function calibrate(): number {
  const samples = time(() => {
    let x = 1;
    for (let i = 0; i < 5_000_000; i++) x = (Math.imul(x, 1664525) + 1013904223) | 0;
    consume(x);
  }, 15);
  return stats(samples).p50;
}

/** Tiempos de una consulta (ms). */
export interface Latency {
  readonly samples: number;
  readonly avgMs: number;
  readonly maxMs: number;
}

export function latency(run: (k: number) => void, ks: readonly number[]): Latency {
  const ms: number[] = [];
  for (const k of ks) {
    const t0 = performance.now();
    run(k);
    ms.push(performance.now() - t0);
  }
  return {
    samples: ms.length,
    avgMs: ms.reduce((a, b) => a + b, 0) / Math.max(1, ms.length),
    maxMs: Math.max(0, ...ms),
  };
}

/** k repartidos en la corrida, cada uno en el peor caso respecto de `every` (k ≡ every − 1). */
export function worstCaseIndices(years: number, every: number, count: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const k = Math.floor(((i + 0.5) * years) / count / every) * every + every - 1;
    if (k <= years) out.push(k);
  }
  return out;
}
