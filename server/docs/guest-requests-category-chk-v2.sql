-- =============================================================================
-- guest_requests.category CHECK — ana betik: server/docs/supabase-paste-viona.sql §8a
-- =============================================================================
-- Yalnızca bu kısıtı düzeltmek istiyorsanız aşağıdaki DROP + ADD bloğunu çalıştırın.
-- (İçerik supabase-paste-viona.sql §8a ile aynı tutulmalı.)
-- =============================================================================

alter table if exists public.guest_requests drop constraint if exists guest_requests_category_chk;

alter table if exists public.guest_requests
  add constraint guest_requests_category_chk
  check (
    category is null
    or category in (
      'hk_duvet_request',
      'hk_bed_join',
      'hk_bed_soften',
      'hk_pillow_request',
      'hk_pique_request',
      'hk_extra_bed',
      'hk_baby_crib',
      'hk_sheet_change',
      'hk_towel_request',
      'hk_towel_change',
      'hk_toilet_paper',
      'hk_slippers',
      'hk_dental_set',
      'hk_amenity_kit',
      'hk_water',
      'hk_coffee_tea_supplies',
      'hk_cup_request',
      'hk_room_cleaning',
      'hk_trash_removal',
      'hk_balcony_cleaning',
      'hk_cleaning_dnd_coordinate',
      'hk_bad_odor',
      'hk_pest_control',
      'hk_iron',
      'hk_vase',
      'other',
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
