/**
 * Server-side PostHog capture for routes that never render a client (redirects
 * like /go/[id], form POST handlers). Speaks PostHog's `/capture` HTTP API
 * directly — no SDK, no bundle. Fire-and-forget; hand the returned promise to
 * `ctx.waitUntil(...)` so it never delays the response.
 *
 * Client-side product events go through `window.dmgTrack` (see Analytics.astro);
 * this is ONLY for the server moments the browser can't see.
 *
 * Config comes from D1 settings (admin-editable, no redeploy) with an env
 * fallback, mirroring how the client keys are resolved.
 *
 * Email distinct_ids are SHA-256 hashed before egress (KVKK K-011): plaintext
 * e-mail PII never reaches PostHog, while the one-way hash still stitches a
 * person's events together across captures.
 */

import type { Settings } from "./types";
import { isApexHost } from "./site";

interface PhConfig {
  key: string;
  host: string;
}

/** Resolve the PostHog project key + ingestion host (settings → env → none). */
export function posthogConfig(env: Env, settings?: Settings): PhConfig | null {
  const key = settings?.posthog_key || env.POSTHOG_KEY || "";
  if (!key) return null;
  const host = (settings?.posthog_host || env.POSTHOG_HOST || "https://eu.i.posthog.com").replace(/\/$/, "");
  return { key, host };
}

/**
 * SHA-256 hex digest via Web Crypto (no deps). Pseudonymizes an e-mail before it
 * is sent to PostHog as a distinct_id (KVKK K-011). Same input → same id, so
 * cross-event person stitching survives without ever transmitting the address.
 */
export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Read a stable distinct_id for this visitor from the PostHog cookie
 * (`ph_<key>_posthog`) so server events attach to the same person the browser
 * SDK created. Falls back to null (caller should treat as anonymous).
 */
export function distinctIdFromRequest(request: Request, key: string): string | null {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  const name = `ph_${key}_posthog`;
  const m = cookie.match(new RegExp(`${name}=([^;]+)`));
  if (!m) return null;
  try {
    const data = JSON.parse(decodeURIComponent(m[1]));
    return typeof data?.distinct_id === "string" ? data.distinct_id : null;
  } catch {
    return null;
  }
}

export interface ServerEventOptions {
  request?: Request;
  distinctId?: string;
  /** When true, `distinctId` is a raw e-mail → SHA-256 hashed before egress (K-011). */
  distinctIdIsEmail?: boolean;
  properties?: Record<string, unknown>;
}

/**
 * Capture a server-side PostHog event. Never throws; resolves immediately when
 * PostHog isn't configured. When the visitor is anonymous we suppress person
 * profile creation so server pings don't inflate the person count.
 */
export async function captureServer(
  env: Env,
  event: string,
  opts: ServerEventOptions = {},
  settings?: Settings,
): Promise<void> {
  const cfg = posthogConfig(env, settings);
  if (!cfg) return;

  // Apex-only, FAIL-CLOSED: never capture from the workers.dev staging URL, CF
  // previews, www, or localhost — only once devmultigroup.com serves this Worker.
  // No request → can't verify the host → don't capture. Mirrors the client gate
  // in BaseLayout and the Sentry gate in middleware (shared isApexHost).
  if (!opts.request) return;
  try {
    if (!isApexHost(new URL(opts.request.url).host)) return;
  } catch {
    return;
  }

  const cookieId = opts.request ? distinctIdFromRequest(opts.request, cfg.key) : null;
  // An e-mail distinct_id is SHA-256 hashed before egress (K-011) so plaintext
  // PII never leaves the Worker; cookie id / random fallback are already opaque.
  const distinctId = opts.distinctId
    ? (opts.distinctIdIsEmail
        ? await sha256Hex(opts.distinctId.trim().toLowerCase())
        : opts.distinctId)
    : cookieId || `srv_${crypto.randomUUID?.() ?? Date.now()}`;
  const anonymous = !opts.distinctId && !cookieId;

  const properties: Record<string, unknown> = {
    $lib: "dmg-worker",
    ...opts.properties,
  };
  // Don't create/merge a person profile for one-off anonymous server pings.
  if (anonymous) properties.$process_person_profile = false;
  if (opts.request) {
    const url = new URL(opts.request.url);
    properties.$current_url = opts.request.headers.get("referer") || url.href;
    // Deliberately do NOT forward the visitor's cf-connecting-ip. "0.0.0.0"
    // tells PostHog to skip IP storage + GeoIP, keeping addresses out of PostHog.
    properties.$ip = "0.0.0.0";
  }

  try {
    await fetch(`${cfg.host}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: cfg.key,
        event,
        distinct_id: distinctId,
        properties,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
    /* fire-and-forget: never let analytics break the request */
  }
}
