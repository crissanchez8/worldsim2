// `ws health` (P1.8): N seeds en paralelo (worker_threads), métricas contra el Apéndice A,
// invariantes por tick y reporte Markdown + HTML. Sale con 1 si alguna seed rompió un invariante.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { join } from 'node:path';
import { Worker } from 'node:worker_threads';
import { ENGINE_VERSION } from '@ws/core';
import { STATE_VERSION } from '@ws/sim';
import { validateParams, type WorldParams } from '@ws/worldgen';
import { type HealthReport, summarizeHealth, toHtml, toMarkdown } from './report';
import type { SeedResult } from './seed';

export interface HealthOptions {
  readonly seeds: readonly number[];
  readonly base: Omit<WorldParams, 'seed'>;
  /** Cada cuántos años se muestrea el mundo (years). */
  readonly sample: number;
  readonly years?: number;
  readonly workers: number;
  readonly out: string;
  readonly compareTo?: string;
  readonly saveTo?: string;
}

export function parseHealthArgs(args: readonly string[]): HealthOptions {
  const value = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const list = value('--seed-list');
  const count = Number(value('--seeds') ?? 10);
  const seeds = list ? list.split(',').map(Number) : Array.from({ length: count }, (_, k) => k + 1);
  const base = {
    size: value('--size') ?? 'medium',
    mapType: value('--map') ?? 'continents',
    landFraction: Number(value('--land') ?? 0.3),
  };
  for (const seed of seeds) validateParams({ seed, ...base });
  const years = value('--years');
  const compareTo = value('--compare');
  const saveTo = value('--save');
  const workers = Number(
    value('--workers') ?? Math.max(1, Math.min(seeds.length, cpus().length - 1)),
  );
  if (!(Number.isInteger(workers) && workers >= 1)) throw new Error('--workers ≥ 1');
  return {
    seeds,
    base,
    sample: Number(value('--sample') ?? 100),
    workers,
    out: value('--out') ?? 'out/health',
    ...(years === undefined ? {} : { years: Number(years) }),
    ...(compareTo === undefined ? {} : { compareTo }),
    ...(saveTo === undefined ? {} : { saveTo }),
  };
}

function runInWorker(params: WorldParams, sample: number, years?: number): Promise<SeedResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./worker.mjs', import.meta.url), {
      workerData: { params, sample, years },
    });
    worker.once('message', (result: SeedResult) => {
      resolve(result);
      void worker.terminate();
    });
    worker.once('error', reject);
  });
}

export async function runHealth(
  options: HealthOptions,
  log: (line: string) => void,
): Promise<HealthReport> {
  const queue = [...options.seeds];
  const results: SeedResult[] = [];
  const lane = async () => {
    for (let seed = queue.shift(); seed !== undefined; seed = queue.shift()) {
      const r = await runInWorker({ seed, ...options.base }, options.sample, options.years);
      results.push(r);
      log(
        `seed ${seed}: ${r.years} años · ${(r.simMs / 1000).toFixed(1)} s · ${r.errors.length ? `❌ ${r.errors[0] ?? ''}` : '✅'}`,
      );
    }
  };
  await Promise.all(Array.from({ length: Math.min(options.workers, options.seeds.length) }, lane));
  results.sort((a, b) => a.params.seed - b.params.seed);
  return {
    engine: ENGINE_VERSION,
    stateVersion: STATE_VERSION,
    generatedAt: new Date().toISOString(),
    summary: summarizeHealth(results),
    results,
  };
}

export function writeHealth(report: HealthReport, options: HealthOptions): string {
  const baseline = options.compareTo
    ? (JSON.parse(readFileSync(options.compareTo, 'utf8')) as HealthReport)
    : undefined;
  mkdirSync(options.out, { recursive: true });
  const md = toMarkdown(report, baseline);
  writeFileSync(join(options.out, 'report.md'), md);
  writeFileSync(join(options.out, 'report.html'), toHtml(report, baseline));
  writeFileSync(join(options.out, 'report.json'), `${JSON.stringify(report)}\n`);
  // La línea base guarda solo el resumen (la comparación usa eso): no versionar cientos de KB.
  if (options.saveTo) {
    writeFileSync(options.saveTo, `${JSON.stringify({ ...report, results: [] }, null, 1)}\n`);
  }
  return md;
}
