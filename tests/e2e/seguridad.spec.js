import { expect, test } from '@playwright/test';

import { nuevoUsuario } from '../fixtures/usuario.js';
import { filaPorEmail } from '../helpers/db.js';

test.describe('Seguridad', () => {
  test('ninguna respuesta de la API expone el hash ni la contrasena', async ({
    request,
  }) => {
    const usuario = nuevoUsuario('fuga');

    const alta = await request.post('/api/register', { data: usuario });
    expect(alta.status()).toBe(201);
    const cuerpoAlta = await alta.text();
    expect(cuerpoAlta).not.toContain('password_hash');
    expect(cuerpoAlta).not.toContain(usuario.password);

    const acceso = await request.post('/api/login', {
      data: { email: usuario.email, password: usuario.password },
    });
    expect(acceso.status()).toBe(200);
    const cuerpoAcceso = await acceso.text();
    expect(cuerpoAcceso).not.toContain('password_hash');
    expect(cuerpoAcceso).not.toContain(usuario.password);
  });

  test('la contrasena se guarda hasheada con bcrypt', async ({ request }) => {
    const usuario = nuevoUsuario('hash');
    await request.post('/api/register', { data: usuario });

    const fila = filaPorEmail(usuario.email);
    // $2a / $2b es el prefijo de bcrypt; 60 caracteres, su longitud fija.
    expect(fila.password_hash).toMatch(/^\$2[aby]\$/);
    expect(fila.password_hash).toHaveLength(60);
    expect(fila.password_hash).not.toBe(usuario.password);
  });

  test('un token manipulado devuelve al login', async ({ page }) => {
    // Hay que estar en el origen para poder escribir en su localStorage.
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('kohi_token', 'esto.no.es-un-jwt-valido');
    });

    await page.goto('/dashboard.html');
    await expect(page).toHaveURL(/\/login\.html$/);
  });

  test('GET /api/me sin token responde 401', async ({ request }) => {
    const respuesta = await request.get('/api/me');

    expect(respuesta.status()).toBe(401);
    const cuerpo = await respuesta.json();
    expect(cuerpo.code).toBe('NO_TOKEN');
  });
});
