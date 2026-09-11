import { expect, test } from '@playwright/test';

test.describe('Cabeceras de seguridad', () => {
  test('no anuncia el stack que hay detras', async ({ request }) => {
    const respuesta = await request.get('/');

    expect(respuesta.headers()['x-powered-by']).toBeUndefined();
  });

  test('envia las cabeceras de proteccion del navegador', async ({ request }) => {
    const cabeceras = (await request.get('/')).headers();

    // Impide que el navegador adivine el tipo de un archivo e interprete como
    // script algo que se sirvió como otra cosa.
    expect(cabeceras['x-content-type-options']).toBe('nosniff');

    // Evita filtrar la URL completa al navegar a sitios de terceros.
    expect(cabeceras['referrer-policy']).toBeTruthy();

    // Fuerza HTTPS en visitas posteriores.
    expect(cabeceras['strict-transport-security']).toBeTruthy();

    const csp = cabeceras['content-security-policy'];
    expect(csp).toBeTruthy();
    // Nadie debe poder embeber Kōhi en un iframe: defensa contra clickjacking.
    expect(csp).toContain("frame-ancestors 'none'");
    // Sin 'unsafe-inline' en los scripts, que es lo que convierte un XSS en
    // ejecución de código.
    expect(csp).toContain("script-src 'self'");
  });

  test('la politica no bloquea lo que la propia web necesita', async ({ page }) => {
    // Una CSP mal ajustada no rompe los tests funcionales: la página sigue
    // cargando, solo que sin tipografías. El síntoma aparece en la consola, así
    // que es ahí donde hay que mirar. Sin este test, apretar la CSP de más
    // pasaría inadvertido.
    const errores = [];
    page.on('console', (mensaje) => {
      if (mensaje.type() === 'error') errores.push(mensaje.text());
    });
    page.on('pageerror', (error) => errores.push(error.message));

    await page.goto('/');
    await expect(page.getByTestId('brand')).toBeVisible();

    expect(errores).toEqual([]);
  });
});

test.describe('Rutas inexistentes', () => {
  test('una direccion equivocada devuelve una pagina, no JSON', async ({ page }) => {
    const respuesta = await page.goto('/esta-pagina-no-existe');

    expect(respuesta.status()).toBe(404);
    expect(respuesta.headers()['content-type']).toContain('text/html');
    await expect(page.getByTestId('not-found')).toBeVisible();
    // Y desde ahí se puede volver, en vez de quedarse en un callejón sin salida.
    await expect(page.getByRole('link', { name: 'Volver al principio' })).toBeVisible();
  });

  test('una ruta de API equivocada sigue devolviendo JSON', async ({ request }) => {
    const respuesta = await request.get('/api/no-existe');

    expect(respuesta.status()).toBe(404);
    expect(respuesta.headers()['content-type']).toContain('application/json');
    expect((await respuesta.json()).code).toBe('NOT_FOUND');
  });
});
