// Mide la carga y el recorrido del mapa (P1.2) en Chrome (CDP) o Firefox (WebDriver BiDi)
// headless, sin dependencias. Sirve cuando no hay una ventana visible: en el panel oculto del
// navegador integrado `requestAnimationFrame` no corre (L-010). Correr contra el BUILD (L-009):
//
//   pnpm --filter @ws/web build && pnpm --filter @ws/web preview --port 4176
//   node apps/web/scripts/measure-map.mjs chrome "http://localhost:4176/?dpr=2" --cold-warm
//   node apps/web/scripts/measure-map.mjs firefox "http://localhost:4176/?dpr=2" --tour
//   node apps/web/scripts/measure-map.mjs chrome "http://localhost:4176/?x=435&z=684" --shot a.png
//
// Corridas: `cold` = perfil nuevo (sin caché HTTP ni de shaders); con `--cold-warm` además
// `reload` (misma sesión) y `restart` (mismo perfil, navegador reiniciado: solo cachés en disco).
// `--tour` agrega `tour=1` y espera el recorrido. Imprime un JSON por corrida (`window.__map`).
//
// CHROME=<ruta> y FIREFOX=<ruta> cambian los ejecutables (por defecto, los de macOS).
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [browserName, rawUrl, ...flags] = process.argv.slice(2);
if (!['chrome', 'firefox'].includes(browserName ?? '') || !rawUrl) {
  console.error(
    'Uso: node measure-map.mjs chrome|firefox <url> [--cold-warm] [--tour] [--shot x.png]',
  );
  process.exit(1);
}
const has = (f) => flags.includes(f);
const shotIndex = flags.indexOf('--shot');
const shotPath = shotIndex >= 0 ? flags[shotIndex + 1] : null;
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FIREFOX = process.env.FIREFOX ?? '/Applications/Firefox.app/Contents/MacOS/firefox';
/** Puerto de depuración (CDP o BiDi). */
const PORT = browserName === 'chrome' ? 9341 : 9342;
/** Ventana: la del M1 Pro de medición en CSS px (1512×945). */
const WINDOW = [1512, 945];
/** Espera máxima por corrida: carga + calentamiento + recorrido (ms). */
const TIMEOUT_MS = 300_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Mensajes de consola de la página (errores y avisos), para el reporte. */
const consoleLines = [];
function onEvent(method, params) {
  if (method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(params.type)) {
    consoleLines.push(
      `${params.type}: ${params.args.map((a) => a.value ?? a.description).join(' ')}`,
    );
  } else if (method === 'Runtime.exceptionThrown') {
    consoleLines.push(
      `exception: ${params.exceptionDetails?.exception?.description ?? params.exceptionDetails?.text}`,
    );
  } else if (method === 'log.entryAdded' && ['error', 'warn'].includes(params.level)) {
    consoleLines.push(`${params.level}: ${params.text}`);
  }
}

const url = new URL(rawUrl);
if (has('--tour')) url.searchParams.set('tour', '1');

/** Conexión WebSocket con pedidos por id (CDP y BiDi usan el mismo formato). */
async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });
  let nextId = 0;
  const pending = new Map();
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(String(event.data));
    if (msg.id === undefined && msg.method) onEvent(msg.method, msg.params);
    const entry = pending.get(msg.id);
    if (!entry) return;
    pending.delete(msg.id);
    if (msg.error) entry.reject(new Error(`${msg.error}: ${msg.message ?? ''}`));
    else entry.resolve(msg.result);
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  return { ws, send };
}

function launch(profile) {
  if (browserName === 'chrome') {
    return spawn(
      CHROME,
      [
        '--headless=new',
        `--remote-debugging-port=${PORT}`,
        `--user-data-dir=${profile}`,
        '--no-first-run',
        '--no-default-browser-check',
        `--window-size=${WINDOW[0]},${WINDOW[1]}`,
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        'about:blank',
      ],
      { stdio: 'ignore' },
    );
  }
  return spawn(
    FIREFOX,
    [
      '--headless',
      `--remote-debugging-port=${PORT}`,
      '--no-remote',
      '--profile',
      profile,
      `--window-size=${WINDOW[0]},${WINDOW[1]}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );
}

/** Abre una página y devuelve `evaluate(expr)`, `navigate(url)` y `screenshot()`. */
async function openPage() {
  for (let i = 0; i < 150; i++) {
    try {
      if (browserName === 'chrome') {
        const targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
        const page = targets.find((t) => t.type === 'page');
        if (!page) throw new Error('sin página');
        const { ws, send } = await connect(page.webSocketDebuggerUrl);
        await send('Runtime.enable');
        return {
          close: () => ws.close(),
          navigate: (href) => send('Page.navigate', { url: href }),
          evaluate: async (expression) => {
            const res = await send('Runtime.evaluate', { expression, returnByValue: true });
            return res?.result?.value;
          },
          screenshot: async () => (await send('Page.captureScreenshot', { format: 'png' })).data,
        };
      }
      const { ws, send } = await connect(`ws://127.0.0.1:${PORT}/session`);
      await send('session.new', { capabilities: {} });
      await send('session.subscribe', { events: ['log.entryAdded'] });
      const tree = await send('browsingContext.getTree', {});
      const context = tree.contexts[0].context;
      await send('browsingContext.setViewport', {
        context,
        viewport: { width: WINDOW[0], height: WINDOW[1] },
      });
      return {
        close: () => ws.close(),
        navigate: (href) => send('browsingContext.navigate', { context, url: href, wait: 'none' }),
        evaluate: async (expression) => {
          const res = await send('script.evaluate', {
            expression,
            target: { context },
            awaitPromise: false,
            resultOwnership: 'none',
          });
          return res?.result?.value;
        },
        screenshot: async () => (await send('browsingContext.captureScreenshot', { context })).data,
      };
    } catch {
      await sleep(200);
    }
  }
  throw new Error(`${browserName} no respondió en el puerto ${PORT}`);
}

/** Espera a que la página tenga el primer cuadro, la ventana de asentamiento y (si se pidió) el recorrido. */
async function waitReport(page, label) {
  const deadline = Date.now() + TIMEOUT_MS;
  let report = null;
  while (Date.now() < deadline) {
    await sleep(500);
    const raw = await page.evaluate('JSON.stringify(window.__map ?? null)').catch(() => null);
    report = typeof raw === 'string' ? JSON.parse(raw) : null;
    if (report?.error) break;
    const loaded = report && report.settle !== null;
    if (loaded && (!has('--tour') || report.tour !== null)) break;
  }
  if (!report || (!report.error && report.settle === null)) {
    throw new Error(`${label}: el mapa no terminó de cargar a tiempo`);
  }
  return report;
}

function summarize(label, r) {
  const l = r.load;
  const s = r.settle;
  const t = r.tour;
  const ms = (v) => (Number.isFinite(v) ? Math.round(v) : null);
  return {
    run: label,
    browser: browserName,
    backend: r.backend,
    error: r.error,
    canvas: r.canvas,
    world:
      r.world &&
      `${r.world.size} seed ${r.world.seed} · ${r.world.provinces} prov · ${r.world.hash}`,
    load: {
      firstFrameAt: ms(l.firstFrameAt),
      rendererInit: ms(l.rendererInitMs),
      worldgen: ms(l.worldgenMs),
      worldgenWall: ms(l.worldgenWallMs),
      transfer: ms(l.transferMs),
      mapData: ms(l.mapDataMs),
      gpuBuild: ms(l.gpuBuildMs),
      warmup: ms(l.warmupMs),
      firstFrame: ms(l.firstFrameMs),
    },
    settle: s && {
      frames: s.frames,
      fpsAvg: +s.fpsAvg.toFixed(1),
      frameMsMax: +s.frameMsMax.toFixed(1),
      janks: s.janks,
      gpuQueueMax: s.gpuQueueMax,
    },
    tour: t && {
      seconds: +t.seconds.toFixed(1),
      fpsAvg: +t.fpsAvg.toFixed(1),
      fpsP5: +t.fpsP5.toFixed(1),
      fpsP1: +t.fpsP1.toFixed(1),
      frameMsMax: +t.frameMsMax.toFixed(1),
      janks: t.janks,
      cpuMsAvg: +t.cpuMsAvg.toFixed(2),
      cpuMsP95: +t.cpuMsP95.toFixed(2),
      gpuQueueAvg: +t.gpuQueueAvg.toFixed(2),
      gpuQueueMax: t.gpuQueueMax,
    },
    memory: r.memory,
    scene: r.scene,
    repeat: r.repeat,
    refreshHz: r.refreshHz,
  };
}

const profile = mkdtempSync(join(tmpdir(), `ws-map-${browserName}-`));
let browser = launch(profile);
try {
  let page = await openPage();
  const runs = [];
  await page.navigate(url.href);
  runs.push(summarize('cold', await waitReport(page, 'cold')));
  if (shotPath) {
    writeFileSync(shotPath, Buffer.from(await page.screenshot(), 'base64'));
  }
  if (has('--cold-warm')) {
    await page.navigate('about:blank');
    await sleep(500);
    await page.navigate(url.href);
    runs.push(summarize('reload', await waitReport(page, 'reload')));
    page.close();
    browser.kill();
    await sleep(1500);
    browser = launch(profile);
    page = await openPage();
    await page.navigate(url.href);
    runs.push(summarize('restart', await waitReport(page, 'restart')));
  }
  page.close();
  for (const run of runs) console.log(JSON.stringify(run));
  if (consoleLines.length > 0) console.log(JSON.stringify({ console: consoleLines.slice(0, 40) }));
} finally {
  browser.kill();
  await sleep(500);
  rmSync(profile, { recursive: true, force: true });
}
