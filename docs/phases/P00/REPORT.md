# REPORT — P00 · Fundaciones de arquitectura

| | |
|---|---|
| **Fecha de cierre** | 2026-10-16 |
| **Estado** | ✅ Cerrada el 2026-10-16 (OK de Cristian en `decisions.md`) |
| **BRIEF** | [`docs/phases/P00/BRIEF.md`](BRIEF.md) (aprobado el 2026-10-15, D30–D37) |
| **PR / rama** | [crissanchez8/worldsim2#1](https://github.com/crissanchez8/worldsim2/pull/1) · `phase/p00-fundaciones` |
| **Preview** | https://phase-p00-fundaciones.worldsim2.pages.dev · spikes en `/spikes/terrain/`, `/spikes/worker/`, `/spikes/determinism/` |

## 1. Resumen
La casa está construida y vacía, como pedía el objetivo:
- **Repo y tooling:** repo público, monorepo pnpm + Turborepo y CI/CD gratis, con preview por PR. El lint hace cumplir el determinismo, las fronteras entre paquetes y la regla de cero texto suelto en la UI.
- **Primitivas del motor:** `packages/core` tiene las 7, con 244 tests: RNG por contador, matemática determinista, almacenes SoA, serialización + hash, eventos, modificadores, calendario + scheduler con guard de contratos.
- **Modelo de dominio:** `docs/model.md` v1.0 quedó aprobado (D42).
- **Riesgos técnicos:** los tres grandes se despejaron con spikes medidos.
  - El terreno con WebGPU da 60 fps con ≥ 4× de margen.
  - 14.000 años corren en un Worker en 45–60 s sin bloquear la UI.
  - El hash por año es idéntico en Chromium, Firefox, WebKit (Linux) y Node.
- **Lo que aprendimos con datos:** la historia es el recurso escaso (ADR-008), y los buffers calientes conviene tenerlos en SoA.

## 2. Tareas
| Tarea | Estado | Notas |
|---|---|---|
| P0.1 Repo y convenciones | ✅ | README, commitlint con tarea obligatoria, husky, plantilla de PR con la DoD, `main` protegida |
| P0.2 Monorepo | ✅ | 9 paquetes + `apps/web` (toggle es/en) + `tools/cli` + `tools/lint`; Δ: sin project references (ADR-001) |
| P0.3 Lint de determinismo y estilo | ✅ | Allowlist de `Math`; 120 tests que exigen que cada API prohibida falle (validados con mutación); fronteras con dependency-cruiser |
| P0.4 `core/rng` | ✅ | XXH32 de 6 palabras, dos carriles, registro de streams; tests estadísticos |
| P0.5 `core/math` | ✅ | Port de fdlibm, ≤ 2,2 ulp vs V8, 107 vectores golden |
| P0.6 `core/store` | ✅ | `Table` SoA, `SparseTable`, `Globals`; ids nunca reutilizados; unidad obligatoria |
| P0.7 `core/serialize` + hash | ✅ | Snapshot `WSST`; hash = 2×XXH32 de los bytes (Δ vs XXH64, D41); copia en bloque |
| P0.8 `core/events` | ✅ | Registro con clave i18n, umbral y significancia; causas validadas; codec y hash |
| P0.9 `core/modifiers` | ✅ | Stats con forma de agregación, dueño por fila, `explain()`; Δ: orden por contenido |
| P0.10 `core/time` + scheduler | ✅ | Calendario sin año 0; 14 fases; escritor único estático; buffers; guard por huella de campo |
| P0.11 `docs/model.md` | ✅ | v1.0 aprobado con M1–M8 (D42) |
| P0.12 ADRs | ✅ | ADR-001…008 (006 y 008 aceptados en el checkpoint 3: D43, D44) |
| P0.13 Spike A — terreno | ✅ | Visibles: Chrome 118,8 fps (120 Hz), Safari 60,0 fps, Firefox 86,5 fps (p5 107; un congelamiento de 8 s queda como riesgo para P1.2) |
| P0.14 Spike B — Worker | ✅ | 45 s (Chromium), 60 s (Firefox) para 14.000 años |
| P0.15 Spike C — determinismo | ✅ | Idéntico a Node en Chromium, Firefox, WebKit (Linux, CI) y **Safari 26 real** (14.000 años) |
| P0.16 CI/CD | ✅ | `check` + `determinism` (14.000 años, 3 motores, ~4 min) + `deploy` por direct upload |
| P0.17 Bench | ✅ | `ws bench`; base del M1 Pro + base del runner del CI; Δ: dos bases |
| P0.18 Documentación de trabajo | ✅ | `CLAUDE.md` con comandos, STATUS, LEARNINGS al día, prompt de P1 refrescado; plantillas revisadas sin cambios |

## 3. Desvíos respecto del BRIEF
| Desvío | Por qué | Quién lo decidió |
|---|---|---|
| TypeScript 6.0.3 en lugar de 7 | typescript-eslint no soporta TS 7 | D38 (técnica, informada) |
| Sin project references | Paquetes internos con `exports` a TS fuente; typecheck por paquete | ADR-001 |
| Hash de estado 2×XXH32 en lugar de XXH64 | XXH64 sin BigInt medía 50 MB/s contra 3,3 GB/s | D41 (lo preveía el BRIEF) |
| Orden de aplicación de modificadores por contenido | Independencia del orden de alta bit a bit | Ajuste de `model.md` §5.12 (informado) |
| Spike A en una sesión paralela | Pedido explícito de Cristian ("en paralelo") | Cristian |
| WebKit probado en Linux (CI), no en macOS | WebKit de Playwright 1.64.1 se cae en macOS 26.0 (L-012) | Técnica, informada |
| Determinismo de 14.000 años en cada PR (no solo nocturno) | Los tres motores en paralelo entran en ~4 min (< 5 min del BRIEF) | Técnica |
| Bench del CI contra una base del runner | La base del M1 Pro daba falsos positivos en operaciones de memoria | Técnica, informada |
| Keyframes del archivo cada 1.000 años | Spike B: cada 100 años no entra en 20 MB | D44 (Cristian) |
| Prueba del README en clon nuevo diferida a P13 | Repo público pero no compartido todavía | D46 (Cristian) |

## 4. Decisiones tomadas en la fase
| # | Decisión |
|---|---|
| D26–D29 | Q1 Cloudflare Pages · Q2 repo público · Q3 cuenta personal · Q4 MIT |
| D30–D37 | BRIEF: i18next, direct upload, Node 24, `spikes/`, dependency-cruiser, S2, S4, nombre del repo |
| D38 | TypeScript 6.0.3 |
| D39–D41 | RNG por contador · `core/math` (fdlibm) · almacenes, snapshot y hash 2×XXH32 |
| D42 | `model.md` v1.0 con M1–M8 |
| D43 | ADR-006 confirmado (WebGPU primero + fallback WebGL2) |
| D44 | ADR-008 opción B (keyframes del archivo cada 1.000 años + estado final) |
| D45 | Métricas de §2 mantenidas + rebobinar ≤ 16 ms + estado completo a una fecha ≤ 500 ms |
| D46 | Prueba del README en clon nuevo diferida a P13 |
| D47 | Promoción de spikes aprobada como se recomendó (§9) |

## 5. Métricas
| Métrica | Antes | Después | Objetivo |
|---|---|---|---|
| Tests (cantidad / verdes) | 0 | 404 unitarios + 3 Playwright / todos verdes | — |
| ms por año (prom. / p95) | — | Año sintético del core: 2,38 / 2,75 · spike B: 3,2 / 3,4 (Chromium) | ≤ 10 / ≤ 25 (con el mundo real, P1) |
| Corrida de 14.000 años | — | 45 s (Chromium) · 60 s (Firefox) · 47 s (Node) con la carga ficticia | ≤ 3 min |
| Generación de mundo | — | No aplica (P1); heightmap de ruido 2048×1024: 1–2 s | ≤ 20 s |
| fps (prom. / p5) | — | Visibles: Chrome 118,8 / 107,5 · Safari 60,0 / 55,6 · Firefox 86,5 / 107,3 · headless: WebGPU ≥ 4× de margen, WebGL2 ~2× | 60 / ≥ 45 |
| Rebobinar el mapa | — | 0,03 ms | ≤ 16 ms (D45) |
| Estado completo a una fecha | — | 250–460 ms | ≤ 500 ms (D45) |
| Historia (keyframes cada 100 años, estado mínimo) | — | 13 MB | `.wsim` ≤ 20 MB → política B (D44) |
| Salud histórica | — | No aplica (sin simulación) | — |
| Hash golden | — | Estado de prueba `877b14a0153e633b` · spike B a 14.000 años `c8e308dd0de5bf43:4065b21c90819962` | — |

## 6. Evidencia
- **Mediciones de los spikes:** [`spikes.md`](spikes.md), con tablas, métodos y problemas.
- **Bench:** [`bench-baseline.json`](bench-baseline.json) (M1 Pro) y [`bench-baseline-ci.json`](bench-baseline-ci.json) (runner).
- **CI:** job `determinism` con Chromium (1,2 min), Firefox (1,6 min) y WebKit (60 s) idénticos a Node en 14.000 años. `check` incluye el bench de regresión.
- **Preview:** la app placeholder (es/en, sin errores de consola) y los tres spikes.
- **Checkpoint 3 (Cristian):** mediciones visibles del spike A en Chrome, Safari y Firefox (`spikes.md`, "Mediciones en navegadores visibles"); Safari 26 en `/spikes/determinism/`: ✅ idéntico a Node; `pnpm dev` en su checkout: la app abre en http://localhost:5173.

## 7. Criterios de salida
- [x] ➡️ **Diferido a P13 (D46).** Clon nuevo → `pnpm i` → `pnpm dev` en ≤ 10 min siguiendo el README. Evidencia mientras tanto: `pnpm dev` probado por Cristian en su checkout (la app abre) y clon limpio verificado por Claude (`pnpm install --frozen-lockfile` + build)
- [x] PR → CI verde (`check`, `determinism`, `deploy`) + link de preview automático en el PR
- [x] El lint de determinismo falla con cada API prohibida (120 tests, validados con mutación) y el de fronteras con un import prohibido
- [x] `core`: tests unitarios + propiedades verdes; RNG y math con vectores fijos
- [x] Spike A: ≥ 60 fps promedio en M1 Pro con 2048×1024 + wrap; fallback WebGL2 funcional. Chrome 118,8 · Safari 60,0 (sin modo de bajo consumo) · Firefox 86,5 (p5 107) · fallback WebGL2 funcional (headless, forzado y automático)
- [x] Spike B: 14.000 años en ≤ 3 min sin bloquear la UI (45 s / 60 s; 0 cuadros > 25 ms)
- [x] Spike C: hash por año idéntico en Chromium, WebKit, Firefox y Node + verificación manual en Safari 26 (14.000 años, todo ✅)
- [x] `docs/model.md` aprobado (D42)
- [x] ADR-001 a ADR-008 escritos (el 006 con datos del spike A)
- [x] `ws bench` con línea base registrada
- [x] Costo: USD 0, sin tarjetas (confirmar en el panel de Cloudflare que el direct upload no cuenta builds)
- [x] REPORT final, docs actualizados, prompt de P1 refrescado

## 8. Deuda técnica y pendientes
| Ítem | Impacto | Cuándo se paga |
|---|---|---|
| Paquetes del motor vacíos (worldgen, sim, history, chronicle, content, lang) | Esperado | P1 |
| `FlowBuffer` de core es de objetos; el spike B mostró −35% con SoA | Rendimiento del tick | P1 (buffers tipados en `core/scheduler`) |
| Escenario de bench del mundo real (`world-medium`) y métrica de worldgen | Sin presupuesto real medido todavía | P1.9 |
| La base del bench del CI depende del hardware del runner | Falsos positivos si GitHub lo cambia | Al cambiar el runner (regenerar desde el log) |
| WebKit de Playwright local no anda en macOS 26.0 | Solo se prueba en Linux/CI | Cuando Playwright publique un build compatible |
| Nocturno de determinismo: el cron corre recién cuando el workflow esté en `main` | Sin corrida nocturna hasta el merge | Merge de P0 |
| TypeScript 7 / Node 26 | Herramientas más nuevas | Revisar en 2027 |
| `model.md`: detalle de P7–P10 al nivel del plan | Esperado (se refina en cada BRIEF) | P4–P10 |
| Congelamiento de 8 s en Firefox en el spike A (backend sin anotar; hipótesis: compilación de pipelines con caché fría) | Primera carga del mapa | Medir en P1.2 |
| Prueba del README en clon nuevo | Experiencia de alguien nuevo sin verificar | P13 (D46) |

## 9. Promoción de código de los spikes (✅ aprobada, D47)
Los spikes son descartables (D33). Propuesta, con el detalle en `spikes.md`:

| Spike | Reutilizar en P1 (reescrito en su paquete, con tests) | No reutilizar |
|---|---|---|
| A · terreno | Heightmap como textura + grilla compartida por LOD + desplazamiento en vertex shader; wrap con reposicionamiento de chunks; ruido sobre cilindro (heightmap provisorio hasta P3); instrumentación de cola de GPU y estrés | Texturas procedurales, paleta, iluminación, HUD |
| B · Worker | Patrón ledger con buffers SoA; `derive` con índices CSR; Worker por tandas con `MessageChannel`; deltas visuales transferibles; historia (visual + deltas; keyframe + re-simulación) | Dinámica ficticia, página |
| C · determinismo | Batería de math y RNG + comparación por año como suite permanente sobre el motor real; job de CI | Página de spike (se rehace) |

**Aprobada tal cual (D47).** No se mueven carpetas de `spikes/` a paquetes tal cual: se escribieron para medir, con atajos (HUD en DOM crudo, `!` fuera del motor, sin i18n).

## 10. LEARNINGS nuevos
- L-004 · Un test de lint que deriva sus casos de la config no prueba nada (ampliada en P0.9)
- L-005 · "latest" de npm no siempre es compatible
- L-006 · Verificar la UI en el navegador aunque sea un placeholder
- L-007 · Buffers que crecen: probar por encima de la capacidad inicial
- L-008 · Un reemplazo por script que no encuentra el texto falla en silencio
- L-009 · Medir rendimiento contra el dev server invalida corridas (spike A)
- L-010 · "60 fps" en headless no prueba que la GPU dé abasto (spike A)
- L-011 · Un resumen con grep puede esconder la falla
- L-012 · WebKit de Playwright 1.64.1 no arranca en macOS 26.0
- L-013 · Una cadena con `;` sigue aunque el chequeo falle (promovida a `CLAUDE.md`)
- L-014 · Lo que funciona en mi checkout puede no existir en un clon limpio

## 11. Documentos actualizados
- [x] `docs/model.md` (v1.0; ajuste de §5.12 y del guard en §7)
- [x] `docs/DEVELOPMENT_PLAN.md` (v1.1: §2 métricas, §8.4 keyframes)
- [x] `docs/decisions.md` (D26–D45)
- [x] `docs/STATUS.md`
- [x] `docs/prompts/P01-rebanada-vertical.md` (refrescado: bases de P0, decisiones, trampas)
- [x] `CLAUDE.md` (comandos reales, regla de verificar antes de publicar)
- [ ] `docs/design-system.md` (no aplica hasta P2)

## 12. Recomendación para P1
- **Arrancar por las bases que P0 dejó listas:**
  - buffers de flujo tipados en `core/scheduler`;
  - el `ledger` real (población, territorio y reclamos);
  - `derive` con índices densos.
- **Historia según el ADR-008:** definir temprano qué resúmenes por entidad llevan los deltas, porque de eso depende el inspector a la fecha.
- **Mundo y render:** worldgen v1 en el Worker de worldgen desde el día uno (el spike A lo hizo en el hilo principal), y render con el enfoque del spike A.
- **Medición:** escenario `world-medium` en `ws bench` antes de optimizar nada. El presupuesto real (≤ 10 ms/año) recién se puede medir ahí.
- **Determinismo:** la suite permanente sobre el motor real, reemplazando a la simulación ficticia del spike C.
- **Riesgo de alcance (L):** cada sistema mínimo, con su lista de "no hacer", como pide el plan.
