// Tabla structure-of-arrays (ADR-004): una columna de array tipado por campo. Las filas están
// ordenadas por id (los ids crecen y la compactación preserva el orden), así que:
//   - iterar filas = iterar en orden de id (determinista);
//   - id → fila es una búsqueda binaria, sin estructuras que crezcan con la historia.
import { type ByteReader, type ByteWriter, SerializeError } from '../serialize/bytes';
import { readScalar, writeScalar } from '../serialize/scalar-io';
import type { Serializable } from '../serialize/serializable';
import { type Id, IdAllocator } from './id';
import { checkScalar, describeSchema, type Fields, type ScalarType, type Schema } from './schema';

export type ColumnArray =
  | Float64Array
  | Float32Array
  | Int32Array
  | Uint32Array
  | Int16Array
  | Uint16Array
  | Int8Array
  | Uint8Array;

type ColumnOf<T extends ScalarType> = T extends 'f64'
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

export type ScalarFields = Fields<ScalarType>;
export type RowInit<F extends ScalarFields> = { readonly [K in keyof F]?: number };

function allocColumn(type: ScalarType, capacity: number): ColumnArray {
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

function grown<A extends ColumnArray>(array: A, capacity: number): A {
  const next = new (array.constructor as new (n: number) => A)(capacity);
  next.set(array);
  return next;
}

export class Table<K extends string, F extends ScalarFields> implements Serializable {
  readonly schema: Schema<F>;
  readonly partName: string;
  readonly schemaDescription: string;
  readonly allocator: IdAllocator<K>;
  private capacity: number;
  private used = 0; // filas ocupadas, vivas o muertas
  private live = 0;
  private idColumn: Uint32Array;
  private aliveColumn: Uint8Array;
  private readonly columns = new Map<keyof F, ColumnArray>();

  constructor(schema: Schema<F>, options: { capacity?: number; allocator?: IdAllocator<K> } = {}) {
    this.schema = schema;
    this.partName = schema.name;
    this.schemaDescription = `table:${describeSchema(schema)}`;
    this.allocator = options.allocator ?? new IdAllocator<K>();
    this.capacity = Math.max(1, options.capacity ?? 16);
    this.idColumn = new Uint32Array(this.capacity);
    this.aliveColumn = new Uint8Array(this.capacity);
    for (const key of schema.order) {
      this.columns.set(key, allocColumn(this.def(key).type, this.capacity));
    }
  }

  private def(key: keyof F) {
    const def = this.schema.fields[key];
    if (!def) throw new Error(`${this.schema.name}: campo desconocido ${String(key)}`);
    return def;
  }

  /** Filas ocupadas (vivas y muertas sin compactar). Para lazos con `aliveAt`. */
  get rowCount(): number {
    return this.used;
  }

  /** Entidades vivas. */
  get size(): number {
    return this.live;
  }

  /**
   * Array de la columna (largo ≥ rowCount). Lectura y escritura directa para lazos calientes:
   * no valida rangos (el serializador rechaza NaN). Se invalida al crecer la tabla: no
   * guardarlo entre altas.
   */
  column<Key extends keyof F>(key: Key): ColumnOf<F[Key]['type']> {
    const col = this.columns.get(key);
    if (!col) throw new Error(`${this.schema.name}: campo desconocido ${String(key)}`);
    return col as ColumnOf<F[Key]['type']>;
  }

  idAt(row: number): Id<K> {
    return (this.idColumn[row] ?? 0) as Id<K>;
  }

  aliveAt(row: number): boolean {
    return this.aliveColumn[row] === 1;
  }

  /** Fila de un id vivo, o −1. */
  rowOf(id: number): number {
    let lo = 0;
    let hi = this.used - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      const v = this.idColumn[mid] ?? 0;
      if (v === id) return this.aliveColumn[mid] === 1 ? mid : -1;
      if (v < id) lo = mid + 1;
      else hi = mid - 1;
    }
    return -1;
  }

  has(id: number): boolean {
    return this.rowOf(id) >= 0;
  }

  private requireRow(id: number): number {
    const row = this.rowOf(id);
    if (row < 0) throw new Error(`${this.schema.name}: no existe la entidad ${id}`);
    return row;
  }

  private ensureCapacity(needed: number): void {
    if (needed <= this.capacity) return;
    let capacity = this.capacity;
    while (capacity < needed) capacity *= 2;
    this.idColumn = grown(this.idColumn, capacity);
    this.aliveColumn = grown(this.aliveColumn, capacity);
    for (const [key, col] of this.columns) this.columns.set(key, grown(col, capacity));
    this.capacity = capacity;
  }

  /** Alta con un id nuevo del asignador. */
  add(init: RowInit<F> = {}): Id<K> {
    const id = this.allocator.next();
    this.insert(id, init);
    return id;
  }

  /** Alta con un id dado (al deserializar). Tiene que ser mayor que todos los existentes. */
  insert(id: Id<K>, init: RowInit<F> = {}): void {
    const last = this.used > 0 ? (this.idColumn[this.used - 1] ?? 0) : 0;
    if (id <= last)
      throw new Error(`${this.schema.name}: id ${id} no es creciente (último ${last})`);
    this.ensureCapacity(this.used + 1);
    const row = this.used++;
    this.idColumn[row] = id;
    this.aliveColumn[row] = 1;
    this.live++;
    this.allocator.ensureAbove(id);
    for (const key of this.schema.order) {
      const def = this.def(key);
      const value = init[key] ?? def.default ?? 0;
      checkScalar(this.schema.name, key, def.type, value);
      this.column(key)[row] = value;
    }
  }

  get(id: number, key: keyof F & string): number {
    return this.column(key)[this.requireRow(id)] ?? 0;
  }

  set(id: number, key: keyof F & string, value: number): void {
    checkScalar(this.schema.name, key, this.def(key).type, value);
    this.column(key)[this.requireRow(id)] = value;
  }

  /** Baja lógica: la fila queda muerta hasta `compact()`. El id no se reutiliza. */
  remove(id: number): void {
    const row = this.requireRow(id);
    this.aliveColumn[row] = 0;
    this.live--;
  }

  /** Elimina las filas muertas preservando el orden. Se llama en puntos fijos del tick. */
  compact(): void {
    let write = 0;
    for (let read = 0; read < this.used; read++) {
      if (this.aliveColumn[read] !== 1) continue;
      if (write !== read) {
        this.idColumn[write] = this.idColumn[read] ?? 0;
        this.aliveColumn[write] = 1;
        for (const col of this.columns.values()) col[write] = col[read] ?? 0;
      }
      write++;
    }
    for (let row = write; row < this.used; row++) {
      this.idColumn[row] = 0;
      this.aliveColumn[row] = 0;
      for (const col of this.columns.values()) col[row] = 0;
    }
    this.used = write;
  }

  /** Fracción de filas muertas (para decidir cuándo compactar). */
  deadFraction(): number {
    return this.used === 0 ? 0 : (this.used - this.live) / this.used;
  }

  /**
   * Serializa solo las filas vivas (ids con delta + columnas contiguas): el resultado no
   * depende de cuándo se compactó.
   */
  writeState(w: ByteWriter): void {
    w.varuint(this.allocator.peek());
    w.varuint(this.live);
    let prev = 0;
    for (const row of this.rows()) {
      const id = this.idColumn[row] ?? 0;
      w.varuint(id - prev);
      prev = id;
    }
    for (const key of this.schema.order) {
      const type = this.def(key).type;
      const col = this.column(key);
      for (const row of this.rows()) {
        writeScalar(
          w,
          type,
          col[row] ?? 0,
          `${this.schema.name}.${key}#${this.idColumn[row] ?? 0}`,
        );
      }
    }
  }

  readState(r: ByteReader): void {
    if (this.used !== 0)
      throw new SerializeError(`${this.schema.name}: readState sobre tabla no vacía`);
    const next = r.varuint();
    const count = r.varuint();
    this.ensureCapacity(count);
    let id = 0;
    for (let row = 0; row < count; row++) {
      const delta = r.varuint();
      if (delta === 0) throw new SerializeError(`${this.schema.name}: ids no crecientes`);
      id += delta;
      this.idColumn[row] = id;
      this.aliveColumn[row] = 1;
    }
    if (next <= id) throw new SerializeError(`${this.schema.name}: asignador detrás del último id`);
    this.used = count;
    this.live = count;
    this.allocator.ensureAbove(next - 1);
    for (const key of this.schema.order) {
      const type = this.def(key).type;
      const col = this.column(key);
      for (let row = 0; row < count; row++) col[row] = readScalar(r, type);
    }
  }

  /** Filas vivas en orden de id. */
  *rows(): Generator<number> {
    for (let row = 0; row < this.used; row++) if (this.aliveColumn[row] === 1) yield row;
  }

  /** Ids vivos en orden creciente. */
  *ids(): Generator<Id<K>> {
    for (let row = 0; row < this.used; row++) {
      if (this.aliveColumn[row] === 1) yield (this.idColumn[row] ?? 0) as Id<K>;
    }
  }
}

export function createTable<K extends string, F extends ScalarFields>(
  schema: Schema<F>,
  options?: { capacity?: number; allocator?: IdAllocator<K> },
): Table<K, F> {
  return new Table<K, F>(schema, options);
}
