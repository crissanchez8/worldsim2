// Motor del Worker de simulación, separado del `onmessage` para probarlo en Node: simula por tandas
// de `sliceMs` hasta el objetivo, graba la historia y manda lo nuevo como lote transferible.
// Entre tandas cede el control para atender objetivos nuevos, pedidos de estado y de guardado.
import { ENGINE_VERSION, time } from '@ws/core';
import { batchTransferables, canContinue, decodeWsim, encodeWsim, History } from '@ws/history';
import { explainPolity, explainProvince, Sim } from '@ws/sim';
import type { WorldStatic } from '@ws/worldgen';
import { LIVE } from '../live/config';
import type { RegistryDelta } from '../live/registry';
import { isEmptyDelta, RegistryTracker } from './registry-tracker';
import type { EntityDetail, EntityRef, SimPost, SimRequest } from './sim-protocol';

const EMPTY_REGISTRY: RegistryDelta = {
  polities: [],
  settlements: [],
  cultures: [],
  languages: [],
  persons: [],
  wars: [],
  titles: [],
};

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
  private readonly tracker = new RegistryTracker();
  private lastRegistryAt = -Infinity;
  /** Último estado completo reconstruido (varias entidades del mismo año no re-simulan). */
  private cached: { readonly k: number; readonly sim: Sim } | null = null;

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
        case 'inspect':
          this.inspect(request.id, request.k, request.entity);
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
      registry: sim ? this.tracker.delta(sim.ctx.state) : EMPTY_REGISTRY,
    });
    this.lastRegistryAt = this.now();
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
      // El registro viaja con el lote, como mucho cada LIVE.registryMs (y siempre al llegar al objetivo).
      let registry: RegistryDelta | undefined;
      const now = this.now();
      if (now - this.lastRegistryAt >= LIVE.registryMs || run.history.years >= this.target) {
        this.lastRegistryAt = now;
        const delta = this.tracker.delta(sim.ctx.state);
        if (!isEmptyDelta(delta)) registry = delta;
      }
      this.deps.post(
        {
          type: 'batch',
          batch,
          head: run.history.years,
          msPerYear: this.simMs / this.simYears,
          ...(registry ? { registry } : {}),
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

  /** Estado completo exacto en k: la simulación viva si es la cabeza; si no, keyframe + re-simulación. */
  private stateAt(run: Running, k: number): Sim {
    if (run.sim && k === run.history.years) return run.sim;
    if (this.cached?.k === k) return this.cached.sim;
    const sim = run.history.fullStateAt(run.history.yearOf(k));
    this.cached = { k, sim };
    return sim;
  }

  private inspect(id: number, k: number, entity: EntityRef): void {
    const run = this.run;
    if (!run) throw new Error('simulación: sin inicializar');
    const t0 = this.now();
    const target = Math.max(0, Math.min(Math.floor(k), run.history.years));
    const sim = this.stateAt(run, target);
    const detail = detailOf(sim, entity, run.history.yearOf(Math.max(1, target)));
    this.deps.post({ type: 'inspected', id, k: target, detail, ms: this.now() - t0 });
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

/** Detalle de una entidad en un estado (lo que el espejo de la historia no tiene). */
function detailOf(sim: Sim, entity: EntityRef, year: number): EntityDetail {
  const w = sim.ctx;
  const { state, derived } = w;
  switch (entity.kind) {
    case 'province': {
      const p = entity.id;
      const byCulture = new Map<number, number>();
      const { pop } = state;
      const province = pop.column('province');
      const culture = pop.column('culture');
      const size = pop.column('size');
      for (const row of pop.rows()) {
        if (province[row] !== p) continue;
        const c = culture[row] ?? 0;
        byCulture.set(c, (byCulture.get(c) ?? 0) + (size[row] ?? 0));
      }
      return {
        kind: 'province',
        id: p,
        cropShare: state.province.column('cropShare')[p - 1] ?? 0,
        foodSecurity: state.province.column('foodSecurity')[p - 1] ?? 0,
        population: derived.provincePopulation[p] ?? 0,
        cultures: [...byCulture.entries()]
          .map(([c, persons]) => ({ culture: c, persons }))
          .sort((a, b) => b.persons - a.persons || a.culture - b.culture),
        stats: explainProvince(w, p, year),
      };
    }
    case 'polity': {
      const rec = state.polity.get(entity.id);
      const owner = state.province.column('owner');
      let provinces = 0;
      for (const o of owner) if (o === entity.id) provinces++;
      const title = rec ? state.title.get(rec.primaryTitle) : undefined;
      return {
        kind: 'polity',
        id: entity.id,
        provinces,
        population: derived.polityPopulation[entity.id] ?? 0,
        ruler: title?.holder ?? 0,
        heir: title?.heir ?? 0,
        stats: rec ? explainPolity(w, entity.id, year) : [],
      };
    }
    case 'settlement': {
      const exists = state.settlement.has(entity.id);
      return {
        kind: 'settlement',
        id: entity.id,
        urbanShare: exists ? state.settlement.get(entity.id, 'urbanShare') : 0,
        exists,
      };
    }
    case 'person': {
      const rules: number[] = [];
      const heirOf: number[] = [];
      for (const [, t] of state.title.entries()) {
        if (t.destroyed !== 0) continue;
        if (t.holder === entity.id) rules.push(t.polity);
        if (t.heir === entity.id) heirOf.push(t.polity);
      }
      return { kind: 'person', id: entity.id, rules, heirOf };
    }
    case 'culture':
    case 'war':
      return { kind: entity.kind, id: entity.id };
  }
}
