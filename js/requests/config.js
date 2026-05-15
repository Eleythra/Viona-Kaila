/**
 * Misafir talepleri — kategori seçenekleri (API ile uyumlu).
 * İstekler: HOUSEKEEPING grupları; Arızalar: faultSections (Teknik).
 * Sohbet senkronu: server/src/assistant/services/form_schema.py → REQUEST_CATEGORY_CHAT_SECTIONS,
 *   FAULT_CATEGORY_CHAT_SECTIONS (faultSections düz sıra = FAULT_TECH_IDS), COMPLAINT_CATEGORIES (categories.complaint).
 */
(function () {
  "use strict";

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  window.getCalendarMinDateISO = function () {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.getFullYear() + "-" + pad(today.getMonth() + 1) + "-" + pad(today.getDate());
  };

  window.REQUESTS_CONFIG = {
    floorCalendarDate: "2026-03-01",
    guestNotificationGroups: [
      {
        sectionKey: "reqNotifGroupDiet",
        items: [
          { id: "allergen_notice", key: "reqNotifCatAllergen" },
          { id: "gluten_sensitivity", key: "reqNotifCatGluten" },
          { id: "lactose_sensitivity", key: "reqNotifCatLactose" },
          { id: "vegan_vegetarian", key: "reqNotifCatVeganVeg" },
          { id: "food_sensitivity_general", key: "reqNotifCatFoodGeneral" },
        ],
      },
      {
        sectionKey: "reqNotifGroupHealth",
        items: [
          { id: "chronic_condition", key: "reqNotifCatChronic" },
          { id: "accessibility_special_needs", key: "reqNotifCatAccessibility" },
          { id: "pregnancy", key: "reqNotifCatPregnancy" },
          { id: "medication_health_sensitivity", key: "reqNotifCatMedication" },
          { id: "other_health", key: "reqNotifCatOtherHealth" },
        ],
      },
      {
        sectionKey: "reqNotifGroupCelebration",
        items: [
          { id: "birthday_celebration", key: "reqNotifCatBirthday" },
          { id: "honeymoon_anniversary", key: "reqNotifCatHoneymoon" },
          { id: "surprise_organization", key: "reqNotifCatSurprise" },
          { id: "room_decoration", key: "reqNotifCatRoomDecor" },
          { id: "other_celebration", key: "reqNotifCatOtherCelebration" },
        ],
      },
    ],
    requestSections: [
      {
        sectionKey: "reqReqSecHkSleepComfort",
        items: [
          { id: "hk_duvet_request", key: "reqReqHkDuvet" },
          { id: "hk_bed_join", key: "reqReqHkBedJoin" },
          { id: "hk_bed_soften", key: "reqReqHkBedSoften" },
          { id: "hk_pillow_request", key: "reqReqHkPillow" },
          { id: "hk_pique_request", key: "reqReqHkPique" },
          { id: "hk_extra_bed", key: "reqReqHkExtraBed" },
          { id: "hk_baby_crib", key: "reqReqHkBabyCrib" },
          { id: "hk_sheet_change", key: "reqReqHkSheetChange" },
        ],
      },
      {
        sectionKey: "reqReqSecHkTowelBath",
        items: [
          { id: "hk_towel_request", key: "reqReqHkTowelRequest" },
          { id: "hk_towel_change", key: "reqReqHkTowelChange" },
          { id: "hk_toilet_paper", key: "reqReqHkToiletPaper" },
          { id: "hk_slippers", key: "reqReqHkSlippers" },
          { id: "hk_dental_set", key: "reqReqHkDentalSet" },
          { id: "hk_amenity_kit", key: "reqReqHkAmenityKit" },
        ],
      },
      {
        sectionKey: "reqReqSecHkDrinks",
        items: [
          { id: "hk_water", key: "reqReqHkWater" },
          { id: "hk_coffee_tea_supplies", key: "reqReqHkCoffeeTeaSupplies" },
          { id: "hk_cup_request", key: "reqReqHkCup" },
        ],
      },
      {
        sectionKey: "reqReqSecHkCleaning",
        items: [
          { id: "hk_room_cleaning", key: "reqReqHkRoomCleaning" },
          { id: "hk_trash_removal", key: "reqReqHkTrashRemoval" },
          { id: "hk_balcony_cleaning", key: "reqReqHkBalconyCleaning" },
          { id: "hk_cleaning_dnd_coordinate", key: "reqReqHkCleaningDnd" },
          { id: "hk_bad_odor", key: "reqReqHkBadOdor" },
          { id: "hk_pest_control", key: "reqReqHkPestControl" },
        ],
      },
      {
        sectionKey: "reqReqSecHkEquipment",
        items: [
          { id: "hk_iron", key: "reqReqHkIron" },
          { id: "hk_vase", key: "reqReqHkVase" },
        ],
      },
      {
        sectionKey: "reqReqSecHkOther",
        items: [{ id: "other", key: "reqCatOther" }],
      },
    ],
    faultSections: [
      {
        sectionKey: "reqFaultSecHvac",
        items: [
          { id: "ft_ac_not_cooling", key: "reqFaultAcNotCooling" },
          { id: "ft_ac_not_heating", key: "reqFaultAcNotHeating" },
          { id: "ft_ac_remote", key: "reqFaultAcRemote" },
          { id: "ft_ac_fault", key: "reqFaultAcGeneral" },
          { id: "ft_ventilation_fault", key: "reqFaultVentilation" },
        ],
      },
      {
        sectionKey: "reqFaultSecElectric",
        items: [
          { id: "ft_socket_fault", key: "reqFaultSocket" },
          { id: "ft_electric_fault", key: "reqFaultElectricGeneral" },
          { id: "ft_led_fault", key: "reqFaultLed" },
          { id: "ft_lamp_fault", key: "reqFaultLamp" },
          { id: "ft_sconce_fault", key: "reqFaultSconce" },
        ],
      },
      {
        sectionKey: "reqFaultSecWaterBath",
        items: [
          { id: "ft_ceiling_water_leak", key: "reqFaultCeilingLeak" },
          { id: "ft_bidet_faucet_fault", key: "reqFaultBidetFaucet" },
          { id: "ft_cold_water_no_flow", key: "reqFaultColdWater" },
          { id: "ft_hot_water_no_flow", key: "reqFaultHotWater" },
          { id: "ft_siphon_fault", key: "reqFaultSiphon" },
          { id: "ft_faucet_fault", key: "reqFaultFaucet" },
          { id: "ft_sink_drain_fault", key: "reqFaultSinkDrain" },
          { id: "ft_toilet_seat_broken", key: "reqFaultToiletSeat" },
          { id: "ft_shower_cabin_fault", key: "reqFaultShowerCabin" },
          { id: "ft_shower_head_fault", key: "reqFaultShowerHead" },
          { id: "ft_towel_rail_fault", key: "reqFaultTowelRail" },
          { id: "ft_bathroom_drain_clog", key: "reqFaultBathroomClog" },
        ],
      },
      {
        sectionKey: "reqFaultSecTvElectronics",
        items: [
          { id: "ft_tv_remote", key: "reqFaultTvRemote" },
          { id: "ft_tv_fault", key: "reqFaultTv" },
          { id: "ft_phone_fault", key: "reqFaultPhone" },
          { id: "ft_minibar_fault", key: "reqFaultMinibar" },
          { id: "ft_safe_fault", key: "reqFaultSafe" },
          { id: "ft_kettle_fault", key: "reqFaultKettle" },
          { id: "ft_hair_dryer_fault", key: "reqFaultHairDryer" },
          { id: "ft_tv_channel_fault", key: "reqFaultTvChannel" },
        ],
      },
      {
        sectionKey: "reqFaultSecDoorWindow",
        items: [
          { id: "ft_curtain_fallen", key: "reqFaultCurtain" },
          { id: "ft_window_fault", key: "reqFaultWindow" },
          { id: "ft_window_cleaning", key: "reqFaultWindowCleaning" },
          { id: "ft_room_door_fault", key: "reqFaultRoomDoor" },
          { id: "ft_bathroom_door_fault", key: "reqFaultBathroomDoor" },
          { id: "ft_balcony_door_fault", key: "reqFaultBalconyDoor" },
          { id: "ft_balcony_railing_loose", key: "reqFaultBalconyRailing" },
          { id: "ft_cornice_fault", key: "reqFaultCornice" },
        ],
      },
      {
        sectionKey: "reqFaultSecFurniture",
        items: [
          { id: "ft_headboard_fault", key: "reqFaultHeadboard" },
          { id: "ft_dresser_drawer_fault", key: "reqFaultDresserDrawer" },
          { id: "ft_drawer_fault", key: "reqFaultDrawer" },
          { id: "ft_wardrobe_fault", key: "reqFaultWardrobe" },
          { id: "ft_mirror_damage", key: "reqFaultMirror" },
        ],
      },
      {
        sectionKey: "reqFaultSecGeneralFacility",
        items: [
          { id: "ft_elevator_fault", key: "reqFaultElevator" },
          { id: "ft_indoor_pool_temperature", key: "reqFaultIndoorPoolTemp" },
        ],
      },
      {
        sectionKey: "reqFaultSecOther",
        items: [{ id: "ft_other", key: "reqCatOther" }],
      },
    ],
    categories: {
      request: [],
      complaint: [
        { id: "room_cleaning", key: "reqCatComplaintCleaning" },
        { id: "noise", key: "reqCatComplaintNoise" },
        { id: "climate", key: "reqCatComplaintClimate" },
        { id: "room_comfort", key: "reqCatComplaintRoomComfort" },
        { id: "minibar", key: "reqCatComplaintMinibar" },
        { id: "restaurant_service", key: "reqCatComplaintRestaurant" },
        { id: "staff_behavior", key: "reqCatComplaintStaffBehavior" },
        { id: "general_areas", key: "reqCatComplaintGeneralAreas" },
        { id: "hygiene", key: "reqCatComplaintHygiene" },
        { id: "internet_tv", key: "reqCatComplaintInternetTv" },
        { id: "other", key: "reqCatOther" },
        { id: "lost_property", key: "reqCatComplaintLostProperty" },
      ],
      fault: [],
    },
    nationalities: [
      { value: "TR", key: "reqNatTR" },
      { value: "DE", key: "reqNatDE" },
      { value: "RU", key: "reqNatRU" },
      { value: "GB", key: "reqNatGB" },
      { value: "NL", key: "reqNatNL" },
      { value: "PL", key: "reqNatPL" },
      { value: "UA", key: "reqNatUA" },
      { value: "RO", key: "reqNatRO" },
      { value: "OTHER", key: "reqNatOther" },
    ],
  };

  (function flattenRequestCats() {
    var cfg = window.REQUESTS_CONFIG;
    var out = [];
    (cfg.requestSections || []).forEach(function (sec) {
      (sec.items || []).forEach(function (it) {
        out.push(it);
      });
    });
    cfg.categories.request = out;
  })();

  (function flattenFaultCats() {
    var cfg = window.REQUESTS_CONFIG;
    var out = [];
    (cfg.faultSections || []).forEach(function (sec) {
      (sec.items || []).forEach(function (it) {
        out.push(it);
      });
    });
    cfg.categories.fault = out;
  })();
})();
