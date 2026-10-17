// JSON canónico para el hash de contenido: claves de objeto ordenadas, sin espacios. La
// conversión número → texto de ECMAScript es exacta y la misma en todos los motores (la más
// corta que vuelve al mismo double), así que el texto es idéntico en Node y en los navegadores.

export function canonicalJson(value: unknown): string {
  if (value === null) return 'null';
  switch (typeof value) {
    case 'number':
      if (!Number.isFinite(value)) throw new Error(`contenido: número no finito (${value})`);
      // −0 y 0 se distinguen en el estado; acá también.
      return Object.is(value, -0) ? '-0' : JSON.stringify(value);
    case 'string':
    case 'boolean':
      return JSON.stringify(value);
    case 'object': {
      if (Array.isArray(value)) return `[${value.map((v: unknown) => canonicalJson(v)).join(',')}]`;
      const record = value as Readonly<Record<string, unknown>>;
      // eslint-disable-next-line no-restricted-properties -- las claves se ordenan explícitamente
      const keys = Object.keys(record).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      const parts = keys
        .filter((k) => record[k] !== undefined)
        .map((k) => `${JSON.stringify(k)}:${canonicalJson(record[k])}`);
      return `{${parts.join(',')}}`;
    }
    default:
      throw new Error(`contenido: tipo no serializable (${typeof value})`);
  }
}
