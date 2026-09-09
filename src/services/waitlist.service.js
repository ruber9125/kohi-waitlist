import bcrypt from 'bcrypt';

import { BCRYPT_ROUNDS } from '../config.js';
import db from '../db/connection.js';

/**
 * La columna email es UNIQUE pero sin COLLATE NOCASE, asi que "A@b.com" y
 * "a@b.com" serian dos filas distintas. Normalizamos en la aplicacion para que
 * el correo sea la identidad real de la persona.
 */
export function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

const selectByEmail = db.prepare('SELECT * FROM waitlist WHERE email = ?');
const selectById = db.prepare('SELECT * FROM waitlist WHERE id = ?');
const countAll = db.prepare('SELECT COUNT(*) AS total FROM waitlist');
const nextPosition = db.prepare(
  'SELECT COALESCE(MAX(position), 0) + 1 AS next FROM waitlist'
);
const insertEntry = db.prepare(
  `INSERT INTO waitlist (name, email, password_hash, position)
   VALUES (@name, @email, @password_hash, @position)`
);

export function findByEmail(email) {
  return selectByEmail.get(normalizeEmail(email));
}

export function findById(id) {
  return selectById.get(id);
}

export function countEntries() {
  return countAll.get().total;
}

/**
 * Calcula la posicion e inserta, todo dentro de una transaccion: si dos altas
 * se solapan, la segunda no puede leer el MAX(position) antes de que la primera
 * haya escrito su fila, de modo que no se reparte dos veces la misma posicion.
 */
const insertWithPosition = db.transaction(({ name, email, password_hash }) => {
  const position = nextPosition.get().next;
  const info = insertEntry.run({ name, email, password_hash, position });
  return { id: Number(info.lastInsertRowid), position };
});

export async function registerUser({ name, email, password }) {
  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const { id, position } = insertWithPosition({
    name: String(name).trim(),
    email: normalizeEmail(email),
    password_hash,
  });
  return findById(id);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

/**
 * Proyeccion publica de una fila. Todo lo que sale por la API pasa por aqui,
 * de modo que password_hash no puede escaparse por descuido.
 */
export function toPublicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    position: row.position,
    created_at: row.created_at,
  };
}
