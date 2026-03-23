(function () {
  "use strict";

  var SESSION_KEY = "viona_discount_popup_closed";
  var POPUP_ID = "discount-promo-popup";
  var IMAGE_BY_LANG = {
    tr: "assets/images/promo/discount-tr.png",
    en: "assets/images/promo/discount-en.png",
    de: "assets/images/promo/discount-de.png",
    ru: "assets/images/promo/discount-ru.png",
  };

  function getLang() {
    try {
      return localStorage.getItem("viona_lang") || "tr";
    } catch (e) {
      return "tr";
    }
  }

  function isClosedForSession() {
    try {
      return sessionStorage.getItem(SESSION_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function markClosedForSession() {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch (e) {
      /* no-op */
    }
  }

  function closePopup() {
    var popup = document.getElementById(POPUP_ID);
    if (!popup) return;
    popup.classList.remove("is-open");
    popup.setAttribute("aria-hidden", "true");
    markClosedForSession();
  }

  function imageForLang(code) {
    return IMAGE_BY_LANG[code] || IMAGE_BY_LANG.tr;
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

  function showDiscountPopup() {
    if (isClosedForSession()) return;
    var home = document.getElementById("view-home");
    if (!home || home.classList.contains("hidden")) return;

    var popup = ensurePopup();
    var img = popup.querySelector(".promo-popup__image");
    img.src = imageForLang(getLang());
    popup.classList.add("is-open");
    popup.setAttribute("aria-hidden", "false");
  }

  window.showDiscountPopup = showDiscountPopup;
})();
