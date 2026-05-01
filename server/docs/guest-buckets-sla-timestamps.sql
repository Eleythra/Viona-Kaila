-- Süre ölçümü (bildirim → yapıldı/yapılmadı): admin güncellemesinde dolar.
-- «Bekliyor» 1 saat hatırlatma WhatsApp (cron job): yalnızca bir kez gönderilir.
-- Supabase: SQL Editor → New query → bu dosyanın tamamını yapıştır → Run (ana betiğe gömülmesi şart değil).
-- Çalıştırmadan önce yedek alın.
alter table if exists public.guest_requests
  add column if not exists work_started_at timestamptz;
alter table if exists public.guest_requests
  add column if not exists resolved_at timestamptz;

alter table if exists public.guest_faults
  add column if not exists work_started_at timestamptz;
alter table if exists public.guest_faults
  add column if not exists resolved_at timestamptz;

alter table if exists public.guest_complaints
  add column if not exists work_started_at timestamptz;
alter table if exists public.guest_complaints
  add column if not exists resolved_at timestamptz;

alter table if exists public.guest_notifications
  add column if not exists work_started_at timestamptz;
alter table if exists public.guest_notifications
  add column if not exists resolved_at timestamptz;

alter table if exists public.guest_late_checkouts
  add column if not exists work_started_at timestamptz;
alter table if exists public.guest_late_checkouts
  add column if not exists resolved_at timestamptz;

alter table if exists public.guest_requests
  add column if not exists whatsapp_pending_reminder_sent_at timestamptz;
alter table if exists public.guest_faults
  add column if not exists whatsapp_pending_reminder_sent_at timestamptz;
alter table if exists public.guest_complaints
  add column if not exists whatsapp_pending_reminder_sent_at timestamptz;
alter table if exists public.guest_notifications
  add column if not exists whatsapp_pending_reminder_sent_at timestamptz;
alter table if exists public.guest_late_checkouts
  add column if not exists whatsapp_pending_reminder_sent_at timestamptz;
