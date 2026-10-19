// La instancia de i18next de la app (una sola). Se importa donde haga falta traducir fuera del
// render, p. ej. dentro de un efecto: `useTranslation` devuelve otro objeto `i18n` al cambiar de
// idioma, y depender de él re-ejecutaría el efecto (regeneraba el mundo).
import { createI18n, DEFAULT_LANGUAGE } from '@ws/i18n';

export const appI18n = createI18n(DEFAULT_LANGUAGE);
