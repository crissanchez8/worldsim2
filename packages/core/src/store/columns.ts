// Columnas de arrays tipados por tipo escalar: las comparten las tablas SoA (ADR-004) y los
// buffers de flujo SoA del scheduler (docs/model.md §8).
import type { ScalarType } from './schema';

export type ColumnArray =
  | Float64Array
  | Float32Array
  | Int32Array
  | Uint32Array
  | Int16Array
  | Uint16Array
  | Int8Array
  | Uint8Array;

/** Array tipado de la columna de un tipo escalar. */
export type ColumnOf<T extends ScalarType> = T extends 'f64'
  ? Float64Array
  : T extends 'f32'
    ? Float32Array
    : T extends 'i32'
      ? Int32Array
      : T extends 'u32' | 'ref'
        ? Uint32Array
        : T extends 'i16'
          ? Int16Array
          : T extends 'u16'
            ? Uint16Array
            : T extends 'i8'
              ? Int8Array
              : Uint8Array;

export function allocColumn(type: ScalarType, capacity: number): ColumnArray {
  switch (type) {
    case 'f64':
      return new Float64Array(capacity);
    case 'f32':
      return new Float32Array(capacity);
    case 'i32':
      return new Int32Array(capacity);
    case 'u32':
    case 'ref':
      return new Uint32Array(capacity);
    case 'i16':
      return new Int16Array(capacity);
    case 'u16':
      return new Uint16Array(capacity);
    case 'i8':
      return new Int8Array(capacity);
    case 'u8':
    case 'bool':
      return new Uint8Array(capacity);
  }
}

/** Copia del array con más capacidad (el original queda inválido para quien lo guardó). */
export function grown<A extends ColumnArray>(array: A, capacity: number): A {
  const next = new (array.constructor as new (n: number) => A)(capacity);
  next.set(array);
  return next;
}
