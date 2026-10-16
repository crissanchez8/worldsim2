import { expect, test } from '@playwright/test';

const years = Number(process.env['DETERMINISM_YEARS'] ?? 2000);

interface SpikeC {
  done: boolean;
  mathMismatches: string[];
  rngMatch: boolean;
  firstDivergentYear: number | null;
  finalHash: string | null;
  expectedFinalHash: string | null;
  seconds: number;
}

test(`hash idéntico a Node durante ${years} años`, async ({ page, browserName }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`?years=${years}`);
  await page.waitForFunction(
    () => (globalThis as { __spikeC?: { done: boolean } }).__spikeC?.done === true,
    null,
    {
      timeout: 14 * 60 * 1000,
      polling: 1000,
    },
  );
  const r = await page.evaluate(() => (globalThis as unknown as { __spikeC: SpikeC }).__spikeC);
  test
    .info()
    .annotations.push({ type: 'tiempo', description: `${browserName}: ${r.seconds.toFixed(1)} s` });
  expect(errors).toEqual([]);
  expect(r.mathMismatches, 'funciones de core/math con bits distintos').toEqual([]);
  expect(r.rngMatch, 'RNG').toBe(true);
  expect(r.firstDivergentYear, 'primer año con hash distinto').toBeNull();
  expect(r.finalHash).toBe(r.expectedFinalHash);
});
