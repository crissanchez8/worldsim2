// Verifica que las reglas de fronteras (.dependency-cruiser.cjs) fallan de verdad con imports
// prohibidos. Un lint que no falla es peor que ninguno.
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { cruise, type ICruiseResult, type IConfiguration } from 'dependency-cruiser';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(import.meta.dirname, '../../..');
const fixtures = resolve(import.meta.dirname, '../fixtures/boundaries');
const require = createRequire(import.meta.url);
const config = require(resolve(repoRoot, '.dependency-cruiser.cjs')) as IConfiguration;

interface Violation {
  rule: string;
  from: string;
}

let cached: Promise<Violation[]> | undefined;
const violations = (): Promise<Violation[]> => (cached ??= cruiseFixtures());

async function cruiseFixtures(): Promise<Violation[]> {
  const result = await cruise([fixtures], {
    validate: true,
    ruleSet: { forbidden: config.forbidden ?? [] },
    exclude: { path: 'node_modules' },
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    outputType: 'json',
  });
  const output: ICruiseResult =
    typeof result.output === 'string'
      ? (JSON.parse(result.output) as ICruiseResult)
      : result.output;
  return output.summary.violations.map((v) => ({
    rule: v.rule.name,
    from: v.from.slice(v.from.indexOf('fixtures/boundaries/') + 'fixtures/boundaries/'.length),
  }));
}

describe('fronteras entre paquetes (dependency-cruiser)', () => {
  const cases = [
    ['packages/core/src/imports-react.ts', 'headless-no-ui-libs'],
    ['packages/core/src/imports-three.ts', 'headless-no-ui-libs'],
    ['packages/core/src/imports-ui.ts', 'headless-no-ui-apps-tools'],
    ['packages/ui/src/imports-engine.ts', 'ui-no-engine'],
    ['apps/web/src/imports-spike.ts', 'no-spikes'],
  ] as const;

  it.each(cases)('%s viola %s', async (from, rule) => {
    expect(await violations()).toContainEqual({ rule, from });
  });

  it('los módulos limpios no tienen violaciones', async () => {
    const dirty = new Set((await violations()).map((v) => v.from));
    expect(dirty.has('packages/core/src/clean.ts')).toBe(false);
    expect(dirty.has('packages/ui/src/index.ts')).toBe(false);
  });
});
