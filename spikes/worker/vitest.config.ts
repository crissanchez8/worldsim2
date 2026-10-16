import { defineConfig } from 'vitest/config';

// Los tests simulan cientos de años (con el guard de contratos): margen para CI y máquinas
// cargadas por la corrida en paralelo de Turborepo.
export default defineConfig({ test: { include: ['src/**/*.test.ts'], testTimeout: 60_000 } });
