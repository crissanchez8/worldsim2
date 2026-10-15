import type { es } from './locales/es';

/** Misma forma que el catálogo base, con valores `string` (cada idioma traduce los textos). */
type Widen<T> = { readonly [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };

export type Catalog = Widen<typeof es>;
