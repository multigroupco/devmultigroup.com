// Error reporting without a third party: errors and log lines go to the
// Worker's own logs (console). Sentry, PostHog and GA were removed on
// 2026-10-29; the site sends nothing about its visitors anywhere.
//
// The exported names are the ones the rest of the site already calls.

export interface CaptureContext {
  request?: Request;
  level?: "fatal" | "error" | "warning" | "info";
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  transaction?: string;
}

function where(ctx: CaptureContext): string {
  if (!ctx.request) return "";
  const u = new URL(ctx.request.url);
  return ` ${ctx.request.method} ${u.pathname}`;
}

export async function captureServerException(_env: Env, err: unknown, ctx: CaptureContext = {}): Promise<void> {
  console.error(`[error]${where(ctx)}`, err, ctx.tags ?? "", ctx.extra ?? "");
}

export function logEvent(
  _locals: App.Locals,
  level: "debug" | "info" | "warn" | "error",
  message: string,
  attributes: Record<string, string | number | boolean> = {},
): void {
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(`[${level}] ${message}`, attributes);
}

export function reportBackground(_env: Env, err: unknown, ctx: CaptureContext & { area?: string } = {}): void {
  console.error(`[error]${ctx.area ? ` ${ctx.area}` : ""}${where(ctx)}`, err);
}

export function reportError(_locals: App.Locals, err: unknown, ctx: CaptureContext & { area?: string } = {}): void {
  console.error(`[error]${ctx.area ? ` ${ctx.area}` : ""}${where(ctx)}`, err);
}
