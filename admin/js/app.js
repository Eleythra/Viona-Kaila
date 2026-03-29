(function () {
  "use strict";

  var adapter = window.AdminDataAdapter;
  var ui = window.AdminUI;
  if (!adapter || !ui) return;
  var LOGIN_USER = "Kaila-Vİona";
  var LOGIN_PASS = "Viona.2026";
  var LOGIN_OK_KEY = "viona_admin_login_ok";
  var reservationSubtab = "overview";
  /** null = dashboard; operasyon listeleri için otomatik yenileme hedefi */
  var activeAdminTab = null;
  var refreshTimer = null;
  var refreshInFlight = false;
  /** Görünür sekmede arka plan yenilemesi (ms); sekmeye dönüşte ayrıca anlık tazeleme */
  var AUTO_REFRESH_MS = 60000;
  var visibilityRefreshTimer = null;
  /** İstek / şikayet / arıza listeleri için sunucu sayfalama (rezervasyon: tümü birleştirilir). */
  var BUCKET_LIST_PAGE_SIZE = 100;
  /** Ana sayfa özetinde birleştirilen kayıt üst sınırı (sayfa × getBucketPage boyutu). */
  var BUCKET_MERGE_MAX_PAGES = 100;
  var bucketListPage = { request: 1, complaint: 1, fault: 1 };
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
    reservation: "Rezervasyon",
    special_need: "Özel ihtiyaç",
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

  var reservationSubtabLabels = {
    overview: "Günlük takip (tümü)",
    laTerrace: "La Terrace A La Carte",
    mare: "Mare Restaurant",
    sinton: "Sinton BBQ Restaurant",
    spa: "Spa",
  };

  var tabMap = {
    requests: "tab-requests",
    complaints: "tab-complaints",
    faults: "tab-faults",
    reservations: "tab-reservations",
    evaluations: "tab-evaluations",
    promo: "tab-promo",
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
      var isReservationSub = b.hasAttribute("data-res-subtab");
      var dt = b.getAttribute("data-tab") || "";
      var isActive;
      if (isHome) {
        isActive = dt === "home";
      } else if (isReservationSub) {
        isActive = tab === "reservations" && b.getAttribute("data-res-subtab") === reservationSubtab;
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

  function updateReservationNavStatus() {
    var el = document.getElementById("reservation-nav-status");
    if (!el) return;
    var label = reservationSubtabLabels[reservationSubtab] || reservationSubtab;
    el.textContent = "Aktif görünüm: " + label;
  }

  function emptyBucket() {
    return [];
  }

  async function loadDashboard() {
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
      adapter.getBucketMergeAll("request", BUCKET_MERGE_MAX_PAGES).catch(emptyBucket),
      adapter.getBucketMergeAll("complaint", BUCKET_MERGE_MAX_PAGES).catch(emptyBucket),
      adapter.getBucketMergeAll("fault", BUCKET_MERGE_MAX_PAGES).catch(emptyBucket),
      adapter.getBucketMergeAll("reservation", BUCKET_MERGE_MAX_PAGES).catch(emptyBucket),
    ]);
    var warnEl = document.getElementById("dashboard-api-warning");
    if (warnEl) {
      if (!dashReportOk) {
        warnEl.textContent =
          "Rapor özeti şu an alınamadı" +
          (dashReportErr ? " (" + dashReportErr + ")" : "") +
          ". Ağ sekmesinde GET …/admin/reports/dashboard isteğini kontrol edin (404 ise API tabanı yanlış; Render uyuyorsa ikinci deneme). Operasyon listeleri ayrı istekle yüklenir.";
        warnEl.classList.remove("hidden");
        warnEl.removeAttribute("aria-hidden");
      } else {
        warnEl.textContent = "";
        warnEl.classList.add("hidden");
        warnEl.setAttribute("aria-hidden", "true");
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
      request: buckets[0] || [],
      complaint: buckets[1] || [],
      fault: buckets[2] || [],
      reservation: buckets[3] || [],
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
        desc: "overall_score satır ortalaması.",
      },
      {
        title: "Viona ortalaması",
        value: sat.vionaScore,
        desc: "viona_rating (Viona bölümü dolu kayıtlar).",
      },
      { title: "Yemek & içecek", value: satCat.food || "-", desc: "hotel_categories.food ortalaması." },
      { title: "Oda & konfor", value: satCat.comfort || "-", desc: "hotel_categories.comfort." },
      { title: "Temizlik", value: satCat.cleanliness || "-", desc: "hotel_categories.cleanliness." },
      { title: "Personel", value: satCat.staff || "-", desc: "hotel_categories.staff." },
      { title: "Havuz & plaj", value: satCat.poolBeach || "-", desc: "hotel_categories.poolBeach." },
      { title: "Spa & wellness", value: satCat.spaWellness || "-", desc: "hotel_categories.spaWellness." },
      { title: "Genel deneyim", value: satCat.generalExperience || "-", desc: "hotel_categories.generalExperience." },
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
      } else if (activeAdminTab === "reservations") {
        await loadBucket("reservation", "list-reservations");
      } else if (activeAdminTab === "evaluations") {
        await loadEvaluations();
      } else if (activeAdminTab === "promo") {
        await loadPromo();
      } else if (activeAdminTab === "logs") {
        await loadLogs();
      }
    } catch (_e) {
    } finally {
      refreshInFlight = false;
    }
  }

  async function loadBucket(type, mountId, page) {
    var mount = document.getElementById(mountId);
    if (!mount) return;
    try {
      var rows;
      var pagination = null;
      if (type === "reservation") {
        rows = await adapter.getBucketMergeAll("reservation", BUCKET_MERGE_MAX_PAGES);
      } else {
        var pageNum = page != null ? page : bucketListPage[type] || 1;
        bucketListPage[type] = pageNum;
        var res = await adapter.getBucketPage(type, pageNum, BUCKET_LIST_PAGE_SIZE);
        rows = res.items || [];
        pagination = res.pagination || null;
        if (
          rows.length === 0 &&
          pagination &&
          pagination.page > 1 &&
          (pagination.total || 0) > 0
        ) {
          await loadBucket(type, mountId, pagination.page - 1);
          return;
        }
      }
      ui.renderBucketTable(mount, type, rows, {
        initialReservationSubtab: type === "reservation" ? reservationSubtab : undefined,
        pagination: pagination,
        onPage:
          type === "reservation"
            ? undefined
            : function (nextPage) {
                void loadBucket(type, mountId, nextPage);
              },
        onStatus: async function (itemType, id, status) {
          await adapter.updateStatus(itemType, id, status);
          await loadBucket(type, mountId);
        },
        onDelete: async function (itemType, id) {
          if (!window.confirm("Kaydı silmek istiyor musunuz?")) return;
          await adapter.deleteItem(itemType, id);
          await loadBucket(type, mountId);
        },
        onCreate: async function (payload) {
          await adapter.createGuestRequest(payload);
          await loadBucket(type, mountId);
        },
      });
      if (type === "reservation") {
        mount.dispatchEvent(
          new CustomEvent("reservation:setSubtab", {
            detail: { key: reservationSubtab },
          })
        );
      }
    } catch (_e) {
      mount.innerHTML =
        '<p class="admin-load-error">Veri yüklenemedi. Ağ bağlantısını kontrol edip tekrar deneyin veya sekmeyi yeniden açın.</p>';
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

  async function loadPromo() {
    try {
      var cfg = await adapter.getPromoConfig();
      document.getElementById("promo-enabled").checked = cfg.enabled !== false;
      document.getElementById("promo-tr").value = cfg.image_tr || "";
      document.getElementById("promo-en").value = cfg.image_en || "";
      document.getElementById("promo-de").value = cfg.image_de || "";
      document.getElementById("promo-ru").value = cfg.image_ru || "";
      syncPromoPreviews();
    } catch (_e) {
      var ps = document.getElementById("promo-status");
      if (ps) {
        ps.textContent = "Ayarlar yüklenemedi. Bağlantıyı kontrol edin.";
        ps.className = "promo-status promo-status--error";
      }
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
        var params = getLogsParams();
        var blob = await adapter.downloadLogsCsv(params);
        downloadBlob(blob, "chat_observations.csv");
      });
    }
    if (jsonBtn) {
      jsonBtn.addEventListener("click", async function () {
        var params = getLogsParams();
        var blob = await adapter.downloadLogsJson(params);
        downloadBlob(blob, "chat_observations.json");
      });
    }
  }

  function setPreview(lang, src) {
    var img = document.getElementById("promo-" + lang + "-preview");
    if (!img) return;
    img.src = src || "";
  }

  function syncPromoPreviews() {
    setPreview("tr", document.getElementById("promo-tr").value.trim());
    setPreview("en", document.getElementById("promo-en").value.trim());
    setPreview("de", document.getElementById("promo-de").value.trim());
    setPreview("ru", document.getElementById("promo-ru").value.trim());
  }

  function wirePromoFileInputs() {
    ["tr", "en", "de", "ru"].forEach(function (lang) {
      var fileInput = document.getElementById("promo-" + lang + "-file");
      var textInput = document.getElementById("promo-" + lang);
      if (!fileInput || !textInput) return;
      fileInput.addEventListener("change", function () {
        var file = fileInput.files && fileInput.files[0];
        if (!file) return;
        var existing = String(textInput.value || "").trim();
        if (existing) {
          window.alert("Bu dilde aktif görsel var. Önce 'görseli sil' butonuyla kaldırın, sonra yeni görsel yükleyin.");
          fileInput.value = "";
          return;
        }
        var reader = new FileReader();
        reader.onload = function () {
          textInput.value = String(reader.result || "");
          setPreview(lang, textInput.value);
        };
        reader.readAsDataURL(file);
      });
      textInput.addEventListener("input", function () {
        syncPromoPreviews();
      });
    });
  }

  function wirePromoClearButtons() {
    document.querySelectorAll(".promo-clear-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var lang = btn.getAttribute("data-promo-lang");
        if (!lang) return;
        var textInput = document.getElementById("promo-" + lang);
        var fileInput = document.getElementById("promo-" + lang + "-file");
        if (textInput) textInput.value = "";
        if (fileInput) fileInput.value = "";
        syncPromoPreviews();
      });
    });
  }

  function countPending(rows) {
    return rows.filter(function (r) {
      var st = String(r.status || "new");
      return st === "new" || st === "pending" || st === "in_progress";
    }).length;
  }

  function countByStatus(rows, status) {
    return rows.filter(function (r) {
      return String(r.status || "new") === status;
    }).length;
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
      "Veri kaynakları: chat_observations " +
      (chatOk ? "OK" : "yok/hata") +
      " · survey_submissions " +
      (survOk ? "OK" : "yok/hata") +
      ". Sohbet sayıları sunucuda toplu okunur. Sekme açıkken bu özet yaklaşık " +
      Math.round(AUTO_REFRESH_MS / 1000) +
      " sn'de bir tekrar çekilir (önbellek devre dışı).";
    el.className = "home-analytics-meta" + (ds.usedMockFallback ? " home-analytics-meta--warn" : "");
    if (ds.usedMockFallback) {
      el.textContent =
        "Uyarı: En az bir kaynak okunamadı; aşağıdaki bazı rakamlar 0 veya eksik görünebilir. " + line;
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
    var resRows = data.reservation || [];
    var req = countPending(reqRows);
    var com = countPending(comRows);
    var fault = countPending(faultRows);
    var res = countPending(resRows);
    var totalOpen = req + com + fault + res;
    var totalRecords = reqRows.length + comRows.length + faultRows.length + resRows.length;
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
    el.innerHTML =
      '<div class="home-top-strip__bar home-top-strip__bar--metrics">' +
      '<ul class="home-top-strip__stats" role="list">' +
      '<li class="home-stat"><span class="home-stat__label">Açık iş</span><span class="home-stat__value">' +
      totalOpen +
      "</span></li>" +
      '<li class="home-stat"><span class="home-stat__label">Kayıt (toplam)</span><span class="home-stat__value">' +
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
      "</ul></div>";
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
    if (!open.length) return "Açık kayıt yok";
    var raw = String(open[0].submitted_at || "");
    if (!raw) return "Tarih yok";
    return typeof ui.formatDateTimeDisplayTr === "function" ? ui.formatDateTimeDisplayTr(raw) : raw;
  }

  function renderReminderCard(opts) {
    return (
      '<article class="alert-card">' +
      '<div class="alert-card__head"><h4 class="alert-card__title">' +
      opts.title +
      "</h4></div>" +
      '<p class="alert-card__kpi">Açık Kayıt: <strong>' +
      opts.openCount +
      "</strong></p>" +
      '<p class="alert-card__meta">Yeni: ' +
      opts.newCount +
      " · Beklemede: " +
      opts.pendingCount +
      " · İşlemde: " +
      opts.inProgressCount +
      "</p>" +
      '<p class="alert-card__meta">En eski açık kayıt: ' +
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
    var resRows = data.reservation || [];

    var req = countPending(reqRows);
    var com = countPending(comRows);
    var fault = countPending(faultRows);
    var res = countPending(resRows);

    var html =
      '<div class="alert-grid">' +
      renderReminderCard({
        title: "İstekler",
        openCount: req,
        newCount: countByStatus(reqRows, "new"),
        pendingCount: countByStatus(reqRows, "pending"),
        inProgressCount: countByStatus(reqRows, "in_progress"),
        oldestOpen: oldestOpenText(reqRows),
        tab: "requests",
      }) +
      renderReminderCard({
        title: "Şikayetler",
        openCount: com,
        newCount: countByStatus(comRows, "new"),
        pendingCount: countByStatus(comRows, "pending"),
        inProgressCount: countByStatus(comRows, "in_progress"),
        oldestOpen: oldestOpenText(comRows),
        tab: "complaints",
      }) +
      renderReminderCard({
        title: "Arızalar",
        openCount: fault,
        newCount: countByStatus(faultRows, "new"),
        pendingCount: countByStatus(faultRows, "pending"),
        inProgressCount: countByStatus(faultRows, "in_progress"),
        oldestOpen: oldestOpenText(faultRows),
        tab: "faults",
      }) +
      renderReminderCard({
        title: "Rezervasyonlar",
        openCount: res,
        newCount: countByStatus(resRows, "new"),
        pendingCount: countByStatus(resRows, "pending"),
        inProgressCount: countByStatus(resRows, "in_progress"),
        oldestOpen: oldestOpenText(resRows),
        tab: "reservations",
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
        if (tab === "reservations") {
          reservationSubtab = "overview";
          updateReservationNavStatus();
          await loadBucket("reservation", "list-reservations");
        }
        scheduleAutoRefresh();
      });
    });
  }

  function wirePromoForm() {
    var form = document.getElementById("promo-form");
    if (!form) return;
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var statusEl = document.getElementById("promo-status");
      var payload = {
        enabled: document.getElementById("promo-enabled").checked,
        image_tr: document.getElementById("promo-tr").value.trim(),
        image_en: document.getElementById("promo-en").value.trim(),
        image_de: document.getElementById("promo-de").value.trim(),
        image_ru: document.getElementById("promo-ru").value.trim(),
      };
      if (statusEl) {
        statusEl.textContent = "Kaydediliyor...";
        statusEl.className = "promo-status promo-status--info";
      }
      try {
        var saved = await adapter.savePromoConfig(payload);
        try {
          localStorage.setItem("viona_discount_popup_cache_v1", JSON.stringify(saved || {}));
          localStorage.removeItem("viona_discount_popup_seen");
          ["tr", "en", "de", "ru"].forEach(function (lng) {
            localStorage.removeItem("viona_discount_popup_seen_" + lng);
          });
        } catch (_cacheErr) {}
        document.getElementById("promo-tr").value = saved.image_tr || payload.image_tr || "";
        document.getElementById("promo-en").value = saved.image_en || payload.image_en || "";
        document.getElementById("promo-de").value = saved.image_de || payload.image_de || "";
        document.getElementById("promo-ru").value = saved.image_ru || payload.image_ru || "";
        syncPromoPreviews();
        if (statusEl) {
          statusEl.textContent = "Kaydedildi. Görseller aktif edildi.";
          statusEl.className = "promo-status promo-status--ok";
        }
      } catch (e) {
        var msg = String((e && e.message) || "");
        if (statusEl) {
          if (msg === "http_413") {
            statusEl.textContent = "Görsel boyutu çok büyük. Daha küçük bir görsel yükleyip tekrar deneyin.";
          } else if (msg) {
            statusEl.textContent = "Kaydetme hatası: " + msg;
          } else {
            statusEl.textContent = "Kaydetme sırasında hata oluştu. Lütfen tekrar deneyin.";
          }
          statusEl.className = "promo-status promo-status--error";
        }
      }
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
        if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
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

  document.addEventListener("viona:reservationSubtab", function (ev) {
    var key = ev && ev.detail && ev.detail.key;
    if (key == null || key === undefined) return;
    reservationSubtab = String(key);
    updateReservationNavStatus();
    openTab("reservations");
    void loadBucket("reservation", "list-reservations").then(function () {
      scheduleAutoRefresh();
    });
  });

  function wireTabs() {
    document.querySelectorAll(".admin-nav button").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        var tab = btn.getAttribute("data-tab");
        var sub = btn.getAttribute("data-res-subtab");
        if (tab === "reservations") {
          reservationSubtab = sub != null && sub !== "" ? sub : "overview";
        }
        openTab(tab);
        if (activeAdminTab === null) {
          try {
            await loadDashboard();
          } catch (_e) {}
          updateReservationNavStatus();
          scheduleAutoRefresh();
          return;
        }
        if (tab === "requests") await loadBucket("request", "list-requests");
        if (tab === "complaints") await loadBucket("complaint", "list-complaints");
        if (tab === "faults") await loadBucket("fault", "list-faults");
        if (tab === "reservations") await loadBucket("reservation", "list-reservations");
        if (tab === "evaluations") await loadEvaluations();
        if (tab === "promo") await loadPromo();
        if (tab === "pdf-report") setPdfCustomRangeUi(Boolean(document.getElementById("pdf-custom-range") && document.getElementById("pdf-custom-range").checked));
        if (tab === "logs") await loadLogs();
        updateReservationNavStatus();
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
    wireTabs();
    wireEvaluationsToolbar();
    wirePromoForm();
    wirePdfReportPanel();
    wireLogsControls();
    wireBackHomeButtons();
    wireVisibilityRefresh();
    openTab(null);
    updateReservationNavStatus();
    await loadDashboard();
    scheduleAutoRefresh();
  }

  function showPanel() {
    var login = document.getElementById("admin-login");
    var layout = document.getElementById("admin-layout");
    if (login) login.classList.add("hidden");
    if (layout) layout.classList.remove("hidden");
  }

  function showLogin() {
    var login = document.getElementById("admin-login");
    var layout = document.getElementById("admin-layout");
    if (layout) layout.classList.add("hidden");
    if (login) login.classList.remove("hidden");
  }

  function wireLogin() {
    var form = document.getElementById("admin-login-form");
    var err = document.getElementById("admin-login-error");
    var pw = document.getElementById("admin-password");
    var pwToggle = document.getElementById("admin-password-toggle");
    if (!form) return;
    function normalizeLoginUser(v) {
      return String(v || "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[İIı]/g, "i")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
    }
    if (pw && pwToggle) {
      pwToggle.addEventListener("click", function () {
        var show = pw.type === "password";
        pw.type = show ? "text" : "password";
        pwToggle.textContent = show ? "Gizle" : "Göster";
      });
    }
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var u = (document.getElementById("admin-username").value || "").trim();
      var p = document.getElementById("admin-password").value || "";
      var okUser = normalizeLoginUser(u) === normalizeLoginUser(LOGIN_USER);
      if (okUser && p === LOGIN_PASS) {
        try {
          sessionStorage.setItem(LOGIN_OK_KEY, "1");
        } catch (_e) {}
        if (err) err.textContent = "";
        showPanel();
        await init();
        return;
      }
      if (err) err.textContent = "Kullanıcı adı veya şifre hatalı.";
    });
  }

  function bootstrap() {
    wireLogin();
    wirePromoFileInputs();
    wirePromoClearButtons();
    var ok = false;
    try {
      ok = sessionStorage.getItem(LOGIN_OK_KEY) === "1";
    } catch (_e) {
      ok = false;
    }
    if (!ok) {
      showLogin();
      return;
    }
    showPanel();
    init();
  }

  bootstrap();
})();
