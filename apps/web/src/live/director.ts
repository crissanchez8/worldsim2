// Director de la reproducción (P1.5; D48 ritmo por era, D49 simulación adelantada). La cabeza de
// reproducción avanza en "segundos de contenido" del `PlaybackClock` (velocidad × tiempo real) y
// nunca pasa la cabeza de la simulación: si la alcanza, espera. Rebobinar es mover el reloj (§8.4).
import { PLAYBACK, type PlaybackClock } from '@ws/history';
import { LIVE, type Speed } from './config';

export class Director {
  private readonly clock: PlaybackClock;
  private speedValue: Speed = 1;
  /** Segundos de contenido a 1× hasta la cabeza de reproducción. */
  private content = 0;
  private playheadValue = 0;
  private seenValue = 0;
  private waitingValue = false;

  constructor(clock: PlaybackClock, playhead = 0) {
    this.clock = clock;
    this.scrub(playhead);
  }

  get speed(): Speed {
    return this.speedValue;
  }

  set speed(value: Speed) {
    this.speedValue = value;
  }

  /** Estado que se muestra (k con fracción). */
  get playhead(): number {
    return this.playheadValue;
  }

  /** El estado más avanzado que ya se mostró: lo de más adelante no se revela (D49). */
  get seen(): number {
    return this.seenValue;
  }

  /** La reproducción alcanzó a la simulación y la espera. */
  get waiting(): boolean {
    return this.waitingValue;
  }

  /** Avanza `dtSeconds` de tiempo real; `head` = años ya simulados (y grabados en el reloj). */
  tick(dtSeconds: number, head: number): void {
    const dt = Math.min(Math.max(dtSeconds, 0), LIVE.maxFrameSeconds);
    const limit = this.secondsAt(head);
    const speed = this.speedValue;
    if (speed === 'max') this.content = limit;
    else this.content = Math.min(this.content + dt * speed, limit);
    this.playheadValue = Math.min(head, this.clock.indexAt(this.content));
    this.waitingValue =
      speed !== 0 && speed !== 'max' && this.content >= limit && head < this.clock.endK;
    this.seenValue = Math.max(this.seenValue, this.playheadValue);
  }

  /** Lleva la reproducción al estado k (rebobinar o adelantar dentro de lo simulado). */
  scrub(k: number): void {
    const target = Math.max(0, Math.min(k, this.clock.size));
    this.content = this.secondsAt(target);
    this.playheadValue = target;
    this.seenValue = Math.max(this.seenValue, target);
  }

  /** Hasta dónde tiene que simular el Worker: el colchón por delante, o todo en "máx.". */
  target(): number {
    if (this.speedValue === 'max') return this.clock.endK;
    return Math.min(this.clock.endK, Math.floor(this.playheadValue) + PLAYBACK.aheadYears);
  }

  /** Segundos de contenido hasta k con fracción (interpolados entre estados). */
  private secondsAt(k: number): number {
    const k0 = Math.floor(k);
    const a = this.clock.secondsAt(k0);
    const b = this.clock.secondsAt(k0 + 1);
    return a + (b - a) * (k - k0);
  }
}
