-- Geç çıkış talepleri — guest-requests type: late_checkout (yalnızca web formu)
-- Ana betik: server/docs/supabase-paste-viona.sql bölüm 11

create table if not exists public.guest_late_checkouts (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null,
  room_number text not null,
  nationality text not null,
  checkout_date date not null,
  checkout_time text not null,
  description text not null default '',
  details jsonb not null default '{}'::jsonb,
  source text not null default 'viona_web',
  submitted_at timestamptz not null default now(),
  status text not null default 'new',
  raw_payload jsonb
);

create index if not exists idx_guest_late_checkouts_submitted_at on public.guest_late_checkouts (submitted_at desc);
create index if not exists idx_guest_late_checkouts_status on public.guest_late_checkouts (status);
create index if not exists idx_guest_late_checkouts_checkout_date on public.guest_late_checkouts (checkout_date);

alter table if exists public.guest_late_checkouts drop constraint if exists guest_late_checkouts_status_check;
alter table if exists public.guest_late_checkouts drop constraint if exists guest_late_checkouts_status_chk;

alter table if exists public.guest_late_checkouts
  add constraint guest_late_checkouts_status_check
  check (
    lower(trim((status)::text)) in (
      'new',
      'pending',
      'in_progress',
      'done',
      'cancelled',
      'rejected'
    )
  );

alter table if exists public.guest_late_checkouts enable row level security;

-- Node guest-requests.service insertLateCheckout: guest_name, room_number, nationality, checkout_date,
-- checkout_time, description, details, source, submitted_at, status, raw_payload
