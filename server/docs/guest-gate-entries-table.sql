-- =============================================================================
-- guest_gate_entries — TAM KURULUM / GÜNCELLEME (Supabase SQL Editor’a yapıştırın)
-- =============================================================================
-- Admin «Uygulama girişleri» + Node insert: server/src/modules/guest-gate/guest-gate-log.service.js
-- Bu betik idempotent’tir: tablo yoksa oluşturur; varsa eksik sütunları ekler; CHECK’i günceller.
-- RLS: Service role (Node) RLS’i baypas eder; tarayıcıdan doğrudan okuma/yazma için POLICY eklemez.
-- =============================================================================

-- 1) Tablo (yoksa gövde; CHECK aşağıda tekilleştirilir — eski sadece deploy_bypass|elektra şeması da yükseltilir)
create table if not exists public.guest_gate_entries (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  room_number text not null,
  verification_method text not null,
  client_ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

-- 2) PMS / raporlama sütunları
alter table public.guest_gate_entries add column if not exists hotel_id bigint;
alter table public.guest_gate_entries add column if not exists res_id bigint;
alter table public.guest_gate_entries add column if not exists res_name_id bigint;
alter table public.guest_gate_entries add column if not exists birth_date date;

-- 3) verification_method — Node ile aynı değerler
alter table public.guest_gate_entries drop constraint if exists guest_gate_entries_verification_method_check;

alter table public.guest_gate_entries
  add constraint guest_gate_entries_verification_method_check check (
    verification_method in (
      'deploy_bypass',
      'elektra',
      'password_dual',
      'hotel_advisor',
      'operator_bypass'
    )
  );

-- 4) İndeksler
create index if not exists idx_guest_gate_entries_created_at on public.guest_gate_entries (created_at desc);
create index if not exists idx_guest_gate_entries_room on public.guest_gate_entries (room_number);
create index if not exists idx_guest_gate_entries_verification_method on public.guest_gate_entries (verification_method);

-- 5) Açıklamalar
comment on table public.guest_gate_entries is 'Misafir web kapısı — doğrulanmış giriş kayıtları (audit; admin Uygulama girişleri)';
comment on column public.guest_gate_entries.verification_method is
  'hotel_advisor: PMS (oda+doğum); operator_bypass: env eşleşmesi (operatör test); password_dual: eski çift şifre; deploy_bypass / elektra: eski kayıtlar';
comment on column public.guest_gate_entries.hotel_id is 'PMS HOTELID (HotelAdvisor)';
comment on column public.guest_gate_entries.res_id is 'PMS RESID';
comment on column public.guest_gate_entries.res_name_id is 'PMS RESNAMEID';
comment on column public.guest_gate_entries.birth_date is 'Doğrulamada girilen doğum tarihi (YYYY-MM-DD); hotel_advisor ve operator_bypass';

-- 6) RLS
alter table public.guest_gate_entries enable row level security;
