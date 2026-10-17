// Abrir un link compartido (P1.7): progreso de la simulación a máx. y, al terminar, la historia
// lista para reproducir con su huella final (para comparar el mismo link en otro navegador).
// También avisa si el link es de otra versión del motor.
import { ENGINE_VERSION } from '@ws/core';
import { formatNumber, formatYear } from '@ws/i18n';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUi } from '../ui/store';

export function SharedBanner() {
  const { t, i18n } = useTranslation();
  const session = useUi((s) => s.session);
  const status = useUi((s) => s.status);
  const linkVersion = useUi((s) => s.linkVersion);
  const [hash, setHash] = useState<string | null>(null);
  const done = status?.fastForward === 'done';
  const endK = status?.endK ?? 0;

  useEffect(() => {
    if (!done || !session) return;
    let alive = true;
    void session.fullState(endK).then((r) => {
      if (alive) setHash(r.hash);
    });
    return () => {
      alive = false;
    };
  }, [done, session, endK]);

  if (!session || !status) return null;
  const mismatch = linkVersion !== null && linkVersion !== ENGINE_VERSION;
  return (
    <>
      {mismatch && (
        <p role="alert" className="banner">
          {t('ui.shared.versionMismatch', { link: linkVersion, engine: ENGINE_VERSION })}
        </p>
      )}
      {status.fastForward === 'running' && (
        <div className="banner" role="status">
          <p>
            {t('ui.shared.running', {
              year: formatYear(i18n, session.yearAt(status.head)),
              pct: formatNumber(i18n, Math.floor((status.head / Math.max(1, status.endK)) * 100)),
            })}
          </p>
          <progress max={status.endK} value={status.head} />
        </div>
      )}
      {done && (
        <div className="banner" role="status">
          <p>
            {t('ui.shared.done', { years: formatNumber(i18n, status.endK) })}{' '}
            {hash && <code>{t('ui.shared.finalHash', { hash })}</code>}
          </p>
          <button
            type="button"
            className="primary"
            onClick={() => {
              session.setSpeed(1);
            }}
          >
            {t('ui.shared.play')}
          </button>
        </div>
      )}
    </>
  );
}
