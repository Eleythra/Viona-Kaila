(function () {
  "use strict";

  var adapter = window.AdminDataAdapter;
  var ui = window.AdminUI;
  if (!adapter || !ui) return;
  /** Aynı sayfada app.js iki kez çalışırsa (üretim CDN/şablon hatası) tüm dinleyiciler çoğalır; Loglar CSV/JSON ardı arkasına iner. */
  if (window.__VIONA_ADMIN_APP_BOOTED) return;
  window.__VIONA_ADMIN_APP_BOOTED = true;
  /** Operasyon PDF: cift tik / yaris kosusunda tek indirme. */
  var opsPdfDownloadInFlight = false;
  var LOGIN_OK_KEY = "viona_admin_login_ok";
  var LOGIN_USER_KEY = "viona_admin_login_user";
  /** Girişte zorunlu; büyük-küçük harf duyarlı tek değer */
  var ADMIN_USERNAME_REQUIRED = "Viona-Kaila";
  /** Misafir bildirimleri sekmesi: notifications | late_checkout */
  var guestNotifSubtab = "notifications";
  /** null = dashboard; operasyon listeleri için otomatik yenileme hedefi */
  var activeAdminTab = null;
  var refreshTimer = null;
  var refreshInFlight = false;
  /** Aynı anda birden fazla tam pano yüklemesini tek isteğe indirger */
  var dashboardLoadPromise = null;
  /** Görünür sekmede arka plan yenilemesi (ms); sekmeye dönüşte ayrıca anlık tazeleme */
  var AUTO_REFRESH_MS = 60000;
  var visibilityRefreshTimer = null;
  /** init() her başarılı girişte çağrılır; wire* yalnızca bir kez bağlanmalı */
  var staticAdminListenersBound = false;
  var logsExportInFlight = false;
  /** İstek / şikâyet / arıza listeleri için sunucu sayfalama. */
  var BUCKET_LIST_PAGE_SIZE = 100;
  /** Ana sayfa özetinde birleştirilen kayıt üst sınırı (sayfa × getBucketPage boyutu). */
  var BUCKET_MERGE_MAX_PAGES = 100;
  var bucketListPage = { request: 1, complaint: 1, fault: 1, guest_notification: 1, late_checkout: 1 };
  /** Chatbot log tablosu sayfalama */
  var logsPage = 1;
  var LOGS_PAGE_SIZE = 70;

  var INTENT_LABEL_TR = {
    unknown: "Bilinmeyen",
    hotel_info: "Otel bilgisi",
    recommendation: "Öneri",
    request: "Talep",
    complaint: "Şikâyet",
    fault_report: "Arıza",
    reservation: "Restoran · spa talebi (sohbet)",
    special_need: "Özel ihtiyaç",
    guest_notification: "Misafir bildirimi",
    chitchat: "Sohbet",
    current_time: "Saat",
  };

  function dashboardFmtPct(part, total) {
    var p = Number(part) || 0;
    var t = Number(total) || 0;
    if (!t) return "0%";
    return ((p / t) * 100).toFixed(1) + "%";
  }

  function intentLabelTr(raw) {
    var k = String(raw || "unknown").toLowerCase().trim() || "unknown";
    return INTENT_LABEL_TR[k] || raw || "—";
  }

  function formatTopIntentLine(entry) {
    if (!entry || entry.key == null || entry.key === "") return "—";
    return intentLabelTr(entry.key) + " · " + entry.count + " mesaj";
  }

  /** Anket hotel_categories: yalnızca >0 ortalamaların aritmetiği (yeni şema; çoklu alt başlık birleşimi). */
  function surveyCategoryMean(catObj, keys) {
    var vals = [];
    (keys || []).forEach(function (k) {
      var v = Number(catObj[k]);
      if (Number.isFinite(v) && v > 0) vals.push(v);
    });
    if (!vals.length) return "-";
    return (vals.reduce(function (a, b) {
      return a + b;
    }, 0) / vals.length).toFixed(2);
  }

  var tabMap = {
    requests: "tab-requests",
    complaints: "tab-complaints",
    faults: "tab-faults",
    guest_notifications: "tab-guest-notifications",
    op_hk: "tab-op-hk",
    op_tech: "tab-op-tech",
    op_front: "tab-op-front",
    evaluations: "tab-evaluations",
    "pdf-report": "tab-pdf-report",
    logs: "tab-logs",
  };
  var OP_ACTION_PAGE_SIZE = 50;
  var opHkPage = 1;
  var opTechPage = 1;
  var opFrontPages = { complaint: 1, guest_notification: 1, late_checkout: 1 };
  var opFilterHk = { status: "", from: "", to: "", room: "", search: "" };
  var opFilterTech = { status: "", from: "", to: "", room: "", search: "" };
  var opFilterFrontByType = {
    complaint: { status: "", from: "", to: "", room: "", search: "" },
    guest_notification: { status: "", from: "", to: "", room: "", search: "" },
    late_checkout: { status: "", from: "", to: "", room: "", search: "" },
  };
  /** Hangi sekmenin süzgeci formda düzenleniyor (tek filtre çubuğu). */
  var opFrontFilterActiveType = "complaint";

  /** Operasyon sekmeleri: tek takvim günü (otel saati İstanbul). */
  var OP_HOTEL_TZ = "Europe/Istanbul";
  var OP_DAY_STRIP_COUNT = 14;
  var OP_DAY_STORAGE_KEY = "viona_op_selected_calendar_day";
  var OP_FOLLOW_TODAY_STORAGE_KEY = "viona_op_follow_hotel_today";
  var opSelectedCalendarDay = "";
  var opFollowHotelToday = true;
  /** Gün şeridi: ymd → { line, title } (satır: bekleyen+işlemde · yapıldı · yapılmadı). */
  var opStripMini = { hk: {}, tech: {}, front: {} };
  var opStripMiniGen = 0;

  /** Gün chip’i altı: Bekleyen · Yapılıyor · Yapıldı (sayılar; yapılmadı/iptal chip title’da). */
  function opStripChipStatsHtmlInt(bek, isl, yap) {
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

  function hotelCalendarYmd(date) {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: OP_HOTEL_TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date);
    } catch (_e) {
      return new Date().toISOString().slice(0, 10);
    }
  }

  /** submitted_at ISO → otel takvim günü (OP_HOTEL_TZ); ana sayfa Bugün ile operasyon sekmesi uyumu. */
  function submittedAtHotelCalendarDay(iso) {
    var s = String(iso || "").trim();
    if (!s) return "";
    var d = new Date(s);
    if (Number.isNaN(d.getTime())) return "";
    return hotelCalendarYmd(d);
  }

  /** Görünüm: gg.aa.yyyy (API yine YYYY-MM-DD). */
  function ymdToTrDots(ymd) {
    var s = String(ymd || "").trim();
    var p = s.split("-");
    if (p.length !== 3) return s;
    var y = p[0];
    var m = p[1];
    var d = p[2];
    if (!/^\d{4}$/.test(y) || !/^\d{2}$/.test(m) || !/^\d{2}$/.test(d)) return s;
    return d + "." + m + "." + y;
  }

  function summaryToStripTriple(sum) {
    if (!sum || typeof sum !== "object") {
      return { line: "— · — · —", lineHtml: "", title: "" };
    }
    if (String(sum.mode || "").trim() === "filtered") {
      var t = Number(sum.toplam) || 0;
      return {
        line: "Σ " + t,
        lineHtml: '<span class="op-chip-stats op-chip-stats--sigma"><span class="op-chip-stats__it" title="Durum süzgeci seçili">Σ<strong>' + String(t) + "</strong></span></span>",
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
      lineHtml: opStripChipStatsHtmlInt(bek, isl, yap),
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

  function mergeFrontStripTriple(c, gn, lc) {
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
      lineHtml: opStripChipStatsHtmlInt(bT, iT, yT),
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

  async function refreshOpDayStripMiniStats() {
    var tab = activeAdminTab;
    if (tab !== "op_hk" && tab !== "op_tech" && tab !== "op_front") return;
    var gen = ++opStripMiniGen;
    var days = enumerateOpStripDays(OP_DAY_STRIP_COUNT);
    try {
      if (tab === "op_hk") {
        var outHk = {};
        await Promise.all(
          days.map(function (ymd) {
            return adapter
              .getBucketTypeSummary("request", { from: ymd, to: ymd })
              .then(function (s) {
                outHk[ymd] = summaryToStripTriple(s);
              })
              .catch(function () {
                outHk[ymd] = { line: "—", title: "" };
              });
          }),
        );
        opStripMini.hk = outHk;
      } else if (tab === "op_tech") {
        var outT = {};
        await Promise.all(
          days.map(function (ymd) {
            return adapter
              .getBucketTypeSummary("fault", { from: ymd, to: ymd })
              .then(function (s) {
                outT[ymd] = summaryToStripTriple(s);
              })
              .catch(function () {
                outT[ymd] = { line: "—", title: "" };
              });
          }),
        );
        opStripMini.tech = outT;
      } else if (tab === "op_front") {
        var outF = {};
        await Promise.all(
          days.map(function (ymd) {
            var q = { from: ymd, to: ymd };
            return Promise.all([
              adapter.getFrontOfficeTypeSummary("complaint", q).catch(function () {
                return null;
              }),
              adapter.getFrontOfficeTypeSummary("guest_notification", q).catch(function () {
                return null;
              }),
              adapter.getFrontOfficeTypeSummary("late_checkout", q).catch(function () {
                return null;
              }),
            ]).then(function (triple) {
              outF[ymd] = mergeFrontStripTriple(triple[0], triple[1], triple[2]);
            });
          }),
        );
        opStripMini.front = outF;
      }
    } catch (_e) {
    } finally {
      if (gen === opStripMiniGen) renderOpDayStrips();
    }
  }

  /** Son N takvim günü (İstanbul), bugünden geriye; DST için küçük adımlarla tarama. */
  function enumerateOpStripDays(count) {
    var want = Math.max(1, Math.min(31, Number(count) || 14));
    var out = [];
    var t = Date.now();
    var guard = 0;
    while (out.length < want && guard < 2000) {
      var ymd = hotelCalendarYmd(new Date(t));
      if (out.length === 0 || ymd !== out[out.length - 1]) {
        out.push(ymd);
      }
      t -= 4 * 60 * 60 * 1000;
      guard++;
    }
    return out;
  }

  function opDayChipSecondaryLine(ymd, todayYmd, yesterdayYmd) {
    if (ymd === todayYmd) return "Bugün";
    if (ymd === yesterdayYmd) return "Dün";
    try {
      var p = ymd.split("-").map(Number);
      var d = new Date(Date.UTC(p[0], p[1] - 1, p[2], 12, 0, 0));
      return new Intl.DateTimeFormat("tr-TR", {
        timeZone: OP_HOTEL_TZ,
        weekday: "short",
        day: "numeric",
        month: "short",
      }).format(d);
    } catch (_e2) {
      return ymd;
    }
  }

  function persistOpDayState() {
    try {
      sessionStorage.setItem(OP_DAY_STORAGE_KEY, opSelectedCalendarDay);
      sessionStorage.setItem(OP_FOLLOW_TODAY_STORAGE_KEY, opFollowHotelToday ? "1" : "0");
    } catch (_e) {}
  }

  function initOpDayStripFromStorage() {
    var today = hotelCalendarYmd(new Date());
    var strip = enumerateOpStripDays(OP_DAY_STRIP_COUNT);
    var allowed = {};
    strip.forEach(function (s) {
      allowed[s] = true;
    });
    try {
      var sy = String(sessionStorage.getItem(OP_DAY_STORAGE_KEY) || "").trim();
      var sf = String(sessionStorage.getItem(OP_FOLLOW_TODAY_STORAGE_KEY) || "1");
      if (sy && /^\d{4}-\d{2}-\d{2}$/.test(sy) && allowed[sy]) {
        opFollowHotelToday = sf !== "0";
        opSelectedCalendarDay = opFollowHotelToday ? today : sy;
        return;
      }
    } catch (_e) {}
    opSelectedCalendarDay = today;
    opFollowHotelToday = true;
  }

  /** «Bugün» takibinde yeni otel gününe geçiş (otomatik yenileme / sekme açılışı). */
  function maybeAdvanceOpHotelToday() {
    var today = hotelCalendarYmd(new Date());
    if (opFollowHotelToday && opSelectedCalendarDay !== today) {
      opSelectedCalendarDay = today;
      persistOpDayState();
      syncOpFiltersAndDomFromSelectedDay();
    }
  }

  function isOperasyonAdminTab(t) {
    return t === "op_hk" || t === "op_tech" || t === "op_front";
  }

  /** HK ↔ Teknik ↔ Ön büro arasında geçince takvim günü paylaşımı yüzünden eski gün kalmasın; otele göre bugüne döner. */
  function resetOpCalendarToHotelToday() {
    var today = hotelCalendarYmd(new Date());
    opSelectedCalendarDay = today;
    opFollowHotelToday = true;
    persistOpDayState();
    syncOpFiltersAndDomFromSelectedDay();
    opHkPage = 1;
    opTechPage = 1;
    opFrontPages = { complaint: 1, guest_notification: 1, late_checkout: 1 };
  }

  function syncOpFiltersAndDomFromSelectedDay() {
    var y = String(opSelectedCalendarDay || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(y)) {
      y = hotelCalendarYmd(new Date());
      opSelectedCalendarDay = y;
    }
    opFilterHk.from = y;
    opFilterHk.to = y;
    opFilterTech.from = y;
    opFilterTech.to = y;
    opFilterFrontByType.complaint.from = y;
    opFilterFrontByType.complaint.to = y;
    opFilterFrontByType.guest_notification.from = y;
    opFilterFrontByType.guest_notification.to = y;
    opFilterFrontByType.late_checkout.from = y;
    opFilterFrontByType.late_checkout.to = y;
    ["op-hk", "op-tech", "op-front"].forEach(function (prefix) {
      var dayEl = document.getElementById(prefix + "-filter-day");
      if (dayEl) dayEl.value = y;
    });
  }

  function ensureOpSelectedDayInStrip() {
    var days = enumerateOpStripDays(OP_DAY_STRIP_COUNT);
    var ok = {};
    days.forEach(function (d) {
      ok[d] = true;
    });
    var y = String(opSelectedCalendarDay || "").trim();
    if (!y || !ok[y]) {
      opSelectedCalendarDay = days[0] || hotelCalendarYmd(new Date());
      opFollowHotelToday = true;
      persistOpDayState();
      syncOpFiltersAndDomFromSelectedDay();
    }
  }

  function renderOpDayStrips() {
    ensureOpSelectedDayInStrip();
    var stripCfg = [
      { id: "op-hk-day-strip", mini: opStripMini.hk },
      { id: "op-tech-day-strip", mini: opStripMini.tech },
      { id: "op-front-day-strip", mini: opStripMini.front },
    ];
    var days = enumerateOpStripDays(OP_DAY_STRIP_COUNT);
    var todayY = days[0] || hotelCalendarYmd(new Date());
    var yesterdayY = days.length > 1 ? days[1] : "";
    var sel = String(opSelectedCalendarDay || "").trim();
    if (!sel) sel = todayY;
    stripCfg.forEach(function (cfg) {
      var miniMap = cfg.mini || {};
      var htmlParts = [];
      days.forEach(function (ymd) {
        var active = ymd === sel;
        var sub = opDayChipSecondaryLine(ymd, todayY, yesterdayY);
        var m = miniMap[ymd];
        var miniLine = m && m.line ? m.line : "…";
        var miniTitle = m && m.title ? m.title : "Yükleniyor…";
        var miniInner =
          m && m.lineHtml
            ? '<span class="op-day-strip__chip-mini" title="' + escHtml(miniTitle) + '">' + m.lineHtml + "</span>"
            : '<span class="op-day-strip__chip-mini" title="' + escHtml(miniTitle) + '">' + escHtml(miniLine) + "</span>";
        htmlParts.push(
          '<button type="button" class="op-day-strip__chip' +
            (active ? " is-active" : "") +
            '" data-op-day="' +
            escHtml(ymd) +
            '" role="option" aria-selected="' +
            (active ? "true" : "false") +
            '">' +
            '<span class="op-day-strip__chip-date">' +
            escHtml(ymdToTrDots(ymd)) +
            "</span>" +
            '<span class="op-day-strip__chip-sub">' +
            escHtml(sub) +
            "</span>" +
            miniInner +
            "</button>",
        );
      });
      var el = document.getElementById(cfg.id);
      if (el) el.innerHTML = htmlParts.join("");
    });
  }

  function selectOpCalendarDay(ymd, followTodayFlag) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(ymd || ""))) return;
    opSelectedCalendarDay = String(ymd);
    opFollowHotelToday = followTodayFlag === true;
    persistOpDayState();
    syncOpFiltersAndDomFromSelectedDay();
    renderOpDayStrips();
    opHkPage = 1;
    opTechPage = 1;
    opFrontPages = { complaint: 1, guest_notification: 1, late_checkout: 1 };
    if (activeAdminTab === "op_hk") void loadOpHk(1);
    else if (activeAdminTab === "op_tech") void loadOpTech(1);
    else if (activeAdminTab === "op_front") void loadOpFront();
  }

  function clearOpFilterDomStatusRoom(prefix) {
    var status = document.getElementById(prefix + "-filter-status");
    var room = document.getElementById(prefix + "-filter-room");
    if (status) status.value = "";
    if (room) room.value = "";
  }

  /** Tıklanan düğüm bazen #text olur; Text.closest yok → şerit chip'i bulunamaz. */
  function eventClickTargetElement(ev) {
    var t = ev && ev.target;
    if (!t) return null;
    if (t.nodeType === 1) return t;
    return t.parentElement || null;
  }

  function wireOpDayStripLayoutClick() {
    var layout = document.getElementById("admin-layout");
    if (!layout || layout.dataset.vionaOpDayStripBound) return;
    layout.dataset.vionaOpDayStripBound = "1";
    layout.addEventListener("click", function (ev) {
      var el = eventClickTargetElement(ev);
      var chip = el && typeof el.closest === "function" ? el.closest(".op-day-strip__chip") : null;
      if (!chip || !layout.contains(chip)) return;
      var ymd = chip.getAttribute("data-op-day") || "";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return;
      var todayY = hotelCalendarYmd(new Date());
      selectOpCalendarDay(ymd, ymd === todayY);
      scheduleAutoRefresh();
    });
  }

  /** PDF ve API: ekrandaki tarih alani ile secili gun (serit) birebir; gerekirse otel bugunu. */
  function readOpsReportYmdForPdf(variant) {
    maybeAdvanceOpHotelToday();
    syncOpFiltersAndDomFromSelectedDay();
    renderOpDayStrips();
    var prefixes =
      variant === "hk"
        ? ["op-hk", "op-tech", "op-front"]
        : variant === "tech"
          ? ["op-tech", "op-hk", "op-front"]
          : ["op-front", "op-hk", "op-tech"];
    for (var i = 0; i < prefixes.length; i++) {
      var el = document.getElementById(prefixes[i] + "-filter-day");
      var v = el && el.value ? String(el.value).trim() : "";
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    }
    var y = String(opSelectedCalendarDay || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(y)) return y;
    return hotelCalendarYmd(new Date());
  }

  async function downloadOpsDayPdf(variant) {
    if (opsPdfDownloadInFlight) return;
    if (!window.VionaOpsDayPdf || typeof window.VionaOpsDayPdf.download !== "function") {
      window.alert("PDF modulu yuklenemedi; sayfayi yenileyin.");
      return;
    }
    var id =
      variant === "hk" ? "op-hk-pdf" : variant === "tech" ? "op-tech-pdf" : variant === "front" ? "op-front-pdf" : "";
    var btn = id ? document.getElementById(id) : null;
    opsPdfDownloadInFlight = true;
    var ymdPdf = readOpsReportYmdForPdf(variant);
    try {
      if (btn) btn.disabled = true;
      await window.VionaOpsDayPdf.download({
        variant: variant,
        ymd: ymdPdf,
        adapter: adapter,
        mergeListQuery: function (type, ymd) {
          var q = {};
          if (variant === "hk" && type === "request") Object.assign(q, opQueryFromFilter(opFilterHk));
          else if (variant === "tech" && type === "fault") Object.assign(q, opQueryFromFilter(opFilterTech));
          else if (variant === "front") {
            if (type === "complaint") Object.assign(q, opQueryFromFilter(opFilterFrontByType.complaint));
            else if (type === "guest_notification")
              Object.assign(q, opQueryFromFilter(opFilterFrontByType.guest_notification));
            else if (type === "late_checkout") Object.assign(q, opQueryFromFilter(opFilterFrontByType.late_checkout));
          }
          delete q.from;
          delete q.to;
          return q;
        },
      });
    } catch (e) {
      var m = e && e.message ? String(e.message) : "bilinmeyen hata";
      window.alert("PDF olusturulamadi: " + m);
    } finally {
      opsPdfDownloadInFlight = false;
      if (btn) btn.disabled = false;
    }
  }

  function wireOpPdfButtonsOnce() {
    [
      ["op-hk-pdf", "hk"],
      ["op-tech-pdf", "tech"],
      ["op-front-pdf", "front"],
    ].forEach(function (pair) {
      var el = document.getElementById(pair[0]);
      if (!el || el.dataset.vionaPdfBound) return;
      el.dataset.vionaPdfBound = "1";
      el.addEventListener(
        "click",
        function (ev) {
          if (ev) {
            ev.preventDefault();
            ev.stopPropagation();
          }
          void downloadOpsDayPdf(pair[1]);
        },
        false,
      );
    });
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

  var OPS_OPEN_QUEUE_FETCH = 100;
  /** Banner boyalı isteklerde yarışı önlemek: son tetikleyici kazanır. */
  var OPS_BANNER_PAINT_SEQ = { hk: 0, tech: 0, front: 0 };

  function bumpOpsBannerPaintSeq(slot) {
    var k = String(slot || "hk").trim();
    OPS_BANNER_PAINT_SEQ[k] = (OPS_BANNER_PAINT_SEQ[k] || 0) + 1;
    return OPS_BANNER_PAINT_SEQ[k];
  }

  /** Şeritteki gün sayısıyla aynı geriye dönük aralık (otel takvim günü). */
  function opBannerLookbackRange() {
    var days = enumerateOpStripDays(OP_DAY_STRIP_COUNT);
    if (!days.length) {
      var t = hotelCalendarYmd(new Date());
      return { from: t, to: t };
    }
    return { from: days[days.length - 1], to: days[0] };
  }

  /** Bekliyor + yapılıyor; kayıt tarihi şerit aralığında; en eski üstte. */
  async function fetchOpsOpenQueueRows(bucketTypes) {
    var range = opBannerLookbackRange();
    var base = { from: range.from, to: range.to };
    var tasks = (bucketTypes || []).map(function (bt) {
      return Promise.all([
        adapter.getBucketPage(bt, 1, OPS_OPEN_QUEUE_FETCH, Object.assign({}, base, { status: "pending" })).catch(function () {
          return { items: [] };
        }),
        adapter.getBucketPage(bt, 1, OPS_OPEN_QUEUE_FETCH, Object.assign({}, base, { status: "in_progress" })).catch(function () {
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

  async function paintOpsPendingBanner(hostId, bucketTypes, title, slotKey) {
    var slot = String(slotKey || "hk").trim();
    var myGen = bumpOpsBannerPaintSeq(slot);
    var host = document.getElementById(hostId);
    if (!host || typeof ui.renderOpsPendingQueueBanner !== "function") return;
    try {
      var range = opBannerLookbackRange();
      var hint =
        "Kayıt günü " +
        ymdToTrDots(range.from) +
        " – " +
        ymdToTrDots(range.to) +
        " · " +
        OP_HOTEL_TZ +
        " · en eski kayıt üstte";
      var rows = await fetchOpsOpenQueueRows(bucketTypes);
      if (myGen !== OPS_BANNER_PAINT_SEQ[slot]) return;
      ui.renderOpsPendingQueueBanner(host, {
        title: title,
        hint: hint,
        rows: rows,
        hideWhenEmpty: true,
        maxRows: 12,
      });
    } catch (_e) {
      if (myGen === OPS_BANNER_PAINT_SEQ[slot]) host.innerHTML = "";
    }
  }

  var opSearchDebounceTimer = null;
  function scheduleOpSearchRefresh() {
    if (opSearchDebounceTimer) clearTimeout(opSearchDebounceTimer);
    opSearchDebounceTimer = setTimeout(function () {
      opSearchDebounceTimer = null;
      if (activeAdminTab === "op_hk") {
        opHkPage = 1;
        void loadOpHk(1);
      } else if (activeAdminTab === "op_tech") {
        opTechPage = 1;
        void loadOpTech(1);
      } else if (activeAdminTab === "op_front") {
        opFrontPages = { complaint: 1, guest_notification: 1, late_checkout: 1 };
        void loadOpFront();
      }
      scheduleAutoRefresh();
    }, 350);
  }

  function wireOpFilterDayInputsOnce() {
    var layout = document.getElementById("admin-layout");
    if (!layout || layout.dataset.vionaOpFilterDayBound) return;
    layout.dataset.vionaOpFilterDayBound = "1";
    ["op-hk", "op-tech", "op-front"].forEach(function (prefix) {
      var el = document.getElementById(prefix + "-filter-day");
      if (!el || el.dataset.vionaOpDayInputBound) return;
      el.dataset.vionaOpDayInputBound = "1";
      el.addEventListener("change", function () {
        var v = String(el.value || "").trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return;
        var todayY = hotelCalendarYmd(new Date());
        selectOpCalendarDay(v, v === todayY);
        scheduleAutoRefresh();
      });
    });
  }

  function wireOpFilterSearchInputsOnce() {
    var layout = document.getElementById("admin-layout");
    if (!layout || layout.dataset.vionaOpSearchInputBound) return;
    layout.dataset.vionaOpSearchInputBound = "1";
    function bindOne(prefix, filterObj) {
      var el = document.getElementById(prefix + "-filter-search");
      if (!el || el.dataset.vionaOpSearchBound) return;
      el.dataset.vionaOpSearchBound = "1";
      el.addEventListener("input", function () {
        filterObj.search = String(el.value || "").trim().slice(0, 80);
        scheduleOpSearchRefresh();
      });
    }
    bindOne("op-hk", opFilterHk);
    bindOne("op-tech", opFilterTech);
    var elF = document.getElementById("op-front-filter-search");
    if (elF && !elF.dataset.vionaOpSearchBound) {
      elF.dataset.vionaOpSearchBound = "1";
      elF.addEventListener("input", function () {
        var t = opFrontFilterActiveType;
        var o = opFilterFrontByType[t] || { status: "", from: "", to: "", room: "", search: "" };
        o.search = String(elF.value || "").trim().slice(0, 80);
        opFilterFrontByType[t] = o;
        scheduleOpSearchRefresh();
      });
    }
  }

  function openTab(tab) {
    var isHome = tab == null || tab === "" || tab === "home";
    activeAdminTab = isHome ? null : tab;
    var home = document.getElementById("tab-dashboard");
    if (home) home.classList.toggle("hidden", !isHome);
    Object.keys(tabMap).forEach(function (k) {
      var el = document.getElementById(tabMap[k]);
      if (!el) return;
      el.classList.toggle("hidden", isHome || tab !== k);
    });
    document.querySelectorAll(".admin-nav button").forEach(function (b) {
      var dt = b.getAttribute("data-tab") || "";
      var isActive;
      if (isHome) {
        isActive = dt === "home";
      } else {
        isActive = dt === tab;
      }
      b.classList.toggle("is-active", isActive);
      if (isActive) {
        b.setAttribute("aria-current", "page");
      } else {
        b.removeAttribute("aria-current");
      }
    });
  }


  function emptyMergeResult() {
    return { items: [], truncated: false };
  }

  function normalizeMergeResult(raw) {
    if (raw && typeof raw === "object" && !Array.isArray(raw) && Array.isArray(raw.items)) {
      return { items: raw.items, truncated: Boolean(raw.truncated) };
    }
    if (Array.isArray(raw)) {
      return { items: raw, truncated: false };
    }
    return emptyMergeResult();
  }

  function syncGuestNotifSubtabUi() {
    var isLate = guestNotifSubtab === "late_checkout";
    var listGn = document.getElementById("list-guest-notifications");
    var listLc = document.getElementById("list-late-checkouts");
    if (listGn) listGn.classList.toggle("hidden", isLate);
    if (listLc) listLc.classList.toggle("hidden", !isLate);
    document.querySelectorAll("[data-gn-subtab]").forEach(function (b) {
      var sub = b.getAttribute("data-gn-subtab") || "";
      var on = sub === guestNotifSubtab;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
  }

  async function loadGuestNotifVisible() {
    syncGuestNotifSubtabUi();
    if (guestNotifSubtab === "late_checkout") {
      await loadBucket("late_checkout", "list-late-checkouts");
    } else {
      await loadBucket("guest_notification", "list-guest-notifications");
    }
  }

  async function loadOpHk(page) {
    var mount = document.getElementById("op-hk-mount");
    if (!mount) return;
    if (page != null) opHkPage = page;
    maybeAdvanceOpHotelToday();
    syncOpFiltersAndDomFromSelectedDay();
    renderOpDayStrips();
    try {
      void paintOpsPendingBanner("op-hk-pending-banner", ["request"], "Açık işler (HK · bekleyen & yapılıyor)", "hk");
      var fqHk = opQueryFromFilter(opFilterHk);
      var pairHk = await Promise.all([
        adapter.getBucketPage("request", opHkPage, OP_ACTION_PAGE_SIZE, fqHk),
        adapter.getBucketTypeSummary("request", fqHk).catch(function () {
          return null;
        }),
      ]);
      var res = pairHk[0];
      paintOpHkTechSummary("op-hk-summary-mount", "request", pairHk[1], res);
      ui.renderBucketTable(mount, "request", res.items || [], {
        pagination: res.pagination,
        readOnly: false,
        onPage: function (p) {
          void loadOpHk(p);
        },
        onStatus: async function (bt, id, status) {
          await adapter.updateStatus(bt, id, status);
          await loadOpHk(opHkPage);
        },
        onDelete: async function (bt, id) {
          await adapter.deleteItem(bt, id);
          await loadOpHk(opHkPage);
        },
        onWhatsappResend: async function (itemType, id) {
          try {
            await adapter.resendWhatsappOperational(itemType, id);
            window.alert("Kayıt operasyon WhatsApp (Cloud API) hattına yeniden iletildi.");
            await loadOpHk(opHkPage);
          } catch (err) {
            var msg =
              err && err.message
                ? String(err.message)
                : "WhatsApp iletimi tamamlanamadı. Bağlantıyı veya sunucu yanıtını kontrol edin.";
            window.alert(msg);
          }
        },
      });
      void refreshOpDayStripMiniStats();
    } catch (e) {
      bumpOpsBannerPaintSeq("hk");
      var bh = document.getElementById("op-hk-pending-banner");
      if (bh) bh.innerHTML = "";
      mount.innerHTML =
        '<p class="admin-load-error">' + escHtml(formatAdminBucketLoadError(e)) + "</p>";
    }
  }

  function escHtml(s) {
    var d = document.createElement("div");
    d.textContent = String(s || "");
    return d.innerHTML;
  }

  async function loadOpTech(page) {
    var mount = document.getElementById("op-tech-mount");
    if (!mount) return;
    if (page != null) opTechPage = page;
    maybeAdvanceOpHotelToday();
    syncOpFiltersAndDomFromSelectedDay();
    renderOpDayStrips();
    try {
      void paintOpsPendingBanner("op-tech-pending-banner", ["fault"], "Açık işler (Teknik · bekleyen & yapılıyor)", "tech");
      var fqTech = opQueryFromFilter(opFilterTech);
      var pairTech = await Promise.all([
        adapter.getBucketPage("fault", opTechPage, OP_ACTION_PAGE_SIZE, fqTech),
        adapter.getBucketTypeSummary("fault", fqTech).catch(function () {
          return null;
        }),
      ]);
      var res = pairTech[0];
      paintOpHkTechSummary("op-tech-summary-mount", "fault", pairTech[1], res);
      ui.renderBucketTable(mount, "fault", res.items || [], {
        pagination: res.pagination,
        readOnly: false,
        onPage: function (p) {
          void loadOpTech(p);
        },
        onStatus: async function (bt, id, status) {
          await adapter.updateStatus(bt, id, status);
          await loadOpTech(opTechPage);
        },
        onDelete: async function (bt, id) {
          await adapter.deleteItem(bt, id);
          await loadOpTech(opTechPage);
        },
        onWhatsappResend: async function (itemType, id) {
          try {
            await adapter.resendWhatsappOperational(itemType, id);
            window.alert("Kayıt operasyon WhatsApp (Cloud API) hattına yeniden iletildi.");
            await loadOpTech(opTechPage);
          } catch (err) {
            var msg =
              err && err.message
                ? String(err.message)
                : "WhatsApp iletimi tamamlanamadı. Bağlantıyı veya sunucu yanıtını kontrol edin.";
            window.alert(msg);
          }
        },
      });
      void refreshOpDayStripMiniStats();
    } catch (e) {
      bumpOpsBannerPaintSeq("tech");
      var techBan = document.getElementById("op-tech-pending-banner");
      if (techBan) techBan.innerHTML = "";
      mount.innerHTML =
        '<p class="admin-load-error">' + escHtml(formatAdminBucketLoadError(e)) + "</p>";
    }
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

  /**
   * Özet API'si 0 veya hata döndüğünde: liste sayımı (pagination.total) doğrudur;
   * tek sayfada tüm kayıtlar yüklendiyse durum kırılımını listedeki satırlardan üret (özet–liste tutarlılığı).
   */
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

  function paintOpHkTechSummary(hostId, bucketType, sumRaw, listPack) {
    var host = document.getElementById(hostId);
    if (!host) return;
    if (typeof ui.renderOpsSingleBucketSummary !== "function") return;
    try {
      var enriched = enrichFrontTypeSummaryWithPack(sumRaw, listPack);
      ui.renderOpsSingleBucketSummary(host, { bucketType: bucketType, row: enriched });
    } catch (e) {
      host.innerHTML =
        '<div class="op-front-summary glass-block" role="status"><p class="admin-load-error">' +
        escHtml(formatAdminBucketLoadError(e)) +
        "</p></div>";
    }
  }

  var OP_FRONT_TAB_KEY = "viona_op_front_tab";
  var OP_FRONT_SCOPE_LABELS = {
    complaint: "Şikâyetler",
    guest_notification: "Misafir bildirimleri",
    late_checkout: "Geç çıkış",
  };

  function updateOpFrontFilterScopeLabel() {
    var el = document.getElementById("op-front-filter-scope");
    if (!el) return;
    var lab = OP_FRONT_SCOPE_LABELS[opFrontFilterActiveType] || opFrontFilterActiveType;
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
    var y = m.from && /^\d{4}-\d{2}-\d{2}$/.test(String(m.from).trim()) ? String(m.from).trim() : opSelectedCalendarDay;
    if (day) day.value = y || "";
    if (room) room.value = m.room || "";
    if (qSearch) qSearch.value = m.search != null ? String(m.search) : "";
  }

  function wireOpFrontFilterBarOnce() {
    var applyBtn = document.getElementById("op-front-filter-apply");
    var clearBtn = document.getElementById("op-front-filter-clear");
    if (applyBtn && !applyBtn.dataset.vionaBound) {
      applyBtn.dataset.vionaBound = "1";
      applyBtn.addEventListener("click", function () {
        var next = readOpFilterFromDom("op-front");
        var todayY = hotelCalendarYmd(new Date());
        if (/^\d{4}-\d{2}-\d{2}$/.test(next.from)) {
          opSelectedCalendarDay = next.from;
          opFollowHotelToday = next.from === todayY;
          persistOpDayState();
        }
        syncOpFiltersAndDomFromSelectedDay();
        renderOpDayStrips();
        var y = String(opSelectedCalendarDay || "").trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(y)) y = hotelCalendarYmd(new Date());
        opFilterFrontByType[opFrontFilterActiveType] = {
          status: next.status,
          from: y,
          to: y,
          room: next.room,
          search: next.search || "",
        };
        ["complaint", "guest_notification", "late_checkout"].forEach(function (k) {
          if (k === opFrontFilterActiveType) return;
          var o = opFilterFrontByType[k] || { status: "", from: "", to: "", room: "", search: "" };
          o.from = y;
          o.to = y;
          opFilterFrontByType[k] = o;
        });
        opFrontPages = { complaint: 1, guest_notification: 1, late_checkout: 1 };
        void loadOpFront();
        scheduleAutoRefresh();
      });
    }
    if (clearBtn && !clearBtn.dataset.vionaBound) {
      clearBtn.dataset.vionaBound = "1";
      clearBtn.addEventListener("click", function () {
        var y = opSelectedCalendarDay;
        opFilterFrontByType.complaint = { status: "", from: y, to: y, room: "", search: "" };
        opFilterFrontByType.guest_notification = { status: "", from: y, to: y, room: "", search: "" };
        opFilterFrontByType.late_checkout = { status: "", from: y, to: y, room: "", search: "" };
        clearOpFilterDomStatusRoom("op-front");
        var sF = document.getElementById("op-front-filter-search");
        if (sF) sF.value = "";
        syncOpFiltersAndDomFromSelectedDay();
        opFrontPages = { complaint: 1, guest_notification: 1, late_checkout: 1 };
        void loadOpFront();
        scheduleAutoRefresh();
      });
    }
  }

  async function loadOpFront(pageType, page) {
    var mount = document.getElementById("op-front-mount");
    if (!mount) return;
    if (pageType && page != null) opFrontPages[pageType] = page;
    maybeAdvanceOpHotelToday();
    syncOpFiltersAndDomFromSelectedDay();
    renderOpDayStrips();
    try {
      void paintOpsPendingBanner(
        "op-front-pending-banner",
        ["complaint", "guest_notification", "late_checkout"],
        "Açık işler (Ön büro · bekleyen & yapılıyor)",
        "front",
      );
      try {
        var tab = String(sessionStorage.getItem(OP_FRONT_TAB_KEY) || "").trim();
        if (tab === "guest_notification" || tab === "late_checkout" || tab === "complaint") {
          opFrontFilterActiveType = tab;
        }
      } catch (_sk) {}
      syncOpFrontFilterFormFromActiveType();
      updateOpFrontFilterScopeLabel();
      var fqC = opQueryFromFilter(opFilterFrontByType.complaint);
      var fqGn = opQueryFromFilter(opFilterFrontByType.guest_notification);
      var fqLc = opQueryFromFilter(opFilterFrontByType.late_checkout);
      var results = await Promise.all([
        adapter.getFrontOfficeTypeSummary("complaint", fqC).catch(function () {
          return null;
        }),
        adapter.getFrontOfficeTypeSummary("guest_notification", fqGn).catch(function () {
          return null;
        }),
        adapter.getFrontOfficeTypeSummary("late_checkout", fqLc).catch(function () {
          return null;
        }),
        adapter.getBucketPage("complaint", opFrontPages.complaint, OP_ACTION_PAGE_SIZE, fqC),
        adapter.getBucketPage(
          "guest_notification",
          opFrontPages.guest_notification,
          OP_ACTION_PAGE_SIZE,
          fqGn,
        ),
        adapter.getBucketPage("late_checkout", opFrontPages.late_checkout, OP_ACTION_PAGE_SIZE, fqLc),
      ]);
      var nc = enrichFrontTypeSummaryWithPack(results[0], results[3]);
      var ngn = enrichFrontTypeSummaryWithPack(results[1], results[4]);
      var nlc = enrichFrontTypeSummaryWithPack(results[2], results[5]);
      var summary = mergeNormFrontTypes(nc, ngn, nlc);
      var c = results[3];
      var gn = results[4];
      var lc = results[5];
      ui.renderOperationFront(
        mount,
        { complaint: c, guest_notification: gn, late_checkout: lc },
        {
          readOnly: false,
          onPage: function (bt, p) {
            opFrontPages[bt] = p;
            void loadOpFront();
          },
          onStatus: async function (bt, id, status) {
            await adapter.updateStatus(bt, id, status);
            await loadOpFront();
          },
          onDelete: async function (bt, id) {
            await adapter.deleteItem(bt, id);
            await loadOpFront();
          },
          onWhatsappResend: async function (itemType, id) {
            try {
              await adapter.resendWhatsappOperational(itemType, id);
              window.alert("Kayıt operasyon WhatsApp (Cloud API) hattına yeniden iletildi.");
              await loadOpFront();
            } catch (err) {
              var msg =
                err && err.message
                  ? String(err.message)
                  : "WhatsApp iletimi tamamlanamadı. Bağlantıyı veya sunucu yanıtını kontrol edin.";
              window.alert(msg);
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
      void refreshOpDayStripMiniStats();
    } catch (e) {
      bumpOpsBannerPaintSeq("front");
      var bf = document.getElementById("op-front-pending-banner");
      if (bf) bf.innerHTML = "";
      mount.innerHTML =
        '<p class="admin-load-error">' + escHtml(formatAdminBucketLoadError(e)) + "</p>";
    }
  }

  async function loadDashboard() {
    if (dashboardLoadPromise) {
      return await dashboardLoadPromise;
    }
    dashboardLoadPromise = (async function () {
      var report;
      var dashReportOk = true;
      var dashReportErr = "";
      try {
        report = await adapter.getDashboardReport();
      } catch (e) {
        dashReportOk = false;
        report = {};
        dashReportErr = e && e.message ? String(e.message) : "";
      }
      var buckets = await Promise.all([
        adapter.getBucketMergeAll("request", BUCKET_MERGE_MAX_PAGES).catch(emptyMergeResult),
        adapter.getBucketMergeAll("complaint", BUCKET_MERGE_MAX_PAGES).catch(emptyMergeResult),
        adapter.getBucketMergeAll("fault", BUCKET_MERGE_MAX_PAGES).catch(emptyMergeResult),
        adapter.getBucketMergeAll("guest_notification", BUCKET_MERGE_MAX_PAGES).catch(emptyMergeResult),
        adapter.getBucketMergeAll("late_checkout", BUCKET_MERGE_MAX_PAGES).catch(emptyMergeResult),
      ]);
      var br = buckets.map(normalizeMergeResult);
      var dashTruncated = br.some(function (x) {
        return x.truncated;
      });
      var warnEl = document.getElementById("dashboard-api-warning");
      if (warnEl) {
        if (!dashReportOk) {
          warnEl.textContent =
            "Özet rapor şu an yüklenemedi" +
            (dashReportErr ? " — " + dashReportErr : "") +
            ". Geliştirici araçlarında /admin/reports/dashboard isteğini doğrulayın (404: API adresi). Operasyon listeleri bağımsız istekle gelmeye devam eder.";
          warnEl.classList.remove("hidden");
          warnEl.removeAttribute("aria-hidden");
        } else {
          warnEl.textContent = "";
          warnEl.classList.add("hidden");
          warnEl.setAttribute("aria-hidden", "true");
        }
      }
      var mergeWarnEl = document.getElementById("dashboard-merge-warning");
      if (mergeWarnEl) {
        if (dashTruncated) {
          mergeWarnEl.textContent =
            "Özet, bazı listelerde " +
            BUCKET_MERGE_MAX_PAGES +
            " sayfa üst sınırına takıldı; toplamlar eksik görünebilir. Tam veri için ilgili sekmeyi açın.";
          mergeWarnEl.classList.remove("hidden");
          mergeWarnEl.removeAttribute("aria-hidden");
        } else {
          mergeWarnEl.textContent = "";
          mergeWarnEl.classList.add("hidden");
          mergeWarnEl.setAttribute("aria-hidden", "true");
        }
      }
      if (!report || typeof report !== "object") {
        report = {};
      }
      var cb = report.chatbotPerformance || {};
      if (!Array.isArray(cb.dailyUsage)) cb.dailyUsage = [];
      if (!Array.isArray(cb.topQuestions)) cb.topQuestions = [];
      var sat = report.satisfaction || {};
      var satCat = sat.categories || {};
      var uq = report.unansweredQuestions || {};
      if (!Array.isArray(uq.topFallbackQuestions)) uq.topFallbackQuestions = [];
      if (!Array.isArray(uq.repeatedUnanswered)) uq.repeatedUnanswered = [];

      var dashData = {
        request: br[0].items,
        complaint: br[1].items,
        fault: br[2].items,
        guest_notification: br[3].items,
        late_checkout: br[4].items,
      };
      renderHomeTopStrip(dashData, report, dashTruncated);
      renderDashboardAlerts(dashData);
      void adapter
        .getOpsTeamEntryUrls()
        .then(function (d) {
          applyOpsTeamEntryUrls(d);
        })
        .catch(function () {});
      ui.renderKpis(document.getElementById("kpi-cards"), report.kpis);
      ui.renderMetricRows(document.getElementById("report-chatbot"), [
        {
          title: "Toplam sohbet sayısı",
          value: cb.totalChats,
          desc: "Ana sayfa KPI ile aynı: son ~30 gün (tarih boşken), test kayıtları hariç; chat_observations satırı.",
        },
        { title: "Benzersiz oturum", value: cb.uniqueSessions != null ? cb.uniqueSessions : "—", desc: "Farklı session_id (veya bilinmeyen) grupları." },
        { title: "Günlük kullanım (gün)", value: cb.dailyUsage.length, desc: "En az bir kayıt olan takvim günü sayısı." },
        { title: "Oturum başına mesaj", value: cb.avgMessagesPerUser, desc: "Toplam satır ÷ benzersiz oturum." },
        { title: "Fallback oranı", value: (cb.fallbackRate != null ? cb.fallbackRate : 0) + "%", desc: "layer_used=fallback olan satırların payı." },
        { title: "En sık soru (metin)", value: (cb.topQuestions[0] || {}).key || "-", desc: "user_message alanına göre gruplanır (küçük harfe çevrilmiş)." },
      ]);
      ui.renderMetricRows(document.getElementById("report-satisfaction"), [
        {
          title: "Anket ortalaması (özet)",
          value: sat.overallScore,
          desc: "overall_score satır ortalaması (veya kategori / soru yedekleri).",
        },
        {
          title: "Viona ortalaması",
          value: sat.vionaScore,
          desc: "viona_rating veya viona soru ortalamaları.",
        },
        {
          title: "Genel değerlendirme",
          value: satCat.generalEval || "-",
          desc: "hotel_categories.generalEval (tek gönderim ortalaması).",
        },
        {
          title: "Yemek & içecek (alt başlıklar ort.)",
          value: (function () {
            var m = surveyCategoryMean(satCat, [
              "food_main_restaurant",
              "food_la_terracca",
              "food_snack_dolphin_gusto",
              "food_bars",
            ]);
            if (m !== "-") return m;
            return satCat.food != null && Number(satCat.food) > 0 ? String(satCat.food) : "-";
          })(),
          desc: "Yeni şema: dört alt anahtarın ortalaması. Eski kayıtlar: hotel_categories.food.",
        },
        { title: "Oda & konfor", value: satCat.comfort || "-", desc: "hotel_categories.comfort." },
        { title: "Resepsiyon & ekip", value: satCat.staff || "-", desc: "hotel_categories.staff." },
        {
          title: "Havuz & plaj (havuz + plaj ort.)",
          value: (function () {
            var m = surveyCategoryMean(satCat, ["pool_area", "beach_area"]);
            if (m !== "-") return m;
            return satCat.poolBeach != null && Number(satCat.poolBeach) > 0 ? String(satCat.poolBeach) : "-";
          })(),
          desc: "Yeni şema: pool_area + beach_area. Eski kayıtlar: hotel_categories.poolBeach.",
        },
        { title: "Spa & wellness", value: satCat.spaWellness || "-", desc: "hotel_categories.spaWellness." },
        {
          title: "Misafir deneyimi & hizmet",
          value: satCat.guestExperience || "-",
          desc: "hotel_categories.guestExperience (yeni şema).",
        },
        {
          title: "Sürdürülebilirlik",
          value: satCat.sustainability || "-",
          desc: "hotel_categories.sustainability — çevre dostu uygulamalar, bilgilendirme, genel sürdürülebilirlik algısı.",
        },
        {
          title: "Genel deneyim (eski anket)",
          value: satCat.generalExperience || "-",
          desc: "Yalnızca eski uygulama kayıtlarında hotel_categories.generalExperience.",
        },
        {
          title: "Temizlik (eski anket)",
          value: satCat.cleanliness || "-",
          desc: "Eski şema; yeni ankette ayrı kategori yok, sorular oda/havuz/plajda.",
        },
      ]);
      ui.renderMetricRows(document.getElementById("report-unanswered"), [
        { title: "Fallback satır sayısı", value: uq.fallbackCount, desc: "chat_observations içinde layer_used=fallback." },
        { title: "En sık fallback metni", value: (uq.topFallbackQuestions[0] || {}).key || "-", desc: "Aynı user_message gruplaması (küçük harf)." },
        { title: "Tekrarlayan başlık", value: uq.repeatedUnanswered.length, desc: "En az 2 kez görülen fallback mesajı çeşidi." },
      ]);
      var ins = report.chatInsights || {};
      var ti0 = ins.topIntents && ins.topIntents[0];
      var lang0 = ins.topUiLanguages && ins.topUiLanguages[0];
      var totalC = Number(cb.totalChats) || 0;
      var recN = ins.recommendationCount != null ? ins.recommendationCount : 0;
      ui.renderMetricRows(document.getElementById("report-chat-insights"), [
        {
          title: "En sık niyet",
          value: formatTopIntentLine(ti0),
          desc: "intent alanı (küçük harf gruplanır). Ham anahtar: " + (ti0 && ti0.key ? ti0.key : "—") + ".",
        },
        {
          title: "Öneri / venue sinyali",
          value: (ins.recommendationRate != null ? ins.recommendationRate : 0) + "%",
          desc: "recommendation_made=true satırları (" + recN + " / " + totalC + ").",
        },
        {
          title: "Resepsiyon hedefi",
          value: (ins.routeReception != null ? ins.routeReception : 0) + " (" + dashboardFmtPct(ins.routeReception, totalC) + ")",
          desc: "route_target = reception.",
        },
        {
          title: "Misafir ilişkileri hedefi",
          value: (ins.routeGuestRelations != null ? ins.routeGuestRelations : 0) + " (" + dashboardFmtPct(ins.routeGuestRelations, totalC) + ")",
          desc: "route_target = guest_relations.",
        },
        {
          title: "Hedef yok / diğer",
          value: (ins.routeOther != null ? ins.routeOther : 0) + " (" + dashboardFmtPct(ins.routeOther, totalC) + ")",
          desc: "Boş, none veya başka route_target.",
        },
        {
          title: "En sık arayüz dili",
          value: lang0 && lang0.key ? String(lang0.key).toUpperCase() + " · " + lang0.count + " mesaj" : "—",
          desc: "ui_language (misafir dil seçimi).",
        },
        {
          title: "Farklı niyet çeşidi",
          value: ins.intentVariety != null ? ins.intentVariety : "—",
          desc: "Dönemde görülen benzersiz intent sayısı.",
        },
      ]);
      renderAnalyticsDataSources(report);
    })();
    try {
      return await dashboardLoadPromise;
    } finally {
      dashboardLoadPromise = null;
    }
  }

  function clearAutoRefresh() {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  }

  function scheduleAutoRefresh() {
    clearAutoRefresh();
    refreshTimer = setInterval(function () {
      if (document.hidden || activeAdminTab === "pdf-report") return;
      void refreshCurrentView();
    }, AUTO_REFRESH_MS);
  }

  async function refreshCurrentView() {
    if (document.hidden || refreshInFlight) return;
    if (activeAdminTab === "pdf-report") return;
    refreshInFlight = true;
    try {
      if (activeAdminTab == null) {
        await loadDashboard();
      } else if (activeAdminTab === "requests") {
        await loadBucket("request", "list-requests");
      } else if (activeAdminTab === "complaints") {
        await loadBucket("complaint", "list-complaints");
      } else if (activeAdminTab === "faults") {
        await loadBucket("fault", "list-faults");
      } else if (activeAdminTab === "guest_notifications") {
        await loadGuestNotifVisible();
      } else if (activeAdminTab === "op_hk") {
        await loadOpHk();
      } else if (activeAdminTab === "op_tech") {
        await loadOpTech();
      } else if (activeAdminTab === "op_front") {
        await loadOpFront();
      } else if (activeAdminTab === "evaluations") {
        await loadEvaluations();
      } else if (activeAdminTab === "logs") {
        await loadLogs();
      }
    } catch (_e) {
    } finally {
      refreshInFlight = false;
    }
  }

  /** fetch/undici: "Failed to fetch", "TypeError: fetch failed", cause.code EAI_AGAIN (DNS). */
  function isBrowserNetworkFailure(e) {
    var m = e && e.message ? String(e.message) : "";
    if (m.indexOf("Failed to fetch") === 0 || m.indexOf("NetworkError") === 0) return true;
    if (/fetch failed/i.test(m)) return true;
    var c = e && e.cause;
    if (c && String(c.code || "") === "EAI_AGAIN") return true;
    return false;
  }

  function formatAdminBucketLoadError(e) {
    var m = e && e.message ? String(e.message) : "";
    var tail = " Ağ bağlantısını, API tabanını (data-viona-live-api) ve panel girişini kontrol edin.";
    if (!m) return "Veri yüklenemedi." + tail;
    if (m === "unauthorized" || m === "http_401") {
      return "Yetkisiz erişim (401). Oturum süresi dolmuş olabilir; panele yeniden giriş yapın.";
    }
    if (m === "admin_auth_not_configured") {
      return "Sunucuda yönetici kimliği yapılandırılmamış (ADMIN_API_TOKEN).";
    }
    if (m === "SUPABASE_NOT_CONFIGURED") {
      return "Sunucuda Supabase yapılandırılmamış; ortam değişkenlerini kontrol edin.";
    }
    if (m === "invalid admin bucket type") {
      return "Geçersiz liste türü. Sunucu ile admin panel sürümü uyumsuz olabilir; ikisini güncelleyin.";
    }
    if (/^http_\d+$/.test(m)) {
      return "API yanıtı HTTP " + m.replace(/^http_/, "") + "." + tail;
    }
    if (isBrowserNetworkFailure(e)) {
      return "İstek ağ üzerinden tamamlanamadı (CORS, HTTPS karışımı, DNS veya sunucu kapalı olabilir)." + tail;
    }
    return "Veri yüklenemedi: " + m + "." + tail;
  }

  async function loadBucket(type, mountId, page, opts) {
    var mount = document.getElementById(mountId);
    if (!mount) return;
    var rethrow = opts && opts.rethrow;
    try {
      var pageNum = page != null ? page : bucketListPage[type] || 1;
      bucketListPage[type] = pageNum;
      var res = await adapter.getBucketPage(type, pageNum, BUCKET_LIST_PAGE_SIZE);
      var rows = res.items || [];
      var pagination = res.pagination || null;
      if (
        rows.length === 0 &&
        pagination &&
        pagination.page > 1 &&
        (pagination.total || 0) > 0
      ) {
        await loadBucket(type, mountId, pagination.page - 1, opts);
        return;
      }
      var bucketReadOnly =
        type === "request" ||
        type === "complaint" ||
        type === "fault" ||
        type === "guest_notification" ||
        type === "late_checkout";
      var bucketHandlers = {
        pagination: pagination,
        onPage: function (nextPage) {
          void loadBucket(type, mountId, nextPage);
        },
        readOnly: bucketReadOnly,
      };
      if (bucketReadOnly) {
        bucketHandlers.onSatisfaction = async function (itemType, id, score, note) {
          try {
            await adapter.patchSatisfaction(itemType, id, {
              score: score === "" || score == null ? null : Number(score),
              note: note,
            });
            window.alert("Misafir memnuniyeti kaydedildi.");
            await loadBucket(type, mountId, undefined, { rethrow: true });
          } catch (err) {
            var msg =
              err && err.message
                ? String(err.message)
                : "Kayıt başarısız. Bağlantıyı veya yetkiyi kontrol edin.";
            window.alert(msg);
            throw err;
          }
        };
      } else {
        bucketHandlers.onStatus = async function (itemType, id, status) {
          try {
            await adapter.updateStatus(itemType, id, status);
            await loadBucket(type, mountId, undefined, { rethrow: true });
          } catch (err) {
            var msg =
              err && err.message
                ? String(err.message)
                : "Durum güncellenemedi. Bağlantıyı veya sunucu yanıtını kontrol edin.";
            window.alert(msg);
          }
        };
        bucketHandlers.onDelete = async function (itemType, id) {
          if (!window.confirm("Kaydı silmek istiyor musunuz?")) return;
          await adapter.deleteItem(itemType, id);
          await loadBucket(type, mountId);
        };
        bucketHandlers.onWhatsappResend = async function (itemType, id) {
          try {
            await adapter.resendWhatsappOperational(itemType, id);
            window.alert("Kayıt operasyon WhatsApp (Cloud API) hattına yeniden iletildi.");
            await loadBucket(type, mountId, undefined, { rethrow: true });
          } catch (err) {
            var msg =
              err && err.message
                ? String(err.message)
                : "WhatsApp iletimi tamamlanamadı. Bağlantıyı veya sunucu yanıtını kontrol edin.";
            window.alert(msg);
          }
        };
        if (type === "request") {
          bucketHandlers.onCreate = async function (payload) {
            await adapter.createGuestRequest(payload);
            await loadBucket(type, mountId);
          };
        }
      }
      ui.renderBucketTable(mount, type, rows, bucketHandlers);
    } catch (e) {
      mount.textContent = "";
      var errP = document.createElement("p");
      errP.className = "admin-load-error";
      errP.textContent = formatAdminBucketLoadError(e);
      mount.appendChild(errP);
      if (rethrow) throw e;
    }
  }

  async function loadEvaluations() {
    var mount = document.getElementById("evaluations-mount");
    var statusEl = document.getElementById("evaluations-status");
    if (!mount) return;
    var fromEl = document.getElementById("eval-date-from");
    var toEl = document.getElementById("eval-date-to");
    var params = {};
    if (fromEl && fromEl.value) params.from = fromEl.value;
    if (toEl && toEl.value) params.to = toEl.value;
    if (statusEl) {
      statusEl.textContent = "Yükleniyor…";
      statusEl.classList.remove("eval-status--error");
    }
    try {
      var report = await adapter.getSurveyReport(params);
      ui.renderSurveyEvaluations(mount, report);
      if (statusEl) statusEl.textContent = "";
    } catch (_e) {
      ui.renderSurveyEvaluations(mount, null);
      if (statusEl) {
        statusEl.textContent = "Anket raporu alınamadı; API veya tarih aralığını kontrol edin.";
        statusEl.classList.add("eval-status--error");
      }
    }
  }

  function wireEvaluationsToolbar() {
    var applyBtn = document.getElementById("eval-apply");
    var clearBtn = document.getElementById("eval-clear-dates");
    if (applyBtn) applyBtn.addEventListener("click", function () { void loadEvaluations(); });
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        var fromEl = document.getElementById("eval-date-from");
        var toEl = document.getElementById("eval-date-to");
        if (fromEl) fromEl.value = "";
        if (toEl) toEl.value = "";
        void loadEvaluations();
      });
    }
  }

  async function loadLogs() {
    var sumEl = document.getElementById("logs-summary");
    var tableEl = document.getElementById("logs-table");
    try {
      var params = getLogsParams();
      var pair = await Promise.all([adapter.getLogsSummary(params), adapter.getLogs(params)]);
      var summary = pair[0];
      var result = pair[1];
      var pag = result.pagination || {};
      var totalPages = pag.totalPages != null ? pag.totalPages : 1;
      if (totalPages >= 1 && logsPage > totalPages) {
        logsPage = Math.max(1, totalPages);
        return loadLogs();
      }
      ui.renderLogsSummary(sumEl, summary || {});
      ui.renderLogsTable(tableEl, result.items || [], {
        pagination: pag,
        onPage: function (nextPage) {
          logsPage = nextPage;
          void loadLogs();
        },
        onDelete: async function (id) {
          if (!window.confirm("Bu log kaydı silinsin mi?")) return;
          await adapter.deleteLog(id);
          await loadLogs();
        },
        onBulkDelete: async function (ids) {
          var list = (ids || []).filter(Boolean);
          if (!list.length) return;
          if (
            !window.confirm(
              list.length +
                " log kaydı kalıcı olarak silinsin mi? Bu işlem geri alınamaz.",
            )
          ) {
            return;
          }
          try {
            var res = await adapter.deleteLogsBulk(list);
            var n = res && res.deleted != null ? res.deleted : list.length;
            window.alert(String(n) + " kayıt silindi.");
          } catch (e) {
            window.alert("Toplu silme başarısız: " + (e && e.message ? e.message : "bilinmeyen hata"));
          }
          await loadLogs();
        },
      });
    } catch (_e) {
      if (sumEl) sumEl.innerHTML = "";
      if (tableEl) {
        tableEl.innerHTML =
          '<p class="admin-load-error">Loglar yüklenemedi. Filtreleri sadeleştirip tekrar deneyin.</p>';
      }
    }
  }

  function getLogsParams() {
    return {
      page: logsPage,
      pageSize: LOGS_PAGE_SIZE,
      search: (document.getElementById("logs-search") || {}).value || "",
      from: (document.getElementById("logs-from") || {}).value || "",
      to: (document.getElementById("logs-to") || {}).value || "",
      language: (document.getElementById("logs-language") || {}).value || "",
      intent: (document.getElementById("logs-intent") || {}).value || "",
      layer: (document.getElementById("logs-layer") || {}).value || "",
      include_raw_payload: (document.getElementById("logs-include-raw") || {}).checked ? "true" : "false",
    };
  }

  function downloadBlob(blob, fileName) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function wireLogsControls() {
    var applyBtn = document.getElementById("logs-apply");
    var csvBtn = document.getElementById("logs-csv");
    var jsonBtn = document.getElementById("logs-json");
    if (applyBtn) {
      applyBtn.addEventListener("click", function () {
        logsPage = 1;
        loadLogs();
      });
    }
    if (csvBtn) {
      csvBtn.addEventListener("click", async function () {
        if (logsExportInFlight) return;
        logsExportInFlight = true;
        csvBtn.disabled = true;
        try {
          var params = getLogsParams();
          var blob = await adapter.downloadLogsCsv(params);
          downloadBlob(blob, "chat_observations.csv");
        } catch (e) {
          window.alert("CSV indirilemedi: " + (e && e.message ? e.message : "bilinmeyen hata"));
        } finally {
          logsExportInFlight = false;
          csvBtn.disabled = false;
        }
      });
    }
    if (jsonBtn) {
      jsonBtn.addEventListener("click", async function () {
        if (logsExportInFlight) return;
        logsExportInFlight = true;
        jsonBtn.disabled = true;
        try {
          var params = getLogsParams();
          var blob = await adapter.downloadLogsJson(params);
          downloadBlob(blob, "chat_observations.json");
        } catch (e) {
          window.alert("JSON indirilemedi: " + (e && e.message ? e.message : "bilinmeyen hata"));
        } finally {
          logsExportInFlight = false;
          jsonBtn.disabled = false;
        }
      });
    }
  }

  function countPending(rows) {
    return rows.filter(function (r) {
      var st = String(r.status || "new");
      return st === "new" || st === "pending" || st === "in_progress";
    }).length;
  }

  /** İstek / şikâyet / arıza satırı — sayım ve ana sayfa özetleri için tek tip. */
  function normAdminIssueStatus(row) {
    var st = String((row && row.status) || "new")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
    if (st === "inprogress") return "in_progress";
    return st;
  }

  function countByStatus(rows, status) {
    return rows.filter(function (r) {
      return String(r.status || "new") === status;
    }).length;
  }

  function filterRowsSubmittedOnHotelDay(rows, ymd) {
    return rows.filter(function (r) {
      return submittedAtHotelCalendarDay(r.submitted_at) === ymd;
    });
  }

  /**
   * Operasyon satırları: Bekliyor (yeni+kuyruk), Yapılıyor, Yapıldı, Yapılmadı; iptal ayrı.
   * Ana sayfa pano ve şerit için ortak sayım.
   */
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

  function homeOpsPanoCatHtml(title, rows) {
    var k = countOpsKanbanStatus(rows);
    var iptalHtml =
      k.iptal > 0
        ? '<span class="home-ops-pano__iptal" title="İptal edilen kayıtlar">' + k.iptal + " iptal</span>"
        : "";
    return (
      '<li class="home-ops-pano__cat">' +
      '<span class="home-ops-pano__cat-title">' +
      title +
      '</span><div class="home-ops-pano__metrics" role="group">' +
      '<span class="home-ops-pano__m"><span class="home-ops-pano__mk">Bekliyor</span><span class="home-ops-pano__mv">' +
      k.bekliyor +
      '</span></span><span class="home-ops-pano__m"><span class="home-ops-pano__mk">Yapılıyor</span><span class="home-ops-pano__mv">' +
      k.yapiliyor +
      '</span></span><span class="home-ops-pano__m"><span class="home-ops-pano__mk">Yapıldı</span><span class="home-ops-pano__mv">' +
      k.yapildi +
      '</span></span><span class="home-ops-pano__m"><span class="home-ops-pano__mk">Yapılmadı</span><span class="home-ops-pano__mv">' +
      k.yapilmadi +
      "</span></span>" +
      iptalHtml +
      "</div></li>"
    );
  }

  function renderAnalyticsDataSources(report) {
    var el = document.getElementById("dashboard-analytics-meta");
    if (!el) return;
    var ds = report && report.dataSources;
    if (!ds) {
      el.textContent = "";
      el.className = "home-analytics-meta";
      return;
    }
    var chatOk = ds.chatObservations === true;
    var survOk = ds.surveys === true;
    var line =
      "Sohbet günlüğü: " +
      (chatOk ? "ok" : "eksik") +
      " · Anket tablosu: " +
      (survOk ? "ok" : "eksik") +
      ". Özet yaklaşık her " +
      Math.round(AUTO_REFRESH_MS / 1000) +
      " sn'de yenilenir.";
    el.className = "home-analytics-meta" + (ds.usedMockFallback ? " home-analytics-meta--warn" : "");
    if (ds.usedMockFallback) {
      el.textContent = "Bazı veri kaynakları yanıt vermedi; rakamlar eksik olabilir. " + line;
    } else {
      el.textContent = line;
    }
  }

  function applyOpsTeamEntryUrls(payload) {
    var pages = payload && payload.pages;
    if (!pages) return;
    document.querySelectorAll("a.js-ops-team-link[data-ops-role]").forEach(function (a) {
      var role = a.getAttribute("data-ops-role");
      var entry = role && pages[role];
      if (!entry || !entry.href) return;
      a.setAttribute("href", entry.href);
      a.setAttribute("rel", "noopener");
      if (entry.hasToken) {
        a.setAttribute("title", "Bağlantıda ekip şifresi taşınır; paylaşırken dikkat edin.");
      } else {
        a.setAttribute(
          "title",
          "Token yok: sayfa yalnızca bu admin sitesinden veya sunucuda OPS_TRUST_OPS_PAGE_HEADER ile açılabilir.",
        );
      }
    });
  }

  function renderHomeTopStrip(data, report, stripTruncated) {
    var el = document.getElementById("home-top-strip");
    if (!el) return;
    stripTruncated = Boolean(stripTruncated);
    var reqRows = data.request || [];
    var comRows = data.complaint || [];
    var faultRows = data.fault || [];
    var notifRows = data.guest_notification || [];
    var lcRows = data.late_checkout || [];
    var allOpRows = reqRows.concat(comRows).concat(faultRows).concat(notifRows).concat(lcRows);
    var stripAgg = countOpsKanbanStatus(allOpRows);
    var todayYmd = hotelCalendarYmd(new Date());
    var todayLabel =
      typeof ui.formatIsoDateDisplayTr === "function" ? ui.formatIsoDateDisplayTr(todayYmd) : todayYmd;
    var reqToday = filterRowsSubmittedOnHotelDay(reqRows, todayYmd);
    var comToday = filterRowsSubmittedOnHotelDay(comRows, todayYmd);
    var faultToday = filterRowsSubmittedOnHotelDay(faultRows, todayYmd);
    var notifToday = filterRowsSubmittedOnHotelDay(notifRows, todayYmd);
    var kpis = report && report.kpis ? report.kpis : {};
    var totalChats = kpis.totalChats != null ? kpis.totalChats : "—";
    var fb = kpis.fallbackRate != null ? kpis.fallbackRate + "%" : "—";
    var mem =
      kpis.overallSatisfaction != null && kpis.vionaSatisfaction != null
        ? kpis.overallSatisfaction + " / " + kpis.vionaSatisfaction
        : "—";
    var refreshed =
      typeof ui.formatDateTimeDisplayTr === "function"
        ? ui.formatDateTimeDisplayTr(new Date().toISOString())
        : String(new Date().toLocaleString("tr-TR"));
    var mergeNote =
      '<p class="home-dash-foot home-dash-foot--compact">Her liste en fazla <strong>' +
      BUCKET_MERGE_MAX_PAGES +
      "</strong> sayfa çekilir; veritabanındaki tam satır değildir." +
      (stripTruncated ? " <strong>Kesinti var.</strong>" : "") +
      " Tam rakamlar için ilgili operasyon sekmesini açın.</p>";
    var catsAll =
      '<ul class="home-ops-pano__cats" role="list">' +
      homeOpsPanoCatHtml("İstekler", reqRows) +
      homeOpsPanoCatHtml("Şikâyetler", comRows) +
      homeOpsPanoCatHtml("Arızalar", faultRows) +
      homeOpsPanoCatHtml("Misafir bildirimleri", notifRows) +
      "</ul>";
    var catsToday =
      '<ul class="home-ops-pano__cats" role="list">' +
      homeOpsPanoCatHtml("İstekler", reqToday) +
      homeOpsPanoCatHtml("Şikâyetler", comToday) +
      homeOpsPanoCatHtml("Arızalar", faultToday) +
      homeOpsPanoCatHtml("Misafir bildirimleri", notifToday) +
      "</ul>";
    var globalBar =
      '<div class="home-top-strip__bar home-top-strip__bar--global home-top-strip__bar--pano">' +
      '<div class="home-ops-pano__title-row">' +
      '<h3 class="home-dash-h">Operasyon pano özeti</h3>' +
      mergeNote +
      "</div>" +
      '<div class="home-ops-pano" role="region" aria-label="Operasyon özeti">' +
      '<section class="home-ops-pano__section" aria-labelledby="home-pano-all-h">' +
      '<div class="home-ops-pano__head">' +
      '<h4 id="home-pano-all-h" class="home-ops-pano__h">Tüm zamanlar</h4>' +
      "</div>" +
      catsAll +
      "</section>" +
      '<section class="home-ops-pano__section home-ops-pano__section--today" aria-labelledby="home-pano-today-h">' +
      '<div class="home-ops-pano__head">' +
      '<h4 id="home-pano-today-h" class="home-ops-pano__h">Bugün</h4>' +
      '<span class="home-ops-pano__sub">Kayıt günü (otel saati · ' +
      escHtml(OP_HOTEL_TZ) +
      "): " +
      todayLabel +
      "</span>" +
      "</div>" +
      catsToday +
      "</section>" +
      "</div></div>";
    var iptalDiger = stripAgg.iptal + stripAgg.diger;
    var iptalLi =
      iptalDiger > 0
        ? '<li class="home-stat home-stat--muted" title="İptal veya tanınmayan durum (yüklü örnekte).">' +
          '<span class="home-stat__label">İptal / diğer</span>' +
          '<span class="home-stat__value home-stat__value--compact">' +
          iptalDiger +
          "</span></li>"
        : "";
    el.innerHTML =
      '<div class="home-top-strip__layout">' +
      globalBar +
      '<div class="home-top-strip__bar home-top-strip__bar--metrics">' +
      '<ul class="home-top-strip__stats home-top-strip__stats--dense" role="list">' +
      '<li class="home-stat home-stat--accent" title="İstek, şikâyet, arıza, misafir bildirimi ve geç çıkış: bu yüklemedeki satır sayısı.">' +
      '<span class="home-stat__label">Toplam operasyon</span>' +
      '<span class="home-stat__value">' +
      stripAgg.toplam +
      '</span><span class="home-stat__hint">Özet yükleme</span></li>' +
      '<li class="home-stat" title="Bekliyor: veritabanında new veya pending durumundaki kayıtlar.">' +
      '<span class="home-stat__label">Bekliyor</span>' +
      '<span class="home-stat__value">' +
      stripAgg.bekliyor +
      "</span></li>" +
      '<li class="home-stat" title="Yapılıyor (in_progress).">' +
      '<span class="home-stat__label">Yapılıyor</span>' +
      '<span class="home-stat__value">' +
      stripAgg.yapiliyor +
      "</span></li>" +
      '<li class="home-stat" title="Tamamlanan.">' +
      '<span class="home-stat__label">Yapıldı</span>' +
      '<span class="home-stat__value">' +
      stripAgg.yapildi +
      "</span></li>" +
      '<li class="home-stat" title="Olumsuz kapanış.">' +
      '<span class="home-stat__label">Yapılmadı</span>' +
      '<span class="home-stat__value">' +
      stripAgg.yapilmadi +
      "</span></li>" +
      iptalLi +
      '<li class="home-stat" title="Tarih boşken pano ile aynı pencere (son ~30 gün); test kayıtları hariç.">' +
      '<span class="home-stat__label">Toplam sohbet sayısı</span><span class="home-stat__value">' +
      totalChats +
      "</span></li>" +
      '<li class="home-stat"><span class="home-stat__label">Fallback</span><span class="home-stat__value">' +
      fb +
      "</span></li>" +
      '<li class="home-stat"><span class="home-stat__label">Memnuniyet (otel / Viona)</span><span class="home-stat__value home-stat__value--compact">' +
      mem +
      "</span></li>" +
      '<li class="home-stat"><span class="home-stat__label">Özet saati</span><span class="home-stat__value home-stat__value--time">' +
      refreshed +
      "</span></li>" +
      "</ul></div></div>";
  }

  function oldestOpenText(rows) {
    var open = rows
      .filter(function (r) {
        var st = String(r.status || "new");
        return st === "new" || st === "pending" || st === "in_progress";
      })
      .sort(function (a, b) {
        return String(a.submitted_at || "").localeCompare(String(b.submitted_at || ""));
      });
    if (!open.length) return "Bekleyen kayıt yok";
    var raw = String(open[0].submitted_at || "");
    if (!raw) return "Tarih yok";
    return typeof ui.formatDateTimeDisplayTr === "function" ? ui.formatDateTimeDisplayTr(raw) : raw;
  }

  function renderReminderCard(opts) {
    var kpiLabel = opts.openKpiLabel != null ? opts.openKpiLabel : "Beklemede";
    var progLabel = opts.inProgressLabel != null ? opts.inProgressLabel : "Yapılıyor";
    var metaLine =
      opts.statusMetaLine != null
        ? opts.statusMetaLine
        : "Bekliyor: " +
          (Number(opts.newCount || 0) + Number(opts.pendingCount || 0)) +
          " · " +
          progLabel +
          ": " +
          opts.inProgressCount;
    return (
      '<article class="alert-card">' +
      '<div class="alert-card__head"><h4 class="alert-card__title">' +
      opts.title +
      "</h4></div>" +
      '<p class="alert-card__kpi">' +
      kpiLabel +
      ": <strong>" +
      opts.openCount +
      "</strong></p>" +
      '<p class="alert-card__meta">' +
      metaLine +
      "</p>" +
      '<p class="alert-card__meta">En eski bekleyen: ' +
      opts.oldestOpen +
      "</p>" +
      '<button type="button" class="alert-openbtn" data-go-tab="' +
      opts.tab +
      '"><span class="alert-openbtn__text">Listeyi aç</span><span class="alert-openbtn__arrow" aria-hidden="true">→</span></button>' +
      "</article>"
    );
  }

  function renderDashboardAlerts(data) {
    var el = document.getElementById("dashboard-alerts");
    if (!el) return;
    var reqRows = data.request || [];
    var comRows = data.complaint || [];
    var faultRows = data.fault || [];
    var notifRows = (data.guest_notification || []).concat(data.late_checkout || []);

    var req = countPending(reqRows);
    var com = countPending(comRows);
    var fault = countPending(faultRows);
    var notif = countPending(notifRows);
    var reqN = countByStatus(reqRows, "new");
    var reqP = countByStatus(reqRows, "pending");
    var reqI = countByStatus(reqRows, "in_progress");
    var comN = countByStatus(comRows, "new");
    var comP = countByStatus(comRows, "pending");
    var comI = countByStatus(comRows, "in_progress");
    var faultN = countByStatus(faultRows, "new");
    var faultP = countByStatus(faultRows, "pending");
    var faultI = countByStatus(faultRows, "in_progress");
    var notifN = countByStatus(notifRows, "new");
    var notifP = countByStatus(notifRows, "pending");
    var notifI = countByStatus(notifRows, "in_progress");

    var html =
      '<div class="alert-grid">' +
      renderReminderCard({
        title: "İstekler",
        openKpiLabel: "Açıkta (iş gerektirir)",
        openCount: req,
        newCount: reqN,
        pendingCount: reqP,
        inProgressCount: reqI,
        statusMetaLine:
          "Bekliyor: " +
          (reqN + reqP) +
          (reqI > 0 ? " · Yapılıyor: " + reqI : " · Yapılıyor: 0"),
        oldestOpen: oldestOpenText(reqRows),
        tab: "op_hk",
      }) +
      renderReminderCard({
        title: "Şikâyetler",
        openKpiLabel: "Açıkta (iş gerektirir)",
        openCount: com,
        newCount: comN,
        pendingCount: comP,
        inProgressCount: comI,
        statusMetaLine:
          "Bekliyor: " +
          (comN + comP) +
          (comI > 0 ? " · Yapılıyor: " + comI : " · Yapılıyor: 0"),
        oldestOpen: oldestOpenText(comRows),
        tab: "op_front",
      }) +
      renderReminderCard({
        title: "Arızalar",
        openKpiLabel: "Açıkta (iş gerektirir)",
        openCount: fault,
        newCount: faultN,
        pendingCount: faultP,
        inProgressCount: faultI,
        statusMetaLine:
          "Bekliyor: " +
          (faultN + faultP) +
          (faultI > 0 ? " · Yapılıyor: " + faultI : " · Yapılıyor: 0"),
        oldestOpen: oldestOpenText(faultRows),
        tab: "op_tech",
      }) +
      renderReminderCard({
        title: "Misafir bildirimleri + geç çıkış",
        openKpiLabel: "Açıkta (iş gerektirir)",
        openCount: notif,
        newCount: notifN,
        pendingCount: notifP,
        inProgressCount: notifI,
        statusMetaLine:
          "İki kova birleşik özet · Bekliyor: " +
          (notifN + notifP) +
          (notifI > 0 ? " · Yapılıyor: " + notifI : " · Yapılıyor: 0") +
          " · Ön büro sekmesinde bildirim ve geç çıkış ayrı süzülür.",
        oldestOpen: oldestOpenText(notifRows),
        tab: "op_front",
      }) +
      "</div>";
    el.innerHTML = html;
    el.querySelectorAll(".alert-openbtn[data-go-tab]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        var tab = btn.getAttribute("data-go-tab");
        var prevTab = activeAdminTab;
        openTab(tab);
        if (isOperasyonAdminTab(tab) && isOperasyonAdminTab(prevTab) && tab !== prevTab) {
          resetOpCalendarToHotelToday();
        }
        if (tab === "requests") await loadBucket("request", "list-requests");
        if (tab === "complaints") await loadBucket("complaint", "list-complaints");
        if (tab === "faults") await loadBucket("fault", "list-faults");
        if (tab === "guest_notifications") {
          guestNotifSubtab = "notifications";
          await loadGuestNotifVisible();
        }
        if (tab === "op_hk") await loadOpHk();
        if (tab === "op_tech") await loadOpTech();
        if (tab === "op_front") await loadOpFront();
        scheduleAutoRefresh();
      });
    });
  }

  function pdfToLocalDateInputValue(d) {
    var dt = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return dt.toISOString().slice(0, 10);
  }

  function seedPdfCustomDatesIfEmpty() {
    var fromEl = document.getElementById("pdf-date-from");
    var toEl = document.getElementById("pdf-date-to");
    if (!fromEl || !toEl) return;
    if (fromEl.value && toEl.value) return;
    var now = new Date();
    toEl.value = pdfToLocalDateInputValue(now);
    fromEl.value = pdfToLocalDateInputValue(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30));
  }

  function setPdfCustomRangeUi(active) {
    var wrap = document.getElementById("pdf-custom-dates-wrap");
    var fromEl = document.getElementById("pdf-date-from");
    var toEl = document.getElementById("pdf-date-to");
    if (wrap) {
      wrap.classList.toggle("is-active", active);
      wrap.setAttribute("aria-disabled", active ? "false" : "true");
    }
    if (fromEl) fromEl.disabled = !active;
    if (toEl) toEl.disabled = !active;
  }

  function triggerBlobDownload(blob, fileName) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = fileName || "viona-raporu.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function wirePdfReportPanel() {
    var explainBtn = document.getElementById("pdf-preview-info-btn");
    var downloadBtn = document.getElementById("pdf-download-btn");
    var statusEl = document.getElementById("pdf-download-status");
    var warningText = document.getElementById("pdf-warning-text");
    var customCb = document.getElementById("pdf-custom-range");
    if (!downloadBtn) return;

    setPdfCustomRangeUi(false);
    if (customCb) {
      customCb.addEventListener("change", function () {
        var on = Boolean(customCb.checked);
        setPdfCustomRangeUi(on);
        if (on) seedPdfCustomDatesIfEmpty();
      });
    }

    if (explainBtn) {
      explainBtn.addEventListener("click", function () {
        if (warningText) {
          warningText.textContent =
            "Rapor; ölçüm, sınıflandırma, yorum ve öneri adımlarıyla üretilir. Sonuçları trendle birlikte okuyun; tek döneme dayanarak kesin yargıya varmayın.";
        }
        window.alert("Kapsam ve metodoloji metni güncellendi. İndirmeden önce bu notu inceleyebilirsiniz.");
      });
    }

    downloadBtn.addEventListener("click", async function () {
      var hotelName = "Kaila Beach Hotel";
      var useCustom = customCb && customCb.checked;
      var from = (document.getElementById("pdf-date-from").value || "").trim();
      var to = (document.getElementById("pdf-date-to").value || "").trim();
      var params = { hotelName: hotelName };

      if (useCustom) {
        if (!from || !to) return window.alert("Özel dönem için başlangıç ve bitiş tarihlerini seçin.");
        if (new Date(from).getTime() > new Date(to).getTime()) {
          return window.alert("Başlangıç tarihi bitiş tarihinden büyük olamaz.");
        }
        params.from = from;
        params.to = to;
        if (!window.confirm("Seçtiğiniz tarih aralığı için PDF indirilsin mi?")) return;
      } else {
        if (!window.confirm("Güncel özet penceresiyle (pano ile aynı dönem) PDF indirilsin mi?")) return;
      }

      if (statusEl) statusEl.textContent = "PDF rapor oluşturuluyor...";
      downloadBtn.disabled = true;
      try {
        var result = await adapter.downloadPdfReport(params);
        triggerBlobDownload(result.blob, result.fileName);
        if (statusEl) {
          var snap = result.reportSnapshotId ? " Veri özeti (snapshot): " + result.reportSnapshotId + "." : "";
          statusEl.textContent = result.noData
            ? "Seçilen kapsamda veri yok veya çok sınırlı. PDF yine oluşturuldu." + snap
            : "PDF indirildi; varsayılan indirmede dönem pano özetiyle uyumludur (snapshot)." + snap;
        }
      } catch (e) {
        var msg = String((e && e.message) || "");
        if (isBrowserNetworkFailure(e)) {
          if (statusEl)
            statusEl.textContent =
              "PDF rapor oluşturulamadı: Sunucuya ulaşılamıyor veya istek zaman aşımı (Render’da PDF + AI uzun sürebilir). Ağı ve API adresini kontrol edin.";
        } else if (statusEl) {
          statusEl.textContent =
            "PDF rapor oluşturulamadı: " + (msg.length > 220 ? msg.slice(0, 217) + "…" : msg || "Bilinmeyen hata.");
        }
      } finally {
        downloadBtn.disabled = false;
      }
    });
  }

  function wireTabs() {
    document.querySelectorAll(".admin-nav button").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        var tab = btn.getAttribute("data-tab");
        var previousActive = activeAdminTab;
        openTab(tab);
        if (activeAdminTab === null) {
          if (previousActive !== null) {
            try {
              await loadDashboard();
            } catch (_e) {}
          }
          scheduleAutoRefresh();
          return;
        }
        if (tab === "requests") await loadBucket("request", "list-requests");
        if (tab === "complaints") await loadBucket("complaint", "list-complaints");
        if (tab === "faults") await loadBucket("fault", "list-faults");
        if (tab === "guest_notifications") {
          guestNotifSubtab = "notifications";
          await loadGuestNotifVisible();
        }
        if (tab === "evaluations") await loadEvaluations();
        if (tab === "pdf-report") setPdfCustomRangeUi(Boolean(document.getElementById("pdf-custom-range") && document.getElementById("pdf-custom-range").checked));
        if (tab === "logs") await loadLogs();
        if (isOperasyonAdminTab(tab) && isOperasyonAdminTab(previousActive) && tab !== previousActive) {
          resetOpCalendarToHotelToday();
        }
        if (tab === "op_hk" || tab === "op_tech" || tab === "op_front") {
          maybeAdvanceOpHotelToday();
          syncOpFiltersAndDomFromSelectedDay();
          renderOpDayStrips();
        }
        if (tab === "op_hk") await loadOpHk();
        if (tab === "op_tech") await loadOpTech();
        if (tab === "op_front") await loadOpFront();
        scheduleAutoRefresh();
      });
    });
  }

  function wireGuestNotifSubtabs() {
    document.querySelectorAll("[data-gn-subtab]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        var sub = btn.getAttribute("data-gn-subtab");
        if (!sub || sub === guestNotifSubtab) return;
        guestNotifSubtab = sub;
        await loadGuestNotifVisible();
        scheduleAutoRefresh();
      });
    });
  }

  function wireBackHomeButtons() {
    document.querySelectorAll(".js-back-home").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        openTab(null);
        try {
          await loadDashboard();
        } catch (_e) {}
        scheduleAutoRefresh();
      });
    });
  }

  function readOpFilterFromDom(prefix) {
    var status = document.getElementById(prefix + "-filter-status");
    var day = document.getElementById(prefix + "-filter-day");
    var room = document.getElementById(prefix + "-filter-room");
    var qSearch = document.getElementById(prefix + "-filter-search");
    var y =
      day && day.value && /^\d{4}-\d{2}-\d{2}$/.test(String(day.value).trim())
        ? String(day.value).trim()
        : String(opSelectedCalendarDay || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(y)) y = hotelCalendarYmd(new Date());
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
    syncOpFiltersAndDomFromSelectedDay();
  }

  function wireOpFilterBars() {
    function bindBar(prefix, filterObj, applyPage) {
      var applyBtn = document.getElementById(prefix + "-filter-apply");
      var clearBtn = document.getElementById(prefix + "-filter-clear");
      if (applyBtn) {
        applyBtn.addEventListener("click", function () {
          var next = readOpFilterFromDom(prefix);
          var todayY = hotelCalendarYmd(new Date());
          if (/^\d{4}-\d{2}-\d{2}$/.test(next.from)) {
            opSelectedCalendarDay = next.from;
            opFollowHotelToday = next.from === todayY;
            persistOpDayState();
          }
          syncOpFiltersAndDomFromSelectedDay();
          renderOpDayStrips();
          filterObj.status = next.status;
          filterObj.room = next.room;
          filterObj.search = next.search || "";
          applyPage();
          scheduleAutoRefresh();
        });
      }
      if (clearBtn) {
        clearBtn.addEventListener("click", function () {
          filterObj.status = "";
          filterObj.room = "";
          filterObj.search = "";
          filterObj.from = opSelectedCalendarDay;
          filterObj.to = opSelectedCalendarDay;
          clearOpFilterDomStatusRoom(prefix);
          var sEl = document.getElementById(prefix + "-filter-search");
          if (sEl) sEl.value = "";
          syncOpFiltersAndDomFromSelectedDay();
          applyPage();
          scheduleAutoRefresh();
        });
      }
    }
    bindBar("op-hk", opFilterHk, function () {
      opHkPage = 1;
      void loadOpHk(1);
    });
    bindBar("op-tech", opFilterTech, function () {
      opTechPage = 1;
      void loadOpTech(1);
    });
    wireOpFrontFilterBarOnce();
  }

  function wireVisibilityRefresh() {
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) return;
      if (visibilityRefreshTimer) clearTimeout(visibilityRefreshTimer);
      visibilityRefreshTimer = setTimeout(function () {
        visibilityRefreshTimer = null;
        void refreshCurrentView();
      }, 450);
    });
  }

  var OPS_MUTATION_BC = "viona-ops-mutations";
  var opsMutationDebounce = null;
  function wireOpsBroadcastRefresh() {
    try {
      if (typeof BroadcastChannel === "undefined") return;
      var bc = new BroadcastChannel(OPS_MUTATION_BC);
      bc.onmessage = function () {
        if (document.hidden) return;
        if (opsMutationDebounce) clearTimeout(opsMutationDebounce);
        opsMutationDebounce = setTimeout(function () {
          opsMutationDebounce = null;
          void (async function () {
            try {
              if (activeAdminTab == null) await loadDashboard();
              else if (activeAdminTab === "requests") await loadBucket("request", "list-requests");
              else if (activeAdminTab === "complaints") await loadBucket("complaint", "list-complaints");
              else if (activeAdminTab === "faults") await loadBucket("fault", "list-faults");
              else if (activeAdminTab === "guest_notifications") await loadGuestNotifVisible();
              else if (activeAdminTab === "op_hk") {
                maybeAdvanceOpHotelToday();
                renderOpDayStrips();
                await loadOpHk();
              } else if (activeAdminTab === "op_tech") {
                maybeAdvanceOpHotelToday();
                renderOpDayStrips();
                await loadOpTech();
              } else if (activeAdminTab === "op_front") {
                maybeAdvanceOpHotelToday();
                renderOpDayStrips();
                await loadOpFront();
              }
            } catch (_e) {}
          })();
        }, 320);
      };
    } catch (_e) {}
  }

  async function init() {
    if (!staticAdminListenersBound) {
      staticAdminListenersBound = true;
      wireTabs();
      wireGuestNotifSubtabs();
      wireEvaluationsToolbar();
      wirePdfReportPanel();
      wireLogsControls();
      wireBackHomeButtons();
      wireOpFilterBars();
      wireOpFilterDayInputsOnce();
      wireOpFilterSearchInputsOnce();
      wireOpDayStripLayoutClick();
      wireOpPdfButtonsOnce();
      wireVisibilityRefresh();
      wireOpsBroadcastRefresh();
    }
    initOpDayStripFromStorage();
    maybeAdvanceOpHotelToday();
    syncOpFiltersAndDomFromSelectedDay();
    renderOpDayStrips();
    openTab(null);
    await loadDashboard();
    scheduleAutoRefresh();
  }

  function showPanel() {
    var login = document.getElementById("admin-login");
    var layout = document.getElementById("admin-layout");
    if (login) login.classList.add("hidden");
    if (layout) layout.classList.remove("hidden");
    document.body.classList.add("admin-body--app");
  }

  function showLogin() {
    var login = document.getElementById("admin-login");
    var layout = document.getElementById("admin-layout");
    if (layout) layout.classList.add("hidden");
    if (login) login.classList.remove("hidden");
    document.body.classList.remove("admin-body--app");
  }

  function wireLogout() {
    var btn = document.getElementById("admin-logout");
    if (!btn) return;
    btn.addEventListener("click", function () {
      try {
        sessionStorage.removeItem(LOGIN_OK_KEY);
        sessionStorage.removeItem(LOGIN_USER_KEY);
      } catch (_e) {}
      adapter.clearAdminToken();
      showLogin();
    });
  }

  function wireLogin() {
    var form = document.getElementById("admin-login-form");
    var err = document.getElementById("admin-login-error");
    var pw = document.getElementById("admin-password");
    var pwToggle = document.getElementById("admin-password-toggle");
    if (!form) return;
    if (pw && pwToggle) {
      pwToggle.addEventListener("click", function () {
        var show = pw.type === "password";
        pw.type = show ? "text" : "password";
        pwToggle.textContent = show ? "Gizle" : "Göster";
      });
    }
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var usernameEl = document.getElementById("admin-username");
      var u = String((usernameEl && usernameEl.value) || "");
      if (u !== ADMIN_USERNAME_REQUIRED) {
        if (err) {
          err.textContent =
            "Kullanıcı adı zorunludur ve tam olarak «Viona-Kaila» yazılmalıdır (büyük-küçük harf aynı olmalı).";
        }
        return;
      }
      var p = (document.getElementById("admin-password").value || "").trim();
      if (p) {
        try {
          adapter.setAdminToken(p);
          await adapter.validateAdminToken();
          sessionStorage.setItem(LOGIN_OK_KEY, "1");
          sessionStorage.setItem(LOGIN_USER_KEY, ADMIN_USERNAME_REQUIRED);
        } catch (_e) {}
        if (sessionStorage.getItem(LOGIN_OK_KEY) !== "1") {
          adapter.clearAdminToken();
          try {
            sessionStorage.removeItem(LOGIN_USER_KEY);
          } catch (_x) {}
          if (err) err.textContent = "Geçersiz veya yetkisiz şifre.";
          return;
        }
        if (err) err.textContent = "";
        showPanel();
        await init();
        return;
      }
      if (err) err.textContent = "Admin token zorunludur.";
    });
  }

  async function bootstrap() {
    wireLogin();
    wireLogout();
    var ok = false;
    try {
      ok =
        sessionStorage.getItem(LOGIN_OK_KEY) === "1" &&
        sessionStorage.getItem(LOGIN_USER_KEY) === ADMIN_USERNAME_REQUIRED &&
        adapter.hasAdminToken();
    } catch (_e) {
      ok = false;
    }
    if (!ok) {
      showLogin();
      return;
    }
    try {
      await adapter.validateAdminToken();
    } catch (_e) {
      try {
        sessionStorage.removeItem(LOGIN_OK_KEY);
        sessionStorage.removeItem(LOGIN_USER_KEY);
      } catch (_x) {}
      adapter.clearAdminToken();
      showLogin();
      return;
    }
    showPanel();
    await init();
  }

  bootstrap();
})();
