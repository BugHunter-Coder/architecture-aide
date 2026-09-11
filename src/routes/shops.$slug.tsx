import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Minus, Plus, ShoppingBag, Store, MapPin } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { money, type Product, type Shop } from "@/lib/marketplace";

export const Route = createFileRoute("/shops/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} — Nearby local shop` },
      {
        name: "description",
        content: "Browse this local shop's catalogue and order for delivery in your area.",
      },
      { property: "og:title", content: `${params.slug.replace(/-/g, " ")} — Nearby` },
      {
        property: "og:description",
        content: "Order daily essentials from this neighbourhood shop.",
      },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  const { slug } = Route.useParams();
  const { user } = useSession();
  const navigate = useNavigate();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [placing, setPlacing] = useState(false);

  const { data: shop, isLoading } = useQuery({
    queryKey: ["shop", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("shops").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data as Shop | null;
    },
  });

  const { data: products = [] } = useQuery({
    enabled: !!shop?.id,
    queryKey: ["products", shop?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("shop_id", shop!.id)
        .eq("is_available", true)
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
  });

  const lines = useMemo(
    () =>
      products
        .filter((p) => cart[p.id])
        .map((p) => ({ product: p, qty: cart[p.id]!, subtotal: p.price * cart[p.id]! })),
    [products, cart],
  );
  const total = lines.reduce((sum, l) => sum + l.subtotal, 0);

  function setQty(id: string, delta: number) {
    setCart((prev) => {
      const next = Math.max(0, (prev[id] ?? 0) + delta);
      const copy = { ...prev };
      if (next === 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });
  }

  async function placeOrder() {
    if (!user || !shop || lines.length === 0) return;
    if (!address.trim() || !phone.trim()) {
      toast.error("Add a delivery address and phone number");
      return;
    }
    setPlacing(true);
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        shop_id: shop.id,
        customer_id: user.id,
        customer_name: name || (user.email ?? ""),
        customer_phone: phone,
        delivery_address: address,
        payment_method: "cod",
        total,
      })
      .select()
      .single();

    if (error || !order) {
      setPlacing(false);
      toast.error(error?.message ?? "Could not place the order");
      return;
    }

    const { error: itemError } = await supabase.from("order_items").insert(
      lines.map((l) => ({
        order_id: order.id,
        product_id: l.product.id,
        product_name: l.product.name,
        unit_price: l.product.price,
        quantity: l.qty,
      })),
    );
    setPlacing(false);
    if (itemError) return toast.error(itemError.message);

    setCart({});
    toast.success("Order placed — pay the rider on delivery");
    navigate({ to: "/orders" });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <p className="mx-auto max-w-6xl px-4 py-16 text-muted-foreground">Loading shop…</p>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="mx-auto max-w-6xl px-4 py-24 text-center">
          <h1 className="text-2xl font-semibold">Shop not found</h1>
          <Button asChild className="mt-6">
            <Link to="/">Browse other shops</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="border-b border-border bg-secondary/50">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center">
          <div className="size-20 shrink-0 overflow-hidden rounded-2xl bg-muted">
            {shop.image_url ? (
              <img src={shop.image_url} alt={shop.name} className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground">
                <Store className="size-7" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold">{shop.name}</h1>
              <Badge variant={shop.is_open ? "default" : "secondary"}>
                {shop.is_open ? "Open now" : "Closed"}
              </Badge>
            </div>
            <p className="mt-1 text-muted-foreground">{shop.description || shop.category}</p>
            <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5" /> {shop.address || shop.area} · delivers within{" "}
              {shop.delivery_radius_km} km
            </p>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_360px]">
        <div>
          <h2 className="mb-4 text-xl font-semibold">Catalogue</h2>
          {products.length === 0 ? (
            <p className="text-muted-foreground">This shop hasn't added products yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {products.map((p) => (
                <div key={p.id} className="surface-card flex gap-4 p-4">
                  <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} loading="lazy" className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">
                        <ShoppingBag className="size-5" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{p.name}</p>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-semibold">
                        {money(p.price)}
                        <span className="text-xs font-normal text-muted-foreground"> / {p.unit}</span>
                      </span>
                      {p.stock <= 0 ? (
                        <Badge variant="secondary">Out of stock</Badge>
                      ) : cart[p.id] ? (
                        <div className="flex items-center gap-2">
                          <Button size="icon" variant="secondary" onClick={() => setQty(p.id, -1)}>
                            <Minus className="size-4" />
                          </Button>
                          <span className="w-6 text-center text-sm">{cart[p.id]}</span>
                          <Button size="icon" variant="secondary" onClick={() => setQty(p.id, 1)}>
                            <Plus className="size-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" onClick={() => setQty(p.id, 1)}>
                          Add
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="h-fit lg:sticky lg:top-24">
          <div className="surface-card p-5">
            <h2 className="text-lg font-semibold">Your basket</h2>
            {lines.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Add items to get started.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {lines.map((l) => (
                  <div key={l.product.id} className="flex justify-between text-sm">
                    <span>
                      {l.product.name} × {l.qty}
                    </span>
                    <span>{money(l.subtotal)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-border pt-3 font-semibold">
                  <span>Total</span>
                  <span>{money(total)}</span>
                </div>

                {!user ? (
                  <Button asChild className="w-full">
                    <Link to="/auth">Sign in to order</Link>
                  </Button>
                ) : !shop.is_open ? (
                  <p className="text-sm text-muted-foreground">
                    This shop is closed right now. Try again later.
                  </p>
                ) : (
                  <div className="space-y-3 pt-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="c-name">Name</Label>
                      <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="c-phone">Phone</Label>
                      <Input id="c-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="c-addr">Delivery address</Label>
                      <Textarea id="c-addr" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} />
                    </div>
                    <p className="text-xs text-muted-foreground">Payment: cash on delivery.</p>
                    <Button className="w-full" onClick={placeOrder} disabled={placing}>
                      {placing ? "Placing order…" : `Place order · ${money(total)}`}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
