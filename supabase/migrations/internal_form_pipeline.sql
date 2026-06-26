create extension if not exists "pgcrypto";

create table if not exists regions (
  code text primary key,
  label text not null
);

create table if not exists dealers (
  code text primary key,
  label text not null,
  region_code text not null references regions(code) on update cascade
);

create table if not exists provinces (
  code text primary key,
  label text not null
);

create table if not exists districts (
  code text primary key,
  label text not null,
  province_code text not null references provinces(code) on update cascade
);

create table if not exists district_dealers (
  district_code text not null references districts(code) on delete cascade,
  dealer_code text not null references dealers(code) on delete cascade,
  primary key (district_code, dealer_code)
);

create table if not exists channels (
  code text primary key,
  label text not null
);

create table if not exists sub_channels (
  code text primary key,
  label text not null
);

create table if not exists categories (
  code text primary key,
  label text not null
);

create table if not exists brands (
  code text primary key,
  label text not null,
  category_code text not null references categories(code) on update cascade
);

create table if not exists type_selects (
  code text primary key,
  label text not null
);

create table if not exists price_sources (
  code text primary key,
  label text not null
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  submitted_by text not null,
  type_select_code text not null references type_selects(code),
  region_code text references regions(code),
  dealer_code text references dealers(code),
  province_code text references provinces(code),
  district_code text references districts(code),
  brand_code text references brands(code),
  channel_code text references channels(code),
  sub_channel_code text references sub_channels(code),
  price_source_code text references price_sources(code),
  scheme text,
  basic_price numeric,
  net_price numeric,
  sellout_price_seller numeric,
  sellout_price_consumer numeric,
  submission_date date not null,
  note text,
  lat numeric,
  lng numeric,
  notification_status text not null default 'pending' check (notification_status in ('pending', 'sent', 'failed')),
  notification_error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_submissions_created_at on submissions (created_at desc);
create index if not exists idx_submissions_region on submissions (region_code);
create index if not exists idx_submissions_dealer on submissions (dealer_code);
create index if not exists idx_submissions_submission_date on submissions (submission_date);

alter table submissions enable row level security;

drop policy if exists submissions_insert_internal on submissions;
create policy submissions_insert_internal
on submissions
for insert
to anon, authenticated
with check (true);
