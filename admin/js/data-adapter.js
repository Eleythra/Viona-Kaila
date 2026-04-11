(function () {
  "use strict";
  var ADMIN_TOKEN_KEY = "viona_admin_api_token";

  function getApiBase() {
    if (typeof document !== "undefined" && document.documentElement) {
      var domAttr = document.documentElement.getAttribute("data-viona-live-api");
      if (domAttr && String(domAttr).trim()) {
        return String(domAttr).trim().replace(/\/+$/, "");
      }
    }
    if (typeof window.vionaGetApiBase === "function") {
      return window.vionaGetApiBase();
    }
    var custom = window.__VIONA_API_BASE__;
    if (typeof custom === "string" && custom.trim()) {
      return custom.trim().replace(/\/+$/, "");
    }
    var c = window.VIONA_API_CONFIG || {};
    if (c.baseUrl && String(c.baseUrl).trim()) {
      return String(c.baseUrl).trim().replace(/\/+$/, "");
    }
    return "/api";
  }

  /** Liste GET ile aynı kök. */
  function adminRequestsCollectionUrl() {
    return getApiBase() + "/admin/requests";
  }

  /** Tüm admin API çağrılarında yalnızca Authorization (proxy loglarında gereksiz tekrar yok). */
  function mergeAuthHeaders(base) {
    var h = Object.assign({}, base || {});
    var token = getAdminToken();
    if (token) h.Authorization = "Bearer " + token;
    return h;
  }

  function jfetch(url, options) {
    var opts = options ? Object.assign({}, options) : {};
    opts.headers = mergeAuthHeaders(opts.headers);
    var m = String(opts.method || "GET").toUpperCase();
    if (m === "GET" && !opts.cache) {
      opts.cache = "no-store";
    }
    return fetch(url, opts)
      .then(async function (r) {
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
      })
      .catch(function (err) {
        try {
          var safe = typeof url === "string" ? url.split("?")[0] : "request";
          if (typeof console !== "undefined" && console.warn) {
            console.warn("[viona] admin API isteği başarısız:", safe, err && err.name ? err.name : err);
          }
        } catch (_e) {}
        throw err;
      });
  }

  function getAdminToken() {
    try {
      return String(sessionStorage.getItem(ADMIN_TOKEN_KEY) || "").trim();
    } catch (_e) {
      return "";
    }
  }

  function setAdminToken(token) {
    var value = String(token || "").trim();
    if (!value) return;
    try {
      sessionStorage.setItem(ADMIN_TOKEN_KEY, value);
    } catch (_e) {}
  }

  function clearAdminToken() {
    try {
      sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    } catch (_e) {}
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
    setAdminToken: setAdminToken,
    clearAdminToken: clearAdminToken,
    hasAdminToken: function () {
      return Boolean(getAdminToken());
    },
    validateAdminToken: function () {
      return jfetch(getApiBase() + "/admin/auth/validate").then(function () {
        return true;
      });
    },
    getDashboardReport: async function () {
      var data = await jfetch(getApiBase() + "/admin/reports/dashboard");
      return data.report;
    },
    getSurveyReport: function (params) {
      var q = buildQuery(params || {});
      var url = getApiBase() + "/admin/surveys/report" + (q ? "?" + q : "");
      return jfetch(url).then(function (d) {
        return d.report;
      });
    },
    getBucketPage: function (type, page, pageSize, extraQuery) {
      var base = {
        type: type,
        page: page,
        pageSize: pageSize,
      };
      var q = buildQuery(Object.assign(base, extraQuery || {}));
      var endpoint = adminRequestsCollectionUrl() + "?" + q;
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
    /** HK / Teknik operasyon üst özet kartı; liste ile aynı süzgeç parametreleri (from, to, room_number, status). */
    getBucketTypeSummary: function (type, extraQuery) {
      var o = Object.assign({ type: type }, extraQuery || {});
      var q = buildQuery(o);
      var url = adminRequestsCollectionUrl() + "/bucket-type-summary" + (q ? "?" + q : "");
      return jfetch(url).then(function (d) {
        if (d && d.summary != null) return d.summary;
        return null;
      });
    },
    /** Tek misafir operasyon kaydı (tam panel / derin bağlantı). */
    getBucketItem: function (type, id) {
      var url =
        adminRequestsCollectionUrl() +
        "/" +
        encodeURIComponent(type) +
        "/" +
        encodeURIComponent(id);
      return jfetch(url).then(function (d) {
        return d && d.item != null ? d.item : null;
      });
    },
    getFrontOfficeSummary: function (extraQuery) {
      var q = buildQuery(extraQuery || {});
      var url = adminRequestsCollectionUrl() + "/front-summary" + (q ? "?" + q : "");
      return jfetch(url).then(function (d) {
        return d.summary || null;
      });
    },
    getFrontOfficeTypeSummary: function (type, extraQuery) {
      var o = Object.assign({ type: type }, extraQuery || {});
      var q = buildQuery(o);
      return jfetch(adminRequestsCollectionUrl() + "/front-type-summary?" + q).then(function (d) {
        if (!d || typeof d !== "object") return null;
        if (d.summary != null) return d.summary;
        if (d.data && d.data.summary != null) return d.data.summary;
        return null;
      });
    },
    getOpsTeamEntryUrls: function () {
      return jfetch(getApiBase() + "/admin/ops-team-entry-urls");
    },
    /** @returns {{ items: array, truncated: boolean }} truncated: sunucudaki toplam sayfa sayısı maxPages üstündeyse. */
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
      return { items: all, truncated: totalPages > cap };
    },
    createGuestRequest: function (payload) {
      return jfetch(getApiBase() + "/guest-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || {}),
      });
    },
    /** Operasyon WhatsApp (Cloud API) numaralarına kaydı yeniden ilet (istek / şikâyet / arıza / misafir bildirimi / geç çıkış). */
    resendWhatsappOperational: function (type, id) {
      var url =
        adminRequestsCollectionUrl() +
        "/" +
        encodeURIComponent(type) +
        "/" +
        encodeURIComponent(id) +
        "/whatsapp-resend";
      return jfetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    },
    /** Operasyon WhatsApp özeti: kök zaten …/api; burada /health → sunucuda /api/health. */
    getWhatsappAdminDiagnostics: function () {
      return jfetch(getApiBase() + "/health").then(function (d) {
        return { operational: (d && d.whatsappOperational) || {}, healthOk: Boolean(d && d.ok) };
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
      }).then(function (d) {
        try {
          if (typeof BroadcastChannel !== "undefined") {
            var c = new BroadcastChannel("viona-ops-mutations");
            c.postMessage({ t: Date.now(), v: 1, source: "admin-panel", type: type });
            c.close();
          }
        } catch (_e) {}
        return d;
      });
    },
    patchSatisfaction: function (type, id, payload) {
      var endpoint =
        adminRequestsCollectionUrl() +
        "/" +
        encodeURIComponent(type) +
        "/" +
        encodeURIComponent(id) +
        "/satisfaction";
      return jfetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || {}),
      }).then(function (d) {
        return d.item;
      });
    },
    deleteItem: function (type, id) {
      var endpoint =
        adminRequestsCollectionUrl() + "/" + encodeURIComponent(type) + "/" + encodeURIComponent(id);
      return jfetch(endpoint, { method: "DELETE" }).then(function (d) {
        try {
          if (typeof BroadcastChannel !== "undefined") {
            var c = new BroadcastChannel("viona-ops-mutations");
            c.postMessage({ t: Date.now(), v: 1, source: "admin-panel-delete", type: type });
            c.close();
          }
        } catch (_e) {}
        return d;
      });
    },
    downloadPdfReport: async function (params) {
      var query = buildQuery(params || {});
      var url = getApiBase() + "/admin/reports/pdf" + (query ? "?" + query : "");
      var response = await fetch(url, { cache: "no-store", headers: mergeAuthHeaders() });
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
      var query = buildQuery(params || {});
      var url = getApiBase() + "/admin/logs/summary" + (query ? "?" + query : "");
      return jfetch(url).then(function (d) {
        return d.summary || {};
      });
    },
    getLogs: function (params) {
      var query = buildQuery(params || {});
      var url = getApiBase() + "/admin/logs" + (query ? "?" + query : "");
      return jfetch(url).then(function (d) {
        return { items: d.items || [], pagination: d.pagination || {} };
      });
    },
    reviewLog: function (id, payload) {
      var endpoint = getApiBase() + "/admin/logs/" + encodeURIComponent(id) + "/review";
      return jfetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || {}),
      }).then(function (d) {
        return d.item;
      });
    },
    deleteLog: function (id) {
      var endpoint = getApiBase() + "/admin/logs/" + encodeURIComponent(id);
      return jfetch(endpoint, { method: "DELETE" });
    },
    deleteLogsBulk: function (ids) {
      var list = Array.isArray(ids) ? ids : [];
      return jfetch(getApiBase() + "/admin/logs/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: list }),
      }).then(function (d) {
        return { deleted: d.deleted != null ? d.deleted : 0, ids: d.ids || [] };
      });
    },
    downloadLogsCsv: async function (params) {
      var query = buildQuery(params || {});
      var url = getApiBase() + "/admin/logs/export.csv" + (query ? "?" + query : "");
      var r = await fetch(url, { cache: "no-store", headers: mergeAuthHeaders() });
      if (!r.ok) throw new Error("logs_csv_export_failed");
      return r.blob();
    },
    downloadLogsJson: async function (params) {
      var query = buildQuery(params || {});
      var url = getApiBase() + "/admin/logs/export.json" + (query ? "?" + query : "");
      var r = await fetch(url, { cache: "no-store", headers: mergeAuthHeaders() });
      if (!r.ok) throw new Error("logs_json_export_failed");
      return r.blob();
    },
  };
})();
