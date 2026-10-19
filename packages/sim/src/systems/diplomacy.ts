// diplomacy v1 (P1.3; docs/model.md §5.11 y §9): guerra y paz. Una polity declara a su vecina
// más débil si la ventaja de fuerza alcanza y pasó su enfriamiento; la paz llega por cansancio,
// por puntaje máximo, por falta de contacto o porque uno de los bandos desaparece. Topes contra
// H-07: una guerra ofensiva por polity, una guerra por par, enfriamiento después de cada guerra.
// No hace: alianzas, coaliciones, objetivos de guerra, agenda (P9).
import { rng } from '@ws/core';
import { WAR } from '../config';
import type { SimSystem } from '../context';
import { isActivePolity, WAR_OUTCOMES } from '../state';
import { militaryStrength, neighborsOfPolity } from './power';

const SUB_DECLARE = 1;
const ATTACKER = WAR_OUTCOMES.indexOf('attackerVictory');
const DEFENDER = WAR_OUTCOMES.indexOf('defenderVictory');
const WHITE = WAR_OUTCOMES.indexOf('whitePeace');

export const diplomacy: SimSystem = {
  contract: {
    name: 'diplomacy',
    phase: 'diplomacy',
    cadence: { kind: 'annual' },
    reads: [
      'polity.*',
      'front.*',
      'province.owner',
      'province.knownInnovations',
      'pop.province',
      'pop.size',
    ],
    writes: ['war.*', 'polity.warCooldownUntil'],
    emits: ['war.declared', 'war.ended', 'treaty.signed'],
  },
  run(w, tick) {
    const { war, front, polity } = w.state;
    const year = tick.year;
    const seed = w.world.params.seed;
    const fronts = new Map<number, number>();
    for (const [id, f] of front.entries()) fronts.set(f.war, id);

    // 1 · Paz.
    for (const [id, rec] of war.entries()) {
      if (rec.ended !== 0) continue;
      const f = front.get(fronts.get(id) ?? 0);
      const attackerAlive = isActivePolity(w.state, rec.attacker);
      const defenderAlive = isActivePolity(w.state, rec.defender);
      const score = f?.score ?? 0;
      const lastContact = f?.lastContact ?? rec.started;
      const over =
        !attackerAlive ||
        !defenderAlive ||
        (f?.attackerExhaustion ?? 0) >= 1 ||
        (f?.defenderExhaustion ?? 0) >= 1 ||
        Math.abs(score) >= WAR.maxScore ||
        year - lastContact > WAR.noContactYears;
      if (!over) continue;
      const outcome = !defenderAlive
        ? ATTACKER
        : !attackerAlive
          ? DEFENDER
          : score >= WAR.victoryScore
            ? ATTACKER
            : score <= -WAR.victoryScore
              ? DEFENDER
              : WHITE;
      war.set(id, 'ended', year);
      war.set(id, 'outcome', outcome);
      for (const p of [rec.attacker, rec.defender]) {
        if (isActivePolity(w.state, p)) polity.set(p, 'warCooldownUntil', year + WAR.cooldownYears);
      }
      const gained = f?.gained ?? 0;
      const actors = [
        { kind: 'polity', id: rec.attacker },
        { kind: 'polity', id: rec.defender },
      ];
      const ended =
        tick.events.emit(w.types.warEnded, {
          actors,
          data: {
            war: id,
            outcome: WAR_OUTCOMES[outcome] ?? 'whitePeace',
            years: year - rec.started,
            gained,
          },
        }) ?? 0;
      tick.events.emit(w.types.treatySigned, {
        actors,
        causes: ended === 0 ? [] : [{ kind: 'event', id: ended }],
        data: { war: id, kind: WAR_OUTCOMES[outcome] ?? 'whitePeace', gained },
      });
    }

    // 2 · Declaraciones.
    const attacking = new Set<number>();
    const pairs = new Set<string>();
    for (const [, rec] of war.entries()) {
      if (rec.ended !== 0) continue;
      attacking.add(rec.attacker);
      pairs.add(`${Math.min(rec.attacker, rec.defender)}:${Math.max(rec.attacker, rec.defender)}`);
    }
    for (const [id, rec] of polity.entries()) {
      // warCooldownUntil = 0 significa "sin enfriamiento" (en años a.C., 0 > año sería cierto).
      const cooling = rec.warCooldownUntil !== 0 && rec.warCooldownUntil > year;
      if (rec.ended !== 0 || attacking.has(id) || cooling) continue;
      const strength = militaryStrength(w, id);
      if (!(strength > 0)) continue;
      let target = 0;
      let ratio = 0;
      for (const b of neighborsOfPolity(w, id)) {
        if (!isActivePolity(w.state, b) || pairs.has(`${Math.min(id, b)}:${Math.max(id, b)}`))
          continue;
        const r = strength / Math.max(1, militaryStrength(w, b));
        if (r > ratio || (r === ratio && b < target)) {
          ratio = r;
          target = b;
        }
      }
      if (target === 0 || ratio < WAR.declareMinRatio) continue;
      const chance = WAR.declareChance * Math.min(1, ratio - 1);
      if (rng.rngUniform(seed, rng.Streams.diplomacy, SUB_DECLARE, id, year, 0) >= chance) continue;
      const wid = war.add({ attacker: id, defender: target, started: year });
      attacking.add(id);
      pairs.add(`${Math.min(id, target)}:${Math.max(id, target)}`);
      tick.events.emit(w.types.warDeclared, {
        actors: [
          { kind: 'polity', id },
          { kind: 'polity', id: target },
        ],
        causes: [{ kind: 'fact', entity: { kind: 'polity', id }, field: 'strength', year }],
        data: { war: wid, ratio, realm: w.derived.polityPopulation[id] ?? 0 },
      });
    }
  },
};
