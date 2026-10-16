# ADR-006 · Backend de render: WebGPU primero + fallback WebGL2

| | |
|---|---|
| **Fecha** | 2026-10-16 |
| **Estado** | Aceptado el 2026-10-16 (D43) · medición en navegadores visibles a cargo de Cristian |
| **Fase** | P0 |
| **Decisión en log** | D2 (plataforma) · D43 |

## Contexto
Mapa 3D que de lejos se vuelve atlas (D5), terreno de 2048×1024 con wrap E-O (D6), 60 fps en
M-series. WebGPU ya está activo por defecto en Chrome, Edge, Safari 26 y Firefox ≥ 147 en macOS
Apple Silicon; WebGL2 es el piso (D36).

## Opciones consideradas
| Opción | Pros | Contras |
|---|---|---|
| **Three.js `WebGPURenderer` + TSL, fallback automático a WebGL2 (elegida)** | Un solo código de material para los dos backends; ~3× de rendimiento con WebGPU; camino a compute en GPU | WebGPU todavía joven en algunos navegadores |
| WebGL2 solo | Máxima compatibilidad | ~3× menos margen en Apple Silicon; sin compute |
| WGSL/GLSL a mano | Control total | Dos códigos de shader; más mantenimiento |
| Babylon.js | Motor completo | Ecosistema más chico para lo que necesitamos; D2 eligió Three.js |

## Decisión
`WebGPURenderer` con materiales TSL, fallback automático a WebGL2 cuando no hay WebGPU, y
`?backend=webgl2` para forzarlo (se conserva en la app para depurar).

## Consecuencias
- **El costo es de fragmentos**, no de geometría: los presets de calidad (P12) mueven la
  relación de píxeles y la cantidad de lecturas de texturas; el MSAA es barato en Apple Silicon.
- **Preset "fallback"** con dpr ≤ 1,5 para WebGL2 (margen ~2× a 60 Hz, casi nulo a 120 Hz).
- **No precalentar con `compileAsync`** sobre cientos de objetos en WebGL2 de Firefox (10,8 s):
  un render sincrónico (151 ms).
- R16F para el heightmap en GPU (R32F no es filtrable sin features opcionales).
- Revisar si: Safari o Firefox ≥ 147 fallan con WebGPU en el checkpoint 3 (el fallback ya está
  probado), o si P12 necesita features que TSL no exprese.

## Evidencia
Spike A (`docs/phases/P00/spikes.md`), M1 Pro, recorrido de 60 s, dpr 2 (3024×1604), MSAA 4×:

| Backend | fps prom / p5 | Margen por estrés |
|---|---|---|
| WebGPU (Chrome 155) | 60 / 59,9 | ≥ 4× escenas por cuadro; satura cerca de ×8 |
| WebGL2 (Chrome forzado / Firefox 137 automático) | 60 / 59,9 · 59,6 / 57,1 | ~2×; satura entre ×2 y ×3 |

Terreno: 8,5 MB de memoria GPU; carga ~1,3 s (Chrome) con el heightmap en el hilo principal
(en producción va al Worker).
