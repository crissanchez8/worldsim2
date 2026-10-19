// Texto de un evento (P1.6): la plantilla es/en de `events.<tipo>` con los nombres resueltos desde
// el registro de entidades (los eventos guardan datos, no texto: regla de oro 8).
import { Innovations, SettlementLevels } from '@ws/content';
import type { events } from '@ws/core';
import type { TFunction } from 'i18next';
import type { EntityKind, EntityRef } from '../worker/sim-protocol';
import type { Registry } from './registry';

/** Nombre visible de una entidad (con respaldo "tipo id" si el registro no la tiene). */
export function entityName(t: TFunction, registry: Registry, ref: EntityRef): string {
  const named = (() => {
    switch (ref.kind) {
      case 'polity':
        return registry.polities.get(ref.id)?.name;
      case 'person':
        return registry.persons.get(ref.id)?.name;
      case 'settlement':
        return registry.settlements.get(ref.id)?.name;
      case 'culture':
        return registry.cultures.get(ref.id)?.name;
      case 'province':
      case 'war':
        return undefined;
    }
  })();
  if (named) return named;
  if (ref.kind === 'war') {
    const w = registry.wars.get(ref.id);
    if (w) {
      return t('live.entity.warBetween', {
        attacker: entityName(t, registry, { kind: 'polity', id: w.attacker }),
        defender: entityName(t, registry, { kind: 'polity', id: w.defender }),
      });
    }
  }
  return t(`live.entity.fallback.${ref.kind}` as 'live.entity.fallback.province', { id: ref.id });
}

const KINDS: readonly string[] = ['province', 'settlement', 'polity', 'person', 'culture', 'war'];

function asRef(ref: events.EntityRef | undefined): EntityRef | null {
  return ref && KINDS.includes(ref.kind) ? { kind: ref.kind as EntityKind, id: ref.id } : null;
}

/** Entidad principal de un evento (a la que lleva un clic en el teletipo). */
export function mainEntity(e: events.GameEvent): EntityRef | null {
  return asRef(e.actors[0]) ?? asRef(e.place);
}

/** Provincia donde ocurrió (para centrar el mapa), si tiene. */
export function eventProvince(e: events.GameEvent): number {
  return e.place?.kind === 'province' ? e.place.id : 0;
}

export function eventText(t: TFunction, registry: Registry, e: events.GameEvent): string {
  const name = (kind: EntityKind, id: number) =>
    id === 0 ? t('live.entity.none') : entityName(t, registry, { kind, id });
  const actor = (kind: string, n = 0) => e.actors.filter((a) => a.kind === kind)[n]?.id ?? 0;
  const data = e.data as Readonly<Record<string, number | string | boolean>>;
  const num = (key: string) => Number(data[key] ?? 0);
  // El nombre del nivel va en medio de la oración: en minúscula ("ahora es ciudad").
  const levelName = (level: number) =>
    t(
      `content.settlementLevel.${SettlementLevels.rows[level]?.key ?? 'village'}` as 'content.settlementLevel.village',
    ).toLocaleLowerCase();
  const params = {
    province: name('province', e.place?.kind === 'province' ? e.place.id : 0),
    polity: name('polity', actor('polity')),
    by: name('polity', num('by')),
    from: name('polity', num('from')),
    to: name('polity', num('to')),
    attacker: name('polity', actor('polity', 0)),
    defender: name('polity', actor('polity', 1)),
    person: name('person', actor('person')),
    settlement: name('settlement', actor('settlement')),
    innovation: t(
      `content.innovation.${Innovations.rows[num('innovation')]?.key ?? 'agriculture'}` as 'content.innovation.agriculture',
    ),
    level: levelName(num('to')),
    age: num('age'),
  };
  return t(`events.${e.type}` as 'events.war.declared', params);
}
