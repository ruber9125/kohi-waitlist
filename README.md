# Kōhi

Web de una cafetería de especialidad que está a punto de abrir. Quien se registra
entra en la lista de espera de la inauguración y accede a un panel privado donde
ve su posición en la cola y un código QR ficticio de invitación.

El proyecto es, además, una demostración didáctica de **tres servidores MCP
trabajando juntos**: GitHub, SQLite y Playwright.

## La web

![Landing de Kōhi: el nombre en grande sobre fondo casi negro, el subtítulo "Café de especialidad. Próxima apertura." y dos botones, "Unirme a la lista" y "Ya tengo cuenta"](docs/capturas/landing.png)

<table>
  <tr>
    <td width="50%">
      <img src="docs/capturas/registro.png" alt="Formulario de registro con los campos de nombre, email, contraseña y confirmación">
    </td>
    <td width="50%">
      <img src="docs/capturas/panel.png" alt="Panel privado con el saludo, la posición en la cola, una barra de progreso y el código QR de invitación">
    </td>
  </tr>
  <tr>
    <td align="center"><b>Registro</b> — alta en la lista de espera</td>
    <td align="center"><b>Panel</b> — posición en la cola, barra de progreso y QR</td>
  </tr>
</table>

Al registrarte, el servidor te asigna la siguiente posición libre y el panel te
dice cuánta gente tienes por delante. El código QR es ficticio: se construye
solo con CSS y codifica el identificador de la persona.

> Kōhi no está desplegado en ningún sitio: lleva backend propio y base de datos,
> así que hay que levantarlo en local. Las instrucciones están más abajo, en
> [Puesta en marcha](#puesta-en-marcha).

## Los tres MCPs

| MCP | Papel en el proyecto |
|---|---|
| **SQLite** | Crear e inspeccionar la tabla `waitlist` y consultar las posiciones reales durante el desarrollo |
| **GitHub** | Crear el repositorio y gestionar el código: ramas, commits y pull requests |
| **Playwright** | Conducir un navegador real por el flujo completo de registro, login y panel |

La configuración está en [`.mcp.json`](.mcp.json). El servidor de GitHub necesita
la variable de entorno `GITHUB_PAT` con un token de scope `repo`; el archivo solo
guarda la referencia `${GITHUB_PAT}`, nunca el token.

## Stack

Node.js + Express, `better-sqlite3` **sin ORM**, `bcrypt` para las contraseñas y
JWT para la sesión. El frontend es HTML y CSS vanilla, sin frameworks ni
herramientas de build.

## Puesta en marcha

```bash
npm install
cp .env.example .env      # y cambia JWT_SECRET
npm start                 # http://localhost:3000
```

La base de datos se crea sola en el primer arranque aplicando
[`src/db/schema.sql`](src/db/schema.sql), que es idempotente.

> `bcrypt` y `better-sqlite3` son módulos nativos. Si tu npm bloquea los scripts
> de instalación, apruébalos con
> `npm install-scripts approve bcrypt better-sqlite3`.

## API

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/register` | — | Alta en la lista. Devuelve la posición asignada y un JWT |
| `POST` | `/api/login` | — | Verifica credenciales y devuelve un JWT |
| `GET` | `/api/me` | Bearer | Nombre, email, posición y total de la lista |
| `GET` | `/api/health` | — | Sonda de vida |

Errores: `400` campos faltantes o inválidos, `401` credenciales incorrectas o
token ausente/caducado, `409` email ya registrado.

El login responde lo mismo si el email no existe que si la contraseña falla, para
no permitir enumerar qué correos están registrados.

## Esquema

```sql
CREATE TABLE waitlist (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT     NOT NULL,
  email         TEXT     UNIQUE NOT NULL,
  password_hash TEXT     NOT NULL,
  position      INTEGER,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

La posición se calcula como `MAX(position) + 1` **dentro de una transacción**: si
dos altas se solapan, la segunda no puede leer el máximo antes de que la primera
haya escrito su fila, de modo que nunca se reparte dos veces el mismo número.

El email se normaliza a minúsculas en la capa de servicio, porque la columna es
`UNIQUE` pero sin `COLLATE NOCASE`.

## Estructura

```
src/
  config.js              puerto, secreto JWT, ruta de la base, coste de bcrypt
  app.js                 la app de Express, sin listen (testeable)
  server.js              arranque
  db/                    schema.sql y la conexión better-sqlite3
  services/              hash, posiciones y consultas
  middleware/            errores centralizados y verificación del JWT
  routes/                register, login y me
public/
  index.html             landing
  register.html          alta en la lista
  login.html             acceso
  dashboard.html         panel privado
  css/                   tokens.css (paleta y tipografía) + styles.css
  js/                    api.js compartido + un script por página
```

## Licencia

MIT
