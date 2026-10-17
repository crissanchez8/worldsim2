// Terreno por chunks con LOD y wrap E-O. Cada nivel de LOD es UNA grilla plana compartida por todos
// los chunks; el vertex shader la desplaza leyendo la altura en XZ de mundo. La textura repite en
// U, así que cualquier copia de un chunk lee las alturas correctas.
import { BufferAttribute, BufferGeometry, Group, Mesh, Sphere, Vector3 } from 'three/webgpu';
import type { Material } from 'three/webgpu';
import { CHUNK_SIZE, LOD_STEPS, SKIRT_DEPTH } from './config';
import { distanceToChunk, lodForDistance, nearestCopyX } from './wrap';

export interface GeometryStats {
  readonly vertices: number;
  readonly triangles: number;
  readonly bytes: number;
}

/**
 * Grilla de un chunk con paso `step`, en coordenadas locales [0, size]². Agrega un faldón en el
 * borde (vértices con y = −1, que el shader baja SKIRT_DEPTH) para tapar las grietas entre LODs.
 */
function createChunkGeometry(size: number, step: number) {
  const n = size / step;
  const row = n + 1;
  const gridVerts = row * row;
  const skirtVerts = 4 * row;
  const positions = new Float32Array((gridVerts + skirtVerts) * 3);
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      const v = (j * row + i) * 3;
      positions[v] = i * step;
      positions[v + 2] = j * step;
    }
  }
  // Bordes: norte (j = 0), sur (j = n), oeste (i = 0), este (i = n).
  const edges: number[][] = [[], [], [], []];
  for (let k = 0; k <= n; k++) {
    edges[0]?.push(k);
    edges[1]?.push(n * row + k);
    edges[2]?.push(k * row);
    edges[3]?.push(k * row + n);
  }
  let next = gridVerts;
  const skirtOf: number[][] = [];
  for (const edge of edges) {
    const ids: number[] = [];
    for (const top of edge) {
      const v = next * 3;
      positions[v] = positions[top * 3] ?? 0;
      positions[v + 1] = -1;
      positions[v + 2] = positions[top * 3 + 2] ?? 0;
      ids.push(next++);
    }
    skirtOf.push(ids);
  }
  const gridTris = 2 * n * n;
  // Faldones con las dos caras (4 triángulos por tramo): no depende del sentido de cada borde.
  const skirtTris = 4 * 4 * n;
  const IndexArray = gridVerts + skirtVerts > 65535 ? Uint32Array : Uint16Array;
  const indices = new IndexArray((gridTris + skirtTris) * 3);
  let t = 0;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const a = j * row + i;
      const b = a + row;
      indices.set([a, b, a + 1, b, b + 1, a + 1], t);
      t += 6;
    }
  }
  for (let e = 0; e < 4; e++) {
    const top = edges[e] ?? [];
    const bottom = skirtOf[e] ?? [];
    for (let k = 0; k < n; k++) {
      const a = top[k] ?? 0;
      const b = top[k + 1] ?? 0;
      const c = bottom[k] ?? 0;
      const d = bottom[k + 1] ?? 0;
      indices.set([a, c, b, b, c, d, a, b, c, b, d, c], t);
      t += 12;
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setIndex(new BufferAttribute(indices, 1));
  return {
    geometry,
    stats: {
      vertices: gridVerts + skirtVerts,
      triangles: gridTris + skirtTris,
      bytes: positions.byteLength + indices.byteLength,
    },
  };
}

/** Esfera envolvente de un chunk: el desplazamiento ocurre en la GPU, el volumen se fija a mano. */
export function chunkBoundingSphere(size: number, yMin: number, yMax: number): Sphere {
  const half = size / 2;
  const halfY = (yMax - yMin) / 2;
  return new Sphere(
    new Vector3(half, (yMin + yMax) / 2, half),
    Math.sqrt(2 * half * half + halfY * halfY),
  );
}

interface Chunk {
  readonly x0: number;
  readonly z0: number;
  readonly meshes: readonly Mesh[];
  lod: number;
}

export class Terrain {
  readonly group = new Group();
  readonly geometry: GeometryStats;
  private readonly chunks: Chunk[] = [];
  private readonly geometries: BufferGeometry[];
  private readonly width: number;
  readonly lodCounts: number[] = LOD_STEPS.map(() => 0);

  constructor(width: number, height: number, material: Material, maxHeight: number) {
    this.width = width;
    const lods = LOD_STEPS.map((step) => createChunkGeometry(CHUNK_SIZE, step));
    this.geometries = lods.map((l) => l.geometry);
    this.setMaxHeight(maxHeight);
    this.geometry = lods.reduce(
      (acc, l) => ({
        vertices: acc.vertices + l.stats.vertices,
        triangles: acc.triangles + l.stats.triangles,
        bytes: acc.bytes + l.stats.bytes,
      }),
      { vertices: 0, triangles: 0, bytes: 0 },
    );
    for (let z0 = 0; z0 < height; z0 += CHUNK_SIZE) {
      for (let x0 = 0; x0 < width; x0 += CHUNK_SIZE) {
        const meshes = this.geometries.map((geometry) => {
          const mesh = new Mesh(geometry, material);
          mesh.position.set(x0, 0, z0);
          mesh.visible = false;
          this.group.add(mesh);
          return mesh;
        });
        this.chunks.push({ x0, z0, meshes, lod: -1 });
      }
    }
  }

  get chunkCount(): number {
    return this.chunks.length;
  }

  /** Altura máxima del relieve en el mundo (celdas): esfera envolvente de las grillas. */
  setMaxHeight(maxHeight: number): void {
    for (const g of this.geometries) {
      g.boundingSphere = chunkBoundingSphere(CHUNK_SIZE, -SKIRT_DEPTH, Math.max(maxHeight, 0));
    }
  }

  /** Todas las mallas visibles y sin descarte (precalentado) o vuelta al estado normal. */
  setWarmup(on: boolean): void {
    for (const chunk of this.chunks) {
      chunk.lod = -1;
      for (const mesh of chunk.meshes) {
        mesh.visible = on;
        mesh.frustumCulled = !on;
      }
    }
  }

  /**
   * Reposiciona cada chunk en su copia más cercana a la cámara (wrap E-O) y elige su LOD.
   * `forcedLod` fija el nivel para todos (medición del peor caso).
   */
  update(camera: Vector3, lodBaseDistance: number, forcedLod: number | null): void {
    this.lodCounts.fill(0);
    for (const chunk of this.chunks) {
      const x = nearestCopyX(chunk.x0, CHUNK_SIZE, camera.x, this.width);
      const lod =
        forcedLod ??
        lodForDistance(
          distanceToChunk(camera.x, camera.y, camera.z, x, chunk.z0, CHUNK_SIZE),
          lodBaseDistance,
          LOD_STEPS.length,
        );
      if (lod !== chunk.lod) {
        const previous = chunk.meshes[chunk.lod];
        if (previous) previous.visible = false;
        chunk.lod = lod;
      }
      const mesh = chunk.meshes[lod];
      if (mesh) {
        mesh.visible = true;
        mesh.position.x = x;
      }
      this.lodCounts[lod] = (this.lodCounts[lod] ?? 0) + 1;
    }
  }

  dispose(): void {
    for (const g of this.geometries) g.dispose();
  }
}
