import { expect, firefox, type Page, test } from '@playwright/test';
import type { LiveDebug } from '../src/live/debug';

// Mundo chico (rápido) y un año de control antes del final. La seed 7 es tardía: agricultura hacia
// el −1000 y polities desde el 1 d.C. (ws run); en el 1000 d.C. (k = 13.000) ya hay de todo.
const WORLD = '?seed=7&size=small&map=continents&land=0.3';
const K = 3000;
const K_POLITIES = 13_000;
/** Último estado de la corrida (−12000 → 1900). */
const END_K = 13_900;
const WAIT = { timeout: 120_000, polling: 250 };

type Win = Window & { __live?: LiveDebug };

async function live(page: Page): Promise<void> {
  await page.waitForFunction(() => (window as Win).__live?.status() != null, null, WAIT);
}

async function hashAfterMax(page: Page, k: number): Promise<string> {
  await page.evaluate(() => {
    (window as Win).__live?.setSpeed('max');
  });
  await page.waitForFunction((k) => ((window as Win).__live?.status()?.head ?? 0) > k, k, WAIT);
  return page.evaluate((k) => (window as Win).__live?.hash(k) ?? '', k);
}

test('vivo: reproduce, simula por delante, muestra polities y asentamientos', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(WORLD);
  await live(page);
  // A 1× la reproducción avanza y el Worker va por delante con el colchón (D49).
  await page.waitForFunction(() => ((window as Win).__live?.status()?.k ?? 0) > 30, null, WAIT);
  const s = await page.evaluate(() => (window as Win).__live?.status());
  expect(s?.head ?? 0).toBeGreaterThan(s?.k ?? 0);
  await expect(page.getByRole('radio', { name: '1×' })).toHaveAttribute('aria-checked', 'true');
  // Más adelante en la corrida el mapa tiene polities y asentamientos.
  await hashAfterMax(page, K_POLITIES);
  const frame = await page.evaluate((k) => (window as Win).__live?.frame(k), K_POLITIES);
  expect(frame?.polities ?? 0).toBeGreaterThan(0);
  expect(frame?.owned ?? 0).toBeGreaterThan(0);
  expect(frame?.settlements ?? 0).toBeGreaterThan(0);
  // Rebobinar con la línea de tiempo: clic al principio.
  const timeline = page.getByRole('slider');
  const box = await timeline.boundingBox();
  if (!box) throw new Error('sin línea de tiempo');
  await page.evaluate(() => {
    (window as Win).__live?.setSpeed(0);
  });
  await page.mouse.click(box.x + 2, box.y + box.height / 2);
  const back = await page.evaluate(() => (window as Win).__live?.status()?.k ?? -1);
  expect(back).toBeLessThan(100);
  expect(errors).toEqual([]);
});

test('guardar a mitad de corrida, recargar, cargar y continuar da el mismo hash', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  // Referencia: la corrida sin cortes.
  await page.goto(WORLD);
  await live(page);
  const reference = await hashAfterMax(page, K);

  // Corrida nueva: a 1× el Worker llena el colchón; se pausa y se guarda antes de K.
  await page.goto(WORLD);
  await live(page);
  await page.waitForFunction(
    () => ((window as Win).__live?.status()?.head ?? 0) >= 300,
    null,
    WAIT,
  );
  await page.evaluate(() => {
    (window as Win).__live?.setSpeed(0);
  });
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText(/Guardado hasta/)).toBeVisible();
  const saves = await page.evaluate(() => (window as Win).__live?.saves() ?? Promise.resolve([]));
  expect(saves).toHaveLength(1);
  const saved = saves[0];
  if (!saved) throw new Error('no se guardó');
  expect(saved.years).toBeLessThan(K);

  // Cargar desde la lista de "Crear" (IndexedDB): sigue desde lo guardado y llega al mismo hash.
  await page.goto('/');
  await page.getByRole('button', { name: 'Cargar' }).click();
  await page.waitForURL(/load=/);
  await live(page);
  // Sigue desde lo guardado (y ya avanzó a 1× mientras se leía el estado).
  const resumed = await page.evaluate(() => (window as Win).__live?.status()?.k ?? -1);
  expect(resumed).toBeGreaterThanOrEqual(saved.years);
  expect(resumed).toBeLessThan(saved.years + 200);
  expect(await hashAfterMax(page, K)).toBe(reference);

  // Borrar lo saca de la lista.
  await page.goto('/');
  await page.getByRole('button', { name: 'Borrar' }).click();
  await expect(page.getByText('Todavía no hay mundos guardados.')).toBeVisible();
  expect(errors).toEqual([]);
});

test('UI v1: crear → vivo → inspector → resumen → ficha; es/en sin regenerar', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error')
      errors.push(`${m.text()} @ ${m.location().url}:${m.location().lineNumber}`);
  });
  await page.goto('/');
  await page.getByLabel('Semilla').fill('7');
  await page.getByLabel('Chico').check();
  await page.getByRole('button', { name: 'Generar mundo' }).click();
  await page.waitForURL(/\/mundo\?/);
  await live(page);
  await hashAfterMax(page, K_POLITIES);
  await page.evaluate((k) => {
    (window as Win).__live?.setSpeed(0);
    (window as Win).__live?.scrub(k);
  }, K_POLITIES);

  // Teletipo → inspector, con el "por qué" a la fecha.
  await page.locator('.ticker button').first().click();
  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  await expect(inspector.getByRole('heading', { level: 2 })).not.toBeEmpty();
  const why = inspector.getByRole('button', { name: 'Calcular el porqué' });
  if ((await why.count()) > 0) {
    await why.click();
    await expect(inspector.getByText(/calculado para/)).toBeVisible();
  }

  // Resumen: 3 gráficos y listas; una fila abre su ficha.
  await page.getByRole('link', { name: 'Resumen' }).click();
  await page.waitForURL(/\/mundo\/resumen/);
  await expect(page.locator('figcaption')).toHaveCount(3);
  await page.locator('.entity-table .tr a').first().click();
  await page.waitForURL(/\/mundo\/resumen\/polity\//);
  await expect(page.getByText('Eventos (con sus causas)')).toBeVisible();

  // Cambiar de idioma cambia la UI y los textos de eventos, sin regenerar el mundo: la sesión es
  // el mismo objeto antes y después (regenerar crearía otra).
  await page.evaluate(() => {
    (window as Win & { __before?: unknown }).__before = (window as Win).__live;
  });
  await page.getByRole('button', { name: 'en', exact: true }).click();
  await expect(page.getByText('Events (with their causes)')).toBeVisible();
  await expect(page.getByText(/Generating the world/)).toHaveCount(0);
  expect(
    await page.evaluate(
      () => (window as Win & { __before?: unknown }).__before === (window as Win).__live,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

/** Link de compartir del mundo abierto (lo arma el panel "Compartir"). */
async function shareLink(page: Page): Promise<string> {
  await page.getByRole('button', { name: 'Compartir' }).click();
  const link = await page
    .getByRole('dialog', { name: 'Compartir este mundo' })
    .getByRole('textbox')
    .inputValue();
  expect(link).toContain('v=');
  return link;
}

/** Abre un link compartido y espera la historia completa; devuelve la huella final que muestra. */
async function openShared(page: Page, link: string): Promise<string> {
  await page.goto(link);
  const done = page.getByText(/Huella final: /);
  await expect(done).toBeVisible({ timeout: 180_000 });
  const text = (await done.textContent()) ?? '';
  return text.replace(/.*Huella final: /, '').trim();
}

test('compartir: el link regenera el mundo, simula a máx. y da la misma huella final', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(WORLD);
  await live(page);
  const link = await shareLink(page);
  // Referencia: la misma corrida a máx. hasta el final (k = 13.900, año 1900).
  await page.evaluate(() => {
    (window as Win).__live?.setSpeed('max');
  });
  await page.waitForFunction(
    (k) => ((window as Win).__live?.status()?.head ?? 0) >= k,
    END_K,
    WAIT,
  );
  const reference = await page.evaluate((k) => (window as Win).__live?.hash(k) ?? '', END_K);
  const fromLink = await openShared(page, link);
  expect(fromLink).toBe(reference);
  // Queda en pausa al principio, lista para reproducir.
  const s = await page.evaluate(() => (window as Win).__live?.status());
  expect([s?.k, s?.speed, s?.fastForward]).toEqual([0, 0, 'done']);
  await page.getByRole('button', { name: 'Reproducir desde el principio' }).click();
  await expect(page.getByRole('radio', { name: '1×' })).toHaveAttribute('aria-checked', 'true');
  expect(errors).toEqual([]);
});

test('compartir: el mismo link en otro navegador da la misma huella', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'abre el link de Chromium en Firefox');
  await page.goto(WORLD);
  await live(page);
  const link = await shareLink(page);
  const here = await openShared(page, link);
  const other = await firefox.launch();
  try {
    const there = await openShared(await other.newPage(), link);
    expect(there).toBe(here);
  } finally {
    await other.close();
  }
});

test('compartir: un link de otra versión del motor avisa', async ({ page }) => {
  await page.goto(`${WORLD}&v=0.0.0`);
  await expect(page.getByText(/Este link es de la versión 0\.0\.0 del motor/)).toBeVisible({
    timeout: 120_000,
  });
});
