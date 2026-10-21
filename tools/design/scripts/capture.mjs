// Captura las maquetas de P2.2 (1440 × 900; la hoja, entera) con el Google Chrome instalado.
//   node tools/design/scripts/capture.mjs [--base http://localhost:4177] [--out docs/phases/P02/img]
//   [--only grabado/vivo]
/* global document */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';

const { values: a } = parseArgs({
  options: {
    base: { type: 'string', default: 'http://localhost:4177' },
    out: { type: 'string', default: 'docs/phases/P02/img' },
    only: { type: 'string' },
    dpr: { type: 'string', default: '1' },
  },
});
const DIRS = ['grabado', 'observatorio', 'suizo'];
const PAGES = ['vivo', 'inspector', 'ficha', 'atlas', 'hoja'];
mkdirSync(a.out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: Number(a.dpr),
});
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
for (const d of DIRS) {
  for (const p of PAGES) {
    if (a.only && a.only !== `${d}/${p}`) continue;
    await page.goto(`${a.base}/tools/design/mock.html?d=${d}&p=${p}`);
    await page.waitForFunction(() => document.documentElement.dataset.ready === '1');
    await page.waitForTimeout(300);
    const file = resolve(a.out, `${d}-${p}.png`);
    await page.screenshot({ path: file, fullPage: p === 'hoja' });
    console.log(file);
  }
}
if (errors.length) console.log('errores:', errors);
await browser.close();
