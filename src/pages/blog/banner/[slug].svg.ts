import type { APIRoute } from "astro";
import { getEnv } from "@/lib/runtime";
import { getPost } from "@/lib/content";
import { categoryLabel } from "@/lib/ui";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// greedy word-wrap into up to `maxLines` lines of ~`maxChars` characters
function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars && cur) {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines - 1) break;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  const used = lines.join(" ").length;
  if (used < text.length && lines.length) lines[lines.length - 1] = lines[lines.length - 1].replace(/[.,;:]?$/, "…");
  return lines;
}

// Dynamically generated, monochrome banner for blog posts with no cover image.
export const GET: APIRoute = async ({ params, locals }) => {
  const env = getEnv(locals);
  const slug = params.slug;
  let title = "Developer MultiGroup";
  let category = "blog";
  try {
    const post = slug ? await getPost(env, slug) : null;
    if (post) {
      title = post.title;
      category = post.category || "blog";
    }
  } catch {
    /* fall back to defaults */
  }

  const lines = wrap(title, 30, 3);
  const startY = 300 - (lines.length - 1) * 33;
  const tspans = lines
    .map((l, i) => `<tspan x="80" y="${startY + i * 66}">${esc(l)}</tspan>`)
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" fill="none">
  <defs>
    <radialGradient id="g" cx="78%" cy="18%" r="80%">
      <stop offset="0%" stop-color="#1c1c20"/>
      <stop offset="55%" stop-color="#0a0a0b"/>
      <stop offset="100%" stop-color="#000000"/>
    </radialGradient>
    <pattern id="dots" width="34" height="34" patternUnits="userSpaceOnUse">
      <circle cx="1.5" cy="1.5" r="1.5" fill="#ffffff" fill-opacity="0.05"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <rect width="1200" height="630" fill="url(#dots)"/>
  <text x="80" y="108" font-family="Arial, Helvetica, sans-serif" font-size="22" letter-spacing="3" fill="#ffffff" fill-opacity="0.55">DEVMULTIGROUP · ${esc(categoryLabel(category).toUpperCase())}</text>
  <text font-family="Arial, Helvetica, sans-serif" font-size="54" font-weight="700" fill="#ffffff">${tspans}</text>
  <text x="80" y="556" font-family="Arial, Helvetica, sans-serif" font-size="26" fill="#ffffff" fill-opacity="0.5">devmultigroup.com</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
};
