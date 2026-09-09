import { expect, test } from '@playwright/test';

test.describe('Landing', () => {
  test('muestra la marca y el subtitulo de la cafeteria', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Kōhi/);
    await expect(page.getByTestId('brand')).toHaveText('Kōhi');
    await expect(page.getByTestId('tagline')).toHaveText(
      'Café de especialidad. Próxima apertura.'
    );
  });

  test('el boton principal lleva al registro', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('cta-register').click();

    await expect(page).toHaveURL(/\/register\.html$/);
    await expect(page.locator('#register-form')).toBeVisible();
  });

  test('el boton secundario lleva al login', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('cta-login').click();

    await expect(page).toHaveURL(/\/login\.html$/);
    await expect(page.locator('#login-form')).toBeVisible();
  });
});
