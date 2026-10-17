// Crear mundo (P1.6, wireframe 1): parámetros del worldgen, generación con progreso por etapa en el
// Worker de worldgen y mundos guardados de este navegador (D57: viven acá hasta la galería de P13).
import { MapTypes, WorldSizes } from '@ws/content';
import { ENGINE_VERSION } from '@ws/core';
import { formatNumber, formatYear } from '@ws/i18n';
import { useNavigate } from '@tanstack/react-router';
import { LAND_FRACTION_RANGE, type WorldgenStage, type WorldParams } from '@ws/worldgen';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { parseSeed } from '../map/params';
import { downloadFile, importedMeta, wsimName } from '../storage/files';
import { createWorldStore, type SavedWorld } from '../storage/world-store';
import { LanguageToggle } from '../ui/LanguageToggle';
import { useUi } from '../ui/store';
import { worldKey, worldSearch } from '../ui/world-url';
import { createWorldgenClient } from '../worker/worldgen-client';

type Progress =
  | { readonly kind: 'idle' }
  | {
      readonly kind: 'running';
      readonly stage: WorldgenStage;
      readonly index: number;
      readonly total: number;
    }
  | { readonly kind: 'error'; readonly message: string };

/** Paso del control de tierra (fraction). */
const LAND_STEP = 0.01;

/** Semilla al azar para el botón "Aleatoria" (UI: no pasa por el RNG del motor). */
function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? 1;
}

export function CreateScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const patch = useUi((s) => s.patch);
  const store = useMemo(() => createWorldStore(), []);
  const [seedText, setSeedText] = useState('1');
  const [size, setSize] = useState('medium');
  const [mapType, setMapType] = useState('continents');
  const [land, setLand] = useState(MapTypes.byKey('continents').defaultLandFraction);
  const [progress, setProgress] = useState<Progress>({ kind: 'idle' });
  const [saved, setSaved] = useState<readonly SavedWorld[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    void store.list().then(setSaved, (error: unknown) => {
      console.error(error);
    });
  }, [store]);
  useEffect(refresh, [refresh]);

  useEffect(() => {
    document.title = t('app.name');
  }, [t]);

  const generate = () => {
    const params: WorldParams = { seed: parseSeed(seedText), size, mapType, landFraction: land };
    const client = createWorldgenClient();
    setProgress({ kind: 'running', stage: 'plates', index: 0, total: 1 });
    client
      .generate(params, (stage, index, total) => {
        setProgress({ kind: 'running', stage, index, total });
      })
      .then(
        (result) => {
          client.dispose();
          patch({ pending: { key: worldKey(params, null), world: result.world } });
          void navigate({ href: `/mundo${worldSearch(params)}` });
        },
        (error: unknown) => {
          client.dispose();
          setProgress({
            kind: 'error',
            message: error instanceof Error ? error.message : String(error),
          });
        },
      );
  };

  const onImport = (file: File) => {
    setImportError(null);
    void file
      .arrayBuffer()
      .then(async (buffer) => {
        const bytes = new Uint8Array(buffer);
        await store.save(importedMeta(bytes, Date.now()), bytes);
        refresh();
      })
      .catch((error: unknown) => {
        setImportError(error instanceof Error ? error.message : String(error));
      });
  };

  const onExport = (w: SavedWorld) => {
    void store.load(w.id).then((found) => {
      if (found) downloadFile(found.file, wsimName(w.params.seed, w.params.size, w.lastYear));
    });
  };

  const running = progress.kind === 'running';
  const [landLo, landHi] = LAND_FRACTION_RANGE;
  return (
    <div className="screen create-screen">
      <header className="top-bar">
        <strong>{t('app.name')}</strong>
        <span className="spacer" />
        <LanguageToggle />
        <span className="meta">{t('placeholder.engineVersion', { version: ENGINE_VERSION })}</span>
      </header>
      <main className="create-grid">
        <section className="panel">
          <h1>{t('ui.create.title')}</h1>
          <p className="eyebrow">{t('ui.create.params')}</p>
          <label className="field">
            <span>{t('ui.create.seed')}</span>
            <input
              value={seedText}
              disabled={running}
              onChange={(e) => {
                setSeedText(e.target.value);
              }}
            />
            <button
              type="button"
              disabled={running}
              onClick={() => {
                setSeedText(String(randomSeed()));
              }}
            >
              {t('ui.create.random')}
            </button>
            <span className="meta">{t('ui.create.seedHint')}</span>
          </label>
          <fieldset className="field" disabled={running}>
            <legend>{t('ui.create.size')}</legend>
            {WorldSizes.rows.map((row) => (
              <label key={row.key}>
                <input
                  type="radio"
                  name="size"
                  checked={size === row.key}
                  onChange={() => {
                    setSize(row.key);
                  }}
                />
                {t(`content.worldSize.${row.key}` as 'content.worldSize.medium')}
                <span className="meta">
                  {t('ui.create.sizeHint', { provinces: formatNumber(i18n, row.provinceTarget) })}
                </span>
              </label>
            ))}
          </fieldset>
          <fieldset className="field" disabled={running}>
            <legend>{t('ui.create.mapType')}</legend>
            {MapTypes.rows.map((row) => (
              <label key={row.key}>
                <input
                  type="radio"
                  name="mapType"
                  checked={mapType === row.key}
                  onChange={() => {
                    setMapType(row.key);
                    setLand(row.defaultLandFraction);
                  }}
                />
                {t(`content.mapType.${row.key}` as 'content.mapType.continents')}
              </label>
            ))}
          </fieldset>
          <label className="field">
            <span>{t('ui.create.land')}</span>
            <input
              type="range"
              min={landLo}
              max={landHi}
              step={LAND_STEP}
              value={land}
              disabled={running}
              onChange={(e) => {
                setLand(Number(e.target.value));
              }}
            />
            <output>{formatNumber(i18n, land)}</output>
            <span className="meta">{t('ui.create.landHint')}</span>
          </label>
          <button type="button" className="primary" disabled={running} onClick={generate}>
            {t('ui.create.generate')}
          </button>
          {progress.kind === 'running' && (
            <div className="progress" role="status">
              <p>
                {t('ui.create.generating', {
                  stage: t(`map.stage.${progress.stage}`),
                  index: progress.index + 1,
                  total: progress.total,
                })}
              </p>
              <progress max={progress.total} value={progress.index} />
            </div>
          )}
          {progress.kind === 'error' && (
            <p role="alert">
              {t('ui.create.error', { message: progress.message })}{' '}
              <button type="button" onClick={generate}>
                {t('ui.create.retry')}
              </button>
            </p>
          )}
        </section>
        <section className="panel">
          <p className="eyebrow">{t('ui.saves.title')}</p>
          {saved.length === 0 ? (
            <p className="meta">{t('ui.saves.empty')}</p>
          ) : (
            <table className="saves">
              <thead>
                <tr>
                  <th>{t('ui.saves.worldColumn')}</th>
                  <th>{t('ui.saves.until')}</th>
                  <th>{t('ui.saves.savedAt')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {saved.map((w) => (
                  <tr key={w.id}>
                    <td>
                      {t('ui.saves.world', {
                        seed: w.params.seed,
                        size: t(`content.worldSize.${w.params.size}` as 'content.worldSize.medium'),
                        mapType: t(
                          `content.mapType.${w.params.mapType}` as 'content.mapType.continents',
                        ),
                      })}
                      {w.engineVersion !== ENGINE_VERSION && (
                        <span className="meta tag">
                          {t('ui.saves.viewOnly', { version: w.engineVersion })}
                        </span>
                      )}
                    </td>
                    <td>{formatYear(i18n, w.lastYear)}</td>
                    <td>{new Date(w.savedAt).toLocaleString(i18n.language)}</td>
                    <td className="actions">
                      <button
                        type="button"
                        onClick={() => {
                          void navigate({ href: `/mundo${worldSearch(w.params, w.id)}` });
                        }}
                      >
                        {t('ui.saves.load')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onExport(w);
                        }}
                      >
                        {t('ui.saves.export')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void store.remove(w.id).then(refresh);
                        }}
                      >
                        {t('ui.saves.remove')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".wsim"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImport(file);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => {
              fileRef.current?.click();
            }}
          >
            {t('ui.saves.import')}
          </button>
          {importError !== null && (
            <p role="alert">{t('ui.saves.importError', { message: importError })}</p>
          )}
        </section>
      </main>
    </div>
  );
}
