/**
 * Genel API endpoint yapılandırması.
 * Localde backend 3001, prod ortamda /api altı kullanılır.
 *
 * Admin panel veri eşlemesi (özet):
 * - Ana sayfa raporu: adminDashboardReportEndpoint → varsayılan son ~30 gün (tarih parametresi yoksa).
 * - Operasyon özetleri: adminRequestsEndpoint sayfalı GET (birleştirme admin/js/app.js).
 * - Değerlendirmeler: adminSurveyReportEndpoint + isteğe bağlı ?from=&to=.
 * - Loglar / dışa aktarma: adminLogs* uçları.
 * - Reklamlar: adminPromoConfigEndpoint.
 */
(function () {
  "use strict";

  var isFile = window.location.protocol === "file:";
  var isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  /** file:// veya localhost: admin ayrı origin; API 3001. Aynı origin prod'da /api yeterli. */
  var base = isLocalhost || isFile ? "http://127.0.0.1:3001/api" : "/api";

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
    adminLogsEndpoint: base + "/admin/logs",
    adminLogsSummaryEndpoint: base + "/admin/logs/summary",
    adminLogsExportCsvEndpoint: base + "/admin/logs/export.csv",
    adminLogsExportJsonEndpoint: base + "/admin/logs/export.json",
  };
})();
