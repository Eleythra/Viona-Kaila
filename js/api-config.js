/**
 * Genel API endpoint yapılandırması.
 *
 * Üretim (Vercel vb.): daima göreli "/api". Tarayıcı aynı kökene istek atar; kökendeki
 * vercel.json rewrites "/api/*" → Render Node tek adresi. Başka dosyada Render URL
 * tekrarlamayın — sadece vercel.json destination.
 * Vercel Project Settings → Root Directory boş / repo kökü olmalı (vercel.json yüklensin).
 *
 * İstisna: başka hostta statik dosya veya özel proxy yoksa, bu scriptten önce
 *   window.__VIONA_API_BASE__ = "https://tam-api-adresiniz/api";
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
  var custom = window.__VIONA_API_BASE__;
  var base;
  if (typeof custom === "string" && custom.trim()) {
    base = custom.trim().replace(/\/+$/, "");
  } else if (isLocalhost || isFile) {
    base = "http://127.0.0.1:3001/api";
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
