// Reporte de bench: métricas (menor es mejor), metadatos de la máquina y comparación contra una
// línea base con tolerancia, normalizando por la calibración de cada máquina.
import { arch, cpus, platform } from 'node:os';
import { ENGINE_VERSION } from '@ws/core';

export interface Metric {
  readonly key: string;
  readonly value: number;
  readonly unit: string;
}

export interface BenchReport {
  readonly engine: string;
  readonly machine: { readonly cpu: string; readonly platform: string; readonly node: string };
  /** ms del lazo de calibración (más rápido = máquina más rápida). */
  readonly calibrationMs: number;
  /** Generación del mundo mediano (s); null en reportes de P0. */
  readonly worldgenSeconds: number | null;
  readonly peakHeapMB: number;
  readonly metrics: readonly Metric[];
}

export function machine(): BenchReport['machine'] {
  return {
    cpu: cpus()[0]?.model ?? 'desconocida',
    platform: `${platform()}-${arch()}`,
    node: process.version,
  };
}

export function makeReport(
  calibrationMs: number,
  metrics: readonly Metric[],
  peakHeapMB: number,
  worldgenSeconds: number | null = null,
): BenchReport {
  return {
    engine: ENGINE_VERSION,
    machine: machine(),
    calibrationMs,
    worldgenSeconds,
    peakHeapMB,
    metrics,
  };
}

export interface Regression {
  readonly key: string;
  readonly baseline: number;
  readonly current: number;
  /** Cociente normalizado actual/base (1 = igual, 2 = el doble de lento). */
  readonly ratio: number;
}

/** Métricas que empeoraron más que `tolerance` (0,5 = 50%), normalizadas por calibración. */
export function compare(
  current: BenchReport,
  baseline: BenchReport,
  tolerance: number,
): Regression[] {
  const base = new Map(baseline.metrics.map((m) => [m.key, m.value]));
  const out: Regression[] = [];
  for (const m of current.metrics) {
    const b = base.get(m.key);
    if (b === undefined || b <= 0) continue;
    const ratio = m.value / current.calibrationMs / (b / baseline.calibrationMs);
    if (ratio > 1 + tolerance) out.push({ key: m.key, baseline: b, current: m.value, ratio });
  }
  return out;
}

export function formatTable(report: BenchReport, baseline?: BenchReport): string {
  const base = new Map((baseline?.metrics ?? []).map((m) => [m.key, m.value]));
  const rows = report.metrics.map((m) => {
    const b = base.get(m.key);
    const ratio =
      b !== undefined && baseline
        ? m.value / report.calibrationMs / (b / baseline.calibrationMs)
        : null;
    return [m.key, m.value.toFixed(3), m.unit, ratio === null ? '' : `${ratio.toFixed(2)}×`];
  });
  const header = ['métrica', 'valor', 'unidad', baseline ? 'vs base (norm.)' : ''];
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)));
  const line = (r: readonly string[]) =>
    r
      .map((c, i) => c.padEnd(widths[i] ?? 0))
      .join('  ')
      .trimEnd();
  return [
    `${report.machine.cpu} · ${report.machine.platform} · node ${report.machine.node} · motor ${report.engine}`,
    `calibración ${report.calibrationMs.toFixed(2)} ms · heap pico ${report.peakHeapMB} MB · worldgen mediano: ${report.worldgenSeconds === null ? '—' : `${report.worldgenSeconds.toFixed(2)} s`}`,
    line(header),
    ...rows.map(line),
  ].join('\n');
}
