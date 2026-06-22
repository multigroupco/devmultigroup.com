// Store row shapes — mirror migrations-store/0001_store_init.sql.
// Money is INTEGER minor units (kuruş). Booleans 0/1. Timestamps unix seconds.

export type DropStatus = "draft" | "open" | "closed" | "collected";
export type ProductCategory = "giyim" | "yasam" | "koleksiyon";
export type FulfillmentMode = "pod" | "preorder" | "stocked";
export type OrderStatus = "reserved" | "paid" | "delivered" | "cancelled";
export type PaymentStatus = "unpaid" | "paid" | "refunded";

export interface DropRow {
  id: string;
  slug: string;
  title: string;
  blurb: string;
  cover_image: string;
  opens_at: number | null;
  closes_at: number | null;
  pickup_event_id: string;
  pickup_label: string;
  pickup_at: number | null;
  status: DropStatus;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface ProductRow {
  id: string;
  slug: string;
  drop_id: string;
  name: string;
  tagline: string;
  description: string;
  images: string; // JSON array of R2 keys / urls
  base_price_minor: number;
  stock_quantity: number;
  category: ProductCategory;
  fulfillment_mode: FulfillmentMode;
  material: string;
  fit_note: string;
  size_chart: string;
  is_featured: number;
  is_active: number;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface VariantRow {
  id: string;
  product_id: string;
  label: string;
  sku: string;
  price_modifier_minor: number;
  stock_quantity: number;
  sort_order: number;
  is_active: number;
  created_at: number;
  updated_at: number;
}

export interface OrderRow {
  id: string;
  order_no: string;
  drop_id: string;
  user_id: string | null;
  buyer_name: string;
  buyer_email: string;
  pickup_event_id: string;
  pickup_label: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: string;
  subtotal_minor: number;
  vat_minor: number;
  shipping_minor: number;
  total_minor: number;
  notes: string;
  created_at: number;
  updated_at: number;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string;
  snapshot_name: string;
  snapshot_variant: string;
  unit_price_minor: number;
  qty: number;
  line_total_minor: number;
  created_at: number;
}
