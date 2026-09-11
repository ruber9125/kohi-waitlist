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

/**
 * Saltos de proxy en los que confiar para deducir la IP del cliente.
 *
 * Render sirve la aplicacion detras de su proxy, asi que sin esto todas las
 * peticiones parecerian venir de la misma IP y el limitador trataria a todo
 * internet como a un unico visitante. Se pone 1 (un solo salto) y no true:
 * confiar en la cadena entera dejaria que cualquiera falsificara su IP con una
 * cabecera X-Forwarded-For y esquivara el limite.
 */
export const TRUST_PROXY = Number(process.env.TRUST_PROXY ?? 1);

/**
 * Limites de peticiones por IP. Configurables por entorno para que los tests
 * puedan levantar un servidor con un limite diminuto y comprobar que corta.
 *
 * El acceso se limita mas fuerte que el alta porque es el objetivo natural de
 * la fuerza bruta, y porque cada intento cuesta ~250 ms de CPU en bcrypt: sin
 * freno, unas pocas peticiones por segundo agotan el threadpool de libuv y
 * tumban la aplicacion entera, no solo el login.
 */
export const RATE_LIMIT = {
  login: {
    windowMs: Number(process.env.RATE_LIMIT_LOGIN_WINDOW_MS ?? 15 * 60 * 1000),
    limit: Number(process.env.RATE_LIMIT_LOGIN_MAX ?? 10),
  },
  register: {
    windowMs: Number(process.env.RATE_LIMIT_REGISTER_WINDOW_MS ?? 60 * 60 * 1000),
    limit: Number(process.env.RATE_LIMIT_REGISTER_MAX ?? 5),
  },
};
