(function () {
  "use strict";

  /** Önem / kullanım sıklığı: talepler, bilgi, yön, oda servisi ve yemek üstte; transfer ara ara; kampanya / toplantı / Alanya altta; değerlendirme en sonda. */
  const MODULE_DEFS = [
    { id: "requests", i18nKey: "modRequests", icon: "messages", isRequests: true },
    { id: "general", i18nKey: "modGeneral", icon: "building" },
    { id: "where", i18nKey: "modWhere", icon: "pin" },
    { id: "room_service", i18nKey: "modRoomService", icon: "roomService" },
    { id: "restaurant", i18nKey: "modRest", icon: "utensils" },
    { id: "beach", i18nKey: "modBeach", icon: "waves" },
    { id: "spa", i18nKey: "modSpa", icon: "spa" },
    { id: "transfer", i18nKey: "modTransfer", icon: "transfer" },
    { id: "alacarte", i18nKey: "modAlacarte", icon: "plate" },
    { id: "animation", i18nKey: "modAnim", icon: "spark" },
    { id: "sustainability", i18nKey: "modSustainability", icon: "leaf" },
    { id: "coming_soon", i18nKey: "modComingSoon", icon: "map" },
    { id: "miniclub", i18nKey: "modMini", icon: "smile" },
    { id: "discount", i18nKey: "modDiscount", icon: "percent" },
    { id: "meeting", i18nKey: "modMeet", icon: "users" },
    { id: "alanya", i18nKey: "modAlanya", icon: "compass" },
    { id: "survey", i18nKey: "modSurvey", icon: "star", isSurvey: true },
  ];

  const REQUEST_SUBS = [
    { id: "request", i18nKey: "subRequest", hintKey: "subRequestHint" },
    { id: "complaint", i18nKey: "subComplaint", hintKey: "subComplaintHint" },
    { id: "fault", i18nKey: "subFault", hintKey: "subFaultHint" },
    { id: "guest_notification", i18nKey: "subGuestNotification", hintKey: "subGuestNotificationHint" },
  ];

  const ICONS = {
    building:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-6h6v6"/><path d="M9 10h.01M15 10h.01"/></svg>',
    map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M9 20l-5 2V6l5-2 6 2 5-2v16l-5 2-6-2z"/><path d="M9 6v14"/><path d="M15 8v14"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6-5.2-6-10a6 6 0 1112 0c0 4.8-6 10-6 10z"/><circle cx="12" cy="11" r="2.5"/></svg>',
    utensils:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M7 4v17M4 7h6"/><path d="M17 4v17M14 4h6"/></svg>',
    plate:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><ellipse cx="12" cy="14" rx="9" ry="4"/><path d="M12 10c-3 0-6-2-6-5h12c0 3-3 5-6 5z"/></svg>',
    waves:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M2 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0 4 2 6 0"/><path d="M2 17c2-2 4-2 6 0s4 2 6 0 4-2 6 0 4 2 6 0"/></svg>',
    messages:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M21 12a8 8 0 01-8 8H8l-5 3v-3H5a8 8 0 118-11z"/></svg>',
    spa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M12 3c-2 3-6 4-6 9a6 6 0 0012 0c0-5-4-6-6-9z"/><path d="M12 18v3"/></svg>',
    percent:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M7 7l10 10M16 8a1 1 0 100-2 1 1 0 000 2zM8 18a1 1 0 100-2 1 1 0 000 2z"/></svg>',
    spark:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M12 2l1.8 5.5L19 9l-5.2 1.5L12 16l-1.8-5.5L5 9l5.2-1.5L12 2z"/></svg>',
    smile:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></svg>',
    users:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>',
    compass:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="12" cy="12" r="9"/><path d="M14.5 9.5l-3 5-2-2 5-3z"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 17.8 5.7 21l2.3-7-6-4.6h7.6L12 2z"/></svg>',
    transfer:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M4 17h2.5l1-3h8l1 3H19" stroke-linecap="round"/><path d="M6.5 14L5 7h4l1.5 4h3L15 7h4l-1.5 7M8 17v2M16 17v2"/><circle cx="8.5" cy="17.5" r="1.8"/><circle cx="15.5" cy="17.5" r="1.8"/></svg>',
    roomService:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M4 10h16v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9z" stroke-linejoin="round"/><path d="M8 10V8a4 4 0 018 0v2"/><path d="M9 14h6M9 18h4" stroke-linecap="round"/></svg>',
    leaf:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>',
    calendar:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  };

  /** i18n.js ile aynı anahtar; burada da tanımlı olsun (bağımsız yükleme). */
  const LANG_STORAGE_KEY = "viona_lang";

  let lang = null;
  let selectedLangCode = null;

  /** Onaylı dil yokken: seçilen chip önizlemesi; hiçbiri yoksa nötr İngilizce (tek dil zorlaması yok). */
  function activeUiLang() {
    return lang || selectedLangCode || "en";
  }

  function pickLocaleTable(code) {
    if (code && I18N[code]) return I18N[code];
    return I18N.en || I18N.tr;
  }

  /** `applyI18n` / render sırasında onlarca `t()` çağrısında tablo seçimini tekrarlamayı önler. */
  let _activeLocaleCode = null;
  let _activeLocaleTable = null;
  function localeTableForActiveUiLang() {
    const code = activeUiLang();
    if (code !== _activeLocaleCode) {
      _activeLocaleCode = code;
      _activeLocaleTable = pickLocaleTable(code);
    }
    return _activeLocaleTable;
  }
  let carouselTimer = null;
  let carouselIndex = 0;
  /** Tek MediaQuery — carousel başlatma ve tercih değişimi aynı örneği kullanır (gereksiz tekrar yok). */
  const mqPrefersReduceMotion =
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;

  let moduleId = null;
  let requestSub = null;
  let surveySub = null;

  /** Sunucu `GET /public/guest-gate/status` — `required`: HotelAdvisor / Elektra Hotspot env dolu ve `VIONA_UI_GATE_ENABLED` kapalı değil. */
  let gateIdentityRequired = false;
  /** Status isteği bitene kadar «Devam» tıklanmasın. */
  let gateStatusResolved = false;
  /** Sunucu strict / site bayrağı: status düşünce ana sayfaya geçiş bloklu. */
  let gateStatusFetchFailed = false;

  const el = (id) => document.getElementById(id);

  const SURVEY_TITLE_FALLBACK = {
    tr: "Deneyiminizi Değerlendirin",
    en: "Rate Your Experience",
    de: "Bewerten Sie Ihr Erlebnis",
    pl: "Oceń swoje doświadczenie",
  };
  (function extendSurveyTitleFallback() {
    const VL = window.VIONA_LANG;
    if (!VL || !VL.EXTRA) return;
    const ref = SURVEY_TITLE_FALLBACK.en;
    VL.EXTRA.forEach((code) => {
      if (!SURVEY_TITLE_FALLBACK[code]) SURVEY_TITLE_FALLBACK[code] = ref;
    });
  })();

  function t(key) {
    const L = localeTableForActiveUiLang();
    if (L[key] !== undefined) return L[key];
    const E = I18N.en;
    if (E && E[key] !== undefined) return E[key];
    return I18N.tr[key] || key;
  }

  function surveyTitleText() {
    const translated = t("modSurvey");
    if (translated !== "modSurvey") return translated;
    const code = activeUiLang();
    return SURVEY_TITLE_FALLBACK[code] || SURVEY_TITLE_FALLBACK.en;
  }

  function applyI18n(root) {
    const scope = root || document;
    scope.querySelectorAll("[data-i18n]").forEach((node) => {
      const k = node.getAttribute("data-i18n");
      if (k) node.textContent = t(k);
    });
    scope.querySelectorAll("[data-i18n-aria]").forEach((node) => {
      const k = node.getAttribute("data-i18n-aria");
      if (k) node.setAttribute("aria-label", t(k));
    });
    scope.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
      const k = node.getAttribute("data-i18n-placeholder");
      if (k) node.setAttribute("placeholder", t(k));
    });
    document.title = t("metaTitle");
    if (!lang) {
      const c = activeUiLang();
      document.documentElement.lang =
        window.VIONA_LANG && typeof window.VIONA_LANG.htmlLangFor === "function"
          ? window.VIONA_LANG.htmlLangFor(c)
          : { tr: "tr", en: "en", de: "de", pl: "pl", ru: "ru", da: "da", cs: "cs", ro: "ro", nl: "nl", sk: "sk" }[c] ||
              "en";
    }
  }

  /**
   * Ana sayfa uzun olduğunda window.scrollY korunur; modül tam ekran olsa da görünüm ortada kalır.
   * html { scroll-behavior: smooth } programatik kaydırmayı yumuşatacağı için geçici olarak auto kullanılır.
   */
  function scrollMainViewportToTop() {
    const root = document.documentElement;
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    root.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
    root.style.scrollBehavior = prev;
  }

  function showView(name) {
    const langView = el("view-lang");
    const gateView = el("view-gate");
    const homeView = el("view-home");
    const modView = el("view-module");
    [langView, gateView, homeView, modView].forEach((v) => {
      if (v) v.classList.add("hidden");
    });
    if (name === "lang") {
      if (typeof window.resetVionaPromoDismissForLangScreen === "function") {
        window.resetVionaPromoDismissForLangScreen();
      }
      if (typeof window._vionaClearActivitiesCarousel === "function") {
        window._vionaClearActivitiesCarousel();
      }
      if (typeof window._vionaClearDiscountCarousel === "function") {
        window._vionaClearDiscountCarousel();
      }
      langView.classList.remove("hidden");
      langView.setAttribute("aria-hidden", "false");
      if (gateView) gateView.setAttribute("aria-hidden", "true");
      homeView.setAttribute("aria-hidden", "true");
      modView.setAttribute("aria-hidden", "true");
      stopCarousel();
      scrollMainViewportToTop();
    } else if (name === "gate") {
      if (typeof window._vionaClearActivitiesCarousel === "function") {
        window._vionaClearActivitiesCarousel();
      }
      if (typeof window._vionaClearDiscountCarousel === "function") {
        window._vionaClearDiscountCarousel();
      }
      if (gateView) {
        gateView.classList.remove("hidden");
        gateView.setAttribute("aria-hidden", "false");
      }
      langView.setAttribute("aria-hidden", "true");
      homeView.setAttribute("aria-hidden", "true");
      modView.setAttribute("aria-hidden", "true");
      stopCarousel();
      scrollMainViewportToTop();
      resetGateForm();
    } else if (name === "home") {
      if (typeof window._vionaClearActivitiesCarousel === "function") {
        window._vionaClearActivitiesCarousel();
      }
      if (typeof window._vionaClearDiscountCarousel === "function") {
        window._vionaClearDiscountCarousel();
      }
      homeView.classList.remove("hidden");
      langView.setAttribute("aria-hidden", "true");
      if (gateView) gateView.setAttribute("aria-hidden", "true");
      homeView.setAttribute("aria-hidden", "false");
      modView.setAttribute("aria-hidden", "true");
      startCarousel();
      scrollMainViewportToTop();
    } else if (name === "module") {
      modView.classList.remove("hidden");
      langView.setAttribute("aria-hidden", "true");
      if (gateView) gateView.setAttribute("aria-hidden", "true");
      homeView.setAttribute("aria-hidden", "true");
      modView.setAttribute("aria-hidden", "false");
      stopCarousel();
      scrollMainViewportToTop();
    }
  }

  function initCarousel() {
    const track = el("carousel-track");
    track.innerHTML = "";
    const slideCount = CAROUSEL_IMAGES.length;
    CAROUSEL_IMAGES.forEach((src, i) => {
      const slide = document.createElement("div");
      slide.className = "carousel-slide" + (i === 0 ? " carousel-slide--active" : "");
      slide.setAttribute("aria-hidden", i === 0 ? "false" : "true");
      const img = document.createElement("img");
      img.src = src;
      img.alt = slideCount ? `${t("homeCarouselAria")} (${i + 1}/${slideCount})` : "";
      img.decoding = "async";
      img.loading = i === 0 ? "eager" : "lazy";
      if (i === 0 && "fetchPriority" in img) img.fetchPriority = "high";
      slide.appendChild(img);
      track.appendChild(slide);
    });
    carouselIndex = 0;
  }

  function stopCarousel() {
    if (carouselTimer) {
      clearInterval(carouselTimer);
      carouselTimer = null;
    }
  }

  /** Modül içeriğindeki ilk başlığı bölge etiketi yap; yoksa kısa aria-label. */
  function wireModuleRegionA11y() {
    const modView = el("view-module");
    const inner = el("module-inner");
    if (!modView || !inner || !moduleId) return;
    const h = inner.querySelector("h1, h2");
    if (h) {
      if (!h.id) h.id = "viona-module-heading";
      modView.setAttribute("aria-labelledby", h.id);
      modView.removeAttribute("aria-label");
      return;
    }
    modView.removeAttribute("aria-labelledby");
    const def = MODULE_DEFS.find((d) => d.id === moduleId);
    let lab = "";
    if (def) {
      if (def.isSurvey) lab = surveyTitleText();
      else if (def.isRequests) {
        if (requestSub) {
          const sub = REQUEST_SUBS.find((s) => s.id === requestSub);
          lab = sub ? t(sub.i18nKey) : t(def.i18nKey);
        } else {
          lab = t(def.i18nKey);
        }
      } else {
        lab = t(def.i18nKey);
      }
    }
    modView.setAttribute("aria-label", lab || t("homeTitle"));
  }

  /** Klavye / ekran okuyucu: modül açılınca içerik başlığına odak (görünür kaydırmayı tetikleme). */
  function focusModulePrimaryTarget() {
    const inner = el("module-inner");
    if (!inner) return;
    const h = inner.querySelector("h1, h2");
    if (h && typeof h.focus === "function") {
      try {
        if (!h.hasAttribute("tabindex")) h.setAttribute("tabindex", "-1");
        if (typeof FocusOptions !== "undefined") {
          h.focus({ preventScroll: true });
        } else {
          h.focus();
        }
      } catch (_e) {}
      return;
    }
    const back = el("btn-back");
    if (back && typeof back.focus === "function") {
      try {
        if (typeof FocusOptions !== "undefined") {
          back.focus({ preventScroll: true });
        } else {
          back.focus();
        }
      } catch (_e2) {}
    }
  }

  function startCarousel() {
    stopCarousel();
    const slides = document.querySelectorAll(".carousel-slide");
    if (slides.length < 2) return;
    if (mqPrefersReduceMotion && mqPrefersReduceMotion.matches) {
      return;
    }
    carouselTimer = setInterval(() => {
      slides[carouselIndex].classList.remove("carousel-slide--active");
      slides[carouselIndex].setAttribute("aria-hidden", "true");
      carouselIndex = (carouselIndex + 1) % slides.length;
      slides[carouselIndex].classList.add("carousel-slide--active");
      slides[carouselIndex].setAttribute("aria-hidden", "false");
    }, 3600);
  }

  function renderModuleGrid() {
    const grid = el("module-grid");
    grid.innerHTML = "";
    grid.setAttribute("role", "navigation");
    grid.setAttribute("aria-label", t("homeModuleGridAria"));
    MODULE_DEFS.forEach((def) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "module-card" + (def.isSurvey ? " module-card--survey" : "");
      btn.dataset.moduleId = def.id;
      const iconWrap = document.createElement("div");
      iconWrap.className = "module-card__icon";
      iconWrap.innerHTML = ICONS[def.icon] || ICONS.building;
      const text = document.createElement("div");
      text.className = "module-card__text";
      text.textContent = def.isSurvey ? surveyTitleText() : def.title || t(def.i18nKey);
      btn.appendChild(iconWrap);
      btn.appendChild(text);
      btn.addEventListener("click", () => openModule(def.id));
      grid.appendChild(btn);
    });
  }

  const RATE_LINK_ICONS = {
    google:
      '<svg class="rate-link__svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>',
    trip: '<svg class="rate-link__svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 14c1.2 1.5 3 2.5 4 2.5s2.8-1 4-2.5M9 9h.01M15 9h.01"/></svg>',
    holiday:
      '<svg class="rate-link__svg" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="1.7" aria-hidden="true"><path d="M12 3l2 5h5l-4 3 2 6-5-3-5 3 2-6-4-3h5l2-5z"/></svg>',
    hotels:
      '<svg class="rate-link__svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 20V10l8-4 8 4v10"/><path d="M9 20v-6h6v6"/><path d="M9 10h.01M15 10h.01"/></svg>',
    loveholidays:
      '<svg class="rate-link__svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="#e91e8c" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
    instagram:
      '<svg class="rate-link__svg rate-link__svg--ig" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="rateIg" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#f09433"/><stop offset="50%" stop-color="#e6683c"/><stop offset="100%" stop-color="#bc1888"/></linearGradient></defs><rect x="2" y="2" width="20" height="20" rx="5" fill="url(#rateIg)"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="#fff" stroke-width="1.4"/><circle cx="17.4" cy="6.6" r="1.2" fill="#fff"/></svg>',
    booking:
      '<svg class="rate-link__svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 3v4M16 3v4M4 11h16"/></svg>',
    bookingcom:
      '<svg class="rate-link__svg" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2.5" fill="#003580"/><path fill="#fff" d="M6.5 9.5h11v1.6H6.5V9.5zm0 3.2h8v1.5H6.5v-1.5zm0 3.1h11v1.3H6.5v-1.3z"/></svg>',
    expedia:
      '<svg class="rate-link__svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#ffc72c"/><path fill="none" stroke="#1b1b1b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M7.5 12.5l2.8 2.5 6.2-7"/></svg>',
    tripcom:
      '<svg class="rate-link__svg" viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="4" width="19" height="16" rx="3.5" fill="#2b6cef"/><path fill="#fff" d="M7 8.5h10v1.9H7V8.5zm0 3.4h6.5v1.8H7v-1.8z"/></svg>',
    corendon:
      '<svg class="rate-link__svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#ea580c"/><path fill="#fff" d="M8 7h8a1.5 1.5 0 011.5 1.5V11h-11V8.5A1.5 1.5 0 018 7zm-1.5 5h13v6.5A1.5 1.5 0 0118 20H6a1.5 1.5 0 01-1.5-1.5V12z" opacity="0.96"/></svg>',
    zoover:
      '<svg class="rate-link__svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#16a34a"/><path fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M8 10h8M8 14h5"/><circle cx="9" cy="10" r="1.2" fill="#fff"/><circle cx="15" cy="14" r="1.2" fill="#fff"/></svg>',
    otelpuan:
      '<svg class="rate-link__svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#0284c7"/><path fill="#fff" d="M12 6.8l1.35 3.1 3.35.35-2.5 2.35.65 3.55L12 14.6l-2.85 1.55.65-3.55-2.5-2.35 3.35-.35L12 6.8z"/></svg>',
    check24:
      '<svg class="rate-link__svg" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5" fill="#15803d"/><path stroke="#fff" stroke-width="1.65" stroke-linecap="round" fill="none" d="M7 12.5h10M10 9v7M14 9v7"/></svg>',
  };

  function badgeKeyFor(badge) {
    if (badge === "social") return "badgeSocial";
    if (badge === "booking") return "badgeBooking";
    return "badgeReview";
  }

  function renderRateLinks() {
    const wrap = el("rate-links");
    wrap.innerHTML = "";
    RATE_MODAL_BLOCKS.forEach((block, bi) => {
      const section = document.createElement("section");
      section.className = "rate-section";
      if (block.sectionKey === "rateSectionReviews") {
        section.classList.add("rate-section--reviews");
      }
      section.style.animationDelay = `${bi * 0.06}s`;

      const h3 = document.createElement("h3");
      h3.className = "rate-section__title";
      h3.textContent = t(block.sectionKey);
      section.appendChild(h3);

      const isReviewBlock = block.sectionKey === "rateSectionReviews";
      const itemsParent = isReviewBlock ? document.createElement("div") : null;
      if (itemsParent) {
        itemsParent.className = "rate-link-grid";
        section.appendChild(itemsParent);
      }

      block.items.forEach((item, ii) => {
        const a = document.createElement("a");
        let linkClass = "rate-link" + (item.badge ? " rate-link--" + item.badge : "");
        if (item.featured) linkClass += " rate-link--featured";
        a.className = linkClass;
        a.href = item.href;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.style.animationDelay = `${bi * 0.06 + ii * 0.04}s`;

        const ico = document.createElement("div");
        ico.className = "rate-link__icon";
        ico.innerHTML = RATE_LINK_ICONS[item.icon] || RATE_LINK_ICONS.trip;

        const body = document.createElement("div");
        body.className = "rate-link__body";

        const row = document.createElement("div");
        row.className = "rate-link__row";

        const title = document.createElement("strong");
        title.className = "rate-link__title";
        title.textContent = t(item.key);

        const badge = document.createElement("span");
        badge.className = "rate-link__badge";
        badge.textContent = t(badgeKeyFor(item.badge));

        row.appendChild(title);
        row.appendChild(badge);

        const hint = document.createElement("span");
        hint.className = "rate-link__hint";
        hint.textContent = t(item.hintKey);

        body.appendChild(row);
        body.appendChild(hint);

        const arr = document.createElement("span");
        arr.className = "rate-link__arrow";
        arr.setAttribute("aria-hidden", "true");
        arr.textContent = "↗";

        a.appendChild(ico);
        a.appendChild(body);
        a.appendChild(arr);
        (itemsParent || section).appendChild(a);
      });

      wrap.appendChild(section);
    });
  }

  function openModule(id) {
    moduleId = id;
    requestSub = null;
    surveySub = null;
    showView("module");
    renderModuleContent();
  }

  function renderModuleContent() {
    const inner = el("module-inner");
    if (inner._whereCleanup && typeof inner._whereCleanup === "function") {
      inner._whereCleanup();
      delete inner._whereCleanup;
    }
    if (inner._nearExploreCleanup && typeof inner._nearExploreCleanup === "function") {
      inner._nearExploreCleanup();
      delete inner._nearExploreCleanup;
    }
    delete inner._nearExplorePopState;
    inner.innerHTML = "";
    if (typeof window._vionaClearActivitiesCarousel === "function") {
      window._vionaClearActivitiesCarousel();
    }
    if (typeof window._vionaClearDiscountCarousel === "function") {
      window._vionaClearDiscountCarousel();
    }
    const def = MODULE_DEFS.find((d) => d.id === moduleId);
    try {
      if (!def) return;

      if (def.isRequests) {
        if (typeof window.renderGuestRequestsModule === "function") {
          window.renderGuestRequestsModule(inner, t, requestSub, {
            setSub: (id) => {
              requestSub = id;
              renderModuleContent();
            },
            moduleTitleKey: def.i18nKey,
            subDefs: REQUEST_SUBS,
            onRequestSuccessGoHome: () => {
              inner.innerHTML = "";
              requestSub = null;
              moduleId = null;
              showView("home");
            },
          });
        } else {
          const p = document.createElement("p");
          p.className = "placeholder";
          p.textContent = t("reqErrApi");
          inner.appendChild(p);
        }
        return;
      }

      if (def.isSurvey) {
        if (typeof window.renderSurveyModule === "function") {
          window.renderSurveyModule(inner, surveySub, {
            setSub: (id) => {
              surveySub = id;
              renderModuleContent();
            },
            moduleTitle: surveyTitleText(),
            onSurveySuccessGoHome: () => {
              inner.innerHTML = "";
              moduleId = null;
              surveySub = null;
              showView("home");
            },
          });
        } else {
          const p = document.createElement("p");
          p.className = "placeholder";
          p.textContent = t("placeholderBody");
          inner.appendChild(p);
        }
        return;
      }

      const skipDefaultH2 = moduleId === "transfer" || moduleId === "room_service" || moduleId === "where";
      if (!skipDefaultH2) {
        const h2 = document.createElement("h2");
        h2.textContent = t(def.i18nKey);
        inner.appendChild(h2);
      }

      if (moduleId === "where" && typeof window.renderWhereModule === "function") {
        window.renderWhereModule(inner, t);
        return;
      }

      const MODULE_RENDERERS = {
        transfer: "renderTransferModule",
        room_service: "renderRoomServiceModule",
        general: "renderGeneralModule",
        restaurant: "renderRestaurantModule",
        alacarte: "renderAlacarteModule",
        beach: "renderBeachModule",
        spa: "renderSpaModule",
        discount: "renderDiscountModule",
        animation: "renderActivitiesModule",
        sustainability: "renderSustainabilityModule",
        coming_soon: "renderNearbyExploreModule",
        miniclub: "renderMiniclubModule",
        meeting: "renderMeetingModule",
        alanya: "renderAlanyaModule",
      };
      const rName = MODULE_RENDERERS[moduleId];
      if (rName && typeof window[rName] === "function") {
        window[rName](inner, t, activeUiLang());
        return;
      }

      const p = document.createElement("p");
      p.className = "placeholder";
      p.textContent = t("placeholderBody");
      inner.appendChild(p);
    } finally {
      if (moduleId) {
        wireModuleRegionA11y();
        scrollMainViewportToTop();
        requestAnimationFrame(() => {
          scrollMainViewportToTop();
          focusModulePrimaryTarget();
        });
      }
    }
  }

  function onBack() {
    if (moduleId === "requests" && requestSub) {
      requestSub = null;
      renderModuleContent();
      return;
    }
    if (moduleId === "survey" && surveySub) {
      surveySub = null;
      renderModuleContent();
      return;
    }
    const inner = el("module-inner");
    if (moduleId === "coming_soon" && inner._nearExplorePopState && typeof inner._nearExplorePopState === "function") {
      if (inner._nearExplorePopState()) {
        return;
      }
    }
    if (inner._whereCleanup && typeof inner._whereCleanup === "function") {
      inner._whereCleanup();
      delete inner._whereCleanup;
    }
    if (inner._nearExploreCleanup && typeof inner._nearExploreCleanup === "function") {
      inner._nearExploreCleanup();
      delete inner._nearExploreCleanup;
    }
    delete inner._nearExplorePopState;
    moduleId = null;
    requestSub = null;
    surveySub = null;
    showView("home");
  }

  // Eski API: sunucu hâlâ open_reservation_form gönderebilir — artık restoran modülüne yönlendirilir.
  window.vionaChatOpenReservations = function () {
    if (typeof window.vionaChatOpenRestaurantsBars === "function") window.vionaChatOpenRestaurantsBars();
  };

  // Chatbot: geç çıkış → İstekler hub / Misafir bildirimleri; geç çıkış formu doğrudan açılır.
  window.vionaChatOpenGuestNotifications = function () {
    try {
      window.__vionaOpenLateCheckoutOnGuestNotif = true;
    } catch (e) {}
    moduleId = "requests";
    requestSub = "guest_notification";
    surveySub = null;
    showView("module");
    renderModuleContent();
    closeModals();
  };

  window.vionaChatOpenAlanya = function () {
    moduleId = "alanya";
    requestSub = null;
    surveySub = null;
    showView("module");
    renderModuleContent();
    closeModals();
  };

  window.vionaChatOpenSpa = function () {
    moduleId = "spa";
    requestSub = null;
    surveySub = null;
    showView("module");
    renderModuleContent();
    closeModals();
  };

  window.vionaChatOpenRestaurantsBars = function () {
    moduleId = "restaurant";
    requestSub = null;
    surveySub = null;
    showView("module");
    renderModuleContent();
    closeModals();
  };

  window.vionaChatOpenTransfer = function () {
    moduleId = "transfer";
    requestSub = null;
    surveySub = null;
    showView("module");
    renderModuleContent();
    closeModals();
  };

  window.vionaChatOpenRoomService = function () {
    moduleId = "room_service";
    requestSub = null;
    surveySub = null;
    showView("module");
    renderModuleContent();
    closeModals();
  };

  window.vionaChatOpenWhere = function () {
    moduleId = "where";
    requestSub = null;
    surveySub = null;
    showView("module");
    renderModuleContent();
    closeModals();
  };

  // Sohbet: şikayet yönlendirmesi → İstekler / Şikayet alt sekmesi.
  window.vionaChatOpenComplaintForm = function () {
    moduleId = "requests";
    requestSub = "complaint";
    surveySub = null;
    showView("module");
    renderModuleContent();
    closeModals();
  };

  /** Sohbet formu kaydı tamamlandıktan sonra: modal kapanır, modül sıfırlanır, ana sayfa (istek/anket ile aynı mantık). */
  window.vionaExitChatToHome = function () {
    closeModals();
    const inner = el("module-inner");
    if (inner) {
      if (inner._whereCleanup && typeof inner._whereCleanup === "function") {
        inner._whereCleanup();
        delete inner._whereCleanup;
      }
      if (inner._nearExploreCleanup && typeof inner._nearExploreCleanup === "function") {
        inner._nearExploreCleanup();
        delete inner._nearExploreCleanup;
      }
      delete inner._nearExplorePopState;
      inner.innerHTML = "";
    }
    moduleId = null;
    requestSub = null;
    surveySub = null;
    showView("home");
  };

  function setLang(code) {
    let prevLang = null;
    try {
      prevLang = localStorage.getItem(LANG_STORAGE_KEY);
    } catch (_e) {
      prevLang = null;
    }
    lang = code;
    localStorage.setItem(LANG_STORAGE_KEY, code);
    if (prevLang != null && prevLang !== code && typeof window.vionaChatAfterSiteLangChange === "function") {
      window.vionaChatAfterSiteLangChange();
    }
    applyI18n(document);
    initCarousel();
    if (typeof window.vionaChatRefreshI18n === "function") window.vionaChatRefreshI18n();
    if (typeof window.vionaVoiceRefreshI18n === "function") window.vionaVoiceRefreshI18n();
    renderModuleGrid();
    renderRateLinks();
    if (moduleId) {
      renderModuleContent();
    }
    const htmlLang =
      window.VIONA_LANG && typeof window.VIONA_LANG.htmlLangFor === "function"
        ? window.VIONA_LANG.htmlLangFor(code)
        : { tr: "tr", en: "en", de: "de", pl: "pl", ru: "ru", da: "da", cs: "cs", ro: "ro", nl: "nl", sk: "sk" }[code] ||
            "en";
    document.documentElement.lang = htmlLang;
  }

  function openModal(id) {
    const m = el(id);
    m.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeModals() {
    document.querySelectorAll(".modal-root").forEach((m) => m.classList.add("hidden"));
    document.body.style.overflow = "";
    // Chatbot modal kapandığında sohbet ve form bağlamını da sıfırla.
    if (typeof window.vionaChatHardReset === "function") {
      window.vionaChatHardReset();
    }
  }

  /** Yalnızca dil onayı veya oturumda dil atlanınca (ilk ana sayfa girişi); modülden dönüşte çağrılmaz. */
  function scheduleDiscountPopup() {
    if (typeof window.showDiscountPopup !== "function") return;
    requestAnimationFrame(() => {
      void window.showDiscountPopup();
    });
  }

  function clearGuestIdentitySession() {
    try {
      if (typeof window.vionaGuestProfile === "object" && window.vionaGuestProfile && typeof window.vionaGuestProfile.clear === "function") {
        window.vionaGuestProfile.clear();
      } else {
        sessionStorage.removeItem("viona_guest_identity_verified");
        sessionStorage.removeItem("viona_guest_identity_name");
        sessionStorage.removeItem("viona_guest_identity_room");
        sessionStorage.removeItem("viona_guest_pms_verified");
        sessionStorage.removeItem("viona_guest_pms_meta_json");
      }
    } catch (_e) {
      /* private mode */
    }
  }

  /** Aynı sekmede kapı tamamlandıktan sonra yenilemede ana sayfaya dönmek için; sekme kapanınca silinir. */
  const GATE_SESSION_OK = "viona_gate_session_ok";
  const GATE_LAST_ACTIVITY = "viona_gate_last_activity";
  /** Boşta kalma nedeniyle dil ekranına düşünce tek seferlik bilgi (sessionStorage). */
  const GATE_IDLE_NOTICE_FLAG = "viona_gate_idle_notice";

  let gateIdleIntervalId = null;
  let gateActivityThrottleTs = 0;

  function getGateIdleMs() {
    const w = window.__VIONA_GATE_IDLE_MS__;
    if (typeof w === "number" && Number.isFinite(w) && w >= 10000 && w <= 86400000) return w;
    return 120000; /* 2 dk — viona-site-flags.js ile aynı; bayrak yoksa yedek */
  }

  function readGateSessionOk() {
    try {
      return sessionStorage.getItem(GATE_SESSION_OK) === "1";
    } catch (_e) {
      return false;
    }
  }

  function isGateSessionFresh() {
    if (!readGateSessionOk()) return false;
    try {
      const raw = sessionStorage.getItem(GATE_LAST_ACTIVITY);
      const last = raw ? parseInt(raw, 10) : NaN;
      if (!Number.isFinite(last)) return false;
      return Date.now() - last <= getGateIdleMs();
    } catch (_e) {
      return false;
    }
  }

  function clearGateSessionKeysOnly() {
    try {
      sessionStorage.removeItem(GATE_SESSION_OK);
      sessionStorage.removeItem(GATE_LAST_ACTIVITY);
    } catch (_e) {
      /* private mode */
    }
  }

  function stopGateIdleWatch() {
    if (gateIdleIntervalId != null) {
      clearInterval(gateIdleIntervalId);
      gateIdleIntervalId = null;
    }
    document.removeEventListener("keydown", onGateUserActivityEvent, true);
    document.removeEventListener("pointerdown", onGateUserActivityEvent, true);
    document.removeEventListener("touchstart", onGateUserActivityEvent, true);
    window.removeEventListener("scroll", onGateUserActivityEvent, { passive: true });
    document.removeEventListener("visibilitychange", onGateVisibilityForIdle);
  }

  function touchGateActivity() {
    try {
      if (sessionStorage.getItem(GATE_SESSION_OK) !== "1") return;
      sessionStorage.setItem(GATE_LAST_ACTIVITY, String(Date.now()));
    } catch (_e) {
      /* private mode */
    }
  }

  function onGateUserActivityEvent() {
    const now = Date.now();
    if (now - gateActivityThrottleTs < 8000) return;
    gateActivityThrottleTs = now;
    touchGateActivity();
  }

  function checkGateIdleExpiry() {
    if (!readGateSessionOk()) return;
    try {
      const raw = sessionStorage.getItem(GATE_LAST_ACTIVITY);
      const last = raw ? parseInt(raw, 10) : NaN;
      if (!Number.isFinite(last) || Date.now() - last <= getGateIdleMs()) return;
    } catch (_e) {
      return;
    }
    forceGateReloginDueToIdle();
  }

  function onGateVisibilityForIdle() {
    if (document.visibilityState === "visible") checkGateIdleExpiry();
  }

  function startGateIdleWatch() {
    stopGateIdleWatch();
    gateActivityThrottleTs = Date.now();
    gateIdleIntervalId = setInterval(checkGateIdleExpiry, 30000);
    document.addEventListener("keydown", onGateUserActivityEvent, true);
    document.addEventListener("pointerdown", onGateUserActivityEvent, true);
    document.addEventListener("touchstart", onGateUserActivityEvent, true);
    window.addEventListener("scroll", onGateUserActivityEvent, { passive: true });
    document.addEventListener("visibilitychange", onGateVisibilityForIdle);
  }

  function clearGateBrowserSession() {
    stopGateIdleWatch();
    clearGateSessionKeysOnly();
  }

  function cleanupModuleInnerForHardReset() {
    const inner = el("module-inner");
    if (!inner) return;
    if (inner._whereCleanup && typeof inner._whereCleanup === "function") {
      inner._whereCleanup();
      delete inner._whereCleanup;
    }
    if (inner._nearExploreCleanup && typeof inner._nearExploreCleanup === "function") {
      inner._nearExploreCleanup();
      delete inner._nearExploreCleanup;
    }
    delete inner._nearExplorePopState;
    inner.innerHTML = "";
  }

  /** Boşta kalma süresi doldu: oturum düşer, dil ekranına dönülür. */
  function forceGateReloginDueToIdle() {
    clearGateBrowserSession();
    clearGuestIdentitySession();
    cleanupModuleInnerForHardReset();
    moduleId = null;
    requestSub = null;
    surveySub = null;
    lang = null;
    gateStatusFetchFailed = false;
    closeModals();
    try {
      sessionStorage.setItem(GATE_IDLE_NOTICE_FLAG, "1");
    } catch (_e) {
      /* private mode */
    }
    showView("lang");
    applyI18n(document);
    renderModuleGrid();
    renderRateLinks();
    maybeShowLangIdleNotice();
    scrollMainViewportToTop();
  }

  function hideLangIdleNotice() {
    const node = el("lang-idle-notice");
    if (!node) return;
    node.textContent = "";
    node.classList.add("hidden");
  }

  /** Dil ekranında — yalnızca idle ile düşüşten sonra bir kez. */
  function maybeShowLangIdleNotice() {
    try {
      if (sessionStorage.getItem(GATE_IDLE_NOTICE_FLAG) !== "1") return;
      sessionStorage.removeItem(GATE_IDLE_NOTICE_FLAG);
    } catch (_e) {
      return;
    }
    const node = el("lang-idle-notice");
    if (!node) return;
    node.textContent = t("langIdleNotice");
    node.classList.remove("hidden");
  }

  function markGateSessionCompleted() {
    try {
      sessionStorage.setItem(GATE_SESSION_OK, "1");
      sessionStorage.setItem(GATE_LAST_ACTIVITY, String(Date.now()));
    } catch (_e) {
      /* private mode */
    }
    startGateIdleWatch();
  }

  function clearGateErrorBar() {
    const err = el("gate-error");
    if (err) {
      err.textContent = "";
      err.classList.add("hidden");
    }
  }

  function gateBirthDayEl() {
    return el("gate-birth-day");
  }
  function gateBirthMonthEl() {
    return el("gate-birth-month");
  }
  function gateBirthYearEl() {
    return el("gate-birth-year");
  }

  function gateDaysInMonth(year, month1to12) {
    if (!Number.isFinite(year) || !Number.isFinite(month1to12) || month1to12 < 1 || month1to12 > 12) return 31;
    return new Date(year, month1to12, 0).getDate();
  }

  function gateBirthEffectiveMaxDay(year, month1to12) {
    const dim = gateDaysInMonth(year, month1to12);
    const now = new Date();
    const cy = now.getFullYear();
    const cm = now.getMonth() + 1;
    const cd = now.getDate();
    if (year === cy && month1to12 === cm) return Math.min(dim, cd);
    return dim;
  }

  function gateFillSelectWithEmpty(selectEl, values, labels, keepValue) {
    if (!selectEl) return;
    const prev = keepValue != null ? String(keepValue) : String(selectEl.value || "");
    const frag = document.createDocumentFragment();
    const emp = document.createElement("option");
    emp.value = "";
    emp.textContent = t("gateBirthSelectPlaceholder");
    frag.appendChild(emp);
    for (let i = 0; i < values.length; i++) {
      const opt = document.createElement("option");
      opt.value = String(values[i]);
      opt.textContent = labels != null ? String(labels[i]) : String(values[i]);
      frag.appendChild(opt);
    }
    selectEl.textContent = "";
    selectEl.appendChild(frag);
    if (prev && [...selectEl.options].some((o) => o.value === prev)) selectEl.value = prev;
  }

  function gateHydrateBirthYearOptions() {
    const ySel = gateBirthYearEl();
    if (!ySel) return;
    const prev = ySel.value;
    const now = new Date();
    const maxY = now.getFullYear();
    const minY = maxY - 120;
    const vals = [];
    const labs = [];
    for (let y = maxY; y >= minY; y--) {
      vals.push(String(y));
      labs.push(String(y));
    }
    gateFillSelectWithEmpty(ySel, vals, labs, prev);
  }

  function gateHydrateBirthMonthOptions() {
    const mSel = gateBirthMonthEl();
    if (!mSel) return;
    const prev = mSel.value;
    const vals = [];
    const labs = [];
    for (let m = 1; m <= 12; m++) {
      const pad = String(m).padStart(2, "0");
      vals.push(pad);
      labs.push(String(m));
    }
    gateFillSelectWithEmpty(mSel, vals, labs, prev);
  }

  function gateHydrateBirthDayOptions() {
    const ySel = gateBirthYearEl();
    const mSel = gateBirthMonthEl();
    const dSel = gateBirthDayEl();
    if (!ySel || !mSel || !dSel) return;
    const y = parseInt(String(ySel.value || ""), 10);
    const mo = parseInt(String(mSel.value || ""), 10);
    const prev = dSel.value;
    let max = 31;
    if (Number.isFinite(y) && mo >= 1 && mo <= 12) max = gateBirthEffectiveMaxDay(y, mo);
    else if (mo >= 1 && mo <= 12) max = gateDaysInMonth(2024, mo);
    const vals = [];
    const labs = [];
    for (let d = 1; d <= max; d++) {
      const pad = String(d).padStart(2, "0");
      vals.push(pad);
      labs.push(String(d));
    }
    gateFillSelectWithEmpty(dSel, vals, labs, prev);
  }

  function gateRefreshBirthSelectorsFromClock() {
    gateHydrateBirthYearOptions();
    gateHydrateBirthMonthOptions();
    gateHydrateBirthDayOptions();
  }

  function gateWireBirthSelectsOnce() {
    const ySel = gateBirthYearEl();
    const mSel = gateBirthMonthEl();
    const dSel = gateBirthDayEl();
    if (!ySel || !mSel || !dSel) return;
    if (ySel.dataset.gateBirthWired === "1") {
      gateRefreshBirthSelectorsFromClock();
      return;
    }
    ySel.dataset.gateBirthWired = "1";
    gateHydrateBirthYearOptions();
    gateHydrateBirthMonthOptions();
    gateHydrateBirthDayOptions();
    ySel.addEventListener("change", () => {
      gateHydrateBirthDayOptions();
      clearGateErrorBar();
    });
    mSel.addEventListener("change", () => {
      gateHydrateBirthDayOptions();
      clearGateErrorBar();
    });
    dSel.addEventListener("change", clearGateErrorBar);
  }

  function gateBirthIsoFromSelects() {
    const dSel = gateBirthDayEl();
    const mSel = gateBirthMonthEl();
    const ySel = gateBirthYearEl();
    if (!dSel || !mSel || !ySel) return "";
    const ds = String(dSel.value || "").trim();
    const ms = String(mSel.value || "").trim();
    const ys = String(ySel.value || "").trim();
    if (!ds || !ms || !ys) return "";
    const yi = parseInt(ys, 10);
    const mi = parseInt(ms, 10);
    const di = parseInt(ds, 10);
    if (!Number.isFinite(yi) || !Number.isFinite(mi) || !Number.isFinite(di)) return "";
    const dim = gateDaysInMonth(yi, mi);
    if (di < 1 || di > dim) return "";
    return `${ys}-${ms}-${ds}`;
  }

  function gateBirthIsoIsFutureLocalMidnight(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
    const p = iso.split("-");
    const dt = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dt.setHours(0, 0, 0, 0);
    return dt > today;
  }

  function resetGateForm() {
    const c1 = el("gate-check-privacy");
    const room = el("gate-room");
    const err = el("gate-error");
    if (c1) c1.checked = false;
    if (room) room.value = "";
    const ySel = gateBirthYearEl();
    const mSel = gateBirthMonthEl();
    const dSel = gateBirthDayEl();
    if (ySel) ySel.value = "";
    if (mSel) mSel.value = "";
    if (dSel) dSel.value = "";
    gateHydrateBirthDayOptions();
    if (err) {
      err.textContent = "";
      err.classList.add("hidden");
    }
    setGateRetryVisible(false);
  }

  function vionaApiBase() {
    return typeof window.vionaGetApiBase === "function" ? window.vionaGetApiBase() : "/api";
  }

  const GATE_SS_STRICT = "viona_gate_ss_strict";

  function readGateStrictSession() {
    try {
      return sessionStorage.getItem(GATE_SS_STRICT) === "1";
    } catch (_e) {
      return false;
    }
  }

  function writeGateStrictSession(strictFlag) {
    try {
      sessionStorage.setItem(GATE_SS_STRICT, strictFlag ? "1" : "0");
    } catch (_e) {
      /* private mode */
    }
  }

  function shouldBlockGateWhenStatusFails() {
    return window.__VIONA_GATE_STRICT__ === true || readGateStrictSession();
  }

  function setGateRetryVisible(on) {
    const retry = el("btn-gate-retry-status");
    if (!retry) return;
    retry.classList.toggle("hidden", !on);
  }

  async function refreshGuestGateUi() {
    const btn = el("btn-gate-continue");
    gateStatusResolved = false;
    gateStatusFetchFailed = false;
    setGateRetryVisible(false);
    if (btn) {
      btn.disabled = true;
      btn.setAttribute("aria-busy", "true");
    }
    try {
      const idStack = el("gate-identity-stack");
      const sub = el("gate-screen-subtitle");
      if (!sub) return;

      gateIdentityRequired = false;
      try {
        const res = await fetch(`${vionaApiBase()}/public/guest-gate/status`, { cache: "no-store" });
        if (!res.ok) throw new Error("gate_status_http");
        const data = await res.json();
        gateIdentityRequired = Boolean(data && data.required);
        writeGateStrictSession(Boolean(data && data.strict));
        if (
          data &&
          Array.isArray(data.extraValidRoomNumbers) &&
          typeof window.vionaMergeExtraHotelRoomNumbers === "function"
        ) {
          window.vionaMergeExtraHotelRoomNumbers(data.extraValidRoomNumbers);
        }
      } catch (_e) {
        gateIdentityRequired = false;
        if (shouldBlockGateWhenStatusFails()) {
          gateStatusFetchFailed = true;
        }
        if (typeof console !== "undefined" && console.warn) {
          console.warn("[viona] guest-gate status fetch failed");
        }
      }

      if (!gateStatusFetchFailed) {
        if (gateIdentityRequired) {
          if (idStack) idStack.classList.remove("hidden");
        } else {
          if (idStack) idStack.classList.add("hidden");
          const room = el("gate-room");
          if (room) room.value = "";
          const ySel = gateBirthYearEl();
          const mSel = gateBirthMonthEl();
          const dSel = gateBirthDayEl();
          if (ySel) ySel.value = "";
          if (mSel) mSel.value = "";
          if (dSel) dSel.value = "";
          gateHydrateBirthDayOptions();
        }
        sub.setAttribute("data-i18n", "gateScreenSubtitle");
      } else {
        if (idStack) idStack.classList.add("hidden");
        const room = el("gate-room");
        if (room) room.value = "";
        const ySel = gateBirthYearEl();
        const mSel = gateBirthMonthEl();
        const dSel = gateBirthDayEl();
        if (ySel) ySel.value = "";
        if (mSel) mSel.value = "";
        if (dSel) dSel.value = "";
        gateHydrateBirthDayOptions();
        sub.setAttribute("data-i18n", "gateScreenSubtitle");
      }

      const gateRoot = el("view-gate");
      if (gateRoot) applyI18n(gateRoot);
      gateWireBirthSelectsOnce();
      if (gateStatusFetchFailed) {
        showGateError("gateErrorGateStrict");
        setGateRetryVisible(true);
      }
    } finally {
      gateStatusResolved = true;
      const b = el("btn-gate-continue");
      if (b) {
        b.disabled = false;
        b.removeAttribute("aria-busy");
      }
    }
  }

  function showGateError(key) {
    const node = el("gate-error");
    if (!node) return;
    node.textContent = t(key);
    node.classList.remove("hidden");
  }

  function gateScrollFocused(target) {
    if (!target || typeof target.scrollIntoView !== "function") return;
    requestAnimationFrame(() => {
      try {
        target.scrollIntoView({ block: "nearest", behavior: "smooth", inline: "nearest" });
      } catch (_e) {
        try {
          target.scrollIntoView(true);
        } catch (_e2) {
          /* yoksay */
        }
      }
    });
  }

  function wireGateScreen() {
    const btn = el("btn-gate-continue");
    const back = el("btn-gate-back-lang");
    if (!btn) return;

    function clearGateError() {
      clearGateErrorBar();
    }

    ["gate-room", "gate-birth-day", "gate-birth-month", "gate-birth-year"].forEach((id) => {
      const node = el(id);
      if (!node) return;
      node.addEventListener("focus", () => {
        gateScrollFocused(node);
        clearGateError();
      });
    });

    gateWireBirthSelectsOnce();
    const chk = el("gate-check-privacy");
    const roomInput = el("gate-room");
    if (chk) chk.addEventListener("change", clearGateError);
    if (roomInput) roomInput.addEventListener("input", clearGateError);

    btn.addEventListener("click", () => {
      void (async () => {
        let pmsVerifiedOk = false;
        const errEl = el("gate-error");
        if (errEl) {
          errEl.textContent = "";
          errEl.classList.add("hidden");
        }
        const okPrivacy = el("gate-check-privacy") && el("gate-check-privacy").checked;

        if (!gateStatusResolved) {
          showGateError("gateErrorGateLoading");
          return;
        }

        if (gateStatusFetchFailed) {
          showGateError("gateErrorGateStrict");
          return;
        }

        if (!okPrivacy) {
          showGateError("gateErrorPrivacy");
          return;
        }

        if (gateIdentityRequired) {
          const roomNo = String((el("gate-room") && el("gate-room").value) || "").trim();
          if (!roomNo) {
            showGateError("gateErrorRoomRequired");
            return;
          }
          const birthDate = gateBirthIsoFromSelects();
          if (!birthDate) {
            showGateError("gateErrorBirthDateRequired");
            return;
          }
          if (gateBirthIsoIsFutureLocalMidnight(birthDate)) {
            showGateError("gateErrorBirthDateFuture");
            return;
          }

          btn.disabled = true;
          btn.setAttribute("aria-busy", "true");
          try {
            const res = await fetch(`${vionaApiBase()}/public/guest-gate/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ roomNo, birthDate }),
            });
            let data = {};
            try {
              data = await res.json();
            } catch (_j) {
              data = {};
            }
            if (!res.ok || !data.ok) {
              const errCode = data && typeof data.error === "string" ? String(data.error).trim() : "";
              let gateKey = "";
              if (errCode === "rate_limit_exceeded") gateKey = "gateErrorRateLimit";
              else if (errCode === "identity_required") gateKey = "gateErrorIdentityRequired";
              else if (errCode === "invalid_identity") gateKey = "gateErrorIdentityMismatch";
              else if (errCode === "hotel_advisor_not_configured") gateKey = "gateErrorPmsUnavailable";
              else if (errCode === "verification_failed") gateKey = "gateErrorGateVerify";
              if (gateKey) {
                showGateError(gateKey);
              } else if (res.status === 429) {
                showGateError("gateErrorRateLimit");
              } else if (res.status === 400) {
                showGateError("gateErrorIdentityRequired");
              } else if (res.status === 401) {
                showGateError("gateErrorIdentityMismatch");
              } else if (res.status === 503) {
                showGateError("gateErrorPmsUnavailable");
              } else {
                showGateError("gateErrorGateVerify");
              }
              btn.disabled = false;
              btn.removeAttribute("aria-busy");
              return;
            }
            pmsVerifiedOk = true;
            if (data && data.guest && typeof window.vionaGuestProfile === "object" && window.vionaGuestProfile) {
              if (typeof window.vionaGuestProfile.persist === "function") {
                window.vionaGuestProfile.persist(data.guest);
              }
            }
          } catch (_e) {
            showGateError("gateErrorGateVerify");
            btn.disabled = false;
            btn.removeAttribute("aria-busy");
            return;
          }
          btn.disabled = false;
          btn.removeAttribute("aria-busy");
        }

        if (!pmsVerifiedOk) {
          clearGuestIdentitySession();
        }
        markGateSessionCompleted();
        resetGateForm();
        showView("home");
        scheduleDiscountPopup();
      })();
    });

    if (back) {
      back.addEventListener("click", () => {
        gateStatusFetchFailed = false;
        clearGuestIdentitySession();
        clearGateBrowserSession();
        resetGateForm();
        showView("lang");
      });
    }

    const retryStatus = el("btn-gate-retry-status");
    if (retryStatus) {
      retryStatus.addEventListener("click", () => {
        const err = el("gate-error");
        if (err) {
          err.textContent = "";
          err.classList.add("hidden");
        }
        void refreshGuestGateUi().then(() => {
          const roomEl = el("gate-room");
          const chkGate = el("gate-check-privacy");
          if (!gateStatusFetchFailed && gateIdentityRequired && roomEl) roomEl.focus();
          else if (!gateStatusFetchFailed && chkGate) chkGate.focus();
        });
      });
    }
  }

  function wireLanguageScreen() {
    const chips = document.querySelectorAll(".lang-chip");
    const continueBtn = el("btn-lang-continue");

    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        hideLangIdleNotice();
        selectedLangCode = chip.dataset.lang;
        chips.forEach((c) => {
          c.classList.toggle("lang-chip--active", c === chip);
          c.setAttribute("aria-pressed", c === chip ? "true" : "false");
        });
        continueBtn.disabled = !selectedLangCode;
        applyI18n(document);
      });
    });

    continueBtn.addEventListener("click", () => {
      if (!selectedLangCode) return;
      setLang(selectedLangCode);
      showView("gate");
      applyI18n(document);
      void refreshGuestGateUi().then(() => {
        const roomEl = el("gate-room");
        const chkGate = el("gate-check-privacy");
        const retryBtn = el("btn-gate-retry-status");
        if (gateStatusFetchFailed && retryBtn) retryBtn.focus();
        else if (!gateStatusFetchFailed && gateIdentityRequired && roomEl) roomEl.focus();
        else if (!gateStatusFetchFailed && chkGate) chkGate.focus();
      });
    });
  }

  function wireHome() {
    el("btn-open-rate").addEventListener("click", () => openModal("modal-rate"));
    el("btn-open-viona").addEventListener("click", () => {
      openModal("modal-viona");
      if (typeof window.vionaChatOnOpen === "function") window.vionaChatOnOpen();
    });

    document.querySelectorAll("[data-close-modal]").forEach((n) => {
      n.addEventListener("click", closeModals);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModals();
    });

    el("btn-back").addEventListener("click", onBack);
  }

  function init() {
    wireLanguageScreen();
    wireGateScreen();
    wireHome();

    let storedLang = null;
    try {
      storedLang = localStorage.getItem(LANG_STORAGE_KEY);
    } catch (e) {
      storedLang = null;
    }

    function validLang(code) {
      return Boolean(code && I18N[code]);
    }

    lang = null;
    if (validLang(storedLang)) {
      selectedLangCode = storedLang;
    }
    applyI18n(document);

    try {
      if (sessionStorage.getItem(GATE_SESSION_OK) === "1" && !isGateSessionFresh()) {
        clearGateSessionKeysOnly();
      } else if (sessionStorage.getItem(GATE_SESSION_OK) !== "1" && sessionStorage.getItem(GATE_LAST_ACTIVITY)) {
        sessionStorage.removeItem(GATE_LAST_ACTIVITY);
      }
    } catch (_g) {
      /* private mode */
    }

    if (validLang(storedLang) && isGateSessionFresh()) {
      setLang(storedLang);
      showView("home");
      scheduleDiscountPopup();
      touchGateActivity();
      startGateIdleWatch();
    } else {
      initCarousel();
      showView("lang");
      if (validLang(storedLang)) {
        document.querySelectorAll(".lang-chip").forEach((c) => {
          const on = c.dataset.lang === storedLang;
          c.classList.toggle("lang-chip--active", on);
          c.setAttribute("aria-pressed", on ? "true" : "false");
        });
        el("btn-lang-continue").disabled = false;
      }
      maybeShowLangIdleNotice();
    }

    renderModuleGrid();
    renderRateLinks();

    window.addEventListener(
      "pageshow",
      function (ev) {
        if (ev.persisted) {
          window.location.reload();
        }
      },
      false
    );

    try {
      if (mqPrefersReduceMotion) {
        function onReducedMotionPreferenceChange() {
          const homeView = el("view-home");
          if (!homeView || homeView.classList.contains("hidden")) return;
          if (mqPrefersReduceMotion.matches) stopCarousel();
          else startCarousel();
        }
        if (mqPrefersReduceMotion.addEventListener) {
          mqPrefersReduceMotion.addEventListener("change", onReducedMotionPreferenceChange);
        } else if (mqPrefersReduceMotion.addListener) {
          mqPrefersReduceMotion.addListener(onReducedMotionPreferenceChange);
        }
      }
    } catch (_rm) {
      /* matchMedia yok */
    }
  }

  init();
})();
