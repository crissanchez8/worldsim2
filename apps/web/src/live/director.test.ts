import { Eras } from '@ws/content';
import { PLAYBACK, PlaybackClock } from '@ws/history';
import { describe, expect, it } from 'vitest';
import { LIVE } from './config';
import { Director } from './director';

const prehistory = Eras.indexOf('prehistory');

/** Reloj con `known` estados en prehistoria (60 años/s a 1×). */
function clockWith(known: number, endK = 13900): PlaybackClock {
  const clock = new PlaybackClock(endK);
  for (let k = 0; k <= known; k++) clock.push(prehistory);
  return clock;
}

describe('director de la reproducción', () => {
  it('a 1× avanza al ritmo de la era; 2× y 4× multiplican; pausa no avanza', () => {
    const clock = clockWith(3000);
    const d = new Director(clock);
    d.tick(0.2, 3000);
    expect(d.playhead).toBeCloseTo(12, 6); // 60 años/s × 0,2 s
    d.speed = 4;
    d.tick(0.25, 3000);
    expect(d.playhead).toBeCloseTo(12 + 60, 6);
    d.speed = 0;
    d.tick(0.25, 3000);
    expect(d.playhead).toBeCloseTo(72, 6);
    expect(d.waiting).toBe(false);
  });

  it('un cuadro largo (pestaña que vuelve) no salta más que maxFrameSeconds', () => {
    const d = new Director(clockWith(3000));
    d.tick(30, 3000);
    expect(d.playhead).toBeCloseTo(60 * LIVE.maxFrameSeconds, 6);
  });

  it('nunca pasa la cabeza de la simulación: la espera', () => {
    const d = new Director(clockWith(3000));
    d.speed = 4;
    for (let i = 0; i < 20; i++) d.tick(0.25, 40);
    expect(d.playhead).toBe(40);
    expect(d.waiting).toBe(true);
  });

  it('el objetivo del Worker es el colchón por delante; en "máx." toda la corrida', () => {
    const d = new Director(clockWith(3000));
    d.tick(0.1, 3000);
    expect(d.target()).toBe(Math.floor(d.playhead) + PLAYBACK.aheadYears);
    d.speed = 'max';
    d.tick(0.016, 2500);
    expect(d.playhead).toBe(2500);
    expect(d.target()).toBe(13900);
  });

  it('rebobinar mueve el reloj y lo visto no retrocede (D49)', () => {
    const d = new Director(clockWith(3000));
    d.speed = 'max';
    d.tick(0.016, 2000);
    d.speed = 1;
    d.scrub(500);
    expect(d.playhead).toBe(500);
    expect(d.seen).toBe(2000);
    d.tick(0.1, 3000);
    expect(d.playhead).toBeCloseTo(506, 6);
  });
});
