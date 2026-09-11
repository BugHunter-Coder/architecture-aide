import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PackageSearch } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { money, STATUS_LABELS, type Order, type OrderItem, type Shop } from "@/lib/marketplace";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({
    meta: [
      { title: "My orders — Nearby" },
      { name: "description", content: "Track your local shop orders and delivery status." },
      { property: "og:title", content: "My orders — Nearby" },
      { property: "og:description", content: "Track your local orders and rider status." },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const { user } = useSession();

  const { data, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["my-orders", user?.id],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const list = (orders ?? []) as Order[];
      if (list.length === 0) return { orders: list, items: [] as OrderItem[], shops: [] as Shop[] };
      const { data: items } = await supabase
        .from("order_items")
        .select("*")
        .in("order_id", list.map((o) => o.id));
      const { data: shops } = await supabase
        .from("shops")
        .select("*")
        .in("id", Array.from(new Set(list.map((o) => o.shop_id))));
      return {
        orders: list,
        items: (items ?? []) as OrderItem[],
        shops: (shops ?? []) as Shop[],
      };
    },
  });

  const orders = data?.orders ?? [];

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="mb-6 text-3xl font-semibold">My orders</h1>

        {isLoading ? (
          <p className="text-muted-foreground">Loading orders…</p>
        ) : orders.length === 0 ? (
          <div className="surface-card p-10 text-center">
            <PackageSearch className="mx-auto mb-3 size-8 text-muted-foreground" />
            <p className="font-medium">No orders yet</p>
            <Button asChild className="mt-5">
              <Link to="/">Browse shops</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const shop = data?.shops.find((s) => s.id === order.shop_id);
              const items = (data?.items ?? []).filter((i) => i.order_id === order.id);
              return (
                <div key={order.id} className="surface-card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{shop?.name ?? "Shop"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleString()} · Cash on delivery
                      </p>
                    </div>
                    <Badge variant={order.status === "delivered" ? "default" : "secondary"}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </Badge>
                  </div>

                  <ul className="mt-4 space-y-1 text-sm">
                    {items.map((i) => (
                      <li key={i.id} className="flex justify-between">
                        <span>
                          {i.product_name} × {i.quantity}
                        </span>
                        <span>{money(i.unit_price * i.quantity)}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-3 flex justify-between border-t border-border pt-3 font-semibold">
                    <span>Total</span>
                    <span>{money(order.total)}</span>
                  </div>

                  {order.rider_name && (
                    <p className="mt-3 rounded-lg bg-secondary p-3 text-sm">
                      Rider: {order.rider_name}
                      {order.rider_phone ? ` · ${order.rider_phone}` : ""}
                      {order.eta_minutes ? ` · arriving in ~${order.eta_minutes} min` : ""}
                    </p>
                  )}
                  <p className="mt-3 text-sm text-muted-foreground">
                    Delivering to: {order.delivery_address}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
