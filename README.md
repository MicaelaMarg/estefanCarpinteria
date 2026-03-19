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

- Node.js 20+
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

ADMIN_EMAIL=admin@carpinteria.com
ADMIN_PASSWORD=admin1234
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

```json
{
  "email": "admin@carpinteria.com",
  "password": "admin1234"
}
```

## Deploy en Railway

Crear **3 servicios** en Railway:

1. **MySQL** (plugin oficial)
2. **backend** (raíz del servicio: `backend/`)
3. **frontend** (raíz del servicio: `frontend/`)

### Variables backend en Railway

- `PORT` = `${{PORT}}` (Railway la inyecta automáticamente)
- `NODE_ENV` = `production`
- `CORS_ORIGIN` = URL pública del frontend en Railway
- `JWT_SECRET` = secreto seguro
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (desde MySQL service)
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` o `ADMIN_PASSWORD_HASH`

### Variables frontend en Railway

- `VITE_API_BASE_URL` = `https://<tu-backend>.up.railway.app/api`

La configuración `railway.json` de cada app ya incluye build/start para deploy directo.
