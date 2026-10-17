// Mide la vista en vivo (P1.9) en Chromium o Firefox headless (Playwright) contra el BUILD (L-009):
//
//   pnpm --filter @ws/web build && pnpm --filter @ws/web preview --port 4176
//   node apps/web/scripts/measure-live.mjs chrome "http://localhost:4176/mundo?seed=1&size=medium&map=continents&land=0.3&v=0.1.3"
//
// `chrome` = el Google Chrome instalado (GPU real: es la medición que vale); `chromium` y `firefox`
// = los de Playwright (en macOS headless sin GPU: WebGL por software, el hilo principal se satura
// dibujando y las tareas largas no son de la app).
//
// Abre un link compartido (avance rápido a máx., P1.7) y mide: worldgen y primer cuadro del mapa
// (`window.__map`), la corrida completa hasta 1900, las tareas largas del hilo principal durante
// la corrida (solo Chromium), rebobinar (director + espejo + mapa, síncrono) y el estado completo
// exacto a una fecha (Worker). Imprime un JSON. Presupuestos: BRIEF P1 §8 y D45.
/* global window */
import { chromium, firefox } from '@playwright/test';

const [browserName, url] = process.argv.slice(2);
if (!['chrome', 'chromium', 'firefox'].includes(browserName ?? '') || !url) {
  console.error('Uso: node measure-live.mjs chrome|chromium|firefox <url de un link compartido>');
  process.exit(1);
}
/** Espera máxima de la corrida completa (ms): el presupuesto es 3 min. */
const RUN_TIMEOUT_MS = 600_000;
/** Muestras de rebobinado y de estado completo (k en el peor caso: k ≡ 99 mod 100). */
const REWIND_SAMPLES = 40;
const FULL_STATE_SAMPLES = 6;
/** Una tarea del hilo principal que tarda más que esto se nota como cuadro trabado (ms). */
const LONG_TASK_MS = 50;

const browser =
  browserName === 'firefox'
    ? await firefox.launch()
    : await chromium.launch(browserName === 'chrome' ? { channel: 'chrome' } : {});
const page = await browser.newPage({ viewport: { width: 1512, height: 945 } });
await page.addInitScript(() => {
  window.__longTasks = [];
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        window.__longTasks.push({ at: e.startTime, ms: e.duration });
      }
    }).observe({ type: 'longtask', buffered: true });
  } catch {
    // Firefox no tiene `longtask`.
  }
});
const t0 = Date.now();
await page.goto(url);
await page.waitForFunction(() => window.__live?.status() != null, null, {
  timeout: RUN_TIMEOUT_MS,
});
const liveAt = Date.now() - t0;
const liveAtPage = await page.evaluate(() => performance.now());
await page.waitForFunction(() => window.__live?.status()?.fastForward === 'done', null, {
  timeout: RUN_TIMEOUT_MS,
  polling: 250,
});
const doneAt = Date.now() - t0;
const result = await page.evaluate(
  async ({ rewindSamples, fullSamples, longMs, from }) => {
    const runEnd = performance.now();
    const live = window.__live;
    const status = live.status();
    const endK = status.endK;
    const worst = (count) =>
      Array.from(
        { length: count },
        (_, i) => Math.floor(((i + 0.5) * endK) / count / 100) * 100 + 99,
      ).filter((k) => k <= endK);
    const rewind = [];
    for (const k of worst(rewindSamples)) {
      const t = performance.now();
      live.scrub(k);
      rewind.push(performance.now() - t);
    }
    const full = [];
    for (const k of worst(fullSamples)) {
      const t = performance.now();
      await live.hash(k);
      full.push(performance.now() - t);
    }
    const max = (xs) => xs.reduce((a, b) => Math.max(a, b), 0);
    const avg = (xs) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
    // Tareas largas de la carga (antes de la simulación) y de la corrida, por separado.
    const tasks = window.__longTasks ?? [];
    const during = (a, b) => tasks.filter((x) => x.at >= a && x.at < b).map((x) => x.ms);
    const loadTasks = during(0, from);
    const runTasks = during(from, runEnd);
    return {
      map: window.__map?.load ?? null,
      backend: window.__map?.backend ?? null,
      msPerYearWorker: status.msPerYear,
      rewindMs: { avg: avg(rewind), max: max(rewind) },
      fullStateMs: { avg: avg(full), max: max(full) },
      longTasksLoad: { count: loadTasks.filter((d) => d > longMs).length, maxMs: max(loadTasks) },
      longTasksRun: {
        count: runTasks.filter((d) => d > longMs).length,
        maxMs: max(runTasks),
        totalMs: runTasks.reduce((a, b) => a + b, 0),
      },
    };
  },
  {
    rewindSamples: REWIND_SAMPLES,
    fullSamples: FULL_STATE_SAMPLES,
    longMs: LONG_TASK_MS,
    from: liveAtPage,
  },
);
console.log(
  JSON.stringify(
    {
      browser: browserName,
      url,
      liveAtS: liveAt / 1000,
      fullRunS: (doneAt - liveAt) / 1000,
      totalS: doneAt / 1000,
      ...result,
    },
    null,
    2,
  ),
);
await browser.close();
