(function () {
  "use strict";

  var schema = window.SURVEY_SCHEMA;
  var stateApi = window.SurveyState;
  var submitApi = window.SurveySubmit;

  if (!schema || !stateApi || !submitApi) return;

  var state = stateApi.createInitialState(schema);
  var findSection = stateApi.findSurveySection;

  var HUB_ORDER = [
    "generalEval",
    "viona",
    "food",
    "comfort",
    "staff",
    "poolBeach",
    "spaWellness",
    "guestExperience",
  ];
  var HUB_ICONS = {
    generalEval:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/></svg>',
    viona:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="5" y="8" width="14" height="10" rx="3"/><path d="M9 8V6a3 3 0 016 0v2"/></svg>',
    food:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M7 4v17M4 7h6"/><path d="M17 4v17M14 4h6"/></svg>',
    comfort:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="11" width="18" height="7" rx="2"/><path d="M7 11V8a2 2 0 012-2h6a2 2 0 012 2v3"/></svg>',
    staff:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',
    poolBeach:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M2 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0 4 2 6 0"/><path d="M2 17c2-2 4-2 6 0s4 2 6 0 4-2 6 0 4 2 6 0"/></svg>',
    spaWellness:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 3c-2 3-6 4-6 9a6 6 0 0012 0c0-5-4-6-6-9z"/><path d="M12 18v3"/></svg>',
    guestExperience:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 21s-4-3.5-4-7a4 4 0 118 0c0 3.5-4 7-4 7z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  };

  var TAB_BY_ID = {};
  schema.tabs.forEach(function (t) {
    TAB_BY_ID[t.id] = t;
  });
  var ORDERED_TABS = HUB_ORDER.map(function (id) {
    return TAB_BY_ID[id];
  }).filter(Boolean);

  /** Aktif sekme içeriği kökü; tekrarlayan #survey-active-section sorgularını önler. */
  var surveyPanelMount = null;
  var submitInFlight = false;
  var lastRenderedSurveySubId;
  /** Gönder öncesi onay katmanı (sekme bazlı). */
  var surveyConfirmOpen = false;
  var surveyConfirmTabId = null;
  var surveyThankYouTimer = null;
  /** Başarı sonrası ana sayfaya dönmek için app.js’ten atanır. */
  var surveySuccessGoHome = null;
  var SURVEY_SUCCESS_THEN_HOME_MS = 2600;

  function clearSurveyThankYouTimer() {
    if (surveyThankYouTimer) {
      clearTimeout(surveyThankYouTimer);
      surveyThankYouTimer = null;
    }
  }

  function closeSubmitConfirm() {
    surveyConfirmOpen = false;
    surveyConfirmTabId = null;
    renderActiveSection();
  }

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || !surveyConfirmOpen) return;
    e.preventDefault();
    closeSubmitConfirm();
  });

  var SURVEY_FALLBACK = {
    tr: {
      modSurvey: "Deneyiminizi Değerlendirin",
      surveyTitle: "Deneyiminizi Değerlendirin",
      surveyDescription:
        "Konaklamanızın farklı alanlarını 1–5 ile puanlayın. Her bölüm kendi içinde gönderilir; doldurmadığınız başlıklar zorunlu değildir. Kısa notlar isteğe bağlıdır.",
      surveyBackToTopics: "Değerlendirme başlıklarına dön",
      surveyBackToCategory: "Alt başlıklara dön",
      surveySubHubHint: "Değerlendirmek istediğiniz alanı seçin; her biri ayrı gönderilir.",
      surveyVionaHubLabel: "Viona Asistanı",
      surveySubmitButtonText: "Değerlendirmeyi Gönder",
      surveyThankYouMessage: "Geri bildiriminiz için teşekkür ederiz.",
      surveyErrorFillRatings: "Lütfen bu bölümdeki tüm puanları seçin (1–5).",
      surveyErrorMissingTopics: "Eksik başlıklar: {list}.",
      surveyHubHint:
        "Her bölüm tek başına gönderilir: kartı açın, soruları 1–5 ile doldurun, gönderin. Yemek & içecek ile havuz & plajda önce alan seçilir.",
      surveyThankYouSubtext:
        "Bu bölüm kaydedildi. Form sıfırlandı; dilerseniz yeniden puan verebilirsiniz.",
      surveyConfirmTitle: "Gönderiyi onaylıyor musunuz?",
      surveyConfirmBody:
        "“{tab}” bölümündeki puanlarınız kaydedilecek. Diğer başlıkları ayrı gönderebilirsiniz.",
      surveyConfirmSend: "Evet, gönder",
      surveyConfirmCancel: "Vazgeç",
      surveyConfirmDismiss: "Onayı kapat",
      surveyErrorSubmit: "Gönderim sırasında bir hata oluştu.",
      surveyScaleHint: "5 üzerinden",
      surveyStarWord: "yıldız",
      surveyVionaCommentPlaceholder: "Viona hakkında eklemek istediğiniz not",
      surveyTabCommentPlaceholder: "{tab} hakkında kısa not (isteğe bağlı)",
    },
    en: {
      modSurvey: "Rate Your Experience",
      surveyTitle: "Rate Your Experience",
      surveyDescription:
        "Rate different aspects of your stay from 1 to 5. Each section is submitted on its own; you may skip any section. Short notes are optional.",
      surveyBackToTopics: "Back to review topics",
      surveyBackToCategory: "Back to subtopics",
      surveySubHubHint: "Choose the area you would like to rate; each is submitted separately.",
      surveyVionaHubLabel: "Viona Assistant",
      surveySubmitButtonText: "Submit review",
      surveyThankYouMessage: "Thank you for your feedback.",
      surveyErrorFillRatings: "Please select all scores (1–5) in this section.",
      surveyErrorMissingTopics: "Incomplete sections: {list}.",
      surveyHubHint:
        "Each section is sent separately: open a card, answer all questions (1–5), then submit. For food & drinks and pool & beach, pick an area first.",
      surveyThankYouSubtext: "This section was saved. The form was cleared; you can rate again if you want.",
      surveyConfirmTitle: "Send this section?",
      surveyConfirmBody:
        "Your scores for “{tab}” will be saved. You can submit other topics separately.",
      surveyConfirmSend: "Yes, send",
      surveyConfirmCancel: "Go back",
      surveyConfirmDismiss: "Close confirmation",
      surveyErrorSubmit: "An error occurred while submitting.",
      surveyScaleHint: "out of 5",
      surveyStarWord: "stars",
      surveyVionaCommentPlaceholder: "Optional note about Viona",
      surveyTabCommentPlaceholder: "Optional note about {tab}",
    },
    de: {
      modSurvey: "Bewerten Sie Ihr Erlebnis",
      surveyTitle: "Bewerten Sie Ihr Erlebnis",
      surveyDescription:
        "Bewerten Sie verschiedene Bereiche Ihres Aufenthalts von 1 bis 5. Jeder Abschnitt wird einzeln gesendet; Sie können Abschnitte überspringen. Kurze Notizen sind freiwillig.",
      surveyBackToTopics: "Zurück zu den Bewertungsthemen",
      surveyBackToCategory: "Zurück zur Unterauswahl",
      surveySubHubHint: "Wählen Sie den Bereich, den Sie bewerten möchten; jeder wird separat gesendet.",
      surveyVionaHubLabel: "Viona-Assistent",
      surveySubmitButtonText: "Bewertung senden",
      surveyThankYouMessage: "Vielen Dank für Ihr Feedback.",
      surveyErrorFillRatings: "Bitte in diesem Abschnitt alle Punktwerte (1–5) wählen.",
      surveyErrorMissingTopics: "Noch offen: {list}.",
      surveyHubHint:
        "Jeder Abschnitt wird separat gesendet: Karte öffnen, alle Fragen mit 1–5 bewerten, absenden. Bei Essen & Getränken sowie Pool & Strand wählen Sie zuerst den Bereich.",
      surveyThankYouSubtext:
        "Dieser Abschnitt wurde gespeichert. Das Formular wurde zurückgesetzt; Sie können erneut bewerten.",
      surveyConfirmTitle: "Abschnitt senden?",
      surveyConfirmBody:
        "Ihre Bewertungen für „{tab}“ werden gespeichert. Andere Themen können Sie separat senden.",
      surveyConfirmSend: "Ja, senden",
      surveyConfirmCancel: "Zurück",
      surveyConfirmDismiss: "Bestätigung schließen",
      surveyErrorSubmit: "Beim Senden ist ein Fehler aufgetreten.",
      surveyScaleHint: "von 5",
      surveyStarWord: "Sterne",
      surveyVionaCommentPlaceholder: "Optional: Notiz zu Viona",
      surveyTabCommentPlaceholder: "Optionaler Kommentar zu {tab}",
    },
    pl: {
      modSurvey: "Oceń swoje wrażenia",
      surveyTitle: "Oceń swoje wrażenia",
      surveyDescription:
        "Oceń różne aspekty pobytu od 1 do 5. Każda sekcja jest przesyłana osobno; możesz pominąć dowolną sekcję. Krótkie notatki są opcjonalne.",
      surveyBackToTopics: "Powrót do tematów recenzji",
      surveyBackToCategory: "Powrót do podtematów",
      surveySubHubHint: "Wybierz obszar, który chcesz ocenić; każdy jest przesyłany osobno.",
      surveyVionaHubLabel: "Asystent Viona",
      surveySubmitButtonText: "Wyślij recenzję",
      surveyThankYouMessage: "Dziękujemy bardzo za Twoją ocenę.",
      surveyErrorFillRatings: "Wybierz wszystkie wyniki (1–5) w tej sekcji.",
      surveyErrorMissingTopics: "Nieukończone sekcje: {list}.",
      surveyHubHint:
        "Każda sekcja jest wysyłana osobno: otwórz kartę, odpowiedz na wszystkie pytania (1–5), a następnie prześlij. Jeśli chodzi o jedzenie i napoje oraz basen i plażę, najpierw wybierz obszar.",
      surveyThankYouSubtext:
        "Ta sekcja została zapisana. Formularz został wyczyszczony; możesz ponownie ocenić, jeśli chcesz.",
      surveyConfirmTitle: "Wysłać tę sekcję?",
      surveyConfirmBody:
        "Twoje wyniki dla „{tab}” zostaną zapisane. Inne tematy możesz zgłaszać osobno.",
      surveyConfirmSend: "Tak, wyślij",
      surveyConfirmCancel: "Wstecz",
      surveyConfirmDismiss: "Zamknij potwierdzenie",
      surveyErrorSubmit: "Wystąpił błąd podczas przesyłania wyników.",
      surveyScaleHint: "z 5",
      surveyStarWord: "gwiazdki",
      surveyVionaCommentPlaceholder: "Opcjonalna uwaga o Viona",
      surveyTabCommentPlaceholder: "Opcjonalna informacja o {tab}",
    },
  };

  (function aliasExtraSurveyFallback() {
    var VL = typeof window !== "undefined" ? window.VIONA_LANG : null;
    if (!VL || !VL.EXTRA) return;
    var ref = SURVEY_FALLBACK.en;
    VL.EXTRA.forEach(function (code) {
      if (!SURVEY_FALLBACK[code]) SURVEY_FALLBACK[code] = ref;
    });
  })();

  function getLangCode() {
    try {
      return localStorage.getItem("viona_lang") || "tr";
    } catch (e) {
      return "tr";
    }
  }

  function tr(key, fallback) {
    var source = typeof I18N !== "undefined" ? I18N : null;
    var raw = getLangCode();
    var code = raw;
    if (source && !source[raw]) {
      code = SURVEY_FALLBACK[raw] ? raw : "pl";
    } else if (!source && !SURVEY_FALLBACK[raw]) {
      code = "pl";
    }
    var dict = (source && source[code]) || (source && source.pl) || (source && source.tr) || {};
    if (dict[key] !== undefined && dict[key] !== key) return dict[key];
    var localDict = SURVEY_FALLBACK[code] || SURVEY_FALLBACK.pl || SURVEY_FALLBACK.tr;
    if (localDict[key] !== undefined) return localDict[key];
    return fallback;
  }

  function tabLabel(tab) {
    return tr("surveyTab_" + tab.id, tab.label);
  }

  function questionLabel(question) {
    return tr("surveyQuestion_" + question.id, question.label);
  }

  function el(tag, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function createScoreButtons(value, onSelect, ariaQuestion) {
    var scaleHint = tr("surveyScaleHint", "5 üzerinden");
    var wrap = el("div", "survey-score");
    wrap.setAttribute("role", "radiogroup");
    wrap.setAttribute("aria-label", ariaQuestion || scaleHint);
    wrap.addEventListener("click", function (e) {
      var t = e.target;
      if (!t || t.nodeName !== "BUTTON" || !wrap.contains(t)) return;
      var val = Number(t.getAttribute("data-score"));
      if (val >= 1 && val <= 5) onSelect(val);
    });
    for (var i = 1; i <= 5; i++) {
      var b = el("button", "survey-score__btn" + (value === i ? " is-active" : ""));
      b.type = "button";
      b.setAttribute("data-score", String(i));
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", value === i ? "true" : "false");
      b.textContent = String(i);
      b.setAttribute(
        "aria-label",
        (ariaQuestion ? ariaQuestion + " — " : "") + i + " / 5 (" + scaleHint + ")"
      );
      wrap.appendChild(b);
    }
    return wrap;
  }

  function isScoreChosen(v) {
    var n = Number(v);
    return n >= 1 && n <= 5;
  }

  function sectionRatingsComplete(section) {
    if (!section || !section.questions) return false;
    return section.questions.every(function (q) {
      var v = section.isViona ? state.vionaAnswers[q.id] : state.hotelAnswers[q.id];
      return isScoreChosen(v);
    });
  }

  function tabRatingsComplete(tab) {
    if (tab.isViona) return sectionRatingsComplete(tab);
    if (tab.subTabs && tab.subTabs.length) {
      return tab.subTabs.every(function (st) {
        return sectionRatingsComplete(st);
      });
    }
    return sectionRatingsComplete(tab);
  }

  function getParentTabId(leafId) {
    for (var i = 0; i < schema.tabs.length; i++) {
      var t = schema.tabs[i];
      if (!t.subTabs) continue;
      for (var j = 0; j < t.subTabs.length; j++) {
        if (t.subTabs[j].id === leafId) return t.id;
      }
    }
    return null;
  }

  function renderSubHub(parentTab, setSub) {
    var outer = el("div", "survey-subhub");
    var sheet = el("div", "survey-subhub__sheet");
    var hub = el("div", "survey-hub survey-hub--sub");
    parentTab.subTabs.forEach(function (st) {
      var btn = el("button", "req-hub__card req-hub__card--sub");
      btn.type = "button";
      if (sectionRatingsComplete(st)) btn.classList.add("req-hub__card--complete");
      var label = tabLabel(st);
      var ico = HUB_ICONS[parentTab.id] || HUB_ICONS.food;
      btn.innerHTML =
        '<span class="req-hub__icon" aria-hidden="true">' +
        ico +
        '</span><span class="req-hub__label">' +
        label +
        "</span>";
      btn.addEventListener("click", function () {
        surveyConfirmOpen = false;
        surveyConfirmTabId = null;
        clearSurveyThankYouTimer();
        state.submittedMessage = "";
        state.submittedIsError = false;
        state.submitExtraLine = "";
        stateApi.setActiveTab(state, st.id);
        setSub(st.id);
      });
      hub.appendChild(btn);
    });
    sheet.appendChild(hub);
    outer.appendChild(sheet);
    return outer;
  }

  function renderQuestionRow(tab, question) {
    var row = el("div", "survey-q-row");
    var title = el("p", "survey-q-row__title");
    title.textContent = questionLabel(question);
    row.appendChild(title);

    var qLabel = questionLabel(question);
    var scoreVal = tab.isViona ? state.vionaAnswers[question.id] || 0 : state.hotelAnswers[question.id] || 0;
    var onPick = tab.isViona
      ? function (val) {
          stateApi.setVionaAnswer(state, question.id, val);
          surveyConfirmOpen = false;
          surveyConfirmTabId = null;
          clearSurveyThankYouTimer();
          state.submittedMessage = "";
          state.submittedIsError = false;
          state.submitExtraLine = "";
          renderActiveSection();
        }
      : function (val) {
          stateApi.setHotelAnswer(state, question.id, val);
          surveyConfirmOpen = false;
          surveyConfirmTabId = null;
          clearSurveyThankYouTimer();
          state.submittedMessage = "";
          state.submittedIsError = false;
          state.submitExtraLine = "";
          renderActiveSection();
        };
    row.appendChild(createScoreButtons(scoreVal, onPick, qLabel));
    return row;
  }

  function renderTabPanel(tab) {
    var panel = el("section", "survey-panel");
    var list = el("div", "survey-q-list");

    tab.questions.forEach(function (q) {
      list.appendChild(renderQuestionRow(tab, q));
    });
    panel.appendChild(list);

    var tabComment = el("textarea", "survey-textarea");
    tabComment.rows = 3;
    tabComment.placeholder = tab.isViona
      ? tr("surveyVionaCommentPlaceholder", schema.vionaCommentPlaceholder)
      : tr("surveyTabCommentPlaceholder", "{tab} hakkında yorumunuz (opsiyonel)").replace("{tab}", tabLabel(tab));
    tabComment.value = state.tabComments[tab.id] || "";
    tabComment.addEventListener("input", function (e) {
      stateApi.setTabComment(state, tab.id, e.target.value);
      if (surveyConfirmOpen && surveyConfirmTabId === tab.id) {
        surveyConfirmOpen = false;
        surveyConfirmTabId = null;
        renderActiveSection();
      }
    });
    panel.appendChild(tabComment);

    return panel;
  }

  /** 1. adım: doğrula ve onay diyaloğunu aç. */
  function beginSubmitFlow() {
    var activeTab = findSection(schema, state.activeTabId);
    if (!activeTab) return;
    clearSurveyThankYouTimer();
    if (!sectionRatingsComplete(activeTab)) {
      surveyConfirmOpen = false;
      surveyConfirmTabId = null;
      state.submittedMessage = tr(
        "surveyErrorFillRatings",
        "Lütfen bu bölümdeki tüm puanları seçin (1–5)."
      );
      state.submittedIsError = true;
      state.submitExtraLine = "";
      renderActiveSection();
      scrollSurveyFeedbackIntoView();
      return;
    }
    if (submitInFlight) return;
    surveyConfirmOpen = true;
    surveyConfirmTabId = state.activeTabId;
    state.submittedMessage = "";
    state.submittedIsError = false;
    state.submitExtraLine = "";
    renderActiveSection();
    requestAnimationFrame(function () {
      var mount = surveyPanelMount || document.getElementById("survey-active-section");
      if (!mount) return;
      var sendBtn = mount.querySelector("[data-survey-confirm-send]");
      if (sendBtn && typeof sendBtn.focus === "function") sendBtn.focus();
    });
  }

  /** 2. adım: onay sonrası API; başarıda sekme sıfırlanır. */
  function executeConfirmedSubmit() {
    if (!surveyConfirmOpen || surveyConfirmTabId !== state.activeTabId) return;
    if (submitInFlight) return;
    var tabId = state.activeTabId;
    var activeTab = findSection(schema, tabId);
    if (!activeTab || !sectionRatingsComplete(activeTab)) {
      closeSubmitConfirm();
      return;
    }
    surveyConfirmOpen = false;
    surveyConfirmTabId = null;
    submitInFlight = true;
    renderActiveSection();
    var payload = stateApi.buildPayloadForTab(state, schema, tabId);
    submitApi
      .submitSurvey(payload)
      .then(function () {
        submitInFlight = false;
        state.lastSubmittedPayload = payload;
        stateApi.resetSubmittedTab(state, schema, tabId);
        state.submittedMessage = tr("surveyThankYouMessage", schema.thankYouMessage);
        state.submittedIsError = false;
        state.submitExtraLine = tr("surveyThankYouSubtext", "").trim();
        renderActiveSection();
        scrollSurveyFeedbackIntoView();
        clearSurveyThankYouTimer();
        surveyThankYouTimer = setTimeout(function () {
          surveyThankYouTimer = null;
          state.submittedMessage = "";
          state.submitExtraLine = "";
          var goHome = surveySuccessGoHome;
          surveySuccessGoHome = null;
          if (typeof goHome === "function") goHome();
          else renderActiveSection();
        }, SURVEY_SUCCESS_THEN_HOME_MS);
      })
      .catch(function () {
        submitInFlight = false;
        state.submittedMessage = tr("surveyErrorSubmit", "Gönderim sırasında bir hata oluştu.");
        state.submittedIsError = true;
        state.submitExtraLine = "";
        renderActiveSection();
        scrollSurveyFeedbackIntoView();
      });
  }

  function renderSubmitConfirmLayer(card, activeTab) {
    var tabName =
      activeTab.id === "viona" ? tr("surveyVionaHubLabel", "Viona") : tabLabel(activeTab);
    var overlay = el("div", "survey-confirm");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "survey-confirm-title");

    var backdrop = el("button", "survey-confirm__backdrop");
    backdrop.type = "button";
    backdrop.setAttribute("aria-label", tr("surveyConfirmDismiss", "Kapat"));
    backdrop.addEventListener("click", closeSubmitConfirm);

    var sheet = el("div", "survey-confirm__sheet");
    var h3 = el("h3", "survey-confirm__title");
    h3.id = "survey-confirm-title";
    h3.textContent = tr("surveyConfirmTitle", "Gönderiyi onaylıyor musunuz?");
    sheet.appendChild(h3);

    var lead = el("p", "survey-confirm__lead");
    lead.textContent = tr("surveyConfirmBody", "“{tab}” bölümündeki puanlarınız kaydedilecek.").replace(
      "{tab}",
      tabName
    );
    sheet.appendChild(lead);

    var actions = el("div", "survey-confirm__actions");
    var cancelBtn = el("button", "survey-confirm__btn survey-confirm__btn--secondary");
    cancelBtn.type = "button";
    cancelBtn.textContent = tr("surveyConfirmCancel", "Vazgeç");
    cancelBtn.addEventListener("click", closeSubmitConfirm);

    var sendBtn = el("button", "btn-primary survey-confirm__btn");
    sendBtn.type = "button";
    sendBtn.setAttribute("data-survey-confirm-send", "1");
    sendBtn.textContent = tr("surveyConfirmSend", "Evet, gönder");
    sendBtn.addEventListener("click", executeConfirmedSubmit);

    actions.appendChild(cancelBtn);
    actions.appendChild(sendBtn);
    sheet.appendChild(actions);

    overlay.appendChild(backdrop);
    overlay.appendChild(sheet);
    card.appendChild(overlay);
  }

  function scrollSurveyFeedbackIntoView() {
    requestAnimationFrame(function () {
      var mount = surveyPanelMount;
      if (!mount || !mount.isConnected) {
        mount = document.getElementById("survey-active-section");
      }
      if (!mount) return;
      var msg = mount.querySelector(".survey-error-msg, .survey-success");
      (msg || mount).scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function renderHub(container, setSub) {
    var hub = el("div", "survey-hub");
    ORDERED_TABS.forEach(function (tab) {
      var btn = el("button", "req-hub__card");
      btn.type = "button";
      if (tabRatingsComplete(tab)) btn.classList.add("req-hub__card--complete");
      var label = tab.id === "viona" ? tr("surveyVionaHubLabel", "Viona") : tabLabel(tab);
      btn.innerHTML =
        '<span class="req-hub__icon" aria-hidden="true">' +
        (HUB_ICONS[tab.id] || HUB_ICONS.generalEval) +
        '</span><span class="req-hub__label">' +
        label +
        "</span>";
      btn.addEventListener("click", function () {
        surveyConfirmOpen = false;
        surveyConfirmTabId = null;
        clearSurveyThankYouTimer();
        state.submittedMessage = "";
        state.submittedIsError = false;
        state.submitExtraLine = "";
        setSub(tab.id);
      });
      hub.appendChild(btn);
    });
    container.appendChild(hub);
  }

  function renderActiveSection() {
    var panelMount = surveyPanelMount;
    if (!panelMount || !panelMount.isConnected) {
      panelMount = document.getElementById("survey-active-section");
      surveyPanelMount = panelMount;
    }
    if (!panelMount) return;
    panelMount.innerHTML = "";

    var activeTab = findSection(schema, state.activeTabId);
    if (!activeTab) return;

    var card = el("section", "survey-card");
    card.appendChild(renderTabPanel(activeTab));

    var submitBtn = el("button", "btn-primary survey-submit survey-submit--main");
    submitBtn.type = "button";
    submitBtn.textContent = tr("surveySubmitButtonText", schema.submitButtonText);
    submitBtn.disabled = submitInFlight || surveyConfirmOpen;
    submitBtn.addEventListener("click", beginSubmitFlow);
    card.appendChild(submitBtn);

    if (surveyConfirmOpen && surveyConfirmTabId === state.activeTabId) {
      renderSubmitConfirmLayer(card, activeTab);
    }

    if (state.submittedMessage) {
      var ok = el("p", state.submittedIsError ? "survey-error-msg" : "survey-success");
      ok.textContent = state.submittedMessage;
      card.appendChild(ok);
      if (state.submitExtraLine && String(state.submitExtraLine).trim()) {
        var sub = el("p", "survey-success-sub");
        sub.textContent = state.submitExtraLine;
        card.appendChild(sub);
      }
    }

    panelMount.appendChild(card);
  }

  function renderSurveyModule(container, subId, api) {
    api = api || {};
    clearSurveyThankYouTimer();
    var setSub = api.setSub || function () {};
    var moduleTitle = api.moduleTitle || tr("modSurvey", "Bizi Değerlendirin");
    surveySuccessGoHome =
      typeof api.onSurveySuccessGoHome === "function" ? api.onSurveySuccessGoHome : null;
    if (lastRenderedSurveySubId !== subId) {
      submitInFlight = false;
      surveyConfirmOpen = false;
      surveyConfirmTabId = null;
      clearSurveyThankYouTimer();
      lastRenderedSurveySubId = subId;
    }
    surveyPanelMount = null;
    container.innerHTML = "";

    var wrap = el("div", "survey-wrap");
    var h2 = el("h2", "survey-wrap__title");
    if (!subId) {
      h2.textContent = moduleTitle;
    } else {
      var topOpened = TAB_BY_ID[subId];
      if (topOpened && topOpened.subTabs && topOpened.subTabs.length) {
        h2.textContent = tabLabel(topOpened);
      } else {
        var secHead = findSection(schema, subId);
        h2.textContent = secHead ? tabLabel(secHead) : tr("surveyTitle", schema.title);
      }
    }
    wrap.appendChild(h2);

    if (!subId) {
      var intro = el("p", "req-intro");
      intro.textContent = tr("surveyDescription", schema.description);
      wrap.appendChild(intro);
      var hubHint = el("p", "survey-hub-hint");
      hubHint.textContent = tr("surveyHubHint", "");
      if (hubHint.textContent) wrap.appendChild(hubHint);
      renderHub(wrap, setSub);
      container.appendChild(wrap);
      return;
    }

    var parentWithSubs = TAB_BY_ID[subId];
    if (parentWithSubs && parentWithSubs.subTabs && parentWithSubs.subTabs.length) {
      var introSub = el("p", "survey-hub-hint survey-subhub__hint");
      introSub.textContent = tr("surveySubHubHint", "");
      if (introSub.textContent) wrap.appendChild(introSub);
      var backTopics = el("button", "req-back-hub");
      backTopics.type = "button";
      backTopics.textContent = tr("surveyBackToTopics", "Değerlendirme başlıklarına dön");
      backTopics.addEventListener("click", function () {
        surveyConfirmOpen = false;
        surveyConfirmTabId = null;
        clearSurveyThankYouTimer();
        state.submittedMessage = "";
        state.submittedIsError = false;
        state.submitExtraLine = "";
        setSub(null);
      });
      wrap.appendChild(backTopics);
      wrap.appendChild(renderSubHub(parentWithSubs, setSub));
      container.appendChild(wrap);
      return;
    }

    stateApi.setActiveTab(state, subId);

    var parentId = getParentTabId(subId);
    var backHub = el("button", "req-back-hub");
    backHub.type = "button";
    backHub.textContent = parentId
      ? tr("surveyBackToCategory", "Alt başlıklara dön")
      : tr("surveyBackToTopics", "Değerlendirme başlıklarına dön");
    backHub.addEventListener("click", function () {
      surveyConfirmOpen = false;
      surveyConfirmTabId = null;
      clearSurveyThankYouTimer();
      state.submittedMessage = "";
      state.submittedIsError = false;
      state.submitExtraLine = "";
      setSub(parentId || null);
    });
    wrap.appendChild(backHub);

    var mount = el("div", "");
    mount.id = "survey-active-section";
    surveyPanelMount = mount;
    wrap.appendChild(mount);
    container.appendChild(wrap);
    renderActiveSection();
  }

  window.renderSurveyModule = renderSurveyModule;
})();
