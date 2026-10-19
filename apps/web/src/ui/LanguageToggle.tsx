// Toggle es/en de la barra (P1.6): toda la UI y los textos de los eventos cambian de idioma.
import { isLanguage, LANGUAGES } from '@ws/i18n';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export function LanguageToggle() {
  const { t, i18n } = useTranslation();
  const current = i18n.resolvedLanguage ?? i18n.language;
  useEffect(() => {
    document.documentElement.lang = current;
  }, [current]);
  return (
    <span className="language-toggle" role="group" aria-label={t('language.label')}>
      {LANGUAGES.map((lng) => (
        <button
          key={lng}
          type="button"
          aria-pressed={current === lng}
          onClick={() => {
            if (isLanguage(lng)) void i18n.changeLanguage(lng);
          }}
        >
          {lng}
        </button>
      ))}
    </span>
  );
}
