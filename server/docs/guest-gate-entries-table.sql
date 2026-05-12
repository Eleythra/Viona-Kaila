-- Kapı ekranı: başarılı girişler — Node API `guest_gate_entries` tablosuna yazar (çift şifre + isteğe bağlı ad/oda metni, PMS doğrulaması yok).
-- Supabase SQL Editor’da bir kez çalıştırın.
-- RLS: Service role ile yazım RLS’i baypas eder; doğrudan anon/authenticated istemci kullanımı için ayrı POLICY gerekir.
--
-- Node eşlemesi (`guest-gate-log.service.js` → `.insert`): full_name, room_number,
-- verification_method ('deploy_bypass' | 'elektra' | 'password_dual'), client_ip, user_agent (created_at otomatik).

create table if not exists public.guest_gate_entries (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  room_number text not null,
  verification_method text not null,
  client_ip text,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint guest_gate_entries_verification_method_check check (
    verification_method in ('deploy_bypass', 'elektra', 'password_dual')
  )
);

create index if not exists idx_guest_gate_entries_created_at on public.guest_gate_entries (created_at desc);
create index if not exists idx_guest_gate_entries_room on public.guest_gate_entries (room_number);

comment on table public.guest_gate_entries is 'Misafir web kapısı — doğrulanmış giriş kayıtları (audit)';
comment on column public.guest_gate_entries.verification_method is 'password_dual: çift şifre; deploy_bypass / elektra: eski entegrasyon kayıtları';

alter table public.guest_gate_entries enable row level security;
