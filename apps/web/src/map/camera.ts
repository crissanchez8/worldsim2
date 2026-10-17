// Cámara tipo mapa: objetivo sobre el plano + distancia, inclinación y rumbo. Pan horizontal
// infinito: X se envuelve a [0, ancho) y el terreno reposiciona sus chunks alrededor.
import { CAMERA, scaleForWidth } from './config';
import { wrap } from './wrap';

/** Campo de visión vertical (rad). */
export const CAMERA_FOV_RAD = (CAMERA.fovDeg * Math.PI) / 180;

export interface CameraPose {
  /** Objetivo sobre el mapa (celdas; x con wrap, z = fila). */
  x: number;
  z: number;
  /** Distancia cámara-objetivo (celdas). */
  distance: number;
  /** Elevación sobre el horizonte (rad). */
  pitch: number;
  /** Rumbo (rad; 0 = mirando al norte, −z). */
  yaw: number;
}

/** Límites de cámara para un ancho de mundo (celdas). */
export interface CameraLimits {
  readonly width: number;
  readonly height: number;
  readonly minDistance: number;
  readonly maxDistance: number;
  readonly far: number;
  readonly near: number;
}

export function cameraLimits(width: number, height: number): CameraLimits {
  const s = scaleForWidth(width);
  return {
    width,
    height,
    minDistance: CAMERA.minDistance * s,
    maxDistance: CAMERA.maxDistance * s,
    far: CAMERA.far * s,
    near: CAMERA.near * s,
  };
}

/** Inclinación según la distancia: de cerca oblicua, de lejos casi cenital. */
export function pitchForDistance(distance: number, limits: CameraLimits): number {
  const t = (distance - limits.minDistance) / (limits.maxDistance - limits.minDistance);
  return CAMERA.pitchNear + (CAMERA.pitchFar - CAMERA.pitchNear) * Math.min(1, Math.max(0, t));
}

/** Lleva la pose a rangos válidos: x con wrap, z dentro del mapa, distancia acotada. */
export function normalizePose(pose: CameraPose, limits: CameraLimits): void {
  pose.x = wrap(pose.x, limits.width);
  pose.z = Math.min(Math.max(pose.z, 0), limits.height);
  pose.distance = Math.min(Math.max(pose.distance, limits.minDistance), limits.maxDistance);
  pose.pitch = pitchForDistance(pose.distance, limits);
}

/** Posición de la cámara (mundo) para una pose. */
export function cameraPosition(pose: CameraPose): [number, number, number] {
  const cp = Math.cos(pose.pitch);
  return [
    pose.x + pose.distance * cp * Math.sin(pose.yaw),
    pose.distance * Math.sin(pose.pitch),
    pose.z + pose.distance * cp * Math.cos(pose.yaw),
  ];
}

/** Velocidad de pan con teclado (alturas de pantalla por segundo). */
const KEY_PAN_SPEED = 0.6;
/** Velocidad de giro con teclado (rad/s). */
const KEY_YAW_SPEED = 1.2;
/** Sensibilidad de la rueda: factor de distancia por unidad de deltaY. */
const WHEEL_ZOOM = 0.0015;
/** Un arrastre de menos de esto es un clic (px). */
const CLICK_SLOP_PX = 5;

/** Pan con arrastre, zoom con rueda, WASD/flechas para mover y Q/E para girar; clic = selección. */
export class MapControls {
  enabled = true;
  /** Clic sin arrastre, en coordenadas de cliente. */
  onClick: ((clientX: number, clientY: number) => void) | null = null;
  private readonly keys = new Set<string>();
  private drag: { x: number; y: number; startX: number; startY: number; moved: boolean } | null =
    null;
  private readonly element: HTMLElement;
  private readonly pose: CameraPose;
  private readonly limits: CameraLimits;
  private readonly abort = new AbortController();

  constructor(element: HTMLElement, pose: CameraPose, limits: CameraLimits) {
    this.element = element;
    this.pose = pose;
    this.limits = limits;
    const signal = this.abort.signal;
    element.addEventListener(
      'pointerdown',
      (e) => {
        if (!this.enabled || e.button !== 0) return;
        this.drag = {
          x: e.clientX,
          y: e.clientY,
          startX: e.clientX,
          startY: e.clientY,
          moved: false,
        };
        element.setPointerCapture(e.pointerId);
      },
      { signal },
    );
    element.addEventListener(
      'pointermove',
      (e) => {
        if (!this.drag || !this.enabled) return;
        const d = this.drag;
        if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > CLICK_SLOP_PX) d.moved = true;
        if (d.moved) this.pan(e.clientX - d.x, e.clientY - d.y);
        d.x = e.clientX;
        d.y = e.clientY;
      },
      { signal },
    );
    element.addEventListener(
      'pointerup',
      (e) => {
        const d = this.drag;
        this.drag = null;
        if (d && !d.moved && this.enabled) this.onClick?.(e.clientX, e.clientY);
      },
      { signal },
    );
    element.addEventListener(
      'wheel',
      (e) => {
        if (!this.enabled) return;
        e.preventDefault();
        const p = this.pose;
        p.distance *= 1 + e.deltaY * WHEEL_ZOOM;
        normalizePose(p, this.limits);
      },
      { passive: false, signal },
    );
    window.addEventListener(
      'keydown',
      (e) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
        this.keys.add(e.key.toLowerCase());
      },
      { signal },
    );
    window.addEventListener(
      'keyup',
      (e) => {
        this.keys.delete(e.key.toLowerCase());
      },
      { signal },
    );
    window.addEventListener(
      'blur',
      () => {
        this.keys.clear();
      },
      { signal },
    );
  }

  dispose(): void {
    this.abort.abort();
  }

  /** Celdas por píxel de pantalla, aproximado en el objetivo. */
  private unitsPerPixel(): number {
    const viewHeight = 2 * this.pose.distance * Math.tan(CAMERA_FOV_RAD / 2);
    return viewHeight / Math.max(1, this.element.clientHeight);
  }

  /** Mueve el objetivo: arrastrar a la derecha lleva el mapa a la derecha. */
  private pan(dxPx: number, dyPx: number): void {
    const s = this.unitsPerPixel();
    const { yaw } = this.pose;
    this.pose.x += -dxPx * s * Math.cos(yaw) - dyPx * s * Math.sin(yaw);
    this.pose.z += dxPx * s * Math.sin(yaw) - dyPx * s * Math.cos(yaw);
  }

  update(dtMs: number): void {
    if (!this.enabled || this.keys.size === 0) return;
    const px = (this.element.clientHeight * KEY_PAN_SPEED * dtMs) / 1000;
    const k = (...names: string[]) => names.some((n) => this.keys.has(n));
    let dx = 0;
    let dy = 0;
    if (k('a', 'arrowleft')) dx += px;
    if (k('d', 'arrowright')) dx -= px;
    if (k('w', 'arrowup')) dy += px;
    if (k('s', 'arrowdown')) dy -= px;
    if (dx !== 0 || dy !== 0) this.pan(dx, dy);
    if (k('q')) this.pose.yaw -= (KEY_YAW_SPEED * dtMs) / 1000;
    if (k('e')) this.pose.yaw += (KEY_YAW_SPEED * dtMs) / 1000;
  }
}
