# Kōhi

[![CI](https://github.com/ruber9125/kohi-waitlist/actions/workflows/ci.yml/badge.svg)](https://github.com/ruber9125/kohi-waitlist/actions/workflows/ci.yml)
[![Licencia MIT](https://img.shields.io/badge/licencia-MIT-d9a441)](LICENSE)

### ▶ [Pruébalo en vivo — kohi-waitlist.onrender.com](https://kohi-waitlist.onrender.com)

Aplicación web de lista de espera para la apertura de una cafetería de
especialidad. Quien se registra entra en la cola y accede a un panel privado
donde ve su posición, cuánta gente tiene por delante y un código de invitación.

**Node.js + Express, SQLite sin ORM, HTML y CSS vanilla.** Sin frameworks de
frontend ni herramientas de build. Autenticación propia con bcrypt y JWT,
**38 tests de extremo a extremo** con Playwright que se ejecutan en CI en cada
cambio, y despliegue continuo desde un blueprint versionado en el repositorio.

> La primera visita puede tardar unos 50 segundos: el plan gratuito de Render
> suspende el servicio cuando lleva un rato sin tráfico. Después va inmediato.
> La lista se vacía en cada redespliegue —ver
> [Decisiones de arquitectura](#decisiones-de-arquitectura)— así que puedes
> registrarte sin reparos.

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

## Decisiones de arquitectura

Las cuatro decisiones que más condicionan el proyecto, con lo que cuestan y lo
que cambiaría si esto atendiera tráfico real.

### SQLite sin ORM

La aplicación tiene **una tabla y cuatro consultas**. Un ORM añadiría una capa de
abstracción, un lenguaje de consulta intermedio y un modelo de migraciones para
gestionar algo que cabe en catorce líneas de SQL. `better-sqlite3` es además
síncrono, lo que elimina toda una categoría de errores de concurrencia en un
proceso de un solo hilo.

El SQL queda a la vista en
[`waitlist.service.js`](src/services/waitlist.service.js), que para un proyecto
de este tamaño es una ventaja: se lee lo que se ejecuta.

**Dónde deja de valer**: en cuanto haya varias instancias de la aplicación.
SQLite es un archivo local, así que cada instancia tendría su propia copia. El
salto natural sería PostgreSQL, y el trabajo se concentraría en un único archivo
porque el acceso a datos está aislado en la capa de servicio.

### La base de datos es efímera en producción

El plan gratuito de Render no admite discos persistentes: el sistema de archivos
del contenedor se reinicia en cada despliegue y en cada suspensión por
inactividad. **La lista de espera se vacía.**

Es la limitación más visible del proyecto y conviene nombrarla sin rodeos: para
una lista de espera real sería inaceptable. Se asume aquí a cambio de tener una
demo pública, gratuita y con el flujo completo funcionando de verdad, en lugar de
una simulación en el navegador.

**La salida está preparada, no pendiente**: la ruta de la base sale de la
variable `KOHI_DB_PATH`, así que añadir un disco de pago en Render y apuntarla a
su punto de montaje resuelve la persistencia sin tocar una línea de código. Esa
variable existe desde el primer día porque los tests ya la necesitaban para
correr contra su propia base.

### El JWT viaja en `localStorage`

Es la decisión más discutible del proyecto y la que tiene un coste real: si
alguien consiguiera inyectar JavaScript en la página, podría leer el token. Una
cookie `httpOnly` sería inmune a eso y permitiría además proteger `/dashboard`
en el servidor, sin el parpadeo de contenido privado que hay ahora antes de
redirigir.

Se mitiga por dos vías: una CSP sin `'unsafe-inline'`, que es la barrera contra
el XSS que haría posible el robo, y tokens de vida corta (2 horas).

**Lo que no se arregla así**: cerrar sesión borra la copia del navegador, pero el
token sigue siendo válido hasta que caduca. Con JWT sin estado no hay forma de
revocarlo sin añadir una lista de tokens invalidados, que es justamente el estado
que los JWT pretenden evitar.

### Frontend sin framework

Cuatro páginas, tres formularios y una llamada `fetch` compartida. React
aportaría un grafo de dependencias, un paso de build y varios cientos de
kilobytes para resolver un problema que aquí no existe. El coste de la decisión
es que no hay componentes reutilizables; con cuatro páginas, no compensa.

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

## Tests

```bash
npx playwright install chromium   # solo la primera vez
npm run test:e2e
```

38 tests de extremo a extremo sobre un navegador real, repartidos en siete
archivos: landing, registro, acceso, panel, posiciones en la cola, seguridad,
límite de peticiones, cabeceras y validación.

Tres decisiones de la suite que conviene conocer:

- **Levanta sus propios servidores**, en puertos distintos al de desarrollo y
  contra sus propias bases, para no pisar nada de lo que estés mirando.
- **Corre en serie.** Varios tests afirman cosas sobre el total de la lista; en
  paralelo, sobre una única base compartida, esos totales bailarían.
- **Hay un segundo servidor con el limitador apretado.** La suite hace unas
  treinta llamadas de autenticación desde la misma IP en un minuto, así que con
  los límites de producción se cortaría a sí misma. En vez de desactivar la
  protección durante los tests —y no probarla nunca—, los valores se configuran
  por entorno y un servidor aparte verifica que el freno corta de verdad.

Varios tests abren SQLite directamente para comprobar lo que el navegador no
puede ver: que la contraseña se guardó hasheada, que un email duplicado no creó
una segunda fila, o para inyectar gente en la cola sin pasar por la interfaz.

El CI los ejecuta en cada push y en cada pull request, y `main` está protegida:
no entra nada con los tests en rojo.

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

### Límite de peticiones

`/api/login` y `/api/register` están limitados por IP, con contadores
independientes: **10 accesos cada 15 minutos** y **5 altas por hora**. Al
superarlos la API responde `429` con una cabecera `Retry-After`.

El acceso se limita más fuerte porque es el objetivo natural de la fuerza bruta
y porque cada intento cuesta unos 250 ms de CPU en bcrypt. Sin freno, unas pocas
peticiones por segundo agotan el *threadpool* de libuv y dejan sin responder a
toda la aplicación, no solo al login.

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

- **Contraseñas con bcrypt**, coste 12. Ninguna respuesta de la API incluye el
  hash: todo lo que sale pasa por una proyección explícita, y hay un test que lo
  rastrea.
- **Cabeceras de `helmet`**, con una CSP ajustada a lo que la web usa de verdad:
  scripts solo del propio dominio —sin `'unsafe-inline'`— y Google Fonts
  permitido explícitamente. Un test navega la landing y falla si aparece
  cualquier error en consola, que es como se manifiesta una CSP demasiado
  estricta.
- **`frame-ancestors 'none'`**, para que nadie pueda embeber el sitio en un
  iframe y montar un clickjacking encima.
- **Sin `X-Powered-By`**: no hay motivo para anunciar el stack.
- **Cuerpos limitados a 10 kB**, holgado para lo que acepta la API.
- **El login responde lo mismo** si el email no existe que si la contraseña
  falla, para no permitir enumerar qué correos están registrados. Hay un test que
  compara ambos mensajes carácter a carácter.
- **En producción el servidor no arranca sin `JWT_SECRET`.** El valor por defecto
  de desarrollo está escrito en este repositorio público: arrancar con él
  permitiría a cualquiera firmar un token válido y entrar como otra persona.

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

## Despliegue

El repositorio incluye [`render.yaml`](render.yaml), un blueprint de
[Render](https://render.com) que describe el servicio entero. No hay que
rellenar nada a mano:

1. En Render, **New → Blueprint**.
2. Conecta este repositorio y confirma.

Render instala solo las dependencias de producción y arranca `npm start`.
`JWT_SECRET` lo genera él, con un valor aleatorio que nunca pasa por el
repositorio.

Dos cosas del plan gratuito que se notan al usarlo: el servicio **se suspende**
tras un rato sin visitas, y la primera petición después tarda unos 50 segundos
mientras el contenedor rearranca; y **la base de datos es efímera**, como se
explica en [Decisiones de arquitectura](#decisiones-de-arquitectura).

## Cómo se construyó

El proyecto se desarrolló íntegramente desde [Claude Code](https://claude.com/claude-code),
conduciendo tres servidores MCP:

| MCP | Papel |
|---|---|
| **SQLite** | Crear e inspeccionar la tabla, y verificar los datos reales tras cada alta |
| **GitHub** | Crear el repositorio y gestionar ramas, commits y pull requests |
| **Playwright** | Recorrer con un navegador real el flujo de registro, acceso y panel |

La configuración está en [`.mcp.json`](.mcp.json). El servidor de GitHub necesita
la variable de entorno `GITHUB_PAT` con un token de scope `repo`; el archivo solo
guarda la referencia `${GITHUB_PAT}`, nunca el token.

## Estructura

```
src/
  config.js              puerto, secreto JWT, ruta de la base, límites
  app.js                 la app de Express, sin listen (testeable)
  server.js              arranque
  db/                    schema.sql y la conexión better-sqlite3
  services/              hash, posiciones y consultas
  middleware/            errores, verificación del JWT y límite de peticiones
  routes/                register, login y me
public/
  index.html             landing
  register.html          alta en la lista
  login.html             acceso
  dashboard.html         panel privado
  404.html               página de error
  css/                   tokens.css (paleta y tipografía) + styles.css
  js/                    api.js compartido + un script por página
tests/
  e2e/                   siete archivos de especificaciones
  helpers/               acceso a la base, flujos comunes y limpieza previa
```

## Licencia

MIT
