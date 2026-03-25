#!/usr/bin/env bash
# Tras: railway login && railway link (en la raíz del repo)
# Ajustá SERVICE y FRONT si tus nombres/URLs son distintos.
set -euo pipefail

SERVICE="${RAILWAY_SERVICE:-carpinteria-backend}"
FRONT_URL="${PUBLIC_FRONTEND_URL:-https://carpinteria-frontend-production.up.railway.app}"

echo "Servicio: $SERVICE"
echo "PUBLIC_FRONTEND_URL -> $FRONT_URL"
railway variable set "PUBLIC_FRONTEND_URL=$FRONT_URL" -s "$SERVICE"

echo "Listo. Railway redeployará el backend si corresponde."
