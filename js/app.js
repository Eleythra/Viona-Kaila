(function () {
  "use strict";

  const MODULE_DEFS = [
    { id: "general", i18nKey: "modGeneral", icon: "building" },
    { id: "where", i18nKey: "modWhere", icon: "map" },
    { id: "restaurant", i18nKey: "modRest", icon: "utensils" },
    { id: "alacarte", i18nKey: "modAlacarte", icon: "plate" },
    { id: "beach", i18nKey: "modBeach", icon: "waves" },
    { id: "requests", i18nKey: "modRequests", icon: "messages", isRequests: true },
    { id: "spa", i18nKey: "modSpa", icon: "spa" },
    { id: "discount", i18nKey: "modDiscount", icon: "percent" },
    { id: "animation", i18nKey: "modAnim", icon: "spark" },
    { id: "miniclub", i18nKey: "modMini", icon: "smile" },
    { id: "meeting", i18nKey: "modMeet", icon: "users" },
    { id: "alanya", i18nKey: "modAlanya", icon: "compass" },
    { id: "survey", i18nKey: "modSurvey", icon: "star", isSurvey: true },
  ];

  const REQUEST_SUBS = [
    { id: "request", i18nKey: "subRequest" },
    { id: "complaint", i18nKey: "subComplaint" },
    { id: "fault", i18nKey: "subFault" },
    { id: "guest_notification", i18nKey: "subGuestNotification" },
    { id: "res", i18nKey: "subRes" },
  ];

  const ICONS = {
    building:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-6h6v6"/><path d="M9 10h.01M15 10h.01"/></svg>',
    map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M9 20l-5 2V6l5-2 6 2 5-2v16l-5 2-6-2z"/><path d="M9 6v14"/><path d="M15 8v14"/></svg>',
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
  };

  /** i18n.js ile aynı anahtar; burada da tanımlı olsun (bağımsız yükleme). */
  const LANG_STORAGE_KEY = "viona_lang";
  /** Bu oturumda «Devam et» ile dil onaylandıysa ana sayfaya doğrudan geçilir. */
  const SESSION_LANG_OK = "viona_lang_session_ok";

  let lang = null;
  let selectedLangCode = null;
  let carouselTimer = null;
  let carouselIndex = 0;

  let moduleId = null;
  let requestSub = null;
  let surveySub = null;

  const el = (id) => document.getElementById(id);

  const SURVEY_TITLE_FALLBACK = {
    tr: "Otel ve Uygulama Deneyiminizi Değerlendirin",
    en: "Rate Your Hotel and App Experience",
    de: "Bewerten Sie Ihr Hotel- und App-Erlebnis",
    ru: "Оцените ваш опыт отеля и приложения",
  };

  function t(key) {
    const L = I18N[lang] || I18N.tr;
    return L[key] !== undefined ? L[key] : I18N.tr[key] || key;
  }

  function surveyTitleText() {
    const translated = t("modSurvey");
    if (translated !== "modSurvey") return translated;
    return SURVEY_TITLE_FALLBACK[lang] || SURVEY_TITLE_FALLBACK.tr;
  }

  function applyI18n(root) {
    const L = I18N[lang] || I18N.tr;
    const scope = root || document;
    scope.querySelectorAll("[data-i18n]").forEach((node) => {
      const k = node.getAttribute("data-i18n");
      if (k && L[k] !== undefined) {
        node.textContent = L[k];
      }
    });
    scope.querySelectorAll("[data-i18n-aria]").forEach((node) => {
      const k = node.getAttribute("data-i18n-aria");
      if (k && L[k] !== undefined) {
        node.setAttribute("aria-label", L[k]);
      }
    });
    document.title = t("metaTitle");
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
    const homeView = el("view-home");
    const modView = el("view-module");
    [langView, homeView, modView].forEach((v) => v.classList.add("hidden"));
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
      homeView.setAttribute("aria-hidden", "true");
      modView.setAttribute("aria-hidden", "true");
      stopCarousel();
      scrollMainViewportToTop();
    } else if (name === "home") {
      if (typeof window._vionaClearActivitiesCarousel === "function") {
        window._vionaClearActivitiesCarousel();
      }
      if (typeof window._vionaClearDiscountCarousel === "function") {
        window._vionaClearDiscountCarousel();
      }
      homeView.classList.remove("hidden");
      langView.setAttribute("aria-hidden", "true");
      homeView.setAttribute("aria-hidden", "false");
      modView.setAttribute("aria-hidden", "true");
      startCarousel();
      scrollMainViewportToTop();
    } else if (name === "module") {
      modView.classList.remove("hidden");
      langView.setAttribute("aria-hidden", "true");
      homeView.setAttribute("aria-hidden", "true");
      modView.setAttribute("aria-hidden", "false");
      stopCarousel();
      scrollMainViewportToTop();
    }
  }

  function initCarousel() {
    const track = el("carousel-track");
    track.innerHTML = "";
    CAROUSEL_IMAGES.forEach((src, i) => {
      const slide = document.createElement("div");
      slide.className = "carousel-slide" + (i === 0 ? " carousel-slide--active" : "");
      slide.setAttribute("aria-hidden", i === 0 ? "false" : "true");
      const img = document.createElement("img");
      img.src = src;
      img.alt = "";
      img.decoding = "async";
      img.loading = i === 0 ? "eager" : "lazy";
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

  function startCarousel() {
    stopCarousel();
    const slides = document.querySelectorAll(".carousel-slide");
    if (slides.length < 2) return;
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
    instagram:
      '<svg class="rate-link__svg rate-link__svg--ig" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="rateIg" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#f09433"/><stop offset="50%" stop-color="#e6683c"/><stop offset="100%" stop-color="#bc1888"/></linearGradient></defs><rect x="2" y="2" width="20" height="20" rx="5" fill="url(#rateIg)"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="#fff" stroke-width="1.4"/><circle cx="17.4" cy="6.6" r="1.2" fill="#fff"/></svg>',
    booking:
      '<svg class="rate-link__svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 3v4M16 3v4M4 11h16"/></svg>',
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
      section.style.animationDelay = `${bi * 0.06}s`;

      const h3 = document.createElement("h3");
      h3.className = "rate-section__title";
      h3.textContent = t(block.sectionKey);
      section.appendChild(h3);

      block.items.forEach((item, ii) => {
        const a = document.createElement("a");
        a.className = "rate-link" + (item.badge ? " rate-link--" + item.badge : "");
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
        section.appendChild(a);
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

      const h2 = document.createElement("h2");
      h2.textContent = t(def.i18nKey);
      inner.appendChild(h2);

      if (moduleId === "where" && typeof window.renderWhereModule === "function") {
        window.renderWhereModule(inner, t);
        return;
      }

      const MODULE_RENDERERS = {
        general: "renderGeneralModule",
        restaurant: "renderRestaurantModule",
        alacarte: "renderAlacarteModule",
        beach: "renderBeachModule",
        spa: "renderSpaModule",
        discount: "renderDiscountModule",
        animation: "renderActivitiesModule",
        miniclub: "renderMiniclubModule",
        meeting: "renderMeetingModule",
        alanya: "renderAlanyaModule",
      };
      const rName = MODULE_RENDERERS[moduleId];
      if (rName && typeof window[rName] === "function") {
        window[rName](inner, t);
        return;
      }

      const p = document.createElement("p");
      p.className = "placeholder";
      p.textContent = t("placeholderBody");
      inner.appendChild(p);
    } finally {
      if (moduleId) {
        scrollMainViewportToTop();
        requestAnimationFrame(() => scrollMainViewportToTop());
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
    if (inner._whereCleanup && typeof inner._whereCleanup === "function") {
      inner._whereCleanup();
      delete inner._whereCleanup;
    }
    moduleId = null;
    requestSub = null;
    surveySub = null;
    showView("home");
  }

  // Chatbot'tan gelen rezervasyon yönlendirmesi için: İstekler modülünü
  // Rezervasyonlar alt sekmesi (REQUEST_SUBS içindeki "res") ile aç.
  window.vionaChatOpenReservations = function () {
    moduleId = "requests";
    requestSub = "res";
    surveySub = null;
    showView("module");
    renderModuleContent();
    closeModals();
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

  /** Sohbet formu kaydı tamamlandıktan sonra: modal kapanır, modül sıfırlanır, ana sayfa (istek/anket ile aynı mantık). */
  window.vionaExitChatToHome = function () {
    closeModals();
    const inner = el("module-inner");
    if (inner) {
      if (inner._whereCleanup && typeof inner._whereCleanup === "function") {
        inner._whereCleanup();
        delete inner._whereCleanup;
      }
      inner.innerHTML = "";
    }
    moduleId = null;
    requestSub = null;
    surveySub = null;
    showView("home");
  };

  function setLang(code) {
    lang = code;
    localStorage.setItem(LANG_STORAGE_KEY, code);
    applyI18n(document);
    if (typeof window.vionaChatRefreshI18n === "function") window.vionaChatRefreshI18n();
    if (typeof window.vionaVoiceRefreshI18n === "function") window.vionaVoiceRefreshI18n();
    renderModuleGrid();
    renderRateLinks();
    if (moduleId) {
      renderModuleContent();
    }
    const htmlLang = { tr: "tr", en: "en", de: "de", ru: "ru" }[code] || "tr";
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

  function wireLanguageScreen() {
    const chips = document.querySelectorAll(".lang-chip");
    const continueBtn = el("btn-lang-continue");

    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        selectedLangCode = chip.dataset.lang;
        chips.forEach((c) => {
          c.classList.toggle("lang-chip--active", c === chip);
          c.setAttribute("aria-pressed", c === chip ? "true" : "false");
        });
        continueBtn.disabled = !selectedLangCode;
      });
    });

    continueBtn.addEventListener("click", () => {
      if (!selectedLangCode) return;
      try {
        sessionStorage.setItem(SESSION_LANG_OK, "1");
      } catch (e) {
        /* private mode vb. */
      }
      setLang(selectedLangCode);
      showView("home");
      scheduleDiscountPopup();
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
    initCarousel();
    wireLanguageScreen();
    wireHome();

    let storedLang = null;
    try {
      storedLang = localStorage.getItem(LANG_STORAGE_KEY);
    } catch (e) {
      storedLang = null;
    }
    let sessionOk = false;
    try {
      sessionOk = sessionStorage.getItem(SESSION_LANG_OK) === "1";
    } catch (e) {
      sessionOk = false;
    }

    function validLang(code) {
      return Boolean(code && I18N[code]);
    }

    const skipLangScreen = sessionOk && validLang(storedLang);

    if (skipLangScreen) {
      lang = storedLang;
      selectedLangCode = lang;
      setLang(lang);
      document.querySelectorAll(".lang-chip").forEach((c) => {
        const on = c.dataset.lang === lang;
        c.classList.toggle("lang-chip--active", on);
        c.setAttribute("aria-pressed", on ? "true" : "false");
      });
      showView("home");
      scheduleDiscountPopup();
    } else {
      applyI18n(document);
      showView("lang");
      if (validLang(storedLang)) {
        selectedLangCode = storedLang;
        document.querySelectorAll(".lang-chip").forEach((c) => {
          const on = c.dataset.lang === storedLang;
          c.classList.toggle("lang-chip--active", on);
          c.setAttribute("aria-pressed", on ? "true" : "false");
        });
        el("btn-lang-continue").disabled = false;
      }
    }

    if (!skipLangScreen) {
      renderModuleGrid();
      renderRateLinks();
    }
  }

  init();
})();
