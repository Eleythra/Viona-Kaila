(function () {
  "use strict";

  var adapter = window.AdminDataAdapter;
  var ui = window.AdminUI;
  if (!adapter || !ui) return;
  var LOGIN_USER = "Kaila-Vİona";
  var LOGIN_PASS = "Viona.2026";
  var LOGIN_OK_KEY = "viona_admin_login_ok";
  var reservationSubtab = "laTerrace";
  var reservationSubtabLabels = {
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
    promo: "tab-promo",
    "pdf-report": "tab-pdf-report",
  };

  function openTab(tab) {
    var home = document.getElementById("tab-dashboard");
    if (home) home.classList.toggle("hidden", Boolean(tab));
    Object.keys(tabMap).forEach(function (k) {
      var el = document.getElementById(tabMap[k]);
      if (!el) return;
      el.classList.toggle("hidden", tab !== k);
    });
    document.querySelectorAll(".admin-nav button").forEach(function (b) {
      var isReservationSub = b.hasAttribute("data-res-subtab");
      var isActive = b.getAttribute("data-tab") === tab;
      if (isReservationSub) {
        isActive = tab === "reservations" && b.getAttribute("data-res-subtab") === reservationSubtab;
      }
      b.classList.toggle("is-active", isActive);
    });
  }

  function updateReservationNavStatus() {
    var el = document.getElementById("reservation-nav-status");
    if (!el) return;
    var label = reservationSubtabLabels[reservationSubtab] || reservationSubtab;
    el.textContent = "Aktif servis filtresi: " + label;
  }

  async function loadDashboard() {
    var report = await adapter.getDashboardReport();
    var buckets = await Promise.all([
      adapter.getBucket("request"),
      adapter.getBucket("complaint"),
      adapter.getBucket("fault"),
      adapter.getBucket("reservation"),
    ]);
    renderDashboardAlerts({
      request: buckets[0] || [],
      complaint: buckets[1] || [],
      fault: buckets[2] || [],
      reservation: buckets[3] || [],
    });
    ui.renderKpis(document.getElementById("kpi-cards"), report.kpis);
    ui.renderMetricRows(document.getElementById("report-chatbot"), [
      { title: "Toplam Sohbet", value: report.chatbotPerformance.totalChats, desc: "Toplam bot mesaj etkileşimi." },
      { title: "Günlük Kullanım Noktası", value: report.chatbotPerformance.dailyUsage.length, desc: "Aktif kullanım görülen gün adedi." },
      { title: "Kullanıcı Başına Mesaj", value: report.chatbotPerformance.avgMessagesPerUser, desc: "Bir oturumdaki ortalama mesaj sayısı." },
      { title: "Ortalama Sohbet Uzunluğu", value: report.chatbotPerformance.avgConversationLength, desc: "Konuşma başına ortalama uzunluk." },
      { title: "Fallback Oranı", value: report.chatbotPerformance.fallbackRate + "%", desc: "Botun yanıt üretemediği durumların oranı." },
      { title: "Top Soru 1", value: (report.chatbotPerformance.topQuestions[0] || {}).key || "-", desc: "En sık gelen ilk soru." },
    ]);
    ui.renderMetricRows(document.getElementById("report-satisfaction"), [
      { title: "Genel Otel Memnuniyet", value: report.satisfaction.overallScore, desc: "Misafirlerin toplam otel deneyimi puanı." },
      { title: "Viona Memnuniyet", value: report.satisfaction.vionaScore, desc: "Asistan deneyimine verilen ortalama puan." },
      { title: "Yemek", value: (report.satisfaction.categories || {}).food || "-", desc: "Yiyecek ve sunum memnuniyet ortalaması." },
      { title: "Konfor", value: (report.satisfaction.categories || {}).comfort || "-", desc: "Oda ve konfor deneyimi puanı." },
      { title: "Temizlik", value: (report.satisfaction.categories || {}).cleanliness || "-", desc: "Temizlik kalitesine verilen ortalama puan." },
      { title: "Personel", value: (report.satisfaction.categories || {}).staff || "-", desc: "Personel hizmet kalitesi puanı." },
    ]);
    ui.renderMetricRows(document.getElementById("report-unanswered"), [
      { title: "Fallback Soru Sayısı", value: report.unansweredQuestions.fallbackCount, desc: "Botun yanıtlayamadığı soru adedi." },
      { title: "Top Fallback 1", value: (report.unansweredQuestions.topFallbackQuestions[0] || {}).key || "-", desc: "En sık yanıtsız kalan ilk soru." },
      { title: "Tekrar Eden", value: report.unansweredQuestions.repeatedUnanswered.length, desc: "Sık tekrar eden yanıtsız soru başlıkları." },
    ]);
    ui.renderMetricRows(document.getElementById("report-conversion"), [
      { title: "Toplam Tıklama", value: report.conversion.actionClicks, desc: "Chat sonrası hizmet aksiyonu tıklamaları." },
      { title: "Toplam Dönüşüm", value: report.conversion.actionConversions, desc: "Aksiyon sonrası tamamlanan işlem sayısı." },
      { title: "Action Conversion Oranı", value: report.conversion.actionConversionRate + "%", desc: "Aksiyonların dönüşüme gitme yüzdesi." },
      { title: "Chat -> Dönüşüm", value: report.conversion.chatToConversionRate + "%", desc: "Sohbetten satış/rezervasyona dönüşüm oranı." },
    ]);
  }

  async function loadBucket(type, mountId) {
    var rows = await adapter.getBucket(type);
    ui.renderBucketTable(document.getElementById(mountId), type, rows, {
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
      var mount = document.getElementById(mountId);
      if (mount) {
        mount.dispatchEvent(
          new CustomEvent("reservation:setSubtab", {
            detail: { key: reservationSubtab },
          })
        );
      }
    }
  }

  async function loadPromo() {
    var cfg = await adapter.getPromoConfig();
    document.getElementById("promo-enabled").checked = cfg.enabled !== false;
    document.getElementById("promo-tr").value = cfg.image_tr || "";
    document.getElementById("promo-en").value = cfg.image_en || "";
    document.getElementById("promo-de").value = cfg.image_de || "";
    document.getElementById("promo-ru").value = cfg.image_ru || "";
    syncPromoPreviews();
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
    return raw ? raw.slice(0, 16).replace("T", " ") : "Tarih yok";
  }

  function renderReminderCard(opts) {
    return (
      '<article class="alert-card">' +
      '<div class="alert-card__head"><span class="alert-card__icon" aria-hidden="true">' +
      opts.icon +
      "</span><h4>" +
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
      '<button class="alert-linkbtn" data-go-tab="' +
      opts.tab +
      '">Detay sayfasına git</button>' +
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
    var total = req + com + fault + res;

    var html =
      '<div class="alert-summary">Toplam açık operasyon kaydı: <strong>' +
      total +
      "</strong></div>" +
      '<div class="alert-grid">' +
      renderReminderCard({
        icon: "🧾",
        title: "İstekler",
        openCount: req,
        newCount: countByStatus(reqRows, "new"),
        pendingCount: countByStatus(reqRows, "pending"),
        inProgressCount: countByStatus(reqRows, "in_progress"),
        oldestOpen: oldestOpenText(reqRows),
        tab: "requests",
      }) +
      renderReminderCard({
        icon: "⚠️",
        title: "Şikayetler",
        openCount: com,
        newCount: countByStatus(comRows, "new"),
        pendingCount: countByStatus(comRows, "pending"),
        inProgressCount: countByStatus(comRows, "in_progress"),
        oldestOpen: oldestOpenText(comRows),
        tab: "complaints",
      }) +
      renderReminderCard({
        icon: "🛠️",
        title: "Arızalar",
        openCount: fault,
        newCount: countByStatus(faultRows, "new"),
        pendingCount: countByStatus(faultRows, "pending"),
        inProgressCount: countByStatus(faultRows, "in_progress"),
        oldestOpen: oldestOpenText(faultRows),
        tab: "faults",
      }) +
      renderReminderCard({
        icon: "📅",
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
    el.querySelectorAll("[data-go-tab]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        var tab = btn.getAttribute("data-go-tab");
        openTab(tab);
        if (tab === "requests") await loadBucket("request", "list-requests");
        if (tab === "complaints") await loadBucket("complaint", "list-complaints");
        if (tab === "faults") await loadBucket("fault", "list-faults");
        if (tab === "reservations") await loadBucket("reservation", "list-reservations");
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

  function setDefaultPdfDates() {
    function toLocalDateInputValue(d) {
      var dt = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
      return dt.toISOString().slice(0, 10);
    }
    var fromEl = document.getElementById("pdf-date-from");
    var toEl = document.getElementById("pdf-date-to");
    if (!fromEl || !toEl) return;
    if (fromEl.value && toEl.value) return;
    var now = new Date();
    toEl.value = toLocalDateInputValue(now);
    fromEl.value = toLocalDateInputValue(new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30));
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
    setDefaultPdfDates();
    var explainBtn = document.getElementById("pdf-preview-info-btn");
    var downloadBtn = document.getElementById("pdf-download-btn");
    var statusEl = document.getElementById("pdf-download-status");
    var warningText = document.getElementById("pdf-warning-text");
    if (!downloadBtn) return;

    if (explainBtn) {
      explainBtn.addEventListener("click", function () {
        if (warningText) {
          warningText.textContent =
            "Rapor; ölçüm -> sınıflandırma -> yorum -> öneri mantığıyla üretilir. Veriler trendle birlikte okunmalı, tek döneme bakarak kesin hüküm verilmemelidir.";
        }
        window.alert("PDF indirme adimindan once rapor kapsami ve metodolojisi gosterildi.");
      });
    }

    downloadBtn.addEventListener("click", async function () {
      var from = (document.getElementById("pdf-date-from").value || "").trim();
      var to = (document.getElementById("pdf-date-to").value || "").trim();
      var hotelName = "Kaila Beach Hotel";

      if (!from || !to) return window.alert("Lütfen önce tarih aralığını seçin.");
      if (new Date(from).getTime() > new Date(to).getTime()) return window.alert("Başlangıç tarihi bitiş tarihinden büyük olamaz.");
      if (!window.confirm("Seçilen tarih aralığı için PDF raporu indirilsin mi?")) return;

      if (statusEl) statusEl.textContent = "PDF rapor oluşturuluyor...";
      downloadBtn.disabled = true;
      try {
        var result = await adapter.downloadPdfReport({
          from: from,
          to: to,
          hotelName: hotelName,
        });
        triggerBlobDownload(result.blob, result.fileName);
        if (statusEl) {
          statusEl.textContent = result.noData
            ? "Bu tarih aralığında hiç veri yok. PDF boş veri notu ile oluşturuldu."
            : "PDF rapor başarıyla indirildi.";
        }
      } catch (e) {
        var msg = String((e && e.message) || "");
        if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
          if (statusEl) statusEl.textContent = "PDF rapor oluşturulamadı: Sunucuya ulaşılamıyor. Backend'in çalıştığını kontrol edin (http://localhost:3001).";
        } else if (msg.includes("no_data_for_range")) {
          if (statusEl) statusEl.textContent = "Bu tarih aralığında hiç veri yok.";
        } else {
          if (statusEl) statusEl.textContent = "PDF rapor oluşturulamadı. Lütfen tekrar deneyin.";
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
        var sub = btn.getAttribute("data-res-subtab");
        if (sub) reservationSubtab = sub;
        openTab(tab);
        if (tab === "requests") await loadBucket("request", "list-requests");
        if (tab === "complaints") await loadBucket("complaint", "list-complaints");
        if (tab === "faults") await loadBucket("fault", "list-faults");
        if (tab === "reservations") await loadBucket("reservation", "list-reservations");
        if (tab === "promo") await loadPromo();
        if (tab === "pdf-report") setDefaultPdfDates();
        updateReservationNavStatus();
      });
    });
  }

  function wireBackHomeButtons() {
    document.querySelectorAll(".js-back-home").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openTab(null);
      });
    });
  }

  async function init() {
    wireTabs();
    wirePromoForm();
    wirePdfReportPanel();
    wireBackHomeButtons();
    openTab(null);
    updateReservationNavStatus();
    await loadDashboard();
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
