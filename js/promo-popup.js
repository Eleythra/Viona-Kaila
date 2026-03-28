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
  var HOME_VISIBLE_MAX_FRAMES = 12;

  function getLang() {
    try {
      return localStorage.getItem("viona_lang") || "tr";
    } catch (e) {
      return "tr";
    }
  }

  function normalizePromoLang(code) {
    var c = String(code || "tr").toLowerCase();
    if (c === "en" || c === "de" || c === "ru") return c;
    return "tr";
  }

  function seenKeyForLang(lang) {
    return POPUP_SEEN_KEY_PREFIX + normalizePromoLang(lang);
  }

  function isClosedForSession(version, lang) {
    try {
      return localStorage.getItem(seenKeyForLang(lang)) === String(version || "v0");
    } catch (e) {
      return false;
    }
  }

  function markClosedForSession(version) {
    var lang = normalizePromoLang(getLang());
    try {
      localStorage.setItem(seenKeyForLang(lang), String(version || "v0"));
    } catch (e) {
      /* no-op */
    }
  }

  function hidePromoPopup(markSeen) {
    var popup = document.getElementById(POPUP_ID);
    if (!popup) return;
    popup.classList.remove("is-open");
    popup.setAttribute("aria-hidden", "true");
    if (markSeen) markClosedForSession(currentPopupVersion);
  }

  function closePopup() {
    hidePromoPopup(true);
  }

  function normalizePromoConfig(raw) {
    if (!raw || typeof raw !== "object") return null;
    return {
      key: raw.key,
      enabled: raw.enabled !== false,
      image_tr: String(raw.image_tr || "").trim(),
      image_en: String(raw.image_en || "").trim(),
      image_de: String(raw.image_de || "").trim(),
      image_ru: String(raw.image_ru || "").trim(),
      updated_at: raw.updated_at != null && String(raw.updated_at).trim() !== "" ? raw.updated_at : null,
    };
  }

  function configVersion(cfg) {
    if (!cfg || cfg.updated_at == null || String(cfg.updated_at).trim() === "") return "v0";
    return String(cfg.updated_at);
  }

  /** Yalnızca seçili dilin görseli; diğer dillere düşme yok. */
  function imageSrcForLangOnly(cfg, lang) {
    if (!cfg || typeof cfg !== "object") return "";
    var code = normalizePromoLang(lang);
    return String(cfg["image_" + code] || "").trim();
  }

  var promoConfigFetchPromise = null;

  async function loadPromoConfig() {
    var api = window.VIONA_API_CONFIG || {};
    var endpoint = api.adminPromoConfigEndpoint || "/api/admin/promo-config";
    try {
      var res = await fetch(endpoint, { method: "GET", headers: { Accept: "application/json" } });
      var text = await res.text();
      var data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (_parse) {
        return null;
      }
      if (!res.ok || !data || typeof data !== "object" || !data.ok || !data.config) return null;
      return normalizePromoConfig(data.config);
    } catch (e) {
      return null;
    }
  }

  function fetchPromoConfigOnce() {
    if (!promoConfigFetchPromise) {
      promoConfigFetchPromise = loadPromoConfig()
        .then(function (cfg) {
          if (cfg) writeCachedPromoConfig(cfg);
          return cfg;
        })
        .catch(function () {
          return null;
        })
        .finally(function () {
          promoConfigFetchPromise = null;
        });
    }
    return promoConfigFetchPromise;
  }

  function readCachedPromoConfig() {
    try {
      var raw = localStorage.getItem(PROMO_CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return normalizePromoConfig(parsed);
    } catch (e) {
      return null;
    }
  }

  function writeCachedPromoConfig(cfg) {
    var n = normalizePromoConfig(cfg);
    if (!n) return;
    try {
      localStorage.setItem(PROMO_CACHE_KEY, JSON.stringify(n));
    } catch (e) {
      /* quota / private mode */
    }
  }

  function applyConfig(cfg) {
    if (!cfg || typeof cfg !== "object") return;
    IMAGE_BY_LANG.tr = String(cfg.image_tr || "").trim();
    IMAGE_BY_LANG.en = String(cfg.image_en || "").trim();
    IMAGE_BY_LANG.de = String(cfg.image_de || "").trim();
    IMAGE_BY_LANG.ru = String(cfg.image_ru || "").trim();
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

  function isHomeVisible() {
    var home = document.getElementById("view-home");
    return Boolean(home && !home.classList.contains("hidden"));
  }

  function waitFrame() {
    return new Promise(function (resolve) {
      requestAnimationFrame(function () {
        resolve();
      });
    });
  }

  async function showDiscountPopup() {
    for (var f = 0; f < HOME_VISIBLE_MAX_FRAMES && !isHomeVisible(); f++) {
      await waitFrame();
    }
    if (!isHomeVisible()) return;

    var lang = normalizePromoLang(getLang());
    var ver = configVersion;

    function showPopupForConfig(cfg, version) {
      if (!cfg || typeof cfg !== "object") return false;
      if (cfg.enabled === false) {
        hidePromoPopup(false);
        return false;
      }
      applyConfig(cfg);
      if (isClosedForSession(version, lang)) {
        hidePromoPopup(false);
        return false;
      }
      var src = imageSrcForLangOnly(cfg, lang);
      if (!src) {
        hidePromoPopup(false);
        return false;
      }
      currentPopupVersion = version;
      var popup = ensurePopup();
      var img = popup.querySelector(".promo-popup__image");
      img.src = src;
      popup.classList.add("is-open");
      popup.setAttribute("aria-hidden", "false");
      return true;
    }

    var cached = readCachedPromoConfig();
    if (cached) showPopupForConfig(cached, ver(cached));

    var remoteCfg = await fetchPromoConfigOnce();
    if (remoteCfg) {
      showPopupForConfig(remoteCfg, ver(remoteCfg));
    } else {
      var again = readCachedPromoConfig();
      if (again) showPopupForConfig(again, ver(again));
    }
  }

  window.showDiscountPopup = showDiscountPopup;
  fetchPromoConfigOnce();
})();
