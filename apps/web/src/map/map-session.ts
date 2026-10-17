// Arranque del mapa fuera de React: pide el mundo al Worker de worldgen y, EN PARALELO, inicializa
// el renderer (con la caché de shaders fría, el init de WebGPU puede tardar segundos); después arma
// la `MapView`. React solo muestra el estado (textos por i18n).
import { NO_LEVEL, type VisualFrame } from '@ws/history';
import type { WorldgenStage, WorldStatic } from '@ws/worldgen';
import { createWorldgenClient } from '../worker/worldgen-client';
import { type ColorMode, provinceColors } from './colors';
import { buildMapData } from './map-data';
import { createRenderer, type Backend, type MapPick, MapView } from './map-view';
import { type SettlementMarker, testMarkers } from './markers';
import type { MapParams } from './params';
import { createReport, type MapReport } from './report';

export interface MapReady {
  readonly backend: Backend;
  readonly forcedWebGL2: boolean;
  readonly world: WorldStatic;
  /** Del inicio de la navegación al primer cuadro del mapa (ms). */
  readonly firstFrameAt: number;
}

export interface MapSessionCallbacks {
  onProgress(stage: WorldgenStage, index: number, total: number): void;
  onReady(ready: MapReady): void;
  onError(message: string): void;
  onHover(pick: MapPick | null, clientX: number, clientY: number): void;
  onSelect(province: number): void;
}

export class MapSession {
  readonly report: MapReport = createReport();
  private view: MapView | null = null;
  private world: WorldStatic | null = null;
  private colorMode: ColorMode;
  private markers: boolean;
  /** Dueño por provincia del último marco mostrado (relleno político). */
  private owner: Uint32Array | undefined;
  private disposed = false;
  private readonly cleanups: (() => void)[] = [];

  constructor(container: HTMLElement, params: MapParams, callbacks: MapSessionCallbacks) {
    window.__map = this.report;
    this.colorMode = params.colors;
    this.markers = params.markers;
    this.report.antialias = params.antialias;
    void this.run(container, params, callbacks).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      this.report.error = message;
      if (!this.disposed) callbacks.onError(message);
      console.error(error);
    });
  }

  private async run(
    container: HTMLElement,
    params: MapParams,
    cb: MapSessionCallbacks,
  ): Promise<void> {
    const client = createWorldgenClient();
    this.cleanups.push(() => {
      client.dispose();
    });
    const rendererPromise = createRenderer(params.backend, params.antialias);
    const worldPromise = client.generate(params.world, (stage, index, total) => {
      if (!this.disposed) cb.onProgress(stage, index, total);
    });
    // Si el mundo falla, el renderer igual se libera.
    const [handleResult, worldResult] = await Promise.allSettled([rendererPromise, worldPromise]);
    client.dispose();
    if (
      handleResult.status === 'fulfilled' &&
      (this.disposed || worldResult.status === 'rejected')
    ) {
      void handleResult.value.renderer.dispose();
    }
    if (this.disposed) return;
    if (handleResult.status === 'rejected') throw handleResult.reason;
    if (worldResult.status === 'rejected') throw worldResult.reason;
    const handle = handleResult.value;
    const generated = worldResult.value;
    const world = generated.world;
    this.world = world;

    const report = this.report;
    report.backend = handle.backend;
    report.forcedWebGL2 = handle.forced;
    report.world = {
      ...world.params,
      hash: world.hash,
      width: world.raster.width,
      height: world.raster.height,
      provinces: world.provinces.count,
    };
    report.load.rendererInitMs = handle.initMs;
    report.load.worldgenMs = generated.generateMs;
    report.load.worldgenWallMs = generated.wallMs;
    report.load.transferMs = generated.transferMs;

    const t0 = performance.now();
    const data = buildMapData(world, params.colors);
    const t1 = performance.now();
    const view = new MapView(container, handle, world, data, params, report);
    this.view = view;
    if (params.markers) {
      const markers = testMarkers(world);
      view.setSettlements(markers.settlements);
      view.setBattles(markers.battles);
    }
    view.onHover = (pick, x, y) => {
      cb.onHover(pick, x, y);
    };
    view.onSelect = (province) => {
      cb.onSelect(province);
    };
    report.load.mapDataMs = t1 - t0;
    report.load.gpuBuildMs = performance.now() - t1;
    await view.start();
    if (this.isDisposed()) return;
    cb.onReady({
      backend: handle.backend,
      forcedWebGL2: handle.forced,
      world,
      firstFrameAt: report.load.firstFrameAt,
    });
    if (params.tour) {
      const summary = await view.runTour(params.tourSeconds);
      console.info('[map] recorrido', summary, report);
    }
  }

  setColorMode(mode: ColorMode): void {
    this.colorMode = mode;
    if (this.view && this.world) {
      this.view.setProvinceColors(provinceColors(mode, this.world.provinces, this.owner));
    }
  }

  /** Muestra un año de la historia: relleno político y asentamientos (P1.5). */
  showFrame(frame: VisualFrame): void {
    const view = this.view;
    const world = this.world;
    if (!view || !world) return;
    this.owner = frame.owner;
    if (this.colorMode === 'political') {
      view.setProvinceColors(provinceColors('political', world.provinces, frame.owner));
    }
    if (!this.markers) return;
    const { centroidX, centroidY } = world.provinces;
    const settlements: SettlementMarker[] = [];
    for (let p = 1; p < frame.level.length; p++) {
      const level = frame.level[p] ?? NO_LEVEL;
      if (level === NO_LEVEL) continue;
      settlements.push({ x: centroidX[p] ?? 0, y: centroidY[p] ?? 0, level });
    }
    view.setSettlements(settlements);
    // Las batallas reales llegan con el teletipo (P1.6): se sacan las de prueba.
    view.setBattles([]);
  }

  /** Se consulta después de cada `await` (el estado puede cambiar mientras tanto). */
  private isDisposed(): boolean {
    return this.disposed;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const cleanup of this.cleanups) cleanup();
    this.view?.dispose();
    this.view = null;
  }
}
