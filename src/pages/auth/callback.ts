import type { APIRoute } from "astro";
import { getEnv } from "@/lib/runtime";
import { completeLogin } from "@/lib/oidc";

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
    const dest =
      tx.redirectTo?.startsWith("/") && !tx.redirectTo.startsWith("//")
        ? tx.redirectTo
        : "/admin";
    return redirect(dest, 302);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "bilinmeyen hata";
    return new Response(`Giriş doğrulanamadı: ${msg}`, {
      status: 400,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
};

export const prerender = false;
