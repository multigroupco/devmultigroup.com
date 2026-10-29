// dmg-platform: the Cloudflare bindings our apps use, rebuilt for a plain Node
// server, so the same Astro code runs on Workers and on the VPS.
//
// Vendored (copied) into each app as server/platform.mjs, the same way the
// design system is copied: no monorepo, no package registry. Change it here in
// dmg-stack first, then copy it to the apps (scripts/sync-platform.sh).
//
//   D1          -> SQLite file (better-sqlite3), same SQL, same result shape
//   R2          -> a folder on disk, metadata in a JSON sidecar per object
//   KV          -> a table in a SQLite file, with TTLs
//   send_email  -> SMTP (nodemailer), configured with SMTP_URL
//   service     -> fetch() to another container on the Docker network
//   ratelimit   -> in-memory fixed window
//   analytics engine -> rows in a SQLite table
//   cron        -> croner, calling the app's scheduled handler (cronRoute)
//
// Notes learned while moving the apps:
//   - Astro on Node ignores the Host header unless security.allowedDomains lists
//     it; set it in the Node build or every URL looks like localhost.
//   - Tailwind v4 scans server/: add `@source not "<path>/server"` to the CSS.
//   - Don't open the .sqlite files from the host while a container uses them
//     (Docker Desktop on macOS): it can drop the WAL. Use `docker compose exec`.
//
// Plus serve(): an HTTP server that serves dist/client statically and hands
// everything else to Astro's Node handler with locals.runtime = { env, ctx, cf }.

import { createReadStream, existsSync, mkdirSync, promises as fsp, readdirSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { Readable } from "node:stream";
import { createHash, randomUUID } from "node:crypto";
import Database from "better-sqlite3";

// ── D1 ─────────────────────────────────────────────────────────────────────

class D1Statement {
  constructor(db, sql, params = []) {
    this.db = db;
    this.sql = sql;
    this.params = params;
  }
  bind(...params) {
    return new D1Statement(this.db, this.sql, params.map(toSqlite));
  }
  #stmt() {
    return this.db.prepare(this.sql);
  }
  async first(column) {
    const s = this.#stmt();
    if (!s.reader) {
      s.run(...this.params);
      return null;
    }
    const row = s.get(...this.params) ?? null;
    if (row && column) return row[column] ?? null;
    return row;
  }
  async all() {
    return this.#allSync();
  }
  #allSync() {
    const started = performance.now();
    const s = this.#stmt();
    if (s.reader) {
      const results = s.all(...this.params);
      return { success: true, results, meta: meta(started, 0, 0, results.length) };
    }
    const info = s.run(...this.params);
    return { success: true, results: [], meta: meta(started, info.changes, Number(info.lastInsertRowid)) };
  }
  async run() {
    return this.#allSync();
  }
  async raw(opts = {}) {
    const s = this.#stmt();
    if (!s.reader) {
      s.run(...this.params);
      return [];
    }
    const rows = s.raw(true).all(...this.params);
    if (opts.columnNames) return [s.columns().map((c) => c.name), ...rows];
    return rows;
  }
  _runSync() {
    return this.#allSync();
  }
}

function meta(started, changes, lastRowId, rowsRead = 0) {
  return { duration: performance.now() - started, changes, last_row_id: lastRowId, changed_db: changes > 0, rows_read: rowsRead, rows_written: changes, size_after: 0 };
}

function toSqlite(v) {
  if (v === undefined) return null;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v instanceof ArrayBuffer) return Buffer.from(v);
  if (ArrayBuffer.isView(v)) return Buffer.from(v.buffer, v.byteOffset, v.byteLength);
  return v;
}

/** A D1Database backed by one SQLite file. */
export function d1(file) {
  mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.pragma("foreign_keys = ON");
  return {
    _db: db,
    prepare: (sql) => new D1Statement(db, sql),
    async batch(stmts) {
      const tx = db.transaction(() => stmts.map((s) => s._runSync()));
      return tx();
    },
    async exec(sql) {
      const started = performance.now();
      db.exec(sql);
      return { count: sql.split(";").filter((x) => x.trim()).length, duration: performance.now() - started };
    },
    async dump() {
      throw new Error("dump() is not supported on the Node platform; copy the .sqlite file instead");
    },
    withSession() {
      return this;
    },
  };
}

// ── R2 ─────────────────────────────────────────────────────────────────────

const safeKey = (key) => {
  const k = String(key).replace(/^\/+/, "");
  if (!k || k.split("/").some((p) => p === ".." || p === "")) throw new Error("bad key");
  return k;
};

class R2Object {
  constructor(key, meta, file, range) {
    this.key = key;
    this.size = meta.size;
    this.etag = meta.etag;
    this.httpEtag = `"${meta.etag}"`;
    this.uploaded = new Date(meta.uploaded);
    this.httpMetadata = meta.httpMetadata ?? {};
    this.customMetadata = meta.customMetadata ?? {};
    this.version = meta.etag;
    this.checksums = {};
    this.storageClass = "Standard";
    this.range = range;
    this._file = file;
  }
  writeHttpMetadata(headers) {
    const h = this.httpMetadata;
    if (h.contentType) headers.set("content-type", h.contentType);
    if (h.contentLanguage) headers.set("content-language", h.contentLanguage);
    if (h.contentDisposition) headers.set("content-disposition", h.contentDisposition);
    if (h.contentEncoding) headers.set("content-encoding", h.contentEncoding);
    if (h.cacheControl) headers.set("cache-control", h.cacheControl);
    if (h.cacheExpiry) headers.set("expires", new Date(h.cacheExpiry).toUTCString());
  }
}

class R2ObjectBody extends R2Object {
  get body() {
    if (!this._body) {
      const opts = this.range ? { start: this.range.offset, end: this.range.offset + this.range.length - 1 } : {};
      this._body = Readable.toWeb(createReadStream(this._file, opts));
    }
    return this._body;
  }
  get bodyUsed() {
    return !!this._used;
  }
  async arrayBuffer() {
    this._used = true;
    const buf = await fsp.readFile(this._file);
    const slice = this.range ? buf.subarray(this.range.offset, this.range.offset + this.range.length) : buf;
    return slice.buffer.slice(slice.byteOffset, slice.byteOffset + slice.byteLength);
  }
  async text() {
    return new TextDecoder().decode(await this.arrayBuffer());
  }
  async json() {
    return JSON.parse(await this.text());
  }
  async blob() {
    return new Blob([await this.arrayBuffer()], { type: this.httpMetadata.contentType });
  }
}

async function toBuffer(value) {
  if (value == null) return Buffer.alloc(0);
  if (typeof value === "string") return Buffer.from(value);
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  if (ArrayBuffer.isView(value)) return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  if (value instanceof Blob) return Buffer.from(await value.arrayBuffer());
  if (typeof value.getReader === "function") return Buffer.from(await new Response(value).arrayBuffer());
  throw new Error("unsupported R2 value");
}

function resolveRange(range, size) {
  if (!range) return undefined;
  if (range instanceof Headers) {
    const m = /bytes=(\d*)-(\d*)/.exec(range.get("range") ?? "");
    if (!m) return undefined;
    range = m[1] === "" ? { suffix: Number(m[2]) } : { offset: Number(m[1]), length: m[2] === "" ? undefined : Number(m[2]) - Number(m[1]) + 1 };
  }
  if ("suffix" in range && range.suffix != null) return { offset: Math.max(0, size - range.suffix), length: Math.min(range.suffix, size) };
  const offset = range.offset ?? 0;
  const length = range.length ?? size - offset;
  return { offset, length: Math.max(0, Math.min(length, size - offset)) };
}

/** An R2Bucket backed by a folder: <dir>/<key> plus <dir>/.meta/<key>.json. */
export function r2(dir) {
  mkdirSync(dir, { recursive: true });
  const fileOf = (k) => path.join(dir, safeKey(k));
  const metaOf = (k) => path.join(dir, ".meta", safeKey(k) + ".json");
  async function readMeta(k) {
    const f = fileOf(k);
    if (!existsSync(f)) return null;
    try {
      return JSON.parse(await fsp.readFile(metaOf(k), "utf8"));
    } catch {
      // Copied in by hand (no sidecar): guess the type from the extension.
      const st = statSync(f);
      const contentType = MIME[path.extname(f).toLowerCase()];
      return { size: st.size, etag: `${st.size}-${st.mtimeMs}`, uploaded: st.mtime.toISOString(), httpMetadata: contentType ? { contentType } : {}, customMetadata: {} };
    }
  }
  return {
    async head(key) {
      const m = await readMeta(key);
      return m ? new R2Object(safeKey(key), m, fileOf(key)) : null;
    },
    async get(key, opts = {}) {
      const m = await readMeta(key);
      if (!m) return null;
      if (opts.onlyIf) {
        const c = opts.onlyIf instanceof Headers ? { etagDoesNotMatch: opts.onlyIf.get("if-none-match")?.replace(/"/g, "") } : opts.onlyIf;
        if (c.etagDoesNotMatch && c.etagDoesNotMatch === m.etag) return new R2Object(safeKey(key), m, fileOf(key));
        if (c.etagMatches && c.etagMatches !== m.etag) return new R2Object(safeKey(key), m, fileOf(key));
      }
      return new R2ObjectBody(safeKey(key), m, fileOf(key), resolveRange(opts.range, m.size));
    },
    async put(key, value, opts = {}) {
      const buf = await toBuffer(value);
      const f = fileOf(key);
      await fsp.mkdir(path.dirname(f), { recursive: true });
      const tmp = `${f}.${process.pid}.${Date.now()}.tmp`;
      await fsp.writeFile(tmp, buf);
      await fsp.rename(tmp, f);
      const httpMetadata = opts.httpMetadata instanceof Headers
        ? { contentType: opts.httpMetadata.get("content-type") ?? undefined, cacheControl: opts.httpMetadata.get("cache-control") ?? undefined }
        : opts.httpMetadata ?? {};
      const m = { size: buf.length, etag: createHash("md5").update(buf).digest("hex"), uploaded: new Date().toISOString(), httpMetadata, customMetadata: opts.customMetadata ?? {} };
      await fsp.mkdir(path.dirname(metaOf(key)), { recursive: true });
      await fsp.writeFile(metaOf(key), JSON.stringify(m));
      return new R2Object(safeKey(key), m, f);
    },
    async delete(keys) {
      for (const k of Array.isArray(keys) ? keys : [keys]) {
        await fsp.rm(fileOf(k), { force: true });
        await fsp.rm(metaOf(k), { force: true });
      }
    },
    async list(opts = {}) {
      const prefix = opts.prefix ?? "";
      const all = [];
      async function walk(rel) {
        let entries = [];
        try {
          entries = await fsp.readdir(path.join(dir, rel), { withFileTypes: true });
        } catch {
          return;
        }
        for (const e of entries) {
          if (rel === "" && e.name === ".meta") continue;
          const r = rel ? `${rel}/${e.name}` : e.name;
          if (e.isDirectory()) await walk(r);
          else if (r.startsWith(prefix)) all.push(r);
        }
      }
      await walk("");
      all.sort();
      const start = opts.cursor ? Number(opts.cursor) : 0;
      const limit = opts.limit ?? 1000;
      const delimited = new Set();
      const objects = [];
      let i = start;
      for (; i < all.length && objects.length < limit; i++) {
        const k = all[i];
        if (opts.delimiter) {
          const rest = k.slice(prefix.length);
          const at = rest.indexOf(opts.delimiter);
          if (at >= 0) {
            delimited.add(prefix + rest.slice(0, at + opts.delimiter.length));
            continue;
          }
        }
        const m = await readMeta(k);
        if (m) objects.push(new R2Object(k, m, fileOf(k)));
      }
      const truncated = i < all.length;
      return { objects, truncated, cursor: truncated ? String(i) : undefined, delimitedPrefixes: [...delimited] };
    },
    async createMultipartUpload() {
      throw new Error("multipart uploads are not supported on the Node platform");
    },
  };
}

// ── KV ─────────────────────────────────────────────────────────────────────

/** A KVNamespace stored in a SQLite file (one table per namespace name). */
export function kv(file, name = "kv") {
  mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  const t = `kv_${name.replace(/[^a-z0-9_]/gi, "_")}`;
  db.exec(`CREATE TABLE IF NOT EXISTS ${t} (key TEXT PRIMARY KEY, value BLOB, expires INTEGER, metadata TEXT)`);
  const now = () => Math.floor(Date.now() / 1000);
  const getRow = db.prepare(`SELECT value, expires, metadata FROM ${t} WHERE key = ?`);
  const put = db.prepare(`INSERT INTO ${t} (key, value, expires, metadata) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, expires = excluded.expires, metadata = excluded.metadata`);
  const del = db.prepare(`DELETE FROM ${t} WHERE key = ?`);
  const decode = (buf, type) => {
    if (buf == null) return null;
    const b = Buffer.isBuffer(buf) ? buf : Buffer.from(String(buf));
    if (type === "json") return JSON.parse(b.toString("utf8"));
    if (type === "arrayBuffer") return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
    if (type === "stream") return new Response(b).body;
    return b.toString("utf8");
  };
  const live = (row) => row && (!row.expires || row.expires > now());
  return {
    async get(key, opt) {
      const type = typeof opt === "string" ? opt : opt?.type ?? "text";
      const row = getRow.get(key);
      if (!live(row)) return null;
      return decode(row.value, type);
    },
    async getWithMetadata(key, opt) {
      const type = typeof opt === "string" ? opt : opt?.type ?? "text";
      const row = getRow.get(key);
      if (!live(row)) return { value: null, metadata: null };
      return { value: decode(row.value, type), metadata: row.metadata ? JSON.parse(row.metadata) : null };
    },
    async put(key, value, opts = {}) {
      const buf = await toBuffer(value);
      const expires = opts.expiration ?? (opts.expirationTtl ? now() + Number(opts.expirationTtl) : null);
      put.run(key, buf, expires, opts.metadata ? JSON.stringify(opts.metadata) : null);
    },
    async delete(key) {
      del.run(key);
    },
    async list(opts = {}) {
      const prefix = opts.prefix ?? "";
      const limit = opts.limit ?? 1000;
      const offset = opts.cursor ? Number(opts.cursor) : 0;
      const rows = db.prepare(`SELECT key, expires, metadata FROM ${t} WHERE key >= ? AND key < ? AND (expires IS NULL OR expires > ?) ORDER BY key LIMIT ? OFFSET ?`).all(prefix, prefix + "￿", now(), limit + 1, offset);
      const done = rows.length <= limit;
      return {
        keys: rows.slice(0, limit).map((r) => ({ name: r.key, expiration: r.expires ?? undefined, metadata: r.metadata ? JSON.parse(r.metadata) : undefined })),
        list_complete: done,
        cursor: done ? undefined : String(offset + limit),
      };
    },
  };
}

// ── Mail (send_email binding) ──────────────────────────────────────────────

/** env.EMAIL.send({ to, from: { email, name } | string, subject, text, html, replyTo }) over SMTP. */
export function mailer(smtpUrl, defaultFrom) {
  let transport;
  const get = async () => {
    if (!transport) {
      const nodemailer = (await import("nodemailer")).default;
      transport = nodemailer.createTransport(smtpUrl);
    }
    return transport;
  };
  return {
    async send(msg) {
      if (!smtpUrl) {
        console.warn("[mail] SMTP_URL is not set; not sending:", msg?.subject);
        return { messageId: null };
      }
      const from = typeof msg.from === "string" ? msg.from : msg.from?.email ? `"${msg.from.name ?? ""}" <${msg.from.email}>` : defaultFrom;
      const info = await (await get()).sendMail({ from, to: msg.to, subject: msg.subject, text: msg.text, html: msg.html, replyTo: msg.replyTo });
      return { messageId: info.messageId };
    },
  };
}

// ── Service bindings, rate limits, analytics engine ────────────────────────

/** A Fetcher that sends every request to another container, keeping path and query. */
export function service(baseUrl) {
  const base = new URL(baseUrl);
  return {
    fetch(input, init) {
      const req = input instanceof Request ? input : new Request(input, init);
      const u = new URL(req.url);
      u.protocol = base.protocol;
      u.host = base.host;
      return fetch(new Request(u, req));
    },
  };
}

/** A RateLimit binding: limit({ key }) → { success }, fixed window, in memory. */
export function ratelimit({ limit, period }) {
  const hits = new Map();
  return {
    async limit({ key }) {
      const now = Date.now();
      const w = hits.get(key);
      if (!w || now - w.start > period * 1000) {
        hits.set(key, { start: now, n: 1 });
        return { success: true };
      }
      w.n += 1;
      return { success: w.n <= limit };
    },
  };
}

/** An AnalyticsEngineDataset whose points land in a SQLite table. */
export function analyticsEngine(file, dataset) {
  mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  const t = `ae_${dataset.replace(/[^a-z0-9_]/gi, "_")}`;
  db.exec(`CREATE TABLE IF NOT EXISTS ${t} (timestamp INTEGER NOT NULL, idx TEXT, blobs TEXT, doubles TEXT)`);
  const ins = db.prepare(`INSERT INTO ${t} (timestamp, idx, blobs, doubles) VALUES (?, ?, ?, ?)`);
  return {
    _db: db,
    _table: t,
    writeDataPoint(p = {}) {
      ins.run(Date.now(), (p.indexes ?? [])[0] ?? null, JSON.stringify(p.blobs ?? []), JSON.stringify(p.doubles ?? []));
    },
  };
}

// ── Cron ───────────────────────────────────────────────────────────────────

/** Run fn(controller) on each cron expression, like a Worker's scheduled(). */
export async function schedule(crons, fn) {
  const { Cron } = await import("croner");
  for (const cron of crons) {
    new Cron(cron, { timezone: "UTC", protect: true }, async () => {
      try {
        await fn({ cron, scheduledTime: Date.now(), noRetry() {} });
      } catch (err) {
        console.error(`[cron ${cron}]`, err);
      }
    });
  }
}

/**
 * Call an internal route on this server on a cron schedule, with the shared
 * secret. Sends a JSON content type: Astro's checkOrigin rejects a POST that has
 * neither an Origin header nor a JSON/other non-form content type.
 */
export async function cronRoute(crons, { port, path: route, secret }) {
  await schedule(crons, (c) =>
    fetch(`http://127.0.0.1:${port}${route}?cron=${encodeURIComponent(c.cron)}`, {
      method: "POST",
      headers: { "x-cron-secret": secret, "content-type": "application/json" },
      body: "{}",
    }).then((r) => {
      if (!r.ok) console.error(`[cron ${c.cron}] ${route} → ${r.status}`);
    }),
  );
}

// ── The HTTP server ────────────────────────────────────────────────────────

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json", ".webmanifest": "application/manifest+json", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif", ".gif": "image/gif", ".ico": "image/x-icon",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".otf": "font/otf", ".mp4": "video/mp4", ".webm": "video/webm", ".pdf": "application/pdf",
};

async function serveStatic(clientDir, req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  let p;
  try {
    p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  } catch {
    return false;
  }
  if (p.includes("\0") || p.split("/").includes("..")) return false;
  let file = path.join(clientDir, p);
  let st;
  try {
    st = await fsp.stat(file);
    if (st.isDirectory()) {
      file = path.join(file, "index.html");
      st = await fsp.stat(file);
    }
  } catch {
    return false;
  }
  if (!st.isFile()) return false;
  const immutable = p.startsWith("/_astro/");
  res.writeHead(200, {
    "content-type": MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream",
    "content-length": st.size,
    "cache-control": immutable ? "public, max-age=31536000, immutable" : "public, max-age=3600",
  });
  if (req.method === "HEAD") return res.end(), true;
  createReadStream(file).pipe(res);
  return true;
}

/**
 * Serve an Astro build made with @astrojs/node in "middleware" mode.
 *   handler    the `handler` export of dist/server/entry.mjs
 *   env        the bindings object (what Workers call env)
 *   clientDir  dist/client
 *   before     optional (req, res) => boolean | Promise<boolean>, e.g. WebSocket rooms or extra routes
 */
export function serve({ handler, env, clientDir, port = Number(process.env.PORT ?? 8080), before, onUpgrade }) {
  const pending = new Set();
  const ctx = {
    waitUntil(p) {
      const q = Promise.resolve(p).catch((err) => console.error("[waitUntil]", err));
      pending.add(q);
      q.finally(() => pending.delete(q));
    },
    passThroughOnException() {},
  };
  const server = createServer(async (req, res) => {
    try {
      if (before && (await before(req, res))) return;
      if (await serveStatic(clientDir, req, res)) return;
      const ip = String(req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "").split(",")[0].trim();
      // What Workers put on request.cf / CF-Connecting-IP, from the reverse proxy.
      req.headers["cf-connecting-ip"] ??= ip;
      const locals = { runtime: { env, ctx, cf: { country: req.headers["cf-ipcountry"] ?? null }, caches: undefined } };
      await handler(req, res, () => {
        res.statusCode = 404;
        res.end("Not found");
      }, locals);
    } catch (err) {
      console.error("[request]", req.method, req.url, err);
      if (!res.headersSent) res.writeHead(500, { "content-type": "text/plain" });
      res.end("Internal error");
    }
  });
  if (onUpgrade) server.on("upgrade", onUpgrade);
  server.listen(port, () => console.log(`listening on :${port}`));
  const stop = async () => {
    server.close();
    await Promise.allSettled([...pending]);
    process.exit(0);
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
  return server;
}

/** Apply every *.sql file in a migrations folder that this database has not seen (like wrangler d1 migrations apply). */
export function migrate(db, dir) {
  const sqlite = db._db;
  sqlite.exec("CREATE TABLE IF NOT EXISTS d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL)");
  if (!existsSync(dir)) return [];
  const done = new Set(sqlite.prepare("SELECT name FROM d1_migrations").all().map((r) => r.name));
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  const applied = [];
  for (const f of files) {
    if (done.has(f)) continue;
    const sql = readFileSync(path.join(dir, f), "utf8");
    sqlite.transaction(() => {
      sqlite.exec(sql);
      sqlite.prepare("INSERT INTO d1_migrations (name) VALUES (?)").run(f);
    })();
    applied.push(f);
  }
  return applied;
}

export const newId = () => randomUUID();
