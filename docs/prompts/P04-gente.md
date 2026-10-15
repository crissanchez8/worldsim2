# Prompt de fase — P4 · Gente y sustento

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
5. `docs/DEVELOPMENT_PLAN.md`: §10.2 (población y sociedad), §11, §16 · P4, Apéndice A
6. `docs/phases/P03/REPORT.md`
7. `docs/model.md`: pops, culturas, idiomas, asentamientos
8. `docs/design-system.md` para la UI nueva

## Objetivo de la fase
La base humana:
- **poblaciones mixtas (pops)** con demografía calibrada;
- **modos de subsistencia** que nacen de la geografía;
- **domesticación** con varios focos neolíticos independientes;
- **culturas** emergentes que derivan y se separan;
- **idiomas procedurales** con familias reconocibles;
- **asentamientos** que crecen, decaen y quedan en ruinas.

## Tareas (detalle en DEVELOPMENT_PLAN §16 · P4)
- **P4.1 Pops v2:** esquema SoA completo, fusión y partición acotadas, invariante de
  conservación.
- **P4.2 Demografía:** natalidad y mortalidad por nutrición, enfermedad, penalidad urbana y
  guerra; capacidad emergente; ~0,04–0,1%/año de largo plazo.
- **P4.3 Modos de subsistencia** (forrajeo, pesca, pastoreo, horticultura, agricultura
  intensiva) con sus transiciones.
- **P4.4 Domesticación:** proceso de siglos; difusión filtrada por clima.
- **P4.5 Migración:** empuje y atracción, costos por terreno, colonización de tierra vacía.
- **P4.6 Estratos v1.**
- **P4.7 Cultura v2:** 6 valores derivados del entorno, estilo arquitectónico, deriva, escisión,
  mezcla, familias.
- **P4.8 Idiomas (`packages/lang`):** fonología, morfología liviana, léxico de raíces, cambio
  fonético al separarse, servicio de nombres, exónimos es/en.
- **P4.9 Asentamientos v2.**
- **P4.10 Salud v1:** carga de enfermedad, SIR básico.
- **P4.11 UI funcional:** modos de mapa densidad, cultura, familia lingüística y subsistencia;
  fichas de cultura, idioma y asentamiento; gráficos.
- **P4.12 Calibración** contra el Apéndice A.

## Decisiones 🔶 a resolver
- Topes de cantidad de pops por provincia y reglas de fusión (rendimiento vs. riqueza).
- Cadencias de deriva cultural y lingüística.
- Muestras de idiomas para que Cristian apruebe el "sonido" de los nombres.

## Criterios de salida
- [ ] Población dentro de las bandas del Apéndice A en ≥ 80% de 30 seeds
- [ ] 2–6 focos neolíticos independientes en el seed típico; continentes pobres en especies se atrasan
- [ ] Familias de idiomas coherentes con la geografía (vecinos emparentados, islas divergentes)
- [ ] Provincias mixtas (cultura y religión) observables; asimilación gradual
- [ ] Bench dentro del presupuesto con pops completos

## Trampas conocidas
- **Explosión de la cantidad de pops:** fusión agresiva de pops similares y tope por provincia;
  medilo en el bench desde el primer día.
- **Idiomas impronunciables o todos iguales:** reglas de fonotáctica + revisión de muestras por
  Cristian.
- **No reintroduzcas K constante** (capacidad fija): la capacidad emerge del alimento.
- **Esclavitud y servidumbre** llegan como instituciones en P7 (S3); acá solo estratos básicos.
- **Proyecto anterior (H-09):** pueblos asignados por grilla cuadrada. La cultura y el idioma
  nacen del entorno y de la historia, nunca de una grilla.

## Protocolo de trabajo (obligatorio)
1. **Punto de partida.**
   - Leé los documentos de "Antes de hacer nada".
   - Confirmá en `docs/STATUS.md` que la fase anterior está ✅ cerrada (OK registrado en
     `docs/decisions.md`).
   - Si esta fase ya estaba en curso, **retomá desde el handoff de `STATUS.md`** en vez de empezar
     de cero.
   - Ante cualquier inconsistencia, frená y preguntale a Cristian.
2. **BRIEF.** Si `docs/phases/P04/BRIEF.md` no existe o no está aprobado:
   - escribilo con `docs/templates/BRIEF.md`, refinando las tareas de `DEVELOPMENT_PLAN.md` §16
     con el estado real del código;
   - incluí cada 🔶 decisión con opciones, pros/contras, recomendación y qué no recomendás;
   - presentáselo a Cristian y **esperá su aprobación explícita**. No escribas código de la fase
     antes;
   - registrá la aprobación en `docs/decisions.md`.
3. **Implementación.**
   - Rama `phase/p04-<nombre>`.
   - Tarea por tarea, con commits `tipo(scope): P4.M descripción`.
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
   - Escribí `docs/phases/P04/REPORT.md` con `docs/templates/REPORT.md`.
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
