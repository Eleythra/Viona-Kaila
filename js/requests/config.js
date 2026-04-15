/**
 * Misafir talepleri — kategori seçenekleri (API ile uyumlu).
 * İstekler: düz seçim (Tür/alt kategori yok); bölüm başlıkları requestSections ile.
 */
(function () {
  "use strict";

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  /** Takvim: geçmiş günler kapalı — yalnızca bugün ve sonrası (yerel tarih). */
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
    /**
     * İstek formu: gruplu düz seçim (sunucu category = id).
     * Sohbet asistanı sırası: `server/src/assistant/services/form_schema.py` → REQUEST_CATEGORY_CHAT_SECTIONS ile senkron tutun.
     * CI: `PYTHONPATH=src pytest src/assistant/tests/test_request_schema_sync.py`.
     */
    requestSections: [
      {
        sectionKey: "reqReqSecTowels",
        items: [
          { id: "bedding_pillow", key: "reqReqBeddingPillow" },
          { id: "room_towel", key: "reqReqRoomTowelExtra" },
          { id: "bathrobe", key: "reqReqBathrobe" },
          { id: "slippers", key: "reqReqSlippers" },
        ],
      },
      {
        sectionKey: "reqReqSecBedding",
        items: [
          { id: "bedding_sheet", key: "reqReqBeddingSheet" },
          { id: "bedding_blanket", key: "reqReqBeddingBlanket" },
        ],
      },
      {
        sectionKey: "reqReqSecRoomService",
        items: [{ id: "room_cleaning", key: "reqReqRoomCleaningOnly" }],
      },
      {
        sectionKey: "reqReqSecMinibarDrinks",
        items: [
          { id: "bottled_water", key: "reqReqBottledWater" },
          { id: "tea_coffee", key: "reqReqTeaCoffee" },
        ],
      },
      {
        sectionKey: "reqReqSecBathAmenities",
        items: [
          { id: "toilet_paper", key: "reqReqToiletPaper" },
          { id: "toiletries", key: "reqReqToiletries" },
        ],
      },
      {
        sectionKey: "reqReqSecComfort",
        items: [
          { id: "climate_request", key: "reqReqClimate" },
          { id: "room_refresh", key: "reqReqRoomRefresh" },
        ],
      },
      {
        sectionKey: "reqReqSecEquipment",
        items: [
          { id: "hanger", key: "reqReqHanger" },
          { id: "kettle", key: "reqReqKettle" },
          { id: "room_safe", key: "reqReqRoomSafe" },
          { id: "baby_bed", key: "reqReqBabyBedOnly" },
        ],
      },
      {
        sectionKey: "reqReqSecOther",
        items: [{ id: "other", key: "reqCatOther" }],
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
      fault: [
        { id: "hvac", key: "reqCatFaultHvac" },
        { id: "electric", key: "reqCatFaultElectric" },
        { id: "water_bathroom", key: "reqCatFaultWaterBathroom" },
        { id: "tv_electronics", key: "reqCatFaultTvElectronics" },
        { id: "door_lock", key: "reqCatFaultDoorLock" },
        { id: "furniture_item", key: "reqCatFaultFurnitureItem" },
        { id: "cleaning_equipment_damage", key: "reqCatFaultCleaningEquipmentDamage" },
        { id: "balcony_window", key: "reqCatFaultBalconyWindow" },
        { id: "other", key: "reqCatOther" },
      ],
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
})();
