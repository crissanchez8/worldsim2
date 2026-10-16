// Pose de cámara y recorrido scripteado de medición (funciones puras, sin three).
import { CAMERA_MAX_DISTANCE, CAMERA_MIN_DISTANCE } from './config';

export interface CameraPose {
  /** Objetivo de la cámara sobre el mapa, en celdas (x con wrap, z = fila). */
  x: number;
  z: number;
  /** Distancia cámara-objetivo, en unidades. */
  distance: number;
  /** Elevación de la cámara sobre el horizonte, en rad. */
  pitch: number;
  /** Rumbo, en rad (0 = mirando al norte, −z). */
  yaw: number;
}

/** Inclinación según la distancia: de cerca se ve más oblicuo, de lejos más cenital (rad). */
const PITCH_NEAR = 0.62;
const PITCH_FAR = 1.15;

export function pitchForDistance(distance: number): number {
  const t = (distance - CAMERA_MIN_DISTANCE) / (CAMERA_MAX_DISTANCE - CAMERA_MIN_DISTANCE);
  return PITCH_NEAR + (PITCH_FAR - PITCH_NEAR) * Math.min(1, Math.max(0, t));
}

/** Distancia baja y alta del recorrido (unidades): fuerza cambios de LOD en ambos sentidos. */
const TOUR_NEAR = 45;
const TOUR_FAR = 520;
/** Ciclos de acercamiento/alejamiento en el recorrido. */
const TOUR_ZOOM_CYCLES = 2;
/** Recorrido total hacia el este, en celdas: más que una vuelta (cruza la costura dos veces). */
const TOUR_TRAVEL = 2600;
/** Arranque a 400 celdas al oeste de la costura (x = 0 ≡ ancho del mapa). */
const TOUR_START_BEFORE_SEAM = 400;
/** Amplitud del vaivén N-S, en fracción del alto del mapa. */
const TOUR_LAT_SWING = 0.28;
/** Amplitud del giro de rumbo, en rad. */
const TOUR_YAW_SWING = 0.35;

/**
 * Pose en el segundo `t` de un recorrido de `duration` s. La velocidad horizontal es
 * proporcional a la distancia (de cerca va lento), integrada en forma cerrada.
 * `x` sale sin envolver: quien la usa la lleva a [0, ancho).
 */
export function tourPose(t: number, duration: number, width: number, height: number): CameraPose {
  const u = Math.min(1, Math.max(0, t / duration));
  const w = 2 * Math.PI * TOUR_ZOOM_CYCLES;
  const zoom = 0.5 - 0.5 * Math.cos(w * u);
  const distance = TOUR_NEAR + (TOUR_FAR - TOUR_NEAR) * zoom;
  // ∫₀ᵘ distancia du = near·u + (far − near)·(u/2 − sin(w·u)/(2w))
  const integral = TOUR_NEAR * u + (TOUR_FAR - TOUR_NEAR) * (u / 2 - Math.sin(w * u) / (2 * w));
  const total = (TOUR_NEAR + TOUR_FAR) / 2;
  const x = width - TOUR_START_BEFORE_SEAM + (TOUR_TRAVEL * integral) / total;
  const z = height / 2 + TOUR_LAT_SWING * height * Math.sin(2 * Math.PI * 1.5 * u);
  return {
    x,
    z,
    distance,
    pitch: pitchForDistance(distance),
    yaw: TOUR_YAW_SWING * Math.sin(2 * Math.PI * u),
  };
}
