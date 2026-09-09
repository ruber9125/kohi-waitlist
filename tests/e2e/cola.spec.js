import { expect, test } from '@playwright/test';

import { nuevoUsuario } from '../fixtures/usuario.js';
import { insertarDirecto } from '../helpers/db.js';
import { entrar, numeroDePosicion, registrar } from '../helpers/flujo.js';

test.describe('Posiciones en la cola', () => {
  test('dos altas seguidas reciben posiciones consecutivas', async ({ page }) => {
    const primera = nuevoUsuario('cola-a');
    await registrar(page, primera);
    const posicionPrimera = numeroDePosicion(
      await page.getByTestId('position').textContent()
    );

    const segunda = nuevoUsuario('cola-b');
    await registrar(page, segunda);
    const posicionSegunda = numeroDePosicion(
      await page.getByTestId('position').textContent()
    );

    // Relativo, no absoluto: otros tests han metido gente en la lista antes.
    expect(posicionSegunda).toBe(posicionPrimera + 1);
  });

  test('la posicion no cambia al recargar el panel', async ({ page }) => {
    const usuario = nuevoUsuario('estable');
    await registrar(page, usuario);
    await entrar(page, usuario);

    const antes = await page.getByTestId('queue').textContent();
    await page.reload();
    await expect(page.getByTestId('dashboard')).toBeVisible();
    const despues = await page.getByTestId('queue').textContent();

    expect(despues).toBe(antes);
  });

  test('una fila insertada directamente en SQLite aumenta el total', async ({ page }) => {
    const usuario = nuevoUsuario('total');
    await registrar(page, usuario);
    await entrar(page, usuario);

    const antes = await page.getByTestId('queue').textContent();
    const totalAntes = Number(antes.match(/de (\d+)/)[1]);

    // Alguien se apunta por otro canal, sin pasar por la web.
    insertarDirecto('Persona de la puerta de al lado');

    await page.reload();
    await expect(page.getByTestId('dashboard')).toBeVisible();
    const despues = await page.getByTestId('queue').textContent();
    const totalDespues = Number(despues.match(/de (\d+)/)[1]);

    expect(totalDespues).toBe(totalAntes + 1);
    // Su posición no se mueve: la gente nueva entra por detrás.
    expect(numeroDePosicion(despues)).toBe(numeroDePosicion(antes));
  });

  test('cada persona recibe un codigo de invitacion distinto', async ({ page }) => {
    const primera = nuevoUsuario('invita-a');
    await registrar(page, primera);
    await entrar(page, primera);
    const codigoPrimera = await page.getByTestId('qr-code').textContent();

    const segunda = nuevoUsuario('invita-b');
    await registrar(page, segunda);
    await entrar(page, segunda);
    const codigoSegunda = await page.getByTestId('qr-code').textContent();

    expect(codigoPrimera).not.toBe(codigoSegunda);
  });
});
