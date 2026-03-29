(function () {
  "use strict";

  /** Kapatıldı bayrağı: sessionStorage + dil ekranına dönünce sıfırlanır (her dil seçiminde tekrar gösterim). */
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
      return sessionStorage.getItem(seenKeyForLang(lang)) === String(version || "v0");
    } catch (e) {
      return false;
    }
  }

  function markClosedForSession(version) {
    var lang = normalizePromoLang(getLang());
    try {
      sessionStorage.setItem(seenKeyForLang(lang), String(version || "v0"));
    } catch (e) {
      /* no-op */
    }
  }

  /** Dil seçim ekranına her dönüşte çağrılır: kapatıldı + eski tab-kilidi anahtarlarını temizler. */
  function resetPromoDismissForLangScreen() {
    try {
      ["tr", "en", "de", "ru"].forEach(function (code) {
        sessionStorage.removeItem(POPUP_SEEN_KEY_PREFIX + code);
        sessionStorage.removeItem("viona_discount_popup_tab_once_" + code);
      });
    } catch (e) {
      /* no-op */
    }
  }

  window.resetVionaPromoDismissForLangScreen = resetPromoDismissForLangScreen;

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

  /** Seçilen dilde görseli olan config (eski önbellekte yalnız EN dolu iken TR gecikmesini azaltır). */
  function pickBestInitialConfig(forLang) {
    var code = normalizePromoLang(forLang);
    function hasImageForLang(cfg) {
      return Boolean(cfg && String(cfg["image_" + code] || "").trim());
    }
    var s = sessionPromoConfig;
    var c = readCachedPromoConfig();
    if (hasImageForLang(s)) return s;
    if (hasImageForLang(c)) return c;
    return s || c;
  }

  /**
   * Bu sayfa yüklemesinde başarıyla alınan son config. fetchPromoConfigOnce tamamlanınca dolar.
   * Amaç: dil seçiminden sonra showDiscountPopup içinde await ile ikinci bir GET beklenmesin
   * (önceki kodda promise finally ile sıfırlandığı için her seferinde yeni istek açılıyordu).
   */
  var sessionPromoConfig = null;
  var promoConfigFetchPromise = null;

  function resolvePromoConfigEndpoint() {
    if (typeof document !== "undefined" && document.documentElement) {
      var domAttr = document.documentElement.getAttribute("data-viona-live-api");
      if (domAttr && String(domAttr).trim()) {
        return String(domAttr).trim().replace(/\/+$/, "") + "/admin/promo-config";
      }
    }
    if (typeof window.vionaGetApiBase === "function") {
      return window.vionaGetApiBase() + "/admin/promo-config";
    }
    return (window.VIONA_API_CONFIG || {}).adminPromoConfigEndpoint || "/api/admin/promo-config";
  }

  async function loadPromoConfig() {
    var endpoint = resolvePromoConfigEndpoint();
    try {
      var res = await fetch(endpoint, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
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
    if (sessionPromoConfig) {
      return Promise.resolve(sessionPromoConfig);
    }
    if (!promoConfigFetchPromise) {
      promoConfigFetchPromise = loadPromoConfig()
        .then(function (cfg) {
          if (cfg) {
            prewarmPromoImages(cfg);
            writeCachedPromoConfig(cfg);
            sessionPromoConfig = cfg;
          }
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

  /** ~5 MB üstü data URL gövdeleri quota / yarım önbellek riski; yazmayı atla. */
  var PROMO_CACHE_MAX_CHARS = 4500000;

  function writeCachedPromoConfig(cfg) {
    var n = normalizePromoConfig(cfg);
    if (!n) return;
    try {
      var s = JSON.stringify(n);
      if (s.length > PROMO_CACHE_MAX_CHARS) return;
      localStorage.setItem(PROMO_CACHE_KEY, s);
    } catch (e) {
      try {
        localStorage.removeItem(PROMO_CACHE_KEY);
      } catch (_ignore) {
        /* no-op */
      }
    }
  }

  /** Ağ cevabı gelince decode önceden başlasın (özellikle büyük data URL). */
  function prewarmPromoImages(cfg) {
    if (!cfg || typeof cfg !== "object") return;
    ["tr", "en", "de", "ru"].forEach(function (code) {
      var src = String(cfg["image_" + code] || "").trim();
      if (!src) return;
      try {
        var im = new Image();
        im.decoding = "async";
        im.src = src;
      } catch (e) {
        /* no-op */
      }
    });
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
      '<img class="promo-popup__image" alt="Discount campaign" decoding="async" loading="eager" />' +
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
    var openedInThisInvocation = false;

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
      if (openedInThisInvocation) return false;
      openedInThisInvocation = true;
      currentPopupVersion = version;
      var popup = ensurePopup();
      var img = popup.querySelector(".promo-popup__image");
      img.src = src;
      popup.classList.add("is-open");
      popup.setAttribute("aria-hidden", "false");
      return true;
    }

    var tryFirst = pickBestInitialConfig(lang);
    var popupOpened = Boolean(tryFirst && showPopupForConfig(tryFirst, ver(tryFirst)));

    if (!sessionPromoConfig) {
      if (!popupOpened) {
        var remoteCfg = await fetchPromoConfigOnce();
        if (remoteCfg) {
          showPopupForConfig(remoteCfg, ver(remoteCfg));
        } else if (!tryFirst) {
          var again = readCachedPromoConfig();
          if (again) showPopupForConfig(again, ver(again));
        }
      } else {
        void fetchPromoConfigOnce();
      }
    }
  }

  window.showDiscountPopup = showDiscountPopup;
  fetchPromoConfigOnce();
})();
