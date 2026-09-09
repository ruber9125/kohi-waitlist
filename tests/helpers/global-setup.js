import { resolve } from 'node:path';

import Database from 'better-sqlite3';

/**
 * Deja la base de tests vacía antes de cada ejecución, para que la suite parta
 * siempre de cero.
 *
 * No se borra el archivo: Playwright arranca el webServer antes que este
 * globalSetup, así que para cuando llegamos aquí el servidor ya tiene la base
 * abierta y Windows bloquea el fichero (EPERM). Vaciar la tabla consigue lo
 * mismo y funciona con la conexión del servidor viva.
 */
export default function globalSetup() {
  const db = new Database(resolve(process.cwd(), 'kohi-test.db'));

  try {
    const existe = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get('waitlist');

    // Si el servidor todavía no ha aplicado el esquema no hay nada que limpiar.
    if (!existe) return;

    db.exec('DELETE FROM waitlist');

    // Reinicia el contador de AUTOINCREMENT para que los ids arranquen en 1 en
    // cada ejecución. La tabla solo existe si ya hubo alguna inserción.
    const contador = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get('sqlite_sequence');

    if (contador) {
      db.prepare('DELETE FROM sqlite_sequence WHERE name = ?').run('waitlist');
    }
  } finally {
    db.close();
  }
}
