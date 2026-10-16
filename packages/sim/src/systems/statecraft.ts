// statecraft v1 (P1.3; docs/model.md §5.8 y §9): jefaturas que nacen de pueblos agrícolas sin
// dueño, expansión a provincias vecinas sin dueño dentro del alcance administrativo, absorción
// pacífica de vecinos chicos de la misma cultura, capital que se muda si se pierde y fin de las
// polities que se quedan sin provincias. Todo cambio de territorio va por `territoryRequests`.
// No hace: régimen, estabilidad, fisco, administración, vasallos (P7).
import { Laws, SettlementLevels } from '@ws/content';
import { rng } from '@ws/core';
import { territoryCause } from '../buffers';
import { STATECRAFT } from '../config';
import type { SimContext, SimSystem } from '../context';
import { assignName } from '../names';
import { POLITY_END_REASONS } from '../state';
import { settlementLevels } from './knowledge';
import { administrativeReach, capitalDistances, neighborsOfPolity, provincesOf } from './power';
import { agrarianShare } from './production';

const TOWN = SettlementLevels.indexOf('town');
const PRIMOGENITURE = Laws.indexOf('primogeniture');
const ABSORBED = POLITY_END_REASONS.indexOf('absorbed');
const CONQUERED = POLITY_END_REASONS.indexOf('conquered');
const SUB_FORMATION = 1;
const SUB_ABSORPTION = 2;
const SUB_EXPANSION = 3;
const SUB_COLOR = 4;

function endPolity(w: SimContext, id: number, year: number, reason: number): void {
  const { polity, title } = w.state;
  polity.set(id, 'ended', year);
  polity.set(id, 'endReason', reason);
  const t = polity.get(id)?.primaryTitle ?? 0;
  if (t !== 0) title.set(t, 'destroyed', year);
}

export const statecraft: SimSystem = {
  contract: {
    name: 'statecraft',
    phase: 'state',
    cadence: { kind: 'annual' },
    reads: [
      'province.owner',
      'province.cropShare',
      'province.knownInnovations',
      'pop.province',
      'pop.culture',
      'pop.size',
      'settlement.province',
      'settlement.level',
      'culture.language',
      'language.phonologySeed',
    ],
    writes: [
      'polity.#rows',
      'polity.name',
      'polity.founded',
      'polity.ended',
      'polity.endReason',
      'polity.capital',
      'polity.colorSeed',
      'polity.primaryTitle',
      'polity.succession',
      'title.#rows',
      'title.polity',
      'title.level',
      'title.created',
      'title.destroyed',
      'name.own',
    ],
    emits: ['polity.formed', 'polity.absorbed', 'polity.collapsed'],
    produces: ['territoryRequests'],
  },
  run(w, tick) {
    const { polity, title, province, culture } = w.state;
    const seed = w.world.params.seed;
    const year = tick.year;
    const { count } = w.world.provinces;
    const { provincePopulation, polityPopulation, majorityCulture } = w.derived;
    const owner = province.column('owner');
    const requests = w.buffers.territoryRequests;
    const busy = new Set<number>(); // polities que ya absorbieron o fueron absorbidas este tick

    // 1 · Fin de polities sin provincias y capitales perdidas.
    for (const [id, rec] of polity.entries()) {
      if (rec.ended !== 0) continue;
      const own = provincesOf(w, id);
      if (own.length === 0) {
        if (rec.founded >= year) continue;
        endPolity(w, id, year, CONQUERED);
        tick.events.emit(w.types.polityCollapsed, {
          actors: [{ kind: 'polity', id }],
          ...(rec.capital === 0 ? {} : { place: { kind: 'province', id: rec.capital } }),
          causes: [{ kind: 'fact', entity: { kind: 'polity', id }, field: 'provinces', year }],
          data: { founded: rec.founded, years: year - rec.founded },
        });
        continue;
      }
      if ((owner[rec.capital - 1] ?? 0) !== id) {
        let best = own[0] ?? 0;
        for (const p of own)
          if ((provincePopulation[p] ?? 0) > (provincePopulation[best] ?? 0)) best = p;
        polity.set(id, 'capital', best);
      }
    }

    // 2 · Absorción pacífica de vecinos chicos de la misma cultura.
    for (const [id, rec] of polity.entries()) {
      if (rec.ended !== 0 || busy.has(id)) continue;
      const own = provincesOf(w, id);
      if (own.length === 0 || own.length > STATECRAFT.absorbMaxProvinces) continue;
      const myCulture = majorityCulture[rec.capital] ?? 0;
      let absorber = 0;
      for (const a of neighborsOfPolity(w, id)) {
        const other = polity.get(a);
        if (other?.ended !== 0 || busy.has(a)) continue;
        if (
          (polityPopulation[a] ?? 0) <
          STATECRAFT.absorbPopulationRatio * (polityPopulation[id] ?? 0)
        )
          continue;
        if ((majorityCulture[other.capital] ?? 0) !== myCulture) continue;
        if (absorber === 0 || (polityPopulation[a] ?? 0) > (polityPopulation[absorber] ?? 0))
          absorber = a;
      }
      if (absorber === 0) continue;
      if (
        rng.rngUniform(seed, rng.Streams.statecraft, SUB_ABSORPTION, id, year, 0) >=
        STATECRAFT.absorbChance
      ) {
        continue;
      }
      busy.add(id);
      busy.add(absorber);
      const event =
        tick.events.emit(w.types.polityAbsorbed, {
          actors: [
            { kind: 'polity', id },
            { kind: 'polity', id: absorber },
          ],
          place: { kind: 'province', id: rec.capital },
          data: { by: absorber, provinces: own.length },
        }) ?? 0;
      for (const p of own) {
        requests.push({
          province: p,
          newOwner: absorber,
          cause: territoryCause('absorption'),
          causeEvent: event,
        });
      }
      endPolity(w, id, year, ABSORBED);
    }

    // 3 · Expansión a provincias vecinas sin dueño, dentro del alcance desde la capital.
    for (const [id, rec] of polity.entries()) {
      if (rec.ended !== 0 || busy.has(id)) continue;
      const own = provincesOf(w, id);
      if (own.length === 0) continue;
      const reach = administrativeReach(w, id);
      const strength = Math.min(
        STATECRAFT.expansionStrengthMax,
        Math.max(
          STATECRAFT.expansionStrengthMin,
          Math.sqrt((polityPopulation[id] ?? 0) / STATECRAFT.expansionPopulationRef),
        ),
      );
      const { frontier: border } = capitalDistances(w, id);
      const frontierCost = new Map<number, number>();
      for (const [q, cost] of border) {
        if ((owner[q - 1] ?? 0) !== 0 || cost >= reach) continue;
        if ((provincePopulation[q] ?? 0) < STATECRAFT.expansionMinPopulation) continue;
        frontierCost.set(q, cost);
      }
      const frontier = [...frontierCost.keys()].sort((a, b) => a - b);
      for (const q of frontier) {
        const cost = frontierCost.get(q) ?? reach;
        const chance = STATECRAFT.expansionRate * (1 - cost / reach) * strength;
        if (rng.rngUniform(seed, rng.Streams.statecraft, SUB_EXPANSION, q, year, id) < chance) {
          requests.push({ province: q, newOwner: id, cause: territoryCause('expansion') });
        }
      }
    }

    // 4 · Formación de jefaturas en pueblos agrícolas sin dueño.
    const levels = settlementLevels(w.state.settlement, count);
    const crop = province.column('cropShare');
    for (let p = 1; p <= count; p++) {
      if ((owner[p - 1] ?? 0) !== 0 || (levels[p] ?? -1) < TOWN) continue;
      if (agrarianShare(crop[p - 1] ?? 0) < STATECRAFT.formationMinCrop) continue;
      if (
        rng.rngUniform(seed, rng.Streams.statecraft, SUB_FORMATION, p, year, 0) >=
        STATECRAFT.formationChance
      ) {
        continue;
      }
      const language = culture.get(majorityCulture[p] ?? 0)?.language ?? 0;
      const name =
        language === 0 ? 0 : assignName(w.state, seed, language, 'polity', year, 'statecraft');
      const id = polity.add({
        name,
        founded: year,
        capital: p,
        colorSeed: rng.rngUint32(seed, rng.Streams.statecraft, SUB_COLOR, p, year, 0),
        succession: PRIMOGENITURE,
      });
      const t = title.add({ polity: id, level: 0, created: year });
      polity.set(id, 'primaryTitle', t);
      const event =
        tick.events.emit(w.types.polityFormed, {
          actors: [{ kind: 'polity', id }],
          place: { kind: 'province', id: p },
          causes: [
            { kind: 'fact', entity: { kind: 'province', id: p }, field: 'settlement', year },
          ],
          data: { capital: p, population: provincePopulation[p] ?? 0 },
        }) ?? 0;
      requests.push({
        province: p,
        newOwner: id,
        cause: territoryCause('formation'),
        causeEvent: event,
      });
    }
  },
};
