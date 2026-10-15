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
 * Parte del estado que además expone una huella por campo (`parte.campo`, y `parte.#rows` para
 * el conjunto de filas y el asignador). La usa el guard de contratos del scheduler para detectar
 * escrituras no declaradas.
 */
export interface StatePart extends Serializable {
  fieldFingerprints(): ReadonlyMap<string, string>;
}
