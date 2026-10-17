// `ws run`: corre una simulación headless y muestra hashes por año y un resumen. Base de
// `ws health` (P1.8) y herramienta para buscar divergencias (el primer año con hash distinto).
// Con `--wsim` graba la historia (P1.4), escribe el `.wsim` y mide tamaños y latencias (D45).
import { performance } from 'node:perf_hooks';
import { ENGINE_VERSION } from '@ws/core';
import { decodeWsim, encodeWsim, History, inspectWsim } from '@ws/history';
import {
  Sim,
  STATE_VERSION,
  summarize,
  totalPopulation,
  type WorldSummary,
  yearHash,
} from '@ws/sim';
import {
  createGridWorld,
  generateWorld,
  validateParams,
  type WorldParams,
  type WorldStatic,
} from '@ws/worldgen';
import { stats } from './bench/measure';

/** Mundo de la corrida: el generado por el worldgen (por defecto) o una grilla de prueba. */
export type RunWorld =
  | { readonly kind: 'generated'; readonly params: WorldParams }
  | { readonly kind: 'grid'; readonly seed: number; readonly grid: readonly [number, number] };

export interface RunOptions {
  readonly world: RunWorld;
  /** Años a simular (por defecto, hasta el último año de la corrida). */
  readonly years?: number;
  /** Cada cuántos años se muestra el hash (years). */
  readonly every: number;
  readonly json: boolean;
  /** Guard de contratos e invariantes por tick (lento). */
  readonly checks: boolean;
  /** Archivo `.wsim` de salida: graba la historia y la mide. */
  readonly wsim?: string;
}

export function parseRunArgs(args: readonly string[]): RunOptions {
  const value = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const seed = Number(value('--seed') ?? 1);
  if (!(Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff)) {
    throw new Error('--seed: entero u32');
  }
  let world: RunWorld;
  const gridArg = value('--grid');
  if (gridArg !== undefined) {
    const [w = 0, h = 0] = gridArg.split('x').map(Number);
    if (!(Number.isInteger(w) && Number.isInteger(h) && w > 0 && h > 0 && w * h <= 0xffff)) {
      throw new Error(`--grid inválido (${gridArg}): AnchoxAlto, hasta 65.535 provincias`);
    }
    world = { kind: 'grid', seed, grid: [w, h] };
  } else {
    world = {
      kind: 'generated',
      params: {
        seed,
        size: value('--size') ?? 'medium',
        mapType: value('--map') ?? 'continents',
        landFraction: Number(value('--land') ?? 0.3),
      },
    };
    validateParams(world.params);
  }
  const years = value('--years');
  const wsim = value('--wsim');
  if (wsim !== undefined && world.kind === 'grid') {
    throw new Error('--wsim: solo con mundos generados (la grilla no se regenera de parámetros)');
  }
  const options: RunOptions = {
    world,
    every: Number(value('--every') ?? 1000),
    json: args.includes('--json'),
    checks: args.includes('--checks'),
    ...(years === undefined ? {} : { years: Number(years) }),
    ...(wsim === undefined ? {} : { wsim }),
  };
  if (!(Number.isInteger(options.every) && options.every >= 1)) throw new Error('--every ≥ 1');
  if (options.years !== undefined && !(Number.isInteger(options.years) && options.years >= 0)) {
    throw new Error('--years: entero ≥ 0');
  }
  return options;
}

/** Tiempos de una consulta (ms). */
export interface Latency {
  readonly samples: number;
  readonly avgMs: number;
  readonly maxMs: number;
}

/** Medición de la historia grabada (P1.4; presupuestos de D44/D45). */
export interface HistoryReport {
  readonly file: string;
  /** Tamaño del `.wsim` (bytes) y de cada bloque en el archivo. */
  readonly fileBytes: number;
  readonly blocks: readonly { readonly tag: string; readonly bytes: number }[];
  /** Tamaños en memoria (bytes) de lo grabado. */
  readonly memory: ReturnType<History['stats']>;
  /** Costo de grabar un año (ms, promedio). */
  readonly recordMsPerYear: number;
  readonly encodeMs: number;
  readonly decodeMs: number;
  /** Mapa a la fecha (D45: ≤ 16 ms), con el peor caso de deltas por aplicar. */
  readonly mapAt: Latency;
  /** Estado completo a la fecha con keyframes en memoria cada 100 años (D45: ≤ 500 ms). */
  readonly fullStateLive: Latency;
  /** Estado completo a la fecha desde el archivo (keyframes cada 1.000 años). */
  readonly fullStateFile: Latency;
}

export interface RunReport {
  readonly engine: string;
  readonly stateVersion: string;
  readonly world: {
    readonly kind: RunWorld['kind'];
    readonly description: string;
    readonly hash: string;
    readonly provinces: number;
    /** Tiempo de generación del mundo (ms). */
    readonly worldgenMs: number;
  };
  readonly hashes: readonly { readonly year: number; readonly hash: string }[];
  /** Resumen del mundo cada `every` años. */
  readonly trace: readonly WorldSummary[];
  readonly final: { readonly year: number; readonly hash: string };
  readonly history?: HistoryReport;
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

function buildWorld(spec: RunWorld): { world: WorldStatic; description: string } {
  if (spec.kind === 'grid') {
    const [width, height] = spec.grid;
    return {
      world: createGridWorld({ seed: spec.seed, width, height }),
      description: `grilla ${width}x${height} · seed ${spec.seed}`,
    };
  }
  const p = spec.params;
  return {
    world: generateWorld(p),
    description: `${p.size} · ${p.mapType} · tierra ${p.landFraction} · seed ${p.seed}`,
  };
}

/** Corrida y, con `--wsim`, los bytes del archivo para escribir. */
export interface RunResult {
  readonly report: RunReport;
  readonly wsim?: Uint8Array;
}

function latency(run: (k: number) => void, ks: readonly number[]): Latency {
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
function worstCaseIndices(years: number, every: number, count: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const k = Math.floor(((i + 0.5) * years) / count / every) * every + every - 1;
    if (k <= years) out.push(k);
  }
  return out;
}

function measureHistory(
  history: History,
  file: string,
  bytes: Uint8Array,
  recordMs: number,
  encodeMs: number,
  world: WorldStatic,
): HistoryReport {
  const d0 = performance.now();
  const decoded = decodeWsim(bytes);
  const decodeMs = performance.now() - d0;
  const loaded = History.fromData(world, decoded.data);
  const years = history.years;
  history.frameAtIndex(1); // calentar
  return {
    file,
    fileBytes: bytes.length,
    blocks: inspectWsim(bytes).blocks,
    memory: history.stats(),
    recordMsPerYear: recordMs / Math.max(1, years),
    encodeMs,
    decodeMs,
    mapAt: latency(
      (k) => history.frameAtIndex(k),
      worstCaseIndices(years, history.data.keyframeEvery, 40),
    ),
    fullStateLive: latency(
      (k) => history.fullStateAt(history.yearOf(k)),
      worstCaseIndices(years, history.data.keyframeEvery, 6),
    ),
    fullStateFile: latency(
      (k) => loaded.fullStateAt(loaded.yearOf(k)),
      worstCaseIndices(years, 1000, 3),
    ),
  };
}

export function runSim(options: RunOptions): RunResult {
  const g0 = performance.now();
  const { world, description } = buildWorld(options.world);
  const worldgenMs = performance.now() - g0;
  const sim = Sim.create(world, {}, { checks: options.checks });
  const history = options.wsim === undefined ? undefined : History.start(sim);
  let recordMs = 0;
  const hashes: { year: number; hash: string }[] = [];
  const trace: WorldSummary[] = [];
  const stepMs: number[] = [];
  let events = 0;
  let years = 0;
  let last = { year: sim.year, hash: sim.hash() };
  const t0 = performance.now();
  while (!sim.finished && (options.years === undefined || years < options.years)) {
    const s = performance.now();
    const result = sim.step();
    stepMs.push(performance.now() - s);
    if (history) {
      const r = performance.now();
      history.record(sim, result);
      recordMs += performance.now() - r;
    }
    events += result.events.length;
    years++;
    // El hash del estado completo es caro: solo cuando se muestra (y al final).
    const shown = years % options.every === 0;
    // (`sim.finished` quedó acotado a false por la condición del while: se pregunta por el año.)
    const final = sim.year > sim.endYear || (options.years !== undefined && years >= options.years);
    if (shown || final) last = { year: result.year, hash: yearHash(sim, result) };
    if (shown) {
      hashes.push(last);
      trace.push(summarize(sim.ctx, result.year));
    }
  }
  const totalMs = performance.now() - t0;
  const s = stats(stepMs);
  let wsim: Uint8Array | undefined;
  let historyReport: HistoryReport | undefined;
  if (history && options.wsim !== undefined) {
    const e0 = performance.now();
    wsim = encodeWsim(world.params, world.hash, history.data, sim.snapshot());
    const encodeMs = performance.now() - e0;
    historyReport = measureHistory(history, options.wsim, wsim, recordMs, encodeMs, world);
  }
  const report: RunReport = {
    engine: ENGINE_VERSION,
    stateVersion: STATE_VERSION,
    world: {
      kind: options.world.kind,
      description,
      hash: world.hash,
      provinces: world.provinces.count,
      worldgenMs,
    },
    hashes,
    trace,
    final: last,
    ...(historyReport ? { history: historyReport } : {}),
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
  return wsim ? { report, wsim } : { report };
}

function formatHistory(h: HistoryReport): string[] {
  const mb = (b: number) => `${(b / 1e6).toFixed(2)} MB`;
  const lat = (l: Latency) => `prom ${l.avgMs.toFixed(1)} ms · máx ${l.maxMs.toFixed(1)} ms`;
  const m = h.memory;
  return [
    `historia → ${h.file}: ${mb(h.fileBytes)} (${h.blocks.map((b) => `${b.tag} ${mb(b.bytes)}`).join(' · ')})`,
    `  memoria: keyframes ${m.keyframes} × ${mb(m.keyframeBytes / Math.max(1, m.keyframes))} = ${mb(m.keyframeBytes)} · visual ${mb(m.visualBytes)} · deltas ${mb(m.deltaBytes)} · series ${mb(m.seriesBytes)} · ${m.events} eventos`,
    `  grabar ${h.recordMsPerYear.toFixed(3)} ms/año · codificar ${(h.encodeMs / 1000).toFixed(2)} s · leer ${(h.decodeMs / 1000).toFixed(2)} s`,
    `  mapa a la fecha ${lat(h.mapAt)} · estado completo (memoria) ${lat(h.fullStateLive)} · (archivo) ${lat(h.fullStateFile)}`,
  ];
}

export function formatRun(report: RunReport): string {
  const s = report.summary;
  const w = report.world;
  const n = (x: number) => x.toFixed(0);
  return [
    `motor ${report.engine} · estado ${report.stateVersion}`,
    `mundo ${w.description} · ${w.provinces} provincias · hash ${w.hash} · generado en ${(w.worldgenMs / 1000).toFixed(2)} s`,
    ...report.trace.map((t, k) => {
      const levels = t.settlementsByLevel.join('/');
      return `${String(t.year).padStart(7)}  pob ${(t.population / 1e6).toFixed(2)} M · agri ${t.farmingProvinces} · urb ${(t.urbanization * 100).toFixed(1)}% · asent ${levels} · polities ${t.activePolities} (mayor ${(t.largestPolity / 1e6).toFixed(2)} M, dueño ${(t.ownedShare * 100).toFixed(0)}%) · guerras ${t.activeWars} · era ${t.dominantEra} · ${t.innovations.length} innov · ${report.hashes[k]?.hash ?? ''}`;
    }),
    `final ${report.final.year}  ${report.final.hash}`,
    `${s.years} años en ${(s.totalMs / 1000).toFixed(1)} s · ${s.msPerYearAvg.toFixed(3)} ms/año (p95 ${s.msPerYearP95.toFixed(3)})`,
    `población ${n(s.population)} · pops ${s.pops} · polities ${s.polities} · eventos ${s.events}`,
    ...(report.history ? formatHistory(report.history) : []),
  ].join('\n');
}
