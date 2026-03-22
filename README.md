# Estefan Carpintería - Full Stack Railway Ready

Proyecto full stack para catálogo profesional de carpintería.

- **Frontend:** Vue 3 + TypeScript + Vite + TailwindCSS + Pinia + Axios
- **Backend:** Node.js + Express + TypeScript + MySQL
- **Deploy:** Railway (frontend y backend en servicios separados)

## Estructura

```bash
.
├── frontend
│   ├── src
│   │   ├── api/configApi.ts
│   │   ├── components
│   │   ├── composables
│   │   ├── interfaces
│   │   ├── router
│   │   └── views
│   └── railway.json
└── backend
    ├── src
    │   ├── config
    │   ├── controllers
    │   ├── db
    │   ├── routes
    │   ├── middleware
    │   ├── types
    │   └── utils
    ├── sql
    │   ├── schema.sql
    │   └── seed.sql
    └── railway.json
```

## Arquitectura aplicada

- **Views:** solo montan el componente principal de cada página.
- **Componentes UI:** render, eventos y lógica visual.
- **Composables:** estado, llamadas API, paginación y filtros.
- **API REST:** formato uniforme:

```json
{
  "status": "success",
  "data": [],
  "total": 100,
  "message": ""
}
```

## Requisitos

- Node.js 20+ (recomendado; el backend declara `engines.node >= 20`)
- MySQL 8+

## Variables de entorno

### Backend (`backend/.env`)

Copiar desde `backend/.env.example`.

```env
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=change_this_secret

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=carpinteria

ADMIN_EMAIL=mattiuccimicaelammm@gmail.com
# ADMIN_PASSWORD=...  # respaldo si no usás admin_users en MySQL
ADMIN_PASSWORD_HASH=
```

### Frontend (`frontend/.env`)

Copiar desde `frontend/.env.example`.

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

## Base de datos

Ejecutar scripts en MySQL:

```sql
SOURCE backend/sql/schema.sql;
SOURCE backend/sql/seed.sql;
```

## Desarrollo local

### 1) Backend

```bash
cd backend
npm install
npm run dev
```

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

## Build de producción

### Backend

```bash
cd backend
npm run build
npm run start
```

### Frontend

```bash
cd frontend
npm run build
npm run start
```

## Endpoints API

- `GET /api/products`
  - query params: `page`, `limit`, `q`, `category`, `minPrice`, `maxPrice`
- `GET /api/products/:id`
- `POST /api/auth/login`

### Ejemplo login

El usuario admin vive en MySQL (`admin_users`) tras aplicar `schema.sql` / migración `003` (email por defecto en el SQL del repo). Si la tabla no existe o está vacía, se usan `ADMIN_EMAIL` / `ADMIN_PASSWORD` del `.env`.

```json
{
  "email": "mattiuccimicaelammm@gmail.com",
  "password": "tu_contraseña"
}
```

Hash para cambiar contraseña en la base: `cd backend && npm run hash-password -- "nueva_clave"`.

## Deploy en Railway

Guía clic a clic en el panel: **[RAILWAY-PASOS.md](RAILWAY-PASOS.md)**.

Crear **3 servicios** en Railway:

1. **MySQL** (plugin oficial)
2. **backend** (API)
3. **frontend** (sitio Vue)

### Si “no deploya nada” o no ves builds al hacer push

1. **Conectar el repo**  
   Servicio → **Settings** → **Source** → conectá **GitHub** y el repo `estefanCarpinteria`, rama **`main`**.

2. **Activar despliegues**  
   Misma sección: **Wait for CI** desactivado (salvo que uses GitHub Actions) y que el servicio no esté pausado.

3. **Root Directory del API (elegí una sola forma)**  
   - **Opción A (recomendada):** Root Directory = **`backend`** → usa `backend/Dockerfile` y `backend/railway.json`.  
   - **Opción B:** Root Directory **vacío** (raíz del repo) → usa **`Dockerfile.api`** y el `railway.json` de la **raíz** del repo.

   Si el Root Directory no coincide con donde está el Dockerfile, el build **no arranca** o falla al instante.

4. **Frontend**  
   Root Directory = **`frontend`** (para que tome `frontend/package.json` y `frontend/railway.json`).

5. **Redeploy manual**  
   En el servicio → **Deployments** → **Redeploy** (o **Deploy**), o desde CLI: `railway up` en la carpeta correcta.

6. **Rutas que disparan build** (opcional)  
   En el servicio del API podés limitar **Watch Paths** a `backend/**` para no redeployar al tocar solo el frontend.

### Variables backend en Railway

- `PORT` — Railway la define sola en el servicio
- `NODE_ENV` = `production`
- `CORS_ORIGIN` = URL pública del frontend (se pueden varias separadas por coma)
- `JWT_SECRET` = secreto seguro
- MySQL: **`DATABASE_URL`** o **`MYSQL_URL`** referenciando el plugin, o variables sueltas (`MYSQLHOST`, `MYSQLUSER`, etc.)
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` o `ADMIN_PASSWORD_HASH`
- `PUBLIC_BASE_URL` = URL pública del backend (imágenes subidas)
- `UPLOAD_DIR` + **Volume** montado en esa ruta (si no, las imágenes se pierden al redeploy)

### Variables frontend en Railway

- `VITE_API_BASE_URL` = `https://<tu-backend>.up.railway.app/api` (obligatorio en el **build**)

La configuración `railway.json` de cada app ya incluye build/start para deploy directo.

### Deploy por CLI (Railway)

Instalá el CLI (una sola vez):

```bash
npm i -g @railway/cli
# o: brew install railway
```

Iniciá sesión:

```bash
railway login
```

#### 1) Proyecto y MySQL

En [railway.app](https://railway.app): **New project** → agregá el plugin **MySQL**.  
Después creá **dos servicios vacíos** (Empty Service) o desde el CLI con `railway init` en cada carpeta (podés elegir “proyecto existente” y crear un servicio nuevo por app).

#### 2) Backend (desde la carpeta `backend`)

Cada deploy debe hacerse **desde dentro de `backend/`**, para que Nixpacks vea ese `package.json`:

```bash
cd backend
railway link          # elegí el proyecto y el servicio del API (no el de MySQL ni el del frontend)
railway up            # sube y despliega (equivale a build + start)
```

Variables del servicio backend (Dashboard → Variables o `railway variables`):

| Variable | Valor típico |
|----------|----------------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | un string largo y aleatorio |
| `CORS_ORIGIN` | URL pública del frontend (ej. `https://tu-frontend.up.railway.app`) |
| Conexión MySQL | Referenciá el plugin: `${{MySQL.DATABASE_URL}}` como **`DATABASE_URL`**, o las variables `MYSQLHOST`, `MYSQLUSER`, etc. (según lo que muestre Railway) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | credenciales del panel admin |
| `PUBLIC_BASE_URL` | URL pública del **backend** sin barra final (ej. `https://tu-api.up.railway.app`) para URLs absolutas de imágenes |
| `UPLOAD_DIR` | ruta donde montás un **Volume** (ej. `/data/uploads`) |

Después del primer deploy, ejecutá en MySQL el `schema` (y migraciones si aplica), por ejemplo desde la pestaña Query del plugin o un cliente MySQL.

#### 3) Frontend (desde la carpeta `frontend`)

```bash
cd frontend
railway link          # mismo proyecto, **otro** servicio (solo frontend)
railway variables set VITE_API_BASE_URL=https://TU-BACKEND.up.railway.app/api
railway up
```

`VITE_API_BASE_URL` debe definirse **antes** del build: al cambiarla, volvé a desplegar (`railway up`).

#### Notas CLI

- `railway status` — servicio vinculado y entorno.
- `railway logs` — ver logs del último deploy.
- En Windows PowerShell, si falla `railway.ps1`, probá: `railway.cmd up`.

#### Errores comunes

1. **`cd: no such file or directory: backend`**  
   Estás dentro de `frontend/`. Subí un nivel: `cd ..` y luego `cd backend`, o en una sola línea: `cd ../backend`.

2. **`error: unexpected argument '#' found`**  
   No pegues comentarios del README en la misma línea. Mal: `railway link    # texto`. Bien: solo `railway link` (o `railway link -p <id-proyecto> -s <id-servicio>`).

3. **`Service: None`**  
   Hace falta un servicio vacío en el proyecto y vincularlo: `railway add -s nombre-del-servicio` y después `railway link -p ... -s <id>`.

4. **Enlace no interactivo (sin menús)**  
   `railway list --json` muestra IDs de proyectos y servicios; luego:  
   `railway link -p <projectId> -s <serviceId> -e production`.

5. **Build backend: `npm ERR! EBUSY` en `node_modules/.cache`**  
   El servicio **backend** en Railway usa **`Dockerfile`** (no Nixpacks) para evitar el conflicto con los cache mounts de BuildKit. Si cambiás el builder en `railway.json`, podés volver a Nixpacks + `nixpacks.toml` como alternativa.
