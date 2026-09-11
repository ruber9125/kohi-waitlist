import { defineConfig, devices } from '@playwright/test';

// Los tests levantan sus propios servidores, en puertos distintos al de
// desarrollo y contra sus propias bases, para no pisar lo que estés mirando.
const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

// Segundo servidor, con el limitador de peticiones apretado a propósito.
// Ver tests/e2e/rate-limit.spec.js.
export const RATE_LIMIT_PORT = 3101;
export const RATE_LIMIT_URL = `http://localhost:${RATE_LIMIT_PORT}`;
export const RATE_LIMIT_LOGIN_MAX = 3;

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

  webServer: [
    {
      command: 'node src/server.js',
      url: `${BASE_URL}/api/health`,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        PORT: String(PORT),
        KOHI_DB_PATH: './kohi-test.db',
        JWT_SECRET: 'test-secret-kohi',

        // Límites muy por encima de lo que consume la suite. La suite hace unas
        // treinta llamadas de alta y acceso desde la misma IP en poco más de un
        // minuto: con los valores de producción se cortaría a sí misma y los
        // fallos parecerían bugs de la aplicación. Que el limitador funciona se
        // comprueba aparte, contra el servidor del puerto 3101.
        RATE_LIMIT_LOGIN_MAX: '10000',
        RATE_LIMIT_REGISTER_MAX: '10000',
      },
    },
    {
      command: 'node src/server.js',
      url: `${RATE_LIMIT_URL}/api/health`,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        PORT: String(RATE_LIMIT_PORT),
        KOHI_DB_PATH: './kohi-ratelimit-test.db',
        JWT_SECRET: 'test-secret-kohi',

        // Aquí sí manda el limitador: tres intentos de acceso por minuto.
        RATE_LIMIT_LOGIN_MAX: String(RATE_LIMIT_LOGIN_MAX),
        RATE_LIMIT_LOGIN_WINDOW_MS: '60000',
        RATE_LIMIT_REGISTER_MAX: '2',
        RATE_LIMIT_REGISTER_WINDOW_MS: '60000',
      },
    },
  ],
});
