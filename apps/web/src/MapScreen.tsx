// Página del mapa v1 (P1.2): UI funcional y neutra (el diseño es P2). Muestra el progreso del
// worldgen como texto plano, el relleno de prueba, el idioma y lo que hay bajo el mouse.
import { Biomes } from '@ws/content';
import { ENGINE_VERSION } from '@ws/core';
import { DEFAULT_LANGUAGE, formatNumber, isLanguage, LANGUAGES } from '@ws/i18n';
import type { WorldgenStage } from '@ws/worldgen';
import { Water } from '@ws/worldgen';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { COLOR_MODES, type ColorMode, isColorMode } from './map/colors';
import { MapSession, type MapReady } from './map/map-session';
import type { MapPick } from './map/map-view';
import { readMapParams } from './map/params';

type Status =
  | { readonly kind: 'starting' }
  | {
      readonly kind: 'generating';
      readonly stage: WorldgenStage;
      readonly index: number;
      readonly total: number;
    }
  | { readonly kind: 'ready'; readonly ready: MapReady }
  | { readonly kind: 'error'; readonly message: string };

interface Hover {
  readonly pick: MapPick;
  readonly x: number;
  readonly y: number;
}

/** Separación del tooltip respecto del puntero (px). */
const TOOLTIP_OFFSET_PX = 14;

export function MapScreen() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? DEFAULT_LANGUAGE;
  const params = useMemo(() => readMapParams(window.location.search), []);
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<MapSession | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'starting' });
  const [hover, setHover] = useState<Hover | null>(null);
  const [selected, setSelected] = useState(0);
  const [colorMode, setColorMode] = useState<ColorMode>(params.colors);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = t('app.name');
  }, [language, t]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const session = new MapSession(container, params, {
      onProgress: (stage, index, total) => {
        setStatus({ kind: 'generating', stage, index, total });
      },
      onReady: (ready) => {
        setStatus({ kind: 'ready', ready });
      },
      onError: (message) => {
        setStatus({ kind: 'error', message });
      },
      onHover: (pick, x, y) => {
        setHover(pick ? { pick, x, y } : null);
      },
      onSelect: setSelected,
    });
    sessionRef.current = session;
    return () => {
      session.dispose();
      sessionRef.current = null;
    };
  }, [params]);

  const statusText = (() => {
    switch (status.kind) {
      case 'starting':
        return t('map.status.starting');
      case 'generating':
        return t('map.status.generating', {
          stage: t(`map.stage.${status.stage}`),
          index: status.index + 1,
          total: status.total,
        });
      case 'ready': {
        const { world, backend, forcedWebGL2, firstFrameAt } = status.ready;
        return t('map.status.ready', {
          seed: world.params.seed,
          size: t(`content.worldSize.${world.params.size}` as 'content.worldSize.medium'),
          provinces: formatNumber(i18n, world.provinces.count),
          backend: t(
            backend === 'webgpu'
              ? 'map.backend.webgpu'
              : forcedWebGL2
                ? 'map.backend.webgl2Forced'
                : 'map.backend.webgl2',
          ),
          seconds: formatNumber(i18n, Math.round(firstFrameAt / 100) / 10),
        });
      }
      case 'error':
        return t('map.status.error', { message: status.message });
    }
  })();

  const world = status.kind === 'ready' ? status.ready.world : null;

  return (
    <div className="map-screen">
      <div className="map-canvas" ref={containerRef} />
      <section className="map-panel">
        <p className="eyebrow">{t('app.name')}</p>
        <p className="map-status" role="status">
          {statusText}
        </p>
        <div className="map-controls">
          <label>
            <span>{t('map.colors.label')}</span>
            <select
              value={colorMode}
              disabled={!world}
              onChange={(event) => {
                const mode = event.target.value;
                if (!isColorMode(mode)) return;
                setColorMode(mode);
                sessionRef.current?.setColorMode(mode);
              }}
            >
              {COLOR_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {t(`map.colors.${mode}`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('language.label')}</span>
            <select
              value={language}
              onChange={(event) => {
                if (isLanguage(event.target.value)) void i18n.changeLanguage(event.target.value);
              }}
            >
              {LANGUAGES.map((lng) => (
                <option key={lng} value={lng}>
                  {t(`language.${lng}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {selected > 0 && <p className="meta">{t('map.selected', { id: selected })}</p>}
        <p className="meta">{t('map.help')}</p>
        <p className="meta">{t('placeholder.engineVersion', { version: ENGINE_VERSION })}</p>
      </section>
      {hover && world && (
        <div
          className="map-tooltip"
          style={{ left: hover.x + TOOLTIP_OFFSET_PX, top: hover.y + TOOLTIP_OFFSET_PX }}
        >
          {hover.pick.water === Water.ocean ? (
            t('map.hover.ocean')
          ) : hover.pick.water === Water.lake ? (
            t('map.hover.lake')
          ) : (
            <>
              <strong>{t('map.hover.province', { id: hover.pick.province })}</strong>
              <span>
                {t(`content.biome.${Biomes.at(hover.pick.biome).key}` as 'content.biome.grassland')}
              </span>
              <span>
                {t('map.hover.area', {
                  area: formatNumber(
                    i18n,
                    Math.round(world.provinces.area[hover.pick.province] ?? 0),
                  ),
                })}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
