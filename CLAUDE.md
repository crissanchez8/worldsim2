# CLAUDE.md — worldSim2

Puerta de entrada al proyecto. Se carga en cada sesión. Es corto a propósito: el detalle vive
en `docs/`.

## Qué es
Simulador de historia emergente, zero-player, en la web. Genera un planeta físicamente creíble y
simula ≈12.000 a.C. → ≈1900 (pops, economía con moneda, estados con casas y vasallaje, fe,
guerra con ejércitos) sobre un mapa 3D que de lejos se vuelve atlas, y termina en una
enciclopedia navegable.

**Stack:** TypeScript + React + Three.js (WebGPU/WebGL2), motor determinista en Web Worker,
**sin backend**, **costo fijo cero**.

## Cómo retomar (siempre, en este orden)
1. `docs/STATUS.md`: fase actual, estado, último handoff, próximo paso, bloqueos.
2. `docs/LEARNINGS.md`: errores a no repetir.
3. `docs/decisions.md`: decisiones vigentes (D#) y aprobaciones.
4. `docs/DEVELOPMENT_PLAN.md`: §15 (contrato de trabajo) + la sección de la fase actual en §16.
5. `docs/phases/PNN/`: BRIEF de la fase actual (¿aprobado?) y REPORT de la fase anterior.
6. `docs/model.md` (desde P0) y `docs/design-system.md` (desde P2) cuando la tarea los toque.

Si el usuario no indicó tarea, proponé el próximo paso según `STATUS.md`. Si te pasó un prompt de
`docs/prompts/`, seguilo.

## Contrato de trabajo con Cristian (detalle: DEVELOPMENT_PLAN §15)
1. **BRIEF antes de cada fase** (`docs/phases/PNN/BRIEF.md`). No escribas código de la fase sin su
   aprobación explícita.
2. **REPORT al cerrar cada fase** (`docs/phases/PNN/REPORT.md`) + actualizar todos los docs
   afectados, `STATUS.md` y el prompt de la próxima fase. La fase cierra con su OK registrado en
   `decisions.md`.
3. **Decisiones importantes = preguntar**, al inicio o en el medio de la fase. Formato: opciones +
   pros/contras + recomendación + qué no recomendás y por qué. Frená solo lo afectado y seguí con
   el resto. Registrá todo en `decisions.md`.
4. **UI:** mock-first 🎨; el Design System es la única fuente visual; nada de "AI slop" (ver
   `docs/design-system.md` desde P2).
5. **Prompts de fase** en `docs/prompts/`: auto-contenidos; se refrescan al cerrar la fase previa.
6. **LEARNINGS:** registrá todo problema, retrabajo, corrección del usuario o fricción de proceso.
   Los recurrentes se vuelven reglas acá.
7. **Arquitectura y mecánica antes que frontend lindo.** El pulido visual es P12.
8. **Costo fijo cero:** nada que requiera un plan pago o una tarjeta. Todo servicio externo es
   opcional y degradable.
9. **Fin de cada sesión:** actualizá `docs/STATUS.md` (handoff), aunque la fase no haya terminado.

## Reglas de oro del código
1. **Determinismo total:** todo azar pasa por el RNG por contador de `packages/core` (`rng.stream(...)`).
   En los paquetes del motor están prohibidos `Math.random`, `Math.sin/cos/tan/exp/log/pow/atan2/…`
   (usar `core/math`), `Date.now`, `new Date()`, `performance.now` y `for...in`. El lint lo hace
   cumplir.
2. **Escritor único:** cada campo del estado tiene un solo sistema dueño. Los sistemas declaran
   su contrato `{lee, escribe, emite, cadencia, fase}`. Nada de cachés ocultas en el estado.
3. **Estado 100% serializable y hasheado:** si está en el estado, está en el snapshot y en el hash.
4. **Causalidad trazable:** los efectos son modificadores con fuente; los eventos importantes
   llevan causas enlazadas y significancia.
5. **Unidades físicas:** personas, km, años, toneladas, monedas. Nada de escalares sin unidad.
6. **Motor headless:** `core`, `worldgen`, `content`, `lang`, `sim`, `history` y `chronicle` no
   importan React, Three.js, DOM ni `apps/`.
7. **Contenido como datos** en `packages/content`, validado con zod.
8. **i18n desde el día 1:** cero strings sueltos en la UI; los eventos guardan datos, no texto.
9. **Sin números mágicos:** parámetros en config o contenido, con unidad y comentario.
10. **Toda tarea cumple la Definition of Done** (DEVELOPMENT_PLAN §14.1).

## Convenciones
- Código e identificadores en inglés; comentarios y docs en español, concisos.
- Commits convencionales con referencia a la tarea: `feat(worldgen): P3.2 erosión hidráulica`.
- Rama por fase (`phase/pNN-nombre`); `main` siempre desplegable; el merge de cierre de fase
  espera la revisión de Cristian.
- Hablale a Cristian en español rioplatense (voseo).
- **Antes de commitear o pushear:** `pnpm check` tiene que salir con código 0, encadenado con `&&`
  (nunca `;`) a la acción que publica (L-011, L-013).

## Comandos
| Comando | Qué hace |
|---|---|
| `pnpm i` · `pnpm dev` | Instalar · app web en desarrollo (http://localhost:5173) |
| `pnpm check` | Lo mismo que el CI: formato, typecheck, lint (estilo + determinismo + UI + fronteras), tests |
| `pnpm build` · `pnpm site` | Build de todo · arma `site/` (web + spikes) para desplegar |
| `pnpm ws bench [--compare docs/phases/P00/bench-baseline.json]` | Bench del core y año sintético (normalizado por calibración) |
| `pnpm --filter @ws/core exec vitest run` | Tests de un paquete |
| `pnpm --filter @ws/spike-determinism e2e` | Playwright: hash idéntico a Node en Chromium/Firefox/WebKit (WebKit local no anda en macOS 26.0: L-012) |
| `pnpm --filter @ws/spike-worker measure:node [años] [--hash]` | Medición headless del spike B |

Previews: el CI comenta el link en cada PR (`<rama>.worldsim2.pages.dev`; spikes en `/spikes/<nombre>/`).

## Qué NO hacer
- Empezar una fase sin BRIEF aprobado, o la siguiente sin el OK de cierre.
- Pulir visuales antes de P12 sin una decisión explícita.
- Agregar un sistema que multiplique stats de otros sin contrato ni modificador trazable.
- Usar servicios pagos, pedir tarjetas o depender de un backend.
- Reutilizar ids, guardar estado fuera del snapshot o introducir azar fuera del RNG.
- Reutilizar código del proyecto anterior (`~/Desktop/human-history-simulator`): solo conceptos
  (lecciones heredadas en `docs/LEARNINGS.md`, sección "Herencia").
