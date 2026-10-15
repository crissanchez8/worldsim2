// Cero strings sueltos en la UI (CLAUDE.md, regla de oro 8): todo texto visible pasa por i18n.

export const UI_FILES = ['apps/web/src/**/*.tsx', 'packages/ui/src/**/*.tsx'];

export const UI_TEXT_SYNTAX = /** @type {const} */ ([
  {
    selector: 'JSXText[value=/\\S/]',
    message: 'texto suelto en JSX: usar t("clave") de @ws/i18n',
  },
  {
    selector: 'JSXExpressionContainer > Literal[value=/\\S/]',
    message: 'string suelto en JSX: usar t("clave") de @ws/i18n',
  },
  {
    selector:
      'JSXAttribute[name.name=/^(title|alt|placeholder|label|aria-label|aria-description|aria-placeholder|aria-roledescription|aria-valuetext)$/] > Literal',
    message: 'atributo de texto visible: usar t("clave") de @ws/i18n',
  },
]);

export const uiTextConfig = {
  name: 'ws/ui-text',
  files: UI_FILES,
  rules: {
    'no-restricted-syntax': ['error', ...UI_TEXT_SYNTAX],
  },
};
