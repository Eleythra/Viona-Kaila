/**
 * Genel API endpoint yapılandırması.
 * Localde backend 3001, prod ortamda /api altı kullanılır.
 */
(function () {
  "use strict";

  var isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  var base = isLocalhost ? "http://localhost:3001/api" : "/api";

  window.VIONA_API_CONFIG = {
    baseUrl: base,
    guestRequestsEndpoint: base + "/guest-requests",
    surveysEndpoint: base + "/surveys",
    adminRequestsEndpoint: base + "/admin/requests",
    adminSurveysEndpoint: base + "/admin/surveys",
    adminSurveyReportEndpoint: base + "/admin/surveys/report",
    adminDashboardReportEndpoint: base + "/admin/reports/dashboard",
    adminPdfReportEndpoint: base + "/admin/reports/pdf",
    adminPromoConfigEndpoint: base + "/admin/promo-config",
  };
})();
