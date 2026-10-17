// Arma los deltas del registro de entidades en el Worker (P1.6): registros nuevos y los que
// cambiaron en sus campos mutables (fin, muerte, resultado). Recorre las tablas: barato a la
// cadencia con la que se llama (como mucho unas veces por segundo).
import { nameText, type SimState } from '@ws/sim';
import type { RegistryDelta } from '../live/registry';

type Pairs<T> = [number, T][];

export class RegistryTracker {
  /** Firma de los campos mutables de lo ya enviado, por tabla. */
  private readonly sent = {
    polities: new Map<number, string>(),
    settlements: new Map<number, string>(),
    cultures: new Map<number, string>(),
    languages: new Map<number, string>(),
    persons: new Map<number, string>(),
    wars: new Map<number, string>(),
    titles: new Map<number, string>(),
  };

  /** Lo nuevo o cambiado desde la llamada anterior (todo, la primera vez). */
  delta(state: SimState): RegistryDelta {
    const out = {
      polities: [] as Pairs<RegistryDelta['polities'][number][1]>,
      settlements: [] as Pairs<RegistryDelta['settlements'][number][1]>,
      cultures: [] as Pairs<RegistryDelta['cultures'][number][1]>,
      languages: [] as Pairs<RegistryDelta['languages'][number][1]>,
      persons: [] as Pairs<RegistryDelta['persons'][number][1]>,
      wars: [] as Pairs<RegistryDelta['wars'][number][1]>,
      titles: [] as Pairs<RegistryDelta['titles'][number][1]>,
    };
    const changed = (table: Map<number, string>, id: number, signature: string) => {
      if (table.get(id) === signature) return false;
      table.set(id, signature);
      return true;
    };
    for (const [id, r] of state.polity.entries()) {
      if (!changed(this.sent.polities, id, `${r.ended}|${r.endReason}|${r.primaryTitle}`)) continue;
      out.polities.push([
        id,
        {
          name: nameText(state, r.name),
          founded: r.founded,
          ended: r.ended,
          endReason: r.endReason,
          title: r.primaryTitle,
        },
      ]);
    }
    const { settlement } = state;
    for (const id of settlement.ids()) {
      if (!changed(this.sent.settlements, id, '')) continue;
      out.settlements.push([
        id,
        {
          name: nameText(state, settlement.get(id, 'name')),
          province: settlement.get(id, 'province'),
          founded: settlement.get(id, 'founded'),
        },
      ]);
    }
    for (const [id, r] of state.culture.entries()) {
      if (!changed(this.sent.cultures, id, '')) continue;
      out.cultures.push([
        id,
        {
          name: nameText(state, r.name),
          founded: r.founded,
          origin: r.originProvince,
          language: r.language,
        },
      ]);
    }
    for (const [id, r] of state.language.entries()) {
      if (!changed(this.sent.languages, id, '')) continue;
      out.languages.push([id, { name: nameText(state, r.name) }]);
    }
    for (const [id, r] of state.person.entries()) {
      if (!changed(this.sent.persons, id, `${r.died}`)) continue;
      out.persons.push([
        id,
        {
          name: nameText(state, r.name),
          sex: r.sex,
          father: r.father,
          mother: r.mother,
          born: r.born,
          died: r.died,
          culture: r.culture,
        },
      ]);
    }
    for (const [id, r] of state.war.entries()) {
      if (!changed(this.sent.wars, id, `${r.ended}|${r.outcome}`)) continue;
      out.wars.push([
        id,
        {
          attacker: r.attacker,
          defender: r.defender,
          started: r.started,
          ended: r.ended,
          outcome: r.outcome,
        },
      ]);
    }
    for (const [id, r] of state.title.entries()) {
      if (!changed(this.sent.titles, id, `${r.destroyed}`)) continue;
      out.titles.push([id, { polity: r.polity, created: r.created, destroyed: r.destroyed }]);
    }
    return out;
  }
}

/** ¿El delta trae algo? */
export function isEmptyDelta(d: RegistryDelta): boolean {
  return (
    d.polities.length +
      d.settlements.length +
      d.cultures.length +
      d.languages.length +
      d.persons.length +
      d.wars.length +
      d.titles.length ===
    0
  );
}
