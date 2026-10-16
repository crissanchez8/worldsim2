// Reglas de determinismo para los paquetes del motor (CLAUDE.md, regla de oro 1).
// JS plano con JSDoc para que `eslint.config.js` lo importe sin compilar.

/** Paquetes del motor: headless y deterministas (DEVELOPMENT_PLAN §8.1). */
export const ENGINE_PACKAGES = /** @type {const} */ ([
  'core',
  'worldgen',
  'content',
  'lang',
  'sim',
  'history',
  'chronicle',
]);

export const ENGINE_FILES = ENGINE_PACKAGES.map((name) => `packages/${name}/**/*.{ts,tsx,js}`);

/**
 * Allowlist de `Math`: solo operaciones exactas en IEEE-754 (o enteras) y constantes.
 * Todo lo demás falla, incluidas funciones que el lenguaje agregue en el futuro.
 * Las trascendentes van por `@ws/core/math`.
 */
export const MATH_ALLOWED = /** @type {const} */ ([
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
]);

/** Globals prohibidos en el motor, con el motivo. */
export const FORBIDDEN_GLOBALS = /** @type {const} */ ({
  Date: 'el reloj no es determinista; el tiempo del mundo vive en @ws/core/time',
  performance: 'el reloj no es determinista; medir solo en tools/ (bench)',
  crypto: 'azar fuera del RNG; usar rng.stream(...)',
  Intl: 'depende del locale y del navegador; el formateo vive en @ws/i18n',
  setTimeout: 'el motor es síncrono; los timers viven en apps/web',
  setInterval: 'el motor es síncrono; los timers viven en apps/web',
  setImmediate: 'el motor es síncrono',
  clearTimeout: 'el motor es síncrono',
  clearInterval: 'el motor es síncrono',
  queueMicrotask: 'el motor es síncrono',
  requestAnimationFrame: 'el motor es headless',
  requestIdleCallback: 'el motor es headless',
  globalThis: 'evita saltear las reglas (p. ej. globalThis.Math.sin)',
  window: 'el motor es headless (sin DOM)',
  self: 'el motor es headless (el Worker vive en apps/web)',
  document: 'el motor es headless (sin DOM)',
  navigator: 'el motor es headless (sin DOM)',
  process: 'el entorno no es parte del estado',
  fetch: 'el motor no hace IO',
  WeakRef: 'depende del recolector de basura',
  FinalizationRegistry: 'depende del recolector de basura',
  SharedArrayBuffer: 'concurrencia no determinista',
  Atomics: 'concurrencia no determinista',
});

/** Propiedades prohibidas (cualquier objeto, o un objeto puntual). */
export const FORBIDDEN_PROPERTIES = /** @type {const} */ ([
  {
    object: 'Object',
    property: 'keys',
    message: 'iterar claves dinámicas: usar arrays o Map (orden explícito)',
  },
  {
    object: 'Object',
    property: 'values',
    message: 'iterar claves dinámicas: usar arrays o Map (orden explícito)',
  },
  {
    object: 'Object',
    property: 'entries',
    message: 'iterar claves dinámicas: usar arrays o Map (orden explícito)',
  },
  {
    object: 'Reflect',
    property: 'ownKeys',
    message: 'iterar claves dinámicas: usar arrays o Map (orden explícito)',
  },
  { property: 'localeCompare', message: 'depende del locale: comparar con < y >' },
  { property: 'toLocaleString', message: 'depende del locale: formatear en @ws/i18n' },
  { property: 'toLocaleDateString', message: 'depende del locale: formatear en @ws/i18n' },
  { property: 'toLocaleTimeString', message: 'depende del locale: formatear en @ws/i18n' },
  { property: 'toLocaleUpperCase', message: 'depende del locale' },
  { property: 'toLocaleLowerCase', message: 'depende del locale' },
]);

const mathAllowedPattern = `^(${MATH_ALLOWED.join('|')})$`;

/** Selectores de sintaxis prohibida en el motor. */
export const FORBIDDEN_SYNTAX = /** @type {const} */ ([
  {
    selector: 'ForInStatement',
    message: 'for...in: el orden no está garantizado en todos los casos; usar arrays o Map',
  },
  {
    selector: `MemberExpression[object.name='Math'][computed=false]:not([property.name=/${mathAllowedPattern}/])`,
    message: 'Math no exacto o no determinista: usar @ws/core/math (allowlist en tools/lint)',
  },
  {
    selector: "MemberExpression[object.name='Math'][computed=true]",
    message: 'acceso dinámico a Math: no se puede verificar; usar Math.<allowlist> o @ws/core/math',
  },
  {
    selector: ":not(MemberExpression) > Identifier[name='Math']",
    message: 'alias o desestructuración de Math: saltea la allowlist',
  },
  {
    selector: 'CallExpression[callee.property.name=/^(sort|toSorted)$/][arguments.length=0]',
    message: 'sort sin comparador ordena como strings: pasar un comparador explícito',
  },
]);

/** Bloque de configuración de ESLint (flat config) para los paquetes del motor. */
export const determinismConfig = {
  name: 'ws/determinism',
  files: ENGINE_FILES,
  rules: {
    'no-restricted-globals': [
      'error',
      ...Object.entries(FORBIDDEN_GLOBALS).map(([name, message]) => ({ name, message })),
    ],
    'no-restricted-properties': ['error', ...FORBIDDEN_PROPERTIES],
    'no-restricted-syntax': ['error', ...FORBIDDEN_SYNTAX],
  },
};
