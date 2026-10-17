import { Eras } from '@ws/content';
import { describe, expect, it } from 'vitest';
import { ERA_YEARS_PER_SECOND, PLAYBACK, PlaybackClock, playbackSeconds } from './playback';

const era = (key: string) => Eras.indexOf(key);

/** Eras por estado con fechas tipo Tierra (BRIEF P1, D01-a): k = 0 es el inicio del −12000. */
function earthLike(): Uint8Array {
  const spans: [string, number][] = [
    ['prehistory', 5000],
    ['neolithic', 4000],
    ['bronzeAge', 2000],
    ['ironAge', 2499],
    ['earlyModern', 401],
  ];
  const out: number[] = [];
  for (const [key, years] of spans) for (let i = 0; i < years; i++) out.push(era(key));
  return Uint8Array.from(out);
}

describe('reloj de reproducción (D48)', () => {
  it('cada era tiene su ritmo, en el orden de Eras', () => {
    expect(ERA_YEARS_PER_SECOND).toHaveLength(Eras.rows.length);
    expect(ERA_YEARS_PER_SECOND.every((r) => r > 0)).toBe(true);
  });

  it('con una sola era, cada año dura 1/ritmo', () => {
    const eras = new Uint8Array(600).fill(era('prehistory'));
    expect(playbackSeconds(eras)).toBeCloseTo(600 / 60, 6);
  });

  it('con fechas tipo Tierra, la corrida dura ≈ 9,6 min a 1× (tabla de D01-a)', () => {
    const eras = earthLike();
    expect(eras.length).toBe(13900);
    const seconds = playbackSeconds(eras);
    expect(seconds / 60).toBeGreaterThan(9.3);
    expect(seconds / 60).toBeLessThan(9.9);
  });

  it('el cambio de era es suave: el ritmo no salta de un año al siguiente', () => {
    const eras = earthLike();
    const clock = new PlaybackClock(eras.length);
    for (const e of eras) clock.push(e);
    const boundary = 5000; // prehistoria (60) → neolítico (30)
    expect(clock.rateAt(boundary - 1)).toBeCloseTo(60, 6);
    let prev = clock.rateAt(boundary);
    for (let k = boundary + 1; k < boundary + 400; k++) {
      const r = clock.rateAt(k);
      expect(r).toBeLessThanOrEqual(prev + 1e-9);
      expect(prev - r).toBeLessThan(1);
      prev = r;
    }
    expect(clock.rateAt(boundary + 2000)).toBeCloseTo(30, 3);
  });

  it('el piso de duración: un mundo precoz igual termina en ≤ 15 min', () => {
    const eras = new Uint8Array(13900).fill(era('earlyModern'));
    const seconds = playbackSeconds(eras);
    // El piso se pasa a lo sumo por el presupuesto mínimo (minRemainingSeconds) y un año.
    expect(seconds).toBeLessThanOrEqual(
      PLAYBACK.maxDurationSeconds + PLAYBACK.minRemainingSeconds + 0.5,
    );
    expect(seconds).toBeGreaterThan(PLAYBACK.maxDurationSeconds * 0.95);
  });

  it('indexAt invierte a secondsAt y es monótono (rebobinar y adelantar dan lo mismo)', () => {
    const eras = earthLike().subarray(0, 6000);
    const clock = new PlaybackClock(13900);
    for (const e of eras) clock.push(e);
    for (const k of [0, 1, 999, 4999, 5000, 5999]) {
      expect(clock.indexAt(clock.secondsAt(k))).toBeCloseTo(k, 9);
    }
    const mid = (clock.secondsAt(100) + clock.secondsAt(101)) / 2;
    expect(clock.indexAt(mid)).toBeCloseTo(100.5, 9);
    expect(clock.indexAt(-1)).toBe(0);
    expect(clock.indexAt(1e9)).toBe(clock.size);
  });
});
