import { ENGINE_VERSION } from '@ws/core';
import { describe, expect, it } from 'vitest';
import { main, type Io } from './main';

function capture(): Io & { lines: string[]; errors: string[] } {
  const lines: string[] = [];
  const errors: string[] = [];
  return { lines, errors, out: (l) => lines.push(l), err: (l) => errors.push(l) };
}

describe('ws', () => {
  it('--version imprime ENGINE_VERSION', async () => {
    const io = capture();
    expect(await main(['--version'], io)).toBe(0);
    expect(io.lines).toEqual([ENGINE_VERSION]);
  });

  it('run: hashes cada N años, reproducibles; misma seed → mismo resultado', async () => {
    const io = capture();
    const args = [
      'run',
      '--seed',
      '3',
      '--grid',
      '8x4',
      '--years',
      '40',
      '--every',
      '20',
      '--json',
    ];
    expect(await main(args, io)).toBe(0);
    const report = JSON.parse(io.lines.join('\n')) as {
      hashes: { year: number; hash: string }[];
      summary: { years: number };
    };
    expect(report.summary.years).toBe(40);
    expect(report.hashes.map((h) => h.year)).toEqual([-11981, -11961]);
    const again = capture();
    await main(args, again);
    expect(again.lines).not.toEqual([]);
    const second = JSON.parse(again.lines.join('\n')) as typeof report;
    expect(second.hashes).toEqual(report.hashes);
  });

  it('run: argumentos inválidos salen con 1', async () => {
    const io = capture();
    expect(await main(['run', '--grid', 'nope'], io)).toBe(1);
    expect(io.errors.join('\n')).toContain('--grid');
  });

  it('run: genera el mundo con el worldgen real y valida sus parámetros', async () => {
    const io = capture();
    const args = ['run', '--size', 'small', '--map', 'pangaea', '--years', '3', '--json'];
    expect(await main(args, io)).toBe(0);
    const report = JSON.parse(io.lines.join('\n')) as {
      world: { kind: string; provinces: number };
    };
    expect(report.world.kind).toBe('generated');
    expect(report.world.provinces).toBeGreaterThan(300);
    const bad = capture();
    expect(await main(['run', '--size', 'huge'], bad)).toBe(1);
    expect(bad.errors.join('\n')).toContain('huge');
  });

  it('un comando desconocido sale con 1', async () => {
    const io = capture();
    expect(await main(['nope'], io)).toBe(1);
    expect(io.errors.join('\n')).toContain('nope');
  });
});
