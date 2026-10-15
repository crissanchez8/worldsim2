# ADR-001 · Monorepo y herramientas

| | |
|---|---|
| **Fecha** | 2026-10-15 |
| **Estado** | Aceptado |
| **Fase** | P0 |
| **Decisión en log** | D32 (Node 24), D33 (`spikes/`), D34 (fronteras), D38 (TypeScript 6.0) |

## Contexto
Proyecto largo (P0–P13), trabajado con Claude Code por sesiones, con reglas que tienen que
cumplirse solas: determinismo, motor headless, cero strings sueltos, commits trazables. Costo
cero (D24) y sin backend.

## Opciones consideradas
| Opción | Pros | Contras |
|---|---|---|
| **pnpm workspaces + Turborepo (elegida)** | Instalación estricta (cada paquete declara lo que usa), `catalog:` para versiones únicas, caché de tareas local y en CI | Dos herramientas |
| npm/yarn workspaces | Menos piezas | Hoisting laxo (dependencias fantasma), sin caché de tareas |
| Nx | Muy completo | Pesado y opinado para un proyecto de una persona |

## Decisión
- **pnpm 10 + Turborepo 2**, versiones fijadas con `catalog:` en `pnpm-workspace.yaml`
  (`savePrefix: ''`, `engineStrict: true`).
- **Paquetes internos sin build:** `exports` apunta a `src/index.ts`; Vite, Vitest y tsx
  consumen TS directo. Cada paquete corre `tsc --noEmit` (Δ: el BRIEF mencionaba project
  references; no hacen falta sin emitir JS y simplifican el setup).
- **Node 24 LTS** (`.nvmrc`, `engines`), D32.
- **TypeScript 6.0.3**, no 7.0: typescript-eslint 8.x declara `typescript <6.1` (D38, L-005).
  `tsconfig.base.json` estricto: `strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`, `verbatimModuleSyntax`,
  `erasableSyntaxOnly` (sin enums ni parameter properties).
- **Motor sin plataforma:** los paquetes del motor compilan con `lib: ["ES2023"]` y
  `types: []`: sin DOM ni Node. Usar `document` o `process` es un error de tipos, además de lint.
- **ESLint 10** (flat config, type-aware con `projectService`) + **Prettier 3**.
- **Lint de determinismo** como allowlist (`tools/lint/src/determinism.js`) con tests que
  exigen que cada API prohibida falle, usando listas canónicas independientes (L-004).
- **Fronteras con dependency-cruiser** (D34) + `no-restricted-imports` en el editor; test con
  fixtures que deben fallar.
- **Texto de UI:** `no-restricted-syntax` sobre `JSXText`, literales en JSX y atributos visibles.
- **Commits:** commitlint (convencional + scope de una lista + `P#.#` obligatorio), husky,
  lint-staged.
- **`spikes/`** como workspace descartable que nadie puede importar (D33).
- **CLI `ws`** en `tools/cli`, ejecutada con tsx (sin build).

## Consecuencias
- Positivas: las reglas de oro 1, 6 y 8 de `CLAUDE.md` las hace cumplir el tooling; una sesión
  nueva no puede romperlas sin que falle el CI.
- Negativas: TS 6 en lugar de 7 (se pierde el compilador nativo, más rápido). Mitigación:
  revisar cuando typescript-eslint soporte TS 7.
- `noUncheckedIndexedAccess` obliga a `?? 0` en lazos sobre arrays tipados; el costo medido es
  despreciable.
- Revisar si: el typecheck por paquete pasa de ~30 s (pasar a project references con
  `composite`), o typescript-eslint publica soporte para TS 7.

## Evidencia
- `pnpm check` verde; 119 tests del lint (validados con mutación) y 6 de fronteras.
- Peer de typescript-eslint 8.71.2: `typescript: '>=4.8.4 <6.1.0'`.
