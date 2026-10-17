import type { events } from '@ws/core';
import { createI18n } from '@ws/i18n';
import { describe, expect, it } from 'vitest';
import { entityName, eventText, mainEntity } from './event-text';
import { Registry } from './registry';
import { RulerIndex } from './ruler-index';

const registry = new Registry();
registry.apply({
  polities: [
    [1, { name: 'Ashkur', founded: -2310, ended: 0, endReason: 0, title: 1 }],
    [2, { name: 'Tell Bar', founded: -2702, ended: -1012, endReason: 2, title: 2 }],
  ],
  settlements: [[7, { name: 'Oru', province: 5, founded: -3000 }]],
  cultures: [],
  languages: [],
  persons: [[9, { name: 'Taru', sex: 1, father: 0, mother: 0, born: -1060, died: 0, culture: 0 }]],
  wars: [[3, { attacker: 1, defender: 2, started: -1019, ended: -1012, outcome: 1 }]],
  titles: [],
});

const ev = (
  type: string,
  actors: events.EntityRef[],
  data: events.GameEvent['data'] = {},
  place?: events.EntityRef,
): events.GameEvent => ({
  id: 1,
  type,
  year: -1012,
  actors,
  ...(place ? { place } : {}),
  causes: [],
  data,
  significance: 0.5,
});

describe('texto de los eventos', () => {
  it('resuelve nombres del registro y arma la plantilla del idioma', () => {
    const es = createI18n('es');
    const war = ev('war.declared', [
      { kind: 'polity', id: 1 },
      { kind: 'polity', id: 2 },
    ]);
    expect(eventText(es.t, registry, war)).toBe('Ashkur declara la guerra a Tell Bar');
    const land = ev(
      'territory.changed',
      [{ kind: 'polity', id: 1 }],
      { from: 0, to: 1 },
      {
        kind: 'province',
        id: 5,
      },
    );
    expect(eventText(es.t, registry, land)).toBe('provincia 5 pasa de tierra libre a Ashkur');
    const grew = ev('settlement.grew', [{ kind: 'settlement', id: 7 }], { from: 0, to: 2 });
    expect(eventText(es.t, registry, grew)).toBe('Oru crece: ahora es ciudad');
    const en = createI18n('en');
    expect(eventText(en.t, registry, war)).toBe('Ashkur declares war on Tell Bar');
  });

  it('sin registro, el nombre cae en "tipo id"; las guerras se nombran por sus bandos', () => {
    const es = createI18n('es');
    expect(entityName(es.t, registry, { kind: 'polity', id: 99 })).toBe('estado 99');
    expect(entityName(es.t, registry, { kind: 'war', id: 3 })).toBe(
      'guerra entre Ashkur y Tell Bar',
    );
  });

  it('la entidad principal de un evento: el primer actor o el lugar', () => {
    expect(mainEntity(ev('famine.started', [], {}, { kind: 'province', id: 4 }))).toEqual({
      kind: 'province',
      id: 4,
    });
    expect(mainEntity(ev('person.died', [{ kind: 'person', id: 9 }]))).toEqual({
      kind: 'person',
      id: 9,
    });
  });
});

describe('gobernante a la fecha', () => {
  it('sale de los eventos de sucesión, no del estado de la cabeza', () => {
    const index = new RulerIndex();
    const log: events.GameEvent[][] = [[], [], []];
    log[0]?.push(
      ev('ruler.succeeded', [
        { kind: 'person', id: 8 },
        { kind: 'polity', id: 1 },
      ]),
    );
    log[2]?.push(
      ev('ruler.succeeded', [
        { kind: 'person', id: 9 },
        { kind: 'polity', id: 1 },
      ]),
    );
    index.update(log);
    expect(index.rulerAt(1, 0)).toBe(0);
    expect(index.rulerAt(1, 1)).toBe(8);
    expect(index.rulerAt(1, 2)).toBe(8);
    expect(index.rulerAt(1, 3)).toBe(9);
    expect(index.reignsUntil(1, 2).map((r) => r.person)).toEqual([8]);
    expect(index.ruledBy(9)).toEqual([1]);
  });
});
