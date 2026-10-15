// Bus de eventos del tick (docs/model.md §5.13, M2). Asigna ids monótonos desde el asignador del
// estado (`World.nextEventId`), calcula la significancia, descarta lo que no supera el umbral y
// valida causas. Al final del tick `drain()` entrega los eventos a la crónica y queda vacío (I9).
import type { IdAllocator } from '../store/id';
import type { EventType } from './registry';
import type { Cause, EventData, EventDraft, GameEvent } from './types';

export class EventError extends Error {
  override name = 'EventError';
}

const KIND = /^[a-z][a-zA-Z]*$/;

function checkData(value: unknown, path: string): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new EventError(`datos de evento: ${path} no es finito`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v: unknown, i) => {
      checkData(v, `${path}[${i}]`);
    });
    return;
  }
  if (typeof value === 'object') {
    // eslint-disable-next-line no-restricted-properties -- solo valida: el orden no cambia el resultado
    for (const [key, v] of Object.entries(value)) checkData(v, `${path}.${key}`);
    return;
  }
  throw new EventError(`datos de evento: ${path} tiene un tipo no serializable`);
}

export interface EventBusOptions {
  /** Año del tick. */
  readonly year: number;
  /** Asignador de ids de eventos (estado: `World.nextEventId`). */
  readonly ids: IdAllocator<'event'>;
  /** Validaciones caras (causas, datos): activadas en dev y tests. */
  readonly checks?: boolean;
}

export class EventBus {
  readonly year: number;
  private readonly ids: IdAllocator<'event'>;
  private readonly checks: boolean;
  private readonly firstIdOfTick: number;
  private events: GameEvent[] = [];
  private readonly emittedThisTick = new Set<number>();
  private emitter: string | null = null;
  private allowed: ReadonlySet<string> | null = null;

  constructor(options: EventBusOptions) {
    this.year = options.year;
    this.ids = options.ids;
    this.checks = options.checks ?? true;
    this.firstIdOfTick = this.ids.peek();
  }

  /** Lo usa el scheduler: quién emite y qué tipos declaró en su contrato. */
  setEmitter(name: string | null, allowed: ReadonlySet<string> | null): void {
    this.emitter = name;
    this.allowed = allowed;
  }

  get size(): number {
    return this.events.length;
  }

  /**
   * Emite un evento. Devuelve su id, o `null` si no superó el umbral de significancia (no se
   * registra ni consume id: no se puede usar como causa).
   */
  emit<D extends EventData>(type: EventType<D>, draft: EventDraft<D>): number | null {
    if (this.allowed && !this.allowed.has(type.key)) {
      throw new EventError(
        `${this.emitter ?? '?'} emite "${type.key}" sin declararlo en su contrato`,
      );
    }
    const significance = type.significance(draft);
    if (!(significance >= 0 && significance <= 1)) {
      throw new EventError(`${type.key}: significancia fuera de [0, 1] (${significance})`);
    }
    if (significance < type.threshold) return null;

    const causes = draft.causes ?? [];
    if (this.checks) this.validate(type, draft, causes);

    const id = this.ids.next();
    const event: GameEvent<D> = {
      id,
      type: type.key,
      year: this.year,
      ...(draft.season === undefined ? {} : { season: draft.season }),
      actors: draft.actors,
      ...(draft.place === undefined ? {} : { place: draft.place }),
      causes,
      data: draft.data,
      significance,
    };
    this.events.push(event);
    this.emittedThisTick.add(id);
    return id;
  }

  private validate<D extends EventData>(
    type: EventType<D>,
    draft: EventDraft<D>,
    causes: readonly Cause[],
  ): void {
    const where = type.key;
    type.validate?.(draft.data);
    checkData(draft.data, `${where}.data`);
    for (const ref of draft.place ? [...draft.actors, draft.place] : draft.actors) {
      if (!KIND.test(ref.kind) || !Number.isInteger(ref.id) || ref.id < 0) {
        throw new EventError(`${where}: referencia inválida ${ref.kind}#${ref.id}`);
      }
    }
    if (draft.season !== undefined && ![0, 1, 2, 3].includes(draft.season)) {
      throw new EventError(`${where}: estación inválida ${draft.season}`);
    }
    const nextId = this.ids.peek();
    for (const cause of causes) {
      if (cause.kind === 'event') {
        const known =
          Number.isInteger(cause.id) &&
          cause.id >= 1 &&
          cause.id < nextId &&
          (cause.id < this.firstIdOfTick || this.emittedThisTick.has(cause.id));
        if (!known) throw new EventError(`${where}: causa inexistente (evento ${cause.id})`);
      } else {
        if (!KIND.test(cause.entity.kind) || cause.field.length === 0) {
          throw new EventError(`${where}: hecho causal inválido`);
        }
        if (cause.year > this.year) throw new EventError(`${where}: hecho causal en el futuro`);
      }
    }
  }

  /** Entrega los eventos del tick en orden de emisión y deja el bus vacío. */
  drain(): GameEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }
}
