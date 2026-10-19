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

/**
 * Resuelve cuando la GPU terminó todo lo enviado (el primer cuadro "se ve" recién ahí: con la
 * caché de shaders fría la compilación de pipelines ocurre en la GPU después del `render`).
 * Devuelve false si el backend no permite saberlo.
 */
export async function waitGpuIdle(backend: object): Promise<boolean> {
  const b = backend as { device?: GPUDevice; gl?: WebGL2RenderingContext };
  if (b.device) {
    await b.device.queue.onSubmittedWorkDone();
    return true;
  }
  const gl = b.gl;
  if (!gl) return false;
  const fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  if (!fence) return false;
  gl.flush();
  // El estado del fence cambia entre tareas: se consulta en cada cuadro.
  while (gl.getSyncParameter(fence, gl.SYNC_STATUS) !== gl.SIGNALED) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  gl.deleteSync(fence);
  return true;
}

/** `backend` es `renderer.backend` de three; sus tipos no exponen `device` ni `gl`. */
export function createGpuQueueProbe(backend: object): GpuQueueProbe | null {
  const b = backend as { device?: GPUDevice; gl?: WebGL2RenderingContext };
  if (b.device) return new WebGpuProbe(b.device);
  if (b.gl) return new WebGl2Probe(b.gl);
  return null;
}
