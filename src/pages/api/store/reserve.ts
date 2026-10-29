import type { APIRoute } from "astro";
import { getEnv } from "@/lib/runtime";
import { reserve } from "@/lib/store/orders";

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


  const location = result.ok
    ? `/store/ticket/${result.order.order_no}`
    : `${back}?err=${encodeURIComponent(result.error)}`;
  return new Response(null, { status: 303, headers: { Location: location } });
};
