// Tablas de contenido (docs/model.md §15): datos validados con zod al cargar el módulo. El
// estado guarda el ÍNDICE de la fila (enum), así que el orden de las filas es parte del contenido
// y entra en su hash: reordenar o agregar filas cambia el hash y un snapshot viejo no carga.
import type { z } from 'zod';

const KEY = /^[a-z][a-zA-Z0-9]*$/;

/** Toda fila tiene una clave estable (inglés, camelCase): identificador y clave i18n. */
export interface ContentRow {
  readonly key: string;
}

export interface ContentTable<R extends ContentRow> {
  /** Nombre de la tabla (camelCase); la clave i18n de una fila es `content.<name>.<key>`. */
  readonly name: string;
  readonly rows: readonly R[];
  /** Índice de la fila (valor del enum en el estado). Falla si la clave no existe. */
  indexOf(key: string): number;
  /** Fila por índice. Falla si no existe. */
  at(index: number): R;
  byKey(key: string): R;
}

export class ContentError extends Error {
  override name = 'ContentError';
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    // eslint-disable-next-line no-restricted-properties -- solo congela: el orden no importa
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}

/**
 * Declara una tabla: valida cada fila con su esquema, exige claves únicas y bien formadas, y
 * congela el resultado. Un error de contenido rompe la carga del módulo (y el build).
 */
export function defineTable<S extends z.ZodType<ContentRow>>(
  name: string,
  rowSchema: S,
  rows: readonly z.input<S>[],
): ContentTable<z.output<S>> {
  if (!KEY.test(name)) throw new ContentError(`tabla: nombre inválido "${name}"`);
  if (rows.length === 0) throw new ContentError(`tabla ${name}: sin filas`);
  const parsed: z.output<S>[] = [];
  const index = new Map<string, number>();
  rows.forEach((row, i) => {
    const result = rowSchema.safeParse(row);
    if (!result.success) {
      const issue = result.error.issues[0];
      const path = issue ? issue.path.join('.') : '?';
      throw new ContentError(`${name}[${i}].${path}: ${issue?.message ?? 'inválido'}`);
    }
    const value = result.data;
    if (!KEY.test(value.key))
      throw new ContentError(`${name}[${i}]: clave inválida "${value.key}"`);
    if (index.has(value.key)) throw new ContentError(`${name}: clave repetida "${value.key}"`);
    index.set(value.key, i);
    parsed.push(deepFreeze(value));
  });
  const frozen = Object.freeze(parsed);

  const indexOf = (key: string): number => {
    const i = index.get(key);
    if (i === undefined) throw new ContentError(`${name}: no existe la clave "${key}"`);
    return i;
  };
  const at = (i: number): z.output<S> => {
    const row = frozen[i];
    if (row === undefined) throw new ContentError(`${name}: no existe el índice ${i}`);
    return row;
  };
  return Object.freeze({
    name,
    rows: frozen,
    indexOf,
    at,
    byKey: (key: string) => at(indexOf(key)),
  });
}
