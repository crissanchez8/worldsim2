# BRIEF — P01 · Rebanada vertical

| | |
|---|---|
| **Fecha** | 2026-10-16 |
| **Estado** | ✅ Aprobado el 2026-10-16 (tal cual; decisiones D48–D54) · fase cerrada el 2026-10-19 (REPORT en `REPORT.md`; la duración a 1× queda abierta por D56) |
| **Tamaño** | L |
| **Fase anterior** | P0 cerrada el 2026-10-16 ([REPORT](../P00/REPORT.md); OK registrado en `decisions.md`) |

> No se escribe código de esta fase hasta que Cristian apruebe este BRIEF.

## 1. Objetivo
Al terminar P1 se puede hacer el **recorrido completo en el navegador**:
**generar → mirar → rebobinar → resumen → compartir**.

- Cada pilar existe en una versión **simple**: mundo, mapa, gente, conocimiento, asentamientos,
  polities, guerra, gobernantes, nombres, historia, tiempo, UI y link.
- Todo corre sobre la **arquitectura definitiva**: contratos con guard, escritor único, buffers,
  eventos con causas, modificadores con `explain()`, historia según el ADR-008, i18n es/en.
- Cada sistema simple se **reemplaza en el lugar** en su fase (P3–P11), sin reescribir lo que lo
  rodea.

La UI es **funcional y neutra**: el diseño se decide en P2 sobre esta rebanada.

## 2. Contexto
- **Estado real del código (`main`, f7eb94e):**
  - `@ws/core` completo y testeado (rng, math, store, serialize, events, modifiers, time,
    scheduler);
  - `FlowBuffer<T>` de `core/scheduler` guarda **objetos**; el spike B midió −35% del costo del año
    con buffers en SoA e índices CSR;
  - `worldgen`, `sim`, `history`, `chronicle`, `content` y `lang` son **esqueletos vacíos**;
    `ui` no se toca hasta P2;
  - `apps/web` es una página placeholder con el toggle es/en;
  - `tools/cli` tiene `ws --version` y `ws bench` (primitivas + año sintético);
  - `spikes/terrain`, `spikes/worker` y `spikes/determinism` siguen en el repo, en el CI y en
    el sitio (`/spikes/*`).
- **Qué se reescribe de los spikes (D47):** ninguna carpeta pasa tal cual.

  | Spike | Se reescribe en P1, con tests | Dónde |
  |---|---|---|
  | A · terreno | Heightmap R16F + grilla compartida por LOD + desplazamiento en el vertex shader + faldones + esfera envolvente a mano; chunks reposicionados para el wrap; ruido sobre cilindro; precalentado con un render sincrónico; cola de GPU y estrés `?repeat=N` | `apps/web/src/map`, `packages/worldgen` |
  | B · Worker | Ledger con buffers SoA; `derive` con CSR; Worker por tandas con `MessageChannel`; deltas transferibles; historia (visual + deltas; keyframe + re-simulación) | `packages/sim`, `packages/history`, `apps/web/src/worker` |
  | C · determinismo | Batería de math y RNG + hash por año, ahora sobre el **motor real**; job `determinism`; página para Safari | `tools/determinism` (Δ, nuevo workspace) |

- **Decisiones vigentes que condicionan la fase:**
  - D5–D11: mapa híbrido, wrap E-O, observador puro, en vivo + rebobinar, 5–15 min, inicio
    ≈12.000 a.C. con el mundo poblado;
  - D18 compartir sin backend · D20 es/en · D21 ≈1.500 provincias · D23 arquitectura primero;
  - D42 `model.md` v1.0 (M1–M8) · D43 render WebGPU + fallback WebGL2 · D44 keyframes (ADR-008
    opción B) · D45 métricas (rebobinar ≤ 16 ms, estado a una fecha ≤ 500 ms, determinismo por
    año en CI) · D47 promoción de spikes.
- **LEARNINGS que aplican:**
  - L-004 tests de propiedades con la propiedad observable, validados con una mutación;
  - L-006 toda UI se abre en el navegador y se mira la consola;
  - L-007 buffers que crecen: casos por encima de la capacidad inicial;
  - L-008 editar con Edit, nunca con reemplazos por script;
  - L-009 medir contra el build · L-010 fps headless con control de cola de GPU (el panel
    oculto no corre `requestAnimationFrame`);
  - L-011/L-013 `pnpm check` encadenado con `&&` · L-012 WebKit local no anda (se prueba en el
    CI) · L-014 generadores que crean sus carpetas; probar en un clon limpio.
- **Herencia que aplica:** H-01 (pops mixtos), H-02 (escritor único), H-07 (la guerra no es una
  tirada de dados por frontera), H-08 (significancia y umbrales), H-11 (unidades), H-13 (biomas
  en franjas, ríos sin cuencas).

## 3. Alcance

### Entra
- **P1.0** Bases que pidió P0: buffers SoA en `core/scheduler`, `ledger` real, `derive` con CSR,
  `packages/content` con zod, esqueleto de `packages/sim` y la suite de determinismo sobre el
  motor real.
- **Worldgen v1** en su propio Worker: placas, erosión térmica, clima por latitud y altura,
  8–10 biomas, ríos por caudal, provincias con wrap, zonas marítimas, grafo con costos en días.
- **Mapa v1:** terreno, agua, ríos, relleno político, fronteras, zoom semántico v0, marcadores,
  picking.
- **Simulación v1** con 12 sistemas con contrato:
  - `production`, `demography`, `knowledge`, `characters`, `succession`;
  - `statecraft`, `diplomacy`, `military`, `settlements`;
  - `ledger`, `derive`, `chronicle`.
- **Historia v1** (ADR-008), tiempo con ritmo por era, UI neutra (crear, vivo, resumen), link
  compartible, `ws health`, bench `world-medium`.

### No entra (explícito)
Lo que llega en su fase. Los ítems límite, en los que tu opinión puede cambiar el corte, están en
la decisión **D01-d**.

| Fuera de P1 | Fase |
|---|---|
| Tectónica con deriva, erosión hidráulica, vientos y corrientes, suelos, recursos, especies, deglaciación, génesis animada | P3 |
| Migración, asimilación, estratos, escisión cultural, cambio de idiomas, domesticación por especie, ruinas, varios asentamientos por provincia, epidemias | P4 |
| Grafo de ≈150 innovaciones, pérdida de conocimiento, eras regionales | P5 |
| Bienes, mercados, rutas, moneda | P6 |
| Títulos jerárquicos, vasallaje, casas, estamentos, regímenes, leyes (salvo sucesión), fisco, intriga, facciones, **reclamos** | P7 |
| Religiones (en P1 el campo `religion` del pop es 0 = ninguna) | P8 |
| Ejércitos visibles, logística, sitios, alianzas, coaliciones, IA de agenda | P9 |
| Clima dinámico, shocks, colapsos, industria | P10 |
| Enciclopedia con búsqueda, crónica, episodios, LLM, director de cámara | P11 |
| Cualquier pulido visual (paleta, tipografía, iluminación, modelos 3D) | P2 / P12 |
| Landing, galería, "cómo funciona" | P13 |

## 4. Tareas
Refinadas desde DEVELOPMENT_PLAN §16 · P1 con el estado real del código. Los cambios respecto del
plan están marcados con **Δ**. Cada sistema trae su lista de **no hacer** (trampa "la rebanada
crece").

### Orden de ejecución propuesto
| Bloque | Tareas | Cierra con |
|---|---|---|
| 1 · Bases | P1.0 | — |
| 2 · Mundo | P1.1 → P1.2 (+ escenario de worldgen en el bench) | Checkpoint 1 |
| 3 · Simulación | P1.3, con `ws run`, `ws health` (P1.8) y el escenario `world-medium` (P1.9) desde el primer sistema | Checkpoint 2 |
| 4 · Historia y tiempo | P1.4 → P1.5 | — |
| 5 · UI y compartir | 🎨 wireframes → P1.6 → P1.7 | Checkpoint 3 |
| 6 · Rendimiento y cierre | P1.9 (optimizar) → QA gate → REPORT | Checkpoint 4 |

**Por qué este orden:**
- **Las bases primero:** cada sistema de P1.3 nace sobre los buffers SoA, el ledger y el guard;
  si no, el reemplazo de cada fase se vuelve reescritura.
- **Medir antes de optimizar:** `ws health` y el bench `world-medium` existen desde el primer
  sistema. Así cada sistema nuevo muestra su costo y su efecto en la dinámica (P0 §12).
- **Historia antes que UI:** el inspector "a la fecha" depende de qué guardan los deltas
  (D01-c).

**Rama:** `phase/p01-rebanada`, con PR de fase en draft desde el primer push.

---

**P1.0 Bases que pidió P0 (Δ nueva)**
- [x] **Buffers de flujo tipados en SoA** en `core/scheduler`:
  - declarados con un esquema (columnas tipadas con unidad);
  - crecimiento, `size` y `clear()`; el pipeline verifica I9 igual que con `FlowBuffer`;
  - `FlowBuffer<T>` de objetos queda solo para buffers fríos;
  - tests por encima de la capacidad inicial (L-007);
  - bench: SoA contra objetos.
- [x] **`packages/content`** con zod:
  - primeras tablas: `Biome`, `SettlementLevel`, `Innovation`, `Era`, `Stratum` (uno),
    `MapType`, `WorldSize`, `Law` (solo sucesión);
  - hash de contenido para la cabecera de snapshots y `.wsim`.
- [x] **Esqueleto de `packages/sim`:**
  - esquemas de las entidades de P1 desde `model.md` (§6 de este BRIEF);
  - `createSim(worldStatic, params)`, pipeline, estado inicial, snapshot y carga;
  - guard de contratos activo en tests;
  - invariantes I2–I5, I9 e I10 verificados al final de cada tick en dev y tests.
- [x] **`ledger` real** (M1), reescrito desde el spike B:
  - `popDeltas` (nacimiento, muerte con causa, transferencia) y `territoryRequests` con
    prioridad;
  - creación del pop destino, fusión de pops de menos de 1 persona, contabilidad por causa (I2);
  - eventos `territory.changed` con la causa de la solicitud ganadora;
  - Δ las transferencias no tienen productor en P1 (migración y asimilación son P4), pero se
    implementan y testean ahora porque son la base de P4;
  - Δ los reclamos van a P7 (ver D01-d).
- [x] **`derive` con índices densos (CSR):**
  - provincia → pops; polity → provincias;
  - agregados por provincia y por polity;
  - vecinos entre polities.
- [x] **Suite de determinismo permanente** en `tools/determinism` (Δ workspace nuevo; reemplaza a
  `spikes/determinism`):
  - batería de math y RNG + hash del `WorldStatic` + hash por año del motor real;
  - referencia de Node generada en el build (creando sus carpetas, L-014);
  - Playwright × 3 motores en el job `determinism`;
  - página para la verificación manual en Safari;
  - Δ horizonte por PR: los años que entren en ~5 min (2.000 si el motor real no da para
    14.000); la corrida completa, por la noche.
- [x] **`ws run`** (seed, parámetros, años → hashes y resumen), base de `ws health` y de la
  referencia de determinismo.
- [x] **Política de versión:** `ENGINE_VERSION` pasa a 0.1.0 con el primer golden de simulación.
  Desde ahí, todo cambio intencional del golden la sube.

**P1.1 Worldgen v1** (`packages/worldgen`, en el Worker de worldgen)
- [x] Ráster de 2048×1024 (mediano) y 1024×512 (chico, para tests y desarrollo), con wrap E-O
- [x] Placas simples (Voronoi sobre el cilindro): elevación por tipo + levantamiento en bordes
  convergentes + ruido fractal sobre cilindro (reescrito del spike A)
- [x] Tipo de mapa por cantidad y tamaño de placas continentales: continentes, pangea,
  archipiélago
- [x] Nivel del mar por percentil (`landFraction`); erosión térmica simple
- [x] Temperatura por latitud y altitud (gradiente con unidad); humedad por bandas de latitud +
  distancia a la costa + sombra orográfica simple
- [x] Biomas v1 (8–10 clases, tabla tipo Whittaker en `content`)
- [x] Hidrología v1: priority-flood + acumulación de caudal (m³/s) → ríos que terminan en el mar
  o en un lago
- [x] Provincias v1:
  - semillas Poisson ponderadas por habitabilidad;
  - crecimiento Dijkstra con costo extra en crestas y ríos, con wrap;
  - `ProvinceStatic` (área, aptitud agrícola, rugosidad, clima medio, bioma dominante,
    habitabilidad, costera, caudal máximo);
  - zonas marítimas;
  - grafo CSR con `baseCost` en días (M7) y largo de frontera en km
- [x] Salida `WorldStatic` serializable y hasheada; progreso por etapa hacia la UI
- [x] Tests:
  - determinismo y golden del hash;
  - fracción de tierra dentro de ±5% del parámetro;
  - toda provincia conexa o marcada isla;
  - ríos sin tramos cuesta arriba;
  - costura del wrap con control negativo (validado con una mutación)
- [x] Bench: tiempo de worldgen del mundo mediano (≤ 20 s)
- **No hacer:** deriva de placas, erosión hidráulica, vientos, corrientes, suelos, depósitos,
  especies, deglaciación, nombres de provincias, génesis animada.

**P1.2 Mapa v1** (`apps/web/src/map`, enfoque del spike A, D43)
- [x] `WebGPURenderer` + TSL con fallback automático a WebGL2; `?backend=webgl2` para depurar
- [x] Terreno por chunks:
  - heightmap R16F + grilla compartida por LOD;
  - desplazamiento en el vertex shader y normales en el fragment;
  - faldones y esfera envolvente a mano;
  - color por bioma y sombreado; exageración vertical como parámetro
- [x] Wrap: chunks reposicionados en la copia más cercana; cámara envuelta a [0, ancho)
- [x] Agua con color por profundidad; ríos como líneas con ancho por caudal
- [x] Textura de ids de provincia + textura de colores por provincia → relleno político y
  fronteras (cambiar de año = actualizar ~1.500 colores)
- [x] Zoom semántico v0: de lejos plano coloreado, de cerca relieve
- [x] Marcadores instanciados: asentamientos por nivel, batallas recientes
- [x] Picking por el ráster de ids (CPU) → selección; nombre al pasar el mouse
- [x] Precalentado con un render sincrónico (no `compileAsync` sobre cientos de objetos)
- [x] **Medir la primera carga** con caché fría y caliente en Chrome y Firefox (riesgo de P0: un
  congelamiento de 8 s), anotando el backend
- **No hacer:** rótulos de reinos, texturas de splat, iluminación cuidada, vegetación, modelos 3D,
  paleta definitiva (P2/P12). Los colores políticos salen de `colorSeed`, sin coloreo de grafo
  (P2.4).

**P1.3 Simulación v1** (`packages/sim`; cada sistema mínimo, con contrato completo, eventos con
causas y significancia, y plantillas es/en)
- [x] **Estado inicial (−12000):**
  - bandas de forrajeros en toda la tierra habitable, con población total escalada por
    superficie habitable (Apéndice A: 1–10 M a 10.000 a.C.);
  - culturas placeholder por focos (≈1 cada 40 provincias, parámetro), cada una con su idioma v1;
  - un estrato; religión 0.
- [x] **`production` v1:**
  - uso del suelo en dos categorías (forrajeo, cultivo);
  - alimento = área × uso × `cropYield` (stat con modificadores de innovaciones y bioma);
  - → `productionOutput`;
  - evento `subsistence.shifted`;
  - **no hacer:** pastoreo, bienes, métodos de producción.
- [x] **`demography` v1:**
  - `birthRate` y `deathRate` (stats con modificadores) según la subsistencia y
    `foodSecurity` → `popDeltas`;
  - eventos `famine.started` / `.ended`;
  - **no hacer:** salud, edades, migración.
- [x] **`knowledge` v1:**
  - ≈12 innovaciones con prerrequisitos y requisitos de entorno: agricultura, pastoreo,
    cerámica, cobre, bronce, escritura, rueda, hierro, acuñación, navegación oceánica, imprenta,
    pólvora;
  - invención por población y urbanización;
  - difusión por adyacencia (`diffusionRate` con modificadores);
  - `InventionRecord` mínimo; evento `innovation.invented`;
  - **no hacer:** pérdida, inventores, eras regionales.
- [x] **`settlements` v1:**
  - un asentamiento por provincia como máximo;
  - nivel por población urbana con histéresis ±15% (`SettlementLevel` en `content`);
  - nombre del idioma local;
  - eventos `settlement.founded` / `.grew` / `.declined`;
  - **no hacer:** ruinas, edificios, puertos, caminos.
- [x] **`statecraft` v1 (polities):**
  - jefaturas que nacen de asentamientos con agricultura;
  - expansión a provincias vecinas sin dueño y absorción pacífica de vecinos débiles, por
    `territoryRequests`;
  - capital (se muda si se pierde); título mínimo con su titular (§6);
  - fin de una polity sin provincias;
  - eventos `polity.formed` / `.absorbed`;
  - **no hacer:** régimen, estabilidad, fisco, administración, vasallos.
- [x] **`diplomacy` + `military` v1 (guerra abstracta):**
  - declaración por utilidad simple: relación de fuerzas, frontera, enfriamiento entre guerras;
  - un enfrentamiento por estación (`combatStrength` con modificadores de bronce y hierro + RNG);
  - registro abstracto de `Battle`, bajas como `popDeltas`, puntaje y cansancio por bando;
  - cesión de provincias de frontera por `territoryRequests`;
  - paz por cansancio con `Treaty` de paz;
  - topes contra H-07: una guerra por par, enfriamiento, cansancio creciente;
  - eventos `war.declared` / `.ended`, `battle.fought`, `treaty.signed`;
  - **no hacer:** ejércitos en el mapa, alianzas, objetivos de guerra, sitios.
- [x] **`characters` + `succession` v1:**
  - gobernante y heredero como `Person` (nombre, sexo, nacimiento, muerte con causa, padre);
  - mortalidad por edad;
  - sucesión por primogenitura; si no hay heredero, gobernante nuevo sin vínculo;
  - eventos `person.died` (gobernantes) y `ruler.succeeded` (causa: la muerte);
  - **no hacer:** rasgos, casas, matrimonios, regencias, crisis sucesorias.
- [x] **Idioma v1** (`packages/lang`):
  - fonología por idioma desde una seed (inventario + estructura silábica);
  - `nombre(idioma, tipo, rng)` para personas, lugares, polities y guerras;
  - nombres guardados en `Name` al asignarse;
  - **no hacer:** cambio fonético, familias, morfología.
- [x] **`chronicle` v1:**
  - vacía el bus de eventos al log;
  - arma los deltas visuales, los resúmenes de D01-c y los agregados mundiales por año
    (población, polities, mayor polity, era dominante);
  - **no hacer:** episodios, relato.
- [x] Golden de simulación (seed fija, hash cada 1.000 años) y test de guardar/cargar →
  continuación idéntica

**P1.4 Historia v1** (`packages/history`, ADR-008 opción B, D44)
- [x] Grabador en el Worker:
  - keyframes completos comprimidos cada 100 años **en memoria**;
  - keyframes visuales; deltas visuales anuales;
  - resúmenes por entidad (D01-c); eventos por siglo
- [x] Consultas a la fecha:
  - mapa (≤ 16 ms);
  - resumen de cualquier entidad (instantáneo);
  - estado completo exacto (keyframe + re-simulación, ≤ 500 ms en vivo) para el "por qué" a la
    fecha
- [x] Codec `.wsim` v0 por bloques:
  - `META`, `KEYF` cada 1.000 años, `VKEY`, `DELT`, `EVNT`, `FINL` exacto, `INDX`;
  - tests de ida y vuelta;
  - medición del tamaño con el estado real (objetivo ≤ 20 MB)
- [x] Δ guardar en IndexedDB = guardar los bytes del `.wsim`. Un solo formato para guardar,
  exportar e importar; lista de mundos guardados (cargar y borrar)
- [x] Cargar a mitad de corrida → continuación con hash idéntico (test de Node + E2E)

**P1.5 Tiempo y director v1**
- [x] Worker de simulación por tandas con `MessageChannel`, protocolo tipado y deltas
  transferibles (reescrito del spike B), con el acople de D01-b
- [x] Velocidades: pausa, 1×, 2×, 4×, máx.
- [x] Ritmo por era (D01-a): años por segundo según la era dominante, con transición suave
- [x] Línea de tiempo con bandas de eras y marcadores de eventos significativos; scrub para
  rebobinar
- **No hacer:** cámara que sigue eventos ni pausas automáticas (director de P11).

**P1.6 UI v1 funcional y neutra** (después de los wireframes 🎨)
- [x] Router tipado (TanStack Router) y estado de UI (zustand) (§9 del plan)
- [x] **Crear mundo:**
  - seed, tamaño (chico/mediano), tipo de mapa, fracción de tierra;
  - generar, con progreso por etapa
- [x] **Vista en vivo:**
  - mapa;
  - controles de tiempo y línea de tiempo;
  - teletipo de eventos;
  - inspector de provincia, asentamiento, polity y personaje, con el "por qué" (`explain`) de
    los stats de P1
- [x] **Resumen v1:**
  - listas virtualizadas de polities, asentamientos, culturas, personajes y guerras;
  - ficha genérica navegable por entidad;
  - 3 gráficos con uPlot: población mundial, cantidad de polities, mayor polity
- [x] Toggle es/en en la barra: toda la UI y los textos de eventos
- [x] Estados vacío, cargando y error; atajos mínimos (espacio, ←/→); cero errores de consola
- [x] Verificación en el navegador integrado con capturas para el REPORT (L-006)
- **No hacer:** Design System, estilos más allá de un layout legible, animaciones, landing,
  galería, enciclopedia con búsqueda.

**P1.7 Compartir v1**
- [x] URL con seed + parámetros + `ENGINE_VERSION`
- [x] Abrir un link regenera el mundo y simula a velocidad máxima con progreso; después permite
  reproducir
- [x] Aviso si la versión del link no coincide con la del motor (otra versión no garantiza el
  mismo mundo)
- [x] E2E: el mismo link en otro navegador da el mismo hash

**P1.8 Salud v1 (`ws health`)**
- [x] 10 seeds, en paralelo con `worker_threads`
- [x] Métricas:
  - curva de población contra las bandas del Apéndice A (informativa en P1: no frena);
  - cantidad de polities en el tiempo y % de tierra con dueño;
  - extinciones de polities;
  - guerras (cantidad y duración) y duración de reinados;
  - eventos por tipo;
  - invariantes rotos (esto sí frena)
- [x] Reporte Markdown + HTML con gráficos; comparación contra la corrida anterior
  (`docs/phases/P01/health-baseline.json`)
- [x] CI: job `health` por PR si entra en ≤ 10 min; si no, nocturno

**P1.9 Rendimiento**
- [x] Escenario `world-medium` en `ws bench` **antes** de optimizar: worldgen + ms/año (prom y
  p95) + tamaño del keyframe y del `.wsim`
- [x] Perfilado; optimización hasta entrar en el presupuesto: prom ≤ 10 ms/año, p95 ≤ 25 ms;
  rebobinar el mapa ≤ 16 ms; estado completo a una fecha ≤ 500 ms (D45)
- [x] Regenerar las dos líneas base al cerrar (M1 Pro y runner del CI)

**P1.10 Cierre (Δ explícita)**
- [x] Destino de `spikes/` según D01-e
- [x] `model.md` v1.1 con los cambios de §6; ADR-008 actualizado con los tamaños reales
- [x] `CLAUDE.md` con los comandos nuevos (`ws run`, `ws health`, suite de determinismo)
- [x] REPORT, STATUS, prompt de P2 refrescado

### Sub-hitos y checkpoints con Cristian
| Checkpoint | Qué se muestra | Cuándo |
|---|---|---|
| 1 · Mundo | Preview con un mundo generado: terreno, ríos, provincias, picking. **Medís la primera carga** en Chrome, Firefox y Safari visibles (caché fría y caliente). Tiempo de worldgen | Después de P1.2 |
| 2 · Simulación viva | `ws run` y `ws health` de 10 seeds: población, polities, guerras y eventos con causas; el mapa político cambiando en el preview | Después de P1.3 |
| 🎨 Wireframes | Wireframes de baja fidelidad (cajas grises, sin estilo) de crear, vivo y resumen + ficha: aprobás la **estructura**, no el aspecto (eso es P2) | Antes de P1.6 (puede ir en paralelo al bloque 3) |
| 3 · Recorrido | Recorrido completo en el preview: generar → mirar 10 min a 1× → rebobinar → resumen → link en otro navegador; Safari en la página de determinismo | Después de P1.7 |
| 4 · Cierre | QA gate con evidencia + bench + salud + REPORT + OK de cierre | Final |

## 5. Decisiones 🔶

### 🔶 D01-a · Curva de ritmo por era (años por segundo a velocidad normal)
Contexto:
- D10 pide 5–15 min a velocidad normal; el criterio de salida, ≈10 min (14.000 años = 23 años/s
  de promedio);
- en la prehistoria pasa poco en milenios; desde el bronce pasa mucho en siglos.

Las eras de P1 son una **vista derivada** del conocimiento (`Era` en `content`). P5 las vuelve
regionales.

| Era (P1) | Entra con | Años/s a 1× | Duración con fechas tipo Tierra |
|---|---|---|---|
| Prehistoria | — | 60 | −12000 → −7000: 83 s |
| Neolítico | agricultura | 30 | −7000 → −3000: 133 s |
| Edad del bronce | bronce | 18 | −3000 → −1000: 111 s |
| Edad del hierro | hierro | 15 | −1000 → 1500: 167 s |
| Moderna temprana | imprenta o navegación oceánica | 5 | 1500 → 1900: 80 s |
| **Total** | | | **≈ 9,6 min** |

| Opción | Pros | Contras |
|---|---|---|
| **A · Por era dominante + piso de duración (recomendada)** | Lo que pide el plan: el ritmo sigue al mundo, no al calendario. Un mundo precoz se mira más lento justo cuando pasan cosas. Los valores son datos (config de `apps/web`, con unidad) y se calibran con `ws health` | La duración depende del seed. Se acota con un **piso**: si quedan más años de los que entran hasta 15 min, el ritmo sube lo justo |
| B · Por fecha fija (misma tabla, por calendario) | Duración exacta y predecible; trivial | Ignora el mundo: uno atrasado se mira lento cuando todavía no pasa nada, y uno precoz pasa rápido justo cuando pasan cosas; contradice "según la era dominante" del plan |
| C · Por densidad de eventos (adaptativo) | El más cinematográfico | Necesita mirar hacia adelante y reglas de director: es P11.8. Riesgo de alcance |
| D · Constante (23 años/s) | Lo más simple | 5.000 años de forrajeros = 3,6 min de nada; la edad moderna pasa en 17 s |

**Recomendación:** A.
- **Era dominante** = la más avanzada que alcanza al menos el **10% de la población mundial**
  (parámetro).
- **Velocidades:** 2× y 4× multiplican; "máx." corre lo que dé el motor (objetivo ≤ 3 min).
- **Calibración:** los años/s finales se ajustan con `ws health` para que la mediana de 10 seeds
  quede en 10 ± 1 min.

**No recomiendo:** D. Es justo lo que hace que la rebanada se sienta lenta al principio y
apurada al final.

**Bloquea:** P1.5.

### 🔶 D01-b · Acople entre la simulación y la reproducción (Δ nueva)
Contexto:
- el Worker simula y la UI muestra;
- rebobinar es *ver* (§8.4), y el link compartido simula a velocidad máxima.

| Opción | Pros | Contras |
|---|---|---|
| **A · Simulación adelantada con colchón (recomendada)** | El Worker simula lo más rápido que puede hasta un colchón por delante de la reproducción (≈500 años, parámetro) y la UI reproduce desde la historia al ritmo de D01-a. Un año caro (mucha guerra) no traba la reproducción. En vivo, un archivo cargado y un link usan el mismo camino. "Máx." = seguir a la cabeza | Gasta CPU por delante, acotado por el colchón. El Worker conoce años "futuros": la UI tiene que filtrar teletipo y línea de tiempo por la reproducción |
| B · Al ritmo (lockstep) | No hay nada por delante | Un año caro traba el cuadro; rebobinar y avanzar son caminos distintos (historia vs. simulación en vivo); "máx." es otro modo |
| C · Simular todo y después reproducir | Lo más simple; línea de tiempo completa desde el arranque | Rompe "en vivo" (D9); el visitante espera 2–3 min antes de ver algo |

**Recomendación:** A.

**No recomiendo:** C. Contradice D9 y la métrica de "ver algo en menos de 1 minuto" del visitante
curioso (§3 del plan).

**Bloquea:** P1.4, P1.5.

### 🔶 D01-c · Qué resúmenes por entidad llevan los deltas (inspector a la fecha, ADR-008)
Contexto:
- con un archivo cargado, el estado completo de un año arbitrario cuesta hasta 999 años de
  re-simulación (D44);
- en vivo, keyframe + re-simulación ≤ 500 ms (D45);
- el inspector tiene que responder al instante mientras arrastrás la línea de tiempo.

| Opción | Pros | Contras |
|---|---|---|
| **A · Resumen mínimo + registros permanentes (recomendada)** | Mínimo que cambia en el tiempo + derivar el resto. Chico, instantáneo y suficiente para las fichas de P1. Los resúmenes son solo para mostrar: se pueden cuantizar sin tocar el estado exacto ni el hash (lo que el ADR-008 descarta en la opción C es cuantizar el estado) | Hay que reconstruir a la fecha cosas como el titular de un título (desde eventos), y cada fase que agrega un campo visible decide si va al resumen |
| B · Resumen completo de cada entidad, todos los años | Consultas triviales | El archivo crece con cada campo y cada fase; con el estado real no entra en 20 MB |
| C · Sin resúmenes: siempre estado exacto por re-simulación | Exacto; nada nuevo que mantener | Con un archivo cargado: varios segundos por consulta; arrastrar la línea de tiempo se vuelve inusable |

Detalle de la opción A:

| Qué | Cuándo se graba | De dónde sale |
|---|---|---|
| Dueño, nivel del asentamiento, cultura mayoritaria, innovaciones conocidas (bitset), capital de cada polity | Al cambiar, en los deltas anuales | Deltas visuales |
| Población de cada provincia (log cuantizado u16, ±0,02%) y fracción urbana (u8) | Cada 10 años (parámetro), con interpolación | Serie por provincia |
| Población mundial, cantidad de polities, mayor polity, era dominante | Todos los años | Agregados (gráficos y ritmo) |
| Polity a la fecha: provincias, población, área | — | Se agrega en el cliente desde lo anterior |
| Nombres, fundación y fin, nacimiento y muerte, guerras, tratados | — | Registros permanentes del estado final (los ids no se reutilizan) |
| Titular de un título a la fecha | — | Eventos `ruler.succeeded` |
| "Por qué" exacto a la fecha (`explain`) | Bajo pedido | Keyframe + re-simulación: ≤ 500 ms en vivo; con progreso si viene de un archivo |

Estimado: ≤ 2 MB comprimido para 14.000 años (se mide en P1.4). Si el `.wsim` se pasa de 20 MB,
la serie pasa a cada 25 años.

**Recomendación:** A.

**No recomiendo:** B. Repite el error que el ADR-008 ya evitó: el archivo crece con cada fase.

**Bloquea:** P1.4 (y por eso el inspector de P1.6).

### 🔶 D01-d · Lo que queda fuera de la rebanada: ítems límite
La lista de §3 y los **no hacer** de cada tarea son mi propuesta. Estos son los ítems donde el
corte podría ir para cualquier lado:

| Ítem | Recomiendo | Por qué |
|---|---|---|
| "Por qué" (`explain`) en el inspector | **Dentro** | Es la promesa central (§2, objetivo 2) y `core/modifiers` ya lo hace: es una lista |
| Exportar e importar `.wsim` | **Dentro** | Está en el plan (P1.4); con D01-c, guardar ya produce esos bytes; prueba el formato temprano |
| Rótulos de reinos en el mapa | **Fuera** (P2/P12) | Son cartografía (tipografía, colocación curva); en P1 el nombre se ve al pasar el mouse y en el inspector |
| Modo de mapa cultural | **Fuera** (P4) | Solo político en P1; las culturas son placeholder y no se mueven |
| Nombres de provincias | **Fuera** (P4) | Las provincias se identifican por su asentamiento y su id; P4 trae topónimos con idiomas |
| Tamaños y tipos de mapa | **Chico y mediano; 3 tipos** (continentes, pangea, archipiélago) | Con placas sale casi gratis; los presets completos son P3.11 |
| Reclamos (`Claim`, `claimRequests`) en el ledger | **Fuera** (P7) · Δ respecto del prompt, que dice "población, territorio y reclamos" | En P1 nadie los produce: la primogenitura no crea reclamos y `Claim` es de P7 en `model.md`. Programarlos ahora es código sin uso ni prueba real |
| Títulos | **Mínimos dentro** (uno por polity, con titular) | `model.md` ubica al gobernante en `Title.holder`; así P7 solo agrega jerarquía y no reubica al gobernante |
| Casas y rasgos | **Fuera** (P7) | El gobernante tiene nombre, edad y padre; las dinastías son P7 |
| Varios mundos guardados | **Dentro**, como lista simple | Guardar/cargar es criterio de salida |

**Recomendación:** aprobar la tabla tal cual.

**No recomiendo:** sumar ejércitos visibles ni rótulos. Son los dos ítems que más tientan y los
que más arrastran (logística, colocación de texto) fuera del objetivo de la fase.

**Bloquea:** el alcance de todas las tareas.

### 🔶 D01-e · Qué hacer con `spikes/` al cerrar P1
| Opción | Pros | Contras |
|---|---|---|
| **A · Borrarlos al cerrar P1 (recomendada)** | Cuando todo lo de D47 esté reescrito y el job `determinism` corra sobre el motor real. Repo y CI más livianos: sin dependencias duplicadas (three), sin lint ni tests de código muerto, sin confusión sobre qué es lo vigente. Las mediciones quedan en `spikes.md` y el código en la historia de git (merge f7eb94e) | Para volver a correr un spike hay que recuperarlo de git |
| B · Dejarlos congelados como archivo | Siguen a mano en `/spikes/*` | Siguen en el CI, el lint y el sitio. Fijan versiones (three) que la app va a mover. El spike C queda reemplazado y engaña |
| C · Borrar cada uno apenas se reescribe | Limpieza más temprana | Se pierde la referencia para comparar a mitad de fase (primera carga del mapa contra el spike A, bench contra el B) |

**Recomendación:** A. Opcional: un tag `p00-spikes` antes de borrar, para encontrarlos fácil
(lo publico solo con tu OK).

**No recomiendo:** B. Código muerto que el CI sigue manteniendo.

**Bloquea:** P1.10.

## 6. Impacto en el modelo de dominio
Se implementa un subconjunto de `model.md` v1.0. Los cambios se reflejan en **v1.1** al cerrar la
fase.

- **Entidades de P1:**

  | Entidad | Campos en P1 |
  |---|---|
  | `World` | year, nextEventId |
  | `Province` | owner, landUse (2 de las 5 categorías), foodSecurity, knownInnovations |
  | `Pop` | province, culture, religion = 0, stratum = 0, size |
  | `Settlement` | province, urbanShare, level, founded, name |
  | `Culture` | Placeholder: name, originProvince, founded, language |
  | `Language` | name, phonologySeed |
  | `Name` | Dueño por fila |
  | `Polity` | name, capital, primaryTitle, founded, ended, endReason, colorSeed, ley de sucesión |
  | `Title` | Mínimo: level, holder, created, destroyed |
  | `Person` | name, sex, father, mother, born, died, deathCause, culture |
  | Guerra | `War`, `WarSide` (score, exhaustion), `Battle` abstracta, `Treaty` (paz), `InventionRecord`, `Modifier` |

- **Δ respecto de `model.md` v1.0** (aprobarlos es parte de aprobar este BRIEF):
  - `Settlement.name` pasa de P4 a P1 (idioma v1);
  - `Title` mínimo en P1 (el plan lo ponía en P7) para alojar al gobernante;
  - `Person` sin rasgos ni casa en P1 (`house` = 0);
  - `Claim` y `claimRequests` quedan en P7;
  - el ledger implementa transferencias sin productor hasta P4.
- **Stats de P1:** `cropYield`, `birthRate`, `deathRate`, `diffusionRate`, `combatStrength`,
  `movementCost` (ya listados en §5.12).
- **Eventos de P1:**
  - `subsistence.shifted`, `famine.started` / `.ended`, `innovation.invented`;
  - `settlement.founded` / `.grew` / `.declined`;
  - `polity.formed` / `.absorbed`, `territory.changed`;
  - `war.declared` / `.ended`, `battle.fought`, `treaty.signed`;
  - `person.died`, `ruler.succeeded`.

  Todos con causas, significancia, umbral y plantilla es/en.
- **Contenido nuevo:** `Biome`, `SettlementLevel`, `Innovation` (≈12), `Era` (5), `Stratum`
  (1), `MapType`, `WorldSize`, `Law` (sucesión) y los tipos de evento.
- **Golden y salud:** nacen el golden de simulación (hash cada 1.000 años de una seed fija) y la
  línea base de `ws health`. `ENGINE_VERSION` 0.1.0.

## 7. Riesgos
| Riesgo | Mitigación |
|---|---|
| La rebanada crece | "No hacer" por sistema; D01-d; checkpoints que muestran el recorrido antes de profundizar |
| Sistemas simples como atajos (sin contrato, sin causas) | Guard de contratos en todos los tests; invariantes por tick; DoD por tarea |
| El motor real se pasa de 10 ms/año | `world-medium` desde el primer sistema; palancas medidas en P0: SoA, CSR, `uint32` de un carril (ADR-002), muestreo por agregados |
| Worldgen > 20 s (priority-flood y Dijkstra sobre 2 M celdas) | Bench de worldgen en P1.1; montículo binario tipado; si no entra, los cálculos por provincia en la resolución chica y el render en la mediana |
| El estado real no entra en el `.wsim` (las personas crecen con la corrida) | Medir el keyframe en P1.4; personas solo gobernantes y herederos; serie cada 25 años si hace falta (D01-c) |
| Dinámica absurda (un imperio único, ninguna polity, guerra perpetua) | `ws health` desde el primer sistema; topes de H-07; la calibración fina es de P4–P9 |
| Congelamiento en la primera carga de Firefox | Precalentado con un render sincrónico; pocos objetos; medición con caché fría en el checkpoint 1 |
| El job `determinism` pasa de 5 min con el motor real | Horizonte corto por PR y completo nocturno (P1.0) |
| El panel del navegador oculto no corre `requestAnimationFrame` (L-010) y `preview_start` no levantó `vite preview` en P0 | Capturas y mediciones con Playwright contra el build; tus mediciones visibles en los checkpoints 1 y 3 |
| La UI neutra tienta a pulir | Prohibido hasta P2; el checkpoint 🎨 aprueba estructura, no aspecto |
| Dependencias nuevas incompatibles entre sí (L-005) | Revisar `peerDependencies` antes de fijar en el catálogo |

## 8. Criterios de salida (QA gate)
- [x] Mundo mediano generado en ≤ 20 s (Chrome, M1 Pro, build)
- [ ] 12.000 a.C. → 1900 en ≈10 min a velocidad normal y ≤ 3 min a velocidad máxima
- [x] Rebobinar a cualquier año: el mapa y el inspector muestran ese año
- [x] Guardar/cargar a mitad de corrida → continuación con hash idéntico
- [x] Un link compartido reproduce el mismo mundo (hash idéntico)
- [x] Toda entidad del resumen tiene ficha navegable; 3 gráficos correctos
- [x] El toggle es/en cambia toda la UI y los textos de eventos
- [x] Rebobinar el mapa ≤ 16 ms; estado completo a una fecha ≤ 500 ms (D45)
- [x] Hash por año idéntico en Chromium, Firefox, WebKit y Node con el motor real (job
  `determinism`); Safari a mano en la página de la suite
- [x] Δ `.wsim` de una corrida completa ≤ 20 MB (métrica de §2)
- [x] Δ `ws health` de 10 seeds sin invariantes rotos; contratos con guard en todos los tests
- [x] Cero errores de consola; CI verde · bench dentro del presupuesto, líneas base regeneradas
- [x] REPORT escrito, docs actualizados (`model.md` v1.1, ADR-008, `CLAUDE.md`), prompt de P2
  refrescado

## 9. Preguntas para Cristian
1. **D01-a a D01-e:** ¿aprobás mis recomendaciones o cambiás alguna?
2. **Reclamos fuera del ledger de P1** (Δ respecto del prompt, D01-d): ¿ok que vayan a P7?
3. **Cambios al modelo de §6** (`Settlement.name` y `Title` mínimo en P1; `Person` sin rasgos;
   transferencias del ledger sin productor): ¿ok? Quedan en `model.md` v1.1 al cerrar.
4. **Dependencias nuevas** (npm, versiones exactas en el catálogo):
   - `zod` (contenido);
   - `@tanstack/react-router`, `zustand`, `@tanstack/react-virtual`, `uplot` (UI, §8.6 y §9 del
     plan);
   - `three` y `fflate` ya están en el catálogo.

   ¿Ok la descarga como parte de aprobar el BRIEF?
5. **Sesión en paralelo:** en P0 corriste el spike A aparte. Propongo lo mismo para **P1.2
   (mapa)** apenas P1.1 fije la interfaz de `WorldStatic`: toca solo `apps/web/src/map`. ¿Lo
   querés en paralelo o todo en esta línea?
6. **Lo que vas a tener que hacer vos** (te lo pido con instrucciones exactas cuando lleguemos):
   - checkpoint 1: medir la primera carga del mapa en Chrome, Firefox y Safari visibles (Safari
     sin modo de bajo consumo);
   - checkpoint 3: mirar una corrida de 10 min a 1×, abrir un link compartido en otro navegador
     y correr la página de determinismo en Safari;
   - aprobar los wireframes 🎨 y el cierre.
