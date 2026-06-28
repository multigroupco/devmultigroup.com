// Single source of truth for brand, navigation and social links.
// Anything here can be overridden at runtime by a matching `settings` key.

import type { Settings } from "./types";

export const BRAND = {
  name: "Developer MultiGroup",
  short: "MultiGroup",
  tagline: "Where Developers Become Together",
  domain: "devmultigroup.com",
  url: "https://devmultigroup.com",
  email: "iletisim@devmultigroup.com",
  description:
    "Developer MultiGroup; iOS, web, yapay zekâ ve daha fazlasında geliştiricilerin birlikte büyüdüğü gönüllü bir Türk yazılım topluluğu — buluşmalar, konferanslar ve akademisiyle ücretsiz bootcamp'ler.",
} as const;

/** The one canonical, indexable apex host. Analytics + the noindex guard key off
 *  this. Single source of truth for every host comparison (middleware, layout,
 *  server capture). */
export const CANONICAL_HOST = BRAND.domain;

/** True when a request host IS the canonical apex, tolerating a trailing FQDN dot
 *  ("devmultigroup.com.") and case. URL.host already lowercases + strips :443/:80,
 *  so only the trailing dot needs normalizing. */
export function isApexHost(host: string | null | undefined): boolean {
  return !!host && host.replace(/\.$/, "").toLowerCase() === CANONICAL_HOST;
}

export type NavChild = { label: string; href: string; soon?: boolean };
export type NavItem = { label: string; href: string; children?: NavChild[] };
export const NAV: NavItem[] = [
  { label: "Etkinlikler", href: "/events" },
  { label: "Akademi", href: "/academy" },
  {
    label: "İçerik",
    href: "/blog",
    children: [
      { label: "Blog", href: "/blog" },
      { label: "Kayıtlar", href: "/recordings" },
    ],
  },
  { label: "Mağaza", href: "/store" },
  { label: "Ekip", href: "/team" },
  {
    label: "Ekosistem",
    href: "/communities",
    children: [
      { label: "Topluluklar", href: "/communities" },
      { label: "İş Birlikleri", href: "/partnerships" },
      { label: "Şirketler", href: "/companies" },
      { label: "Konuşmacılar", href: "/speakers" },
    ],
  },
];

export const COMPANIES: { name: string; logo: string }[] = [
  { name: "Google", logo: "/companies/google.png" },
  { name: "Trendyol", logo: "/companies/trendyol.png" },
  { name: "Hepsiburada", logo: "/companies/hepsiburada.png" },
  { name: "Akbank", logo: "/companies/akbank.png" },
  { name: "Teknasyon", logo: "/companies/teknasyon.png" },
  { name: "Softtech", logo: "/companies/softtech.png" },
  { name: "Wite", logo: "/companies/wite.png" },
  { name: "Lodos.io", logo: "/companies/lodos.png" },
];

export const FOOTER_NAV: { label: string; href: string }[] = [
  { label: "Ana Sayfa", href: "/" },
  { label: "Etkinlikler", href: "/events" },
  { label: "Akademi", href: "/academy" },
  { label: "Kayıtlar", href: "/recordings" },
  { label: "Blog", href: "/blog" },
  { label: "Ekip", href: "/team" },
  { label: "Mağaza", href: "/store" },
  { label: "Bağlantılar", href: "/links" },
];

/** Gizlilik / KVKK footer links. Legal texts are DRAFT pending lawyer review. */
export const LEGAL_NAV: { label: string; href: string }[] = [
  { label: "Aydınlatma Metni", href: "/privacy" },
  { label: "Çerez Politikası", href: "/privacy/cerez-politikasi" },
  { label: "Bülten Onayı", href: "/privacy/bulten-onay" },
];

// Community platform pages (event registration routes here).
export const GATHIN = {
  multigroup:
    "https://gathin.com/communities/multigroup-community-34813861558366504236",
  multiacademy:
    "https://gathin.com/communities/multiacademy-community-94761667282726876508",
} as const;

/** "Aramıza katıl" join form (membership application). */
export const JOIN_FORM = "https://forms.gle/oAvMuvVMNjcb4BDo8";

export const SOCIALS = {
  multigroup: {
    instagram: "https://www.instagram.com/devmultigroup/",
    twitter: "https://twitter.com/devmultigroup",
    linkedin: "https://www.linkedin.com/company/developermultigroup",
    youtube: "https://www.youtube.com/@devmultigroup",
    github: "https://github.com/multigroupco",
    kommunity: "https://kommunity.com/devmultigroup",
  },
  multiacademy: {
    instagram: "https://www.instagram.com/devmultiacademy/",
    linkedin: "https://www.linkedin.com/company/multiacademy-dev/",
    youtube: "https://www.youtube.com/@devmultigroup",
  },
  multistore: {
    instagram: "https://www.instagram.com/devmultistore/",
  },
  multiculture: {
    instagram: "https://www.instagram.com/devmulticulture/",
  },
} as const;

/** Sub-brands under the MultiGroup umbrella, shown in the footer's
 *  "Powered By MultiGroup" column. MultiCulture is intentionally a separate
 *  lane — only an Instagram, no site link for now. */
export const SUBBRANDS: {
  strong: string;
  tail: string;
  desc: string;
  href?: string;
  hrefLabel?: string;
  socials: { icon: string; href: string; label: string }[];
}[] = [
  {
    strong: "Multi",
    tail: "Academy",
    desc: "Öğrenme kolu — ücretsiz bootcamp'ler ve uygulamalı programlar.",
    href: "/academy",
    hrefLabel: "Akademi",
    socials: [
      { icon: "instagram", href: SOCIALS.multiacademy.instagram, label: "MultiAcademy Instagram" },
      { icon: "linkedin", href: SOCIALS.multiacademy.linkedin, label: "MultiAcademy LinkedIn" },
      { icon: "youtube", href: SOCIALS.multiacademy.youtube, label: "MultiAcademy YouTube" },
    ],
  },
  {
    strong: "Multi",
    tail: "Store",
    desc: "Ürün kolu — topluluk merch'i, etkinlikte teslim ön sipariş drop'ları.",
    href: "/store",
    hrefLabel: "Mağaza",
    socials: [{ icon: "instagram", href: SOCIALS.multistore.instagram, label: "MultiStore Instagram" }],
  },
  {
    strong: "Multi",
    tail: "Culture",
    desc: "Topluluğun kültür ve yaşam kolu.",
    socials: [{ icon: "instagram", href: SOCIALS.multiculture.instagram, label: "MultiCulture Instagram" }],
  },
];

export interface SiteConfig {
  title: string;
  tagline: string;
  description: string;
  gaMeasurementId: string;
  gscVerification: string;
  /** PostHog project (public) API key — `phc_…`. Empty disables PostHog. */
  posthogKey: string;
  /** PostHog ingestion host (US cloud by default). */
  posthogHost: string;
  /** Sentry browser DSN (public). Empty disables client error monitoring. */
  sentryDsn: string;
  /** Master kill-switch: "0" turns off ALL analytics regardless of keys. */
  analyticsEnabled: boolean;
  bannerEnabled: boolean;
  members: string;
  cities: string;
  events: string;
  recordings: string;
  companies: string;
  speakers: string;
}

/** Merge DB settings over sane defaults so the site renders before seeding. */
export function resolveSite(settings: Settings): SiteConfig {
  return {
    title: settings.site_title || BRAND.name,
    tagline: settings.site_tagline || BRAND.tagline,
    description: settings.site_description || BRAND.description,
    gaMeasurementId: settings.ga_measurement_id || "",
    gscVerification: settings.gsc_verification || "",
    posthogKey: settings.posthog_key || "",
    posthogHost: (settings.posthog_host || "https://eu.i.posthog.com").replace(/\/$/, ""),
    sentryDsn: settings.sentry_dsn || "",
    analyticsEnabled: (settings.analytics_enabled ?? "1") !== "0",
    bannerEnabled: (settings.banner_enabled ?? "1") !== "0",
    members: settings.stat_members || "15.000+",
    cities: settings.stat_cities || "İstanbul",
    events: settings.stat_events || "100+",
    recordings: settings.stat_recordings || "17+",
    companies: settings.stat_companies || "25+",
    speakers: settings.stat_speakers || "200+",
  };
}
