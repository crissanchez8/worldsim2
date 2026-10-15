// Tabla escasa por id (ADR-004) para entidades pocas y heterogéneas (personajes, guerras,
// tratados…). Un Map con orden de inserción = orden de id, porque los ids solo crecen.
import { type Id, IdAllocator } from './id';
import { checkScalar, type FieldDef, type Fields, type Schema } from './schema';

type ValueOf<D extends FieldDef> = D['type'] extends 'str'
  ? string
  : D['type'] extends 'refs' | 'f64s'
    ? readonly number[]
    : number;

export type SparseRecord<F extends Fields> = { -readonly [K in keyof F]: ValueOf<F[K]> };
export type SparseInit<F extends Fields> = { readonly [K in keyof F]?: ValueOf<F[K]> };

function defaultOf(def: FieldDef): number | string | readonly number[] {
  if (def.type === 'str') return '';
  if (def.type === 'refs' || def.type === 'f64s') return Object.freeze([]);
  return def.default ?? 0;
}

export class SparseTable<K extends string, F extends Fields> {
  readonly schema: Schema<F>;
  readonly allocator: IdAllocator<K>;
  private readonly records = new Map<number, SparseRecord<F>>();
  private lastId = 0;

  constructor(schema: Schema<F>, options: { allocator?: IdAllocator<K> } = {}) {
    this.schema = schema;
    this.allocator = options.allocator ?? new IdAllocator<K>();
  }

  get size(): number {
    return this.records.size;
  }

  private check(key: string, value: unknown): void {
    const def = this.schema.fields[key];
    if (!def) throw new Error(`${this.schema.name}: campo desconocido ${key}`);
    const where = `${this.schema.name}.${key}`;
    if (def.type === 'str') {
      if (typeof value !== 'string') throw new Error(`${where}: se esperaba string`);
    } else if (def.type === 'refs' || def.type === 'f64s') {
      if (!Array.isArray(value)) throw new Error(`${where}: se esperaba un array`);
      for (const v of value as unknown[]) {
        if (typeof v !== 'number') throw new Error(`${where}: elemento no numérico`);
        checkScalar(this.schema.name, key, def.type === 'refs' ? 'ref' : 'f64', v);
      }
    } else {
      if (typeof value !== 'number') throw new Error(`${where}: se esperaba número`);
      checkScalar(this.schema.name, key, def.type, value);
    }
  }

  add(init: SparseInit<F> = {}): Id<K> {
    const id = this.allocator.next();
    this.insert(id, init);
    return id;
  }

  /** Alta con id dado (al deserializar). Tiene que ser mayor que todos los existentes. */
  insert(id: Id<K>, init: SparseInit<F> = {}): void {
    if (id <= this.lastId) throw new Error(`${this.schema.name}: id ${id} no es creciente`);
    const record = {} as Record<string, unknown>;
    for (const key of this.schema.order) {
      const def = this.schema.fields[key];
      if (!def) continue;
      const value = init[key] ?? defaultOf(def);
      this.check(key, value);
      record[key] = Array.isArray(value) ? Object.freeze([...(value as number[])]) : value;
    }
    this.records.set(id, record as SparseRecord<F>);
    this.lastId = id;
    this.allocator.ensureAbove(id);
  }

  has(id: number): boolean {
    return this.records.has(id);
  }

  /** Registro de solo lectura (cambios vía `set`, para que el guard de contratos los vea). */
  get(id: number): Readonly<SparseRecord<F>> | undefined {
    return this.records.get(id);
  }

  require(id: number): Readonly<SparseRecord<F>> {
    const record = this.records.get(id);
    if (!record) throw new Error(`${this.schema.name}: no existe la entidad ${id}`);
    return record;
  }

  set<Key extends keyof F & string>(id: number, key: Key, value: ValueOf<F[Key]>): void {
    const record = this.records.get(id);
    if (!record) throw new Error(`${this.schema.name}: no existe la entidad ${id}`);
    this.check(key, value);
    record[key] = (
      Array.isArray(value) ? Object.freeze([...(value as number[])]) : value
    ) as SparseRecord<F>[Key];
  }

  /** Baja definitiva del registro. El id no se reutiliza. */
  remove(id: number): void {
    if (!this.records.delete(id))
      throw new Error(`${this.schema.name}: no existe la entidad ${id}`);
  }

  /** [id, registro] en orden de id. */
  entries(): IterableIterator<[number, Readonly<SparseRecord<F>>]> {
    return this.records.entries();
  }

  ids(): IterableIterator<number> {
    return this.records.keys();
  }
}

export function createSparseTable<K extends string, F extends Fields>(
  schema: Schema<F>,
  options?: { allocator?: IdAllocator<K> },
): SparseTable<K, F> {
  return new SparseTable<K, F>(schema, options);
}
