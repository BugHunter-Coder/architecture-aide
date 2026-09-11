import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { MapPin, Search, Store } from "lucide-react";
import heroImage from "@/assets/market-hero.jpg";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { distanceKm, type Shop } from "@/lib/marketplace";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nearby — Shop from local stores around you" },
      {
        name: "description",
        content:
          "Discover shops in your neighbourhood, order groceries and daily essentials, and get them delivered by a local rider.",
      },
      { property: "og:title", content: "Nearby — Shop from local stores around you" },
      {
        property: "og:description",
        content:
          "Discover shops in your neighbourhood, order daily essentials and get them delivered locally.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const { data: shops = [], isLoading } = useQuery({
    queryKey: ["shops"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shops")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Shop[];
    },
  });

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 },
    );
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = shops.filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.area.toLowerCase().includes(q),
    );
    if (!coords) return filtered;
    return filtered
      .map((s) => ({ shop: s, km: distanceKm(coords, { lat: s.lat, lng: s.lng }) }))
      .sort((a, b) => a.km - b.km)
      .map((x) => ({ ...x.shop, _km: x.km }) as Shop & { _km: number });
  }, [shops, query, coords]);

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="relative overflow-hidden border-b border-border">
        <img
          src={heroImage}
          alt="A neighbourhood street market at golden hour"
          width={1600}
          height={912}
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-r from-background via-background/85 to-background/25" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <Badge variant="secondary" className="mb-4">
            One metro, hundreds of small shops
          </Badge>
          <h1 className="max-w-2xl text-balance-tight text-4xl font-semibold leading-tight sm:text-5xl">
            Everything from the shops on your street, delivered today.
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground">
            Find stores near you, fill a basket, and pay the rider on delivery. Shop owners
            can open their own storefront in minutes.
          </p>

          <div className="mt-8 flex w-full max-w-xl flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search shops, areas or categories"
                className="h-11 pl-9"
              />
            </div>
            <Button className="h-11" variant="secondary" onClick={useMyLocation} disabled={locating}>
              <MapPin className="mr-1 size-4" />
              {coords ? "Sorted by distance" : locating ? "Locating…" : "Use my location"}
            </Button>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold">
            {coords ? "Shops nearest to you" : "Shops on the platform"}
          </h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/merchant">Open your shop</Link>
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading shops…</p>
        ) : visible.length === 0 ? (
          <div className="surface-card p-10 text-center">
            <Store className="mx-auto mb-3 size-8 text-muted-foreground" />
            <p className="font-medium">No shops yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Be the first — open a shop and publish your catalogue.
            </p>
            <Button asChild className="mt-5">
              <Link to="/merchant">Open a shop</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((shop) => (
              <Link
                key={shop.id}
                to="/shops/$slug"
                params={{ slug: shop.slug }}
                className="surface-card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="aspect-[16/10] overflow-hidden bg-muted">
                  {shop.image_url ? (
                    <img
                      src={shop.image_url}
                      alt={shop.name}
                      loading="lazy"
                      className="size-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-muted-foreground">
                      <Store className="size-8" />
                    </div>
                  )}
                </div>
                <div className="space-y-2 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-semibold">{shop.name}</h3>
                    <Badge variant={shop.is_open ? "default" : "secondary"}>
                      {shop.is_open ? "Open" : "Closed"}
                    </Badge>
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {shop.description || shop.category}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" />
                    {shop.area || shop.address || "Local area"}
                    {"_km" in shop && typeof (shop as { _km?: number })._km === "number"
                      ? ` · ${(shop as { _km: number })._km.toFixed(1)} km away`
                      : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
