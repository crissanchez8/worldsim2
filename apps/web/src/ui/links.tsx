// Navegación dentro de un mundo: los parámetros del mundo viajan en la URL (P1.7), así que todo
// enlace interno conserva la búsqueda actual. Cambiarla regeneraría el mundo.
import { useNavigate, useRouterState } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import type { EntityRef } from '../worker/sim-protocol';

/** Ruta de la ficha de una entidad. */
export function entityPath(ref: EntityRef): string {
  return `/mundo/resumen/${ref.kind}/${ref.id}`;
}

export function useWorldHref(): (path: string) => string {
  const search = useRouterState({ select: (s) => s.location.searchStr });
  return (path) => `${path}${search}`;
}

export function WorldLink({
  path,
  children,
  className,
}: {
  readonly path: string;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  const navigate = useNavigate();
  const href = useWorldHref()(path);
  return (
    <a
      href={href}
      className={className}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        void navigate({ href });
      }}
    >
      {children}
    </a>
  );
}
