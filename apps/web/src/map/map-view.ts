// Vista del mapa v1 (P1.2): arma la escena desde un `WorldStatic` (texturas, terreno por chunks,
// ríos, marcadores), corre el bucle de render con wrap E-O y zoom semántico, resuelve el picking
// en CPU y mide la carga y los cuadros (`MapReport`).
//
// API para el resto de la app: `setProvinceColors` (≈1.500 colores RGBA: el relleno político lo
// pasa P1.3/P1.6), `setSettlements`, `setBattles`, `setVerticalExaggeration`, `onHover`,
// `onSelect`. Todo texto lo pone la UI (i18n); esta clase no tiene strings visibles.
import { Color, Fog, PerspectiveCamera, Scene, Vector3, WebGPURenderer } from 'three/webgpu';
import type { WorldStatic } from '@ws/worldgen';
import { createGpuQueueProbe, type GpuQueueProbe, waitGpuIdle } from './bench/gpu-queue';
import { FrameRecorder, percentile } from './bench/metrics';
import { tourPose } from './bench/tour';
import {
  CAMERA_FOV_RAD,
  type CameraLimits,
  cameraLimits,
  type CameraPose,
  cameraPosition,
  MapControls,
  normalizePose,
} from './camera';
import { CAMERA, LOD_BASE_DISTANCE, MAX_LAND_M, MEASURE, PALETTE, scaleForWidth } from './config';
import { RiverLayer, MarkerLayer } from './layers';
import type { MapData } from './map-data';
import {
  createMapTextures,
  createMapUniforms,
  type MapTextures,
  type MapUniforms,
  riverMaterial,
  terrainMaterial,
} from './materials';
import {
  battleInstances,
  type BattleMarker,
  settlementInstances,
  type SettlementMarker,
} from './markers';
import { type CellPick, pickCell, raycastSurface } from './picking';
import type { MapReport } from './report';
import { semanticState } from './semantic';
import { Terrain } from './terrain';
import { colorTableTexels } from './textures';
import { sampleBilinear } from './wrap';

export type Backend = 'webgpu' | 'webgl2';

export interface RendererHandle {
  readonly renderer: WebGPURenderer;
  readonly backend: Backend;
  readonly forced: boolean;
  readonly initMs: number;
}

/** Crea e inicializa el renderer (WebGPU con fallback automático a WebGL2, ADR-006). */
export async function createRenderer(
  backend: 'auto' | 'webgl2',
  antialias: boolean,
): Promise<RendererHandle> {
  const t0 = performance.now();
  const renderer = new WebGPURenderer({
    antialias,
    forceWebGL: backend === 'webgl2',
    powerPreference: 'high-performance',
  });
  await renderer.init();
  return {
    renderer,
    backend: 'isWebGPUBackend' in renderer.backend ? 'webgpu' : 'webgl2',
    forced: backend === 'webgl2',
    initMs: performance.now() - t0,
  };
}

export interface MapPick extends CellPick {
  /** Punto de mundo (celdas; X de la copia que ve la cámara). */
  readonly worldX: number;
  readonly worldZ: number;
}

export interface MapViewOptions {
  readonly dpr: number | null;
  readonly exaggeration: number;
  readonly repeat: number;
  readonly forcedLod: number | null;
  readonly lodDistance: number | null;
  readonly warmup: boolean;
  readonly x: number | null;
  readonly z: number | null;
  readonly distance: number | null;
}

/** Niebla: lejos = fracción del plano lejano; cerca = múltiplo de la distancia, con tope (adim.). */
const FOG_FAR_OF_CAMERA_FAR = 0.95;
const FOG_NEAR_OF_DISTANCE = 1.5;
const FOG_NEAR_MAX_OF_FAR = 0.7;
/** Relación de píxeles máxima por defecto (ratio). */
const DEFAULT_MAX_DPR = 2;

/** Provincia del encuadre inicial: la más habitable (en el primer id si empatan). */
function startProvince(world: WorldStatic): number {
  const { count, habitability } = world.provinces;
  let best = 1;
  for (let id = 2; id <= count; id++) {
    if ((habitability[id] ?? 0) > (habitability[best] ?? 0)) best = id;
  }
  return best;
}

function nextFrame(): Promise<number> {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

export class MapView {
  onHover: ((pick: MapPick | null, clientX: number, clientY: number) => void) | null = null;
  onSelect: ((province: number) => void) | null = null;

  private readonly renderer: WebGPURenderer;
  private readonly world: WorldStatic;
  private readonly report: MapReport;
  private readonly options: MapViewOptions;
  private readonly scene = new Scene();
  private readonly fog: Fog;
  private readonly camera: PerspectiveCamera;
  private readonly limits: CameraLimits;
  private readonly pose: CameraPose;
  private readonly controls: MapControls;
  private readonly uniforms: MapUniforms;
  private readonly textures: MapTextures;
  private readonly terrain: Terrain;
  private readonly rivers: RiverLayer;
  private readonly settlements: MarkerLayer;
  private readonly battles: MarkerLayer;
  private readonly gpuQueue: GpuQueueProbe | null;
  private readonly metersPerCell: number;
  private readonly maxElevation: number;
  private readonly lodDistance: number;
  private exaggeration: number;
  private readonly abort = new AbortController();

  private pointer: { x: number; y: number } | null = null;
  private lastPickKey = '';
  private lastTime: number | null = null;
  private frameCount = 0;
  private readonly warmupIntervals: number[] = [];
  private settle: { recorder: FrameRecorder; until: number } | null = null;
  private tour: {
    recorder: FrameRecorder;
    start: number | null;
    seconds: number;
    resolve: (summary: ReturnType<FrameRecorder['summary']>) => void;
  } | null = null;
  private disposed = false;

  constructor(
    container: HTMLElement,
    handle: RendererHandle,
    world: WorldStatic,
    data: MapData,
    options: MapViewOptions,
    report: MapReport,
  ) {
    this.renderer = handle.renderer;
    this.world = world;
    this.report = report;
    this.options = options;
    this.exaggeration = options.exaggeration;
    const { width, height, cellKm } = world.raster;
    this.metersPerCell = cellKm * 1000;
    this.maxElevation = data.maxElevation;
    this.limits = cameraLimits(width, height);
    this.lodDistance = (options.lodDistance ?? LOD_BASE_DISTANCE) * scaleForWidth(width);

    const renderer = this.renderer;
    const dpr = options.dpr ?? Math.min(window.devicePixelRatio, DEFAULT_MAX_DPR);
    renderer.setPixelRatio(dpr);
    renderer.setSize(Math.max(1, container.clientWidth), Math.max(1, container.clientHeight));
    container.prepend(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';

    this.scene.background = new Color(PALETTE.sky);
    this.fog = new Fog(PALETTE.sky, 100, this.limits.far);
    this.scene.fog = this.fog;
    this.camera = new PerspectiveCamera(
      CAMERA.fovDeg,
      Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight),
      this.limits.near,
      this.limits.far,
    );

    this.uniforms = createMapUniforms();
    this.textures = createMapTextures(width, height, data.texels);
    const maxHeight = this.maxHeightCells();
    this.terrain = new Terrain(
      width,
      height,
      terrainMaterial(this.textures, this.uniforms),
      maxHeight,
    );
    this.scene.add(this.terrain.group);
    this.rivers = new RiverLayer(data.rivers, width, riverMaterial(this.textures, this.uniforms));
    this.rivers.setMaxHeight(maxHeight, height);
    this.scene.add(this.rivers.group);
    this.settlements = new MarkerLayer(
      'settlement',
      this.textures,
      this.uniforms,
      world.provinces.count + 1,
    );
    this.battles = new MarkerLayer('battle', this.textures, this.uniforms);
    this.scene.add(this.settlements.mesh, this.battles.mesh);

    const start = startProvince(world);
    this.pose = {
      x: options.x ?? world.provinces.centroidX[start] ?? width / 2,
      z: options.z ?? world.provinces.centroidY[start] ?? height / 2,
      distance: options.distance ?? CAMERA.startDistance * scaleForWidth(width),
      pitch: 0,
      yaw: 0,
    };
    normalizePose(this.pose, this.limits);
    this.controls = new MapControls(renderer.domElement, this.pose, this.limits);
    this.controls.onClick = (x, y) => {
      const pick = this.pick(x, y);
      const province = pick?.province ?? 0;
      this.uniforms.selected.value = province;
      this.onSelect?.(province);
    };
    const signal = this.abort.signal;
    renderer.domElement.addEventListener(
      'pointermove',
      (e) => {
        this.pointer = { x: e.clientX, y: e.clientY };
      },
      { signal },
    );
    renderer.domElement.addEventListener(
      'pointerleave',
      () => {
        this.pointer = null;
        this.lastPickKey = '';
        this.onHover?.(null, 0, 0);
      },
      { signal },
    );
    this.gpuQueue = createGpuQueueProbe(renderer.backend);

    const t = this.textures;
    const tableBytes = t.colors.image.width * t.colors.image.height * 4;
    report.memory = {
      threeTexturesBytes: NaN,
      threeBuffersBytes: NaN,
      mapTexturesBytes: width * height * (4 + 4 + 2) + tableBytes,
      terrainGeometryBytes: this.terrain.geometry.bytes,
      riverBytes: this.rivers.bytes,
    };
    report.scene = {
      chunks: this.terrain.chunkCount,
      riverLines: data.riverLines,
      riverVertices: this.rivers.vertices,
      settlements: 0,
      battles: 0,
    };
    report.repeat = options.repeat;
  }

  /** Altura máxima del relieve dibujado (celdas), con la exageración actual. */
  private maxHeightCells(): number {
    return (Math.max(this.maxElevation, MAX_LAND_M) * this.exaggeration) / this.metersPerCell;
  }

  /**
   * Precalienta con UN render sincrónico con todo visible (no `compileAsync`: en WebGL2 de Firefox
   * espera ≈ 1 cuadro por objeto, ADR-006), dibuja el primer cuadro y arranca el bucle.
   */
  async start(): Promise<void> {
    const r = this.renderer;
    const t0 = performance.now();
    this.updateCamera(0);
    if (this.options.warmup) {
      this.terrain.setWarmup(true);
      this.rivers.setWarmup(true);
      r.render(this.scene, this.camera);
      this.terrain.setWarmup(false);
      this.rivers.setWarmup(false);
    }
    const t1 = performance.now();
    // El `render` solo envía: con la caché de shaders fría, la compilación de los pipelines sigue
    // en la GPU. Se espera a que termine para que el primer cuadro cuente cuando se ve.
    await waitGpuIdle(r.backend);
    const t2 = performance.now();
    this.updateCamera(0);
    r.render(this.scene, this.camera);
    await waitGpuIdle(r.backend);
    await nextFrame();
    const t3 = performance.now();
    const load = this.report.load;
    load.warmupMs = t1 - t0;
    load.gpuWarmupMs = t2 - t1;
    load.firstFrameMs = t3 - t2;
    load.firstFrameAt = t3;
    const mem = r.info.memory;
    if (this.report.memory) {
      this.report.memory.threeTexturesBytes = mem.texturesSize;
      this.report.memory.threeBuffersBytes =
        mem.attributesSize + mem.indexAttributesSize + mem.uniformBuffersSize;
    }
    this.report.canvas = {
      width: r.domElement.width,
      height: r.domElement.height,
      dpr: r.getPixelRatio(),
    };
    this.settle = { recorder: new FrameRecorder(), until: t3 + MEASURE.settleSeconds * 1000 };
    if (this.disposed) return;
    await r.setAnimationLoop(this.frame);
  }

  setProvinceColors(rgba: Uint8Array): void {
    const image = this.textures.colors.image as { data: Uint8Array };
    colorTableTexels(rgba, this.world.provinces.count, image.data);
    this.textures.colors.needsUpdate = true;
  }

  setSettlements(markers: readonly SettlementMarker[]): void {
    this.settlements.set(settlementInstances(markers));
    if (this.report.scene) this.report.scene.settlements = markers.length;
  }

  setBattles(markers: readonly BattleMarker[]): void {
    this.battles.set(battleInstances(markers));
    if (this.report.scene) this.report.scene.battles = markers.length;
  }

  /** Lleva el objetivo de la cámara a una celda (x con wrap, z = fila). */
  focus(x: number, z: number): void {
    this.pose.x = x;
    this.pose.z = z;
  }

  setVerticalExaggeration(value: number): void {
    this.exaggeration = value;
    const h = this.maxHeightCells();
    this.terrain.setMaxHeight(h);
    this.rivers.setMaxHeight(h, this.world.raster.height);
  }

  /** Recorrido scripteado de medición; resuelve con el resumen de cuadros. */
  runTour(seconds: number): Promise<ReturnType<FrameRecorder['summary']>> {
    return new Promise((resolve) => {
      this.tour = { recorder: new FrameRecorder(), start: null, seconds, resolve };
    });
  }

  /** Celda y provincia bajo un punto de la pantalla (coordenadas de cliente). */
  pick(clientX: number, clientY: number): MapPick | null {
    const el = this.renderer.domElement;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const ndc = new Vector3(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
      0.5,
    );
    const origin = this.camera.position;
    const dir = ndc.unproject(this.camera).sub(origin).normalize();
    const { raster } = this.world;
    const scale = this.uniforms.heightScale.value;
    const hit = raycastSurface(
      { origin: [origin.x, origin.y, origin.z], direction: [dir.x, dir.y, dir.z] },
      (x, z) =>
        Math.max(sampleBilinear(raster.elevation, raster.width, raster.height, x, z), 0) * scale,
      Math.max(this.maxElevation, 0) * scale,
      this.limits.far,
    );
    if (!hit) return null;
    const cell = pickCell(raster, hit.x, hit.z);
    return cell ? { ...cell, worldX: hit.x, worldZ: hit.z } : null;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    void this.renderer.setAnimationLoop(null);
    this.abort.abort();
    this.controls.dispose();
    this.terrain.dispose();
    this.rivers.dispose();
    this.settlements.dispose();
    this.battles.dispose();
    this.scene.traverse((o) => {
      const m = (o as { material?: { dispose(): void } }).material;
      m?.dispose();
    });
    for (const t of [
      this.textures.height,
      this.textures.surface,
      this.textures.ids,
      this.textures.colors,
    ]) {
      t.dispose();
    }
    void this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  /** El canvas sigue al contenedor (se revisa cada cuadro: una pestaña oculta puede medir 0×0). */
  private fitCanvas(): void {
    const el = this.renderer.domElement;
    const parent = el.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    if (w === 0 || h === 0) return;
    if (el.clientWidth === w && el.clientHeight === h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private updateCamera(dtMs: number): void {
    const p = this.pose;
    if (!this.tour) this.controls.update(dtMs);
    normalizePose(p, this.limits);
    const [cx, cy, cz] = cameraPosition(p);
    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(p.x, 0, p.z);
    this.camera.updateMatrixWorld();

    const s = semanticState(
      p.distance,
      this.world.raster.width,
      this.metersPerCell,
      this.exaggeration,
    );
    const u = this.uniforms;
    u.heightScale.value = s.heightScale;
    u.shadeScale.value = s.shadeScale;
    u.fillOpacity.value = s.fillOpacity;
    u.provinceBorderAlpha.value = s.provinceBorderAlpha;
    u.riverMinT.value = s.riverMinT;
    u.cameraX.value = cx;
    const viewHeightPx = Math.max(1, this.renderer.domElement.clientHeight);
    u.pxScale.value = (2 * Math.tan(CAMERA_FOV_RAD / 2)) / viewHeightPx;

    this.fog.far = this.limits.far * FOG_FAR_OF_CAMERA_FAR;
    this.fog.near = Math.min(p.distance * FOG_NEAR_OF_DISTANCE, this.fog.far * FOG_NEAR_MAX_OF_FAR);
    this.terrain.update(this.camera.position, this.lodDistance, this.options.forcedLod);
    this.rivers.update(cx);
  }

  private paused = false;

  /** Sin dibujar mientras el mapa está tapado (resumen, fichas): ahorra GPU y batería (P1.9). */
  setPaused(paused: boolean): void {
    this.paused = paused;
    this.lastTime = null;
  }

  private readonly frame = (time: number): void => {
    if (this.paused) return;
    const c0 = performance.now();
    this.fitCanvas();
    const dt = this.lastTime === null ? 0 : time - this.lastTime;
    this.lastTime = time;
    this.frameCount++;

    if (this.frameCount <= MEASURE.warmupFrames) {
      if (dt > 0) this.warmupIntervals.push(dt);
      if (this.frameCount === MEASURE.warmupFrames) {
        this.report.refreshHz = 1000 / percentile(this.warmupIntervals, 50);
      }
    }

    const tour = this.tour;
    let tourDone = false;
    if (tour && this.frameCount > MEASURE.warmupFrames) {
      tour.start ??= time;
      const t = (time - tour.start) / 1000;
      Object.assign(this.pose, tourPose(t, tour.seconds, this.limits));
      tourDone = t >= tour.seconds;
    }
    this.updateCamera(dt);
    for (let i = 0; i < this.options.repeat; i++) this.renderer.render(this.scene, this.camera);
    this.gpuQueue?.mark();
    const cpuMs = performance.now() - c0;
    const inFlight = this.gpuQueue ? this.gpuQueue.inFlight : null;

    const settle = this.settle;
    if (settle && dt > 0) {
      settle.recorder.push(dt, cpuMs, inFlight);
      if (time >= settle.until) {
        this.report.settle = settle.recorder.summary();
        this.settle = null;
      }
    }
    if (tour?.start != null && time !== tour.start) {
      tour.recorder.push(dt, cpuMs, inFlight);
      if (tourDone) {
        this.tour = null;
        const summary = tour.recorder.summary();
        this.report.tour = summary;
        const el = this.renderer.domElement;
        this.report.canvas = {
          width: el.width,
          height: el.height,
          dpr: this.renderer.getPixelRatio(),
        };
        tour.resolve(summary);
      }
    }

    this.updateHover();
  };

  private updateHover(): void {
    const ptr = this.pointer;
    if (!ptr || !this.onHover) return;
    const pick = this.pick(ptr.x, ptr.y);
    const key = pick ? `${pick.cellX},${pick.cellY},${ptr.x},${ptr.y}` : `none,${ptr.x},${ptr.y}`;
    if (key === this.lastPickKey) return;
    this.lastPickKey = key;
    this.onHover(pick, ptr.x, ptr.y);
  }
}
