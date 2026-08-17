// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";

// Astro 5 + @astrojs/cloudflare v12 — SSR on Cloudflare Workers.
// Bindings (D1 / KV / R2) are reached via Astro.locals.runtime.env.
// platformProxy emulates those bindings against local Wrangler state during `astro dev`.
export default defineConfig({
  site: "https://devmultigroup.com",
  output: "server",
  adapter: cloudflare({
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
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "viewport",
  },
  // Dev-only audit overlay (flags remote/public <img>) is noise for this site's
  // intentionally remote/dynamic images — disable it.
  devToolbar: { enabled: false },
  vite: {
    plugins: [tailwindcss()],
  },
});
