# Prompt de fase — P7 · Estado y poder

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
4. `docs/decisions.md` (D13)
5. `docs/DEVELOPMENT_PLAN.md`: §10.5–§10.6, §10.10, §11.2, §16 · P7
6. `docs/phases/P06/REPORT.md`
7. `docs/model.md`: política, personajes, máquinas de estado
8. `docs/design-system.md`: genealogía, emblemas, ModifierBreakdown

## Objetivo de la fase
Cómo nacen los estados, quién manda y cómo cambia el poder:
- formación del estado (incluida la circunscripción ambiental);
- títulos; casas y personajes con **nivel de detalle** ("casas, no cortes");
- sucesión, vasallaje como contrato, estamentos;
- **régimen institucional** cuya etiqueta se deriva de su estructura, con transiciones por
  eventos con causas;
- administración y control por distancia, fisco (incluidos deuda, bancarrota y la decisión de
  envilecer);
- legitimidad, facciones y guerras civiles, intriga, matrimonios y uniones personales.

## Tareas (detalle en DEVELOPMENT_PLAN §16 · P7)
Es la fase más grande: se divide en **sub-hitos con checkpoint de Cristian**.
- **P7a — Formación + títulos + casas:**
  - P7.1 formación del estado;
  - P7.2 títulos y territorio;
  - P7.3 casas y personajes con LOD (≤ 3.000 completos vivos);
  - P7.4 sucesión.
- **P7b — Poder y régimen:**
  - P7.5 vasallaje;
  - P7.6 estamentos;
  - P7.7 régimen institucional;
  - P7.8 transiciones;
  - P7.9 administración y control;
  - P7.10 fisco;
  - P7.11 legitimidad y estabilidad.
- **P7c — Conflicto interno:**
  - P7.12 facciones y guerras civiles;
  - P7.13 intriga;
  - P7.14 matrimonios;
  - P7.15 servidumbre y esclavitud como instituciones (S3, tratamiento sobrio).
- **P7.16 UI funcional 🎨:** árbol genealógico y ficha de reino con maqueta previa; modos de
  vasallos, régimen, estabilidad y control; inspector con "por qué".
- **P7.17 Calibración y rendimiento.**

## Decisiones 🔶 a resolver
- Lista de rasgos de personaje.
- Leyes de sucesión incluidas.
- Taxonomía de regímenes y sus etiquetas derivadas.
- Reglas de promoción y degradación de LOD.
- Tratamiento de S3 (textos de eventos sensibles revisados por Cristian).

## Criterios de salida
- [ ] ≥ 3 regímenes distintos coexistiendo en 1500 d.C. en ≥ 80% de los seeds
- [ ] El 100% de las transiciones de régimen tiene cadena causal visible en la ficha
- [ ] Dinastías de ≥ 5 generaciones observables
- [ ] Una secesión cualquiera es explicable desde el inspector sin leer código
- [ ] Presupuesto de personajes y bench respetados

## Trampas conocidas
- **Proyecto anterior (H-05):** gobierno como etiqueta recalculada cada turno. Acá el régimen es
  estado persistente y la etiqueta es consecuencia.
- **Explosión de personajes:** LOD estricto; medí en el bench.
- **Que se coma el resto del proyecto:** respetá los sub-hitos y lo que no entra ("casas, no
  cortes": nada de consejos con muchos puestos, secretos, estrés ni cortesanos sin tierra).
- **La guerra externa con ejércitos es P9:** las guerras civiles acá pueden usar la guerra
  abstracta de P1 hasta entonces.

## Protocolo de trabajo (obligatorio)
1. **Punto de partida.**
   - Leé los documentos de "Antes de hacer nada".
   - Confirmá en `docs/STATUS.md` que la fase anterior está ✅ cerrada (OK registrado en
     `docs/decisions.md`).
   - Si esta fase ya estaba en curso, **retomá desde el handoff de `STATUS.md`** en vez de empezar
     de cero.
   - Ante cualquier inconsistencia, frená y preguntale a Cristian.
2. **BRIEF.** Si `docs/phases/P07/BRIEF.md` no existe o no está aprobado:
   - escribilo con `docs/templates/BRIEF.md`, refinando las tareas de `DEVELOPMENT_PLAN.md` §16
     con el estado real del código;
   - incluí cada 🔶 decisión con opciones, pros/contras, recomendación y qué no recomendás;
   - presentáselo a Cristian y **esperá su aprobación explícita**. No escribas código de la fase
     antes;
   - registrá la aprobación en `docs/decisions.md`.
3. **Implementación.**
   - Rama `phase/p07-<nombre>`.
   - Tarea por tarea, con commits `tipo(scope): P7.M descripción`.
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
   - Escribí `docs/phases/P07/REPORT.md` con `docs/templates/REPORT.md`.
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
