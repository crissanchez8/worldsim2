// "¿Por qué?" (P1.6, D50): el estado exacto a la fecha, a pedido (keyframe + re-simulación en el
// Worker: ≤ 500 ms en vivo; desde un archivo, hasta 999 años de re-simulación). Muestra base,
// innovaciones y modificadores de cada stat de P1 con su fuente, y los valores del estado.
import { Innovations } from '@ws/content';
import { formatYear } from '@ws/i18n';
import type { StatExplanation } from '@ws/sim';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { entityName } from '../live/event-text';
import type { LiveSession } from '../live/live-session';
import type { SimInspected } from '../worker/sim-client';
import type { EntityRef } from '../worker/sim-protocol';
import { type Density, EntityLink } from './EntityLink';
import { Fact, Facts, Inline } from './Facts';
import { formatPercent, formatPersons, formatStat } from './format';

type State =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading'; readonly k: number }
  | { readonly kind: 'done'; readonly result: SimInspected }
  | { readonly kind: 'error'; readonly message: string };

function StatRow({ e }: { readonly e: StatExplanation }) {
  const { t, i18n } = useTranslation();
  const unit = t(`ui.unit.${e.unit}` as 'ui.unit.days');
  return (
    <li className="stat">
      <div>
        <strong>{t(`ui.stat.${e.stat}` as 'ui.stat.cropYield')}</strong>{' '}
        {formatStat(i18n, e.unit, e.value)} <span className="meta">{unit}</span>
      </div>
      <ul className="terms">
        <li>
          <span className="meta">{t('ui.why.base')}</span>{' '}
          {formatStat(i18n, e.unit, e.base * e.scale)}
        </li>
        {e.innovations.map((term) => (
          <li key={`i${term.source.id}`} className={term.op === 'mul' ? 'op-mul' : 'op-add'}>
            {term.op === 'mul' ? term.value : formatStat(i18n, e.unit, term.value * e.scale)}{' '}
            <span className="meta">
              {t(
                `content.innovation.${Innovations.rows[term.source.id]?.key ?? 'agriculture'}` as 'content.innovation.agriculture',
              )}
            </span>
          </li>
        ))}
        {e.modifiers.map((m) => (
          <li key={`m${m.modifier}`} className={m.op === 'mul' ? 'op-mul' : 'op-add'}>
            {m.value}{' '}
            <span className="meta">
              {t('ui.why.modifier', { source: `${m.source.kind} ${m.source.id}` })}
            </span>
          </li>
        ))}
      </ul>
    </li>
  );
}

export function WhyPanel({
  session,
  entity,
  k,
  density,
  canContinue,
}: {
  readonly session: LiveSession;
  readonly entity: EntityRef;
  readonly k: number;
  readonly density: Density;
  readonly canContinue: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [state, setState] = useState<State>({ kind: 'idle' });
  const key = `${entity.kind}:${entity.id}`;
  const [forKey, setForKey] = useState(key);
  if (forKey !== key) {
    setForKey(key);
    setState({ kind: 'idle' });
  }
  if (!canContinue) return <p className="meta">{t('ui.why.notAvailable')}</p>;

  const compute = () => {
    setState({ kind: 'loading', k });
    session.inspect(k, entity).then(
      (result) => {
        setState({ kind: 'done', result });
      },
      (error: unknown) => {
        setState({
          kind: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
      },
    );
  };

  const year = (at: number) => formatYear(i18n, session.yearAt(at));
  const name = (ref: EntityRef) => entityName(t, session.registry, ref);
  return (
    <section className="why">
      <p className="eyebrow">{t('ui.why.title')}</p>
      {state.kind === 'idle' && (
        <button type="button" onClick={compute}>
          {t('ui.why.compute')}
        </button>
      )}
      {state.kind === 'loading' && <p className="meta">{t('ui.why.computing')}</p>}
      {state.kind === 'error' && (
        <p role="alert">{t('ui.why.error', { message: state.message })}</p>
      )}
      {state.kind === 'done' && (
        <>
          <p className="meta">
            {t('ui.why.at', { year: year(state.result.k), ms: Math.round(state.result.ms) })}
            {state.result.k !== k && (
              <>
                {' '}
                <button type="button" onClick={compute}>
                  {t('ui.why.refresh', { year: year(k) })}
                </button>
              </>
            )}
          </p>
          {(() => {
            const d = state.result.detail;
            const pct = (f: number) => t('ui.inspector.percent', { value: formatPercent(i18n, f) });
            const person = (id: number) =>
              id === 0 ? (
                t('ui.inspector.none')
              ) : (
                <EntityLink entity={{ kind: 'person', id }} density={density}>
                  {name({ kind: 'person', id })}
                </EntityLink>
              );
            const polities = (ids: readonly number[]) =>
              ids.length === 0 ? (
                t('ui.inspector.none')
              ) : (
                <Inline>
                  {ids.map((p) => (
                    <EntityLink key={p} entity={{ kind: 'polity', id: p }} density={density}>
                      {name({ kind: 'polity', id: p })}
                    </EntityLink>
                  ))}
                </Inline>
              );
            switch (d.kind) {
              case 'province':
                return (
                  <>
                    <Facts>
                      <Fact label={t('ui.why.cropShare')}>{pct(d.cropShare)}</Fact>
                      <Fact label={t('ui.why.foodSecurity')}>{pct(d.foodSecurity)}</Fact>
                      <Fact label={t('ui.why.cultures')}>
                        <Inline>
                          {d.cultures.map((c) => (
                            <span key={c.culture}>
                              <EntityLink
                                entity={{ kind: 'culture', id: c.culture }}
                                density={density}
                              >
                                {name({ kind: 'culture', id: c.culture })}
                              </EntityLink>{' '}
                              {formatPersons(i18n, c.persons)}
                            </span>
                          ))}
                        </Inline>
                      </Fact>
                    </Facts>
                    <ul className="stats">
                      {d.stats.map((e) => (
                        <StatRow key={e.stat} e={e} />
                      ))}
                    </ul>
                  </>
                );
              case 'polity':
                return (
                  <>
                    <Facts>
                      <Fact label={t('ui.inspector.provinces')}>{d.provinces}</Fact>
                      <Fact label={t('ui.inspector.population')}>
                        {formatPersons(i18n, d.population)}
                      </Fact>
                      <Fact label={t('ui.inspector.ruler')}>{person(d.ruler)}</Fact>
                      <Fact label={t('ui.inspector.heir')}>{person(d.heir)}</Fact>
                    </Facts>
                    <ul className="stats">
                      {d.stats.map((e) => (
                        <StatRow key={e.stat} e={e} />
                      ))}
                    </ul>
                  </>
                );
              case 'settlement':
                return (
                  <p>
                    {d.exists
                      ? t('ui.inspector.urban', { pct: formatPercent(i18n, d.urbanShare) })
                      : t('ui.inspector.notYet')}
                  </p>
                );
              case 'person':
                return (
                  <Facts>
                    <Fact label={t('ui.inspector.ruler')}>{polities(d.rules)}</Fact>
                    <Fact label={t('ui.inspector.heir')}>{polities(d.heirOf)}</Fact>
                  </Facts>
                );
              case 'culture':
              case 'war':
                return null;
            }
          })()}
        </>
      )}
    </section>
  );
}
