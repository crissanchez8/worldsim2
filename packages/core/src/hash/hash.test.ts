import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { hash64, utf8, utf8Decode, xxh32, xxh32Words6 } from './index';

const GOLDEN_WORLDSIM2 = '88c426d9486e5ee2';

// Vectores de referencia publicados de xxHash (seed 0).
const VECTORS: [input: string, xxh32: number][] = [
  ['', 0x02cc5d05],
  ['a', 0x550d7456],
  ['abc', 0x32d153ff],
  ['Nobody inspects the spammish repetition', 0xe2293b2f],
];

describe('xxh32', () => {
  it.each(VECTORS)('vector de referencia %j', (input, expected) => {
    expect(xxh32(utf8(input))).toBe(expected);
  });

  it('respeta byteOffset de subarrays', () => {
    const bytes = utf8('xxabcxx');
    expect(xxh32(bytes.subarray(2, 5))).toBe(xxh32(utf8('abc')));
  });

  it('xxh32Words6 = xxh32 sobre los 24 bytes little-endian', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 0xffffffff }),
        fc.array(fc.integer({ min: 0, max: 0xffffffff }), { minLength: 6, maxLength: 6 }),
        (seed, words) => {
          const bytes = new Uint8Array(24);
          const view = new DataView(bytes.buffer);
          words.forEach((w, i) => {
            view.setUint32(i * 4, w, true);
          });
          const [w0 = 0, w1 = 0, w2 = 0, w3 = 0, w4 = 0, w5 = 0] = words;
          expect(xxh32Words6(seed, w0, w1, w2, w3, w4, w5)).toBe(xxh32(bytes, seed));
        },
      ),
    );
  });
});

describe('hash64', () => {
  it('son dos carriles xxh32 con seeds distintas, en hex de 16 dígitos', () => {
    const h = hash64(utf8('abc'));
    expect(h).toMatch(/^[0-9a-f]{16}$/);
    expect(h.slice(0, 8)).not.toBe(h.slice(8));
  });

  it('distingue entradas de todos los largos (caminos de 16+, 4 y 1 byte)', () => {
    const seen = new Set<string>();
    const data = new Uint8Array(100).map((_, i) => (i * 31 + 7) & 0xff);
    for (let n = 0; n <= 100; n++) seen.add(hash64(data.subarray(0, n)));
    expect(seen.size).toBe(101);
  });

  it('golden: no cambia sin querer', () => {
    expect(hash64(utf8('worldSim2'))).toBe(GOLDEN_WORLDSIM2);
  });
});

// TextEncoder existe en Node y navegadores; core no incluye esos tipos (lib ES pura).
declare const TextEncoder: new () => { encode(text: string): Uint8Array };

describe('utf8', () => {
  it('codifica como TextEncoder e ida y vuelta', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'grapheme' }), (text) => {
        const bytes = utf8(text);
        expect([...bytes]).toEqual([...new TextEncoder().encode(text)]);
        expect(utf8Decode(bytes)).toBe(text);
      }),
    );
  });

  it('surrogates sueltos → U+FFFD (igual que TextEncoder)', () => {
    expect([...utf8('\ud800x')]).toEqual([...new TextEncoder().encode('\ud800x')]);
  });

  it('rechaza secuencias inválidas', () => {
    expect(() => utf8Decode(Uint8Array.from([0xc3]))).toThrow();
    expect(() => utf8Decode(Uint8Array.from([0xff]))).toThrow();
  });
});
