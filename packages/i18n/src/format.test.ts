import { describe, expect, it } from 'vitest';
import { createI18n, formatYear } from './index';

describe('@ws/i18n · formatYear', () => {
  it('es', () => {
    const es = createI18n('es');
    expect(formatYear(es, -12000)).toBe('12.000 a.C.');
    expect(formatYear(es, -1)).toBe('1 a.C.');
    expect(formatYear(es, 1)).toBe('1 d.C.');
    expect(formatYear(es, 1900)).toBe('1900 d.C.');
  });

  it('en', () => {
    const en = createI18n('en');
    expect(formatYear(en, -12000)).toBe('12,000 BC');
    expect(formatYear(en, 1900)).toBe('1900 AD');
  });

  it('el año 0 no existe', () => {
    expect(() => formatYear(createI18n('es'), 0)).toThrow();
  });
});
