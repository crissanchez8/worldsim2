// Commits convencionales con scope y referencia a la tarea (CLAUDE.md, Convenciones):
//   feat(core): P0.4 rng por contador con streams
export const SCOPES = [
  'repo',
  'ci',
  'docs',
  'deps',
  'lint',
  'bench',
  'core',
  'worldgen',
  'content',
  'lang',
  'sim',
  'history',
  'chronicle',
  'i18n',
  'ui',
  'web',
  'cli',
  'spikes',
];

const TASK_REF = /^P\d+(\.\d+)?\s/;

export default {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'subject-task-ref': ({ subject }) => [
          TASK_REF.test(subject ?? ''),
          'el asunto empieza con la tarea, p. ej. "P0.4 rng por contador"',
        ],
      },
    },
  ],
  rules: {
    'scope-empty': [2, 'never'],
    'scope-enum': [2, 'always', SCOPES],
    'subject-case': [0],
    'subject-task-ref': [2, 'always'],
    'body-max-line-length': [0],
  },
};
