// Enlace a otra entidad: en el inspector la selecciona (con migas); en una ficha abre su ficha.
import type { ReactNode } from 'react';
import { entityPath, WorldLink } from '../ui/links';
import { useUi } from '../ui/store';
import type { EntityRef } from '../worker/sim-protocol';

export type Density = 'panel' | 'page';

export function EntityLink({
  entity,
  density,
  children,
}: {
  readonly entity: EntityRef;
  readonly density: Density;
  readonly children: ReactNode;
}) {
  const select = useUi((s) => s.select);
  if (density === 'page') return <WorldLink path={entityPath(entity)}>{children}</WorldLink>;
  return (
    <button
      type="button"
      className="link"
      onClick={() => {
        select(entity);
      }}
    >
      {children}
    </button>
  );
}
