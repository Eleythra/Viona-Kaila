(function () {
  "use strict";

  var POPUP_SEEN_KEY_PREFIX = "viona_discount_popup_seen_";
  var PROMO_CACHE_KEY = "viona_discount_popup_cache_v1";
  var currentPopupVersion = "v0";
  var POPUP_ID = "discount-promo-popup";
  var IMAGE_BY_LANG = {
    tr: "",
    en: "",
    de: "",
    ru: "",
  };

  function getLang() {
    try {
      return localStorage.getItem("viona_lang") || "tr";
    } catch (e) {
      return "tr";
    }
  }

  function seenKeyForLang(lang) {
    return POPUP_SEEN_KEY_PREFIX + String(lang || "tr");
  }

  function isClosedForSession(version, lang) {
    try {
      return localStorage.getItem(seenKeyForLang(lang)) === String(version || "v0");
    } catch (e) {
      return false;
    }
  }

  function markClosedForSession(version) {
    var lang = getLang();
    try {
      localStorage.setItem(seenKeyForLang(lang), String(version || "v0"));
    } catch (e) {
      /* no-op */
    }
  }

  function closePopup() {
    var popup = document.getElementById(POPUP_ID);
    if (!popup) return;
    popup.classList.remove("is-open");
    popup.setAttribute("aria-hidden", "true");
    markClosedForSession(currentPopupVersion);
  }

  function imageForLang(code) {
    return IMAGE_BY_LANG[code] || "";
  }

  async function loadPromoConfig() {
    var cfg = window.VIONA_API_CONFIG || {};
    var endpoint = cfg.adminPromoConfigEndpoint || "/api/admin/promo-config";
    try {
      var res = await fetch(endpoint, { method: "GET" });
      var data = await res.json();
      if (!res.ok || !data || !data.ok || !data.config) return null;
      return data.config;
    } catch (e) {
      return null;
    }
  }

  function readCachedPromoConfig() {
    try {
      var raw = localStorage.getItem(PROMO_CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function writeCachedPromoConfig(cfg) {
    try {
      localStorage.setItem(PROMO_CACHE_KEY, JSON.stringify(cfg || {}));
    } catch (e) {
      /* no-op */
    }
  }

  function applyConfig(cfg) {
    if (!cfg || typeof cfg !== "object") return;
    IMAGE_BY_LANG.tr = cfg.image_tr || "";
    IMAGE_BY_LANG.en = cfg.image_en || "";
    IMAGE_BY_LANG.de = cfg.image_de || "";
    IMAGE_BY_LANG.ru = cfg.image_ru || "";
  }

  function ensurePopup() {
    var existing = document.getElementById(POPUP_ID);
    if (existing) return existing;

    var root = document.createElement("div");
    root.id = POPUP_ID;
    root.className = "promo-popup";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-hidden", "true");
    root.innerHTML =
      '<div class="promo-popup__backdrop"></div>' +
      '<div class="promo-popup__panel">' +
      '<button type="button" class="promo-popup__close" aria-label="Close">×</button>' +
      '<img class="promo-popup__image" alt="Discount campaign" />' +
      "</div>";

    root.querySelector(".promo-popup__close").addEventListener("click", closePopup);
    root.querySelector(".promo-popup__backdrop").addEventListener("click", closePopup);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closePopup();
    });
    document.body.appendChild(root);
    return root;
  }

  async function showDiscountPopup() {
    var home = document.getElementById("view-home");
    if (!home || home.classList.contains("hidden")) return;

    var lang = getLang();
    var cached = readCachedPromoConfig();
    var cachedVersion = (cached && cached.updated_at) || "v0";
    if (cached && cached.enabled === false) return;
    if (cached) applyConfig(cached);
    if (isClosedForSession(cachedVersion, lang)) return;

    var src = imageForLang(lang);
    var popup = null;
    var img = null;
    if (src) {
      currentPopupVersion = cachedVersion;
      popup = ensurePopup();
      img = popup.querySelector(".promo-popup__image");
      img.src = src;
      popup.classList.add("is-open");
      popup.setAttribute("aria-hidden", "false");
    }

    var remoteCfg = await loadPromoConfig();
    if (!remoteCfg) return;
    writeCachedPromoConfig(remoteCfg);
    var remoteVersion = remoteCfg.updated_at || "v0";
    if (remoteCfg.enabled === false) return closePopup();
    if (isClosedForSession(remoteVersion, lang)) return closePopup();
    applyConfig(remoteCfg);
    src = imageForLang(lang);
    if (!src) return;
    currentPopupVersion = remoteVersion;
    var popup = ensurePopup();
    var img = popup.querySelector(".promo-popup__image");
    img.src = src;
    popup.classList.add("is-open");
    popup.setAttribute("aria-hidden", "false");
  }

  window.showDiscountPopup = showDiscountPopup;
})();
