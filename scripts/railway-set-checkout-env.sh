#!/usr/bin/env bash
# El link de Railway del repo está en backend/ (railway link hecho ahí).
# Uso: ./scripts/railway-set-checkout-env.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"

FRONT_URL="${PUBLIC_FRONTEND_URL:-https://carpinteria-frontend-production.up.railway.app}"

echo "Directorio: $ROOT/backend (linked)"
echo "PUBLIC_FRONTEND_URL -> $FRONT_URL"
railway variable set "PUBLIC_FRONTEND_URL=$FRONT_URL"

echo "Listo. Railway redeployará el backend si corresponde."
