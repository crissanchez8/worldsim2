// Un mundo abierto (P1.6): el mapa y las sesiones (mapa + simulación) viven acá mientras se navega
// entre la vista en vivo, el resumen y las fichas (las rutas hijas se dibujan encima del mapa).
// Los parámetros del mundo vienen en la URL; si cambian, se regenera todo.
import { Biomes } from '@ws/content';
import { formatNumber } from '@ws/i18n';
import { Outlet, useRouterState } from '@tanstack/react-router';
import { Water } from '@ws/worldgen';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Speed } from '../live/config';
import { liveDebug } from '../live/debug';
import { LiveSession } from '../live/live-session';
import { MapSession } from '../map/map-session';
import type { MapPick } from '../map/map-view';
import { readMapParams } from '../map/params';
import { createWorldStore } from '../storage/world-store';
import { appI18n } from '../ui/i18n';
import { useUi } from '../ui/store';
import { worldKey } from '../ui/world-url';

interface Hover {
  readonly pick: MapPick;
  readonly x: number;
  readonly y: number;
}

/** Separación del tooltip respecto del puntero (px). */
const TOOLTIP_OFFSET_PX = 14;
/** Años por pulsación de ←/→ (atajo global). */
const SCRUB_STEP_YEARS = 100;
const SPEED_KEYS: Readonly<Record<string, Speed>> = { '1': 1, '2': 2, '3': 4, '4': 'max' };

function typing(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

export function WorldLayout() {
  const { t, i18n } = useTranslation();
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const params = useMemo(() => readMapParams(searchStr), [searchStr]);
  const key = worldKey(params.world, params.load);
  const containerRef = useRef<HTMLDivElement>(null);
  const store = useMemo(() => createWorldStore(), []);
  const boot = useUi((s) => s.boot);
  const world = useUi((s) => s.world);
  const [hover, setHover] = useState<Hover | null>(null);

  useEffect(() => {
    document.title = t('app.name');
  }, [t]);

  // Mapa + simulación del mundo de la URL (o del que dejó generado "Crear").
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // Se lee de la URL actual: el efecto corre solo cuando cambia el mundo (`key`).
    const p = readMapParams(window.location.search);
    const ui = useUi.getState();
    const pending = ui.pending?.key === key ? ui.pending.world : undefined;
    ui.patch({
      boot: pending ? { kind: 'map' } : { kind: 'generating', stage: 'plates', index: 0, total: 1 },
      pending: null,
      world: null,
      session: null,
      status: null,
      liveError: null,
      selected: null,
      trail: [],
      savedYear: null,
    });
    const run = { cancelled: false };
    let live: LiveSession | null = null;
    const map = new MapSession(
      container,
      p,
      {
        onProgress: (stage, index, total) => {
          useUi.getState().patch({ boot: { kind: 'generating', stage, index, total } });
        },
        onReady: (ready) => {
          if (run.cancelled) return;
          useUi.getState().patch({ boot: { kind: 'ready' }, world: ready.world });
          void (async () => {
            let file: Uint8Array | undefined;
            if (p.load !== null) {
              const found = await store.load(p.load);
              if (!found) {
                useUi
                  .getState()
                  .patch({ liveError: appI18n.t('live.saves.notFound', { id: p.load }) });
                return;
              }
              file = found.file;
            }
            if (run.cancelled) return;
            live = new LiveSession(
              ready.world,
              {
                onFrame: (frame) => {
                  map.showFrame(frame);
                },
                onStatus: (status) => {
                  useUi.getState().patch({ status });
                },
                onError: (message) => {
                  useUi.getState().patch({ liveError: message });
                },
              },
              file ? { file } : {},
            );
            window.__live = liveDebug(live, store, () => useUi.getState().status);
            useUi.getState().patch({ session: live });
          })();
        },
        onError: (message) => {
          useUi.getState().patch({ boot: { kind: 'error', message } });
        },
        onHover: (pick, x, y) => {
          setHover(pick ? { pick, x, y } : null);
        },
        onSelect: (province) => {
          useUi.getState().select(province === 0 ? null : { kind: 'province', id: province });
        },
      },
      pending,
    );
    useUi.getState().patch({ map });
    return () => {
      run.cancelled = true;
      live?.dispose();
      map.dispose();
      delete window.__live;
      useUi.getState().patch({ map: null, session: null, status: null, world: null });
    };
    // Sin `t` ni `i18n` de useTranslation: cambian con el idioma y regenerarían el mundo.
  }, [key, store]);

  // Atajos (P1.6): espacio pausa, ←/→ ±100 años, 1–4 velocidades, Esc cierra el inspector.
  useEffect(() => {
    let resume: Speed = 1;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
      const { session, select } = useUi.getState();
      const director = session?.director;
      if (e.key === 'Escape') {
        select(null);
        return;
      }
      if (!session || !director) return;
      if (e.key === ' ') {
        e.preventDefault();
        if (director.speed === 0) session.setSpeed(resume);
        else {
          resume = director.speed;
          session.setSpeed(0);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const step = e.key === 'ArrowLeft' ? -SCRUB_STEP_YEARS : SCRUB_STEP_YEARS;
        session.scrub(Math.floor(director.playhead) + step);
      } else {
        const speed = SPEED_KEYS[e.key];
        if (speed !== undefined) session.setSpeed(speed);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div className="world-screen">
      <div className="map-canvas" ref={containerRef} />
      {boot.kind === 'generating' && (
        <div className="boot" role="status">
          <p>
            {t('ui.world.generating', {
              stage: t(`map.stage.${boot.stage}`),
              index: boot.index + 1,
              total: boot.total,
            })}
          </p>
          <progress max={boot.total} value={boot.index} />
        </div>
      )}
      {boot.kind === 'map' && (
        <div className="boot" role="status">
          <p>{t('ui.world.preparingMap')}</p>
        </div>
      )}
      {boot.kind === 'error' && (
        <div className="boot" role="alert">
          <p>{t('ui.world.error', { message: boot.message })}</p>
          <button
            type="button"
            onClick={() => {
              window.location.reload();
            }}
          >
            {t('ui.world.retry')}
          </button>
        </div>
      )}
      {world && <Outlet />}
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
