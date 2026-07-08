/**
 * OIDC relying-party client for Warden (the MultiGroup identity provider).
 *
 * devmultigroup-web is a standard OAuth 2.1 / OIDC client: it redirects to Warden
 * to authenticate, exchanges the code for tokens, and reads the `role` claim to
 * gate /admin. Uses `oauth4webapi` (panva) — zero deps, Web Crypto only, runs
 * natively on Cloudflare Workers.
 *
 * The resulting identity is kept in this app's OWN session (Astro KV `SESSION`) —
 * OIDC federates *login*, not sessions, so each consumer holds its own session.
 */
import * as oauth from "oauth4webapi";

export interface OidcEnv {
  WARDEN_ISSUER?: string;
  WARDEN_CLIENT_ID?: string;
  WARDEN_CLIENT_SECRET?: string;
  WARDEN_REDIRECT_URI?: string;
  SITE_URL?: string;
}

function cfg(env: OidcEnv) {
  const issuer = env.WARDEN_ISSUER;
  const clientId = env.WARDEN_CLIENT_ID;
  const clientSecret = env.WARDEN_CLIENT_SECRET;
  const redirectUri = env.WARDEN_REDIRECT_URI;
  if (!issuer || !clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Warden OIDC is not configured (WARDEN_ISSUER/CLIENT_ID/CLIENT_SECRET/REDIRECT_URI).",
    );
  }
  return { issuer, clientId, clientSecret, redirectUri };
}

// oauth4webapi enforces HTTPS. For local testing Warden runs on http://localhost,
// so allow insecure requests ONLY for an http:// issuer — prod (https) is never
// affected. Symbol-keyed option spread into every HTTP-making call.
function httpOpts(env: OidcEnv): Record<symbol, boolean> {
  return (env.WARDEN_ISSUER ?? "").startsWith("http://")
    ? { [oauth.allowInsecureRequests]: true }
    : {};
}

// Per-isolate cache of the discovered authorization-server metadata. Discovery is
// a network round-trip; caching it per Worker isolate (not per request) is the
// recommended pattern. Keyed by issuer so a dev→prod issuer switch re-discovers.
const asCache = new Map<string, oauth.AuthorizationServer>();

export async function discover(env: OidcEnv): Promise<oauth.AuthorizationServer> {
  const { issuer } = cfg(env);
  const cached = asCache.get(issuer);
  if (cached) return cached;
  const issuerUrl = new URL(issuer);
  const res = await oauth.discoveryRequest(issuerUrl, { algorithm: "oidc", ...httpOpts(env) });
  const as = await oauth.processDiscoveryResponse(issuerUrl, res);
  asCache.set(issuer, as);
  return as;
}

export interface OidcTx {
  state: string;
  nonce: string;
  codeVerifier: string;
  redirectTo: string;
}

/** Build the authorize URL + the transaction values to persist in the session. */
export async function beginLogin(
  env: OidcEnv,
  redirectTo: string,
): Promise<{ url: string; tx: OidcTx }> {
  const { clientId, redirectUri } = cfg(env);
  const as = await discover(env);

  const codeVerifier = oauth.generateRandomCodeVerifier();
  const codeChallenge = await oauth.calculatePKCECodeChallenge(codeVerifier);
  const state = oauth.generateRandomState();
  const nonce = oauth.generateRandomNonce();

  const url = new URL(as.authorization_endpoint!);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid profile email");
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);

  return { url: url.toString(), tx: { state, nonce, codeVerifier, redirectTo } };
}

export interface KunyeIdentity {
  sub: string;
  email?: string;
  name?: string;
  role: string | null;
}

/** Validate the callback, exchange the code, and return the verified identity. */
export async function completeLogin(
  env: OidcEnv,
  requestUrl: URL,
  tx: OidcTx,
): Promise<KunyeIdentity> {
  const { clientId, clientSecret, redirectUri } = cfg(env);
  const as = await discover(env);
  const client: oauth.Client = { client_id: clientId };
  const clientAuth = oauth.ClientSecretBasic(clientSecret);

  const params = oauth.validateAuthResponse(as, client, requestUrl, tx.state);

  const res = await oauth.authorizationCodeGrantRequest(
    as,
    client,
    clientAuth,
    params,
    redirectUri,
    tx.codeVerifier,
    httpOpts(env),
  );

  const result = await oauth.processAuthorizationCodeResponse(as, client, res, {
    expectedNonce: tx.nonce,
    requireIdToken: true,
    ...httpOpts(env),
  });

  const claims = oauth.getValidatedIdTokenClaims(result);
  if (!claims) throw new Error("Warden did not return a valid ID token.");

  return {
    sub: claims.sub,
    email: typeof claims.email === "string" ? claims.email : undefined,
    name: typeof claims.name === "string" ? claims.name : undefined,
    role: typeof (claims as Record<string, unknown>).role === "string"
      ? ((claims as Record<string, unknown>).role as string)
      : null,
  };
}

/** Roles permitted into /admin. Mirrors Warden `admin({ adminRoles })`. */
export const ADMIN_ROLES = new Set(["super-admin", "admin"]);
