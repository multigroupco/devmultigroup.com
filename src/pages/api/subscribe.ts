import type { APIRoute } from "astro";
import { getEnv } from "@/lib/runtime";

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

  try {
    const existing = await env.MAIL_DB
      .prepare("SELECT id FROM contacts WHERE list_id = ? AND lower(email) = ? LIMIT 1")
      .bind(LIST_ID, email)
      .first();
    if (!existing) {
      await env.MAIL_DB
        .prepare("INSERT INTO contacts (email, name, list_id, created_at) VALUES (?, ?, ?, unixepoch())")
        .bind(email, name, LIST_ID)
        .run();
    }
  } catch {
    return json({ ok: false, error: "Kaydedilemedi, lütfen tekrar dene." }, 502);
  }

  // idempotent: already-subscribed still resolves ok
  return json({ ok: true });
};
