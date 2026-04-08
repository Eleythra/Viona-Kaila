-- =============================================================================
-- guest_requests.category CHECK — artık ana betikte (supabase-paste-viona.sql §8a)
-- =============================================================================
-- Tam şema güncellemesi için: server/docs/supabase-paste-viona.sql dosyasını Supabase’e
-- tek seferde yapıştırın (8a = category, 8b = status).
--
-- Yalnızca bu kısıtı düzeltmek istiyorsanız aşağıdaki DROP + ADD bloğunu çalıştırın.
-- (İçerik supabase-paste-viona.sql §8a ile aynı tutulmalı.)
-- =============================================================================

alter table if exists public.guest_requests drop constraint if exists guest_requests_category_chk;

alter table if exists public.guest_requests
  add constraint guest_requests_category_chk
  check (
    category is null
    or category in (
      'towel_extra',
      'room_towel',
      'bathrobe',
      'bedding_sheet',
      'bedding_pillow',
      'bedding_blanket',
      'room_cleaning',
      'turndown',
      'slippers',
      'minibar_refill',
      'bottled_water',
      'tea_coffee',
      'toilet_paper',
      'toiletries',
      'climate_request',
      'room_refresh',
      'hanger',
      'kettle',
      'room_safe',
      'baby_bed',
      'other',
      'towel',
      'bedding',
      'minibar',
      'baby_equipment',
      'room_equipment',
      'extraTowels',
      'extra_towels',
      'towels',
      'linen',
      'roomCleaning',
      'room_cleaning_request',
      'minibarRefill',
      'minibar_request',
      'babyNeeds',
      'baby_equipment_request',
      'roomSupplies',
      'room_equipment_request',
      'otherRequest'
    )
  );
