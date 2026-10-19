// Línea de tiempo (P1.5): bandas de eras y marcadores de eventos significativos hasta lo ya visto,
// lo simulado por delante como franja neutra (D49) y la cabeza de reproducción. Clic o arrastre
// para ir a otro año (rebobinar es ver, §8.4). Dibujo imperativo en cada cuadro de la sesión.
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { TIMELINE } from './config';
import type { LiveSession } from './live-session';
import { eraBands, kToX, xToK } from './timeline';

/** Años por pulsación de ←/→ sobre la línea de tiempo. */
const KEY_STEP_YEARS = 100;

export function Timeline({ session }: { readonly session: LiveSession }) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const draw = () => {
      const history = session.history;
      const director = session.director;
      if (!history || !director) return;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const endK = session.endK;
      const x = (k: number) => kToX(k, endK, w);
      const seen = director.seen;
      ctx.fillStyle = TIMELINE.aheadColor;
      ctx.fillRect(x(seen), 0, x(session.simulated) - x(seen), TIMELINE.bandPx);
      for (const band of eraBands(history.data.aggregates.era, seen)) {
        ctx.fillStyle = TIMELINE.eraColors[band.era] ?? TIMELINE.aheadColor;
        ctx.fillRect(x(band.from), 0, Math.max(1, x(band.to) - x(band.from)), TIMELINE.bandPx);
      }
      ctx.fillStyle = TIMELINE.markerColor;
      for (const m of session.markers.visible(seen)) {
        ctx.fillRect(Math.round(x(m.k)), TIMELINE.bandPx + 2, 1, h - TIMELINE.bandPx - 2);
      }
      ctx.fillStyle = TIMELINE.playheadColor;
      ctx.fillRect(Math.round(x(director.playhead)) - 1, 0, 2, h);
    };
    return session.onDraw(draw);
  }, [session]);

  const scrubAt = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    session.scrub(xToK(clientX - rect.left, session.endK, rect.width, session.simulated));
  };

  return (
    <canvas
      ref={canvasRef}
      className="timeline"
      style={{ height: TIMELINE.heightPx }}
      role="slider"
      tabIndex={0}
      aria-label={t('live.timeline.label')}
      aria-valuemin={0}
      aria-valuemax={session.endK}
      aria-valuenow={Math.floor(session.director?.playhead ?? 0)}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        scrubAt(event.clientX);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) scrubAt(event.clientX);
      }}
      onKeyDown={(event) => {
        const step =
          event.key === 'ArrowLeft'
            ? -KEY_STEP_YEARS
            : event.key === 'ArrowRight'
              ? KEY_STEP_YEARS
              : 0;
        if (step === 0) return;
        event.preventDefault();
        session.scrub(Math.floor(session.director?.playhead ?? 0) + step);
      }}
    />
  );
}
