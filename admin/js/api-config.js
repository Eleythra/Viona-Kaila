/**
 * Genel API endpoint yapılandırması.
 *
 * Canlıda taban: js/viona-backend-url.js → __VIONA_NODE_RENDER_API__ (boşsa `/api` → vercel.json → Hetzner Node). Vercel
 * rewrites bazen uygulanmaz (x-render-routing: no-server, /api 404); doğrudan Node daha güvenilir.
 * Tamamen elle: window.__VIONA_API_BASE__ bu scriptten önce.
 *
 * Admin panel veri eşlemesi (özet):
 * - Ana sayfa raporu: adminDashboardReportEndpoint → varsayılan son ~30 gün (tarih parametresi yoksa).
 * - Operasyon özetleri: adminRequestsEndpoint sayfalı GET (birleştirme admin/js/app.js).
 * - Değerlendirmeler: adminSurveyReportEndpoint + isteğe bağlı ?from=&to=.
 * - Loglar / dışa aktarma: adminLogs* uçları.
 */
(function () {
  "use strict";

  var isFile = window.location.protocol === "file:";
  var isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  var custom = window.__VIONA_API_BASE__;
  var base;
  if (typeof custom === "string" && custom.trim()) {
    base = custom.trim().replace(/\/+$/, "");
  } else if (isLocalhost || isFile) {
    base = "http://127.0.0.1:3001/api";
  } else {
    var nodeBase = window.__VIONA_NODE_RENDER_API__;
    if (typeof nodeBase === "string" && nodeBase.trim()) {
      base = nodeBase.trim().replace(/\/+$/, "");
    } else {
      base = "/api";
    }
  }

  window.VIONA_API_CONFIG = {
    baseUrl: base,
    guestRequestsEndpoint: base + "/guest-requests",
    surveysEndpoint: base + "/surveys",
    adminRequestsEndpoint: base + "/admin/requests",
    adminSurveysEndpoint: base + "/admin/surveys",
    adminSurveyReportEndpoint: base + "/admin/surveys/report",
    adminDashboardReportEndpoint: base + "/admin/reports/dashboard",
    adminPdfReportEndpoint: base + "/admin/reports/pdf",
    adminLogsEndpoint: base + "/admin/logs",
    adminLogsSummaryEndpoint: base + "/admin/logs/summary",
    adminLogsExportCsvEndpoint: base + "/admin/logs/export.csv",
    adminLogsExportJsonEndpoint: base + "/admin/logs/export.json",
  };
})();
