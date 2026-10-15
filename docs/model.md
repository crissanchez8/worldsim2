# Modelo de dominio — worldSim2

| | |
|---|---|
| **Versión** | 1.0 (P0.11) |
| **Fecha** | 2026-10-15 |
| **Estado** | ✅ Aprobado el 2026-10-15 con M1–M8 (D42) |
| **Implementado en P0** | Solo las primitivas de `packages/core` (rng, math, store, serialize; luego events, modifiers, time). Las entidades llegan en su fase |
| **Fuentes** | DEVELOPMENT_PLAN §8, §10, §11 y §16 (P1–P11); LEARNINGS (herencia H-01…H-14) |

> Este documento es la **fuente de verdad del estado del motor**: qué entidades existen, qué
> campos tienen, en qué unidades, qué sistema es dueño de cada campo y en qué orden corren los
> sistemas. Cada fase lo actualiza en su REPORT. El código replica estos contratos
> (`defineSchema`, contratos de sistema) y los tests los verifican.

---

## 0. Cómo leer

**Columnas de las tablas de entidades**

| Columna | Significado |
|---|---|
| Campo | Identificador en código (inglés) |
| Tipo | `f64` `f32` `i32` `u32` `i16` `u16` `u8` `bool` · `ref<E>` (id de E, 0 = ninguno) · `refs<E>` (lista de ids) · `str` · `bits` (bitset) · `enum<C>` (índice de una tabla de contenido C) |
| Unidad | Del glosario (§3). Todo campo tiene unidad; los adimensionales también |
| Dueño | Único sistema que lo escribe (§1, regla 2). `worldgen` = estático |
| Fase | Cuándo se implementa |

**Almacén** (ADR-004): **T** = tabla SoA (muchas filas, columnas tipadas) · **S** = tabla escasa
(pocas filas, campos variables) · **G** = globales · **W** = mundo estático (worldgen) · **C** =
contenido (`packages/content`, datos validados con zod).

**Marcas:** ⏳ = la forma está decidida pero el detalle (campos exactos, fórmulas) se refina en
el BRIEF de esa fase · **M#** = decisión de modelo aprobada en el gate (§17, D42).

**Nivel de detalle:** completo para lo que se implementa en P1–P6; al nivel de §10 del plan,
con dueños y contratos, para P7–P11 (riesgo "sobre-diseño" del BRIEF).

---

## 1. Principios que este modelo hace cumplir

1. **Determinismo:** todo azar por `rng.stream(id).at(entidad, año)`; toda trascendente por
   `core/math`; iteración siempre en orden de id.
2. **Escritor único:** cada campo tiene **un** sistema dueño. Los demás lo leen. Cuando varios
   sistemas necesitan afectar el mismo campo, emiten **deltas a un buffer** y un único sistema los
   aplica (M1).
3. **Estado = snapshot = hash.** Si un dato cruza la frontera entre dos ticks, es estado: tiene
   dueño, está en el snapshot y en el hash (M4). Los buffers solo viven dentro del tick y están
   vacíos en la frontera (invariante I9).
4. **Derivado ≠ estado.** Las vistas derivadas (totales, mayorías, etiquetas) son funciones puras
   del estado; las recalcula `derive` y no se guardan (M3).
5. **Causalidad:** los efectos persistentes son **modificadores con fuente**; los eventos
   importantes llevan **causas** (eventos previos o hechos del estado) y **significancia**.
6. **Unidades físicas** en todo campo (glosario §3). Los números de calibración viven en
   `content` o en config, con unidad y comentario.
7. **Ids nunca reutilizados**, por tipo de entidad. Los registros históricos (personas muertas,
   batallas, polities extintas) no se borran: cambian de estado.
8. **Los eventos guardan datos, no texto.** El texto se arma en `chronicle`/`i18n` (es/en).

---

## 2. Capas del estado

```
contenido (C) ──┐ tablas de datos versionadas por hash de contenido; no van al snapshot
mundo estático (W) ─┤ salida del worldgen: función pura de (seed, parámetros, ENGINE_VERSION);
                    │ no va al snapshot (se regenera); su hash va en la cabecera del .wsim
estado dinámico ────┤ tablas T/S/G del motor: snapshot + hash (ADR-004)
buffers de flujo ───┤ dentro del tick; vacíos en la frontera (I9)
vistas derivadas ───┤ las recalcula `derive` al final de cada tick y después de cargar (M3)
historia ───────────┘ log de eventos, episodios, deltas visuales y keyframes (`history`,
                      `chronicle`): salida del motor; los sistemas no la leen (M2)
```

| Capa | Dónde vive | ¿Snapshot? | ¿Hash de estado? | Lo leen los sistemas |
|---|---|---|---|---|
| Contenido | `packages/content` | No (hash de contenido en cabecera) | No | Sí |
| Mundo estático | `WorldStatic` (worldgen) | No (se regenera) | Hash propio en cabecera | Sí |
| Estado dinámico | tablas de `sim` | **Sí** | **Sí** | Sí |
| Buffers | `sim` (por tick) | No (vacíos en la frontera) | — | Solo su consumidor declarado |
| Derivado | `derive` | No | No | Sí (versión del fin del tick anterior) |
| Historia | `history`, `chronicle` | En el `.wsim` | Hash de eventos aparte | **No** |

**Cargar un snapshot** = regenerar `WorldStatic` desde el seed → cargar el estado → correr
`derive` → continuar. La continuación tiene que dar hashes idénticos a no haber guardado (P1).

---

## 3. Tiempo y unidades

### 3.1 Calendario

- **Año calendario** (`year`): entero sin año 0. Negativo = a.C. (−12000 = 12.000 a.C.),
  positivo = d.C. El año 1 a.C. es seguido por el 1 d.C.
- **Índice astronómico** (para aritmética de duraciones): `astro = year < 0 ? year + 1 : year`.
  `core/time` hace todas las conversiones; nadie resta años calendario a mano.
- **Tick** = 1 año. **Estaciones**: 4 por año (`season` 0–3), neutrales respecto del
  hemisferio; solo `military` usa sub-pasos estacionales.
- Inicio y fin de corrida: parámetros (`startYear` ≈ −12000, `endYear` ≈ 1900; S1).

### 3.2 Glosario de unidades

Coincide con `UNITS` de `core/store/units.ts` (se amplía junto con este documento).

| Unidad | Significado | Ejemplos |
|---|---|---|
| `persons` | personas | tamaño de pop, bajas |
| `persons_per_km2` | densidad | densidad de provincia (derivada) |
| `count` | cantidad de cosas | edificios, barcos |
| `m` | metros | altitud, nivel del mar |
| `km` | kilómetros | largo de frontera, distancia |
| `km2` | kilómetros cuadrados | área |
| `degrees` | grados de latitud/longitud | centroide |
| `days` | **días de viaje de referencia** (a pie, con carga, en buen tiempo) | costo de movimiento en el grafo |
| `years` | duración en años | vencimientos, edad |
| `year` | año calendario (§3.1) | fundación, muerte |
| `season` | estación 0–3 | fecha de batalla |
| `tons` | toneladas | stock, producción del tick |
| `tons_per_year` | flujo de bienes | volumen de ruta |
| `coins` | unidad monetaria de cuenta (plata equivalente) | tesoro, riqueza |
| `coins_per_year` | flujo monetario | recaudación |
| `coins_per_ton` | precio | precio de un bien |
| `m3_per_s` | caudal | ríos |
| `celsius` | temperatura | media anual |
| `mm_per_year` | precipitación | media anual |
| `fraction` | adimensional en [0, 1] | fertilidad, alfabetización |
| `ratio` | adimensional ≥ 0 sin techo | multiplicadores, nivel de precios |
| `score` | índice adimensional con **rango documentado** en su campo | estabilidad [−100, 100] |
| `per_year` | tasa anual | natalidad, interés |
| `enum` | índice de una enumeración de contenido | bioma, estrato |
| `flag` | booleano 0/1 | costero |
| `id` | referencia a una entidad (0 = ninguna) | dueño |
| `bits` | bitset | innovaciones conocidas |
| `text` | texto generado (nombres) | nombre de ciudad |

**Moneda de cuenta:** todo valor monetario se expresa en `coins` = 1 unidad de plata de ley
estándar. Las monedas reales (`Currency`, P6) tienen tipo de cambio contra la de cuenta. Antes de
la acuñación, los precios son de trueque expresados en la misma unidad de cuenta.

---

## 4. Mundo físico (W, estático tras el worldgen) · P1 v1 / P3 v2

### 4.1 `WorldParams` (entrada)

| Campo | Tipo | Unidad | Notas |
|---|---|---|---|
| seed | u32 | id | `seedFromString` si viene de texto |
| mapType | enum<MapType> | enum | continentes, pangea, archipiélago, continentes chicos, mar interior, fractal |
| landFraction | f64 | fraction | objetivo de tierra (nivel del mar por percentil) |
| worldAge | f64 | score | [0, 1] intensidad de erosión |
| temperature, rainfall | f64 | score | [−1, 1] desvío global |
| size | enum<WorldSize> | enum | resolución del ráster y cantidad de provincias |
| provinceTarget | u16 | count | ≈1.500 por defecto (D21) |
| startYear, endYear | i32 | year | ≈ −12000 / 1900 |

### 4.2 `WorldRaster` (W, por celda; mundo mediano 2048×1024, wrap E-O)

| Campo | Tipo | Unidad | Fase |
|---|---|---|---|
| elevation | f32 | m | P1 |
| plate | u8 | id | P1 |
| temperature | f32 | celsius | P1 (media anual) |
| tempAmplitude | f32 | celsius | P3 (estacionalidad) |
| precipitation | f32 | mm_per_year | P1 |
| precipSeasonality | f32 | fraction | P3 |
| biome | u8 | enum<Biome> | P1 (8–10 clases) / P3 (≈14) |
| vegetation | f32 | fraction | P3 |
| soil | u8 | enum<Soil> | P3 |
| fertility | f32 | fraction | P3 |
| flow | f32 | m3_per_s | P1 |
| riverOrder | u8 | count | P3 (Strahler) |
| volcanism, seismicity | u8 | score [0, 255] | P3 (los usa P10) |
| floodYear | i16 | year | P3 (deglaciación; 0 = nunca) |
| province | u16 | id | P1 (0 = mar) |
| seaZone | u16 | id | P1 |

### 4.3 `ProvinceStatic` (W) · una fila por provincia

| Campo | Tipo | Unidad | Notas |
|---|---|---|---|
| area | f64 | km2 | |
| landArea | f64 | km2 | descuenta lagos |
| arableFraction | f32 | fraction | |
| ruggedness | f32 | score | [0, 1] |
| meanElevation | f32 | m | |
| centroidLat, centroidLon | f32 | degrees | |
| coastal | bool | flag | |
| maxRiverFlow | f32 | m3_per_s | |
| navigableRiver | bool | flag | |
| meanTemperature | f32 | celsius | |
| meanPrecipitation | f32 | mm_per_year | |
| dominantBiome | u8 | enum<Biome> | la mezcla completa se deriva del ráster |
| soil | u8 | enum<Soil> | dominante |
| fertility | f32 | fraction | |
| habitability | f32 | score | [0, 1]; densidad de semillas y atracción |
| volcanicRisk, seismicRisk | f32 | fraction | P3/P10 |
| floodYear | i32 | year | año en que el mar la cubre (deglaciación); 0 = nunca |
| wildSpecies | bits | bits | sobre el catálogo `WildSpecies` (C) |
| deposits | refs<Deposit> | id | |
| placeholderName | str | text | P3; P4 lo reemplaza con idiomas |

### 4.4 Grafo de movimiento (W, formato CSR)

| Campo | Tipo | Unidad | Notas |
|---|---|---|---|
| from, to | u32 | id | provincia o zona marítima (espacios de ids separados, con tipo) |
| kind | u8 | enum | tierra, río, costa, mar, estrecho |
| baseCost | f32 | days | costo de referencia por terreno; las vistas derivadas aplican caminos, ferrocarril, estación, tecnología (§13) |
| borderLength | f32 | km | |

### 4.5 Otras entidades estáticas

| Entidad | Almacén | Campos (tipo · unidad) | Fase |
|---|---|---|---|
| `SeaZone` | W | kind (costera/oceánica · enum), strait (flag), area (km2), currentStrength (score [0, 1]) | P1/P3 |
| `Deposit` | W | province (ref), resource (enum<Resource>), quantity (tons), accessibility (score [0, 1]; la tecnología requerida está en contenido) | P3 |
| `WildSpecies` | C | kind (cereal, tubérculo, legumbre, animal grande, ave…), climate envelope (celsius, mm_per_year), domesticationDifficulty (score [0, 1]), yield (tons_per_year por km2), uses (alimento, tracción, fibra, montura) | P3 |

> **Dinámico físico** (estado, no W): `World.seaLevel` y `Province.submerged` (P3, dueño
> `environment`); anomalías climáticas (§5.11, P10).

---

## 5. Estado dinámico

### 5.1 `World` (G)

| Campo | Tipo | Unidad | Dueño | Fase |
|---|---|---|---|---|
| year | i32 | year | scheduler (`core/time`) | P0/P1 |
| seaLevel | f64 | m | environment | P3 |
| nextEventId | u32 | id | bus de eventos (infraestructura del scheduler, `core/events`) | P1 |
| globalTempAnomaly | f32 | celsius | environment | P10 |

Los asignadores de ids de cada tabla (`IdAllocator`) son estado y van en el snapshot (ADR-004).

**Tablas con dueño por fila** (solo se agregan filas; cada fila la cambia únicamente el sistema
que la creó, registrado en una columna `owner`): `Name`, `Modifier`, `ProcurementOrder`. Así
varios sistemas pueden nombrar entidades o crear modificadores sin violar el escritor único.

### 5.2 `Province` (T, dinámica) · misma id que `ProvinceStatic`

| Campo | Tipo | Unidad | Dueño | Fase | Notas |
|---|---|---|---|---|---|
| owner | ref<Polity> | id | **ledger** (M1) | P1 | lo cambian solicitudes de territorio (§8.2) |
| occupier | ref<Polity> | id | military | P9 | ocupación en guerra; 0 = ninguna |
| title | ref<Title> | id | statecraft | P7 | título de menor nivel que la contiene |
| control | f32 | fraction | statecraft | P7 | eficacia administrativa sobre la provincia |
| submerged | bool | flag | environment | P3 | deglaciación; sin dueño ni pops (I4) |
| landUse | f32 × 5 | fraction | production | P1/P4 | forrajeo, pastoreo, horticultura, cultivo intensivo, sin uso; suman 1 |
| roads | u8 | score [0, 5] | settlements | P1/P6 | infraestructura que baja el costo del grafo |
| irrigation | f32 | fraction | settlements | P4 | del área cultivable |
| harvestLastYear | f32 | tons | production | P6 | madera extraída: la lee `environment` el tick siguiente (M4) |
| foodSecurity | f32 | fraction | demography | P1 | alimento disponible / necesario del año; lo leen migration, statecraft y la crónica |
| forestCover | f32 | fraction | environment | P10 | |
| soilDepletion | f32 | fraction | environment | P10 | |
| tempAnomaly | f32 | celsius | environment | P10 | del año en curso |
| precipAnomaly | f32 | ratio | environment | P10 | multiplicador del año |
| knownInnovations | bits | bits | knowledge | P1 (≈10) / P5 (≈150) | ⏳ portador del conocimiento (P5.2) |
| domesticatedSpecies | bits | bits | knowledge | P4 | especies domesticadas disponibles (sobre `WildSpecies`); la domesticación es un proceso de siglos |
| name | ref<Name> | id | culture | P4 | ⏳ topónimo en el idioma de la cultura dominante; el renombre es un evento explícito |

### 5.3 `Pop` (T) · H-01

Un pop es un bloque homogéneo **provincia × cultura × religión × estrato**. La clave es única
por provincia (I5).

| Campo | Tipo | Unidad | Dueño | Fase | Notas |
|---|---|---|---|---|---|
| province | ref<Province> | id | ledger | P1 | |
| culture | ref<Culture> | id | ledger | P1 (placeholder) / P4 | parte de la clave: no cambia; la asimilación **transfiere** personas a otro pop |
| religion | ref<Religion> | id | ledger | P1 (placeholder) / P8 | ídem |
| stratum | u8 | enum<Stratum> | ledger | P1 (uno) / P4 | ídem |
| size | f64 | persons | **ledger** (M1) | P1 | nacimientos, muertes y transferencias llegan como deltas |
| wealth | f64 | coins | markets | P6 | riqueza total del pop |
| literacy | f32 | fraction | knowledge | P5 | |
| unrest | f32 | fraction | statecraft | P7 | |
| health | f32 | fraction | epidemics | P4 | inversa de la carga de enfermedad |
| fervor | f32 | fraction | faith | P8 | |

**Reglas del libro mayor** (`ledger`, M1):
- Toda variación de `size` es un **delta** con causa: nacimiento, muerte (con causa: hambre,
  enfermedad, guerra, vejez), migración (pop → provincia destino), asimilación o conversión (pop →
  clave destino).
- Las transferencias **conservan** personas (I2). Los atributos intensivos (`literacy`, `unrest`,
  `health`, `fervor`) se mezclan por promedio ponderado; `wealth` viaja en proporción.
- Si el pop destino no existe, se crea; los pops de menos de 1 persona se fusionan con el más
  parecido de su provincia; tope de pops por provincia (⏳ P4: ≈24) con fusión de los menores.
- Todos los sistemas leen `size` **al inicio del tick**: el orden de los sistemas no cambia
  quién ve cuánta gente.

### 5.4 `Settlement` (T) y `Building` (T)

| Campo | Tipo | Unidad | Dueño | Fase |
|---|---|---|---|---|
| province | ref<Province> | id | settlements | P1 |
| urbanShare | f32 | fraction | settlements | P1 · fracción de la población de la provincia que vive acá (Σ por provincia ≤ 1, I17) |
| level | u8 | enum<SettlementLevel> | settlements | P1 · campamento → … → metrópoli, con histéresis (§6) |
| fortification | u8 | score [0, 10] | settlements | P1/P9 |
| port | bool | flag | settlements | P4 |
| founded | i32 | year | settlements | P1 |
| ruined | i32 | year | settlements | P4 · 0 = habitado |
| name | ref<Name> | id | settlements | P4 |

`Building`: settlement (ref), type (enum<BuildingType>), level (u8 · score [1, 5]), built (year),
condition (fraction). Dueño: settlements. Fase P4/P6. La población urbana en `persons` es una vista
derivada (provincia × `urbanShare`).

### 5.5 Cultura, idioma y nombres (S)

| Entidad | Campos (tipo · unidad) | Dueño | Fase |
|---|---|---|---|
| `Culture` | name (ref<Name>), parent (ref<Culture>), familyRoot (ref<Culture>), originProvince (ref), founded (year), extinct (year), **values ×6** (marcial, mercantil, jerárquico, piadoso, xenófilo, marinero · score [−1, 1]), architecture (enum<ArchStyle>), language (ref<Language>) | culture | P1 placeholder / P4 |
| `Language` | name (ref<Name>), parent (ref<Language>), familyRoot, splitYear (year), phonologySeed (u32 · id), soundChanges (refs<SoundChange> de contenido) ⏳ | language | P1 simple / P4 |
| `Name` | text (str · text, romanizado), language (ref<Language>), assigned (year), owner (sistema) | **por fila**: el sistema que nombra (§5.1) | P1 |

Los nombres se **guardan** al asignarse: una ciudad fundada en 3000 a.C. conserva su nombre aunque
el idioma cambie (la evolución de nombres es un evento explícito ⏳ P11). Los exónimos es/en
("Reino de X") se arman en `i18n`, no se guardan.

### 5.6 Conocimiento · P1 v1 / P5

| Entidad | Almacén | Campos | Dueño |
|---|---|---|---|
| `Innovation` | C | domain, prerequisites (refs<Innovation>), materials (refs<Good>), environment (requisitos: costa, río…), needTriggers, difficulty (score [0, 1]), effects (modificadores y desbloqueos) | — |
| Conocimiento por provincia | T | `Province.knownInnovations` (bits) + adopción de innovaciones de práctica ⏳ | knowledge |
| `InventionRecord` | S | innovation (ref), province (ref), year, inventor (ref<Person>), independent (flag) | knowledge |

⏳ **P5.2 (🔶 del plan):** portador por provincia (recomendado) vs. por comunidad cultura×polity.
El modelo reserva el bitset por provincia; si P5 elige otra cosa, cambia esta sección.
La **era** de una provincia o polity es una vista derivada del conjunto conocido (§13).

### 5.7 Economía · P6 (P1 sin mercados)

| Entidad | Almacén | Campos (tipo · unidad) | Dueño |
|---|---|---|---|
| `Good` | C | category, baseValue (coins_per_ton), perishability (per_year), bulk (ratio: costo de transporte), substitutes | — |
| `ProductionMethod` | C | inputs/outputs (tons por unidad de trabajo), labor por estrato (persons), requiredInnovation, landUse | — |
| `Market` | S | name (ref<Name>), hub (ref<Province>), moneySupply (coins), priceLevel (ratio), founded (year) | markets |
| `MarketGood` | T | market (ref), good (enum<Good>), price (coins_per_ton), stock (tons), supplyLastYear (tons), demandLastYear (tons) | markets |
| `TradeRoute` | S | marketA, marketB (ref<Market>), legs (refs a provincias/zonas), cost (coins_per_ton), risk (fraction), named (ref<Name>), founded (year) | markets |
| `TradeFlow` | T | route (ref), good (enum<Good>), volume (tons_per_year), toll (coins_per_ton) | markets |
| `Currency` | S | issuer (ref<Polity>), metal (enum<Good>), fineness (fraction · dueño **statecraft**: el envilecimiento es decisión política), supply (coins · dueño markets), mints (refs<Province> · statecraft) | markets / statecraft por campo |
| `ProcurementOrder` | S | polity (ref), good (enum), quantity (tons), maxPrice (coins_per_ton), forYear (year) · pedidos del Estado para el año siguiente (M4) | statecraft, military (filas propias) |

**Área de mercado** (qué provincias pertenecen a cada mercado) es una vista derivada de la
conectividad (§13).

### 5.8 Política · P1 v1 / P7

| Entidad | Almacén | Campos (tipo · unidad) | Dueño | Fase |
|---|---|---|---|---|
| `Polity` | S | name (ref<Name>), capital (ref<Province>), primaryTitle (ref<Title>), founded (year), ended (year), endReason (enum), colorSeed (u32 · id: color estable, D25/P2) | statecraft | P1 |
| ″ régimen | S (campos de Polity) | authority (enum: tribal, divina, hereditaria, electiva, burocrática), powerBalance (score [−1 gobernante, +1 estamentos]), landTenure (enum: clanes, feudos hereditarios, gobernadores designados, familias patricias) | regime | P7 |
| ″ leyes | S | laws (por categoría · enum<Law>: sucesión, impuestos, levas, religión, comercio, servidumbre) | statecraft | P1 (sucesión) / P7 |
| ″ fisco | S | treasury (coins ≥ 0), debt (coins ≥ 0), interestRate (per_year), taxIncome, spending (coins_per_year) | statecraft | P7 |
| ″ estado interno | S | stability (score [−100, 100]), legitimacy (score [0, 100]), adminCapacity (score ≥ 0) — **base**; el valor efectivo = base + modificadores (§5.12) | statecraft | P7 |
| `Title` | S | level (enum: reino, gran feudo, feudo menor), holder (ref<Person> · dueño **succession**), liege (ref<Title>), contract: taxShare, levyShare, autonomy (fraction), created, destroyed (year) | statecraft (salvo holder) | P7 |
| `Estate` | T | polity (ref), type (enum: nobleza, clero, mercaderes, campesinado, burguesía, obreros), power (score [0, 100]), satisfaction (score [−100, 100]) | estates | P7 |
| `EstateDemand` | S | estate (ref), law (enum<Law>), since (year), urgency (score [0, 1]) | estates | P7 |
| `Faction` | S | polity (ref), goal (enum), target (ref), members (refs<Person>), strength (score [0, 100]), state (enum, §6), started (year) | **factions** (nuevo, M5) | P7 |
| `Claim` | S | claimant (ref<Person> o ref<Polity>), title o province (ref), kind (heredado, histórico, fabricado), since (year) | **ledger** (aplica solicitudes de succession, schemes, diplomacy; M1) | P7 |
| `Agenda` | S | polity (ref), goals: kind (expandir, asegurar ruta, defender, recuperar sitio sagrado, consolidar, reformar), target (ref), priority (score [0, 1]), since (year), budgetShare (fraction) | agenda | P9 |

La **etiqueta del régimen** (monarquía feudal, república mercantil…) y el **tipo de polity**
(jefatura, estado, imperio) son vistas derivadas de la estructura, nunca al revés (H-05, P7.7).

### 5.9 Personas ("casas, no cortes") · P1 v1 / P7

| Entidad | Almacén | Campos (tipo · unidad) | Dueño |
|---|---|---|---|
| `House` | S | name (ref<Name>), founder (ref<Person>), parent (ref<House>, rama cadete), prestige (score ≥ 0), language (ref), founded, extinct (year) | characters |
| `Person` (registro permanente, liviano) | S | name (ref<Name>), house (ref), father, mother (ref<Person>), sex (enum), born, died (year), deathCause (enum), culture, religion (ref), **traits ×8** (ambición, marcialidad, diplomacia, administración, erudición, piedad, crueldad, honor · score [−1, 1], fijados al nacer), detail (ref<CharacterDetail>; 0 si es liviano) | characters |
| `CharacterDetail` (completo) | S | person (ref), role (enum: gobernante, heredero, general, profeta, inventor, cortesano), skills ⏳, health (fraction), fertility (fraction), spouse (ref<Person>), promoted (year) | characters |
| `Scheme` | S | author (ref<Person>), target (ref), kind (usurpar, asesinar, fabricar reclamo, alianza matrimonial), progress (fraction), state (enum, §6), started (year) | schemes |

**M6:** la identidad de una persona es su `Person` (permanente, nunca se borra). El detalle
completo es una fila aparte que se crea al promover y se borra al degradar o morir; al
re-promover se crea otra fila. Así las tablas escasas mantienen ids crecientes y los rasgos no se
pierden. Presupuesto: ≤ 3.000 `CharacterDetail` vivos (P7.3).

### 5.10 Religión · P1 placeholder / P8

| Entidad | Almacén | Campos (tipo · unidad) | Dueño |
|---|---|---|---|
| `Religion` | S | name (ref<Name>), parent (ref<Religion>, cisma o herejía), founder (ref<Person>), founded, extinct (year), stage (enum, §6), doctrines (refs<Doctrine> de C), clergyOrganization (enum), head (ref<Person> o ref<Title>) | faith |
| `Deity` | S | religion (ref), name (ref<Name>), domain (enum: cielo, tierra, mar, sol, ancestros…) | faith |
| `HolySite` | S | province (ref), religion (ref), kind (ciudad santa, templo mayor), prestige (score ≥ 0), founded (year) | faith |
| `Doctrine` | C | efecto mecánico obligatorio ("sin efecto, no entra", P8) | — |

### 5.11 Guerra, diplomacia, clima y salud

| Entidad | Almacén | Campos (tipo · unidad) | Dueño | Fase |
|---|---|---|---|---|
| `War` | S | name (ref<Name>), started, ended (year), casusBelli (ref<Event>), outcome (enum), treaty (ref<Treaty>) | diplomacy | P1 abstracta / P9 |
| `WarSide` | S | war (ref), side (u8 · enum), polities (refs<Polity>), goals (kind + target), score (score [−100, 100] · dueño military), exhaustion (fraction · dueño military) | diplomacy / military por campo | P9 |
| `Army` / `Fleet` | S | owner (ref<Polity>), general (ref<Person>), units (por tipo · persons o count), morale (fraction), supply (fraction), location (ref<Province> o ref<SeaZone>), order (enum + target), raised (year), state (enum, §6) | military | P9 |
| `Battle` / `Siege` | S | war (ref), place (ref<Province>), year, season, attackers/defenders (refs<Army>), casualties (persons por bando), outcome (enum), name (ref<Name>), siege: duration (season), assault (flag) | military | P1 (registro abstracto) / P9 |
| `Relation` | S | pair (polityA < polityB), trust (score [−100, 100]); la opinión = modificadores (§5.12) | diplomacy | P9 |
| `Grievance` | S | from, to (ref<Polity>), kind (enum), magnitude (score), decay (per_year), source (ref<Event>) | diplomacy | P9 |
| `Treaty` | S | kind (no agresión, alianza, matrimonio, tributo, vasallaje, comercio, paz con términos), parties (refs<Polity>), terms (kind + valor + target), signed, expires (year), broken (year), breaker (ref) | diplomacy | P1 (paz) / P9 |
| `ClimateShock` | S | kind (invierno volcánico, sequía, inundación), provinces (refs), start, end (year), magnitude (score [0, 1]) | environment | P10 |
| `Pathogen` | S | name (ref<Name>), transmissibility (ratio), lethality (fraction), immunity (years), origin (ref<Province>), reservoir (enum), emerged (year) | epidemics | P4 básico / P10 |
| `Infection` | T | province, pathogen (ref), susceptible, infected, recovered (fraction) | epidemics | P4 / P10 |
| `Landmark` | S | kind (maravilla, templo mayor, artefacto), name (ref<Name>), place (ref), built (year), builder (ref<Person>), destroyed (year), holder (ref) | settlements | P11 |

### 5.12 Modificadores y stats (`core/modifiers`) · P0.9

Un stat calculado = **base + modificadores**. El inspector muestra `explain(entidad, stat)`.

**`Modifier`** (T): target (kind + id), stat (enum<Stat>), op (add · mul · min · max), value (unidad
del stat; `ratio` si es mul), source (kind: evento, edificio, ley, doctrina, innovación, rasgo,
terreno, tratado…; id), owner (sistema que lo creó: **solo ese sistema** lo cambia o lo borra),
start (year), expires (year; 0 = permanente).

**Registro de stats** (los primeros; cada fase agrega los suyos):

| Stat | Entidad | Unidad | Agregación | Base (dueño) | Fase |
|---|---|---|---|---|---|
| `cropYield` | Province | tons_per_year por km2 | base × Π mul + Σ add | production | P1 |
| `movementCost` | Edge | days | base × Π mul | worldgen (W) | P1 |
| `birthRate` | Pop | per_year | base + Σ add | demography | P1 |
| `deathRate` | Pop | per_year | base + Σ add | demography | P1 |
| `diffusionRate` | Province | per_year | base × Π mul | knowledge | P1 |
| `combatStrength` | Army / Polity (P1) | score ≥ 0 | base × Π mul | military | P1 |
| `diseaseBurden` | Province | fraction | base + Σ add, máx 1 | epidemics | P4 |
| `assimilationRate` | Pop | per_year | base × Π mul | assimilation | P4 |
| `inventionChance` | Province × Innovation | per_year | base × Π mul | knowledge | P5 |
| `productionEfficiency` | Province × Method | ratio | base × Π mul | production | P6 |
| `transportCost` | TradeRoute | coins_per_ton | base × Π mul + Σ add | markets | P6 |
| `stability` | Polity | score [−100, 100] | base + Σ add, acotado | statecraft | P7 |
| `legitimacy` | Polity | score [0, 100] | base + Σ add, acotado | statecraft | P7 |
| `adminCapacity` | Polity | score ≥ 0 | base + Σ add | statecraft | P7 |
| `opinion` | Person→Person, Polity→Polity | score [−100, 100] | Σ add, acotado | characters / diplomacy | P7/P9 |
| `conversionPressure` | Pop × Religion | per_year | base × Π mul | assimilation | P8 |
| `morale` | Army | fraction | base + Σ add, acotado | military | P9 |
| `supplyCapacity` | Province × Season | persons | base × Π mul | military | P9 |

Orden de aplicación determinista: por op (add → mul → min → max), después por tipo de fuente,
después por id de modificador. `explain` devuelve el árbol y la suma reconstruye el valor exacto.

### 5.13 Memoria (historia; fuera del hash de estado, M2)

| Entidad | Dónde | Campos | Dueño |
|---|---|---|---|
| `Event` | log append-only (`history`) | id (asignado por `World.nextEventId`), type (enum<EventType>), year, season?, actors (kind + id), place (ref), causes (lista de {event id} o {hecho: entidad, campo, año}), data (esquema por tipo), significance (score [0, 1]) | lo emite cada sistema por el bus; lo registra chronicle |
| `Episode` | `chronicle` | parent (ref<Episode>), kind (batalla ⊂ campaña ⊂ guerra ⊂ era regional), from, to (year), events (refs), name | chronicle |
| Deltas visuales y keyframes | `history` | ADR-008 | chronicle (grabación) |

**M2:** ningún sistema lee el log. Si un evento tiene consecuencias duraderas (un agravio, una
legitimidad perdida, un reclamo), el sistema que lo emite **también** escribe ese hecho en el
estado (`Grievance`, `Modifier`, `Claim`) con el evento como fuente. Así el estado se basta solo
para continuar, y el log puede comprimirse o podarse sin cambiar la simulación.

---

## 6. Máquinas de estado

Cada transición emite el evento indicado (catálogo §11). Los estados viven en un campo `state`
(enum) de la entidad, salvo donde se indica.

| Entidad | Estados y transiciones | Eventos | Dueño | Fase |
|---|---|---|---|---|
| Settlement (`level`, `ruined`) | campamento → aldea → pueblo → ciudad → gran ciudad → metrópoli (umbrales de población urbana con **histéresis** ±15% para no oscilar); cualquiera → ruina; ruina → refundación (nueva fila no: misma fila, `ruined = 0`, evento de refundación) | `settlement.founded`, `.grew`, `.declined`, `.ruined`, `.refounded` | settlements | P1/P4 |
| Polity | jefatura → estado → (imperio) es **etiqueta derivada**; los estados reales: activa → terminada (`ended`, `endReason`: fragmentación, absorción, colapso, conquista) | `polity.formed`, `.absorbed`, `.fragmented`, `.collapsed` | statecraft | P1/P7 |
| Régimen | estructura (authority, powerBalance, landTenure) cambia solo por transiciones: reforma, usurpación, revolución, imposición por conquista, toma religiosa, colapso | `regime.changed` (con tipo y causas) | regime | P7 |
| Person | liviano ⇄ completo (promoción/degradación por relevancia) → muerto (permanente) | `person.died` (notables), `person.promoted` (sin evento público) | characters | P1/P7 |
| Religion (`stage`) | culto local → organizada → institucionalizada/de estado; ramas: cisma, herejía (fila nueva con `parent`); → extinta | `religion.founded`, `.organized`, `.schism`, `.extinct` | faith | P8 |
| War | casus belli → declarada → activa → negociación → tratado / capitulación / statu quo → tregua (vía `Treaty`) | `war.declared`, `war.ended`, `treaty.signed` | diplomacy | P1/P9 |
| Faction | formándose → activa (exige) → revuelta (guerra civil) → victoriosa / disuelta | `faction.formed`, `.ultimatum`, `civilWar.started`, `civilWar.ended` | factions | P7 |
| Scheme | preparando → ejecutado (éxito / fracaso) o descubierto | `scheme.succeeded`, `.failed`, `.discovered` | schemes | P7 |
| Army | levantado → en marcha → en batalla / sitio → disuelto / destruido | `army.raised` (sin evento público), `battle.fought`, `siege.started`, `siege.ended` | military | P9 |
| Infection | sin brote → brote activo (SIR) → extinguido (memoria inmune en `recovered`) | `epidemic.started`, `epidemic.ended` | epidemics | P4/P10 |

---

## 7. Pipeline del tick

Un tick = un año. Las fases corren en este orden fijo; dentro de una fase, los sistemas corren
en el orden listado. Cada sistema declara su contrato (§9) y en dev/test un **guard** verifica que
solo escriba lo declarado (P0.10; detecta escrituras comparando `hashPart` por columna antes y
después del sistema).

| # | Fase | Sistemas (orden) | Por qué acá |
|---|---|---|---|
| 1 | Entorno | environment | Exógeno: clima, shocks y nivel del mar condicionan todo lo demás del año |
| 2 | Producción | production | Depende del clima del año; produce lo que el mercado reparte |
| 3 | Mercados | markets | Con la producción del año fija precios, reparte consumo, mueve bienes y dinero |
| 4 | Consumo y salud | demography, epidemics | Nacimientos y muertes según lo que cada pop pudo consumir y según la enfermedad |
| 5 | Movimientos de población | migration, assimilation | Reaccionan a la presión del año (hambre, guerra del año anterior, descontento) |
| 6 | Conocimiento | knowledge | Con la economía y la urbanización del año: invención, difusión, pérdida |
| 7 | Sociedad | characters, succession, schemes, factions, estates | Vida y muerte de personas antes de que el Estado decida; la sucesión resuelve las muertes del año |
| 8 | Estado | statecraft, regime | Fisco, leyes, control y transiciones con la sociedad ya actualizada |
| 9 | Agenda y diplomacia | agenda, diplomacy | Decisiones con el estado interno al día |
| 10 | Guerra | military (4 sub-pasos estacionales; solo donde hay guerra activa) | Ejecuta las guerras decididas o vigentes |
| 11 | Cultura, idioma y fe | culture (cada 10 años), language (cada 25), faith (anual; fundaciones y cismas cada 10) | Cadencias largas; reaccionan a lo acumulado |
| 12 | Asentamientos e infraestructura | settlements | Al final: crecen o caen después de la guerra y el comercio del año |
| 13 | Consolidación y derivación | **ledger** → **derive** | Aplica todos los deltas del tick (población, territorio, reclamos) y recalcula las vistas |
| 14 | Crónica | chronicle | Significancia, episodios, deltas visuales y keyframes del año ya cerrado |

**Semántica de lectura:** un sistema ve los campos escritos por sistemas **anteriores** del
mismo tick ya actualizados, y todo lo demás como quedó al final del tick anterior. Excepción
deliberada: `Pop.size`, `Province.owner` y `Claim` solo cambian en la fase 13 (M1), así que
**todos** los sistemas ven la población y el territorio del inicio del tick. Las vistas derivadas
son siempre las del final del tick anterior.

**Cadencias:** `anual`; `estacional` (sub-pasos dentro de la fase 10); `cada N años` (corre si
`astro(year) mod N = 0`); `por evento` (corre cada tick pero solo procesa su cola, p. ej. la
sucesión procesa las muertes del año).

---

## 8. Buffers de flujo (dentro del tick)

Todos se vacían antes de terminar el tick (I9). Un buffer tiene **productores declarados** y
**un consumidor**.

| Buffer | Productores | Consumidor | Contenido |
|---|---|---|---|
| `popDeltas` | demography (nacimientos, muertes naturales y por hambre), epidemics (muertes por enfermedad), military (bajas), migration (transferencias pop → provincia), assimilation (transferencias de cultura y religión), production (movilidad entre estratos), environment (migración forzada por inundación) | ledger | `{pop, kind, persons, target?, cause}` |
| `territoryRequests` | environment (sumersión), statecraft (expansión, formación, absorción), military (cesión en P1), diplomacy (tratados, P9), factions (secesión), regime (colapso, fragmentación) | ledger | `{province, newOwner, priority, cause}` |
| `claimRequests` | succession (herencia), schemes (fabricados), diplomacy (por tratado o matrimonio) | ledger | `{claimant, target, kind, add/remove, cause}` |
| `productionOutput` | production | markets (P1: demography) | toneladas por provincia × bien |
| `consumption` | markets (P1: production) | demography, statecraft | satisfacción por pop y nivel de necesidad (fraction); alimento per cápita |
| `eventBus` | todos los sistemas | chronicle | eventos del tick (§11) |
| `visualDeltas` | chronicle | `history` (grabador) | cambios de dueño, niveles, mayorías, ejércitos, precios resumidos (ADR-008) |

**Resolución de `territoryRequests`** (determinista): por prioridad (sumersión > tratado >
colapso/secesión > cesión por guerra > formación/absorción > expansión a tierra sin dueño); a
igual prioridad, gana la primera emitida (orden de fase, sistema y secuencia). Las solicitudes
perdedoras se descartan y quedan registradas como hecho en el evento ganador.

**Lo que cruza la frontera del tick es estado (M4):** por ejemplo `ProcurementOrder` (pedidos del
Estado para el mercado del año siguiente), `Province.harvestLastYear`, `MarketGood.supplyLastYear`.

---

## 9. Contratos de los sistemas

Formato: **fase · cadencia · se implementa en** · RNG (stream) · Lee · Escribe (dueño) · Buffers
(→ produce, ← consume) · Emite. El código declara lo mismo (`{reads, writes, emits, cadence,
phase}`) y el guard lo verifica.

#### `environment` · 1 · anual · P3 (nivel del mar) / P10
- **RNG:** `environment`
- **Lee:** World.year, WorldStatic (floodYear, volcanism, clima base), Province.harvestLastYear, contenido de clima
- **Escribe:** World.{seaLevel, globalTempAnomaly}, Province.{submerged, tempAnomaly, precipAnomaly, forestCover, soilDepletion}, ClimateShock
- **Buffers:** → popDeltas (migración forzada), → territoryRequests (sumersión)
- **Emite:** `sea.flooded`, `climate.shockStarted`, `climate.shockEnded`, `volcano.erupted`

#### `production` · 2 · anual · P1 (subsistencia) / P4 / P6
- **RNG:** `production`
- **Lee:** ProvinceStatic, Province.{landUse, irrigation, roads, knownInnovations, domesticatedSpecies, tempAnomaly, precipAnomaly}, Pop (vía vista por provincia), Building, contenido (métodos, bienes), stats `cropYield`, `productionEfficiency`
- **Escribe:** Province.{landUse, harvestLastYear}
- **Buffers:** → productionOutput, → popDeltas (movilidad entre estratos, P4+)
- **Emite:** `subsistence.shifted`, `industrialization.started` (P10)

#### `markets` · 3 · anual · P6
- **RNG:** `markets`
- **Lee:** productionOutput, Pop (vistas), MarketGood, TradeRoute, TradeFlow, Currency.fineness, ProcurementOrder, vista de áreas de mercado, Province.occupier (rutas cortadas), stat `transportCost`
- **Escribe:** Market, MarketGood, TradeRoute (salvo nombre), TradeFlow, Currency.supply, Pop.wealth
- **Buffers:** ← productionOutput, → consumption
- **Emite:** `market.formed`, `route.named`, `trade.disrupted`, `inflation.spiked`, `currency.minted` (primera acuñación)

#### `demography` · 4 · anual · P1 / P4
- **RNG:** `demography`
- **Lee:** Pop (al inicio del tick), consumption, Province (vistas), stats `birthRate`, `deathRate`, `diseaseBurden`
- **Escribe:** Province.foodSecurity (el tamaño de los pops lo aplica el ledger)
- **Buffers:** ← consumption, → popDeltas (nacimientos, muertes por vejez y hambre)
- **Emite:** `famine.started`, `famine.ended`

#### `epidemics` · 4 · anual (sub-pasos internos) · P4 / P10
- **RNG:** `epidemics`
- **Lee:** Pop (vistas), Infection, Pathogen, rutas y ejércitos (TradeFlow, Army.location), Province.{tempAnomaly}, Pop.health
- **Escribe:** Pathogen, Infection, Pop.health
- **Buffers:** → popDeltas (muertes por enfermedad)
- **Emite:** `epidemic.started`, `epidemic.ended`, `pathogen.emerged`

#### `migration` · 5 · anual · P4
- **RNG:** `migration`
- **Lee:** Pop, Province.{foodSecurity, occupier}, vistas (densidad, descontento), grafo efectivo, Settlement
- **Escribe:** —
- **Buffers:** → popDeltas (transferencias)
- **Emite:** `migration.wave` (solo olas significativas)

#### `assimilation` · 5 · anual · P4 / P8
- **RNG:** `assimilation`
- **Lee:** Pop, Culture.values, Religion (doctrinas), HolySite, Polity.laws (religión), stats `assimilationRate`, `conversionPressure`
- **Escribe:** —
- **Buffers:** → popDeltas (cultura y religión)
- **Emite:** — (los cambios de mayoría los detecta chronicle)

#### `knowledge` · 6 · anual · P1 / P4 (domesticación) / P5
- **RNG:** `knowledge`
- **Lee:** Province.knownInnovations, vistas (urbanización, estratos especialistas), Pop.literacy, TradeFlow, Settlement, contenido (innovaciones, especies), stats `inventionChance`, `diffusionRate`
- **Escribe:** Province.{knownInnovations, domesticatedSpecies}, Pop.literacy, InventionRecord
- **Buffers:** —
- **Emite:** `innovation.invented`, `innovation.lost`, `domestication.achieved`

#### `characters` · 7 · anual · P1 (gobernante) / P7
- **RNG:** `characters`
- **Lee:** Person, CharacterDetail, House, Title.holder, Polity, stat `opinion`
- **Escribe:** Person, CharacterDetail, House, modificadores propios (`opinion` entre personas)
- **Buffers:** —
- **Emite:** `person.born` (notables), `person.died`, `marriage`, `house.founded`, `house.extinct`

#### `succession` · 7 · por evento (muertes del año) · P1 / P7
- **RNG:** `succession`
- **Lee:** Person (muertes del tick), Title, Polity.laws (sucesión), Claim, House
- **Escribe:** Title.holder
- **Buffers:** → claimRequests
- **Emite:** `ruler.succeeded`, `succession.crisis`, `regency.started`

#### `schemes` · 7 · anual · P7
- **RNG:** `schemes`
- **Lee:** Person, CharacterDetail, Title, Claim, stat `opinion`
- **Escribe:** Scheme
- **Buffers:** → claimRequests (reclamos fabricados)
- **Emite:** `scheme.succeeded`, `scheme.failed`, `scheme.discovered`

#### `factions` · 7 · anual · P7 (nuevo respecto de §11.3, M5)
- **RNG:** `factions` (id nuevo en el registro de streams al implementarse)
- **Lee:** Polity, Estate, Person, Title, stats `stability`, `opinion`
- **Escribe:** Faction
- **Buffers:** → territoryRequests (secesión)
- **Emite:** `faction.formed`, `faction.ultimatum`, `civilWar.started`, `civilWar.ended`

#### `estates` · 7 · anual · P7
- **RNG:** `estates`
- **Lee:** Pop.{wealth, stratum}, vistas, Polity (leyes, régimen), Religion (clero)
- **Escribe:** Estate, EstateDemand
- **Buffers:** —
- **Emite:** `estate.demanded` (demanda nueva significativa)

#### `statecraft` · 8 · anual · P1 (polities) / P7
- **RNG:** `statecraft`
- **Lee:** Polity, Province, Title, Estate, consumption, vistas (población, distancia a la capital), Currency, stats `stability`, `legitimacy`, `adminCapacity`
- **Escribe:** Polity (salvo régimen), Province.{title, control}, Title (salvo holder), Pop.unrest, Currency.{fineness, mints}, ProcurementOrder (filas propias), modificadores propios
- **Buffers:** ← consumption, → territoryRequests (formación, expansión, absorción)
- **Emite:** `polity.formed`, `polity.absorbed`, `law.enacted`, `title.created`, `title.destroyed`, `currency.debased`, `bankruptcy`

#### `regime` · 8 · anual · P7
- **RNG:** `regime`
- **Lee:** Polity, Estate, vistas (era, tamaño), Religion (teocracia), stats `stability`, `legitimacy`
- **Escribe:** Polity.{authority, powerBalance, landTenure}, modificadores propios
- **Buffers:** → territoryRequests (colapso, fragmentación)
- **Emite:** `regime.changed`, `polity.collapsed`, `polity.fragmented`

#### `agenda` · 9 · anual · P9
- **RNG:** `agenda`
- **Lee:** Polity, Relation, War, HolySite, TradeRoute, Person (rasgos del gobernante), Estate, vistas
- **Escribe:** Agenda
- **Buffers:** —
- **Emite:** — (las decisiones se materializan en diplomacy y military)

#### `diplomacy` · 9 · anual · P1 (guerra y paz) / P9
- **RNG:** `diplomacy`
- **Lee:** Agenda, Polity, Relation, Grievance, Treaty, War, WarSide.{score, exhaustion}, stat `opinion`
- **Escribe:** War, WarSide (salvo score y exhaustion), Relation, Grievance, Treaty, modificadores propios (`opinion` entre polities)
- **Buffers:** → territoryRequests (tratados), → claimRequests
- **Emite:** `war.declared`, `war.ended`, `treaty.signed`, `treaty.broken`, `alliance.formed`, `coalition.formed`

#### `military` · 10 · estacional (4 sub-pasos) · P1 (abstracta) / P9
- **RNG:** `military`
- **Lee:** War, WarSide, Army, Fleet, Polity, Province, grafo efectivo, Settlement.fortification, stats `combatStrength`, `morale`, `supplyCapacity`
- **Escribe:** Army, Fleet, Battle, Siege, Province.occupier, WarSide.{score, exhaustion}, ProcurementOrder (filas propias)
- **Buffers:** → popDeltas (bajas y saqueos), → territoryRequests (cesión directa, solo P1)
- **Emite:** `battle.fought`, `siege.started`, `siege.ended`, `city.sacked`

#### `culture` · 11 · cada 10 años · P1 (placeholder) / P4
- **RNG:** `culture`
- **Lee:** Culture, Pop (vistas), Province.landUse, grafo efectivo
- **Escribe:** Culture
- **Buffers:** — (la escisión crea una cultura nueva; los pops pasan a ella por popDeltas de assimilation del tick siguiente ⏳ P4)
- **Emite:** `culture.split`, `culture.extinct`

#### `language` · 11 · cada 25 años · P1 (simple) / P4
- **RNG:** `language`
- **Lee:** Language, Culture
- **Escribe:** Language
- **Buffers:** —
- **Emite:** `language.split`

#### `faith` · 11 · anual (fundaciones y cismas cada 10 años) · P1 (placeholder) / P8
- **RNG:** `faith`
- **Lee:** Religion, Deity, HolySite, Pop (vistas), Culture, Polity, Settlement, Person
- **Escribe:** Religion, Deity, HolySite, Pop.fervor
- **Buffers:** —
- **Emite:** `religion.founded`, `religion.organized`, `religion.schism`, `religion.extinct`, `prophet.appeared`, `holySite.established`

#### `settlements` · 12 · anual · P1 / P4
- **RNG:** `settlements`
- **Lee:** Settlement, Building, Province, vistas (población, mercado), Battle/Siege del tick
- **Escribe:** Settlement, Building, Province.{roads, irrigation}, Landmark
- **Buffers:** —
- **Emite:** `settlement.founded`, `.grew`, `.declined`, `.ruined`, `.refounded`, `building.completed`, `landmark.built`, `railway.opened` (P10)

#### `ledger` · 13a · anual · P1 (nuevo respecto de §11.3, M1)
- **RNG:** — (determinista puro)
- **Lee:** popDeltas, territoryRequests, claimRequests, Pop, Province, Claim
- **Escribe:** Pop (filas y todos sus campos de clave; `size`), Province.owner, Claim
- **Buffers:** ← popDeltas, ← territoryRequests, ← claimRequests
- **Emite:** `territory.changed` (con la causa de la solicitud ganadora)

#### `derive` · 13b · anual (y al cargar) · P0+ (crece en cada fase)
- **RNG:** —
- **Lee:** todo el estado
- **Escribe:** solo vistas derivadas (§13), nunca estado
- **Emite:** — (no emite eventos)

#### `chronicle` · 14 · anual · P1 / P11
- **RNG:** `chronicle`
- **Lee:** eventBus, vistas derivadas (este tick y el anterior)
- **Escribe:** historia (log, episodios, deltas visuales, keyframes): **fuera** del estado (M2)
- **Buffers:** ← eventBus, → visualDeltas
- **Emite:** `province.majorityChanged`, `contact.first`, `era.began` (eventos de cambio derivado)

> **Servicio de nombres** (`packages/lang`): no es un sistema; es una función pura
> `nombre(idioma, tipo, rng)` que usan los sistemas al crear entidades. La fila `Name` la escribe
> el sistema que nombra (dueño por fila).

---

## 10. Red causal mapeada (§11.1 del plan)

Cada flecha de la red tiene un sistema responsable y un campo (o buffer) por el que pasa.

| Flecha | Sistema | Por dónde pasa |
|---|---|---|
| Geología → relieve, minerales, volcanes | worldgen | `WorldRaster.elevation`, `Deposit`, `volcanism` |
| Clima → temperatura, lluvia → biomas, suelos, especies | worldgen; environment (anomalías, P10) | `WorldRaster.{temperature, precipitation, biome, soil}`, `ProvinceStatic.wildSpecies`; `Province.{tempAnomaly, precipAnomaly}` |
| → Provincias (capacidad, recursos, costo) | worldgen | `ProvinceStatic`, grafo (`baseCost` en days) |
| Provincias → subsistencia | production | `Province.landUse`, `productionOutput`, stat `cropYield` |
| Domesticación → subsistencia | knowledge → production | `Province.domesticatedSpecies` |
| Subsistencia → cultura (valores, idioma, arquitectura) | culture | `Culture.values` desde `landUse` y entorno |
| Pops → excedente → estratos | production, markets, demography | `consumption`, `popDeltas` (movilidad, nacimientos, muertes) |
| → Asentamientos | settlements | `Settlement.{urbanShare, level}` desde vistas de población y mercado |
| → Conocimiento | knowledge | `Province.knownInnovations` desde urbanización, especialistas, `Pop.literacy`, `TradeFlow` |
| Economía → riqueza de estratos | markets | `Pop.wealth` |
| Riqueza → poder de estamentos | estates | `Estate.power` |
| Estamentos → Estado | regime, statecraft | `Polity.powerBalance`, transiciones; leyes |
| Estado ⇄ agencia | agenda, diplomacy | `Agenda`, `Treaty`, `War` |
| Agencia → guerra | diplomacy, military, ledger | `War`, `Army`, `Battle`, `territoryRequests` → `Province.owner` |
| Religión → legitimidad, cohesión, alianzas, casus belli, economía | faith (doctrinas) + modificadores | stats `legitimacy`, `opinion`, `conversionPressure`; `HolySite` (casus belli); tasas de interés (usura) |
| Shocks → crisis → colapso / reforma / revolución → renacimiento | environment, epidemics, statecraft, regime, knowledge | `popDeltas`, `bankruptcy`, `regime.changed`, `innovation.lost` |
| Eventos con causas → memoria | todos → chronicle | `eventBus` → log, episodios, enciclopedia |

---

## 11. Catálogo de eventos v0

Clave estable `dominio.verbo` (también es la clave de la plantilla i18n
`events.<clave>`). La **significancia** es un `score` en [0, 1] calculado por una función por tipo
(impacto en población, territorio, riqueza, vidas, novedad; P11 la refina); cada tipo tiene un
**umbral de emisión** para no inundar el log (H-08). Los actores son referencias tipadas.

| Clave | Emisor | Actores · lugar | Causas típicas | Significancia | Fase |
|---|---|---|---|---|---|
| `sea.flooded` | environment | provincias · zona | curva de deglaciación | 0,2–0,6 | P3 |
| `climate.shockStarted` / `.shockEnded` | environment | provincias | volcán, ciclo climático | 0,3–0,8 | P10 |
| `volcano.erupted` | environment | provincia | zona volcánica | 0,3–0,9 | P10 |
| `famine.started` / `.ended` | demography | provincias, polity | anomalía climática, guerra, precio | 0,2–0,8 | P1/P4 |
| `epidemic.started` / `.ended` | epidemics | patógeno, provincias | ruta, ejército, contacto | 0,2–1 | P4/P10 |
| `pathogen.emerged` | epidemics | patógeno · provincia | reservorio zoonótico, densidad | 0,3–0,7 | P10 |
| `migration.wave` | migration | culturas · origen → destino | hambre, guerra, descontento | 0,2–0,6 | P4 |
| `subsistence.shifted` | production | provincia | especies, presión demográfica, innovación | 0,1–0,5 | P1/P4 |
| `domestication.achieved` | knowledge | especie · provincia | especie silvestre, siglos de cultivo | 0,4–0,9 (primera mundial) | P4 |
| `innovation.invented` | knowledge | innovación, inventor? · provincia | prerrequisitos, necesidad | 0,2–1 | P1/P5 |
| `innovation.lost` | knowledge | innovación · provincias | colapso, aislamiento | 0,3–0,8 | P5 |
| `settlement.founded` / `.grew` / `.declined` / `.ruined` / `.refounded` | settlements | asentamiento · provincia | población, mercado, saqueo | 0,05–0,7 | P1/P4 |
| `building.completed` | settlements | edificio · asentamiento | tesoro, innovación | 0,05–0,4 | P6 |
| `landmark.built` | settlements | hito, constructor | prestigio, riqueza | 0,4–0,8 | P11 |
| `market.formed` | markets | mercado · hub | conectividad | 0,1–0,4 | P6 |
| `route.named` | markets | ruta | volumen y antigüedad | 0,3–0,6 | P6 |
| `trade.disrupted` | markets | ruta | guerra, piratería | 0,2–0,6 | P6 |
| `inflation.spiked` | markets | mercado, moneda | mina, saqueo, envilecimiento | 0,3–0,7 | P6 |
| `currency.minted` | markets | moneda, polity | innovación de acuñación | 0,3–0,8 | P6 |
| `currency.debased` | statecraft | moneda, polity | déficit | 0,3–0,6 | P7 |
| `bankruptcy` | statecraft | polity | deuda, guerra | 0,4–0,8 | P7 |
| `polity.formed` | statecraft | polity · capital | excedente, circunscripción, conflicto | 0,2–0,9 | P1/P7 |
| `polity.absorbed` / `.fragmented` / `.collapsed` | statecraft, regime | polities | conquista, crisis, sucesión | 0,4–1 | P1/P7/P10 |
| `territory.changed` | ledger | provincia, polities | solicitud ganadora (expansión, tratado, secesión…) | 0,05–0,5 | P1 |
| `regime.changed` | regime | polity | estamentos, reforma, usurpación, colapso | 0,4–0,9 | P7 |
| `law.enacted` | statecraft | polity, ley | demanda de estamento, régimen | 0,1–0,5 | P7 |
| `title.created` / `.destroyed` | statecraft | título | conquista, concesión | 0,1–0,5 | P7 |
| `ruler.succeeded` | succession | título, persona | muerte, ley de sucesión | 0,1–0,6 | P1 |
| `succession.crisis` / `regency.started` | succession | título, pretendientes | heredero menor, reclamos | 0,3–0,7 | P7 |
| `person.born` / `.died` | characters | persona | (notables) | 0,05–0,6 | P1/P7 |
| `marriage` | characters | personas, casas | alianza, reclamo | 0,05–0,5 | P7 |
| `house.founded` / `.extinct` | characters | casa | rama cadete, falta de herederos | 0,1–0,5 | P7 |
| `scheme.succeeded` / `.failed` / `.discovered` | schemes | plan, personas | ambición, opinión | 0,2–0,8 | P7 |
| `faction.formed` / `.ultimatum` | factions | facción, polity | agravios, poder | 0,2–0,6 | P7 |
| `civilWar.started` / `.ended` | factions | facción, polity | ultimátum rechazado | 0,5–0,9 | P7 |
| `estate.demanded` | estates | estamento, ley | poder vs. satisfacción | 0,1–0,4 | P7 |
| `war.declared` / `war.ended` | diplomacy | guerra, bandos | casus belli, agenda | 0,3–1 | P1/P9 |
| `treaty.signed` / `.broken` | diplomacy | tratado, partes | guerra, alianza, traición | 0,1–0,7 | P1/P9 |
| `alliance.formed` / `coalition.formed` | diplomacy | polities | enemigo común, hegemón | 0,2–0,7 | P9 |
| `battle.fought` | military | ejércitos, generales · provincia | guerra | 0,1–0,9 | P1/P9 |
| `siege.started` / `.ended` | military | asentamiento, ejército | guerra | 0,1–0,7 | P9 |
| `city.sacked` | military | asentamiento | sitio, asalto | 0,4–0,9 | P9 |
| `culture.split` / `.extinct` | culture | culturas | aislamiento, distancia | 0,2–0,6 | P4 |
| `language.split` | language | idiomas | escisión cultural | 0,2–0,5 | P4 |
| `religion.founded` / `.organized` / `.schism` / `.extinct` | faith | religión, fundador | crisis, urbanización, deriva | 0,3–1 | P8 |
| `prophet.appeared` | faith | persona | crisis social | 0,4–0,9 | P8 |
| `holySite.established` | faith | sitio, religión | fundación, milagro | 0,2–0,6 | P8 |
| `railway.opened` | settlements | provincias | innovación, capital | 0,3–0,7 | P10 |
| `industrialization.started` | production | provincia, polity | carbón + hierro + capital + conocimiento | 0,6–1 | P10 |
| `province.majorityChanged` | chronicle | provincia, cultura o religión | flujos de asimilación acumulados | 0,1–0,5 | P4/P8 |
| `contact.first` | chronicle | culturas, polities | rutas, exploración | 0,4–1 | P10 |
| `era.began` | chronicle | región, era | conjunto de innovaciones | 0,3–0,7 | P5/P11 |

---

## 12. Invariantes globales

Se verifican en tests (propiedades y suite de determinismo) y, en dev, al final de cada tick.

| # | Invariante | Cómo se verifica |
|---|---|---|
| I1 | Los ids nunca se reutilizan (por tipo de entidad) | `IdAllocator` monótono; test de propiedades (P0.6) |
| I2 | **Conservación de población:** Σ size(t+1) = Σ size(t) + nacimientos − muertes (toda causa); migración y asimilación conservan | ledger con contabilidad por causa; tolerancia relativa 1e-9 |
| I3 | `Pop.size` ≥ 1 persona; los menores se fusionan (sin perder gente) | ledger |
| I4 | Toda provincia de tierra tiene exactamente un dueño vivo o ninguno; una provincia sumergida no tiene dueño ni pops | fin de tick |
| I5 | La clave (provincia, cultura, religión, estrato) es única por provincia | índice del ledger |
| I6 | **Integridad referencial:** toda `ref` apunta a una entidad existente; las refs "vivas" (dueño, holder, ubicación) a entidades vivas, las "históricas" (fundador, causa) pueden apuntar a registros terminados | chequeo por tipo de campo |
| I7 | Dinero: `moneySupply`, `treasury`, `debt` ≥ 0 | fin de tick |
| I8 | `fraction` ∈ [0, 1]; `landUse` suma 1; `urbanShare` suma ≤ 1 por provincia; los `score` dentro de su rango documentado | validación de esquema |
| I9 | Los buffers de flujo están vacíos en la frontera del tick | scheduler |
| I10 | No hay NaN ni ±∞ en el estado (`expires = 0` significa permanente) | serializador + validación |
| I11 | La jerarquía de títulos es acíclica y cada `liege` es de nivel mayor | fin de tick (P7) |
| I12 | Las personas muertas no tienen títulos, cónyuges vivos asignados ni detalle completo | fin de tick (P7) |
| I13 | Una guerra activa tiene ≥ 1 polity por bando y ninguna en ambos; una terminada tiene desenlace | fin de tick (P9) |
| I14 | Ejércitos en provincias de tierra; flotas en zonas marítimas (o en puerto propio) | fin de tick (P9) |
| I15 | Los eventos del tick tienen `year` = año actual; sus causas son eventos anteriores o del mismo tick, o hechos del estado | bus de eventos |
| I16 | Todo modificador apunta a un objetivo existente; al terminar una entidad se borran sus modificadores (o se marcan históricos) | fin de tick |
| I17 | Los asentamientos habitados están en provincias no sumergidas | fin de tick |
| I18 | Precios > 0 y dentro de [mín, máx] por bien | markets (P6) |
| I19 | Conocimiento cerrado: si se conoce una innovación, se conocen sus prerrequisitos (la pérdida de un prerrequisito arrastra a las dependientes) | knowledge (P5) |
| I20 | Árboles acíclicos: culturas, idiomas, religiones, casas | fin de tick |

---

## 13. Vistas derivadas (`derive`)

Funciones puras de estado + mundo estático + contenido. **No** van al snapshot (M3); se
recalculan al final de cada tick y al cargar. Los sistemas del tick t+1 leen las del fin del
tick t.

| Vista | Contenido | Fase |
|---|---|---|
| Por provincia | población total (persons), densidad (persons_per_km2), participación de culturas, religiones y estratos (fraction), mayorías, población urbana por asentamiento, descontento medio, era | P1 |
| Índice de pops | provincia → pops; clave → pop (lo usa el ledger) | P1 |
| Por polity | provincias, población, área, capital, vecinos (fronteras), reino completo (jerarquía de vasallos aplanada), distancia efectiva de cada provincia a la capital (days) | P1/P7 |
| Etiquetas | tipo de polity (jefatura, estado, imperio) y etiqueta del régimen, desde la estructura | P1/P7 |
| Grafo efectivo | costo de cada arista con caminos, ferrocarril, estación y tecnología (days) | P1/P9/P10 |
| Áreas de mercado | provincia → mercado (clusters por conectividad) | P6 |
| Eras | era por provincia y por polity, desde el conjunto de innovaciones | P5 |
| Índices de personas | vivos por casa, titulares, herederos | P7 |

---

## 14. Relación con la historia y el rebobinado

- **Keyframes** (cada 100 años) = snapshot del estado (`serializeState`) comprimido.
- **Deltas visuales anuales** (estacionales para ejércitos) = lo que el mapa y el inspector
  necesitan para mostrar un año sin re-simular: cambios de dueño, niveles de asentamientos,
  mayorías, rutas, ejércitos, resumen de precios.
- **Consulta "a la fecha Y"** = keyframe anterior + deltas hasta Y. Rebobinar es *ver*; la cabeza
  de la simulación no retrocede (§8.4 del plan).
- El formato `.wsim` v0 se especifica en el ADR-008 (lo informa el spike B).

---

## 15. Contenido (`packages/content`)

Tablas validadas con zod; su hash entra en la cabecera de snapshots y `.wsim` (un seed reproduce
solo con el mismo contenido).

| Tabla | Fase | Tabla | Fase |
|---|---|---|---|
| `Biome`, `Soil`, `MapType`, `WorldSize` | P1/P3 | `Law` | P1/P7 |
| `Resource` | P3 | `EstateType`, `RegimeAuthority`, `LandTenure` | P7 |
| `WildSpecies` | P3 | `Trait` (definiciones de rasgos) | P7 |
| `Stratum` | P1/P4 | `SchemeKind`, `FactionGoal` | P7 |
| `SettlementLevel` (umbrales con histéresis) | P1 | `Doctrine`, `ClergyOrganization`, `DeityDomain` | P8 |
| `BuildingType` | P4/P6 | `UnitType`, `ShipType` | P9 |
| `ArchStyle` | P4 | `WarGoal`, `TreatyKind`, `GrievanceKind` | P9 |
| `SoundChange` | P4 | `ShockKind`, `Reservoir` | P10 |
| `Innovation` | P1 (≈10) / P5 (≈150) | `LandmarkKind` | P11 |
| `Good`, `ProductionMethod` | P6 | `EventType` (clave i18n + función de significancia + umbral) | P1+ |
| `Stat` (registro de stats, §5.12) | P0.9+ | | |

---

## 16. Cambios respecto del plan (§10–§11)

| Cambio | Motivo | Decisión |
|---|---|---|
| Sistema nuevo **`ledger`** (fase 13a) | Varios sistemas afectan `Pop.size`, `Province.owner` y `Claim`; con un aplicador único se cumple el escritor único sin cachés acopladas al orden (H-02) | M1 |
| Sistema nuevo **`factions`** (fase 7, P7) | §11.3 no le asignaba dueño a `Faction` | M5 |
| `PersonRecord` → **`Person`** (identidad permanente + rasgos) y `Character` → **`CharacterDetail`** | Ids crecientes en tablas escasas al re-promover; los rasgos no se pierden | M6 |
| Fase 13 = "consolidación (ledger) y derivación" | Ver M1 | M1 |
| La domesticación queda en `knowledge` (`Province.domesticatedSpecies`) | Es un saber que se adquiere y se difunde | — |
| La movilidad entre estratos la decide `production` (trabajo por método) | P4.6: la estratificación emerge del excedente y del trabajo | — |
| Costo de movimiento en **days** | Unidad física e interpretable | M7 |
| Moneda de cuenta `coins` = plata estándar | Comparar precios entre eras y monedas | M8 |

---

## 17. Decisiones de modelo para el gate

### M1 · Libro mayor (`ledger`) para población, territorio y reclamos

| Opción | Pros | Contras |
|---|---|---|
| **A · Deltas a buffers + un aplicador al final del tick (recomendada)** | Escritor único real; todos ven la población y el territorio del inicio del tick, sin importar el orden de los sistemas; conservación verificable por causa (I2); un solo lugar para fusionar pops | Las decisiones del año se aplican al final del año (sin efecto en cadena dentro del mismo tick) |
| B · Cada sistema escribe directo su parte (`Pop.size` compartido) | Simple | Viola el escritor único; el resultado depende del orden; es exactamente el error H-02 |
| C · Aplicar los deltas al final de cada fase | Efectos dentro del año | Varios puntos de escritura; el orden vuelve a importar |

**Recomiendo A.** **No recomiendo B:** reintroduce el acoplamiento por orden del proyecto anterior.

### M2 · El log de eventos queda fuera del hash de estado

| Opción | Pros | Contras |
|---|---|---|
| **A · Log fuera del estado; las consecuencias duraderas se materializan en el estado (recomendada)** | El estado se basta para continuar; el log se puede comprimir o podar; los keyframes no cargan con 100.000 eventos | Disciplina: todo efecto duradero tiene que tener un campo (agravio, modificador, reclamo) |
| B · Log dentro del estado | Los sistemas pueden "recordar" leyendo eventos | Snapshots que crecen sin techo; tentación de lógica que depende de buscar en el log |

**Recomiendo A.**

### M3 · Vistas derivadas fuera del snapshot

Recomendado: se recalculan al cargar (es una función pura y barata). Alternativa: guardarlas
(carga más rápida, pero son datos duplicados que pueden desincronizarse). **No recomiendo**
guardarlas.

### M4 · Lo que cruza la frontera del tick es estado

Regla: los buffers mueren dentro del tick; lo que el sistema A escribe para que lo use B el año
siguiente (pedidos, cosecha del año anterior) es un campo con dueño, en el snapshot y en el hash.
Evita "cachés ocultas" (regla de oro 2).

### M5 · Sistema `factions` propio

Alternativa: que `estates` o `statecraft` sean dueños de `Faction`. Recomiendo sistema propio:
la lógica (formación, ultimátum, guerra civil) es distinta y P7 ya prevé sub-hitos.

### M6 · `Person` permanente + `CharacterDetail` aparte

Alternativa: una sola tabla de personajes con columnas opcionales. Recomiendo separar: mantiene
≤ 3.000 detalles completos sin perder la genealogía ni los rasgos de nadie.

### M7 · Costo de movimiento en días de viaje

Alternativa: "km efectivos". Recomiendo días: es la unidad con la que razonan la logística, la
migración, la administración (distancia a la capital) y el telégrafo/ferrocarril (que la cambian).

### M8 · Moneda de cuenta única

Recomendado: todo valor monetario en `coins` = plata de ley estándar; cada `Currency` real tiene
ley y tipo de cambio. Sin esto, comparar riqueza entre siglos o entre monedas es imposible.

### Preguntas abiertas para P4–P5 (no bloquean P0)

- Tope exacto de pops por provincia y regla de fusión (P4).
- Portador del conocimiento: provincia vs. comunidad (P5.2).
- ¿Los soldados de un ejército siguen contados en sus pops (recomendado: sí; las bajas son
  muertes) o se trasladan físicamente? (P9).

---

## 18. Historial de versiones

| Versión | Fecha | Cambios |
|---|---|---|
| 1.0-rc | 2026-10-15 | Primera versión completa para el gate de P0 |
| 1.0 | 2026-10-15 | Aprobada por Cristian con M1–M8 tal como se recomendaron (D42) |
