// Carga de prueba (SOLO tests): productores sintéticos con la forma de los sistemas reales, para
// ejercitar el ledger, el derive, el guard y los invariantes durante cientos de años antes de
// que existan los sistemas de P1.3. No es un modelo: es azar del RNG con casos borde a propósito
// (muertes mayores que el pop, transferencias a claves nuevas, solicitudes de territorio en
// conflicto).
import { events, rng } from '@ws/core';
import { PopDeltaKind, popDeltaCause, territoryCause } from '../buffers';
import type { SimSystem } from '../context';
import { isActivePolity } from '../state';

const S = rng.Streams.test;
const SUB_DEMOGRAPHY = 11;
const SUB_POLITICS = 12;

const registry = new events.EventRegistry();
const polityFormed = registry.define<{ capital: number }>({
  key: 'polity.formed',
  threshold: 0,
  significance: () => 0.5,
});

/** Nacimientos, muertes (a veces mayores que el pop) y transferencias a claves nuevas. */
function demography(seed: number): SimSystem {
  return {
    contract: {
      name: 'testDemography',
      phase: 'consumption',
      cadence: { kind: 'annual' },
      reads: ['pop.province', 'pop.culture', 'pop.size'],
      writes: [],
      emits: [],
      produces: ['popDeltas'],
    },
    run(w, tick) {
      const { pop } = w.state;
      const b = w.buffers.popDeltas;
      b.reserve(pop.size * 3);
      const dPop = b.column('pop');
      const dKind = b.column('kind');
      const dCause = b.column('cause');
      const dPersons = b.column('persons');
      const toProvince = b.column('toProvince');
      const toCulture = b.column('toCulture');
      const province = pop.column('province');
      const culture = pop.column('culture');
      const size = pop.column('size');
      const { offsets, neighbors } = w.world.graph;
      for (let row = 0; row < pop.rowCount; row++) {
        if (!pop.aliveAt(row)) continue;
        const id = pop.idAt(row);
        const s = size[row] ?? 0;
        const u = (k: number) => rng.rngUniform(seed, S, SUB_DEMOGRAPHY, id, tick.year, k);
        let i = b.append();
        dPop[i] = id;
        dKind[i] = PopDeltaKind.birth;
        dCause[i] = popDeltaCause('natural');
        dPersons[i] = s * 0.03 * u(0);
        i = b.append();
        dPop[i] = id;
        dKind[i] = PopDeltaKind.death;
        dCause[i] = popDeltaCause(u(1) < 0.5 ? 'natural' : 'famine');
        dPersons[i] = u(2) < 0.01 ? s * 3 : s * 0.03 * u(3); // a veces mueren "más de los que hay"
        if (u(4) < 0.08) {
          const p = province[row] ?? 0;
          const degree = (offsets[p + 1] ?? 0) - (offsets[p] ?? 0);
          const move = u(5) < 0.5 && degree > 0;
          i = b.append();
          dPop[i] = id;
          dKind[i] = PopDeltaKind.transfer;
          dCause[i] = popDeltaCause(move ? 'migration' : 'assimilation');
          dPersons[i] = s * (u(6) < 0.05 ? 2 : 0.2); // a veces más de lo disponible
          toProvince[i] = move
            ? (neighbors[(offsets[p] ?? 0) + Math.floor(u(7) * degree)] ?? p)
            : p;
          toCulture[i] = move ? (culture[row] ?? 0) : ((culture[row] ?? 0) + 1) % 4;
        }
      }
    },
  };
}

/** Polities que nacen, se expanden, chocan y se extinguen. */
function politics(seed: number): SimSystem {
  return {
    contract: {
      name: 'testPolitics',
      phase: 'state',
      cadence: { kind: 'annual' },
      reads: ['province.owner', 'polity.ended'],
      writes: ['polity.*'],
      emits: ['polity.formed'],
      produces: ['territoryRequests'],
    },
    run(w, tick) {
      const { polity, province } = w.state;
      const t = w.buffers.territoryRequests;
      const owner = province.column('owner');
      const { polityProvincesStart } = w.derived;
      const { offsets, neighbors } = w.world.graph;
      const n = w.world.provinces.count;
      const u = (entity: number, k: number) =>
        rng.rngUniform(seed, S, SUB_POLITICS, entity, tick.year, k);

      // Extinción: activas sin provincias al inicio del tick (y no fundadas este año).
      for (const [id, record] of polity.entries()) {
        if (record.ended !== 0 || record.founded === tick.year) continue;
        const count = (polityProvincesStart[id + 1] ?? 0) - (polityProvincesStart[id] ?? 0);
        if (count === 0) {
          polity.set(id, 'ended', tick.year);
          polity.set(id, 'endReason', 1);
        }
      }

      for (let p = 1; p <= n; p++) {
        const o = owner[p - 1] ?? 0;
        if (o === 0) {
          if (u(p, 0) < 0.004) {
            const id = polity.add({ founded: tick.year, capital: p, colorSeed: p });
            const event = tick.events.emit(polityFormed, {
              actors: [{ kind: 'polity', id }],
              place: { kind: 'province', id: p },
              data: { capital: p },
            });
            t.push({
              province: p,
              newOwner: id,
              cause: territoryCause('formation'),
              causeEvent: event ?? 0,
            });
          }
          continue;
        }
        if (!isActivePolity(w.state, o)) continue;
        const degree = (offsets[p + 1] ?? 0) - (offsets[p] ?? 0);
        if (degree === 0) continue;
        const q = neighbors[(offsets[p] ?? 0) + Math.floor(u(p, 1) * degree)] ?? p;
        const target = owner[q - 1] ?? 0;
        if (target === 0 && u(p, 2) < 0.05) {
          t.push({ province: q, newOwner: o, cause: territoryCause('expansion') });
        } else if (target !== 0 && target !== o && u(p, 3) < 0.02) {
          t.push({ province: q, newOwner: o, cause: territoryCause('warCession') });
        }
      }
    },
  };
}

export function testLoad(seed: number): readonly SimSystem[] {
  return [demography(seed), politics(seed)];
}
