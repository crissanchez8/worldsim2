// Worker de `ws health`: registra tsx (el monorepo corre TS sin build) y corre una seed.
import { parentPort, workerData } from 'node:worker_threads';
import { register } from 'tsx/esm/api';

register();
const { runSeed } = await import('./seed.ts');
const { params, sample, years } = workerData;
parentPort?.postMessage(runSeed(params, sample, years));
