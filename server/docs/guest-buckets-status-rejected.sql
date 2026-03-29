-- =============================================================================
-- İstek / şikayet / arıza: admin "Yapılamadı" / "Dikkate alınmadı" = status 'rejected'.
-- Ana kurulum: server/docs/supabase-paste-viona.sql bölüm 8b (tek yapıştırma ile gelir).
-- Bu dosya yalnızca üç kova tablosunu tek başına güncellemek için (idempotent).
-- Kolon tipi text veya enum olabilir; ::text ile karşılaştırılır.
-- =============================================================================

alter table if exists public.guest_requests drop constraint if exists guest_requests_status_check;
alter table if exists public.guest_requests drop constraint if exists guest_requests_status_chk;

alter table if exists public.guest_requests
  add constraint guest_requests_status_check
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

alter table if exists public.guest_complaints drop constraint if exists guest_complaints_status_check;
alter table if exists public.guest_complaints drop constraint if exists guest_complaints_status_chk;

alter table if exists public.guest_complaints
  add constraint guest_complaints_status_check
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

alter table if exists public.guest_faults drop constraint if exists guest_faults_status_check;
alter table if exists public.guest_faults drop constraint if exists guest_faults_status_chk;

alter table if exists public.guest_faults
  add constraint guest_faults_status_check
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

-- Rezervasyon: supabase-paste-viona.sql bölüm 9 veya guest-reservations-status-rejected.sql
