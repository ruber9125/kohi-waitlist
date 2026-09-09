import { expect, test } from '@playwright/test';

import { nuevoUsuario } from '../fixtures/usuario.js';
import { entrar, registrar } from '../helpers/flujo.js';

test.describe('Acceso', () => {
  test('con credenciales correctas lleva al panel', async ({ page }) => {
    const usuario = nuevoUsuario('acceso');
    await registrar(page, usuario);
    await entrar(page, usuario);

    await expect(page.getByTestId('greeting')).toContainText(usuario.name);
  });

  test('con la contrasena equivocada muestra un error', async ({ page }) => {
    const usuario = nuevoUsuario('malpass');
    await registrar(page, usuario);

    await page.goto('/login.html');
    await page.locator('#email').fill(usuario.email);
    await page.locator('#password').fill('contrasena-que-no-es');
    await page.locator('#submit').click();

    await expect(page.getByTestId('msg')).toBeVisible();
    await expect(page).toHaveURL(/\/login\.html$/);
  });

  test('un email inexistente da exactamente el mismo mensaje', async ({ page }) => {
    const usuario = nuevoUsuario('enumeracion');
    await registrar(page, usuario);

    // Caso 1: el correo existe, falla la contraseña.
    await page.goto('/login.html');
    await page.locator('#email').fill(usuario.email);
    await page.locator('#password').fill('contrasena-que-no-es');
    await page.locator('#submit').click();
    await expect(page.getByTestId('msg')).toBeVisible();
    const conCorreoReal = await page.getByTestId('msg').textContent();

    // Caso 2: el correo no existe.
    await page.goto('/login.html');
    await page.locator('#email').fill('nadie-por-aqui@kohi.test');
    await page.locator('#password').fill('contrasena-que-no-es');
    await page.locator('#submit').click();
    await expect(page.getByTestId('msg')).toBeVisible();
    const conCorreoInventado = await page.getByTestId('msg').textContent();

    // Si difirieran, cualquiera podría averiguar qué correos están registrados.
    expect(conCorreoInventado).toBe(conCorreoReal);
  });
});
