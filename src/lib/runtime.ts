/**
 * Access to the Cloudflare Worker runtime (bindings + env) from Astro.
 *
 * In production this is the live Worker env; during `astro dev` it is the
 * platformProxy emulation backed by local Wrangler state (.wrangler/state).
 */
export function getEnv(locals: App.Locals): Env {
  const env = locals?.runtime?.env;
  if (!env) {
    throw new Error(
      "Cloudflare runtime env is unavailable. Are bindings configured in wrangler.jsonc and is platformProxy enabled?",
    );
  }
  return env;
}

/** Same as getEnv but never throws — returns null when bindings are absent. */
export function tryEnv(locals: App.Locals): Env | null {
  return locals?.runtime?.env ?? null;
}

/** Canonical site origin (override with SITE_URL for previews). */
export function siteUrl(env: Env): string {
  return (env.SITE_URL || "https://devmultigroup.com").replace(/\/$/, "");
}
