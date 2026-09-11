import { resolve } from 'node:path';

import { PUBLIC_DIR } from '../config.js';

/** Error con codigo HTTP asociado, para lanzarlo desde cualquier capa. */
export class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (message, code = 'BAD_REQUEST') =>
  new HttpError(400, message, code);
export const unauthorized = (message = 'Credenciales incorrectas', code = 'UNAUTHORIZED') =>
  new HttpError(401, message, code);
export const conflict = (message, code = 'CONFLICT') =>
  new HttpError(409, message, code);

export function notFoundHandler(req, res) {
  // Quien llama a la API espera JSON, tambien cuando se equivoca de ruta.
  if (req.path.startsWith('/api')) {
    return res
      .status(404)
      .json({ error: 'Recurso no encontrado', code: 'NOT_FOUND' });
  }

  // Una persona que se equivoca tecleando la direccion merece una pagina, no
  // un objeto JSON en bruto.
  return res.status(404).sendFile(resolve(PUBLIC_DIR, '404.html'));
}

// eslint-disable-next-line no-unused-vars -- Express identifica el handler de
// errores por su aridad de 4 argumentos.
export function errorHandler(err, req, res, next) {
  // La restriccion UNIQUE de email salta como error de bajo nivel de SQLite;
  // la traducimos aqui para no dispersar el 409 por los servicios.
  if (err?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res
      .status(409)
      .json({ error: 'Ese email ya esta en la lista de espera', code: 'EMAIL_TAKEN' });
  }

  // Errores de express.json(). Sin esto salian como 500, que culpa al servidor
  // de lo que en realidad es un fallo de quien llama.
  if (err?.type === 'entity.parse.failed') {
    return res
      .status(400)
      .json({ error: 'El cuerpo de la peticion no es JSON valido', code: 'INVALID_JSON' });
  }

  if (err?.type === 'entity.too.large') {
    return res
      .status(413)
      .json({ error: 'El cuerpo de la peticion es demasiado grande', code: 'PAYLOAD_TOO_LARGE' });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }

  console.error('[kohi] error no controlado:', err);
  return res
    .status(500)
    .json({ error: 'Error interno del servidor', code: 'INTERNAL_ERROR' });
}
