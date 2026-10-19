// Una corrida de salud: genera el mundo de una seed, lo simula con los invariantes activos y
// junta métricas (muestras periódicas del mundo, hitos, eventos, guerras, reinados).
import { performance } from 'node:perf_hooks';
import { Innovations, SettlementLevels } from '@ws/content';
import { playbackSeconds } from '@ws/history';
import { dominantEra, Sim, summarize, type WorldSummary, yearHash } from '@ws/sim';
import { generateWorld, type WorldParams } from '@ws/worldgen';

export interface SeedResult {
  readonly params: WorldParams;
  readonly worldHash: string;
  readonly provinces: number;
  /** Tierra del mundo (km2): escala las bandas del Apéndice A. */
  readonly landKm2: number;
  readonly worldgenMs: number;
  readonly simMs: number;
  readonly msPerYear: number;
  readonly years: number;
  /** Muestras del mundo cada `sample` años (y la final). */
  readonly samples: readonly WorldSummary[];
  /** Año del primer caso mundial de cada hito (null = no ocurrió). */
  readonly milestones: Readonly<Record<string, number | null>>;
  /** Eventos registrados por tipo. */
  readonly events: Readonly<Record<string, number>>;
  readonly wars: { readonly count: number; readonly meanYears: number; readonly maxYears: number };
  readonly reigns: { readonly count: number; readonly meanYears: number };
  readonly polities: { readonly formed: number; readonly ended: number };
  /** Duración de la reproducción a 1× con el ritmo por era (s; D48). */
  readonly playbackSeconds: number;
  /** Errores de invariantes o del motor (vacío = sano). */
  readonly errors: readonly string[];
  readonly finalHash: string;
}

const CITY = SettlementLevels.indexOf('city');

export function runSeed(params: WorldParams, sample: number, years?: number): SeedResult {
  const g0 = performance.now();
  const world = generateWorld(params);
  const worldgenMs = performance.now() - g0;
  const sim = Sim.create(world, {}, { invariants: true });
  const samples: WorldSummary[] = [];
  const milestones: Record<string, number | null> = {};
  for (const row of Innovations.rows) milestones[row.key] = null;
  milestones['firstCity'] = null;
  const events: Record<string, number> = {};
  const lastSuccession = new Map<number, number>();
  let reignSum = 0;
  let reignCount = 0;
  const errors: string[] = [];
  let done = 0;
  let finalHash = '';
  let lastYear = sim.year;
  /** Era dominante de cada estado k (índice de Eras): el ritmo de la reproducción. */
  const eras: number[] = [dominantEra(sim.ctx)];
  const t0 = performance.now();
  try {
    while (!sim.finished && (years === undefined || done < years)) {
      const result = sim.step();
      done++;
      lastYear = result.year;
      eras.push(dominantEra(sim.ctx));
      for (const e of result.events) {
        events[e.type] = (events[e.type] ?? 0) + 1;
        const data = e.data as Readonly<Record<string, unknown>>;
        if (e.type === 'innovation.invented' && data['firstInWorld'] === true) {
          const key = Innovations.rows[Number(data['innovation'])]?.key;
          if (key !== undefined && milestones[key] === null) milestones[key] = e.year;
        } else if (e.type === 'settlement.grew' && Number(data['to']) >= CITY) {
          milestones['firstCity'] ??= e.year;
        } else if (e.type === 'ruler.succeeded') {
          const title = Number(data['title']);
          const last = lastSuccession.get(title);
          if (last !== undefined) {
            reignSum += e.year - last;
            reignCount++;
          }
          lastSuccession.set(title, e.year);
        }
      }
      if (done % sample === 0) samples.push(summarize(sim.ctx, result.year));
      // (`sim.finished` quedó acotado a false por el while: se pregunta por el año.)
      if (sim.year > sim.endYear || (years !== undefined && done >= years)) {
        finalHash = yearHash(sim, result);
      }
    }
  } catch (error) {
    errors.push(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
  }
  const simMs = performance.now() - t0;
  const last = samples.at(-1);
  if (last?.year !== lastYear) samples.push(summarize(sim.ctx, lastYear));

  const { war, polity } = sim.ctx.state;
  let warCount = 0;
  let warYears = 0;
  let warMax = 0;
  for (const [, rec] of war.entries()) {
    if (rec.ended === 0) continue;
    const d = rec.ended - rec.started;
    warCount++;
    warYears += d;
    warMax = Math.max(warMax, d);
  }
  let ended = 0;
  for (const [, rec] of polity.entries()) if (rec.ended !== 0) ended++;
  let landKm2 = 0;
  for (let p = 1; p <= world.provinces.count; p++) landKm2 += world.provinces.area[p] ?? 0;

  return {
    params,
    worldHash: world.hash,
    provinces: world.provinces.count,
    landKm2,
    worldgenMs,
    simMs,
    msPerYear: done > 0 ? simMs / done : 0,
    years: done,
    samples,
    milestones,
    events,
    wars: { count: warCount, meanYears: warCount ? warYears / warCount : 0, maxYears: warMax },
    reigns: { count: reignCount, meanYears: reignCount ? reignSum / reignCount : 0 },
    polities: { formed: polity.size, ended },
    playbackSeconds: playbackSeconds(eras, done),
    errors,
    finalHash,
  };
}
