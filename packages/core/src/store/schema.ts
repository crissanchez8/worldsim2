import type { Unit } from './units';

/** Tipos escalares de columna (tablas SoA y escasas). */
export type ScalarType =
  'f64' | 'f32' | 'i32' | 'u32' | 'i16' | 'u16' | 'i8' | 'u8' | 'bool' | 'ref';
/** Tipos extra de las tablas escasas. */
export type VarType = 'str' | 'refs' | 'f64s';
export type FieldType = ScalarType | VarType;

export interface FieldDef<T extends FieldType = FieldType> {
  readonly type: T;
  readonly unit: Unit;
  /** Para `ref`/`refs`: tipo de entidad referida. */
  readonly ref?: string;
  /** Valor inicial si `add` no lo da (escalares; por defecto 0). */
  readonly default?: number;
  /** Qué representa (va a la documentación generada). */
  readonly doc?: string;
}

export type Fields<T extends FieldType = FieldType> = Readonly<Record<string, FieldDef<T>>>;

export interface Schema<F extends Fields> {
  readonly name: string;
  /** Versión del esquema: se sube al cambiar campos (los snapshots viejos dejan de cargar). */
  readonly version: number;
  readonly fields: F;
  /** Campos en orden estable (el de declaración), para serializar. */
  readonly order: readonly (keyof F & string)[];
}

const NAME = /^[a-z][A-Za-z0-9]*$/;

/**
 * Declara un esquema. El orden de los campos es el de declaración (garantizado por el
 * lenguaje para claves no numéricas; se rechazan claves que parezcan índices).
 */
export function defineSchema<const F extends Fields>(
  name: string,
  version: number,
  fields: F,
): Schema<F> {
  if (!NAME.test(name)) throw new Error(`esquema: nombre inválido "${name}"`);
  if (!Number.isInteger(version) || version < 1)
    throw new Error(`esquema ${name}: versión ${version}`);
  // eslint-disable-next-line no-restricted-properties -- único punto que fija el orden de columnas; NAME excluye claves numéricas
  const order = Object.keys(fields) as (keyof F & string)[];
  for (const key of order) {
    if (!NAME.test(key)) throw new Error(`esquema ${name}: campo inválido "${key}"`);
  }
  return Object.freeze({ name, version, fields, order: Object.freeze(order) });
}

/** Descripción canónica del esquema: si cambia, cambia la huella y un snapshot viejo no carga. */
export function describeSchema<F extends Fields>(schema: Schema<F>): string {
  const parts = schema.order.map((key) => {
    const f = schema.fields[key];
    if (!f) throw new Error(`esquema ${schema.name}: falta ${key}`);
    return `${key}:${f.type}:${f.unit}${f.ref ? `>${f.ref}` : ''}`;
  });
  return `${schema.name}@${schema.version}{${parts.join(',')}}`;
}

/** Rango válido de cada tipo escalar entero (los floats aceptan cualquier no-NaN). */
const INT_RANGE: Partial<Record<ScalarType, readonly [number, number]>> = {
  i32: [-2147483648, 2147483647],
  u32: [0, 4294967295],
  ref: [0, 4294967295],
  i16: [-32768, 32767],
  u16: [0, 65535],
  i8: [-128, 127],
  u8: [0, 255],
  bool: [0, 1],
};

export function checkScalar(table: string, field: string, type: ScalarType, value: number): void {
  if (value !== value) throw new Error(`${table}.${field}: NaN no es un valor de estado válido`);
  const range = INT_RANGE[type];
  if (range && (!Number.isInteger(value) || value < range[0] || value > range[1])) {
    throw new Error(`${table}.${field} (${type}): valor fuera de rango ${value}`);
  }
}
