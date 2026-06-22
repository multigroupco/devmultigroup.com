import type { APIRoute } from "astro";
import { BRAND } from "@/lib/site";

export const GET: APIRoute = () => {
  const manifest = {
    name: BRAND.name,
    short_name: BRAND.short,
    description: BRAND.description,
    start_url: "/",
    display: "standalone",
    background_color: "#0d0d0e",
    theme_color: "#0d0d0e",
    icons: [
      { src: "/favicon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/favicon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
  return new Response(JSON.stringify(manifest), {
    headers: {
      "content-type": "application/manifest+json; charset=utf-8",
      "cache-control": "public, max-age=86400",
    },
  });
};
