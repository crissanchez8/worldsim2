import { xxh32 } from './xxh32';

export { utf8, utf8Decode } from './utf8';
export { xxh32, xxh32Words6 } from './xxh32';

// Seeds fijas de los dos carriles del hash de 64 bits. No cambiarlas: invalidan todo golden.
const LANE_A = 0x5745_5331; // 'WES1'
const LANE_B = 0x5745_5332; // 'WES2'

function hex8(x: number): string {
  return x.toString(16).padStart(8, '0');
}

/**
 * Hash de 64 bits (16 dígitos hex) = dos XXH32 con seeds distintas. Se eligió sobre XXH64
 * emulado sin BigInt por rendimiento (≈3,3 GB/s vs 50 MB/s; ADR-004). Sirve para detectar
 * divergencias y regresiones, no es criptográfico.
 */
export function hash64(input: Uint8Array): string {
  return hex8(xxh32(input, LANE_A)) + hex8(xxh32(input, LANE_B));
}
