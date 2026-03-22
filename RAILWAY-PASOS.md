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
3. Si la base ya existía: corré también las migraciones en `backend/sql/migrations/` (por ejemplo `002_add_product_stock.sql` para stock).

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
