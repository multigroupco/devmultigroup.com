/**
 * Canonical analytics event taxonomy — the single source of truth for event
 * NAMES across the site. Client code emits these via `window.track(name, props)`
 * (declarative `data-track="…"` or programmatic) and server code via
 * `captureServer(env, name, …)` from src/lib/analytics-server.ts.
 *
 * Names are stable snake_case English (locale-independent); the UI copy stays
 * Turkish. Keep this list in sync with the PostHog/GA4 dashboards. When adding a
 * surface, reuse an existing name with a discriminating prop (page/surface/
 * location) rather than minting a near-duplicate.
 *
 * Destinations: page-level + conversions → GA4 **and** PostHog; granular
 * product/funnel events → PostHog-first. Sentry is errors-only, never here.
 */
export const EVENTS = {
  // page + navigation
  pageView: "page_view",
  navClick: "nav_click",
  joinClick: "join_click",
  socialClick: "social_click",
  ctaClick: "cta_click",

  // search
  searchOpen: "search_open",
  searchSubmit: "search_submit",
  searchResultClick: "search_result_click",

  // events
  eventRegisterClick: "event_register_click",
  eventCardClick: "event_card_click",
  eventBannerDismiss: "event_banner_dismiss",

  // blog
  blogPostClick: "blog_post_click",
  blogFilter: "blog_filter",

  // recordings + links
  recordingPlay: "recording_play",
  linkClick: "link_click",
  linkRedirect: "link_redirect", // server

  // contact / lead / newsletter
  contactModalOpen: "contact_modal_open",
  contactSubmit: "contact_submit", // server
  generateLead: "generate_lead", // GA4 conversion (client)
  newsletterSignup: "newsletter_signup",

  // store
  storeProductView: "store_product_view",
  storeProductClick: "store_product_click",
  storeVariantSelect: "store_variant_select",
  storeReserveSubmit: "store_reserve_submit",
  storeReserveSuccess: "store_reserve_success", // server + client mirror
  storeReserveError: "store_reserve_error", // server
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
