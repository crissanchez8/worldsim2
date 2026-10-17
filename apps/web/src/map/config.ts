// Parámetros del mapa v1 (P1.2), con unidad. Unidad de mundo = 1 celda del ráster; la celda x
// tiene su centro en X = x (y lo mismo en Z con las filas, fila 0 = polo norte).
//
// Las distancias de cámara se dan para el mundo mediano (2048 celdas de ancho) y se escalan con
// el ancho (`scaleForWidth`): el mundo chico se ve con el mismo encuadre.
//
// Colores y exageración son PROVISORIOS: los define el Design System (P2) y la inmersión (P12).

/** Ancho de referencia (celdas) de las distancias de cámara. */
export const REFERENCE_WIDTH = 2048;

export function scaleForWidth(width: number): number {
  return width / REFERENCE_WIDTH;
}

/** Lado de un chunk, en celdas. Divide a todos los anchos y altos de `WorldSizes`. */
export const CHUNK_SIZE = 128;
/** Pasos de muestreo por nivel de LOD, en celdas (LOD 0 = resolución completa). */
export const LOD_STEPS = [1, 2, 4, 8, 16] as const;
/** Distancia cámara-chunk (celdas, mundo mediano) desde la que se baja de LOD; se duplica por nivel. */
export const LOD_BASE_DISTANCE = 160;
/** Profundidad de los faldones que tapan las grietas entre LODs (celdas; ≥ relieve exagerado visible). */
export const SKIRT_DEPTH = 12;

/** Exageración vertical por defecto (adimensional): con celdas de ~20 km el relieve real no se ve. */
export const DEFAULT_VERTICAL_EXAGGERATION = 30;
/** Rango aceptado de `?exaggeration=` (adimensional). */
export const VERTICAL_EXAGGERATION_RANGE = [0, 100] as const;
/** Exageración extra SOLO del sombreado, sobre la vertical (adimensional). */
export const SHADING_EXAGGERATION = 3;
/** Elevación máxima posible de la tierra (m; `RELIEF.maxLandM` del worldgen): esfera envolvente. */
export const MAX_LAND_M = 6500;
/** Profundidad máxima del océano (m; `RELIEF.maxDepthM` del worldgen): escala del color del agua. */
export const MAX_DEPTH_M = 6000;

/** Cámara (celdas, mundo mediano). */
export const CAMERA = {
  /** Campo de visión vertical (grados). */
  fovDeg: 45,
  /** Distancia cámara-objetivo mínima y máxima. */
  minDistance: 25,
  maxDistance: 600,
  /** Distancia inicial. */
  startDistance: 480,
  /**
   * Plano lejano: < medio mundo (1024). Cada chunk existe una sola vez y se reposiciona en la copia
   * más cercana; lo que está a más de medio mundo no existe.
   */
  far: 1000,
  near: 0.5,
  /** Inclinación sobre el horizonte (rad): de cerca oblicua, de lejos casi cenital (atlas). */
  pitchNear: 0.62,
  pitchFar: 1.32,
} as const;

/**
 * Zoom semántico v0 (celdas, mundo mediano): de lejos plano coloreado, de cerca relieve.
 * `relief` = 1 por debajo de `reliefFullDistance` y 0 por encima de `reliefFlatDistance`.
 */
export const SEMANTIC_ZOOM = {
  reliefFullDistance: 160,
  reliefFlatDistance: 420,
  /** Sombreado que queda con el mapa plano (fraction del de cerca). */
  flatShading: 0.35,
  /** Opacidad del relleno de provincias de cerca y de lejos (fraction). */
  fillNear: 0.28,
  fillFar: 0.78,
  /** Las fronteras de provincia (no políticas) se desvanecen entre estas distancias. */
  provinceBordersFull: 180,
  provinceBordersHidden: 340,
} as const;

/** Fronteras (px de pantalla). Se detectan comparando el texel vecino a esta distancia. */
export const BORDERS = {
  politicalPx: 1.6,
  provincePx: 0.9,
  /** Opacidad de las fronteras de provincia (fraction). */
  provinceAlpha: 0.35,
} as const;

/** Ríos: líneas con ancho por caudal, siguiendo `flowDir` (D8). */
export const RIVERS = {
  /** Caudal mínimo para dibujar (m3_per_s; = `HYDROLOGY.riverMinFlow` del worldgen). */
  minFlow: 50,
  /** Caudal con el que el ancho llega al máximo (m3_per_s; el Amazonas ronda 200.000). */
  maxFlow: 150_000,
  /** Ancho en pantalla del río más chico y del más grande (px). */
  minWidthPx: 1,
  maxWidthPx: 4.5,
  /** Ancho máximo en el mundo (celdas): de muy cerca no se vuelven bandas. */
  maxWidthCells: 0.6,
  /** Iteraciones de Chaikin sobre el trazado D8 (count): menos serrucho de 45°. */
  smoothing: 1,
  /** De lejos solo se ven los ríos con caudal relativo (0–1, escala log) ≥ esto. */
  farMinFlowT: 0.4,
  /** Altura sobre el terreno (celdas) y sesgo de profundidad: no se pelean con el terreno. */
  liftCells: 0.04,
} as const;

/** Marcadores instanciados (px de pantalla). */
export const MARKERS = {
  /** Radio de un asentamiento por nivel (0 = aldea … 4 = metrópolis). */
  settlementRadiusPx: [2.5, 3.5, 4.5, 6, 7.5],
  /** Radio de una batalla (px) según su recencia (0 = vieja, 1 = de este año). */
  battleRadiusPx: [3, 7],
  /** Altura del marcador sobre su radio (ratio). */
  heightRatio: 1.6,
  /** Tope de tamaño en el mundo (celdas). */
  maxRadiusCells: 3,
} as const;

/** Colores provisorios (sRGB 0–255). */
export const PALETTE = {
  sky: 0xbfccd6,
  waterShallow: [64, 120, 148],
  waterDeep: [16, 38, 74],
  lake: [86, 142, 166],
  river: [62, 118, 160],
  politicalBorder: [32, 30, 36],
  provinceBorder: [40, 40, 40],
  selection: [255, 255, 255],
  /** Por clave de `Biomes` (content). */
  biome: {
    ice: [236, 240, 244],
    alpine: [168, 160, 150],
    tundra: [170, 172, 150],
    taiga: [86, 112, 88],
    desert: [222, 200, 150],
    grassland: [168, 186, 110],
    temperateForest: [96, 140, 82],
    savanna: [196, 186, 112],
    tropicalForest: [58, 120, 66],
  },
  /** Asentamiento por nivel y batalla. */
  settlement: [
    [250, 244, 230],
    [250, 232, 190],
    [250, 214, 140],
    [246, 190, 90],
    [240, 160, 50],
  ],
  battle: [200, 40, 40],
} as const;

/** Luz (adimensional, sobre el albedo lineal). Dirección desde el terreno hacia el sol. */
export const LIGHT = {
  sun: [-0.5, 0.75, -0.35],
  ambient: 0.4,
  sunIntensity: 0.8,
} as const;

/** Medición: cuadros de calentamiento antes de poder medir y duración del recorrido (s). */
export const MEASURE = {
  warmupFrames: 90,
  tourSeconds: 60,
  /** Ventana después del primer cuadro en la que se registran tirones (s): congelamientos de la carga. */
  settleSeconds: 5,
} as const;
