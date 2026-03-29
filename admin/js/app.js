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
  /** Aynı anda birden fazla tam pano yüklemesini tek isteğe indirger */
  var dashboardLoadPromise = null;
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

  async function loadBucket(type, mountId, page, opts) {
    var mount = document.getElementById(mountId);
    if (!mount) return;
    var rethrow = opts && opts.rethrow;
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
          await loadBucket(type, mountId, pagination.page - 1, opts);
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
          try {
            await adapter.updateStatus(itemType, id, status);
            await loadBucket(type, mountId, undefined, { rethrow: true });
          } catch (err) {
            var msg =
              err && err.message
                ? String(err.message)
                : "Durum güncellenemedi. Ağ veya sunucu yanıtını kontrol edin.";
            window.alert(msg);
          }
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
    } catch (e) {
      mount.innerHTML =
        '<p class="admin-load-error">Veri yüklenemedi. Ağ bağlantısını kontrol edip tekrar deneyin veya sekmeyi yeniden açın.</p>';
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

  function resNormStatus(r) {
    return typeof ui.reservationNormalizeStatusKey === "function"
      ? ui.reservationNormalizeStatusKey(r && r.status)
      : String((r && r.status) || "new")
          .trim()
          .toLowerCase();
  }

  function countResByNorm(rows, want) {
    return rows.filter(function (r) {
      return resNormStatus(r) === want;
    }).length;
  }

  /** İptal + beklenmeyen durum kodları (özet satırında ayrı gösterilir). */
  function countResIptalVeDiger(rows) {
    var n = 0;
    (rows || []).forEach(function (r) {
      var st = resNormStatus(r);
      if (st === "cancelled") n++;
      else if (
        st !== "new" &&
        st !== "pending" &&
        st !== "in_progress" &&
        st !== "done" &&
        st !== "rejected"
      ) {
        n++;
      }
    });
    return n;
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

  /** Rezervasyon: beklemede (yeni / beklemede / eski onay süreci). */
  function countAwaitingReservationApproval(rows) {
    return rows.filter(function (r) {
      var st = resNormStatus(r);
      return st === "new" || st === "pending" || st === "in_progress";
    }).length;
  }

  /** Onaylandı (API durumu: done). */
  function countReservationApprovedLine(rows) {
    return rows.filter(function (r) {
      return resNormStatus(r) === "done";
    }).length;
  }

  /** Mekân bazlı: bekliyor · onay hattı · onaylanmadı · iptal (rezervasyon tarihi günüyle eşleşen satır kümesi). */
  function countReservationSplitByVenue(rows) {
    var vk = ui.reservationVenueKeyFromRow;
    var keys = ["laTerrace", "mare", "sinton", "spa", "other"];
    var o = {};
    keys.forEach(function (k) {
      o[k] = { wait: 0, appr: 0, rej: 0, can: 0 };
    });
    if (typeof vk !== "function") return o;
    rows.forEach(function (r) {
      var st = resNormStatus(r);
      var venue = vk(r);
      var bucket =
        venue === "laTerrace" || venue === "mare" || venue === "sinton" || venue === "spa" ? venue : "other";
      if (st === "new" || st === "pending" || st === "in_progress") o[bucket].wait++;
      else if (st === "done") o[bucket].appr++;
      else if (st === "rejected") o[bucket].rej++;
      else if (st === "cancelled") o[bucket].can++;
    });
    return o;
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

  function filterReservationsOnServiceDay(rows, isoDay) {
    var rd = ui.reservationDateValue;
    if (typeof rd !== "function") return [];
    return rows.filter(function (r) {
      return rd(r) === isoDay;
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
  function opsGlobalSnapshot(reqRows, comRows, faultRows) {
    var merged = (reqRows || []).concat(comRows || []).concat(faultRows || []);
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

  function resGlobalSnapshot(resRows) {
    var rows = resRows || [];
    var w = 0;
    var a = 0;
    var j = 0;
    var c = 0;
    var o = 0;
    rows.forEach(function (r) {
      var st = resNormStatus(r);
      if (st === "new" || st === "pending" || st === "in_progress") w++;
      else if (st === "done") a++;
      else if (st === "rejected") j++;
      else if (st === "cancelled") c++;
      else o++;
    });
    return { wait: w, appr: a, rej: j, can: c, other: o, total: rows.length };
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
    var resRows = data.reservation || [];
    var totalRecords = reqRows.length + comRows.length + faultRows.length + resRows.length;
    var todayIso = todayIsoLocal();
    var todayLabel =
      typeof ui.formatIsoDateDisplayTr === "function" ? ui.formatIsoDateDisplayTr(todayIso) : todayIso;
    var reqToday = filterRowsSubmittedOnDay(reqRows, todayIso);
    var comToday = filterRowsSubmittedOnDay(comRows, todayIso);
    var faultToday = filterRowsSubmittedOnDay(faultRows, todayIso);
    var reqSp = countOpsBeklemeYapildi(reqToday);
    var comSp = countOpsBeklemeYapildi(comToday);
    var faultSp = countOpsBeklemeYapildi(faultToday);
    var opsAll = opsGlobalSnapshot(reqRows, comRows, faultRows);
    var resAll = resGlobalSnapshot(resRows);
    var opsWaitTotal = reqSp.wait + comSp.wait + faultSp.wait;
    var opsDoneTotal = reqSp.done + comSp.done + faultSp.done;
    var opsRejTotal = reqSp.rej + comSp.rej + faultSp.rej;
    var opsExtraToday =
      reqSp.cancelled +
      reqSp.other +
      comSp.cancelled +
      comSp.other +
      faultSp.cancelled +
      faultSp.other;
    var opsExtraAll = opsAll.cancelled + opsAll.other;
    var resExtraAll = resAll.can + resAll.other;
    var resToday = filterReservationsOnServiceDay(resRows, todayIso);
    var resAwait = countAwaitingReservationApproval(resToday);
    var resApproved = countReservationApprovedLine(resToday);
    var resRejToday = resToday.filter(function (r) {
      return resNormStatus(r) === "rejected";
    }).length;
    var resExtraToday = countResIptalVeDiger(resToday);
    var resByVenue = countReservationSplitByVenue(resToday);
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
    var resLineExtrasAll = resExtraAll > 0 ? " · İptal/diğer: <strong>" + resExtraAll + "</strong>" : "";
    var resLineExtrasToday = resExtraToday > 0 ? " · İptal/diğer: <strong>" + resExtraToday + "</strong>" : "";
    var globalBar =
      '<div class="home-top-strip__bar home-top-strip__bar--global">' +
      '<div class="home-global-grid">' +
      '<div class="home-global-card">' +
      '<span class="home-global-card__k">İstek · Şikayet · Arıza (tüm zamanlar)</span>' +
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
      "</div>" +
      '<div class="home-global-card">' +
      '<span class="home-global-card__k">Rezervasyon (tüm zamanlar)</span>' +
      '<p class="home-global-card__body">Beklemede: <strong>' +
      resAll.wait +
      "</strong> · Onaylandı: <strong>" +
      resAll.appr +
      "</strong> · Onaylanmadı: <strong>" +
      resAll.rej +
      "</strong> · Toplam: <strong>" +
      resAll.total +
      "</strong>" +
      resLineExtrasAll +
      "</p>" +
      '<p class="home-global-card__sub">Bugün (rezervasyon günü ' +
      todayLabel +
      "): Beklemede <strong>" +
      resAwait +
      "</strong> · Onaylandı <strong>" +
      resApproved +
      "</strong> · Onaylanmadı <strong>" +
      resRejToday +
      "</strong>" +
      resLineExtrasToday +
      "</p>" +
      "</div>" +
      "</div>" +
      '<p class="home-global-hint">Üst kartlar tüm zamanlar. Alt şerit: istek/şikayet/arıza için <strong>bugün gönderilen</strong> kayıtlar; rezervasyon için <strong>rezervasyon tarihi bugün</strong> olan kayıtlar.</p>' +
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
      "</span></span></div></li>";
    var opsBar =
      '<div class="home-top-strip__bar home-top-strip__bar--operations">' +
      '<div class="home-res-strip">' +
      '<div class="home-res-strip__row">' +
      '<p class="home-res-strip__general">' +
      "<strong>İstek · Şikayet · Arıza</strong> · Bugün (" +
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
      "</div></div>" +
      '<p class="home-res-strip__hint">Bugün gönderilen kayıtlar (' +
      todayLabel +
      "). Beklemede: açık. Tamamlanan: olumlu kapanan. Olumsuz: yapılamadı / dikkate alınmadı.</p>" +
      '<ul class="home-res-strip__chips" role="list">' +
      opsTypeItems +
      "</ul></div></div>";
    var venueOrder = ["laTerrace", "mare", "sinton", "spa"];
    function venueChipHtml(k, title) {
      var sp = resByVenue[k] || { wait: 0, appr: 0, rej: 0, can: 0 };
      var lab = title || reservationSubtabLabels[k] || k;
      var liCls = k === "other" ? "home-res-venue home-res-venue--other" : "home-res-venue";
      return (
        '<li class="' +
        liCls +
        '">' +
        '<span class="home-res-venue__name">' +
        lab +
        "</span>" +
        '<div class="home-res-venue__split home-res-venue__split--triple" role="group" aria-label="' +
        lab +
        ' özet">' +
        '<span class="home-res-venue__leg home-res-venue__leg--wait"><span class="home-res-venue__leg-k">Beklemede</span> ' +
        '<span class="home-res-venue__leg-v">' +
        sp.wait +
        "</span></span>" +
        '<span class="home-res-venue__leg"><span class="home-res-venue__leg-k">Onaylandı</span> ' +
        '<span class="home-res-venue__leg-v">' +
        sp.appr +
        "</span></span>" +
        '<span class="home-res-venue__leg"><span class="home-res-venue__leg-k">Onaylanmadı</span> ' +
        '<span class="home-res-venue__leg-v">' +
        sp.rej +
        "</span></span>" +
        "</div>" +
        "</li>"
      );
    }
    var venueItems = venueOrder.map(function (k) {
      return venueChipHtml(k);
    }).join("");
    var otherSp = resByVenue.other || { wait: 0, appr: 0, rej: 0, can: 0 };
    if (otherSp.wait > 0 || otherSp.appr > 0 || otherSp.rej > 0 || otherSp.can > 0) {
      venueItems += venueChipHtml("other", "Diğer");
    }
    var resBar =
      '<div class="home-top-strip__bar home-top-strip__bar--reservations">' +
      '<div class="home-res-strip">' +
      '<div class="home-res-strip__row">' +
      '<p class="home-res-strip__general">' +
      "<strong>Rezervasyon</strong> · Bugün (" +
      todayLabel +
      ") · Beklemede: <strong>" +
      resAwait +
      "</strong> · Onaylandı: <strong>" +
      resApproved +
      "</strong> · Onaylanmadı: <strong>" +
      resRejToday +
      "</strong>" +
      resLineExtrasToday +
      "</p>" +
      '<button type="button" class="home-res-strip__cta js-home-open-reservations">Listeyi aç →</button>' +
      "</div>" +
      '<p class="home-res-strip__hint">Rezervasyon tarihi bugün (' +
      todayLabel +
      "). İşlemler için <strong>Rezervasyonlar</strong> sekmesinde mekân listesini açın.</p>" +
      '<ul class="home-res-strip__chips" role="list">' +
      venueItems +
      "</ul>" +
      "</div></div>";
    el.innerHTML =
      globalBar +
      '<div class="home-top-strip__bar home-top-strip__bar--metrics">' +
      '<ul class="home-top-strip__stats" role="list">' +
      '<li class="home-stat" title="İstek, şikayet, arıza ve rezervasyon satırlarının toplamı">' +
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
      opsBar +
      resBar;
    var openRes = el.querySelector(".js-home-open-reservations");
    if (openRes) {
      openRes.addEventListener("click", async function () {
        openTab("reservations");
        reservationSubtab = "overview";
        updateReservationNavStatus();
        await loadBucket("reservation", "list-reservations");
        scheduleAutoRefresh();
      });
    }
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

  function oldestAwaitingReservationText(rows) {
    var open = rows
      .filter(function (r) {
        var st = resNormStatus(r);
        return st === "new" || st === "pending" || st === "in_progress";
      })
      .sort(function (a, b) {
        return String(a.submitted_at || "").localeCompare(String(b.submitted_at || ""));
      });
    if (!open.length) return "Beklemede kayıt yok";
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
    var resRows = data.reservation || [];

    var req = countPending(reqRows);
    var com = countPending(comRows);
    var fault = countPending(faultRows);
    var resAwaitCard = countAwaitingReservationApproval(resRows);
    var reqN = countByStatus(reqRows, "new");
    var reqP = countByStatus(reqRows, "pending");
    var reqI = countByStatus(reqRows, "in_progress");
    var comN = countByStatus(comRows, "new");
    var comP = countByStatus(comRows, "pending");
    var comI = countByStatus(comRows, "in_progress");
    var faultN = countByStatus(faultRows, "new");
    var faultP = countByStatus(faultRows, "pending");
    var faultI = countByStatus(faultRows, "in_progress");
    var resN = countResByNorm(resRows, "new");
    var resP = countResByNorm(resRows, "pending");
    var resI = countResByNorm(resRows, "in_progress");
    var resD = countResByNorm(resRows, "done");
    var resRj = countResByNorm(resRows, "rejected");
    var resCx = countResByNorm(resRows, "cancelled");

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
        title: "Rezervasyonlar",
        openKpiLabel: "Beklemede",
        openCount: resAwaitCard,
        newCount: resN,
        pendingCount: resP,
        inProgressCount: resI,
        inProgressLabel: "Eski onay süreci (in_progress)",
        statusMetaLine:
          "Yeni: " +
          resN +
          " · Kuyruk: " +
          resP +
          (resI > 0 ? " · " + resI + " eski süreç" : "") +
          " · Onaylandı: " +
          resD +
          " · Onaylanmadı: " +
          resRj +
          (resCx > 0 ? " · İptal (eski): " + resCx : ""),
        oldestOpen: oldestAwaitingReservationText(resRows),
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
        var previousActive = activeAdminTab;
        if (tab === "reservations") {
          reservationSubtab = sub != null && sub !== "" ? sub : "overview";
        }
        openTab(tab);
        if (activeAdminTab === null) {
          if (previousActive !== null) {
            try {
              await loadDashboard();
            } catch (_e) {}
          }
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
