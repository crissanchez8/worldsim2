import { RouterProvider } from '@tanstack/react-router';
import { I18nextProvider } from 'react-i18next';
import { appI18n } from './ui/i18n';
import { createAppRouter } from './ui/router';

const router = createAppRouter();

/** Raíz de la web (P1.6): idioma (toggle es/en en cada barra) y rutas. */
export function App() {
  return (
    <I18nextProvider i18n={appI18n}>
      <RouterProvider router={router} />
    </I18nextProvider>
  );
}
