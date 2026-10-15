// Escalares globales del estado (año actual, nivel del mar, etc.): un único registro tipado.
import { type ByteReader, type ByteWriter, SerializeError } from '../serialize/bytes';
import { readScalar, writeScalar } from '../serialize/scalar-io';
import type { Serializable } from '../serialize/serializable';
import { checkScalar, describeSchema, type Schema } from './schema';
import type { ScalarFields } from './table';

export class Globals<F extends ScalarFields> implements Serializable {
  readonly schema: Schema<F>;
  readonly partName: string;
  readonly schemaDescription: string;
  private readonly values = new Map<keyof F, number>();
  private loaded = false;

  constructor(schema: Schema<F>, init: { readonly [K in keyof F]?: number } = {}) {
    this.schema = schema;
    this.partName = schema.name;
    this.schemaDescription = `globals:${describeSchema(schema)}`;
    for (const key of schema.order) {
      const def = schema.fields[key];
      if (!def) continue;
      const value = init[key] ?? def.default ?? 0;
      checkScalar(schema.name, key, def.type, value);
      this.values.set(key, value);
    }
  }

  get(key: keyof F & string): number {
    const value = this.values.get(key);
    if (value === undefined) throw new Error(`${this.schema.name}: campo desconocido ${key}`);
    return value;
  }

  set(key: keyof F & string, value: number): void {
    const def = this.schema.fields[key];
    if (!def) throw new Error(`${this.schema.name}: campo desconocido ${key}`);
    checkScalar(this.schema.name, key, def.type, value);
    this.values.set(key, value);
  }

  writeState(w: ByteWriter): void {
    for (const key of this.schema.order) {
      const def = this.schema.fields[key];
      if (!def) continue;
      writeScalar(w, def.type, this.get(key), `${this.schema.name}.${key}`);
    }
  }

  readState(r: ByteReader): void {
    if (this.loaded) throw new SerializeError(`${this.schema.name}: readState repetido`);
    for (const key of this.schema.order) {
      const def = this.schema.fields[key];
      if (!def) continue;
      this.values.set(key, readScalar(r, def.type));
    }
    this.loaded = true;
  }
}
