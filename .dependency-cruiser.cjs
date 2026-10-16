// Fronteras entre paquetes (DEVELOPMENT_PLAN §8.1, D34). Se corre con `pnpm lint:deps`.
// El test de tools/lint reutiliza estas reglas sobre fixtures que deben fallar.

const ENGINE = '(core|worldgen|content|lang|sim|history|chronicle)';
const HEADLESS = '(core|worldgen|content|lang|sim|history|chronicle|i18n)';
// Ruta (resuelta o no) de una librería de UI o render.
const UI_LIBS =
  '(^|node_modules/)(react|react-dom|three|zustand|@react-three/[^/]+|@tanstack/[^/]+)($|/)';

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'headless-no-ui-libs',
      severity: 'error',
      comment: 'El motor e i18n son headless: no importan React, Three.js ni librerías de UI.',
      from: { path: `(^|/)packages/${HEADLESS}/` },
      to: { path: UI_LIBS },
    },
    {
      name: 'headless-no-ui-apps-tools',
      severity: 'error',
      comment: 'El motor no importa packages/ui, apps/ ni tools/.',
      from: { path: `(^|/)packages/${HEADLESS}/` },
      to: { path: '(^|/)(packages/ui|apps|tools)/' },
    },
    {
      name: 'ui-no-engine',
      severity: 'error',
      comment: 'packages/ui no importa el motor: recibe datos ya derivados.',
      from: { path: '(^|/)packages/ui/' },
      to: { path: `(^|/)packages/${ENGINE}/` },
    },
    {
      name: 'packages-no-apps-tools',
      severity: 'error',
      comment: 'Ningún paquete importa apps/ ni tools/.',
      from: { path: '(^|/)packages/' },
      to: { path: '(^|/)(apps|tools)/' },
    },
    {
      name: 'no-spikes',
      severity: 'error',
      comment: 'Los spikes son descartables (D33): nadie los importa.',
      from: { pathNot: '(^|/)spikes/' },
      to: { path: '(^|/)spikes/' },
    },
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'not-to-unresolvable',
      severity: 'error',
      comment: 'Todo import tiene que resolver (dependencia declarada e instalada).',
      from: { pathNot: '(^|/)tools/lint/fixtures/' },
      to: { couldNotResolve: true },
    },
    {
      name: 'no-undeclared-deps',
      severity: 'error',
      comment: 'Cada paquete declara en su package.json lo que importa.',
      from: { pathNot: '(^|/)tools/lint/fixtures/' },
      to: { dependencyTypes: ['npm-no-pkg', 'npm-unknown'] },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: {
      path: '(^|/)(node_modules|dist|coverage|\\.turbo)/|(^|/)tools/lint/fixtures/',
    },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.base.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
