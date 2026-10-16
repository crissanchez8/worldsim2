// Sistemas de la simulación ficticia, con contratos declarados (docs/model.md §9) y el patrón
// del libro mayor (M1): crecimiento y conquista solo emiten deltas; `ledger` los aplica.
import { math, rng, type scheduler } from '@ws/core';
import { DYNAMICS, type SimConfig } from './config';
import { DELTA_GROWTH, DELTA_TRANSFER } from './pop-deltas';
import type { createBuffers, createEventTypes, Derived, State, TerritoryRequest } from './world';

export interface SimWorld {
  readonly config: SimConfig;
  readonly state: State;
  readonly neighbors: Uint32Array;
  readonly buffers: ReturnType<typeof createBuffers>;
  readonly types: ReturnType<typeof createEventTypes>;
  derived: Derived;
}

type System = scheduler.SystemDef<SimWorld>;
const STREAM = rng.Streams.spike;
const SUB_GROWTH = 1;
const SUB_CONQUEST = 2;

export const growth: System = {
  contract: {
    name: 'growth',
    phase: 'consumption',
    cadence: { kind: 'annual' },
    reads: ['pop.province', 'pop.culture', 'pop.size', 'province.fertility'],
    writes: [],
    emits: [],
    produces: ['popDeltas'],
  },
  run(w, tick) {
    const { pop, province } = w.state;
    const popProvince = pop.column('province');
    const culture = pop.column('culture');
    const size = pop.column('size');
    const fertility = province.column('fertility');
    const { provincePop, majorityCulture } = w.derived;
    for (let row = 0; row < pop.rowCount; row++) {
      if (!pop.aliveAt(row)) continue;
      const id = pop.idAt(row);
      const prov = popProvince[row] ?? 0;
      const fert = fertility[prov - 1] ?? 0; // provincias: ids 1..N, fila = id − 1
      const s = size[row] ?? 0;
      const u = rng.rngUniform(w.config.seed, STREAM, SUB_GROWTH, id, tick.year, 0);
      const load = (provincePop[prov] ?? 0) / (DYNAMICS.capacityPerFertility * fert);
      const rate =
        DYNAMICS.baseGrowth +
        DYNAMICS.fertilityGrowth * (fert - 0.5) +
        DYNAMICS.noise * (u - 0.5) -
        (load > 1 ? DYNAMICS.capacityPressure * (load - 1) : 0);
      w.buffers.popDeltas.push(id, DELTA_GROWTH, s * math.expm1(rate), 0);
      const majority = majorityCulture[prov] ?? 0;
      if ((culture[row] ?? 0) !== majority) {
        w.buffers.popDeltas.push(id, DELTA_TRANSFER, s * DYNAMICS.assimilation, majority);
      }
    }
  },
};

export const conquest: System = {
  contract: {
    name: 'conquest',
    phase: 'war',
    cadence: { kind: 'annual' },
    reads: ['province.owner'],
    writes: ['polity.#rows', 'polity.founded', 'polity.colorSeed'],
    emits: ['polity.formed'],
    produces: ['territoryRequests'],
  },
  run(w, tick) {
    const { province, polity } = w.state;
    const owner = province.column('owner');
    const strength = w.derived.polityStrength;
    const seed = w.config.seed;
    for (let p = 1; p <= province.size; p++) {
      const u = rng.rngUniform(seed, STREAM, SUB_CONQUEST, p, tick.year, 0);
      if (u < DYNAMICS.attackChance) {
        const dir = Math.floor(rng.rngUniform(seed, STREAM, SUB_CONQUEST, p, tick.year, 1) * 4);
        const q = w.neighbors[(p - 1) * 4 + dir] ?? 0;
        if (q === 0) continue;
        const attacker = owner[q - 1] ?? 0;
        const defender = owner[p - 1] ?? 0;
        if (attacker === 0 || attacker === defender) continue;
        const sa = strength[attacker] ?? 0;
        const sd = strength[defender] ?? 0;
        const chance = sa + sd > 0 ? sa / (sa + sd) : 0.5;
        if (rng.rngUniform(seed, STREAM, SUB_CONQUEST, p, tick.year, 2) < chance) {
          w.buffers.territoryRequests.push({
            province: p,
            newOwner: attacker,
            priority: 2,
            cause: 'conquest',
            causeEvent: null,
          });
        }
      } else if (u > 1 - DYNAMICS.secessionChance) {
        const id = polity.add({
          founded: tick.year,
          colorSeed: rng.rngUint32(seed, STREAM, SUB_CONQUEST, p, tick.year, 3),
        });
        const event = tick.events.emit(w.types.polityFormed, {
          actors: [{ kind: 'polity', id }],
          place: { kind: 'province', id: p },
          data: { founded: tick.year },
        });
        w.buffers.territoryRequests.push({
          province: p,
          newOwner: id,
          priority: 3,
          cause: 'secession',
          causeEvent: event,
        });
      }
    }
  },
};

export const ledger: System = {
  contract: {
    name: 'ledger',
    phase: 'consolidation',
    cadence: { kind: 'annual' },
    reads: ['pop.province', 'province.owner'],
    writes: ['pop.size', 'province.owner'],
    emits: ['territory.changed'],
    consumes: ['popDeltas', 'territoryRequests'],
  },
  run(w, tick) {
    const { pop, province } = w.state;
    const size = pop.column('size');
    const popProvince = pop.column('province');
    const culture = pop.column('culture');
    const { popRowsStart, popRows } = w.derived;
    // Población: todos los deltas se calcularon sobre los tamaños del inicio del tick.
    const d = w.buffers.popDeltas;
    for (let i = 0; i < d.size; i++) {
      const row = pop.rowOf(d.pop[i] ?? 0);
      const persons = d.persons[i] ?? 0;
      if (d.kind[i] === DELTA_GROWTH) {
        size[row] = (size[row] ?? 0) + persons;
        continue;
      }
      // transferencia al pop de la misma provincia con la cultura destino (≤ 10 candidatos)
      const prov = popProvince[row] ?? 0;
      const target = d.toCulture[i] ?? 0;
      for (let k = popRowsStart[prov] ?? 0; k < (popRowsStart[prov + 1] ?? 0); k++) {
        const to = popRows[k] ?? 0;
        if (culture[to] === target) {
          size[row] = (size[row] ?? 0) - persons;
          size[to] = (size[to] ?? 0) + persons;
          break;
        }
      }
    }
    d.clear();
    for (let row = 0; row < pop.rowCount; row++) {
      if ((size[row] ?? 0) < DYNAMICS.minPopSize) size[row] = DYNAMICS.minPopSize;
    }
    // Territorio: por provincia gana la mayor prioridad; a igual prioridad, la primera.
    const winners = new Map<number, TerritoryRequest>();
    for (const r of w.buffers.territoryRequests.drain()) {
      const current = winners.get(r.province);
      if (!current || r.priority > current.priority) winners.set(r.province, r);
    }
    const owner = province.column('owner');
    const ordered = [...winners.values()].sort((a, b) => a.province - b.province);
    for (const r of ordered) {
      const from = owner[r.province - 1] ?? 0;
      if (from === r.newOwner) continue;
      owner[r.province - 1] = r.newOwner;
      tick.events.emit(w.types.territoryChanged, {
        actors: [
          { kind: 'polity', id: r.newOwner },
          { kind: 'polity', id: from },
        ],
        place: { kind: 'province', id: r.province },
        causes: r.causeEvent === null ? [] : [{ kind: 'event', id: r.causeEvent }],
        data: { from, to: r.newOwner, cause: r.cause },
      });
    }
  },
};

export const derive: System = {
  contract: {
    name: 'derive',
    phase: 'consolidation',
    cadence: { kind: 'annual' },
    reads: ['pop.province', 'pop.culture', 'pop.size', 'province.owner'],
    writes: [],
    emits: [],
  },
  run(w) {
    w.derived = computeDerived(w.state);
  },
};

/** Vistas derivadas: funciones puras del estado (también se usan al cargar un snapshot). */
export function computeDerived(state: State): Derived {
  const { pop, province, polity } = state;
  const n = province.size;
  const provincePop = new Float64Array(n + 1);
  const best = new Float64Array(n + 1);
  const majorityCulture = new Uint16Array(n + 1);
  const popRowsStart = new Uint32Array(n + 2);
  const popProvince = pop.column('province');
  const culture = pop.column('culture');
  const size = pop.column('size');
  for (let row = 0; row < pop.rowCount; row++) {
    if (!pop.aliveAt(row)) continue;
    const prov = popProvince[row] ?? 0;
    const c = culture[row] ?? 0;
    const s = size[row] ?? 0;
    provincePop[prov] = (provincePop[prov] ?? 0) + s;
    popRowsStart[prov + 1] = (popRowsStart[prov + 1] ?? 0) + 1;
    if (s > (best[prov] ?? 0) || (s === best[prov] && c < (majorityCulture[prov] ?? 0))) {
      best[prov] = s;
      majorityCulture[prov] = c;
    }
  }
  // CSR provincia → filas de pops (conteo → prefijos → relleno)
  for (let p = 1; p <= n + 1; p++)
    popRowsStart[p] = (popRowsStart[p] ?? 0) + (popRowsStart[p - 1] ?? 0);
  const popRows = new Uint32Array(pop.size);
  const fill = popRowsStart.slice();
  for (let row = 0; row < pop.rowCount; row++) {
    if (!pop.aliveAt(row)) continue;
    const prov = popProvince[row] ?? 0;
    popRows[fill[prov] ?? 0] = row;
    fill[prov] = (fill[prov] ?? 0) + 1;
  }
  const polityStrength = new Float64Array(polity.allocator.peek());
  const owner = province.column('owner');
  for (let p = 1; p <= n; p++) {
    const o = owner[p - 1] ?? 0;
    polityStrength[o] = (polityStrength[o] ?? 0) + (provincePop[p] ?? 0);
  }
  return { provincePop, majorityCulture, polityStrength, popRowsStart, popRows };
}

export const SYSTEMS: readonly System[] = [growth, conquest, ledger, derive];
