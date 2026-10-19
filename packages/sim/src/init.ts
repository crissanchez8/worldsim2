// Estado inicial de la corrida (D11: ≈12.000 a.C., mundo ya poblado): bandas de forrajeros en
// toda la tierra habitable, repartidas en culturas placeholder (≈1 cada 40 provincias) que nacen
// de focos elegidos por habitabilidad y crecen por el grafo de movimiento. Cada cultura tiene su
// idioma (fonología propia). P4 vuelve dinámicas las culturas.
import { Strata } from '@ws/content';
import { rng } from '@ws/core';
import { MinHeap, type WorldStatic } from '@ws/worldgen';
import { CULTURES, INITIAL_STATE, LEDGER } from './config';
import { assignName } from './names';
import type { SimState } from './state';

export interface SimParams {
  /** year (por defecto −12000). */
  readonly startYear: number;
  /** year (por defecto 1900). */
  readonly endYear: number;
}

/** Las dos mitades del hash del mundo estático (16 hex → 2 × u32). */
export function splitHash(hex: string): readonly [number, number] {
  if (!/^[0-9a-f]{16}$/.test(hex)) throw new Error(`hash inválido: ${hex}`);
  return [Number.parseInt(hex.slice(0, 8), 16), Number.parseInt(hex.slice(8), 16)];
}

const SUB_HEARTHS = 1;
const SUB_LANGUAGES = 2;
const INIT_OWNER = 'init';

/**
 * Cultura inicial de cada provincia (índice = id; 0 = sin cultura): focos por habitabilidad y
 * crecimiento por costo mínimo en el grafo; cada componente sin foco (islas) recibe el suyo.
 * Devuelve la cultura (1..k, en orden de creación) por provincia y el foco de cada cultura.
 */
export function cultureHearths(world: WorldStatic): { culture: Uint32Array; hearths: number[] } {
  const { count, habitability } = world.provinces;
  const { offsets, neighbors, baseCost } = world.graph;
  const target = Math.max(CULTURES.minCultures, Math.round(count / CULTURES.provincesPerCulture));
  const d = rng.createRng(world.params.seed).stream(rng.Streams.culture).sub(SUB_HEARTHS).at(0, 0);
  const weights = Array.from({ length: count }, (_, k) => habitability[k + 1] ?? 0);
  const hearths: number[] = [];
  for (let k = 0; k < target && weights.some((w) => w > 0); k++) {
    const p = d.weighted(weights) + 1;
    hearths.push(p);
    weights[p - 1] = 0;
  }
  const culture = new Uint32Array(count + 1);
  const dist = new Float64Array(count + 1).fill(Infinity);
  const grow = (seeds: readonly number[], firstCulture: number) => {
    const heap = new MinHeap(count);
    seeds.forEach((p, k) => {
      dist[p] = 0;
      culture[p] = firstCulture + k;
      heap.push(p, 0);
    });
    while (heap.size > 0) {
      const key = heap.peekKey();
      const p = heap.pop();
      if (key > (dist[p] ?? 0)) continue;
      for (let e = offsets[p] ?? 0; e < (offsets[p + 1] ?? 0); e++) {
        const q = neighbors[e] ?? 0;
        const nd = key + (baseCost[e] ?? 1);
        if (nd < (dist[q] ?? Infinity)) {
          dist[q] = nd;
          culture[q] = culture[p] ?? 0;
          heap.push(q, nd);
        }
      }
    }
  };
  grow(hearths, 1);
  // Componentes sin foco: el foco es la provincia más habitable (a igual, la de id menor).
  for (let p = 1; p <= count; p++) {
    if (culture[p] !== 0) continue;
    let best = p;
    const stack = [p];
    const seen = new Set([p]);
    while (stack.length > 0) {
      const a = stack.pop() ?? 0;
      if ((habitability[a] ?? 0) > (habitability[best] ?? 0)) best = a;
      for (let e = offsets[a] ?? 0; e < (offsets[a + 1] ?? 0); e++) {
        const q = neighbors[e] ?? 0;
        if (!seen.has(q) && culture[q] === 0) {
          seen.add(q);
          stack.push(q);
        }
      }
    }
    hearths.push(best);
    grow([best], hearths.length);
  }
  return { culture, hearths };
}

export function initialize(state: SimState, world: WorldStatic, params: SimParams): void {
  const [hashA, hashB] = splitHash(world.hash);
  const year = params.startYear;
  state.world.set('year', year);
  state.world.set('startYear', params.startYear);
  state.world.set('endYear', params.endYear);
  state.world.set('nextEventId', 1);
  state.world.set('staticHashA', hashA);
  state.world.set('staticHashB', hashB);

  const { count, area, habitability } = world.provinces;
  for (let p = 1; p <= count; p++) {
    const id = state.province.add({ owner: 0, foodSecurity: 1 });
    if (id !== p) throw new Error(`provincia ${p}: id ${id} (las ids tienen que coincidir)`);
  }

  // Culturas e idiomas (ids 1..k en el orden de los focos).
  const seed = world.params.seed;
  const { culture, hearths } = cultureHearths(world);
  const languageStream = rng.createRng(seed).stream(rng.Streams.language).sub(SUB_LANGUAGES);
  hearths.forEach((hearth, k) => {
    const language = state.language.add({
      phonologySeed: languageStream.at(k + 1, 0).uint32(),
    });
    state.language.set(
      language,
      'name',
      assignName(state, seed, language, 'language', year, INIT_OWNER),
    );
    const id = state.culture.add({ originProvince: hearth, founded: year, language });
    if (id !== k + 1) throw new Error(`cultura ${k + 1}: id ${id}`);
    state.culture.set(id, 'name', assignName(state, seed, language, 'culture', year, INIT_OWNER));
  });

  // Forrajeros: un pop por provincia habitable, de la cultura de la provincia.
  const common = Strata.indexOf('common');
  for (let p = 1; p <= count; p++) {
    const persons = (area[p] ?? 0) * (habitability[p] ?? 0) * INITIAL_STATE.foragerDensity;
    if (persons < LEDGER.minPopSize) continue;
    state.pop.add({
      province: p,
      culture: culture[p] ?? 0,
      religion: 0,
      stratum: common,
      size: persons,
    });
  }
}
