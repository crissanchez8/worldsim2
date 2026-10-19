// Buffer de flujo en structure-of-arrays (docs/model.md §8). Para los buffers calientes del tick
// (deltas de población, solicitudes de territorio): una columna tipada por campo, sin un objeto
// por ítem. El spike B midió −35% del costo del año contra un buffer de objetos.
//
// Uso en lazos calientes:
//   buffer.reserve(n);                     // puede reasignar las columnas
//   const pop = buffer.column('pop');      // estable hasta el próximo reserve
//   for (…) { const i = buffer.append(); pop[i] = …; }
// `append` nunca reasigna: si no hay lugar, falla (L-007: nada de escribir en una columna vieja).
import { allocColumn, type ColumnArray, type ColumnOf, grown } from '../store/columns';
import { checkScalar, defineSchema, type FieldDef, type ScalarType } from '../store/schema';

export type BufferFields = Readonly<Record<string, FieldDef<ScalarType>>>;
export type BufferRow<F extends BufferFields> = { readonly [K in keyof F]?: number };

export class SoaBuffer<F extends BufferFields> {
  readonly name: string;
  readonly fields: F;
  private readonly order: readonly (keyof F & string)[];
  private readonly columns = new Map<keyof F, ColumnArray>();
  private capacity: number;
  private length = 0;

  constructor(name: string, fields: F, options: { capacity?: number } = {}) {
    // El esquema valida nombres y unidades y fija el orden de las columnas (no se serializa).
    const schema = defineSchema(name, 1, fields);
    this.name = name;
    this.fields = fields;
    this.order = schema.order;
    this.capacity = Math.max(1, options.capacity ?? 1024);
    for (const key of this.order) {
      this.columns.set(key, allocColumn(this.def(key).type, this.capacity));
    }
  }

  private def(key: keyof F): FieldDef<ScalarType> {
    const def = this.fields[key];
    if (!def) throw new Error(`buffer ${this.name}: campo desconocido ${String(key)}`);
    return def;
  }

  /** Ítems pendientes (el pipeline exige 0 al final del tick, I9). */
  get size(): number {
    return this.length;
  }

  /**
   * Array de la columna (largo ≥ size). Lectura y escritura directa, sin validar. Se invalida en
   * `reserve`: no guardarlo entre reservas.
   */
  column<Key extends keyof F>(key: Key): ColumnOf<F[Key]['type']> {
    const col = this.columns.get(key);
    if (!col) throw new Error(`buffer ${this.name}: campo desconocido ${String(key)}`);
    return col as ColumnOf<F[Key]['type']>;
  }

  /** Garantiza lugar para `n` ítems más. Puede reasignar las columnas: tomarlas después. */
  reserve(n: number): void {
    const needed = this.length + n;
    if (needed <= this.capacity) return;
    let capacity = this.capacity;
    while (capacity < needed) capacity *= 2;
    for (const [key, col] of this.columns) this.columns.set(key, grown(col, capacity));
    this.capacity = capacity;
  }

  /** Agrega un ítem en cero y devuelve su índice. Nunca reasigna: sin lugar reservado, falla. */
  append(): number {
    if (this.length === this.capacity) {
      throw new Error(`buffer ${this.name}: sin lugar (llamar a reserve antes de append)`);
    }
    const i = this.length++;
    for (const col of this.columns.values()) col[i] = 0;
    return i;
  }

  /** Alta validada, para productores fríos y tests. Devuelve el índice. */
  push(row: BufferRow<F>): number {
    this.reserve(1);
    const i = this.append();
    for (const key of this.order) {
      const value = row[key] ?? 0;
      checkScalar(this.name, key, this.def(key).type, value);
      this.column(key)[i] = value;
    }
    return i;
  }

  /** Vacía el buffer (lo llama su consumidor después de leerlo). Conserva la capacidad. */
  clear(): void {
    this.length = 0;
  }
}

export function createSoaBuffer<const F extends BufferFields>(
  name: string,
  fields: F,
  options?: { capacity?: number },
): SoaBuffer<F> {
  return new SoaBuffer(name, fields, options);
}
