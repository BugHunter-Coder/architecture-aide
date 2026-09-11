CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.owns_shop(_shop_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.shops s WHERE s.id = _shop_id AND s.owner_id = auth.uid());
$$;
CREATE OR REPLACE FUNCTION private.can_view_order(_order_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = _order_id
      AND (o.customer_id = auth.uid() OR EXISTS (SELECT 1 FROM public.shops s WHERE s.id = o.shop_id AND s.owner_id = auth.uid()))
  );
$$;
CREATE OR REPLACE FUNCTION private.owns_order(_order_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.orders o WHERE o.id = _order_id AND o.customer_id = auth.uid());
$$;
GRANT EXECUTE ON FUNCTION private.owns_shop(uuid), private.can_view_order(uuid), private.owns_order(uuid) TO authenticated, service_role;

DROP POLICY "products owner write" ON public.products;
CREATE POLICY "products owner write" ON public.products FOR ALL TO authenticated
  USING (private.owns_shop(shop_id)) WITH CHECK (private.owns_shop(shop_id));

DROP POLICY "orders customer read" ON public.orders;
CREATE POLICY "orders customer read" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = customer_id OR private.owns_shop(shop_id));
DROP POLICY "orders shop update" ON public.orders;
CREATE POLICY "orders shop update" ON public.orders FOR UPDATE TO authenticated USING (private.owns_shop(shop_id)) WITH CHECK (private.owns_shop(shop_id));

DROP POLICY "order items read" ON public.order_items;
CREATE POLICY "order items read" ON public.order_items FOR SELECT TO authenticated USING (private.can_view_order(order_id));
DROP POLICY "order items insert" ON public.order_items;
CREATE POLICY "order items insert" ON public.order_items FOR INSERT TO authenticated WITH CHECK (private.owns_order(order_id));

DROP FUNCTION public.owns_shop(uuid);
DROP FUNCTION public.can_view_order(uuid);
DROP FUNCTION public.owns_order(uuid);
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;