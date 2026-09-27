# SYXTEE Core : image légère (Node + ffmpeg pour les aperçus). Sans régie.
FROM node:24-trixie-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:24-trixie-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg ca-certificates tini fonts-dejavu-core \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production DATA_DIR=/app/data
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY assets ./assets
USER node
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/index.js"]
