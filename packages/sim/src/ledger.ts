// Libro mayor (M1, docs/model.md §5.3 y §8): el ÚNICO sistema que cambia `Pop.size`, las claves
// y filas de los pops y `Province.owner`. Los demás sistemas solo emiten deltas a los buffers;
// acá se aplican todos juntos al final del tick, así todos vieron la población y el territorio
// del inicio del tick y el orden de los sistemas no importa (H-02).
import type { scheduler } from '@ws/core';
import {
  POP_DELTA_CAUSES,
  PopDeltaKind,
  popDeltaCause,
  TERRITORY_CAUSES,
  TERRITORY_PRIORITY,
} from './buffers';
import { LEDGER } from './config';
import type { LedgerTally, SimContext, SimSystem } from './context';
import { isActivePolity } from './state';

export class LedgerError extends Error {
  override name = 'LedgerError';
}

export function emptyTally(): LedgerTally {
  return {
    births: 0,
    deaths: new Float64Array(POP_DELTA_CAUSES.length),
    transferred: 0,
    popsCreated: 0,
    popsRemoved: 0,
    territoryChanges: 0,
  };
}

const DISPERSAL = popDeltaCause('dispersal');

/** Parecido entre dos claves de pop: cultura > religión > estrato. */
function similarity(
  c1: number,
  r1: number,
  s1: number,
  c2: number,
  r2: number,
  s2: number,
): number {
  return (c1 === c2 ? 4 : 0) + (r1 === r2 ? 2 : 0) + (s1 === s2 ? 1 : 0);
}

/** Filas vivas de los pops de una provincia: las del índice derivado + las creadas en este tick. */
function provinceRows(w: SimContext, created: Map<number, number[]>, p: number): number[] {
  const { popRowsStart, popRows } = w.derived;
  const out: number[] = [];
  for (let k = popRowsStart[p] ?? 0; k < (popRowsStart[p + 1] ?? 0); k++) {
    const row = popRows[k] ?? 0;
    if (w.state.pop.aliveAt(row)) out.push(row);
  }
  for (const row of created.get(p) ?? []) if (w.state.pop.aliveAt(row)) out.push(row);
  return out;
}

function applyPopDeltas(w: SimContext, tally: LedgerTally, created: Map<number, number[]>): void {
  const { pop } = w.state;
  const d = w.buffers.popDeltas;
  const count = d.size;
  if (count === 0) return;
  const rows = pop.rowCount;
  const dPop = d.column('pop');
  const dKind = d.column('kind');
  const dCause = d.column('cause');
  const dPersons = d.column('persons');

  // 1 · Totales por pop, todos sobre el tamaño del inicio del tick.
  const births = new Float64Array(rows);
  const deaths = new Float64Array(rows);
  const outgoing = new Float64Array(rows);
  const deltaRow = new Int32Array(count);
  for (let i = 0; i < count; i++) {
    const id = dPop[i] ?? 0;
    const row = pop.rowOf(id);
    if (row < 0) throw new LedgerError(`popDeltas[${i}]: no existe el pop ${id}`);
    const persons = dPersons[i] ?? 0;
    if (!(persons >= 0 && persons < Number.POSITIVE_INFINITY)) {
      throw new LedgerError(`popDeltas[${i}]: persons inválido (${persons})`);
    }
    if ((dCause[i] ?? 0) >= POP_DELTA_CAUSES.length) {
      throw new LedgerError(`popDeltas[${i}]: causa inválida`);
    }
    deltaRow[i] = row;
    const kind = dKind[i];
    if (kind === PopDeltaKind.birth) births[row] = (births[row] ?? 0) + persons;
    else if (kind === PopDeltaKind.death) deaths[row] = (deaths[row] ?? 0) + persons;
    else if (kind === PopDeltaKind.transfer) outgoing[row] = (outgoing[row] ?? 0) + persons;
    else throw new LedgerError(`popDeltas[${i}]: tipo inválido (${kind})`);
  }

  // 2 · Nacimientos y muertes; si las muertes superan lo que hay, se escalan (nadie muere dos
  // veces). Lo que queda se reparte entre las transferencias salientes, escaladas igual.
  let size = pop.column('size');
  const deathFactor = new Float64Array(rows);
  const transferFactor = new Float64Array(rows);
  for (let row = 0; row < rows; row++) {
    const out = outgoing[row] ?? 0;
    const died = deaths[row] ?? 0;
    const gross = (size[row] ?? 0) + (births[row] ?? 0);
    const df = died > gross ? gross / died : 1;
    const available = Math.max(0, gross - died * df);
    const tf = out > available ? available / out : 1;
    deathFactor[row] = df;
    transferFactor[row] = tf;
    if (died !== 0 || out !== 0 || (births[row] ?? 0) !== 0) {
      size[row] = Math.max(0, available - out * tf);
    }
    tally.births += births[row] ?? 0;
  }

  // 3 · Muertes por causa y transferencias, en el orden de llegada.
  for (let i = 0; i < count; i++) {
    const row = deltaRow[i] ?? 0;
    const persons = dPersons[i] ?? 0;
    const kind = dKind[i];
    if (kind === PopDeltaKind.death) {
      const cause = dCause[i] ?? 0;
      tally.deaths[cause] = (tally.deaths[cause] ?? 0) + persons * (deathFactor[row] ?? 1);
      continue;
    }
    if (kind !== PopDeltaKind.transfer) continue;
    const amount = persons * (transferFactor[row] ?? 1);
    if (amount === 0) continue;
    const target = findOrCreatePop(w, tally, created, i);
    size = pop.column('size'); // un alta puede reasignar las columnas (L-007)
    size[target] = (size[target] ?? 0) + amount;
    tally.transferred += amount;
  }
}

/** Pop con la clave destino de la transferencia `i`; si no existe, se crea vacío. */
function findOrCreatePop(
  w: SimContext,
  tally: LedgerTally,
  created: Map<number, number[]>,
  i: number,
): number {
  const { pop } = w.state;
  const d = w.buffers.popDeltas;
  const province = d.column('toProvince')[i] ?? 0;
  const culture = d.column('toCulture')[i] ?? 0;
  const religion = d.column('toReligion')[i] ?? 0;
  const stratum = d.column('toStratum')[i] ?? 0;
  if (province < 1 || province > w.world.provinces.count) {
    throw new LedgerError(`popDeltas[${i}]: provincia destino inválida (${province})`);
  }
  const pc = pop.column('culture');
  const pr = pop.column('religion');
  const ps = pop.column('stratum');
  for (const row of provinceRows(w, created, province)) {
    if (pc[row] === culture && pr[row] === religion && ps[row] === stratum) return row;
  }
  const id = pop.add({ province, culture, religion, stratum, size: 0 });
  const row = pop.rowOf(id);
  const list = created.get(province);
  if (list) list.push(row);
  else created.set(province, [row]);
  tally.popsCreated++;
  return row;
}

/** I3: los pops de menos de 1 persona se fusionan con el más parecido de su provincia. */
function mergeSmallPops(w: SimContext, tally: LedgerTally, created: Map<number, number[]>): void {
  const { pop } = w.state;
  const size = pop.column('size');
  const province = pop.column('province');
  const culture = pop.column('culture');
  const religion = pop.column('religion');
  const stratum = pop.column('stratum');
  let removed = 0;
  for (let row = 0; row < pop.rowCount; row++) {
    if (!pop.aliveAt(row)) continue;
    const s = size[row] ?? 0;
    if (s >= LEDGER.minPopSize) continue;
    // Destino, en orden de preferencia: que ya tenga ≥ 1 persona, el más parecido, el más grande
    // y el de id menor (las filas están en orden de id).
    const c = culture[row] ?? 0;
    const r = religion[row] ?? 0;
    const st = stratum[row] ?? 0;
    let best = -1;
    let bestFull = false;
    let bestSimilarity = -1;
    let bestSize = -1;
    for (const other of provinceRows(w, created, province[row] ?? 0)) {
      if (other === row) continue;
      const os = size[other] ?? 0;
      const full = os >= LEDGER.minPopSize;
      const sim = similarity(
        c,
        r,
        st,
        culture[other] ?? 0,
        religion[other] ?? 0,
        stratum[other] ?? 0,
      );
      const better =
        best < 0 ||
        (full !== bestFull
          ? full
          : sim !== bestSimilarity
            ? sim > bestSimilarity
            : os !== bestSize
              ? os > bestSize
              : other < best);
      if (better) {
        best = other;
        bestFull = full;
        bestSimilarity = sim;
        bestSize = os;
      }
    }
    if (best < 0) {
      // Último pop de la provincia: la fracción de persona que queda se cuenta como muerte.
      tally.deaths[DISPERSAL] = (tally.deaths[DISPERSAL] ?? 0) + s;
    } else {
      // Fusión: conserva personas (se cuenta como transferencia, no como muerte).
      size[best] = (size[best] ?? 0) + s;
      tally.transferred += s;
    }
    size[row] = 0;
    pop.remove(pop.idAt(row));
    removed++;
  }
  if (removed > 0) {
    pop.compact();
    tally.popsRemoved += removed;
  }
}

function applyTerritory(w: SimContext, tally: LedgerTally, tick: scheduler.TickInfo): void {
  const t = w.buffers.territoryRequests;
  const count = t.size;
  if (count === 0) return;
  const n = w.world.provinces.count;
  const tProvince = t.column('province');
  const tOwner = t.column('newOwner');
  const tCause = t.column('cause');
  const tEvent = t.column('causeEvent');
  const winner = new Int32Array(n + 1).fill(-1);
  const overruled = new Uint32Array(n + 1);
  for (let i = 0; i < count; i++) {
    const p = tProvince[i] ?? 0;
    const owner = tOwner[i] ?? 0;
    const cause = tCause[i] ?? 0;
    if (p < 1 || p > n) throw new LedgerError(`territoryRequests[${i}]: provincia ${p}`);
    if (cause >= TERRITORY_CAUSES.length) throw new LedgerError(`territoryRequests[${i}]: causa`);
    if (owner !== 0 && !isActivePolity(w.state, owner)) {
      throw new LedgerError(`territoryRequests[${i}]: la polity ${owner} no está activa`);
    }
    const current = winner[p] ?? -1;
    if (current < 0) {
      winner[p] = i;
      continue;
    }
    overruled[p] = (overruled[p] ?? 0) + 1;
    const pi = TERRITORY_PRIORITY[cause] ?? 0;
    const pc = TERRITORY_PRIORITY[tCause[current] ?? 0] ?? 0;
    if (pi > pc) winner[p] = i; // a igual prioridad gana la primera emitida
  }
  const ownerColumn = w.state.province.column('owner');
  for (let p = 1; p <= n; p++) {
    const i = winner[p] ?? -1;
    if (i < 0) continue;
    const from = ownerColumn[p - 1] ?? 0;
    const to = tOwner[i] ?? 0;
    if (from === to) continue;
    ownerColumn[p - 1] = to;
    tally.territoryChanges++;
    const causeEvent = tEvent[i] ?? 0;
    tick.events.emit(w.types.territoryChanged, {
      actors: [to, from].filter((id) => id !== 0).map((id) => ({ kind: 'polity', id })),
      place: { kind: 'province', id: p },
      causes: causeEvent === 0 ? [] : [{ kind: 'event', id: causeEvent }],
      data: {
        from,
        to,
        cause: TERRITORY_CAUSES[tCause[i] ?? 0] ?? 'expansion',
        overruled: overruled[p] ?? 0,
      },
    });
  }
}

export const ledger: SimSystem = {
  contract: {
    name: 'ledger',
    phase: 'consolidation',
    cadence: { kind: 'annual' },
    reads: [
      'pop.province',
      'pop.culture',
      'pop.religion',
      'pop.stratum',
      'pop.size',
      'province.owner',
      'polity.ended',
    ],
    writes: [
      'pop.#rows',
      'pop.province',
      'pop.culture',
      'pop.religion',
      'pop.stratum',
      'pop.size',
      'province.owner',
    ],
    emits: ['territory.changed'],
    consumes: ['popDeltas', 'territoryRequests'],
  },
  run(w, tick) {
    const tally = emptyTally();
    const created = new Map<number, number[]>();
    applyPopDeltas(w, tally, created);
    mergeSmallPops(w, tally, created);
    applyTerritory(w, tally, tick);
    w.buffers.popDeltas.clear();
    w.buffers.territoryRequests.clear();
    w.ledger = tally;
  },
};
