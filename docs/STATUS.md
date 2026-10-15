# STATUS — dónde estamos

> Se actualiza al final de **cada** sesión de trabajo (handoff), aunque la fase no termine.
> Una sesión nueva lee esto después de `CLAUDE.md` y retoma desde "Próximo paso".

| | |
|---|---|
| **Última actualización** | 2026-10-15 |
| **Fase actual** | P0 — Fundaciones de arquitectura |
| **Estado** | 🟢 En curso — bloque 1 (casa) implementado; checkpoint 1 pendiente |
| **Próximo paso** | Checkpoint 1: Cristian carga los secretos de Cloudflare y prueba el README en un clon nuevo → CI verde + preview en PR #1 → protección de `main`. En paralelo: bloque 2 (P0.4 rng → P0.5 math → P0.6 store → P0.7 serialize+hash) |
| **Bloqueos** | Deploy: faltan secretos `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` (los carga Cristian) |
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
