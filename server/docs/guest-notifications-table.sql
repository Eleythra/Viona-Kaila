-- Misafir bildirimleri (beslenme / sağlık / kutlama) — guest-requests.service type: guest_notification
-- Supabase SQL Editor’de bir kez çalıştırın.
-- Ana tek betik: server/docs/supabase-paste-viona.sql bölüm 10 (CHECK ve RLS aynı mantık).

create table if not exists public.guest_notifications (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null,
  room_number text not null,
  nationality text not null,
  description text not null default '',
  categories jsonb not null default '[]'::jsonb,
  other_category_note text,
  category text,
  details jsonb not null default '{}'::jsonb,
  source text not null default 'viona_web',
  submitted_at timestamptz not null default now(),
  status text not null default 'new',
  raw_payload jsonb
);

create index if not exists idx_guest_notifications_submitted_at on public.guest_notifications (submitted_at desc);
create index if not exists idx_guest_notifications_status on public.guest_notifications (status);
create index if not exists idx_guest_notifications_category on public.guest_notifications (category);

alter table if exists public.guest_notifications drop constraint if exists guest_notifications_status_check;
alter table if exists public.guest_notifications drop constraint if exists guest_notifications_status_chk;

alter table if exists public.guest_notifications
  add constraint guest_notifications_status_check
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

-- RLS: Node API SUPABASE_SERVICE_ROLE_KEY ile yazıldığı için satırlar servis rolüyle yönetilir (RLS atlanır).
-- Doğrudan anon/authenticated istemci kullanacaksanız bu tablo için ayrıca POLICY tanımlanmalıdır.
alter table public.guest_notifications enable row level security;
