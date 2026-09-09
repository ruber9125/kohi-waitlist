// Capa fina sobre fetch() compartida por todas las páginas.

const TOKEN_KEY = "kohi_token";

// localStorage lanza en modo privado de algunos navegadores, así que nunca
// dejamos que una excepción de almacenamiento tumbe la página.
export function saveToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* sin persistencia: la sesión durará lo que dure la pestaña */
  }
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* nada que limpiar */
  }
}

/**
 * Llama a la API y normaliza los errores: siempre lanza un Error con .status
 * y .code, y con el mensaje que haya mandado el servidor.
 */
export async function api(path, { method = "GET", body, auth = false } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (auth) {
    const token = getToken();
    if (!token) {
      const err = new Error("No hay sesión iniciada");
      err.status = 401;
      err.code = "NO_TOKEN";
      throw err;
    }
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    const err = new Error("No se pudo contactar con el servidor");
    err.status = 0;
    err.code = "NETWORK";
    throw err;
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(payload.error ?? "Algo ha ido mal");
    err.status = response.status;
    err.code = payload.code;
    throw err;
  }

  return payload;
}
