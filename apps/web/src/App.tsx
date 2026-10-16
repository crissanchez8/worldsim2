import { ENGINE_VERSION } from '@ws/core';
import { createI18n, DEFAULT_LANGUAGE, isLanguage, LANGUAGES } from '@ws/i18n';
import { useEffect } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';

const i18n = createI18n(DEFAULT_LANGUAGE);

/** Página placeholder de P0: prueba el cableado de i18n (cero strings sueltos) y del motor. */
export function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <Placeholder />
    </I18nextProvider>
  );
}

function Placeholder() {
  const { t, i18n: instance } = useTranslation();
  // i18next es la única fuente del idioma activo; React solo lo refleja.
  const language = instance.resolvedLanguage ?? DEFAULT_LANGUAGE;

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = t('app.name');
  }, [language, t]);

  return (
    <main className="placeholder">
      <header>
        <p className="eyebrow">{t('app.name')}</p>
        <label className="language">
          <span>{t('language.label')}</span>
          <select
            value={language}
            onChange={(event) => {
              if (isLanguage(event.target.value)) void instance.changeLanguage(event.target.value);
            }}
          >
            {LANGUAGES.map((lng) => (
              <option key={lng} value={lng}>
                {t(`language.${lng}`)}
              </option>
            ))}
          </select>
        </label>
      </header>
      <h1>{t('placeholder.title')}</h1>
      <p>{t('app.tagline')}</p>
      <p>{t('placeholder.body')}</p>
      <p className="meta">{t('placeholder.engineVersion', { version: ENGINE_VERSION })}</p>
    </main>
  );
}
