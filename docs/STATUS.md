# STATUS — dónde estamos

> Se actualiza al final de **cada** sesión de trabajo (handoff), aunque la fase no termine.
> Una sesión nueva lee esto después de `CLAUDE.md` y retoma desde "Próximo paso".

| | |
|---|---|
| **Última actualización** | 2026-10-16 |
| **Fase actual** | P1 — Rebanada vertical |
| **Estado** | 🟢 P1 en curso · BRIEF aprobado el 2026-10-16 (D48–D54) · rama `phase/p01-rebanada` |
| **Próximo paso** | Terminar P1.1 (ws run con mundos reales, bench de worldgen, L-016) y pasar a P1.2 |
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
- **2026-10-16 (sesión P1-2, P1.1 en curso; se cortó por límite de uso):**
  - **hecho (commit ed81874):** worldgen v1 completo en `packages/worldgen` (placas, relieve, erosión, clima, hidrología, 9 biomas en contenido, provincias, zonas marítimas, grafo con estrechos); `WorldStatic` v1; mediano en ~3,9 s en Node; tests validados con mutaciones; suite de determinismo sobre el mundo chico real (Chromium y Firefox idénticos a Node); `ENGINE_VERSION` 0.1.1;
  - **falta de P1.1:**
    - `ws run` con `--size/--map/--land` (hoy solo grilla);
    - tiempo de worldgen en `ws bench` (`worldgenSeconds`);
    - LEARNINGS L-016: `Stream.sub` REEMPLAZA el sub-stream, no anida (casi hace que provincias y mares compartieran azar);
    - el host del Worker de worldgen en `apps/web` va con P1.2;
  - **próximo:** cerrar lo que falta de P1.1, pushear y proponer la sesión paralela de P1.2 (mapa) sobre `WorldStatic` v1.

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
