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

  var SURVEY_FALLBACK = {
    tr: {
      modSurvey: "Otel ve Uygulama Deneyiminizi Değerlendirin",
      surveyTitle: "Otel ve Uygulama Deneyiminizi Değerlendirin",
      surveyDescription:
        "Konaklamanız ve Viona asistanı hakkındaki görüşlerinizi paylaşın. Geri bildiriminiz hizmet kalitemizi geliştirmemize yardımcı olur.",
      surveyBackToTopics: "Değerlendirme başlıklarına dön",
      surveyVionaHubLabel: "Uygulamayı Değerlendirin",
      surveySubmitButtonText: "Değerlendirmeyi Gönder",
      surveyThankYouMessage: "Geri bildiriminiz için teşekkür ederiz.",
      surveyErrorFillRatings: "Lütfen tüm puanlamaları tamamlayın.",
      surveyErrorSubmit: "Gönderim sırasında bir hata oluştu.",
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
        "Share your feedback about your stay and the Viona assistant. Your input helps us improve our service quality.",
      surveyBackToTopics: "Back to review topics",
      surveyVionaHubLabel: "Rate the App",
      surveySubmitButtonText: "Submit Review",
      surveyThankYouMessage: "Thank you for your feedback.",
      surveyErrorFillRatings: "Please complete all ratings.",
      surveyErrorSubmit: "An error occurred while submitting.",
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
        "Teilen Sie Ihr Feedback zu Ihrem Aufenthalt und zum Viona-Assistenten. Ihre Rückmeldung hilft uns, unsere Servicequalität zu verbessern.",
      surveyBackToTopics: "Zurück zu den Bewertungsthemen",
      surveyVionaHubLabel: "App bewerten",
      surveySubmitButtonText: "Bewertung senden",
      surveyThankYouMessage: "Vielen Dank für Ihr Feedback.",
      surveyErrorFillRatings: "Bitte füllen Sie alle Bewertungen aus.",
      surveyErrorSubmit: "Beim Senden ist ein Fehler aufgetreten.",
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
        "Поделитесь мнением о проживании и ассистенте Viona. Ваш отзыв помогает нам улучшать качество сервиса.",
      surveyBackToTopics: "Назад к разделам оценки",
      surveyVionaHubLabel: "Оценить приложение",
      surveySubmitButtonText: "Отправить оценку",
      surveyThankYouMessage: "Спасибо за ваш отзыв.",
      surveyErrorFillRatings: "Пожалуйста, заполните все оценки.",
      surveyErrorSubmit: "Произошла ошибка при отправке.",
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

  function createScoreButtons(value, onSelect) {
    var wrap = el("div", "survey-score");
    for (var i = 1; i <= 5; i++) {
      var b = el("button", "survey-score__btn" + (value === i ? " is-active" : ""));
      b.type = "button";
      b.textContent = String(i);
      b.setAttribute("aria-pressed", value === i ? "true" : "false");
      b.addEventListener("click", onSelect.bind(null, i));
      wrap.appendChild(b);
    }
    return wrap;
  }

  function createStars(value, onSelect) {
    var wrap = el("div", "survey-stars");
    wrap.setAttribute("role", "radiogroup");
    for (var i = 1; i <= 5; i++) {
      var s = el("button", "survey-stars__btn" + (i <= value ? " is-active" : ""));
      s.type = "button";
      s.setAttribute("role", "radio");
      s.setAttribute("aria-checked", i === value ? "true" : "false");
      s.setAttribute("aria-label", i + " " + tr("surveyStarWord", "star"));
      s.textContent = "★";
      s.addEventListener("click", onSelect.bind(null, i));
      wrap.appendChild(s);
    }
    return wrap;
  }

  function hasAllRatingsSelected() {
    var allFilled = true;
    schema.tabs.forEach(function (tab) {
      tab.questions.forEach(function (q) {
        var v = tab.isViona ? state.vionaAnswers[q.id] : state.hotelAnswers[q.id];
        if (!Number(v)) allFilled = false;
      });
    });
    return allFilled;
  }

  function renderQuestionRow(tab, question) {
    var row = el("div", "survey-q-row");
    var title = el("p", "survey-q-row__title");
    title.textContent = questionLabel(question);
    row.appendChild(title);

    if (tab.isViona) {
      row.appendChild(
        createStars(state.vionaAnswers[question.id] || 0, function (val) {
          stateApi.setVionaAnswer(state, question.id, val);
          state.submittedMessage = "";
          renderActiveSection();
        })
      );
    } else {
      row.appendChild(
        createScoreButtons(state.hotelAnswers[question.id] || 0, function (val) {
          stateApi.setHotelAnswer(state, question.id, val);
          state.submittedMessage = "";
          renderActiveSection();
        })
      );
    }
    return row;
  }

  function renderTabPanel(tab) {
    var panel = el("section", "survey-panel" + (tab.isViona ? " survey-panel--viona" : ""));
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
    });
    panel.appendChild(tabComment);

    return panel;
  }

  function submitCurrentState() {
    if (!hasAllRatingsSelected()) {
      state.submittedMessage = tr("surveyErrorFillRatings", "Lütfen tüm puanlamaları tamamlayın.");
      renderActiveSection();
      return;
    }
    var payload = stateApi.buildPayload(state, schema);
    submitApi
      .submitSurvey(payload)
      .then(function () {
        state.lastSubmittedPayload = payload;
        state.submittedMessage = tr("surveyThankYouMessage", schema.thankYouMessage);
        renderActiveSection();
      })
      .catch(function () {
        state.submittedMessage = tr("surveyErrorSubmit", "Gönderim sırasında bir hata oluştu.");
        renderActiveSection();
      });
  }

  function getTabsOrdered() {
    var map = {};
    schema.tabs.forEach(function (tab) {
      map[tab.id] = tab;
    });
    return HUB_ORDER.map(function (id) {
      return map[id];
    }).filter(Boolean);
  }

  function renderHub(container, setSub) {
    var orderedTabs = getTabsOrdered();
    var hub = el("div", "survey-hub");
    orderedTabs.forEach(function (tab) {
      var btn = el("button", "req-hub__card");
      btn.type = "button";
      var label = tab.id === "viona" ? tr("surveyVionaHubLabel", "Uygulamayı Değerlendirin") : tabLabel(tab);
      btn.innerHTML =
        '<span class="req-hub__icon" aria-hidden="true">' +
        (HUB_ICONS[tab.id] || HUB_ICONS.generalExperience) +
        '</span><span class="req-hub__label">' +
        label +
        "</span>";
      btn.addEventListener("click", function () {
        stateApi.setActiveTab(state, tab.id);
        state.submittedMessage = "";
        setSub(tab.id);
      });
      hub.appendChild(btn);
    });
    container.appendChild(hub);
  }

  function renderActiveSection() {
    var panelMount = document.querySelector("#survey-active-section");
    if (!panelMount) return;
    panelMount.innerHTML = "";

    var activeTab = schema.tabs.find(function (tab) {
      return tab.id === state.activeTabId;
    });
    if (!activeTab) return;

    var card = el("section", "survey-card");
    card.appendChild(renderTabPanel(activeTab));

    var submitBtn = el("button", "btn-primary survey-submit survey-submit--main");
    submitBtn.type = "button";
    submitBtn.textContent = tr("surveySubmitButtonText", schema.submitButtonText);
    submitBtn.addEventListener("click", submitCurrentState);
    card.appendChild(submitBtn);

    if (state.submittedMessage) {
      var ok = el("p", "survey-success");
      ok.textContent = state.submittedMessage;
      card.appendChild(ok);
    }

    panelMount.appendChild(card);
  }

  function renderSurveyModule(container, subId, api) {
    api = api || {};
    var setSub = api.setSub || function () {};
    var moduleTitle = api.moduleTitle || tr("modSurvey", "Bizi Değerlendirin");
    container.innerHTML = "";

    var wrap = el("div", "survey-wrap");
    var h2 = el("h2", "");
    h2.textContent = subId ? tr("surveyTitle", schema.title) : moduleTitle;
    wrap.appendChild(h2);

    if (!subId) {
      var intro = el("p", "req-intro");
      intro.textContent = tr("surveyDescription", schema.description);
      wrap.appendChild(intro);
      renderHub(wrap, setSub);
      container.appendChild(wrap);
      return;
    }

    var backHub = el("button", "req-back-hub");
    backHub.type = "button";
    backHub.textContent = tr("surveyBackToTopics", "Değerlendirme başlıklarına dön");
    backHub.addEventListener("click", function () {
      setSub(null);
    });
    wrap.appendChild(backHub);

    var mount = el("div", "");
    mount.id = "survey-active-section";
    wrap.appendChild(mount);
    container.appendChild(wrap);
    renderActiveSection();
  }

  window.renderSurveyModule = renderSurveyModule;
})();
