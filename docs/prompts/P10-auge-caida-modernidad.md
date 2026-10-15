# Prompt de fase — P10 · Auge, caída y modernidad

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
5. `docs/DEVELOPMENT_PLAN.md`: §11, §16 · P10, Apéndice A
6. `docs/phases/P09/REPORT.md`
7. `docs/model.md`: entorno, epidemias, colapso, producción industrial
8. `docs/design-system.md`

## Objetivo de la fase
Las dinámicas que hacen que la historia "respire":
- clima dinámico e inviernos volcánicos en zonas volcánicas reales;
- epidemias por rutas, con catástrofes de "suelo virgen";
- cascadas de colapso con edad oscura y renacimiento;
- medio ambiente.

Y el cierre del arco:
- navegación oceánica, exploración, primer contacto y colonización;
- **industrialización temprana** (ferrocarril y telégrafo con efectos sistémicos).

## Tareas (detalle en DEVELOPMENT_PLAN §16 · P10)
- **P10.1 Clima dinámico:** ciclos, inviernos volcánicos, sequías e inundaciones regionales.
- **P10.2 Epidemias v2:** agentes generados, contagio por redes, inmunidad, suelo virgen, nombres.
- **P10.3 Cascadas de colapso:** detección sistémica, efectos, edad oscura, recuperación.
- **P10.4 Medio ambiente:** suelos, deforestación, salinización.
- **P10.5 Navegación oceánica y exploración;** primer contacto.
- **P10.6 Colonización** (tratamiento sobrio).
- **P10.7 Industrialización:**
  - condiciones;
  - métodos fabriles, vapor;
  - **ferrocarril** (costo de movimiento) y **telégrafo** (capacidad administrativa);
  - transición demográfica;
  - nuevos estratos y presión política.
- **P10.8 Fin de la corrida** (S1: confirmar la fecha).
- **P10.9 UI funcional:** modos clima y epidemias; fichas de epidemia, colapso (**vista de cadena
  causal**), exploración, red ferroviaria.
- **P10.10 Calibración.**

## Decisiones 🔶 a resolver
- S1: fecha de fin (≈1900, configurable).
- Umbrales de colapso.
- Profundidad de la colonización.
- Qué tecnologías industriales entran (priorizar las de efecto sistémico).

## Criterios de salida
- [ ] Todo colapso tiene una cadena causal de ≥ 3 eslabones visible
- [ ] Epidemia de "suelo virgen" en ≥ 60% de los seeds con primer contacto
- [ ] La industrialización aparece solo donde se dan sus condiciones (test sobre 30 seeds)
- [ ] ≥ 1 ciclo auge-caída por mundo

## Trampas conocidas
- **Colapsos demasiado frecuentes** (el proyecto anterior tenía 20k "colapsos" por corrida) o
  demasiado raros: calibrar con la suite y umbrales de significancia.
- **Modernidad superficial:** mejor pocas tecnologías con efecto sistémico que muchas cosméticas.
- **Temas sensibles** (colonización, epidemias en poblaciones nativas): tratamiento sistémico y
  sobrio; textos revisados por Cristian.

## Protocolo de trabajo (obligatorio)
1. **Punto de partida.**
   - Leé los documentos de "Antes de hacer nada".
   - Confirmá en `docs/STATUS.md` que la fase anterior está ✅ cerrada (OK registrado en
     `docs/decisions.md`).
   - Si esta fase ya estaba en curso, **retomá desde el handoff de `STATUS.md`** en vez de empezar
     de cero.
   - Ante cualquier inconsistencia, frená y preguntale a Cristian.
2. **BRIEF.** Si `docs/phases/P10/BRIEF.md` no existe o no está aprobado:
   - escribilo con `docs/templates/BRIEF.md`, refinando las tareas de `DEVELOPMENT_PLAN.md` §16
     con el estado real del código;
   - incluí cada 🔶 decisión con opciones, pros/contras, recomendación y qué no recomendás;
   - presentáselo a Cristian y **esperá su aprobación explícita**. No escribas código de la fase
     antes;
   - registrá la aprobación en `docs/decisions.md`.
3. **Implementación.**
   - Rama `phase/p10-<nombre>`.
   - Tarea por tarea, con commits `tipo(scope): P10.M descripción`.
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
   - Escribí `docs/phases/P10/REPORT.md` con `docs/templates/REPORT.md`.
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
