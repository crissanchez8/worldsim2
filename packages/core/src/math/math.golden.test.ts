// Golden bit a bit de core/math: estos patrones de 64 bits tienen que salir IGUALES en Node y en
// todos los navegadores (lo verifica el spike C). Si un cambio en math los altera, es un cambio
// de motor: se justifica en el commit y se sube ENGINE_VERSION.
import { describe, expect, it } from 'vitest';
import * as M from './index';

type Fn =
  | 'exp'
  | 'log'
  | 'expm1'
  | 'log1p'
  | 'log2'
  | 'log10'
  | 'sin'
  | 'cos'
  | 'tan'
  | 'atan'
  | 'asin'
  | 'acos'
  | 'tanh'
  | 'sigmoid'
  | 'pow'
  | 'atan2'
  | 'hypot';

export const MATH_GOLDEN: [fn: Fn, args: number[], bits: string][] = [
  ['exp', [-700.5], '00c4ff475c68ca02'],
  ['exp', [-20.25], '3e1b93de1e27ca3b'],
  ['exp', [-1], '3fd78b56362cef38'],
  ['exp', [-1e-10], '3feffffffff24190'],
  ['exp', [0.1], '3ff1aec7b35a00d4'],
  ['exp', [1], '4005bf0a8b14576a'],
  ['exp', [2.5], '40285d6fd931e0bb'],
  ['exp', [88.7], '47ef4705bbffae5c'],
  ['exp', [700.1], '7f1058614179b2a5'],
  ['log', [1e-300], 'c085963447f87fb5'],
  ['log', [0.00001], 'c027069e2aa2aa5b'],
  ['log', [0.3], 'bff34378fcbda721'],
  ['log', [0.999999], 'beb0c6f82d74d230'],
  ['log', [1.000001], '3eb0c6f713f33a1d'],
  ['log', [2], '3fe62e42fefa39ef'],
  ['log', [10], '40026bb1bbb55516'],
  ['log', [12345.678], '4022d79559791e31'],
  ['log', [1e300], '4085963447f87fb5'],
  ['expm1', [-5], 'bfefc8cd803fe55a'],
  ['expm1', [-1e-8], 'be45798ee0636111'],
  ['expm1', [1e-12], '3d719799812df3bd'],
  ['expm1', [0.3], '3fd6641632306a57'],
  ['expm1', [4], '404acc902e273a58'],
  ['log1p', [-0.9], 'c0026bb1bbb55516'],
  ['log1p', [-1e-9], 'be112e0be84bbb51'],
  ['log1p', [1e-12], '3d719799812de065'],
  ['log1p', [0.5], '3fd9f323ecbf984c'],
  ['log1p', [100], '401275e2271bba31'],
  ['log2', [0.1], 'c00a934f0979a371'],
  ['log2', [3], '3ff95c01a39fbd68'],
  ['log2', [1000.5], '4023eed9cd76ae85'],
  ['log10', [0.07], 'bff27a7a7a4399e0'],
  ['log10', [3], '3fde8927964fd5fc'],
  ['log10', [99999], '4013fffedc8c6730'],
  ['sin', [-12345.6], '3fe83b9626da2d7e'],
  ['sin', [-3.14159], 'bec6428a6aa44cd0'],
  ['sin', [-1], 'bfeaed548f090cee'],
  ['sin', [1e-9], '3e112e0be826d695'],
  ['sin', [0.5], '3fdeaee8744b05f0'],
  ['sin', [0.785], '3fe69e4fd79ac743'],
  ['sin', [2], '3fed18f6ead1b446'],
  ['sin', [100], 'bfe03425b78c4db8'],
  ['sin', [100000], '3fa24daa9c527e96'],
  ['cos', [-12345.6], '3fe4e62cef481db3'],
  ['cos', [-3.14159], 'bfefffffffff8420'],
  ['cos', [-1], '3fe14a280fb5068c'],
  ['cos', [1e-9], '3ff0000000000000'],
  ['cos', [0.5], '3fec1528065b7d50'],
  ['cos', [0.785], '3fe6a2ecb934b59a'],
  ['cos', [2], 'bfdaa22657537205'],
  ['cos', [100], '3feb981dbf665fdf'],
  ['cos', [100000], 'bfeffac3841b3da7'],
  ['tan', [-1.5], 'c02c33ed50b88778'],
  ['tan', [-0.3], 'bfd3cc2a44e29997'],
  ['tan', [0.2], '3fc9f267068a55eb'],
  ['tan', [1], '3ff8eb245cbee3a5'],
  ['tan', [1.57], '40939f0ff737e7f3'],
  ['tan', [42], '400254c33a4fba92'],
  ['atan', [-10000000000], 'bff921fb543d4de0'],
  ['atan', [-2.5], 'bff30b6d796a4da8'],
  ['atan', [-0.5], 'bfddac670561bb4f'],
  ['atan', [1e-9], '3e112e0be826d695'],
  ['atan', [0.3], '3fd2a73a661eaf06'],
  ['atan', [0.7], '3fe38b112d7bd4ad'],
  ['atan', [1.2], '3fec08aae496efa6'],
  ['atan', [2], '3ff1b6e192ebbe44'],
  ['atan', [100], '3ff8f905eb2def22'],
  ['asin', [-0.999], 'bff86ac9ad18f803'],
  ['asin', [-0.3], 'bfd380159e14f6ff'],
  ['asin', [0.1], '3fb9a49276037884'],
  ['asin', [0.7], '3fe8d00e692afd96'],
  ['asin', [0.9999], '3ff8e80e1a01556a'],
  ['acos', [-0.999], '4008c66280ae928e'],
  ['acos', [-0.3], '3ffe0200bbc96ad9'],
  ['acos', [0.1], '3ff787b22ce3f590'],
  ['acos', [0.7], '3fe973e83f5d5c9a'],
  ['acos', [0.9999], '3f8cf69d216bd74b'],
  ['tanh', [-30], 'bff0000000000000'],
  ['tanh', [-2], 'bfeed9505e1bc3d4'],
  ['tanh', [-0.3], 'bfd2a4dda7d914fa'],
  ['tanh', [0.000001], '3eb0c6f7a0b5e767'],
  ['tanh', [0.8], '3fe53fca0a748a42'],
  ['tanh', [5], '3fefff419668df11'],
  ['sigmoid', [-40], '3c539792499b1a24'],
  ['sigmoid', [-3], '3fa848343c905446'],
  ['sigmoid', [0], '3fe0000000000000'],
  ['sigmoid', [0.5], '3fe3eb2fd4d34391'],
  ['sigmoid', [12], '3feffff31d5f129e'],
  ['pow', [2, 0.5], '3ff6a09e667f3bcd'],
  ['pow', [3.7, 2.2], '4031c8dab7831d81'],
  ['pow', [0.5, -7.3], '4063b2c47bff8328'],
  ['pow', [10, 0.333], '400138e5a15089e4'],
  ['pow', [1.0001, 10000], '4005bec34aabbfd3'],
  ['pow', [-2, 5], 'c040000000000000'],
  ['pow', [7, -3], '3f67e225515a4f1d'],
  ['pow', [0.001, 1.5], '3f009456549be1be'],
  ['atan2', [1, 1], '3fe921fb54442d18'],
  ['atan2', [-1, -1], 'c002d97c7f3321d2'],
  ['atan2', [1, -1], '4002d97c7f3321d2'],
  ['atan2', [-1, 1], 'bfe921fb54442d18'],
  ['atan2', [1e-10, 1], '3ddb7cdfd9d7bdbb'],
  ['atan2', [3, 1e-9], '3ff921fb542d4508'],
  ['atan2', [-2.5, -7.25], 'c00679ec88f8c904'],
  ['hypot', [3, 4], '4014000000000000'],
  ['hypot', [1e200, 1e200], '697d8f9811335b57'],
  ['hypot', [1e-200, 3e-200], '16835d5244b69495'],
  ['hypot', [-5, 12.5], '402aed02cdd31071'],
];

const view = new DataView(new ArrayBuffer(8));
export function bits(x: number): string {
  view.setFloat64(0, x);
  return (
    view.getUint32(0).toString(16).padStart(8, '0') +
    view.getUint32(4).toString(16).padStart(8, '0')
  );
}

function call(fn: Fn, args: number[]): number {
  const f: (...a: number[]) => number = M[fn];
  return f(...args);
}

describe('core/math · golden bit a bit', () => {
  it.each(MATH_GOLDEN)('%s(%j)', (fn, args, expected) => {
    expect(bits(call(fn, args))).toBe(expected);
  });
});
