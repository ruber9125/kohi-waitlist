# Kōhi

[![CI](https://github.com/ruber9125/kohi-waitlist/actions/workflows/ci.yml/badge.svg)](https://github.com/ruber9125/kohi-waitlist/actions/workflows/ci.yml)

### ▶ [Pruébalo en vivo — kohi-waitlist.onrender.com](https://kohi-waitlist.onrender.com)

> La primera visita puede tardar unos 50 segundos: el plan gratuito de Render
> suspende el servicio cuando lleva un rato sin tráfico y tiene que rearrancarlo.
> Después va inmediato. La lista de espera se vacía en cada redespliegue, así que
> puedes registrarte sin reparos.

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

Puedes verlo funcionando en [kohi-waitlist.onrender.com](https://kohi-waitlist.onrender.com)
o [levantarlo en local](#puesta-en-marcha). Kōhi lleva servidor y base de datos
propios, así que no puede publicarse en GitHub Pages, que solo sirve archivos
estáticos; está desplegado en Render, y el [blueprint](render.yaml) que lo hace
posible viene en el repositorio.

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

## Despliegue

El repositorio incluye [`render.yaml`](render.yaml), un blueprint de
[Render](https://render.com) que describe el servicio entero. No hay que
rellenar nada a mano:

1. En Render, **New → Blueprint**.
2. Conecta este repositorio y confirma.

Render instala las dependencias de producción, arranca `npm start` y comprueba
`/api/health` antes de dar el despliegue por bueno. `JWT_SECRET` se genera solo,
con un valor aleatorio que nunca pasa por el repositorio.

Tres cosas que conviene saber del plan gratuito:

- **El servicio se suspende tras un rato sin visitas.** La primera petición
  después de la suspensión tarda unos 50 segundos en responder mientras el
  contenedor vuelve a arrancar.
- **La base de datos es efímera.** El plan gratuito no admite discos
  persistentes, así que la lista de espera se vacía en cada despliegue o
  suspensión. Para conservarla hay que añadir un disco de pago y apuntar
  `KOHI_DB_PATH` a su punto de montaje.
En producción, `NODE_ENV=production` activa un guardarraíl en
[`src/config.js`](src/config.js): si falta `JWT_SECRET`, el servidor **no
arranca**. El valor por defecto de desarrollo está escrito en este repositorio
público, y arrancar con él permitiría a cualquiera firmar un token válido y
entrar como otra persona.

## API

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/register` | — | Alta en la lista. Devuelve la posición asignada y un JWT |
| `POST` | `/api/login` | — | Verifica credenciales y devuelve un JWT |
| `GET` | `/api/me` | Bearer | Nombre, email, posición y total de la lista |
| `GET` | `/api/health` | — | Sonda de vida |

Errores: `400` campos faltantes, inválidos o JSON mal formado, `401` credenciales
incorrectas o token ausente/caducado, `404` ruta inexistente, `409` email ya
registrado, `413` cuerpo demasiado grande, `429` demasiadas peticiones.

Las rutas bajo `/api` responden siempre en JSON. El resto —una dirección mal
tecleada, por ejemplo— devuelve una página de error, no un objeto en bruto.

El login responde lo mismo si el email no existe que si la contraseña falla, para
no permitir enumerar qué correos están registrados.

### Límite de peticiones

`/api/login` y `/api/register` están limitados por IP, con contadores
independientes: **10 accesos cada 15 minutos** y **5 altas por hora**. Al
superarlos la API responde `429` con una cabecera `Retry-After`.

El acceso se limita más fuerte porque es el objetivo natural de la fuerza bruta
y porque cada intento cuesta unos 250 ms de CPU en bcrypt. Sin freno, unas pocas
peticiones por segundo agotan el *threadpool* de libuv y dejan sin responder a
toda la aplicación, no solo al login.

Los valores se configuran por entorno (`RATE_LIMIT_LOGIN_MAX`,
`RATE_LIMIT_REGISTER_MAX` y sus ventanas), lo que permite a los tests levantar
un servidor con un límite diminuto y comprobar que corta de verdad.

### Límites de los campos

| Campo | Límite | Por qué |
|---|---|---|
| `name` | 80 caracteres | |
| `email` | 254 caracteres | Máximo del estándar, RFC 5321 |
| `password` | 8 a **72 bytes** | Es lo que bcrypt tiene en cuenta |

El tope de la contraseña se mide en **bytes, no en caracteres**, y ese detalle
importa: bcrypt descarta en silencio todo lo que pase de 72 bytes. Sin este
límite, dos frases de contraseña distintas que coincidieran en sus primeros 72
bytes abrían la misma cuenta, y quien usara una frase larga creía estar más
protegido de lo que estaba. Contar caracteres tampoco bastaría: una `ñ` ocupa
dos bytes, así que 40 caracteres acentuados ya superan el límite.

## Seguridad

Además de bcrypt para las contraseñas y del [límite de peticiones](#límite-de-peticiones):

- **Cabeceras de `helmet`**, con una política de contenido (CSP) ajustada a lo
  que la web usa de verdad: scripts solo del propio dominio —sin
  `'unsafe-inline'`—, y Google Fonts permitido explícitamente. Un test navega la
  landing y falla si aparece cualquier error en consola, que es como se
  manifiesta una CSP demasiado estricta.
- **`frame-ancestors 'none'`**, para que nadie pueda embeber el sitio en un
  iframe y montar un clickjacking encima.
- **Sin `X-Powered-By`**: no hay motivo para anunciar el stack.
- **Cuerpos limitados a 10 kB**, holgado para lo que acepta la API.
- El login **responde lo mismo** si el email no existe que si la contraseña
  falla, para no permitir enumerar qué correos están registrados.
- Ninguna respuesta de la API incluye el hash: todo lo que sale pasa por una
  proyección explícita, y hay un test que lo rastrea.

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
