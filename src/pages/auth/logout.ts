import type { APIRoute } from "astro";
import { getEnv } from "@/lib/runtime";

// Full logout: clear THIS app's session, then redirect to Warden's logout so the
// SSO session is also terminated (otherwise the next /admin visit silently
// re-authenticates). Warden bounces back to this app's home.
const handler: APIRoute = async ({ redirect, session, request, locals }) => {
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

export const GET = handler;
export const POST = handler;
export const prerender = false;
