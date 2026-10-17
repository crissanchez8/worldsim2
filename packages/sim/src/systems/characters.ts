// characters + succession v1 (P1.3; docs/model.md §5.9 y §9): cada título tiene un titular y un
// heredero (`Person`, registro permanente). characters los hace envejecer y morir, y asegura un
// heredero: un hijo del titular si está en edad, o un candidato adulto sin vínculo si el título
// quedó vacante. succession pone al heredero cuando el titular falta (primogenitura).
// No hace: rasgos, casas, matrimonios, regencias, crisis sucesorias (P7).
import { math, rng } from '@ws/core';
import { CHARACTERS } from '../config';
import type { SimContext, SimSystem } from '../context';
import { assignName } from '../names';
import { DEATH_CAUSES, type SimState } from '../state';

const NATURAL = DEATH_CAUSES.indexOf('natural');
const SUB_DEATH = 1;
const SUB_BIRTH = 2;
const SUB_CANDIDATE = 3;

/** Probabilidad anual de morir a una edad (per_year): base + a·e^(b·edad) + infantil. */
export function mortality(age: number): number {
  const child = age < CHARACTERS.childAgeYears ? CHARACTERS.childMortality : 0;
  const q =
    CHARACTERS.mortalityBase +
    CHARACTERS.mortalityA * math.exp(CHARACTERS.mortalityB * age) +
    child;
  return Math.min(1, q);
}

function alive(state: SimState, person: number): boolean {
  return person !== 0 && state.person.get(person)?.died === 0;
}

function newPerson(
  w: SimContext,
  year: number,
  born: number,
  culture: number,
  father: number,
  mother: number,
  sex: number,
): number {
  const language = w.state.culture.get(culture)?.language ?? 0;
  const name =
    language === 0
      ? 0
      : assignName(w.state, w.world.params.seed, language, 'person', year, 'characters');
  return w.state.person.add({ name, sex, father, mother, born, culture });
}

export const characters: SimSystem = {
  contract: {
    name: 'characters',
    phase: 'society',
    cadence: { kind: 'annual' },
    reads: [
      'title.*',
      'polity.capital',
      'pop.culture',
      'pop.size',
      'culture.language',
      'language.phonologySeed',
    ],
    writes: ['person.*', 'title.heir', 'name.own'],
    emits: ['person.died'],
  },
  run(w, tick) {
    const { title, person, polity } = w.state;
    const seed = w.world.params.seed;
    const year = tick.year;
    const stream = rng.createRng(seed).stream(rng.Streams.characters);

    const die = (id: number, ruler: boolean, realm: number) => {
      const rec = person.require(id);
      const age = year - rec.born;
      if (stream.sub(SUB_DEATH).at(id, year).uniform() >= mortality(age)) return false;
      person.set(id, 'died', year);
      person.set(id, 'deathCause', NATURAL);
      tick.events.emit(w.types.personDied, {
        actors: [{ kind: 'person', id }],
        data: { age, ruler, realm },
      });
      return true;
    };

    for (const [tid, t] of title.entries()) {
      if (t.destroyed !== 0) continue;
      const realm = w.derived.polityPopulation[t.polity] ?? 0;
      const capital = polity.get(t.polity)?.capital ?? 0;
      if (alive(w.state, t.holder)) die(t.holder, true, realm);
      const holderAlive = alive(w.state, t.holder);
      let heirValid = t.heir !== t.holder && alive(w.state, t.heir);
      if (heirValid && die(t.heir, false, realm)) heirValid = false;
      if (heirValid) continue;

      if (holderAlive) {
        const h = person.require(t.holder);
        const age = year - h.born;
        if (age < CHARACTERS.fertileFrom || age > CHARACTERS.fertileTo) continue;
        const d = stream.sub(SUB_BIRTH).at(t.holder, year);
        if (d.uniform() >= CHARACTERS.birthChance) continue;
        const sex = d.int(2);
        const male = h.sex === 1;
        const child = newPerson(
          w,
          year,
          year,
          h.culture,
          male ? t.holder : 0,
          male ? 0 : t.holder,
          sex,
        );
        title.set(tid, 'heir', child);
      } else {
        // Vacante sin heredero: un candidato adulto de la cultura de la capital.
        const d = stream.sub(SUB_CANDIDATE).at(tid, year);
        const age = d.intBetween(CHARACTERS.newRulerAgeMin, CHARACTERS.newRulerAgeMax);
        const culture = w.derived.majorityCulture[capital] ?? 0;
        const candidate = newPerson(w, year, year - age, culture, 0, 0, d.int(2));
        title.set(tid, 'heir', candidate);
      }
    }
  },
};

export const succession: SimSystem = {
  contract: {
    name: 'succession',
    phase: 'society',
    cadence: { kind: 'onEvent' },
    reads: ['title.*', 'person.died', 'person.father', 'person.mother'],
    writes: ['title.holder'],
    emits: ['ruler.succeeded'],
  },
  run(w, tick) {
    const { title, person } = w.state;
    for (const [tid, t] of title.entries()) {
      if (t.destroyed !== 0 || alive(w.state, t.holder)) continue;
      if (t.heir === t.holder || !alive(w.state, t.heir)) continue;
      const heir = person.require(t.heir);
      const previous = t.holder;
      const relation =
        previous === 0
          ? 'founder'
          : heir.father === previous || heir.mother === previous
            ? 'child'
            : 'other';
      title.set(tid, 'holder', t.heir);
      const died = previous === 0 ? 0 : (person.get(previous)?.died ?? 0);
      tick.events.emit(w.types.rulerSucceeded, {
        actors: [
          { kind: 'person', id: t.heir },
          { kind: 'polity', id: t.polity },
        ],
        causes:
          previous === 0
            ? []
            : [
                {
                  kind: 'fact',
                  entity: { kind: 'person', id: previous },
                  field: 'died',
                  year: died,
                },
              ],
        data: { title: tid, previous, relation, realm: w.derived.polityPopulation[t.polity] ?? 0 },
      });
    }
  },
};
