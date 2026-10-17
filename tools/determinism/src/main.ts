// Página de la suite de determinismo: corre la batería en un Worker, compara contra
// expected.json (Node) y muestra ✅/❌. Sirve para la verificación manual en Safari y para
// Playwright (`window.__determinism`). Es una herramienta de desarrollo, no UI de producto.
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

export interface DeterminismResult {
  done: boolean;
  years: number;
  seconds: number;
  /** Worldgen del escenario dentro del Worker (s). */
  worldgenSeconds: number;
  userAgent: string;
  /** Verificaciones estáticas distintas de Node: contenido, mundo, versión, funciones, RNG. */
  mismatches: string[];
  firstDivergentYear: number | null;
  finalHash: string | null;
  expectedFinalHash: string | null;
}

const expected = (await (await fetch('expected.json')).json()) as Expected;
const years = Math.min(Number(params.get('years') ?? expected.years), expected.years);
const result: DeterminismResult = {
  done: false,
  years,
  seconds: 0,
  worldgenSeconds: 0,
  userAgent: navigator.userAgent,
  mismatches: [],
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

function check(label: string, actual: string | undefined, wanted: string): void {
  const ok = actual === wanted;
  if (!ok) result.mismatches.push(label);
  row(label, ok, ok ? wanted : `${actual ?? '—'} ≠ ${wanted}`);
}

const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
let index = 0;
worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const m = event.data;
  if (m.type === 'static') {
    result.worldgenSeconds = m.worldgenSeconds;
    row('worldgen en el Worker', true, `${m.worldgenSeconds.toFixed(2)} s`);
    check('motor', m.checks.engine, expected.engine);
    check('contenido', m.checks.contentHash, expected.contentHash);
    check('mundo estático', m.checks.worldHash, expected.worldHash);
    for (const [name, h] of Object.entries(expected.math))
      check(`math.${name}`, m.checks.math[name], h);
    check('rng', m.checks.rng, expected.rng);
  } else if (m.type === 'progress') {
    for (const h of m.hashes) {
      if (result.firstDivergentYear === null && h !== expected.yearHashes[index]) {
        result.firstDivergentYear = index; // índice de año (0 = primer año simulado)
      }
      result.finalHash = h;
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
    const allOk = simOk && result.mismatches.length === 0;
    verdict.textContent = allOk
      ? `✅ Idéntico a Node (${expected.generatedBy}) · ${result.seconds.toFixed(1)} s`
      : '❌ Hay diferencias con Node (detalle abajo)';
    verdict.className = allOk ? 'ok' : 'bad';
    (window as unknown as { __determinism: DeterminismResult }).__determinism = result;
  }
};
worker.postMessage({ years });
