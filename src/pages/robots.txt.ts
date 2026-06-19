import type { APIRoute } from "astro";
import { BRAND } from "@/lib/site";

// AI / answer-engine crawlers we explicitly welcome. They're already permitted by
// the wildcard rule below, but naming them documents intent and future-proofs the
// policy if the wildcard is ever tightened. (Search + training + retrieval bots.)
const AI_AGENTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "anthropic-ai",
  "Claude-Web",
  "Claude-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Google-CloudVertexBot",
  "Applebot-Extended",
  "Amazonbot",
  "Meta-ExternalAgent",
  "cohere-ai",
  "DuckAssistBot",
  "Bingbot",
  "CCBot",
];

export const GET: APIRoute = ({ site }) => {
  const origin = (site?.origin ?? BRAND.url).replace(/\/$/, "");
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /api/",
    "Disallow: /go/",
    "Disallow: /yt/",
    "",
    "# AI / answer engines are welcome",
    ...AI_AGENTS.flatMap((ua) => [`User-agent: ${ua}`, "Allow: /"]),
    "",
    `Sitemap: ${origin}/sitemap.xml`,
  ].join("\n");
  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
};
