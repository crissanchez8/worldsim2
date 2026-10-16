// Acceso a los bits de un double (IEEE-754). DataView en big-endian: offset 0 = palabra alta.
// Es independiente de la plataforma y determinista.
const view = new DataView(new ArrayBuffer(8));

/** Palabra alta (signo, exponente y 20 bits de mantisa) como int32 con signo. */
export function highWord(x: number): number {
  view.setFloat64(0, x);
  return view.getInt32(0);
}

/** Palabra baja (32 bits de mantisa) como uint32. */
export function lowWord(x: number): number {
  view.setFloat64(0, x);
  return view.getUint32(4);
}

export function withHighWord(x: number, hi: number): number {
  view.setFloat64(0, x);
  view.setInt32(0, hi);
  return view.getFloat64(0);
}

export function fromWords(hi: number, lo: number): number {
  view.setInt32(0, hi);
  view.setUint32(4, lo);
  return view.getFloat64(0);
}

/** 2^k exacto para k ∈ [−1022, 1023]. */
export function pow2(k: number): number {
  return fromWords((k + 1023) << 20, 0);
}
