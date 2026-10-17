// Ficha de una entidad (P1.6, D57: el mismo componente es el inspector de la vista en vivo y la
// ficha del resumen). Lo que se ve "a la fecha" sale al instante del espejo de la historia y del
// registro (D50); el "por qué" se pide al Worker. Nada posterior a la fecha mostrada (D49).
import { Eras, Innovations, SettlementLevels } from '@ws/content';
import type { events } from '@ws/core';
import { formatYear } from '@ws/i18n';
import { NO_LEVEL } from '@ws/history';
import { POLITY_END_REASONS, WAR_OUTCOMES } from '@ws/sim';
import { type ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { entityName, eventText } from '../live/event-text';
import type { LiveSession } from '../live/live-session';
import type { EntityRef } from '../worker/sim-protocol';
import { type Density, EntityLink } from './EntityLink';
import { Fact, Facts, Inline } from './Facts';
import { formatPercent, formatPersons } from './format';
import { WhyPanel } from './WhyPanel';

export interface EntityCardProps {
  readonly session: LiveSession;
  readonly entity: EntityRef;
  /** Estado mostrado (la fecha de la ficha). */
  readonly k: number;
  readonly density: Density;
  readonly canContinue: boolean;
}

/** Cuántos eventos de la entidad se listan en una ficha (los más recientes). */
const PAGE_EVENTS = 200;
/** Elementos de una lista larga (gobernantes, guerras) que se muestran: los más recientes. */
const LIST_LIMIT = { panel: 5, page: 40 } as const;

function involves(e: events.GameEvent, ref: EntityRef): boolean {
  if (e.place?.kind === ref.kind && e.place.id === ref.id) return true;
  return e.actors.some((a) => a.kind === ref.kind && a.id === ref.id);
}

export function EntityCard({ session, entity, k, density, canContinue }: EntityCardProps) {
  const { t, i18n } = useTranslation();
  const history = session.history;
  const registry = session.registry;
  const year = session.yearAt(k);
  const frame = useMemo(() => history?.frameAtIndex(k), [history, k]);
  const series = useMemo(() => (k > 0 ? history?.seriesAt(year) : undefined), [history, k, year]);
  const pageEvents = useMemo(() => {
    if (density !== 'page' || !history) return [];
    const out: events.GameEvent[] = [];
    for (let i = Math.min(k, history.data.events.length) - 1; i >= 0; i--) {
      for (const e of history.data.events[i] ?? []) if (involves(e, entity)) out.push(e);
      if (out.length >= PAGE_EVENTS) break;
    }
    return out;
  }, [density, history, k, entity]);

  if (!history || !frame) return null;
  const name = (ref: EntityRef) => entityName(t, registry, ref);
  const link = (ref: EntityRef) =>
    ref.id === 0 ? (
      t('ui.inspector.none')
    ) : (
      <EntityLink entity={ref} density={density}>
        {name(ref)}
      </EntityLink>
    );
  const y = (value: number) => formatYear(i18n, value);
  const notYet = <p className="meta">{t('ui.inspector.notYet')}</p>;
  /** Los más recientes de una lista larga, con cuántos quedan antes. */
  const recent = (items: readonly ReactNode[]) => {
    if (items.length === 0) return t('ui.inspector.none');
    const shown = items.slice(-LIST_LIMIT[density]);
    const hidden = items.length - shown.length;
    return (
      <Inline>
        {hidden > 0 && <span className="meta">{t('ui.inspector.more', { count: hidden })}</span>}
        {shown}
      </Inline>
    );
  };

  const body = (() => {
    switch (entity.kind) {
      case 'province': {
        const p = entity.id;
        const level = frame.level[p] ?? NO_LEVEL;
        const settlement = [...registry.settlements.entries()].find(
          ([, s]) => s.province === p && s.founded <= year,
        );
        const bits = frame.innovations[p] ?? 0;
        const known = Innovations.rows.filter((_, i) => (bits & (1 << i)) !== 0);
        return (
          <Facts>
            <Fact label={t('ui.inspector.owner')}>
              {(frame.owner[p] ?? 0) === 0
                ? t('live.entity.none')
                : link({ kind: 'polity', id: frame.owner[p] ?? 0 })}
            </Fact>
            <Fact label={t('ui.inspector.settlement')}>
              {level === NO_LEVEL || !settlement ? (
                t('ui.inspector.none')
              ) : (
                <Inline>
                  {link({ kind: 'settlement', id: settlement[0] })}
                  {t(
                    `content.settlementLevel.${SettlementLevels.rows[level]?.key ?? 'village'}` as 'content.settlementLevel.village',
                  )}
                </Inline>
              )}
            </Fact>
            <Fact label={t('ui.inspector.population')}>
              <Inline>
                {formatPersons(i18n, series?.population[p] ?? 0)}
                {t('ui.inspector.urban', { pct: formatPercent(i18n, series?.urban[p] ?? 0) })}
              </Inline>
            </Fact>
            <Fact label={t('ui.inspector.culture')}>
              {link({ kind: 'culture', id: frame.culture[p] ?? 0 })}
            </Fact>
            <Fact label={t('ui.inspector.knows')}>
              {known.length === 0 ? (
                t('ui.inspector.nothing')
              ) : (
                <Inline>
                  {known.map((row) => (
                    <span key={row.key}>
                      {t(`content.innovation.${row.key}` as 'content.innovation.agriculture')}
                    </span>
                  ))}
                </Inline>
              )}
            </Fact>
          </Facts>
        );
      }
      case 'polity': {
        const rec = registry.polities.get(entity.id);
        if (!rec || rec.founded > year) return notYet;
        const ended = rec.ended !== 0 && rec.ended <= year;
        const owned = frame.owner.reduce((n, o) => n + (o === entity.id ? 1 : 0), 0);
        const at = history.polityAt(entity.id, year);
        const capital = frame.capitals.get(entity.id) ?? 0;
        const reigns = session.rulers.reignsUntil(entity.id, k);
        const wars = [...registry.wars.entries()].filter(
          ([, w]) => (w.attacker === entity.id || w.defender === entity.id) && w.started <= year,
        );
        return (
          <Facts>
            <Fact label={t('ui.inspector.founded')}>{y(rec.founded)}</Fact>
            <Fact label={t('ui.inspector.ended')}>
              {ended ? (
                <Inline>
                  {y(rec.ended)}
                  {t(
                    `ui.inspector.endReason.${POLITY_END_REASONS[rec.endReason] ?? 'active'}` as 'ui.inspector.endReason.active',
                  )}
                </Inline>
              ) : (
                t('ui.inspector.active')
              )}
            </Fact>
            {!ended && (
              <>
                <Fact label={t('ui.inspector.capital')}>
                  {link({ kind: 'province', id: capital })}
                </Fact>
                <Fact label={t('ui.inspector.provinces')}>{owned}</Fact>
                <Fact label={t('ui.inspector.population')}>
                  {formatPersons(i18n, at.population)}
                </Fact>
                <Fact label={t('ui.inspector.ruler')}>
                  {link({ kind: 'person', id: session.rulers.rulerAt(entity.id, k) })}
                </Fact>
              </>
            )}
            <Fact label={t('ui.inspector.rulers')}>
              {recent(
                reigns.map((r) => (
                  <span key={`${r.fromK}-${r.person}`}>
                    {link({ kind: 'person', id: r.person })}
                  </span>
                )),
              )}
            </Fact>
            <Fact label={t('ui.inspector.wars')}>
              {recent(
                wars.map(([id, w]) => (
                  <EntityLink key={id} entity={{ kind: 'war', id }} density={density}>
                    {t('ui.inspector.warItem', {
                      opponent: name({
                        kind: 'polity',
                        id: w.attacker === entity.id ? w.defender : w.attacker,
                      }),
                      year: y(w.started),
                    })}
                  </EntityLink>
                )),
              )}
            </Fact>
          </Facts>
        );
      }
      case 'settlement': {
        const rec = registry.settlements.get(entity.id);
        if (!rec || rec.founded > year) return notYet;
        const level = frame.level[rec.province] ?? NO_LEVEL;
        return (
          <Facts>
            <Fact label={t('ui.inspector.province')}>
              {link({ kind: 'province', id: rec.province })}
            </Fact>
            <Fact label={t('ui.inspector.founded')}>{y(rec.founded)}</Fact>
            <Fact label={t('ui.inspector.level')}>
              {level === NO_LEVEL
                ? t('ui.inspector.none')
                : t(
                    `content.settlementLevel.${SettlementLevels.rows[level]?.key ?? 'village'}` as 'content.settlementLevel.village',
                  )}
            </Fact>
            <Fact label={t('ui.inspector.population')}>
              {t('ui.inspector.urban', {
                pct: formatPercent(i18n, series?.urban[rec.province] ?? 0),
              })}
            </Fact>
          </Facts>
        );
      }
      case 'person': {
        const rec = registry.persons.get(entity.id);
        if (!rec || rec.born > year) return notYet;
        const dead = rec.died !== 0 && rec.died <= year;
        const ruled = session.rulers
          .ruledBy(entity.id)
          .filter((p) => session.rulers.reignsUntil(p, k).some((r) => r.person === entity.id));
        return (
          <Facts>
            <Fact label={t('ui.inspector.born')}>{y(rec.born)}</Fact>
            <Fact label={t('ui.inspector.died')}>
              {dead ? (
                <Inline>
                  {y(rec.died)}
                  {t('ui.inspector.age', { age: rec.died - rec.born })}
                </Inline>
              ) : (
                <Inline>
                  {t('ui.inspector.alive')}
                  {t('ui.inspector.age', { age: year - rec.born })}
                </Inline>
              )}
            </Fact>
            <Fact label={t('ui.inspector.culture')}>
              {link({ kind: 'culture', id: rec.culture })}
            </Fact>
            <Fact label={t('ui.inspector.parents')}>
              <Inline>
                {link({ kind: 'person', id: rec.father })}
                {link({ kind: 'person', id: rec.mother })}
              </Inline>
            </Fact>
            <Fact label={t('ui.inspector.ruled')}>
              {recent(ruled.map((p) => <span key={p}>{link({ kind: 'polity', id: p })}</span>))}
            </Fact>
          </Facts>
        );
      }
      case 'culture': {
        const rec = registry.cultures.get(entity.id);
        if (!rec || rec.founded > year) return notYet;
        const majority = frame.culture.reduce((n, c) => n + (c === entity.id ? 1 : 0), 0);
        return (
          <Facts>
            <Fact label={t('ui.inspector.language')}>
              {registry.languages.get(rec.language)?.name ?? t('ui.inspector.none')}
            </Fact>
            <Fact label={t('ui.inspector.founded')}>{y(rec.founded)}</Fact>
            <Fact label={t('ui.inspector.origin')}>
              {link({ kind: 'province', id: rec.origin })}
            </Fact>
            <Fact label={t('ui.inspector.provinces')}>
              {t('ui.inspector.majority', { count: majority })}
            </Fact>
          </Facts>
        );
      }
      case 'war': {
        const rec = registry.wars.get(entity.id);
        if (!rec || rec.started > year) return notYet;
        const ended = rec.ended !== 0 && rec.ended <= year;
        return (
          <Facts>
            <Fact label={t('ui.inspector.attacker')}>
              {link({ kind: 'polity', id: rec.attacker })}
            </Fact>
            <Fact label={t('ui.inspector.defender')}>
              {link({ kind: 'polity', id: rec.defender })}
            </Fact>
            <Fact label={t('ui.inspector.started')}>{y(rec.started)}</Fact>
            <Fact label={t('ui.inspector.ended')}>
              {ended ? y(rec.ended) : t('ui.outcome.ongoing')}
            </Fact>
            <Fact label={t('ui.inspector.outcome')}>
              {t(
                `ui.outcome.${ended ? (WAR_OUTCOMES[rec.outcome] ?? 'ongoing') : 'ongoing'}` as 'ui.outcome.ongoing',
              )}
            </Fact>
          </Facts>
        );
      }
    }
  })();

  const eraKey = Eras.rows[history.data.aggregates.era[k] ?? 0]?.key ?? 'prehistory';
  return (
    <article className={`entity-card ${density}`}>
      <header>
        <p className="eyebrow">{t(`ui.kind.${entity.kind}` as 'ui.kind.province')}</p>
        <h2>{name(entity)}</h2>
        <p className="meta">
          {t('ui.inspector.atDate', {
            year: t('live.status.year', {
              year: y(year),
              era: t(`content.era.${eraKey}` as 'content.era.prehistory'),
            }),
          })}
        </p>
      </header>
      {body}
      {(entity.kind === 'province' ||
        entity.kind === 'polity' ||
        entity.kind === 'settlement' ||
        entity.kind === 'person') && (
        <WhyPanel
          session={session}
          entity={entity}
          k={k}
          density={density}
          canContinue={canContinue}
        />
      )}
      {density === 'page' && (
        <section className="entity-events">
          <p className="eyebrow">{t('ui.inspector.events')}</p>
          {pageEvents.length === 0 ? (
            <p className="meta">{t('ui.inspector.noEvents')}</p>
          ) : (
            <ol>
              {pageEvents.map((e) => (
                <li key={e.id}>
                  <span className="year">{y(e.year)}</span> {eventText(t, registry, e)}
                  {e.causes.map((c) => {
                    if (c.kind !== 'event') return null;
                    const cause = session.eventById(c.id);
                    return cause ? (
                      <span key={c.id} className="meta cause">
                        {t('ui.inspector.cause', { text: eventText(t, registry, cause) })}
                      </span>
                    ) : null;
                  })}
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </article>
  );
}
