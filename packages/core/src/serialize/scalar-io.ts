import type { ScalarType } from '../store/schema';
import { type ByteReader, type ByteWriter, SerializeError } from './bytes';

/** Escribe un escalar según su tipo de columna. Rechaza NaN (estado inválido). */
export function writeScalar(w: ByteWriter, type: ScalarType, value: number, where: string): void {
  if (value !== value) throw new SerializeError(`${where}: NaN en el estado`);
  switch (type) {
    case 'f64':
      w.f64(value);
      return;
    case 'f32':
      w.f32(value);
      return;
    case 'i32':
      w.i32(value);
      return;
    case 'u32':
    case 'ref':
      w.u32(value);
      return;
    case 'i16':
      w.i16(value);
      return;
    case 'u16':
      w.u16(value);
      return;
    case 'i8':
      w.i8(value);
      return;
    case 'u8':
    case 'bool':
      w.u8(value);
      return;
  }
}

export function readScalar(r: ByteReader, type: ScalarType): number {
  switch (type) {
    case 'f64':
      return r.f64();
    case 'f32':
      return r.f32();
    case 'i32':
      return r.i32();
    case 'u32':
    case 'ref':
      return r.u32();
    case 'i16':
      return r.i16();
    case 'u16':
      return r.u16();
    case 'i8':
      return r.i8();
    case 'u8':
    case 'bool':
      return r.u8();
  }
}
