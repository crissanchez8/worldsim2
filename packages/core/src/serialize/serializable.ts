import type { ByteReader, ByteWriter } from './bytes';

/** Parte del estado que sabe escribirse y leerse (tablas, tablas escasas, globales). */
export interface Serializable {
  /** Nombre único de la parte dentro del estado. */
  readonly partName: string;
  /** Descripción canónica de tipo + esquema: si no coincide al cargar, el snapshot se rechaza. */
  readonly schemaDescription: string;
  writeState(w: ByteWriter): void;
  /** Carga sobre una instancia vacía. */
  readState(r: ByteReader): void;
}

/**
 * Valores de una parte para el guard de contratos (P0.10, ampliado en P1.3). El guard compara dos
 * instantáneas: si cambió el conjunto de filas o el asignador, la parte cambió `parte.#rows`; un
 * campo cambió si alguna fila que existe en las DOS instantáneas tiene otro valor. Así el sistema
 * que crea filas puede iniciar todos sus campos sin "tocar" campos que son de otro sistema
 * (propiedad por campo, docs/model.md §5).
 */
export interface GuardSnapshot {
  /** Huella del conjunto de filas y del asignador. */
  readonly rows: string;
  /** Ids vivos, crecientes (las partes sin filas usan [0]). */
  readonly ids: ArrayLike<number>;
  /** Por campo (clave `parte.campo`): un valor por id, en el orden de `ids`. */
  readonly fields: ReadonlyMap<string, ArrayLike<unknown>>;
}

/** Parte del estado que el guard de contratos puede vigilar. */
export interface StatePart extends Serializable {
  guardSnapshot(): GuardSnapshot;
}
