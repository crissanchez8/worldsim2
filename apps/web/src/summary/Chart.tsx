// Gráfico de línea con uPlot (D54): una serie por año, con el eje x en años del calendario.
import { formatYear } from '@ws/i18n';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

/** Alto del gráfico (px CSS). */
const HEIGHT_PX = 180;
/** Separación mínima entre marcas del eje x (px): los años con "a.C." son anchos. */
const X_TICK_SPACE_PX = 110;
/** Color de la serie (neutro: el diseño es P2). */
const STROKE = '#555555';

export function Chart({
  title,
  xs,
  ys,
}: {
  readonly title: string;
  readonly xs: Float64Array;
  readonly ys: Float64Array;
}) {
  const { i18n } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const plot = useRef<uPlot | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const year = (v: number) => formatYear(i18n, Math.round(v) === 0 ? 1 : Math.round(v));
    const u = new uPlot(
      {
        width: Math.max(200, el.clientWidth),
        height: HEIGHT_PX,
        legend: { show: false },
        scales: { x: { time: false } },
        series: [{}, { label: title, stroke: STROKE, width: 1.5 }],
        axes: [
          { space: X_TICK_SPACE_PX, values: (_u, splits) => splits.map(year) },
          {
            values: (_u, splits) =>
              splits.map((v) =>
                new Intl.NumberFormat(i18n.language, { notation: 'compact' }).format(v),
              ),
          },
        ],
      },
      [[], []],
      el,
    );
    plot.current = u;
    const observer = new ResizeObserver(() => {
      u.setSize({ width: Math.max(200, el.clientWidth), height: HEIGHT_PX });
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      u.destroy();
      plot.current = null;
    };
  }, [title, i18n, i18n.language]);

  useEffect(() => {
    plot.current?.setData([Array.from(xs), Array.from(ys)]);
  }, [xs, ys, title, i18n.language]);

  return (
    <figure className="chart">
      <figcaption>{title}</figcaption>
      <div ref={ref} />
    </figure>
  );
}
