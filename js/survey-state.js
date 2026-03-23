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

  window.SurveyState = {
    createInitialState: createInitialState,
    setActiveTab: setActiveTab,
    setHotelAnswer: setHotelAnswer,
    setVionaAnswer: setVionaAnswer,
    setHotelComment: setHotelComment,
    setVionaComment: setVionaComment,
    setTabComment: setTabComment,
    buildPayload: buildPayload,
  };
})();
