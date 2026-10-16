// Verifica que el lint de determinismo falla con CADA API prohibida y no da falsos positivos.
// Usa la configuración real del repo (eslint.config.js), no una copia.
import { resolve } from 'node:path';
import { ESLint, type Linter } from 'eslint';
import { describe, expect, it } from 'vitest';
import {
  ENGINE_PACKAGES,
  FORBIDDEN_GLOBALS,
  FORBIDDEN_PROPERTIES,
  MATH_ALLOWED,
} from './determinism.js';

const repoRoot = resolve(import.meta.dirname, '../../..');
const eslint = new ESLint({ cwd: repoRoot });

/** Archivo real del motor: el código se lintea "como si" estuviera ahí (type-aware incluido). */
const ENGINE_FILE = resolve(repoRoot, 'packages/core/src/index.ts');

async function lint(code: string, filePath = ENGINE_FILE): Promise<Linter.LintMessage[]> {
  const [result] = await eslint.lintText(code, { filePath });
  if (!result) throw new Error('ESLint no devolvió resultado');
  return result.messages;
}

async function ruleIds(code: string, filePath?: string): Promise<string[]> {
  return (await lint(code, filePath)).map((m) => m.ruleId ?? `fatal: ${m.message}`);
}

// Listas canónicas INDEPENDIENTES de la config: si alguien afloja determinism.js, estos casos
// siguen exigiendo que falle. Cambiar la allowlist obliga a cambiar este test a conciencia.
const MATH_ALLOWED_EXPECTED = [
  'abs',
  'floor',
  'ceil',
  'round',
  'trunc',
  'sign',
  'min',
  'max',
  'sqrt',
  'imul',
  'fround',
  'clz32',
  'PI',
  'E',
  'LN2',
  'LN10',
  'LOG2E',
  'LOG10E',
  'SQRT2',
  'SQRT1_2',
];
const MATH_MUST_FAIL = [
  'random',
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'atan2',
  'sinh',
  'cosh',
  'tanh',
  'asinh',
  'acosh',
  'atanh',
  'exp',
  'expm1',
  'log',
  'log1p',
  'log2',
  'log10',
  'pow',
  'cbrt',
  'hypot',
];
const GLOBALS_MUST_FAIL = [
  'Date',
  'performance',
  'crypto',
  'Intl',
  'setTimeout',
  'setInterval',
  'queueMicrotask',
  'requestAnimationFrame',
  'globalThis',
  'window',
  'self',
  'document',
  'navigator',
  'process',
  'fetch',
  'WeakRef',
  'FinalizationRegistry',
  'SharedArrayBuffer',
  'Atomics',
];
const PROPERTIES_MUST_FAIL: [object: string | undefined, property: string][] = [
  ['Object', 'keys'],
  ['Object', 'values'],
  ['Object', 'entries'],
  ['Reflect', 'ownKeys'],
  [undefined, 'localeCompare'],
  [undefined, 'toLocaleString'],
  [undefined, 'toLocaleDateString'],
];

const allowedExpected = new Set(MATH_ALLOWED_EXPECTED);
// Lo que expone el runtime actual en Math y no está permitido (atrapa funciones nuevas del
// lenguaje), más la lista canónica.
const mathForbidden = [
  ...new Set([
    ...Object.getOwnPropertyNames(Math).filter((name) => !allowedExpected.has(name)),
    ...MATH_MUST_FAIL,
  ]),
].sort();
const globalsForbidden = [...new Set([...GLOBALS_MUST_FAIL, ...Object.keys(FORBIDDEN_GLOBALS)])];
const propertiesForbidden = [
  ...PROPERTIES_MUST_FAIL,
  ...FORBIDDEN_PROPERTIES.map((p): [string | undefined, string] => [
    'object' in p ? p.object : undefined,
    p.property,
  ]),
];

describe('lint de determinismo · motor', () => {
  it.each(mathForbidden)('Math.%s falla', async (name) => {
    expect(await ruleIds(`export const x: unknown = Math.${name};\n`)).toContain(
      'no-restricted-syntax',
    );
  });

  it('la allowlist de Math es exactamente la esperada', () => {
    expect([...MATH_ALLOWED].sort()).toEqual([...MATH_ALLOWED_EXPECTED].sort());
  });

  it.each(MATH_ALLOWED_EXPECTED)('Math.%s pasa', async (name) => {
    expect(await ruleIds(`export const x: unknown = Math.${name};\n`)).not.toContain(
      'no-restricted-syntax',
    );
  });

  it.each(globalsForbidden)('el global %s falla', async (name) => {
    expect(await ruleIds(`export const x: unknown = ${name};\n`)).toContain(
      'no-restricted-globals',
    );
  });

  it.each(propertiesForbidden)('%s.%s falla', async (object, property) => {
    const target = object ?? 'value';
    const code = `declare const value: never;\nexport const x: unknown = ${target}.${property};\n`;
    expect(await ruleIds(code)).toContain('no-restricted-properties');
  });

  const bypasses: [string, string, string][] = [
    ['new Date()', 'export const x = new Date();\n', 'no-restricted-globals'],
    ['Date.now()', 'export const x = Date.now();\n', 'no-restricted-globals'],
    ['performance.now()', 'export const x = performance.now();\n', 'no-restricted-globals'],
    [
      'crypto.getRandomValues',
      'export const x: unknown = crypto.getRandomValues;\n',
      'no-restricted-globals',
    ],
    [
      'globalThis.Math.sin',
      'export const x: unknown = globalThis.Math.sin;\n',
      'no-restricted-globals',
    ],
    ["Math['sin']", "export const x: unknown = Math['sin'];\n", 'no-restricted-syntax'],
    ['desestructurar Math', 'export const { sin } = Math;\n', 'no-restricted-syntax'],
    ['alias de Math', 'export const M = Math;\n', 'no-restricted-syntax'],
    [
      'for...in',
      'export function f(o: Record<string, number>): number {\n  let n = 0;\n  for (const k in o) n += k.length;\n  return n;\n}\n',
      'no-restricted-syntax',
    ],
    ['sort() sin comparador', 'export const x = [3, 1, 2].sort();\n', 'no-restricted-syntax'],
    [
      'toSorted() sin comparador',
      'export const x = [3, 1, 2].toSorted();\n',
      'no-restricted-syntax',
    ],
    ["import 'react'", "import 'react';\n", 'no-restricted-imports'],
    ["import 'three'", "import 'three';\n", 'no-restricted-imports'],
  ];

  it.each(bypasses)('%s falla', async (_label, code, rule) => {
    expect(await ruleIds(code)).toContain(rule);
  });

  it('código determinista idiomático pasa sin ningún error', async () => {
    const code = [
      'export function mix(a: number, b: number): number {',
      '  return Math.imul(a ^ (a >>> 16), 0x85ebca6b) + Math.sqrt(Math.abs(b));',
      '}',
      '',
      'export function sortedIds(ids: readonly number[]): number[] {',
      '  return [...ids].sort((x, y) => x - y);',
      '}',
      '',
      'export function total(byId: ReadonlyMap<number, number>): number {',
      '  let sum = 0;',
      '  for (const [, value] of byId) sum += value;',
      '  return Math.max(0, Math.floor(sum));',
      '}',
      '',
    ].join('\n');
    expect(await lint(code)).toEqual([]);
  });
});

describe('lint de determinismo · alcance', () => {
  it.each([...ENGINE_PACKAGES])('se aplica a packages/%s', async (name) => {
    const config = (await eslint.calculateConfigForFile(
      resolve(repoRoot, `packages/${name}/src/index.ts`),
    )) as Linter.Config;
    expect(config.rules?.['no-restricted-globals']).toBeDefined();
    expect(JSON.stringify(config.rules?.['no-restricted-syntax'])).toContain('ForInStatement');
  });

  it.each(['apps/web/src/App.tsx', 'packages/i18n/src/index.ts', 'tools/cli/src/main.ts'])(
    'no se aplica fuera del motor (%s)',
    async (file) => {
      const config = (await eslint.calculateConfigForFile(
        resolve(repoRoot, file),
      )) as Linter.Config;
      expect(config.rules?.['no-restricted-globals']).toBeUndefined();
    },
  );
});

describe('lint de texto de UI', () => {
  const APP = resolve(repoRoot, 'apps/web/src/App.tsx');

  it.each([
    ['texto JSX', 'export const A = () => <p>Hola</p>;\n'],
    ['string en expresión', "export const A = () => <p>{'Hola'}</p>;\n"],
    ['atributo visible', 'export const A = () => <img alt="Mapa" />;\n'],
  ])('%s suelto falla', async (_label, code) => {
    expect(await ruleIds(code, APP)).toContain('no-restricted-syntax');
  });

  it('texto vía t() pasa', async () => {
    const code =
      "declare const t: (key: string) => string;\nexport const A = () => <p title={t('a')}>{t('b')}</p>;\n";
    expect(await ruleIds(code, APP)).not.toContain('no-restricted-syntax');
  });
});
