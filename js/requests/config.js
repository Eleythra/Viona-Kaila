/**
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

  /** Takvim: en erken 1 Mart 2026 veya bugün (hangisi geç ise). */
  window.getCalendarMinDateISO = function () {
    var floor = new Date(2026, 2, 1);
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    floor.setHours(0, 0, 0, 0);
    var min = floor > today ? floor : today;
    return min.getFullYear() + "-" + pad(min.getMonth() + 1) + "-" + pad(min.getDate());
  };

  /** La Terrace A La Carte: 18:30 – 21:00 (otel verisi) */
  var LA_TERRACE = slots15("18:30", "21:00");
  /** Mare (balık a la carte): akşam rezervasyon penceresi 18:00 – 22:00 */
  var MARE = slots15("18:00", "22:00");
  /** Sinton BBQ: 13:00 – 22:00 (otel verisi; Pazartesi kapalı operasyon ayrı yönetilir) */
  var SINTON = slots15("13:00", "22:00");

  /** Spa: La Serenite 08:30–19:00 arası 15 dk (ücretli hizmet randevusu) */
  var SPA_SLOTS = slots15("08:30", "19:00");

  window.REQUESTS_CONFIG = {
    floorCalendarDate: "2026-03-01",
    categories: {
      request: [
        { id: "extraTowels", key: "reqCatReqTowels" },
        { id: "bedding", key: "reqCatReqBedding" },
        { id: "roomCleaning", key: "reqCatReqCleaning" },
        { id: "minibar", key: "reqCatReqMinibar" },
        { id: "babyBed", key: "reqCatReqBabyBed" },
        { id: "other", key: "reqCatOther" },
      ],
      complaint: [
        { id: "roomCleaning", key: "reqCatComplaintCleaning" },
        { id: "noise", key: "reqCatComplaintNoise" },
        { id: "restaurantSvc", key: "reqCatComplaintRestaurant" },
        { id: "staff", key: "reqCatComplaintStaff" },
        { id: "climate", key: "reqCatComplaintClimate" },
        { id: "other", key: "reqCatOther" },
      ],
      fault: [
        { id: "ac", key: "reqCatFaultAc" },
        { id: "tv", key: "reqCatFaultTv" },
        { id: "lighting", key: "reqCatFaultLight" },
        { id: "bathroom", key: "reqCatFaultBath" },
        { id: "doorLock", key: "reqCatFaultDoor" },
        { id: "phone", key: "reqCatFaultPhone" },
        { id: "other", key: "reqCatOther" },
      ],
    },
    restaurants: [
      { id: "laTerrace", key: "reqRestLaTerrace", slotProfile: "laTerrace" },
      { id: "mare", key: "reqRestMare", slotProfile: "mare" },
      { id: "sinton", key: "reqRestSinton", slotProfile: "sinton" },
    ],
    spaServices: [
      { id: "massage", key: "reqSpaMassage" },
      { id: "kese", key: "reqSpaKese" },
      { id: "peeling", key: "reqSpaPeeling" },
      { id: "skin", key: "reqSpaSkin" },
      { id: "other", key: "reqCatOther" },
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
      case "mare":
        return cfg.mareSlots.slice();
      case "sinton":
        return cfg.sintonSlots.slice();
      default:
        return cfg.mareSlots.slice();
    }
  };

  window.generateTimeSlots15 = slots15;
})();
