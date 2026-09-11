import { resolve } from 'node:path';

import Database from 'better-sqlite3';

// Las dos bases que usan los servidores de test. Ver playwright.config.js.
const BASES = ['kohi-test.db', 'kohi-ratelimit-test.db'];

/**
 * Deja las bases de test vacías antes de cada ejecución, para que la suite
 * parta siempre de cero.
 *
 * No se borran los archivos: Playwright arranca los webServer antes que este
 * globalSetup, así que para cuando llegamos aquí los servidores ya tienen sus
 * bases abiertas y Windows bloquea los ficheros (EPERM). Vaciar la tabla
 * consigue lo mismo y funciona con las conexiones vivas.
 */
export default function globalSetup() {
  for (const archivo of BASES) {
    vaciar(resolve(process.cwd(), archivo));
  }
}

function vaciar(ruta) {
  const db = new Database(ruta);

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
