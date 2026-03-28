(function () {
  "use strict";

  var cfg = window.VIONA_API_CONFIG || {};

  /** Liste GET ile aynı kök; baseUrl + '/admin/requests' sapmasını önler. */
  function adminRequestsCollectionUrl() {
    var ep = cfg.adminRequestsEndpoint || "/api/admin/requests";
    var q = ep.indexOf("?");
    return q >= 0 ? ep.slice(0, q) : ep;
  }

  function jfetch(url, options) {
    var opts = options ? Object.assign({}, options) : {};
    var m = String(opts.method || "GET").toUpperCase();
    if (m === "GET" && !opts.cache) {
      opts.cache = "no-store";
    }
    return fetch(url, opts).then(async function (r) {
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

  window.AdminDataAdapter = {
    getDashboardReport: async function () {
      var data = await jfetch(cfg.adminDashboardReportEndpoint || "/api/admin/reports/dashboard");
      return data.report;
    },
    getSurveyReport: function (params) {
      var q = buildQuery(params || {});
      var base = cfg.adminSurveyReportEndpoint || "/api/admin/surveys/report";
      var url = base + (q ? "?" + q : "");
      return jfetch(url).then(function (d) {
        return d.report;
      });
    },
    /** Tek sayfa; sunucu en fazla 500 satır döner. */
    getBucketPage: function (type, page, pageSize) {
      var q = buildQuery({
        type: type,
        page: page,
        pageSize: pageSize,
      });
      var endpoint = (cfg.adminRequestsEndpoint || "/api/admin/requests") + "?" + q;
      return jfetch(endpoint).then(function (d) {
        return {
          items: d.items || [],
          pagination: d.pagination || {
            page: page || 1,
            pageSize: pageSize || 20,
            total: (d.items || []).length,
            totalPages: 1,
          },
        };
      });
    },
    /**
     * Dashboard özeti / rezervasyon tahtası: 500’lük sayfaları birleştirir.
     * Üst sınır app.js içindeki BUCKET_MERGE_MAX_PAGES ile uyumlu olmalı (varsayılan 100 sayfa ≈ 50k satır).
     */
    getBucketMergeAll: async function (type, maxPages) {
      var pageSize = 500;
      var cap = typeof maxPages === "number" && maxPages > 0 ? maxPages : 100;
      var all = [];
      var page = 1;
      var totalPages = 1;
      do {
        var d = await this.getBucketPage(type, page, pageSize);
        all = all.concat(d.items || []);
        totalPages = (d.pagination && d.pagination.totalPages) || 1;
        page++;
      } while (page <= totalPages && page <= cap);
      return all;
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
      var endpoint =
        adminRequestsCollectionUrl() +
        "/" +
        encodeURIComponent(type) +
        "/" +
        encodeURIComponent(id) +
        "/status";
      return jfetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: status }),
      });
    },
    deleteItem: function (type, id) {
      var endpoint =
        adminRequestsCollectionUrl() + "/" + encodeURIComponent(type) + "/" + encodeURIComponent(id);
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
      var response = await fetch(url, { cache: "no-store" });
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
      var reportSnapshotId = String(response.headers.get("X-Viona-Report-Snapshot-Id") || "").trim();
      return { blob: blob, fileName: fileName, noData: noData, reportSnapshotId: reportSnapshotId };
    },
    getLogsSummary: function (params) {
      var endpoint = cfg.adminLogsSummaryEndpoint || "/api/admin/logs/summary";
      var query = buildQuery(params || {});
      var url = endpoint + (query ? "?" + query : "");
      return jfetch(url).then(function (d) {
        return d.summary || {};
      });
    },
    getLogs: function (params) {
      var endpoint = cfg.adminLogsEndpoint || "/api/admin/logs";
      var query = buildQuery(params || {});
      var url = endpoint + (query ? "?" + query : "");
      return jfetch(url).then(function (d) {
        return { items: d.items || [], pagination: d.pagination || {} };
      });
    },
    reviewLog: function (id, payload) {
      var endpoint = (cfg.adminLogsEndpoint || "/api/admin/logs") + "/" + encodeURIComponent(id) + "/review";
      return jfetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || {}),
      }).then(function (d) {
        return d.item;
      });
    },
    deleteLog: function (id) {
      var endpoint = (cfg.adminLogsEndpoint || "/api/admin/logs") + "/" + encodeURIComponent(id);
      return jfetch(endpoint, { method: "DELETE" });
    },
    downloadLogsCsv: async function (params) {
      var endpoint = cfg.adminLogsExportCsvEndpoint || "/api/admin/logs/export.csv";
      var query = buildQuery(params || {});
      var url = endpoint + (query ? "?" + query : "");
      var r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error("logs_csv_export_failed");
      return r.blob();
    },
    downloadLogsJson: async function (params) {
      var endpoint = cfg.adminLogsExportJsonEndpoint || "/api/admin/logs/export.json";
      var query = buildQuery(params || {});
      var url = endpoint + (query ? "?" + query : "");
      var r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error("logs_json_export_failed");
      return r.blob();
    },
  };
})();
