// military v1 (P1.3; docs/model.md §5.11 y §9): guerra abstracta. Cada guerra tiene una campaña
// por año, en una estación sorteada: una batalla en una provincia del defensor que linda con el
// atacante, decidida por fuerza (con ventaja del defensor y castigo por cansancio) + azar. Las
// bajas van como `popDeltas` (causa guerra); si gana el atacante, la provincia se cede por
// `territoryRequests` (con tope por guerra). El frente guarda puntaje, cansancio y ganancias.
// No hace: ejércitos en el mapa, logística, sitios, generales (P9).
import { rng } from '@ws/core';
import { PopDeltaKind, popDeltaCause, territoryCause } from '../buffers';
import { WAR } from '../config';
import type { SimContext, SimSystem } from '../context';
import { isActivePolity } from '../state';
import { administrativeReach, capitalDistances, militaryStrength, provincesOf } from './power';

const WAR_DEATH = popDeltaCause('war');
const SUB_SEASON = 1;
const SUB_BATTLE = 2;

/** Muertes repartidas entre los pops de una provincia, en proporción a su tamaño. */
function killIn(w: SimContext, province: number, persons: number): void {
  const { pop } = w.state;
  const total = w.derived.provincePopulation[province] ?? 0;
  if (!(total > 0) || !(persons > 0)) return;
  const { popRowsStart, popRows } = w.derived;
  const size = pop.column('size');
  for (let k = popRowsStart[province] ?? 0; k < (popRowsStart[province + 1] ?? 0); k++) {
    const row = popRows[k] ?? 0;
    w.buffers.popDeltas.push({
      pop: pop.idAt(row),
      kind: PopDeltaKind.death,
      cause: WAR_DEATH,
      persons: (persons * (size[row] ?? 0)) / total,
    });
  }
}

export const military: SimSystem = {
  contract: {
    name: 'military',
    phase: 'war',
    cadence: { kind: 'seasonal' },
    reads: [
      'war.*',
      'polity.*',
      'province.owner',
      'province.knownInnovations',
      'pop.province',
      'pop.size',
    ],
    writes: ['front.*'],
    emits: ['battle.fought'],
    produces: ['popDeltas', 'territoryRequests'],
  },
  run(w, tick) {
    const season = tick.season ?? 0;
    const { war, front } = w.state;
    const year = tick.year;
    const seed = w.world.params.seed;
    const owner = w.state.province.column('owner');
    const { offsets, neighbors } = w.world.graph;
    const fronts = new Map<number, number>();
    for (const [id, f] of front.entries()) fronts.set(f.war, id);

    for (const [wid, rec] of war.entries()) {
      if (rec.ended !== 0) continue;
      const a = rec.attacker;
      const d = rec.defender;
      if (!isActivePolity(w.state, a) || !isActivePolity(w.state, d)) continue;
      const campaign = Math.floor(
        rng.rngUniform(seed, rng.Streams.military, SUB_SEASON, wid, year, 0) * 4,
      );
      if (campaign !== season) continue;

      // Lugar: provincia del defensor lindera con el atacante (y la del atacante desde la que se ataca).
      const places: number[] = [];
      const sources = new Map<number, number>();
      for (const p of provincesOf(w, a)) {
        for (let e = offsets[p] ?? 0; e < (offsets[p + 1] ?? 0); e++) {
          const q = neighbors[e] ?? 0;
          if ((owner[q - 1] ?? 0) !== d) continue;
          if (!sources.has(q)) {
            sources.set(q, p);
            places.push(q);
          }
        }
      }
      let fid = fronts.get(wid) ?? 0;
      if (fid === 0) {
        fid = front.add({ war: wid, lastContact: rec.started });
        fronts.set(wid, fid);
      }
      const f = front.require(fid);
      const exhaustA = Math.min(1, f.attackerExhaustion + WAR.exhaustionPerCampaign);
      const exhaustD = Math.min(1, f.defenderExhaustion + WAR.exhaustionPerCampaign);
      if (places.length === 0) {
        front.set(fid, 'attackerExhaustion', exhaustA);
        front.set(fid, 'defenderExhaustion', exhaustD);
        continue;
      }
      places.sort((x, y) => x - y);
      const draw = rng.createRng(seed).stream(rng.Streams.military).sub(SUB_BATTLE).at(wid, year);
      const place = places[draw.int(places.length)] ?? 0;
      const source = sources.get(place) ?? 0;

      const strengthA = militaryStrength(w, a);
      const strengthD = militaryStrength(w, d);
      const sA = strengthA * (1 - WAR.exhaustionPenalty * f.attackerExhaustion);
      const sD = strengthD * WAR.defenseBonus * (1 - WAR.exhaustionPenalty * f.defenderExhaustion);
      const attackerWon = draw.uniform() < sA / Math.max(1e-9, sA + sD);
      const armyA = (w.derived.polityPopulation[a] ?? 0) * WAR.armyShare;
      const armyD = (w.derived.polityPopulation[d] ?? 0) * WAR.armyShare;
      const lossA = armyA * (attackerWon ? WAR.winnerLosses : WAR.loserLosses);
      const lossD = armyD * (attackerWon ? WAR.loserLosses : WAR.winnerLosses);
      killIn(w, source, lossA);
      killIn(w, place, lossD);

      const score = Math.max(
        -WAR.maxScore,
        Math.min(WAR.maxScore, f.score + (attackerWon ? 1 : -1) * WAR.battleScore),
      );
      front.set(fid, 'score', score);
      front.set(
        fid,
        'attackerExhaustion',
        Math.min(1, exhaustA + (attackerWon ? WAR.exhaustionWinner : WAR.exhaustionLoser)),
      );
      front.set(
        fid,
        'defenderExhaustion',
        Math.min(1, exhaustD + (attackerWon ? WAR.exhaustionLoser : WAR.exhaustionWinner)),
      );
      front.set(fid, 'lastContact', year);

      const battle =
        tick.events.emit(w.types.battleFought, {
          actors: [
            { kind: 'polity', id: a },
            { kind: 'polity', id: d },
          ],
          place: { kind: 'province', id: place },
          season,
          data: { war: wid, attackerLosses: lossA, defenderLosses: lossD, attackerWon },
        }) ?? 0;
      const ratio = strengthA / Math.max(1, strengthD);
      const maxGain = WAR.maxGainBase + Math.floor(Math.max(0, ratio - 1));
      // Solo se anexa lo que la administración del atacante alcanza a gobernar.
      const distance = capitalDistances(w, a).frontier.get(place) ?? Infinity;
      const governable = distance <= WAR.annexReach * administrativeReach(w, a);
      if (attackerWon && governable && f.gained < maxGain) {
        front.set(fid, 'gained', f.gained + 1);
        w.buffers.territoryRequests.push({
          province: place,
          newOwner: a,
          cause: territoryCause('warCession'),
          causeEvent: battle,
        });
      }
    }
  },
};
