# Prompt de fase — P0 · Fundaciones de arquitectura

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
3. `docs/LEARNINGS.md` (incluida la sección "Herencia del proyecto anterior")
4. `docs/decisions.md`
5. `docs/DEVELOPMENT_PLAN.md` **completo**: es la primera fase y define la arquitectura de todo lo demás. Prestá especial atención a §7 (costo cero), §8 (arquitectura), §10–§11 (modelo de dominio y sistemas), §14 (calidad), §15 (contrato) y §16 P0.
6. `docs/templates/` (BRIEF, REPORT, ADR)

## Objetivo de la fase
Una casa profesional y vacía:
- repo, herramientas y CI/CD gratuitos;
- las **primitivas deterministas del motor** (`packages/core`);
- el **modelo de dominio diseñado antes de codear** (`docs/model.md`);
- los tres riesgos técnicos grandes despejados con spikes medidos: terreno WebGPU, Worker con
  deltas y rebobinado, determinismo entre navegadores.

**Prerrequisitos:**
- el plan aprobado (v1.0 registrada en `decisions.md`);
- las preguntas Q1–Q4 respondidas: hosting, visibilidad del repo, cuenta de GitHub, licencia.

Si falta algo, empezá preguntándolo con opciones y recomendación.

## Tareas (detalle y subtareas en DEVELOPMENT_PLAN §16 · P0)
- **P0.1–P0.3 Repo y herramientas:**
  - repo y convenciones;
  - monorepo pnpm + Turborepo con fronteras entre paquetes;
  - lint de determinismo y estilo.
- **P0.4–P0.10 `packages/core`:**
  - RNG por contador con streams;
  - matemática determinista;
  - almacenes SoA;
  - serialización + hash;
  - eventos con causas;
  - modificadores con `explain()`;
  - calendario + scheduler con contratos.
- **P0.11 `docs/model.md`:** modelo de dominio v1 completo (todas las entidades, unidades,
  dueños, red causal, contratos de todos los sistemas, invariantes, catálogo de eventos).
  **Gate de aprobación con Cristian.**
- **P0.12 ADRs** 001–008.
- **P0.13–P0.15 Spikes:**
  - A: terreno 2048×1024 con wrap, WebGPU + fallback WebGL2;
  - B: Worker + deltas + rebobinado con 14.000 años ficticios;
  - C: hash idéntico en Chromium, WebKit, Firefox y Node.
- **P0.16 CI/CD gratis:** GitHub Actions + hosting estático con previews.
- **P0.17 Bench harness:** `ws bench`.
- **P0.18 Docs:** revisar `CLAUDE.md` (comandos reales), STATUS, plantillas y prompts contra lo
  construido.

## Decisiones 🔶 a resolver
- Q1 hosting
- Q2 visibilidad del repo
- Q3 cuenta de GitHub
- Q4 licencia
- ADR-005: librería de i18n
- ADR-006: confirmar WebGPU primero tras el spike A
- Ajuste de las métricas objetivo de §2 con las mediciones reales

## Criterios de salida
- [ ] Clon nuevo → `pnpm i` → `pnpm dev` en ≤ 10 min siguiendo el README (lo prueba Cristian)
- [ ] PR → CI verde + link de preview automático
- [ ] Spike A ≥ 60 fps promedio (M-series) con wrap; fallback WebGL2 funcional
- [ ] Spike B: 14.000 años ficticios en ≤ 3 min sin bloquear la UI
- [ ] Spike C: hash idéntico en Chromium, WebKit, Firefox y Node
- [ ] `docs/model.md` aprobado por Cristian
- [ ] Costo: USD 0, sin tarjetas cargadas

## Trampas conocidas
- **Los logins interactivos los hace Cristian** (`gh auth login`, `wrangler login`, etc.):
  pedíselos con el comando exacto en un bloque `bash`; no intentes autenticar por él.
- **Límites gratuitos de hosting y CI:** verificalos en la documentación oficial actual antes de
  escribir el ADR-007. Cambian con el tiempo.
- **WebKit de Playwright no es Safari:** pedile a Cristian una verificación manual en Safari.
- **Los spikes son descartables:** no los promuevas a código de producción sin decidirlo en el
  REPORT.
- **`model.md` se diseña completo, pero en P0 solo se implementa `core`.** Los sistemas llegan en
  sus fases.
- **Probá el lint de determinismo:** que efectivamente falle con cada API prohibida. Un lint que
  no falla es peor que ninguno.

## Protocolo de trabajo (obligatorio)
1. **Punto de partida.**
   - Leé los documentos de "Antes de hacer nada".
   - Confirmá en `docs/STATUS.md` que el plan está aprobado (v1.0 registrada en
     `docs/decisions.md`).
   - Si esta fase ya estaba en curso, **retomá desde el handoff de `STATUS.md`** en vez de empezar
     de cero.
   - Ante cualquier inconsistencia, frená y preguntale a Cristian.
2. **BRIEF.** Si `docs/phases/P00/BRIEF.md` no existe o no está aprobado:
   - escribilo con `docs/templates/BRIEF.md`, refinando las tareas de `DEVELOPMENT_PLAN.md` §16
     con el estado real del código;
   - incluí cada 🔶 decisión con opciones, pros/contras, recomendación y qué no recomendás;
   - presentáselo a Cristian y **esperá su aprobación explícita**. No escribas código de la fase
     antes;
   - registrá la aprobación en `docs/decisions.md`.
3. **Implementación.**
   - Rama `phase/p00-<nombre>`.
   - Tarea por tarea, con commits `tipo(scope): P0.M descripción`.
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
   - Escribí `docs/phases/P00/REPORT.md` con `docs/templates/REPORT.md`.
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
