import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ENGINE_VERSION } from '@ws/core';
import { decodeWsim } from '@ws/history';
import { describe, expect, it, vi } from 'vitest';
import { main, type Io } from './main';

// Generan mundos reales y simulan: bajo la carga de `pnpm check` pasan los 5 s por defecto (L-017).
vi.setConfig({ testTimeout: 60_000 });

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

  it('run --wsim: graba la historia, escribe el archivo y lo mide', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ws-wsim-'));
    const file = join(dir, 'corrida.wsim');
    const io = capture();
    const args = ['run', '--size', 'small', '--years', '120', '--wsim', file, '--json'];
    expect(await main(args, io)).toBe(0);
    const report = JSON.parse(io.lines.join('\n')) as {
      history: { fileBytes: number; blocks: { tag: string }[]; memory: { keyframes: number } };
    };
    const bytes = readFileSync(file);
    expect(report.history.fileBytes).toBe(bytes.length);
    expect(decodeWsim(bytes).header.years).toBe(120);
    expect(report.history.blocks.map((b) => b.tag)).toEqual([
      'META',
      'VKEY',
      'DELT',
      'SERI',
      'AGGR',
      'EVNT',
      'KEYF',
      'FINL',
    ]);
    expect(report.history.memory.keyframes).toBe(2);
    rmSync(dir, { recursive: true, force: true });
    const grid = capture();
    expect(await main(['run', '--grid', '4x4', '--wsim', file], grid)).toBe(1);
    expect(grid.errors.join('\n')).toContain('--wsim');
  });

  it('un comando desconocido sale con 1', async () => {
    const io = capture();
    expect(await main(['nope'], io)).toBe(1);
    expect(io.errors.join('\n')).toContain('nope');
  });
});
