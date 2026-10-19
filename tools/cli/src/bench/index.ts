import { readFileSync, writeFileSync } from 'node:fs';
import { calibrate } from './measure';
import {
  type BenchReport,
  compare,
  formatTable,
  makeReport,
  type Metric,
  overBudget,
} from './report';
import { coreScenario } from './scenarios/core';
import { syntheticScenario } from './scenarios/synthetic';
import { worldScenario } from './scenarios/world';
import { worldgenScenario } from './scenarios/worldgen';

export interface BenchOptions {
  readonly json: boolean;
  readonly years: number;
  readonly out?: string;
  readonly compareTo?: string;
  readonly tolerance: number;
  /** Sin la corrida completa del mundo mediano (~30 s): para iterar rápido en local. */
  readonly quick: boolean;
}

export function parseBenchArgs(args: readonly string[]): BenchOptions {
  const value = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const out = value('--out');
  const compareTo = value('--compare');
  return {
    json: args.includes('--json'),
    years: Number(value('--years') ?? 1000),
    tolerance: Number(value('--tolerance') ?? 0.5),
    quick: args.includes('--quick'),
    ...(out === undefined ? {} : { out }),
    ...(compareTo === undefined ? {} : { compareTo }),
  };
}

export function runBench(options: BenchOptions): {
  report: BenchReport;
  text: string;
  regressions: number;
} {
  let peak = 0;
  const sample = () => {
    peak = Math.max(peak, process.memoryUsage().heapUsed);
  };
  const calibrationMs = calibrate();
  const metrics: Metric[] = [];
  metrics.push(...coreScenario());
  sample();
  metrics.push(...syntheticScenario(options.years));
  sample();
  const worldgen = worldgenScenario();
  metrics.push(worldgen.metric);
  sample();
  if (!options.quick) {
    metrics.push(...worldScenario(worldgen.world));
    sample();
  }
  const report = makeReport(
    calibrationMs,
    metrics,
    Math.round(peak / 1048576),
    worldgen.metric.value,
  );
  if (options.out) writeFileSync(options.out, `${JSON.stringify(report, null, 2)}\n`);

  let baseline: BenchReport | undefined;
  let regressions: ReturnType<typeof compare> = [];
  if (options.compareTo) {
    baseline = JSON.parse(readFileSync(options.compareTo, 'utf8')) as BenchReport;
    regressions = compare(report, baseline, options.tolerance);
  }
  const lines = [options.json ? JSON.stringify(report, null, 2) : formatTable(report, baseline)];
  for (const r of regressions) {
    lines.push(
      `REGRESIÓN ${r.key}: ${r.baseline.toFixed(3)} → ${r.current.toFixed(3)} (${r.ratio.toFixed(2)}× normalizado)`,
    );
  }
  if (options.compareTo && regressions.length === 0)
    lines.push(`sin regresiones (tolerancia ${options.tolerance * 100}%)`);
  const budget = overBudget(report);
  for (const b of budget) {
    lines.push(`FUERA DE PRESUPUESTO ${b.key}: ${b.value.toFixed(3)} > ${b.budget}`);
  }
  return {
    report,
    text: lines.join('\n'),
    regressions: regressions.length + budget.length,
  };
}
