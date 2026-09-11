import { expect, test } from '@playwright/test';

import { nuevoUsuario } from '../fixtures/usuario.js';
import { contarPorEmail } from '../helpers/db.js';

test.describe('Limites de los campos', () => {
  test('rechaza un nombre desmesurado', async ({ request }) => {
    const usuario = { ...nuevoUsuario('nombre'), name: 'A'.repeat(81) };

    const respuesta = await request.post('/api/register', { data: usuario });

    expect(respuesta.status()).toBe(400);
    expect((await respuesta.json()).code).toBe('NAME_TOO_LONG');
    expect(contarPorEmail(usuario.email)).toBe(0);
  });

  test('rechaza un email mas largo que el maximo del estandar', async ({ request }) => {
    const email = `${'a'.repeat(250)}@kohi.test`;

    const respuesta = await request.post('/api/register', {
      data: { ...nuevoUsuario('email'), email },
    });

    expect(respuesta.status()).toBe(400);
    expect((await respuesta.json()).code).toBe('EMAIL_TOO_LONG');
  });

  test('rechaza una contrasena de mas de 72 bytes en vez de truncarla', async ({
    request,
  }) => {
    // bcrypt solo mira los primeros 72 bytes y descarta el resto sin avisar.
    // Antes de este límite, dos frases distintas que coincidieran en esos 72
    // bytes abrían la misma cuenta, y quien usara una frase larga creía estar
    // más protegido de lo que estaba.
    const usuario = { ...nuevoUsuario('larga'), password: 'A'.repeat(73) };

    const respuesta = await request.post('/api/register', { data: usuario });

    expect(respuesta.status()).toBe(400);
    expect((await respuesta.json()).code).toBe('PASSWORD_TOO_LONG');
    expect(contarPorEmail(usuario.email)).toBe(0);
  });

  test('el limite de la contrasena cuenta bytes, no caracteres', async ({ request }) => {
    // 40 caracteres, pero 80 bytes en UTF-8: cada "ñ" ocupa dos. Contando
    // caracteres esta contraseña pasaría, y bcrypt la truncaría igualmente.
    const password = 'ñ'.repeat(40);
    expect(password.length).toBe(40);
    expect(Buffer.byteLength(password, 'utf8')).toBe(80);

    const respuesta = await request.post('/api/register', {
      data: { ...nuevoUsuario('bytes'), password },
    });

    expect(respuesta.status()).toBe(400);
    expect((await respuesta.json()).code).toBe('PASSWORD_TOO_LONG');
  });

  test('acepta una contrasena que llega justo al limite', async ({ request }) => {
    const usuario = { ...nuevoUsuario('justa'), password: 'A'.repeat(72) };

    const respuesta = await request.post('/api/register', { data: usuario });

    expect(respuesta.status()).toBe(201);
    expect(contarPorEmail(usuario.email)).toBe(1);
  });
});

test.describe('Cuerpo de la peticion', () => {
  test('un JSON mal formado devuelve 400, no 500', async ({ request }) => {
    const respuesta = await request.post('/api/register', {
      headers: { 'Content-Type': 'application/json' },
      data: '{"name": "roto", "email":',
    });

    expect(respuesta.status()).toBe(400);
    expect((await respuesta.json()).code).toBe('INVALID_JSON');
  });

  test('un cuerpo desmesurado se rechaza con 413', async ({ request }) => {
    const respuesta = await request.post('/api/register', {
      data: { ...nuevoUsuario('enorme'), relleno: 'A'.repeat(20 * 1024) },
    });

    expect(respuesta.status()).toBe(413);
    expect((await respuesta.json()).code).toBe('PAYLOAD_TOO_LARGE');
  });
});
