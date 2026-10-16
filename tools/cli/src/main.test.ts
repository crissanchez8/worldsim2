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

  it('un comando desconocido sale con 1', async () => {
    const io = capture();
    expect(await main(['nope'], io)).toBe(1);
    expect(io.errors.join('\n')).toContain('nope');
  });
});
