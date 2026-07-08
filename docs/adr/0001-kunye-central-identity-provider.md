# 0001 — Künye: a standalone OIDC identity provider replacing Cloudflare Access on /admin

- **Status:** Accepted
- **Date:** 2026-07-04
- **Context source:** `docs/grills/2026-07-04-shared-auth-identity.md`

## Context

devmultigroup.com's `/admin` was gated by **Cloudflare Access** (no app-side passwords).
We now want **one MultiGroup identity** usable across *separate* apps — first the mailing
tool (**Talaria**), later others — not just this site. The reference we studied
(`kampus/phoenix`) does Better Auth on Cloudflare well but is deliberately **single-app,
same-origin, host-scoped cookies, no OIDC provider** — i.e. the opposite topology from
"share identity across separate deployments."

## Decision

Stand up **Künye**, a standalone **OAuth 2.1 / OIDC identity provider** (its own Worker +
D1 `kunye-db` at `auth.devmultigroup.com`), built on Better Auth's
`@better-auth/oauth-provider` + `jwt` + `admin`. Apps are OIDC **relying parties**:
devmultigroup-web's `/admin` federates to Künye and gates on the `role` claim. **Cloudflare
Access is retired from `/admin`** — Künye is the gate.

Key sub-decisions:
- **Full OIDC** (not shared-cookie / shared-DB). OIDC uses redirect + back-channel token
  exchange, so no cross-subdomain cookie is needed → works on `*.workers.dev` pre-apex-cutover.
- **`@better-auth/oauth-provider`, not `oidcProvider`.** The latter is deprecated, removed
  in BA 1.7, and had 3 CVEs this year. The OAuth 2.1 provider hashes client secrets,
  mandates PKCE, and signs ID tokens asymmetrically by default.
- **Login factor: email + password.** Social/Google deferred.
- **Universal identity with roles** (super-admin/admin/team now; partner/partner-member/
  member reserved). The multi-tenant `organization` plugin is **deferred** to a future ADR.
- **Design: copy** devmultigroup-web's AMOLED system into Künye; **no monorepo** (a
  Storybook design system on its own subdomain is a later drift-killer).
- **Consumer session:** devmultigroup-web keeps its OWN session (Astro KV `SESSION`) from
  the federated login — OIDC federates login, not sessions.

## Consequences

- **Positive:** one login for many apps; a real IdP foundation; `role` claim authorizes
  each RP; no Cloudflare-Access lock-in; workers.dev-testable before the apex cutover.
- **Negative / risks:**
  - Künye is now the **sole gate** on `/admin` — it must be hardened before the apex
    cutover exposes `/admin` publicly (until then it's Furkan-only on workers.dev).
  - We own the login surface Cloudflare Access previously handled (password reset, rate
    limiting — Better Auth covers most).
  - Each RP runs its own session store + the OIDC redirect dance (more moving parts than a
    shared cookie).
  - Building on `@better-auth/oauth-provider` (newer, tracks BA 1.7) means re-diffing the
    schema on version bumps.
- **Reversible?** Hard. Retiring Access and reshaping `/admin` auth + minting an IdP that
  other apps depend on is a load-bearing, one-way-ish commitment — hence this ADR.

## Deferred (future ADRs)

- Adopting the multi-tenant **organization plugin** when a `partner` surface exists.
- Folding the store's planned customer auth (`docs/store/02`) into Künye as a client when
  the `member` surface lands (plan it as a Künye client to avoid a later migration).
