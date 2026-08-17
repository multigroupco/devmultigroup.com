/**
 * Live GitHub org numbers for /kaynakca.
 *
 * Unauthenticated GitHub is 60 requests/hour per IP, and Worker egress IPs are
 * shared — so this MUST be cached hard and MUST fail soft. It runs through the
 * same KV `cached()` layer as everything else with a 6-hour TTL, which is four
 * refreshes a day per cache version, and returns `null` on any problem. The
 * page renders its call-to-action either way; only the numbers disappear.
 *
 * Two requests per refresh: the org (repo count, followers) and its repos
 * (stars, forks). Stars are the number worth showing and there is no org-level
 * endpoint for them.
 */

import { cached, NS } from "./cache";
import { reportBackground } from "./sentry";

const ORG = "multigroupco";
const TTL = 6 * 3600;

export interface GithubStats {
  repos: number;
  stars: number;
  forks: number;
  followers: number;
  /** most-starred public repo, for the "öne çıkan" line */
  top: { name: string; stars: number; url: string } | null;
}

const HEADERS = {
  accept: "application/vnd.github+json",
  // GitHub rejects requests with no UA.
  "user-agent": "devmultigroup-web",
};

async function load(env: Env): Promise<GithubStats | null> {
  try {
    const [orgRes, repoRes] = await Promise.all([
      fetch(`https://api.github.com/orgs/${ORG}`, { headers: HEADERS }),
      fetch(`https://api.github.com/orgs/${ORG}/repos?per_page=100&type=public`, {
        headers: HEADERS,
      }),
    ]);
    if (!orgRes.ok || !repoRes.ok) {
      // Silent nulls hid the real cause on the first deploy. Unauthenticated
      // GitHub is 60/hour PER IP and Cloudflare's egress IPs are shared, so a
      // 403 here is the expected failure and worth seeing in Sentry.
      reportBackground(env, new Error(`GitHub ${orgRes.status}/${repoRes.status}`), {
        area: "github/stats",
      });
      return null;
    }

    const org = (await orgRes.json()) as { public_repos?: number; followers?: number };
    const repos = (await repoRes.json()) as {
      name: string;
      html_url: string;
      stargazers_count: number;
      forks_count: number;
      archived?: boolean;
    }[];
    if (!Array.isArray(repos)) return null;

    const live = repos.filter((r) => !r.archived);
    const stars = live.reduce((a, r) => a + (r.stargazers_count || 0), 0);
    const forks = live.reduce((a, r) => a + (r.forks_count || 0), 0);
    const best = live.reduce<(typeof live)[number] | null>(
      (a, r) => (!a || r.stargazers_count > a.stargazers_count ? r : a),
      null,
    );

    return {
      repos: org.public_repos ?? live.length,
      stars,
      forks,
      followers: org.followers ?? 0,
      top: best ? { name: best.name, stars: best.stargazers_count, url: best.html_url } : null,
    };
  } catch (err) {
    reportBackground(env, err, { area: "github/stats" });
    return null;
  }
}

/**
 * Cached org stats.
 *
 * Two layers, because a shared-IP rate limit is the normal case rather than the
 * exception: the 6-hour `cached()` entry is the fast path, and every success is
 * ALSO mirrored to a KV key with no expiry. When GitHub refuses, the last good
 * numbers are served instead of an empty card. They only go stale, never blank.
 */
const LAST = "github:last";

export async function githubStats(env: Env | null): Promise<GithubStats | null> {
  if (!env) return null;
  try {
    const fresh = await cached(
      env,
      NS.github,
      "org",
      async () => {
        const v = await load(env);
        if (v && env.CACHE) {
          // fire-and-forget; a failed mirror must not fail the render
          try {
            await env.CACHE.put(LAST, JSON.stringify(v));
          } catch {
            /* ignore */
          }
        }
        return v;
      },
      TTL,
      // Never cache a failure, or one rate-limited minute blanks the card for
      // the next six hours.
      (v) => v !== null,
    );
    if (fresh) return fresh;

    const stale = await env.CACHE?.get(LAST);
    return stale ? (JSON.parse(stale) as GithubStats) : null;
  } catch {
    return null;
  }
}
