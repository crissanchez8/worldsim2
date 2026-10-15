// XXH32 (Yann Collet, BSD-2). Implementación propia en TS con aritmética entera de 32 bits
// (`Math.imul`, shifts): exacta y determinista en todos los motores JS.
// Referencia: https://github.com/Cyan4973/xxHash/blob/dev/doc/xxhash_spec.md

const P1 = 0x9e3779b1;
const P2 = 0x85ebca77;
const P3 = 0xc2b2ae3d;
const P4 = 0x27d4eb2f;
const P5 = 0x165667b1;

function rotl(x: number, r: number): number {
  return (x << r) | (x >>> (32 - r));
}

function round(acc: number, lane: number): number {
  return Math.imul(rotl((acc + Math.imul(lane, P2)) | 0, 13), P1);
}

function avalanche(h: number): number {
  h ^= h >>> 15;
  h = Math.imul(h, P2);
  h ^= h >>> 13;
  h = Math.imul(h, P3);
  h ^= h >>> 16;
  return h >>> 0;
}

/** XXH32 de bytes arbitrarios. Devuelve un uint32. */
export function xxh32(input: Uint8Array, seed = 0): number {
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
  const len = input.byteLength;
  let p = 0;
  let h: number;

  if (len >= 16) {
    let v1 = (seed + P1 + P2) | 0;
    let v2 = (seed + P2) | 0;
    let v3 = seed | 0;
    let v4 = (seed - P1) | 0;
    const limit = len - 16;
    while (p <= limit) {
      v1 = round(v1, view.getUint32(p, true));
      v2 = round(v2, view.getUint32(p + 4, true));
      v3 = round(v3, view.getUint32(p + 8, true));
      v4 = round(v4, view.getUint32(p + 12, true));
      p += 16;
    }
    h = (rotl(v1, 1) + rotl(v2, 7) + rotl(v3, 12) + rotl(v4, 18)) | 0;
  } else {
    h = (seed + P5) | 0;
  }

  h = (h + len) | 0;
  while (p + 4 <= len) {
    h = Math.imul(rotl((h + Math.imul(view.getUint32(p, true), P3)) | 0, 17), P4);
    p += 4;
  }
  while (p < len) {
    h = Math.imul(rotl((h + Math.imul(view.getUint8(p), P5)) | 0, 11), P1);
    p += 1;
  }
  return avalanche(h);
}

/**
 * XXH32 de exactamente 6 palabras uint32 (24 bytes little-endian), sin asignar memoria.
 * Es el núcleo del RNG por contador; da el mismo resultado que `xxh32` sobre esos bytes.
 */
export function xxh32Words6(
  seed: number,
  w0: number,
  w1: number,
  w2: number,
  w3: number,
  w4: number,
  w5: number,
): number {
  let v1 = (seed + P1 + P2) | 0;
  let v2 = (seed + P2) | 0;
  let v3 = seed | 0;
  let v4 = (seed - P1) | 0;
  v1 = round(v1, w0);
  v2 = round(v2, w1);
  v3 = round(v3, w2);
  v4 = round(v4, w3);
  let h = (rotl(v1, 1) + rotl(v2, 7) + rotl(v3, 12) + rotl(v4, 18) + 24) | 0;
  h = Math.imul(rotl((h + Math.imul(w4, P3)) | 0, 17), P4);
  h = Math.imul(rotl((h + Math.imul(w5, P3)) | 0, 17), P4);
  return avalanche(h);
}
