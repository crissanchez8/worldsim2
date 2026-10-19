// Parámetros del worldgen v1 (P1.1), con unidad y comentario (regla de oro 9). Los de cada tipo de
// mapa, tamaño y bioma son contenido (`@ws/content`); acá van los del proceso físico.

export const PLANET = {
  /**
   * Perímetro E-O del mundo (km): el de la Tierra. El mundo es un cilindro (D6): las celdas miden
   * lo mismo en todas las latitudes (`circumferenceKm / width` de lado).
   */
  circumferenceKm: 40_075,
  /** Segundos de un año (para pasar mm/año a m³/s). */
  secondsPerYear: 31_557_600,
} as const;

/** Escalas de ancho en celdas se dan para el mundo mediano (2048) y se escalan por `width/2048`. */
export const REFERENCE_WIDTH = 2048;

export const PLATES = {
  /** Elevación base de una placa continental y de una oceánica (unidades de relieve). */
  continentalBase: 0.35,
  oceanicBase: -0.45,
  /** Ancho de la transición entre placas (celdas, mundo mediano). */
  blendWidthCells: 24,
  /** Ancho de las cordilleras y fosas de borde (celdas, mundo mediano). */
  boundaryWidthCells: 22,
  /** Peso de cada placa en el Voronoi multiplicativo (ratio): placas de tamaños variados. */
  weightMin: 0.7,
  weightMax: 1.3,
  /** Distorsión de los bordes de placa con ruido (celdas, mundo mediano). */
  warpCells: 90,
  /** Longitud de onda de la distorsión (celdas, mundo mediano). */
  warpWavelengthCells: 400,
  /** Rapidez relativa de las placas (adimensional; 1 = la más rápida). */
  speedMin: 0.3,
  speedMax: 1,
  /** Levantamiento por convergencia, según los tipos (unidades de relieve por unidad de velocidad). */
  upliftContinental: 0.75, // choque continente-continente: cordillera alta
  upliftSubduction: 0.6, // borde continental de una subducción: cordillera costera
  trenchSubduction: -0.45, // borde oceánico de una subducción: fosa
  upliftArc: 0.35, // océano-océano: arco de islas
  /** Divergencia: rift continental (hunde) y dorsal oceánica (levanta) (unidades de relieve). */
  riftContinental: -0.15,
  ridgeOceanic: 0.12,
} as const;

export const RELIEF = {
  /** Elevación máxima de la tierra y profundidad máxima del océano (m). */
  maxLandM: 6500,
  maxDepthM: 6000,
  /** Exponente de la curva hipsométrica de la tierra (>1: mayoría de llanuras, pocos picos). */
  landCurve: 1.6,
  /** Longitud de onda base del ruido de continentes y de cordilleras (celdas, mundo mediano). */
  continentWavelengthCells: 512,
  ridgeWavelengthCells: 160,
  /** Octavas (count): de la longitud de onda base hasta ~2 celdas. */
  continentOctaves: 9,
  ridgeOctaves: 6,
  /** Atenuación de amplitud por octava (ratio). */
  gain: 0.5,
  /** Peso de las crestas de ruido en tierra, y su refuerzo donde hay levantamiento (ratio). */
  ridgeWeight: 0.12,
  ridgeUpliftBoost: 0.5,
  /** Contenedores del histograma para el percentil del nivel del mar (count). */
  seaLevelBins: 65_536,
  /** Erosión térmica: iteraciones (count), talud (m por celda, mundo mediano) y tasa (fraction). */
  erosionIterations: 12,
  talusM: 260,
  erosionRate: 0.2,
  /**
   * Hundimiento polar (unidades de relieve) desde una latitud (fraction de 90°): en el cilindro
   * las filas polares pesan lo mismo que las ecuatoriales y sin esto sobra tierra helada.
   */
  polarSink: 0.35,
  polarSinkFrom: 0.7,
  /** Masas de tierra más chicas que esto se hunden (count, celdas): evita islotes de una celda. */
  minLandmassCells: 4,
  /** Profundidad que reciben al hundirse (m, negativa). */
  sunkenDepthM: -20,
} as const;

export const CLIMATE = {
  /** Temperatura media anual al nivel del mar en el ecuador (celsius). */
  equatorC: 28,
  /** Caída de temperatura del ecuador al polo (celsius) y forma de la curva (exponente). */
  poleDropC: 50,
  latitudeExponent: 1.6,
  /** Gradiente térmico vertical (celsius por km de altura). */
  lapseRateCPerKm: 6.5,
  /** Precipitación de fondo y bandas de latitud (mm_per_year; centros y anchos en grados). */
  basePrecipMm: 250,
  itczPrecipMm: 2600,
  itczWidthDeg: 18,
  midLatPrecipMm: 1000,
  midLatCenterDeg: 50,
  midLatWidthDeg: 14,
  subtropicDryMm: 100,
  subtropicCenterDeg: 27,
  subtropicWidthDeg: 8,
  /** Desde qué latitud se seca hacia los polos y cuánto (grados; fraction). */
  polarDryFromDeg: 65,
  polarDryFactor: 0.7,
  minPrecipMm: 40,
  /** Límites de las celdas de viento (grados): alisios del este, oestes, polares del este. */
  tradeWindsToDeg: 30,
  westerliesToDeg: 60,
  /** La humedad decae al avanzar sobre tierra (km de escala). */
  moistureDecayKm: 3000,
  /** Pérdida de humedad por ascenso orográfico (m de escala) y lluvia extra a barlovento (ratio). */
  orographicScaleM: 1500,
  orographicBoost: 1.5,
  /** Parte de la precipitación que no depende de la humedad advectada (fraction). */
  moistureFloor: 0.3,
  /** Suavizado N-S del campo de humedad (filas a cada lado). */
  moistureBlurRows: 3,
} as const;

export const HYDROLOGY = {
  /** Pendiente mínima que el relleno de depresiones impone para que todo drene (m por paso). */
  fillEpsilonM: 0.01,
  /** Una depresión rellenada más que esto es un lago (m). */
  lakeMinDepthM: 150,
  /** Coeficiente de escorrentía: base, caída por grado y límites (fraction; por celsius). */
  runoffBase: 0.5,
  runoffPerC: 0.012,
  runoffMin: 0.1,
  runoffMax: 0.6,
  /** Caudal desde el que una celda es río (m3_per_s), río que hace frontera y navegable. */
  riverMinFlow: 50,
  borderRiverFlow: 300,
  navigableFlow: 1000,
} as const;

export const PROVINCES = {
  /** Bonos de habitabilidad de una celda por río y por costa (score). */
  riverHabitability: 0.2,
  coastHabitability: 0.1,
  /** Pendiente (m por celda, mundo mediano) que anula la habitabilidad. */
  maxHabitableSlopeM: 600,
  /** Radio de exclusión de las semillas: factor sobre el radio medio y su variación por habitabilidad. */
  seedRadiusStart: 1.3,
  seedRadiusShrink: 0.9,
  seedDensityGain: 0.8,
  /** Intentos fallidos seguidos antes de achicar el radio (count). */
  seedPatience: 2000,
  /** Costos del crecimiento: por desnivel (m de escala), por altura (m desde, m de escala). */
  climbScaleM: 200,
  highlandFromM: 1500,
  highlandScaleM: 1000,
  /** Multiplicador de costo para cruzar un río que hace frontera (ratio). */
  riverCrossing: 4,
  /** Velocidad de viaje de referencia a pie con carga (km por día; M7). */
  travelKmPerDay: 25,
  /** Estrechos: agua máxima entre dos provincias (celdas) y recargo del cruce (ratio). */
  straitMaxCells: 3,
  straitCost: 2,
  /** Provincias más chicas que esto se fusionan con su vecina de frontera más larga (km2). */
  minProvinceAreaKm2: 2500,
  /** Escala de rugosidad: desnivel medio (m por celda) que da rugosidad 1. */
  ruggednessScaleM: 400,
} as const;
