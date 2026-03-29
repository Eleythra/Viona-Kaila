-- =============================================================================
-- Rezervasyon admin: status = 'rejected' ("Onaylanmadı") ve diğer durumlar.
-- Ana kurulum: server/docs/supabase-paste-viona.sql bölüm 9 sonu (önerilen).
-- Bu dosya yalnızca rezervasyon tablosunu tek başına güncellemek için (idempotent).
-- =============================================================================

alter table if exists public.guest_reservations drop constraint if exists guest_reservations_status_chk;
alter table if exists public.guest_reservations drop constraint if exists guest_reservations_status_check;

alter table if exists public.guest_reservations
  add constraint guest_reservations_status_chk
  check (
    status is null
    or lower(trim((status)::text)) in (
      'new',
      'pending',
      'in_progress',
      'done',
      'cancelled',
      'rejected'
    )
  );
