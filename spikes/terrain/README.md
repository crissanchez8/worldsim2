# Spike A · terreno (P0.13)

Experimento **descartable** (D33). Mide si un terreno de **2048×1024** por chunks con LOD, con
**wrap este-oeste** sin costura y un splat de 3 texturas, llega a **60 fps** en M-series con el
`WebGPURenderer` de Three.js, y si el **fallback WebGL2** funciona. Conclusiones y mediciones:
[`docs/phases/P00/spikes.md`](../../docs/phases/P00/spikes.md), sección "Spike A".

## Correr

```bash
pnpm --filter @ws/spike-terrain dev
```

Abrí <http://localhost:5174/spikes/terrain/> (con el puerto que indique Vite). En el preview de
Cloudflare queda en `/spikes/terrain/`.

Para medir, mejor el build de producción (sin HMR, que recarga la página si cambia un archivo):

```bash
pnpm --filter @ws/spike-terrain build
```

```bash
pnpm --filter @ws/spike-terrain preview --port 4174
```

y abrí <http://localhost:4174/spikes/terrain/>.

Sin ventana visible (por ejemplo, desde una sesión de Claude Code), el recorrido se puede correr en
Chrome headless con `node spikes/terrain/scripts/measure-headless.mjs <url>`. Headless topea los
fps en 60 (reloj virtual): ahí manda el tiempo de GPU y los cuadros en vuelo.

## Parámetros de URL

| Parámetro | Efecto | Default |
|---|---|---|
| `backend=webgl2` | Fuerza el fallback WebGL2 | WebGPU si está disponible |
| `dpr=1` / `dpr=2` | Relación de píxeles del canvas | la del dispositivo (máx. 2) |
| `aa=0` | Sin MSAA 4× | con MSAA |
| `gpu=0` | Sin timestamp queries (tiempo de GPU) | con timestamps si hay soporte |
| `lod=0` | Fuerza un nivel de LOD en todos los chunks (0 = peor caso) | por distancia |
| `lodDist=160` | Distancia base del LOD, en celdas | 160 |
| `repeat=3` | Estrés: dibuja la escena N veces por cuadro (margen de GPU sin depender del vsync) | 1 |
| `warmup=0` | No precalienta pipelines en la carga (aísla su costo) | precalienta |
| `autostart=1` | Arranca el recorrido apenas termina el calentamiento | manual |
| `duration=60` | Duración del recorrido, en s | 60 |
| `seed=1` | Seed del heightmap y las texturas | 1 |
| `x`, `z`, `dist`, `yaw` | Pose inicial de la cámara (celdas, celdas, celdas, rad) | x = 1848, z = 512 |

Controles: arrastrar para mover, rueda para zoom, WASD/flechas para mover, Q/E para girar.

## Qué muestra el HUD

- backend activo (WebGPU, WebGL2 forzado o WebGL2 por fallback), seed y **hash del heightmap**
  (tiene que dar `0fc08e0e41c36265` con `seed=1` en todo navegador: es el mismo que verifica el
  test en Node);
- tiempos de carga: init del renderer, generación del heightmap, texturas, subida + compilación
  de pipelines + primer cuadro;
- memoria GPU: la que cuenta `renderer.info.memory` de three (incluye los render targets) y la
  estimada del terreno y el framebuffer;
- en vivo: fps, tiempo de cuadro, CPU y GPU por cuadro, draw calls, triángulos, chunks por LOD
  y **cuadros en vuelo en la GPU** (enviados y sin terminar: si crece, la GPU no da abasto aunque
  el contador de fps diga 60);
- al terminar el recorrido de 60 s: fps promedio, p5 y p1, tiempos de cuadro, tirones > 25 ms,
  CPU y GPU promedio y p95, cuadros en vuelo promedio y máximo. **Copiar JSON** copia el reporte
  completo (también queda en `window.__terrainSpike`).

## Medición manual (checkpoint 3, M1 Pro)

0. **Actualizá Firefox:** el instalado es la 137 y WebGPU en macOS llegó en la 147. Con la 137 el
   spike cae solo a WebGL2 (sirve para ver el fallback, no para medir WebGPU). Safari 26 ya trae
   WebGPU.
1. Cerrá las demás pestañas y apps pesadas; enchufá la notebook (sin modo de bajo consumo).
2. Abrí el preview en pantalla completa en la pantalla de la notebook.
3. En cada navegador (Chrome, Safari, Firefox):
   1. `…/spikes/terrain/` → esperá a que se habilite **Iniciar recorrido**, apretalo y no toques
      nada durante 60 s;
   2. `…/spikes/terrain/?backend=webgl2` → lo mismo;
   3. (opcional, margen) `…/spikes/terrain/?repeat=4`: dibuja la escena 4 veces por cuadro; si
      sigue en el refresco de la pantalla, hay al menos 4× de margen;
   4. (opcional, peor caso) `…/spikes/terrain/?lod=0`.
4. Después de cada corrida, **Copiar JSON** y pegalo (o anotá la línea RESULTADO) en
   `docs/phases/P00/spikes.md`.
5. Anotá también si el hash del HUD coincide con `0fc08e0e41c36265` y si ves la costura al
   cruzar x = 0 (no debería verse), *popping* de LOD o grietas entre chunks.

El recorrido cruza la costura del wrap dos veces, alterna cerca y lejos (cambios de LOD) y
recorre latitudes. Si la notebook está en 120 Hz (ProMotion), el techo de fps es 120.
