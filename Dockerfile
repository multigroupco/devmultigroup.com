# devmultigroup.com for the VPS (dmg-stack). The Cloudflare build is untouched:
# this builds with DMG_TARGET=node and runs server/index.mjs.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
# npm install, not npm ci: the lock file comes from macOS and misses some
# Linux-only optional packages; versions still follow the lock file.
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build:node && npm prune --omit=dev --no-audit --no-fund

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8080 DATA_DIR=/data
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/migrations-store ./migrations-store
VOLUME /data
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:8080/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/index.mjs"]
