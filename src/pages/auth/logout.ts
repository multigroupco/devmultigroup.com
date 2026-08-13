import type { APIRoute } from "astro";
import { getEnv } from "@/lib/runtime";

// Full logout: clear THIS app's session, then redirect to Warden's logout so the
// SSO session is also terminated (otherwise the next /admin visit silently
// re-authenticates). Warden bounces back to this app's home.
//
// POST ONLY — on purpose. Logging out is state-changing, and a GET route here is
// a live trap: Astro's viewport prefetcher (`prefetchAll`) fetched the admin
// sidebar's "Sign out" link on every page load, destroying the session and
// bouncing the admin through /auth/login on every single navigation. Anything
// that speculatively fetches links (browser preloading, link scanners, crawlers)
// would do the same. Sign-out is a form submit; see AdminLayout.astro.
export const POST: APIRoute = async ({ redirect, session, request, locals }) => {
  try {
    await session?.destroy();
  } catch {
    await session?.delete("auth");
  }

  const origin = new URL(request.url).origin;
  let wardenOrigin = "https://warden.devmultigroup.com";
  try {
    const issuer = getEnv(locals).WARDEN_ISSUER;
    if (issuer) wardenOrigin = new URL(issuer).origin;
  } catch {
    /* fall back to the prod origin */
  }
  const dest = `${wardenOrigin}/api/logout?redirect_uri=${encodeURIComponent(`${origin}/`)}`;
  return redirect(dest, 302);
};

// A GET here must never log anyone out. Bounce to /admin instead (which is
// itself gated), so an old bookmark or a prefetch is harmless.
export const GET: APIRoute = ({ redirect }) => redirect("/admin", 302);

export const prerender = false;
