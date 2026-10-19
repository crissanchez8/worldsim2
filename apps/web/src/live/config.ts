// Parámetros de la vista en vivo (P1.5): Worker de simulación, director y línea de tiempo. El
// ritmo por era y el colchón de simulación adelantada viven en `@ws/history` (PLAYBACK, D48/D49).

export const LIVE = {
  /** Tanda de simulación del Worker antes de ceder para atender mensajes (ms). */
  sliceMs: 16,
  /** Paso mínimo entre objetivos nuevos que se le mandan al Worker (years). */
  targetStepYears: 25,
  /** Salto máximo del reloj por cuadro (s): una pestaña que vuelve no se saltea siglos. */
  maxFrameSeconds: 0.25,
  /** Cada cuánto se le avisa a React el estado de la reproducción (ms). */
  uiUpdateMs: 100,
  /** Cada cuánto manda el Worker los cambios del registro de entidades (ms). */
  registryMs: 250,
} as const;

/** Velocidades de la reproducción (D10): 0 = pausa; "max" = seguir a la cabeza de la simulación. */
export const SPEEDS = [0, 1, 2, 4, 'max'] as const;
export type Speed = (typeof SPEEDS)[number];

export const TIMELINE = {
  /**
   * Significancia mínima de un evento para marcarlo en la línea de tiempo (0–1). Medido en corridas
   * completas: con 0,6 son ~9.000 marcas en el mundo chico (una franja continua); con 0,8, 20–90
   * (primeras invenciones, colapsos, batallas grandes).
   */
  markerSignificance: 0.8,
  /** Alto de la línea de tiempo (px CSS). */
  heightPx: 36,
  /** Alto de la franja de eras (px CSS). */
  bandPx: 14,
  /** Color de cada era en el orden de Eras (neutros: el diseño es P2). */
  eraColors: ['#d9d4c7', '#c8d3b4', '#d9b98c', '#a9b4bf', '#c9a9b8'],
  /** Simulado pero todavía no visto (D49: no se muestra el futuro). */
  aheadColor: '#ececec',
  markerColor: '#7a2e2e',
  playheadColor: '#111111',
} as const;

export const TICKER = {
  /** Significancia mínima de un evento para el teletipo (0–1): ~1–3 por año en P1. */
  minSignificance: 0.3,
  /** Eventos que se muestran (los más recientes hasta la fecha). */
  rows: 30,
} as const;
