// Modelo de la línea de tiempo (P1.5): bandas de eras y marcadores de eventos significativos, sin
// mostrar lo simulado que todavía no se vio (D49). Puro: el componente solo dibuja.
import type { events } from '@ws/core';
import { TIMELINE } from './config';

/** Tramo [from, to) de estados k con la misma era dominante. */
export interface EraBand {
  readonly from: number;
  readonly to: number;
  readonly era: number;
}

/** Bandas de eras de los estados 0…upTo (era = índice de Eras por estado). */
export function eraBands(era: ArrayLike<number>, upTo: number): EraBand[] {
  const out: EraBand[] = [];
  const last = Math.min(Math.floor(upTo), era.length - 1);
  let from = 0;
  for (let k = 1; k <= last + 1; k++) {
    if (k > last || era[k] !== era[from]) {
      out.push({ from, to: k, era: era[from] ?? 0 });
      from = k;
    }
  }
  return out;
}

export interface Marker {
  /** Estado al final del año del evento. */
  readonly k: number;
  readonly significance: number;
  readonly type: string;
}

/** Índice incremental de marcadores: cada año se mira una sola vez. */
export class MarkerIndex {
  private scanned = 0;
  private readonly list: Marker[] = [];
  private readonly minSignificance: number;

  constructor(minSignificance: number = TIMELINE.markerSignificance) {
    this.minSignificance = minSignificance;
  }

  /** Mira los años nuevos del log (`log[k − 1]` = eventos del año k). */
  update(log: readonly (readonly events.GameEvent[])[]): void {
    for (let i = this.scanned; i < log.length; i++) {
      for (const e of log[i] ?? []) {
        if (e.significance >= this.minSignificance) {
          this.list.push({ k: i + 1, significance: e.significance, type: e.type });
        }
      }
    }
    this.scanned = log.length;
  }

  /** Marcadores hasta el estado `upTo` inclusive (en orden). */
  visible(upTo: number): readonly Marker[] {
    let lo = 0;
    let hi = this.list.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if ((this.list[mid]?.k ?? 0) <= upTo) lo = mid + 1;
      else hi = mid;
    }
    return this.list.slice(0, lo);
  }
}

/** Posición horizontal (px) del estado k en una línea de tiempo de `width` px. */
export function kToX(k: number, endK: number, width: number): number {
  return endK > 0 ? (k / endK) * width : 0;
}

/** Estado bajo el puntero, acotado a lo simulado (no se puede ir más allá de la cabeza). */
export function xToK(x: number, endK: number, width: number, head: number): number {
  if (width <= 0) return 0;
  return Math.max(0, Math.min(head, Math.round((x / width) * endK)));
}
