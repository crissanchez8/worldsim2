// Parámetros del spike A (P0.13), con unidad. Unidad de mundo = 1 celda del heightmap.

/** Ancho del heightmap, en celdas (eje E-O, con wrap). */
export const MAP_WIDTH = 2048;
/** Alto del heightmap, en celdas (eje N-S, sin wrap). */
export const MAP_HEIGHT = 1024;

/** Circunferencia ecuatorial de referencia (Tierra), en m: fija el tamaño de una celda. */
export const EQUATOR_M = 40_075_000;
/** Lado de una celda en el ecuador, en m (≈ 19,6 km). */
export const METERS_PER_CELL = EQUATOR_M / MAP_WIDTH;
/** Exageración vertical del relieve (adimensional): sin ella, el relieve no se ve a escala atlas. */
export const VERTICAL_EXAGGERATION = 30;
/**
 * Exageración extra SOLO del sombreado (hillshade), sobre la vertical (adimensional): con celdas de
 * ~20 km las pendientes reales son mínimas y el relieve no se lee.
 */
export const SHADING_EXAGGERATION = 3;
/** Metros de elevación → unidades de mundo (celdas), con exageración. */
export const METERS_TO_UNITS = VERTICAL_EXAGGERATION / METERS_PER_CELL;

/** Lado de un chunk, en celdas. 2048×1024 / 128 = 16×8 = 128 chunks. */
export const CHUNK_SIZE = 128;
/** Pasos de muestreo por nivel de LOD, en celdas (LOD 0 = resolución completa). */
export const LOD_STEPS = [1, 2, 4, 8, 16] as const;
/**
 * Distancia cámara-chunk (unidades) a partir de la cual se baja al siguiente LOD. Se duplica por
 * nivel: LOD n desde `LOD_BASE_DISTANCE · 2^(n−1)`. Se puede cambiar con `?lodDist=`.
 */
export const LOD_BASE_DISTANCE = 160;
/** Profundidad de los faldones que tapan las grietas entre LODs, en unidades (≥ relieve máximo exagerado). */
export const SKIRT_DEPTH = 10;

/** Elevación máxima de tierra, en m (escala del ruido). */
export const MAX_LAND_M = 6_500;
/** Profundidad máxima del océano, en m. */
export const MAX_DEPTH_M = 6_000;

/** Lado de cada textura procedural del splat, en texels (potencia de 2 para mipmaps). */
export const SPLAT_TEXTURE_SIZE = 512;
/** Una repetición de textura cada tantas celdas; divide a MAP_WIDTH para que el wrap no tenga costura. */
export const SPLAT_TILE_CELLS = 4;
/** Segunda escala del splat, en celdas (también divide a MAP_WIDTH): rompe la repetición. */
export const SPLAT_MACRO_CELLS = 32;

/** Duración del recorrido scripteado de medición, en s. */
export const TOUR_DURATION_S = 60;
/** Campo de visión vertical de la cámara, en grados. */
export const CAMERA_FOV_DEG = 45;
/** Distancia mínima y máxima cámara-objetivo, en unidades. */
export const CAMERA_MIN_DISTANCE = 25;
export const CAMERA_MAX_DISTANCE = 600;
/**
 * Plano lejano, en unidades. Tiene que ser < MAP_WIDTH / 2: con una sola copia de cada chunk,
 * lo que está a más de medio mundo de la cámara no existe.
 */
export const CAMERA_FAR = 1_000;
