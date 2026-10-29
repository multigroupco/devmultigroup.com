// devmultigroup.com on the VPS (dmg-stack). Builds the bindings Cloudflare gives
// the Worker, applies pending migrations to both databases, and serves.
//
// Environment (see dmg-stack/.env.example):
//   DATA_DIR       persistent volume (devmultigroup.sqlite, store.sqlite,
//                  kv.sqlite, media/, store-media/, sessions/)
//   PORT           default 8080
//   SITE_URL       optional canonical origin override (default https://devmultigroup.com)
//   CREED_URL      optional Creed origin for the gallery
//   AI_GATEWAY_ID  kept for parity; unused without AI (semantic search is off here)
//   ADMIN_TOKEN, SPAWN_TOKEN, BETTER_AUTH_SECRET, WARDEN_*  only used once the
//                  admin panel is reopened (ADMIN_CLOSED in src/middleware.ts)
//
// Not on Node: AI and VECTORIZE are absent, so search uses the D1 LIKE scan
// (src/lib/search.ts); WARDEN (service binding) is absent.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { d1, kv, migrate, r2, serve } from "./platform.mjs";
import { assets, typedBucket } from "./assets.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const data = path.resolve(process.env.DATA_DIR ?? path.join(root, "data"));
process.env.DATA_DIR = data; // server/session-driver.mjs reads it per request
const port = Number(process.env.PORT ?? 8080);
const clientDir = path.join(root, "dist/client");

// CACHE and SESSION share one KV namespace on Cloudflare; same here.
const cache = kv(path.join(data, "kv.sqlite"), "cache");

const opt = (name) => process.env[name] || undefined;

const env = {
  DB: d1(path.join(data, "devmultigroup.sqlite")),
  STORE_DB: d1(path.join(data, "store.sqlite")),
  CACHE: cache,
  SESSION: cache,
  MEDIA: typedBucket(r2(path.join(data, "media"))),
  STORE_MEDIA: typedBucket(r2(path.join(data, "store-media"))),
  ASSETS: assets(clientDir),
  AI_GATEWAY_ID: process.env.AI_GATEWAY_ID ?? "devmultigroup-search",
  SITE_URL: opt("SITE_URL"),
  CREED_URL: opt("CREED_URL"),
  ADMIN_TOKEN: opt("ADMIN_TOKEN"),
  SPAWN_TOKEN: opt("SPAWN_TOKEN"),
  BETTER_AUTH_SECRET: opt("BETTER_AUTH_SECRET"),
  WARDEN_ISSUER: opt("WARDEN_ISSUER"),
  WARDEN_CLIENT_ID: opt("WARDEN_CLIENT_ID"),
  WARDEN_CLIENT_SECRET: opt("WARDEN_CLIENT_SECRET"),
  WARDEN_REDIRECT_URI: opt("WARDEN_REDIRECT_URI"),
  WARDEN_APP_TOKEN: opt("WARDEN_APP_TOKEN"),
};

for (const [db, dir] of [[env.DB, "migrations"], [env.STORE_DB, "migrations-store"]]) {
  const applied = migrate(db, path.join(root, dir));
  if (applied.length) console.log(`${dir} applied:`, applied.join(", "));
}

const { handler: astro } = await import(path.join(root, "dist/server/entry.mjs"));

// In middleware mode the adapter hands unmatched paths to next(); on Cloudflare
// Astro renders src/pages/404.astro for them. Do the same here: render /404
// (Astro answers it with status 404) with the same bindings.
const handler = (req, res, next, locals) =>
  astro(req, res, () => {
    if (req.url === "/404") return next();
    req.url = "/404";
    return astro(req, res, next, locals);
  }, locals);

serve({ handler, env, clientDir, port });
