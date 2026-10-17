import { defineConfig } from 'vite';

// Se sirve y se despliega bajo /tools/determinism/ (scripts/assemble-site.mjs): es la página de
// la verificación manual en Safari.
export default defineConfig({
  base: '/tools/determinism/',
  build: { target: 'es2023', sourcemap: true },
  worker: { format: 'es' },
});
