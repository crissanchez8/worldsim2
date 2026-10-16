# Spikes de P0 — mediciones y conclusiones

Los spikes son **descartables** (D33): viven en `spikes/`, nadie los importa y ningún código de
ahí se promueve a producción sin decidirlo en el REPORT de la fase. Acá quedan las mediciones y
las propuestas.

---

## Spike A · terreno (P0.13)

| | |
|---|---|
| **Fecha** | 2026-10-15 |
| **Código** | `spikes/terrain/` (`@ws/spike-terrain`) · instrucciones en su `README.md` |
| **Pregunta** | ¿Un terreno 2048×1024 con wrap E-O llega a ≥ 60 fps en M-series con `WebGPURenderer`, y funciona el fallback WebGL2? |
| **Estado** | Medido en el M1 Pro con Chrome 155 y Firefox 137 **headless**. **Falta** la medición en Chrome, Safari y Firefox **visibles** (checkpoint 3). |

### Resumen
- **WebGPU cumple con mucho margen.** 60 fps sostenidos a dpr 2 (3024×1604, MSAA 4×), sin
  tirones. Aguanta dibujar la escena **×4 por cuadro** sin perder un cuadro y satura recién
  cerca de ×8.
- **El fallback WebGL2 funciona.** Forzado en Chrome y automático en Firefox 137 (que no tiene
  WebGPU): mismos 60 fps, pero con **~2× de margen**, contra los ≥ 4× de WebGPU.
- **El cuello de botella es el sombreado de fragmentos, no la geometría.** Con frustum culling
  se dibujan ~0,25 M triángulos con LOD por distancia y ~0,5 M con LOD 0 forzado.
- **Recomendación: se confirma el ADR-006** (WebGPU primero + fallback WebGL2, TSL).

### Qué se hizo
- **Heightmap 2048×1024** de ruido, con wrap E-O sin costura:
  - ruido de gradiente 3D ("improved noise") muestreado sobre un **cilindro** de perímetro 2048
    celdas: la columna 0 y la 2047 son vecinas de verdad;
  - continentes (fBm, 9 octavas) + cordilleras (ridged, 6 octavas), polos hundidos;
  - azar del RNG de `@ws/core` (`createRng(seed).stream(Streams.spike)`, un sub-stream por capa) y
    `cos`/`sin` de `@ws/core/math`: **determinista**;
  - el hash del heightmap da `0fc08e0e41c36265` (seed 1) **igual en Node, Chrome y Firefox**; el
    HUD lo muestra para compararlo en Safari.
- **Terreno manejado por la GPU:**
  - el heightmap sube como textura **R16F** (4 MB) con repetición en U;
  - **5 niveles de LOD** (paso 1, 2, 4, 8, 16 celdas): una sola grilla por nivel, compartida por
    los 128 chunks de 128×128 celdas;
  - el **vertex shader** (TSL) desplaza la grilla leyendo la textura en XZ de mundo;
  - las **normales** salen en el fragment shader por diferencias centrales: el detalle de luz no
    depende del LOD;
  - **faldones** en el borde de cada chunk tapan las grietas entre LODs;
  - LOD por distancia 3D cámara-chunk: nivel 0 hasta 160 celdas, y uno más cada vez que se
    duplica la distancia.
- **Wrap E-O:**
  - cada chunk existe una sola vez y se **reposiciona** en la copia más cercana a la cámara;
  - la x de la cámara se envuelve a [0, 2048): el mundo es periódico, así que el salto no se ve y
    no se pierde precisión de float con el pan infinito;
  - plano lejano a 1.000 celdas (< medio mundo) con niebla;
  - las texturas del splat repiten cada 4 y 32 celdas, que dividen a 2048: tampoco hay costura.
- **Splat de 3 texturas** procedurales (pasto, roca, nieve), 512² RGBA8 sRGB con mipmaps,
  generadas en código con el RNG (sin assets externos; ver `ASSETS.md`):
  - roca por pendiente;
  - nieve por altura, con la línea de nieve que baja hacia los polos;
  - cada textura muestreada a dos escalas para que no se vea el mosaico;
  - además: agua por profundidad, playa y sombreado lambert + ambiente.
- **Renderer:**
  - `WebGPURenderer` de Three.js 0.186.1 con `MeshBasicNodeMaterial` + TSL (un solo código de
    shader para los dos backends);
  - `?backend=webgl2` fuerza el fallback (`forceWebGL`); sin WebGPU, three cae solo a WebGL2.
- **HUD de medición:**
  - backend, hash, tiempos de carga desglosados, memoria GPU (la de `renderer.info.memory` y la
    estimada);
  - en vivo: fps, CPU y GPU por cuadro, **cuadros en vuelo en la GPU**, draw calls, triángulos y
    chunks por LOD;
  - recorrido scripteado de 60 s con resultado y botón para copiar el JSON.
- **Recorrido:**
  - avanza 2.600 celdas hacia el este: cruza la costura dos veces;
  - alterna cerca (45) y lejos (520) dos veces, lo que fuerza cambios de LOD en ambos sentidos;
  - recorre latitudes.
- **Parámetros de diagnóstico:** `?dpr=`, `?aa=0`, `?lod=0` (peor caso), `?repeat=N` (estrés),
  `?warmup=0`, pose inicial. Lista completa en el README del spike.
- **Tests** (Vitest, 14):
  - determinismo y golden del heightmap;
  - costura, con control negativo; validada con una mutación que la rompe;
  - reposicionamiento y LOD;
  - percentiles y recorrido.

### Cómo se midió
- **Máquina:** la de medición del BRIEF, MacBook Pro **Apple M1 Pro** (GPU de 14 núcleos), macOS 26.
- **Build de producción** (`vite build` + `vite preview`), no el dev server (L-009).
- **Navegadores, headless y manejados por script:**
  - Chrome 155 (`--headless=new`) por CDP, con `spikes/terrain/scripts/measure-headless.mjs`;
  - Firefox 137 por WebDriver BiDi, con un script equivalente (no versionado).
- **Por qué headless:** el navegador integrado de la sesión estaba oculto (la sesión no estaba
  abierta en ninguna ventana). En una página oculta `requestAnimationFrame` no corre y el canvas
  quedó en 0×0 (ver problemas).
- **Control cruzado:** headless usa un reloj de cuadros virtual de **60 Hz** (los fps quedan
  topeados en 60 y no se mide ProMotion), y los timers de GPU resultaron poco confiables (ver
  problemas). Por eso cada corrida mide también:
  - **cuadros en vuelo en la GPU**: fences en WebGL2, `queue.onSubmittedWorkDone()` en WebGPU.
    Si se mantiene en 1–2, cada cuadro termina en la GPU antes del siguiente;
  - **margen por estrés** (`?repeat=N`): la escena se dibuja N veces por cuadro. El N máximo que
    sostiene 60 fps es el margen de GPU, sin depender de timers ni del vsync.
- **Validación del método:** con ×3 en WebGL2 y ×16 en WebGPU, la cola crece a 3–5 y los fps caen.
  O sea, en headless sí hay contrapresión y el método detecta la saturación.

### Mediciones
Recorrido de 60 s, seed 1, MSAA 4×, LOD por distancia, build de producción, código final.
La columna "GPU timer" es lo que reportan las timestamp queries: se muestra, pero **no es la
métrica de margen** (ver problemas).

| Navegador · backend | Canvas | fps prom | fps p5 | fps p1 | Cuadro máx (ms) | Tirones > 25 ms | CPU prom / p95 (ms) | Cola GPU prom (máx) | GPU timer prom / p95 (ms) |
|---|---|---|---|---|---|---|---|---|---|
| Chrome 155 · WebGPU | 1512×802 (dpr 1) | 60,0 | 59,5 | 59,5 | 16,8 | 0 | 0,87 / 1,90 | 1,00 (3) | 3,26 / 5,03 |
| Chrome 155 · WebGPU | 3024×1604 (dpr 2) | 60,0 | 59,9 | 59,5 | 33,3 | 1 | 0,76 / 1,60 | 1,01 (3) | 7,39 / 12,58 |
| Chrome 155 · WebGL2 forzado | 1512×802 (dpr 1) | 60,0 | 59,9 | 59,5 | 16,8 | 0 | 0,99 / 2,30 | 1,00 (2) | 6,28 / 11,24 |
| Chrome 155 · WebGL2 forzado | 3024×1604 (dpr 2) | 60,0 | 59,9 | 59,5 | 16,8 | 0 | 0,85 / 1,90 | 1,00 (2) | 12,24 / 17,17 |
| Firefox 137 · WebGL2 (fallback automático) | 1512×860 (dpr 1) | 59,7 | 57,1 | 56,7 | 83,5 | 11 | 2,09 / 6,00 | 1,06 (4) | n/d |
| Firefox 137 · WebGL2 (fallback automático) | 3024×1720 (dpr 2) | 59,6 | 57,1 | 56,6 | 83,3 | 13 | 2,08 / 6,00 | 1,19 (3) | n/d |

Firefox gasta 2–3× más CPU por cuadro que Chrome y tiene 11–13 cuadros de más de 25 ms (máx.
83 ms) en 60 s, el 0,3 % del total; igual queda lejos del piso del plan (p5 ≥ 45). Firefox 137 no expone el timer de GPU.
La ronda anterior (mismo código salvo el precalentado) dio los mismos fps y la misma cola en
Chrome; el timer de GPU varió hasta ~2 ms entre corridas, otra razón para no usarlo como margen.

**Margen por estrés** (dpr 2 = 3024×1604, MSAA 4×, recorridos de 20 s; build previo al cambio de
precalentado, que no afecta el régimen estable):

| Escena por cuadro | WebGPU: fps prom / p1 · cola prom (máx) | WebGL2: fps prom / p1 · cola prom (máx) |
|---|---|---|
| ×1 (recorrido de 60 s) | 60,0 / 59,5 · 1,00 (2) | 60,0 / 59,5 · 1,01 (2) |
| ×2 | 60,0 / 59,5 · 1,00 (2) | 59,7 / 59,5 · 1,13 (5), 2 tirones |
| ×3 | 60,0 / 59,5 · 1,02 (2) | 59,4 / **30,1** · 2,86 (5), 13 tirones |
| ×4 | 60,0 / 59,5 · 1,02 (2) | **44,3** / 29,9 · 5,00 (6) |
| ×8 | 59,8 / 59,5 · 2,32 (6), 5 tirones | — |
| ×16 | **33,5** / 20,0 · 5,10 (6) | — |

Lectura:
- a dpr 2, WebGPU sostiene ≥ 4 veces la escena a 60 Hz y satura cerca de ×8;
- WebGL2 satura entre ×2 y ×3;
- estimado como 16,7 ms / N de saturación, una escena cuesta del orden de **2 ms de GPU con
  WebGPU** y **6–7 ms con WebGL2**;
- para 120 Hz (8,3 ms por cuadro), WebGPU tiene margen de sobra a dpr 2 y WebGL2 queda justo.

**Peor caso de geometría** (LOD 0 forzado, dpr 2, 60 s, ronda anterior): 60,0 fps, p5 59,9 en los dos backends;
cola 1,01 (máx 2) en WebGPU y 1,02 (máx 5) en WebGL2. Por el frustum culling se dibujan ~0,5 M
triángulos en vez de ~0,25 M (con la cámara cerca, al final del recorrido): el LOD casi no cambia
el costo a esta escala.

**Sin MSAA** (WebGPU, dpr 2, 60 s, ronda anterior): 60,0 fps, p5 59,9, cola 1,00. El timer baja
apenas, de 9,0 a 7,9 ms: consistente con que el MSAA es barato en GPUs por tiles como las de Apple.

**Carga:**

| Paso | Chrome · WebGPU | Chrome · WebGL2 | Firefox 137 · WebGL2 |
|---|---|---|---|
| Init del renderer (adaptador y device) | 31–60 ms | 44–46 ms | 59–81 ms |
| Heightmap 2048×1024 (CPU, hilo principal) | ≈ 1,0 s | ≈ 1,0 s | 1,8–2,0 s |
| Texturas del splat (CPU) | 0,1–0,2 s | ≈ 0,1 s | ≈ 0,1 s |
| Armar el terreno (half floats + geometrías) | 16 ms | 15–16 ms | 44–45 ms |
| Precalentado (un render con las 640 mallas) | 72–76 ms | 71–92 ms | 117–173 ms |
| Primer cuadro | 4–5 ms | 5–11 ms | 16–25 ms |
| **Total** | **1,3 s** | **1,2–1,3 s** | **2,1–2,4 s** |

Con la caché de shaders fría (primer arranque del navegador) se suman ~3,5 s al init de WebGPU y
~1 s a la compilación de WebGL2 en Chrome.

**Memoria GPU:**

| Recurso | Tamaño |
|---|---|
| Heightmap R16F 2048×1024 | 4,0 MB |
| 3 texturas de splat 512² RGBA8 + mipmaps | 4,0 MB |
| Geometrías (5 grillas compartidas, posiciones + índices) | 0,5 MB |
| **Terreno** | **8,5 MB** |
| Lo que cuenta `renderer.info.memory` de three (incluye render targets, sin muestras MSAA) | 22,8 MB (dpr 1) · 64,4 MB (dpr 2) |
| Framebuffer estimado (color + profundidad, MSAA 4×) | 37 MB (dpr 1) · 148 MB (dpr 2) |

Draw calls: 15–25 por cuadro (de 128 chunks, el resto se descarta por frustum).

### Mediciones en navegadores visibles (Cristian, M1 Pro, 2026-10-16)
Recorrido de 60 s desde el HUD, en el preview desplegado, con ventana visible (pantalla
ProMotion de 120 Hz).

| Navegador | fps prom / p5 / p1 | Cuadro prom / p95 / máx (ms) | Tirones > 25 ms | CPU prom (ms) | GPU prom / p95 (ms) | Cola GPU prom (máx) |
|---|---|---|---|---|---|---|
| Chrome | **118,8** / 107,5 / 86,2 | 8,42 / 9,30 / 24,4 | 0 | 0,47 | 7,99 / 11,93 | 1,08 (4) |
| Safari 26 | 29,9 / 28,6 / 25,6 | 33,46 / 35,00 / 189,0 | 1.776 | 1,74 | 9,62 / 19,20 | 1,00 (1) |
| Firefox | 86,5 / **107,3** / 57,5 | 11,55 / 9,32 / **8.001,1** | 35 | 2,08 | n/d | 2,04 (5) |

Lectura:
- **Chrome:** 120 Hz casi sostenidos, sin tirones y con la cola de la GPU en 1: cumple con margen
  aun al doble del objetivo.
- **Safari: tope de 30 fps, no falta de rendimiento.** El cuadro dura 33,5 ms parejo mientras la
  GPU usa 9,6 ms, la CPU 1,7 ms y nunca hay más de un cuadro en vuelo: nada está saturado. Es la
  firma de un `requestAnimationFrame` limitado a 30 Hz, lo que Safari hace en modo de bajo
  consumo. **Hay que repetir la medición** con el Mac enchufado y sin modo de bajo consumo.
- **Firefox: rinde, pero hubo un congelamiento de 8 s.** El 95% de los cuadros va a ≥ 107 fps
  (p5 107,3); el promedio de 86,5 lo arrastra un único cuadro de 8.001 ms. Hipótesis: compilación
  de pipelines con la caché fría, ya visto en Firefox (problema 3). **Hay que repetir** para ver
  si se repite con la caché caliente, y anotar el backend (Firefox 137 = WebGL2; ≥ 147 = WebGPU).

### ¿Cumple el criterio de salida?
Criterio (BRIEF §8): ≥ 60 fps promedio en M1 Pro con heightmap 2048×1024 + wrap; fallback WebGL2
funcional.

- **WebGPU: sí.**
  - 60 fps promedio en dpr 1 y dpr 2; p5 ≥ 59,5 (el plan pide p5 ≥ 45);
  - margen medido por estrés: ≥ 4× sin perder cuadros; satura cerca de ×8.
- **Fallback WebGL2: sí.**
  - forzado en Chrome y automático en Firefox 137;
  - 60 fps promedio en dpr 1 y 2, con ~2× de margen.
- **Visibles (checkpoint 3):** Chrome cumple a 120 Hz; Firefox cumple en el 95% de los cuadros
  con un congelamiento de 8 s a investigar; Safari quedó topeado en 30 fps por el sistema y se
  repite la medición (ver arriba).
- **Antes del checkpoint 3:** el Firefox instalado es la **137**, anterior a la 147, que trae WebGPU
  en macOS. Para medir WebGPU en Firefox hay que actualizarlo; con la 137 se mide el fallback.

### Problemas encontrados
1. **Navegador integrado oculto.** Con la sesión fuera de pantalla, `requestAnimationFrame` no
   corre y un `resize` a 0×0 dejó el canvas vacío (errores de swapchain de tamaño 0 en Dawn).
   - Arreglo: el canvas se ajusta en cada cuadro e ignora tamaños 0.
   - Medición: Chrome y Firefox headless. Para medir de verdad hace falta una ventana visible.
2. **Los timers de GPU no sirven como margen.**
   - WebGL2 (`EXT_disjoint_timer_query` vía ANGLE/Metal) marcaba 20,6 ms en p95 a dpr 2, con 60 fps
     y cola en 1.
   - En WebGPU, los timestamps suman ~9 ms por escena, pero ×4 escenas entran en 16,7 ms.
   - Parecen medir latencia de pase (incluye esperas y solapamiento entre pases) y no ocupación.
   - Se reemplazó por la cola de GPU y el estrés `?repeat=N` (L-010).
3. **`compileAsync` en WebGL2 de Firefox es lentísimo con muchos objetos.** Precalentar las 640
   mallas (128 chunks × 5 LOD) tardaba **10,8 s** en Firefox contra 88 ms en Chrome. Encaja con
   esperar un cuadro por objeto de render (640 × 16,7 ms ≈ 10,7 s).
   - Se reemplazó por un cuadro sincrónico con todo visible: 151 ms en Firefox.
   - Sin precalentado, WebGL2 en Chrome mostró 2 tirones de hasta 100 ms en el recorrido.
   - Para P1: **no precalentar con `compileAsync` sobre cientos de objetos**; usar un render.
4. **El relieve no se leía.** Con celdas de 19,6 km las pendientes reales son casi nulas: el
   terreno se veía plano y la roca por pendiente no aparecía.
   - Exageración vertical ×30 y sombreado (hillshade) ×3 adicional.
   - Es una decisión de estilo para P1/P12; probablemente convenga que dependa del zoom.
5. **Mosaico visible del splat.** La repetición cada 4 celdas se veía como una grilla.
   - Cada textura se muestrea a dos escalas (4 y 32 celdas): 6 lecturas en lugar de 3.
6. **R32F no es filtrable** sin la feature `float32-filterable` (ni sin `OES_texture_float_linear`
   en WebGL2).
   - Se usa R16F: precisión de ≈ 4 m a 6.000 m, suficiente para dibujar.
   - La verdad del heightmap queda en CPU como Float32.
7. **El desplazamiento en GPU rompe el frustum culling.** Las geometrías son planas, así que su
   volumen no cubre el relieve: la esfera envolvente se fija a mano con la altura máxima.
8. **`renderer.info.memory` no es la memoria real del framebuffer.** Cuenta los render targets sin
   las muestras MSAA y no incluye el canvas. El HUD muestra las dos cifras.
9. **De cerca se nota la resolución del heightmap.** Con la cámara a 45 celdas, costas y laderas se
   ven suaves: es interpolación bilineal de celdas de 20 km. No es un tema de rendimiento; para
   P3/P12 hace falta detalle procedural en el shader o más resolución cerca de la cámara.
10. **LOD por muestreo con paso, sin prefiltrado.** Puede haber *popping* al cambiar de nivel; los
    faldones tapan las grietas. No lo evalué a ojo en movimiento: queda para la revisión visual
    del checkpoint 3.
11. **El heightmap bloquea el hilo principal ~1 s en Chrome y ~2 s en Firefox.** En el spike no
    importa; en producción el worldgen corre en el Worker (DEVELOPMENT_PLAN §8).
12. **Medir contra el dev server invalidó dos corridas.** El HMR recargó la página al editar
    código (L-009). Las mediciones finales son todas contra el build.

### Recomendación para el ADR-006
**Se confirma "WebGPU primero + fallback WebGL2"** con `WebGPURenderer` y materiales TSL:
- **WebGPU rinde del orden de 3× más** que WebGL2 en esta escena: a dpr 2 satura cerca de ×8,
  contra ×2–×3. Es el backend que deja lugar para las capas que faltan (agua, ríos, provincias,
  etiquetas);
- **el fallback es real:** automático cuando no hay WebGPU (probado en Firefox 137) y forzable
  con `?backend=webgl2`, que conviene dejar en la app para depurar;
- **un solo código de material** (TSL) corrió sin cambios en los dos backends.

Matices para el ADR:
- **el costo es de fragmentos.** Los presets de calidad (P12) deberían mover la relación de
  píxeles y la cantidad de lecturas del splat. El MSAA parece barato en Apple Silicon;
- **con WebGL2 hay que cuidar el presupuesto.** A dpr 2 queda ~2× de margen a 60 Hz y casi nada a
  120 Hz. Un preset "fallback" con dpr ≤ 1,5 es una mitigación barata;
- **falta Safari (WebGPU) y Firefox ≥ 147.** Si alguno falla con WebGPU, el fallback ya está
  probado; si falla también en WebGL2, es un dato para la matriz de compatibilidad (riesgo R7);
- **no precalentar con `compileAsync` sobre cientos de objetos en WebGL2** (problema 3).

**No recomiendo:**
- **WebGL2 solo.** En esta escena pierde un factor ~3 de rendimiento en Apple Silicon, y cierra
  el camino a compute en GPU (worldgen o simulación, ADR futuro).
- **Escribir WGSL/GLSL a mano.** TSL ya compila a los dos y es lo que mantiene un solo código.

### Qué reutilizar en P1 (propuesta; se decide en el REPORT)
**Sí, como base**, reescrito en su paquete y con sus tests:
- el **enfoque de terreno**:
  - heightmap como textura;
  - una grilla compartida por nivel de LOD;
  - desplazamiento en el vertex shader y normales en el fragment;
  - faldones;
  - esfera envolvente a mano;
  - precalentado con un render sincrónico;
- el **wrap**:
  - chunks reposicionados con `nearestCopyX`;
  - cámara envuelta a [0, ancho);
  - repeticiones de textura que dividen el ancho;
  - plano lejano < medio mundo;
  - `nearestCopyX`, `distanceToChunk` y `lodForDistance` ya tienen tests;
- el **ruido sobre cilindro** con el RNG por streams y `core/math`, como primitiva de un
  heightmap provisorio en `worldgen` hasta el worldgen físico de P3:
  - en el motor tendría que pasar el lint (sin `!`);
  - el hash idéntico en Node, Chrome y Firefox ya es una señal a favor;
- la **instrumentación**:
  - cola de GPU (`gpu-queue.ts`) y estrés `?repeat=N`;
  - recorrido scripteado y reporte JSON;
  - `measure-headless.mjs`;
  - sirve de base para el monitor de fps de desarrollo (P12) y para un bench de render
    repetible.

**No:**
- **las texturas procedurales, la paleta, la exageración y la iluminación manual.** Eran para
  medir; el aspecto lo definen el Design System (P2) y P12;
- **el HUD en DOM crudo, sin i18n**, y el `main.ts` de orquestación;
- **la generación en el hilo principal.**

---

## Spike B · Worker + deltas + rebobinado (P0.14)

| | |
|---|---|
| **Fecha** | 2026-10-16 |
| **Código** | `spikes/worker/` (`@ws/spike-worker`): simulación en `src/sim/`, Worker en `src/worker.ts`, historia en `src/history.ts` |
| **Pregunta** | ¿14.000 años de una simulación con la forma del motor corren en un Worker en ≤ 3 min sin bloquear la UI, con deltas transferibles, keyframes y rebobinado a cualquier año? |
| **Estado** | ✅ Medido en Node, Chromium 156 y Firefox 157 (headless, Playwright, contra el build). WebKit: ver spike C |

### Resumen
- **Cumple con mucho margen:** 14.000 años en **45 s** (Chromium) y **60 s** (Firefox); el hilo
  principal pinta el mapa a 60 fps sin un solo cuadro de más de 25 ms.
- **Rebobinar el mapa es instantáneo** (0,03 ms: keyframe visual + deltas); **reconstruir el
  estado completo** de cualquier año tarda 250–460 ms (keyframe + re-simulación determinista).
- **El tamaño de la historia es el riesgo real:** con keyframes completos cada 100 años, un
  estado mínimo ya ocupa **13 MB** comprimido. El estado del motor real va a ser varias veces
  mayor: el presupuesto de 20 MB del `.wsim` no entra con esa política (ver ADR-008).
- **Buffers de flujo calientes en SoA:** pasar los deltas de población de objetos a arrays
  tipados y el índice provincia → pops de `Map` a CSR bajó el año de 5,3 a 3,4 ms (−35%).

### Qué se hizo
- **Simulación ficticia determinista sobre el `core` real** (`src/sim/`, bajo el lint de
  determinismo):
  - 1.500 provincias en una grilla de 50 × 30 con wrap E-O, 15.000 pops (10 por provincia), 60
    polities iniciales;
  - pipeline del scheduler con contratos: `growth` (fase consumo: crecimiento y asimilación →
    deltas), `conquest` (fase guerra: ataques y secesiones → solicitudes de territorio, crea
    polities), `ledger` (aplica los dos buffers, M1) y `derive` (vistas derivadas, M3);
  - eventos `territory.changed` y `polity.formed` con causas; hash por año = estado + eventos;
  - tests: guard de contratos activo 50 años, determinismo, guardar/cargar → mismos hashes,
    deltas visuales que reconstruyen cada año.
- **Worker por tandas de ~12 ms**: cede el control con un `MessageChannel` propio (sin el mínimo
  de 4 ms del `setTimeout` anidado) y atiende pedidos de rebobinado entre tandas.
- **Deltas visuales** (dueño y cultura mayoritaria por provincia) codificados en `Uint32Array` y
  **transferidos** sin copia, ~4 años por mensaje.
- **Historia en el Worker:** keyframe completo comprimido (fflate, nivel 6) y keyframe visual
  cada 100 años, más los deltas anuales.
- **Página** (`/spikes/worker/`): mapa en canvas 2D, modo político o cultural, línea de tiempo
  para rebobinar, botón de "estado completo al año del cursor", HUD con todas las métricas;
  `?auto=1` corre solo y deja el resultado en `window.__spikeB` (lo lee Playwright).
- **Medición:** `pnpm --filter @ws/spike-worker measure:node [años] [--hash]` y
  `node spikes/worker/scripts/measure-browsers.mjs [años]` (build + `vite preview`, L-009).

### Mediciones (14.000 años, seed 1, M1 Pro)

| Entorno | Total | ms/año prom / p95 | Hilo principal | Mensajes | Rebobinado del mapa | Estado completo a una fecha |
|---|---|---|---|---|---|---|
| Node 24 | 47 s (51,6 s con hash por año) | 3,37 / 3,64 | — | — | — | — |
| Chromium 156 · Worker | **45 s** | 3,17 / 3,40 | 60 fps prom, p5 59,5, 0 cuadros > 25 ms, máx 16,8 ms | 3.505 lotes · 296 KiB | 0,03 ms prom · 0,1 máx | 253 ms prom · 318 máx |
| Firefox 157 · Worker | **60 s** | 4,20 / 5,00 | 60 fps prom, p5 60, 0 cuadros > 25 ms, máx 17,5 ms | 4.704 lotes · 296 KiB | < 0,01 ms | 360 ms prom · 461 máx |

Lecturas:
- hash del estado completo por año: **0,25 ms** (15.000 pops), viable en todos los tests;
- los fps del hilo principal son de headless (reloj virtual de 60 Hz, L-010). Igual, un hilo
  bloqueado se vería como cuadros largos, y no hubo ninguno: la UI no se bloquea.

**Historia:**

| Componente | Tamaño (14.000 años) |
|---|---|
| 140 keyframes completos, comprimidos (deflate 6) | **13,0 MB** (32,5 MB crudos; ~93 KB c/u) |
| 141 keyframes visuales (dueño + cultura) | 1,4 MB crudos |
| Deltas visuales anuales | 0,24 MB |

**Antes / después de la optimización** (Node, 2.000 años): deltas como objetos + índice en `Map`:
5,26 ms/año (p95 6,29) · deltas en SoA + índice CSR: 3,40 ms/año (p95 3,81).

### ¿Cumple el criterio de salida?
Criterio (BRIEF §8): 14.000 años ficticios en ≤ 3 min sin bloquear la UI (60 fps sostenidos).
- **Sí**, en Chromium (45 s) y Firefox (60 s), con el hilo principal a 60 fps y sin cuadros
  largos. Margen ≥ 3× sobre el criterio para esta carga.
- La carga es más liviana que el motor real: el criterio de P1 (≤ 3 min con el mundo real) se
  vuelve a medir con `ws bench` y el escenario del mundo mediano.

### Problemas encontrados
1. **Objetos por delta y `Map` en el camino caliente:** 35% del costo del año. Lección para P1:
   los buffers de flujo calientes van en SoA y los índices derivados densos (CSR), no `Map`.
2. **Keyframes completos cada 100 años no entran en 20 MB** con un estado real (ver arriba y
   ADR-008).
3. **WebKit de Playwright no arranca en macOS 26.0** (L-012): se mide en el CI sobre Linux y en
   Safari a mano.
4. **Medición encadenada con `;`**: un commit con tests rotos llegó al CI (L-013).

### Qué reutilizar en P1 (propuesta; se decide en el REPORT)
**Sí, reescrito en su paquete:**
- el patrón **ledger** con buffers en SoA (deltas de población y solicitudes de territorio con
  prioridad) y el `derive` con índices CSR;
- el **Worker por tandas** con `MessageChannel`, el protocolo de mensajes y los deltas visuales
  en `Uint32Array` transferibles;
- la **historia**: keyframes visuales + deltas para el mapa a la fecha, y "keyframe completo +
  re-simulación" para el estado completo a la fecha;
- `measure-browsers.mjs` como base del E2E de rendimiento.

**No:** la dinámica ficticia (crecimiento, conquista), la página y su HUD.

---

## Spike C · determinismo entre navegadores (P0.15)

| | |
|---|---|
| **Fecha** | 2026-10-16 |
| **Código** | `spikes/determinism/` (`@ws/spike-determinism`): batería en `src/battery.ts`, página en `/spikes/determinism/`, Playwright en `tests/` |
| **Pregunta** | ¿El motor da el mismo hash, año por año, en Chromium, WebKit, Firefox y Node? |
| **Estado** | ✅ Idéntico a Node en 14.000 años en Chromium 156, Firefox 157, WebKit (Linux, CI) y **Safari 26 real** |

### Resumen
- **Idéntico bit a bit** a Node en Chromium y Firefox: los **14.000 hashes anuales** (estado +
  eventos), las **18 funciones** de `core/math` (incluida `Math.sqrt`) sobre 4.096 argumentos
  cada una y 25.600 valores del RNG.
- **No apareció ninguna diferencia** que hubiera que resolver: la matemática propia (ADR-003), el
  RNG por contador (ADR-002) y la serialización little-endian explícita (ADR-004) alcanzan.
- **Integrado al CI:** los 14.000 años en los tres motores en cada PR (~4 min).

### Qué se hizo
- **Batería compartida** (el mismo código en Node y en el navegador):
  - simulación del spike B con hash por año;
  - `mathBattery`: hash de los bits de cada función sobre 4.096 argumentos en dominios amplios
    (exp en ±700, log en 10^±300, sin/cos en ±1e5, pow, atan2, hypot…);
  - `rngBattery`: `uint32` y `uniform` en 4 streams × 100 entidades × 4 años (−12000, −1, 1,
    1900) × 32 pasos.
- **Referencia de Node** generada en el build (`expected.json`, 14.000 hashes, ~500 KB).
- **Página** `/spikes/determinism/`: corre la batería en un Worker y muestra ✅/❌ por función, RNG
  y simulación, con el **primer año distinto** si hubiera divergencia. Es la verificación manual
  en Safari.
- **Playwright** (`pnpm --filter @ws/spike-determinism e2e`): los tres proyectos contra el build;
  `DETERMINISM_YEARS` define el horizonte. Validado con una mutación (un hash alterado en la
  referencia → falla con la función o el año).

### Mediciones

| Motor | Años | Resultado | Tiempo |
|---|---|---|---|
| Node 24 (referencia) | 14.000 | — | 49 s |
| Chromium 156 | 14.000 | ✅ idéntico | 50 s |
| Firefox 157 | 14.000 | ✅ idéntico | 72 s |
| WebKit (Playwright, Linux, CI) | 14.000 por PR | ✅ idéntico | 60 s |
| WebKit (Playwright, macOS 26.0) | — | no arranca (L-012) | — |
| Safari 26 real (M1 Pro, Cristian) | 14.000 | ✅ idéntico (18 funciones, RNG y simulación; final `c8e308dd0de5bf43:4065b21c90819962`) | 53 s |

### ¿Cumple el criterio de salida?
Criterio (BRIEF §8): hash por año idéntico en Chromium, WebKit, Firefox y Node + verificación
manual en Safari.
- **Chromium, Firefox y Node: sí** (14.000 años).
- **WebKit: sí**, en el CI sobre Linux (14.000 años en cada PR).
- **Safari real: sí** (checkpoint 3): idéntico en las 18 funciones, el RNG y los 14.000 años.

### Problemas encontrados
1. WebKit de Playwright 1.64.1 se cae en macOS 26.0 (L-012).
2. Vitest levantaba el spec de Playwright (`tests/`): se acotó a `src/**/*.test.ts`.
3. En un clon limpio `public/` no existía (su único archivo está ignorado): el CI falló hasta que
   el generador crea la carpeta.

### Qué reutilizar en P1
- La **batería de math y RNG** y la comparación por año pasan a ser la suite de determinismo
  permanente (§14.2 del plan: "Chromium/WebKit/Firefox/Node idénticos"), corriendo sobre el
  motor real en lugar de la simulación ficticia.
- El job de CI con horizonte corto por PR y completo por la noche.

---

## Checkpoint 3 · decisiones con datos

### ✅ Confirmar el ADR-006 (WebGPU primero + fallback WebGL2) · aprobado (D43)
Recomendación: **confirmar**. WebGPU da ≥ 4× de margen a dpr 2; el fallback funciona; un solo
código de material (TSL). Falta tu medición en Chrome, Safari y Firefox visibles
(`/spikes/terrain/`, recorrido de 60 s con el botón del HUD).

### ✅ Política de keyframes del `.wsim` (ADR-008) · opción B aprobada (D44)
Recomendación: **B**. En memoria, keyframes completos cada 100 años; en el archivo, cada 1.000
años más el estado final exacto. Mapa a la fecha siempre instantáneo; inspector a la fecha con
resúmenes. Con A (cada 100 años en el archivo) no se cumple el presupuesto de 20 MB.

### ✅ Ajuste de las métricas objetivo de §2 · aprobado (D45)
| Métrica | Objetivo actual | Medido en P0 | Propuesta |
|---|---|---|---|
| Corrida headless completa (mundo mediano) | ≤ 3 min | 45–60 s con la carga ficticia (3,2–4,2 ms/año) | **Mantener** (el mundo real es más pesado: se mide en P1) |
| Costo por año | prom ≤ 10 ms, p95 ≤ 25 ms | andamiaje del core: 2,4 ms/año (año sintético) | **Mantener** |
| Render en vivo | 60 fps prom, p5 ≥ 45 | WebGPU 60 / 59,9 con ≥ 4× de margen; WebGL2 60 / 57 con ~2× | **Mantener**; 120 Hz no es objetivo |
| Memoria del navegador | ≤ 1,5 GB pico | sin presión en P0 (historia 13 MB, terreno 8,5 MB de GPU) | **Mantener** |
| Archivo `.wsim` | ≤ 20 MB comprimido | 13 MB solo en keyframes con un estado mínimo | **Mantener**, con la política B del ADR-008 |
| Determinismo | 100% idéntico en Chromium, WebKit, Firefox y Node | idéntico en los 4 (WebKit en Linux); Safari pendiente | **Mantener**, y sumar **"verificado por año en CI"** |
| Generación de mundo | ≤ 20 s | sin medir (worldgen en P1/P3); heightmap de ruido: 1–2 s | **Mantener** |
| **Nuevo:** rebobinar el mapa | — | 0,03 ms | **≤ 16 ms** (un cuadro) |
| **Nuevo:** estado completo a una fecha (en vivo) | — | 250–460 ms | **≤ 500 ms** con keyframes cada 100 años en memoria |
