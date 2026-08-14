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

// Content Signals (contentsignals.org) — a machine-readable statement of how the
// content may be used, independent of who may crawl it. Our stance: answer
// engines may index us and quote us with a link back, but the corpus is not
// training material.
//
// This line used to come from Cloudflare's *managed* robots.txt, which also
// injected `Disallow: /` for GPTBot/ClaudeBot/CCBot/Google-Extended — the exact
// crawlers this file welcomes below. That contradiction (and an edge-level
// "Block AI bots" rule that 403'd them outright) meant no AI engine could read
// the site at all. Managed robots.txt is now off; the signal we actually want
// lives here, under our control, in one authoritative file.
const CONTENT_SIGNAL = "search=yes, ai-input=yes, ai-train=no, use=reference";

export const GET: APIRoute = ({ site }) => {
  const origin = (site?.origin ?? BRAND.url).replace(/\/$/, "");
  const body = [
    "User-agent: *",
    `Content-Signal: ${CONTENT_SIGNAL}`,
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
