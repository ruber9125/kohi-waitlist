import { defineConfig, devices } from '@playwright/test';

// Los tests levantan su propio servidor en un puerto distinto al de desarrollo
// y contra su propia base, para no pisar la que estás inspeccionando a mano.
const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/helpers/global-setup.js',

  // La suite comparte una sola base SQLite y varios tests afirman cosas sobre
  // el total de la lista. En paralelo esos totales bailarían, así que se corre
  // en serie: es más lento, pero determinista.
  fullyParallel: false,
  workers: 1,

  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    command: 'node src/server.js',
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: false,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      PORT: String(PORT),
      KOHI_DB_PATH: './kohi-test.db',
      JWT_SECRET: 'test-secret-kohi',
    },
  },
});
