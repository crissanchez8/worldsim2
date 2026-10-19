// Registro de entidades (P1.6, D50): los registros permanentes que el inspector, el teletipo y el
// resumen necesitan (nombres, fundación y fin, nacimiento y muerte, guerras). Los arma el Worker
// desde el estado de la cabeza de la simulación y los manda por partes; como la cabeza va por
// delante de la reproducción (D49), la UI siempre filtra por la fecha mostrada.

export interface PolityRecord {
  readonly name: string;
  readonly founded: number;
  /** 0 = activa (a la cabeza). */
  readonly ended: number;
  /** Índice de POLITY_END_REASONS. */
  readonly endReason: number;
  /** Título principal (su titular a la fecha sale de los eventos `ruler.succeeded`). */
  readonly title: number;
}

export interface SettlementRecord {
  readonly name: string;
  readonly province: number;
  readonly founded: number;
}

export interface CultureRecord {
  readonly name: string;
  readonly founded: number;
  readonly origin: number;
  readonly language: number;
}

export interface LanguageRecord {
  readonly name: string;
}

export interface PersonRecord {
  readonly name: string;
  /** 0 mujer, 1 varón. */
  readonly sex: number;
  readonly father: number;
  readonly mother: number;
  readonly born: number;
  /** 0 = vivo (a la cabeza). */
  readonly died: number;
  readonly culture: number;
}

export interface WarRecord {
  readonly attacker: number;
  readonly defender: number;
  readonly started: number;
  /** 0 = en curso (a la cabeza). */
  readonly ended: number;
  /** Índice de WAR_OUTCOMES. */
  readonly outcome: number;
}

export interface TitleRecord {
  readonly polity: number;
  readonly created: number;
  readonly destroyed: number;
}

/** Registros nuevos o cambiados desde el envío anterior (pares [id, registro]). */
export interface RegistryDelta {
  readonly polities: readonly (readonly [number, PolityRecord])[];
  readonly settlements: readonly (readonly [number, SettlementRecord])[];
  readonly cultures: readonly (readonly [number, CultureRecord])[];
  readonly languages: readonly (readonly [number, LanguageRecord])[];
  readonly persons: readonly (readonly [number, PersonRecord])[];
  readonly wars: readonly (readonly [number, WarRecord])[];
  readonly titles: readonly (readonly [number, TitleRecord])[];
}

export const REGISTRY_KINDS = [
  'polities',
  'settlements',
  'cultures',
  'languages',
  'persons',
  'wars',
  'titles',
] as const;

/** Espejo del registro en el hilo principal. */
export class Registry {
  readonly polities = new Map<number, PolityRecord>();
  readonly settlements = new Map<number, SettlementRecord>();
  readonly cultures = new Map<number, CultureRecord>();
  readonly languages = new Map<number, LanguageRecord>();
  readonly persons = new Map<number, PersonRecord>();
  readonly wars = new Map<number, WarRecord>();
  readonly titles = new Map<number, TitleRecord>();
  /** Sube con cada cambio (para que React vuelva a leer). */
  version = 0;

  apply(delta: RegistryDelta): void {
    for (const [id, r] of delta.polities) this.polities.set(id, r);
    for (const [id, r] of delta.settlements) this.settlements.set(id, r);
    for (const [id, r] of delta.cultures) this.cultures.set(id, r);
    for (const [id, r] of delta.languages) this.languages.set(id, r);
    for (const [id, r] of delta.persons) this.persons.set(id, r);
    for (const [id, r] of delta.wars) this.wars.set(id, r);
    for (const [id, r] of delta.titles) this.titles.set(id, r);
    this.version++;
  }
}

/** ¿Existía (y no había terminado) en el año `year`? `end` 0 = no terminó todavía. */
export function aliveAt(start: number, end: number, year: number): boolean {
  return start <= year && (end === 0 || end > year);
}
