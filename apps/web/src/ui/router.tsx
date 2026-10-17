// Rutas de la web (P1.6, TanStack Router, D54). Sin landing ni galería (P13):
//   /                               crear mundo (con parámetros de mundo en la URL → /mundo)
//   /mundo?seed=…                   vista en vivo (mapa + simulación)
//   /mundo/resumen                  resumen hasta lo visto
//   /mundo/resumen/$kind/$id        ficha de una entidad
// Las rutas del mundo se cargan a pedido (P1.9): "Crear" no baja three.js, el mapa ni el motor.
import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { CreateScreen } from '../screens/CreateScreen';

const rootRoute = createRootRoute({ component: Outlet });

const createWorldRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: CreateScreen,
  // Los links viejos (P1.2/P1.5: `/?seed=…`) siguen abriendo el mundo.
  beforeLoad: ({ location }) => {
    if (new URLSearchParams(location.searchStr).has('seed')) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- así redirige TanStack Router
      throw redirect({ href: `/mundo${location.searchStr}` });
    }
  },
});

const worldRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mundo',
  component: lazyRouteComponent(() => import('../screens/WorldLayout'), 'WorldLayout'),
});

const liveRoute = createRoute({
  getParentRoute: () => worldRoute,
  path: '/',
  component: lazyRouteComponent(() => import('../screens/LiveHud'), 'LiveHud'),
});

const summaryRoute = createRoute({
  getParentRoute: () => worldRoute,
  path: '/resumen',
  component: lazyRouteComponent(() => import('../screens/SummaryScreen'), 'SummaryScreen'),
});

export const entityRoute = createRoute({
  getParentRoute: () => worldRoute,
  path: '/resumen/$kind/$id',
  component: lazyRouteComponent(() => import('../screens/EntityScreen'), 'EntityScreen'),
});

const routeTree = rootRoute.addChildren([
  createWorldRoute,
  worldRoute.addChildren([liveRoute, summaryRoute, entityRoute]),
]);

export function createAppRouter() {
  return createRouter({ routeTree });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
