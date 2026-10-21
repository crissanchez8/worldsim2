import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Maquetas de P2.2: se sirven y se despliegan bajo /tools/design/ (scripts/assemble-site.mjs).
export default defineConfig({
  base: '/tools/design/',
  build: {
    target: 'es2023',
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, 'index.html'),
        mock: resolve(import.meta.dirname, 'mock.html'),
      },
    },
  },
});
