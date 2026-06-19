# Go-Live checklist

Everything is built, deployed and seeded. These are the steps **you** control —
each is independent and low-risk except the domain cutover, which is the one
deliberate switch.

Live (pre-domain) URL: **https://devmultigroup-web.multigroup-developmet.workers.dev**

---

## 1. Point devmultigroup.com at the new site (the cutover)

> ⚠️ This replaces whatever `devmultigroup.com` currently serves (the old static
> Pages site). Test the workers.dev URL above first. Nothing below was changed
> automatically — the apex domain still serves the old site until you do this.

**Option A — Wrangler (recommended).** Add to `wrangler.jsonc`:

```jsonc
"routes": [
  { "pattern": "devmultigroup.com", "custom_domain": true },
  { "pattern": "www.devmultigroup.com", "custom_domain": true }
]
```

then `npm run deploy`. Wrangler creates the DNS records + TLS certs and routes the
domain to the `devmultigroup-web` worker.

**Option B — Dashboard.** Workers & Pages → `devmultigroup-web` → Settings → Domains
& Routes → **Add Custom Domain** → `devmultigroup.com` (and `www`).

> The `SITE_URL` is already `https://devmultigroup.com` in code, so canonical URLs,
> sitemap, RSS and OG tags are correct the moment the domain is live.

## 2. Cloudflare Access for /admin  ✅ already created

- Application **“MultiGroup Admin”** (`id 87ff966f-92cf-4011-bd7e-cb569cc54b7c`)
  protects `devmultigroup.com/admin` and `/admin/*`.
- Policy **“Allow admins”** currently allows **furkanunsalan@devmultigroup.com**.
- It takes effect automatically once step 1 routes the domain through Cloudflare.

To add more admins: Zero Trust dashboard → Access → Applications → MultiGroup Admin →
Policies → add emails (or a `@devmultigroup.com` domain rule). Login uses the
**One-time PIN** identity provider (email code) by default; enable Google/GitHub SSO
under Zero Trust → Settings → Authentication if you prefer.

The app reads the Access-injected `Cf-Access-Authenticated-User-Email` header — no
app-side passwords exist, which is by design.

## 3. Google Analytics 4

1. Create a GA4 property at <https://analytics.google.com> → copy the **Measurement
   ID** (`G-XXXXXXXXXX`).
2. `/admin/settings` → paste into **Google Analytics 4 ID** → Save.

That's it — the gtag snippet renders site-wide only when the ID is set. No code change.

## 4. Google Search Console

1. <https://search.google.com/search-console> → add a **URL-prefix** property for
   `https://devmultigroup.com`.
2. Choose verification method **HTML tag**, copy the `content="..."` token.
3. `/admin/settings` → paste into **Google Search Console token** → Save → click
   **Verify** in Search Console.
4. Submit the sitemap: `https://devmultigroup.com/sitemap.xml`.

`robots.txt`, `llms.txt` (for AI search), RSS and JSON-LD (Organization, Event,
Article, WebSite) are already in place.

## 5. Fill in the content

All from `/admin`:

- **Events** — to light up the site-wide “new event” banner, add an upcoming event
  and tick **Feature in site banner**. The banner links straight to its
  registration URL (falls back to the Gathin community page).
- **Recordings** — 17 real YouTube playlists are seeded; add a **cover image** URL to
  each for thumbnails (playlists have no fetchable thumbnail by default).
- **Gallery** — upload photos (stored in R2, served via `/media/...`).
- **Team** — only the founder is seeded; add the rest with avatars + socials JSON.
- **Social posts** — the home “Latest from social” wall is curated (no paid API):
  paste a post URL + a screenshot/thumbnail per Instagram/X post. (If you later want
  true inline embeds, the schema has an `embed_html` column ready.)

## Resources created (account `4d41dfaeb65887513d0440c9e42cb0b9`)

| Type   | Name                 | ID / note                                   |
| ------ | -------------------- | ------------------------------------------- |
| Worker | `devmultigroup-web`  | the site                                    |
| D1     | `devmultigroup-db`   | `849d67d6-c0e3-4de3-a241-d9b77fa28cd0`       |
| KV     | `devmultigroup-cache`| `bfcc4b5e3680456ba38cdfcac35bad78` (+SESSION)|
| R2     | `devmultigroup-media`| uploads bucket                              |
| Access | `MultiGroup Admin`   | `87ff966f-92cf-4011-bd7e-cb569cc54b7c`       |

Nothing else in the account was modified.
