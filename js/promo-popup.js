(function () {
  "use strict";

  /**
   * Sabit indirim popup — görseller `assets/indirim/indirim-{TR|EN|DE|PL|RU|DA|CS|RO|NL|SK}.png`.
   * Yeni dil görseli eklerken `PROMO_IMAGES` + CACHE_BUST artırın.
   */
  var CACHE_BUST = "12";
  var POPUP_ID = "discount-promo-popup";
  var SEEN_SESSION_KEY = "viona_indirim_popup_seen_v2";
  var HOME_VISIBLE_MAX_FRAMES = 18;

  var EN_PROMO_SRC = "assets/indirim/indirim-EN.png?v=" + CACHE_BUST;
  var PROMO_IMAGES = {
    tr: "assets/indirim/indirim-TR.png?v=" + CACHE_BUST,
    en: EN_PROMO_SRC,
    de: "assets/indirim/indirim-DE.png?v=" + CACHE_BUST,
    pl: "assets/indirim/indirim-PL.png?v=" + CACHE_BUST,
    ru: "assets/indirim/indirim-RU.png?v=" + CACHE_BUST,
    da: "assets/indirim/indirim-DA.png?v=" + CACHE_BUST,
    cs: "assets/indirim/indirim-CS.png?v=" + CACHE_BUST,
    ro: "assets/indirim/indirim-RO.png?v=" + CACHE_BUST,
    nl: "assets/indirim/indirim-NL.png?v=" + CACHE_BUST,
    sk: "assets/indirim/indirim-SK.png?v=" + CACHE_BUST,
  };

  /** Şifre ile ana sayfaya her girişte (oturum başına bir kez) kampanya popup — kapatılabilir. */
  var DISABLE_PROMO_AUTO_OPEN = false;

  function getLang() {
    try {
      return localStorage.getItem("viona_lang") || "tr";
    } catch (e) {
      return "tr";
    }
  }

  function normalizeLang(code) {
    var c = String(code || "tr").toLowerCase().slice(0, 2);
    if (window.VIONA_LANG && typeof window.VIONA_LANG.normalizeToUiLang === "function") {
      return window.VIONA_LANG.normalizeToUiLang(c);
    }
    if (window.VIONA_LANG && window.VIONA_LANG.ALL && window.VIONA_LANG.ALL.indexOf(c) !== -1) return c;
    if (c === "en" || c === "de" || c === "pl") return c;
    return "tr";
  }

  var CLOSE_ARIA = {
    tr: "Kapat",
    en: "Close",
    de: "Schließen",
    pl: "Zamknij",
    ru: "Закрыть",
    da: "Luk",
    cs: "Zavřít",
    ro: "Închide",
    nl: "Sluiten",
    sk: "Zavrieť",
  };

  var IMG_ALT = {
    tr: "Kampanya ve duyuru görseli",
    en: "Promotional offer image",
    de: "Aktions- und Hinweisbild",
    pl: "Grafika promocyjna",
    ru: "Рекламное изображение",
    da: "Kampagnebillede",
    cs: "Propagační obrázek",
    ro: "Imagine promoțională",
    nl: "Promotieafbeelding",
    sk: "Propagačný obrázok",
  };

  function imageSrcForLang(lang) {
    var n = normalizeLang(lang);
    if (PROMO_IMAGES[n]) return PROMO_IMAGES[n];
    if (n !== "tr" && PROMO_IMAGES.en) return PROMO_IMAGES.en;
    return PROMO_IMAGES.tr;
  }

  function isDismissedThisSession() {
    try {
      return sessionStorage.getItem(SEEN_SESSION_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function markDismissed() {
    try {
      sessionStorage.setItem(SEEN_SESSION_KEY, "1");
    } catch (e) {
      /* private mode */
    }
  }

  /** Dil seçim ekranına dönünce: bir sonraki ana sayfa girişinde popup yine gösterilebilsin. */
  function resetVionaPromoDismissForLangScreen() {
    try {
      sessionStorage.removeItem(SEEN_SESSION_KEY);
      var codes =
        window.VIONA_LANG && window.VIONA_LANG.ALL
          ? window.VIONA_LANG.ALL
          : ["tr", "en", "de", "pl", "ru", "da", "cs", "ro", "nl", "sk"];
      codes.forEach(function (code) {
        sessionStorage.removeItem("viona_discount_popup_tab_once_" + code);
      });
    } catch (e) {
      /* no-op */
    }
  }

  window.resetVionaPromoDismissForLangScreen = resetVionaPromoDismissForLangScreen;

  function hidePromoPopup(markDismissedFlag) {
    var popup = document.getElementById(POPUP_ID);
    if (!popup) return;
    popup.classList.remove("is-open");
    popup.setAttribute("aria-hidden", "true");
    if (markDismissedFlag) markDismissed();
  }

  function closePopup() {
    hidePromoPopup(true);
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
      '<button type="button" class="promo-popup__close" aria-label="">×</button>' +
      '<img class="promo-popup__image" alt="" decoding="async" loading="eager" />' +
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
    if (DISABLE_PROMO_AUTO_OPEN) return;
    for (var f = 0; f < HOME_VISIBLE_MAX_FRAMES && !isHomeVisible(); f++) {
      await waitFrame();
    }
    if (!isHomeVisible()) return;

    if (isDismissedThisSession()) {
      hidePromoPopup(false);
      return;
    }

    var lang = normalizeLang(getLang());
    var src = imageSrcForLang(lang);
    if (!src) return;

    try {
      var im = new Image();
      im.decoding = "async";
      im.src = src;
    } catch (_e) {
      /* no-op */
    }

    var popup = ensurePopup();
    var closeBtn = popup.querySelector(".promo-popup__close");
    if (closeBtn) closeBtn.setAttribute("aria-label", CLOSE_ARIA[lang] || CLOSE_ARIA.en);
    var img = popup.querySelector(".promo-popup__image");
    img.src = src;
    img.alt = IMG_ALT[lang] || IMG_ALT.en;
    popup.classList.add("is-open");
    popup.setAttribute("aria-hidden", "false");
  }

  window.showDiscountPopup = showDiscountPopup;
})();
