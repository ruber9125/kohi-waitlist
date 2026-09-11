import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Raiz del proyecto (un nivel por encima de src/). */
export const ROOT_DIR = resolve(__dirname, '..');

export const PORT = Number(process.env.PORT ?? 3000);

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const SECRETO_DE_DESARROLLO = 'dev-secret-cambiar-en-produccion';

// Este valor por defecto esta escrito en un repositorio publico: quien lo lea
// puede firmar un JWT valido y entrar como cualquiera. Es aceptable en local,
// nunca en un servidor accesible desde internet, asi que en produccion el
// arranque falla en vez de continuar con una sesion falsificable.
if (IS_PRODUCTION && !process.env.JWT_SECRET) {
  throw new Error(
    'Falta JWT_SECRET. En produccion es obligatorio: define la variable de ' +
      'entorno con un valor largo y aleatorio antes de arrancar.'
  );
}

export const JWT_SECRET = process.env.JWT_SECRET ?? SECRETO_DE_DESARROLLO;
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '2h';

/**
 * Ruta de la base SQLite. Se puede sobrescribir con KOHI_DB_PATH para que los
 * tests E2E corran contra su propia base sin tocar la de desarrollo.
 */
export const DB_PATH = process.env.KOHI_DB_PATH
  ? resolve(ROOT_DIR, process.env.KOHI_DB_PATH)
  : resolve(ROOT_DIR, 'kohi.db');

export const PUBLIC_DIR = resolve(ROOT_DIR, 'public');

/** Coste de bcrypt. 12 es un equilibrio razonable entre seguridad y latencia. */
export const BCRYPT_ROUNDS = 12;

export const MIN_PASSWORD_LENGTH = 8;
