
-- Roles
create type public.app_role as enum ('admin','customer');
create type public.order_status as enum ('aguardando_pagamento','pagamento_aprovado','em_preparacao','enviado','entregue','cancelado');
create type public.payment_status as enum ('pendente','aprovado','recusado','reembolsado','cancelado');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  phone text,
  cpf text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());

-- Signup trigger: profile + role (first account becomes admin)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, phone, cpf)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), coalesce(new.email,''),
          new.raw_user_meta_data->>'phone', new.raw_user_meta_data->>'cpf');
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  insert into public.user_roles (user_id, role) values (new.id, 'customer');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Categories
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now()
);
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "categories public read" on public.categories for select to anon, authenticated using (true);
create policy "categories admin write" on public.categories for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Products
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  category_id uuid references public.categories(id) on delete set null,
  price numeric(10,2) not null check (price >= 0),
  promo_price numeric(10,2) check (promo_price is null or promo_price >= 0),
  stock integer not null default 0 check (stock >= 0),
  low_stock_threshold integer not null default 5,
  image_url text,
  gallery text[] not null default '{}',
  featured boolean not null default false,
  active boolean not null default true,
  sold_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "active products public" on public.products for select to anon, authenticated using (active or public.has_role(auth.uid(),'admin'));
create policy "products admin write" on public.products for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Addresses
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  label text not null default 'Casa',
  recipient text not null,
  zip text not null,
  street text not null,
  number text not null,
  complement text,
  district text not null,
  city text not null,
  state text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.addresses to authenticated;
grant all on public.addresses to service_role;
alter table public.addresses enable row level security;
create policy "own addresses" on public.addresses for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "admin read addresses" on public.addresses for select to authenticated using (public.has_role(auth.uid(),'admin'));

-- Orders
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity unique,
  user_id uuid not null,
  idempotency_key text not null,
  status public.order_status not null default 'aguardando_pagamento',
  payment_status public.payment_status not null default 'pendente',
  payment_method text not null,
  subtotal numeric(10,2) not null,
  shipping numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  shipping_address jsonb not null,
  customer_name text not null default '',
  customer_email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
grant select on public.orders to authenticated;
grant update on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "own orders read" on public.orders for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  image_url text,
  unit_price numeric(10,2) not null,
  quantity integer not null check (quantity > 0),
  subtotal numeric(10,2) not null
);
grant select on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "order items read" on public.order_items for select to authenticated using (
  exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_role(auth.uid(),'admin'))));

-- Stock movements
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  delta integer not null,
  reason text not null,
  order_id uuid references public.orders(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now()
);
grant select on public.stock_movements to authenticated;
grant all on public.stock_movements to service_role;
alter table public.stock_movements enable row level security;
create policy "admin read movements" on public.stock_movements for select to authenticated using (public.has_role(auth.uid(),'admin'));

-- Notifications (user_id null = admin notification)
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  for_admin boolean not null default false,
  kind text not null,
  title text not null,
  body text not null default '',
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "notifications read" on public.notifications for select to authenticated using ((user_id = auth.uid()) or (for_admin and public.has_role(auth.uid(),'admin')));
create policy "notifications mark read" on public.notifications for update to authenticated using ((user_id = auth.uid()) or (for_admin and public.has_role(auth.uid(),'admin'))) with check ((user_id = auth.uid()) or (for_admin and public.has_role(auth.uid(),'admin')));

-- Stock alert trigger
create or replace function public.stock_alerts()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.stock = 0 and old.stock > 0 then
    insert into public.notifications (for_admin, kind, title, body, link)
    values (true, 'sem_estoque', 'Produto sem estoque', new.name || ' esgotou.', '/admin/estoque');
  elsif new.stock <= new.low_stock_threshold and old.stock > new.low_stock_threshold then
    insert into public.notifications (for_admin, kind, title, body, link)
    values (true, 'estoque_baixo', 'Estoque baixo', new.name || ' tem apenas ' || new.stock || ' unidade(s).', '/admin/estoque');
  end if;
  new.updated_at = now();
  return new;
end $$;
create trigger products_stock_alerts before update on public.products for each row execute function public.stock_alerts();

-- Place order: server-side price & stock validation, row locks, idempotent
create or replace function public.place_order(_items jsonb, _address jsonb, _payment_method text, _idempotency_key text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  _existing uuid;
  _order_id uuid;
  _item jsonb;
  _p public.products%rowtype;
  _qty int;
  _unit numeric(10,2);
  _subtotal numeric(10,2) := 0;
  _shipping numeric(10,2);
  _prof public.profiles%rowtype;
begin
  if _uid is null then raise exception 'Faça login para finalizar a compra'; end if;
  if _payment_method not in ('pix','cartao','boleto') then raise exception 'Forma de pagamento inválida'; end if;
  if jsonb_typeof(_items) <> 'array' or jsonb_array_length(_items) = 0 then raise exception 'Carrinho vazio'; end if;
  if coalesce(_address->>'street','') = '' or coalesce(_address->>'zip','') = '' or coalesce(_address->>'city','') = '' then
    raise exception 'Endereço de entrega incompleto';
  end if;

  select id into _existing from public.orders where user_id = _uid and idempotency_key = _idempotency_key;
  if _existing is not null then return _existing; end if;

  select * into _prof from public.profiles where id = _uid;

  insert into public.orders (user_id, idempotency_key, payment_method, subtotal, total, shipping_address, customer_name, customer_email)
  values (_uid, _idempotency_key, _payment_method, 0, 0, _address, coalesce(_prof.full_name,''), coalesce(_prof.email,''))
  returning id into _order_id;

  for _item in select * from jsonb_array_elements(_items) loop
    _qty := (_item->>'quantity')::int;
    if _qty is null or _qty < 1 or _qty > 99 then raise exception 'Quantidade inválida'; end if;
    select * into _p from public.products where id = (_item->>'product_id')::uuid and active for update;
    if not found then raise exception 'Produto indisponível'; end if;
    if _p.stock < _qty then raise exception 'Estoque insuficiente para %', _p.name; end if;
    _unit := coalesce(_p.promo_price, _p.price);
    update public.products set stock = stock - _qty, sold_count = sold_count + _qty where id = _p.id;
    insert into public.order_items (order_id, product_id, product_name, image_url, unit_price, quantity, subtotal)
    values (_order_id, _p.id, _p.name, _p.image_url, _unit, _qty, _unit * _qty);
    insert into public.stock_movements (product_id, product_name, delta, reason, order_id, created_by)
    values (_p.id, _p.name, -_qty, 'pedido', _order_id, _uid);
    _subtotal := _subtotal + _unit * _qty;
  end loop;

  _shipping := case when _subtotal >= 299 then 0 else 24.90 end;
  update public.orders set subtotal = _subtotal, shipping = _shipping, total = _subtotal + _shipping where id = _order_id;

  insert into public.notifications (user_id, kind, title, body, link)
  values (_uid, 'pedido_realizado', 'Pedido realizado', 'Recebemos seu pedido. Aguardando pagamento.', '/conta/pedidos/' || _order_id);
  insert into public.notifications (for_admin, kind, title, body, link)
  values (true, 'pedido_realizado', 'Novo pedido', coalesce(_prof.full_name,'Cliente') || ' fez um pedido de R$ ' || (_subtotal + _shipping), '/admin/pedidos');
  return _order_id;
end $$;
revoke execute on function public.place_order(jsonb, jsonb, text, text) from anon, public;
grant execute on function public.place_order(jsonb, jsonb, text, text) to authenticated;

-- Admin: update order status (cancel restores stock once)
create or replace function public.admin_update_order(_order_id uuid, _status public.order_status, _payment public.payment_status)
returns void language plpgsql security definer set search_path = public as $$
declare _o public.orders%rowtype; _it record; _label text;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Acesso negado'; end if;
  select * into _o from public.orders where id = _order_id for update;
  if not found then raise exception 'Pedido não encontrado'; end if;
  if _o.status = 'cancelado' and _status <> 'cancelado' then raise exception 'Pedido cancelado não pode ser reaberto'; end if;
  if _status = 'cancelado' and _o.status <> 'cancelado' then
    for _it in select * from public.order_items where order_id = _order_id loop
      if _it.product_id is not null then
        update public.products set stock = stock + _it.quantity, sold_count = greatest(sold_count - _it.quantity,0) where id = _it.product_id;
        insert into public.stock_movements (product_id, product_name, delta, reason, order_id, created_by)
        values (_it.product_id, _it.product_name, _it.quantity, 'cancelamento', _order_id, auth.uid());
      end if;
    end loop;
  end if;
  update public.orders set status = _status, payment_status = _payment, updated_at = now() where id = _order_id;
  if _status <> _o.status then
    _label := case _status when 'pagamento_aprovado' then 'Pagamento aprovado' when 'em_preparacao' then 'Pedido em preparação'
      when 'enviado' then 'Pedido enviado' when 'entregue' then 'Pedido entregue' when 'cancelado' then 'Pedido cancelado' else 'Aguardando pagamento' end;
    insert into public.notifications (user_id, kind, title, body, link)
    values (_o.user_id, _status::text, _label, 'Pedido #' || _o.number || ': ' || _label || '.', '/conta/pedidos/' || _order_id);
  end if;
end $$;
revoke execute on function public.admin_update_order(uuid, public.order_status, public.payment_status) from anon, public;
grant execute on function public.admin_update_order(uuid, public.order_status, public.payment_status) to authenticated;

-- Admin: manual stock adjustment
create or replace function public.admin_adjust_stock(_product_id uuid, _delta int, _reason text)
returns void language plpgsql security definer set search_path = public as $$
declare _p public.products%rowtype;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Acesso negado'; end if;
  select * into _p from public.products where id = _product_id for update;
  if not found then raise exception 'Produto não encontrado'; end if;
  if _p.stock + _delta < 0 then raise exception 'Estoque não pode ficar negativo'; end if;
  update public.products set stock = stock + _delta where id = _product_id;
  insert into public.stock_movements (product_id, product_name, delta, reason, created_by)
  values (_product_id, _p.name, _delta, coalesce(nullif(_reason,''),'ajuste manual'), auth.uid());
end $$;
revoke execute on function public.admin_adjust_stock(uuid, int, text) from anon, public;
grant execute on function public.admin_adjust_stock(uuid, int, text) to authenticated;

-- Storage policies for product images
create policy "product images public read" on storage.objects for select using (bucket_id = 'product-images');
create policy "product images admin insert" on storage.objects for insert to authenticated with check (bucket_id = 'product-images' and public.has_role(auth.uid(),'admin'));
create policy "product images admin update" on storage.objects for update to authenticated using (bucket_id = 'product-images' and public.has_role(auth.uid(),'admin'));
create policy "product images admin delete" on storage.objects for delete to authenticated using (bucket_id = 'product-images' and public.has_role(auth.uid(),'admin'));

-- Seed
insert into public.categories (name, slug, description) values
 ('Fones de Ouvido','fones','Áudio imersivo sem fio e com fio'),
 ('Smartwatches','smartwatches','Tecnologia no seu pulso'),
 ('Periféricos Gamer','gamer','Teclados, mouses e acessórios'),
 ('Caixas de Som','caixas-de-som','Som potente em qualquer lugar'),
 ('Acessórios','acessorios','Carregadores, cabos e power banks');

insert into public.products (name, description, category_id, price, promo_price, stock, image_url, featured, sold_count, created_at) values
 ('Fone Kamado ANC Pro','Fone over-ear com cancelamento ativo de ruído, 40h de bateria e drivers de 40mm. Conexão Bluetooth 5.3 multiponto.',(select id from public.categories where slug='fones'),899.90,749.90,18,'/images/headphones.jpg',true,42, now() - interval '40 days'),
 ('Earbuds Hinokami TWS','Fones intra-auriculares sem fio com estojo de carregamento, resistência IPX5 e modo transparência.',(select id from public.categories where slug='fones'),349.90,null,35,'/images/earbuds.jpg',true,87, now() - interval '20 days'),
 ('Smartwatch Mizu S2','Tela AMOLED 1.43", GPS integrado, monitor cardíaco e de sono, até 10 dias de bateria.',(select id from public.categories where slug='smartwatches'),1299.00,1099.00,9,'/images/smartwatch.jpg',true,31, now() - interval '10 days'),
 ('Teclado Mecânico Nichirin','Teclado mecânico 75% hot-swap, switches lineares, iluminação RGB vermelha e keycaps PBT.',(select id from public.categories where slug='gamer'),579.90,null,22,'/images/keyboard.jpg',true,56, now() - interval '5 days'),
 ('Mouse Gamer Hanafuda','Sensor óptico 26.000 DPI, 58g ultraleve, conexão sem fio 2.4GHz e 70h de bateria.',(select id from public.categories where slug='gamer'),399.90,329.90,4,'/images/mouse.jpg',false,64, now() - interval '3 days'),
 ('Caixa de Som Taiko 360','Caixa Bluetooth à prova d''água com som 360°, graves profundos e 20h de reprodução.',(select id from public.categories where slug='caixas-de-som'),649.90,null,14,'/images/speaker.jpg',true,28, now() - interval '2 days'),
 ('Power Bank Kasugai 20.000mAh','Carregamento rápido 65W USB-C PD, carrega notebooks, tablets e celulares.',(select id from public.categories where slug='acessorios'),279.90,229.90,40,'/images/powerbank.jpg',false,73, now() - interval '30 days'),
 ('Headset Gamer Zenitsu 7.1','Headset com som surround 7.1 virtual, microfone removível com cancelamento de ruído.',(select id from public.categories where slug='fones'),459.90,null,0,'/images/headset.jpg',false,19, now() - interval '1 days');
