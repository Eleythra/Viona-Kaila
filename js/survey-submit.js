(function () {
  "use strict";

  function submitSurvey(payload, opts) {
    var options = opts || {};
    if (typeof options.onBeforeSubmit === "function") {
      options.onBeforeSubmit(payload);
    }

    // Supabase entegrasyonunda bu fonksiyon doğrudan insert çağrısına bağlanabilir.
    console.log("survey_payload", payload);

    return Promise.resolve({
      ok: true,
      message: "mock_submitted",
      payload: payload,
    });
  }

  window.SurveySubmit = {
    submitSurvey: submitSurvey,
  };
})();
