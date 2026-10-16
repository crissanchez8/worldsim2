# Log de decisiones

> **Append-only.** Una fila por decisión o aprobación, con fecha y contexto. No se edita el
> pasado: si una decisión cambia, se agrega una nueva que la reemplaza ("reemplaza a D#").
> Las aprobaciones de BRIEF y los cierres de fase también se registran acá.

| # | Fecha | Decisión | Contexto / por qué | Fase |
|---|---|---|---|---|
| D1 | 2026-10-14 | Destino: web pública / portfolio | Entrevista inicial | — |
| D2 | 2026-10-14 | Plataforma: TS + Three.js (WebGPU, fallback WebGL2), motor en Web Worker, WASM solo si el perfilado lo pide | Comparación Web vs Godot vs Unity vs Bevy: gana la web por objetivo público, UI de datos y trabajo con Claude Code | — |
| D3 | 2026-10-14 | Hardware: desktop/laptop moderna | — | — |
| D4 | 2026-10-14 | Síntesis: esqueleto Paradox + memoria DF + vida WorldBox + estética Civ/Humankind | Análisis de pros/contras por referencia | — |
| D5 | 2026-10-14 | Mapa híbrido: 3D de cerca, atlas político de lejos | — | — |
| D6 | 2026-10-14 | Geometría: plano con wrap E-O | — | — |
| D7 | 2026-10-14 | Assets: CC0 + procedural | — | — |
| D8 | 2026-10-14 | Rol del usuario: observador puro | — | — |
| D9 | 2026-10-14 | Ejecución: en vivo + rebobinar | — | — |
| D10 | 2026-10-14 | Duración de corrida: 5–15 min a velocidad normal | — | — |
| D11 | 2026-10-14 | Inicio ≈12.000 a.C., mundo ya poblado | — | — |
| D12 | 2026-10-14 | Calibración: forma de la historia real con variación | — | — |
| D13 | 2026-10-14 | Personajes: híbrido "casas, no cortes" | Cristian pidió vasallaje, intriga y casas menores sin el costo de CK | — |
| D14 | 2026-10-14 | Economía: bienes + mercados + moneda | — | — |
| D15 | 2026-10-14 | Guerra: ejércitos visibles en el mapa | — | — |
| D16 | 2026-10-14 | Narrativa: idiomas procedurales + LLM opcional para la crónica | — | — |
| D17 | 2026-10-14 | Resumen: enciclopedia + estadísticas + atlas + árboles | — | — |
| D18 | 2026-10-14 | Compartir: seed + historia como archivo | — | — |
| D19 | 2026-10-14 | Proceso: rebanada vertical primero | — | — |
| D20 | 2026-10-14 | Idioma: bilingüe es/en desde el día 1 | — | — |
| D21 | 2026-10-14 | Escala: ≈1.500 provincias por defecto, configurable | — | — |
| D22 | 2026-10-14 | Contrato de trabajo: BRIEF, REPORT, decisiones compartidas, mock-first + DS, prompts de fase, LEARNINGS | Pedido explícito de Cristian | — |
| D23 | 2026-10-14 | Arquitectura y mecánica antes que frontend lindo; inmersión visual en P12 | Pedido explícito de Cristian | — |
| D24 | 2026-10-14 | Costo fijo cero: hosting estático gratis, sin backend, LLM BYOK, sin dominio pago | Pedido explícito de Cristian | — |
| D25 | 2026-10-14 | Diseño: 3 direcciones mock en P2 → Cristian elige → Design System | Pedido explícito de Cristian | — |
| D26 | 2026-10-14 | Q1 Hosting: Cloudflare Pages Free (plan B: GitHub Pages) | Previews por PR, 25 MiB/archivo, sin tarjeta. Límites verificados hoy: 500 builds/mes, 1 concurrente, 20.000 archivos. Pages vs Workers static assets y método de deploy se cierran en el ADR-007 | P0 |
| D27 | 2026-10-14 | Q2 Repo público | Portfolio + Actions gratis con runners estándar (confirmado en los cambios de precios 2026) | P0 |
| D28 | 2026-10-14 | Q3 Cuenta personal `crissanchez8` | Ya autenticada en `gh`; Q5 (nombre definitivo) llega en P2 | P0 |
| D29 | 2026-10-14 | Q4 Licencia MIT | Simple y estándar para portfolio | P0 |
| D30 | 2026-10-15 | i18n: i18next + react-i18next (ADR-005) | Corre igual en UI, Worker y CLI sin plugins de build (BRIEF P0 · D00-a) | P0 |
| D31 | 2026-10-15 | Deploy: direct upload a Cloudflare Pages desde GitHub Actions con `wrangler pages deploy` (ADR-007) | Se publica el mismo build que pasó CI; no depende del tope de builds de Cloudflare (D00-b) | P0 |
| D32 | 2026-10-15 | Node 24 LTS (reemplaza "Node 22" del plan §16 P0.1) | Node 22 vence en abril 2027, en medio del proyecto (D00-c) | P0 |
| D33 | 2026-10-15 | Spikes en workspace `spikes/` aparte, descartable, desplegado bajo `/spikes/*` del preview | Evita promover código de spike sin decidirlo (D00-d) | P0 |
| D34 | 2026-10-15 | Fronteras: dependency-cruiser + `no-restricted-imports`/`no-restricted-globals` de ESLint | Detecta dependencias transitivas (D00-e) | P0 |
| D35 | 2026-10-15 | S2 confirmado: mundo realista, solo humanos, sin magia, nombres ficticios | BRIEF P0 §9 | P0 |
| D36 | 2026-10-15 | S4 confirmado: 2 últimas versiones mayores de Chrome, Edge, Safari y Firefox de escritorio; WebGL2 como piso | BRIEF P0 §9 | P0 |
| D37 | 2026-10-15 | Repo `crissanchez8/worldsim2` hasta que Q5 defina el nombre en P2 | BRIEF P0 §9 | P0 |
| D38 | 2026-10-15 | TypeScript fijado en 6.0.3 (no 7.0) | typescript-eslint 8.x declara `typescript <6.1`; revisar cuando soporte TS 7 (ADR-001, L-005) | P0 |
| D39 | 2026-10-15 | RNG por contador: XXH32 de 6 palabras, dos carriles, registro único de streams con ids constantes | Independiente del orden del tick; agregar sistemas no altera el azar (ADR-002) | P0 |
| D40 | 2026-10-15 | `core/math` = port de fdlibm + allowlist de `Math` en el motor | < 2,2 ulp vs V8; bit a bit entre motores a confirmar en spike C (ADR-003) | P0 |
| D41 | 2026-10-15 | Estado en SoA + tablas escasas; snapshot binario `WSST`; hash de estado = 2×XXH32 de los bytes serializados | XXH64 emulado medía 50 MB/s vs 3,3 GB/s; el hash sobre bytes garantiza que todo el estado esté en el hash (ADR-004) | P0 |
| D42 | 2026-10-15 | `docs/model.md` v1.0 aprobado con las decisiones de modelo M1–M8 tal como se recomendaron | M1 libro mayor (`ledger`) para población, territorio y reclamos · M2 log de eventos fuera del hash · M3 vistas derivadas fuera del snapshot · M4 lo que cruza el tick es estado · M5 sistema `factions` · M6 `Person` permanente + `CharacterDetail` · M7 costo de movimiento en días · M8 moneda de cuenta única (plata) | P0 |
| D43 | 2026-10-16 | ADR-006 confirmado: Three.js `WebGPURenderer` + TSL, fallback automático a WebGL2, `?backend=webgl2` para depurar | Spike A: WebGPU ≥ 4× de margen a dpr 2 vs ~2× de WebGL2; un solo código de material. La medición en navegadores visibles la hace Cristian (checkpoint 3) | P0 |
| D44 | 2026-10-16 | ADR-008 opción B: keyframes completos cada 100 años en memoria; en el `.wsim`, cada 1.000 años + el estado final exacto; mapa a la fecha con keyframes visuales + deltas; inspector a la fecha con resúmenes | Spike B: keyframes cada 100 años = 13 MB con un estado mínimo; el presupuesto del archivo es 20 MB. Reemplaza "keyframes cada 100 años" del plan §8.4 para el archivo | P0 |
| D45 | 2026-10-16 | Métricas de §2: se mantienen todas; se suman rebobinar el mapa ≤ 16 ms y estado completo a una fecha (en vivo) ≤ 500 ms; el determinismo se verifica por año en CI | Mediciones de los spikes A, B y C (`docs/phases/P00/spikes.md`) | P0 |
| D46 | 2026-10-16 | El criterio "clon nuevo → pnpm i → pnpm dev en ≤ 10 min (lo prueba Cristian)" se difiere a las últimas fases (P13) | Decisión de Cristian: el repo es público pero no se comparte todavía. Evidencia mientras tanto: clon limpio verificado por Claude (`pnpm install --frozen-lockfile` + build) y `pnpm dev` probado por Cristian en su checkout | P0 |
| D47 | 2026-10-16 | Promoción de spikes (REPORT P0 §9) aprobada como se recomendó: en P1 se reescriben el terreno y wrap del spike A, el ledger con buffers SoA, el Worker por tandas y la historia del spike B, y la batería de determinismo del spike C; ninguna carpeta pasa tal cual | Cristian delegó la decisión en Claude ("seguí tu recomendación") | P0 |
| D48 | 2026-10-16 | D01-a Ritmo por era dominante (la más avanzada que alcanza ≥ 10% de la población mundial) con piso de duración (≤ 15 min, D10); años/s a 1×: prehistoria 60, neolítico 30, bronce 18, hierro 15, moderna temprana 5, calibrados con `ws health` (mediana 10 ± 1 min) | BRIEF P1 §5; el ritmo sigue al mundo, no al calendario | P1 |
| D49 | 2026-10-16 | D01-b Simulación adelantada con colchón (≈500 años, parámetro): el Worker simula lo más rápido que puede y la UI reproduce desde la historia; "máx." = seguir a la cabeza | BRIEF P1 §5; un año caro no traba la reproducción; vivo, archivo y link usan el mismo camino | P1 |
| D50 | 2026-10-16 | D01-c Inspector a la fecha = resumen mínimo en los deltas (dueño, nivel, cultura mayoritaria, innovaciones, capital al cambiar; población y fracción urbana por provincia cada 10 años, cuantizadas; agregados mundiales por año) + registros permanentes del estado final + eventos; el "por qué" exacto, bajo pedido por keyframe + re-simulación | BRIEF P1 §5; ADR-008 opción B (D44) | P1 |
| D51 | 2026-10-16 | D01-d Alcance de la rebanada: dentro `explain` en el inspector, exportar/importar `.wsim`, tamaños chico y mediano, 3 tipos de mapa, títulos mínimos, lista de mundos guardados; fuera rótulos de reinos, modo de mapa cultural, nombres de provincias, casas y rasgos; **reclamos (`Claim`, `claimRequests`) a P7** (Δ respecto del prompt de P1) | BRIEF P1 §5 y pregunta 2 | P1 |
| D52 | 2026-10-16 | D01-e `spikes/` se borra al cerrar P1, cuando todo lo de D47 esté reescrito y el job `determinism` corra sobre el motor real (tag `p00-spikes` opcional, se publica solo con OK) | BRIEF P1 §5 | P1 |
| D53 | 2026-10-16 | Cambios al modelo para P1 (BRIEF §6): `Settlement.name` pasa a P1; `Title` mínimo en P1 para alojar al gobernante; `Person` sin rasgos ni casa en P1; el ledger implementa transferencias sin productor hasta P4. Se reflejan en `model.md` v1.1 al cerrar la fase | BRIEF P1 pregunta 3 | P1 |
| D54 | 2026-10-16 | Dependencias nuevas autorizadas: `zod`, `@tanstack/react-router`, `zustand`, `@tanstack/react-virtual`, `uplot` (versiones exactas en el catálogo) | BRIEF P1 pregunta 4 | P1 |

## Aprobaciones de fase

| Fecha | Fase | Hito | Notas |
|---|---|---|---|
| 2026-10-14 | Plan | DEVELOPMENT_PLAN aprobado como v1.0 | Q1–Q4 quedan para el BRIEF de P0 |
| 2026-10-15 | P0 | BRIEF aprobado tal cual | D30–D37; descargas de dependencias npm y navegadores de Playwright autorizadas |
| 2026-10-15 | P0 | `docs/model.md` v1.0 aprobado (gate P0.11) | D42; se habilita el bloque 4 (P0.8–P0.10) |
| 2026-10-16 | P0 | Checkpoint 3: decisiones aprobadas (D43–D45) | Mediciones manuales (navegadores visibles, Safari) en curso por Cristian |
| 2026-10-16 | P0 | **Fase cerrada** (OK de Cristian) | REPORT en `docs/phases/P00/REPORT.md`; merge del PR #1 a `main` con merge commit; próxima fase: P1 con `docs/prompts/P01-rebanada-vertical.md` |
| 2026-10-16 | P1 | BRIEF aprobado tal cual | D48–D54 (D01-a…e como se recomendaron, reclamos a P7, cambios al modelo de §6, dependencias nuevas); la sesión paralela para P1.2 se propone cuando P1.1 fije `WorldStatic` |
