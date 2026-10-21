// Renders reales del mapa para las maquetas de P2.2 (D58), con el Google Chrome instalado (GPU
// real, L-010/L-019) contra el BUILD de la web (L-009):
//
//   pnpm --filter @ws/web build && pnpm --filter @ws/web preview --port 4176
//   node tools/design/scripts/shoot-map.mjs --scan                 # polities por siglo, para elegir k
//   node tools/design/scripts/shoot-map.mjs --look suizo --k 9500 --distance 480 --name atlas
//
// Abre un link compartido (`v=`: el mundo se simula entero a máx.), rebobina a k, oculta la UI y
// captura solo el mapa. Además guarda un JSON con los datos reales del marco (polities con nombre,
// capital y ancla del rótulo, asentamientos con nivel y nombre) proyectados a píxeles de la
// captura, para que la maqueta ponga rótulos y símbolos en su lugar.
/* global window */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';

const { values: a } = parseArgs({
  options: {
    base: { type: 'string', default: 'http://localhost:4176' },
    seed: { type: 'string', default: '1' },
    size: { type: 'string', default: 'medium' },
    look: { type: 'string', default: 'p1' },
    k: { type: 'string' },
    x: { type: 'string' },
    z: { type: 'string' },
    distance: { type: 'string' },
    width: { type: 'string', default: '1440' },
    height: { type: 'string', default: '900' },
    dpr: { type: 'string', default: '2' },
    name: { type: 'string', default: 'vivo' },
    out: { type: 'string', default: 'tools/design/public/renders' },
    scan: { type: 'boolean', default: false },
  },
});

/** Versión del motor del link compartido (packages/core/src/version.ts). */
const ENGINE_VERSION = '0.1.3';
/** Espera máxima de la corrida a máx. (ms). */
const RUN_TIMEOUT_MS = 600_000;
/** Cuadros que se dejan pasar después de rebobinar, para que el mapa termine de dibujar (ms). */
const SETTLE_MS = 2500;
/** Sin nivel de asentamiento (`NO_LEVEL` de @ws/history). */
const NO_LEVEL = 255;

const url = new URL('/mundo', a.base);
url.searchParams.set('seed', a.seed);
url.searchParams.set('size', a.size);
url.searchParams.set('map', 'continents');
url.searchParams.set('land', '0.3');
url.searchParams.set('v', ENGINE_VERSION);
url.searchParams.set('look', a.look);
url.searchParams.set('markers', '0');
for (const key of ['x', 'z', 'distance']) if (a[key]) url.searchParams.set(key, a[key]);

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({
  viewport: { width: Number(a.width), height: Number(a.height) },
  deviceScaleFactor: Number(a.dpr),
});
await page.goto(url.toString());
await page.waitForFunction(() => window.__live?.status()?.fastForward === 'done', null, {
  timeout: RUN_TIMEOUT_MS,
  polling: 500,
});

if (a.scan) {
  const rows = await page.evaluate(() => {
    const live = window.__live;
    const end = live.status().endK;
    const out = [];
    for (let k = 0; k <= end; k += 500) out.push({ k, ...live.frame(k) });
    return { end, rows: out };
  });
  console.log(JSON.stringify(rows, null, 1));
  await browser.close();
  process.exit(0);
}

const k = Number(a.k);
await page.evaluate((kk) => window.__live.scrub(kk), k);
await page.addStyleTag({
  content: '.hud, .banners, .map-tooltip { visibility: hidden !important; }',
});
await page.waitForTimeout(SETTLE_MS);

const data = await page.evaluate(
  ({ kk, noLevel }) => {
    const live = window.__live;
    const map = window.__mapDebug;
    const frame = live.frameData(kk);
    const names = live.names();
    const polityName = new Map(names.polities);
    const settlementAt = new Map(names.settlements.map(([, name, province]) => [province, name]));
    const W = 2048;
    // Ancla del rótulo: centroide de las provincias de la polity, con media circular en x (wrap).
    const acc = new Map();
    for (let p = 1; p < frame.owner.length; p++) {
      const owner = frame.owner[p];
      if (!owner) continue;
      const [x, z] = map.centroid(p);
      const ang = (x / W) * 2 * Math.PI;
      const s = acc.get(owner) ?? { sx: 0, cx: 0, z: 0, n: 0 };
      s.sx += Math.sin(ang);
      s.cx += Math.cos(ang);
      s.z += z;
      s.n += 1;
      acc.set(owner, s);
    }
    const polities = [];
    for (const [id, s] of acc) {
      const ang = Math.atan2(s.sx / s.n, s.cx / s.n);
      const x = ((((ang / (2 * Math.PI)) * W) % W) + W) % W;
      const capital = frame.capitals.find(([pid]) => pid === id)?.[1] ?? 0;
      polities.push({
        id,
        name: polityName.get(id) ?? null,
        provinces: s.n,
        world: [x, s.z / s.n],
        anchor: map.project(x, s.z / s.n),
        capital,
        capitalAt: capital ? map.project(...map.centroid(capital)) : null,
      });
    }
    polities.sort((p, q) => q.provinces - p.provinces);
    const settlements = [];
    for (let p = 1; p < frame.level.length; p++) {
      const level = frame.level[p];
      if (level === noLevel) continue;
      settlements.push({
        province: p,
        level,
        name: settlementAt.get(p) ?? null,
        owner: frame.owner[p],
        at: map.project(...map.centroid(p)),
      });
    }
    return { k: kk, year: live.status()?.year ?? null, polities, settlements };
  },
  { kk: k, noLevel: NO_LEVEL },
);

const dir = resolve(a.out, a.look);
mkdirSync(dir, { recursive: true });
const png = resolve(dir, `${a.name}.png`);
await page.screenshot({ path: png });
writeFileSync(
  resolve(dir, `${a.name}.json`),
  JSON.stringify({
    url: url.toString(),
    width: Number(a.width),
    height: Number(a.height),
    ...data,
  }),
);
mkdirSync(dirname(png), { recursive: true });
console.log(
  `${png} · k=${k} · ${data.polities.length} polities · ${data.settlements.length} asentamientos`,
);
await browser.close();
