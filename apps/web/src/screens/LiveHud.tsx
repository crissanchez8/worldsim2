// Vista en vivo (P1.6, wireframe 2): barra superior, riel de modos de mapa, inspector a la fecha y
// abajo los controles de tiempo, la línea de tiempo y el teletipo. El mapa está debajo.
import { Eras } from '@ws/content';
import { formatYear } from '@ws/i18n';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EntityCard } from '../entity/EntityCard';
import { saveLive } from '../live/save';
import { Ticker } from '../live/Ticker';
import { TimeBar } from '../live/TimeBar';
import { COLOR_MODES, type ColorMode } from '../map/colors';
import { downloadFile, wsimName } from '../storage/files';
import { createWorldStore } from '../storage/world-store';
import { LanguageToggle } from '../ui/LanguageToggle';
import { entityPath, WorldLink } from '../ui/links';
import { useUi } from '../ui/store';

export function LiveHud() {
  const { t, i18n } = useTranslation();
  const session = useUi((s) => s.session);
  const status = useUi((s) => s.status);
  const world = useUi((s) => s.world);
  const map = useUi((s) => s.map);
  const selected = useUi((s) => s.selected);
  const trail = useUi((s) => s.trail);
  const { select, back, patch } = useUi.getState();
  const saving = useUi((s) => s.saving);
  const savedYear = useUi((s) => s.savedYear);
  const liveError = useUi((s) => s.liveError);
  const mapReady = useUi((s) => s.mapReady);
  const mapError = useUi((s) => s.mapError);
  const [colorMode, setColorMode] = useState<ColorMode>('political');
  const [store] = useState(createWorldStore);
  if (!world) return null;

  const label = t('ui.world.label', {
    seed: world.params.seed,
    size: t(`content.worldSize.${world.params.size}` as 'content.worldSize.medium'),
    mapType: t(`content.mapType.${world.params.mapType}` as 'content.mapType.continents'),
  });
  const eraKey = status ? (Eras.rows[status.era]?.key ?? 'prehistory') : 'prehistory';

  const onSave = () => {
    if (!session) return;
    patch({ saving: true });
    saveLive(session, store).then(
      (r) => {
        patch({ saving: false, savedYear: r.year });
      },
      (error: unknown) => {
        patch({
          saving: false,
          liveError: t('live.saves.error', {
            message: error instanceof Error ? error.message : String(error),
          }),
        });
      },
    );
  };

  const onExport = () => {
    if (!session) return;
    void session.save().then((saved) => {
      downloadFile(saved.bytes, wsimName(world.params.seed, world.params.size, saved.year));
    });
  };

  return (
    <div className="hud">
      <header className="top-bar">
        <strong>{label}</strong>
        {status && (
          <span className="date">
            {t('live.status.year', {
              year: formatYear(i18n, status.year),
              era: t(`content.era.${eraKey}` as 'content.era.prehistory'),
            })}
          </span>
        )}
        <span className="spacer" />
        <WorldLink path="/mundo/resumen" className="button">
          {t('ui.world.summary')}
        </WorldLink>
        <button
          type="button"
          disabled={!session || saving || !status?.canContinue}
          onClick={onSave}
        >
          {saving ? t('live.saves.saving') : t('live.saves.save')}
        </button>
        <button type="button" disabled={!session || !status?.canContinue} onClick={onExport}>
          {t('ui.world.export')}
        </button>
        {savedYear !== null && (
          <span className="meta">
            {t('live.saves.saved', { year: formatYear(i18n, savedYear) })}
          </span>
        )}
        <a href="/" className="button">
          {t('ui.world.create')}
        </a>
        <LanguageToggle />
      </header>

      <aside className="rail">
        <p className="eyebrow">{t('ui.rail.mapMode')}</p>
        <div role="radiogroup" aria-label={t('ui.rail.mapMode')}>
          {COLOR_MODES.map((mode) => (
            <label key={mode}>
              <input
                type="radio"
                name="map-mode"
                checked={colorMode === mode}
                onChange={() => {
                  setColorMode(mode);
                  map?.setColorMode(mode);
                }}
              />
              {t(`map.colors.${mode}`)}
            </label>
          ))}
        </div>
        <p className="eyebrow">{t('ui.rail.legend')}</p>
        <ul className="legend">
          <li>{t('ui.rail.legendPolity')}</li>
          <li>{t('ui.rail.legendNoOwner')}</li>
          <li>{t('ui.rail.legendSettlements')}</li>
        </ul>
      </aside>

      <aside className="inspector" aria-label={t('ui.inspector.title')}>
        <div className="inspector-bar">
          <span className="eyebrow">{t('ui.inspector.title')}</span>
          <span className="spacer" />
          {trail.length > 0 && (
            <button type="button" onClick={back}>
              {t('ui.inspector.back')}
            </button>
          )}
          {selected && (
            <>
              <WorldLink path={entityPath(selected)} className="button">
                {t('ui.inspector.open')}
              </WorldLink>
              <button
                type="button"
                onClick={() => {
                  select(null);
                }}
              >
                {t('ui.inspector.close')}
              </button>
            </>
          )}
        </div>
        {selected && session && status ? (
          <EntityCard
            session={session}
            entity={selected}
            k={status.k}
            density="panel"
            canContinue={status.canContinue}
          />
        ) : (
          <p className="meta">{t('ui.inspector.empty')}</p>
        )}
      </aside>

      <footer className="bottom">
        {mapError !== null && <p role="alert">{t('ui.world.mapError', { message: mapError })}</p>}
        {mapError === null && !mapReady && <p className="meta">{t('ui.world.preparingMap')}</p>}
        {liveError !== null && <p role="alert">{t('live.status.error', { message: liveError })}</p>}
        {session && status ? (
          <>
            <TimeBar session={session} status={status} />
            <Ticker session={session} k={status.k} />
          </>
        ) : (
          liveError === null && <p className="meta">{t('live.status.starting')}</p>
        )}
        <p className="meta shortcuts">{t('ui.world.shortcuts')}</p>
      </footer>
    </div>
  );
}
