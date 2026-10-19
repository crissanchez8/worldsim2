// Clima v1 (P1.1, DEVELOPMENT_PLAN §12.3): temperatura media anual por latitud y altura;
// precipitación por bandas de latitud (ZCIT, subtrópicos secos, latitudes medias húmedas, polos
// secos) modulada por la humedad que traen los vientos dominantes de cada banda, con sombra
// orográfica. P3 agrega continentalidad, corrientes y estacionalidad.
import { math } from '@ws/core';
import { CLIMATE } from './config';
import { type Grid, latitudeOf } from './raster';

/** Temperatura media anual al nivel del mar (celsius) a una latitud (grados). */
export function seaLevelTemperature(latDeg: number): number {
  const t = Math.abs(latDeg) / 90;
  return CLIMATE.equatorC - CLIMATE.poleDropC * math.pow(t, CLIMATE.latitudeExponent);
}

function bump(x: number, center: number, width: number): number {
  const q = (x - center) / width;
  return math.exp(-q * q);
}

/** Precipitación de fondo (mm_per_year) por latitud (grados), antes de la humedad local. */
export function basePrecipitation(latDeg: number): number {
  const a = Math.abs(latDeg);
  const p =
    CLIMATE.basePrecipMm +
    CLIMATE.itczPrecipMm * bump(a, 0, CLIMATE.itczWidthDeg) +
    CLIMATE.midLatPrecipMm * bump(a, CLIMATE.midLatCenterDeg, CLIMATE.midLatWidthDeg) -
    CLIMATE.subtropicDryMm * bump(a, CLIMATE.subtropicCenterDeg, CLIMATE.subtropicWidthDeg);
  const polar = 1 - CLIMATE.polarDryFactor * math.smoothstep(CLIMATE.polarDryFromDeg, 90, a);
  return Math.max(CLIMATE.minPrecipMm, p * polar);
}

/** Sentido hacia el que sopla el viento dominante en una latitud: −1 al oeste, +1 al este. */
export function windDirection(latDeg: number): -1 | 1 {
  const a = Math.abs(latDeg);
  if (a < CLIMATE.tradeWindsToDeg) return -1; // alisios del este
  if (a < CLIMATE.westerliesToDeg) return 1; // vientos del oeste
  return -1; // polares del este
}

export interface Climate {
  /** celsius. */
  readonly temperature: Float32Array;
  /** mm_per_year. */
  readonly precipitation: Float32Array;
}

export function computeClimate(g: Grid, elevation: Float32Array, cellKm: number): Climate {
  const { width, height } = g;
  const n = width * height;
  const temperature = new Float32Array(n);
  const moisture = new Float32Array(n);
  const orographic = new Float32Array(n);
  const decay = math.exp(-cellKm / CLIMATE.moistureDecayKm);

  for (let y = 0; y < height; y++) {
    const lat = latitudeOf(height, y);
    const t0 = seaLevelTemperature(lat);
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const h = elevation[row + x] ?? 0;
      temperature[row + x] = t0 - (CLIMATE.lapseRateCPerKm * Math.max(0, h)) / 1000;
    }

    // Advección de humedad a lo largo de la fila, en el sentido del viento, dos vueltas (la
    // primera solo "carga" la humedad; la segunda registra).
    const dir = windDirection(lat);
    let start = 0;
    while (start < width && (elevation[row + start] ?? 0) >= 0) start++;
    let m = start < width ? 1 : CLIMATE.moistureFloor; // fila sin océano: humedad mínima
    if (start === width) start = 0;
    let prevH = 0;
    for (let s = 0; s < 2 * width; s++) {
      const x = (((start + dir * s) % width) + width) % width;
      const i = row + x;
      const h = elevation[i] ?? 0;
      if (h < 0) {
        m = 1;
        prevH = 0;
        if (s >= width) moisture[i] = 1;
        continue;
      }
      const rise = h - prevH;
      const oro = rise > 0 ? 1 - math.exp(-rise / CLIMATE.orographicScaleM) : 0;
      m = m * decay * (1 - oro);
      prevH = h;
      if (s >= width) {
        moisture[i] = m;
        orographic[i] = oro * CLIMATE.orographicBoost;
      }
    }
  }

  // Suavizado N-S de la humedad (las filas se calcularon por separado).
  const blurred = new Float32Array(n);
  const r = CLIMATE.moistureBlurRows;
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - r);
    const y1 = Math.min(height - 1, y + r);
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let yy = y0; yy <= y1; yy++) sum += moisture[yy * width + x] ?? 0;
      blurred[y * width + x] = sum / (y1 - y0 + 1);
    }
  }

  const precipitation = new Float32Array(n);
  for (let y = 0; y < height; y++) {
    const base = basePrecipitation(latitudeOf(height, y));
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if ((elevation[i] ?? 0) < 0) {
        precipitation[i] = base;
        continue;
      }
      const wet = CLIMATE.moistureFloor + (1 - CLIMATE.moistureFloor) * (blurred[i] ?? 0);
      precipitation[i] = Math.max(CLIMATE.minPrecipMm, base * wet * (1 + (orographic[i] ?? 0)));
    }
  }
  return { temperature, precipitation };
}
