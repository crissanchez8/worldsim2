// Teletipo (P1.6): los eventos significativos hasta la fecha mostrada (nunca los simulados por
// delante, D49), del más reciente al más viejo. Un clic abre la entidad principal en el inspector y
// centra el mapa en el lugar.
import type { events } from '@ws/core';
import { formatYear } from '@ws/i18n';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUi } from '../ui/store';
import { TICKER } from './config';
import { eventProvince, eventText, mainEntity } from './event-text';
import type { LiveSession } from './live-session';

export function Ticker({ session, k }: { readonly session: LiveSession; readonly k: number }) {
  const { t, i18n } = useTranslation();
  const select = useUi((s) => s.select);
  const map = useUi((s) => s.map);
  const history = session.history;
  const items = useMemo(() => {
    const out: events.GameEvent[] = [];
    if (!history) return out;
    for (let i = Math.min(k, history.data.events.length) - 1; i >= 0; i--) {
      const year = history.data.events[i] ?? [];
      for (let j = year.length - 1; j >= 0; j--) {
        const e = year[j];
        if (e && e.significance >= TICKER.minSignificance) out.push(e);
      }
      if (out.length >= TICKER.rows) break;
    }
    return out.slice(0, TICKER.rows);
  }, [history, k]);

  return (
    <section className="ticker" aria-label={t('ui.ticker.title')}>
      <p className="eyebrow">{t('ui.ticker.title')}</p>
      {items.length === 0 ? (
        <p className="meta">{t('ui.ticker.empty')}</p>
      ) : (
        <ol>
          {items.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                className="link"
                onClick={() => {
                  const ref = mainEntity(e);
                  if (ref) select(ref);
                  map?.focus(eventProvince(e));
                }}
              >
                <span className="year">{formatYear(i18n, e.year)}</span>{' '}
                {eventText(t, session.registry, e)}
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
