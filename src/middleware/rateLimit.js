import rateLimit from 'express-rate-limit';

import { RATE_LIMIT } from '../config.js';

/**
 * Construye un limitador que responde con el mismo formato de error que el
 * resto de la API, en vez del texto plano que trae por defecto la libreria.
 */
function crearLimitador({ windowMs, limit }, mensaje) {
  return rateLimit({
    windowMs,
    limit,

    // Cabeceras RateLimit-* estandar, para que un cliente pueda saber cuanto
    // le queda sin tener que provocar el 429.
    standardHeaders: 'draft-7',
    legacyHeaders: false,

    handler: (req, res) => {
      res.status(429).json({ error: mensaje, code: 'TOO_MANY_REQUESTS' });
    },
  });
}

export const loginLimiter = crearLimitador(
  RATE_LIMIT.login,
  'Demasiados intentos de acceso. Vuelve a probar en unos minutos.'
);

export const registerLimiter = crearLimitador(
  RATE_LIMIT.register,
  'Demasiadas altas desde esta conexion. Vuelve a probar mas tarde.'
);
