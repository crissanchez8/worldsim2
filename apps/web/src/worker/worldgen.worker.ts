/// <reference lib="webworker" />
// Worker de worldgen: el mundo nunca se genera en el hilo principal (P1.2, Δ de P1.1).
import { handleWorldgenRequest, type WorldgenRequest } from './worldgen-protocol';

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = (event: MessageEvent<WorldgenRequest>) => {
  handleWorldgenRequest(event.data, (message, transfer = []) => {
    self.postMessage(message, transfer);
  });
};
