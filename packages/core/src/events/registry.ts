import type { EventData, EventDraft } from './types';

const KEY = /^[a-z][a-zA-Z]*(\.[a-z][a-zA-Z]*)+$/;

export interface EventTypeDef<D extends EventData> {
  /** Clave estable `dominio.verbo` (también la clave i18n `events.<key>`). */
  readonly key: string;
  /** Debajo de este umbral de significancia el evento no se registra (H-08). */
  readonly threshold: number;
  /** Significancia en [0, 1] a partir del borrador. */
  readonly significance: (draft: EventDraft<D>) => number;
  /** Validación opcional de los datos (lanza si son inválidos). */
  readonly validate?: (data: D) => void;
}

/** Tipo de evento registrado; el parámetro D tipa los datos al emitir. */
export interface EventType<D extends EventData = EventData> extends EventTypeDef<D> {
  /** Clave de la plantilla i18n. */
  readonly template: string;
}

/** Registro de tipos de evento. Las claves son únicas y no dependen del orden de registro. */
export class EventRegistry {
  private readonly types = new Map<string, EventType<never>>();

  define<D extends EventData>(def: EventTypeDef<D>): EventType<D> {
    if (!KEY.test(def.key)) throw new Error(`evento: clave inválida "${def.key}" (dominio.verbo)`);
    if (this.types.has(def.key)) throw new Error(`evento: clave repetida "${def.key}"`);
    if (!(def.threshold >= 0 && def.threshold <= 1)) {
      throw new Error(`evento ${def.key}: umbral fuera de [0, 1]`);
    }
    const type: EventType<D> = Object.freeze({ ...def, template: `events.${def.key}` });
    this.types.set(def.key, type);
    return type;
  }

  has(key: string): boolean {
    return this.types.has(key);
  }

  keys(): string[] {
    return [...this.types.keys()];
  }
}
