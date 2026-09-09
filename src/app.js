import express from 'express';

import { PUBLIC_DIR } from './config.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import authRoutes from './routes/auth.routes.js';

export function createApp() {
  const app = express();

  app.use(express.json());

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
