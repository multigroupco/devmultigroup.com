/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

type KVNamespace = import("@cloudflare/workers-types").KVNamespace;
type D1Database = import("@cloudflare/workers-types").D1Database;
type R2Bucket = import("@cloudflare/workers-types").R2Bucket;
type Fetcher = import("@cloudflare/workers-types").Fetcher;

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
  /** Optional override for the canonical site origin. */
  SITE_URL?: string;
  /** Shared secret guarding write/admin endpoints behind Cloudflare Access. */
  ADMIN_TOKEN?: string;
  /** Resend API key for contact-form email delivery (set via `wrangler secret`). */
  RESEND_API_KEY?: string;
}

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {
    /** Email of the Cloudflare Access authenticated admin, when present. */
    adminEmail: string | null;
  }
}
