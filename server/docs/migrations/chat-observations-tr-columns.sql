-- =============================================================================
-- Supabase SQL Editor — TEK PARÇA yapıştırın
-- chat_observations: Türkçe operasyon sütunları (orijinal metin aynı kalır)
-- Önkoşul: public.chat_observations tablosu zaten var olmalı (yoksa önce
--   server/docs/supabase-paste-viona.sql içindeki chat_observations bölümünü çalıştırın).
-- Bu betik idempotent: birden fazla kez çalıştırılabilir.
-- =============================================================================

-- 1) Kolonlar (yoksa ekler)
alter table if exists public.chat_observations
  add column if not exists user_message_tr text,
  add column if not exists assistant_response_tr text;

-- 2) İsteğe bağlı backfill: arayüz dili Türkçe olan ESKİ satırlarda TR = orijinal
--    (yeni kayıtlar Node tarafında zaten dolar; çeviri API’si gerekmez)
update public.chat_observations
set
  user_message_tr = coalesce(
    nullif(trim(user_message_tr), ''),
    nullif(trim(user_message), '')
  ),
  assistant_response_tr = coalesce(
    nullif(trim(assistant_response_tr), ''),
    nullif(trim(assistant_response), '')
  )
where lower(trim(coalesce(ui_language, ''))) = 'tr'
  and (user_message_tr is null or assistant_response_tr is null);

-- 3) Kontrol (isteğe bağlı — sonuç penceresinde satır sayısı görürsünüz)
-- select
--   count(*) filter (where user_message_tr is null) as satir_user_tr_bos,
--   count(*) filter (where assistant_response_tr is null) as satir_asst_tr_bos,
--   count(*) as toplam
-- from public.chat_observations;
