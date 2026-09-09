import { createApp } from './app.js';
import { DB_PATH, PORT } from './config.js';
import { initDb } from './db/connection.js';

initDb();

const app = createApp();

app.listen(PORT, () => {
  console.log(`[kohi] servidor escuchando en http://localhost:${PORT}`);
  console.log(`[kohi] base de datos: ${DB_PATH}`);
});
