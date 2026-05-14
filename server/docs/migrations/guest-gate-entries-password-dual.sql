-- Misafir kapısı: `password_dual` doğrulama yöntemi (çift env şifresi).
-- UYARI: Bu betik CHECK’i yalnızca üç değere indirir; güncel şema için `guest-gate-entries-table.sql` kullanın.
-- Mevcut CHECK `deploy_bypass` | `elektra` ise Supabase SQL Editor’da bir kez çalıştırın.

alter table public.guest_gate_entries drop constraint if exists guest_gate_entries_verification_method_check;

alter table public.guest_gate_entries
  add constraint guest_gate_entries_verification_method_check check (
    verification_method in ('deploy_bypass', 'elektra', 'password_dual')
  );

comment on column public.guest_gate_entries.verification_method is
  'password_dual: iki env şifresi (AND); deploy_bypass / elektra: eski kayıtlar';
