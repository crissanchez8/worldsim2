# STATUS — dónde estamos

> Se actualiza al final de **cada** sesión de trabajo (handoff), aunque la fase no termine.
> Una sesión nueva lee esto después de `CLAUDE.md` y retoma desde "Próximo paso".

| | |
|---|---|
| **Última actualización** | 2026-10-15 |
| **Fase actual** | P0 — Fundaciones de arquitectura |
| **Estado** | 🟢 En curso — bloque 3: `model.md` 1.0-rc en revisión (gate); spike A en una sesión paralela |
| **Próximo paso** | Cristian revisa `docs/model.md` (decisiones M1–M8, §17) → OK en `decisions.md` → bloque 4 (P0.8 events, P0.9 modifiers, P0.10 time+scheduler). Integrar la rama `p00-spike-terrain` cuando la sesión del spike A termine |
| **Bloqueos** | P0.8–P0.10 esperan la aprobación de `model.md` |
| **Repo** | https://github.com/crissanchez8/worldsim2 · rama `phase/p00-fundaciones` · PR #1 (draft) |

## Fases

| Fase | Estado | BRIEF | REPORT | Cierre |
|---|---|---|---|---|
| P0 Fundaciones de arquitectura | 🟢 en curso | [BRIEF](phases/P00/BRIEF.md) | — | — |
| P1 Rebanada vertical | ⚪ | — | — | — |
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
- Ninguna bloqueante. Próximas con datos: ADR-006 (tras spike A), métricas de §2 (tras spikes A/B y bench), hash XXH64 vs 2×XXH32 (P0.7, técnica).
