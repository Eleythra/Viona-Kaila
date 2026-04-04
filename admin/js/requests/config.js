/**
 * NOT: Admin arayüzü `admin/index.html` içinde `../js/requests/config.js` yükler; bu dosya şu an
 * HTML’de referanslı değildir. Tek doğruluk kaynağı: depo kökündeki `js/requests/config.js`.
 * Bu kopyayı değiştirirken kök dosyayı da eşitleyin veya sadece kökü düzenleyin.
 *
 * Misafir talepleri — kategori ve demo seçenekleri (ileride API ile değiştirilebilir).
 * Rezervasyon saatleri: tüm restoranlar için 15 dakika adımları.
 */
(function () {
  "use strict";

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function toMinutes(hhmm) {
    var p = String(hhmm).split(":");
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  }

  function fromMinutes(m) {
    var h = Math.floor(m / 60);
    var mi = m % 60;
    return pad(h) + ":" + pad(mi);
  }

  /**
   * Kapalı aralık [start, end], 15 dakika adımları (örn. 18:45–21:00).
   * @param {string} startHHMM
   * @param {string} endHHMM
   * @returns {string[]}
   */
  function slots15(startHHMM, endHHMM) {
    var a = toMinutes(startHHMM);
    var b = toMinutes(endHHMM);
    var out = [];
    var t;
    for (t = a; t <= b; t += 15) {
      out.push(fromMinutes(t));
    }
    return out;
  }

  /** Takvim: geçmiş günler kapalı — yalnızca bugün ve sonrası (yerel tarih). */
  window.getCalendarMinDateISO = function () {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.getFullYear() + "-" + pad(today.getMonth() + 1) + "-" + pad(today.getDate());
  };

  /** La Terrace A La Carte: 18:30 – 20:30 */
  var LA_TERRACE = slots15("18:30", "20:30");
  /** Mare (balık a la carte): 18:00 – 21:30 */
  var MARE = slots15("18:00", "21:30");
  /** Sinton BBQ: 13:00 – 21:15 (Pazartesi kapalı) */
  var SINTON = slots15("13:00", "21:15");

  /** Spa: La Serenite 08:30–19:00 arası 15 dk (ücretli hizmet randevusu) */
  var SPA_SLOTS = slots15("08:30", "19:00");

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
    categories: {
      request: [
        { id: "towel", key: "reqCatReqTowel" },
        { id: "bedding", key: "reqCatReqBedding" },
        { id: "room_cleaning", key: "reqCatReqCleaning" },
        { id: "minibar", key: "reqCatReqMinibar" },
        { id: "baby_equipment", key: "reqCatReqBabyEquipment" },
        { id: "room_equipment", key: "reqCatReqRoomEquipment" },
        { id: "other", key: "reqCatOther" },
      ],
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
    restaurants: [
      {
        id: "laTerrace",
        code: "la_terrace",
        key: "reqRestLaTerrace",
        slotProfile: "laTerrace",
        infoKey: "reqResInfoLaTerrace",
        closedWeekdays: [],
      },
      {
        id: "sinton",
        code: "sinton_bbq",
        key: "reqRestSinton",
        slotProfile: "sinton",
        infoKey: "reqResInfoSinton",
        closedWeekdays: [1],
      },
    ],
    spaServices: [
      { id: "massage", code: "massage", key: "reqSpaMassage" },
      { id: "peeling", code: "peeling", key: "reqSpaPeeling" },
      { id: "skin_care", code: "skin_care", key: "reqSpaSkin" },
      { id: "other_care", code: "other_care", key: "reqSpaOtherCare" },
    ],
    laTerraceSlots: LA_TERRACE,
    mareSlots: MARE,
    sintonSlots: SINTON,
    spaTimeSlots: SPA_SLOTS,
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

  /**
   * @param {string} restaurantId
   * @returns {string[]}
   */
  window.getTimeSlotsForRestaurant = function (restaurantId) {
    var cfg = window.REQUESTS_CONFIG;
    if (!restaurantId) return [];
    var r = cfg.restaurants.filter(function (x) {
      return x.id === restaurantId;
    })[0];
    if (!r) return [];
    switch (r.slotProfile) {
      case "laTerrace":
        return cfg.laTerraceSlots.slice();
      case "sinton":
        return cfg.sintonSlots.slice();
      default:
        return [];
    }
  };

  window.generateTimeSlots15 = slots15;
})();
