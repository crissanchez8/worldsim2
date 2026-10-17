# STATUS — dónde estamos

> Se actualiza al final de **cada** sesión de trabajo (handoff), aunque la fase no termine.
> Una sesión nueva lee esto después de `CLAUDE.md` y retoma desde "Próximo paso".

| | |
|---|---|
| **Última actualización** | 2026-10-17 |
| **Fase actual** | P1 — Rebanada vertical |
| **Estado** | 🟢 P1 en curso · BRIEF aprobado el 2026-10-16 (D48–D54) · rama `phase/p01-rebanada` |
| **Próximo paso** | P1.7 Compartir v1 (link con seed + parámetros + versión del motor; abrir un link simula a máx. con progreso) → checkpoint 3 (recorrido completo). Pendiente de Cristian: medición visible del mapa (checkpoint 1) |
| **Bloqueos** | Ninguno |
| **Repo** | https://github.com/crissanchez8/worldsim2 · `main` con P0 mergeada (PR #1) · producción en https://worldsim2.pages.dev |

## Fases

| Fase | Estado | BRIEF | REPORT | Cierre |
|---|---|---|---|---|
| P0 Fundaciones de arquitectura | ✅ cerrada | [BRIEF](phases/P00/BRIEF.md) | [REPORT](phases/P00/REPORT.md) | 2026-10-16 |
| P1 Rebanada vertical | 🟢 en curso | [BRIEF](phases/P01/BRIEF.md) | — | — |
| P2 Dirección de diseño y DS | ⚪ | — | — | — |
| P3 El planeta físico | ⚪ | — | — | — |
| P4 Gente y sustento | ⚪ | — | — | — |
| P5 Conocimiento | ⚪ | — | — | — |
| P6 Economía | ⚪ | — | — | — |
| P7 Estado y poder | ⚪ | — | — | — |
| P8 Fe | ⚪ | — | — | — |
| P9 Guerra y diplomacia | ⚪ | — | — | — |
| P10 Auge, caída y modernidad | ⚪ | — | — | — |
| P11 Memoria y relato | ⚪ | — | — | — |
| P12 Inmersión visual | ⚪ | — | — | — |
| P13 Publicación | ⚪ | — | — | — |

Leyenda: ⚪ pendiente · 📋 BRIEF en revisión · 🟢 en curso · 🧪 en QA · ✅ cerrada

## Handoff de la última sesión
- **2026-10-17 (sesión P1-2, P1.6 hecha):**
  - **D57:** wireframes aprobados con las 3 recomendaciones (resumen durante la corrida hasta lo visto, ficha = inspector, mundos guardados en "Crear");
  - **UI v1** (`apps/web`), con TanStack Router, zustand, TanStack Virtual y uPlot (versiones con ≥ 2 semanas en el catálogo):
    - **rutas:** `/` crear (los links viejos `/?seed=…` redirigen), `/mundo?…` vivo, `/mundo/resumen` y `/mundo/resumen/$kind/$id`;
    - **crear:** parámetros, generación con progreso por etapa (el mundo pasa a la vista en vivo sin regenerarse), mundos guardados con cargar, exportar, importar `.wsim` y borrar;
    - **vivo:** barra superior (fecha y era, resumen, guardar, exportar, es/en), riel de modos de mapa y leyenda, inspector, y abajo los controles, la línea de tiempo y el teletipo (eventos ≥ 0,3 hasta la fecha; un clic selecciona y centra el mapa);
    - **inspector y ficha** (un solo componente, D57): provincia, asentamiento, estado, personaje, cultura y guerra "a la fecha", más el "¿Por qué?" a pedido (estado exacto en el Worker). La ficha muestra además los eventos de la entidad con sus causas enlazadas;
    - **resumen:** números clave, 3 gráficos (población, cantidad de estados, mayor estado) y listas virtualizadas por tipo, ordenables, hasta lo visto;
    - **atajos:** espacio, ←/→, 1–4, Esc; estados de carga, error y vacío; todo en es/en;
  - **motor:**
    - `explainProvince` / `explainPolity` en sim, atados por un test a las funciones de los sistemas;
    - el Worker manda un **registro de entidades** (nombres, fundación y fin, personas, guerras, títulos) en deltas cada 250 ms y atiende `inspect` con caché del estado reconstruido;
    - en el hilo principal hay un formateador de eventos (plantillas es/en con nombres) y un índice de gobernantes a la fecha (eventos `ruler.succeeded`, D50);
  - **verificación:**
    - tests de sim, history y web;
    - E2E en Chromium y Firefox, 6/6, incluido el recorrido crear → vivo → inspector con porqué → resumen → ficha → en, sin errores de consola y sin regenerar el mundo;
    - capturas `docs/phases/P01/img/p16-*.jpg`;
  - **Δ (para el REPORT):**
    - las columnas del resumen muestran valores a la fecha, no máximos históricos;
    - el botón "Compartir" llega con P1.7;
    - el porqué cubre los stats cuya base no depende del estado del año (rendimientos, alcance agrícola, difusión, fracción urbana base, fuerza, alcance); natalidad y mortalidad quedan fuera, porque su base usa el excedente de alimento del año, que no se guarda;
    - el porqué desde un archivo muestra "calculando…" sin porcentaje;
    - una historia de otra versión no trae registro, así que los nombres caen en "estado 12";
    - la simulación arranca cuando el mundo existe, sin esperar al mapa: un fallo del mapa (sin WebGL) es un aviso y la historia sigue. Lo destapó el E2E en el Firefox del CI, donde el mapa no llegaba al primer cuadro y la simulación nunca arrancaba;
  - **riesgos y hallazgos:**
    - el mapa sigue dibujando debajo del resumen y de las fichas (costo: P1.9);
    - el bundle supera los 500 kB (three + motor: P1.9);
    - en la simulación, durante el año de la sucesión el heredero puede ser el mismo que el titular (se nota en el porqué de un personaje): anotar para P7;
  - LEARNINGS L-024 (`useTranslation` cambia `i18n` al cambiar de idioma: regeneraba el mundo);
  - **próximo:** P1.7 Compartir v1.

- **2026-10-17 (sesión P1-2, después de P1.5):**
  - **D56:** el ritmo de D48 queda como está; el objetivo de 10 ± 1 min se mide después de calibrar la simulación en P4/P5, y en el cierre de P1 ese criterio figura como no cumplido, con su causa;
  - **wireframes 🎨 de P1.6** en `docs/phases/P01/wireframes/` (`index.html` + 4 PNG): crear mundo, vista en vivo, resumen v1 y ficha genérica, de baja fidelidad (se aprueba la estructura, no el aspecto), con el mapa de pantallas y 3 preguntas de estructura (resumen durante la corrida, ficha = inspector, mundos guardados en "crear");
  - **próximo:** el OK de Cristian sobre los wireframes → P1.6 (router, crear, vivo con inspector y teletipo, resumen con listas y gráficos).

- **2026-10-17 (sesión P1-2, P1.5 hecha):**
  - **Worker de simulación** (`apps/web/src/worker/sim-*`):
    - simula por tandas de 16 ms y cede con un `MessageChannel` propio; protocolo tipado; motor `SimEngine` separado del `onmessage` y probado en Node;
    - graba la historia y manda lotes transferibles: `History.viewData` / `drain` / `append`; el hilo principal arma un espejo sin keyframes completos y reproduce desde ahí (D49);
    - estado completo a una fecha y guardado (`.wsim`) a pedido;
  - **reloj por era** (`PlaybackClock`, `PLAYBACK` en `packages/history`): cada año dura 1/ritmo de la era dominante, con transición suave (τ = 3 s) y piso de 15 min (D48); con fechas tipo Tierra da 9,6 min, como la tabla de D01-a;
  - **director:** pausa, 1×, 2×, 4× y máx.; colchón de 500 años por delante; si la reproducción alcanza a la simulación, espera; rebobinar mueve el reloj;
  - **línea de tiempo:**
    - bandas de eras y marcadores de eventos con significancia ≥ 0,8, solo hasta lo ya visto (D49); con 0,6 eran ~9.000 marcas;
    - lo simulado por delante va como franja neutra;
    - se navega con clic, arrastre y ←/→;
  - **mapa en vivo:** relleno político (un color por id de polity) y asentamientos reales por nivel;
  - **mundos guardados** en IndexedDB (bytes del `.wsim` + metadatos): guardar, lista, cargar (`?load=<id>` regenera el mundo y continúa desde el último año) y borrar;
  - **verificación:**
    - tests de historia y de la web;
    - E2E de Playwright (`apps/web/e2e`, Chromium y Firefox, 4/4): reproducción, polities y asentamientos en el mapa, rebobinar con la línea de tiempo, guardar → recargar → cargar → continuar con el mismo hash; en el CI corre en el job `determinism`;
    - en el navegador: el hash del estado en k = 1.500 y el final después de guardar en 1753, recargar y continuar son idénticos a los de Node (`ab57ea65…`, `3b5328aa…`);
    - captura en `docs/phases/P01/img/vivo-p15.jpg`;
  - **`ws health` mide la duración a 1×.** Con 10 seeds la mediana da **13,7 min** (rango 4,0–15,0) y solo 1 de 10 queda en 9–11 min. La causa es la dispersión bimodal de la simulación: 5 seeds llegan a la era moderna hacia el −6000 y tocan el piso de 15 min; una no tiene agricultura hasta el 798 y dura 4 min. La tabla de D48 no lo arregla. **Decisión pendiente** con Cristian; la línea base de salud se regeneró con el campo nuevo (mismos resultados, solo cambian los tiempos);
  - **Δ (para el REPORT):**
    - `PLAYBACK` vive en `packages/history` y no en la config de `apps/web` (D48), para que `ws health` use la misma función;
    - el color político sale del id de polity (el coloreo de grafo es P2.4);
    - la línea de tiempo funcional y neutra ya está en P1.5; su lugar y aspecto los fijan los wireframes de P1.6;
    - una historia cargada arranca en su último año;
    - `dominantEra` se separó de `summarize` (es barata) para medir el ritmo por año;
  - **riesgos:**
    - con un archivo cargado, el estado completo de un año viejo cuesta hasta 999 años de re-simulación (1,5–2,1 s, todavía sin barra de progreso; la necesita el inspector de P1.6);
    - el mapa y el Worker tienen cada uno su copia del mundo (memoria sin medir: P1.9);
    - con el panel oculto del navegador integrado, el mundo chico tardó 70–114 s en cargar (L-019): la verificación visual se hizo con Playwright headless;
  - LEARNINGS L-022 (nombres que difieren solo en mayúsculas) y L-023 (arneses de `postMessage` sin copia);
  - **próximo:** la decisión del ritmo, y P1.6 empezando por los wireframes 🎨 (mock-first).

- **2026-10-16 (sesión P1-2, P1.8 y P1.4 hechas):**
  - **`ws health`** (32ae77f): N seeds en paralelo con invariantes por tick, bandas y ventanas del Apéndice A escaladas por la tierra de cada mundo, reporte MD + HTML en `out/health/`, comparación contra la línea base (`docs/phases/P01/health-baseline.json`, generada con el contenido calibrado `15186f8…`; su etiqueta dice motor 0.1.2 porque la versión se subió después, sin cambios de comportamiento); job `health` en el CI por PR;
  - **calibración v1** (10 seeds del mediano, D55: `cropReach`, invención ∝ área × √densidad): 0 invariantes rotos, 0 hegemones; medianas: agricultura −10.194, primera ciudad −4.218, bronce −3.655, escritura −3.268; 235 M personas en el 1 d.C. (7/10 dentro de la banda); 44 polities activas; `ENGINE_VERSION` 0.1.3;
  - **pendiente de calibración (P4/P5):** la dispersión entre seeds es bimodal (unas despegan temprano: imprenta y pólvora antes de Cristo; otras no llegan) y la población se estanca después del 1500 (366 M en 1900; banda 0,9–2,2 mil M);
  - **historia v1** (`packages/history`): grabador fuera del pipeline (marcos visuales, deltas anuales, series cada 10 años con población en u16 logarítmico y fracción urbana en u8, agregados por año, eventos, keyframes completos cada 100 años en memoria); consultas `mapAt`, `seriesAt`, `provinceAt`, `polityAt`, `eventsBetween` y `fullStateAt` (keyframe + re-simulación, hash idéntico al real); codec `.wsim` v0 (META, VKEY, DELT, SERI en diferencias zigzag, AGGR, EVNT, KEYF cada 1.000 años, FINL) con `inspectWsim`; continuar desde FINL a mitad de corrida da el mismo hash;
  - **medición en el mediano** (`ws run --wsim`, detalle en ADR-008): `.wsim` de **5,69 MB** para 13.900 años (presupuesto 20); mapa a la fecha ≤ 0,1 ms; estado completo en vivo 167 ms en promedio y 278 ms como máximo (presupuesto 500); desde el archivo 1,5–2,1 s (con progreso, D01-c); grabar 0,4 ms/año;
  - **Δ (para el REPORT):** sin bloque INDX (el archivo se carga entero; índice de la enciclopedia en P11); eventos por año, no por siglo; guardar en IndexedDB y el E2E de "cargar a mitad de corrida" van con el Worker en P1.5; las latencias se miden en `ws run --wsim`, no en los tests (frágiles en paralelo); el titular de un título a la fecha sale de los eventos `ruler.succeeded` cuando lo pida el inspector (P1.6);
  - **riesgos:** EVNT pesa 1,7 MB con 51.508 eventos (~33 B por evento; el codec escribe tipo y datos como texto) y crece con cada fase; los keyframes en memoria suman 13,5 MB;
  - **P1.2 (mapa v1) mergeada** en la rama de fase con el OK de Cristian (rama `claude/eager-lamport-065b7b`, handoff abajo); conflictos solo en LEARNINGS y STATUS (se conservaron los dos lados); falta la medición de Cristian en un navegador visible (checkpoint 1, `docs/phases/P01/mapa.md` §8);
  - **próximo:** P1.5 Tiempo y director v1 (Worker de simulación por tandas, velocidades, ritmo por era, guardar en IndexedDB).

- **2026-10-16 (sesión paralela P1.2, mapa v1 hecho):**
  - **rama `claude/eager-lamport-065b7b`** (cortada de `phase/p01-rebanada` en 115306d), sin push; mergeada en la rama de fase el 2026-10-16 con el OK de Cristian;
  - **qué se hizo:**
    - Worker de worldgen + cliente tipado en `apps/web/src/worker`;
    - mapa en `apps/web/src/map`: WebGPU/TSL con fallback WebGL2, terreno por chunks con LOD y wrap, agua con lagos, ríos por caudal, relleno y fronteras por provincia, zoom semántico v0, marcadores instanciados, picking en CPU;
    - UI neutra con `?seed=` y `?size=` y claves i18n solo bajo `map.`;
    - 53 tests validados con 13 mutaciones;
  - **mediciones** en `docs/phases/P01/mapa.md` (mediano, dpr 2, headless):
    - primer cuadro: Chrome WebGPU 4,3–4,7 s, WebGL2 4,5–5,3 s, Firefox 137 WebGL2 7,3–7,6 s (el worldgen es el 85–90 %);
    - sin congelamientos después de la carga;
    - recorrido: Chrome 60 fps con la cola en 1; Firefox 59,3 fps (p5 57,1);
    - margen: WebGPU ×8, WebGL2 ×3;
  - LEARNINGS L-018 a L-021 (L-017 es de la sesión principal);
  - **falta:** las mediciones visibles de Cristian para el checkpoint 1 (instrucciones en `mapa.md` §8);
  - **ojo** (resuelto en el merge): los tests de `tools/determinism` y `tools/cli` que generan mundos ya tienen timeouts explícitos (L-017, promovida a CLAUDE.md).

- **2026-10-16 (sesión P1-2, P1.3 hecha):**
  - **idioma v1** (`packages/lang`, 03b4084): fonología por seed y nombres romanizados;
  - **guard de contratos por filas comunes** (`core`, 77f9ad7): un campo cambió solo si cambió en una fila que existía antes y después; habilita la propiedad por campo del modelo (p. ej. `Title.holder` de succession en filas que crea statecraft);
  - **simulación v1** (4d9722a): estado de P1, culturas placeholder con idiomas y 9 sistemas con contrato (production, demography, knowledge, characters, succession, statecraft, diplomacy, military, settlements) + ledger + derive; 17 tipos de evento con plantillas es/en; contenido de 14 innovaciones, 5 eras y niveles de asentamiento;
  - calibración v1 en el mediano (3 seeds): hierro hacia el 1 d.C., 128–350 M personas, urbanización 3,8–7,9 %, 49–75 polities en el 1 d.C.; 1,5–2,1 ms/año (presupuesto 10);
  - **determinismo con el motor real:** Chromium y Firefox idénticos a Node en 13.900 años; la corrida completa tarda ~2 min en Node y ~3 en cada navegador, así que en los PR el CI corre 3.000 años y la completa queda para `main` y el cron;
  - **Δ (para el REPORT y `model.md` v1.1):** `Province.cropShare` en lugar de `landUse` ×5; `Title.heir` (characters); batallas, tratados e invenciones solo como eventos (M2); guerra activa en `war` (diplomacy) + `front` (military) en lugar de `WarSide`; efectos de innovaciones como datos sobre el bitset (no como filas de `Modifier`); invención ∝ población (no ∝ provincia) y difusión ponderada por días; `chronicle` pasa a P1.4;
  - **riesgos anotados:** al 1900 el estado pesa 1,3 MB y su hash cuesta ~26 ms (nombres y personas): pesa en los keyframes (P1.4) y en el hash por año; la dispersión entre seeds es grande (la calibración fina es P1.8); el mundo chico corre más rápido que el mediano (los requisitos de asentamiento dependen de la resolución);
  - LEARNINGS L-017 (timeouts de tests pesados bajo `pnpm check`);
  - **próximo:** `ws health` (P1.8) para calibrar con 10 seeds, después historia (P1.4). El checkpoint 2 necesita además el mapa político (P1.2).

- **2026-10-16 (sesión P1-2, P1.1 hecha):**
  - **worldgen v1** en `packages/worldgen` (commit ed81874): placas sobre el cilindro + ruido (reescrito del spike A), nivel del mar por percentil, erosión térmica; clima con humedad advectada y sombra orográfica; 9 biomas en contenido; priority-flood con lagos y caudal; provincias Poisson + Dijkstra con fusión de diminutas; zonas marítimas; grafo con estrechos; `WorldStatic` v1 con hash y validación;
  - mediano en **3,64 s** en Node (`ws bench`, métrica `worldgen.medium`; presupuesto 20 s); 1.501 provincias, tierra 0,299 para 0,30;
  - calibración v1: hundimiento polar (el cilindro sobrerrepresenta los polos), lagos solo con más de 150 m de relleno (sin erosión hidráulica sobraban); el clima fino es P3;
  - suite de determinismo sobre el mundo chico real, generado en el Worker de la página (Chromium y Firefox idénticos a Node); `ENGINE_VERSION` 0.1.1;
  - `ws run` genera mundos reales (`--size`, `--map`, `--land`; `--grid` para la grilla de prueba);
  - LEARNINGS L-016 (`Stream.sub` reemplaza, no anida);
  - **Δ:** el host del Worker de worldgen en `apps/web` va con P1.2 (lo consume el mapa); en P1.1 el worldgen corre en un Worker en la página de determinismo;
  - **próximo:** P1.3 acá; P1.2 en una sesión paralela que toca solo `apps/web` (propuesta como tarjeta).

- **2026-10-16 (sesión P1-2, P1.0 bases):**
  - BRIEF aprobado tal cual (D48–D54) y registrado; rama `phase/p01-rebanada`;
  - **P1.0 hecha** (commits en la rama):
    - `core/scheduler`: `SoaBuffer` (columnas tipadas, `reserve`/`append`/`clear`; `append` nunca reasigna, L-007); bench 30.000 deltas: SoA 0,40 ms vs objetos 0,55 ms;
    - `@ws/content`: tablas con zod, índice = enum del estado, hash de contenido (golden `5f7ebcad944a9320`); tablas `worldSize`, `mapType`, `stratum`, `law`; nombres es/en exigidos por test;
    - `@ws/worldgen`: contrato `WorldStatic` v0 (provincias SoA, grafo CSR en días/km, hash, validación) + mundo de grilla para tests;
    - `@ws/sim`: estado (world, province, pop, polity), `Sim.create/load/step`, snapshot versionado por motor + contenido + hash del mundo; `ledger` (M1) con contabilidad por causa, escalado de excesos, fusión de pops < 1 persona y territorio por prioridad; `derive` con CSR; invariantes I2–I6 e I10 por tick; tests con carga de prueba de 300 años con guard, guardar/cargar idéntico, propiedades y mutaciones;
    - `ws run` (hashes por año y resumen); `ENGINE_VERSION` 0.1.0;
    - `tools/determinism` reemplaza al spike C en el job `determinism` (contenido, mundo, math, RNG y hash por año de la sim real; Chromium y Firefox idénticos a Node localmente; página para Safari en `/tools/determinism/`);
  - **Δ respecto del BRIEF (técnicos, informar en el REPORT):** las tablas de contenido y los campos de cada entidad se crean con el sistema que los usa (P1.1/P1.3), no todos en P1.0; el escenario de la suite de determinismo es la grilla hasta P1.1, y con solo ledger + derive el hash por año todavía cubre poco (crece con cada sistema);
  - LEARNINGS L-015 (`not.toThrow(Clase)` pasa con otro error);
  - verificado en un clon limpio: `pnpm install --frozen-lockfile` + build + tests;
  - **próximo:** P1.1 Worldgen v1 en el Worker de worldgen; al fijar `WorldStatic`, proponer la sesión paralela de P1.2 (mapa).

- **2026-10-16 (sesión P1-1, apertura de P1):**
  - leídos los docs de arranque del prompt de P1, `packages/core`, los tres spikes y el CI; confirmado en STATUS y `decisions.md` que P0 está ✅ cerrada (OK registrado, PR #1 mergeado);
  - **`docs/phases/P01/BRIEF.md` escrito y presentado** (📋 en revisión):
    - tareas P1.0–P1.10 refinadas con el estado real; Δ: suite de determinismo en `tools/determinism`, guardar = bytes del `.wsim`, tarea de cierre P1.10;
    - 🔶 D01-a ritmo por era (era dominante + piso de duración); D01-b simulación adelantada con colchón (nueva); D01-c resúmenes mínimos + registros permanentes; D01-d ítems límite del alcance; D01-e borrar `spikes/` al cerrar P1;
  - **inconsistencia a resolver con Cristian:** el prompt pide reclamos en el ledger de P1, pero en P1 no hay productores y `Claim` es de P7 → propuesta: diferirlos a P7 (D01-d, pregunta 2);
  - sin código ni commits: el BRIEF y este STATUS quedan sin commitear hasta la aprobación (van a la rama `phase/p01-rebanada`);
  - **próximo:** respuesta de Cristian → registrar la aprobación (D# nuevas) → rama de fase → P1.0.

- **2026-10-16 (cierre de P0):**
  - OK de cierre de Cristian registrado en `decisions.md`; REPORT y BRIEF marcados como cerrados;
  - PR #1 mergeado a `main` con merge commit; desde `main` corren el deploy de producción y el job nocturno de determinismo;
  - **próximo:** abrir P1 en una sesión nueva con `docs/prompts/P01-rebanada-vertical.md`.

- **2026-10-16 (sesión P0-9):**
  - Safari sin modo de bajo consumo: 60,0 fps → spike A cumple en los tres navegadores;
  - D46: prueba del README en clon nuevo diferida a P13; D47: promoción de spikes aprobada (§9 del REPORT);
  - REPORT de P0 final y prompt de P1 refrescado; solo falta el OK de cierre y el merge.

- **2026-10-16 (sesión P0-8):**
  - mediciones de Cristian registradas: Chrome visible 118,8 fps (120 Hz) ✅; Safari 29,9 fps con la GPU al 30% (tope de 30 Hz del sistema, probable modo de bajo consumo) → repetir; Firefox p5 107 con un congelamiento de 8 s → repetir y anotar backend;
  - **spike C completo:** Safari 26 real idéntico a Node en los 14.000 años;
  - CI completo en verde (check + determinism 14.000 años + deploy).

- **2026-10-16 (sesión P0-7):**
  - checkpoint 3: Cristian aprobó ADR-006 (D43), opción B de keyframes del ADR-008 (D44) y las métricas de §2 + 2 nuevas (D45); plan a v1.1;
  - CI: el job `determinism` corre 14.000 años en Chromium, Firefox y WebKit (Linux) en ~4 min, todo idéntico a Node; el bench del CI compara contra una base del propio runner (`bench-baseline-ci.json`);
  - `REPORT.md` de P0 en borrador (faltan las mediciones manuales y la decisión de promoción de spikes).

- **2026-10-16 (sesión P0-6):**
  - spike A integrado (merge de la sesión paralela; LEARNINGS renumeradas);
  - **spike B** (`spikes/worker`): 14.000 años en 45 s (Chromium) y 60 s (Firefox) en un Worker, UI a 60 fps; rebobinado del mapa 0,03 ms, estado completo a una fecha 250–460 ms; keyframes cada 100 años = 13 MB con un estado mínimo → ADR-008 propone keyframes cada 1.000 años en el archivo;
  - **spike C** (`spikes/determinism`): idéntico a Node en Chromium y Firefox (14.000 años, 18 funciones de math, RNG) y en WebKit sobre Linux en el CI; job `determinism` por PR; Safari pendiente;
  - **P0.17** `ws bench` con línea base del M1 Pro y chequeo de regresión normalizado en el CI;
  - ADR-005…008 escritos (006 y 008 propuestos, esperan el checkpoint 3);
  - `CLAUDE.md` con comandos reales; LEARNINGS L-012 (WebKit de Playwright en macOS 26.0), L-013 (promovida a CLAUDE.md), L-014.

- **2026-10-15 (sesión P0-5):**
  - `model.md` v1.0 **aprobado** con M1–M8 (D42);
  - **bloque 4 hecho** en `packages/core` (244 tests):
    - P0.8 `events`: registro con clave i18n, umbral y significancia; bus con ids desde el estado, validación de causas, contrato del emisor; codec y `hashEvents`;
    - P0.9 `modifiers`: stats con forma de agregación, dueño por fila, vencimiento, `explain()`, resultado independiente del orden de alta;
    - P0.10 `time` (calendario sin año 0) + `scheduler` (14 fases, cadencias, escritor único estático, buffers, guard por huella de campo);
    - `@ws/i18n`: `formatYear` / `formatNumber` (es/en);
  - tests débiles detectados con mutación y corregidos (L-004 ampliada); L-011 (resúmenes con grep);
  - la sesión del spike A sigue trabajando en `p00-spike-terrain`.

- **2026-10-15 (sesión P0-4):**
  - primer deploy a Cloudflare OK (preview comentado en el PR #1 por el CI); el certificado TLS del subdominio de rama todavía estaba en emisión;
  - `docs/model.md` 1.0-rc escrito (≈980 líneas): entidades, dueños, pipeline, buffers, 25 contratos, invariantes, eventos, decisiones M1–M8;
  - nuevos respecto del plan: sistemas `ledger` (M1) y `factions` (M5), `Person`/`CharacterDetail` (M6), costo en `days` (M7);
  - `UNITS` alineado con el glosario + test doc↔código;
  - spike A delegado a la sesión `spike-terrain` (worktree, rama `p00-spike-terrain`, sin PR propio).

- **2026-10-15 (sesión P0-3):**
  - **bloque 2 hecho** en `packages/core` (205 tests):
    - hash: XXH32 propio (vectores de referencia) y `hash64` = 2×XXH32;
    - P0.4 RNG por contador (`rng.stream().sub().at(entidad, año)`), registro único de streams, tests estadísticos;
    - P0.5 `core/math`: port de fdlibm, ≤ 2,2 ulp vs V8, 107 vectores golden bit a bit;
    - P0.6 almacenes: `Table` SoA, `SparseTable`, `Globals`, ids nunca reutilizados, unidades obligatorias;
    - P0.7 snapshot `WSST` + `hashState` sobre los bytes serializados; 15.000 pops: serializar 0,8 ms, hash < 1 ms;
  - ADR-001 a ADR-004 escritos con mediciones; decisiones D38–D41;
  - bugs encontrados y corregidos: crecimiento del buffer del serializador (L-007), reemplazo por script que no se aplicó (L-008);
  - XXH64 descartado con datos (50 MB/s vs 3,3 GB/s);
  - **pendiente:** confirmar el primer preview de Cloudflare en el PR #1 (los secretos ya están) y la prueba del README.

- **2026-10-15 (sesión P0-2):**
  - BRIEF aprobado tal cual (D30–D37) y registrado;
  - repo público creado; `main` tiene solo los docs; todo lo demás va por la rama de fase y el PR #1 (draft);
  - **bloque 1 hecho:** P0.1 (README, commitlint con tarea obligatoria, husky, plantilla de PR), P0.2 (monorepo, paquetes, `apps/web` con toggle es/en, `ws --version`), P0.3 (lint de determinismo con allowlist de `Math`, texto de UI, fronteras con dependency-cruiser; 119 tests del lint, validados con mutación), P0.16 (workflow `CI`: check + deploy a Cloudflare Pages por direct upload);
  - TypeScript fijado en 6.0.3 (typescript-eslint no soporta TS 7; L-005);
  - LEARNINGS L-004 (test autorreferencial), L-005, L-006 (loop de i18n en la placeholder, detectado en el navegador);
  - **falta para cerrar el checkpoint 1:** CI verde en GitHub, secretos de Cloudflare, primer preview, protección de `main` (PR + check `check` obligatorios, sin aprobación obligatoria), prueba del README por Cristian.

- **2026-10-14 (sesión P0-1):**
  - leídos todos los docs de arranque; plan v1.0 confirmado;
  - Q1–Q4 resueltas (D26–D29): Cloudflare Pages, repo público, cuenta `crissanchez8`, MIT;
  - límites gratuitos verificados en docs oficiales (Cloudflare Pages, GitHub Pages, Actions) y soporte WebGPU en macOS (Firefox ≥ 147);
  - `docs/phases/P00/BRIEF.md` escrito y presentado. Sin código todavía.

- **2026-10-14:**
  - entrevista inicial y análisis del proyecto anterior;
  - `DEVELOPMENT_PLAN.md` v0.2 con subtareas por fase;
  - contrato de trabajo (§15) y `CLAUDE.md`;
  - `decisions.md` (D1–D25), `LEARNINGS.md` con herencia del proyecto anterior;
  - plantillas BRIEF/REPORT/ADR;
  - prompts P0–P13.

  Plan aprobado como v1.0. No hay código todavía.

## Decisiones pendientes
- Ninguna. BRIEF de P1 aprobado tal cual (D48–D54). La sesión paralela para P1.2 (mapa) se propone cuando P1.1 fije `WorldStatic`.
