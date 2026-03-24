(function () {
  "use strict";

  async function submitSurvey(payload, opts) {
    var options = opts || {};
    if (typeof options.onBeforeSubmit === "function") {
      options.onBeforeSubmit(payload);
    }

    var cfg = window.VIONA_API_CONFIG || {};
    var endpoint = cfg.surveysEndpoint || "/api/surveys";
    var response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    });
    var data = await response.json();

    if (!response.ok || !data || data.ok !== true || !data.id) {
      throw new Error((data && data.error) || "survey_submit_failed");
    }

    return {
      ok: true,
      id: String(data.id),
    };
  }

  window.SurveySubmit = {
    submitSurvey: submitSurvey,
  };
})();
