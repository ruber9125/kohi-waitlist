import { expect, test } from '@playwright/test';

import {
  RATE_LIMIT_LOGIN_MAX,
  RATE_LIMIT_URL,
} from '../../playwright.config.js';
import { nuevoUsuario } from '../fixtures/usuario.js';

/**
 * Estos tests van contra el segundo servidor (puerto 3101), levantado con el
 * limitador apretado: 3 accesos y 2 altas por minuto. El resto de la suite usa
 * el servidor del 3100, con los límites subidos para no estrangularse a sí
 * misma. Ver playwright.config.js.
 *
 * Los contadores viven en memoria del proceso y cada ejecución arranca un
 * servidor nuevo, así que no se arrastra presupuesto de una ejecución a otra.
 */
test.describe('Limite de peticiones', () => {
  test('corta el acceso tras superar el limite y explica por que', async ({
    request,
  }) => {
    const credenciales = {
      email: 'fuerza-bruta@kohi.test',
      password: 'contrasena-incorrecta',
    };

    // Los primeros intentos llegan a la lógica de acceso y fallan por
    // credenciales, no por el limitador.
    for (let intento = 1; intento <= RATE_LIMIT_LOGIN_MAX; intento += 1) {
      const respuesta = await request.post(`${RATE_LIMIT_URL}/api/login`, {
        data: credenciales,
      });
      expect(respuesta.status(), `intento ${intento}`).toBe(401);
    }

    // El siguiente ya ni se evalúa: lo para el limitador.
    const cortado = await request.post(`${RATE_LIMIT_URL}/api/login`, {
      data: credenciales,
    });

    expect(cortado.status()).toBe(429);
    const cuerpo = await cortado.json();
    expect(cuerpo.code).toBe('TOO_MANY_REQUESTS');
    expect(cuerpo.error).toContain('Demasiados intentos');

    // Y el cliente recibe cuánto debe esperar, en vez de tener que adivinarlo.
    expect(cortado.headers()['retry-after']).toBeTruthy();
  });

  test('el limite del acceso no bloquea el resto de la aplicacion', async ({
    request,
  }) => {
    // El test anterior agotó el presupuesto de /api/login. Que eso no deje
    // inservible el sitio entero es justamente lo que hay que garantizar.
    const salud = await request.get(`${RATE_LIMIT_URL}/api/health`);
    expect(salud.status()).toBe(200);

    const landing = await request.get(`${RATE_LIMIT_URL}/`);
    expect(landing.status()).toBe(200);
  });

  test('el alta tiene su propio limite, independiente del acceso', async ({
    request,
  }) => {
    // Contador separado: aunque /api/login esté agotado, aquí quedan 2 altas.
    for (let intento = 1; intento <= 2; intento += 1) {
      const respuesta = await request.post(`${RATE_LIMIT_URL}/api/register`, {
        data: nuevoUsuario('limite'),
      });
      expect(respuesta.status(), `alta ${intento}`).toBe(201);
    }

    const cortada = await request.post(`${RATE_LIMIT_URL}/api/register`, {
      data: nuevoUsuario('limite'),
    });

    expect(cortada.status()).toBe(429);
    expect((await cortada.json()).code).toBe('TOO_MANY_REQUESTS');
  });
});
