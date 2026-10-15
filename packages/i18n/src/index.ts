import i18next, { type i18n } from 'i18next';
import { en } from './locales/en';
import { es } from './locales/es';

export type { Catalog } from './catalog';

export const LANGUAGES = ['es', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = 'es';

export const DEFAULT_NAMESPACE = 'common';

export const resources = {
  es: { [DEFAULT_NAMESPACE]: es },
  en: { [DEFAULT_NAMESPACE]: en },
} as const;

export function isLanguage(value: string): value is Language {
  return (LANGUAGES as readonly string[]).includes(value);
}

/**
 * Crea una instancia aislada de i18next, inicializada de forma síncrona (los catálogos van en
 * el bundle). Sirve igual en la UI, en un Worker y en Node.
 */
export function createI18n(lng: Language = DEFAULT_LANGUAGE): i18n {
  const instance = i18next.createInstance();
  void instance.init({
    lng,
    fallbackLng: false,
    supportedLngs: LANGUAGES,
    resources,
    ns: [DEFAULT_NAMESPACE],
    defaultNS: DEFAULT_NAMESPACE,
    initAsync: false,
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  return instance;
}

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof DEFAULT_NAMESPACE;
    resources: { [DEFAULT_NAMESPACE]: typeof es };
  }
}
