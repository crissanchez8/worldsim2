import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2023',
    sourcemap: true,
    // El chunk del mundo trae three.js (~700 kB minificado) y se carga a pedido (P1.9: "Crear" no
    // lo baja). El aviso por defecto (500 kB) saltaría siempre por three, no por la app.
    chunkSizeWarningLimit: 1000,
  },
  worker: {
    format: 'es',
  },
});
