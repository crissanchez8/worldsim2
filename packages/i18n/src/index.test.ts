import { CONTENT_TABLES } from '@ws/content';
import { describe, expect, it } from 'vitest';
import { createI18n, LANGUAGES, resources } from './index';

function keyPaths(node: unknown, prefix = ''): string[] {
  if (typeof node === 'string') return [prefix];
  if (typeof node !== 'object' || node === null) throw new Error(`valor inválido en ${prefix}`);
  return Object.entries(node)
    .flatMap(([key, child]) => keyPaths(child, prefix ? `${prefix}.${key}` : key))
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

describe('@ws/i18n', () => {
  it('es y en tienen exactamente las mismas claves', () => {
    expect(keyPaths(resources.en)).toEqual(keyPaths(resources.es));
  });

  it('ningún texto está vacío', () => {
    for (const lng of LANGUAGES) {
      const i18n = createI18n(lng);
      for (const key of keyPaths(resources[lng].common)) {
        expect(i18n.t(key as never)).not.toBe('');
      }
    }
  });

  it('toda fila de contenido tiene nombre en es y en (content.<tabla>.<clave>)', () => {
    for (const lng of LANGUAGES) {
      const keys = new Set(keyPaths(resources[lng].common));
      for (const table of CONTENT_TABLES) {
        for (const row of table.rows) {
          expect(
            keys.has(`content.${table.name}.${row.key}`),
            `${lng}: ${table.name}.${row.key}`,
          ).toBe(true);
        }
      }
    }
  });

  it('inicializa de forma síncrona e interpola', () => {
    const es = createI18n('es');
    const en = createI18n('en');
    expect(es.t('placeholder.engineVersion', { version: '1.2.3' })).toBe('Motor v1.2.3');
    expect(en.t('placeholder.engineVersion', { version: '1.2.3' })).toBe('Engine v1.2.3');
  });

  it('las instancias son independientes', () => {
    const es = createI18n('es');
    const en = createI18n('en');
    void en.changeLanguage('es');
    expect(es.language).toBe('es');
    expect(en.language).toBe('es');
    expect(createI18n('en').t('language.label')).toBe('Language');
  });
});
