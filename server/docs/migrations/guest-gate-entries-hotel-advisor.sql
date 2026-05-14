-- HotelAdvisor (PMS) misafir kapısı: verification_method + raporlama sütunları.
-- Supabase SQL Editor’da bir kez çalıştırın (mevcut guest_gate_entries tablosu üzerinde).
-- CHECK listesi `operator_bypass` dahil güncel tutulur; yalnızca operatör bypass için ayrıca
-- `migrations/guest-gate-entries-operator-bypass.sql` çalıştırmanız yeterlidir (bu dosya ile çakışmaz).

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

alter table public.guest_gate_entries add column if not exists hotel_id bigint;
alter table public.guest_gate_entries add column if not exists res_id bigint;
alter table public.guest_gate_entries add column if not exists res_name_id bigint;
alter table public.guest_gate_entries add column if not exists birth_date date;

comment on column public.guest_gate_entries.hotel_id is 'PMS HOTELID (HotelAdvisor)';
comment on column public.guest_gate_entries.res_id is 'PMS RESID';
comment on column public.guest_gate_entries.res_name_id is 'PMS RESNAMEID';
comment on column public.guest_gate_entries.birth_date is 'Misafirin doğrulamada girdiği doğum tarihi (YYYY-MM-DD)';
