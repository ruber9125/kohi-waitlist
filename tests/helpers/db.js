import { resolve } from 'node:path';

import Database from 'better-sqlite3';

// Acceso directo a la base de tests. Sirve para comprobar lo que el navegador
// no puede ver: que la contraseña se guardó hasheada, que no se duplicaron
// filas, o para inyectar gente en la cola sin pasar por la interfaz.
const DB_PATH = resolve(process.cwd(), 'kohi-test.db');

let conexion;

function db() {
  if (!conexion) {
    conexion = new Database(DB_PATH);
  }
  return conexion;
}

export function filaPorEmail(email) {
  return db()
    .prepare('SELECT * FROM waitlist WHERE email = ?')
    .get(email.trim().toLowerCase());
}

export function contarPorEmail(email) {
  return db()
    .prepare('SELECT COUNT(*) AS n FROM waitlist WHERE email = ?')
    .get(email.trim().toLowerCase()).n;
}

export function totalEnLista() {
  return db().prepare('SELECT COUNT(*) AS n FROM waitlist').get().n;
}

/**
 * Inserta una fila saltándose la API, como si otra persona se hubiera apuntado
 * por otro canal. El hash es un marcador: esta fila no puede iniciar sesión.
 */
export function insertarDirecto(nombre) {
  const email = `directo-${Date.now().toString(36)}@kohi.test`;
  const siguiente = db()
    .prepare('SELECT COALESCE(MAX(position), 0) + 1 AS next FROM waitlist')
    .get().next;

  db()
    .prepare(
      `INSERT INTO waitlist (name, email, password_hash, position)
       VALUES (?, ?, ?, ?)`
    )
    .run(nombre, email, 'insertado-directamente-sin-hash', siguiente);

  return { email, position: siguiente };
}
