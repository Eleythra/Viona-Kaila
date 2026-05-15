-- =========================================================
-- guest_faults.category CHECK — teknik ft_* id’leri + eski kaba kategoriler
-- NOT: Ana yapıştırma betiği server/docs/supabase-paste-viona.sql §8a-fault ile senkron;
--      yalnızca bu kısıtı çalıştıracaksanız aşağıdaki bloğu kullanın.
-- =========================================================
-- Run after guest-faults-revision.sql. Yeni granular `category` değerleri
-- CHECK’e takılmasın diye kümeyi genişletir; NULL ve geçmiş satırlar korunur.
--
-- Uygulama kaynağı: js/requests/config.js faultSections + guest-requests.service.js FAULT_COARSE_LEGACY

alter table if exists guest_faults drop constraint if exists guest_faults_category_chk;

alter table if exists guest_faults
  add constraint guest_faults_category_chk
  check (
    category is null
    or category in (
      'ft_ac_not_cooling',
      'ft_ac_not_heating',
      'ft_ac_remote',
      'ft_ac_fault',
      'ft_ventilation_fault',
      'ft_socket_fault',
      'ft_electric_fault',
      'ft_led_fault',
      'ft_lamp_fault',
      'ft_sconce_fault',
      'ft_ceiling_water_leak',
      'ft_bidet_faucet_fault',
      'ft_cold_water_no_flow',
      'ft_hot_water_no_flow',
      'ft_siphon_fault',
      'ft_faucet_fault',
      'ft_sink_drain_fault',
      'ft_toilet_seat_broken',
      'ft_shower_cabin_fault',
      'ft_shower_head_fault',
      'ft_towel_rail_fault',
      'ft_bathroom_drain_clog',
      'ft_tv_remote',
      'ft_tv_fault',
      'ft_phone_fault',
      'ft_minibar_fault',
      'ft_safe_fault',
      'ft_kettle_fault',
      'ft_hair_dryer_fault',
      'ft_tv_channel_fault',
      'ft_curtain_fallen',
      'ft_window_fault',
      'ft_window_cleaning',
      'ft_room_door_fault',
      'ft_bathroom_door_fault',
      'ft_balcony_door_fault',
      'ft_balcony_railing_loose',
      'ft_cornice_fault',
      'ft_headboard_fault',
      'ft_dresser_drawer_fault',
      'ft_drawer_fault',
      'ft_wardrobe_fault',
      'ft_mirror_damage',
      'ft_elevator_fault',
      'ft_indoor_pool_temperature',
      'ft_other',
      'hvac',
      'electric',
      'water_bathroom',
      'tv_electronics',
      'door_lock',
      'furniture_item',
      'cleaning_equipment_damage',
      'balcony_window',
      'other'
    )
  );
