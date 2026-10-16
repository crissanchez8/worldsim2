/// <reference lib="webworker" />
// Corre la batería en un Worker, como corre el motor en la app.
import { runYears, scenarioWorld, staticChecks } from './battery';

declare const self: DedicatedWorkerGlobalScope;

export type WorkerMessage =
  | { readonly type: 'static'; readonly checks: ReturnType<typeof staticChecks> }
  | { readonly type: 'progress'; readonly done: number; readonly hashes: readonly string[] }
  | { readonly type: 'done'; readonly seconds: number };

self.onmessage = (event: MessageEvent<{ years: number }>) => {
  const t0 = performance.now();
  const world = scenarioWorld();
  self.postMessage({ type: 'static', checks: staticChecks(world) } satisfies WorkerMessage);
  let chunk: string[] = [];
  runYears(world, event.data.years, (i, hash) => {
    chunk.push(hash);
    if (chunk.length === 250 || i === event.data.years - 1) {
      self.postMessage({ type: 'progress', done: i + 1, hashes: chunk } satisfies WorkerMessage);
      chunk = [];
    }
  });
  self.postMessage({
    type: 'done',
    seconds: (performance.now() - t0) / 1000,
  } satisfies WorkerMessage);
};
