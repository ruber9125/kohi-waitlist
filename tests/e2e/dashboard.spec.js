import { expect, test } from '@playwright/test';

import { nuevoUsuario } from '../fixtures/usuario.js';
import { filaPorEmail } from '../helpers/db.js';
import { entrar, registrar } from '../helpers/flujo.js';

test.describe('Panel privado', () => {
  test('sin sesion redirige al login', async ({ page }) => {
    await page.goto('/dashboard.html');

    await expect(page).toHaveURL(/\/login\.html$/);
    await expect(page.locator('#login-form')).toBeVisible();
  });

  test('muestra el nombre, la posicion y el total de la lista', async ({ page }) => {
    const usuario = nuevoUsuario('panel');
    await registrar(page, usuario);
    await entrar(page, usuario);

    const fila = filaPorEmail(usuario.email);

    await expect(page.getByTestId('greeting')).toContainText(usuario.name);
    await expect(page.getByTestId('queue')).toContainText(`#${fila.position}`);
    await expect(page.getByTestId('queue-note')).toContainText('por delante de ti');
  });

  test('el codigo QR corresponde al id de la persona', async ({ page }) => {
    const usuario = nuevoUsuario('qr');
    await registrar(page, usuario);
    await entrar(page, usuario);

    const fila = filaPorEmail(usuario.email);

    await expect(page.getByTestId('qr')).toBeVisible();
    await expect(page.getByTestId('qr-code')).toHaveText(`QR-${fila.id}`);
  });

  test('cerrar sesion devuelve al login y bloquea el panel', async ({ page }) => {
    const usuario = nuevoUsuario('salida');
    await registrar(page, usuario);
    await entrar(page, usuario);

    await page.getByTestId('logout').click();
    await expect(page).toHaveURL(/\/login\.html$/);

    // El token ya no está: volver a entrar por la URL no debe funcionar.
    await page.goto('/dashboard.html');
    await expect(page).toHaveURL(/\/login\.html$/);
  });
});
