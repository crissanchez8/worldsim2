// ESLint (flat config) para todo el monorepo. ESLint 10 busca este archivo desde cada archivo
// lintado, así que `eslint .` funciona igual en la raíz y dentro de cada paquete.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { determinismConfig, ENGINE_FILES } from './tools/lint/src/determinism.js';
import { uiTextConfig } from './tools/lint/src/ui-text.js';

const HEADLESS_FILES = [...ENGINE_FILES, 'packages/i18n/**/*.{ts,tsx,js}'];

export default defineConfig(
  globalIgnores([
    '**/dist/',
    '**/coverage/',
    '**/.turbo/',
    '**/playwright-report/',
    '**/test-results/',
    // Fixtures que DEBEN fallar el lint: los usa el test de tools/lint.
    'tools/lint/fixtures/',
  ]),

  js.configs.recommended,

  {
    name: 'ws/typescript',
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  {
    name: 'ws/javascript',
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: { globals: globals.node },
  },
  {
    name: 'ws/javascript-checked',
    files: ['tools/lint/src/**/*.js'],
    extends: [tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    name: 'ws/commonjs',
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs' },
  },

  // Motor y paquetes headless: sin DOM (además, su tsconfig no incluye la lib DOM).
  {
    name: 'ws/headless',
    files: HEADLESS_FILES,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(react|react-dom|three|zustand)(/.*)?$|^@(react-three|tanstack)/',
              message: 'paquete headless: no importa UI ni render (DEVELOPMENT_PLAN §8.1)',
            },
            {
              regex: '^@ws/(ui|web|cli)$',
              message: 'paquete headless: no importa ui, apps ni tools',
            },
          ],
        },
      ],
    },
  },

  determinismConfig,

  {
    name: 'ws/react',
    files: ['apps/web/**/*.{ts,tsx}', 'packages/ui/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat['recommended-latest']],
    languageOptions: { globals: globals.browser },
  },
  uiTextConfig,

  prettier,
);
