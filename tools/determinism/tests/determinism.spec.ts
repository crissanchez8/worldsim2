import { expect, test } from '@playwright/test';
import type { DeterminismResult } from '../src/main';

const years = process.env['DETERMINISM_YEARS'];

test(`hash idéntico a Node (${years ?? 'corrida completa'})`, async ({ page, browserName }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(years === undefined ? './' : `?years=${years}`);
  await page.waitForFunction(
    () => (globalThis as { __determinism?: { done: boolean } }).__determinism?.done === true,
    null,
    { timeout: 14 * 60 * 1000, polling: 1000 },
  );
  const r = await page.evaluate(
    () => (globalThis as unknown as { __determinism: DeterminismResult }).__determinism,
  );
  test.info().annotations.push({
    type: 'tiempo',
    description: `${browserName}: ${r.seconds.toFixed(1)} s (worldgen ${r.worldgenSeconds.toFixed(2)} s)`,
  });
  expect(errors).toEqual([]);
  expect(r.mismatches, 'verificaciones distintas de Node').toEqual([]);
  expect(r.firstDivergentYear, 'primer año con hash distinto').toBeNull();
  expect(r.finalHash).toBe(r.expectedFinalHash);
});
