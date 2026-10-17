import { expect, type Page, test } from '@playwright/test';
import type { LiveDebug } from '../src/live/debug';

// Mundo chico (rápido) y un año de control antes del final. La seed 7 es tardía: agricultura hacia
// el −1000 y polities desde el 1 d.C. (ws run); en el 1000 d.C. (k = 13.000) ya hay de todo.
const WORLD = '?seed=7&size=small&map=continents&land=0.3';
const K = 3000;
const K_POLITIES = 13_000;
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

  // Recargar y cargar desde la lista (IndexedDB): sigue desde lo guardado y llega al mismo hash.
  await page.reload();
  await page.getByRole('button', { name: 'Cargar' }).click();
  await page.waitForURL(/load=/);
  await live(page);
  // Sigue desde lo guardado (y ya avanzó a 1× mientras se leía el estado).
  const resumed = await page.evaluate(() => (window as Win).__live?.status()?.k ?? -1);
  expect(resumed).toBeGreaterThanOrEqual(saved.years);
  expect(resumed).toBeLessThan(saved.years + 200);
  expect(await hashAfterMax(page, K)).toBe(reference);

  // Borrar lo saca de la lista.
  await page.getByRole('button', { name: 'Borrar' }).click();
  await expect(page.getByText('Todavía no hay mundos guardados.')).toBeVisible();
  expect(errors).toEqual([]);
});
