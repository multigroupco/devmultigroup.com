import { defineMiddleware } from "astro:middleware";
import { tryEnv } from "./lib/runtime";
import { captureServerException } from "./lib/sentry";
import { isApexHost } from "./lib/site";

// The one host whose pages should be indexable. Every other host that serves
// this Worker (the workers.dev staging URL, www, CF preview deploys) is kept out
// of the search index via X-Robots-Tag so it never competes with the apex —
// canonical tags already point at the apex. Flip nothing here at cutover: once
// devmultigroup.com serves this Worker, the guard simply stops matching.
// Canonical-host detection is shared (isApexHost) so the noindex guard, the
// SSR Sentry capture, the client analytics gate (BaseLayout) and the server
// PostHog gate (analytics-server) all agree on one definition of "the apex".

// Cloudflare Access fronts /admin at the network edge and injects the
// authenticated user's email. This middleware surfaces that email to pages and
// acts as defence-in-depth: in production, no Access header → no admin. It also
// layers on baseline security headers, the staging-noindex guard, and a
// conservative edge cache for SSR HTML.
export const onRequest = defineMiddleware(async (context, next) => {
  const email = context.request.headers.get("Cf-Access-Authenticated-User-Email");
  context.locals.adminEmail = email;
  const dev = import.meta.env.DEV;
  const { pathname, host } = context.url;

  // Render the route, capturing any SSR exception to Sentry before re-throwing
  // so Astro still renders its 500. Capture is fire-and-forget via waitUntil and
  // skipped in dev to keep local errors out of the dashboard.
  const render = async (): Promise<Response> => {
    try {
      return await next();
    } catch (err) {
      // Apex-only error capture: skip dev and any non-canonical host (staging
      // workers.dev / CF previews / www) so only devmultigroup.com reports.
      if (!dev && isApexHost(host)) {
        const env = tryEnv(context.locals);
        const wait = context.locals?.runtime?.ctx?.waitUntil?.bind(context.locals.runtime.ctx);
        if (env) {
          const p = captureServerException(env, err, { request: context.request });
          if (wait) wait(p);
          else await p;
        }
      }
      throw err;
    }
  };

  let response: Response;
  if (pathname.startsWith("/admin")) {
    if (!email && !dev) {
      response = new Response(
        "Forbidden — this area is protected by Cloudflare Access.",
        { status: 403, headers: { "content-type": "text/plain; charset=utf-8" } },
      );
    } else {
      if (!context.locals.adminEmail) {
        context.locals.adminEmail = dev ? "dev@localhost" : null;
      }
      response = await render();
    }
  } else {
    response = await render();
  }

  const h = response.headers;

  // Baseline security headers (trust signals; zero functional risk).
  h.set("X-Content-Type-Options", "nosniff");
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");
  h.set("X-Frame-Options", "SAMEORIGIN");
  h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (!dev) h.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

  // Keep non-canonical hosts (staging/preview/www) out of the index.
  if (!dev && !isApexHost(host)) {
    h.set("X-Robots-Tag", "noindex, nofollow");
  }

  // Short edge cache for SSR HTML — content is KV-cached (≤600s TTL) behind this,
  // so a 60s shared cache + SWR is safe and offloads the Worker for crawlers.
  // Skips admin/api and never overrides a route that set its own cache-control.
  if (
    context.request.method === "GET" &&
    response.status === 200 &&
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/api") &&
    !h.has("cache-control") &&
    (h.get("content-type") || "").includes("text/html")
  ) {
    h.set("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300");
  }

  return response;
});
