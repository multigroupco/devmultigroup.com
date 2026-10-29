// The ASSETS binding for the Node build: a Fetcher that answers from dist/client,
// like Workers Static Assets. Only GET/HEAD of existing files; everything else 404.
// Used by /api/og to read the logo. Also typedBucket(), below.
import { promises as fsp } from "node:fs";
import path from "node:path";

const TYPES = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif", ".gif": "image/gif", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".pdf": "application/pdf", ".mp4": "video/mp4", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".html": "text/html; charset=utf-8", ".woff2": "font/woff2", ".ttf": "font/ttf" };

export function assets(clientDir) {
  const root = path.resolve(clientDir);
  return {
    async fetch(input, init) {
      const req = input instanceof Request ? input : new Request(input, init);
      if (req.method !== "GET" && req.method !== "HEAD") return new Response(null, { status: 405 });
      let p;
      try {
        p = decodeURIComponent(new URL(req.url).pathname);
      } catch {
        return new Response("Not found", { status: 404 });
      }
      let file = path.join(root, p);
      if (!file.startsWith(root + path.sep) && file !== root) return new Response("Not found", { status: 404 });
      try {
        if ((await fsp.stat(file)).isDirectory()) file = path.join(file, "index.html");
        const body = await fsp.readFile(file);
        const type = TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream";
        return new Response(req.method === "HEAD" ? null : body, { headers: { "content-type": type, "content-length": String(body.length) } });
      } catch {
        return new Response("Not found", { status: 404 });
      }
    },
  };
}

/**
 * An R2 bucket whose objects always carry a content type. Objects copied into
 * the folder by hand (no .meta sidecar) have none, and /media would then answer
 * application/octet-stream; guess it from the key's extension instead.
 */
export function typedBucket(bucket) {
  const fill = (obj) => {
    if (obj && !obj.httpMetadata?.contentType) {
      const type = TYPES[path.extname(obj.key).toLowerCase()];
      if (type) obj.httpMetadata = { ...obj.httpMetadata, contentType: type };
    }
    return obj;
  };
  return {
    ...bucket,
    head: async (key) => fill(await bucket.head(key)),
    get: async (key, opts) => fill(await bucket.get(key, opts)),
  };
}
