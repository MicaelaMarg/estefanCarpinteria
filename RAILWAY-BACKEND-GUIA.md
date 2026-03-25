  # Guía práctica: JWT 401 + MySQL en Railway (backend Express + mysql2)

## 1. Diagnóstico rápido

### JWT: `401` — `Token inválido o expirado`

| Causa | Qué revisar |
|--------|----------------|
| Token vencido | El login firma con `expiresIn: '2h'`. Pasado ese tiempo, `jwt.verify` falla. |
| `JWT_SECRET` distinto | Cambiaste la variable en Railway y el token viejo ya no valida. |
| Token de otro entorno | Login en local (`dev-secret`) y front en prod pegando al API de Railway. |
| Token corrupto | `localStorage` truncado / extensión del navegador. |

**No es MySQL:** el middleware `requireAdmin` corta antes de ejecutar el `SELECT`.

### MySQL: listado / `GET /api/admin/products`

| Código / errno | Significado |
|----------------|-------------|
| `ER_NO_SUCH_TABLE` / `1146` | Tabla `products` (u otra) no existe → correr `schema.sql` + migraciones. |
| `ECONNREFUSED` | Host/puerto mal o MySQL caído. |
| `ETIMEDOUT` | Red/firewall o servicio sobrecargado. |
| `ENOTFOUND` | Host DNS incorrecto en `DATABASE_URL`. |
| `PROTOCOL_CONNECTION_LOST` | Conexión cortada; el pool pide otra en la siguiente query. |

### Variables (Railway)

- **Backend** debe tener referencia al MySQL: `DATABASE_URL` o `MYSQL_URL` **o** `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`.
- **Misma base** en todo el proyecto: si el plugin crea `railway` y tu código usa `carpinteria`, fallará o verás tablas vacías.
- **SSL:** con host remoto en Railway se usa SSL salvo `DB_SSL=false`.

---

## 2. Código (ya en el repo)

- **Pool:** `backend/src/db/pool.ts` — `utf8mb4`, `connectTimeout`, `enableKeepAlive`, SSL condicional.
- **Logs MySQL:** `backend/src/db/mysqlError.ts` — `logMysqlError(context, err)` con `code`, `errno`, `sqlState`, `sqlMessage`.
- **Arranque:** `backend/src/db/verifyConnection.ts` — ping `SELECT 1` al iniciar (log `[boot] MySQL: ping OK` o error).
- **Health:** `GET /api/health` — `database`, `admin_users`, `products`: `ok` | `missing` | `error`.
- **Listado admin:** errores mapeados a mensajes claros en `admin-products.controller.ts`.

---

## 3. SQL mínimo: tabla `products`

Si `products` no existe, en **Railway → MySQL → Query** pegá (o usá el archivo `backend/sql/schema.sql` completo):

```sql
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  category VARCHAR(80) NOT NULL,
  image_url VARCHAR(2048) NOT NULL,
  video_url VARCHAR(2048) NULL,
  stock_cargado INT NOT NULL DEFAULT 0,
  stock_disponible INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

Luego migraciones en orden, si las usás:

- `backend/sql/migrations/001_widen_image_and_video_url.sql`
- `backend/sql/migrations/002_add_product_stock.sql`
- …

**Admin login:** tabla `admin_users` está en el mismo `schema.sql` + `003_admin_users.sql` si aplica.

---

## 4. Railway CLI (comandos)

```bash
npm i -g @railway/cli

railway login
railway link
railway status

railway variables
railway variables --json
railway variables | grep -i DATABASE

railway variables set NODE_ENV=production
railway variables set JWT_SECRET="un_secreto_largo_y_estable"
railway variables set CORS_ORIGIN="https://tu-frontend.up.railway.app"

railway connect
# elegís el servicio MySQL; abre cliente mysql en terminal

railway logs
railway logs --service nombre-del-backend

railway up
railway redeploy
```

**Monorepo:** `-s nombre-servicio` en variables/logs si tenés varios servicios.

---

## 5. Checklist de debugging (orden sugerido)

1. **Health:** `curl -s https://TU-BACKEND/api/health` → `database: true`, `products: "ok"`, `orders: "ok"`, `admin_users: "ok"`.
2. **JWT:** En Railway, `JWT_SECRET` definido y **sin cambiarlo** entre deploys si querés sesiones estables.
3. **Token en el navegador:** Application → Local Storage → `token`; si dudás, borrá y volvé a loguear.
4. **DATABASE_URL / MYSQL*:** Mismo proyecto que el plugin MySQL; usuario/clave/db correctos.
5. **Tabla:** En MySQL Query: `SHOW TABLES LIKE 'products';` y `SELECT COUNT(*) FROM products;`.
6. **Logs backend:** buscar `[mysql]`, `[boot]`, `[admin-products]`, `[auth]`.
7. **Nombre de base en el pool:** la **primera** vez que alguien llama `GET /api/admin/products`, en logs sale  
   `[admin-products] MySQL DATABASE(): <nombre>` — tiene que ser el **mismo** que en Railway → MySQL (plugin). Si ves `railway` en el panel y `carpinteria` en el log (o al revés), el backend está apuntando a **otra** base.

**Probar login:**

```bash
curl -s -X POST https://TU-BACKEND/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tu@email.com","password":"tu_clave"}'
```

**Probar listado (con token):**

```bash
curl -s https://TU-BACKEND/api/admin/products?page=1&limit=5 \
  -H "Authorization: Bearer TOKEN_AQUI"
```

---

## 6. Mercado Pago (Checkout Pro + webhook)

**Variables en el servicio del backend (nunca en el frontend):**

| Variable | Uso |
|----------|-----|
| `MERCADOPAGO_ACCESS_TOKEN` | Token de producción o de prueba desde [Tus integraciones](https://www.mercadopago.com.ar/developers/panel/credentials). |
| `PUBLIC_BASE_URL` | URL pública del API (**sin** barra final), HTTPS. Sirve para URLs de imágenes en ítems; **no** manda `notification_url` en la preferencia salvo que actives la opción de abajo. |
| `PUBLIC_FRONTEND_URL` | URL del sitio Vue (éxito / error / pendiente): `{PUBLIC_FRONTEND_URL}/pago/exito` etc. |
| `CORS_ORIGIN` | Incluí la URL del front para que el navegador pueda llamar `POST /api/checkout`. |
| `MERCADOPAGO_SEND_NOTIFICATION_URL` | Solo `true` si querés forzar `notification_url` en la preferencia con `{PUBLIC_BASE_URL}/api/webhook`. Por defecto el código **no** la envía y MP usa la URL de **Webhooks** del panel (evita errores tipo “notification_url invalid”). |
| `MERCADOPAGO_NOTIFICATION_URL` | (Opcional) URL completa del webhook si necesitás enviarla en la preferencia a mano. |
| `SHIPPING_DELIVERY_PRICE_ARS` | Precio fijo del envío a domicilio en pesos (default 8000 si no está definido). |

**Base de datos:** en **MySQL → Database → Data**, pegá y ejecutá el SQL en orden: `005_orders_mercadopago.sql`, luego **`006_order_shipping.sql`** (obligatoria antes de la 007), después **`007_order_shipping_contact.sql`**. Si la 007 falla con *Unknown column shipping_cost*, es porque falta la **006**; alternativa: un solo archivo **`006_and_007_orders_shipping_combined.sql`**. O usá el `schema.sql` completo en bases nuevas.

**Panel Mercado Pago:** configurá **Webhooks** con `https://TU-API/api/webhook`. El checkout **no** duplica esa URL en la preferencia por defecto; las notificaciones siguen llegando a la URL del panel.

**Producción:** probá primero con credenciales de **test** y tarjetas de prueba; el `init_point` de sandbox vs producción lo resuelve la API según el token.

---

## 7. Bonus

### Evitar que “se rompa la sesión” al cambiar `JWT_SECRET`

- **No rotar** `JWT_SECRET` en cada deploy; usá un valor estable en Railway.
- Si **debés** rotarlo: todos los usuarios deben **volver a iniciar sesión**; los tokens viejos quedan inválidos por diseño.
- Opcional futuro: refresh tokens o blacklist (más complejo).

### Buenas prácticas Railway

- `NODE_ENV=production` + `JWT_SECRET` fuerte (32+ bytes aleatorios).
- `CORS_ORIGIN` = URL real del front (coma si hay varias).
- Misma **red privada** entre servicios cuando Railway lo ofrece (`mysql.railway.internal`).
- Revisar **logs** tras cada deploy con `railway logs`.
