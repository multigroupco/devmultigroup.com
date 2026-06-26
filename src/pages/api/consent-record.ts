import type { APIRoute } from "astro";
import { getEnv } from "@/lib/runtime";
import { uuid } from "@/lib/db";
import { sha256Hex } from "@/lib/analytics-server";

export const prerender = false;

// Visitor-facing consent audit sink (KVKK m.11/m.12). The opt-in CMP in
// Analytics.astro POSTs one row here for every consent decision (and the first
// banner_shown). Stores NO PII: only a SHA-256 user-agent hash and a 0.0.0.0 IP.
// Always returns 200 — an audit failure must never block the banner UX. This is
// a direct D1 write that is NOT in the cached content layer, so no cv: bump.

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });

const ACTIONS = new Set(["opt-in", "opt-out", "banner_shown", "settings_change"]);
const CATEGORIES = new Set(["analytics", "marketing", "essential"]);
const SOURCES = new Set(["web_banner", "footer_link", "email_form"]);

export const POST: APIRoute = async ({ request, locals }) => {
  const env = getEnv(locals);
  if (!env.DB) return json({ ok: true });

  let data: Record<string, unknown>;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: "Geçersiz istek." }, 400);
  }

  const action = String(data?.action ?? "");
  if (!ACTIONS.has(action)) return json({ ok: false, error: "Geçersiz işlem." }, 400);

  const categories = Array.isArray(data?.categories)
    ? (data.categories as unknown[]).map(String).filter((c) => CATEGORIES.has(c))
    : [];
  const source = SOURCES.has(String(data?.source)) ? String(data?.source) : "web_banner";
  const sessionId = (String(data?.session_id ?? "").trim().slice(0, 64)) || null;
  const accepted = categories.some((c) => c !== "essential") ? 1 : 0;

  const ua = request.headers.get("user-agent") || "";
  const uaHash = ua ? await sha256Hex(ua) : null;

  try {
    await env.DB.prepare(
      `INSERT INTO consent_records
         (id, session_id, action, categories, source, channel, accepted, ua_hash, ip, created_at)
       VALUES (?, ?, ?, ?, ?, 'web', ?, ?, '0.0.0.0', unixepoch())`,
    )
      .bind(uuid(), sessionId, action, JSON.stringify(categories), source, accepted, uaHash)
      .run();
  } catch {
    /* swallow — never block the UI on an audit write */
  }

  return json({ ok: true });
};
