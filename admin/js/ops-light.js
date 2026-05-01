(function () {
  "use strict";

  var PAGE_SIZE = 50;
  var OPS_MUTATION_BC = "viona-ops-mutations";
  var opsCrossTabBc = null;
  var opsVisListenerWired = false;

  function postOpsMutation() {
    try {
      if (typeof BroadcastChannel === "undefined") return;
      var c = new BroadcastChannel(OPS_MUTATION_BC);
      c.postMessage({ t: Date.now(), v: 1, source: "ops-light" });
      c.close();
    } catch (_e) {}
  }

  function wireOpsCrossTabListRefresh(reloader) {
    window.__vionaOpsVisReload = reloader;
    if (!opsVisListenerWired) {
      opsVisListenerWired = true;
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) return;
        if (typeof window.__vionaOpsVisReload === "function") void window.__vionaOpsVisReload();
      });
    }
    try {
      if (opsCrossTabBc) {
        opsCrossTabBc.close();
        opsCrossTabBc = null;
      }
      opsCrossTabBc = new BroadcastChannel(OPS_MUTATION_BC);
      opsCrossTabBc.onmessage = function () {
        if (document.hidden) return;
        if (typeof reloader === "function") void reloader();
      };
    } catch (_e) {}
  }

  function getRole() {
    return String(document.body.getAttribute("data-viona-ops-role") || "").trim();
  }

  var TITLES = {
    hk: "HK Operasyon",
    tech: "Teknik Operasyon",
    front: "Ön büro Operasyon",
  };

  var OP_FRONT_TAB_KEY = "viona_op_front_tab";

  function sessionKey() {
    return "viona_ops_link_" + getRole();
  }

  function getApiBase() {
    if (typeof document !== "undefined" && document.documentElement) {
      var domAttr = document.documentElement.getAttribute("data-viona-live-api");
      if (domAttr && String(domAttr).trim()) {
        return String(domAttr).trim().replace(/\/+$/, "");
      }
    }
    if (typeof window.vionaGetApiBase === "function") {
      return String(window.vionaGetApiBase() || "").replace(/\/+$/, "");
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

  function getToken() {
    try {
      return String(sessionStorage.getItem(sessionKey()) || "").trim();
    } catch (_e) {
      return "";
    }
  }

  function setToken(t) {
    try {
      sessionStorage.setItem(sessionKey(), String(t || "").trim());
    } catch (_e) {}
  }

  function clearToken() {
    try {
      sessionStorage.removeItem(sessionKey());
    } catch (_e) {}
  }

  function escHtml(s) {
    var d = document.createElement("div");
    d.textContent = String(s || "");
    return d.innerHTML;
  }

  function opsFetch(pathWithQuery, options) {
    var base = getApiBase().replace(/\/+$/, "");
    var url = base + "/ops" + pathWithQuery;
    var opts = options ? Object.assign({}, options) : {};
    opts.headers = Object.assign({}, opts.headers || {});
    var surface = getRole();
    if (surface) opts.headers["X-Viona-Ops-Page"] = surface;
    var tok = getToken();
    if (tok) {
      opts.headers["X-Ops-Token"] = tok;
      opts.headers["Authorization"] = "Bearer " + tok;
    }
    var m = String(opts.method || "GET").toUpperCase();
    if (m === "GET" && !opts.cache) opts.cache = "no-store";
    return fetch(url, opts).then(async function (r) {
      var text = await r.text();
      var d = null;
      try {
        d = text ? JSON.parse(text) : null;
      } catch (_e) {
        d = null;
      }
      if (!r.ok || !d || d.ok === false) {
        var msg = (d && d.error) || "http_" + r.status;
        throw new Error(msg);
      }
      return d;
    });
  }

  function opsWhatsappResend(itemType, id) {
    return opsFetch(
      "/requests/" +
        encodeURIComponent(itemType) +
        "/" +
        encodeURIComponent(id) +
        "/whatsapp-resend",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      },
    );
  }

  /** Admin `data-adapter.getBucketPage` ile aynı sorgu şekli; yetki `opsFetch` (ops token). */
  function opsLightBuildRequestsQuery(base, extraQuery) {
    var o = Object.assign({}, base, extraQuery || {});
    var qs = new URLSearchParams();
    Object.keys(o).forEach(function (k) {
      var v = o[k];
      if (v == null || v === "") return;
      qs.set(k, String(v));
    });
    return qs.toString();
  }

  function opsLightGetBucketPage(type, page, pageSize, extraQuery) {
    var base = { type: type, page: String(page), pageSize: String(pageSize) };
    var qs = opsLightBuildRequestsQuery(base, extraQuery);
    return opsFetch("/requests?" + qs).then(function (d) {
      return {
        items: (d && d.items) || [],
        pagination: (d && d.pagination) || {
          page: page,
          pageSize: pageSize,
          total: ((d && d.items) || []).length,
          totalPages: 1,
        },
      };
    });
  }

  async function opsLightGetBucketMergeAll(type, maxPages, extraQuery) {
    var pageSize = 500;
    var cap = typeof maxPages === "number" && maxPages > 0 ? maxPages : 100;
    var q = extraQuery && typeof extraQuery === "object" ? extraQuery : {};
    var all = [];
    var page = 1;
    var totalPages = 1;
    do {
      var d = await opsLightGetBucketPage(type, page, pageSize, q);
      all = all.concat(d.items || []);
      totalPages = (d.pagination && d.pagination.totalPages) || 1;
      page++;
    } while (page <= totalPages && page <= cap);
    return { items: all, truncated: totalPages > cap };
  }

  var opsLightPdfAdapter = { getBucketMergeAll: opsLightGetBucketMergeAll };
  var opsLightPdfDownloadInFlight = false;
  /** Son mount tarafından PDF liste süzgeci için atanır (durum / metin araması). */
  var opsLightPdfMergeQuery = null;

  function readSlYmdForPdf(rolePrefix) {
    var day = document.getElementById(rolePrefix + "-filter-day");
    var y =
      day && day.value && /^\d{4}-\d{2}-\d{2}$/.test(String(day.value).trim())
        ? String(day.value).trim()
        : String(slCalDay || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(y)) y = hotelCalYmdSl(new Date());
    return y;
  }

  function wireOpsLightPdfOnce() {
    var role = getRole();
    var variant =
      role === "hk" ? "hk" : role === "tech" ? "tech" : role === "front" ? "front" : "";
    if (!variant) return;
    var btnId =
      variant === "hk" ? "op-hk-pdf" : variant === "tech" ? "op-tech-pdf" : "op-front-pdf";
    var el = document.getElementById(btnId);
    if (!el || el.dataset.vionaPdfBound === "1") return;
    el.dataset.vionaPdfBound = "1";
    el.addEventListener(
      "click",
      function (ev) {
        if (ev) {
          ev.preventDefault();
          ev.stopPropagation();
        }
        void downloadOpsLightPdf(variant);
      },
      false,
    );
  }

  async function downloadOpsLightPdf(variant) {
    if (opsLightPdfDownloadInFlight) return;
    if (!window.VionaOpsDayPdf || typeof window.VionaOpsDayPdf.download !== "function") {
      window.alert("PDF modülü yüklenemedi; sayfayı yenileyin.");
      return;
    }
    var btnId =
      variant === "hk" ? "op-hk-pdf" : variant === "tech" ? "op-tech-pdf" : "op-front-pdf";
    var btn = document.getElementById(btnId);
    var prefix = variant === "hk" ? "op-hk" : variant === "tech" ? "op-tech" : "op-front";
    var ymd = readSlYmdForPdf(prefix);
    opsLightPdfDownloadInFlight = true;
    if (btn) btn.disabled = true;
    try {
      await window.VionaOpsDayPdf.download({
        variant: variant,
        ymd: ymd,
        adapter: opsLightPdfAdapter,
        mergeListQuery: typeof opsLightPdfMergeQuery === "function" ? opsLightPdfMergeQuery : undefined,
      });
    } catch (e) {
      window.alert(formatErr(e));
    } finally {
      opsLightPdfDownloadInFlight = false;
      if (btn) btn.disabled = false;
    }
  }

  /** # sonrası tam metin OPS_LINK_TOKEN_* ile birebir aynı olmalı (kısa veya uzun fark etmez). */
  function absorbHashToken() {
    var h = String(window.location.hash || "");
    if (h.length <= 1) return;
    var raw = h.slice(1);
    try {
      raw = decodeURIComponent(raw);
    } catch (_e) {}
    raw = String(raw || "").trim();
    if (!raw) {
      try {
        history.replaceState(null, "", window.location.pathname + window.location.search);
      } catch (_e) {}
      return;
    }
    setToken(raw);
    try {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    } catch (_e) {}
  }

  /**
   * WhatsApp / bazı uygulama tarayıcıları # parçasını düşürür; sunucu loglarına gitmez (yalnızca tarayıcı).
   * Örnek: ops-hk.html?k=ANAHTAR veya ?token= / ?t=
   */
  function absorbQueryToken() {
    try {
      var u = new URL(window.location.href);
      var raw = u.searchParams.get("k") || u.searchParams.get("token") || u.searchParams.get("t");
      if (!raw) return;
      raw = String(raw).trim();
      if (!raw) return;
      setToken(raw);
      u.searchParams.delete("k");
      u.searchParams.delete("token");
      u.searchParams.delete("t");
      var qs = u.searchParams.toString();
      var path = u.pathname + (qs ? "?" + qs : "") + (u.hash || "");
      history.replaceState(null, "", path);
    } catch (_e) {}
  }

  function absorbTokensFromUrl() {
    absorbHashToken();
    if (!getToken()) absorbQueryToken();
  }

  function showGateBusy() {
    var busy = document.getElementById("ops-login-busy");
    var form = document.getElementById("ops-login-form");
    if (busy) busy.classList.remove("hidden");
    if (form) form.classList.add("hidden");
  }

  function showGateForm() {
    var busy = document.getElementById("ops-login-busy");
    var form = document.getElementById("ops-login-form");
    if (busy) busy.classList.add("hidden");
    if (form) form.classList.remove("hidden");
  }

  function showLogin() {
    var login = document.getElementById("ops-login");
    var app = document.getElementById("ops-app");
    if (login) login.classList.remove("hidden");
    if (app) app.classList.add("hidden");
    try {
      document.body.classList.remove("admin-body--app");
    } catch (_e) {}
  }

  function showApp() {
    var login = document.getElementById("ops-login");
    var app = document.getElementById("ops-app");
    if (login) login.classList.add("hidden");
    if (app) app.classList.remove("hidden");
    /* admin-body--app: yalnızca index.html kabuğu (sidebar + ana içerik ızgarası) içindir.
     * ops-*.html'de eklenirse body height:100dvh + overflow:hidden olur; mobilde sayfa aşağı kaymaz. */
  }

  async function validateRole() {
    var d = await opsFetch("/auth/validate");
    var expected = getRole();
    if (d.role !== expected) {
      throw new Error("wrong_ops_token");
    }
    return true;
  }

  function parseDeepUuidQuery(paramName) {
    try {
      var id = String(new URL(window.location.href).searchParams.get(paramName || "id") || "").trim();
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          id,
        )
      ) {
        return "";
      }
      return id.toLowerCase();
    } catch (_e) {
      return "";
    }
  }

  function hkDeepLinkUuid() {
    return parseDeepUuidQuery("id");
  }

  function techDeepLinkUuid() {
    return parseDeepUuidQuery("id");
  }

  function frontDeepLinkParams() {
    try {
      var u = new URL(window.location.href);
      var type = String(u.searchParams.get("type") || "")
        .trim()
        .toLowerCase();
      if (type !== "complaint" && type !== "guest_notification" && type !== "late_checkout") return null;
      var id = parseDeepUuidQuery("id");
      if (!id) return null;
      return { type: type, id: id };
    } catch (_e2) {
      return null;
    }
  }

  /** WhatsApp derin URL: tam listeye geçince adres çubuğunu sadeleştirir. */
  function stripOpsDeepQueryKeys(keys) {
    try {
      var u = new URL(window.location.href);
      (keys || []).forEach(function (k) {
        if (k) u.searchParams.delete(String(k));
      });
      var qs = u.searchParams.toString();
      history.replaceState(null, "", u.pathname + (qs ? "?" + qs : "") + (u.hash || ""));
    } catch (_e) {}
  }

  /** WhatsApp «panelde aç»: yalnızca tek kayıt kartı (metin/link yok; tam liste için adres çubuğundan ?id= kaldırılır). */
  function waPanelCardOnlyMountHtml() {
    return (
      '<div class="ops-wa-card-only glass-block" role="region" aria-label="Operasyon kaydı">' +
      '<div id="ops-wa-single-card-host" class="ops-wa-single-card-host"></div>' +
      "</div>"
    );
  }

  function waBucketStatusButtonLabels(bucketType) {
    if (bucketType === "late_checkout") return ["Bekliyor", "Yapılıyor", "Onaylandı", "Onaylanmadı"];
    return ["Bekliyor", "Yapılıyor", "Yapıldı", "Yapılmadı"];
  }

  function paintWaSingleCard(ui, host, bucketType, item, handlers) {
    if (!host || !ui || typeof ui.renderOperationBucket !== "function") return;
    ui.renderOperationBucket(host, {
      bucketType: bucketType,
      rows: [item],
      pagination: null,
      highlightRowId: String(item.id || ""),
      editableRowId: String(item.id || ""),
      layout: "cards",
      buttonLabels: waBucketStatusButtonLabels(bucketType),
      summaryRow: function (r) {
        return typeof ui.operationSummaryForType === "function" ? ui.operationSummaryForType(bucketType, r) : "—";
      },
      onPage: null,
      onStatus: handlers.onStatus,
    });
  }

  function normAdminIssueStatus(row) {
    var st = String((row && row.status) || "new")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
    if (st === "inprogress") return "in_progress";
    return st;
  }

  function countOpsKanbanStatus(rows) {
    var bekliyor = 0;
    var yapiliyor = 0;
    var yapildi = 0;
    var yapilmadi = 0;
    var iptal = 0;
    var diger = 0;
    (rows || []).forEach(function (r) {
      var st = normAdminIssueStatus(r);
      if (st === "new" || st === "pending") bekliyor++;
      else if (st === "in_progress") yapiliyor++;
      else if (st === "done") yapildi++;
      else if (st === "rejected") yapilmadi++;
      else if (st === "cancelled") iptal++;
      else diger++;
    });
    return {
      bekliyor: bekliyor,
      yapiliyor: yapiliyor,
      yapildi: yapildi,
      yapilmadi: yapilmadi,
      iptal: iptal,
      diger: diger,
      toplam: (rows || []).length,
    };
  }

  function normalizeFrontTypeSummary(resp) {
    if (!resp || typeof resp !== "object") {
      return { filtered: false, bekliyor: 0, islemde: 0, yapildi: 0, yapilmadi: 0, iptal: 0, toplam: 0 };
    }
    if (String(resp.mode || "").trim() === "filtered") {
      return {
        filtered: true,
        bekliyor: 0,
        islemde: 0,
        yapildi: 0,
        yapilmadi: 0,
        iptal: Number(resp.iptal) || 0,
        toplam: Number(resp.toplam) || 0,
      };
    }
    return {
      filtered: false,
      bekliyor: Number(resp.bekliyor) || 0,
      islemde: Number(resp.islemde) || 0,
      yapildi: Number(resp.yapildi) || 0,
      yapilmadi: Number(resp.yapilmadi) || 0,
      iptal: Number(resp.iptal) || 0,
      toplam: Number(resp.toplam) || 0,
    };
  }

  function mergeNormFrontTypes(c, gn, lc) {
    var digerCount =
      (Number(c.digerCount) || 0) +
      (Number(gn.digerCount) || 0) +
      (Number(lc.digerCount) || 0);
    var out = {
      mode: c.filtered || gn.filtered || lc.filtered ? "mixed" : "full",
      bekliyor: c.bekliyor + gn.bekliyor + lc.bekliyor,
      islemde: c.islemde + gn.islemde + lc.islemde,
      yapildi: c.yapildi + gn.yapildi + lc.yapildi,
      yapilmadi: c.yapilmadi + gn.yapilmadi + lc.yapilmadi,
      iptal: c.iptal + gn.iptal + lc.iptal,
      toplam: c.toplam + gn.toplam + lc.toplam,
      digerCount: digerCount,
      byType: {
        complaint: c,
        guest_notification: gn,
        late_checkout: lc,
      },
    };
    var sumParts =
      out.bekliyor +
      out.islemde +
      out.yapildi +
      out.yapilmadi +
      out.iptal +
      digerCount;
    if (out.toplam > 0 && sumParts !== out.toplam) {
      out._statusSumMismatch = true;
    }
    return out;
  }

  function validateOpsSummaryParts(n) {
    if (!n || n.filtered) return n;
    var dig = Number(n.digerCount) || 0;
    var s =
      (Number(n.bekliyor) || 0) +
      (Number(n.islemde) || 0) +
      (Number(n.yapildi) || 0) +
      (Number(n.yapilmadi) || 0) +
      (Number(n.iptal) || 0) +
      dig;
    var t = Number(n.toplam) || 0;
    if (t > 0 && s !== t) {
      n._statusSumMismatch = true;
    } else {
      delete n._statusSumMismatch;
    }
    return n;
  }

  function enrichFrontTypeSummaryWithPack(apiRaw, pack) {
    var n = normalizeFrontTypeSummary(apiRaw);
    if (!pack || typeof pack !== "object") return validateOpsSummaryParts(n);
    if (n.filtered) return n;
    var listTotal = Number((pack.pagination && pack.pagination.total) || 0) || 0;
    if (listTotal <= 0) return validateOpsSummaryParts(n);
    if (n.toplam !== listTotal) {
      n.toplam = listTotal;
    }
    var pages = Math.max(1, Number((pack.pagination && pack.pagination.totalPages) || 1));
    var items = pack.items || [];
    var apiMissing = apiRaw == null || typeof apiRaw !== "object";
    var sumParts = n.bekliyor + n.islemde + n.yapildi + n.yapilmadi + n.iptal;
    var fullSinglePage = pages === 1 && items.length === listTotal && listTotal > 0;
    if (fullSinglePage) {
      var k = countOpsKanbanStatus(items);
      n.bekliyor = k.bekliyor;
      n.islemde = k.yapiliyor;
      n.yapildi = k.yapildi;
      n.yapilmadi = k.yapilmadi;
      n.iptal = k.iptal;
      n.digerCount = k.diger;
      n.toplam = listTotal;
      n._reconciledFromList = true;
      delete n._multiPageList;
    } else {
      delete n._reconciledFromList;
      if (pages > 1) {
        n._multiPageList = true;
      } else {
        delete n._multiPageList;
      }
      if ((apiMissing || sumParts === 0) && items.length > 0) {
        var k2 = countOpsKanbanStatus(items);
        n.bekliyor = k2.bekliyor;
        n.islemde = k2.yapiliyor;
        n.yapildi = k2.yapildi;
        n.yapilmadi = k2.yapilmadi;
        n.iptal = k2.iptal;
        n.digerCount = k2.diger;
      }
    }
    return validateOpsSummaryParts(n);
  }

  var OP_HOTEL_TZ_SL = "Europe/Istanbul";
  var OP_DAY_STRIP_COUNT_SL = 14;
  var OP_DAY_STORAGE_KEY_SL = "viona_op_selected_calendar_day";
  var OP_FOLLOW_TODAY_KEY_SL = "viona_op_follow_hotel_today";
  var slCalDay = "";
  var slFollowToday = true;
  var slStripMini = {};
  var slStripBoundMount = null;

  function hotelCalYmdSl(date) {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: OP_HOTEL_TZ_SL,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date);
    } catch (_e) {
      return new Date().toISOString().slice(0, 10);
    }
  }

  function enumerateSlDays(count) {
    var want = Math.max(1, Math.min(31, Number(count) || 14));
    var out = [];
    var t = Date.now();
    var guard = 0;
    while (out.length < want && guard < 2000) {
      var ymd = hotelCalYmdSl(new Date(t));
      if (out.length === 0 || ymd !== out[out.length - 1]) {
        out.push(ymd);
      }
      t -= 4 * 60 * 60 * 1000;
      guard++;
    }
    return out;
  }

  function ymdToTrDotsSl(ymd) {
    var p = String(ymd || "").trim().split("-");
    if (p.length !== 3) return String(ymd || "");
    return p[2] + "." + p[1] + "." + p[0];
  }

  function persistSlDay() {
    try {
      sessionStorage.setItem(OP_DAY_STORAGE_KEY_SL, slCalDay);
      sessionStorage.setItem(OP_FOLLOW_TODAY_KEY_SL, slFollowToday ? "1" : "0");
    } catch (_e) {}
  }

  function initSlDayFromStorage() {
    var today = hotelCalYmdSl(new Date());
    var strip = enumerateSlDays(OP_DAY_STRIP_COUNT_SL);
    var allowed = {};
    strip.forEach(function (s) {
      allowed[s] = true;
    });
    try {
      var sy = String(sessionStorage.getItem(OP_DAY_STORAGE_KEY_SL) || "").trim();
      var sf = String(sessionStorage.getItem(OP_FOLLOW_TODAY_KEY_SL) || "1");
      if (sy && /^\d{4}-\d{2}-\d{2}$/.test(sy) && allowed[sy]) {
        slFollowToday = sf !== "0";
        slCalDay = slFollowToday ? today : sy;
        return;
      }
    } catch (_e) {}
    slCalDay = today;
    slFollowToday = true;
  }

  function maybeAdvanceSlToday() {
    var today = hotelCalYmdSl(new Date());
    if (slFollowToday && slCalDay !== today) {
      slCalDay = today;
      persistSlDay();
      syncSlFilterDayForPrefix(getRole() === "hk" ? "op-hk" : getRole() === "tech" ? "op-tech" : "op-front");
    }
  }

  function slChipSubLine(ymd, todayY, yesterdayY) {
    if (ymd === todayY) return "Bugün";
    if (ymd === yesterdayY) return "Dün";
    try {
      var p = ymd.split("-").map(Number);
      var d = new Date(Date.UTC(p[0], p[1] - 1, p[2], 12, 0, 0));
      return new Intl.DateTimeFormat("tr-TR", {
        timeZone: OP_HOTEL_TZ_SL,
        weekday: "short",
        day: "numeric",
        month: "short",
      }).format(d);
    } catch (_e2) {
      return ymd;
    }
  }

  function opStripChipStatsHtmlSl(bek, isl, yap) {
    var b = Number(bek) || 0;
    var i = Number(isl) || 0;
    var y = Number(yap) || 0;
    return (
      '<span class="op-chip-stats op-chip-stats--triple">' +
      '<span class="op-chip-stats__it" title="Bekleyen kayıtlar">' +
      '<span class="op-chip-stats__lbl">Bekleyen</span><strong>' +
      String(b) +
      "</strong></span>" +
      '<span class="op-chip-stats__sep" aria-hidden="true">·</span>' +
      '<span class="op-chip-stats__it" title="Şu an işlemde">' +
      '<span class="op-chip-stats__lbl">Yapılıyor</span><strong>' +
      String(i) +
      "</strong></span>" +
      '<span class="op-chip-stats__sep" aria-hidden="true">·</span>' +
      '<span class="op-chip-stats__it" title="Tamamlanan">' +
      '<span class="op-chip-stats__lbl">Yapıldı</span><strong>' +
      String(y) +
      "</strong></span>" +
      "</span>"
    );
  }

  function summaryToStripLineSl(sum) {
    if (!sum || typeof sum !== "object") {
      return { line: "— · — · —", lineHtml: "", title: "" };
    }
    if (String(sum.mode || "").trim() === "filtered") {
      var t = Number(sum.toplam) || 0;
      return {
        line: "Σ " + t,
        lineHtml:
          '<span class="op-chip-stats op-chip-stats--sigma"><span class="op-chip-stats__it" title="Durum süzgeci seçili">Σ<strong>' +
          String(t) +
          "</strong></span></span>",
        title: "Durum süzgeci seçili; yalnızca toplam gösterilir.",
      };
    }
    var bek = Number(sum.bekliyor) || 0;
    var isl = Number(sum.islemde) || 0;
    var yap = Number(sum.yapildi) || 0;
    var red = Number(sum.yapilmadi) || 0;
    var ipt = Number(sum.iptal) || 0;
    return {
      line: bek + " · " + isl + " · " + yap,
      lineHtml: opStripChipStatsHtmlSl(bek, isl, yap),
      title:
        "Bekleyen: " +
        bek +
        " · Yapılıyor: " +
        isl +
        " · Yapıldı: " +
        yap +
        " · Yapılmadı: " +
        red +
        (ipt ? " · İptal: " + ipt : ""),
    };
  }

  function mergeFrontStripLineSl(c, gn, lc) {
    function parts(s) {
      if (!s || typeof s !== "object") return [0, 0, 0, 0, 0];
      if (String(s.mode || "").trim() === "filtered") return [0, 0, 0, 0, 0];
      return [
        Number(s.bekliyor) || 0,
        Number(s.islemde) || 0,
        Number(s.yapildi) || 0,
        Number(s.yapilmadi) || 0,
        Number(s.iptal) || 0,
      ];
    }
    var a = parts(c);
    var b = parts(gn);
    var d = parts(lc);
    var bT = a[0] + b[0] + d[0];
    var iT = a[1] + b[1] + d[1];
    var yT = a[2] + b[2] + d[2];
    var rT = a[3] + b[3] + d[3];
    var iptT = a[4] + b[4] + d[4];
    return {
      line: bT + " · " + iT + " · " + yT,
      lineHtml: opStripChipStatsHtmlSl(bT, iT, yT),
      title:
        "Ön büro toplamı — Bekleyen: " +
        bT +
        " · Yapılıyor: " +
        iT +
        " · Yapıldı: " +
        yT +
        " · Yapılmadı: " +
        rT +
        (iptT ? " · İptal: " + iptT : ""),
    };
  }

  function syncSlFilterDayForPrefix(prefix) {
    var y = String(slCalDay || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(y)) y = hotelCalYmdSl(new Date());
    var el = document.getElementById(prefix + "-filter-day");
    if (el) el.value = y;
  }

  function renderSlDayStrip(stripElId) {
    var el = document.getElementById(stripElId);
    if (!el) return;
    var days = enumerateSlDays(OP_DAY_STRIP_COUNT_SL);
    var todayY = days[0] || hotelCalYmdSl(new Date());
    var yesterdayY = days.length > 1 ? days[1] : "";
    var sel = String(slCalDay || "").trim() || todayY;
    var parts = [];
    days.forEach(function (ymd) {
      var active = ymd === sel;
      var sub = slChipSubLine(ymd, todayY, yesterdayY);
      var m = slStripMini[ymd];
      var miniLine = m && m.line ? m.line : "…";
      var miniTitle = m && m.title ? m.title : "";
      var miniInner =
        m && m.lineHtml
          ? '<span class="op-day-strip__chip-mini" title="' + escHtml(miniTitle) + '">' + m.lineHtml + "</span>"
          : '<span class="op-day-strip__chip-mini" title="' + escHtml(miniTitle) + '">' + escHtml(miniLine) + "</span>";
      parts.push(
        '<button type="button" class="op-day-strip__chip' +
          (active ? " is-active" : "") +
          '" data-op-day="' +
          escHtml(ymd) +
          '" role="option" aria-selected="' +
          (active ? "true" : "false") +
          '"><span class="op-day-strip__chip-date">' +
          escHtml(ymdToTrDotsSl(ymd)) +
          '</span><span class="op-day-strip__chip-sub">' +
          escHtml(sub) +
          "</span>" +
          miniInner +
          "</button>",
      );
    });
    el.innerHTML = parts.join("");
  }

  function slEventClickTargetElement(ev) {
    var t = ev && ev.target;
    if (!t) return null;
    if (t.nodeType === 1) return t;
    return t.parentElement || null;
  }

  function wireSlDayStrip(mountRoot, stripElId, onPick) {
    if (!mountRoot || mountRoot.dataset.slStripBound) return;
    mountRoot.dataset.slStripBound = "1";
    mountRoot.addEventListener("click", function (ev) {
      var el = slEventClickTargetElement(ev);
      var chip = el && typeof el.closest === "function" ? el.closest(".op-day-strip__chip") : null;
      if (!chip || !mountRoot.contains(chip)) return;
      var ymd = chip.getAttribute("data-op-day") || "";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return;
      var todayY = hotelCalYmdSl(new Date());
      slCalDay = ymd;
      slFollowToday = ymd === todayY;
      persistSlDay();
      syncSlFilterDayForPrefix(getRole() === "hk" ? "op-hk" : getRole() === "tech" ? "op-tech" : "op-front");
      renderSlDayStrip(stripElId);
      if (typeof onPick === "function") onPick();
    });
  }

  async function refreshSlStripMini(mode) {
    var days = enumerateSlDays(OP_DAY_STRIP_COUNT_SL);
    slStripMini = {};
    try {
      if (mode === "request" || mode === "fault") {
        await Promise.all(
          days.map(function (ymd) {
            var q =
              "?type=" +
              encodeURIComponent(mode) +
              "&from=" +
              encodeURIComponent(ymd) +
              "&to=" +
              encodeURIComponent(ymd);
            return opsFetch("/requests/bucket-type-summary" + q)
              .then(function (d) {
                slStripMini[ymd] = summaryToStripLineSl(d && d.summary != null ? d.summary : null);
              })
              .catch(function () {
                slStripMini[ymd] = { line: "—", lineHtml: "", title: "" };
              });
          }),
        );
      } else if (mode === "front") {
        await Promise.all(
          days.map(function (ymd) {
            var b = "&from=" + encodeURIComponent(ymd) + "&to=" + encodeURIComponent(ymd);
            return Promise.all([
              opsFetch("/requests/front-type-summary?type=complaint" + b).catch(function () {
                return null;
              }),
              opsFetch("/requests/front-type-summary?type=guest_notification" + b).catch(function () {
                return null;
              }),
              opsFetch("/requests/front-type-summary?type=late_checkout" + b).catch(function () {
                return null;
              }),
            ]).then(function (triple) {
              var c = triple[0] && triple[0].summary != null ? triple[0].summary : null;
              var gn = triple[1] && triple[1].summary != null ? triple[1].summary : null;
              var lc = triple[2] && triple[2].summary != null ? triple[2].summary : null;
              slStripMini[ymd] = mergeFrontStripLineSl(c, gn, lc);
            });
          }),
        );
      }
    } catch (_e) {
    } finally {
      renderSlDayStrip(
        getRole() === "hk" ? "op-hk-day-strip" : getRole() === "tech" ? "op-tech-day-strip" : "op-front-day-strip",
      );
    }
  }

  function opsLightDayStripHint(rolePrefix) {
    if (rolePrefix === "op-front") {
      return (
        "Üç sekme (şikâyet, misafir bildirimi, geç çıkış) aynı güne göre süzülür. <strong>Bugün</strong> seçiliyken tarih otomatik güncellenir."
      );
    }
    return (
      "Yalnızca seçilen günde oluşturulan kayıtlar listelenir. <strong>Bugün</strong> seçiliyken tarih otomatik güncellenir; geçmiş bir gün seçince o gün sabit kalır."
    );
  }

  function opsLightPdfBtnHtml(rolePrefix) {
    var titleRaw =
      rolePrefix === "op-hk"
        ? "Seçili günün HK özeti PDF"
        : rolePrefix === "op-tech"
          ? "Seçili günün teknik özeti PDF"
          : "Seçili günün ön büro özeti PDF";
    var id = rolePrefix + "-pdf";
    return (
      '<button type="button" class="btn-small op-day-pdf-btn" id="' +
      id +
      '" title="' +
      escHtml(titleRaw) +
      '">PDF indir</button>'
    );
  }

  function opsLightDayStripWrap(rolePrefix) {
    return (
      '<div class="op-day-strip-wrap glass-block" aria-label="Kayıt günü">' +
      '<div class="op-day-strip-wrap__head">' +
      '<div class="op-day-strip-wrap__head-text">' +
      '<span class="op-day-strip-wrap__title">Gün seçimi</span>' +
      '<span class="op-day-strip-wrap__tz">Otel günü · İstanbul</span>' +
      "</div>" +
      opsLightPdfBtnHtml(rolePrefix) +
      "</div>" +
      '<p class="op-day-strip-wrap__hint">' +
      opsLightDayStripHint(rolePrefix) +
      "</p>" +
      '<div id="' +
      rolePrefix +
      '-day-strip" class="op-day-strip__scroll" role="listbox" aria-label="Gün şeridi"></div>' +
      '<p class="op-day-strip-wrap__legend">' +
      "Şerit: sırayla <strong>Bekleyen</strong>, <strong>Yapılıyor</strong>, <strong>Yapıldı</strong> sayıları. Yapılmadı ve iptal chip üzerinde imleç bekletince açıklamada görünür." +
      "</p></div>"
    );
  }

  function opQueryFromFilter(f) {
    var o = {};
    if (f.status) o.status = f.status;
    if (f.from) o.from = f.from;
    if (f.to) o.to = f.to;
    if (f.search && String(f.search).trim()) o.search = String(f.search).trim().slice(0, 80);
    if (f.room && String(f.room).trim() && !o.search) o.room_number = String(f.room).trim();
    return o;
  }

  function readOpFilterFromDom(prefix) {
    var status = document.getElementById(prefix + "-filter-status");
    var day = document.getElementById(prefix + "-filter-day");
    var room = document.getElementById(prefix + "-filter-room");
    var qSearch = document.getElementById(prefix + "-filter-search");
    var y =
      day && day.value && /^\d{4}-\d{2}-\d{2}$/.test(String(day.value).trim())
        ? String(day.value).trim()
        : String(slCalDay || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(y)) y = hotelCalYmdSl(new Date());
    return {
      status: status && status.value ? status.value : "",
      from: y,
      to: y,
      room: room && room.value ? String(room.value).trim() : "",
      search: qSearch && qSearch.value ? String(qSearch.value).trim().slice(0, 80) : "",
    };
  }

  function clearOpFilterDom(prefix) {
    var status = document.getElementById(prefix + "-filter-status");
    var room = document.getElementById(prefix + "-filter-room");
    var qSearch = document.getElementById(prefix + "-filter-search");
    if (status) status.value = "";
    if (room) room.value = "";
    if (qSearch) qSearch.value = "";
    syncSlFilterDayForPrefix(prefix);
  }

  /** Admin «tab-op-hk» ile aynı filtre çubuğu (id’ler app.js ile uyumlu). */
  function hkFilterBarHtml() {
    return (
      '<div class="op-filter-bar glass-block" id="op-hk-filters" role="search" aria-label="HK operasyon filtreleri">' +
      '<div class="op-filter-bar__row">' +
      '<label class="op-filter-field"><span class="op-filter-field__lbl">Durum</span>' +
      '<select id="op-hk-filter-status" class="op-filter-input">' +
      '<option value="">Tüm kayıtlar</option>' +
      '<option value="pending">Bekliyor</option>' +
      '<option value="in_progress">Yapılıyor</option>' +
      '<option value="done">Yapıldı</option>' +
      '<option value="rejected">Yapılmadı</option>' +
      '<option value="cancelled">İptal</option>' +
      "</select></label>" +
      '<label class="op-filter-field op-filter-field--day"><span class="op-filter-field__lbl">Kayıt günü</span>' +
      '<input id="op-hk-filter-day" type="date" class="op-filter-input" autocomplete="off" /></label>' +
      '<label class="op-filter-field op-filter-field--room"><span class="op-filter-field__lbl">Oda</span>' +
      '<input id="op-hk-filter-room" type="text" class="op-filter-input" placeholder="Tam eşleşme" autocomplete="off" /></label>' +
      '<div class="op-filter-actions">' +
      '<button type="button" class="btn-primary btn-small" id="op-hk-filter-apply">Uygula</button>' +
      '<button type="button" class="btn-small" id="op-hk-filter-clear">Sıfırla</button>' +
      "</div></div>" +
      '<div class="op-filter-bar__row op-filter-bar__row--search">' +
      '<label class="op-filter-field op-filter-field--search"><span class="op-filter-field__lbl">Metin ara</span>' +
      '<input id="op-hk-filter-search" type="search" class="op-filter-input" placeholder="Oda, misafir, kategori kodu, not…" autocomplete="off" /></label>' +
      "</div>" +
      '<p class="op-filter-hint">Kayıt günü takviminden seçim anında uygulanır. Metin araması yazarken kısa gecikmeyle uygulanır; durum ve oda için <strong>Uygula</strong>.</p>' +
      "</div>"
    );
  }

  /** Admin «tab-op-tech» ile aynı filtre çubuğu. */
  function techFilterBarHtml() {
    return (
      '<div class="op-filter-bar glass-block" id="op-tech-filters" role="search" aria-label="Teknik operasyon filtreleri">' +
      '<div class="op-filter-bar__row">' +
      '<label class="op-filter-field"><span class="op-filter-field__lbl">Durum</span>' +
      '<select id="op-tech-filter-status" class="op-filter-input">' +
      '<option value="">Tüm kayıtlar</option>' +
      '<option value="pending">Bekliyor</option>' +
      '<option value="in_progress">Yapılıyor</option>' +
      '<option value="done">Yapıldı</option>' +
      '<option value="rejected">Yapılmadı</option>' +
      '<option value="cancelled">İptal</option>' +
      "</select></label>" +
      '<label class="op-filter-field op-filter-field--day"><span class="op-filter-field__lbl">Kayıt günü</span>' +
      '<input id="op-tech-filter-day" type="date" class="op-filter-input" autocomplete="off" /></label>' +
      '<label class="op-filter-field op-filter-field--room"><span class="op-filter-field__lbl">Oda</span>' +
      '<input id="op-tech-filter-room" type="text" class="op-filter-input" placeholder="Tam eşleşme" autocomplete="off" /></label>' +
      '<div class="op-filter-actions">' +
      '<button type="button" class="btn-primary btn-small" id="op-tech-filter-apply">Uygula</button>' +
      '<button type="button" class="btn-small" id="op-tech-filter-clear">Sıfırla</button>' +
      "</div></div>" +
      '<div class="op-filter-bar__row op-filter-bar__row--search">' +
      '<label class="op-filter-field op-filter-field--search"><span class="op-filter-field__lbl">Metin ara</span>' +
      '<input id="op-tech-filter-search" type="search" class="op-filter-input" placeholder="Oda, misafir, kategori kodu, not…" autocomplete="off" /></label>' +
      "</div>" +
      '<p class="op-filter-hint">Kayıt günü takviminden seçim anında uygulanır. Metin araması yazarken kısa gecikmeyle uygulanır; durum ve oda için <strong>Uygula</strong>.</p>' +
      "</div>"
    );
  }

  /** Admin «tab-op-front» ile aynı filtre çubuğu + kapsam satırı üstte ayrı üretilir. */
  function frontFilterBarHtml() {
    return (
      '<div class="op-filter-bar glass-block" id="op-front-filters" role="search" aria-label="Ön büro operasyon filtreleri">' +
      '<div class="op-filter-bar__row">' +
      '<label class="op-filter-field"><span class="op-filter-field__lbl">Durum</span>' +
      '<select id="op-front-filter-status" class="op-filter-input">' +
      '<option value="">Tüm kayıtlar</option>' +
      '<option value="pending">Bekliyor</option>' +
      '<option value="in_progress">Yapılıyor</option>' +
      '<option value="done">Yapıldı</option>' +
      '<option value="rejected">Yapılmadı</option>' +
      '<option value="cancelled">İptal</option>' +
      "</select></label>" +
      '<label class="op-filter-field op-filter-field--day"><span class="op-filter-field__lbl">Kayıt günü</span>' +
      '<input id="op-front-filter-day" type="date" class="op-filter-input" autocomplete="off" /></label>' +
      '<label class="op-filter-field op-filter-field--room"><span class="op-filter-field__lbl">Oda</span>' +
      '<input id="op-front-filter-room" type="text" class="op-filter-input" placeholder="Tam eşleşme" autocomplete="off" /></label>' +
      '<div class="op-filter-actions">' +
      '<button type="button" class="btn-primary btn-small" id="op-front-filter-apply">Uygula</button>' +
      '<button type="button" class="btn-small" id="op-front-filter-clear">Sıfırla</button>' +
      "</div></div>" +
      '<div class="op-filter-bar__row op-filter-bar__row--search">' +
      '<label class="op-filter-field op-filter-field--search"><span class="op-filter-field__lbl">Metin ara</span>' +
      '<input id="op-front-filter-search" type="search" class="op-filter-input" placeholder="Oda, misafir, kategori kodu, not…" autocomplete="off" /></label>' +
      "</div>" +
      '<p class="op-filter-hint">Kayıt günü takviminden seçim anında uygulanır. Metin araması yazarken kısa gecikmeyle uygulanır; durum ve oda için <strong>Uygula</strong>. Sekme değişince alanlar o listenin son süzgecini gösterir.</p>' +
      "</div>"
    );
  }

  var OPS_LIGHT_OPEN_QUEUE_FETCH = 100;
  var OPS_LIGHT_BANNER_SEQ = { hk: 0, tech: 0, front: 0 };

  function bumpOpsLightBannerPaintSeq(slot) {
    var k = String(slot || "hk").trim();
    OPS_LIGHT_BANNER_SEQ[k] = (OPS_LIGHT_BANNER_SEQ[k] || 0) + 1;
    return OPS_LIGHT_BANNER_SEQ[k];
  }

  function opsLightBannerLookbackRange() {
    var days = enumerateSlDays(OP_DAY_STRIP_COUNT_SL);
    if (!days.length) {
      var t = hotelCalYmdSl(new Date());
      return { from: t, to: t };
    }
    return { from: days[days.length - 1], to: days[0] };
  }

  async function fetchOpsLightOpenQueueRows(bucketTypes) {
    var range = opsLightBannerLookbackRange();
    var base = { from: range.from, to: range.to };
    var tasks = (bucketTypes || []).map(function (bt) {
      return Promise.all([
        opsFetch(
          "/requests?" +
            new URLSearchParams(
              Object.assign({}, base, {
                type: bt,
                page: "1",
                pageSize: String(OPS_LIGHT_OPEN_QUEUE_FETCH),
                status: "pending",
              }),
            ).toString(),
        ).catch(function () {
          return { items: [] };
        }),
        opsFetch(
          "/requests?" +
            new URLSearchParams(
              Object.assign({}, base, {
                type: bt,
                page: "1",
                pageSize: String(OPS_LIGHT_OPEN_QUEUE_FETCH),
                status: "in_progress",
              }),
            ).toString(),
        ).catch(function () {
          return { items: [] };
        }),
      ]).then(function (pair) {
        return { bt: bt, p: pair[0], i: pair[1] };
      });
    });
    var chunks = await Promise.all(tasks);
    var out = [];
    chunks.forEach(function (ch) {
      var bt = ch.bt;
      (ch.p.items || []).forEach(function (r) {
        out.push({ bucketType: bt, row: r });
      });
      (ch.i.items || []).forEach(function (r) {
        out.push({ bucketType: bt, row: r });
      });
    });
    out.sort(function (a, b) {
      return String(a.row.submitted_at || "").localeCompare(String(b.row.submitted_at || ""));
    });
    var seen = {};
    var dedup = [];
    out.forEach(function (item) {
      var id = String(item.row && item.row.id != null ? item.row.id : "").trim();
      var key = item.bucketType + ":" + (id || "_");
      if (seen[key]) return;
      seen[key] = true;
      dedup.push(item);
    });
    return dedup;
  }

  async function paintOpsLightPendingBanner(hostId, bucketTypes, title, slotKey) {
    var slot = String(slotKey || "hk").trim();
    var myGen = bumpOpsLightBannerPaintSeq(slot);
    var host = document.getElementById(hostId);
    var ui = window.AdminUI;
    if (!host || !ui || typeof ui.renderOpsPendingQueueBanner !== "function") return;
    try {
      var range = opsLightBannerLookbackRange();
      var hint =
        "Kayıt günü " +
        ymdToTrDotsSl(range.from) +
        " – " +
        ymdToTrDotsSl(range.to) +
        " · " +
        OP_HOTEL_TZ_SL +
        " · en eski kayıt üstte";
      var rows = await fetchOpsLightOpenQueueRows(bucketTypes);
      if (myGen !== OPS_LIGHT_BANNER_SEQ[slot]) return;
      ui.renderOpsPendingQueueBanner(host, {
        title: title,
        hint: hint,
        rows: rows,
        hideWhenEmpty: true,
        maxRows: 12,
      });
    } catch (_e) {
      if (myGen === OPS_LIGHT_BANNER_SEQ[slot]) host.innerHTML = "";
    }
  }

  async function loadHkMount(mount) {
    var ui = window.AdminUI;
    if (!ui || typeof ui.renderBucketTable !== "function") throw new Error("ui_missing");
    if (typeof ui.renderOpsSingleBucketSummary !== "function") throw new Error("ui_missing");
    var waId = hkDeepLinkUuid();
    if (waId) stripOpsDeepQueryKeys(["id"]);

    if (waId && typeof ui.renderOperationBucket === "function") {
      try {
        var waHk = await opsFetch("/requests/request/" + encodeURIComponent(waId));
        if (waHk && waHk.item) {
          try {
            document.body.classList.add("admin-body--ops-wa-card-only");
          } catch (_bc) {}
          mount.innerHTML = waPanelCardOnlyMountHtml();
          var hkCardHost = document.getElementById("ops-wa-single-card-host");
          async function hkRefetchWaCard() {
            try {
              var again = await opsFetch("/requests/request/" + encodeURIComponent(waId));
              if (again && again.item && hkCardHost) {
                paintWaSingleCard(ui, hkCardHost, "request", again.item, hkWaH);
              }
            } catch (_rf) {}
          }
          var hkWaH = {
            onStatus: async function (bt, id, status) {
              await opsFetch(
                "/requests/" + encodeURIComponent(bt) + "/" + encodeURIComponent(id) + "/status",
                {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: status }),
                },
              );
              postOpsMutation();
              await hkRefetchWaCard();
            },
          };
          paintWaSingleCard(ui, hkCardHost, "request", waHk.item, hkWaH);
          wireOpsCrossTabListRefresh(function () {
            void hkRefetchWaCard();
          });
          return;
        }
      } catch (_wa) {}
    }

    try {
      document.body.classList.remove("admin-body--ops-wa-card-only");
    } catch (_br) {}

    if (mount) mount.dataset.slStripBound = "";

    var initialHighlightId = waId || "";
    var warnedMissingDeep = false;

    function renderRequestTable(listHost, cfg) {
      ui.renderBucketTable(listHost, "request", cfg.rows || [], {
        pagination: cfg.pagination,
        readOnly: false,
        highlightRowId: cfg.highlightRowId || "",
        onPage: typeof cfg.onPage === "function" ? cfg.onPage : null,
        onStatus: cfg.onStatus,
        onDelete: cfg.onDelete,
        onWhatsappResend: cfg.onWhatsappResend,
      });
    }

    mount.innerHTML =
      '<div id="ops-hk-pending-banner" class="ops-pending-banner-host"></div>' +
      opsLightDayStripWrap("op-hk") +
      '<div id="ops-hk-summary-mount" class="ops-hk-mount"></div>' +
      hkFilterBarHtml() +
      '<div id="ops-hk-list-host" class="ops-hk-mount"></div>';
    initSlDayFromStorage();
    maybeAdvanceSlToday();
    syncSlFilterDayForPrefix("op-hk");
    renderSlDayStrip("op-hk-day-strip");
    wireSlDayStrip(mount, "op-hk-day-strip", function () {
      page = 1;
      hkFilterState.from = slCalDay;
      hkFilterState.to = slCalDay;
      void load(1);
    });
    var summaryHost = document.getElementById("ops-hk-summary-mount");
    var listHost = mount.querySelector("#ops-hk-list-host");
    var hkFilterState = { status: "", from: slCalDay, to: slCalDay, room: "", search: "" };
    var page = 1;

    function paintHkSummary(rawApi, listPack) {
      if (!summaryHost || typeof ui.renderOpsSingleBucketSummary !== "function") return;
      try {
        var raw = rawApi && rawApi.summary != null ? rawApi.summary : null;
        var pack = listPack || { items: [], pagination: null };
        var enriched = enrichFrontTypeSummaryWithPack(raw, pack);
        ui.renderOpsSingleBucketSummary(summaryHost, { bucketType: "request", row: enriched });
      } catch (e) {
        summaryHost.innerHTML =
          '<div class="op-front-summary glass-block" role="status"><p class="admin-load-error">' +
          escHtml(formatErr(e)) +
          "</p></div>";
      }
    }

    var applyBtn = document.getElementById("op-hk-filter-apply");
    var clearBtn = document.getElementById("op-hk-filter-clear");
    if (applyBtn) {
      applyBtn.addEventListener("click", function () {
        var next = readOpFilterFromDom("op-hk");
        var todayY = hotelCalYmdSl(new Date());
        if (/^\d{4}-\d{2}-\d{2}$/.test(next.from)) {
          slCalDay = next.from;
          slFollowToday = next.from === todayY;
          persistSlDay();
        }
        syncSlFilterDayForPrefix("op-hk");
        renderSlDayStrip("op-hk-day-strip");
        hkFilterState.status = next.status;
        hkFilterState.from = slCalDay;
        hkFilterState.to = slCalDay;
        hkFilterState.room = next.room;
        hkFilterState.search = next.search || "";
        page = 1;
        void load(1);
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        hkFilterState.status = "";
        hkFilterState.room = "";
        hkFilterState.search = "";
        clearOpFilterDom("op-hk");
        hkFilterState.from = slCalDay;
        hkFilterState.to = slCalDay;
        page = 1;
        void load(1);
      });
    }

    opsLightPdfMergeQuery = function (type, _ymd) {
      var q = {};
      if (type === "request") Object.assign(q, opQueryFromFilter(hkFilterState));
      delete q.from;
      delete q.to;
      return q;
    };

    var hkSearchDeb = null;
    function runHkSearchNow() {
      if (hkSearchDeb) {
        clearTimeout(hkSearchDeb);
        hkSearchDeb = null;
      }
      var qS = document.getElementById("op-hk-filter-search");
      hkFilterState.search = qS && qS.value ? String(qS.value).trim().slice(0, 80) : "";
      page = 1;
      void load(1);
    }
    function scheduleHkSearch() {
      if (hkSearchDeb) clearTimeout(hkSearchDeb);
      hkSearchDeb = setTimeout(function () {
        hkSearchDeb = null;
        runHkSearchNow();
      }, 350);
    }
    var sHk = document.getElementById("op-hk-filter-search");
    if (sHk && !sHk.dataset.vionaSlSearch) {
      sHk.dataset.vionaSlSearch = "1";
      sHk.addEventListener("input", scheduleHkSearch);
      sHk.addEventListener("keydown", function (ev) {
        if (ev && ev.key === "Enter") {
          ev.preventDefault();
          runHkSearchNow();
        }
      });
    }
    var dayHk = document.getElementById("op-hk-filter-day");
    if (dayHk && !dayHk.dataset.vionaSlDayCh) {
      dayHk.dataset.vionaSlDayCh = "1";
      dayHk.addEventListener("change", function () {
        var y = String(dayHk.value || "").trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(y)) return;
        var todayY = hotelCalYmdSl(new Date());
        slCalDay = y;
        slFollowToday = y === todayY;
        persistSlDay();
        syncSlFilterDayForPrefix("op-hk");
        renderSlDayStrip("op-hk-day-strip");
        hkFilterState.from = slCalDay;
        hkFilterState.to = slCalDay;
        page = 1;
        void load(1);
      });
    }

    async function load(pageNum) {
      page = pageNum != null ? pageNum : page;
      maybeAdvanceSlToday();
      hkFilterState.from = slCalDay;
      hkFilterState.to = slCalDay;
      syncSlFilterDayForPrefix("op-hk");
      void paintOpsLightPendingBanner(
        "ops-hk-pending-banner",
        ["request"],
        "Açık işler (HK · bekleyen & yapılıyor)",
        "hk",
      );
      try {
      var deeplinkHint = document.getElementById("ops-deeplink-hint");

      if (summaryHost) summaryHost.classList.remove("hidden");
      var fq = opQueryFromFilter(hkFilterState);
      var q = Object.assign(
        {
          type: "request",
          page: String(page),
          pageSize: String(PAGE_SIZE),
        },
        fq,
      );
      var sumQ = new URLSearchParams(Object.assign({ type: "request" }, fq)).toString();
      var pair = await Promise.all([
        opsFetch("/requests?" + new URLSearchParams(q).toString()),
        opsFetch("/requests/bucket-type-summary?" + sumQ).catch(function () {
          return null;
        }),
      ]);
      var res = pair[0];
      var sumRaw = pair[1];
      var highlightRowId = "";
      if (initialHighlightId && page === 1) {
        var itHk = res.items || [];
        for (var ih = 0; ih < itHk.length; ih++) {
          if (String(itHk[ih].id || "").trim().toLowerCase() === initialHighlightId) {
            highlightRowId = initialHighlightId;
            break;
          }
        }
        if (highlightRowId && deeplinkHint) {
          deeplinkHint.textContent = "";
          deeplinkHint.classList.add("hidden");
        } else if (initialHighlightId && !highlightRowId && !warnedMissingDeep) {
          warnedMissingDeep = true;
          if (deeplinkHint) {
            deeplinkHint.textContent =
              "Bağlantıdaki kayıt bu sayfada yok; süzgeci sıfırlayın veya sayfalama ile arayın.";
            deeplinkHint.classList.remove("hidden");
          }
        }
      }
      renderRequestTable(listHost, {
        rows: res.items || [],
        pagination: res.pagination,
        highlightRowId: highlightRowId,
        onPage: function (p) {
          void load(p);
        },
        onStatus: async function (bt, id, status) {
          await opsFetch(
            "/requests/" + encodeURIComponent(bt) + "/" + encodeURIComponent(id) + "/status",
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: status }),
            },
          );
          postOpsMutation();
          await load(page);
        },
        onDelete: async function (bt, id) {
          await opsFetch("/requests/" + encodeURIComponent(bt) + "/" + encodeURIComponent(id), {
            method: "DELETE",
          });
          postOpsMutation();
          await load(page);
        },
        onWhatsappResend: async function (itemType, id) {
          try {
            await opsWhatsappResend(itemType, id);
            postOpsMutation();
            window.alert("Kayıt operasyon WhatsApp (Cloud API) hattına yeniden iletildi.");
            await load(page);
          } catch (e) {
            window.alert(formatErr(e));
          }
        },
      });
      paintHkSummary(sumRaw, res);
      void refreshSlStripMini("request");
      } catch (err) {
        bumpOpsLightBannerPaintSeq("hk");
        var bhHk = document.getElementById("ops-hk-pending-banner");
        if (bhHk) bhHk.innerHTML = "";
        if (listHost)
          listHost.innerHTML = '<p class="admin-load-error">' + escHtml(formatErr(err)) + "</p>";
      }
    }

    await load(1);
    wireOpsLightPdfOnce();
    wireOpsCrossTabListRefresh(function () {
      void load(page);
    });
  }

  async function loadTechMount(mount) {
    var ui = window.AdminUI;
    if (!ui || typeof ui.renderBucketTable !== "function") throw new Error("ui_missing");
    if (typeof ui.renderOpsSingleBucketSummary !== "function") throw new Error("ui_missing");
    var waTechId = techDeepLinkUuid();
    if (waTechId) stripOpsDeepQueryKeys(["id"]);

    if (waTechId && typeof ui.renderOperationBucket === "function") {
      try {
        var waTech = await opsFetch("/requests/fault/" + encodeURIComponent(waTechId));
        if (waTech && waTech.item) {
          try {
            document.body.classList.add("admin-body--ops-wa-card-only");
          } catch (_bc2) {}
          mount.innerHTML = waPanelCardOnlyMountHtml();
          var techCardHost = document.getElementById("ops-wa-single-card-host");
          async function techRefetchWaCard() {
            try {
              var againT = await opsFetch("/requests/fault/" + encodeURIComponent(waTechId));
              if (againT && againT.item && techCardHost) {
                paintWaSingleCard(ui, techCardHost, "fault", againT.item, techWaH);
              }
            } catch (_rft) {}
          }
          var techWaH = {
            onStatus: async function (bt, id, status) {
              await opsFetch(
                "/requests/" + encodeURIComponent(bt) + "/" + encodeURIComponent(id) + "/status",
                {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: status }),
                },
              );
              postOpsMutation();
              await techRefetchWaCard();
            },
          };
          paintWaSingleCard(ui, techCardHost, "fault", waTech.item, techWaH);
          wireOpsCrossTabListRefresh(function () {
            void techRefetchWaCard();
          });
          return;
        }
      } catch (_wat) {}
    }

    try {
      document.body.classList.remove("admin-body--ops-wa-card-only");
    } catch (_br2) {}

    if (mount) mount.dataset.slStripBound = "";

    var initialHighlightId = waTechId || "";
    var warnedMissingDeepTech = false;

    function renderFaultTable(listHost, cfg) {
      ui.renderBucketTable(listHost, "fault", cfg.rows || [], {
        pagination: cfg.pagination,
        readOnly: false,
        highlightRowId: cfg.highlightRowId || "",
        onPage: typeof cfg.onPage === "function" ? cfg.onPage : null,
        onStatus: cfg.onStatus,
        onDelete: cfg.onDelete,
        onWhatsappResend: cfg.onWhatsappResend,
      });
    }

    mount.innerHTML =
      '<div id="ops-tech-pending-banner" class="ops-pending-banner-host"></div>' +
      opsLightDayStripWrap("op-tech") +
      '<div id="ops-tech-summary-mount" class="ops-hk-mount"></div>' +
      techFilterBarHtml() +
      '<div id="ops-tech-list-host" class="ops-hk-mount"></div>';
    initSlDayFromStorage();
    maybeAdvanceSlToday();
    syncSlFilterDayForPrefix("op-tech");
    renderSlDayStrip("op-tech-day-strip");
    wireSlDayStrip(mount, "op-tech-day-strip", function () {
      page = 1;
      techFilterState.from = slCalDay;
      techFilterState.to = slCalDay;
      void load(1);
    });
    var techSummaryHost = document.getElementById("ops-tech-summary-mount");
    var listHost = mount.querySelector("#ops-tech-list-host");
    var techFilterState = { status: "", from: slCalDay, to: slCalDay, room: "", search: "" };
    var page = 1;

    function paintTechSummary(rawApi, listPack) {
      if (!techSummaryHost || typeof ui.renderOpsSingleBucketSummary !== "function") return;
      try {
        var raw = rawApi && rawApi.summary != null ? rawApi.summary : null;
        var pack = listPack || { items: [], pagination: null };
        var enriched = enrichFrontTypeSummaryWithPack(raw, pack);
        ui.renderOpsSingleBucketSummary(techSummaryHost, { bucketType: "fault", row: enriched });
      } catch (e) {
        techSummaryHost.innerHTML =
          '<div class="op-front-summary glass-block" role="status"><p class="admin-load-error">' +
          escHtml(formatErr(e)) +
          "</p></div>";
      }
    }

    var applyBtn = document.getElementById("op-tech-filter-apply");
    var clearBtn = document.getElementById("op-tech-filter-clear");
    if (applyBtn) {
      applyBtn.addEventListener("click", function () {
        var next = readOpFilterFromDom("op-tech");
        var todayY = hotelCalYmdSl(new Date());
        if (/^\d{4}-\d{2}-\d{2}$/.test(next.from)) {
          slCalDay = next.from;
          slFollowToday = next.from === todayY;
          persistSlDay();
        }
        syncSlFilterDayForPrefix("op-tech");
        renderSlDayStrip("op-tech-day-strip");
        techFilterState.status = next.status;
        techFilterState.from = slCalDay;
        techFilterState.to = slCalDay;
        techFilterState.room = next.room;
        techFilterState.search = next.search || "";
        page = 1;
        void load(1);
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        techFilterState.status = "";
        techFilterState.room = "";
        techFilterState.search = "";
        clearOpFilterDom("op-tech");
        techFilterState.from = slCalDay;
        techFilterState.to = slCalDay;
        page = 1;
        void load(1);
      });
    }

    opsLightPdfMergeQuery = function (type, _ymd) {
      var q = {};
      if (type === "fault") Object.assign(q, opQueryFromFilter(techFilterState));
      delete q.from;
      delete q.to;
      return q;
    };

    var techSearchDeb = null;
    function runTechSearchNow() {
      if (techSearchDeb) {
        clearTimeout(techSearchDeb);
        techSearchDeb = null;
      }
      var qS = document.getElementById("op-tech-filter-search");
      techFilterState.search = qS && qS.value ? String(qS.value).trim().slice(0, 80) : "";
      page = 1;
      void load(1);
    }
    function scheduleTechSearch() {
      if (techSearchDeb) clearTimeout(techSearchDeb);
      techSearchDeb = setTimeout(function () {
        techSearchDeb = null;
        runTechSearchNow();
      }, 350);
    }
    var sTech = document.getElementById("op-tech-filter-search");
    if (sTech && !sTech.dataset.vionaSlSearch) {
      sTech.dataset.vionaSlSearch = "1";
      sTech.addEventListener("input", scheduleTechSearch);
      sTech.addEventListener("keydown", function (ev) {
        if (ev && ev.key === "Enter") {
          ev.preventDefault();
          runTechSearchNow();
        }
      });
    }
    var dayTech = document.getElementById("op-tech-filter-day");
    if (dayTech && !dayTech.dataset.vionaSlDayCh) {
      dayTech.dataset.vionaSlDayCh = "1";
      dayTech.addEventListener("change", function () {
        var y = String(dayTech.value || "").trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(y)) return;
        var todayY = hotelCalYmdSl(new Date());
        slCalDay = y;
        slFollowToday = y === todayY;
        persistSlDay();
        syncSlFilterDayForPrefix("op-tech");
        renderSlDayStrip("op-tech-day-strip");
        techFilterState.from = slCalDay;
        techFilterState.to = slCalDay;
        page = 1;
        void load(1);
      });
    }

    async function load(pageNum) {
      page = pageNum != null ? pageNum : page;
      maybeAdvanceSlToday();
      techFilterState.from = slCalDay;
      techFilterState.to = slCalDay;
      syncSlFilterDayForPrefix("op-tech");
      void paintOpsLightPendingBanner(
        "ops-tech-pending-banner",
        ["fault"],
        "Açık işler (Teknik · bekleyen & yapılıyor)",
        "tech",
      );
      try {
      var deeplinkHintT = document.getElementById("ops-deeplink-hint");

      if (techSummaryHost) techSummaryHost.classList.remove("hidden");
      var fq = opQueryFromFilter(techFilterState);
      var q = Object.assign(
        {
          type: "fault",
          page: String(page),
          pageSize: String(PAGE_SIZE),
        },
        fq,
      );
      var sumQ = new URLSearchParams(Object.assign({ type: "fault" }, fq)).toString();
      var pair = await Promise.all([
        opsFetch("/requests?" + new URLSearchParams(q).toString()),
        opsFetch("/requests/bucket-type-summary?" + sumQ).catch(function () {
          return null;
        }),
      ]);
      var res = pair[0];
      var sumRaw = pair[1];
      var highlightRowId = "";
      if (initialHighlightId && page === 1) {
        var itT = res.items || [];
        for (var it = 0; it < itT.length; it++) {
          if (String(itT[it].id || "").trim().toLowerCase() === initialHighlightId) {
            highlightRowId = initialHighlightId;
            break;
          }
        }
        if (highlightRowId && deeplinkHintT) {
          deeplinkHintT.textContent = "";
          deeplinkHintT.classList.add("hidden");
        } else if (initialHighlightId && !highlightRowId && !warnedMissingDeepTech) {
          warnedMissingDeepTech = true;
          if (deeplinkHintT) {
            deeplinkHintT.textContent =
              "Bağlantıdaki kayıt bu sayfada yok; süzgeci sıfırlayın veya sayfalama ile arayın.";
            deeplinkHintT.classList.remove("hidden");
          }
        }
      }
      renderFaultTable(listHost, {
        rows: res.items || [],
        pagination: res.pagination,
        highlightRowId: highlightRowId,
        onPage: function (p) {
          void load(p);
        },
        onStatus: async function (bt, id, status) {
          await opsFetch(
            "/requests/" + encodeURIComponent(bt) + "/" + encodeURIComponent(id) + "/status",
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: status }),
            },
          );
          postOpsMutation();
          await load(page);
        },
        onDelete: async function (bt, id) {
          await opsFetch("/requests/" + encodeURIComponent(bt) + "/" + encodeURIComponent(id), {
            method: "DELETE",
          });
          postOpsMutation();
          await load(page);
        },
        onWhatsappResend: async function (itemType, id) {
          try {
            await opsWhatsappResend(itemType, id);
            postOpsMutation();
            window.alert("Kayıt operasyon WhatsApp (Cloud API) hattına yeniden iletildi.");
            await load(page);
          } catch (e) {
            window.alert(formatErr(e));
          }
        },
      });
      paintTechSummary(sumRaw, res);
      void refreshSlStripMini("fault");
      } catch (err) {
        bumpOpsLightBannerPaintSeq("tech");
        var bhTc = document.getElementById("ops-tech-pending-banner");
        if (bhTc) bhTc.innerHTML = "";
        if (listHost)
          listHost.innerHTML = '<p class="admin-load-error">' + escHtml(formatErr(err)) + "</p>";
      }
    }

    await load(1);
    wireOpsLightPdfOnce();
    wireOpsCrossTabListRefresh(function () {
      void load(page);
    });
  }

  async function loadFrontMount(mount) {
    var ui = window.AdminUI;
    if (!ui || typeof ui.renderOperationFront !== "function") {
      throw new Error("ui_missing");
    }

    var deepLink = frontDeepLinkParams();
    var pendingFrontHighlight = null;
    if (deepLink) {
      try {
        sessionStorage.setItem(OP_FRONT_TAB_KEY, deepLink.type);
      } catch (_s) {}
      pendingFrontHighlight = { type: deepLink.type, id: deepLink.id };
    }

    if (deepLink && typeof ui.renderOperationBucket === "function") {
      try {
        var frWa = await opsFetch(
          "/requests/" + encodeURIComponent(deepLink.type) + "/" + encodeURIComponent(deepLink.id),
        );
        if (frWa && frWa.item) {
          stripOpsDeepQueryKeys(["id", "type"]);
          pendingFrontHighlight = null;
          try {
            document.body.classList.add("admin-body--ops-wa-card-only");
          } catch (_s2) {}
          mount.innerHTML = waPanelCardOnlyMountHtml();
          var frontWaHost = document.getElementById("ops-wa-single-card-host");
          var bFront = deepLink.type;
          var idFront = deepLink.id;
          async function frontRefetchWaCard() {
            try {
              var ag = await opsFetch(
                "/requests/" + encodeURIComponent(bFront) + "/" + encodeURIComponent(idFront),
              );
              if (ag && ag.item && frontWaHost) {
                paintWaSingleCard(ui, frontWaHost, bFront, ag.item, frontWaHandlers);
              }
            } catch (_rff) {}
          }
          var frontWaHandlers = {
            onStatus: async function (bt, id, status) {
              await opsFetch(
                "/requests/" + encodeURIComponent(bt) + "/" + encodeURIComponent(id) + "/status",
                {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: status }),
                },
              );
              postOpsMutation();
              await frontRefetchWaCard();
            },
          };
          paintWaSingleCard(ui, frontWaHost, bFront, frWa.item, frontWaHandlers);
          wireOpsCrossTabListRefresh(function () {
            void frontRefetchWaCard();
          });
          return;
        }
      } catch (_waf) {}
    }

    if (deepLink) {
      stripOpsDeepQueryKeys(["id", "type"]);
    }

    try {
      document.body.classList.remove("admin-body--ops-wa-card-only");
    } catch (_s3) {}

    if (mount) mount.dataset.slStripBound = "";
    initSlDayFromStorage();
    maybeAdvanceSlToday();
    mount.innerHTML =
      '<div id="ops-front-pending-banner" class="ops-pending-banner-host"></div>' +
      opsLightDayStripWrap("op-front") +
      '<p id="op-front-filter-scope" class="op-filter-scope" role="status"></p>' +
      frontFilterBarHtml() +
      '<div id="op-front-mount" class="ops-hk-mount"></div>';
    syncSlFilterDayForPrefix("op-front");
    renderSlDayStrip("op-front-day-strip");
    var inner = document.getElementById("op-front-mount");
    if (!inner) return;

    var opFrontFilterActiveType = "complaint";
    try {
      var u0 = new URL(window.location.href);
      var qpT = String(u0.searchParams.get("type") || "").trim();
      if (qpT === "guest_notification" || qpT === "late_checkout" || qpT === "complaint") {
        try {
          sessionStorage.setItem(OP_FRONT_TAB_KEY, qpT);
        } catch (_ss) {}
      }
    } catch (_u) {}
    try {
      var tab0 = String(sessionStorage.getItem(OP_FRONT_TAB_KEY) || "").trim();
      if (tab0 === "guest_notification" || tab0 === "late_checkout" || tab0 === "complaint") {
        opFrontFilterActiveType = tab0;
      }
    } catch (_sk) {}

    var opFilterFrontByType = {
      complaint: { status: "", from: slCalDay, to: slCalDay, room: "", search: "" },
      guest_notification: { status: "", from: slCalDay, to: slCalDay, room: "", search: "" },
      late_checkout: { status: "", from: slCalDay, to: slCalDay, room: "", search: "" },
    };
    var opFrontPages = { complaint: 1, guest_notification: 1, late_checkout: 1 };

    wireSlDayStrip(mount, "op-front-day-strip", function () {
      ["complaint", "guest_notification", "late_checkout"].forEach(function (k) {
        var o = opFilterFrontByType[k] || { status: "", from: "", to: "", room: "", search: "" };
        o.from = slCalDay;
        o.to = slCalDay;
        opFilterFrontByType[k] = o;
      });
      opFrontPages = { complaint: 1, guest_notification: 1, late_checkout: 1 };
      void loadAll();
    });

    function updateOpFrontFilterScopeLabel() {
      var el = document.getElementById("op-front-filter-scope");
      if (!el) return;
      var labels = {
        complaint: "Şikâyetler",
        guest_notification: "Misafir bildirimleri",
        late_checkout: "Geç çıkış",
      };
      var lab = labels[opFrontFilterActiveType] || opFrontFilterActiveType;
      el.textContent =
        "Aktif sekme: " +
        lab +
        " — Bu süzgeç yalnız bu listeye uygulanır. Sekme değişince alanlar o listenin kayıtlı süzgecini gösterir.";
    }

    function syncOpFrontFilterFormFromActiveType() {
      var m = opFilterFrontByType[opFrontFilterActiveType] || { status: "", from: "", to: "", room: "", search: "" };
      var status = document.getElementById("op-front-filter-status");
      var day = document.getElementById("op-front-filter-day");
      var room = document.getElementById("op-front-filter-room");
      var qSearch = document.getElementById("op-front-filter-search");
      if (status) status.value = m.status || "";
      var y = m.from && /^\d{4}-\d{2}-\d{2}$/.test(String(m.from).trim()) ? String(m.from).trim() : slCalDay;
      if (day) day.value = y || "";
      if (room) room.value = m.room || "";
      if (qSearch) qSearch.value = m.search != null ? String(m.search) : "";
    }

    var applyBtn = document.getElementById("op-front-filter-apply");
    var clearBtn = document.getElementById("op-front-filter-clear");
    if (applyBtn && !applyBtn.dataset.vionaBound) {
      applyBtn.dataset.vionaBound = "1";
      applyBtn.addEventListener("click", function () {
        var next = readOpFilterFromDom("op-front");
        var todayY = hotelCalYmdSl(new Date());
        if (/^\d{4}-\d{2}-\d{2}$/.test(next.from)) {
          slCalDay = next.from;
          slFollowToday = next.from === todayY;
          persistSlDay();
        }
        syncSlFilterDayForPrefix("op-front");
        renderSlDayStrip("op-front-day-strip");
        opFilterFrontByType[opFrontFilterActiveType] = {
          status: next.status,
          from: slCalDay,
          to: slCalDay,
          room: next.room,
          search: next.search || "",
        };
        ["complaint", "guest_notification", "late_checkout"].forEach(function (k) {
          if (k === opFrontFilterActiveType) return;
          var o = opFilterFrontByType[k] || { status: "", from: "", to: "", room: "", search: "" };
          o.from = slCalDay;
          o.to = slCalDay;
          opFilterFrontByType[k] = o;
        });
        opFrontPages = { complaint: 1, guest_notification: 1, late_checkout: 1 };
        void loadAll();
      });
    }
    if (clearBtn && !clearBtn.dataset.vionaBound) {
      clearBtn.dataset.vionaBound = "1";
      clearBtn.addEventListener("click", function () {
        var y = slCalDay;
        opFilterFrontByType.complaint = { status: "", from: y, to: y, room: "", search: "" };
        opFilterFrontByType.guest_notification = { status: "", from: y, to: y, room: "", search: "" };
        opFilterFrontByType.late_checkout = { status: "", from: y, to: y, room: "", search: "" };
        clearOpFilterDom("op-front");
        opFrontPages = { complaint: 1, guest_notification: 1, late_checkout: 1 };
        void loadAll();
      });
    }

    opsLightPdfMergeQuery = function (type, _ymd) {
      var q = {};
      if (type === "complaint") Object.assign(q, opQueryFromFilter(opFilterFrontByType.complaint));
      else if (type === "guest_notification")
        Object.assign(q, opQueryFromFilter(opFilterFrontByType.guest_notification));
      else if (type === "late_checkout") Object.assign(q, opQueryFromFilter(opFilterFrontByType.late_checkout));
      delete q.from;
      delete q.to;
      return q;
    };

    var frontSearchDeb = null;
    function runFrontSearchNow() {
      if (frontSearchDeb) {
        clearTimeout(frontSearchDeb);
        frontSearchDeb = null;
      }
      var qS = document.getElementById("op-front-filter-search");
      var cur = opFilterFrontByType[opFrontFilterActiveType] || {};
      cur.search = qS && qS.value ? String(qS.value).trim().slice(0, 80) : "";
      opFilterFrontByType[opFrontFilterActiveType] = cur;
      opFrontPages = { complaint: 1, guest_notification: 1, late_checkout: 1 };
      void loadAll();
    }
    function scheduleFrontSearch() {
      if (frontSearchDeb) clearTimeout(frontSearchDeb);
      frontSearchDeb = setTimeout(function () {
        frontSearchDeb = null;
        runFrontSearchNow();
      }, 350);
    }
    var sFr = document.getElementById("op-front-filter-search");
    if (sFr && !sFr.dataset.vionaSlSearch) {
      sFr.dataset.vionaSlSearch = "1";
      sFr.addEventListener("input", scheduleFrontSearch);
      sFr.addEventListener("keydown", function (ev) {
        if (ev && ev.key === "Enter") {
          ev.preventDefault();
          runFrontSearchNow();
        }
      });
    }
    var dayFront = document.getElementById("op-front-filter-day");
    if (dayFront && !dayFront.dataset.vionaSlDayCh) {
      dayFront.dataset.vionaSlDayCh = "1";
      dayFront.addEventListener("change", function () {
        var y = String(dayFront.value || "").trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(y)) return;
        var todayY = hotelCalYmdSl(new Date());
        slCalDay = y;
        slFollowToday = y === todayY;
        persistSlDay();
        syncSlFilterDayForPrefix("op-front");
        renderSlDayStrip("op-front-day-strip");
        ["complaint", "guest_notification", "late_checkout"].forEach(function (k) {
          var o = opFilterFrontByType[k] || {};
          o.from = slCalDay;
          o.to = slCalDay;
          opFilterFrontByType[k] = o;
        });
        opFrontPages = { complaint: 1, guest_notification: 1, late_checkout: 1 };
        void loadAll();
      });
    }

    syncOpFrontFilterFormFromActiveType();
    updateOpFrontFilterScopeLabel();

    async function loadAll() {
      maybeAdvanceSlToday();
      void paintOpsLightPendingBanner(
        "ops-front-pending-banner",
        ["complaint", "guest_notification", "late_checkout"],
        "Açık işler (Ön büro · bekleyen & yapılıyor)",
        "front",
      );
      try {
      ["complaint", "guest_notification", "late_checkout"].forEach(function (k) {
        var o = opFilterFrontByType[k] || {};
        o.from = slCalDay;
        o.to = slCalDay;
        opFilterFrontByType[k] = o;
      });
      syncSlFilterDayForPrefix("op-front");
      syncOpFrontFilterFormFromActiveType();
      var hiliteForRender = pendingFrontHighlight;
      pendingFrontHighlight = null;

      var fqC = opQueryFromFilter(opFilterFrontByType.complaint);
      var fqGn = opQueryFromFilter(opFilterFrontByType.guest_notification);
      var fqLc = opQueryFromFilter(opFilterFrontByType.late_checkout);
      var tc = new URLSearchParams(Object.assign({ type: "complaint" }, fqC)).toString();
      var tgn = new URLSearchParams(Object.assign({ type: "guest_notification" }, fqGn)).toString();
      var tlc = new URLSearchParams(Object.assign({ type: "late_checkout" }, fqLc)).toString();
      var results = await Promise.all([
        opsFetch("/requests/front-type-summary?" + tc).catch(function () {
          return null;
        }),
        opsFetch("/requests/front-type-summary?" + tgn).catch(function () {
          return null;
        }),
        opsFetch("/requests/front-type-summary?" + tlc).catch(function () {
          return null;
        }),
        opsFetch(
          "/requests?" +
            new URLSearchParams(
              Object.assign(
                { type: "complaint", page: String(opFrontPages.complaint), pageSize: String(PAGE_SIZE) },
                fqC,
              ),
            ).toString(),
        ),
        opsFetch(
          "/requests?" +
            new URLSearchParams(
              Object.assign(
                {
                  type: "guest_notification",
                  page: String(opFrontPages.guest_notification),
                  pageSize: String(PAGE_SIZE),
                },
                fqGn,
              ),
            ).toString(),
        ),
        opsFetch(
          "/requests?" +
            new URLSearchParams(
              Object.assign(
                { type: "late_checkout", page: String(opFrontPages.late_checkout), pageSize: String(PAGE_SIZE) },
                fqLc,
              ),
            ).toString(),
        ),
      ]);
      var rawC = results[0] && results[0].summary != null ? results[0].summary : null;
      var rawGn = results[1] && results[1].summary != null ? results[1].summary : null;
      var rawLc = results[2] && results[2].summary != null ? results[2].summary : null;
      var nc = enrichFrontTypeSummaryWithPack(rawC, results[3]);
      var ngn = enrichFrontTypeSummaryWithPack(rawGn, results[4]);
      var nlc = enrichFrontTypeSummaryWithPack(rawLc, results[5]);
      var summary = mergeNormFrontTypes(nc, ngn, nlc);
      var c = results[3];
      var gn = results[4];
      var lc = results[5];
      if (hiliteForRender) {
        var packByDeepType = {
          complaint: c,
          guest_notification: gn,
          late_checkout: lc,
        };
        var deepPack = packByDeepType[hiliteForRender.type];
        var deepFound = false;
        var wantId = String(hiliteForRender.id || "")
          .trim()
          .toLowerCase();
        if (wantId && deepPack && Array.isArray(deepPack.items)) {
          for (var di = 0; di < deepPack.items.length; di++) {
            if (String(deepPack.items[di].id || "")
              .trim()
              .toLowerCase() === wantId) {
              deepFound = true;
              break;
            }
          }
        }
        var hintFront = document.getElementById("ops-deeplink-hint");
        if (hintFront) {
          if (!deepFound) {
            hintFront.textContent =
              "Bağlantıdaki kayıt bu sayfada yok; süzgeci sıfırlayın veya ilgili sekmede sayfalayın.";
            hintFront.classList.remove("hidden");
          } else {
            hintFront.textContent = "";
            hintFront.classList.add("hidden");
          }
        }
      }
      ui.renderOperationFront(
        inner,
        { complaint: c, guest_notification: gn, late_checkout: lc },
        {
          readOnly: false,
          initialHighlight: hiliteForRender,
          onPage: function (bt, p) {
            opFrontPages[bt] = p;
            void loadAll();
          },
          onStatus: async function (bt, id, status) {
            await opsFetch(
              "/requests/" + encodeURIComponent(bt) + "/" + encodeURIComponent(id) + "/status",
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: status }),
              },
            );
            postOpsMutation();
            await loadAll();
          },
          onDelete: async function (bt, id) {
            await opsFetch("/requests/" + encodeURIComponent(bt) + "/" + encodeURIComponent(id), {
              method: "DELETE",
            });
            postOpsMutation();
            await loadAll();
          },
          onWhatsappResend: async function (itemType, id) {
            try {
              await opsWhatsappResend(itemType, id);
              postOpsMutation();
              window.alert("Kayıt operasyon WhatsApp (Cloud API) hattına yeniden iletildi.");
              await loadAll();
            } catch (e) {
              window.alert(formatErr(e));
            }
          },
          onTabChange: function (_prevKey, newKey) {
            if (!newKey) return;
            var next = readOpFilterFromDom("op-front");
            opFilterFrontByType[opFrontFilterActiveType] = next;
            opFrontFilterActiveType = newKey;
            syncOpFrontFilterFormFromActiveType();
            updateOpFrontFilterScopeLabel();
          },
        },
        summary,
      );
      void refreshSlStripMini("front");
      } catch (err) {
        bumpOpsLightBannerPaintSeq("front");
        var bhFr = document.getElementById("ops-front-pending-banner");
        if (bhFr) bhFr.innerHTML = "";
        if (inner)
          inner.innerHTML = '<p class="admin-load-error">' + escHtml(formatErr(err)) + "</p>";
      }
    }

    await loadAll();
    wireOpsLightPdfOnce();
    wireOpsCrossTabListRefresh(function () {
      void loadAll();
    });
  }

  function formatErr(e) {
    var m = e && e.message ? String(e.message) : "";
    if (m === "http_404")
      return "API’de /api/ops bulunamadı. Render’da Node servisinin son commit ile yeniden deploy edildiğini ve doğru repoya bağlı olduğunu kontrol edin.";
    if (m === "unauthorized" || m === "http_401")
      return "Sunucu girişi reddetti. Render’da OPS_TRUST_OPS_PAGE_HEADER=1 ekleyip servisi yeniden başlatın (linkte token gerekmez; yalnızca güvenilen admin sitesinden). Alternatif: OPS_LINK_TOKEN_* ile # veya ?k= aynı olsun. Ayrıca Authorization: Bearer bazı proxy’lerde X-Ops-Token’tan daha iyi iletilir — sayfayı sert yenileyin (ops-light.js güncel mi).";
    if (m === "wrong_ops_token") return "Bu şifre bu sayfa için değil (yanlış ekip bağlantısı).";
    if (m === "forbidden_bucket" || m === "http_403") return "Bu işlem bu hesap için izinli değil.";
    if (m === "http_503" || m.indexOf("datastore") !== -1) return "Sunucu veya veritabanı şu an kullanılamıyor.";
    return m ? "Hata: " + m : "Bir hata oluştu.";
  }

  async function bootApp() {
    var role = getRole();
    var titleEl = document.getElementById("ops-app-title");
    if (titleEl) titleEl.textContent = TITLES[role] || "Operasyon";
    var mount = document.getElementById("ops-mount");
    if (!mount) return;
    mount.innerHTML = '<p class="ops-light-loading">Yükleniyor…</p>';
    try {
      if (role === "hk") await loadHkMount(mount);
      else if (role === "tech") await loadTechMount(mount);
      else if (role === "front") await loadFrontMount(mount);
      else throw new Error("invalid_role");
    } catch (e) {
      mount.innerHTML = '<p class="ops-light-error">' + escHtml(formatErr(e)) + "</p>";
    }
  }

  async function tryEnter() {
    var err = document.getElementById("ops-login-error");
    if (err) err.textContent = "";
    try {
      await validateRole();
      showApp();
      await bootApp();
    } catch (e) {
      clearToken();
      showGateForm();
      if (err) err.textContent = formatErr(e);
    }
  }

  function wireLogout() {
    var b = document.getElementById("ops-logout");
    if (!b) return;
    b.addEventListener("click", function () {
      clearToken();
      showGateForm();
      showLogin();
      var pw = document.getElementById("ops-password");
      if (pw) pw.value = "";
    });
  }

  function wireLoginForm() {
    var form = document.getElementById("ops-login-form");
    if (!form) return;
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var pw = document.getElementById("ops-password");
      var v = (pw && pw.value) || "";
      setToken(v.trim());
      await tryEnter();
    });
  }

  function wirePwToggle() {
    var pw = document.getElementById("ops-password");
    var t = document.getElementById("ops-password-toggle");
    if (!pw || !t) return;
    t.addEventListener("click", function () {
      var show = pw.type === "password";
      pw.type = show ? "text" : "password";
      t.textContent = show ? "Gizle" : "Göster";
    });
  }

  function init() {
    var role = getRole();
    if (!role || !TITLES[role]) {
      document.body.innerHTML = "<p>Geçersiz operasyon sayfası.</p>";
      return;
    }
    absorbTokensFromUrl();
    document.title = (TITLES[role] || "Operasyon") + " · Viona";
    var h = document.getElementById("ops-login-heading");
    if (h) h.textContent = TITLES[role];
    var busyTitle = document.getElementById("ops-login-busy-title");
    if (busyTitle) busyTitle.textContent = TITLES[role] || "Operasyon";
    var deeplinkHint = document.getElementById("ops-deeplink-hint");
    if (deeplinkHint) {
      deeplinkHint.textContent = "";
      deeplinkHint.classList.add("hidden");
    }
    wireLoginForm();
    wirePwToggle();
    wireLogout();
    showLogin();
    showGateBusy();
    void tryEnter();
  }

  function onHashChange() {
    var role = getRole();
    if (!role || !TITLES[role]) return;
    absorbTokensFromUrl();
    showLogin();
    showGateBusy();
    void tryEnter();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  window.addEventListener("hashchange", onHashChange);
})();
