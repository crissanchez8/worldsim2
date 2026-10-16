import { createI18n, DEFAULT_LANGUAGE } from '@ws/i18n';
import { I18nextProvider } from 'react-i18next';
import { MapScreen } from './MapScreen';

const i18n = createI18n(DEFAULT_LANGUAGE);

/**
 * App placeholder: en P1.2 monta el mapa con `?seed=` y `?size=` (el router y las pantallas de
 * crear, vivo y resumen son P1.6, después de los wireframes).
 */
export function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <MapScreen />
    </I18nextProvider>
  );
}
