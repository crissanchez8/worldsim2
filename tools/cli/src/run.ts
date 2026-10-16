// `ws run`: corre una simulación headless y muestra hashes por año y un resumen. Base de
// `ws health` (P1.8) y herramienta para buscar divergencias (el primer año con hash distinto).
import { performance } from 'node:perf_hooks';
import { ENGINE_VERSION } from '@ws/core';
import { Sim, STATE_VERSION, totalPopulation, yearHash } from '@ws/sim';
import { createGridWorld } from '@ws/worldgen';
import { stats } from './bench/measure';

export interface RunOptions {
  readonly seed: number;
  /** Mundo de grilla (provincias por fila × filas) hasta el worldgen real (P1.1). */
  readonly grid: readonly [number, number];
  /** Años a simular (por defecto, hasta el último año de la corrida). */
  readonly years?: number;
  /** Cada cuántos años se muestra el hash (years). */
  readonly every: number;
  readonly json: boolean;
  /** Guard de contratos e invariantes por tick (lento). */
  readonly checks: boolean;
}

export function parseRunArgs(args: readonly string[]): RunOptions {
  const value = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const grid = (value('--grid') ?? '50x30').split('x').map(Number);
  const years = value('--years');
  const options: RunOptions = {
    seed: Number(value('--seed') ?? 1),
    grid: [grid[0] ?? 0, grid[1] ?? 0],
    every: Number(value('--every') ?? 1000),
    json: args.includes('--json'),
    checks: args.includes('--checks'),
    ...(years === undefined ? {} : { years: Number(years) }),
  };
  const [w, h] = options.grid;
  if (!(Number.isInteger(w) && Number.isInteger(h) && w > 0 && h > 0 && w * h <= 0xffff)) {
    throw new Error(
      `--grid inválido (${value('--grid') ?? ''}): AnchoxAlto, hasta 65.535 provincias`,
    );
  }
  if (!(Number.isInteger(options.seed) && options.seed >= 0 && options.seed <= 0xffffffff)) {
    throw new Error('--seed: entero u32');
  }
  if (!(Number.isInteger(options.every) && options.every >= 1)) throw new Error('--every ≥ 1');
  if (options.years !== undefined && !(Number.isInteger(options.years) && options.years >= 0)) {
    throw new Error('--years: entero ≥ 0');
  }
  return options;
}

export interface RunReport {
  readonly engine: string;
  readonly stateVersion: string;
  readonly world: { readonly kind: 'grid'; readonly seed: number; readonly hash: string };
  readonly hashes: readonly { readonly year: number; readonly hash: string }[];
  readonly final: { readonly year: number; readonly hash: string };
  readonly summary: {
    readonly years: number;
    readonly totalMs: number;
    readonly msPerYearAvg: number;
    readonly msPerYearP95: number;
    readonly population: number;
    readonly pops: number;
    readonly polities: number;
    readonly events: number;
  };
}

export function runSim(options: RunOptions): RunReport {
  const [width, height] = options.grid;
  const world = createGridWorld({ seed: options.seed, width, height });
  const sim = Sim.create(world, {}, { checks: options.checks });
  const hashes: { year: number; hash: string }[] = [];
  const stepMs: number[] = [];
  let events = 0;
  let years = 0;
  let last = { year: sim.year, hash: sim.hash() };
  const t0 = performance.now();
  while (!sim.finished && (options.years === undefined || years < options.years)) {
    const s = performance.now();
    const result = sim.step();
    stepMs.push(performance.now() - s);
    events += result.events.length;
    years++;
    last = { year: result.year, hash: yearHash(sim, result) };
    if (years % options.every === 0) hashes.push(last);
  }
  const totalMs = performance.now() - t0;
  const s = stats(stepMs);
  return {
    engine: ENGINE_VERSION,
    stateVersion: STATE_VERSION,
    world: { kind: 'grid', seed: options.seed, hash: world.hash },
    hashes,
    final: last,
    summary: {
      years,
      totalMs,
      msPerYearAvg: s.avg,
      msPerYearP95: s.p95,
      population: totalPopulation(sim.ctx.state),
      pops: sim.ctx.state.pop.size,
      polities: sim.ctx.state.polity.size,
      events,
    },
  };
}

export function formatRun(report: RunReport): string {
  const s = report.summary;
  const n = (x: number) => x.toFixed(0);
  return [
    `motor ${report.engine} · estado ${report.stateVersion}`,
    `mundo grilla · seed ${report.world.seed} · hash ${report.world.hash}`,
    ...report.hashes.map((h) => `${String(h.year).padStart(7)}  ${h.hash}`),
    `final ${report.final.year}  ${report.final.hash}`,
    `${s.years} años en ${(s.totalMs / 1000).toFixed(1)} s · ${s.msPerYearAvg.toFixed(3)} ms/año (p95 ${s.msPerYearP95.toFixed(3)})`,
    `población ${n(s.population)} · pops ${s.pops} · polities ${s.polities} · eventos ${s.events}`,
  ].join('\n');
}
