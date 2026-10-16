// Parámetros de la simulación (regla de oro 9: con unidad y comentario). Los de calibración de
// cada sistema llegan con su sistema (P1.3).

export const SIM_DEFAULTS = {
  /** Primer año simulado (year; D11: ≈12.000 a.C.). */
  startYear: -12000,
  /** Último año simulado (year; S1: ≈1900). */
  endYear: 1900,
} as const;

export const LEDGER = {
  /** Tamaño mínimo de un pop (persons, I3): por debajo se fusiona con el más parecido. */
  minPopSize: 1,
  /** Tolerancia relativa de la conservación de población (fraction, I2). */
  conservationTolerance: 1e-9,
} as const;

export const INITIAL_STATE = {
  /**
   * Densidad de forrajeros con habitabilidad 1 (persons_per_km2). Tierra hacia 10.000 a.C.:
   * ~4 M de personas en ~100 M km² habitables ≈ 0,04/km² de promedio; con habitabilidad media
   * ~0,4, la densidad en la mejor tierra ronda 0,1. P1.3 la calibra contra el Apéndice A.
   */
  foragerDensity: 0.1,
} as const;

export const CULTURES = {
  /** Provincias por foco cultural inicial (count): ≈1 cultura cada 40 provincias. */
  provincesPerCulture: 40,
  /** Mínimo de culturas iniciales (count). */
  minCultures: 4,
} as const;

export const PRODUCTION = {
  /** Alimento que necesita una persona por año (tons por persona y año; ~250 kg de grano). */
  foodNeedT: 0.25,
  /**
   * Rendimiento del forrajeo con habitabilidad 1 (tons_per_year por km2): 0,1 personas/km² ×
   * 0,25 t, el mismo equilibrio que la densidad inicial de forrajeros.
   */
  forageYieldT: 0.025,
  /** Rendimiento base del cultivo antes de innovaciones (tons_per_year por km2 cultivado). */
  cropYieldT: 0.8,
  /** Adopción del cultivo una vez conocida la agricultura (per_year sobre lo que falta). */
  cropAdoptionRate: 0.003,
  /** Fracción cultivada inicial al conocer la agricultura (fraction). */
  cropAdoptionSeed: 0.02,
  /** Umbral de "subsistencia agrícola" para el evento subsistence.shifted (fraction). */
  agriculturalMajority: 0.5,
} as const;

export const DEMOGRAPHY = {
  /** Natalidad base (per_year) y extra con excedente de alimento (per_year por unidad, hasta 1):
   * con excedente la población crece hasta ~0,5 %/año. */
  birthBase: 0.035,
  birthSurplusGain: 0.004,
  /** Mortalidad base (per_year). Equilibrio con alimento justo: crecimiento +0,1 %/año. */
  deathBase: 0.034,
  /** Mortalidad extra por hambre (per_year por unidad de déficit de alimento). */
  famineMortality: 0.3,
  /** Variación anual de la cosecha (fraction, desvío estándar; acotada a ±3σ). */
  harvestNoiseSd: 0.08,
  /** Hambruna: empieza por debajo y termina por encima de esta seguridad alimentaria (fraction). */
  famineStartBelow: 0.85,
  famineEndAbove: 0.95,
} as const;

export const KNOWLEDGE = {
  /** Población de referencia de la probabilidad de invención (persons): escala con pob/ref. */
  inventionPopulationRef: 10_000,
  /**
   * Probabilidad anual de adoptar una innovación por cada vecina que la conoce, a la distancia de
   * referencia (per_year); se divide por (días de la arista / referencia): la difusión avanza en
   * km por año parecidos en mundos de distinta resolución.
   */
  diffusionBase: 0.004,
  /** Distancia de referencia de la difusión (days): mediana de las aristas del mundo mediano. */
  diffusionRefDays: 23,
  /** Multiplicador de la difusión entre provincias de la misma polity (ratio). */
  samePolityDiffusion: 2,
} as const;

export const SETTLEMENTS = {
  /** Fracción urbana base de una provincia agrícola (fraction, por unidad de cultivo). */
  urbanBase: 0.025,
  /** Densidad de referencia para la fracción urbana (persons_per_km2) y sus límites (ratio). */
  urbanDensityRef: 1,
  urbanDensityMin: 0.3,
  urbanDensityMax: 2,
  /** Tope de la fracción urbana (fraction). */
  urbanMax: 0.3,
  /** Velocidad con la que la fracción urbana va hacia su objetivo (per_year). */
  urbanAdjustRate: 0.05,
  /** Histéresis de los niveles (fraction): sube por encima de +15%, baja por debajo de −15%. */
  hysteresis: 0.15,
} as const;

export const STATECRAFT = {
  /** Probabilidad anual de formar una jefatura desde un pueblo agrícola (per_year). */
  formationChance: 0.001,
  /** Cultivo mínimo para formar una polity (fraction). */
  formationMinCrop: 0.5,
  /**
   * Alcance administrativo base de una polity (days) antes de innovaciones. Una arista del mundo
   * mediano cuesta ~23 días (mediana): una jefatura controla su provincia y las vecinas cercanas.
   */
  reachDays: 25,
  /** Probabilidad anual de expandirse a una provincia vecina sin dueño (per_year, a distancia 0). */
  expansionRate: 0.02,
  /** Población mínima de una provincia para que valga la pena incorporarla (persons). */
  expansionMinPopulation: 500,
  /** Población de referencia de la fuerza de expansión (persons) y sus límites (ratio). */
  expansionPopulationRef: 100_000,
  expansionStrengthMin: 0.3,
  expansionStrengthMax: 2,
  /** Absorción pacífica: provincias máximas del absorbido, relación de población, chance anual. */
  absorbMaxProvinces: 2,
  absorbPopulationRatio: 5,
  absorbChance: 0.01,
} as const;

export const CHARACTERS = {
  /** Mortalidad anual: base + a·e^(b·edad) (per_year; a en per_year, b por año). */
  mortalityBase: 0.01,
  mortalityA: 0.0002,
  mortalityB: 0.085,
  /** Mortalidad infantil extra hasta los 5 años (per_year). */
  childMortality: 0.03,
  childAgeYears: 5,
  /** Edades fértiles del titular (years) y probabilidad anual de tener un hijo (per_year). */
  fertileFrom: 18,
  fertileTo: 55,
  birthChance: 0.25,
  /** Edad de un gobernante nuevo sin vínculo con el anterior (years, rango). */
  newRulerAgeMin: 20,
  newRulerAgeMax: 45,
} as const;

export const WAR = {
  /** Años sin declarar guerras después de terminar una (years). */
  cooldownYears: 15,
  /** Relación de fuerzas mínima para declarar (ratio) y chance anual por unidad de ventaja. */
  declareMinRatio: 1.2,
  declareChance: 0.015,
  /** Ejército = esta fracción de la población (fraction). */
  armyShare: 0.01,
  /** Ventaja del defensor (ratio). */
  defenseBonus: 1.2,
  /** Bajas por batalla: perdedor y ganador (fraction del ejército). */
  loserLosses: 0.15,
  winnerLosses: 0.07,
  /** Puntaje por batalla (score) y tope (score). */
  battleScore: 25,
  maxScore: 100,
  /** Cansancio por estación de campaña, del perdedor y del ganador por batalla (fraction). */
  exhaustionPerCampaign: 0.02,
  exhaustionLoser: 0.12,
  exhaustionWinner: 0.05,
  /** El cansancio reduce la fuerza (ratio por unidad de cansancio). */
  exhaustionPenalty: 0.5,
  /** Provincias máximas que gana el atacante en una guerra (count) + 1 por unidad de ventaja. */
  maxGainBase: 2,
  /** Solo se anexan provincias hasta este múltiplo del alcance administrativo (ratio). */
  annexReach: 1.5,
  /** Puntaje desde el que se declara vencedor a un bando al hacer la paz (score). */
  victoryScore: 20,
  /** Años sin contacto en el frente que terminan la guerra (years). */
  noContactYears: 2,
} as const;
