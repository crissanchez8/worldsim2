// HUD de medición del spike. Herramienta de desarrollo: texto fijo en español, sin i18n (P0.13).
import type { FrameSummary } from './metrics';

export interface LiveInfo {
  readonly fps: number;
  readonly frameMs: number;
  readonly cpuMs: number;
  readonly gpuMs: number | null;
  /** Cuadros en vuelo en la GPU, o null si no se puede medir. */
  readonly gpuQueue: number | null;
  readonly drawCalls: number;
  readonly triangles: number;
  readonly lodCounts: readonly number[];
  readonly cameraX: number;
  readonly cameraZ: number;
  readonly distance: number;
  /** Progreso del recorrido en [0, 1], o null si no está corriendo. */
  readonly tour: number | null;
}

const MB = 1024 * 1024;

export function mb(bytes: number): string {
  return `${(bytes / MB).toFixed(1)} MB`;
}

function fmt(n: number, digits = 1): string {
  return Number.isFinite(n) ? n.toFixed(digits) : 'n/d';
}

export class Hud {
  private readonly root: HTMLElement;
  private readonly staticEl: HTMLElement;
  private readonly liveEl: HTMLElement;
  private readonly resultEl: HTMLElement;
  private readonly startButton: HTMLButtonElement;
  private readonly copyButton: HTMLButtonElement;
  private resultJson = '';

  constructor(parent: HTMLElement, onStart: () => void) {
    this.root = document.createElement('div');
    this.root.id = 'hud';
    const title = document.createElement('h1');
    title.textContent = 'Spike A · terreno';
    this.staticEl = document.createElement('pre');
    this.liveEl = document.createElement('pre');
    this.resultEl = document.createElement('pre');
    this.resultEl.className = 'result';
    const buttons = document.createElement('div');
    buttons.className = 'buttons';
    this.startButton = document.createElement('button');
    this.startButton.textContent = 'Iniciar recorrido';
    this.startButton.disabled = true;
    this.startButton.addEventListener('click', onStart);
    this.copyButton = document.createElement('button');
    this.copyButton.textContent = 'Copiar JSON';
    this.copyButton.disabled = true;
    this.copyButton.addEventListener('click', () => {
      void navigator.clipboard.writeText(this.resultJson).then(() => {
        this.copyButton.textContent = 'Copiado ✓';
      });
    });
    buttons.append(this.startButton, this.copyButton);
    const help = document.createElement('p');
    help.className = 'help';
    help.textContent = 'Arrastrar: mover · rueda: zoom · WASD/flechas: mover · Q/E: girar';
    this.root.append(title, this.staticEl, this.liveEl, buttons, this.resultEl, help);
    parent.append(this.root);
  }

  status(text: string): void {
    this.staticEl.textContent = text;
  }

  setStatic(lines: readonly string[]): void {
    this.staticEl.textContent = lines.join('\n');
  }

  ready(durationS: number): void {
    this.startButton.disabled = false;
    this.startButton.textContent = `Iniciar recorrido (${durationS} s)`;
  }

  tourRunning(running: boolean): void {
    this.startButton.disabled = running;
  }

  live(info: LiveInfo): void {
    const lines = [
      `fps ${fmt(info.fps, 0)} · cuadro ${fmt(info.frameMs)} ms · CPU ${fmt(info.cpuMs, 2)} ms · GPU ${info.gpuMs === null ? 'n/d' : `${fmt(info.gpuMs, 2)} ms`}`,
      `draw calls ${info.drawCalls} · triángulos ${(info.triangles / 1e6).toFixed(2)} M · cuadros en vuelo en GPU ${info.gpuQueue ?? 'n/d'}`,
      `chunks por LOD [${info.lodCounts.join(' ')}]`,
      `cámara x ${info.cameraX.toFixed(0)} · z ${info.cameraZ.toFixed(0)} · dist ${info.distance.toFixed(0)}`,
    ];
    if (info.tour !== null) lines.push(`recorrido ${(info.tour * 100).toFixed(0)} %`);
    this.liveEl.textContent = lines.join('\n');
  }

  result(summary: FrameSummary, json: string): void {
    this.resultJson = json;
    this.copyButton.disabled = false;
    this.copyButton.textContent = 'Copiar JSON';
    this.resultEl.textContent = [
      `RESULTADO · ${summary.frames} cuadros en ${fmt(summary.seconds)} s`,
      `fps promedio ${fmt(summary.fpsAvg)} · p5 ${fmt(summary.fpsP5)} · p1 ${fmt(summary.fpsP1)}`,
      `cuadro ms prom ${fmt(summary.frameMsAvg, 2)} · p95 ${fmt(summary.frameMsP95, 2)} · máx ${fmt(summary.frameMsMax, 1)} · tirones >25 ms: ${summary.janks}`,
      `CPU ms prom ${fmt(summary.cpuMsAvg, 2)} · p95 ${fmt(summary.cpuMsP95, 2)}`,
      `GPU ms prom ${fmt(summary.gpuMsAvg, 2)} · p95 ${fmt(summary.gpuMsP95, 2)} (${summary.gpuSamples} muestras)`,
      `cuadros en vuelo en GPU prom ${fmt(summary.gpuQueueAvg, 2)} · máx ${fmt(summary.gpuQueueMax, 0)}`,
    ].join('\n');
  }
}
