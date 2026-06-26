import type { APIRoute } from "astro";
import { getEnv } from "@/lib/runtime";
import { captureServer } from "@/lib/analytics-server";
import { EVENTS } from "@/lib/events";

export const prerender = false;

const RECIPIENTS: Record<string, string> = {
  partner: "partner@devmultigroup.com",
  sponsor: "sponsor@devmultigroup.com",
  support: "support@devmultigroup.com",
};
const LABELS: Record<string, string> = {
  partner: "Partner",
  sponsor: "Sponsor",
  support: "Destek",
};

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function emailHtml(label: string, name: string, email: string, org: string, message: string) {
  const row = (k: string, v: string) =>
    `<tr><td style="padding:11px 0;color:#86868b;font-size:13px;width:130px;vertical-align:top;border-top:1px solid #f0f0f2;">${k}</td><td style="padding:11px 0;color:#1d1d1f;font-size:14px;border-top:1px solid #f0f0f2;">${v}</td></tr>`;
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;">
  <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:28px 16px;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #ececef;">
      <div style="background:#0a0a0c;padding:22px 30px;">
        <div style="color:#fff;font-weight:600;font-size:16px;letter-spacing:.2px;">Developer MultiGroup</div>
        <div style="color:#9b9ba3;font-size:13px;margin-top:3px;">${esc(label)} formu &middot; yeni başvuru</div>
      </div>
      <div style="padding:14px 30px 24px;">
        <table style="width:100%;border-collapse:collapse;">
          ${row("Ad Soyad", `<strong>${esc(name)}</strong>`)}
          ${row("E-posta", `<a href="mailto:${esc(email)}" style="color:#0a84ff;text-decoration:none;">${esc(email)}</a>`)}
          ${org ? row("Şirket / Topluluk", esc(org)) : ""}
          ${row("Mesaj", esc(message).replace(/\n/g, "<br>"))}
        </table>
      </div>
      <div style="padding:16px 30px;border-top:1px solid #f0f0f2;color:#9b9ba3;font-size:12px;">
        devmultigroup.com üzerinden gönderildi &middot; yanıtlamak için bu e-postayı doğrudan yanıtlayabilirsin.
      </div>
    </div>
  </div></body></html>`;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = getEnv(locals);

  let data: Record<string, unknown>;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: "Geçersiz istek." }, 400);
  }

  const type = String(data?.type ?? "");
  const name = String(data?.name ?? "").trim();
  const email = String(data?.email ?? "").trim();
  const org = String(data?.org ?? "").trim();
  const message = String(data?.message ?? "").trim();
  const honeypot = String(data?.company_website ?? "");

  // bots fill the hidden field — accept silently, send nothing
  if (honeypot) return json({ ok: true });

  const to = RECIPIENTS[type];
  if (!to) return json({ ok: false, error: "Geçersiz form türü." }, 400);
  if (!name || !email || !message) return json({ ok: false, error: "Lütfen ad, e-posta ve mesaj alanlarını doldur." }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ ok: false, error: "Geçerli bir e-posta adresi gir." }, 400);
  if (name.length > 200 || org.length > 200 || email.length > 200 || message.length > 5000)
    return json({ ok: false, error: "Girdi çok uzun." }, 400);
  if (!env.RESEND_API_KEY) return json({ ok: false, error: "Mail servisi yapılandırılmamış." }, 500);

  const label = LABELS[type];
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Developer MultiGroup <submit@mail.devmultigroup.com>",
        to: [to],
        reply_to: email,
        subject: `[${label}] ${name}${org ? " · " + org : ""}`,
        html: emailHtml(label, name, email, org, message),
      }),
    });
    if (!res.ok) return json({ ok: false, error: "Gönderilemedi, lütfen tekrar dene." }, 502);
  } catch {
    return json({ ok: false, error: "Gönderilemedi, lütfen tekrar dene." }, 502);
  }

  // Analytics: lead captured. Email is used only as distinct_id — SHA-256 hashed
  // before egress (K-011), never a prop.
  const track = captureServer(env, EVENTS.contactSubmit, {
    request,
    distinctId: email.toLowerCase(),
    distinctIdIsEmail: true,
    properties: { form_type: type, has_org: !!org },
  });
  const ctx = (locals as App.Locals).runtime?.ctx;
  if (ctx?.waitUntil) ctx.waitUntil(track);

  return json({ ok: true });
};
