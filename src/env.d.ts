/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

type KVNamespace = import("@cloudflare/workers-types").KVNamespace;
type D1Database = import("@cloudflare/workers-types").D1Database;
type R2Bucket = import("@cloudflare/workers-types").R2Bucket;
type Fetcher = import("@cloudflare/workers-types").Fetcher;
type Ai = import("@cloudflare/workers-types").Ai;
type VectorizeIndex = import("@cloudflare/workers-types").VectorizeIndex;

interface Env {
  /** Static assets binding (Astro/CF). Used to read bundled files at runtime (e.g. the OG logo). */
  ASSETS: Fetcher;
  /** Primary content database (blog, events, links, gallery, recordings, team, settings). */
  DB: D1Database;
  /** Shared email-marketing DB; newsletter sign-ups go to contact_lists id 1. */
  MAIL_DB: D1Database;
  /** Read-through cache for D1-backed queries, version-stamped for invalidation. */
  CACHE: KVNamespace;
  /** Object storage for gallery / cover image uploads. */
  MEDIA: R2Bucket;
  /** Workers AI — embeds text for semantic search (bge-m3). Optional: absent in
   *  local dev (no simulation), where search falls back to a D1 LIKE scan. */
  AI?: Ai;
  /** Vectorize index of content embeddings (`devmultigroup-search`). Optional for
   *  the same reason as AI; both must be present for semantic search to run. */
  VECTORIZE?: VectorizeIndex;
  /** Optional override for the canonical site origin. */
  SITE_URL?: string;
  /** Shared secret guarding write/admin endpoints behind Cloudflare Access. */
  ADMIN_TOKEN?: string;
  /** AI Gateway id that embedding calls route through (usage/logs/cost tracking). */
  AI_GATEWAY_ID?: string;
  /** Resend API key for contact-form email delivery (set via `wrangler secret`). */
  RESEND_API_KEY?: string;
  /** MultiGroup Store database (SEPARATE D1): commerce now, Better Auth in v1. */
  STORE_DB: D1Database;
  /** Object storage for store product images (served via /store/media/<key>). */
  STORE_MEDIA: R2Bucket;
  /** Better Auth session signing secret — v1 (customer accounts). */
  BETTER_AUTH_SECRET?: string;

  /** Sentry DSN for SERVER-SIDE (Worker SSR) error capture. Read straight from
   *  env — never D1 — so error reporting survives a database outage. The browser
   *  DSN lives in D1 settings (`sentry_dsn`). See src/lib/sentry.ts. */
  SENTRY_DSN?: string;
  /** Environment tag attached to Sentry events (defaults to production). */
  SENTRY_ENVIRONMENT?: string;
  /** Release tag attached to Sentry events (optional). */
  SENTRY_RELEASE?: string;
  /** Optional env fallbacks for server-side PostHog capture; D1 settings win. */
  POSTHOG_KEY?: string;
  POSTHOG_HOST?: string;

  /** Künye (MultiGroup IdP) OIDC client config for /admin login.
   *  ISSUER includes the /api/auth base path (e.g. https://auth.devmultigroup.com/api/auth).
   *  CLIENT_SECRET is a wrangler secret; the rest can be plain vars. */
  KUNYE_ISSUER?: string;
  KUNYE_CLIENT_ID?: string;
  KUNYE_CLIENT_SECRET?: string;
  KUNYE_REDIRECT_URI?: string;
}

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {
    /** Email of the authenticated admin (now sourced from the Künye session,
     *  formerly Cloudflare Access). Kept as the interface admin pages read. */
    adminEmail: string | null;
    /** The Künye platform role of the current admin (super-admin | admin | …). */
    adminRole?: string | null;
  }

  /** Shape of this app's own session (Astro KV `SESSION`). */
  interface SessionData {
    /** Identity federated from Künye after OIDC login. */
    auth: {
      sub: string;
      email: string | null;
      name: string | null;
      role: string | null;
      at: number;
    };
    /** In-flight OIDC transaction (PKCE/state/nonce) between login → callback. */
    oidc_tx: {
      state: string;
      nonce: string;
      codeVerifier: string;
      redirectTo: string;
    };
  }
}
