(function () {
  "use strict";

  var schema = window.SURVEY_SCHEMA;
  var stateApi = window.SurveyState;
  var submitApi = window.SurveySubmit;

  if (!schema || !stateApi || !submitApi) return;

  var state = stateApi.createInitialState(schema);
  var HUB_ORDER = ["viona", "food", "comfort", "cleanliness", "staff", "poolBeach", "spaWellness", "generalExperience"];
  var HUB_ICONS = {
    viona:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="5" y="8" width="14" height="10" rx="3"/><path d="M9 8V6a3 3 0 016 0v2"/></svg>',
    food:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M7 4v17M4 7h6"/><path d="M17 4v17M14 4h6"/></svg>',
    comfort:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="11" width="18" height="7" rx="2"/><path d="M7 11V8a2 2 0 012-2h6a2 2 0 012 2v3"/></svg>',
    cleanliness:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 3l1.8 5.5L19 10l-5.2 1.5L12 17l-1.8-5.5L5 10l5.2-1.5L12 3z"/></svg>',
    staff:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',
    poolBeach:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M2 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0 4 2 6 0"/><path d="M2 17c2-2 4-2 6 0s4 2 6 0 4-2 6 0 4 2 6 0"/></svg>',
    spaWellness:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 3c-2 3-6 4-6 9a6 6 0 0012 0c0-5-4-6-6-9z"/><path d="M12 18v3"/></svg>',
    generalExperience:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/></svg>',
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
      modSurvey: "Otel ve Uygulama Deneyiminizi Değerlendirin",
      surveyTitle: "Otel ve Uygulama Deneyiminizi Değerlendirin",
      surveyDescription:
        "İstediğiniz başlığı açın; yalnızca o bölümdeki sorular için 1–5 puan verip gönderebilirsiniz. Diğer bölümler isteğe bağlıdır. Yorum eklemek zorunlu değildir.",
      surveyBackToTopics: "Değerlendirme başlıklarına dön",
      surveyVionaHubLabel: "Viona",
      surveySubmitButtonText: "Değerlendirmeyi Gönder",
      surveyThankYouMessage: "Geri bildiriminiz için teşekkür ederiz.",
      surveyErrorFillRatings: "Lütfen bu bölümdeki tüm puanları seçin (1–5).",
      surveyErrorMissingTopics: "Eksik başlıklar: {list}.",
      surveyHubHint:
        "Her başlık ayrı gönderilir. Bir konuyu açıp o konudaki tüm sorulara puan verin; gönderin. Zorunlu değil: diğer başlıkları doldurmak.",
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
      surveyVionaCommentPlaceholder: "Viona asistanı hakkındaki görüşünüzü yazın",
      surveyTabCommentPlaceholder: "{tab} hakkında yorumunuz (opsiyonel)",
      surveyTab_food: "Yemek",
      surveyTab_comfort: "Konfor",
      surveyTab_cleanliness: "Temizlik",
      surveyTab_staff: "Personel",
      surveyTab_poolBeach: "Havuz & Plaj",
      surveyTab_spaWellness: "Spa & Wellness",
      surveyTab_generalExperience: "Genel Deneyim",
      surveyTab_viona: "Viona Asistanı",
      surveyQuestion_food_taste: "Lezzet",
      surveyQuestion_food_variety: "Çeşitlilik",
      surveyQuestion_food_presentation: "Sunum",
      surveyQuestion_room_comfort: "Oda konforu",
      surveyQuestion_bed_comfort: "Yatak rahatlığı",
      surveyQuestion_quietness: "Sessizlik",
      surveyQuestion_room_cleanliness: "Oda temizliği",
      surveyQuestion_common_area_cleanliness: "Ortak alan temizliği",
      surveyQuestion_staff_kindness: "Nezaket",
      surveyQuestion_staff_speed: "Hız",
      surveyQuestion_staff_helpfulness: "Yardımseverlik",
      surveyQuestion_pool_beach_cleanliness: "Temizlik",
      surveyQuestion_pool_beach_access: "Erişim",
      surveyQuestion_pool_beach_satisfaction: "Genel memnuniyet",
      surveyQuestion_spa_quality: "Hizmet kalitesi",
      surveyQuestion_spa_ambience: "Ortam",
      surveyQuestion_spa_satisfaction: "Memnuniyet",
      surveyQuestion_general_satisfaction: "Genel memnuniyet",
      surveyQuestion_return_again: "Tekrar gelir misiniz",
      surveyQuestion_recommend: "Tavsiye eder misiniz",
      surveyQuestion_viona_helpfulness: "Yanıtların faydalı olması",
      surveyQuestion_viona_understanding: "Soruları anlama başarısı",
      surveyQuestion_viona_usability: "Kullanım kolaylığı",
      surveyQuestion_viona_overall: "Genel memnuniyet",
    },
    en: {
      modSurvey: "Rate Your Hotel and App Experience",
      surveyTitle: "Rate Your Hotel and App Experience",
      surveyDescription:
        "Open any topic you want; rate only the questions in that section (1–5) and submit. Other topics are optional. Comments are optional.",
      surveyBackToTopics: "Back to review topics",
      surveyVionaHubLabel: "Viona",
      surveySubmitButtonText: "Submit review",
      surveyThankYouMessage: "Thank you for your feedback.",
      surveyErrorFillRatings: "Please select all scores (1–5) in this section.",
      surveyErrorMissingTopics: "Incomplete sections: {list}.",
      surveyHubHint:
        "Each topic is submitted on its own. Open one, score every question there, and send. You do not need to fill the other topics.",
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
      surveyVionaCommentPlaceholder: "Write your feedback about the Viona assistant",
      surveyTabCommentPlaceholder: "Your comments about {tab} (optional)",
      surveyTab_food: "Food",
      surveyTab_comfort: "Comfort",
      surveyTab_cleanliness: "Cleanliness",
      surveyTab_staff: "Staff",
      surveyTab_poolBeach: "Pool & Beach",
      surveyTab_spaWellness: "Spa & Wellness",
      surveyTab_generalExperience: "General Experience",
      surveyTab_viona: "Viona Assistant",
      surveyQuestion_food_taste: "Taste",
      surveyQuestion_food_variety: "Variety",
      surveyQuestion_food_presentation: "Presentation",
      surveyQuestion_room_comfort: "Room comfort",
      surveyQuestion_bed_comfort: "Bed comfort",
      surveyQuestion_quietness: "Quietness",
      surveyQuestion_room_cleanliness: "Room cleanliness",
      surveyQuestion_common_area_cleanliness: "Common area cleanliness",
      surveyQuestion_staff_kindness: "Courtesy",
      surveyQuestion_staff_speed: "Speed",
      surveyQuestion_staff_helpfulness: "Helpfulness",
      surveyQuestion_pool_beach_cleanliness: "Cleanliness",
      surveyQuestion_pool_beach_access: "Accessibility",
      surveyQuestion_pool_beach_satisfaction: "Overall satisfaction",
      surveyQuestion_spa_quality: "Service quality",
      surveyQuestion_spa_ambience: "Ambience",
      surveyQuestion_spa_satisfaction: "Satisfaction",
      surveyQuestion_general_satisfaction: "Overall satisfaction",
      surveyQuestion_return_again: "Would you come again",
      surveyQuestion_recommend: "Would you recommend us",
      surveyQuestion_viona_helpfulness: "Usefulness of responses",
      surveyQuestion_viona_understanding: "Question understanding",
      surveyQuestion_viona_usability: "Ease of use",
      surveyQuestion_viona_overall: "Overall satisfaction",
    },
    de: {
      modSurvey: "Bewerten Sie Ihr Hotel- und App-Erlebnis",
      surveyTitle: "Bewerten Sie Ihr Hotel- und App-Erlebnis",
      surveyDescription:
        "Öffnen Sie ein beliebiges Thema; bewerten Sie nur die Fragen dort (1–5) und senden Sie ab. Andere Themen sind optional. Kommentare sind freiwillig.",
      surveyBackToTopics: "Zurück zu den Bewertungsthemen",
      surveyVionaHubLabel: "Viona",
      surveySubmitButtonText: "Bewertung senden",
      surveyThankYouMessage: "Vielen Dank für Ihr Feedback.",
      surveyErrorFillRatings: "Bitte in diesem Abschnitt alle Punktwerte (1–5) wählen.",
      surveyErrorMissingTopics: "Noch offen: {list}.",
      surveyHubHint:
        "Jedes Thema wird einzeln gesendet. Eines öffnen, alle Fragen dort bewerten, absenden. Die übrigen Themen sind nicht nötig.",
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
      surveyVionaCommentPlaceholder: "Schreiben Sie Ihr Feedback zum Viona-Assistenten",
      surveyTabCommentPlaceholder: "Ihr Kommentar zu {tab} (optional)",
      surveyTab_food: "Essen",
      surveyTab_comfort: "Komfort",
      surveyTab_cleanliness: "Sauberkeit",
      surveyTab_staff: "Personal",
      surveyTab_poolBeach: "Pool & Strand",
      surveyTab_spaWellness: "Spa & Wellness",
      surveyTab_generalExperience: "Gesamterlebnis",
      surveyTab_viona: "Viona-Assistent",
      surveyQuestion_food_taste: "Geschmack",
      surveyQuestion_food_variety: "Vielfalt",
      surveyQuestion_food_presentation: "Präsentation",
      surveyQuestion_room_comfort: "Zimmerkomfort",
      surveyQuestion_bed_comfort: "Bettkomfort",
      surveyQuestion_quietness: "Ruhe",
      surveyQuestion_room_cleanliness: "Zimmerreinigung",
      surveyQuestion_common_area_cleanliness: "Sauberkeit der Gemeinschaftsbereiche",
      surveyQuestion_staff_kindness: "Freundlichkeit",
      surveyQuestion_staff_speed: "Geschwindigkeit",
      surveyQuestion_staff_helpfulness: "Hilfsbereitschaft",
      surveyQuestion_pool_beach_cleanliness: "Sauberkeit",
      surveyQuestion_pool_beach_access: "Erreichbarkeit",
      surveyQuestion_pool_beach_satisfaction: "Gesamtzufriedenheit",
      surveyQuestion_spa_quality: "Servicequalität",
      surveyQuestion_spa_ambience: "Atmosphäre",
      surveyQuestion_spa_satisfaction: "Zufriedenheit",
      surveyQuestion_general_satisfaction: "Gesamtzufriedenheit",
      surveyQuestion_return_again: "Würden Sie wiederkommen",
      surveyQuestion_recommend: "Würden Sie uns empfehlen",
      surveyQuestion_viona_helpfulness: "Nützlichkeit der Antworten",
      surveyQuestion_viona_understanding: "Verständnis der Fragen",
      surveyQuestion_viona_usability: "Benutzerfreundlichkeit",
      surveyQuestion_viona_overall: "Gesamtzufriedenheit",
    },
    ru: {
      modSurvey: "Оцените ваш опыт отеля и приложения",
      surveyTitle: "Оцените ваш опыт отеля и приложения",
      surveyDescription:
        "Откройте нужный раздел; оцените только вопросы в нём (1–5) и отправьте. Остальные разделы по желанию. Комментарии необязательны.",
      surveyBackToTopics: "Назад к разделам оценки",
      surveyVionaHubLabel: "Viona",
      surveySubmitButtonText: "Отправить оценку",
      surveyThankYouMessage: "Спасибо за ваш отзыв.",
      surveyErrorFillRatings: "Выберите все оценки (1–5) в этом разделе.",
      surveyErrorMissingTopics: "Не заполнено: {list}.",
      surveyHubHint:
        "Каждый раздел отправляется отдельно. Откройте один, оцените все вопросы в нём и отправьте. Остальные разделы заполнять не обязательно.",
      surveyThankYouSubtext:
        "Раздел сохранён. Форма сброшена; при необходимости оцените снова.",
      surveyConfirmTitle: "Отправить этот раздел?",
      surveyConfirmBody:
        "Оценки по разделу «{tab}» будут сохранены. Остальные разделы можно отправить отдельно.",
      surveyConfirmSend: "Да, отправить",
      surveyConfirmCancel: "Назад",
      surveyConfirmDismiss: "Закрыть подтверждение",
      surveyErrorSubmit: "Произошла ошибка при отправке.",
      surveyScaleHint: "из 5",
      surveyStarWord: "звезд",
      surveyVionaCommentPlaceholder: "Напишите ваш отзыв об ассистенте Viona",
      surveyTabCommentPlaceholder: "Ваш комментарий о {tab} (необязательно)",
      surveyTab_food: "Питание",
      surveyTab_comfort: "Комфорт",
      surveyTab_cleanliness: "Чистота",
      surveyTab_staff: "Персонал",
      surveyTab_poolBeach: "Бассейн и пляж",
      surveyTab_spaWellness: "Спа и wellness",
      surveyTab_generalExperience: "Общий опыт",
      surveyTab_viona: "Ассистент Viona",
      surveyQuestion_food_taste: "Вкус",
      surveyQuestion_food_variety: "Разнообразие",
      surveyQuestion_food_presentation: "Подача",
      surveyQuestion_room_comfort: "Комфорт номера",
      surveyQuestion_bed_comfort: "Удобство кровати",
      surveyQuestion_quietness: "Тишина",
      surveyQuestion_room_cleanliness: "Чистота номера",
      surveyQuestion_common_area_cleanliness: "Чистота общих зон",
      surveyQuestion_staff_kindness: "Вежливость",
      surveyQuestion_staff_speed: "Скорость",
      surveyQuestion_staff_helpfulness: "Готовность помочь",
      surveyQuestion_pool_beach_cleanliness: "Чистота",
      surveyQuestion_pool_beach_access: "Доступность",
      surveyQuestion_pool_beach_satisfaction: "Общая удовлетворенность",
      surveyQuestion_spa_quality: "Качество сервиса",
      surveyQuestion_spa_ambience: "Атмосфера",
      surveyQuestion_spa_satisfaction: "Удовлетворенность",
      surveyQuestion_general_satisfaction: "Общая удовлетворенность",
      surveyQuestion_return_again: "Вернулись бы снова",
      surveyQuestion_recommend: "Порекомендуете ли вы нас",
      surveyQuestion_viona_helpfulness: "Полезность ответов",
      surveyQuestion_viona_understanding: "Понимание вопросов",
      surveyQuestion_viona_usability: "Удобство использования",
      surveyQuestion_viona_overall: "Общая удовлетворенность",
    },
  };

  function getLangCode() {
    try {
      return localStorage.getItem("viona_lang") || "tr";
    } catch (e) {
      return "tr";
    }
  }

  function tr(key, fallback) {
    var source = typeof I18N !== "undefined" ? I18N : null;
    var code = getLangCode();
    var dict = (source && source[code]) || (source && source.tr) || {};
    if (dict[key] !== undefined && dict[key] !== key) return dict[key];
    var localDict = SURVEY_FALLBACK[code] || SURVEY_FALLBACK.tr;
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

  function tabRatingsComplete(tab) {
    return tab.questions.every(function (q) {
      var v = tab.isViona ? state.vionaAnswers[q.id] : state.hotelAnswers[q.id];
      return isScoreChosen(v);
    });
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
    var activeTab = TAB_BY_ID[state.activeTabId];
    if (!activeTab) return;
    clearSurveyThankYouTimer();
    if (!tabRatingsComplete(activeTab)) {
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
    var activeTab = TAB_BY_ID[tabId];
    if (!activeTab || !tabRatingsComplete(activeTab)) {
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
        (HUB_ICONS[tab.id] || HUB_ICONS.generalExperience) +
        '</span><span class="req-hub__label">' +
        label +
        "</span>";
      btn.addEventListener("click", function () {
        stateApi.setActiveTab(state, tab.id);
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

    var activeTab = TAB_BY_ID[state.activeTabId];
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
    h2.textContent = subId ? tr("surveyTitle", schema.title) : moduleTitle;
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

    stateApi.setActiveTab(state, subId);

    var backHub = el("button", "req-back-hub");
    backHub.type = "button";
    backHub.textContent = tr("surveyBackToTopics", "Değerlendirme başlıklarına dön");
    backHub.addEventListener("click", function () {
      surveyConfirmOpen = false;
      surveyConfirmTabId = null;
      clearSurveyThankYouTimer();
      state.submittedMessage = "";
      state.submittedIsError = false;
      state.submitExtraLine = "";
      setSub(null);
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
