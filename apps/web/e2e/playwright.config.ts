import { defineConfig, devices } from '@playwright/test';

// E2E de la web (P1.5) contra el build (`vite preview`, L-009): vivo, guardar y continuar.
// Chromium y Firefox (WebKit local no anda en macOS 26.0: L-012; su determinismo lo cubre la suite).
export default defineConfig({
  testDir: '.',
  testMatch: '**/*.e2e.ts',
  timeout: 5 * 60 * 1000,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4178/' },
  webServer: {
    command: 'pnpm exec vite preview --port 4178 --strictPort',
    cwd: '..',
    url: 'http://localhost:4178/',
    reuseExistingServer: !process.env['CI'],
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
});
