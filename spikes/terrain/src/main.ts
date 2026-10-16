// Spike A (P0.13): ¿llega el terreno 2048×1024 con wrap E-O a 60 fps con WebGPURenderer, y
// funciona el fallback WebGL2? Ver README.md y docs/phases/P00/spikes.md.
import { Color, Fog, PerspectiveCamera, Scene, WebGPURenderer } from 'three/webgpu';
import { applyPose, MapControls, normalizePose } from './camera';
import {
  CAMERA_FAR,
  CAMERA_FOV_DEG,
  CHUNK_SIZE,
  LOD_STEPS,
  MAP_HEIGHT,
  MAP_WIDTH,
  SPLAT_TEXTURE_SIZE,
} from './config';
import { createGpuQueueProbe } from './gpu-queue';
import { generateHeightmap, heightmapHash } from './heightmap';
import { Hud, mb } from './hud';
import { FrameRecorder, percentile } from './metrics';
import type { FrameSummary } from './metrics';
import { readParams } from './params';
import { Terrain } from './terrain';
import { generateSplatTextures } from './textures';
import { pitchForDistance, tourPose } from './tour';
import type { CameraPose } from './tour';

/** Color del cielo y de la niebla (sRGB). */
const SKY = 0xb9cbd9;
/** Cuadros de calentamiento antes de poder medir (pipelines, caché de bind groups). */
const WARMUP_FRAMES = 90;
/** Cada cuánto se refresca el HUD en vivo, en ms. */
const HUD_INTERVAL_MS = 250;
/** Niebla: lejos = fracción del plano lejano; cerca = múltiplo de la distancia, con tope (adim.). */
const FOG_FAR_OF_CAMERA_FAR = 0.95;
const FOG_NEAR_OF_DISTANCE = 1.5;
const FOG_NEAR_MAX_OF_FAR = 0.7;
/** Bytes por píxel del framebuffer: color RGBA8 + profundidad 32 bits. */
const FRAMEBUFFER_BYTES_PER_PX = 8;

export interface SpikeReport {
  readonly userAgent: string;
  readonly backend: string;
  readonly forcedWebGL2: boolean;
  readonly seed: number;
  readonly heightmapHash: string;
  /** Tamaño del canvas en píxeles físicos (se actualiza al terminar el recorrido). */
  canvas: { readonly width: number; readonly height: number; readonly dpr: number };
  readonly antialias: boolean;
  /** Refresco de la pantalla medido en el calentamiento, en Hz. */
  refreshHz: number;
  readonly load: {
    readonly rendererInitMs: number;
    readonly heightmapMs: number;
    readonly splatTexturesMs: number;
    readonly uploadMs: number;
    /** Desglose de uploadMs: armar el terreno (CPU), precalentar pipelines, primer cuadro. */
    readonly terrainBuildMs: number;
    readonly warmupMs: number;
    readonly firstFrameMs: number;
    readonly totalMs: number;
  };
  readonly memory: {
    readonly threeTotalBytes: number;
    readonly threeTexturesBytes: number;
    readonly threeBuffersBytes: number;
    readonly framebufferBytes: number;
  };
  readonly lodDistance: number;
  readonly forcedLod: number | null;
  /** Veces que se dibuja la escena por cuadro (estrés). */
  readonly repeat: number;
  summary: FrameSummary | null;
}

declare global {
  interface Window {
    /** Estado legible desde la consola o desde automatización (Playwright, etc.). */
    __terrainSpike?: SpikeReport;
  }
}

function nextFrame(): Promise<number> {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

async function main(): Promise<void> {
  const params = readParams(location.search);
  let tourRequested = false;
  const hud = new Hud(document.body, () => (tourRequested = true));
  hud.status('Inicializando el renderer…');

  const t0 = performance.now();
  const renderer = new WebGPURenderer({
    antialias: params.antialias,
    forceWebGL: params.backend === 'webgl2',
    trackTimestamp: params.gpuTiming,
    powerPreference: 'high-performance',
  });
  await renderer.init();
  const isWebGPU = 'isWebGPUBackend' in renderer.backend;
  const backend = isWebGPU
    ? 'WebGPU'
    : params.backend === 'webgl2'
      ? 'WebGL2 (forzado)'
      : 'WebGL2 (fallback: WebGPU no disponible)';
  const dpr = params.dpr ?? Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.prepend(renderer.domElement);
  const rendererInitMs = performance.now() - t0;

  hud.status(`${backend} · generando heightmap ${MAP_WIDTH}×${MAP_HEIGHT}…`);
  await nextFrame();
  await nextFrame();
  const t1 = performance.now();
  const map = generateHeightmap(params.seed, MAP_WIDTH, MAP_HEIGHT);
  const t2 = performance.now();
  const splat = generateSplatTextures(params.seed, SPLAT_TEXTURE_SIZE);
  const t3 = performance.now();
  const hash = heightmapHash(map);

  const t4 = performance.now();
  const scene = new Scene();
  scene.background = new Color(SKY);
  const fog = new Fog(SKY, 100, CAMERA_FAR);
  scene.fog = fog;
  const terrain = new Terrain(map, splat);
  scene.add(terrain.group);
  const camera = new PerspectiveCamera(
    CAMERA_FOV_DEG,
    window.innerWidth / window.innerHeight,
    0.5,
    CAMERA_FAR,
  );
  const startDistance = params.distance ?? 220;
  const pose: CameraPose = {
    x: params.x ?? MAP_WIDTH - 200,
    z: params.z ?? MAP_HEIGHT / 2,
    distance: startDistance,
    pitch: pitchForDistance(startDistance),
    yaw: params.yaw ?? 0,
  };
  normalizePose(pose, MAP_WIDTH, MAP_HEIGHT);
  pose.pitch = pitchForDistance(pose.distance);
  applyPose(camera, pose);
  const t5 = performance.now();
  // Calentamiento: un cuadro sincrónico con todos los chunks y LODs visibles crea de una vez los
  // objetos de render de las 640 mallas, para no pagarlo la primera vez que aparece cada una.
  // No se usa `compileAsync`: en WebGL2 de Firefox espera ≈ 1 cuadro por objeto (≈ 11 s).
  // `?warmup=0` lo saltea (para aislar su costo).
  if (params.warmup) {
    terrain.group.traverse((o) => {
      o.visible = true;
      o.frustumCulled = false;
    });
    renderer.render(scene, camera);
    terrain.group.traverse((o) => {
      o.visible = o === terrain.group;
      o.frustumCulled = true;
    });
  }
  const t6 = performance.now();
  terrain.update(camera.position, params.lodDistance, params.forcedLod);
  renderer.render(scene, camera);
  await nextFrame();
  const t7 = performance.now();
  const uploadMs = t7 - t4;

  const canvasW = Math.round(window.innerWidth * dpr);
  const canvasH = Math.round(window.innerHeight * dpr);
  const samples = params.antialias ? 4 : 1;
  const framebufferBytes = canvasW * canvasH * FRAMEBUFFER_BYTES_PER_PX * samples;
  const mem = renderer.info.memory;
  const report: SpikeReport = {
    userAgent: navigator.userAgent,
    backend,
    forcedWebGL2: params.backend === 'webgl2',
    seed: params.seed,
    heightmapHash: hash,
    canvas: { width: canvasW, height: canvasH, dpr },
    antialias: params.antialias,
    refreshHz: NaN,
    load: {
      rendererInitMs,
      heightmapMs: t2 - t1,
      splatTexturesMs: t3 - t2,
      uploadMs,
      terrainBuildMs: t5 - t4,
      warmupMs: t6 - t5,
      firstFrameMs: t7 - t6,
      totalMs: rendererInitMs + (t3 - t1) + uploadMs,
    },
    memory: {
      threeTotalBytes: mem.total,
      threeTexturesBytes: mem.texturesSize,
      threeBuffersBytes: mem.attributesSize + mem.indexAttributesSize + mem.uniformBuffersSize,
      framebufferBytes,
    },
    lodDistance: params.lodDistance,
    forcedLod: params.forcedLod,
    repeat: params.repeat,
    summary: null,
  };
  window.__terrainSpike = report;

  const staticLines = (): string[] => [
    `backend ${backend} · seed ${params.seed} · hash ${hash}`,
    `mapa ${MAP_WIDTH}×${MAP_HEIGHT} · ${terrain.chunkCount} chunks de ${CHUNK_SIZE} · LOD pasos [${LOD_STEPS.join(' ')}] desde ${params.lodDistance}${params.forcedLod === null ? '' : ` · LOD forzado ${params.forcedLod}`}${params.repeat > 1 ? ` · ESTRÉS ×${params.repeat}` : ''}`,
    `tierra ${(map.landFraction * 100).toFixed(0)} % · elevación ${map.minM.toFixed(0)}…${map.maxM.toFixed(0)} m`,
    `canvas ${canvasW}×${canvasH} (dpr ${dpr}) · MSAA ${samples}× · refresco ≈ ${Number.isFinite(report.refreshHz) ? report.refreshHz.toFixed(0) : '…'} Hz`,
    `carga: init ${rendererInitMs.toFixed(0)} ms · heightmap ${(t2 - t1).toFixed(0)} ms · texturas ${(t3 - t2).toFixed(0)} ms · subida+compilación ${uploadMs.toFixed(0)} ms (terreno ${(t5 - t4).toFixed(0)} · precalentado ${(t6 - t5).toFixed(0)} · 1er cuadro ${(t7 - t6).toFixed(0)}) · total ${report.load.totalMs.toFixed(0)} ms`,
    `memoria GPU (three): texturas ${mb(report.memory.threeTexturesBytes)} · buffers ${mb(report.memory.threeBuffersBytes)} · total ${mb(report.memory.threeTotalBytes)}`,
    `memoria GPU (estimada): terreno ${mb(terrain.textureBytes + terrain.geometry.bytes)} (texturas ${mb(terrain.textureBytes)} + geometría ${mb(terrain.geometry.bytes)}) · framebuffer ${mb(framebufferBytes)}`,
  ];
  hud.setStatic(staticLines());

  const controls = new MapControls(renderer.domElement, pose);
  const gpuQueue = createGpuQueueProbe(renderer.backend);
  // Se revisa en cada cuadro (no solo en `resize`): una pestaña oculta puede medir 0×0 un rato.
  const fitCanvas = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w === 0 || h === 0) return;
    const el = renderer.domElement;
    if (el.clientWidth === w && el.clientHeight === h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };

  let lastTime: number | null = null;
  let frameCount = 0;
  const warmupIntervals: number[] = [];
  let recorder: FrameRecorder | null = null;
  let tourStart: number | null = null;
  let gpuPending = false;
  let gpuSupported = params.gpuTiming;
  let lastGpuMs: number | null = null;
  let hudTime = 0;
  let hudFrames = 0;
  let lodCounts: readonly number[] = [];
  if (params.autostart) tourRequested = true;

  const onFrame = (time: number): void => {
    const c0 = performance.now();
    fitCanvas();
    const dt = lastTime === null ? 0 : time - lastTime;
    lastTime = time;
    frameCount++;

    if (frameCount <= WARMUP_FRAMES) {
      if (dt > 0) warmupIntervals.push(dt);
      if (frameCount === WARMUP_FRAMES) {
        report.refreshHz = 1000 / percentile(warmupIntervals, 50);
        hud.setStatic(staticLines());
        hud.ready(params.duration);
      }
    } else if (tourRequested && recorder === null) {
      tourRequested = false;
      recorder = new FrameRecorder();
      tourStart = time;
      controls.enabled = false;
      hud.tourRunning(true);
    }

    let tour: number | null = null;
    if (recorder !== null && tourStart !== null) {
      const t = (time - tourStart) / 1000;
      tour = Math.min(1, t / params.duration);
      Object.assign(pose, tourPose(t, params.duration, MAP_WIDTH, MAP_HEIGHT));
    } else {
      controls.update(dt);
    }
    normalizePose(pose, MAP_WIDTH, MAP_HEIGHT);
    applyPose(camera, pose);
    lodCounts = terrain.update(camera.position, params.lodDistance, params.forcedLod).lodCounts;
    fog.far = CAMERA_FAR * FOG_FAR_OF_CAMERA_FAR;
    fog.near = Math.min(pose.distance * FOG_NEAR_OF_DISTANCE, fog.far * FOG_NEAR_MAX_OF_FAR);
    for (let i = 0; i < params.repeat; i++) renderer.render(scene, camera);
    gpuQueue?.mark();
    const cpuMs = performance.now() - c0;
    const inFlight = gpuQueue ? gpuQueue.inFlight : null;

    if (gpuSupported && !gpuPending) {
      gpuPending = true;
      const measuring = recorder;
      void renderer.resolveTimestampsAsync('render').then((ms) => {
        gpuPending = false;
        if (typeof ms !== 'number' || ms <= 0) {
          if (ms === undefined) gpuSupported = false;
          return;
        }
        lastGpuMs = ms;
        if (measuring !== null && measuring === recorder) measuring.pushGpu(ms);
      });
    }

    if (recorder !== null && tour !== null) {
      // El primer cuadro del recorrido no tiene intervalo propio: no se cuenta.
      if (time !== tourStart) recorder.push(dt, cpuMs, inFlight);
      if (tour >= 1) {
        const summary = recorder.summary();
        report.summary = summary;
        report.canvas = {
          width: renderer.domElement.width,
          height: renderer.domElement.height,
          dpr,
        };
        hud.result(summary, JSON.stringify(report, null, 2));
        recorder = null;
        tourStart = null;
        controls.enabled = true;
        hud.tourRunning(false);
        console.info('[spike-terrain] resultado', report);
      }
    }

    hudFrames++;
    if (time - hudTime >= HUD_INTERVAL_MS) {
      const elapsed = time - hudTime;
      hud.live({
        fps: (hudFrames * 1000) / elapsed,
        frameMs: elapsed / hudFrames,
        cpuMs,
        gpuMs: lastGpuMs,
        gpuQueue: inFlight,
        drawCalls: renderer.info.render.drawCalls,
        triangles: renderer.info.render.triangles,
        lodCounts,
        cameraX: pose.x,
        cameraZ: pose.z,
        distance: pose.distance,
        tour,
      });
      hudTime = time;
      hudFrames = 0;
    }
  };
  await renderer.setAnimationLoop(onFrame);
}

main().catch((error: unknown) => {
  const pre = document.createElement('pre');
  pre.className = 'fatal';
  pre.textContent = `Error del spike: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`;
  document.body.append(pre);
  console.error(error);
});
