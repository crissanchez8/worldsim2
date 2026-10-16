// Mide el spike B en Chromium, Firefox y WebKit headless (Playwright) contra el BUILD
// (`vite preview`, L-009). Uso: node scripts/measure-browsers.mjs [años] [navegadores…]
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium, firefox, webkit } from '@playwright/test';

const years = Number(process.argv[2] ?? 14000);
const wanted = process.argv.slice(3);
const engines = { chromium, firefox, webkit };
const names = wanted.length ? wanted : Object.keys(engines);
const port = 4175;
const url = `http://localhost:${port}/spikes/worker/?auto=1&years=${years}`;

async function measure(name) {
  const browser = await engines[name].launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    const t0 = Date.now();
    await page.goto(url);
    await page.waitForFunction(() => globalThis.__spikeB !== undefined, null, {
      timeout: 10 * 60 * 1000,
      polling: 1000,
    });
    const result = await page.evaluate(() => globalThis.__spikeB);
    return {
      ...result,
      wallSeconds: Math.round((Date.now() - t0) / 100) / 10,
      errors,
      version: browser.version(),
    };
  } finally {
    await browser.close();
  }
}

const server = spawn('pnpm', ['exec', 'vite', 'preview', '--port', String(port), '--strictPort'], {
  stdio: 'ignore',
});
try {
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(url)).ok) break;
    } catch {
      /* todavía arrancando */
    }
    await sleep(200);
  }
  const all = {};
  for (const name of names) {
    try {
      all[name] = await measure(name);
      console.error(
        `${name}: ${JSON.stringify(all[name].msPerYear)} · ${all[name].totalSeconds} s`,
      );
    } catch (error) {
      // p. ej. WebKit de Playwright 1.64.1 se cae al abrir una página en macOS 26.0 (L-012)
      all[name] = { error: String(error).split('\n')[0] };
      console.error(`${name}: falló (${all[name].error})`);
    }
  }
  console.log(JSON.stringify(all, null, 2));
} finally {
  server.kill();
}
