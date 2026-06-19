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
    platformProxy: { enabled: true },
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
