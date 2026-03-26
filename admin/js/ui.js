(function () {
  "use strict";

  function esc(v) {
    var d = document.createElement("div");
    d.textContent = String(v == null ? "" : v);
    return d.innerHTML;
  }

  function statusLabel(status) {
    var s = String(status || "new");
    if (s === "done") return "Yapıldı";
    if (s === "pending") return "Beklemede";
    if (s === "in_progress") return "İşlemde";
    if (s === "cancelled") return "İptal";
    return "Yapılmadı";
  }

  function typeLabel(type) {
    if (type === "request") return "İstek";
    if (type === "complaint") return "Şikayet";
    if (type === "fault") return "Arıza";
    if (type === "reservation") return "Rezervasyon";
    return "Kayıt";
  }

  var CATEGORY_LABELS = {
    request: {
      extraTowels: "Ek havlu",
      bedding: "Yatak/çarşaf",
      roomCleaning: "Oda temizliği",
      minibar: "Minibar",
      babyBed: "Bebek yatağı",
      other: "Diğer",
    },
    complaint: {
      roomCleaning: "Temizlik",
      noise: "Gürültü",
      restaurantSvc: "Restoran hizmeti",
      staff: "Personel",
      climate: "Klima/ısı",
      other: "Diğer",
    },
    fault: {
      ac: "Klima",
      tv: "TV",
      lighting: "Aydınlatma",
      bathroom: "Banyo",
      doorLock: "Kapı/Kilit",
      phone: "Telefon",
      other: "Diğer",
    },
  };

  function categoryText(type, categories) {
    var arr = Array.isArray(categories) ? categories : [];
    if (!arr.length) return "-";
    var map = CATEGORY_LABELS[type] || {};
    return arr.map(function (id) { return map[id] || String(id); }).join(", ");
  }

  function issueDetailText(row, type) {
    if (!row || typeof row !== "object") return "-";
    var out = [];
    out.push("Seçim: " + categoryText(type, row.categories));
    if (row.other_category_note) out.push("Diğer notu: " + String(row.other_category_note));
    if (row.description) out.push("Açıklama: " + String(row.description));
    return out.join(" | ");
  }

  function reservationTypeLabel(row) {
    var t = String((row && row.reservation_type) || "").toLowerCase();
    var data = row && row.reservation_data && typeof row.reservation_data === "object" ? row.reservation_data : {};
    var rid = String(data.restaurantId || "");
    if (t === "reservation_alacarte" && rid === "laTerrace") return "La Terrace A La Carte";
    if (t === "reservation_alacarte" && rid === "mare") return "Mare Restaurant";
    if (t === "reservation_alacarte" && rid === "sinton") return "Sinton BBQ Restaurant";
    if (t === "reservation_alacarte") return "A la carte";
    if (t === "reservation_spa") return "Spa";
    return "Rezervasyon";
  }

  function reservationDetailText(row) {
    if (!row || typeof row !== "object") return "-";
    var data = row.reservation_data && typeof row.reservation_data === "object" ? row.reservation_data : {};
    var out = [];
    if (data.restaurantId) out.push("Restoran: " + reservationSubtabLabel(String(data.restaurantId)));
    if (data.spaServiceId) out.push("Spa hizmeti: " + String(data.spaServiceId));
    if (data.reservationDate) out.push("Tarih: " + String(data.reservationDate));
    if (data.date) out.push("Tarih: " + String(data.date));
    if (data.time) out.push("Saat: " + String(data.time));
    if (data.stayCheckIn) out.push("Giriş: " + String(data.stayCheckIn));
    if (data.stayCheckOut) out.push("Çıkış: " + String(data.stayCheckOut));
    if (row.note) out.push("Özel not: " + String(row.note));
    return out.length ? out.join(" | ") : "-";
  }

  function reservationServiceKey(row) {
    var t = String((row && row.reservation_type) || "").toLowerCase();
    if (t === "reservation_alacarte") return "alacarte";
    if (t === "reservation_spa") return "spa";
    return "other";
  }

  function reservationStatusLabel(status) {
    var s = String(status || "new");
    if (s === "new") return "Yeni Talep";
    if (s === "pending") return "Onay Bekliyor";
    if (s === "in_progress") return "Onaylandı";
    if (s === "done") return "Gerçekleşti";
    if (s === "cancelled") return "İptal";
    return s;
  }

  function reservationDateValue(row) {
    var data = row && row.reservation_data && typeof row.reservation_data === "object" ? row.reservation_data : {};
    return String(data.reservationDate || data.date || row.submitted_at || "").slice(0, 10);
  }

  function reservationTimeValue(row) {
    var data = row && row.reservation_data && typeof row.reservation_data === "object" ? row.reservation_data : {};
    return String(data.time || "").trim();
  }

  function reservationActionButtons(type, rowId) {
    return (
      '<button class="btn-small js-status" data-id="' +
      esc(rowId) +
      '" data-type="' +
      esc(type) +
      '" data-status="pending">Onaya Al</button>' +
      '<button class="btn-small js-status" data-id="' +
      esc(rowId) +
      '" data-type="' +
      esc(type) +
      '" data-status="in_progress">Onaylandı</button>' +
      '<button class="btn-small js-status" data-id="' +
      esc(rowId) +
      '" data-type="' +
      esc(type) +
      '" data-status="done">Gerçekleşti</button>' +
      '<button class="btn-small js-status" data-id="' +
      esc(rowId) +
      '" data-type="' +
      esc(type) +
      '" data-status="cancelled">İptal Et</button>'
      + '<button class="btn-small js-delete" data-id="' + esc(rowId) + '" data-type="' + esc(type) + '">Sil</button>'
    );
  }

  function reservationTabOptions() {
    return [
      { key: "laTerrace", label: "La Terrace A La Carte" },
      { key: "mare", label: "Mare Restaurant" },
      { key: "sinton", label: "Sinton BBQ Restaurant" },
      { key: "spa", label: "Spa" },
    ];
  }

  function reservationServiceMatches(row, tabKey) {
    var data = row && row.reservation_data && typeof row.reservation_data === "object" ? row.reservation_data : {};
    var t = String((row && row.reservation_type) || "").toLowerCase();
    if (tabKey === "spa") return t === "reservation_spa";
    return t === "reservation_alacarte" && String(data.restaurantId || "") === tabKey;
  }

  function reservationSubtabLabel(tabKey) {
    var all = reservationTabOptions();
    for (var i = 0; i < all.length; i++) {
      if (all[i].key === tabKey) return all[i].label;
    }
    return "Rezervasyon";
  }

  function dayLabel(dateKey) {
    if (!dateKey || dateKey === "Tarihsiz") return "Tarihsiz";
    var d = new Date(dateKey + "T00:00:00");
    if (isNaN(d.getTime())) return dateKey;
    var dd = String(d.getDate()).padStart(2, "0");
    var mm = String(d.getMonth() + 1).padStart(2, "0");
    var yyyy = String(d.getFullYear());
    return dd + "/" + mm + "/" + yyyy;
  }

  function toTrDateForInput(dateKey) {
    if (!dateKey) return "";
    var d = new Date(dateKey + "T00:00:00");
    if (isNaN(d.getTime())) return "";
    var dd = String(d.getDate()).padStart(2, "0");
    var mm = String(d.getMonth() + 1).padStart(2, "0");
    var yyyy = String(d.getFullYear());
    return dd + "/" + mm + "/" + yyyy;
  }

  function toIsoFromTrDate(tr) {
    var raw = String(tr || "").trim();
    var m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return "";
    var dd = m[1];
    var mm = m[2];
    var yyyy = m[3];
    var day = Number(dd);
    var month = Number(mm);
    var year = Number(yyyy);
    if (!day || !month || !year) return "";
    if (month < 1 || month > 12) return "";
    var daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) return "";
    var iso = yyyy + "-" + mm + "-" + dd;
    var d = new Date(iso + "T00:00:00");
    if (isNaN(d.getTime())) return "";
    return iso;
  }

  function reservationManualFormHtml() {
    return (
      '<form class="reservation-manual-form">' +
      '<div class="reservation-manual-grid">' +
      '<label>Misafir Adı<input name="name" type="text" required /></label>' +
      '<label>Oda<input name="room" type="text" required /></label>' +
      '<label>Uyruk<input name="nationality" type="text" value="TR" required /></label>' +
      '<label>Tarih<input name="date" type="date" required /></label>' +
      '<label>Saat<input name="time" type="time" required /></label>' +
      '<label>Özel Not<input name="note" type="text" /></label>' +
      "</div>" +
      '<p class="reservation-manual-help">Tarih seçimini takvimden yapın. Görünüm formatı: gg/aa/yyyy.</p>' +
      '<button type="submit" class="btn-small">Manuel Rezervasyon Ekle</button>' +
      '<p class="reservation-manual-status"></p>' +
      "</form>"
    );
  }

  function renderReservationBoard(mountEl, type, rows, handlers) {
    var grouped = {};
    rows.forEach(function (r) {
      var d = reservationDateValue(r) || "Tarihsiz";
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(r);
    });
    var days = Object.keys(grouped).sort();
    var total = rows.length;
    var alacarteCount = rows.filter(function (r) { return reservationServiceKey(r) === "alacarte"; }).length;
    var spaCount = rows.filter(function (r) { return reservationServiceKey(r) === "spa"; }).length;
    var openCount = rows.filter(function (r) {
      var s = String(r.status || "new");
      return s === "new" || s === "pending" || s === "in_progress";
    }).length;

    var tabs = reservationTabOptions();
    var html =
      '<div class="bucket-shell">' +
      '<div class="bucket-topstats">' +
      '<div class="bucket-stat"><span>Toplam Talep</span><strong>' + esc(total) + "</strong></div>" +
      '<div class="bucket-stat"><span>A la carte</span><strong>' + esc(alacarteCount) + "</strong></div>" +
      '<div class="bucket-stat"><span>Spa</span><strong>' + esc(spaCount) + "</strong></div>" +
      '<div class="bucket-stat"><span>Açık Rezervasyon</span><strong>' + esc(openCount) + "</strong></div>" +
      "</div>" +
      '<p class="bucket-help">Rezervasyonlar günlük takvim düzeninde listelenir. Sol menüde seçilen servis sekmesine göre filtrelenir.</p>' +
      '<div class="reservation-head-tools">' +
      '<p class="reservation-active-subtab">Aktif Servis: <strong class="reservation-active-subtab-value">' + esc(reservationSubtabLabel("laTerrace")) + "</strong></p>" +
      '<button type="button" class="btn-small reservation-manual-toggle">Manuel Giriş</button>' +
      '<button type="button" class="btn-small reservation-calendar-open">Takvim Görünümü</button>' +
      "</div>" +
      '<div class="reservation-manual-wrap hidden">' + reservationManualFormHtml() + "</div>" +
      '<div class="bucket-toolbar">' +
      '<input class="bucket-search" type="search" placeholder="Oda, misafir, not veya servis ara..." />' +
      '<select class="bucket-filter-status">' +
      '<option value="all">Tüm Durumlar</option>' +
      '<option value="new">Yeni Talep</option>' +
      '<option value="pending">Onay Bekliyor</option>' +
      '<option value="in_progress">Onaylandı</option>' +
      '<option value="done">Gerçekleşti</option>' +
      '<option value="cancelled">İptal</option>' +
      "</select>" +
      "</div>" +
      '<div class="reservation-day-list">' +
      "</div>" +
      '<section class="reservation-calendar-modal hidden" aria-hidden="true">' +
      '<div class="reservation-calendar-modal__card">' +
      '<div class="section-head"><h3>Takvim Görünümü</h3><button type="button" class="btn-small reservation-calendar-close">Kapat</button></div>' +
      '<p class="bucket-help">Gün seçin; o güne ait onaylı rezervasyonlar saat sırasıyla listelenir. Gelecekte saat bazlı kapasite limiti eklenebilir.</p>' +
      '<div class="reservation-calendar-controls">' +
      '<label>Gün Seçimi</label>' +
      '<div class="reservation-calendar-date-row">' +
      '<input class="reservation-calendar-date" type="text" inputmode="numeric" placeholder="24/03/2026" />' +
      '<button type="button" class="btn-small reservation-calendar-picker-btn">Takvimden Seç</button>' +
      '<input class="reservation-calendar-date-native hidden" type="date" />' +
      "</div>" +
      '<p class="reservation-calendar-selected">Seçilen Gün: <strong class="reservation-calendar-selected-value">-</strong></p>' +
      "</div>" +
      '<div class="bucket-table-wrap">' +
      '<table class="admin-table reservation-calendar-table">' +
      "<thead><tr><th>Saat</th><th>Misafir</th><th>Oda</th><th>Servis</th><th>Durum</th></tr></thead>" +
      '<tbody class="reservation-calendar-body"></tbody>' +
      "</table>" +
      "</div>" +
      "</div>" +
      "</section>";
    days.forEach(function (day) {
      var dayRows = grouped[day];
      html += '<section class="reservation-day">';
      html += '<h4 class="reservation-day__title">' + esc(dayLabel(day)) + " - Günlük Rezervasyon Listesi</h4>";
      html += '<div class="bucket-table-wrap"><table class="admin-table"><thead><tr><th>Servis</th><th>Oda</th><th>Misafir</th><th>Saat</th><th>Detay</th><th>Durum</th><th>İşlemler</th></tr></thead><tbody>';
      dayRows.sort(function (a, b) {
        return reservationTimeValue(a).localeCompare(reservationTimeValue(b));
      }).forEach(function (r) {
        var st = String(r.status || "new");
        var serviceKey = reservationServiceKey(r);
        var data = r.reservation_data && typeof r.reservation_data === "object" ? r.reservation_data : {};
        var subKey = serviceKey === "spa" ? "spa" : String(data.restaurantId || "other");
        var serviceName = reservationTypeLabel(r);
        var time = String(data.time || "-");
        var rowSearchText = [
          String(r.room_number || ""),
          String(r.guest_name || ""),
          String(r.note || ""),
          String(serviceName || ""),
          String(reservationDetailText(r) || ""),
        ].join(" ").toLowerCase();
        html += '<tr class="bucket-row reservation-row" data-service="' + esc(serviceKey) + '" data-subtab="' + esc(subKey) + '" data-status="' + esc(st) + '" data-search="' + esc(rowSearchText) + '">';
        html += "<td>" + esc(serviceName) + "</td>";
        html += "<td>" + esc(r.room_number || "-") + "</td>";
        html += "<td>" + esc(r.guest_name || "-") + "</td>";
        html += "<td>" + esc(time) + "</td>";
        html += "<td>" + esc(reservationDetailText(r)) + "</td>";
        html += '<td><span class="status-badge status-' + esc(st) + '">' + esc(reservationStatusLabel(st)) + "</span></td>";
        html += '<td><div class="row-actions">' + reservationActionButtons(type, r.id) + "</div></td>";
        html += "</tr>";
      });
      html += "</tbody></table></div></section>";
    });

    html += "</div>";
    mountEl.innerHTML = html;

    mountEl.querySelectorAll(".js-status").forEach(function (btn) {
      btn.addEventListener("click", function () {
        handlers.onStatus(btn.getAttribute("data-type"), btn.getAttribute("data-id"), btn.getAttribute("data-status"));
      });
    });
    mountEl.querySelectorAll(".js-delete").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (handlers && typeof handlers.onDelete === "function") {
          handlers.onDelete(btn.getAttribute("data-type"), btn.getAttribute("data-id"));
        }
      });
    });

    var search = mountEl.querySelector(".bucket-search");
    var statusFilter = mountEl.querySelector(".bucket-filter-status");
    var activeTab = "laTerrace";
    var activeSubtabValue = mountEl.querySelector(".reservation-active-subtab-value");
    var manualWrap = mountEl.querySelector(".reservation-manual-wrap");
    var manualToggle = mountEl.querySelector(".reservation-manual-toggle");
    var manualForm = mountEl.querySelector(".reservation-manual-form");
    var calendarModal = mountEl.querySelector(".reservation-calendar-modal");
    var calendarOpen = mountEl.querySelector(".reservation-calendar-open");
    var calendarClose = mountEl.querySelector(".reservation-calendar-close");
    var calendarDate = mountEl.querySelector(".reservation-calendar-date");
    var calendarDateNative = mountEl.querySelector(".reservation-calendar-date-native");
    var calendarPickerBtn = mountEl.querySelector(".reservation-calendar-picker-btn");
    var calendarSelected = mountEl.querySelector(".reservation-calendar-selected-value");
    var calendarBody = mountEl.querySelector(".reservation-calendar-body");
    function defaultCalendarDate() {
      var list = rows
        .filter(function (r) {
          var st = String(r.status || "new");
          return (st === "in_progress" || st === "done") && reservationServiceMatches(r, activeTab);
        })
        .map(function (r) { return reservationDateValue(r); })
        .filter(Boolean)
        .sort();
      return list[0] || "";
    }
    function renderCalendarRows() {
      if (!calendarBody) return;
      var selectedDate = toIsoFromTrDate(String((calendarDate && calendarDate.value) || "").trim());
      if (calendarSelected) calendarSelected.textContent = selectedDate ? toTrDateForInput(selectedDate) : "-";
      var calendarRows = rows
        .filter(function (r) {
          var st = String(r.status || "new");
          var approved = st === "in_progress" || st === "done";
          if (!approved || !reservationServiceMatches(r, activeTab)) return false;
          if (!selectedDate) return true;
          return reservationDateValue(r) === selectedDate;
        })
        .sort(function (a, b) {
          return reservationTimeValue(a).localeCompare(reservationTimeValue(b));
        });
      if (!calendarRows.length) {
        calendarBody.innerHTML = '<tr><td colspan="5">Seçilen gün için onaylı rezervasyon yok.</td></tr>';
        return;
      }
      var out = "";
      calendarRows.forEach(function (r) {
        var dt = r.reservation_data && typeof r.reservation_data === "object" ? r.reservation_data : {};
        out += "<tr>";
        out += "<td>" + esc(String(dt.time || "-")) + "</td>";
        out += "<td>" + esc(r.guest_name || "-") + "</td>";
        out += "<td>" + esc(r.room_number || "-") + "</td>";
        out += "<td>" + esc(reservationTypeLabel(r)) + "</td>";
        out += '<td><span class="status-badge status-' + esc(String(r.status || "new")) + '">' + esc(reservationStatusLabel(r.status)) + "</span></td>";
        out += "</tr>";
      });
      calendarBody.innerHTML = out;
    }
    function applyFilters() {
      var q = String((search && search.value) || "").trim().toLowerCase();
      var st = String((statusFilter && statusFilter.value) || "all");
      mountEl.querySelectorAll(".reservation-row").forEach(function (row) {
        var okStatus = st === "all" || row.getAttribute("data-status") === st;
        var okTab = row.getAttribute("data-subtab") === activeTab;
        var okSearch = !q || String(row.getAttribute("data-search") || "").indexOf(q) >= 0;
        row.classList.toggle("hidden", !(okStatus && okTab && okSearch));
      });
      mountEl.querySelectorAll(".reservation-day").forEach(function (sec) {
        var hasVisible = sec.querySelector(".reservation-row:not(.hidden)");
        sec.classList.toggle("hidden", !hasVisible);
      });
      renderCalendarRows();
    }
    if (search) search.addEventListener("input", applyFilters);
    if (statusFilter) statusFilter.addEventListener("change", applyFilters);
    if (manualToggle && manualWrap) {
      manualToggle.addEventListener("click", function () {
        manualWrap.classList.toggle("hidden");
      });
    }
    if (calendarDate) {
      calendarDate.addEventListener("input", renderCalendarRows);
    }
    if (calendarPickerBtn && calendarDateNative) {
      calendarPickerBtn.addEventListener("click", function () {
        if (typeof calendarDateNative.showPicker === "function") {
          calendarDateNative.showPicker();
        } else {
          calendarDateNative.click();
        }
      });
      calendarDateNative.addEventListener("change", function () {
        var iso = String(calendarDateNative.value || "").trim();
        if (calendarDate) calendarDate.value = iso ? toTrDateForInput(iso) : "";
        renderCalendarRows();
      });
    }
    if (calendarOpen && calendarModal) {
      calendarOpen.addEventListener("click", function () {
        if (calendarDate && !calendarDate.value) {
          var def = defaultCalendarDate();
          calendarDate.value = def ? toTrDateForInput(def) : "";
          if (calendarDateNative) calendarDateNative.value = def || "";
        }
        renderCalendarRows();
        calendarModal.classList.remove("hidden");
        calendarModal.setAttribute("aria-hidden", "false");
      });
    }
    if (calendarClose && calendarModal) {
      calendarClose.addEventListener("click", function () {
        calendarModal.classList.add("hidden");
        calendarModal.setAttribute("aria-hidden", "true");
      });
    }

    if (manualForm) {
      manualForm.addEventListener("submit", async function (ev) {
        ev.preventDefault();
        var fd = new FormData(manualForm);
        var name = String(fd.get("name") || "").trim();
        var room = String(fd.get("room") || "").trim();
        var nationality = String(fd.get("nationality") || "").trim();
        var date = String(fd.get("date") || "").trim();
        var time = String(fd.get("time") || "").trim();
        var note = String(fd.get("note") || "").trim();
        if (!name || !room || !nationality || !date || !time) return;
        var payload;
        if (activeTab === "spa") {
          payload = {
            type: "reservation_spa",
            name: name,
            room: room,
            nationality: nationality,
            description: note,
            reservation: {
              spaServiceId: "other",
              date: date,
              time: time,
            },
          };
        } else {
          payload = {
            type: "reservation_alacarte",
            name: name,
            room: room,
            nationality: nationality,
            description: note,
            reservation: {
              restaurantId: activeTab,
              reservationDate: date,
              time: time,
            },
          };
        }
        var status = manualForm.querySelector(".reservation-manual-status");
        try {
          if (handlers && typeof handlers.onCreate === "function") {
            await handlers.onCreate(payload);
            if (status) status.textContent = "Manuel rezervasyon kaydedildi.";
            manualForm.reset();
          }
        } catch (_e) {
          if (status) status.textContent = "Kayıt sırasında hata oluştu.";
        }
      });
    }
    mountEl.addEventListener("reservation:setSubtab", function (ev) {
      var key = ev && ev.detail && ev.detail.key ? String(ev.detail.key) : "laTerrace";
      activeTab = key;
      if (activeSubtabValue) activeSubtabValue.textContent = reservationSubtabLabel(key);
      if (calendarDate) {
        var defDate = defaultCalendarDate();
        calendarDate.value = defDate ? toTrDateForInput(defDate) : "";
        if (calendarDateNative) calendarDateNative.value = defDate || "";
      }
      applyFilters();
    });
    applyFilters();
  }

  window.AdminUI = {
    renderKpis: function (el, kpis) {
      el.innerHTML = "";
      var cards = [
        {
          title: "Toplam Sohbet",
          value: kpis.totalChats,
          hint: "Misafirlerin bot ile toplam mesaj etkileşimi",
          icon: "💬",
        },
        {
          title: "Fallback Oranı",
          value: kpis.fallbackRate + "%",
          hint: "Botun yanıt üretemediği durum yüzdesi",
          icon: "⚠️",
        },
        {
          title: "Genel Memnuniyet",
          value: kpis.overallSatisfaction,
          hint: "Otel deneyimi için ortalama memnuniyet skoru",
          icon: "🏨",
        },
        {
          title: "Viona Memnuniyet",
          value: kpis.vionaSatisfaction,
          hint: "Asistan deneyimi için ortalama memnuniyet skoru",
          icon: "🤖",
        },
      ];
      cards.forEach(function (c) {
        var d = document.createElement("div");
        d.className = "kpi-card";
        d.innerHTML =
          '<div class="kpi-card__head"><span class="kpi-card__icon" aria-hidden="true">' +
          esc(c.icon) +
          "</span><h4>" +
          esc(c.title) +
          "</h4></div>" +
          '<p class="kpi-card__value">' +
          esc(c.value) +
          "</p>" +
          '<p class="kpi-card__hint">' +
          esc(c.hint) +
          "</p>";
        el.appendChild(d);
      });
    },
    renderSimpleList: function (el, titleValuePairs) {
      el.innerHTML = '<ul class="mini-list">' + titleValuePairs.map(function (x) { return "<li><strong>" + esc(x[0]) + ":</strong> " + esc(x[1]) + "</li>"; }).join("") + "</ul>";
    },
    renderMetricRows: function (el, rows) {
      if (!el) return;
      var html = '<div class="metric-rows">';
      rows.forEach(function (r) {
        html +=
          '<div class="metric-row">' +
          '<div class="metric-row__title">' +
          esc(r.title || "-") +
          "</div>" +
          '<div class="metric-row__value">' +
          esc(r.value == null ? "-" : r.value) +
          "</div>" +
          '<div class="metric-row__desc">' +
          esc(r.desc || "") +
          "</div>" +
          "</div>";
      });
      html += "</div>";
      el.innerHTML = html;
    },
    renderBucketTable: function (mountEl, type, rows, handlers) {
      if (!rows.length) {
        mountEl.innerHTML = "<p>Kayıt yok.</p>";
        return;
      }
      if (type === "reservation") {
        renderReservationBoard(mountEl, type, rows, handlers);
        return;
      }
      var total = rows.length;
      var open = rows.filter(function (r) {
        var s = String(r.status || "new");
        return s === "new" || s === "pending" || s === "in_progress";
      }).length;
      var done = rows.filter(function (r) {
        return String(r.status || "") === "done";
      }).length;
      var html =
        '<div class="bucket-shell">' +
        '<div class="bucket-topstats">' +
        '<div class="bucket-stat"><span>Toplam</span><strong>' + esc(total) + "</strong></div>" +
        '<div class="bucket-stat"><span>Açık</span><strong>' + esc(open) + "</strong></div>" +
        '<div class="bucket-stat"><span>Tamamlanan</span><strong>' + esc(done) + "</strong></div>" +
        "</div>" +
        '<p class="bucket-help">' +
        esc(typeLabel(type)) +
        " kayıtları operasyon ekibi tarafından takip edilir. Önce Beklemede, tamamlanınca Yapıldı durumuna alın.</p>" +
        '<div class="bucket-toolbar">' +
        '<input class="bucket-search" type="search" placeholder="Oda, misafir veya detay ara..." />' +
        '<select class="bucket-filter-status">' +
        '<option value=\"all\">Tüm Durumlar</option>' +
        '<option value=\"new\">Yapılmadı</option>' +
        '<option value=\"pending\">Beklemede</option>' +
        '<option value=\"in_progress\">İşlemde</option>' +
        '<option value=\"done\">Yapıldı</option>' +
        "</select>" +
        "</div>" +
        '<div class="bucket-table-wrap"><table class="admin-table"><thead><tr><th>Tarih</th><th>Tip</th><th>Oda</th><th>Misafir</th><th>Detay</th><th>Durum</th><th>İşlemler</th></tr></thead><tbody>';
      rows.forEach(function (r) {
        var st = String(r.status || "new");
        var typeText = typeLabel(type);
        var detailText = issueDetailText(r, type);
        var rowSearchText = [
          String(r.room_number || ""),
          String(r.guest_name || ""),
          String(detailText || ""),
        ]
          .join(" ")
          .toLowerCase();
        html += '<tr class="bucket-row" data-status="' + esc(st) + '" data-search="' + esc(rowSearchText) + '">';
        html += "<td>" + esc(String(r.submitted_at || "").slice(0, 16).replace("T", " ")) + "</td>";
        html += "<td>" + esc(typeText) + "</td>";
        html += "<td>" + esc(r.room_number || "-") + "</td>";
        html += "<td>" + esc(r.guest_name || "-") + "</td>";
        html += "<td>" + esc(detailText) + "</td>";
        html += '<td><span class="status-badge status-' + esc(st) + '">' + esc(statusLabel(st)) + "</span></td>";
        html += '<td><div class="row-actions">';
        html += '<button class="btn-small js-status" data-id="' + esc(r.id) + '" data-type="' + esc(type) + '" data-status="pending">Beklemeye Al</button>';
        html += '<button class="btn-small js-status" data-id="' + esc(r.id) + '" data-type="' + esc(type) + '" data-status="done">Yapıldı</button>';
        html += '<button class="btn-small js-delete" data-id="' + esc(r.id) + '" data-type="' + esc(type) + '">Sil</button>';
        html += "</div></td>";
        html += "</tr>";
      });
      html += "</tbody></table></div></div>";
      mountEl.innerHTML = html;

      mountEl.querySelectorAll(".js-status").forEach(function (btn) {
        btn.addEventListener("click", function () {
          handlers.onStatus(btn.getAttribute("data-type"), btn.getAttribute("data-id"), btn.getAttribute("data-status"));
        });
      });
      mountEl.querySelectorAll(".js-delete").forEach(function (btn) {
        btn.addEventListener("click", function () {
          handlers.onDelete(btn.getAttribute("data-type"), btn.getAttribute("data-id"));
        });
      });

      var search = mountEl.querySelector(".bucket-search");
      var statusFilter = mountEl.querySelector(".bucket-filter-status");
      function applyFilters() {
        var q = String((search && search.value) || "").trim().toLowerCase();
        var st = String((statusFilter && statusFilter.value) || "all");
        mountEl.querySelectorAll(".bucket-row").forEach(function (row) {
          var okStatus = st === "all" || row.getAttribute("data-status") === st;
          var okSearch = !q || String(row.getAttribute("data-search") || "").indexOf(q) >= 0;
          row.classList.toggle("hidden", !(okStatus && okSearch));
        });
      }
      if (search) search.addEventListener("input", applyFilters);
      if (statusFilter) statusFilter.addEventListener("change", applyFilters);
    },
  };
})();
