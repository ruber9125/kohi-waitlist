import { expect, test } from '@playwright/test';

import { nuevoUsuario } from '../fixtures/usuario.js';
import { contarPorEmail, filaPorEmail } from '../helpers/db.js';
import { numeroDePosicion, registrar } from '../helpers/flujo.js';

test.describe('Registro en la lista de espera', () => {
  test('un alta correcta muestra la posicion asignada', async ({ page }) => {
    const usuario = nuevoUsuario('alta');
    await registrar(page, usuario);

    const texto = await page.getByTestId('position').textContent();
    expect(texto).toMatch(/Tu posición: #\d+/);

    // La posición que se enseña tiene que ser la que quedó en la base.
    const fila = filaPorEmail(usuario.email);
    expect(fila).toBeTruthy();
    expect(numeroDePosicion(texto)).toBe(fila.position);
  });

  test('un email duplicado da error y no crea una segunda fila', async ({ page }) => {
    const usuario = nuevoUsuario('duplicado');
    await registrar(page, usuario);

    // Segundo intento con el mismo correo.
    await page.goto('/register.html');
    await page.locator('#name').fill('Otra persona');
    await page.locator('#email').fill(usuario.email);
    await page.locator('#password').fill(usuario.password);
    await page.locator('#confirm').fill(usuario.password);
    await page.locator('#submit').click();

    await expect(page.getByTestId('msg')).toBeVisible();
    await expect(page.getByTestId('msg')).toContainText('ya esta en la lista');
    await expect(page.getByTestId('success')).toBeHidden();

    expect(contarPorEmail(usuario.email)).toBe(1);
  });

  test('rechaza una contrasena de menos de 8 caracteres', async ({ page }) => {
    const usuario = nuevoUsuario('corta');

    await page.goto('/register.html');
    await page.locator('#name').fill(usuario.name);
    await page.locator('#email').fill(usuario.email);
    await page.locator('#password').fill('corta12');
    await page.locator('#confirm').fill('corta12');
    await page.locator('#submit').click();

    await expect(page.getByTestId('msg')).toContainText('al menos 8 caracteres');
    expect(contarPorEmail(usuario.email)).toBe(0);
  });

  test('rechaza un email con formato invalido', async ({ page }) => {
    await page.goto('/register.html');
    await page.locator('#name').fill('Sin arroba');
    await page.locator('#email').fill('esto-no-es-un-email');
    await page.locator('#password').fill('cafedeorigen2026');
    await page.locator('#confirm').fill('cafedeorigen2026');
    await page.locator('#submit').click();

    await expect(page.getByTestId('msg')).toBeVisible();
    await expect(page.getByTestId('msg')).toContainText('formato');
    expect(contarPorEmail('esto-no-es-un-email')).toBe(0);
  });

  test('rechaza dos contrasenas que no coinciden', async ({ page }) => {
    const usuario = nuevoUsuario('distintas');

    await page.goto('/register.html');
    await page.locator('#name').fill(usuario.name);
    await page.locator('#email').fill(usuario.email);
    await page.locator('#password').fill('cafedeorigen2026');
    await page.locator('#confirm').fill('cafedeotroorigen');
    await page.locator('#submit').click();

    await expect(page.getByTestId('msg')).toContainText('no coinciden');
    expect(contarPorEmail(usuario.email)).toBe(0);
  });
});
