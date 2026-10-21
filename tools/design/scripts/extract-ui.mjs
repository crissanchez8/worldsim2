// Extrae datos reales de la app (P1) para las maquetas de P2.2 (D58), en español, leyendo el DOM
// del build (`vite preview`) con el Google Chrome instalado. Es una extracción, no un test: usa
// selectores CSS. Uso:
//
//   pnpm --filter @ws/web build && pnpm --filter @ws/web preview --port 4176
//   node tools/design/scripts/extract-ui.mjs --k 13000
//
// Recorrido: vista en vivo en k (barra superior, tiempo, teletipo, eras y marcadores) → resumen
// ordenado por provincias → ficha del estado más grande con su porqué → ficha de su capital con
// su porqué. Escribe `tools/design/src/data/ui-es.json`.
/* global window, document */
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';

const { values: a } = parseArgs({
  options: {
    base: { type: 'string', default: 'http://localhost:4176' },
    k: { type: 'string', default: '13000' },
    out: { type: 'string', default: 'tools/design/src/data/ui-es.json' },
  },
});
/** Versión del motor del link compartido (packages/core/src/version.ts). */
const ENGINE_VERSION = '0.1.3';
/** Espera del porqué (keyframe + re-simulación en el Worker, ms). */
const WHY_MS = 3000;

const url = new URL('/mundo', a.base);
for (const [key, value] of Object.entries({
  seed: '1',
  size: 'medium',
  map: 'continents',
  land: '0.3',
  v: ENGINE_VERSION,
})) {
  url.searchParams.set(key, value);
}

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url.toString());
await page.waitForFunction(() => window.__live?.status()?.fastForward === 'done', null, {
  timeout: 600_000,
  polling: 500,
});
const k = Number(a.k);
await page.evaluate((kk) => {
  window.__live.setSpeed(0);
  window.__live.scrub(kk);
}, k);
await page.waitForTimeout(1500);

const text = (sel) => page.evaluate((s) => document.querySelector(s)?.innerText ?? null, sel);
const bodyText = () => page.evaluate(() => document.body.innerText);
const clickWhy = async () => {
  const why = page.locator('button', { hasText: 'Calcular el porqué' });
  if ((await why.count()) === 0) return false;
  await why.first().click();
  await page.waitForTimeout(WHY_MS);
  return true;
};

const out = { k, url: url.toString() };
try {
  out.topBar = await text('.top-bar');
  out.timeRow = await text('.time-row');
  out.ticker = await text('.ticker');
  out.rail = await text('.rail');
  out.timeline = await page.evaluate((kk) => window.__live.timeline(kk), k);
  out.endK = await page.evaluate(() => window.__live.status().endK);

  // Resumen → Estados ordenados por provincias (de mayor a menor).
  await page.locator('a', { hasText: 'Resumen' }).first().click();
  await page.waitForTimeout(1500);
  out.summary = await bodyText();
  const header = page.locator('[role="columnheader"]', { hasText: 'Provincias' });
  await header.click();
  await header.click();
  await page.waitForTimeout(500);
  const firstRow = page.locator('.entity-table .tbody a, .entity-table .tbody button').first();
  out.polityName = await firstRow.innerText();
  await firstRow.click();
  await page.waitForTimeout(1500);
  out.polityUrl = page.url();
  out.polityPage = await bodyText();
  if (await clickWhy()) out.polityPageWhy = await bodyText();

  // Capital de la polity (primer link "provincia N").
  const capital = page.locator('a, button', { hasText: /^provincia \d+$/ }).first();
  if (await capital.count()) {
    await capital.click();
    await page.waitForTimeout(1500);
    out.provincePage = await bodyText();
    if (await clickWhy()) out.provincePageWhy = await bodyText();
  }
} catch (error) {
  out.error = String(error).slice(0, 500);
} finally {
  writeFileSync(a.out, JSON.stringify(out, null, 1));
}
console.log('ok', a.out, out.polityName ?? '', out.error ?? '');
await browser.close();
