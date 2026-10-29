// @ts-check
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";

// Astro 5 + @astrojs/cloudflare v12 — SSR on Cloudflare Workers.
// Bindings (D1 / KV / R2) are reached via Astro.locals.runtime.env.
// platformProxy emulates those bindings against local Wrangler state during `astro dev`.
//
// DMG_TARGET=node builds for the VPS instead (dmg-stack): @astrojs/node in
// middleware mode, served by server/index.mjs, which supplies the same bindings
// on locals.runtime.env from server/platform.mjs. Sessions then live in files
// under DATA_DIR/sessions (server/session-driver.mjs) instead of KV, and images
// are not transformed (noop service). /api/og serves the static fallback image
// (workers-og is Workers-only). The Cloudflare build below is unchanged.
const NODE = process.env.DMG_TARGET === "node";

export default defineConfig({
  site: "https://devmultigroup.com",
  output: "server",
  adapter: NODE
    ? node({ mode: "middleware" })
    : cloudflare({
        // `remoteBindings: false` keeps `astro dev` fully local. Wrangler 4.x
        // otherwise opens a REMOTE proxy session for the bindings that have no local
        // simulation (AI, VECTORIZE), and on this account that session cannot be
        // created: it calls
        //   GET /accounts/<id>/workers/subdomain/edge-preview
        // which fails with "Could not create remote preview session on your account",
        // taking the whole dev server down before a single route renders. That is an
        // account-level edge-preview subdomain problem, NOT a missing OAuth scope —
        // re-running `wrangler login` does not fix it (verified 2026-08-17).
        // Staying local is also the behaviour wrangler.jsonc already documents:
        // VECTORIZE is simply absent in dev and search degrades to a D1 LIKE scan
        // (see src/lib/search.ts). Dev-only — production is unaffected, and the
        // deploy path never touches this.
        platformProxy: { enabled: true, remoteBindings: false },
        imageService: "compile",
      }),
  ...(NODE
    ? {
        image: { service: { entrypoint: "astro/assets/services/noop" } },
        session: { driver: fileURLToPath(new URL("./server/session-driver.mjs", import.meta.url)) },
        // On Node, Astro trusts the Host / X-Forwarded-* headers only for these
        // hosts; any other host becomes "localhost", which would break Astro.url,
        // the apex noindex guard and the CSRF origin check behind the proxy.
        security: { allowedDomains: [{ hostname: "devmultigroup.com" }, { hostname: "**.devmultigroup.com" }] },
      }
    : {}),
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "viewport",
  },
  // Dev-only audit overlay (flags remote/public <img>) is noise for this site's
  // intentionally remote/dynamic images — disable it.
  devToolbar: { enabled: false },
  vite: {
    plugins: [tailwindcss()],
    // workers-og needs Workers-only APIs; on Node /api/og falls back to the static image.
    ...(NODE ? { resolve: { alias: { "workers-og": fileURLToPath(new URL("./server/og-fallback.mjs", import.meta.url)) } } } : {}),
  },
});
