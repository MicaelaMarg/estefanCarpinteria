# Build sin Nixpacks: evita EBUSY en node_modules/.cache con cache mounts de BuildKit
FROM node:20-bookworm-slim AS build

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
# Sin NODE_ENV=production para que npm ci instale devDependencies (TypeScript)
RUN npm ci

COPY . .
RUN npm run build

RUN npm prune --omit=dev

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "dist/server.js"]
