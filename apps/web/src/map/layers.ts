// Capas sobre el terreno: ríos (cintas por columna de chunks, reposicionadas con el wrap) y
// marcadores instanciados (la X se envuelve en el shader).
import {
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  Group,
  InstancedBufferAttribute,
  Mesh,
  OctahedronGeometry,
  Sphere,
  Vector3,
} from 'three/webgpu';
import type { Material } from 'three/webgpu';
import { CHUNK_SIZE } from './config';
import { type MapTextures, type MapUniforms, markerMaterial } from './materials';
import { MARKER_FLOATS } from './markers';
import type { RiverColumnGeometry } from './rivers';
import { nearestCopyX } from './wrap';

/** Margen de la esfera envolvente de los ríos (celdas): tramos que salen del chunk, elevación extra. */
const RIVER_BOUNDS_MARGIN = 2;

export class RiverLayer {
  readonly group = new Group();
  readonly vertices: number;
  readonly bytes: number;
  private readonly columns: { readonly x0: number; readonly mesh: Mesh }[] = [];
  private readonly width: number;

  constructor(columns: readonly RiverColumnGeometry[], width: number, material: Material) {
    this.width = width;
    let vertices = 0;
    let bytes = 0;
    for (const c of columns) {
      const n = c.flowT.length;
      const position = new Float32Array(n * 3);
      for (let v = 0; v < n; v++) {
        position[v * 3] = c.center[v * 2] ?? 0;
        position[v * 3 + 2] = c.center[v * 2 + 1] ?? 0;
      }
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(position, 3));
      geometry.setAttribute('riverOffset', new BufferAttribute(c.offset, 2));
      geometry.setAttribute('riverFlowT', new BufferAttribute(c.flowT, 1));
      geometry.setIndex(new BufferAttribute(c.index, 1));
      const mesh = new Mesh(geometry, material);
      mesh.position.set(c.x0, 0, 0);
      this.group.add(mesh);
      this.columns.push({ x0: c.x0, mesh });
      vertices += n;
      bytes += position.byteLength + c.offset.byteLength + c.flowT.byteLength + c.index.byteLength;
    }
    this.vertices = vertices;
    this.bytes = bytes;
  }

  /**
   * Esfera envolvente de cada columna (todas las filas del mundo; un tramo puede salirse hasta
   * una celda del chunk), con la altura máxima del relieve dibujado (celdas).
   */
  setMaxHeight(maxHeight: number, rows: number): void {
    const top = Math.max(maxHeight, 0) + RIVER_BOUNDS_MARGIN;
    for (const { mesh } of this.columns) {
      mesh.geometry.boundingSphere = new Sphere(
        new Vector3(CHUNK_SIZE / 2, top / 2, rows / 2),
        Math.hypot(CHUNK_SIZE / 2 + RIVER_BOUNDS_MARGIN, top / 2, rows / 2),
      );
    }
  }

  setWarmup(on: boolean): void {
    for (const { mesh } of this.columns) mesh.frustumCulled = !on;
  }

  update(cameraX: number): void {
    for (const { x0, mesh } of this.columns) {
      mesh.position.x = nearestCopyX(x0, CHUNK_SIZE, cameraX, this.width);
    }
  }

  dispose(): void {
    for (const { mesh } of this.columns) mesh.geometry.dispose();
  }
}

/** Capacidad inicial de instancias (count); crece al doble si no alcanza. */
const MIN_CAPACITY = 256;

export class MarkerLayer {
  readonly mesh: Mesh;
  private capacity = 0;
  private positions: InstancedBufferAttribute | null = null;
  private colors: InstancedBufferAttribute | null = null;
  private readonly textures: MapTextures;
  private readonly uniforms: MapUniforms;

  constructor(
    shape: 'settlement' | 'battle',
    textures: MapTextures,
    uniforms: MapUniforms,
    initialCapacity = MIN_CAPACITY,
  ) {
    this.textures = textures;
    this.uniforms = uniforms;
    const geometry =
      shape === 'settlement'
        ? new CylinderGeometry(1, 1, 1, 6).translate(0, 0.5, 0)
        : new OctahedronGeometry(1).translate(0, 1, 0);
    this.mesh = new Mesh(geometry);
    // La posición sale del shader (instancias + wrap): el volumen de la geometría no sirve.
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.grow(Math.max(MIN_CAPACITY, initialCapacity));
  }

  private grow(capacity: number): void {
    this.capacity = capacity;
    this.positions = new InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    this.colors = new InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    const previous = this.mesh.material;
    if (!Array.isArray(previous)) previous.dispose();
    this.mesh.material = markerMaterial(this.textures, this.uniforms, this.positions, this.colors);
  }

  /** `instances`: `MARKER_FLOATS` por instancia (`settlementInstances` / `battleInstances`). */
  set(instances: Float32Array): void {
    const n = instances.length / MARKER_FLOATS;
    if (n > this.capacity) this.grow(Math.max(n, this.capacity * 2));
    const pos = this.positions;
    const col = this.colors;
    if (!pos || !col) return;
    const p = pos.array as Float32Array;
    const c = col.array as Float32Array;
    for (let i = 0; i < n; i++) {
      p.set(instances.subarray(i * MARKER_FLOATS, i * MARKER_FLOATS + 4), i * 4);
      c.set(instances.subarray(i * MARKER_FLOATS + 4, i * MARKER_FLOATS + 8), i * 4);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
    this.mesh.count = n;
  }

  get count(): number {
    return this.mesh.count;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    const m = this.mesh.material;
    if (!Array.isArray(m)) m.dispose();
  }
}
