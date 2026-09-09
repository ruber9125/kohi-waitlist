-- Esquema de Kohi. Una sola tabla: cada fila es una persona en la lista de
-- espera, con sus credenciales y su posicion en la cola.
CREATE TABLE IF NOT EXISTS waitlist (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT     NOT NULL,
  email         TEXT     UNIQUE NOT NULL,
  password_hash TEXT     NOT NULL,
  position      INTEGER,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- La posicion se consulta y se ordena constantemente en el panel.
CREATE INDEX IF NOT EXISTS idx_waitlist_position ON waitlist(position);
