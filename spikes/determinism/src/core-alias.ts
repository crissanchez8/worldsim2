// `Math.sqrt` es la única operación no trivial de Math permitida en el motor (exacta por IEEE);
// el spike C la verifica igual entre motores. Este archivo no está bajo el lint del motor.
import { hash } from '@ws/core';

export const core = {
  sqrt: (x: number) => Math.sqrt(x),
  hash64: hash.hash64,
};
