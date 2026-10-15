// Matemática determinista del motor (ADR-003). Reemplaza a las funciones de `Math` que el lint
// prohíbe en el motor: estas dan bit a bit el mismo resultado en todo navegador y en Node.
export { exp, expm1, log, log10, log1p, log2, pow } from './exp-log';
export { acos, asin, atan, atan2, cos, sin, tan } from './trig';
export {
  clamp,
  clamp01,
  DEG_TO_RAD,
  hypot,
  invLerp,
  lerp,
  PI,
  RAD_TO_DEG,
  remap,
  sigmoid,
  smoothstep,
  TAU,
  tanh,
  wrap,
  wrapDelta,
} from './util';
