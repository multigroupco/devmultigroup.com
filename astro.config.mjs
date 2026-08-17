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
    // simulation (AI, VECTORIZE) — and that fails on this account with "Could not
    // create remote preview session" because the OAuth token carries an `ai`
    // scope but no `vectorize` one, which takes the whole dev server down with it.
    // Staying local is also the behaviour wrangler.jsonc already documents:
    // VECTORIZE is simply absent in dev and search degrades to a D1 LIKE scan
    // (see src/lib/search.ts). Dev-only — production is unaffected.
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
