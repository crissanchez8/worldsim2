// Corre el recorrido de medición del spike en Chrome headless (vía CDP, sin dependencias) e
// imprime el reporte. Sirve cuando no hay una ventana visible donde medir; los fps quedan
// topeados por el reloj virtual de 60 Hz de headless, así que el dato fino es el tiempo de GPU.
//
//   node spikes/terrain/scripts/measure-headless.mjs "http://localhost:5174/spikes/terrain/?dpr=2"
//
// CHROME=<ruta> cambia el ejecutable (por defecto, Google Chrome de macOS).
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const url = process.argv[2];
if (!url) {
  console.error('Uso: node measure-headless.mjs <url del spike>');
  process.exit(1);
}
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;
/** Tiempo máximo de espera del resultado: carga + calentamiento + recorrido, en ms. */
const TIMEOUT_MS = 240_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const profile = mkdtempSync(join(tmpdir(), 'ws-spike-terrain-'));
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1512,945',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

async function pageTarget() {
  for (let i = 0; i < 100; i++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
      const page = targets.find((t) => t.type === 'page');
      if (page) return page;
    } catch {
      // Chrome todavía no abrió el puerto.
    }
    await sleep(100);
  }
  throw new Error('Chrome no respondió en el puerto de depuración');
}

try {
  const page = await pageTarget();
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve) => ws.addEventListener('open', resolve));
  let nextId = 0;
  const pending = new Map();
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    const resolve = pending.get(msg.id);
    if (resolve) {
      pending.delete(msg.id);
      resolve(msg.result);
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = ++nextId;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });

  const target = new URL(url);
  target.searchParams.set('autostart', '1');
  await send('Page.navigate', { url: target.href });
  const deadline = Date.now() + TIMEOUT_MS;
  let report = null;
  while (Date.now() < deadline && !report?.summary) {
    await sleep(1000);
    const res = await send('Runtime.evaluate', {
      expression: 'JSON.stringify(window.__terrainSpike ?? null)',
      returnByValue: true,
    });
    report = JSON.parse(res?.result?.value ?? 'null');
  }
  ws.close();
  if (!report?.summary) throw new Error('el recorrido no terminó a tiempo');
  console.log(JSON.stringify(report, null, 2));
} finally {
  chrome.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
