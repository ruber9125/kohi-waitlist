import { Router } from 'express';
import jwt from 'jsonwebtoken';

import { JWT_EXPIRES_IN, JWT_SECRET, MIN_PASSWORD_LENGTH } from '../config.js';
import { badRequest, conflict, unauthorized } from '../middleware/errors.js';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  countEntries,
  findByEmail,
  registerUser,
  toPublicUser,
  verifyPassword,
} from '../services/waitlist.service.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

function readCredentials(body, { requireName }) {
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  const missing = [];
  if (requireName && !name) missing.push('name');
  if (!email) missing.push('email');
  if (!password) missing.push('password');

  if (missing.length > 0) {
    throw badRequest(`Faltan campos obligatorios: ${missing.join(', ')}`, 'MISSING_FIELDS');
  }

  return { name, email, password };
}

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = readCredentials(req.body, { requireName: true });

    if (!EMAIL_RE.test(email)) {
      throw badRequest('El email no tiene un formato valido', 'INVALID_EMAIL');
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw badRequest(
        `La contrasena debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
        'WEAK_PASSWORD'
      );
    }

    // Comprobacion explicita para dar un 409 claro. La restriccion UNIQUE de la
    // tabla sigue siendo la garantia real y la cubre errorHandler.
    if (findByEmail(email)) {
      throw conflict('Ese email ya esta en la lista de espera', 'EMAIL_TAKEN');
    }

    const user = await registerUser({ name, email, password });

    res.status(201).json({
      message: 'Bienvenida a la lista de espera de Kohi',
      user: toPublicUser(user),
      position: user.position,
      total: countEntries(),
      token: signToken(user),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = readCredentials(req.body, { requireName: false });

    const user = findByEmail(email);
    // Mismo mensaje si el email no existe o si la contrasena falla: distinguirlos
    // permitiria enumerar que correos estan registrados.
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      throw unauthorized('Credenciales incorrectas', 'INVALID_CREDENTIALS');
    }

    res.json({
      message: 'Sesion iniciada',
      user: toPublicUser(user),
      token: signToken(user),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, (req, res) => {
  const { name, email, position } = req.user;
  res.json({
    id: req.user.id,
    name,
    email,
    position,
    total: countEntries(),
  });
});

export default router;
