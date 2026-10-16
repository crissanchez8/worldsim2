// Página del spike C: corre la batería en un Worker, compara contra expected.json (Node) y
// muestra ✅/❌. Para la verificación manual en Safari y para Playwright (`window.__spikeC`).
import type { Expected } from './battery';
import type { WorkerMessage } from './worker';

const params = new URLSearchParams(location.search);
function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`falta #${id}`);
  return el;
}
const verdict = $('verdict');
const progress = $('progress');
const detail = $('detail') as HTMLTableElement;
$('env').textContent = navigator.userAgent;

interface Result {
  done: boolean;
  years: number;
  seconds: number;
  userAgent: string;
  mathMismatches: string[];
  rngMatch: boolean;
  firstDivergentYear: number | null;
  finalHash: string | null;
  expectedFinalHash: string | null;
}

const expected = (await (await fetch('expected.json')).json()) as Expected;
const years = Math.min(Number(params.get('years') ?? expected.years), expected.years);
const result: Result = {
  done: false,
  years,
  seconds: 0,
  userAgent: navigator.userAgent,
  mathMismatches: [],
  rngMatch: false,
  firstDivergentYear: null,
  finalHash: null,
  expectedFinalHash: expected.yearHashes[years - 1] ?? null,
};

function row(label: string, ok: boolean, info = ''): void {
  const tr = detail.insertRow();
  tr.insertCell().textContent = label;
  const cell = tr.insertCell();
  cell.textContent = ok ? '✅' : '❌';
  cell.className = ok ? 'ok' : 'bad';
  tr.insertCell().textContent = info;
}

const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
let index = 0;
worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const m = event.data;
  if (m.type === 'battery') {
    for (const [name, hash] of Object.entries(expected.math)) {
      const ok = m.math[name] === hash;
      if (!ok) result.mathMismatches.push(name);
      row(`math.${name}`, ok, ok ? hash : `${m.math[name] ?? '—'} ≠ ${hash}`);
    }
    result.rngMatch = m.rng === expected.rng;
    row('rng', result.rngMatch, m.rng);
  } else if (m.type === 'progress') {
    for (const hash of m.hashes) {
      if (result.firstDivergentYear === null && hash !== expected.yearHashes[index]) {
        result.firstDivergentYear = index; // índice de año (0 = primer año simulado)
      }
      result.finalHash = hash;
      index++;
    }
    progress.textContent = `${m.done} / ${years} años`;
  } else {
    result.seconds = m.seconds;
    result.done = true;
    const simOk =
      result.firstDivergentYear === null && result.finalHash === result.expectedFinalHash;
    row(
      `simulación (${years} años)`,
      simOk,
      simOk
        ? `final ${result.finalHash ?? ''}`
        : `primer año distinto: índice ${result.firstDivergentYear ?? '?'}`,
    );
    const allOk = simOk && result.rngMatch && result.mathMismatches.length === 0;
    verdict.textContent = allOk
      ? `✅ Idéntico a Node (${expected.generatedBy}) · ${result.seconds.toFixed(1)} s`
      : '❌ Hay diferencias con Node (detalle abajo)';
    verdict.className = allOk ? 'ok' : 'bad';
    (window as unknown as { __spikeC: Result }).__spikeC = result;
  }
};
worker.postMessage({ years });
