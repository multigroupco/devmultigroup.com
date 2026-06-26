import type { APIRoute } from "astro";
import { getEnv } from "@/lib/runtime";
import { captureServer } from "@/lib/analytics-server";
import { EVENTS } from "@/lib/events";

export const prerender = false;

// "MultiGroup Newsletter" list in mail-templates-db (contact_lists.id).
const LIST_ID = 1;

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });

export const POST: APIRoute = async ({ request, locals }) => {
  const env = getEnv(locals);

  let data: Record<string, unknown>;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: "Geçersiz istek." }, 400);
  }

  const email = String(data?.email ?? "").trim().toLowerCase();
  const name = String(data?.name ?? "").trim() || null;
  const honeypot = String(data?.company_website ?? "");

  if (honeypot) return json({ ok: true }); // bot
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ ok: false, error: "Geçerli bir e-posta gir." }, 400);
  if (email.length > 200 || (name && name.length > 200)) return json({ ok: false, error: "Girdi çok uzun." }, 400);
  if (!env.MAIL_DB) return json({ ok: false, error: "Servis yapılandırılmamış." }, 500);

  let isNew = false;
  try {
    const existing = await env.MAIL_DB
      .prepare("SELECT id FROM contacts WHERE list_id = ? AND lower(email) = ? LIMIT 1")
      .bind(LIST_ID, email)
      .first();
    if (!existing) {
      await env.MAIL_DB
        .prepare(
          "INSERT INTO contacts (email, name, list_id, consent_source, consent_channel, consented_at, created_at) VALUES (?, ?, ?, 'web_form', 'web', unixepoch(), unixepoch())",
        )
        .bind(email, name, LIST_ID)
        .run();
      // KVKK rıza kaydı (append-only) — proof of opt-in: date + source + channel
      // (K-006). No IP is stored, consistent with our IP-minimisation stance.
      await env.MAIL_DB
        .prepare(
          "INSERT INTO subscriber_consent (email, consent_source, consent_channel, consented_at, created_at) VALUES (?, 'web_form', 'web', unixepoch(), unixepoch())",
        )
        .bind(email)
        .run();
      isNew = true;
    }
  } catch {
    return json({ ok: false, error: "Kaydedilemedi, lütfen tekrar dene." }, 502);
  }

  // Analytics: count only genuinely new subscribers (idempotent re-submits are
  // not signups). Email is used only as distinct_id — SHA-256 hashed before
  // egress (K-011), never sent as a property. The consent moment (source +
  // channel) is recorded as event properties for the rıza kaydı (K-006).
  if (isNew) {
    const track = captureServer(env, EVENTS.newsletterSignup, {
      request,
      distinctId: email,
      distinctIdIsEmail: true,
      properties: { form_type: "newsletter", consent_source: "web_form", consent_channel: "web" },
    });
    const ctx = (locals as App.Locals).runtime?.ctx;
    if (ctx?.waitUntil) ctx.waitUntil(track);
  }

  // idempotent: already-subscribed still resolves ok
  return json({ ok: true });
};
