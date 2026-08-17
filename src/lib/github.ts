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
    if (!orgRes.ok || !repoRes.ok) return null;

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

/** Cached org stats, or null when GitHub is unreachable / rate-limiting. */
export async function githubStats(env: Env | null): Promise<GithubStats | null> {
  if (!env) return null;
  try {
    return await cached(
      env,
      NS.github,
      "org",
      () => load(env),
      TTL,
      // Never cache a failure: a rate-limited minute would otherwise blank the
      // card for the next six hours.
      (v) => v !== null,
    );
  } catch {
    return null;
  }
}
