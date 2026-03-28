/**
 * Genel API endpoint yapılandırması.
 * Localde backend 3001, prod ortamda /api altı kullanılır.
 *
 * Vercel statik deploy: /api için edge proxy her projede çalışmayabilir (Root Directory, 404).
 * *.vercel.app üzerinde API doğrudan Render backend'e gider (CORS sunucuda açık olmalı).
 *
 * İsteğe bağlı: sayfada bu scriptten önce
 *   window.__VIONA_API_BASE__ = "https://backend.example.com/api";
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
  var host = String(window.location.hostname || "");
  var isVercelPreviewOrApp = host.indexOf("vercel.app") !== -1;
  /** Canlı Node API (Render); Vercel statik sitede /api yoksa buna düşülür. */
  var RENDER_API_BASE = "https://viona-kaila.onrender.com/api";

  var custom = window.__VIONA_API_BASE__;
  var base;
  if (typeof custom === "string" && custom.trim()) {
    base = custom.trim().replace(/\/+$/, "");
  } else if (isLocalhost || isFile) {
    base = "http://127.0.0.1:3001/api";
  } else if (isVercelPreviewOrApp) {
    base = RENDER_API_BASE;
  } else {
    base = "/api";
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
    adminPromoConfigEndpoint: base + "/admin/promo-config",
    adminLogsEndpoint: base + "/admin/logs",
    adminLogsSummaryEndpoint: base + "/admin/logs/summary",
    adminLogsExportCsvEndpoint: base + "/admin/logs/export.csv",
    adminLogsExportJsonEndpoint: base + "/admin/logs/export.json",
  };
})();
