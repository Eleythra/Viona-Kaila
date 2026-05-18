-- Misafir geri bildirimi (WA + public form): guest_requests + guest_faults
-- Çalıştırmadan önce yedek alın. İdempotent: IF NOT EXISTS / DROP CONSTRAINT IF EXISTS.

-- -----------------------------------------------------------------------------
-- Status CHECK: reopened ekle (geri bildirim «Hayır» dalı)
-- -----------------------------------------------------------------------------
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
      'rejected',
      'reopened'
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
      'rejected',
      'reopened'
    )
  );

-- -----------------------------------------------------------------------------
-- Kolonlar (istek + arıza)
-- -----------------------------------------------------------------------------
alter table if exists public.guest_requests add column if not exists guest_phone text;
alter table if exists public.guest_requests add column if not exists feedback_token text;
alter table if exists public.guest_requests add column if not exists feedback_sent_at timestamptz;
alter table if exists public.guest_requests add column if not exists feedback_status text;
alter table if exists public.guest_requests add column if not exists guest_confirmation text;
alter table if exists public.guest_requests add column if not exists speed_rating smallint;
alter table if exists public.guest_requests add column if not exists staff_rating smallint;
alter table if exists public.guest_requests add column if not exists solution_rating smallint;
alter table if exists public.guest_requests add column if not exists revisit_preference text;
alter table if exists public.guest_requests add column if not exists feedback_note text;
alter table if exists public.guest_requests add column if not exists reopen_note text;
alter table if exists public.guest_requests add column if not exists feedback_submitted_at timestamptz;
alter table if exists public.guest_requests add column if not exists reopened_at timestamptz;
alter table if exists public.guest_requests add column if not exists feedback_invite_count int not null default 0;

alter table if exists public.guest_faults add column if not exists guest_phone text;
alter table if exists public.guest_faults add column if not exists feedback_token text;
alter table if exists public.guest_faults add column if not exists feedback_sent_at timestamptz;
alter table if exists public.guest_faults add column if not exists feedback_status text;
alter table if exists public.guest_faults add column if not exists guest_confirmation text;
alter table if exists public.guest_faults add column if not exists speed_rating smallint;
alter table if exists public.guest_faults add column if not exists staff_rating smallint;
alter table if exists public.guest_faults add column if not exists solution_rating smallint;
alter table if exists public.guest_faults add column if not exists revisit_preference text;
alter table if exists public.guest_faults add column if not exists feedback_note text;
alter table if exists public.guest_faults add column if not exists reopen_note text;
alter table if exists public.guest_faults add column if not exists feedback_submitted_at timestamptz;
alter table if exists public.guest_faults add column if not exists reopened_at timestamptz;
alter table if exists public.guest_faults add column if not exists feedback_invite_count int not null default 0;

-- feedback_status / guest_confirmation CHECK (opsiyonel ama tutarlı veri)
alter table if exists public.guest_requests drop constraint if exists guest_requests_feedback_status_chk;
alter table if exists public.guest_requests
  add constraint guest_requests_feedback_status_chk
  check (
    feedback_status is null
    or lower(trim(feedback_status)) in ('pending', 'submitted')
  );

alter table if exists public.guest_requests drop constraint if exists guest_requests_guest_confirmation_chk;
alter table if exists public.guest_requests
  add constraint guest_requests_guest_confirmation_chk
  check (
    guest_confirmation is null
    or lower(trim(guest_confirmation)) in ('completed', 'not_completed')
  );

alter table if exists public.guest_faults drop constraint if exists guest_faults_feedback_status_chk;
alter table if exists public.guest_faults
  add constraint guest_faults_feedback_status_chk
  check (
    feedback_status is null
    or lower(trim(feedback_status)) in ('pending', 'submitted')
  );

alter table if exists public.guest_faults drop constraint if exists guest_faults_guest_confirmation_chk;
alter table if exists public.guest_faults
  add constraint guest_faults_guest_confirmation_chk
  check (
    guest_confirmation is null
    or lower(trim(guest_confirmation)) in ('completed', 'not_completed')
  );

alter table if exists public.guest_requests drop constraint if exists guest_requests_revisit_chk;
alter table if exists public.guest_requests
  add constraint guest_requests_revisit_chk
  check (
    revisit_preference is null
    or lower(trim(revisit_preference)) in ('yes', 'unsure', 'no')
  );

alter table if exists public.guest_faults drop constraint if exists guest_faults_revisit_chk;
alter table if exists public.guest_faults
  add constraint guest_faults_revisit_chk
  check (
    revisit_preference is null
    or lower(trim(revisit_preference)) in ('yes', 'unsure', 'no')
  );

create unique index if not exists guest_requests_feedback_token_uidx
  on public.guest_requests (feedback_token)
  where feedback_token is not null;

create unique index if not exists guest_faults_feedback_token_uidx
  on public.guest_faults (feedback_token)
  where feedback_token is not null;
