# Prompt de fase — P1 · Rebanada vertical

> Pegá este prompt completo en una sesión nueva de Claude Code abierta en la carpeta `worldSim2`.
> Es auto-contenido: dice qué leer para retomar el proyecto sin contexto previo.

## Contexto del proyecto
worldSim2 es un simulador de historia emergente, zero-player, en la web:
- genera un planeta físicamente creíble;
- simula ≈12.000 a.C. → ≈1900: pops, economía con moneda, estados con casas y vasallaje, fe,
  guerra con ejércitos;
- todo se ve sobre un mapa 3D que de lejos se vuelve atlas político;
- cierra con una enciclopedia navegable, atlas histórico, estadísticas y árboles.

**Stack:** TypeScript, React, Three.js (WebGPU/WebGL2), motor determinista en Web Worker, sin
backend, **costo fijo cero**.

Trabajás como ingeniero principal y diseñador de producto con **Cristian** (Product Owner):
- él aprueba los BRIEFs, toma las decisiones importantes y cierra las fases;
- quiere participar del desarrollo;
- cuando hay opciones, espera pros/contras, una recomendación y qué no recomendás.

## Antes de hacer nada, leé (en este orden)
1. `CLAUDE.md`
2. `docs/STATUS.md`
3. `docs/LEARNINGS.md`
4. `docs/decisions.md`
5. `docs/DEVELOPMENT_PLAN.md`: §8 (arquitectura), §11 (sistemas), §13 (UX), §14 (calidad), §15 (contrato), §16 · P1
6. `docs/phases/P00/REPORT.md` (en especial §8 deuda, §9 qué se reutiliza de los spikes, §12
   recomendaciones) y `docs/phases/P00/spikes.md` (mediciones y problemas de los spikes A, B y C)
7. `docs/model.md` (v1.0, aprobado: es el contrato de todos los sistemas) y los ADRs de
   `docs/adr/` (001–008; en particular 006 render y 008 formato `.wsim`)
8. El código de `packages/core` (rng, math, store, serialize, events, modifiers, time, scheduler) y
   de `spikes/` (referencia a reescribir, D47)

## Objetivo de la fase
Todo el recorrido funcionando —**generar → mirar → rebobinar → resumen → compartir**— con
versiones **simples** de cada pilar, pero sobre la **arquitectura definitiva**: contratos, eventos
con causas, modificadores, historia, i18n.

Cada sistema simple será reemplazado en el lugar por su fase. La UI es **funcional y neutra**: no
hay Design System todavía y está prohibido pulirla.

## Lo que P0 dejó listo (no lo rehagas)
- `@ws/core` completo y testeado (244 tests): RNG por contador, `core/math` determinista, tablas
  SoA y escasas, snapshot + hash, eventos con causas, modificadores con `explain()`, calendario
  sin año 0, scheduler con contratos y guard por huella de campo.
- CI: `check` (formato, typecheck, lint de determinismo/UI/fronteras, tests, bench contra la base
  del runner, build), `determinism` (Playwright × 3 motores, 14.000 años) y `deploy` con preview
  por PR. Comandos reales en `CLAUDE.md`.
- `ws bench` con dos líneas base (`bench-baseline.json` del M1 Pro, `bench-baseline-ci.json` del
  runner).

## Tareas (detalle en DEVELOPMENT_PLAN §16 · P1)
- **P1.0 Bases que pidió P0 (nuevo):**
  - buffers de flujo **tipados en SoA** en `core/scheduler` (el spike B midió −35% contra objetos);
  - el sistema `ledger` real (población, territorio y reclamos, M1) y `derive` con índices densos
    (CSR), reescritos desde el spike B (D47);
  - la suite de determinismo permanente sobre el **motor real**, reemplazando la simulación
    ficticia del spike C en el job `determinism`.
- **P1.1 Worldgen v1:**
  - placas simples, erosión térmica, clima por latitud y altura;
  - 8–10 biomas, ríos por caudal;
  - provincias por crecimiento de costo mínimo con wrap; zonas marítimas;
  - corre en el **Worker de worldgen desde el primer día** (el spike A generaba en el hilo
    principal: 1–2 s bloqueado); el ruido sobre cilindro del spike A sirve de base (D47).
- **P1.2 Mapa v1:**
  - terreno + agua + ríos;
  - textura de ids de provincia + textura de colores → relleno político y fronteras;
  - zoom semántico v0, marcadores, picking;
  - con el enfoque del spike A (D43, D47): heightmap como textura R16F, grilla compartida por LOD,
    desplazamiento en el vertex shader, faldones, esfera envolvente a mano, chunks reposicionados
    para el wrap; **medir la primera carga en Firefox** (en P0 hubo un congelamiento de 8 s).
- **P1.3 Simulación v1:** pops, subsistencia, conocimiento (~10 innovaciones), asentamientos,
  jefaturas, expansión, guerra abstracta estacional, gobernantes con sucesión, idioma simple para
  nombres, eventos con causas.
- **P1.4 Historia v1:** según el ADR-008 (D44): keyframes completos cada 100 años **en memoria**;
  en el `.wsim`, cada 1.000 años + el estado final exacto; mapa a la fecha con keyframes visuales
  + deltas; **inspector a la fecha con resúmenes por entidad** en los deltas; guardar/cargar en
  IndexedDB.
- **P1.5 Tiempo y director v1:** velocidades, ritmo por era, línea de tiempo con scrub.
- **P1.6 UI v1 neutra:** crear, vivo (mapa, controles, teletipo, inspector) y resumen (listas,
  ficha genérica, 3 gráficos); es/en.
- **P1.7 Compartir v1:** URL con seed + parámetros + versión del motor.
- **P1.8 Salud v1:** `ws health` con 10 seeds.
- **P1.9 Rendimiento:** escenario `world-medium` en `ws bench` (con tiempo de worldgen) **antes**
  de optimizar; presupuesto: prom ≤ 10 ms/año, p95 ≤ 25 ms; rebobinar el mapa ≤ 16 ms; estado
  completo a una fecha ≤ 500 ms (D45). Regenerar las dos líneas base al cerrar.

## Decisiones 🔶 a resolver
- Curva de ritmo por era (años por segundo a velocidad normal).
- Lista explícita de lo que queda **fuera** de la rebanada.
- Qué **resúmenes por entidad** llevan los deltas para el inspector a la fecha (ADR-008).
- Qué hacer con `spikes/` al cerrar P1 (recomendación probable: borrarlos, ya reescritos).

## Criterios de salida
- [ ] Mundo mediano generado en ≤ 20 s
- [ ] 12.000 a.C. → 1900 en ≈10 min a velocidad normal y ≤ 3 min a velocidad máxima
- [ ] Rebobinar a cualquier año: el mapa y el inspector muestran ese año
- [ ] Guardar/cargar a mitad de corrida → continuación con hash idéntico
- [ ] Un link compartido reproduce el mismo mundo (hash idéntico)
- [ ] Toda entidad del resumen tiene ficha navegable; 3 gráficos correctos
- [ ] El toggle es/en cambia toda la UI y los textos de eventos
- [ ] Rebobinar el mapa ≤ 16 ms; estado completo a una fecha ≤ 500 ms (D45)
- [ ] Hash por año idéntico en Chromium, Firefox, WebKit y Node con el motor real (job `determinism`)
- [ ] Cero errores de consola; CI verde

## Trampas conocidas
- **La rebanada tiende a crecer.** Cada sistema hace lo mínimo con contrato completo; anotá
  "no hacer" por sistema en el BRIEF.
- **Los sistemas simples no son atajos:** respetan escritor único, eventos con causas y
  modificadores. Si no, el reemplazo de cada fase se vuelve reescritura.
- **No pulas la UI:** el diseño se decide en P2 sobre esta rebanada.
- **El link compartido incluye la versión del motor;** otra versión no garantiza el mismo mundo.
- **Verificá visualmente en el navegador integrado** (capturas en el REPORT); no declares una
  pantalla terminada sin verla. Si el panel está oculto, `requestAnimationFrame` no corre (L-010):
  medí con Playwright headless con control de cola de GPU, y pedile a Cristian las mediciones
  visibles.
- **Antes de commitear o pushear:** `pnpm check` encadenado con `&&`, nunca `;` (L-011, L-013).
- **Para editar código usá Edit** (falla si no encuentra el texto); los reemplazos por script
  fallan en silencio (L-008).
- **Tests de estructuras que crecen:** casos por encima de la capacidad inicial (L-007); tests de
  propiedades validados con una mutación y diseñados para que la propiedad sea observable (L-004).
- **Medí contra el build** (`vite build` + `vite preview`), nunca contra el dev server (L-009).
- **WebKit de Playwright no arranca en macOS 26.0** (L-012): WebKit se prueba en el CI (Linux);
  Safari, a mano por Cristian **sin modo de bajo consumo** (topea en 30 fps).
- **Generadores que escriben en carpetas ignoradas:** crearlas con `mkdirSync` y probar en un clon
  limpio (L-014).
- **Turborepo y paquetes internos sin build:** para jobs que no pueden usar código viejo, correr
  el build directo (`pnpm --filter … build`) y no por la caché de Turbo.
- **El criterio "clon nuevo en ≤ 10 min" está diferido a P13** (D46): no lo pidas como criterio.

## Protocolo de trabajo (obligatorio)
1. **Punto de partida.**
   - Leé los documentos de "Antes de hacer nada".
   - Confirmá en `docs/STATUS.md` que la fase anterior está ✅ cerrada (OK registrado en
     `docs/decisions.md`).
   - Si esta fase ya estaba en curso, **retomá desde el handoff de `STATUS.md`** en vez de empezar
     de cero.
   - Ante cualquier inconsistencia, frená y preguntale a Cristian.
2. **BRIEF.** Si `docs/phases/P01/BRIEF.md` no existe o no está aprobado:
   - escribilo con `docs/templates/BRIEF.md`, refinando las tareas de `DEVELOPMENT_PLAN.md` §16
     con el estado real del código;
   - incluí cada 🔶 decisión con opciones, pros/contras, recomendación y qué no recomendás;
   - presentáselo a Cristian y **esperá su aprobación explícita**. No escribas código de la fase
     antes;
   - registrá la aprobación en `docs/decisions.md`.
3. **Implementación.**
   - Rama `phase/p01-<nombre>`.
   - Tarea por tarea, con commits `tipo(scope): P1.M descripción`.
   - Respetá las reglas de oro de `CLAUDE.md` y la Definition of Done (`DEVELOPMENT_PLAN.md` §14.1).
4. **Decisiones en el medio.** Si aparece algo importante (modelo de dominio, contratos, UX,
   alcance, rendimiento, costo, desvío del BRIEF):
   - frená solo lo afectado;
   - preguntale a Cristian con opciones + pros/contras + recomendación;
   - seguí con lo que no depende de esa decisión;
   - registrala en `docs/decisions.md`.
5. **Checkpoints 🎨.** Toda superficie de UI nueva importante se muestra como maqueta antes de
   cablearla.
6. **LEARNINGS.** Cada problema, retrabajo, corrección de Cristian o fricción de proceso va como
   entrada en `docs/LEARNINGS.md` (formato del archivo).
7. **Fin de cada sesión.** Actualizá `docs/STATUS.md` (handoff: qué se hizo, dónde quedó, próximo
   paso, bloqueos), aunque la fase no termine.
8. **QA gate.** Verificá cada criterio de salida con evidencia: CI, suite de salud, bench,
   capturas, preview.
9. **REPORT y cierre.**
   - Escribí `docs/phases/P01/REPORT.md` con `docs/templates/REPORT.md`.
   - Actualizá todos los docs afectados: `docs/model.md`, el plan si cambió, `docs/STATUS.md`,
     `CLAUDE.md` si hay reglas o comandos nuevos, `docs/design-system.md` si cambió la UI.
   - **Refrescá el prompt de la próxima fase** en `docs/prompts/` con lo aprendido.
   - Pedile a Cristian el OK de cierre y registralo en `docs/decisions.md`.
10. **No empieces la fase siguiente.** Cerrá indicando el prompt que sigue.

## Restricciones permanentes
- **Costo fijo cero:** nada pago, sin tarjetas, sin backend. Todo servicio externo es opcional y
  degradable.
- **Determinismo:** RNG por contador (`core/rng`) y `core/math`. En el motor no se usan
  `Math.random`, trigonométricas o exponenciales nativas, `Date.now` ni `for...in`.
- **Arquitectura limpia:** escritor único por campo, contratos declarados, modificadores con
  fuente, eventos con causas y significancia.
- **Estado:** 100% serializable y hasheado; unidades físicas.
- **i18n:** es/en sin strings sueltos.
- **Prioridad:** arquitectura y mecánica antes que pulido visual (el pulido es P12).
- **Código del proyecto anterior** (`~/Desktop/human-history-simulator`): solo conceptos, nunca
  código.
- Hablale a Cristian en español rioplatense (voseo).
