// Ficha a página completa (P1.6, wireframe 4; D57: el mismo componente que el inspector). Se ve
// a la fecha de la reproducción o, con la corrida terminada, al final.
import { useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EntityCard } from '../entity/EntityCard';
import { entityName } from '../live/event-text';
import { formatYear } from '@ws/i18n';
import { LanguageToggle } from '../ui/LanguageToggle';
import { WorldLink } from '../ui/links';
import { useUi } from '../ui/store';
import { ENTITY_KINDS, type EntityKind } from '../worker/sim-protocol';

function isKind(value: string): value is EntityKind {
  return (ENTITY_KINDS as readonly string[]).includes(value);
}

export function EntityScreen() {
  const { t, i18n } = useTranslation();
  const params = useParams({ from: '/mundo/resumen/$kind/$id' });
  const session = useUi((s) => s.session);
  const status = useUi((s) => s.status);
  const [final, setFinal] = useState(false);
  const kind = params.kind;
  const id = Number(params.id);
  if (!session || !status) return null;
  if (!isKind(kind) || !Number.isInteger(id) || id <= 0) {
    return (
      <div className="screen">
        <p role="alert">{t('ui.inspector.notYet')}</p>
      </div>
    );
  }
  const entity = { kind, id };
  const atFinal = final && status.finished;
  const k = atFinal ? session.endK : status.k;
  return (
    <div className="screen entity-screen">
      <header className="top-bar">
        <WorldLink path="/mundo/resumen">{t('ui.world.summary')}</WorldLink>
        <span className="meta">
          {isKind(kind) ? t(`ui.kind.${kind}` as 'ui.kind.province') : null}
        </span>
        <strong>{entityName(t, session.registry, entity)}</strong>
        <span className="spacer" />
        <WorldLink path="/mundo" className="button">
          {t('ui.world.back')}
        </WorldLink>
        <LanguageToggle />
      </header>
      <main className="entity-page">
        <p>
          {t('ui.inspector.show')}{' '}
          <button
            type="button"
            aria-pressed={!atFinal}
            onClick={() => {
              setFinal(false);
            }}
          >
            {t('ui.inspector.showAtDate', { year: formatYear(i18n, status.year) })}
          </button>{' '}
          <button
            type="button"
            aria-pressed={atFinal}
            disabled={!status.finished}
            onClick={() => {
              setFinal(true);
            }}
          >
            {t('ui.inspector.showFinal')}
          </button>{' '}
          {!status.finished && <span className="meta">{t('ui.inspector.finalOnlyWhenDone')}</span>}
        </p>
        <EntityCard
          session={session}
          entity={entity}
          k={k}
          density="page"
          canContinue={status.canContinue}
        />
      </main>
    </div>
  );
}
