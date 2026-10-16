// Vistas derivadas (docs/model.md §13, M3): funciones puras del estado y del mundo estático. No
// van al snapshot; se recalculan al final de cada tick y al cargar. Índices densos (CSR), sin
// `Map` en el camino caliente (spike B: −35% del costo del año).
import type { WorldStatic } from '@ws/worldgen';
import type { SimState } from './state';

export interface Derived {
  /** Población por provincia (persons), índice = id de provincia. */
  readonly provincePopulation: Float64Array;
  /** CSR provincia → filas de pops: `popRows[popRowsStart[p] .. popRowsStart[p + 1])`. */
  readonly popRowsStart: Uint32Array;
  readonly popRows: Uint32Array;
  /** CSR polity → provincias (ids crecientes); índice = id de polity (< asignador). */
  readonly polityProvincesStart: Uint32Array;
  readonly polityProvinces: Uint32Array;
  /** Población (persons) y área (km2) por polity. */
  readonly polityPopulation: Float64Array;
  readonly polityArea: Float64Array;
  /** CSR polity → polities vecinas (comparten frontera; ids crecientes, sin repetir). */
  readonly polityNeighborsStart: Uint32Array;
  readonly polityNeighbors: Uint32Array;
  /** Cultura mayoritaria por provincia (a igual población, la de id menor; 0 sin pops). */
  readonly majorityCulture: Uint32Array;
  /** Innovaciones conocidas en alguna provincia (bits, como `Province.knownInnovations`). */
  readonly worldInnovations: number;
}

/** Prefijos acumulados in situ: counts[i] pasa a ser el inicio del bloque i. */
function toStarts(counts: Uint32Array): void {
  let acc = 0;
  for (let i = 0; i < counts.length; i++) {
    const c = counts[i] ?? 0;
    counts[i] = acc;
    acc += c;
  }
}

export function computeDerived(state: SimState, world: WorldStatic): Derived {
  const { pop, province, polity } = state;
  const n = world.provinces.count;
  const area = world.provinces.area;

  // Pops por provincia.
  const popProvince = pop.column('province');
  const popCulture = pop.column('culture');
  const size = pop.column('size');
  const provincePopulation = new Float64Array(n + 1);
  const popRowsStart = new Uint32Array(n + 2);
  const majorityCulture = new Uint32Array(n + 1);
  const majoritySize = new Float64Array(n + 1);
  for (let row = 0; row < pop.rowCount; row++) {
    if (!pop.aliveAt(row)) continue;
    const p = popProvince[row] ?? 0;
    const s = size[row] ?? 0;
    provincePopulation[p] = (provincePopulation[p] ?? 0) + s;
    popRowsStart[p] = (popRowsStart[p] ?? 0) + 1;
    const c = popCulture[row] ?? 0;
    const best = majoritySize[p] ?? 0;
    if (s > best || (s === best && c < (majorityCulture[p] ?? 0))) {
      majoritySize[p] = s;
      majorityCulture[p] = c;
    }
  }
  toStarts(popRowsStart);
  const popRows = new Uint32Array(pop.size);
  const fill = popRowsStart.slice();
  for (let row = 0; row < pop.rowCount; row++) {
    if (!pop.aliveAt(row)) continue;
    const p = popProvince[row] ?? 0;
    const at = fill[p] ?? 0;
    popRows[at] = row;
    fill[p] = at + 1;
  }

  // Provincias por polity (las filas de provincia están en orden de id: ids 1..n).
  const owner = province.column('owner');
  const polities = polity.allocator.peek(); // ids < peek
  const polityProvincesStart = new Uint32Array(polities + 1);
  const polityPopulation = new Float64Array(polities);
  const polityArea = new Float64Array(polities);
  for (let p = 1; p <= n; p++) {
    const o = owner[p - 1] ?? 0;
    if (o === 0) continue;
    polityProvincesStart[o] = (polityProvincesStart[o] ?? 0) + 1;
    polityPopulation[o] = (polityPopulation[o] ?? 0) + (provincePopulation[p] ?? 0);
    polityArea[o] = (polityArea[o] ?? 0) + (area[p] ?? 0);
  }
  toStarts(polityProvincesStart);
  const owned = polityProvincesStart[polities] ?? 0;
  const polityProvinces = new Uint32Array(owned);
  const pfill = polityProvincesStart.slice();
  for (let p = 1; p <= n; p++) {
    const o = owner[p - 1] ?? 0;
    if (o === 0) continue;
    const at = pfill[o] ?? 0;
    polityProvinces[at] = p;
    pfill[o] = at + 1;
  }

  // Vecinos entre polities, desde el grafo de provincias.
  const { offsets, neighbors } = world.graph;
  const seen = new Uint32Array(polities); // marca: última polity que vio a esta vecina (+1)
  const lists: number[][] = [];
  const polityNeighborsStart = new Uint32Array(polities + 1);
  for (let a = 0; a < polities; a++) {
    const list: number[] = [];
    for (let k = polityProvincesStart[a] ?? 0; k < (polityProvincesStart[a + 1] ?? 0); k++) {
      const p = polityProvinces[k] ?? 0;
      for (let e = offsets[p] ?? 0; e < (offsets[p + 1] ?? 0); e++) {
        const b = owner[(neighbors[e] ?? 0) - 1] ?? 0;
        if (b === 0 || b === a || seen[b] === a + 1) continue;
        seen[b] = a + 1;
        list.push(b);
      }
    }
    list.sort((x, y) => x - y);
    lists.push(list);
    polityNeighborsStart[a] = list.length;
  }
  toStarts(polityNeighborsStart);
  const polityNeighbors = new Uint32Array(polityNeighborsStart[polities] ?? 0);
  lists.forEach((list, a) => {
    polityNeighbors.set(list, polityNeighborsStart[a] ?? 0);
  });

  let worldInnovations = 0;
  const known = province.column('knownInnovations');
  for (let p = 1; p <= n; p++) worldInnovations |= known[p - 1] ?? 0;

  return {
    majorityCulture,
    worldInnovations: worldInnovations >>> 0,
    provincePopulation,
    popRowsStart,
    popRows,
    polityProvincesStart,
    polityProvinces,
    polityPopulation,
    polityArea,
    polityNeighborsStart,
    polityNeighbors,
  };
}
