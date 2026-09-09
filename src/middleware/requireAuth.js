import jwt from 'jsonwebtoken';

import { JWT_SECRET } from '../config.js';
import { unauthorized } from './errors.js';
import { findById } from '../services/waitlist.service.js';

/**
 * Exige un JWT valido en la cabecera Authorization: Bearer <token>.
 * Deja la fila completa del usuario en req.user.
 */
export function requireAuth(req, res, next) {
  const header = req.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return next(unauthorized('Falta el token de autenticacion', 'NO_TOKEN'));
  }

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    // No distinguimos token caducado de token manipulado: al cliente no le
    // sirve la diferencia y filtrarla ayuda a quien esta probando tokens.
    return next(unauthorized('Token invalido o caducado', 'INVALID_TOKEN'));
  }

  const user = findById(payload.sub);
  if (!user) {
    // El token es valido pero la fila ya no existe.
    return next(unauthorized('Token invalido o caducado', 'INVALID_TOKEN'));
  }

  req.user = user;
  return next();
}
