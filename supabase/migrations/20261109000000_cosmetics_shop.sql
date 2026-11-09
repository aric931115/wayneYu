create table if not exists public.cosmetic_purchases (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  slot text not null check (slot in ('avatar_frame', 'app_theme')),
  price integer not null check (price >= 0),
  purchased_at timestamptz not null default now(),
  equipped boolean not null default false,
  primary key (user_id, item_id)
);

alter table public.cosmetic_purchases enable row level security;

drop policy if exists "Users can read their own cosmetic purchases" on public.cosmetic_purchases;
create policy "Users can read their own cosmetic purchases"
  on public.cosmetic_purchases
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on public.cosmetic_purchases from anon, authenticated;
grant select on public.cosmetic_purchases to authenticated;

create or replace function public.get_my_available_points()
returns integer
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select greatest(
    0,
    coalesce(public.get_my_total_points(), 0)::integer
      - coalesce((
          select sum(cp.price)
          from public.cosmetic_purchases cp
          where cp.user_id = auth.uid()
        ), 0)::integer
  );
$$;

create or replace function public.purchase_cosmetic(p_item_id text)
returns integer
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_slot text;
  v_price integer;
  v_available integer;
begin
  if v_user_id is null then
    raise exception '請先登入後再購買';
  end if;

  perform 1 from auth.users where id = v_user_id for update;

  select item.slot, item.price
  into v_slot, v_price
  from (values
    ('avatar-frame-aurora', 'avatar_frame', 30),
    ('avatar-frame-royal', 'avatar_frame', 50),
    ('theme-sakura', 'app_theme', 40),
    ('theme-ocean', 'app_theme', 40)
  ) as item(item_id, slot, price)
  where item.item_id = p_item_id;

  if v_slot is null then
    raise exception '找不到此商品';
  end if;

  if exists (
    select 1 from public.cosmetic_purchases
    where user_id = v_user_id and item_id = p_item_id
  ) then
    raise exception '你已經擁有此商品';
  end if;

  select coalesce(public.get_my_total_points(), 0)::integer
    - coalesce(sum(price), 0)::integer
  into v_available
  from public.cosmetic_purchases
  where user_id = v_user_id;

  if v_available < v_price then
    raise exception '積分不足，需要 % 分，目前可用 % 分', v_price, v_available;
  end if;

  update public.cosmetic_purchases
  set equipped = false
  where user_id = v_user_id and slot = v_slot;

  insert into public.cosmetic_purchases (user_id, item_id, slot, price, equipped)
  values (v_user_id, p_item_id, v_slot, v_price, true);

  return v_available - v_price;
end;
$$;

create or replace function public.equip_cosmetic(p_slot text, p_item_id text default null)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception '請先登入後再更換裝飾';
  end if;

  perform 1 from auth.users where id = v_user_id for update;

  if p_slot is null or p_slot not in ('avatar_frame', 'app_theme') then
    raise exception '無效的裝飾類型';
  end if;

  if p_item_id is not null and not exists (
    select 1 from public.cosmetic_purchases
    where user_id = v_user_id and item_id = p_item_id and slot = p_slot
  ) then
    raise exception '你尚未擁有此裝飾';
  end if;

  update public.cosmetic_purchases
  set equipped = (p_item_id is not null and item_id = p_item_id)
  where user_id = v_user_id and slot = p_slot;
end;
$$;

revoke all on function public.get_my_available_points() from public, anon;
revoke all on function public.purchase_cosmetic(text) from public, anon;
revoke all on function public.equip_cosmetic(text, text) from public, anon;
grant execute on function public.get_my_available_points() to authenticated;
grant execute on function public.purchase_cosmetic(text) to authenticated;
grant execute on function public.equip_cosmetic(text, text) to authenticated;
