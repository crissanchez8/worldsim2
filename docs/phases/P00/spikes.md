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

### ¿Cumple el criterio de salida?
Criterio (BRIEF §8): ≥ 60 fps promedio en M1 Pro con heightmap 2048×1024 + wrap; fallback WebGL2
funcional.

- **WebGPU: sí.**
  - 60 fps promedio en dpr 1 y dpr 2; p5 ≥ 59,5 (el plan pide p5 ≥ 45);
  - margen medido por estrés: ≥ 4× sin perder cuadros; satura cerca de ×8.
- **Fallback WebGL2: sí.**
  - forzado en Chrome y automático en Firefox 137;
  - 60 fps promedio en dpr 1 y 2, con ~2× de margen.
- **Pendiente para cerrarlo del todo:** Chrome, Safari y Firefox **visibles** en el M1 Pro
  (checkpoint 3). Headless no mide la presentación real ni el refresco de 120 Hz.
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
