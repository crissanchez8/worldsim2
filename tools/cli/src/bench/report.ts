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

/** Unidades de tiempo: dependen de la máquina y se normalizan por la calibración. */
const TIME_UNITS = new Set(['ns', 'us', 'ms', 's']);

function normalized(m: Metric, calibrationMs: number): number {
  return TIME_UNITS.has(m.unit) ? m.value / calibrationMs : m.value;
}

/**
 * Presupuestos absolutos (BRIEF P1, D45; §2 del plan): la corrida falla si se pasan. Los tiempos
 * valen para la máquina de referencia (M1 Pro); el runner del CI es más lento pero entra con margen.
 */
export const BUDGETS: Readonly<Record<string, number>> = {
  /** s: mundo mediano generado (criterio de salida de P1: ≤ 20 s). */
  'worldgen.medium': 20,
  /** ms por año simulado en el mundo mediano: promedio ≤ 10 y p95 ≤ 25. */
  'world.medium.msPerYear': 10,
  'world.medium.msPerYearP95': 25,
  /** ms: rebobinar el mapa (D45: un cuadro). */
  'world.medium.mapAtMaxMs': 16,
  /** ms: estado completo exacto a una fecha en vivo (D45). */
  'world.medium.fullStateMaxMs': 500,
  /** MB: `.wsim` de la corrida completa (§2: ≤ 20 MB). */
  'world.medium.wsimMB': 20,
};

/**
 * Calibración de la máquina de referencia de los presupuestos (ms; M1 Pro, P1.9). En una máquina
 * más lenta (el runner del CI) los presupuestos de tiempo se estiran en proporción, como las
 * regresiones; los de tamaño no cambian.
 */
export const BUDGET_REFERENCE_CALIBRATION_MS = 4.8;

export interface BudgetFailure {
  readonly key: string;
  readonly value: number;
  readonly budget: number;
}

/** Presupuesto de una métrica en la máquina del reporte (los de tiempo, escalados). */
export function budgetFor(report: BenchReport, m: Metric): number | undefined {
  const budget = BUDGETS[m.key];
  if (budget === undefined || !TIME_UNITS.has(m.unit)) return budget;
  return budget * Math.max(1, report.calibrationMs / BUDGET_REFERENCE_CALIBRATION_MS);
}

export function overBudget(report: BenchReport): BudgetFailure[] {
  const out: BudgetFailure[] = [];
  for (const m of report.metrics) {
    const budget = budgetFor(report, m);
    if (budget !== undefined && m.value > budget) out.push({ key: m.key, value: m.value, budget });
  }
  return out;
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
    const prev = baseline.metrics.find((x) => x.key === m.key);
    if (!prev) continue;
    const ratio = normalized(m, current.calibrationMs) / normalized(prev, baseline.calibrationMs);
    if (ratio > 1 + tolerance) out.push({ key: m.key, baseline: b, current: m.value, ratio });
  }
  return out;
}

export function formatTable(report: BenchReport, baseline?: BenchReport): string {
  const base = new Map((baseline?.metrics ?? []).map((m) => [m.key, m]));
  const rows = report.metrics.map((m) => {
    const b = base.get(m.key);
    const ratio =
      b !== undefined && baseline && b.value > 0
        ? normalized(m, report.calibrationMs) / normalized(b, baseline.calibrationMs)
        : null;
    const budget = budgetFor(report, m);
    return [
      m.key,
      m.value.toFixed(3),
      m.unit,
      budget === undefined ? '' : `${m.value <= budget ? '✓' : '✗'} ≤ ${Number(budget.toFixed(1))}`,
      ratio === null ? '' : `${ratio.toFixed(2)}×`,
    ];
  });
  const header = ['métrica', 'valor', 'unidad', 'presupuesto', baseline ? 'vs base (norm.)' : ''];
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
