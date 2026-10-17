// Pares etiqueta → valor del inspector y de las fichas (lista de definiciones: los separadores y
// la puntuación van en CSS, no como texto suelto).
import { Children, type ReactNode } from 'react';

export function Facts({ children }: { readonly children: ReactNode }) {
  return <dl className="facts">{children}</dl>;
}

export function Fact({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

/** Lista en línea (los separadores los pone el CSS). */
export function Inline({ children }: { readonly children: ReactNode }) {
  return (
    <span className="inline-list">
      {Children.toArray(children).map((child, i) => (
        <span key={i}>{child}</span>
      ))}
    </span>
  );
}
