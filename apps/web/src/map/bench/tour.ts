// Recorrido scripteado de medición (puro): cruza la costura dos veces, alterna cerca y lejos (LOD
// y zoom semántico en ambos sentidos) y recorre latitudes.
import { type CameraLimits, type CameraPose, pitchForDistance } from '../camera';

/** Distancia baja y alta del recorrido (fraction del rango de la cámara). */
const TOUR_NEAR = 0.035;
const TOUR_FAR = 0.85;
/** Ciclos de acercamiento/alejamiento. */
const TOUR_ZOOM_CYCLES = 2;
/** Avance total hacia el este (fraction del ancho): más de una vuelta. */
const TOUR_TRAVEL = 1.27;
/** Arranque al oeste de la costura (fraction del ancho). */
const TOUR_START_BEFORE_SEAM = 0.2;
/** Amplitud del vaivén N-S (fraction del alto). */
const TOUR_LAT_SWING = 0.28;
/** Amplitud del giro de rumbo (rad). */
const TOUR_YAW_SWING = 0.35;

/**
 * Pose en el segundo `t` de un recorrido de `duration` s. La velocidad horizontal es
 * proporcional a la distancia (de cerca va lento), integrada en forma cerrada. `x` sale sin
 * envolver: quien la usa la lleva a [0, ancho).
 */
export function tourPose(t: number, duration: number, limits: CameraLimits): CameraPose {
  const { width, height, minDistance, maxDistance } = limits;
  const near = minDistance + TOUR_NEAR * (maxDistance - minDistance);
  const far = minDistance + TOUR_FAR * (maxDistance - minDistance);
  const u = Math.min(1, Math.max(0, t / duration));
  const w = 2 * Math.PI * TOUR_ZOOM_CYCLES;
  const zoom = 0.5 - 0.5 * Math.cos(w * u);
  const distance = near + (far - near) * zoom;
  // ∫₀ᵘ distancia du = near·u + (far − near)·(u/2 − sin(w·u)/(2w))
  const integral = near * u + (far - near) * (u / 2 - Math.sin(w * u) / (2 * w));
  const total = (near + far) / 2;
  const x = width * (1 - TOUR_START_BEFORE_SEAM) + (TOUR_TRAVEL * width * integral) / total;
  const z = height / 2 + TOUR_LAT_SWING * height * Math.sin(2 * Math.PI * 1.5 * u);
  return {
    x,
    z,
    distance,
    pitch: pitchForDistance(distance, limits),
    yaw: TOUR_YAW_SWING * Math.sin(2 * Math.PI * u),
  };
}
