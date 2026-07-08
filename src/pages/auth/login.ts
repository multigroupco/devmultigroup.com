import type { APIRoute } from "astro";
import { getEnv } from "@/lib/runtime";
import { beginLogin } from "@/lib/oidc";

// Start the OIDC login against Warden: mint PKCE/state/nonce, stash them in this
// app's session, and redirect the browser to Warden's authorize endpoint.
export const GET: APIRoute = async ({ request, redirect, session, locals }) => {
  const env = getEnv(locals);
  const requested = new URL(request.url).searchParams.get("redirect") || "/admin";
  const redirectTo = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/admin";

  const { url, tx } = await beginLogin(env, redirectTo);
  await session?.set("oidc_tx", tx);
  return redirect(url, 302);
};

export const prerender = false;
