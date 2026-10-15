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
  language: {
    label: 'Idioma',
    es: 'Español',
    en: 'English',
  },
} as const;
