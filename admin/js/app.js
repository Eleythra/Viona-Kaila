(function () {
  "use strict";

  var adapter = window.AdminDataAdapter;
  var ui = window.AdminUI;
  if (!adapter || !ui) return;
  /** Aynı sayfada app.js iki kez çalışırsa (üretim CDN/şablon hatası) tüm dinleyiciler çoğalır; Loglar CSV/JSON ardı arkasına iner. */
  if (window.__VIONA_ADMIN_APP_BOOTED) return;
  window.__VIONA_ADMIN_APP_BOOTED = true;
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
  /** İstek / şikayet / arıza listeleri için sunucu sayfalama. */
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
    evaluations: "tab-evaluations",
    "pdf-report": "tab-pdf-report",
    logs: "tab-logs",
  };

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
      var waRoot = document.getElementById("dashboard-whatsapp-status");
      var waDetail = document.getElementById("dashboard-whatsapp-status-detail");
      if (waRoot && waDetail) {
        waRoot.classList.remove(
          "dashboard-whatsapp-status--ok",
          "dashboard-whatsapp-status--warn",
          "dashboard-whatsapp-status--loading",
          "dashboard-whatsapp-status--unavailable",
        );
        waRoot.classList.add("dashboard-whatsapp-status--loading");
        waDetail.textContent = "Operasyon hattı doğrulanıyor…";
        try {
          var waDiag = await adapter.getWhatsappAdminDiagnostics();
          var op = (waDiag && waDiag.operational) || {};
          var parts = [];
          if (op.cloudApiSendReady) {
            parts.push("WhatsApp Cloud API hazır (token + Phone number ID)");
            var cc = op.cloudRecipientCounts || {};
            parts.push(
              "Alıcı sayısı — Teknik (arıza): " +
                (cc.tech != null ? cc.tech : "—") +
                ", HK (istek): " +
                (cc.hk != null ? cc.hk : "—") +
                ", Ön büro (şikayet / misafir bildirimi / geç çıkış): " +
                (cc.front != null ? cc.front : "—"),
            );
          } else {
            parts.push(
              "WhatsApp gönderimi için eksik ayar: sunucuda WHATSAPP_ACCESS_TOKEN ve WHATSAPP_PHONE_NUMBER_ID",
            );
          }
          waDetail.textContent = parts.join(" · ");
          var warnWa = !op.cloudApiSendReady;
          waRoot.classList.remove("dashboard-whatsapp-status--loading");
          waRoot.classList.add(warnWa ? "dashboard-whatsapp-status--warn" : "dashboard-whatsapp-status--ok");
        } catch (_e) {
          waRoot.classList.remove("dashboard-whatsapp-status--loading");
          waRoot.classList.add("dashboard-whatsapp-status--unavailable", "dashboard-whatsapp-status--warn");
          waDetail.textContent =
            "Durum okunamadı. Ağınızı veya sunucu yanıtını kontrol edin; özet kısa süre içinde yenilenecek.";
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

      var gnMerge = br[3].items.concat(br[4].items);
      var dashData = {
        request: br[0].items,
        complaint: br[1].items,
        fault: br[2].items,
        guest_notification: gnMerge,
      };
      renderHomeTopStrip(dashData, report);
      renderDashboardAlerts(dashData);
      ui.renderKpis(document.getElementById("kpi-cards"), report.kpis);
      ui.renderMetricRows(document.getElementById("report-chatbot"), [
        { title: "Toplam Sohbet", value: cb.totalChats, desc: "chat_observations satır sayısı (her misafir mesajı için bir kayıt)." },
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
      ui.renderBucketTable(mount, type, rows, {
        pagination: pagination,
        onPage: function (nextPage) {
          void loadBucket(type, mountId, nextPage);
        },
        onStatus: async function (itemType, id, status) {
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
        },
        onDelete: async function (itemType, id) {
          if (!window.confirm("Kaydı silmek istiyor musunuz?")) return;
          await adapter.deleteItem(itemType, id);
          await loadBucket(type, mountId);
        },
        onWhatsappResend: async function (itemType, id) {
          try {
            await adapter.resendWhatsappOperational(itemType, id);
            window.alert("Kayıt operasyon WhatsApp grubuna yeniden iletildi.");
            await loadBucket(type, mountId, undefined, { rethrow: true });
          } catch (err) {
            var msg =
              err && err.message
                ? String(err.message)
                : "WhatsApp iletimi tamamlanamadı. Bağlantıyı veya sunucu yanıtını kontrol edin.";
            window.alert(msg);
          }
        },
        onCreate: async function (payload) {
          await adapter.createGuestRequest(payload);
          await loadBucket(type, mountId);
        },
      });
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

  /** İstek / şikayet / arıza satırı — sayım ve ana sayfa özetleri için tek tip. */
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

  function todayIsoLocal() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function submittedDateKey(row) {
    var raw = String((row && row.submitted_at) || "").trim();
    if (raw.length >= 10) {
      var slice = raw.slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(slice)) return slice;
    }
    return "";
  }

  function filterRowsSubmittedOnDay(rows, isoDay) {
    return rows.filter(function (r) {
      return submittedDateKey(r) === isoDay;
    });
  }

  /** Bugünkü kayıt: beklemede, tamamlanan, olumsuz; iptal ve bilinmeyen ayrı (toplama girer). */
  function countOpsBeklemeYapildi(rows) {
    var w = 0;
    var y = 0;
    var j = 0;
    var c = 0;
    var o = 0;
    rows.forEach(function (r) {
      var st = normAdminIssueStatus(r);
      if (st === "done") y++;
      else if (st === "rejected") j++;
      else if (st === "new" || st === "pending" || st === "in_progress") w++;
      else if (st === "cancelled") c++;
      else o++;
    });
    return { wait: w, done: y, rej: j, cancelled: c, other: o };
  }

  /** Tüm zamanlar: istek+şikayet+arıza birleşik (toplam = tüm durumların toplamı). */
  function opsGlobalSnapshot(reqRows, comRows, faultRows, notifRows) {
    var merged = (reqRows || [])
      .concat(comRows || [])
      .concat(faultRows || [])
      .concat(notifRows || []);
    var open = 0;
    var done = 0;
    var rej = 0;
    var cancelled = 0;
    var other = 0;
    merged.forEach(function (r) {
      var st = normAdminIssueStatus(r);
      if (st === "done") done++;
      else if (st === "rejected") rej++;
      else if (st === "new" || st === "pending" || st === "in_progress") open++;
      else if (st === "cancelled") cancelled++;
      else other++;
    });
    return {
      open: open,
      done: done,
      rejected: rej,
      cancelled: cancelled,
      other: other,
      total: merged.length,
    };
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

  function renderHomeTopStrip(data, report) {
    var el = document.getElementById("home-top-strip");
    if (!el) return;
    var reqRows = data.request || [];
    var comRows = data.complaint || [];
    var faultRows = data.fault || [];
    var notifRows = data.guest_notification || [];
    var totalRecords = reqRows.length + comRows.length + faultRows.length + notifRows.length;
    var todayIso = todayIsoLocal();
    var todayLabel =
      typeof ui.formatIsoDateDisplayTr === "function" ? ui.formatIsoDateDisplayTr(todayIso) : todayIso;
    var reqToday = filterRowsSubmittedOnDay(reqRows, todayIso);
    var comToday = filterRowsSubmittedOnDay(comRows, todayIso);
    var faultToday = filterRowsSubmittedOnDay(faultRows, todayIso);
    var notifToday = filterRowsSubmittedOnDay(notifRows, todayIso);
    var reqSp = countOpsBeklemeYapildi(reqToday);
    var comSp = countOpsBeklemeYapildi(comToday);
    var faultSp = countOpsBeklemeYapildi(faultToday);
    var notifSp = countOpsBeklemeYapildi(notifToday);
    var opsAll = opsGlobalSnapshot(reqRows, comRows, faultRows, notifRows);
    var opsWaitTotal = reqSp.wait + comSp.wait + faultSp.wait + notifSp.wait;
    var opsDoneTotal = reqSp.done + comSp.done + faultSp.done + notifSp.done;
    var opsRejTotal = reqSp.rej + comSp.rej + faultSp.rej + notifSp.rej;
    var opsExtraToday =
      reqSp.cancelled +
      reqSp.other +
      comSp.cancelled +
      comSp.other +
      faultSp.cancelled +
      faultSp.other +
      notifSp.cancelled +
      notifSp.other;
    var opsExtraAll = opsAll.cancelled + opsAll.other;
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
    var opsLineExtrasAll = opsExtraAll > 0 ? " · İptal/diğer: <strong>" + opsExtraAll + "</strong>" : "";
    var opsLineExtrasToday = opsExtraToday > 0 ? " · İptal/diğer: <strong>" + opsExtraToday + "</strong>" : "";
    var globalBar =
      '<div class="home-top-strip__bar home-top-strip__bar--global">' +
      '<div class="home-global-grid home-global-grid--single">' +
      '<div class="home-global-card">' +
      '<span class="home-global-card__k">İstek · Şikayet · Arıza · Misafir bildirimi + geç çıkış (tüm zamanlar)</span>' +
      '<p class="home-global-card__body">Beklemede: <strong>' +
      opsAll.open +
      "</strong> · Tamamlanan: <strong>" +
      opsAll.done +
      "</strong> · Olumsuz: <strong>" +
      opsAll.rejected +
      "</strong> · Toplam kayıt: <strong>" +
      opsAll.total +
      "</strong>" +
      opsLineExtrasAll +
      "</p>" +
      '<p class="home-global-card__sub">Bugün (kayıt tarihi ' +
      todayLabel +
      "): Beklemede <strong>" +
      opsWaitTotal +
      "</strong> · Tamamlanan <strong>" +
      opsDoneTotal +
      "</strong> · Olumsuz <strong>" +
      opsRejTotal +
      "</strong>" +
      opsLineExtrasToday +
      "</p>" +
      "</div></div>" +
      '<p class="home-global-hint">Üst özet tüm zamanlar. Alt şerit: bugün oluşturulan istek, şikayet, arıza ve bildirim kayıtları.</p>' +
      "</div>";
    var opsTypeItems =
      '<li class="home-res-venue">' +
      '<span class="home-res-venue__name">İstekler</span>' +
      '<div class="home-res-venue__split" role="group" aria-label="İstekler bugün">' +
      '<span class="home-res-venue__leg"><span class="home-res-venue__leg-k">Beklemede</span> ' +
      '<span class="home-res-venue__leg-v">' +
      reqSp.wait +
      "</span></span>" +
      '<span class="home-res-venue__leg"><span class="home-res-venue__leg-k">Tamamlanan</span> ' +
      '<span class="home-res-venue__leg-v">' +
      reqSp.done +
      "</span></span>" +
      '<span class="home-res-venue__leg"><span class="home-res-venue__leg-k">Olumsuz</span> ' +
      '<span class="home-res-venue__leg-v">' +
      reqSp.rej +
      "</span></span></div></li>" +
      '<li class="home-res-venue">' +
      '<span class="home-res-venue__name">Şikayetler</span>' +
      '<div class="home-res-venue__split" role="group" aria-label="Şikayetler bugün">' +
      '<span class="home-res-venue__leg"><span class="home-res-venue__leg-k">Beklemede</span> ' +
      '<span class="home-res-venue__leg-v">' +
      comSp.wait +
      "</span></span>" +
      '<span class="home-res-venue__leg"><span class="home-res-venue__leg-k">Dikkate alındı</span> ' +
      '<span class="home-res-venue__leg-v">' +
      comSp.done +
      "</span></span>" +
      '<span class="home-res-venue__leg"><span class="home-res-venue__leg-k">Alınmadı</span> ' +
      '<span class="home-res-venue__leg-v">' +
      comSp.rej +
      "</span></span></div></li>" +
      '<li class="home-res-venue">' +
      '<span class="home-res-venue__name">Arızalar</span>' +
      '<div class="home-res-venue__split" role="group" aria-label="Arızalar bugün">' +
      '<span class="home-res-venue__leg"><span class="home-res-venue__leg-k">Beklemede</span> ' +
      '<span class="home-res-venue__leg-v">' +
      faultSp.wait +
      "</span></span>" +
      '<span class="home-res-venue__leg"><span class="home-res-venue__leg-k">Tamamlanan</span> ' +
      '<span class="home-res-venue__leg-v">' +
      faultSp.done +
      "</span></span>" +
      '<span class="home-res-venue__leg"><span class="home-res-venue__leg-k">Olumsuz</span> ' +
      '<span class="home-res-venue__leg-v">' +
      faultSp.rej +
      "</span></span></div></li>" +
      '<li class="home-res-venue">' +
      '<span class="home-res-venue__name">Bildirim + geç çıkış</span>' +
      '<div class="home-res-venue__split" role="group" aria-label="Misafir bildirimi ve geç çıkış bugün">' +
      '<span class="home-res-venue__leg"><span class="home-res-venue__leg-k">Beklemede</span> ' +
      '<span class="home-res-venue__leg-v">' +
      notifSp.wait +
      "</span></span>" +
      '<span class="home-res-venue__leg"><span class="home-res-venue__leg-k">Dikkate alındı</span> ' +
      '<span class="home-res-venue__leg-v">' +
      notifSp.done +
      "</span></span>" +
      '<span class="home-res-venue__leg"><span class="home-res-venue__leg-k">Alınmadı</span> ' +
      '<span class="home-res-venue__leg-v">' +
      notifSp.rej +
      "</span></span></div></li>";
    var opsBar =
      '<div class="home-top-strip__bar home-top-strip__bar--operations">' +
      '<div class="home-res-strip">' +
      '<div class="home-res-strip__row">' +
      '<p class="home-res-strip__general">' +
      "<strong>İstek · Şikayet · Arıza · Bildirim</strong> · Bugün (" +
      todayLabel +
      ") · Beklemede: <strong>" +
      opsWaitTotal +
      "</strong> · Tamamlanan: <strong>" +
      opsDoneTotal +
      "</strong> · Olumsuz: <strong>" +
      opsRejTotal +
      "</strong>" +
      opsLineExtrasToday +
      "</p>" +
      '<div class="home-ops-strip__actions">' +
      '<button type="button" class="home-ops-strip__mini js-home-open-requests">İstekler →</button>' +
      '<button type="button" class="home-ops-strip__mini js-home-open-complaints">Şikayetler →</button>' +
      '<button type="button" class="home-ops-strip__mini js-home-open-faults">Arızalar →</button>' +
      '<button type="button" class="home-ops-strip__mini js-home-open-guest-notifications">Bildirimler →</button>' +
      "</div></div>" +
      '<p class="home-res-strip__hint">Bugün gönderilen kayıtlar (' +
      todayLabel +
      "). Beklemede: açık. Tamamlanan: olumlu kapanan. Olumsuz: yapılamadı / dikkate alınmadı.</p>" +
      '<ul class="home-res-strip__chips" role="list">' +
      opsTypeItems +
      "</ul></div></div>";
    el.innerHTML =
      globalBar +
      '<div class="home-top-strip__bar home-top-strip__bar--metrics">' +
      '<ul class="home-top-strip__stats" role="list">' +
      '<li class="home-stat" title="İstek, şikayet, arıza, misafir bildirimi ve geç çıkış satırlarının toplamı">' +
      '<span class="home-stat__label">Kayıt (toplam)</span>' +
      '<span class="home-stat__value">' +
      totalRecords +
      "</span></li>" +
      '<li class="home-stat"><span class="home-stat__label">Sohbet</span><span class="home-stat__value">' +
      totalChats +
      "</span></li>" +
      '<li class="home-stat"><span class="home-stat__label">Fallback</span><span class="home-stat__value">' +
      fb +
      "</span></li>" +
      '<li class="home-stat"><span class="home-stat__label">Memnuniyet (otel / Viona)</span><span class="home-stat__value home-stat__value--compact">' +
      mem +
      "</span></li>" +
      '<li class="home-stat"><span class="home-stat__label">Güncellendi</span><span class="home-stat__value home-stat__value--time">' +
      refreshed +
      "</span></li>" +
      "</ul></div>" +
      opsBar;
    function wireOpsOpen(sel, tab, bucket, listElId) {
      var b = el.querySelector(sel);
      if (!b) return;
      b.addEventListener("click", async function () {
        openTab(tab);
        await loadBucket(bucket, listElId);
        scheduleAutoRefresh();
      });
    }
    wireOpsOpen(".js-home-open-requests", "requests", "request", "list-requests");
    wireOpsOpen(".js-home-open-complaints", "complaints", "complaint", "list-complaints");
    wireOpsOpen(".js-home-open-faults", "faults", "fault", "list-faults");
    var bGnHome = el.querySelector(".js-home-open-guest-notifications");
    if (bGnHome) {
      bGnHome.addEventListener("click", async function () {
        guestNotifSubtab = "notifications";
        openTab("guest_notifications");
        await loadGuestNotifVisible();
        scheduleAutoRefresh();
      });
    }
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
    var progLabel = opts.inProgressLabel != null ? opts.inProgressLabel : "Eski · işlemde";
    var metaLine =
      opts.statusMetaLine != null
        ? opts.statusMetaLine
        : "Yeni: " +
          opts.newCount +
          " · Kuyruk (pending): " +
          opts.pendingCount +
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
    var notifRows = data.guest_notification || [];

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
        openKpiLabel: "Beklemede (kuyruk)",
        openCount: req,
        newCount: reqN,
        pendingCount: reqP,
        inProgressCount: reqI,
        statusMetaLine:
          "Yeni: " + reqN + " · Kuyruk: " + reqP + (reqI > 0 ? " · Eski işlemde: " + reqI : ""),
        oldestOpen: oldestOpenText(reqRows),
        tab: "requests",
      }) +
      renderReminderCard({
        title: "Şikayetler",
        openKpiLabel: "Beklemede (kuyruk)",
        openCount: com,
        newCount: comN,
        pendingCount: comP,
        inProgressCount: comI,
        statusMetaLine:
          "Yeni: " + comN + " · Kuyruk: " + comP + (comI > 0 ? " · Eski işlemde: " + comI : ""),
        oldestOpen: oldestOpenText(comRows),
        tab: "complaints",
      }) +
      renderReminderCard({
        title: "Arızalar",
        openKpiLabel: "Beklemede (kuyruk)",
        openCount: fault,
        newCount: faultN,
        pendingCount: faultP,
        inProgressCount: faultI,
        statusMetaLine:
          "Yeni: " + faultN + " · Kuyruk: " + faultP + (faultI > 0 ? " · Eski işlemde: " + faultI : ""),
        oldestOpen: oldestOpenText(faultRows),
        tab: "faults",
      }) +
      renderReminderCard({
        title: "Misafir bildirimleri + geç çıkış",
        openKpiLabel: "Beklemede (kuyruk)",
        openCount: notif,
        newCount: notifN,
        pendingCount: notifP,
        inProgressCount: notifI,
        statusMetaLine:
          "Yeni: " +
          notifN +
          " · Kuyruk: " +
          notifP +
          (notifI > 0 ? " · Eski işlemde: " + notifI : "") +
          " (birleşik liste; sekmede alt görünümler ayrı)",
        oldestOpen: oldestOpenText(notifRows),
        tab: "guest_notifications",
      }) +
      "</div>";
    el.innerHTML = html;
    el.querySelectorAll(".alert-openbtn[data-go-tab]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        var tab = btn.getAttribute("data-go-tab");
        openTab(tab);
        if (tab === "requests") await loadBucket("request", "list-requests");
        if (tab === "complaints") await loadBucket("complaint", "list-complaints");
        if (tab === "faults") await loadBucket("fault", "list-faults");
        if (tab === "guest_notifications") {
          guestNotifSubtab = "notifications";
          await loadGuestNotifVisible();
        }
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

  async function init() {
    if (!staticAdminListenersBound) {
      staticAdminListenersBound = true;
      wireTabs();
      wireGuestNotifSubtabs();
      wireEvaluationsToolbar();
      wirePdfReportPanel();
      wireLogsControls();
      wireBackHomeButtons();
      wireVisibilityRefresh();
    }
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
          if (err) err.textContent = "Geçersiz veya yetkisiz admin token.";
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
