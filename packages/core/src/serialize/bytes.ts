// Escritura y lectura binaria little-endian explícita (DataView): mismo resultado en toda
// plataforma. Los floats se escriben bit a bit; NaN se rechaza antes de llegar acá.
import { utf8, utf8Decode } from '../hash';

export class SerializeError extends Error {
  override name = 'SerializeError';
}

export class ByteWriter {
  private buffer = new Uint8Array(1024);
  private view = new DataView(this.buffer.buffer);
  private length = 0;

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
    this.view.setUint8(this.reserve(1), v);
  }
  i8(v: number): void {
    this.view.setInt8(this.reserve(1), v);
  }
  u16(v: number): void {
    this.view.setUint16(this.reserve(2), v, true);
  }
  i16(v: number): void {
    this.view.setInt16(this.reserve(2), v, true);
  }
  u32(v: number): void {
    this.view.setUint32(this.reserve(4), v, true);
  }
  i32(v: number): void {
    this.view.setInt32(this.reserve(4), v, true);
  }
  f32(v: number): void {
    this.view.setFloat32(this.reserve(4), v, true);
  }
  f64(v: number): void {
    this.view.setFloat64(this.reserve(8), v, true);
  }

  /** Entero sin signo en LEB128 (hasta 2^53). */
  varuint(v: number): void {
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

  /** Falla si quedaron bytes sin leer (formato corrupto o versión equivocada). */
  end(): void {
    if (this.remaining !== 0) throw new SerializeError(`sobran ${this.remaining} bytes`);
  }
}
