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
