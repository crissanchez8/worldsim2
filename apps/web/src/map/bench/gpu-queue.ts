// Cuadros enviados a la GPU que todavía no terminaron (L-010). Si la GPU no da abasto, crece aunque
// requestAnimationFrame siga a 60 Hz (headless): es el control cruzado de los fps.

export interface GpuQueueProbe {
  /** Llamar justo después de enviar un cuadro. */
  mark(): void;
  readonly inFlight: number;
}

class WebGpuProbe implements GpuQueueProbe {
  inFlight = 0;
  private readonly device: GPUDevice;

  constructor(device: GPUDevice) {
    this.device = device;
  }

  mark(): void {
    this.inFlight++;
    void this.device.queue.onSubmittedWorkDone().then(() => {
      this.inFlight--;
    });
  }
}

class WebGl2Probe implements GpuQueueProbe {
  private readonly gl: WebGL2RenderingContext;
  private readonly fences: WebGLSync[] = [];

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }

  get inFlight(): number {
    return this.fences.length;
  }

  mark(): void {
    const { gl } = this;
    // El estado de un fence solo cambia entre tareas: se consulta en el cuadro siguiente.
    while (this.fences.length > 0) {
      const head = this.fences[0];
      if (!head || gl.getSyncParameter(head, gl.SYNC_STATUS) !== gl.SIGNALED) break;
      gl.deleteSync(head);
      this.fences.shift();
    }
    const fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    if (fence) this.fences.push(fence);
  }
}

/** `backend` es `renderer.backend` de three; sus tipos no exponen `device` ni `gl`. */
export function createGpuQueueProbe(backend: object): GpuQueueProbe | null {
  const b = backend as { device?: GPUDevice; gl?: WebGL2RenderingContext };
  if (b.device) return new WebGpuProbe(b.device);
  if (b.gl) return new WebGl2Probe(b.gl);
  return null;
}
