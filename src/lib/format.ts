// Date/number formatting. Community lives in Istanbul; default to that tz.

const TZ = "Europe/Istanbul";
const LOCALE = "tr-TR";

const toDate = (sec: number | null | undefined): Date | null =>
  sec == null ? null : new Date(sec * 1000);

export function formatDate(
  sec: number | null | undefined,
  opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" },
): string {
  const d = toDate(sec);
  if (!d) return "TBA";
  return new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, ...opts }).format(d);
}

export function formatTime(sec: number | null | undefined): string {
  const d = toDate(sec);
  if (!d) return "";
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export function formatDateTime(sec: number | null | undefined): string {
  const d = toDate(sec);
  if (!d) return "TBA";
  return `${formatDate(sec)} · ${formatTime(sec)}`;
}

/** "Sat, 12 Jul" style short weekday + day + month for event cards. */
export function formatDayLabel(sec: number | null | undefined): {
  weekday: string;
  day: string;
  month: string;
} {
  const d = toDate(sec);
  if (!d) return { weekday: "", day: "--", month: "TBA" };
  const f = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, ...o }).format(d);
  return {
    weekday: f({ weekday: "short" }),
    day: f({ day: "2-digit" }),
    month: f({ month: "short" }),
  };
}

export function isUpcoming(sec: number | null | undefined): boolean {
  if (sec == null) return true; // TBA counts as upcoming
  return sec * 1000 >= Date.now() - 1000 * 60 * 60 * 6; // 6h grace
}

/** ISO 8601 string for schema.org / <time datetime>. */
export function iso(sec: number | null | undefined): string {
  const d = toDate(sec);
  return d ? d.toISOString() : "";
}

export function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "k";
  return String(n);
}
