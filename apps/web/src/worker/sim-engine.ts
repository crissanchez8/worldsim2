// Motor del Worker de simulación, separado del `onmessage` para probarlo en Node: simula por tandas
// de `sliceMs` hasta el objetivo, graba la historia y manda lo nuevo como lote transferible.
// Entre tandas cede el control para atender objetivos nuevos, pedidos de estado y de guardado.
import { ENGINE_VERSION, time } from '@ws/core';
import { batchTransferables, canContinue, decodeWsim, encodeWsim, History } from '@ws/history';
import { Sim } from '@ws/sim';
import type { WorldStatic } from '@ws/worldgen';
import { LIVE } from '../live/config';
import type { SimPost, SimRequest } from './sim-protocol';

export interface EngineDeps {
  readonly post: SimPost;
  /** Corre `run` en una tarea nueva (en el Worker, un MessageChannel propio: sin el mínimo de 4 ms). */
  readonly schedule: (run: () => void) => void;
  readonly now?: () => number;
  readonly sliceMs?: number;
}

interface Running {
  readonly world: WorldStatic;
  readonly history: History;
  /** null = historia de otra versión del motor: solo se ve. */
  readonly sim: Sim | null;
  readonly endK: number;
}

export class SimEngine {
  private readonly deps: EngineDeps;
  private readonly now: () => number;
  private readonly sliceMs: number;
  private run: Running | null = null;
  private target = 0;
  private scheduled = false;
  /** Tiempo y años simulados en esta sesión (para el costo medio por año). */
  private simMs = 0;
  private simYears = 0;

  constructor(deps: EngineDeps) {
    this.deps = deps;
    this.now = deps.now ?? (() => performance.now());
    this.sliceMs = deps.sliceMs ?? LIVE.sliceMs;
  }

  /** Años simulados (0 antes de `init`). */
  get head(): number {
    return this.run?.history.years ?? 0;
  }

  handle(request: SimRequest): void {
    try {
      switch (request.type) {
        case 'init':
          this.init(request.world, request.file);
          return;
        case 'target':
          this.setTarget(request.k);
          return;
        case 'fullState':
          this.fullState(request.id, request.k);
          return;
        case 'save':
          this.save(request.id);
          return;
      }
    } catch (error) {
      this.deps.post({
        type: 'error',
        ...('id' in request ? { id: request.id } : {}),
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private init(world: WorldStatic, file: Uint8Array | undefined): void {
    if (this.run) throw new Error('simulación: ya inicializada');
    let history: History;
    let sim: Sim | null;
    let engineVersion = ENGINE_VERSION;
    let continues = true;
    if (file) {
      const decoded = decodeWsim(file);
      if (decoded.header.worldHash !== world.hash) {
        throw new Error(
          `el mundo regenerado (${world.hash}) no es el del archivo (${decoded.header.worldHash})`,
        );
      }
      engineVersion = decoded.header.engineVersion;
      continues = canContinue(decoded.header);
      history = History.fromData(world, decoded.data);
      sim = continues ? Sim.load(world, decoded.final) : null;
    } else {
      sim = Sim.create(world);
      history = History.start(sim);
    }
    const endK = sim ? time.tickIndex(sim.endYear, history.startYear) + 1 : history.years;
    this.run = { world, history, sim, endK };
    this.deps.post({
      type: 'ready',
      data: history.viewData(),
      endK,
      canContinue: continues,
      engineVersion,
    });
  }

  private setTarget(k: number): void {
    const run = this.run;
    if (!run) return;
    this.target = Math.max(0, Math.min(Math.floor(k), run.endK));
    this.wake();
  }

  private wake(): void {
    const run = this.run;
    if (!run?.sim || this.scheduled || run.history.years >= this.target) return;
    this.scheduled = true;
    this.deps.schedule(() => {
      this.scheduled = false;
      this.slice();
    });
  }

  private slice(): void {
    const run = this.run;
    const sim = run?.sim;
    if (!run || !sim) return;
    const t0 = this.now();
    const k0 = run.history.years;
    while (run.history.years < this.target && this.now() - t0 < this.sliceMs) {
      const result = sim.step();
      run.history.record(sim, result);
    }
    const years = run.history.years - k0;
    if (years > 0) {
      this.simMs += this.now() - t0;
      this.simYears += years;
      const batch = run.history.drain();
      this.deps.post(
        {
          type: 'batch',
          batch,
          head: run.history.years,
          msPerYear: this.simMs / this.simYears,
        },
        batchTransferables(batch),
      );
    }
    this.wake();
  }

  private fullState(id: number, k: number): void {
    const run = this.run;
    if (!run) throw new Error('simulación: sin inicializar');
    const t0 = this.now();
    const target = Math.max(0, Math.min(Math.floor(k), run.history.years));
    const hash =
      run.sim && target === run.history.years
        ? run.sim.hash()
        : run.history.fullStateAt(run.history.yearOf(target)).hash();
    this.deps.post({ type: 'fullState', id, k: target, hash, ms: this.now() - t0 });
  }

  private save(id: number): void {
    const run = this.run;
    if (!run?.sim) throw new Error('simulación: no hay una corrida que se pueda guardar');
    const bytes = encodeWsim(
      run.world.params,
      run.world.hash,
      run.history.data,
      run.sim.snapshot(),
    );
    this.deps.post(
      {
        type: 'saved',
        id,
        bytes,
        head: run.history.years,
        year: run.history.yearOf(run.history.years),
      },
      [bytes.buffer as ArrayBuffer],
    );
  }
}
