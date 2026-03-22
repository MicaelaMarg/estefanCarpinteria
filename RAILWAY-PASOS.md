# Qué hacer en Railway (paso a paso)

Entrá a [railway.app](https://railway.app) e iniciá sesión.

---

## 1. Abrir tu proyecto

En el **dashboard** hacé clic en el proyecto (por ejemplo *estefanCarpinteria* o el nombre que le hayas puesto).

Ahí ves **tarjetas**: MySQL, backend, frontend, etc.

---

## 2. Conectar GitHub al servicio del **backend** (API)

1. Hacé clic en la tarjeta del **backend** (no en MySQL).
2. Arriba a la derecha: **Settings** (⚙️ o pestaña *Settings*).
3. Buscá la sección **Source** o **Connect** / **GitHub**.
4. Si no está conectado:
   - Elegí **Connect GitHub** (o *Connect Repository*).
   - Autorizá a Railway si te lo pide.
   - Seleccioná el repo: **estefanCarpinteria** (o como se llame en GitHub).
   - Rama: **`main`**.

5. **Muy importante — Root Directory** (carpeta raíz del deploy):
   - **Opción fácil:** escribí exactamente: **`backend`**  
     (Railway solo mira la carpeta `backend/` del repo y usa el `Dockerfile` de ahí).
   - **O** dejá la raíz vacía / `.` si en **Build** te deja elegir Dockerfile **`Dockerfile.api`** (raíz del repo). Si no estás segura, usá **`backend`**.

6. Guardá si hay botón **Save** / **Update**.

7. Volvé a la pestaña **Deployments** (o **Deploy**) y tocá **Deploy** / **Redeploy** para que arranque un build nuevo.

---

## 3. Conectar GitHub al **frontend**

1. Clic en la tarjeta del **frontend**.
2. **Settings** → **Source** → mismo repo **estefanCarpinteria**, rama **`main`**.
3. **Root Directory:** escribí **`frontend`** (sin barra al final).
4. Guardá y **Redeploy**.

---

## Flechas en el mapa: ¿el frontend “no está conectado”?

En el lienzo de Railway **no es normal** que aparezca una flecha del **frontend** hacia el **backend**. Las flechas suelen mostrarse cuando un servicio **referencia variables** de otro (por ejemplo el API → **MySQL**).

El sitio y el API se comunican por **HTTPS desde el navegador**, no por una “línea” en el dibujo. Lo que tiene que estar bien es:

| Dónde | Variable | Valor |
|--------|-----------|--------|
| **Frontend** | `VITE_API_BASE_URL` | `https://URL-DEL-BACKEND.up.railway.app/api` |
| **Backend** | `CORS_ORIGIN` | `https://URL-DEL-FRONTEND.up.railway.app` (exacta, con `https`) |

Después de cambiar `VITE_API_BASE_URL`: **Redeploy del frontend** (Vite la incluye en el build).

**Cómo comprobar:** abrí el sitio público; si el catálogo carga productos y el login del admin responde, **sí están conectados**.

---

## 4. Variables de entorno (backend)

En el servicio **backend** → **Variables** (o *Variables / Environment*):

- `NODE_ENV` = `production`
- `JWT_SECRET` = un texto largo y aleatorio
- `DATABASE_URL` o conexión MySQL: en Railway suele ser **Reference** al servicio **MySQL** (variable que te sugiera el panel, por ejemplo `MYSQL_URL` / `DATABASE_URL`).
- `CORS_ORIGIN` = la URL pública del **frontend** (ej. `https://algo.up.railway.app`)
- `PUBLIC_BASE_URL` = la URL pública del **backend** (sin `/api` al final)
- `ADMIN_EMAIL` y `ADMIN_PASSWORD` = tu login del panel admin
- Opcional: `DB_SSL` = `false` si la base es la interna de Railway y da error de SSL

Guardá; a veces eso dispara un redeploy solo.

---

## 5. Variable del **frontend**

En el servicio **frontend** → **Variables**:

- `VITE_API_BASE_URL` = `https://TU-BACKEND.up.railway.app/api`  
  (copiá la URL real del API desde el backend → **Settings** → **Networking** / dominio público, y agregá `/api` al final.)

Después de cambiarla: **Redeploy** del frontend (el valor se “hornea” en el build).

---

## 6. MySQL (base de datos)

1. Clic en el servicio **MySQL**.
2. Cuando esté **online**, abrí **Query** o conectate con un cliente y ejecutá el SQL de `backend/sql/schema.sql` (y `seed.sql` si querés datos de prueba).
3. Si la base ya existía: corré también las migraciones en `backend/sql/migrations/` (por ejemplo `002_add_product_stock.sql`, `003_admin_users.sql` para login con email/contraseña en MySQL).

### Admin: email y contraseña en MySQL

Tras `003_admin_users.sql` (o `seed.sql`), el usuario inicial es **mattiuccimicaelammm@gmail.com** con la contraseña asociada al hash del repo (o actualizá email/hash con el `UPDATE` de abajo). Para cambiar la clave:

1. En tu PC, en `backend/`: `npm run hash-password -- "TuNuevaClave"` → copiá el hash.
2. En Railway → MySQL → **Query**:

```sql
UPDATE admin_users SET email = 'tu@email.com', password_hash = 'PEGAR_HASH_AQUI' WHERE id = 1;
```

Si ya tenías un usuario viejo y solo querés fijar el del proyecto:

```sql
UPDATE admin_users
SET email = 'mattiuccimicaelammm@gmail.com',
    password_hash = '$2b$10$zTt5c33B/VyJfrNbdUUniO0nG6D0pTmyaZoR2VHuUIVRx3CXJIAge'
WHERE id = 1;
```

(O insertá otra fila en `admin_users` si querés otro admin.) Las variables `ADMIN_EMAIL` / `ADMIN_PASSWORD` del servicio backend **solo se usan** si la tabla `admin_users` no tiene ninguna fila que coincida con el email del login.

---

## 7. Dominio público (para copiar URLs)

En cada servicio (**backend** y **frontend**):

- **Settings** → **Networking** → **Generate domain** (o similar) si aún no tenés URL `*.up.railway.app`.

Esas URLs son las que usás en `CORS_ORIGIN`, `PUBLIC_BASE_URL` y `VITE_API_BASE_URL`.

---

## Si “no pasa nada” al hacer push

- Revisá que el **backend** tenga **Root Directory = `backend`** y el **frontend** **`frontend`**.
- Forzá un deploy: **Deployments** → **Redeploy**.
- Mirá **Deployments** → último intento → entrá al log: ahí sale el error real (build o arranque).

---

## Resumen en una línea

**Backend:** repo + rama `main` + root **`backend`** + variables + redeploy.  
**Frontend:** mismo repo + rama `main` + root **`frontend`** + `VITE_API_BASE_URL` + redeploy.
