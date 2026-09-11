export type Shop = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  address: string;
  area: string;
  lat: number;
  lng: number;
  delivery_radius_km: number;
  image_url: string | null;
  is_open: boolean;
  created_at: string;
};

export type Product = {
  id: string;
  shop_id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  unit: string;
  image_url: string | null;
  is_available: boolean;
};

export type Order = {
  id: string;
  shop_id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  status: string;
  payment_method: string;
  total: number;
  rider_name: string | null;
  rider_phone: string | null;
  eta_minutes: number | null;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
};

export const ORDER_STATUSES = [
  "placed",
  "accepted",
  "packed",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

export const STATUS_LABELS: Record<string, string> = {
  placed: "Placed",
  accepted: "Accepted",
  packed: "Packed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const CATEGORIES = [
  "Grocery",
  "Bakery",
  "Pharmacy",
  "Fruits & Vegetables",
  "Meat & Fish",
  "Stationery",
  "Flowers",
  "General",
];

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Straight-line distance in km between two coordinates. */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}
