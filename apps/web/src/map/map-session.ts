// Arranque del mapa fuera de React: pide el mundo al Worker de worldgen y, EN PARALELO, inicializa
// el renderer (con la caché de shaders fría, el init de WebGPU puede tardar segundos); después arma
// la `MapView`. React solo muestra el estado (textos por i18n).
import { NO_LEVEL, type VisualFrame } from '@ws/history';
import type { WorldgenStage, WorldStatic } from '@ws/worldgen';
import {
  createWorldgenClient,
  type WorldgenClient,
  type WorldgenResult,
} from '../worker/worldgen-client';
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
  /** El mundo existe (generado o dado), antes de que el mapa esté listo: la simulación puede arrancar. */
  onWorld(world: WorldStatic): void;
  onReady(ready: MapReady): void;
  /** Falló el mundo o el mapa (si `onWorld` ya llegó, lo que falló es el mapa). */
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
  /** Último marco pedido (se dibuja cuando el mapa termina de prepararse). */
  private lastFrame: VisualFrame | null = null;
  private disposed = false;
  private readonly cleanups: (() => void)[] = [];

  /** `world`: un mundo ya generado (p. ej. en "Crear"); si no viene, se genera en su Worker. */
  constructor(
    container: HTMLElement,
    params: MapParams,
    callbacks: MapSessionCallbacks,
    world?: WorldStatic,
  ) {
    window.__map = this.report;
    this.colorMode = params.colors;
    this.markers = params.markers;
    this.report.antialias = params.antialias;
    void this.run(container, params, callbacks, world).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      this.report.error = message;
      if (!this.disposed) callbacks.onError(message);
      // Fallo manejado: la UI lo muestra y la simulación sigue (P1.6). Aviso, no error de consola.
      console.warn('[map]', error);
    });
  }

  private async run(
    container: HTMLElement,
    params: MapParams,
    cb: MapSessionCallbacks,
    given: WorldStatic | undefined,
  ): Promise<void> {
    let client: WorldgenClient | null = null;
    let worldPromise: Promise<WorldgenResult>;
    if (given) {
      worldPromise = Promise.resolve({ world: given, generateMs: 0, transferMs: 0, wallMs: 0 });
    } else {
      const c = createWorldgenClient();
      client = c;
      worldPromise = c.generate(params.world, (stage, index, total) => {
        if (!this.disposed) cb.onProgress(stage, index, total);
      });
    }
    this.cleanups.push(() => {
      client?.dispose();
    });
    // La simulación no espera al mapa: sin WebGL (o con WebGL por software) igual hay historia.
    worldPromise.then(
      (r) => {
        if (!this.disposed) cb.onWorld(r.world);
      },
      () => undefined,
    );
    const rendererPromise = createRenderer(params.backend, params.antialias);
    // Si el mundo falla, el renderer igual se libera.
    const [handleResult, worldResult] = await Promise.allSettled([rendererPromise, worldPromise]);
    client?.dispose();
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
    if (this.lastFrame) this.showFrame(this.lastFrame);
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

  /** Centra la cámara en una provincia (teletipo, inspector). */
  focus(province: number): void {
    const world = this.world;
    if (!world || province === 0) return;
    this.view?.focus(
      world.provinces.centroidX[province] ?? 0,
      world.provinces.centroidY[province] ?? 0,
    );
  }

  /** Muestra un año de la historia: relleno político y asentamientos (P1.5). */
  showFrame(frame: VisualFrame): void {
    this.lastFrame = frame;
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
