# BRIEF — PNN · <Nombre de la fase>

| | |
|---|---|
| **Fecha** | AAAA-MM-DD |
| **Estado** | 📋 En revisión · ✅ Aprobado el AAAA-MM-DD (con ajustes: …) |
| **Tamaño** | S / M / L / XL |
| **Fase anterior** | PNN-1 cerrada el AAAA-MM-DD (link al REPORT) |

> No se escribe código de esta fase hasta que Cristian apruebe este BRIEF.

## 1. Objetivo
Una o dos frases: qué es verdad al terminar esta fase que hoy no lo es.

## 2. Contexto
- De dónde venimos (lo relevante del REPORT anterior, deuda heredada).
- LEARNINGS que aplican a esta fase.
- Decisiones vigentes que la condicionan (D#).

## 3. Alcance
### Entra
- …
### No entra (explícito)
- …

## 4. Tareas
Refinadas desde DEVELOPMENT_PLAN §16, con los ajustes que surgen del estado real del código.

**PNN.1 <Tarea>**
- [ ] Subtarea verificable
- [ ] …

**PNN.2 …**

### Sub-hitos y checkpoints con Cristian
| Checkpoint | Qué se muestra | Cuándo |
|---|---|---|
| 🎨 … | maqueta / demo / reporte | después de PNN.x |

## 5. Decisiones 🔶
Cada una con opciones, pros/contras, recomendación y qué no recomiendo.

### 🔶 DNN-a · <Pregunta>
| Opción | Pros | Contras |
|---|---|---|
| A (recomendada) | … | … |
| B | … | … |

**Recomendación:** … porque …
**No recomiendo:** … porque …
**Bloquea:** PNN.x

## 6. Impacto en el modelo de dominio
- Entidades, campos y contratos nuevos o modificados (se reflejan en `docs/model.md`).
- Eventos nuevos.
- Efecto esperado en el golden y en la suite de salud.

## 7. Riesgos
| Riesgo | Mitigación |
|---|---|
| … | … |

## 8. Criterios de salida (QA gate)
- [ ] Verificable 1
- [ ] …
- [ ] CI verde · salud sin regresiones · bench dentro del presupuesto
- [ ] REPORT escrito, docs actualizados, prompt de la próxima fase refrescado

## 9. Preguntas para Cristian
1. …
