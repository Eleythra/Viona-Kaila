(function () {
  "use strict";

  /**
   * Sabit indirim popup — görseller `assets/indirim/indirim-{TR|EN|DE}.png`; PL için şimdilik EN görseli kullanılır.
   * Güncelleme: dosyayı değiştirin; tarayıcı önbelleğini kırmak için aşağıdaki CACHE_BUST değerini artırın.
   */
  var CACHE_BUST = "1";
  var POPUP_ID = "discount-promo-popup";
  var SEEN_SESSION_KEY = "viona_indirim_popup_seen_v2";
  var HOME_VISIBLE_MAX_FRAMES = 12;

  var PROMO_IMAGES = {
    tr: "assets/indirim/indirim-TR.png?v=" + CACHE_BUST,
    en: "assets/indirim/indirim-EN.png?v=" + CACHE_BUST,
    de: "assets/indirim/indirim-DE.png?v=" + CACHE_BUST,
    pl: "assets/indirim/indirim-EN.png?v=" + CACHE_BUST,
  };

  function getLang() {
    try {
      return localStorage.getItem("viona_lang") || "tr";
    } catch (e) {
      return "tr";
    }
  }

  function normalizeLang(code) {
    var c = String(code || "tr").toLowerCase();
    if (c === "en" || c === "de" || c === "pl") return c;
    return "tr";
  }

  function imageSrcForLang(lang) {
    return PROMO_IMAGES[normalizeLang(lang)] || PROMO_IMAGES.tr;
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
      ["tr", "en", "de", "pl"].forEach(function (code) {
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
      '<button type="button" class="promo-popup__close" aria-label="Kapat">×</button>' +
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
    var img = popup.querySelector(".promo-popup__image");
    img.src = src;
    img.alt = "Kampanya";
    popup.classList.add("is-open");
    popup.setAttribute("aria-hidden", "false");
  }

  window.showDiscountPopup = showDiscountPopup;
})();
