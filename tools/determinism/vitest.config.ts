import { defineConfig } from 'vitest/config';

// Los tests de tests/ son de Playwright (pnpm e2e); Vitest solo corre los unitarios de src/.
export default defineConfig({ test: { include: ['src/**/*.test.ts'] } });
