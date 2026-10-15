# Prompt de fase — P5 · Conocimiento

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
5. `docs/DEVELOPMENT_PLAN.md`: §10.3, §16 · P5, Apéndice A (ventanas de hitos)
6. `docs/phases/P04/REPORT.md`
7. `docs/model.md`: conocimiento y contratos de los sistemas que reciben efectos
8. `docs/design-system.md`

## Objetivo de la fase
La tecnología como **grafo de innovaciones**:
- se inventan por **necesidad y condiciones**;
- se difunden por contacto y rutas;
- dependen de **materiales y entorno**;
- **se pierden** con colapsos y aislamiento;
- definen **eras regionales**, no un reloj global.

## Tareas (detalle en DEVELOPMENT_PLAN §16 · P5)
- **P5.1 Grafo de unas 150 innovaciones (contenido)** por dominios, con:
  - prerrequisitos;
  - materiales;
  - entorno;
  - necesidad;
  - dificultad;
  - efectos.

  Validación: acíclico, sin huérfanos, referencias válidas.
- **P5.2 Portadores del conocimiento** (🔶 modelo).
- **P5.3 Invención:** especialistas, urbanización, alfabetización, instituciones, necesidad;
  inventores como personajes.
- **P5.4 Difusión:** adyacencia, comercio, conquista, migración; filtros de compatibilidad.
- **P5.5 Pérdida:** colapso de especialistas e instituciones; **efecto Tasmania**.
- **P5.6 Eras regionales.**
- **P5.7 Efectos cableados** por modificadores y desbloqueos.
- **P5.8 UI funcional:** vista de grafo con difusión, modos "era" y "conoce X", ficha de
  innovación.
- **P5.9 Calibración** de ventanas de hitos.

## Decisiones 🔶 a resolver
- P5.2: conocimiento por provincia (bitset + adopción, recomendado) vs. por comunidad
  (cultura × polity).
- Lista de dominios y cantidad final de innovaciones (con prioridad a las que tienen efecto
  mecánico).

## Criterios de salida
- [ ] Hitos dentro de ventanas del Apéndice A en ≥ 80% de los seeds; desigualdad regional visible
- [ ] Pérdida medible tras colapsos y en poblaciones aisladas
- [ ] Todo efecto de innovación es visible en el "por qué" del inspector

## Trampas conocidas
- **Proyecto anterior (H-03):** la tecnología como un escalar sin techo. Acá nada es un "nivel
  tecnológico" global.
- **Contenido infinito:** "sin efecto, no entra". Escribí por dominios y medí el efecto de cada
  uno.
- **Los efectos sobre sistemas futuros** (economía, Estado, guerra) se declaran como hooks; no
  implementes esos sistemas acá.

## Protocolo de trabajo (obligatorio)
1. **Punto de partida.**
   - Leé los documentos de "Antes de hacer nada".
   - Confirmá en `docs/STATUS.md` que la fase anterior está ✅ cerrada (OK registrado en
     `docs/decisions.md`).
   - Si esta fase ya estaba en curso, **retomá desde el handoff de `STATUS.md`** en vez de empezar
     de cero.
   - Ante cualquier inconsistencia, frená y preguntale a Cristian.
2. **BRIEF.** Si `docs/phases/P05/BRIEF.md` no existe o no está aprobado:
   - escribilo con `docs/templates/BRIEF.md`, refinando las tareas de `DEVELOPMENT_PLAN.md` §16
     con el estado real del código;
   - incluí cada 🔶 decisión con opciones, pros/contras, recomendación y qué no recomendás;
   - presentáselo a Cristian y **esperá su aprobación explícita**. No escribas código de la fase
     antes;
   - registrá la aprobación en `docs/decisions.md`.
3. **Implementación.**
   - Rama `phase/p05-<nombre>`.
   - Tarea por tarea, con commits `tipo(scope): P5.M descripción`.
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
   - Escribí `docs/phases/P05/REPORT.md` con `docs/templates/REPORT.md`.
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
