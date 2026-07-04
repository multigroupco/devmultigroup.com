import type { APIRoute } from "astro";
import { getEnv } from "@/lib/runtime";

// Full logout: clear THIS app's session, then redirect to Künye's logout so the
// SSO session is also terminated (otherwise the next /admin visit silently
// re-authenticates). Künye bounces back to this app's home.
const handler: APIRoute = async ({ redirect, session, request, locals }) => {
  try {
    await session?.destroy();
  } catch {
    await session?.delete("auth");
  }

  const origin = new URL(request.url).origin;
  let kunyeOrigin = "https://kunye.devmultigroup.com";
  try {
    const issuer = getEnv(locals).KUNYE_ISSUER;
    if (issuer) kunyeOrigin = new URL(issuer).origin;
  } catch {
    /* fall back to the prod origin */
  }
  const dest = `${kunyeOrigin}/api/logout?redirect_uri=${encodeURIComponent(`${origin}/`)}`;
  return redirect(dest, 302);
};

export const GET = handler;
export const POST = handler;
export const prerender = false;
