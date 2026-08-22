---
title: "A shared agent 'top brain' for MultiGroup"
date: 2026-08-22
slug: multigroup-shared-agent-brain
status: resolved (round 2 appended 2026-08-22)
mode: grill (with recommendations — user asked for a call on every question)
delivery: AskUserQuestion (structured)
feature: Org-wide agent platform — persistent, team-shared, gated behind Warden
research: ../../../research-multigroup-shared-agent-brain.md
---

# Grill — a shared agent "top brain" for MultiGroup

## Feature Identified (pre-session)

An org-wide agent layer that "manages everything about MultiGroup": designing mails,
creating + scheduling campaigns in Talaria, writing event copy, answering questions over
six years of community history. Today all of that happens in throwaway assistant sessions
(mostly Furkan's), so **nothing is preserved after the session** — which makes it both
ineffective (every session re-learns the org from scratch) and solo (nobody else on the
team can use what was built). The proposal: a web app, gated behind Warden for the team
only, taught the event mastersheets / team info / how the team works, running on either
Cloudflare Agents or OpenRouter with cheap models. Hard constraint: **must not burn money
it doesn't create.**

**Trigger:** new design, greenfield idea. Furkan is uncertain at *every* point — cost,
maintenance, effectiveness — and explicitly wants it grilled rough, with a recommendation
attached to every question.

## Grounding (pre-grill homework)

*Codebase / estate facts checked before asking anything:*

- The estate is **7 separate repos** under a non-git `MultiGroup/` workspace: `talaria`
  (Next-on-Workers mail app), `devmultigroup.com` (Astro site), `warden` (Better Auth OIDC
  provider), `practical-learning-institute`, `argus` (status page), `strider`, `spawn` (docs only).
- **Talaria already shipped an AI stack** (commit `c604467`, "Cloudflare AI assistant, search,
  analytics & voice index"): `lib/ai/` (Workers AI client, neuron budget + math, embeddings,
  embed queue, brand/voice retriever, Puck schema validator) and `lib/search/` (D1 FTS5 +
  Vectorize blend + rerank). Bindings live in `wrangler.toml`: `AI`, `VECTORIZE`
  (`mail-content-index`, 1024/cosine), `KV`, `EMBED_QUEUE`. **This is not greenfield.**
- Five ADRs already constrain the design: `0001-ai-emits-puck-json`,
  `0002-adopt-vectorize-despite-small-corpus`, `0003-separate-neuron-budget-pool`,
  `0004-estimate-enforces-cf-api-displays`, `0005-reject-managed-ai-search-for-d1-fts5`.
- **Talaria already has an MCP server** (`mcp-server/{server,http,tools}.ts`) whose
  `create_template` / `update_template` force `status=draft` — the human-in-the-loop
  invariant is already encoded there.
- Structured org data already lives in D1, not just in sheets: `devmultigroup-db` has
  `events`, `event_speakers`, `speakers`, `companies`, `partners`, `team_members`,
  `communities`, `posts`, `social_posts`, `recordings`, `podcasts`, `resources`.
  Talaria's `mail-templates-db` has templates, campaigns, contacts, send_events.
  `user-lists/` holds ~40 `.xlsx` attendee exports + a merged 6.829-address mail list.
- **Warden** is the OIDC provider every app federates to — but registering a new relying
  party is a known-broken path (`adminCreateOAuthClient` enforces its own session-cookie
  admin check); the working route is a direct `oauthClient` row insert into `kunye-db`
  plus an introspection proof.
- A prior org-level grill (`cloudflare-arch-level-up/cloudflare-multigroup-flagship.md`)
  already decided the spine is the **bootcamp OS trapped in a 6-tab Google Sheet**, and put
  "AI as seasoning" at capability #7 — explicitly *not* the centre of gravity.

---

## Q1 — Which of the three products is the real one?

**Context.** The pitch contained three separable products under one name: a *preservation* layer
(the stated pain — "gone after the session"), an *action* layer (drive Talaria), and a *team access*
layer (Warden-gated web UI). Only the third actually requires a web app; only the third's success
depends on other people showing up.

**Question.** Which single pain, if fixed while the other two stayed broken, would still be a win?

**Answer.** **All three** — "in this manner we can also consider options like adding mcp to talaria etc."

**Notes.** Scope is deliberately not narrowed. Consequence accepted: the build is now the union of
three products, not the cheapest one. *Recommendation given (preservation-first) was declined.*

**Code-vs-claim contradiction, surfaced inline:** "adding mcp to talaria" — Talaria **already has**
an MCP server (`talaria/mcp-server/{server,http,tools}.ts`): 8 read tools, 4 draft-only write tools,
and an explicit deny-list (`send_campaign`, `schedule_campaign`, every delete) justified in the README
as *"one prompt-injection in a piece of voice-corpus input could blast 5,000 recipients."* But it is
**stdio, spawned by `electron/main.ts` as a subprocess** — unreachable from a web app. The real job is
**remoting an MCP server that exists**, not adding one. Smaller and better-defined than assumed.

---

## Q2 — Who is the second user?

**Context.** Talaria's campaigns are all Furkan's. Spawn's own PRD says the mastersheet is
*"sadece 3 kişinin okuyabildiği."* The org has 32 in `Team List`, 49 in `UNIT Team List`, 112 in
`Team Chart` — but headcount is not adoption.

**Question.** Be honest about the second user.

**Answer.** **The whole core team (~8), eventually.**

**Notes.** "Eventually" is load-bearing and unvalidated. This is the option the research flags hardest:
in-house builds rank **last** on G2 satisfaction, and the most common failure is *"paying for five seats
of a generic assistant nobody configured."* Adoption — not cost — is now the top project risk.
**Open branch:** no validation step was agreed. Revisit before build.

---

## Q3 — What hosts the agent loop?

**Context.** The user's own framing ("cloudflare agents *or* openrouter") is a false binary — one is a
Durable-Object-backed *runtime*, the other a *model router*. They compose. Surfaced inline before asking.

**Question.** Given all three products for ~8 people, what hosts the loop?

**Answer.** **Cloudflare Agents SDK.**

**Notes.** Chosen against the recommendation (buy-3-months-first). Accepted cost, from research:
`agents@0.21.0`, five minor bumps between 2026-06-16 (`v0.16.1`) and 2026-08-22 — on a 0.x line every
minor is breaking; *"We are not accepting external pull requests at this time"*; Project Think
self-labelled *"experimental"*; `@cloudflare/shell` → `@cloudflare/computer` inside four months; and the
June changelog was still fixing WebSocket reconnect and chat-stream replay — the exact paths a chat UI
lives on. What it buys: `this.state` sync, `this.sql`, cron/scheduling, WebSockets, MCP **both**
directions, and durable approval-gated HITL ("pause execution, return pending approval, then replay
from durable log"). Limits are not the constraint: 1 GB state/agent, 30s compute/request, unlimited
wall-clock per step.

---

## Q4 — Who maintains it?

**Question.** Who on the team could fix this if Furkan stopped touching it for two months?

**Answer.** **Nobody — and that's the real cost.**

**Notes.** Direct tension with Q3 recorded and named to the user: a 0.x dependency on a fortnightly
breaking cadence is the specific thing a bus-factor-of-one estate cannot afford. User's call, taken.
**Mitigation agreed as recommendation:** pin `agents` to an exact version (no caret); upgrades are a
scheduled deliberate task, never `npm update`; and — load-bearing — **the org knowledge lives as plain
versioned files outside the agent**, so an SDK break costs a runtime, not the brain. This is the rule
that keeps the decision reversible.

---

## Q5 — What form does the "taught" knowledge take?

**Context.** This is where the maintenance bill lives, not in the SDK. Research is genuinely split and
every pro-retrieval source sells retrieval; the one retrieval source with nothing to sell (InfoQ)
publishes no numbers at all. **No source found publishes a corpus-size crossover between vector search
and keyword search** — anyone quoting one is quoting an opinion.

**Question.** Curated files? Bulk-index into Vectorize? One big brief? Agent self-writes?

**Answer.** **Curated files + live MCP reads** (recommendation taken).

**Notes.** Split by nature of the knowledge: *tacit* (mail-voice rules, event playbooks, campaign-wave
conventions, mastersheet column semantics) → hand-written markdown in a repo. *Factual* (events,
speakers, team_members, campaigns, contacts) → already in D1, read **live** through MCP at query time,
**never copied**. Supporting evidence: Atlan's own LoCoMo table puts in-process/full-context at
**72.9% accuracy** vs flat-vector retrieval at **66.9%** — retrieval bought latency and tokens, not
accuracy, at small scale. DeepSeek V4 Flash's **1.31M context at $0.065/M** makes a 100K-token brief
cost **$0.0065/call**. Counter-pressure to respect: Sourcegraph's *"Agents perform worse with a
100K-token codebase summary than with a 5K-token targeted retrieval"* — so the brief must stay curated
and tight, not grow into a dump.

**Consequence:** Talaria's existing `mail-content-index` Vectorize index (1024/cosine) stays for what it
was built for (template/voice similarity — a genuinely semantic task, per ADR-0002). It does **not**
become the new app's centrepiece, and no second index gets built until D1 FTS5 is proven insufficient.

---

## Q6 — When the brain is confidently wrong, whose job is it to notice?

**Context.** The best-named failure mode in the whole research: *"A highly-retrieved memory about a
user's employer is accurate until they change jobs, at which point it becomes confidently wrong…
Staleness in high-relevance memories is a harder, open problem."* Concurrent multi-writer memory is
called out as *"a liability"* — which is exactly the 8-user case.

**Question.** Nobody's (design it out)? Yours on change? A cron? The team corrects in-UI?

**Answer.** **Nobody's — design it out** (recommendation taken).

**Notes.** Rule now binding: **never store a second copy of anything D1 already owns.** Facts are read
live; only tacit knowledge lives in files, and it changes on human decisions already being made, so
updating it is a line in a PR rather than an unfunded recurring chore. This is the only option where
staleness cannot silently accumulate. Also inherits Redis's hard rule for later, when access differs by
person: *"Semantic similarity is not an access control mechanism"* — permissions must be a
**pre-retrieval hard filter**, never a ranking signal.

---

## Q7 — The mastersheets aren't in D1

**Context.** Surfaced as a hole in the architecture agreed one question earlier. Spawn's `context.md`
locates the mastersheet as `~/Downloads/DMG Team Mastersheet.xlsx` — `Team List` (32), `UNIT Team List`
(49), `Team Chart` (112), `Event Gantt Chart` (1022 rows), `Case List` (1000+), `Kahvesever` — and the
actual weekly task list is *"ayrı bir Google Doc."* None of it is live-readable. So the capability named
first in the pitch was the one the new architecture could not reach.

**Question.** Import to D1? Google Sheets MCP? Curated files? Defer?

**Answer.** **Semantics to files, rows to D1** (recommendation taken).

**Notes.** Column *meanings* (`Case Zone`, `D Charge`, `Case Star`, the ⭐/✳️/🅰️/⚙️ tier emojis) are
tacit, known only to Furkan, and stable → files. Rows get parsed into D1 → live-readable like everything
else. **Not speculative work:** Spawn's `D16` already commits to `Team List` + `UNIT Team List` +
`Team Chart` as the person-graph seed, so this import sits on the critical path of an already-scoped
project. Also note `cloudflare-multigroup-flagship.md` had independently identified the xlsx→events
parser as the natural home for a Rust→WASM module — the same import, third time it has surfaced.
**Open risk:** the team keeps editing in Sheets, so an imported copy drifts unless the team moves off
them. Unresolved — see open branches.

---

## Q8 — Does the brain get to cross Talaria's deny-list?

**Context.** Asked; user first asked back *"does talaria have an mcp?"* — answered with file evidence
(`talaria-mcp` v0.1.0, 12 tools: 8 read + 4 draft-forced write; spawned at `electron/main.ts:69` via
`spawn("node", [mcpEntry])`, i.e. stdio + Electron-only; `@modelcontextprotocol/sdk@^1.0.0` against a
spec that has since moved to `2026-07-28`).

**Answer (partial → a different decision).** *"this needs to be improved from top to bottom electron
part is not used at any point and stale rn. we need a cloudflare integrated proper mcp server there."*

**Verified against the repo:** both `electron/` and `mcp-server/` were last touched by `e1edd42`
(2026-07-08) — the Talaria **rename** commit, no functional change since. `electron@^42.2.0` is still an
unused dependency; both build outputs are gitignored. **The user is right: it is dormant code.**

**Decision recorded.** Rewrite as a **remote MCP server on Workers**: `createMcpHandler` from
`agents/mcp/server` (NOT the now-legacy `McpAgent`), Streamable HTTP at `/mcp`,
`@cloudflare/workers-oauth-provider` federating to Warden, `@modelcontextprotocol/server@2.0.0` against
spec `2026-07-28`. Electron gets deleted from Talaria. Note this is **partly a rewrite, not a port** —
MCP v2 is stateless (no `initialize` handshake, no `Mcp-Session-Id`) and HTTP+SSE is deprecated.
Also note Cloudflare's own MCP docs (updated Jul 27, 2026) still document the **pre-v2** spec and DCR,
which v2 deprecates — building straight from those docs builds against a deprecated auth path.

**STILL OPEN:** the deny-list question itself. A rewrite is precisely when a written safety policy gets
dropped by accident. Re-asked.

---

## Q9 — Does the rewrite carry the deny-list?

**Answer.** **Carry it forward verbatim** (recommendation taken).

**Notes.** The rewrite changes transport and auth, **not policy**. Agent drafts templates, drafts
campaigns, tags contacts, and *proposes* a wave plan as text; a human presses Send and Schedule in the
UI. Rationale that decided it: the voice corpus the agent would be grounded on is **sent email content,
i.e. attacker-reachable text**, so the draft-only invariant is the property that survives prompt
injection. Rejected: un-denying `schedule_campaign` (scheduling is sending, delayed — the one action
whose mistakes surface only after they are irreversible) and full autonomy behind approval gates
(approval fatigue: gate #40 gets clicked like #1–39).

---

## Q10 — Spawn vs the brain

**Answer.** **Brain first — it is Spawn's cheaper 80%** (recommendation taken).

**Notes.** An agent that can READ and EXPLAIN the mastersheet answers *"bura ne amk"* without building
83 tasks of task-board + roster + requests-primitive + gamification. The D1 import is shared work either
way (Spawn `D16` needs the same person-graph seed). **Later refined by the user (Q13):** the brain is
*"a seeded knowledge layer focused on the past"* — genuinely a different product from Spawn, which is
live weekly ops. They are not competitors; the overlap is only the import.

---

## Q11 — Model and gateway

**Answer.** **DeepSeek V4 Flash via OpenRouter** (recommendation taken).

**Notes.** `$0.065/M input, $0.18/M output, 1.31M context` (OpenRouter live listing, Jul 31 2026).
Turkish F1 **0.91** on the only genuine Turkish benchmark found (hand-labelled, n=96, Jun 10 2026) —
against GPT-5.4 mini at **0.68**. Price does not predict Turkish quality. **Caveat carried forward:**
that benchmark measures NER *parsing*, not *generation* — test on real Talaria copy before trusting it
for voice. Two cost notes: OpenRouter's platform fee is **5.5%** on credit purchases with a **$0.80
minimum**, so top up $100 at a time, not $10; and the same benchmark suggests V4 Flash emits substantial
reasoning tokens, so **budget ~2× its sticker price** in practice.
Rejected: Kimi K2.6 on Workers AI ($0.95/$0.16-cached/$4.00, 262K ctx, CF-native, no external key — but
15× the cost and untested in Turkish).

---

## Q12 — Adoption test / kill criterion

**Answer.** **Build it fully, then invite** (recommendation declined).

**Notes.** Recommended was a read-only slice to three named people in two weeks. User's call, taken.
**This is the project's largest unhedged risk and it is recorded as such:** Q2's "~8 eventually" is
unvalidated, and this is the only ordering where that gets tested *after* the expensive part is sunk.
Cheap hedge noted and available for free: reads have no blast radius and land first in the build order
anyway, so a read-only slice is a byproduct rather than extra work.

---

## Q13 — Where it lives

**Answer.** **New repo, own Worker** (recommendation taken).

**Notes.** Matches the estate pattern exactly: one app = one repo = one Worker = one Warden RP = one
Argus monitor + `/api/health` contract. Copy Talaria's `lib/ai` *patterns* rather than depending on them
— there is no monorepo in this estate. Rejected: living inside Talaria (max reuse, but Talaria stops
being the mail app and its three-worker deploy gains a fourth concern) and inside `devmultigroup.com`
(owns the org-fact tables, but the public marketing site would host an internal agent).
**Known friction ahead:** Warden RP registration via `POST /api/oauth-clients/register` is broken
(Better Auth's `adminCreateOAuthClient` enforces its own session-cookie admin check). The working path
is the direct `oauthClient` row insert into `kunye-db` + introspection proof — `argus/scripts/setup-warden-client.sh`
is the reference implementation.

---

## Q14 — Cost ceiling

**Answer.** **Clone the pattern already built twice** (recommendation taken).

**Notes.** Port `lib/email/daily-budget.ts` (reserve-then-reconcile) + the `send_cooldown` breaker, and
`lib/ai/neuron-budget.ts` + `daily_neuron_log` + `neuron_cooldown`. A hard **daily $ cap on OpenRouter
spend**, reserved before the call and reconciled after, with a breaker that trips and stays tripped.
The reasoning that decided it: **the risk is not the ~$6/month average, it is a single runaway agent
loop.** A budget that only watches averages would not catch it.

---

## Q15 — What the six-year archive actually is

**Context.** The user reframed the whole product here, and it changed a prior answer: *"i genuinly want a
seeded knowledge layer focused on the past and it acts like a brain that reasons accordingly. its very
different than spawn."*

**Consequence re-derived inline.** **For historical facts, a snapshot is not a stale copy — it is the
correct artifact.** The Q6 rule ("never store a second copy") was aimed at *live* facts, where a copy
goes silently wrong. History is immutable: the 2024 DevFree attendee list does not drift. **So the
sheet-drift risk of Q13 largely dissolves**, and the live-vs-historical distinction becomes the load-
bearing rule instead. It is also what cleanly separates this from Spawn: Spawn is live weekly ops, this
is institutional memory that reasons.

**Question.** What shape does six years take?

**Answer.** **Digests + raw archive, FTS5 first** (recommendation taken).

**Notes.** Two layers. **Digests** = hand-written per-era and per-event interpretation — what we ran,
who came, what worked, what we would never repeat. That judgement is tacit and no amount of row-scanning
recovers it. **Raw archive** = attendee exports, campaigns, `send_events`, events, speakers into D1 with
**FTS5**, so the agent can drill down ("who came to both DataCommit and Disconnect"). Reason over
digests, verify against rows. **No embeddings until FTS5 is demonstrably insufficient** — and the
failure signal is legible: queries start failing on *meaning* rather than on *words*.
First slice chosen: **the remote Talaria MCP server** (recommendation was the digest files; declined).

---

## Outcome

Fifteen questions over seven rounds. The idea survives, but it is **not the idea that walked in** — it
was reframed twice by the user under questioning, and both reframes made it smaller and more defensible.

**What it actually is now:** a **seeded historical knowledge layer that reasons** — MultiGroup's
institutional memory of six years, plus a draft-only action arm into Talaria — living in its own repo
and Worker, gated behind Warden, built on the Cloudflare Agents SDK, running DeepSeek V4 Flash through
OpenRouter. Explicitly **not** a live-ops system; that is Spawn's job, and the two are now cleanly
separated rather than competing.

**The single most important correction of the session:** the stated fear — "i genuinly do not want this
to burn up money that it doesnt help create" — was aimed at the wrong axis. At 8 users × 30 agentic
sessions/month the inference bill is **~$6/month** and marginal Cloudflare infra is **~$0–1/month** on
top of the $5 Workers Paid already being paid. The unfunded cost is **maintenance hours on a `0.x`
dependency with a bus factor of one**, and every mitigation agreed here (pin exact, knowledge outside
the agent, no second index, no synced copies) is aimed at that instead.

### Resolved decisions

| # | Decision | Chose recommendation? |
|---|---|---|
| 1 | Scope = all three (memory + actions + team access) | ✗ (preservation-first declined) |
| 2 | Users = ~8 eventually, unvalidated | — |
| 3 | Runtime = Cloudflare Agents SDK | ✗ (buy-3-months-first declined) |
| 4 | Maintenance = bus factor 1, accepted; mitigated by pin-exact + knowledge-outside-agent | ✓ |
| 5 | Tacit → curated files; factual → live MCP reads, never a second copy | ✓ |
| 6 | Staleness designed out, not managed | ✓ |
| 7 | Mastersheet: semantics → files, rows → D1 | ✓ |
| 8 | Talaria MCP rewritten as a remote Workers server; Electron deleted | — (user-initiated) |
| 9 | Deny-list carried forward **verbatim** into the rewrite | ✓ |
| 10 | Brain before Spawn; later refined to "different products, shared import" | ✓ |
| 11 | DeepSeek V4 Flash via OpenRouter | ✓ |
| 12 | Build fully, then invite | ✗ (read-only-slice-first declined) |
| 13 | New repo + own Worker + own Warden RP + Argus monitor | ✓ |
| 14 | Daily $ cap with reserve/reconcile + circuit breaker, ported from Talaria | ✓ |
| 15 | Digests + raw archive, **FTS5 first, no new vector index** | ✓ |

### Vocabulary this session sharpened

Worth promoting to a glossary if one is ever started (this estate has no `docs/terms.md`; not created
unprompted):

- **Live fact** — something the org changes going forward (a roster, a venue, a campaign status). Never
  copied; read through MCP at query time. A copy of a live fact goes *silently* wrong.
- **Historical fact** — something that already happened (a 2024 attendee list, a sent campaign's
  `send_events`). Immutable, so a snapshot is the *correct* artifact, not a stale one. **This distinction
  is what resolved the staleness problem.**
- **Digest** — hand-written interpretation of a past era or event: what we ran, what worked, what we
  would never repeat. Tacit judgement that no amount of row-scanning recovers.
- **Raw archive** — the historical rows themselves, in D1 with FTS5, for drilling into and counting.

### Open risks (named, not resolved)

1. **Adoption is unhedged.** "~8 eventually" is the assumption the whole scope rests on, nobody has been
   asked, and the chosen build order tests it *after* the expensive part is sunk. The cheap hedge (a
   read-only slice first) is free — reads land first anyway.
2. **`agents@0.21.x` on a bus factor of one.** Five breaking minors in nine weeks. The pin-exact rule and
   the knowledge-outside-the-agent rule are the whole defence. If the SDK's cadence does not slow, this
   is the thing most likely to kill the project quietly.
3. **Cloudflare's MCP docs are one spec revision stale** (updated Jul 27 2026, spec moved Jul 28 2026).
   Building straight from them builds against DCR, which v2 deprecates with removal after summer 2027.
   Use `createMcpHandler` + CIMD, not `McpAgent` + `clientRegistrationEndpoint`.
4. **The Turkish evidence measures parsing, not writing.** DeepSeek V4 Flash at 0.91 TR F1 is an NER
   result. Run a real taste test on Talaria copy before trusting it for voice.
5. **This has a partial tension with `talaria/docs/adr/0002-adopt-vectorize-despite-small-corpus.md`.**
   That ADR stands for template/voice similarity (genuinely semantic). This session decided FTS5-first
   for the new archive and no second index. Both can be true, but the boundary should be written down.
6. **The thing has no name.** Every other service in this estate has one — Talaria, Warden, Argus,
   Spawn, Strider, Institute. This one is still "the brain."

### ADR candidates (hard-to-reverse + surprising + real trade-off)

Offered, not written — `/adr` writes these:

- **Agents SDK adopted despite a bus factor of one** — the most consequential and most contested decision
  of the session; taken against both the research and the recommendation. (new repo)
- **Talaria MCP rewritten as a remote Workers server; deny-list carried verbatim; Electron deleted** —
  belongs in `talaria/docs/adr/` as 0006. The deny-list clause is the part that must not be lost in a
  rewrite. (talaria)
- **FTS5-first for the historical archive; no second vector index** — needs recording precisely because it
  reads as a reversal of ADR-0002 and is not one. (new repo, cross-linking talaria ADR-0002)
- **Live facts are never copied; historical facts are snapshotted** — the load-bearing architectural rule
  the whole staleness answer rests on. (new repo)
- **Brain before Spawn** — sequencing that may mean Spawn never gets built. (spawn)

---

# Round 2 — implementation, then the vocabulary grill

The first round decided *what to build*. This round built it, and in building it
found that a large part of the "only Furkan knows this" pile was in fact
derivable — which was itself a finding worth recording.

## Named

**Mnemo** (Mneme, the Muse of memory), chosen from four options: Divan, Mnemo,
Sicil, Clio. Repo `MultiGroup/mnemo/`.

## What the build corrected about the plan

**The old MCP server authenticated by replaying a session cookie.**
`mcp-server/http.ts` took a `SESSION_COOKIE` env var and sent it as a raw
`cookie:` header. That — not the transport — is why it was Electron-only, and it
meant the rewrite's real content was the auth model, not `/mcp`. Recorded as
[talaria ADR-0006](../../../talaria/docs/adr/0006-remote-mcp-server-replaces-electron-stdio.md).

**Two credentials, two keys.** `MCP_BEARER_SECRET` is deliberately NOT
`SESSION_SECRET`. Sharing one would mean a leak of either forges both, and
rotating the session secret would silently break MCP.

**"Ayrı Worker" ≠ "ayrı repo".** Talaria already runs `workers/cron/` and
`workers/queue-consumer/` as separate Workers in one repo, so `workers/mcp/` is
the estate's own pattern. The Q13 answer was implemented as written; the
assistant's reading of it was wrong and corrected against the codebase.

**`ChatPane` was dead code.** Still mounted on `app/calendar/page.tsx`, showing
users a stub that read *"see electron/main.ts"* — a file being deleted. Removed
with the shell it belonged to.

## The vocabulary grill — 14 markers, all closed

Furkan answered one at a time. Most are now in
`mnemo/src/brain/mastersheet-semantics.md`.

| # | Question | Answer |
|---|---|---|
| 1 | `Event Code` letters | Type abbreviation. `ie`=Event · `os`=Online Series · `mc`=Academy. One per Gantt sheet. |
| 2 | `Case Star` | Importance/priority. 5★ critical, only 2 of 30. |
| 3 | `D Charge` | Senior accountable lead. Only 3 people ever; absent on small cases. |
| 4 | `Case Runner` | **A mentorship slot** — the developing person. Unguessable. |
| 5 | 27 of 30 cases unfinished | *"Çoğu yapılmadı, ölü bi liste yazılıp bırakıldı."* |
| 6 | All `[POSTPONED]` are Academy | Team capacity: *"uğraşacak vaktimiz olmadı."* |
| 7 | Success thresholds | **None.** *"Sayı tek başına ölçü değil."* |
| 8 | Zero2End = 4 people? | No — **1,000**, and free. See below. |
| 9 | "Bir daha asla" #1 | **Announcements: too late, not repeated enough.** |
| 10 | Speaker `P` | Empty in every file. Ignore. |
| 11 | Kahvesever | Penalty = buying coffee; rank = accumulated **debt**. A shame board. |
| 12 | `Fikir Listesi` → `Case` | Flow existed by design; both lists abandoned. |
| 13 | Speaker `Range` | Was a format scale, corrupted with technology values, 80/93 empty. Unreliable. |
| 14 | `C` column | Leftover. Meaningless. |

Derived without asking: `G`/`Ø` = gender · UNIT `Type` = university type ·
Speaker `Zone` = **technical domain, not geography** · `Case Status` =
`1-Open`→`2-In-plan`→`3-In-prog`→`4-Done` · `b` = Prior/During/After.

**The most valuable single answer** was #4. `Case Runner` holding the *widest*
roster (11 people, against 8 owners and 3 leads) reads as "the person who does
the work" until you learn it is a training position — at which point the case
sheet stops being a task table and becomes a talent-development structure.

**The most valuable non-answer** was #7. Refusing to set a success threshold is
better than setting one: a fixed band would have had the agent labelling a
62-person conference a failure without knowing its context.

## The finding that changed the data's status

Zero2End's export holds **4 rows**; the event page reports **1,000 attended**.
Two gathin records whose slugs differ only by `…-course-…` vs
`…-ml-bootcamp-course-…` — the file belongs to the other one.

That correction moved the AI vertical from 1,085 to **2,085**, nearly level with
mobile (2,721). One bad row had been generating the whole "mobile is far ahead"
conclusion the agent was about to state as fact.

So `event_outcomes` is now **unverified by default** (1 of 36 verified), and the
agent is forbidden from making comparative claims off it. Recorded as
[mnemo ADR-0004](../../../mnemo/docs/adr/0004-outcome-data-is-unverified-by-default.md).

Verification has a ceiling worth knowing: `devmultigroup-db.events` proves an
event existed but has **no attendance column**; gathin's public sitemap carries
only current-year events (1 loose match in 36). Counts live on gathin/Kommunity,
both authenticated.

## Two bugs caught by checking rather than assuming

1. **72 emails in `records.data`.** Redaction cleaned values, but `Katılım Formu`
   has no header row — the first record's cells (a name and an email) became the
   JSON *keys*.
2. **The attendance matrix holds `1`/`0`.** Counting non-empty cells reported
   **100% attendance**, because `0` is not empty. The real figure is 46%, decaying
   63% → 29%, with 2 of 41 completing all 15 sessions. A clean-looking, entirely
   false finding, one assertion away from being written into the brief.

## Outcome of round 2

Both repos green: Talaria 71 tests / 3 tsconfigs clean / Electron gone;
Mnemo 47 tests / tsc clean / `wrangler deploy --dry-run` builds. Archive: 984
rows + 36 outcomes + 15 cohort sessions, **0 contact details in the index**,
re-checked on every seed apply.

ADRs recorded: [talaria 0006](../../../talaria/docs/adr/0006-remote-mcp-server-replaces-electron-stdio.md) ·
[mnemo 0001](../../../mnemo/docs/adr/0001-live-facts-are-never-copied.md) ·
[0002](../../../mnemo/docs/adr/0002-fts5-first-no-vector-index.md) ·
[0003](../../../mnemo/docs/adr/0003-agents-sdk-despite-bus-factor-one.md) ·
[0004](../../../mnemo/docs/adr/0004-outcome-data-is-unverified-by-default.md) ·
[spawn](../../../spawn/decisions-brain-first.md).

**Still open, all needing Furkan:** the OpenRouter key · prod deploy and remote
D1 migration · the remaining two "bir daha asla" categories (speakers/instructors,
team/workload) · verifying the 35 unverified headcounts against Kommunity.
