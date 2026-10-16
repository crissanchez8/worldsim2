import { defineConfig } from 'vitest/config';

// La primera llamada de ESLint con información de tipos levanta el servicio de TypeScript
// sobre todo el monorepo: en el runner del CI tarda más que el timeout por defecto (5 s).
export default defineConfig({ test: { include: ['src/**/*.test.ts'], testTimeout: 60_000 } });
