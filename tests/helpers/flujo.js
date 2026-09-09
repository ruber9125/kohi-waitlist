import { expect } from '@playwright/test';

/** Rellena el formulario de alta y espera al bloque de éxito. */
export async function registrar(page, usuario) {
  await page.goto('/register.html');
  await page.locator('#name').fill(usuario.name);
  await page.locator('#email').fill(usuario.email);
  await page.locator('#password').fill(usuario.password);
  await page.locator('#confirm').fill(usuario.password);
  await page.locator('#submit').click();

  const exito = page.getByTestId('success');
  await expect(exito).toBeVisible();
  return exito;
}

/** Inicia sesión y espera a estar en el panel. */
export async function entrar(page, usuario) {
  await page.goto('/login.html');
  await page.locator('#email').fill(usuario.email);
  await page.locator('#password').fill(usuario.password);
  await page.locator('#submit').click();

  await expect(page).toHaveURL(/\/dashboard\.html$/);
  await expect(page.getByTestId('dashboard')).toBeVisible();
}

/** Extrae el número de un texto tipo "Tu posición: #7" o "Eres el #7 de 9". */
export function numeroDePosicion(texto) {
  const encontrado = texto.match(/#(\d+)/);
  if (!encontrado) {
    throw new Error(`No hay ninguna posición en el texto: ${texto}`);
  }
  return Number(encontrado[1]);
}
