/// <reference lib="webworker" />
// Worker de simulación (P1.5): la simulación nunca corre en el hilo principal.
import { SimEngine } from './sim-engine';
import type { SimRequest } from './sim-protocol';

declare const self: DedicatedWorkerGlobalScope;

// Ceder sin el mínimo de 4 ms del setTimeout anidado: un MessageChannel propio (spike B).
const pending: (() => void)[] = [];
const channel = new MessageChannel();
channel.port1.onmessage = () => {
  pending.shift()?.();
};

const engine = new SimEngine({
  post: (message, transfer = []) => {
    self.postMessage(message, transfer);
  },
  schedule: (run) => {
    pending.push(run);
    channel.port2.postMessage(null);
  },
});

self.onmessage = (event: MessageEvent<SimRequest>) => {
  engine.handle(event.data);
};
