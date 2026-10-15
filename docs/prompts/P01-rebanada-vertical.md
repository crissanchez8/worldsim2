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
6. `docs/phases/P00/REPORT.md` y `docs/phases/P00/spikes.md`
7. `docs/model.md` y los ADRs de `docs/adr/`

## Objetivo de la fase
Todo el recorrido funcionando —**generar → mirar → rebobinar → resumen → compartir**— con
versiones **simples** de cada pilar, pero sobre la **arquitectura definitiva**: contratos, eventos
con causas, modificadores, historia, i18n.

Cada sistema simple será reemplazado en el lugar por su fase. La UI es **funcional y neutra**: no
hay Design System todavía y está prohibido pulirla.

## Tareas (detalle en DEVELOPMENT_PLAN §16 · P1)
- **P1.1 Worldgen v1:**
  - placas simples, erosión térmica, clima por latitud y altura;
  - 8–10 biomas, ríos por caudal;
  - provincias por crecimiento de costo mínimo con wrap; zonas marítimas.
- **P1.2 Mapa v1:**
  - terreno + agua + ríos;
  - textura de ids de provincia + textura de colores → relleno político y fronteras;
  - zoom semántico v0, marcadores, picking.
- **P1.3 Simulación v1:** pops, subsistencia, conocimiento (~10 innovaciones), asentamientos,
  jefaturas, expansión, guerra abstracta estacional, gobernantes con sucesión, idioma simple para
  nombres, eventos con causas.
- **P1.4 Historia v1:** keyframes + deltas, consultas "a la fecha", guardar/cargar en IndexedDB,
  `.wsim` v0.
- **P1.5 Tiempo y director v1:** velocidades, ritmo por era, línea de tiempo con scrub.
- **P1.6 UI v1 neutra:** crear, vivo (mapa, controles, teletipo, inspector) y resumen (listas,
  ficha genérica, 3 gráficos); es/en.
- **P1.7 Compartir v1:** URL con seed + parámetros + versión del motor.
- **P1.8 Salud v1:** `ws health` con 10 seeds.
- **P1.9 Rendimiento:** bench y optimización dentro del presupuesto.

## Decisiones 🔶 a resolver
- Curva de ritmo por era (años por segundo a velocidad normal).
- Lista explícita de lo que queda **fuera** de la rebanada.

## Criterios de salida
- [ ] Mundo mediano generado en ≤ 20 s
- [ ] 12.000 a.C. → 1900 en ≈10 min a velocidad normal y ≤ 3 min a velocidad máxima
- [ ] Rebobinar a cualquier año: el mapa y el inspector muestran ese año
- [ ] Guardar/cargar a mitad de corrida → continuación con hash idéntico
- [ ] Un link compartido reproduce el mismo mundo (hash idéntico)
- [ ] Toda entidad del resumen tiene ficha navegable; 3 gráficos correctos
- [ ] El toggle es/en cambia toda la UI y los textos de eventos
- [ ] Cero errores de consola; CI verde

## Trampas conocidas
- **La rebanada tiende a crecer.** Cada sistema hace lo mínimo con contrato completo; anotá
  "no hacer" por sistema en el BRIEF.
- **Los sistemas simples no son atajos:** respetan escritor único, eventos con causas y
  modificadores. Si no, el reemplazo de cada fase se vuelve reescritura.
- **No pulas la UI:** el diseño se decide en P2 sobre esta rebanada.
- **El link compartido incluye la versión del motor;** otra versión no garantiza el mismo mundo.
- **Verificá visualmente en el navegador integrado** (capturas en el REPORT); no declares una
  pantalla terminada sin verla.

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
