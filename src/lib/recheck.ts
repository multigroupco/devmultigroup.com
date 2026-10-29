import type { AstroSession } from "astro";

// /admin keeps its own session after a Warden login, so on its own it would keep
// honouring a role that Warden has since taken away. Every few minutes the
// middleware asks Warden (service binding, per-app token) whether the user still
// exists, is not banned, and what their role is now. Same shape as Creed/Spawn,
// on the v2 contract (per-app token + client/freeze kill switches).
const RECHECK_AFTER = 5 * 60 * 1000;

// This app's OAuth client id at Warden; the app token is bound to it.
const CLIENT_ID = "IMIRXhakzBoXdIxiRFAkrhpjQutMcWRZ";

type Status = {
  v: number;
  exists: boolean;
  role: string | null;
  banned: boolean;
  image?: string | null;
  clientDisabled?: boolean;
  frozen?: boolean;
};
type Auth = App.SessionData["auth"];

async function wardenStatus(env: Env, sub: string): Promise<Status | null> {
  if (!env.WARDEN || !env.WARDEN_APP_TOKEN) return null;
  try {
    const r = await env.WARDEN.fetch(`https://warden/api/internal/user-status?id=${encodeURIComponent(sub)}`, {
      headers: { "x-client-id": CLIENT_ID, "x-internal-token": env.WARDEN_APP_TOKEN },
    });
    return r.ok ? ((await r.json()) as Status) : null;
  } catch {
    return null;
  }
}

/** Why Warden wants this session ended, or null if it may stay. */
function revokeReason(s: Status): string | null {
  if (!s.exists) return "deleted";
  if (s.banned) return "banned";
  if (s.clientDisabled) return "client-disabled";
  if (s.frozen && s.role !== "super-admin") return "frozen";
  return null;
}

/** The session identity after a re-check: updated, or null if access was revoked. */
export async function recheckAuth(
  env: Env,
  session: AstroSession,
  auth: Auth,
  onEvent?: (message: string, attrs: Record<string, string>) => void,
): Promise<Auth | null> {
  const now = Date.now();
  if (auth.chk && now - auth.chk < RECHECK_AFTER) return auth;
  const s = await wardenStatus(env, auth.sub);
  // Warden unreachable or non-2xx: keep the session and try again next request.
  if (!s) return auth;
  const reason = revokeReason(s);
  if (reason) {
    session.destroy();
    onEvent?.("auth.revoked", { email: auth.email ?? "unknown", reason });
    return null;
  }
  if (s.role !== auth.role) {
    onEvent?.("auth.role-changed", { email: auth.email ?? "unknown", from: auth.role ?? "none", to: s.role ?? "none" });
  }
  const next: Auth = { ...auth, role: s.role, chk: now };
  session.set("auth", next);
  return next;
}
