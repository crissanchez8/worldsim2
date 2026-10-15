# worldSim2

[![CI](https://github.com/crissanchez8/worldsim2/actions/workflows/ci.yml/badge.svg)](https://github.com/crissanchez8/worldsim2/actions/workflows/ci.yml)
[![Licencia: MIT](https://img.shields.io/badge/licencia-MIT-blue.svg)](LICENSE)

Simulador de historia emergente, _zero-player_, en el navegador. Genera un planeta físicamente
creíble y simula ≈12.000 a.C. → ≈1900 (pops, economía con moneda, estados con casas y vasallaje,
fe, guerra con ejércitos) sobre un mapa 3D que de lejos se vuelve atlas, y termina en una
enciclopedia navegable.

**Estado:** fase P0 (fundaciones de arquitectura). Todavía no hay simulación. Ver
[`docs/STATUS.md`](docs/STATUS.md) y el [plan](docs/DEVELOPMENT_PLAN.md).

**Stack:** TypeScript · React · Three.js (WebGPU/WebGL2) · motor determinista en Web Worker ·
sin backend · costo fijo cero.

## Empezar (≤ 10 min)

Requisitos:

- **Node 24 LTS** (`.nvmrc`). Con [nvm](https://github.com/nvm-sh/nvm): `nvm install && nvm use`.
- **pnpm 10** vía corepack (viene con Node 24): `corepack enable`. Si pide permisos de
  administrador, alternativa: `npm install -g pnpm@10`.
- git.

```bash
git clone https://github.com/crissanchez8/worldsim2.git
cd worldsim2
corepack enable
pnpm install
pnpm dev
```

`pnpm dev` levanta la app en <http://localhost:5173>.

## Comandos

| Comando              | Qué hace                                                            |
| -------------------- | ------------------------------------------------------------------- |
| `pnpm dev`           | App web en modo desarrollo (Vite)                                   |
| `pnpm build`         | Build de producción de todo lo que tenga build                      |
| `pnpm check`         | Todo lo que corre el CI: formato, typecheck, lint y tests           |
| `pnpm typecheck`     | TypeScript estricto en todos los paquetes                           |
| `pnpm lint`          | ESLint (estilo + determinismo + texto de UI) + fronteras de paquetes |
| `pnpm lint:deps`     | Solo fronteras entre paquetes (dependency-cruiser)                  |
| `pnpm test`          | Tests (Vitest) de todos los paquetes                                |
| `pnpm format`        | Formatea con Prettier                                               |
| `pnpm ws --version`  | CLI de desarrollo (`ws bench` llega en P0.17)                       |
| `pnpm site`          | Arma `site/` (web + spikes) para desplegar; requiere `pnpm build`   |

## Estructura

```
apps/web/        Vite + React: une motor, UI y render
packages/
  core/          primitivas deterministas: rng, math, stores, serialización, eventos, modificadores, scheduler
  worldgen/      planeta físico                    ┐
  content/       contenido como datos (zod)        │
  lang/          idiomas procedurales              │ motor: headless y determinista
  sim/           sistemas y pipeline del tick      │ (sin React, Three.js ni DOM)
  history/       keyframes, deltas, .wsim          │
  chronicle/     significancia, enciclopedia       ┘
  i18n/          catálogos es/en (headless)
  ui/            Design System (desde P2)
tools/
  cli/           ws: CLI de desarrollo
  lint/          reglas de determinismo y texto de UI + sus tests
spikes/          experimentos descartables de P0
docs/            plan, estado, decisiones, aprendizajes, fases, prompts, ADRs
```

## Reglas que el tooling hace cumplir

- **Determinismo:** en el motor están prohibidos `Math.random`, las funciones trascendentes de
  `Math` (allowlist), `Date`, `performance`, `for...in`, iterar claves de objetos, `sort()` sin
  comparador y todo lo que dependa del locale. Ver `tools/lint/src/determinism.js`.
- **Fronteras:** el motor no importa React, Three.js, DOM, `packages/ui`, `apps/` ni `tools/`;
  nadie importa `spikes/`. Ver `.dependency-cruiser.cjs`.
- **i18n:** cero texto suelto en JSX; todo pasa por `t()` de `@ws/i18n`.
- **Commits:** convencionales, con scope y tarea: `feat(core): P0.4 rng por contador`.

## Contribuir

El proyecto se trabaja por fases con BRIEF y REPORT. Ver
[`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md) §15 y [`CLAUDE.md`](CLAUDE.md).

## Licencia

[MIT](LICENSE) © 2026 Cristian Sánchez
