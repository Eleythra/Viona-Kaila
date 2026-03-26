(function () {
  "use strict";

  var cfg = window.VIONA_API_CONFIG || {};

  function jfetch(url, options) {
    return fetch(url, options).then(async function (r) {
      var text = await r.text();
      var d = null;
      try {
        d = text ? JSON.parse(text) : null;
      } catch (_e) {
        d = null;
      }
      if (!r.ok || !d || d.ok === false) {
        var msg = (d && d.error) || ("http_" + r.status);
        throw new Error(msg);
      }
      return d;
    });
  }

  function buildQuery(params) {
    var q = new URLSearchParams();
    Object.keys(params || {}).forEach(function (k) {
      var v = params[k];
      if (v == null || v === "") return;
      q.set(k, String(v));
    });
    return q.toString();
  }

  var mockReport = {
    kpis: { totalChats: 340, fallbackRate: 12.4, overallSatisfaction: 4.32, vionaSatisfaction: 4.05 },
    chatbotPerformance: {
      totalChats: 340,
      dailyUsage: [{ date: "2026-03-20", count: 45 }, { date: "2026-03-21", count: 53 }, { date: "2026-03-22", count: 40 }],
      avgMessagesPerUser: 4.8,
      avgConversationLength: 4.8,
      fallbackRate: 12.4,
      topQuestions: [{ key: "restoran saatleri", count: 26 }, { key: "wifi şifresi", count: 22 }],
    },
    satisfaction: {
      overallScore: 4.32,
      vionaScore: 4.05,
      categories: { food: 4.2, comfort: 4.4, cleanliness: 4.5, staff: 4.3, poolBeach: 4.1, spaWellness: 4.0, generalExperience: 4.35 },
    },
    unansweredQuestions: {
      fallbackCount: 42,
      topFallbackQuestions: [{ key: "havaalanı transfer ücreti", count: 11 }, { key: "late checkout fiyatı", count: 8 }],
      repeatedUnanswered: [{ key: "havaalanı transfer ücreti", count: 11 }],
    },
    conversion: {
      actionClicksByType: { spa: 44, restaurant: 30, activity: 19, transfer: 12 },
      actionClicks: 105,
      actionConversions: 28,
      actionConversionRate: 26.67,
      chatToConversionRate: 8.24,
    },
    dataSources: { chatLogs: false, actions: false, surveys: true, usedMockFallback: true },
  };

  window.AdminDataAdapter = {
    getDashboardReport: async function () {
      try {
        var data = await jfetch(cfg.adminDashboardReportEndpoint || "/api/admin/reports/dashboard");
        return data.report;
      } catch (_e) {
        return mockReport;
      }
    },
    getBucket: function (type) {
      var endpoint = (cfg.adminRequestsEndpoint || "/api/admin/requests") + "?type=" + encodeURIComponent(type) + "&page=1&pageSize=100";
      return jfetch(endpoint).then(function (d) { return d.items || []; });
    },
    createGuestRequest: function (payload) {
      var endpoint = cfg.guestRequestsEndpoint || "/api/guest-requests";
      return jfetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || {}),
      });
    },
    updateStatus: function (type, id, status) {
      var endpoint = (cfg.baseUrl || "/api") + "/admin/requests/" + encodeURIComponent(type) + "/" + encodeURIComponent(id) + "/status";
      return jfetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: status }),
      });
    },
    deleteItem: function (type, id) {
      var endpoint = (cfg.baseUrl || "/api") + "/admin/requests/" + encodeURIComponent(type) + "/" + encodeURIComponent(id);
      return jfetch(endpoint, { method: "DELETE" });
    },
    getPromoConfig: function () {
      return jfetch(cfg.adminPromoConfigEndpoint || "/api/admin/promo-config").then(function (d) { return d.config; });
    },
    savePromoConfig: function (payload) {
      return jfetch(cfg.adminPromoConfigEndpoint || "/api/admin/promo-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || {}),
      }).then(function (d) { return d.config; });
    },
    downloadPdfReport: async function (params) {
      var endpoint = cfg.adminPdfReportEndpoint || "/api/admin/reports/pdf";
      var query = buildQuery(params || {});
      var url = endpoint + (query ? "?" + query : "");
      var response = await fetch(url);
      if (!response.ok) {
        var msg = "pdf_report_failed";
        try {
          var e = await response.json();
          msg = (e && e.error) || msg;
        } catch (_ignore) {}
        throw new Error(msg);
      }
      var blob = await response.blob();
      var cd = response.headers.get("Content-Disposition") || "";
      var match = cd.match(/filename=\"?([^\";]+)\"?/i);
      var fileName = (match && match[1]) || "viona-raporu.pdf";
      var noData = String(response.headers.get("X-Viona-No-Data") || "") === "1";
      return { blob: blob, fileName: fileName, noData: noData };
    },
  };
})();
