// Escritura y lectura binaria little-endian explícita (DataView): mismo resultado en toda
// plataforma. Los floats se escriben bit a bit; NaN se rechaza antes de llegar acá.
import { utf8, utf8Decode } from '../hash';

export class SerializeError extends Error {
  override name = 'SerializeError';
}

/** Arrays tipados numéricos que se pueden copiar en bloque. */
export type NumericArray =
  | Float64Array
  | Float32Array
  | Int32Array
  | Uint32Array
  | Int16Array
  | Uint16Array
  | Int8Array
  | Uint8Array;

/**
 * El formato es little-endian. Si la plataforma también lo es (todas las de escritorio), las
 * columnas se copian en bloque; si no, valor por valor. Los bytes resultantes son idénticos.
 */
const LITTLE_ENDIAN = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;

export class ByteWriter {
  private buffer = new Uint8Array(1024);
  private view = new DataView(this.buffer.buffer);
  private length = 0;

  /** Reserva espacio y devuelve el offset. Puede reemplazar buffer y vista: llamarla ANTES de usar `this.view`. */
  private reserve(bytes: number): number {
    const at = this.length;
    const needed = at + bytes;
    if (needed > this.buffer.length) {
      let capacity = this.buffer.length * 2;
      while (capacity < needed) capacity *= 2;
      const next = new Uint8Array(capacity);
      next.set(this.buffer.subarray(0, this.length));
      this.buffer = next;
      this.view = new DataView(next.buffer);
    }
    this.length = needed;
    return at;
  }

  u8(v: number): void {
    const at = this.reserve(1);
    this.view.setUint8(at, v);
  }
  i8(v: number): void {
    const at = this.reserve(1);
    this.view.setInt8(at, v);
  }
  u16(v: number): void {
    const at = this.reserve(2);
    this.view.setUint16(at, v, true);
  }
  i16(v: number): void {
    const at = this.reserve(2);
    this.view.setInt16(at, v, true);
  }
  u32(v: number): void {
    const at = this.reserve(4);
    this.view.setUint32(at, v, true);
  }
  i32(v: number): void {
    const at = this.reserve(4);
    this.view.setInt32(at, v, true);
  }
  f32(v: number): void {
    const at = this.reserve(4);
    this.view.setFloat32(at, v, true);
  }
  f64(v: number): void {
    const at = this.reserve(8);
    this.view.setFloat64(at, v, true);
  }

  /** Entero sin signo en LEB128 (hasta 2^53). */
  varuint(v: number): void {
    if (v >= 0 && v < 0x80 && (v | 0) === v) {
      // camino rápido: un byte (deltas de ids, largos chicos)
      const at = this.reserve(1);
      this.buffer[at] = v;
      return;
    }
    if (!Number.isInteger(v) || v < 0 || v > Number.MAX_SAFE_INTEGER) {
      throw new SerializeError(`varuint inválido: ${v}`);
    }
    let rest = v;
    while (rest >= 0x80) {
      this.u8((rest % 0x80) | 0x80);
      rest = Math.floor(rest / 0x80);
    }
    this.u8(rest);
  }

  bytes(data: Uint8Array): void {
    const at = this.reserve(data.length);
    this.buffer.set(data, at);
  }

  /** Los primeros `count` valores de un array tipado, en little-endian. */
  numeric(array: NumericArray, count: number): void {
    if (LITTLE_ENDIAN) {
      this.bytes(new Uint8Array(array.buffer, array.byteOffset, count * array.BYTES_PER_ELEMENT));
      return;
    }
    const at = this.reserve(count * array.BYTES_PER_ELEMENT);
    for (let i = 0; i < count; i++) writeLE(this.view, at, i, array, array[i] ?? 0);
  }

  str(text: string): void {
    const data = utf8(text);
    this.varuint(data.length);
    this.bytes(data);
  }

  /** Copia de los bytes escritos. */
  finish(): Uint8Array {
    return this.buffer.slice(0, this.length);
  }
}

export class ByteReader {
  private readonly view: DataView;
  private readonly data: Uint8Array;
  private offset = 0;

  constructor(data: Uint8Array) {
    this.data = data;
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  }

  get remaining(): number {
    return this.data.length - this.offset;
  }

  private take(bytes: number): number {
    if (this.offset + bytes > this.data.length) {
      throw new SerializeError(
        `datos truncados: faltan ${this.offset + bytes - this.data.length} bytes`,
      );
    }
    const at = this.offset;
    this.offset += bytes;
    return at;
  }

  u8(): number {
    return this.view.getUint8(this.take(1));
  }
  i8(): number {
    return this.view.getInt8(this.take(1));
  }
  u16(): number {
    return this.view.getUint16(this.take(2), true);
  }
  i16(): number {
    return this.view.getInt16(this.take(2), true);
  }
  u32(): number {
    return this.view.getUint32(this.take(4), true);
  }
  i32(): number {
    return this.view.getInt32(this.take(4), true);
  }
  f32(): number {
    return this.view.getFloat32(this.take(4), true);
  }
  f64(): number {
    return this.view.getFloat64(this.take(8), true);
  }

  varuint(): number {
    let result = 0;
    let scale = 1;
    for (;;) {
      const byte = this.u8();
      result += (byte & 0x7f) * scale;
      if (byte < 0x80) break;
      scale *= 0x80;
      if (scale > Number.MAX_SAFE_INTEGER) throw new SerializeError('varuint demasiado largo');
    }
    return result;
  }

  bytes(length: number): Uint8Array {
    const at = this.take(length);
    return this.data.subarray(at, at + length);
  }

  str(): string {
    return utf8Decode(this.bytes(this.varuint()));
  }

  /** Lee `count` valores little-endian sobre los primeros elementos de `target`. */
  numeric(target: NumericArray, count: number): void {
    const size = target.BYTES_PER_ELEMENT;
    const at = this.take(count * size);
    if (LITTLE_ENDIAN) {
      new Uint8Array(target.buffer, target.byteOffset, count * size).set(
        this.data.subarray(at, at + count * size),
      );
      return;
    }
    for (let i = 0; i < count; i++) target[i] = readLE(this.view, at, i, target);
  }

  /** Falla si quedaron bytes sin leer (formato corrupto o versión equivocada). */
  end(): void {
    if (this.remaining !== 0) throw new SerializeError(`sobran ${this.remaining} bytes`);
  }
}

function writeLE(view: DataView, at: number, i: number, kind: NumericArray, v: number): void {
  const o = at + i * kind.BYTES_PER_ELEMENT;
  if (kind instanceof Float64Array) view.setFloat64(o, v, true);
  else if (kind instanceof Float32Array) view.setFloat32(o, v, true);
  else if (kind instanceof Int32Array) view.setInt32(o, v, true);
  else if (kind instanceof Uint32Array) view.setUint32(o, v, true);
  else if (kind instanceof Int16Array) view.setInt16(o, v, true);
  else if (kind instanceof Uint16Array) view.setUint16(o, v, true);
  else if (kind instanceof Int8Array) view.setInt8(o, v);
  else view.setUint8(o, v);
}

function readLE(view: DataView, at: number, i: number, kind: NumericArray): number {
  const o = at + i * kind.BYTES_PER_ELEMENT;
  if (kind instanceof Float64Array) return view.getFloat64(o, true);
  if (kind instanceof Float32Array) return view.getFloat32(o, true);
  if (kind instanceof Int32Array) return view.getInt32(o, true);
  if (kind instanceof Uint32Array) return view.getUint32(o, true);
  if (kind instanceof Int16Array) return view.getInt16(o, true);
  if (kind instanceof Uint16Array) return view.getUint16(o, true);
  if (kind instanceof Int8Array) return view.getInt8(o);
  return view.getUint8(o);
}
