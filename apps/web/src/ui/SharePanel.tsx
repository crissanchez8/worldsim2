// Compartir (P1.7): el link con los parámetros del mundo y la versión del motor, más las huellas
// (hash del mundo y del estado final) para comparar a ojo el mismo link en otro navegador.
import { ENGINE_VERSION } from '@ws/core';
import { formatYear } from '@ws/i18n';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUi } from './store';
import { shareUrl } from './world-url';

export function SharePanel({ onClose }: { readonly onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const world = useUi((s) => s.world);
  const session = useUi((s) => s.session);
  const status = useUi((s) => s.status);
  const [copy, setCopy] = useState<'idle' | 'done' | 'failed'>('idle');
  const [finalHash, setFinalHash] = useState<string | null>(null);
  if (!world || !session || !status) return null;
  const url = shareUrl(window.location.origin, world.params);
  const finished = status.head >= status.endK;
  const lastYear = session.yearAt(status.endK);
  return (
    <section className="share-panel" role="dialog" aria-label={t('ui.share.title')}>
      <p className="eyebrow">{t('ui.share.title')}</p>
      <p className="meta">{t('ui.share.hint', { version: ENGINE_VERSION })}</p>
      <input
        readOnly
        value={url}
        aria-label={t('ui.share.title')}
        onFocus={(e) => {
          e.currentTarget.select();
        }}
      />
      <div className="row">
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(url).then(
              () => {
                setCopy('done');
              },
              () => {
                setCopy('failed');
              },
            );
          }}
        >
          {t('ui.share.copy')}
        </button>
        {copy === 'done' && <span className="meta">{t('ui.share.copied')}</span>}
        {copy === 'failed' && <span role="alert">{t('ui.share.copyFailed')}</span>}
        <span className="spacer" />
        <button type="button" onClick={onClose}>
          {t('ui.share.close')}
        </button>
      </div>
      <dl className="facts">
        <dt>{t('ui.share.worldHash')}</dt>
        <dd>
          <code>{world.hash}</code>
        </dd>
        <dt>{t('ui.share.finalHash', { year: formatYear(i18n, lastYear) })}</dt>
        <dd>
          {!finished ? (
            <span className="meta">{t('ui.share.notFinished')}</span>
          ) : finalHash ? (
            <code>{finalHash}</code>
          ) : (
            <button
              type="button"
              onClick={() => {
                void session.fullState(status.endK).then((r) => {
                  setFinalHash(r.hash);
                });
              }}
            >
              {t('ui.share.computeFinal')}
            </button>
          )}
        </dd>
      </dl>
    </section>
  );
}
