// Cámara tipo mapa: objetivo sobre el plano + distancia/inclinación/rumbo. Pan horizontal
// infinito: x se envuelve a [0, ancho) y el terreno reposiciona sus chunks alrededor.
import { clamp, wrap } from '@ws/core/math';
import type { PerspectiveCamera } from 'three/webgpu';
import { CAMERA_FOV_DEG, CAMERA_MAX_DISTANCE, CAMERA_MIN_DISTANCE } from './config';
import { pitchForDistance } from './tour';
import type { CameraPose } from './tour';

/** Velocidad de pan con teclado, en alturas de pantalla por segundo. */
const KEY_PAN_SPEED = 0.6;
/** Velocidad de giro con teclado, en rad/s. */
const KEY_YAW_SPEED = 1.2;
/** Sensibilidad de la rueda: factor de distancia por unidad de deltaY. */
const WHEEL_ZOOM = 0.0015;

export function applyPose(camera: PerspectiveCamera, pose: CameraPose): void {
  const cp = Math.cos(pose.pitch);
  camera.position.set(
    pose.x + pose.distance * cp * Math.sin(pose.yaw),
    pose.distance * Math.sin(pose.pitch),
    pose.z + pose.distance * cp * Math.cos(pose.yaw),
  );
  camera.lookAt(pose.x, 0, pose.z);
}

/** Lleva la pose a rangos válidos: x con wrap, z dentro del mapa, distancia acotada. */
export function normalizePose(pose: CameraPose, width: number, height: number): void {
  pose.x = wrap(pose.x, width);
  pose.z = clamp(pose.z, 0, height);
  pose.distance = clamp(pose.distance, CAMERA_MIN_DISTANCE, CAMERA_MAX_DISTANCE);
}

/** Pan con arrastre, zoom con rueda, WASD/flechas para mover y Q/E para girar. */
export class MapControls {
  enabled = true;
  private readonly keys = new Set<string>();
  private drag: { x: number; y: number } | null = null;

  private readonly element: HTMLElement;
  private readonly pose: CameraPose;

  constructor(element: HTMLElement, pose: CameraPose) {
    this.element = element;
    this.pose = pose;
    element.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      this.drag = { x: e.clientX, y: e.clientY };
      element.setPointerCapture(e.pointerId);
    });
    element.addEventListener('pointermove', (e) => {
      if (!this.drag || !this.enabled) return;
      this.pan(e.clientX - this.drag.x, e.clientY - this.drag.y);
      this.drag = { x: e.clientX, y: e.clientY };
    });
    element.addEventListener('pointerup', () => (this.drag = null));
    element.addEventListener(
      'wheel',
      (e) => {
        if (!this.enabled) return;
        e.preventDefault();
        this.pose.distance *= 1 + e.deltaY * WHEEL_ZOOM;
        this.pose.distance = clamp(this.pose.distance, CAMERA_MIN_DISTANCE, CAMERA_MAX_DISTANCE);
        this.pose.pitch = pitchForDistance(this.pose.distance);
      },
      { passive: false },
    );
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
    });
  }

  /** Unidades de mundo por píxel de pantalla, aproximado en el objetivo. */
  private unitsPerPixel(): number {
    const viewHeight = 2 * this.pose.distance * Math.tan((CAMERA_FOV_DEG * Math.PI) / 360);
    return viewHeight / Math.max(1, this.element.clientHeight);
  }

  /** Mueve el objetivo: arrastrar a la derecha lleva el mapa a la derecha. */
  private pan(dxPx: number, dyPx: number): void {
    const s = this.unitsPerPixel();
    const { yaw } = this.pose;
    // Derecha de pantalla = (cos yaw, −sin yaw); adelante (hacia el norte) = (−sin yaw, −cos yaw).
    this.pose.x += -dxPx * s * Math.cos(yaw) - dyPx * s * Math.sin(yaw);
    this.pose.z += dxPx * s * Math.sin(yaw) - dyPx * s * Math.cos(yaw);
  }

  update(dtMs: number): void {
    if (!this.enabled || this.keys.size === 0) return;
    const step = (KEY_PAN_SPEED * dtMs) / 1000;
    const px = this.element.clientHeight * step;
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
