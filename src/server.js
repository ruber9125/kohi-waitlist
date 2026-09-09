import { createApp } from './app.js';
import { DB_PATH, PORT } from './config.js';

// El esquema se aplica solo, al importarse db/connection.js. Ver el comentario
// de ese archivo: tiene que ocurrir antes de que los servicios preparen sus
// sentencias, y eso pasa en tiempo de import.
const app = createApp();

app.listen(PORT, () => {
  console.log(`[kohi] servidor escuchando en http://localhost:${PORT}`);
  console.log(`[kohi] base de datos: ${DB_PATH}`);
});
