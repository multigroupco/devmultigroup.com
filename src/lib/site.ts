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

export type NavChild = { label: string; href: string; soon?: boolean };
export type NavItem = { label: string; href: string; children?: NavChild[] };
export const NAV: NavItem[] = [
  { label: "Etkinlikler", href: "/events" },
  { label: "Akademi", href: "/academy" },
  { label: "Kayıtlar", href: "/recordings" },
  { label: "Blog", href: "/blog" },
  { label: "Ekip", href: "/team" },
  {
    label: "Partner",
    href: "/communities",
    children: [
      { label: "Topluluklar", href: "/communities" },
      { label: "Şirketler", href: "/companies" },
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
  { label: "Bağlantılar", href: "/links" },
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
} as const;

export interface SiteConfig {
  title: string;
  tagline: string;
  description: string;
  gaMeasurementId: string;
  gscVerification: string;
  bannerEnabled: boolean;
  members: string;
  cities: string;
  events: string;
  recordings: string;
  companies: string;
}

/** Merge DB settings over sane defaults so the site renders before seeding. */
export function resolveSite(settings: Settings): SiteConfig {
  return {
    title: settings.site_title || BRAND.name,
    tagline: settings.site_tagline || BRAND.tagline,
    description: settings.site_description || BRAND.description,
    gaMeasurementId: settings.ga_measurement_id || "",
    gscVerification: settings.gsc_verification || "",
    bannerEnabled: (settings.banner_enabled ?? "1") !== "0",
    members: settings.stat_members || "15.000+",
    cities: settings.stat_cities || "İstanbul",
    events: settings.stat_events || "100+",
    recordings: settings.stat_recordings || "17+",
    companies: settings.stat_companies || "25+",
  };
}
