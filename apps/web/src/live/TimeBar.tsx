// Barra de tiempo (P1.5; lugar fijado por los wireframes de P1.6): velocidades, año y era
// mostrados, estado de la simulación adelantada y la línea de tiempo. Guardar está en la barra
// superior. UI neutra: el diseño llega con el DS (P2).
import { Eras } from '@ws/content';
import { formatNumber, formatYear } from '@ws/i18n';
import { useTranslation } from 'react-i18next';
import { SPEEDS, type Speed } from './config';
import type { LiveSession, LiveStatus } from './live-session';
import { Timeline } from './TimelineView';

const SPEED_KEY: Record<string, 'pause' | 'x1' | 'x2' | 'x4' | 'max'> = {
  '0': 'pause',
  '1': 'x1',
  '2': 'x2',
  '4': 'x4',
  max: 'max',
};

export interface TimeBarProps {
  readonly session: LiveSession;
  readonly status: LiveStatus;
}

export function TimeBar({ session, status }: TimeBarProps) {
  const { t, i18n } = useTranslation();
  const eraKey = Eras.rows[status.era]?.key ?? 'prehistory';
  const lastYear = session.history?.yearOf(status.head) ?? status.year;
  const note = !status.canContinue
    ? t('live.status.viewOnly', { version: status.engineVersion })
    : status.finished
      ? t('live.status.finished')
      : status.waiting
        ? t('live.status.waiting')
        : t('live.status.ahead', { year: formatYear(i18n, lastYear) });
  return (
    <section className="time-bar" aria-label={t('live.speed.label')}>
      <div className="time-row">
        <div className="speeds" role="radiogroup" aria-label={t('live.speed.label')}>
          {SPEEDS.map((speed: Speed) => (
            <button
              key={String(speed)}
              type="button"
              role="radio"
              aria-checked={status.speed === speed}
              disabled={!status.canContinue && speed === 'max'}
              onClick={() => {
                session.setSpeed(speed);
              }}
            >
              {t(`live.speed.${SPEED_KEY[String(speed)] ?? 'x1'}`)}
            </button>
          ))}
        </div>
        <strong className="time-year">
          {t('live.status.year', {
            year: formatYear(i18n, status.year),
            era: t(`content.era.${eraKey}` as 'content.era.prehistory'),
          })}
        </strong>
        <span className="meta">{note}</span>
        {status.msPerYear > 0 && (
          <span className="meta">
            {t('live.status.cost', {
              ms: formatNumber(i18n, Math.round(status.msPerYear * 100) / 100),
            })}
          </span>
        )}
      </div>
      <Timeline session={session} />
    </section>
  );
}
