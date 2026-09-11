import express from 'express';
import helmet from 'helmet';

import { PUBLIC_DIR, TRUST_PROXY } from './config.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import authRoutes from './routes/auth.routes.js';

export function createApp() {
  const app = express();

  // Necesario para que los limitadores vean la IP real del visitante y no la
  // del proxy de Render. Ver el comentario de TRUST_PROXY en config.js.
  app.set('trust proxy', TRUST_PROXY);

  // Deja de anunciar que esto es Express. No detiene a nadie por si solo, pero
  // no hay razon para regalar la version del stack a quien busca objetivos.
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // Los scripts son modulos servidos desde el propio dominio: no hace
          // falta permitir nada mas, y en particular no 'unsafe-inline'.
          scriptSrc: ["'self'"],
          // Las tipografias vienen de Google Fonts: la hoja de estilos de
          // googleapis y los archivos de fuente de gstatic.
          styleSrc: ["'self'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          // Nadie deberia poder embeber Kohi en un iframe: es la defensa
          // contra el clickjacking.
          frameAncestors: ["'none'"],
        },
      },
    })
  );

  // 10 kB es holgado para el mayor cuerpo que acepta la API (nombre, email y
  // contrasena) y evita que alguien nos haga procesar megabytes de JSON.
  app.use(express.json({ limit: '10kb' }));

  // Estaticos de la web publica (landing, registro, login, panel).
  app.use(express.static(PUBLIC_DIR));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api', authRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
