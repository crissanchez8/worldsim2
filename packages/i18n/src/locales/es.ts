/**
 * Catálogo base (es). Es la fuente de la forma: `en` tiene que tener exactamente las mismas
 * claves (lo verifica el tipo `Catalog` y un test).
 */
export const es = {
  app: {
    name: 'worldSim2',
    tagline: 'Simulador de historia emergente',
  },
  placeholder: {
    title: 'La casa está lista',
    body: 'Fase 0: fundaciones de arquitectura. Todavía no hay mundo que mirar.',
    engineVersion: 'Motor v{{version}}',
  },
  time: {
    yearBC: '{{year}} a.C.',
    yearAD: '{{year}} d.C.',
  },
  language: {
    label: 'Idioma',
    es: 'Español',
    en: 'English',
  },
  /** Plantillas de eventos: `events.<clave del evento>` (las exige un test de @ws/sim). */
  events: {
    territory: {
      changed: '{{province}} pasa de {{from}} a {{to}}',
    },
  },
  /** Nombres de las filas de contenido: `content.<tabla>.<clave>` (los exige un test). */
  content: {
    worldSize: { small: 'Chico', medium: 'Mediano' },
    mapType: { continents: 'Continentes', pangaea: 'Pangea', archipelago: 'Archipiélago' },
    stratum: { common: 'Común' },
    law: { primogeniture: 'Primogenitura' },
  },
} as const;
