import type { APIRoute } from "astro";
import { getEnv } from "@/lib/runtime";
import { completeLogin } from "@/lib/oidc";
import { reportError, logEvent } from "@/lib/sentry";

// OIDC callback: validate state, exchange the code for tokens, verify the ID
// token, and persist the identity (incl. `role`) in this app's own session.
export const GET: APIRoute = async ({ request, redirect, session, locals }) => {
  const env = getEnv(locals);
  const tx = (await session?.get("oidc_tx")) as
    | { state: string; nonce: string; codeVerifier: string; redirectTo: string }
    | undefined;
  if (!tx) return redirect("/auth/login", 302);

  try {
    const identity = await completeLogin(env, new URL(request.url), tx);
    await session?.set("auth", {
      sub: identity.sub,
      email: identity.email ?? null,
      name: identity.name ?? null,
      role: identity.role,
      at: Date.now(),
    });
    await session?.delete("oidc_tx");
    // Admin sign-ins are rare and worth a permanent record.
    logEvent(locals, "info", "auth.signin", {
      email: identity.email ?? "unknown",
      role: identity.role ?? "none",
    });
    const dest =
      tx.redirectTo?.startsWith("/") && !tx.redirectTo.startsWith("//")
        ? tx.redirectTo
        : "/admin";
    return redirect(dest, 302);
  } catch (err) {
    const msg = describeOidcError(err);
    // Surface the precise cause in Worker logs AND in Sentry. This handler
    // returns a Response instead of throwing, so the middleware's capture never
    // sees it — yet a broken OIDC exchange means nobody can reach /admin, which
    // is exactly the kind of failure we must not learn about from a user.
    console.error("[auth/callback] OIDC exchange failed:", msg, err);
    reportError(locals, err, {
      area: "auth/callback",
      request,
      level: "fatal",
      extra: { reason: msg },
    });
    return new Response(`Giriş doğrulanamadı: ${msg}`, {
      status: 400,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
};

// oauth4webapi wraps token/authorization failures in error objects whose real
// reason lives in `error` / `error_description` (e.g. `invalid_client`,
// `invalid_grant`), while `.message` is only the generic
// "server responded with an error in the response body". Unwrap them so the
// admin (and the logs) see what actually went wrong.
function describeOidcError(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as {
      message?: string;
      error?: string;
      error_description?: string;
      status?: number;
    };
    if (e.error) {
      const parts = [e.error];
      if (e.error_description) parts.push(e.error_description);
      if (typeof e.status === "number") parts.push(`HTTP ${e.status}`);
      return parts.join(" — ");
    }
    if (e.message) return e.message;
  }
  return "bilinmeyen hata";
}

export const prerender = false;
