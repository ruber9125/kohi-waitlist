import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import Database from 'better-sqlite3';

import { DB_PATH } from '../config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const db = new Database(DB_PATH);

// WAL permite que un lector (por ejemplo el MCP de SQLite inspeccionando la
// base) no bloquee a los escritores del servidor.
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Aplica schema.sql. Es idempotente (todo es IF NOT EXISTS), asi que se puede
 * llamar en cada arranque y sirve para crear desde cero la base de tests.
 */
export function initDb() {
  const schema = readFileSync(resolve(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
}

// Se ejecuta al importar el modulo, no desde server.js, y el motivo importa:
// los servicios llaman a db.prepare() en el cuerpo de su modulo, que se evalua
// al importarse. Como los imports se resuelven antes que el cuerpo de
// server.js, cualquier initDb() invocado alli llegaria tarde y las sentencias
// fallarian con "no such table" sobre una base recien creada.
initDb();

export default db;
