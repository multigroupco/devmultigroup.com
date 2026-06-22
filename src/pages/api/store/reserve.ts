import type { APIRoute } from "astro";
import { getEnv } from "@/lib/runtime";
import { reserve } from "@/lib/store/orders";
import { captureServer } from "@/lib/analytics-server";
import { EVENTS } from "@/lib/events";

// Public reservation endpoint. Creates a pre-order (the pickup ticket); payment
// is collected at the event (deferred). Redirects to the ticket on success, or
// back to the product with an error message.
export const POST: APIRoute = async ({ request, locals }) => {
  const env = getEnv(locals);
  const form = await request.formData();
  const slug = String(form.get("slug") || "");
  const back = slug ? `/store/p/${slug}` : "/store";

  const productId = String(form.get("productId") || "");
  const variantId = String(form.get("variantId") || "") || undefined;
  const qty = Number(form.get("qty") || 1);
  const buyerEmail = String(form.get("buyerEmail") || "");

  const result = await reserve(env, {
    productId,
    variantId,
    qty,
    buyerName: String(form.get("buyerName") || ""),
    buyerEmail,
  });

  // Analytics (server-authoritative). Conversion on success, friction on error.
  // The client mirrors the GA4 conversion on the ticket page. Email is only a
  // distinct_id, never a property value.
  const track = result.ok
    ? captureServer(env, EVENTS.storeReserveSuccess, {
        request,
        distinctId: buyerEmail.toLowerCase() || undefined,
        properties: {
          order_no: result.order.order_no,
          product_id: productId,
          variant_id: variantId || "",
          qty,
          total_minor: result.order.total_minor,
          order_status: result.order.status,
          is_duplicate: result.duplicate,
        },
      })
    : captureServer(env, EVENTS.storeReserveError, {
        request,
        properties: { error_code: result.error, product_id: productId },
      });
  const ctx = (locals as App.Locals).runtime?.ctx;
  if (ctx?.waitUntil) ctx.waitUntil(track);

  const location = result.ok
    ? `/store/ticket/${result.order.order_no}`
    : `${back}?err=${encodeURIComponent(result.error)}`;
  return new Response(null, { status: 303, headers: { Location: location } });
};
