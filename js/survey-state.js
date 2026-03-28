(function () {
  "use strict";

  var TAB_ORDER = [
    "food",
    "comfort",
    "cleanliness",
    "staff",
    "poolBeach",
    "spaWellness",
    "generalExperience",
    "viona",
  ];
  var HOTEL_TABS = TAB_ORDER.slice(0, 7);

  function detectDeviceType() {
    if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) {
      return "mobile";
    }
    return window.innerWidth <= 768 ? "mobile" : "web";
  }

  function getLanguage() {
    try {
      return localStorage.getItem("viona_lang") || "tr";
    } catch (e) {
      return "tr";
    }
  }

  function createInitialState(schema) {
    var hotelAnswers = {};
    var vionaAnswers = {};
    var tabComments = {};

    schema.tabs.forEach(function (tab) {
      tabComments[tab.id] = "";
      tab.questions.forEach(function (q) {
        if (tab.isViona) vionaAnswers[q.id] = 0;
        else hotelAnswers[q.id] = 0;
      });
    });

    return {
      activeTabId: schema.tabs[0].id,
      hotelAnswers: hotelAnswers,
      vionaAnswers: vionaAnswers,
      tabComments: tabComments,
      hotelComment: "",
      vionaComment: "",
      submittedMessage: "",
      /** true = hata metni (kırmızı kutu), false = teşekkür vb. */
      submittedIsError: false,
      /** Başarı sonrası teşekkürün altında gösterilen kısa açıklama (i18n). */
      submitExtraLine: "",
      lastSubmittedPayload: null,
    };
  }

  function setActiveTab(state, tabId) {
    state.activeTabId = tabId;
  }

  function setHotelAnswer(state, questionId, value) {
    state.hotelAnswers[questionId] = Number(value) || 0;
  }

  function setVionaAnswer(state, questionId, value) {
    state.vionaAnswers[questionId] = Number(value) || 0;
  }

  function setHotelComment(state, value) {
    state.hotelComment = value || "";
  }

  function setVionaComment(state, value) {
    state.vionaComment = value || "";
  }

  function setTabComment(state, tabId, value) {
    state.tabComments[tabId] = value || "";
  }

  function average(values) {
    var valid = values.filter(function (n) {
      return Number(n) > 0;
    });
    if (!valid.length) return 0;
    var sum = valid.reduce(function (acc, n) {
      return acc + Number(n);
    }, 0);
    return Number((sum / valid.length).toFixed(2));
  }

  function computeHotelCategories(state, schema) {
    var categories = {};
    schema.tabs.forEach(function (tab) {
      if (tab.isViona) return;
      var vals = tab.questions.map(function (q) {
        return state.hotelAnswers[q.id] || 0;
      });
      categories[tab.id] = average(vals);
    });
    return categories;
  }

  function computeOverallScore(categories) {
    return average(HOTEL_TABS.map(function (id) {
      return categories[id] || 0;
    }));
  }

  function buildPayload(state, schema) {
    var categories = computeHotelCategories(state, schema);
    var hotelCommentParts = [];
    Object.keys(state.tabComments).forEach(function (tabId) {
      if (tabId === "viona") return;
      var txt = String(state.tabComments[tabId] || "").trim();
      if (txt) hotelCommentParts.push(tabId + ": " + txt);
    });
    var payload = {
      submittedAt: new Date().toISOString(),
      overallScore: computeOverallScore(categories),
      hotelCategories: categories,
      hotelAnswers: Object.assign({}, state.hotelAnswers),
      hotelComment: hotelCommentParts.join(" | "),
      vionaRating: Number(state.vionaAnswers.viona_overall || 0),
      vionaAnswers: Object.assign({}, state.vionaAnswers),
      vionaComment: String(state.tabComments.viona || "").trim(),
      deviceType: detectDeviceType(),
      language: getLanguage(),
    };
    return payload;
  }

  /** Gönderilen sekmenin puan ve yorumunu sıfırlar (aynı sekmede yeniden değerlendirme). */
  function resetSubmittedTab(state, schema, tabId) {
    var tab = null;
    schema.tabs.forEach(function (t) {
      if (t.id === tabId) tab = t;
    });
    if (!tab) return;
    if (tab.isViona) {
      tab.questions.forEach(function (q) {
        state.vionaAnswers[q.id] = 0;
      });
    } else {
      tab.questions.forEach(function (q) {
        state.hotelAnswers[q.id] = 0;
      });
    }
    state.tabComments[tabId] = "";
  }

  /** Yalnızca seçilen sekmenin puanları; diğer bölümler gönderilmez (çoklu gönderim). */
  function buildPayloadForTab(state, schema, tabId) {
    var tab = null;
    schema.tabs.forEach(function (t) {
      if (t.id === tabId) tab = t;
    });
    if (!tab) throw new Error("invalid_survey_tab");

    var hotelAnswers = {};
    var vionaAnswers = {};
    var hotelCategories = {};

    if (tab.isViona) {
      tab.questions.forEach(function (q) {
        vionaAnswers[q.id] = state.vionaAnswers[q.id];
      });
    } else {
      tab.questions.forEach(function (q) {
        hotelAnswers[q.id] = state.hotelAnswers[q.id];
      });
      var vals = tab.questions.map(function (q) {
        return state.hotelAnswers[q.id] || 0;
      });
      hotelCategories[tab.id] = average(vals);
    }

    var hotelCommentParts = [];
    if (!tab.isViona) {
      var txt = String(state.tabComments[tab.id] || "").trim();
      if (txt) hotelCommentParts.push(tab.id + ": " + txt);
    }

    var overallScore = 0;
    if (tab.isViona) {
      overallScore = average(
        tab.questions.map(function (q) {
          return state.vionaAnswers[q.id] || 0;
        })
      );
    } else {
      overallScore = hotelCategories[tab.id] || 0;
    }

    return {
      submittedAt: new Date().toISOString(),
      overallScore: overallScore,
      hotelCategories: hotelCategories,
      hotelAnswers: hotelAnswers,
      hotelComment: hotelCommentParts.join(" | "),
      vionaRating: tab.isViona ? Number(state.vionaAnswers.viona_overall || 0) : 0,
      vionaAnswers: vionaAnswers,
      vionaComment: tab.isViona ? String(state.tabComments.viona || "").trim() : "",
      deviceType: detectDeviceType(),
      language: getLanguage(),
      submittedTabId: tabId,
      partialSubmission: true,
    };
  }

  window.SurveyState = {
    createInitialState: createInitialState,
    setActiveTab: setActiveTab,
    setHotelAnswer: setHotelAnswer,
    setVionaAnswer: setVionaAnswer,
    setHotelComment: setHotelComment,
    setVionaComment: setVionaComment,
    setTabComment: setTabComment,
    buildPayload: buildPayload,
    buildPayloadForTab: buildPayloadForTab,
    resetSubmittedTab: resetSubmittedTab,
  };
})();
