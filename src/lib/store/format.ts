// Store formatting. Money is stored as INTEGER minor units (kuruş); format only
// at render. Dates reuse the site's Europe/Istanbul helpers.

export { formatDate, formatDateTime, formatTime, iso } from "../format";

/** kuruş → "₺149,90" (tr-TR). */
export function money(minor: number | null | undefined): string {
  const v = Math.round(Number(minor) || 0) / 100;
  try {
    return "₺" + v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch {
    return "₺" + v.toFixed(2).replace(".", ",");
  }
}

/** kuruş → "149,90" (no symbol). */
export function amount(minor: number | null | undefined): string {
  return money(minor).replace("₺", "");
}

/** Compact countdown parts from a target epoch (seconds). */
export function countdownParts(targetSec: number | null | undefined, nowSec: number): {
  done: boolean;
  d: number;
  h: number;
  m: number;
  s: number;
} {
  if (targetSec == null) return { done: false, d: 0, h: 0, m: 0, s: 0 };
  let diff = targetSec - nowSec;
  if (diff <= 0) return { done: true, d: 0, h: 0, m: 0, s: 0 };
  const d = Math.floor(diff / 86400);
  diff -= d * 86400;
  const h = Math.floor(diff / 3600);
  diff -= h * 3600;
  const m = Math.floor(diff / 60);
  const s = diff - m * 60;
  return { done: false, d, h, m, s };
}
