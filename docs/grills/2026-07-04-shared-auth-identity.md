---
title: "Shared auth / identity for devmultigroup.com (and sibling apps)"
date: 2026-07-04
status: resolved
slug: shared-auth-identity
feature: Auth for devmultigroup.com, reusable across separate MultiGroup apps
reference: kampus/phoenix (Better Auth + Cloudflare)
---

# Grill: Shared auth / identity for devmultigroup.com

## Feature Identified (pre-session)

**Topic.** Design an authentication/identity approach whose *primary* home is
`devmultigroup.com` (Astro 5 SSR on CF Workers + D1) but which is *also* intended to
serve "other separate ones too" — the sibling projects under `MultiGroup/`
(Acadevia LMS, Luminary, dmg-membership, perseva-store→store, genai-fundamentals,
mail-template-generator, etc.).

**Trigger.** New design. User wants to examine the `kampus/phoenix` reference
(Better Auth on Cloudflare) and be grilled on where to take a MultiGroup-wide auth.

**Reference-vs-goal tension (found before session).** The phoenix reference is
deliberately the *opposite shape* of the stated goal:
- Phoenix = **single** Worker/app, auth **embedded**, **same-origin**, cookies kept
  **host-scoped** to `phoenix.kamp.us` (cross-subdomain cookies explicitly *disabled*
  and unit-tested as absent), **no** organization plugin, **no** OAuth/social, **no**
  OIDC-provider mode. Better Auth 1.6.10, Drizzle adapter over D1, bearer-token fallback
  for the SPA. Auth code lives in `apps/web/worker/features/pasaport/` — not a shared
  package.
- Goal as stated = auth reused across **separate** apps (some on different frameworks —
  Next.js/OpenNext — and one, dmg-membership, currently on **Supabase auth**).
- So the reference answers "how to do Better Auth well in ONE CF app," not "how to
  share identity across many." That gap is the spine of this grill.

**Existing prior art in-repo.** `docs/store/02-BETTER-AUTH-AND-CF-SETUP.md` already
commits a concrete Better Auth plan for the **store**: customers-only, sessions in a
**separate** `STORE_DB` (D1), per-request `createAuth(env)` factory, admin stays behind
**Cloudflare Access** (no admin login built), *not* the organization plugin. Any
"shared auth" must reconcile with (supersede? coexist with?) that decision.

**Current admin auth.** `/admin` on devmultigroup.com is gated by **Cloudflare Access**
(Zero Trust) — no app-side passwords by design; `Cf-Access-Authenticated-User-Email`
header + middleware defence-in-depth.

---

## Session Log

### Q1 — What is the actual shape of "shared"? (Central IdP / shared cookie realm / shared package / shared DB)

**Answer.** "Central identity provider, I guess." Main *other* consumer = the **mailing
tool** (mail-template-generator). Also *considering* making devmultigroup.com a
**monorepo** that hosts the auth too — not sure yet.

**Context found.** The mailing tool is a **separate Next.js / OpenNext Worker** deploy,
Drizzle + its own D1 (`mail-templates-db`), and has **no user auth today** (only a cron
bearer-token check → 401). Notably, `mail-templates-db` is **already bound into
devmultigroup.com's worker as `MAIL_DB`** — so the two already share a data plane.

**Notes.** Central IdP (federation) and "monorepo hosting auth" (consolidation) pull in
different directions — flagged for Q2. A monorepo is a *code-organization* choice; it
does **not** by itself let two apps share a login session. Sharing is decided by whether
they are **one Worker or many**, and what **domain** they're on.

### Q2 — Consolidate (fold into one Worker, phoenix-style) or Federate (standalone IdP)?

**Answer → DECISION: Federate (Road 2).** Concretely:
- **Don't touch the mailing tool.**
- **New auth D1 + new Worker**, deployed to **`auth.devmultigroup.com`**.
- The 2 apps (devmultigroup.com + mailing tool) **connect to** this central auth.
- **Phase 1 milestone:** only the **`/admin`** route consumes auth, via a **super-user
  seeded later** (for Furkan).
- Hard requirement: **test locally against prod infra.**
- Wants **unique service names** for the auth system *and* the mailing tool (à la
  phoenix's "pasaport").

**Notes / open risks flagged for later drilling:**
1. **Validation mechanism unspecified** — how does a *different* Worker
   (devmultigroup-web) verify a session cookie minted by the auth Worker? (shared DB
   read vs HTTP get-session vs JWT/JWKS vs full OIDC) → Q3.
2. **Apex-cutover collision** — cross-subdomain cookies need domain `.devmultigroup.com`,
   but the app is still served from `*.workers.dev` (apex cutover pending). A
   `.devmultigroup.com` cookie is invisible to a worker on `workers.dev`. → to drill.
3. **Access-vs-BetterAuth for /admin** — today `/admin` is Cloudflare Access (no app
   passwords). A super-user login means **replacing/**layering** Access. This reverses
   the `docs/store/02` stance (which keeps Access for admin). → to drill.
4. **"Local vs prod-infra" + cross-subdomain cookies on localhost** don't naturally
   coexist. → to drill.

### Q3 — Cross-Worker session validation mechanism?

**Answer.** Picked **(4) full OIDC provider**. Reiterated (2nd time) the hard requirement:
**must be able to test locally properly.** Also: **auth pages must use the same design
system as `devmultigroup-web`** (AMOLED monochrome, Space Grotesk/Inter/JetBrains Mono,
Tailwind v4 `@theme`). Mailing tool name **settled: `Posta`**. Wants **more name ideas
for the auth provider**.

**Notes / risks to confront (Q4):**
- OIDC **federates login, not sessions** — each consumer app (devmultigroup-web, Posta)
  must run its **own** Better Auth client + its **own session table**, and do a
  **cross-origin redirect dance**. "Central IdP" adds a provider *on top of* per-app
  auth; it doesn't remove per-app sessions.
- That cross-origin redirect + localhost redirect-URI registration is **exactly what
  makes "test locally against prod infra" hardest** — the friction he keeps flagging.
- Separate-worker + separate-DB is a *fixed* decision and is **orthogonal** to the seam;
  seam (1) shared-DB-read would also satisfy it with far less machinery.
- **Design-system match** for auth pages ⇒ auth worker likely wants to be **Astro**
  reusing `global.css`/fonts/`BaseLayout` ⇒ reintroduces a **shared design package /
  monorepo** consideration (code-sharing, not auth-sharing). → drill after seam.

### Q4 — OIDC now vs phased seam?

**Answer → DECISION: Full OIDC, committed.** Testing plan resolved:
- Nothing is live except the **mailing tool at `talaria.devmultigroup.com`** (live, but
  used only by Furkan) — devmultigroup.com apex is **not** cut over yet.
- Therefore: **test on the live `workers.dev` deployment.** Register the OIDC client
  **redirect URI as the `devmultigroup-web.*.workers.dev` URL** (not the apex
  `devmultigroup.com`), plus a `localhost` URI for local dev.

**Consequence (resolves an earlier risk).** OIDC = redirect + back-channel token
exchange, **not** a shared cookie. Each consumer keeps its **own same-origin session
cookie**. So the `.devmultigroup.com` cross-subdomain cookie is **not needed**, and the
**apex-cutover cookie blocker (Q2 risk #2) is MOOT** for this design. `workers.dev`
pre-cutover is fine as an OIDC client.

**Naming.** Rejected **Posta** too. Wants to **decide names now** — unique, understandable,
Turkish — for both the auth service and the mailing service. (Explicitly asked to stop
grilling for this turn and converge on names.)

**Still-open branches (do NOT ask this turn; resume after names):**
- Consumer-side session store location (devmultigroup-web needs its own OIDC-client
  session table — where? `devmultigroup-db`?).
- **Cloudflare Access vs OIDC login for `/admin`** — replace or layer? (reverses store doc)
- Super-user seeding + how the app authorizes "this OIDC identity = admin".
- Design-system reuse on the auth worker → shared design package / monorepo question.
- OIDC client registration model (static vs dynamic) + where client secrets live.

### Q5 — Service names (auth + mail)

**Answer → NAMES LOCKED:**
- **Auth / identity service = `Künye`** (Turkish: ID tag / credential). Becomes the
  worker name, D1 name (`kunye-db`), package name, and the OIDC **issuer (`iss`)**.
- **Mailing service = `Talaria`** (Turkish: postman). Renames `mail-template-generator`.

(Process note: rejected the picker + first batches; chose from a 20-each table.)

### Q6 — `/admin` gate: Künye/OIDC REPLACE Cloudflare Access, or layer behind it?

**Answer → DECISION: REPLACE.** `/admin` login becomes the Künye OIDC flow; Cloudflare
Access is removed from `/admin`. Login **factor = email + password** (Q6b); **social
providers deferred** ("next step stuff"). Super-user = one seeded row with a password
hash (Better Auth handles scrypt + rate-limit + sessions).

**Consequences captured:**
- Middleware gate swaps `Cf-Access-Authenticated-User-Email` header check → "valid Künye
  session + admin role." Keep the `import.meta.env.DEV → dev@localhost` bypass for local.
- Edge gate is gone → Künye is the *sole* thing in front of `/admin` (unsanitised
  markdown render, R2 upload, D1 writes). Acceptable while it's just Furkan on
  workers.dev; **Künye must be hardened before apex cutover exposes `/admin` publicly.**

### Q7 — Künye scope: staff-only SSO, or universal MultiGroup identity?

**Answer → DECISION: Universal identity with a managed role system.** Künye hosts a
**super-admin route** where Furkan manages users/roles.

**Role taxonomy (stated):** super-admin, admin, team, partner, partner-member, member.

### Q8 — Role model: is "partner" an org (multi-tenant) or a flat role? + hierarchy?

**Answer → SCOPE NARROWED (user: "don't dig into details").** Phase 1 **implements only
`super-admin`, `admin`, `team`** — "there is no surface for the others yet."

**Resolved / deferred:**
- **partner / partner-member / member = reserved, not built** (no surface yet).
- **Organization (multi-tenant) plugin = DEFERRED** — do NOT adopt now; keeps
  phoenix/store single-tenant stance intact. Revisit when a **partner** surface exists;
  that adoption will be a **future ADR** (multi-tenant is stance-reversing + hard to
  reverse).
- Global roles for now are a **flat, staff-tier set** (super-admin/admin/team).
- **Store customer auth (`docs/store/02`, separate BA in `STORE_DB`) STANDS for now** —
  store MVP is guest-checkout-first, so customer auth isn't built yet; when the `member`
  surface lands, the store's future customer auth should be a **Künye client** rather
  than standalone (forward note, not a phase-1 task).
- **Forward-compat caution:** don't hard-encode `partner`/`member` as flat roles in a way
  that blocks the later org model — reserve the values, don't build behavior around them.

### Q9 — Design-system delivery for Künye's pages

**Answer → DECISION: Copy the design into a standalone Künye Astro app for phase 1.
No monorepo** (explicitly dropped). Accept the drift risk for now.

**Future idea (not phase 1):** a proper **design system published via Storybook** on its
own **subdomain** — this becomes the real drift-killer later (single source of visual
truth all apps consume). User asked for **name ideas** for that design system.

**Künye stack implied:** Künye is an **Astro app** (same stack as devmultigroup-web) so it
can reuse `global.css` + Fontsource + a minimal `BaseLayout` — hosts both the **login
page** and the **super-admin console**.

### Q10 — Remaining build defaults (client session / client registration / local testing)

**Answer → CONFIRMED (rubber-stamped) + design-system naming parked.** Proceed to full
implementation; ping only if blocked.

- **B — client session:** devmultigroup-web reuses its **existing Astro KV `SESSION`
  store** for the post-OIDC local session (no new Better Auth client tables in
  `devmultigroup-db`); a light **Workers-compatible OIDC client** does the code exchange.
- **C — client registration:** **static** OAuth-application rows in `kunye-db` (one for
  devmultigroup-web, one for Talaria later); each app's `client_secret` = a wrangler secret.
- **Local testing:** Künye deployed for real; consumers tested on `*.workers.dev` +
  `localhost` (both registered redirect URIs); `wrangler dev --remote` so local hits the
  real Künye + `kunye-db`.
- **Design-system name:** parked (candidates: **Desen** / **Atölye** / **Kalıp**).

---

## Outcome

**Status: resolved.** The design is settled; implementation is underway.

### Final decisions (the spec)

1. **Topology — Federated central IdP.** A standalone **Künye** Astro Worker with its own
   D1 (`kunye-db`) at **`auth.devmultigroup.com`**. NOT consolidation; the reference
   (phoenix, single-app embedded auth) informed *how to do Better Auth on CF*, not the
   topology. Apps are clients.
2. **Seam — Full OIDC** (`better-auth` `oidcProvider`). Redirect + back-channel token
   exchange; **no shared cookie** → `workers.dev` pre-cutover is fine.
3. **Names — `Künye`** (identity, = OIDC `iss`), **`Talaria`** (mail, renames
   `mail-template-generator`). Design system later: *Desen/Atölye/Kalıp* (parked).
4. **`/admin` gate — Künye REPLACES Cloudflare Access.** Login = **email + password**;
   social deferred. Middleware swaps the `Cf-Access-…-Email` check → Künye session + role;
   keep the `DEV → dev@localhost` bypass.
5. **Identity — Universal**, with a Künye-hosted **super-admin management console**. Roles
   now: **super-admin, admin, team** (flat). Reserved (no surface yet): partner,
   partner-member, member. **Organization/multi-tenant plugin DEFERRED** (future ADR when
   a partner surface exists).
6. **UI — copy** devmultigroup-web's AMOLED design into the standalone Künye app; **no
   monorepo**. Storybook design system on its own subdomain is a *later* drift-killer.
7. **Client wiring — B/C/local** confirmed as above.

### Deferred / open risks (not phase-1 blockers)
- Künye is the *sole* gate on `/admin` once Access is removed → **harden before apex
  cutover** exposes it publicly.
- Store customer auth (`docs/store/02`) stands standalone for now; **fold into Künye as a
  client when the `member` surface lands** (avoid a later customer migration by planning
  it as a Künye client from the start).
- **Multi-tenant org model** (partner/partner-member) → revisit + ADR when needed.
- Copy-not-package **design drift** until the Storybook system exists.

### ADR-worthy decisions (flagged)
- **"Central identity via a standalone OIDC provider (Künye), replacing Cloudflare Access
  on `/admin`"** — hard-to-reverse, reverses phoenix/store single-tenant-embedded stance,
  real trade-off. → capture as `docs/adr/` during implementation.
- **Future:** adopting the multi-tenant organization plugin (when partner surfaces).

### Next (implementation)
Build Künye (Better Auth email+password + `oidcProvider`, `kunye-db` migrations, login +
super-admin console in copied AMOLED UI, super-user seed script) → wire devmultigroup-web
`/admin` as the first OIDC client (Workers OIDC client + Astro KV session + middleware
rewire) → run locally, then deploy on user's go-ahead.

---

## Implementation status (2026-07-04) — BUILT & VALIDATED LOCALLY

**Plugin correction:** `oidcProvider` is deprecated + removed in BA 1.7 (3 CVEs this year)
→ switched to **`@better-auth/oauth-provider`** (OAuth 2.1, OIDC-compatible, hashed
secrets, mandatory PKCE, asymmetric JWTs). Satisfies "full OIDC" on the safe track.

**Künye** (new app at `MultiGroup/kunye/`, deploys to `auth.devmultigroup.com`):
- `better-auth` 1.6.23 + `@better-auth/oauth-provider` + `jwt` + `admin`; Kysely
  `D1Dialect` (`kysely-d1`), `transaction:false`; per-request `createAuth(env)` factory.
- `kunye-db` migration (all BA core + admin + jwt + oauth-provider tables, hand-ported
  from installed plugin schemas; dates as TEXT — validated).
- Roles via access-control: super-admin/admin/team (+ reserved member). AMOLED login +
  super-admin console (copied design). Admin-guarded client-registration endpoint.
- **Verified locally:** signup, session (dates round-trip), console, `/.well-known/
  openid-configuration`, `/jwks` (EdDSA), client registration (skip_consent + PKCE).

**devmultigroup-web** (OIDC relying party):
- `oauth4webapi` client (`src/lib/oidc.ts`) + `/auth/{login,callback,logout}`; identity
  in Astro KV `SESSION`. Middleware `/admin` gate swapped Cloudflare Access →
  Künye session + `role` claim (dev bypass kept). Sign-out → `/auth/logout`.
- **Verified locally: full OIDC dance passes end-to-end** — login→authorize→(trusted,
  no consent)→callback w/ code→token exchange→ID-token verified→`/admin` renders as the
  real Künye identity (`furkan@teachfluence.com`, role super-admin), not the dev bypass.

**Docs:** `kunye/CLAUDE.md` (guide + deploy runbook), this ADR
[`0001-kunye-central-identity-provider.md`], devmultigroup-web `CLAUDE.md` auth section
updated.

**Remaining = human-only (deploy):** `wrangler d1 create kunye-db` + real id, migrate
remote, `wrangler secret put BETTER_AUTH_SECRET`, deploy Künye to workers.dev, bootstrap
super-admin (`KUNYE_ALLOW_SIGNUP=1` → signup → seed → unset), register the prod client,
set devmultigroup-web `KUNYE_*` secrets/vars, later the `auth.devmultigroup.com` custom
domain. Nothing remote touched yet.








