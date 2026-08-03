-- =================================================================
-- DriveDesk — Supabase schema
-- Run this once in Supabase Dashboard → SQL Editor → New query
-- =================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------
create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  pin_hash text not null,
  created_at timestamptz default now()
);

create table if not exists dealers (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  pin_hash text not null,
  full_name text not null,
  phone text,
  email text,
  shop_name text,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz default now()
);

create table if not exists cars (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid references dealers(id) on delete cascade,
  make text not null,
  model text not null,
  year int,
  price numeric,
  km_driven int,
  fuel_type text,
  transmission text,
  color text,
  description text,
  image_url text,
  status text not null default 'available' check (status in ('available','sold')),
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------
-- Lock tables down: all access goes through SECURITY DEFINER
-- RPC functions below, never straight table access from the client.
-- ---------------------------------------------------------------
alter table admins enable row level security;
alter table dealers enable row level security;
alter table cars enable row level security;
revoke all on admins, dealers, cars from anon, authenticated;

-- ---------------------------------------------------------------
-- Auth RPCs
-- ---------------------------------------------------------------
create or replace function admin_login(p_username text, p_pin text)
returns table(id uuid, username text)
language plpgsql security definer set search_path = public as $$
begin
  return query
    select a.id, a.username from admins a
    where a.username = p_username and a.pin_hash = crypt(p_pin, a.pin_hash);
end; $$;

create or replace function dealer_login(p_username text, p_pin text)
returns table(id uuid, username text, full_name text, shop_name text, status text)
language plpgsql security definer set search_path = public as $$
begin
  return query
    select d.id, d.username, d.full_name, d.shop_name, d.status
    from dealers d
    where d.username = p_username and d.pin_hash = crypt(p_pin, d.pin_hash)
      and d.status = 'active';
end; $$;

-- ---------------------------------------------------------------
-- Admin — dealer management RPCs
-- (p_admin_id is the id returned by admin_login; each function
--  re-validates it exists before doing anything)
-- ---------------------------------------------------------------
create or replace function admin_add_dealer(
  p_admin_id uuid, p_username text, p_pin text, p_full_name text,
  p_phone text, p_email text, p_shop_name text
) returns table(id uuid)
language plpgsql security definer set search_path = public as $$
declare v_new_id uuid;
begin
  if not exists (select 1 from admins where id = p_admin_id) then
    raise exception 'unauthorized';
  end if;
  insert into dealers(username, pin_hash, full_name, phone, email, shop_name)
  values (p_username, crypt(p_pin, gen_salt('bf')), p_full_name, p_phone, p_email, p_shop_name)
  returning dealers.id into v_new_id;
  return query select v_new_id;
end; $$;

create or replace function admin_list_dealers(p_admin_id uuid)
returns setof dealers
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from admins where id = p_admin_id) then
    raise exception 'unauthorized';
  end if;
  return query select * from dealers order by created_at desc;
end; $$;

create or replace function admin_set_dealer_status(p_admin_id uuid, p_dealer_id uuid, p_status text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from admins where id = p_admin_id) then
    raise exception 'unauthorized';
  end if;
  update dealers set status = p_status where id = p_dealer_id;
end; $$;

create or replace function admin_delete_dealer(p_admin_id uuid, p_dealer_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from admins where id = p_admin_id) then
    raise exception 'unauthorized';
  end if;
  delete from dealers where id = p_dealer_id;
end; $$;

create or replace function admin_stats(p_admin_id uuid)
returns table(total_dealers bigint, active_dealers bigint, total_cars bigint, available_cars bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from admins where id = p_admin_id) then
    raise exception 'unauthorized';
  end if;
  return query select
    (select count(*) from dealers),
    (select count(*) from dealers where status = 'active'),
    (select count(*) from cars),
    (select count(*) from cars where status = 'available');
end; $$;

-- ---------------------------------------------------------------
-- Dealer — car inventory RPCs (scoped to p_dealer_id)
-- ---------------------------------------------------------------
create or replace function dealer_list_cars(p_dealer_id uuid)
returns setof cars
language plpgsql security definer set search_path = public as $$
begin
  return query select * from cars where dealer_id = p_dealer_id order by created_at desc;
end; $$;

create or replace function dealer_add_car(
  p_dealer_id uuid, p_make text, p_model text, p_year int, p_price numeric,
  p_km int, p_fuel text, p_trans text, p_color text, p_desc text, p_image text
) returns table(id uuid)
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into cars(dealer_id, make, model, year, price, km_driven, fuel_type, transmission, color, description, image_url)
  values (p_dealer_id, p_make, p_model, p_year, p_price, p_km, p_fuel, p_trans, p_color, p_desc, p_image)
  returning cars.id into v_id;
  return query select v_id;
end; $$;

create or replace function dealer_update_car(
  p_dealer_id uuid, p_car_id uuid, p_make text, p_model text, p_year int, p_price numeric,
  p_km int, p_fuel text, p_trans text, p_color text, p_desc text, p_image text, p_status text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  update cars set
    make = p_make, model = p_model, year = p_year, price = p_price, km_driven = p_km,
    fuel_type = p_fuel, transmission = p_trans, color = p_color, description = p_desc,
    image_url = coalesce(p_image, image_url), status = p_status
  where id = p_car_id and dealer_id = p_dealer_id;
end; $$;

create or replace function dealer_delete_car(p_dealer_id uuid, p_car_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from cars where id = p_car_id and dealer_id = p_dealer_id;
end; $$;

-- ---------------------------------------------------------------
-- Grant execute on all RPCs to the public (anon) role.
-- The functions themselves enforce every access rule above.
-- ---------------------------------------------------------------
grant execute on function admin_login(text,text) to anon;
grant execute on function dealer_login(text,text) to anon;
grant execute on function admin_add_dealer(uuid,text,text,text,text,text,text) to anon;
grant execute on function admin_list_dealers(uuid) to anon;
grant execute on function admin_set_dealer_status(uuid,uuid,text) to anon;
grant execute on function admin_delete_dealer(uuid,uuid) to anon;
grant execute on function admin_stats(uuid) to anon;
grant execute on function dealer_list_cars(uuid) to anon;
grant execute on function dealer_add_car(uuid,text,text,int,numeric,int,text,text,text,text,text) to anon;
grant execute on function dealer_update_car(uuid,uuid,text,text,int,numeric,int,text,text,text,text,text,text) to anon;
grant execute on function dealer_delete_car(uuid,uuid) to anon;

-- ---------------------------------------------------------------
-- Seed a default admin — CHANGE THIS PIN after first login.
-- username: admin   |   pin: 1234
-- ---------------------------------------------------------------
insert into admins(username, pin_hash)
values ('admin', crypt('1234', gen_salt('bf')))
on conflict (username) do nothing;
