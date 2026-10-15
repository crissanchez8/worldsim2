# BRIEF — P00 · Fundaciones de arquitectura

| | |
|---|---|
| **Fecha** | 2026-10-14 |
| **Estado** | ✅ Aprobado el 2026-10-15 (tal cual; decisiones D30–D37) |
| **Tamaño** | M |
| **Fase anterior** | — (primera fase; plan v1.0 aprobado el 2026-10-14) |

> No se escribe código de esta fase hasta que Cristian apruebe este BRIEF.

## 1. Objetivo
Al terminar P0 existe una **casa profesional y vacía**:
- repo público con CI/CD gratis y preview por PR;
- `packages/core` con las primitivas deterministas del motor, testeadas;
- `docs/model.md` v1 aprobado: el modelo de dominio completo, diseñado antes de codear sistemas;
- los tres riesgos técnicos grandes medidos con spikes: terreno WebGPU, Worker con rebobinado y determinismo entre navegadores.

No hay simulación ni UI de producto todavía.

## 2. Contexto
- **Estado real:**
  - la carpeta `worldSim2` tiene solo `CLAUDE.md` y `docs/`; no es repo git y no hay código;
  - herramientas locales: Node 24.21, pnpm 10.33, gh 2.92 autenticado como `crissanchez8`, git 2.39;
  - máquina de medición: **Apple M1 Pro**, con Chrome, Firefox y Safari instalados.
- **Decisiones vigentes que condicionan la fase:**
  - D2 (stack), D6 (wrap E-O), D9 (rebobinar), D18 (compartir sin backend);
  - D20 (es/en), D21 (≈1.500 provincias), D23 (arquitectura primero), D24 (costo cero);
  - D26–D29: Q1 Cloudflare Pages, Q2 repo público, Q3 cuenta personal, Q4 MIT.
- **LEARNINGS y herencia que aplican:**
  - L-001: decisiones con tabla, recomendación y qué no recomiendo;
  - L-002: tareas verificables;
  - H-02: escritor único y contratos, no cachés acopladas al tick (guard de escritura en P0.10);
  - H-10: estado 100% hasheado (P0.7);
  - H-11: unidades físicas (glosario en `model.md`);
  - H-12: modelo diseñado de una vez, streams de RNG estables y golden solo para regresión (P0.4, P0.11).
- **Límites gratuitos verificados hoy** (fuentes oficiales; detalle en el ADR-007):

  | Servicio | Límites |
  |---|---|
  | Cloudflare Pages Free | 500 builds/mes, 1 build concurrente, 20 min por build, 20.000 archivos, 25 MiB por archivo, previews sin tope |
  | GitHub Actions | Gratis en repos públicos con runners estándar (confirmado en los cambios de precios de 2026) |
  | GitHub Pages (plan B) | Sitio de 1 GB, 100 GB/mes (blando), sin previews por PR |
- **WebGPU en macOS Apple Silicon:** activo por defecto en Chrome, Edge, Safari 26 y Firefox ≥ 147 (enero 2026). El spike A puede medir WebGPU en los cuatro navegadores.

## 3. Alcance

### Entra
- Repo, monorepo, lint (determinismo, fronteras, estilo), commits convencionales, plantilla de PR.
- `packages/core` completo: rng, math, ids/store, serialize+hash, events, modifiers, time+scheduler.
- Esqueleto vacío del resto de los paquetes de §8.1 (un `index.ts` y un test vacío cada uno).
- `apps/web` con una ruta placeholder y el toggle es/en cableado con la librería del ADR-005.
- `tools/cli` con `ws --version` y `ws bench`.
- `docs/model.md` v1 completo (todas las entidades y contratos de §10–§11, incluso los de fases futuras).
- ADR-001 a ADR-008.
- Spikes A, B y C, descartables, con mediciones en `docs/phases/P00/spikes.md`.
- CI en GitHub Actions + deploy a Cloudflare Pages (preview por PR, producción en `main`).

### No entra (explícito)
- Ningún sistema de simulación real (llegan en P1+). `model.md` se diseña completo, pero solo se implementa `core`.
- Worldgen real (el heightmap del spike A es ruido).
- UI de producto, Design System, `packages/ui` con contenido.
- `ws health`, `ws run`, `ws inspect` (P1).
- Formato `.wsim` implementado: en P0 solo se especifica (ADR-008).
- Promover código de los spikes a producción sin decidirlo en el REPORT.
- Código del proyecto anterior.

## 4. Tareas
Refinadas desde DEVELOPMENT_PLAN §16 · P0. Los cambios respecto del plan están marcados con **Δ**.

### Orden de ejecución propuesto
| Bloque | Tareas | Cierra con |
|---|---|---|
| 1 · Casa | P0.1 → P0.2 → P0.3 → P0.16 (CI/CD temprano, Δ) | Checkpoint 1 |
| 2 · Primitivas | P0.4 → P0.5 → P0.6 → P0.7 (+ ADR-001…004) | — |
| 3 · Modelo | P0.11 `model.md`; en paralelo, spike A (P0.13) | Checkpoint 2 (gate) |
| 4 · Primitivas de dominio | P0.8 → P0.9 → P0.10, alineadas con el `model.md` aprobado | — |
| 5 · Riesgos | P0.14 (spike B) → P0.15 (spike C) → P0.17 (bench) | Checkpoint 3 |
| 6 · Cierre | P0.12 (ADRs restantes) → P0.18 → QA gate → REPORT | Checkpoint 4 |

**Por qué este orden:**
- **CI/CD temprano:** cada PR posterior ya pasa por CI y tiene preview.
- **`model.md` antes de events/modifiers/scheduler:** el esquema de eventos, el registro de stats y los contratos del scheduler salen del modelo, no al revés.
- **Spike C sobre el `core` real:** corre rng, math y hash de producción en los tres navegadores, no solo la simulación ficticia. Es el test de determinismo que más vale.

---

**P0.1 Repo y convenciones**
- [ ] `git init` en `worldSim2`; primer commit con `CLAUDE.md` + `docs/` existentes
- [ ] Repo público `crissanchez8/worldsim2` vía `gh repo create` (Q5 renombra en P2 si hace falta; GitHub redirige)
- [ ] Protección de `main`: PR obligatorio + checks de CI obligatorios, **sin** aprobación obligatoria (sos el único humano; la revisión de cierre de fase es por proceso, §15.9)
- [ ] `LICENSE` MIT; `README.md` con setup ≤ 10 min; `.editorconfig`; `.nvmrc` y `engines` (**Δ Node 24 LTS**, ver D00-c); `packageManager: pnpm@10.x` (corepack)
- [ ] commitlint (convencional + scope obligatorio) + husky + lint-staged
- [ ] Plantilla de PR con la Definition of Done (§14.1) como checklist
- [ ] `.gitignore`: salidas de corridas, capturas temporales, `.env*`, `.turbo`, `dist`, `playwright-report`
- [ ] Rama `phase/p00-fundaciones`; PR de fase abierto como draft desde el primer push

**P0.2 Monorepo**
- [ ] pnpm workspaces + Turborepo: pipelines `build`, `typecheck`, `lint`, `test`, `bench`; caché local + caché de Actions (sin remote cache de Vercel: pide cuenta)
- [ ] `tsconfig.base.json` estricto: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `isolatedModules`; project references
- [ ] Esqueleto de paquetes de §8.1 (`@ws/core`, `worldgen`, `content`, `lang`, `sim`, `history`, `chronicle`, `i18n`, `ui`) con `package.json`, `tsconfig`, `index.ts` y un test vacío
- [ ] `apps/web`: Vite + React 19 + TS, una ruta placeholder, toggle es/en vía `@ws/i18n` (prueba que no hay strings sueltos desde el día 1)
- [ ] `tools/cli` con `ws --version` (lee `ENGINE_VERSION` de `core`)
- [ ] **Δ** `spikes/` como workspace aparte y descartable, excluido de las reglas de producción (ver D00-d)
- [ ] Fronteras con dependency-cruiser (D00-e):
  - el motor no importa `react`, `three`, `apps/`, `ui` ni globals de DOM;
  - `ui` no importa el motor;
  - nadie importa `spikes/`.
- [ ] Test: un import prohibido de prueba hace fallar `pnpm lint:deps`

**P0.3 Lint de determinismo y estilo**
- [ ] ESLint 9 (flat config) + typescript-eslint (type-aware) + Prettier
- [ ] Reglas del motor (`core`, `worldgen`, `content`, `lang`, `sim`, `history`, `chronicle`):
  - **Δ allowlist de `Math.*`**, más segura que una lista negra: solo `abs`, `floor`, `ceil`, `round`, `trunc`, `sign`, `min`, `max`, `sqrt`, `imul`, `fround`, `clz32` y constantes. El resto falla, incluidos `random`, las trigonométricas, `exp`/`log`/`pow`/`cbrt`/`hypot` y cualquier otro que se agregue al lenguaje en el futuro;
  - prohibidos `Date`, `performance`, `crypto.getRandomValues`, `for...in`, `Intl.*`, `toLocale*`, `setTimeout`/`setInterval`/`queueMicrotask` (el motor es síncrono; el Worker vive en `apps/web`);
  - prohibida la iteración de objetos con claves dinámicas (`Object.keys/values/entries` sobre `Record` indexados): se usan arrays y `Map`;
  - `Array.prototype.sort` sin comparador → error.
- [ ] **Test del lint**: un fixture por API prohibida, y el test exige que **cada uno** falle con la regla esperada. También un fixture permitido que debe pasar, para que no haya falsos positivos.

**P0.4 `core/rng` — RNG por contador**
- [ ] Mezcla de 32 bits con `Math.imul` (finalizador estilo SplitMix32/xxHash) → `hash(seed, stream, entity, year, k)`
- [ ] API: `rng.stream(StreamId.Demography).at(entityId, year)` → `uniform()`, `int(n)`, `range(a,b)`, `chance(p)`, `normal()` (con `core/math`), `weighted(items)`, `shuffle(array)`
- [ ] Registro de streams con ids **constantes explícitas** (no por orden de registro); test que falla si dos streams comparten id
- [ ] Tests:
  - vectores fijos de referencia (golden de RNG);
  - uniformidad (chi-cuadrado);
  - independencia entre streams y entre entidades (correlación);
  - property tests: `int(n) ∈ [0,n)`, `shuffle` es permutación.

**P0.5 `core/math` — matemática determinista**
- [ ] `exp`, `log`, `pow`, `sin`, `cos`, `tan`, `atan`, `atan2`, `tanh`, `sigmoid`, `log2`, `hypot`: reducción de rango + polinomios, solo con `+ − × ÷ sqrt`
- [ ] Utilidades: `clamp`, `lerp`, `smoothstep`, `remap`, `invLerp`, `wrapX` (cilindro E-O)
- [ ] Objetivo de precisión documentado en el ADR-003 (propuesta: error relativo ≤ 1e-12 en el rango útil; se ajusta si el costo lo pide)
- [ ] Tests:
  - error relativo vs `Math.*` sobre barridos densos;
  - casos borde (0, ±∞, NaN, subnormales);
  - vectores fijos bit a bit (comparando el `Float64` como dos `Uint32`).

**P0.6 `core/store` — almacenes**
- [ ] `IdAllocator` monótono por tipo de entidad (nunca reutiliza, ni tras cargar un snapshot)
- [ ] Tabla SoA: columnas de arrays tipados que crecen (`Float64`/`Float32`/`Int32`/`Uint32`/`Uint16`/`Uint8`) + columna de referencias por id; esquema declarativo con unidad por columna
- [ ] Bajas lógicas (bitset de vivos) + compactación controlada que preserva ids
- [ ] Tabla escasa por id (`Map` con orden de inserción) para personajes, guerras, etc.
- [ ] Iteración siempre en orden de id
- [ ] Property tests: secuencias aleatorias de alta, baja, compactación, iteración y crecimiento → invariantes (ids únicos crecientes, sin reutilización, orden estable)

**P0.7 `core/serialize` + hash**
- [ ] Formato binario versionado por tabla, derivado del esquema declarativo (P0.6), little-endian explícito vía `DataView`
- [ ] Hash del estado completo. Propuesta: **XXH64 implementado con pares de `uint32`** (sin `BigInt`, que es lento) y fallback a 2×XXH32 si el bench lo pide. Se decide en el ADR-004 con números.
- [ ] Regla "si está en el estado, está en el hash": el hash se calcula sobre los bytes serializados, no sobre una selección de campos. No hay forma de olvidarse un campo.
- [ ] Tests:
  - ida y vuelta → mismo hash y estado profundamente igual;
  - mutar cualquier columna o celda (property test) → otro hash;
  - versión desconocida → error explícito.

**P0.8 `core/events`**
- [ ] Esquema `{id, type, year, season?, actors[], place?, causes[], data, significance}` con causas tipadas (`{kind:'event', id}` o `{kind:'fact', entity, field, year}`)
- [ ] Registro tipado de tipos de evento: cada uno declara su clave de plantilla i18n, el esquema de `data` y la función de significancia
- [ ] Bus por tick con orden de emisión determinista; ids de evento monótonos
- [ ] Umbral de emisión por tipo (H-08: sin inundación de eventos triviales)
- [ ] Tests: causas inexistentes → error en dev; orden estable; serialización ida y vuelta

**P0.9 `core/modifiers`**
- [ ] Registro de stats con forma de agregación (aditiva, multiplicativa, mín, máx), unidad y rango
- [ ] Modificador `{target, stat, op, value, source:{type,id}, expires}`; aplicación en orden total determinista (op → fuente → id)
- [ ] `explain(entity, stat)` → árbol de causas serializable (lo consume el inspector desde P1)
- [ ] Tests: agregación por forma, vencimiento por año, `explain` suma exactamente el valor final, property test de independencia del orden de alta

**P0.10 `core/time` + scheduler**
- [ ] Calendario sin año 0 (1 a.C. → 1 d.C.), estaciones, conversión año ↔ índice de tick, formato neutro (el texto a.C./d.C. vive en `i18n`)
- [ ] Pipeline con las 14 fases de §8.3 y cadencias por sistema (anual, estacional, cada N años, por evento)
- [ ] Declaración de contrato `{reads, writes, emits, cadence, phase}` en código, con el mismo vocabulario que `model.md`
- [ ] Validación estática al registrar: dos sistemas que declaran escribir el mismo campo → error (escritor único)
- [ ] Guard de escritura en dev/test (proxy o vistas de solo lectura sobre las tablas): escribir fuera del contrato hace fallar el tick
- [ ] Tests: sistema que escribe fuera del contrato → falla; cadencias correctas en 1.000 años; orden de fases estable

**P0.11 `docs/model.md` — modelo de dominio v1** 🔶 gate
- [ ] Todas las entidades de §10 con campos, tipos, **unidades** y sistema dueño
- [ ] Red causal (§11.1) con cada flecha mapeada a sistema → campo
- [ ] Contratos de los 23 sistemas de §11.3, incluidos los de fases futuras
- [ ] Buffers de flujo entre sistemas (quién produce, quién consume, en qué fase)
- [ ] Invariantes globales (conservación de población, ids nunca reutilizados, cada provincia con exactamente un dueño o ninguno, shares de cultura y religión que suman 1, oferta monetaria ≥ 0, etc.)
- [ ] Máquinas de estado de §10.10 con eventos de transición
- [ ] Catálogo de eventos v0 (tipo, actores, causas esperadas, rango de significancia) y glosario de unidades
- [ ] Revisión juntos (checkpoint 2) → aprobación en `decisions.md`

**P0.12 ADRs (`docs/adr/`)**
- [ ] ADR-001 Monorepo y herramientas (incluye Node 24, dependency-cruiser, `spikes/`)
- [ ] ADR-002 RNG por contador
- [ ] ADR-003 Matemática determinista (precisión objetivo, allowlist de `Math`)
- [ ] ADR-004 Almacenes de estado, serialización y hash
- [ ] ADR-005 Librería de i18n (D00-a)
- [ ] ADR-006 Backend de render: se confirma tras el spike A, con datos
- [ ] ADR-007 Hosting, método de deploy y límites gratuitos verificados (D00-b)
- [ ] ADR-008 Formato de historia `.wsim` v0 (solo especificación; lo informa el spike B)

**P0.13 Spike A — terreno** (`spikes/terrain`)
- [ ] Heightmap de ruido 2048×1024 → malla por chunks con LOD simple
- [ ] Wrap E-O sin costura visible; cámara con pan infinito horizontal
- [ ] Splat de 3 texturas CC0 de prueba (ambientCG/Poly Haven), con su licencia anotada
- [ ] HUD de medición: fps promedio y p5 en 60 s de recorrido scripteado, tiempo de carga, backend activo; parámetro `?backend=webgl2` para forzar fallback
- [ ] Medición en Chrome, Safari, Firefox (WebGPU y WebGL2) sobre el M1 Pro
- [ ] Desplegado en el preview (`/spikes/terrain/`)
- [ ] Conclusiones en `docs/phases/P00/spikes.md` → ADR-006

**P0.14 Spike B — Worker + deltas + rebobinado** (`spikes/worker`)
- [ ] Simulación ficticia: 1.500 provincias × 10 pops × 14.000 años en un Worker, usando `core` real (rng, math, store, serialize)
- [ ] Deltas anuales como `ArrayBuffer` transferibles; hilo principal pintando un mapa de colores a 60 fps
- [ ] Keyframes cada 100 años (comprimidos con fflate) + deltas en memoria; rebobinar a cualquier año
- [ ] Medición: ms/año (promedio, p95), throughput de mensajes, memoria pico, tamaño de la historia comprimida, fps del hilo principal durante la corrida
- [ ] Conclusiones → ADR-008 y ajuste de métricas de §2

**P0.15 Spike C — determinismo entre navegadores** (`spikes/determinism`)
- [ ] Playwright corre la simulación del spike B + una batería de `core/math` y `core/rng` en Chromium, WebKit y Firefox; la misma batería corre en Node
- [ ] Comparación de hash **por año** (no solo el final) para localizar divergencias
- [ ] Verificación manual en **Safari real** (WebKit de Playwright ≠ Safari): página `/spikes/determinism/` que muestra el hash final; la abrís vos y comparás
- [ ] Diferencias encontradas y solución documentadas
- [ ] Se integra a CI (por PR si dura < 5 min; si no, nocturno)

**P0.16 CI/CD gratis**
- [ ] GitHub Actions por PR: install (caché pnpm) → typecheck → lint (estilo + determinismo + fronteras) → test → build (caché Turborepo)
- [ ] Deploy a Cloudflare Pages según D00-b: preview por PR con link comentado automáticamente en el PR; producción en `main`
- [ ] Badges de CI y deploy en el README
- [ ] Verificación: ningún servicio pidió tarjeta; todo en plan gratuito (evidencia en el ADR-007)

**P0.17 Bench harness**
- [ ] `ws bench`: ms/año (promedio, p95), tiempo de worldgen (placeholder hasta P1), memoria pico; salida JSON + tabla
- [ ] Línea base registrada en `docs/phases/P00/bench-baseline.json`
- [ ] Regla de regresión en CI con tolerancia amplia (los runners son ruidosos); las mediciones finas se hacen local

**P0.18 Documentación de trabajo**
- [ ] `CLAUDE.md` con comandos reales
- [ ] `STATUS.md`, `decisions.md`, `LEARNINGS.md`, plantillas y prompts revisados contra lo construido
- [ ] Prompt de P1 refrescado con lo aprendido

### Sub-hitos y checkpoints con Cristian
| Checkpoint | Qué se muestra | Cuándo |
|---|---|---|
| 1 · Casa | Repo público, PR con CI verde y link de preview a la página placeholder (es/en). **Probás el README** en un clon nuevo (criterio de salida). | Después de P0.16 |
| 2 · Modelo 🔶 gate | `model.md` v1 completo: lo revisamos juntos, por secciones si es largo. No se escriben events/modifiers/scheduler hasta tu OK. | Después de P0.11 |
| 3 · Riesgos | `spikes.md` con mediciones. Abrís el spike A en tu M1 Pro y la página de hash en **Safari**. Propuesta de ADR-006 y de métricas de §2 ajustadas. | Después de P0.15/P0.17 |
| 4 · Cierre | QA gate con evidencia + REPORT + OK de cierre | Final |

No hay maquetas 🎨 en P0: la única UI es una página placeholder y los HUD de los spikes.

## 5. Decisiones 🔶

### 🔶 D00-a · Librería de i18n (ADR-005)
Contexto:
- la UI usa i18n en React;
- `chronicle` (motor, headless, corre en Worker y en Node) necesita plantillas es/en con plurales y formatos;
- tiene que funcionar sin DOM y sin plugins de build raros.

| Opción | Pros | Contras |
|---|---|---|
| **i18next + react-i18next (recomendada)** | El ecosistema más grande; funciona igual en navegador, Worker y Node; catálogos JSON simples de editar; claves tipadas con TS; plurales y contexto nativos, ICU opcional | Runtime más pesado (~15–20 kB gz); las claves tipadas requieren un poco de configuración |
| Lingui | Mensajes ICU nativos; runtime chico; extracción automática de strings | Depende de macros de compilación (plugin de Babel/SWC en Vite): un paso más en Worker y CLI; ecosistema más chico |
| Paraglide JS (inlang) | Cada mensaje es una función tipada y tree-shakeable, el más liviano; sin runtime | Más joven; formato de mensajes propio; menos documentación para plurales complejos; cambio de idioma en caliente menos directo |

**Recomendación:** i18next. Es lo único que corre igual en los tres entornos del motor (UI, Worker, CLI) sin pasos de build especiales, y su madurez reduce el riesgo en un proyecto largo.
**No recomiendo:** Lingui. Las macros de compilación complican justo el lado headless (`chronicle` en Worker/Node), que es donde más texto vamos a generar.
**Bloquea:** P0.2 (toggle es/en de `apps/web`), ADR-005.

### 🔶 D00-b · Método de deploy a Cloudflare Pages (ADR-007)
| Opción | Pros | Contras |
|---|---|---|
| **Direct upload desde GitHub Actions con `wrangler pages deploy` (recomendada)** | Un solo build (el de CI) se testea y se despliega: lo que pasó los tests es lo que se publica; no consume los 500 builds/mes de Cloudflare (a confirmar en el ADR-007 con la doc y tu panel de uso); preview por rama con link comentado en el PR por nuestro workflow | Requiere un API token de Cloudflare guardado como secreto de GitHub (lo creás y cargás vos); un proyecto direct upload **no puede pasar después** a Git integration (sí al revés: se crea otro proyecto) |
| Git integration de Cloudflare | Cero secretos: conectás el repo en el panel y Cloudflare comenta el preview en el PR solo | Cloudflare vuelve a buildear por su cuenta: dos builds distintos (el de CI y el suyo); cada push a cualquier rama consume builds de 500/mes, y el proyecto anterior hizo 147 commits en una semana; 1 build concurrente → cola en días intensos; el build del monorepo en su entorno es otra cosa que mantener |
| Workers + static assets (en vez de Pages) | Es lo que Cloudflare empuja para proyectos nuevos; más features de backend | No necesitamos backend (D24); el soporte de previews por PR es menos directo que en Pages; elegimos Pages en Q1 |

**Recomendación:** direct upload desde Actions.
**No recomiendo:** Git integration. Duplicar el build rompe la garantía de "se publica lo que se testeó" y nos expone al tope de builds justo en las fases de mucho push.
**Bloquea:** P0.16.

### 🔶 D00-c · Versión de Node (Δ respecto del plan, que decía 22)
| Opción | Pros | Contras |
|---|---|---|
| **Node 24 LTS (recomendada)** | Es la que ya tenés instalada; LTS con soporte hasta abril 2028; mejor `fetch`/test runner/rendimiento | Node 26 pasa a LTS a fines de octubre 2026: en ~1 año habría que evaluar subir |
| Node 22 LTS | Lo que dice el plan | Ya está en mantenimiento (fin en abril 2027): habría que migrar en medio del proyecto; tendrías que instalar otra versión |
| Node 26 | La más nueva | Recién entra a LTS; riesgo de incompatibilidades en el tooling (Playwright, Vite) los primeros meses |

**Recomendación:** Node 24.
**No recomiendo:** 22. Vence en medio del proyecto.
**Bloquea:** P0.1.

### 🔶 D00-d · Dónde viven los spikes
| Opción | Pros | Contras |
|---|---|---|
| **Workspace `spikes/` aparte (recomendada)** | Descartables de verdad: se borra la carpeta y listo; no contaminan `apps/web` ni las fronteras; se pueden desplegar bajo `/spikes/*` en el preview | Un poco de configuración extra en el build de deploy |
| Rutas ocultas dentro de `apps/web` | Comparten setup | Tientan a promover código del spike sin decidirlo; ensucian la app que se vuelve producción |

**Recomendación:** `spikes/` aparte.
**No recomiendo:** meterlos en `apps/web`. Es exactamente la trampa de "spike que se vuelve producción".
**Bloquea:** P0.2, P0.13.

### 🔶 D00-e · Herramienta de fronteras entre paquetes
| Opción | Pros | Contras |
|---|---|---|
| **dependency-cruiser (recomendada)** | Valida el grafo completo, incluidas dependencias transitivas y de `package.json`; genera un diagrama del grafo para los docs; reglas declarativas legibles | Una herramienta más, que corre aparte de ESLint |
| eslint-plugin-boundaries | Todo dentro de ESLint; feedback en el editor | Solo ve imports directos por archivo; no detecta un paquete del motor que depende transitivamente de algo con DOM |

**Recomendación:** dependency-cruiser + `no-restricted-imports`/`no-restricted-globals` de ESLint para el feedback inmediato en el editor.
**No recomiendo:** depender solo de eslint-plugin-boundaries. Se le escapan las dependencias transitivas, que es justo cómo se cuela el DOM en un paquete del motor.
**Bloquea:** P0.2.

### 🔶 Pendientes que se deciden con datos (más adelante en la fase)
- **ADR-006** (WebGPU primero + fallback WebGL2): se confirma o se cambia tras el spike A (checkpoint 3).
- **Ajuste de las métricas de §2**: propuesta con las mediciones de los spikes A/B y el bench (checkpoint 3).
- **Hash XXH64 vs 2×XXH32** (P0.7): decisión técnica menor con bench. Te la reporto en el ADR-004; te pregunto solo si cambia algo visible.

## 6. Impacto en el modelo de dominio
- **Se crea** `docs/model.md` v1: todas las entidades de §10, los contratos de los 23 sistemas de §11.3, los buffers de flujo, los invariantes, las máquinas de estado, el catálogo de eventos v0 y el glosario de unidades.
- **En código** solo existen las primitivas genéricas (`core`). No hay entidades de dominio todavía; P1 implementa las primeras sobre estas primitivas.
- **Golden:** nace el golden de RNG y `core/math` (vectores fijos). No hay golden de simulación hasta P1.
- **Salud:** no aplica en P0 (no hay simulación).

## 7. Riesgos
| Riesgo | Mitigación |
|---|---|
| `model.md` sobre-diseñado o que se demore | Profundidad proporcional: entidades y contratos completos, pero los sistemas de fases lejanas (P7–P10) con campos al nivel de §10 y "a refinar en su BRIEF"; revisión por secciones |
| `Math.sqrt` o conversiones de float difieren entre motores JS | Spike C compara por año y aísla la batería de `core/math`; si aparece una diferencia, se reemplaza por implementación propia |
| La implementación de `core/math` es lenta | Bench en P0.5; tablas o polinomios de menor grado donde la precisión lo permita (documentado en el ADR-003) |
| WebKit de Playwright ≠ Safari | Página de hash para verificación manual en Safari (checkpoint 3) |
| Spike A no llega a 60 fps en el M1 Pro | Es justamente lo que mide; las palancas son LOD agresivo, chunks más grandes y menos texturas. Si no alcanza, se lleva el dato a ADR-006 y al ajuste de métricas |
| Límites gratuitos distintos a lo documentado | Verificación en el panel de uso de Cloudflare tras los primeros deploys; plan B GitHub Pages documentado |
| CI lento por Playwright × 3 navegadores | Caché de navegadores; si el spike C pasa de 5 min, va a una corrida nocturna (`schedule`) |
| Lint de determinismo con huecos | Allowlist en lugar de lista negra + test con un fixture por API prohibida |

## 8. Criterios de salida (QA gate)
- [ ] Clon nuevo → `pnpm i` → `pnpm dev` en ≤ 10 min siguiendo el README (**lo probás vos**)
- [ ] PR → CI verde + link de preview automático en el PR
- [ ] El lint de determinismo falla con **cada** API prohibida (test en CI) y el de fronteras con un import prohibido
- [ ] `core`: tests unitarios + propiedades verdes; RNG y math con vectores fijos
- [ ] Spike A: ≥ 60 fps promedio en M1 Pro con heightmap 2048×1024 + wrap; fallback WebGL2 funcional
- [ ] Spike B: 14.000 años ficticios en ≤ 3 min sin bloquear la UI (60 fps sostenidos en el hilo principal)
- [ ] Spike C: hash por año idéntico en Chromium, WebKit, Firefox y Node + verificación manual en Safari
- [ ] `docs/model.md` aprobado por vos (registrado en `decisions.md`)
- [ ] ADR-001 a ADR-008 escritos (el 006 con datos del spike A)
- [ ] `ws bench` con línea base registrada
- [ ] Costo: USD 0, sin tarjetas cargadas en ningún servicio
- [ ] REPORT escrito, docs actualizados, prompt de P1 refrescado

## 9. Preguntas para Cristian
1. **D00-a a D00-e:** ¿aprobás mis recomendaciones o cambiás alguna?
2. **Supuesto S2** (mundo realista: solo humanos, sin magia, nombres ficticios, no es la Tierra): ¿confirmado?
3. **Supuesto S4** (navegadores soportados): propongo las **2 últimas versiones mayores de Chrome, Edge, Safari y Firefox de escritorio**. En macOS Apple Silicon todos tienen WebGPU; WebGL2 es el piso. ¿Confirmado?
4. **Nombre del repo:** `crissanchez8/worldsim2` hasta que Q5 defina el definitivo en P2. ¿Ok?
5. **Pasos que vas a tener que hacer vos** (te los pido con el comando exacto cuando lleguemos, nada antes):
   - crear una cuenta gratuita de Cloudflare (sin tarjeta) y un API token con permiso "Cloudflare Pages: Edit";
   - cargar ese token y tu Account ID como secretos del repo (`gh secret set …`, pegando el valor vos);
   - probar el README en un clon nuevo (checkpoint 1);
   - abrir el spike A y la página de hash en Safari (checkpoint 3).
6. **Descargas:** el setup baja dependencias de npm (pnpm) y los navegadores de Playwright (~500 MB, desde el CDN oficial de Playwright). ¿Ok, como parte de aprobar el BRIEF?
