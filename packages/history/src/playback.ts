// Reloj de reproducción (D48, D49). La reproducción no avanza por años de calendario sino por
// "segundos de contenido a 1×": el año que lleva del estado k al k + 1 dura 1/ritmo segundos, con
// el ritmo de la era dominante del estado k (suavizado entre eras) y un piso que asegura que la
// corrida completa entre en `maxDurationSeconds`. Es una función de los agregados (era por año):
// rebobinar, adelantar y medir la duración en `ws health` dan lo mismo.
//
// Δ (D48 decía "config de apps/web"): vive acá, headless, para que `ws health` calibre con la
// misma función que usa la web.
import { Eras } from '@ws/content';
import { math } from '@ws/core';

export const PLAYBACK = {
  /** Años de simulación por segundo a 1× según la era dominante (years/s; D48). */
  yearsPerSecond: {
    prehistory: 60,
    neolithic: 30,
    bronzeAge: 18,
    ironAge: 15,
    earlyModern: 5,
  } as Readonly<Record<string, number>>,
  /** Duración máxima de la corrida completa a 1× (s; D10 y D48: 15 min). */
  maxDurationSeconds: 900,
  /** Presupuesto mínimo para el piso cuando el tiempo se agota (s): termina en ese lapso. */
  minRemainingSeconds: 1,
  /** Constante de tiempo de la transición entre ritmos de era (s de contenido). */
  transitionSeconds: 3,
  /** Colchón de simulación adelantada respecto de la reproducción (years; D49). */
  aheadYears: 500,
} as const;

/** Ritmo a 1× de cada era, en el orden de Eras (years/s). Falla si una era no tiene ritmo. */
export const ERA_YEARS_PER_SECOND: readonly number[] = Eras.rows.map((era) => {
  const rate = PLAYBACK.yearsPerSecond[era.key];
  if (rate === undefined || !(rate > 0))
    throw new Error(`reproducción: la era "${era.key}" no tiene ritmo`);
  return rate;
});

function eraRate(era: number): number {
  return ERA_YEARS_PER_SECOND[era] ?? ERA_YEARS_PER_SECOND[0] ?? 1;
}

/**
 * Segundos de contenido a 1× hasta cada estado k (0 = inicio). Se arma incrementalmente con la era
 * de cada estado a medida que llegan los agregados.
 */
export class PlaybackClock {
  /** Último k de la corrida (años totales): el piso se calcula contra él. */
  readonly endK: number;
  private seconds = new Float64Array(1024);
  private count = 0;
  private smoothed = 0;

  constructor(endK: number) {
    this.endK = endK;
  }

  /** Eras recibidas (= estados con tiempo conocido hasta el siguiente). */
  get size(): number {
    return this.count;
  }

  /** Agrega la era del estado k = size: fija cuánto dura el año k → k + 1. */
  push(era: number): void {
    const k = this.count;
    const target = eraRate(era);
    if (k === 0) this.smoothed = target;
    const at = this.seconds[k] ?? 0;
    const budget = Math.max(PLAYBACK.minRemainingSeconds, PLAYBACK.maxDurationSeconds - at);
    const floor = Math.max(0, this.endK - k) / budget;
    const rate = Math.max(this.smoothed, floor);
    const duration = 1 / rate;
    if (k + 1 >= this.seconds.length) {
      const grown = new Float64Array(this.seconds.length * 2);
      grown.set(this.seconds);
      this.seconds = grown;
    }
    this.seconds[k + 1] = at + duration;
    this.count = k + 1;
    // El ritmo se acerca al de la era nueva con constante `transitionSeconds` (suave, sin saltos).
    const alpha = 1 - math.exp(-duration / PLAYBACK.transitionSeconds);
    this.smoothed += (target - this.smoothed) * alpha;
  }

  /** Segundos de contenido hasta el estado k (k ≤ size). */
  secondsAt(k: number): number {
    const i = Math.max(0, Math.min(Math.floor(k), this.count));
    return this.seconds[i] ?? 0;
  }

  /** Estado (k con fracción) al que se llega a los `t` segundos de contenido. */
  indexAt(t: number): number {
    if (t <= 0 || this.count === 0) return 0;
    const total = this.seconds[this.count] ?? 0;
    if (t >= total) return this.count;
    let lo = 0;
    let hi = this.count;
    while (hi - lo > 1) {
      const mid = (lo + hi) >>> 1;
      if ((this.seconds[mid] ?? 0) <= t) lo = mid;
      else hi = mid;
    }
    const a = this.seconds[lo] ?? 0;
    const b = this.seconds[lo + 1] ?? a;
    return lo + (b > a ? (t - a) / (b - a) : 0);
  }

  /** Ritmo efectivo del año que empieza en el estado k (years/s). */
  rateAt(k: number): number {
    const i = Math.max(0, Math.min(Math.floor(k), this.count - 1));
    const d = (this.seconds[i + 1] ?? 0) - (this.seconds[i] ?? 0);
    return d > 0 ? 1 / d : 0;
  }
}

/** Duración a 1× de una corrida con estas eras por estado (s): lo que mide `ws health`. */
export function playbackSeconds(eras: ArrayLike<number>, endK = eras.length): number {
  const clock = new PlaybackClock(endK);
  for (let k = 0; k < Math.min(eras.length, endK); k++) clock.push(eras[k] ?? 0);
  return clock.secondsAt(clock.size);
}
