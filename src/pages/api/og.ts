import type { APIRoute } from "astro";
import { ImageResponse, loadGoogleFont } from "workers-og";
import { getEnv } from "@/lib/runtime";
import { BRAND } from "@/lib/site";

// Dynamic Open Graph image (1200×630 PNG) rendered at the edge. Every page that
// has no real cover image points its og:image / JSON-LD image here, so the whole
// site has branded, title-bearing share cards. AMOLED monochrome to match the
// theme. Falls back to the static /og-default.png if rendering ever fails.
export const prerender = false;

// Satori's HTML parser does NOT decode entities, so escaping "&" → "&amp;" would
// render literally. Titles are admin-authored and output to a PNG (no XSS surface),
// so we only neutralise the structural angle brackets and keep everything else raw.
const clean = (s: string) => s.replace(/[<>]/g, "").trim();

// Inter covers Turkish glyphs (İ ş ğ ç ö ü). Cached per isolate so we fetch once.
let fontsCache: { name: string; data: ArrayBuffer; weight: number; style: "normal" }[] | null = null;
async function getFonts() {
  if (fontsCache) return fontsCache;
  const [regular, bold] = await Promise.all([
    loadGoogleFont({ family: "Inter", weight: 400 }),
    loadGoogleFont({ family: "Inter", weight: 700 }),
  ]);
  fontsCache = [
    { name: "Inter", data: regular, weight: 400, style: "normal" },
    { name: "Inter", data: bold, weight: 700, style: "normal" },
  ];
  return fontsCache;
}

// The brand mark, fetched once (via the ASSETS binding — a worker self-fetch is
// unreliable) and inlined as a data URI, since Satori can't fetch images itself.
let logoCache: string | null = null;
async function getLogo(env: Env, origin: string): Promise<string> {
  if (logoCache !== null) return logoCache;
  try {
    const r = await env.ASSETS.fetch(new URL("/logo-small-white.png", origin));
    if (!r.ok) throw new Error("logo " + r.status);
    const bytes = new Uint8Array(await r.arrayBuffer());
    let bin = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK) as unknown as number[]);
    }
    logoCache = `data:image/png;base64,${btoa(bin)}`;
  } catch {
    logoCache = ""; // render the wordmark without a mark if it ever fails
  }
  return logoCache;
}

export const GET: APIRoute = async ({ url, locals }) => {
  const rawTitle = (url.searchParams.get("title") || BRAND.name).slice(0, 110);
  const title = clean(rawTitle) || BRAND.name;
  const eyebrow = clean(url.searchParams.get("eyebrow") || "Developer MultiGroup").slice(0, 36).toUpperCase();
  const fontSize = title.length > 78 ? 50 : title.length > 46 ? 62 : 76;
  // Home (and anywhere the headline already is the motto) shouldn't repeat it below.
  const showMotto = title !== BRAND.tagline;
  // The wordmark already reads "Developer MultiGroup"; don't repeat it as the eyebrow.
  const showEyebrow = eyebrow && eyebrow !== "DEVELOPER MULTIGROUP";

  const logo = await getLogo(getEnv(locals), url.origin).catch(() => "");
  const logoImg = logo ? `<img src="${logo}" width="50" height="54" style="margin-right:18px;" />` : "";

  // Home (headline == motto): a fully centered layout. Every other page: the brand
  // lockup left + section eyebrow right, headline left, domain left + motto right —
  // all anchored to the same 70px gutter as the headline. NOTE: keep the markup free
  // of whitespace between flex siblings — Satori turns stray text nodes into flex
  // items, which is what pushed the footer/eyebrow off the gutter.
  const center = title === BRAND.tagline;
  const just = center ? "center" : "space-between";

  const lockup = `<div style="display:flex;align-items:center;">${logoImg}<div style="display:flex;align-items:center;font-size:27px;font-weight:700;letter-spacing:-0.3px;">Developer MultiGroup</div></div>`;
  const eyebrowEl = !center && showEyebrow ? `<div style="display:flex;align-items:center;font-size:22px;letter-spacing:4px;color:rgba(255,255,255,0.5);">${eyebrow}</div>` : "";
  const domainEl = `<div style="display:flex;align-items:center;font-size:25px;color:rgba(255,255,255,0.5);">devmultigroup.com</div>`;
  const mottoEl = !center && showMotto ? `<div style="display:flex;align-items:center;font-size:22px;color:rgba(255,255,255,0.5);">${clean(BRAND.tagline)}</div>` : "";

  const topRow = `<div style="display:flex;align-items:center;justify-content:${just};width:100%;">${lockup}${eyebrowEl}</div>`;
  const midRow = `<div style="display:flex;flex:1;align-items:center;justify-content:${center ? "center" : "flex-start"};width:100%;"><div style="display:flex;width:100%;font-size:${fontSize}px;font-weight:700;line-height:1.12;letter-spacing:-1.5px;text-align:${center ? "center" : "left"};">${title}</div></div>`;
  const footRow = `<div style="display:flex;align-items:center;justify-content:${just};width:100%;padding-top:30px;border-top:1px solid rgba(255,255,255,0.13);">${domainEl}${mottoEl}</div>`;

  const html = `<div style="display:flex;flex-direction:column;width:1200px;height:630px;padding:70px;background:#000000;background-image:radial-gradient(900px 520px at 84% 4%, #1b1b1f 0%, #09090a 50%, #000000 100%);font-family:'Inter';color:#ffffff;">${topRow}${midRow}${footRow}</div>`;

  try {
    const fonts = await getFonts();
    return new ImageResponse(html, {
      width: 1200,
      height: 630,
      fonts,
      headers: { "cache-control": "public, max-age=86400, s-maxage=604800" },
    });
  } catch {
    return Response.redirect(new URL("/og-default.png", url), 302);
  }
};
