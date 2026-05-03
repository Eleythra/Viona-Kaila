(function () {
  "use strict";

  function esc(v) {
    var d = document.createElement("div");
    d.textContent = String(v == null ? "" : v);
    return d.innerHTML;
  }

  /** WhatsApp «panelde aç» vb.: tam tabloda ilgili satırı vurgula. */
  function bucketRowHighlightClass(handlers, rowId) {
    var hid =
      handlers && handlers.highlightRowId != null ? String(handlers.highlightRowId).trim().toLowerCase() : "";
    if (!hid) return "";
    var rid = String(rowId || "").trim().toLowerCase();
    return rid === hid ? " ops-row--deep-link" : "";
  }

  function scrollBucketHighlightIntoView(mountEl) {
    if (!mountEl) return;
    var el = mountEl.querySelector("tr.ops-row--deep-link");
    if (!el || !el.scrollIntoView) return;
    requestAnimationFrame(function () {
      try {
        el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      } catch (_e) {
        el.scrollIntoView(true);
      }
    });
  }

  /** Sunucu: raw_payload.admin.guest_satisfaction */
  function rawPayloadAdminSat(r) {
    try {
      var rp = r && r.raw_payload;
      if (!rp || typeof rp !== "object") return { score: "", note: "" };
      var ad = rp.admin;
      if (!ad || typeof ad !== "object") return { score: "", note: "" };
      var gs = ad.guest_satisfaction;
      if (!gs || typeof gs !== "object") return { score: "", note: "" };
      var sc = gs.score;
      return {
        score: sc != null && String(sc) !== "" && Number.isFinite(Number(sc)) ? Number(sc) : "",
        note: gs.note != null ? String(gs.note) : "",
      };
    } catch (_e) {
      return { score: "", note: "" };
    }
  }

  function satisfactionEditCellHtml(type, row) {
    var sat = rawPayloadAdminSat(row);
    var opts = '<option value="">—</option>';
    for (var n = 1; n <= 5; n++) {
      opts +=
        '<option value="' +
        n +
        '"' +
        (Number(sat.score) === n ? " selected" : "") +
        ">" +
        n +
        "</option>";
    }
    return (
      '<div class="bucket-sat-edit">' +
      '<select class="bucket-sat-score js-admin-sat-score" data-type="' +
      esc(type) +
      '" data-id="' +
      esc(row.id) +
      '" aria-label="Memnuniyet 1–5">' +
      opts +
      "</select>" +
      '<textarea class="bucket-sat-note js-admin-sat-note" rows="2" data-type="' +
      esc(type) +
      '" data-id="' +
      esc(row.id) +
      '" placeholder="Kısa not">' +
      esc(sat.note) +
      "</textarea>" +
      '<button type="button" class="btn-small btn-primary js-admin-sat-save" data-type="' +
      esc(type) +
      '" data-id="' +
      esc(row.id) +
      '">Kaydet</button></div>'
    );
  }

  function wireAdminSatisfaction(mountEl, handlers) {
    if (!mountEl || !handlers || typeof handlers.onSatisfaction !== "function") return;
    mountEl.querySelectorAll(".js-admin-sat-save").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var tr = btn.closest("tr");
        var scoreEl = tr ? tr.querySelector(".js-admin-sat-score") : null;
        var noteEl = tr ? tr.querySelector(".js-admin-sat-note") : null;
        var t = String(btn.getAttribute("data-type") || "");
        var id = String(btn.getAttribute("data-id") || "");
        var score = scoreEl && scoreEl.value !== "" ? scoreEl.value : "";
        var note = noteEl ? String(noteEl.value || "").trim() : "";
        var p = handlers.onSatisfaction(t, id, score, note);
        if (p && typeof p.then === "function") {
          btn.disabled = true;
          p.then(function () {
            btn.disabled = false;
          }).catch(function () {
            btn.disabled = false;
          });
        }
      });
    });
  }

  var adminWaConfirmModalOpen = false;

  function ensureAdminWaResendModal() {
    if (document.getElementById("admin-wa-resend-modal")) return;
    var root = document.createElement("div");
    root.id = "admin-wa-resend-modal";
    root.className = "admin-wa-modal hidden";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "admin-wa-resend-modal-title");
    root.setAttribute("aria-hidden", "true");
    root.innerHTML =
      '<div class="admin-wa-modal__backdrop" data-wa-modal-backdrop tabindex="-1"></div>' +
      '<div class="admin-wa-modal__card glass-block">' +
      '<h3 id="admin-wa-resend-modal-title" class="admin-wa-modal__title">Operasyon WhatsApp’a yeniden iletilsin mi?</h3>' +
      '<p class="admin-wa-modal__body">Bu kayıt <strong>operasyon WhatsApp hattına</strong> (Meta Cloud API, .env’deki numaralar) bir kez daha gönderilir. Yanlışlıkla açtıysanız <strong>İptal</strong> ile kapatın. Onay sonrası sunucu mesajı yollar; lütfen çift gönderim yapmayın.</p>' +
      '<div class="admin-wa-modal__actions">' +
      '<button type="button" class="btn-small" data-wa-modal-cancel>İptal</button>' +
      '<button type="button" class="btn-primary btn-small" data-wa-modal-confirm>WhatsApp’a ilet</button>' +
      "</div></div>";
    document.body.appendChild(root);
  }

  /** İstek / şikâyet / arıza / misafir bildirimi satırındaki WA yeniden gönder — tarayıcı confirm yerine net modal (yanlış tıklama koruması). */
  function openAdminWhatsappResendConfirm() {
    if (adminWaConfirmModalOpen) return Promise.resolve(false);
    adminWaConfirmModalOpen = true;
    return new Promise(function (resolve) {
      ensureAdminWaResendModal();
      var root = document.getElementById("admin-wa-resend-modal");
      if (!root) {
        adminWaConfirmModalOpen = false;
        resolve(false);
        return;
      }
      var backdrop = root.querySelector("[data-wa-modal-backdrop]");
      var btnCancel = root.querySelector("[data-wa-modal-cancel]");
      var btnOk = root.querySelector("[data-wa-modal-confirm]");
      function finish(val) {
        adminWaConfirmModalOpen = false;
        root.classList.add("hidden");
        root.setAttribute("aria-hidden", "true");
        document.removeEventListener("keydown", onKey);
        if (btnCancel) btnCancel.removeEventListener("click", onCancel);
        if (btnOk) btnOk.removeEventListener("click", onOk);
        if (backdrop) backdrop.removeEventListener("click", onCancel);
        resolve(val);
      }
      function onCancel() {
        finish(false);
      }
      function onOk() {
        finish(true);
      }
      function onKey(ev) {
        if (ev.key === "Escape") onCancel();
      }
      root.classList.remove("hidden");
      root.setAttribute("aria-hidden", "false");
      document.addEventListener("keydown", onKey);
      if (btnCancel) btnCancel.addEventListener("click", onCancel);
      if (btnOk) btnOk.addEventListener("click", onOk);
      if (backdrop) backdrop.addEventListener("click", onCancel);
      if (btnCancel) btnCancel.focus();
    });
  }

  /** API / DB farklı yazımları için; rozet sınıfı, filtre ve buton mantığı tek tip. */
  function normalizeBucketStatus(raw) {
    var s = String(raw == null ? "new" : raw)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
    if (s === "inprogress") s = "in_progress";
    if (
      s === "denied" ||
      s === "declined" ||
      s === "onaylanmadi" ||
      s === "onaylanmadı" ||
      s === "not_approved" ||
      s === "yapilamadi" ||
      s === "yapılamadı" ||
      s === "dikkate_alinmadi" ||
      s === "dikkate_alınmadı"
    ) {
      s = "rejected";
    }
    if (
      s === "yapildi" ||
      s === "yapıldı" ||
      s === "tamamlandi" ||
      s === "tamamlandı" ||
      s === "completed" ||
      s === "fulfilled" ||
      s === "resolved" ||
      s === "dikkate_alindi" ||
      s === "dikkate_alındı"
    ) {
      s = "done";
    }
    return s;
  }

  var ADMIN_HOTEL_TZ = "Europe/Istanbul";

  function formatDurationHumanTr(ms) {
    if (ms == null || !Number.isFinite(ms) || ms < 0) return "—";
    var totalMin = Math.floor(ms / 60000);
    var dayPart = Math.floor(totalMin / (60 * 24));
    var h = Math.floor((totalMin % (60 * 24)) / 60);
    var m = totalMin % 60;
    if (dayPart > 0) return dayPart + " g " + h + " sa " + m + " dk";
    if (h > 0) return h + " sa " + m + " dk";
    return m + " dk";
  }

  /** Kapalı: bildirim → yapıldı / yapılmadı anına kadar; açık: o ana kadar geçen süre. */
  function operationalSlaDisplayTr(r) {
    var st = normalizeBucketStatus(r.status);
    var t0 = r.submitted_at ? new Date(r.submitted_at).getTime() : NaN;
    if (!Number.isFinite(t0)) return "—";
    var rEnd = r.resolved_at ? new Date(r.resolved_at).getTime() : NaN;
    if (!Number.isFinite(rEnd) && (st === "done" || st === "rejected") && r.updated_at) {
      rEnd = new Date(r.updated_at).getTime();
    }
    if (st === "done" && Number.isFinite(rEnd)) {
      return "Yapıldı · " + formatDurationHumanTr(rEnd - t0);
    }
    if (st === "rejected" && Number.isFinite(rEnd)) {
      return "Yapılmadı · " + formatDurationHumanTr(rEnd - t0);
    }
    if (st === "new" || st === "pending" || st === "in_progress") {
      return "Geçen süre " + formatDurationHumanTr(Date.now() - t0);
    }
    return "—";
  }

  /** Misafir anketi — js/survey-schema.js ile aynı sıra ve soru anahtarları. */
  var SURVEY_EVAL_SECTIONS = [
    {
      tabId: "generalEval",
      title: "Genel değerlendirme",
      questions: [
        { id: "gen_stay_experience", label: "Genel konaklama deneyiminizi nasıl değerlendirirsiniz?" },
        { id: "gen_service_quality", label: "Otel hizmetlerinin genel kalitesini nasıl değerlendirirsiniz?" },
        { id: "gen_return_intent", label: "Otelimizi tekrar tercih etme isteğinizi nasıl değerlendirirsiniz?" },
      ],
    },
    {
      tabId: "viona",
      title: "Viona",
      isViona: true,
      questions: [
        { id: "viona_helpfulness", label: "Yanıtların işinize yararlığı" },
        { id: "viona_understanding", label: "İsteğinizi doğru anlama" },
        { id: "viona_usability", label: "Sohbet ekranı kullanım kolaylığı" },
        { id: "viona_overall", label: "Viona ile genel memnuniyet" },
      ],
    },
    {
      title: "Yemek & içecek",
      categoryKeys: ["food_main_restaurant", "food_la_terracca", "food_snack_dolphin_gusto", "food_bars"],
      subgroups: [
        {
          title: "Ana restoran (açık büfe)",
          categoryKey: "food_main_restaurant",
          questions: [
            { id: "food_buffet_quality", label: "Yemek kalitesini nasıl değerlendirirsiniz?" },
            { id: "food_buffet_variety", label: "Menü çeşitliliğini nasıl değerlendirirsiniz?" },
            { id: "food_buffet_service", label: "Servis ve personel ilgisini nasıl değerlendirirsiniz?" },
          ],
        },
        {
          title: "A La Carte – La Terraca",
          categoryKey: "food_la_terracca",
          questions: [
            { id: "food_terrace_quality", label: "Sunulan yemeklerin kalitesini nasıl değerlendirirsiniz?" },
            { id: "food_terrace_speed", label: "Servis hızını nasıl değerlendirirsiniz?" },
            { id: "food_terrace_overall", label: "Genel deneyiminizi nasıl değerlendirirsiniz?" },
          ],
        },
        {
          title: "Snack restoranlar – Dolphin & Gusto",
          categoryKey: "food_snack_dolphin_gusto",
          questions: [
            { id: "food_snack_quality", label: "Sunulan ürünlerin kalitesini nasıl değerlendirirsiniz?" },
            { id: "food_snack_speed", label: "Servis hızını nasıl değerlendirirsiniz?" },
            { id: "food_snack_area", label: "Alan konforunu ve düzenini nasıl değerlendirirsiniz?" },
          ],
        },
        {
          title: "Barlar",
          categoryKey: "food_bars",
          questions: [
            { id: "food_bar_quality", label: "İçecek kalitesini nasıl değerlendirirsiniz?" },
            { id: "food_bar_speed", label: "Servis hızını nasıl değerlendirirsiniz?" },
            { id: "food_bar_staff", label: "Personel ilgisini nasıl değerlendirirsiniz?" },
          ],
        },
      ],
    },
    {
      tabId: "comfort",
      title: "Oda & konfor",
      questions: [
        { id: "room_comfort_overall", label: "Odanızın genel konforunu nasıl değerlendirirsiniz?" },
        { id: "room_cleanliness", label: "Odanızın temizliğini nasıl değerlendirirsiniz?" },
        { id: "bed_sleep_quality", label: "Yatak kalitesini ve uyku konforunu nasıl değerlendirirsiniz?" },
        { id: "noise_insulation", label: "Gürültü seviyesini ve izolasyonu nasıl değerlendirirsiniz?" },
      ],
    },
    {
      tabId: "staff",
      title: "Resepsiyon & ekip",
      questions: [
        { id: "reception_check_in_out", label: "Check-in ve check-out sürecini nasıl değerlendirirsiniz?" },
        { id: "staff_interest_approach", label: "Personelin ilgisini ve yaklaşımını nasıl değerlendirirsiniz?" },
        { id: "request_resolution_speed", label: "Taleplerinize çözüm hızını nasıl değerlendirirsiniz?" },
      ],
    },
    {
      title: "Havuz & plaj",
      categoryKeys: ["pool_area", "beach_area"],
      subgroups: [
        {
          title: "Havuz",
          categoryKey: "pool_area",
          questions: [
            { id: "pool_cleanliness", label: "Havuz alanının temizliğini nasıl değerlendirirsiniz?" },
            { id: "pool_lounger_space", label: "Şezlong ve dinlenme alanı yeterliliğini nasıl değerlendirirsiniz?" },
            { id: "pool_overall", label: "Genel havuz deneyimini nasıl değerlendirirsiniz?" },
          ],
        },
        {
          title: "Plaj",
          categoryKey: "beach_area",
          questions: [
            { id: "beach_cleanliness", label: "Plaj alanının temizliğini nasıl değerlendirirsiniz?" },
            { id: "beach_lounger_space", label: "Şezlong ve dinlenme alanı yeterliliğini nasıl değerlendirirsiniz?" },
            { id: "beach_overall", label: "Genel plaj deneyimini nasıl değerlendirirsiniz?" },
          ],
        },
      ],
    },
    {
      tabId: "spaWellness",
      title: "Spa & wellness",
      questions: [
        { id: "spa_service_quality", label: "Hizmet kalitesini nasıl değerlendirirsiniz?" },
        { id: "spa_staff_interest", label: "Personel ilgisini nasıl değerlendirirsiniz?" },
        { id: "spa_overall_experience", label: "Genel spa deneyiminizi nasıl değerlendirirsiniz?" },
      ],
    },
    {
      tabId: "guestExperience",
      title: "Misafir deneyimi & hizmet",
      questions: [
        { id: "guest_response_speed", label: "Taleplerinize verilen yanıt hızını nasıl değerlendirirsiniz?" },
        { id: "guest_issue_resolution", label: "Yaşadığınız bir sorun olduysa çözüm sürecini nasıl değerlendirirsiniz?" },
        { id: "guest_solution_focus", label: "Personelin çözüm odaklı yaklaşımını nasıl değerlendirirsiniz?" },
        { id: "guest_hotel_care", label: "Genel olarak otelin ilgisini ve takibini nasıl değerlendirirsiniz?" },
      ],
    },
    {
      tabId: "sustainability",
      title: "Sürdürülebilirlik",
      questions: [
        {
          id: "sus_eco_practices",
          label:
            "Konaklamanız sırasında otelin çevre dostu uygulamalarını (enerji tasarrufu, atık yönetimi, plastik kullanımının azaltılması vb.) ne kadar yeterli buldunuz?",
        },
        {
          id: "sus_sustainability_engagement",
          label:
            "Otelin sürdürülebilirlik konusunda sizi bilgilendirme ve bu sürece dahil etme düzeyini nasıl değerlendirirsiniz?",
        },
        {
          id: "sus_overall_sustainability",
          label:
            "Genel olarak, Kaila Beach’in sürdürülebilir ve çevreye duyarlı bir tesis olduğunu ne ölçüde düşünüyorsunuz?",
        },
      ],
    },
  ];

  /** Yerel tarih YYYY-MM-DD (tarih seçicilerde geçmiş günleri kapatmak için min). */
  function todayIsoLocal() {
    var d = new Date();
    var pad = function (n) {
      return n < 10 ? "0" + n : String(n);
    };
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  /** YYYY-MM-DD + gün (yerel takvim). */
  function addCalendarDaysIso(isoYmd, deltaDays) {
    var s = String(isoYmd || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
    var p = s.split("-");
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    d.setDate(d.getDate() + (Number(deltaDays) || 0));
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function shortText(v, maxLen) {
    var s = String(v == null ? "" : v).replace(/\s+/g, " ").trim();
    if (!s) return "-";
    if (s.length <= maxLen) return s;
    return s.slice(0, Math.max(0, maxLen - 1)) + "…";
  }

  function issueIsWaitStatus(st) {
    var s = normalizeBucketStatus(st);
    return s === "new" || s === "pending" || s === "in_progress";
  }

  /** İstek / arıza / şikâyet / bildirim: Bekliyor · Yapılıyor · Yapıldı · Yapılmadı · Geç çıkış: onay dili. */
  function issueStatusLabel(issueType, status) {
    var s = normalizeBucketStatus(status);
    if (s === "cancelled") return "İptal";
    if (s === "new" || s === "pending") return "Bekliyor";
    if (s === "in_progress") {
      return "Yapılıyor";
    }
    if (s === "done") {
      if (issueType === "late_checkout") return "Onaylandı";
      return "Yapıldı";
    }
    if (s === "rejected") {
      if (issueType === "late_checkout") return "Onaylanmadı";
      return "Yapılmadı";
    }
    return s;
  }

  function statusLabel(status) {
    return issueStatusLabel("request", status);
  }

  function rowMatchesStatusFilter(rowStatus, filterVal) {
    var st = normalizeBucketStatus(rowStatus);
    var f = String(filterVal || "all");
    if (f === "all") return true;
    if (f === "new_pending") return st === "new" || st === "pending" || st === "in_progress";
    if (f === "rejected") return st === "rejected";
    return st === f;
  }

  function issueRowActionsHtml(issueType, id, st) {
    st = normalizeBucketStatus(st);
    var type = issueType;
    var posLabel;
    var negLabel;
    if (type === "late_checkout") {
      posLabel = "Onaylandı";
      negLabel = "Onaylanmadı";
    } else {
      posLabel = "Yapıldı";
      negLabel = "Yapılmadı";
    }
    var h = "";
    function stBtn(stat, label) {
      return (
        '<button type="button" class="btn-small js-status" data-id="' +
        esc(id) +
        '" data-type="' +
        esc(type) +
        '" data-status="' +
        esc(stat) +
        '">' +
        esc(label) +
        "</button>"
      );
    }
    if (issueIsWaitStatus(st)) {
      h += stBtn("done", posLabel);
      h += stBtn("rejected", negLabel);
    } else if (st === "done") {
      h += stBtn("new", "Bekliyor");
      h += stBtn("rejected", negLabel);
    } else if (st === "rejected") {
      h += stBtn("new", "Bekliyor");
      h += stBtn("done", posLabel);
    } else {
      h += stBtn("new", "Bekliyor");
    }
    h +=
      '<button type="button" class="btn-small btn-wa-resend js-wa-resend" data-type="' +
      esc(type) +
      '" data-id="' +
      esc(id) +
      '" title="Operasyon WhatsApp (Cloud API) numaralarına yeniden ilet">WhatsApp</button>';
    h += '<button type="button" class="btn-small js-delete" data-id="' + esc(id) + '" data-type="' + esc(type) + '">Sil</button>';
    return h;
  }

  /** İstek / şikâyet / arıza / misafir bildirimi / geç çıkış tablolarında WA yeniden gönder. Modal onay + kısa gecikme (çift tıklama / dokunma). */
  function wireWhatsappResendButtons(mountEl, handlers) {
    if (!mountEl || !handlers || typeof handlers.onWhatsappResend !== "function") return;
    mountEl.querySelectorAll(".js-wa-resend").forEach(function (btn) {
      btn.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        var el = btn;
        if (el.disabled || el.getAttribute("aria-busy") === "true") return;
        void openAdminWhatsappResendConfirm().then(function (confirmed) {
          if (!confirmed) return;
          el.disabled = true;
          el.setAttribute("aria-busy", "true");
          window.setTimeout(function () {
            var p = handlers.onWhatsappResend(el.getAttribute("data-type"), el.getAttribute("data-id"));
            if (p && typeof p.then === "function") {
              p.finally(function () {
                el.disabled = false;
                el.removeAttribute("aria-busy");
              });
            } else {
              el.disabled = false;
              el.removeAttribute("aria-busy");
            }
          }, 400);
        });
      });
    });
  }

  function typeLabel(type) {
    if (type === "request") return "İstek";
    if (type === "complaint") return "Şikâyet";
    if (type === "guest_notification") return "Misafir bildirimi";
    if (type === "late_checkout") return "Geç çıkış";
    if (type === "fault") return "Arıza";
    if (type === "reservation") return "Kapalı";
    return "Kayıt";
  }

  /** İstek tablosu «Kategori» sütunu: web formundaki grup başlığı (seçilemez üst başlık). */
  var REQUEST_GROUP_LABELS = {
    towel_extra: "Yastık, havlu, bornoz ve terlik",
    room_towel: "Yastık, havlu, bornoz ve terlik",
    bathrobe: "Yastık, havlu, bornoz ve terlik",
    slippers: "Yastık, havlu, bornoz ve terlik",
    towel: "Yastık, havlu, bornoz ve terlik",
    bedding_sheet: "Çarşaf ve battaniye",
    bedding_blanket: "Çarşaf ve battaniye",
    bedding: "Çarşaf ve battaniye",
    bedding_pillow: "Yastık, havlu, bornoz ve terlik",
    room_cleaning: "Oda hizmeti",
    turndown: "Oda hizmeti",
    minibar_refill: "Şişe su ve çay / kahve",
    bottled_water: "Şişe su ve çay / kahve",
    tea_coffee: "Şişe su ve çay / kahve",
    minibar: "Şişe su ve çay / kahve",
    toilet_paper: "Tuvalet kağıdı ve şampuan / sabun",
    toiletries: "Tuvalet kağıdı ve şampuan / sabun",
    climate_request: "Konfor ve klima",
    room_refresh: "Konfor ve klima",
    hanger: "Ekipman",
    kettle: "Ekipman",
    room_safe: "Ekipman",
    baby_bed: "Ekipman",
    baby_equipment: "Ekipman",
    room_equipment: "Ekipman",
    other: "Diğer",
  };

  var CATEGORY_LABELS = {
    request: {
      towel_extra: "Ek havlu",
      room_towel: "Ek oda havlusu",
      bathrobe: "Bornoz",
      bedding_sheet: "Çarşaf / nevresim",
      bedding_pillow: "Yastık",
      bedding_blanket: "Battaniye",
      turndown: "Yatak düzenleme",
      slippers: "Terlik",
      minibar_refill: "Minibar yenileme",
      bottled_water: "Şişe su",
      tea_coffee: "Çay / kahve",
      toilet_paper: "Tuvalet kağıdı",
      toiletries: "Şampuan / sabun",
      climate_request: "Klima ayarı",
      room_refresh: "Oda kokusu",
      hanger: "Askı",
      kettle: "Su ısıtıcı",
      room_safe: "Kasa",
      baby_bed: "Bebek yatağı",
      towel: "Havlu",
      extraTowels: "Havlu",
      extra_towels: "Havlu",
      towels: "Havlu",
      bedding: "Yastık / Nevresim",
      linen: "Yastık / Nevresim",
      room_cleaning: "Oda temizliği",
      roomCleaning: "Oda temizliği",
      room_cleaning_request: "Oda temizliği",
      minibar: "Minibar",
      minibarRefill: "Minibar",
      minibar_request: "Minibar",
      baby_equipment: "Bebek ekipmanı",
      babyNeeds: "Bebek ekipmanı",
      baby_equipment_request: "Bebek ekipmanı",
      room_equipment: "Oda ekipmanı",
      roomSupplies: "Oda ekipmanı",
      room_equipment_request: "Oda ekipmanı",
      other: "Diğer",
      otherRequest: "Diğer",
    },
    complaint: {
      room_cleaning: "Oda temizliği",
      noise: "Gürültü",
      climate: "Klima / sıcaklık",
      room_comfort: "Oda konforu",
      minibar: "Minibar",
      restaurant_service: "Restoran hizmeti",
      staff_behavior: "Personel davranışı",
      general_areas: "Genel alanlar",
      hygiene: "Hijyen",
      internet_tv: "İnternet / TV",
      lost_property: "Kayıp eşya",
      staff: "Personel davranışı",
      other: "Diğer",
    },
    guest_notification: {
      allergen_notice: "Alerjen bildirimi",
      gluten_sensitivity: "Gluten hassasiyeti",
      lactose_sensitivity: "Laktoz hassasiyeti",
      vegan_vegetarian: "Vegan / vejetaryen tercih",
      food_sensitivity_general: "Gıda hassasiyeti (genel)",
      chronic_condition: "Kronik rahatsızlık bildirimi",
      accessibility_special_needs: "Engelli / özel ihtiyaç",
      pregnancy: "Hamilelik durumu",
      medication_health_sensitivity: "İlaç / sağlık hassasiyeti",
      other_health: "Diğer sağlık bilgisi",
      birthday_celebration: "Doğum günü kutlama",
      honeymoon_anniversary: "Balayı / yıldönümü",
      surprise_organization: "Sürpriz organizasyon",
      room_decoration: "Odaya özel süsleme",
      other_celebration: "Diğer kutlama talebi",
    },
    fault: {
      hvac: "Klima / ısıtma",
      ac: "Klima / ısıtma",
      electric: "Elektrik",
      water_bathroom: "Su / banyo",
      tv_electronics: "TV / elektronik",
      door_lock: "Kapı / kilit",
      furniture_item: "Mobilya / eşya",
      cleaning_equipment_damage: "Temizlik ekipmanı hasarı",
      balcony_window: "Balkon / pencere",
      other: "Diğer",
    },
  };

  function categoryText(type, categories, singleCategory) {
    var arr = Array.isArray(categories) ? categories.slice() : [];
    if (!arr.length && singleCategory) arr = [singleCategory];
    if (!arr.length) return "-";
    var map = CATEGORY_LABELS[type] || {};
    return arr.map(function (id) { return map[id] || String(id); }).join(", ");
  }

  function requestValueMap() {
    return {
      bath_towel: "Banyo havlusu",
      hand_towel: "El havlusu",
      pillow: "Yastık",
      duvet_cover: "Nevresim",
      blanket: "Battaniye",
      general_cleaning: "Genel temizlik",
      towel_change: "Havlu değişimi",
      room_check: "Oda kontrolü",
      now: "Şimdi",
      later: "Daha sonra",
      refill: "Yenileme",
      missing_item_report: "Eksik ürün bildirimi",
      check_request: "Kontrol talebi",
      baby_bed: "Bebek yatağı",
      high_chair: "Mama sandalyesi",
      bathrobe: "Bornoz",
      slippers: "Terlik",
      hanger: "Askı",
      kettle: "Su ısıtıcısı",
      other: "Diğer",
    };
  }

  function requestDetailsAndCategory(row) {
    var raw = row && row.raw_payload && typeof row.raw_payload === "object" ? row.raw_payload : {};
    var details =
      row && row.details && typeof row.details === "object"
        ? row.details
        : raw.details && typeof raw.details === "object"
          ? raw.details
          : {};
    var cat = String((row && row.category) || raw.category || ((row && row.categories) || [])[0] || "").trim();
    return { details: details, category: cat, raw: raw };
  }

  function requestFormGroupLabel(row) {
    var ctx = requestDetailsAndCategory(row);
    var cat = ctx.category;
    if (!cat) return "-";
    return REQUEST_GROUP_LABELS[cat] || (CATEGORY_LABELS.request && CATEGORY_LABELS.request[cat]) || cat;
  }

  /** Seçilen talep satırı (tür) + varsa zamanlama; grup adı değil. */
  function requestFormTypeLabel(row) {
    if (!row || typeof row !== "object") return "-";
    var ctx = requestDetailsAndCategory(row);
    var details = ctx.details;
    var cat = ctx.category;
    var vm = requestValueMap();
    var catTitle = (CATEGORY_LABELS.request && CATEGORY_LABELS.request[cat]) || "";

    if (cat === "room_cleaning" && details.requestType) {
      var leg = [];
      leg.push(vm[String(details.requestType)] || String(details.requestType));
      if (details.timing) leg.push(vm[String(details.timing)] || String(details.timing));
      return leg.join(" · ");
    }
    if (
      catTitle &&
      cat !== "towel" &&
      cat !== "bedding" &&
      cat !== "minibar" &&
      cat !== "baby_equipment" &&
      cat !== "room_equipment"
    ) {
      if (details.timing) return catTitle + " · " + (vm[String(details.timing)] || String(details.timing));
      return catTitle;
    }

    if (cat === "towel") {
      if (details.itemType) return vm[String(details.itemType)] || String(details.itemType);
      return "-";
    }
    if (cat === "bedding") {
      if (details.itemType) return vm[String(details.itemType)] || String(details.itemType);
      return "-";
    }
    if (cat === "baby_equipment" || cat === "room_equipment") {
      if (details.itemType) return vm[String(details.itemType)] || String(details.itemType);
      return "-";
    }
    if (cat === "minibar") {
      if (details.requestType) return vm[String(details.requestType)] || String(details.requestType);
      return "-";
    }
    if (cat === "other") {
      return (CATEGORY_LABELS.request && CATEGORY_LABELS.request.other) || "Diğer";
    }

    if (details.itemType) return vm[String(details.itemType)] || String(details.itemType);
    if (details.requestType) return vm[String(details.requestType)] || String(details.requestType);
    if (details.timing) return vm[String(details.timing)] || String(details.timing);
    return "-";
  }

  /** Adet yalnızca ilgili türlerde; yoksa «-» (WhatsApp ile aynı). */
  function requestFormQuantityDisplay(row) {
    if (!row || typeof row !== "object") return "-";
    var ctx = requestDetailsAndCategory(row);
    var details = ctx.details;
    var cat = ctx.category;
    var withQty =
      cat === "towel_extra" ||
      cat === "room_towel" ||
      cat === "bathrobe" ||
      cat === "bedding_sheet" ||
      cat === "bedding_pillow" ||
      cat === "bedding_blanket" ||
      cat === "slippers" ||
      cat === "hanger" ||
      cat === "baby_bed" ||
      cat === "toilet_paper" ||
      cat === "toiletries" ||
      cat === "towel" ||
      cat === "bedding" ||
      cat === "baby_equipment" ||
      cat === "room_equipment";
    if (!withQty) return "-";
    var q = details.quantity;
    if (q == null || String(q).trim() === "") return "-";
    return String(q);
  }

  /** Formdaki misafir açıklaması (tam metin). */
  function requestFormDescription(row) {
    var t = String(row && row.description ? row.description : "").replace(/\s+/g, " ").trim();
    return t ? t : "—";
  }

  /** ISO submitted_at → gg/aa/yyyy ss:dd (Europe/Istanbul; Kayıt tarihi süzgeci data-cal-date ile aynı gün). */
  function formatSubmittedAtTr(iso) {
    var s = String(iso || "");
    if (!s) return "—";
    var d = new Date(s);
    if (Number.isNaN(d.getTime())) {
      var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) {
        return m[3] + "/" + m[2] + "/" + m[1] + (s.length > 10 ? " " + s.slice(11, 16).replace("T", " ") : "");
      }
      return s.length >= 16 ? s.slice(0, 16).replace("T", " ") : s;
    }
    var cal = submittedAtCalendarIso(s);
    if (!cal || cal.length < 10) return "—";
    var dateTr = formatIsoDateDisplayTr(cal);
    var hm = "";
    try {
      hm = new Intl.DateTimeFormat("en-GB", {
        timeZone: ADMIN_HOTEL_TZ,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        hourCycle: "h23",
      })
        .format(d)
        .trim()
        .replace(/\u202f|\u00a0/g, " ");
    } catch (_e) {
      hm = "";
    }
    if (!hm) {
      hm =
        String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    }
    return dateTr + " " + hm;
  }

  /** submitted_at → gg/aa ss:dd (kısa; Europe/Istanbul). */
  function formatSubmittedAtShortTr(iso) {
    var s = String(iso || "");
    if (!s) return "—";
    var d = new Date(s);
    if (Number.isNaN(d.getTime())) {
      var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) {
        var tail = s.length > 10 ? String(s.slice(11, 16)).replace("T", " ").trim() : "";
        return m[3] + "/" + m[2] + (tail ? " " + tail : "");
      }
      return s.length >= 16 ? s.slice(8, 10) + "/" + s.slice(5, 7) + " " + s.slice(11, 16) : "—";
    }
    var cal = submittedAtCalendarIso(s);
    if (!cal || cal.length < 10) return "—";
    var p = cal.split("-");
    var ddmm = p[2] + "/" + p[1];
    var hm = "";
    try {
      hm = new Intl.DateTimeFormat("en-GB", {
        timeZone: ADMIN_HOTEL_TZ,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        hourCycle: "h23",
      })
        .format(d)
        .trim()
        .replace(/\u202f|\u00a0/g, " ");
    } catch (_e) {
      hm = "";
    }
    if (!hm) {
      hm =
        String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    }
    return ddmm + " " + hm;
  }

  /** submitted_at → otel takvim günü YYYY-MM-DD (liste tarih süzgeci; Europe/Istanbul). */
  function submittedAtCalendarIso(iso) {
    var s = String(iso || "");
    if (!s) return "";
    var d = new Date(s);
    if (Number.isNaN(d.getTime())) return "";
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: ADMIN_HOTEL_TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d);
    } catch (_e) {
      var y = d.getFullYear();
      var m = String(d.getMonth() + 1).padStart(2, "0");
      var day = String(d.getDate()).padStart(2, "0");
      return y + "-" + m + "-" + day;
    }
  }

  /** Tablo satırı: submitted_at boşsa created_at (süzgeç ve sütun uyumu). */
  function bucketRowRecordTimestamp(r) {
    var row = r || {};
    var s = row.submitted_at;
    if (s != null && String(s).trim()) return s;
    return row.created_at != null ? row.created_at : "";
  }

  var REQ_STAFF_NOTE_KEY = "viona_admin_request_staff_notes_v1";

  function loadRequestStaffNotes() {
    try {
      var raw = localStorage.getItem(REQ_STAFF_NOTE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_e) {
      return {};
    }
  }

  function setRequestStaffNote(id, text) {
    var all = loadRequestStaffNotes();
    all[String(id)] = String(text || "");
    try {
      localStorage.setItem(REQ_STAFF_NOTE_KEY, JSON.stringify(all));
    } catch (_e) {}
  }

  function getRequestStaffNote(id) {
    return String(loadRequestStaffNotes()[String(id)] || "");
  }

  var COMPLAINT_STAFF_NOTE_KEY = "viona_admin_complaint_staff_notes_v1";

  function loadComplaintStaffNotes() {
    try {
      var raw = localStorage.getItem(COMPLAINT_STAFF_NOTE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_e) {
      return {};
    }
  }

  function setComplaintStaffNote(id, text) {
    var all = loadComplaintStaffNotes();
    all[String(id)] = String(text || "");
    try {
      localStorage.setItem(COMPLAINT_STAFF_NOTE_KEY, JSON.stringify(all));
    } catch (_e) {}
  }

  function getComplaintStaffNote(id) {
    return String(loadComplaintStaffNotes()[String(id)] || "");
  }

  var GUEST_NOTIF_STAFF_NOTE_KEY = "viona_admin_guest_notif_staff_notes_v1";

  function loadGuestNotifStaffNotes() {
    try {
      var raw = localStorage.getItem(GUEST_NOTIF_STAFF_NOTE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_e) {
      return {};
    }
  }

  function setGuestNotifStaffNote(id, text) {
    var all = loadGuestNotifStaffNotes();
    all[String(id)] = String(text || "");
    try {
      localStorage.setItem(GUEST_NOTIF_STAFF_NOTE_KEY, JSON.stringify(all));
    } catch (_e) {}
  }

  function getGuestNotifStaffNote(id) {
    return String(loadGuestNotifStaffNotes()[String(id)] || "");
  }

  var LATE_CO_STAFF_NOTE_KEY = "viona_admin_late_checkout_staff_notes_v1";

  function loadLateCheckoutStaffNotes() {
    try {
      var raw = localStorage.getItem(LATE_CO_STAFF_NOTE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_e) {
      return {};
    }
  }

  function setLateCheckoutStaffNote(id, text) {
    var all = loadLateCheckoutStaffNotes();
    all[String(id)] = String(text || "");
    try {
      localStorage.setItem(LATE_CO_STAFF_NOTE_KEY, JSON.stringify(all));
    } catch (_e) {}
  }

  function getLateCheckoutStaffNote(id) {
    return String(loadLateCheckoutStaffNotes()[String(id)] || "");
  }

  var FAULT_STAFF_NOTE_KEY = "viona_admin_fault_staff_notes_v1";

  function loadFaultStaffNotes() {
    try {
      var raw = localStorage.getItem(FAULT_STAFF_NOTE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_e) {
      return {};
    }
  }

  function setFaultStaffNote(id, text) {
    var all = loadFaultStaffNotes();
    all[String(id)] = String(text || "");
    try {
      localStorage.setItem(FAULT_STAFF_NOTE_KEY, JSON.stringify(all));
    } catch (_e) {}
  }

  function getFaultStaffNote(id) {
    return String(loadFaultStaffNotes()[String(id)] || "");
  }

  /** Satır + raw_payload.details birleşimi (eski / yedek kolon setleri). */
  function faultMergedDetails(row) {
    var raw = row && row.raw_payload && typeof row.raw_payload === "object" ? row.raw_payload : {};
    var dRaw = raw.details && typeof raw.details === "object" ? raw.details : {};
    var dRow = row && row.details && typeof row.details === "object" ? row.details : {};
    var out = {};
    Object.keys(dRaw).forEach(function (k) {
      out[k] = dRaw[k];
    });
    Object.keys(dRow).forEach(function (k) {
      out[k] = dRow[k];
    });
    return out;
  }

  /** Kategori: kolonlar boşsa raw_payload’tan. */
  function faultEffectiveCategories(row) {
    if (!row || typeof row !== "object") return [];
    if (Array.isArray(row.categories) && row.categories.length) {
      return row.categories
        .map(function (x) {
          return String(x || "").trim();
        })
        .filter(Boolean);
    }
    var c = String(row.category || "").trim();
    if (c) return [c];
    var raw = row.raw_payload && typeof row.raw_payload === "object" ? row.raw_payload : {};
    if (Array.isArray(raw.categories) && raw.categories.length) {
      return raw.categories
        .map(function (x) {
          return String(x || "").trim();
        })
        .filter(Boolean);
    }
    var rc = String(raw.category || "").trim();
    return rc ? [rc] : [];
  }

  function faultRawLocation(row) {
    var raw = row && row.raw_payload && typeof row.raw_payload === "object" ? row.raw_payload : {};
    var details = faultMergedDetails(row);
    return String(row.location || raw.location || details.location || "").trim();
  }

  function faultRawUrgency(row) {
    var raw = row && row.raw_payload && typeof row.raw_payload === "object" ? row.raw_payload : {};
    var details = faultMergedDetails(row);
    return String(row.urgency || raw.urgency || details.urgency || "").trim();
  }

  function faultLocationLabel(row) {
    var loc = faultRawLocation(row);
    var locMap = {
      room_inside: "Oda içi",
      bathroom: "Banyo",
      balcony: "Balkon",
      other: "Diğer",
    };
    return loc ? locMap[loc] || loc : "—";
  }

  function faultUrgencyLabel(row) {
    var urg = faultRawUrgency(row);
    var urgMap = {
      normal: "Normal",
      urgent: "Acil",
    };
    return urg ? urgMap[urg] || urg : "—";
  }

  /** Arıza formu: açıklama; kolon boşsa details / raw_payload yedeği. */
  function faultFormDescription(row) {
    if (!row || typeof row !== "object") return "—";
    var raw = row.raw_payload && typeof row.raw_payload === "object" ? row.raw_payload : {};
    var details = faultMergedDetails(row);
    var t = String(row.description || "").replace(/\s+/g, " ").trim();
    if (t) return t;
    t = String(raw.description || details.description || "").replace(/\s+/g, " ").trim();
    if (t) return t;
    var o = String(
      row.other_category_note || raw.otherCategoryNote || raw.other_category_note || "",
    )
      .replace(/\s+/g, " ")
      .trim();
    return o ? o : "—";
  }

  /** Misafir adı: kolon boşsa raw_payload.name / guest_name (yedek veya eski kayıt). */
  function operationGuestName(row) {
    if (!row || typeof row !== "object") return "";
    var g = String(row.guest_name || "").replace(/\s+/g, " ").trim();
    if (g) return g;
    var raw = row.raw_payload && typeof row.raw_payload === "object" ? row.raw_payload : {};
    return String(raw.name || raw.guest_name || "").replace(/\s+/g, " ").trim();
  }

  /** Şikâyet formu: açıklama alanı; bazı kategorilerde zorunlu, diğer not alanı yedek. */
  function complaintFormDescription(row) {
    var t = String(row && row.description ? row.description : "").replace(/\s+/g, " ").trim();
    if (t) return t;
    var o = String(row && row.other_category_note ? row.other_category_note : "").replace(/\s+/g, " ").trim();
    return o ? o : "—";
  }

  function issueDetailText(row, type) {
    if (!row || typeof row !== "object") return "-";
    if (type === "request") {
      var outReq = [];
      outReq.push("Talep grubu: " + requestFormGroupLabel(row));
      outReq.push("Talep türü: " + requestFormTypeLabel(row));
      outReq.push("Adet: " + requestFormQuantityDisplay(row));
      if (row.description) outReq.push("Not: " + String(row.description));
      return outReq.join(" | ");
    }
    if (type === "complaint") {
      var outCompl = [];
      outCompl.push("Kategori: " + categoryText("complaint", row.categories, row.category));
      var descCompl = complaintFormDescription(row);
      if (descCompl !== "—") outCompl.push("Açıklama: " + descCompl);
      return outCompl.join(" | ");
    }
    if (type === "guest_notification") {
      var outGn = [];
      outGn.push("Konu: " + categoryText("guest_notification", row.categories, row.category));
      var descGn = complaintFormDescription(row);
      if (descGn !== "—") outGn.push("Açıklama: " + descGn);
      return outGn.join(" | ");
    }
    if (type === "fault") {
      var outFault = [];
      var fce = faultEffectiveCategories(row);
      var fse = String(row.category || "").trim() || (fce.length ? fce[0] : "");
      var rawE = row.raw_payload && typeof row.raw_payload === "object" ? row.raw_payload : {};
      if (!fse) fse = String(rawE.category || "").trim();
      outFault.push("Kategori: " + categoryText("fault", fce, fse || null));
      var locL = faultLocationLabel(row);
      if (locL !== "—") outFault.push("Lokasyon: " + locL);
      var urgL = faultUrgencyLabel(row);
      if (urgL !== "—") outFault.push("Aciliyet: " + urgL);
      var descFault = faultFormDescription(row);
      if (descFault !== "—") outFault.push("Açıklama: " + descFault);
      return outFault.join(" | ");
    }
    var out = [];
    out.push("Seçim: " + categoryText(type, row.categories, row.category));
    if (row.other_category_note) out.push("Diğer notu: " + String(row.other_category_note));
    if (row.description) out.push("Açıklama: " + String(row.description));
    return out.join(" | ");
  }

  /** API bazen JSON string döndürür; kod/id ile label farklı kaynaklarda olabilir. */
  function reservationDataObject(row) {
    if (!row || row.reservation_data == null) return {};
    var rd = row.reservation_data;
    if (typeof rd === "object" && rd !== null) return rd;
    if (typeof rd === "string") {
      try {
        var p = JSON.parse(rd);
        if (p && typeof p === "object") return p;
      } catch (_e) {}
    }
    return {};
  }

  function reservationTypeLabel(row) {
    var t = String((row && row.reservation_type) || "").toLowerCase();
    var data = reservationDataObject(row);
    var code = String((row && row.service_code) || data.serviceCode || data.restaurantCode || "");
    var label = String((row && row.service_label) || data.serviceLabel || "");
    if (label) return label;
    if (t === "reservation_spa" && code === "massage") return "Masaj";
    if (t === "reservation_spa" && code === "peeling") return "Peeling";
    if (t === "reservation_spa" && code === "skin_care") return "Cilt bakımı";
    if (t === "reservation_spa" && code === "other_care") return "Diğer bakım hizmetleri";
    if (t === "reservation_alacarte" && code === "la_terrace") return "La Terrace A La Carte";
    if (t === "reservation_alacarte" && code === "sinton_bbq") return "Sinton BBQ Restaurant";
    var rid = String(data.restaurantId || "");
    if (t === "reservation_alacarte" && rid === "laTerrace") return "La Terrace A La Carte";
    if (t === "reservation_alacarte" && rid === "sinton") return "Sinton BBQ Restaurant";
    if (t === "reservation_alacarte") return "A la carte";
    if (t === "reservation_spa") return "Spa & wellness";
    return "Kayıt";
  }

  function reservationDetailText(row) {
    if (!row || typeof row !== "object") return "-";
    var data = reservationDataObject(row);
    var out = [];
    if (row.service_label) out.push("Hizmet: " + String(row.service_label));
    else if (data.spaServiceId) out.push("Spa hizmeti: " + String(data.spaServiceId));
    if (data.restaurantId) out.push("Restoran: " + reservationSubtabLabel(String(data.restaurantId)));
    if (data.stayCheckIn) out.push("Giriş: " + String(data.stayCheckIn));
    if (data.stayCheckOut) out.push("Çıkış: " + String(data.stayCheckOut));
    if (row.note) out.push("Özel not: " + String(row.note));
    return out.length ? out.join(" | ") : "-";
  }

  function reservationGuestCountValue(row) {
    var data = reservationDataObject(row);
    var raw = row && row.raw_payload && typeof row.raw_payload === "object" ? row.raw_payload : {};
    var c = Number(row.guest_count || data.guestCount || raw.guestCount || 0);
    return Number.isFinite(c) && c > 0 ? c : "-";
  }

  function reservationServiceKey(row) {
    var t = String((row && row.reservation_type) || "").toLowerCase();
    if (t === "reservation_alacarte") return "alacarte";
    if (t === "reservation_spa") return "spa";
    return "other";
  }

  function reservationStatusLabel(status) {
    var s = reservationNormalizeStatusKey(status);
    if (s === "cancelled") return "İptal";
    if (reservationIsWaitStatus(s)) return "Beklemede";
    if (s === "done") return "Onaylandı";
    if (s === "rejected") return "Onaylanmadı";
    return String(status || "new");
  }

  function reservationDateValue(row) {
    var data = reservationDataObject(row);
    var raw = row && row.raw_payload && typeof row.raw_payload === "object" ? row.raw_payload : {};
    var res = raw.reservation && typeof raw.reservation === "object" ? raw.reservation : {};
    var top = String(row.reservation_date || "").trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(top)) return top;
    var fromData = String(data.reservationDate || data.date || "").trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(fromData)) return fromData;
    var fromRaw = String(res.reservationDate || res.date || "").trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(fromRaw)) return fromRaw;
    return String(row.submitted_at || "").slice(0, 10);
  }

  function reservationTimeValue(row) {
    var data = reservationDataObject(row);
    return String(row.reservation_time || data.time || "").trim();
  }

  function reservationActionButtons(type, row, rowId) {
    var id = rowId != null ? rowId : row && row.id;
    var st = reservationNormalizeStatusKey(row && row.status);
    var h = "";
    function stBtn(status, label) {
      return (
        '<button type="button" class="btn-small js-status" data-id="' +
        esc(id) +
        '" data-type="' +
        esc(type) +
        '" data-status="' +
        esc(status) +
        '">' +
        esc(label) +
        "</button>"
      );
    }
    if (reservationIsWaitStatus(st)) {
      h += stBtn("done", "Onaylandı");
      h += stBtn("rejected", "Onaylanmadı");
    } else if (st === "done") {
      h += stBtn("new", "Beklemede");
      h += stBtn("rejected", "Onaylanmadı");
    } else if (st === "rejected") {
      h += stBtn("new", "Beklemede");
      h += stBtn("done", "Onaylandı");
    } else if (st === "cancelled") {
      h += stBtn("new", "Beklemede");
    }
    h += '<button type="button" class="btn-small js-delete" data-id="' + esc(id) + '" data-type="' + esc(type) + '">Sil</button>';
    return h;
  }

  function reservationTabOptions() {
    return [
      { key: "overview", label: "Günlük takip (tümü)" },
      { key: "laTerrace", label: "La Terrace A La Carte" },
      { key: "sinton", label: "Sinton BBQ Restaurant" },
      { key: "spa", label: "Spa & wellness" },
    ];
  }

  /**
   * Tek kaynak: önce service_label (ekrandaki metinle aynı öncelik), sonra kod/id.
   * Böylece yanlış service_code olsa bile La Terrace / Mare ayrımı bozulmaz.
   */
  function reservationVenueKeyFromRow(row) {
    var t = String((row && row.reservation_type) || "").toLowerCase();
    if (t === "reservation_spa") return "spa";
    if (t !== "reservation_alacarte") return null;
    var data = reservationDataObject(row);
    var lblLc = String((row && row.service_label) || data.serviceLabel || "")
      .trim()
      .toLowerCase();
    if (lblLc.indexOf("la terrace") >= 0) return "laTerrace";
    if (lblLc.indexOf("sinton") >= 0) return "sinton";
    var rid = String(data.restaurantId || "");
    var code = String((row && row.service_code) || data.restaurantCode || data.serviceCode || "");
    var codeLc = code.trim().toLowerCase();
    if (rid === "laTerrace" || codeLc === "la_terrace" || codeLc === "laterrace" || codeLc === "la-terrace") {
      return "laTerrace";
    }
    if (rid === "sinton" || codeLc === "sinton_bbq" || codeLc === "sinton-bbq" || codeLc === "sintonbbq") {
      return "sinton";
    }
    return null;
  }

  function reservationServiceMatches(row, tabKey) {
    var t = String((row && row.reservation_type) || "").toLowerCase();
    if (tabKey === "overview") {
      return t === "reservation_alacarte" || t === "reservation_spa";
    }
    if (tabKey === "spa") return t === "reservation_spa";
    if (t !== "reservation_alacarte") return false;
    return reservationVenueKeyFromRow(row) === tabKey;
  }

  function reservationSubtabLabel(tabKey) {
    var all = reservationTabOptions();
    for (var i = 0; i < all.length; i++) {
      if (all[i].key === tabKey) return all[i].label;
    }
    return "Genel";
  }

  function dayLabel(dateKey) {
    if (!dateKey || dateKey === "Tarihsiz") return "Tarihsiz";
    var d = new Date(dateKey + "T00:00:00");
    if (isNaN(d.getTime())) return String(dateKey);
    return formatIsoDateDisplayTr(String(dateKey).slice(0, 10));
  }

  function toTrDateForInput(dateKey) {
    if (!dateKey) return "";
    var d = new Date(dateKey + "T00:00:00");
    if (isNaN(d.getTime())) return "";
    return formatIsoDateDisplayTr(String(dateKey).slice(0, 10)) || "";
  }

  function toIsoFromTrDate(tr) {
    var raw = String(tr || "").trim();
    var m = raw.match(/^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/);
    if (!m) return "";
    var dd = m[1];
    var mm = m[2];
    var yyyy = m[3].length === 2 ? ("20" + m[3]) : m[3];
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

  /** YYYY-MM-DD → gg/aa/yyyy (takip ekranı) */
  function formatIsoDateDisplayTr(iso) {
    var s = String(iso || "").slice(0, 10);
    if (s.length < 10) return "—";
    var p = s.split("-");
    if (p.length !== 3) return "—";
    return p[2] + "/" + p[1] + "/" + p[0];
  }

  /** YYYY-MM-DD → gg/aa (şerit etiketi) */
  function formatIsoDateShortDisplay(iso) {
    var s = String(iso || "").slice(0, 10);
    if (s.length < 10) return "—";
    var p = s.split("-");
    if (p.length !== 3) return "—";
    return p[2] + "/" + p[1];
  }

  function syncReservationDateComboNativeDisplay(nativeEl, displayEl) {
    if (!displayEl) return;
    var v = String((nativeEl && nativeEl.value) || "").slice(0, 10);
    displayEl.textContent = v.length === 10 ? formatIsoDateDisplayTr(v) : "gg/aa/yyyy";
  }

  function syncBucketFilterDateDisplay(nativeEl, displayEl) {
    if (!displayEl) return;
    var v = String((nativeEl && nativeEl.value) || "").slice(0, 10);
    displayEl.textContent = v.length === 10 ? formatIsoDateDisplayTr(v) : "Tümü";
  }

  /**
   * Operasyon sekmeleri: liste araç çubuğundaki «Kayıt tarihi» seçilince üst şerit/API ile aynı güne geçilir.
   * Aksi halde yalnızca client-side süzülür (ör. değerlendirmeler sekmesi).
   */
  function wireBucketToolbarDateControls(dateNat, dateDisp, dateClear, handlers, applyFilters) {
    var h = handlers || {};
    if (dateNat && h.toolbarCalendarSeedYmd && /^\d{4}-\d{2}-\d{2}$/.test(String(h.toolbarCalendarSeedYmd))) {
      dateNat.value = String(h.toolbarCalendarSeedYmd).slice(0, 10);
      syncBucketFilterDateDisplay(dateNat, dateDisp);
    }
    if (dateNat) {
      dateNat.addEventListener("change", function () {
        syncBucketFilterDateDisplay(dateNat, dateDisp);
        var v = String(dateNat.value || "").slice(0, 10);
        if (typeof h.onToolbarCalendarDayChange === "function" && v.length === 10) {
          h.onToolbarCalendarDayChange(v);
          return;
        }
        applyFilters();
      });
      dateNat.addEventListener("input", function () {
        syncBucketFilterDateDisplay(dateNat, dateDisp);
        if (typeof h.onToolbarCalendarDayChange === "function") return;
        applyFilters();
      });
    }
    if (dateClear) {
      dateClear.addEventListener("click", function () {
        if (dateNat) dateNat.value = "";
        syncBucketFilterDateDisplay(dateNat, dateDisp);
        applyFilters();
      });
    }
  }

  /** API / DB farklı yazımları için; özet kartlarında tutarlı sayım. */
  function reservationNormalizeStatusKey(st) {
    var s = String(st == null ? "new" : st)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
    if (s === "inprogress") return "in_progress";
    if (s === "approved" || s === "confirmed") return "in_progress";
    if (s === "denied" || s === "declined" || s === "onaylanmadi" || s === "onaylanmadı" || s === "not_approved") {
      return "rejected";
    }
    if (
      s === "completed" ||
      s === "fulfilled" ||
      s === "tamamlandi" ||
      s === "tamamlandı" ||
      s === "yapildi" ||
      s === "yapıldı" ||
      s === "onaylandi" ||
      s === "onaylandı"
    ) {
      return "done";
    }
    if (!s) return "new";
    return s;
  }

  function reservationIsWaitStatus(st) {
    var s = reservationNormalizeStatusKey(st);
    return s === "new" || s === "pending" || s === "in_progress";
  }

  function reservationTimeHHMM(t) {
    var s = String(t || "").trim();
    if (!s) return "";
    var m = s.match(/^(\d{1,2}):(\d{2})/);
    if (!m) return s.slice(0, 5);
    return String(Number(m[1])).padStart(2, "0") + ":" + m[2];
  }

  function manualSlotIsTaken(rows, activeTab, iso, slotHHMM) {
    var target = reservationTimeHHMM(slotHHMM);
    if (!target) return false;
    return rows.some(function (r) {
      if (!reservationServiceMatches(r, activeTab)) return false;
      if (reservationDateValue(r) !== iso) return false;
      if (reservationTimeHHMM(reservationTimeValue(r)) !== target) return false;
      var s = reservationNormalizeStatusKey(r.status);
      return s === "done";
    });
  }

  function manualTimeOptionsHtml(activeTab, rows, iso) {
    var slots = [];
    if (activeTab === "spa") {
      var cfg = typeof window !== "undefined" && window.REQUESTS_CONFIG ? window.REQUESTS_CONFIG : null;
      slots = cfg && Array.isArray(cfg.spaTimeSlots) ? cfg.spaTimeSlots.slice() : [];
    } else {
      var g = typeof window !== "undefined" ? window.getTimeSlotsForRestaurant : null;
      slots = typeof g === "function" ? g(activeTab) : [];
    }
    if (!slots.length) {
      return '<option value="">(Saat listesi yüklenemedi)</option>';
    }
    var out = '<option value="">Saat seçin</option>';
    slots.forEach(function (slot) {
      var t = reservationTimeHHMM(slot);
      if (!t) return;
      if (manualSlotIsTaken(rows, activeTab, iso, t)) return;
      out += '<option value="' + esc(t) + '">' + esc(t) + "</option>";
    });
    return out;
  }

  function adminNationalitySelectHtml() {
    var opts = [
      ["TR", "Türkiye"],
      ["DE", "Almanya"],
      ["RU", "Rusya"],
      ["GB", "Birleşik Krallık"],
      ["NL", "Hollanda"],
      ["PL", "Polonya"],
      ["UA", "Ukrayna"],
      ["RO", "Romanya"],
      ["FR", "Fransa"],
      ["IT", "İtalya"],
      ["ES", "İspanya"],
      ["AT", "Avusturya"],
      ["CH", "İsviçre"],
      ["BE", "Belçika"],
      ["SE", "İsveç"],
      ["NO", "Norveç"],
      ["DK", "Danimarka"],
      ["FI", "Finlandiya"],
      ["CZ", "Çekya"],
      ["GR", "Yunanistan"],
      ["PT", "Portekiz"],
      ["IE", "İrlanda"],
      ["US", "ABD"],
      ["CA", "Kanada"],
      ["AZ", "Azerbaycan"],
      ["KZ", "Kazakistan"],
      ["UZ", "Özbekistan"],
      ["BG", "Bulgaristan"],
      ["RS", "Sırbistan"],
      ["HR", "Hırvatistan"],
      ["BA", "Bosna Hersek"],
      ["MK", "Kuzey Makedonya"],
      ["AL", "Arnavutluk"],
      ["GE", "Gürcistan"],
      ["AM", "Ermenistan"],
      ["IR", "İran"],
      ["IQ", "Irak"],
      ["SY", "Suriye"],
      ["EG", "Mısır"],
      ["SA", "Suudi Arabistan"],
      ["AE", "BAE"],
      ["IL", "İsrail"],
      ["JO", "Ürdün"],
      ["LB", "Lübnan"],
      ["CN", "Çin"],
      ["JP", "Japonya"],
      ["KR", "Güney Kore"],
      ["IN", "Hindistan"],
      ["AU", "Avustralya"],
      ["BR", "Brezilya"],
      ["AR", "Arjantin"],
      ["MX", "Meksika"],
      ["OTHER", "Diğer"],
    ];
    var out =
      '<label class="reservation-manual-nationality-label">Uyruk <select name="nationality" class="reservation-manual-nationality" required>';
    opts.forEach(function (p) {
      var sel = p[0] === "TR" ? ' selected="selected"' : "";
      out += '<option value="' + esc(p[0]) + '"' + sel + ">" + esc(p[1]) + " (" + esc(p[0]) + ")</option>";
    });
    out += "</select></label>";
    return out;
  }

  function pdfLatinize(s) {
    return String(s == null ? "" : s)
      .replace(/ğ/g, "g")
      .replace(/Ğ/g, "G")
      .replace(/ü/g, "u")
      .replace(/Ü/g, "U")
      .replace(/ş/g, "s")
      .replace(/Ş/g, "S")
      .replace(/ı/g, "i")
      .replace(/İ/g, "I")
      .replace(/ö/g, "o")
      .replace(/Ö/g, "O")
      .replace(/ç/g, "c")
      .replace(/Ç/g, "C");
  }

  /** PDF icin ASCII durum etiketi (Helvetica uyumlu). */
  function reservationStatusLabelPdf(row) {
    var s = reservationNormalizeStatusKey(row && row.status);
    if (s === "cancelled") return "Iptal";
    if (reservationIsWaitStatus(s)) return "Beklemede";
    if (s === "done") return "Onaylandi";
    if (s === "rejected") return "Onaylanmadi";
    return pdfLatinize(String((row && row.status) || "Beklemede"));
  }

  /** PDF tablosu: mekan/hizmet tek satirda, kirilma minimum (mutfak ciktisi). */
  function reservationTypeLabelPdf(row) {
    var t = String((row && row.reservation_type) || "").toLowerCase();
    if (t === "reservation_spa") {
      return pdfLatinize(reservationTypeLabel(row) || "Spa & wellness");
    }
    if (t === "reservation_alacarte") {
      var vk = reservationVenueKeyFromRow(row);
      if (vk === "laTerrace") return "La Terrace A La Carte";
      if (vk === "sinton") return "Sinton BBQ Restaurant";
    }
    return pdfLatinize(reservationTypeLabel(row) || "-");
  }

  function pdfReportFilenamePart(ovFilterKey) {
    var map = {
      all: "Tum-Mekanlar",
      laTerrace: "La-Terrace-A-La-Carte",
      sinton: "Sinton-BBQ-Restaurant",
      spa: "Spa-Wellness",
    };
    return map[String(ovFilterKey || "all")] || "Genel";
  }

  function reservationVenueCountsForDate(iso, venueKey, rows) {
    var list = reservationOverviewListFor(iso, venueKey, rows);
    return reservationStatusOverviewCounts(list);
  }

  function downloadReservationOverviewPdf(iso, list, fkLabel, guestSum, ovFilterKey) {
    var JSPDF = window.jspdf && window.jspdf.jsPDF;
    if (!JSPDF) {
      alert("PDF kütüphanesi yüklenemedi. Sayfayı yenileyin.");
      return;
    }
    var doc = new JSPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    var M = 40;
    var pageW = doc.internal.pageSize.getWidth();
    var pageH = doc.internal.pageSize.getHeight();
    var contentW = pageW - M * 2;
    var cnt = reservationStatusOverviewCounts(list);
    var mekanAdi = ovFilterKey === "all" ? "Tum mekanlar" : String(fkLabel || "");

    var y = 34;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.setTextColor(28, 58, 98);
    doc.text(pdfLatinize("Gunluk restoran spa talep raporu"), M, y);
    y += 20;
    doc.setDrawColor(46, 120, 170);
    doc.setLineWidth(0.9);
    doc.line(M, y, pageW - M, y);
    y += 16;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(72, 88, 108);
    doc.text(pdfLatinize("Mutfak ve operasyon icin yazdirilabilir gunluk liste"), M, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(35, 40, 45);
    var blok = [
      pdfLatinize(
        "Tarih (tablo): " +
          formatIsoDateDisplayTr(iso) +
          "   |   Cikti mekani: " +
          mekanAdi
      ),
      pdfLatinize(
        "Ozet: " +
          String(list.length) +
          " kayit, toplam " +
          String(guestSum) +
          " kisi  |  Beklemede: " +
          String(cnt.wait) +
          "  |  Onaylandi: " +
          String(cnt.approved) +
          "  |  Onaylanmadi: " +
          String(cnt.rejected) +
          (cnt.cancelled ? "  |  Iptal: " + String(cnt.cancelled) : "")
      ),
      pdfLatinize(
        "Aciklama: Satirlar secilen hizmet gunune goredir. Talep zamani sutunu, talebin sisteme dususunu gosterir (yerel saat, gg/aa ss:dd)."
      ),
    ];
    doc.setFontSize(9.5);
    blok.forEach(function (par) {
      doc.splitTextToSize(par, contentW).forEach(function (ln) {
        doc.text(ln, M, y);
        y += 12;
      });
      y += 5;
    });
    y += 4;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    var head = [
      [
        pdfLatinize("Saat"),
        pdfLatinize("Mekan / hizmet"),
        pdfLatinize("Misafir"),
        pdfLatinize("Oda"),
        pdfLatinize("Uyruk"),
        pdfLatinize("Kisi"),
        pdfLatinize("Talep zamani"),
        pdfLatinize("Durum"),
        pdfLatinize("Not"),
      ],
    ];
    var body = list.map(function (r) {
      return [
        pdfLatinize(reservationTimeValue(r) || "-"),
        reservationTypeLabelPdf(r),
        pdfLatinize(r.guest_name || ""),
        pdfLatinize(r.room_number || ""),
        pdfLatinize(r.nationality || ""),
        pdfLatinize(String(reservationGuestCountValue(r))),
        pdfLatinize(formatSubmittedAtShortTr(r.submitted_at)),
        reservationStatusLabelPdf(r),
        pdfLatinize(String(r.note || "").trim()).slice(0, 220),
      ];
    });
    try {
      if (typeof doc.autoTable === "function") {
        doc.autoTable({
          startY: y,
          head: head,
          body: body,
          theme: "striped",
          showHead: "everyPage",
          styles: {
            font: "helvetica",
            fontSize: 9,
            cellPadding: { top: 5, bottom: 5, left: 5, right: 5 },
            overflow: "linebreak",
            valign: "middle",
            minCellHeight: 12,
            textColor: [35, 40, 45],
          },
          headStyles: {
            fillColor: [36, 112, 163],
            textColor: 255,
            fontStyle: "bold",
            fontSize: 9,
            halign: "center",
            valign: "middle",
          },
          alternateRowStyles: { fillColor: [248, 251, 254] },
          columnStyles: {
            0: { cellWidth: 36, halign: "center" },
            1: { cellWidth: 112 },
            2: { cellWidth: 76 },
            3: { cellWidth: 34, halign: "center" },
            4: { cellWidth: 30, halign: "center" },
            5: { cellWidth: 28, halign: "center" },
            6: { cellWidth: 64, halign: "center", fontSize: 8 },
            7: { cellWidth: 58, halign: "center", fontStyle: "bold" },
            8: { cellWidth: "auto" },
          },
          margin: { left: M, right: M },
          tableLineColor: [200, 210, 222],
          tableLineWidth: 0.35,
          didDrawPage: function (data) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(95, 105, 120);
            var foot = pdfLatinize(
              "Viona Kaila Beach  |  Olusturma: " + formatSubmittedAtShortTr(new Date().toISOString())
            );
            doc.text(foot, M, pageH - 22);
            doc.text(
              pdfLatinize("Sayfa ") + data.pageNumber,
              pageW - M,
              pageH - 22,
              { align: "right" }
            );
            doc.setTextColor(0, 0, 0);
          },
        });
      } else {
        throw new Error("autoTable missing");
      }
    } catch (_e) {
      doc.setFontSize(8);
      var yF = y + 8;
      list.forEach(function (r) {
        if (yF > pageH - 50) {
          doc.addPage();
          yF = M + 10;
        }
        var line = pdfLatinize(
          [
            reservationTimeValue(r) || "-",
            reservationTypeLabelPdf(r),
            r.guest_name,
            r.room_number,
            reservationStatusLabelPdf(r),
          ].join(" | ")
        );
        doc.text(line.slice(0, 175), M, yF);
        yF += 12;
      });
    }
    doc.save(pdfReportFilenamePart(ovFilterKey) + "_" + iso + ".pdf");
  }

  var RESERVATION_VENUE_KEYS = ["laTerrace", "sinton", "spa"];

  function reservationIsVenueKey(k) {
    return RESERVATION_VENUE_KEYS.indexOf(String(k || "")) >= 0;
  }

  function reservationNormalizeInitialSubtab(raw) {
    var k = String(raw || "").trim();
    if (k === "alacarteAll" || k === "all") return "overview";
    return k;
  }

  /** Genel bakış + mekân şeridi: bugünden itibaren gün sayısı. */
  var RESERVATION_UPCOMING_STRIP_DAYS = 21;

  function reservationDatesInScopeSorted(rows, scopeKey) {
    var set = {};
    rows.forEach(function (r) {
      if (!reservationServiceMatches(r, scopeKey)) return;
      var d = String(reservationDateValue(r) || "").slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) set[d] = true;
    });
    return Object.keys(set).sort();
  }

  function reservationListForScopeAndDate(rows, scopeKey, iso, overviewListFilterKey) {
    if (scopeKey === "overview") {
      return reservationOverviewListFor(iso, overviewListFilterKey || "all", rows);
    }
    return rows.filter(function (r) {
      return reservationServiceMatches(r, scopeKey) && reservationDateValue(r) === iso;
    });
  }

  /**
   * Varsayılan takvim günü: bugün (kayıt varsa); değilse önümüzdeki 21 günde beklemede kaydı olan en yakın gün;
   * yoksa bugünden sonraki en yakın kayıtlı gün; o da yoksa en erken kayıt veya bugün.
   */
  function reservationSmartDefaultIso(rows, scopeKey, overviewListFilterKey) {
    var today = todayIsoLocal();
    var dates = reservationDatesInScopeSorted(rows, scopeKey);
    if (dates.indexOf(today) >= 0) return today;
    var FWD = 21;
    var i;
    for (i = 1; i <= FWD; i++) {
      var iso = addCalendarDaysIso(today, i);
      if (dates.indexOf(iso) < 0) continue;
      var list = reservationListForScopeAndDate(rows, scopeKey, iso, overviewListFilterKey);
      var j;
      for (j = 0; j < list.length; j++) {
        if (reservationIsWaitStatus(reservationNormalizeStatusKey(list[j].status))) {
          return iso;
        }
      }
    }
    var fut = dates.filter(function (d) {
      return d >= today;
    });
    if (fut.length) return fut[0];
    return dates[0] || today;
  }

  function reservationOverviewDefaultDate(rows) {
    return reservationSmartDefaultIso(rows, "overview", "all");
  }

  /** Şerit: hizmet günü + bağlam (genel bakış filtresi veya tek mekân) için toplam ve beklemede sayısı. */
  function reservationUpcomingStripStats(rows, dayIso, ctx) {
    var list;
    if (ctx.mode === "overview") {
      list = reservationOverviewListFor(dayIso, ctx.filterKey || "all", rows);
    } else {
      list = rows.filter(function (r) {
        return reservationServiceMatches(r, ctx.tabKey) && reservationDateValue(r) === dayIso;
      });
    }
    var wait = 0;
    list.forEach(function (r) {
      if (reservationIsWaitStatus(reservationNormalizeStatusKey(r && r.status))) wait += 1;
    });
    return { total: list.length, wait: wait };
  }

  function buildReservationUpcomingStripHtml(rows, ctx, selectedIso) {
    var today = todayIsoLocal();
    var sel = String(selectedIso || "").slice(0, 10);
    var parts = [];
    var d;
    for (d = 0; d < RESERVATION_UPCOMING_STRIP_DAYS; d++) {
      var iso = addCalendarDaysIso(today, d);
      if (!iso) continue;
      var st = reservationUpcomingStripStats(rows, iso, ctx);
      var isSel = iso === sel;
      var isToday = iso === today;
      var cls = "reservation-upcoming-day";
      if (isSel) cls += " is-selected";
      if (isToday) cls += " is-today";
      var waitPart =
        st.wait > 0
          ? '<span class="reservation-upcoming-day__wait">' + esc(String(st.wait)) + " bkl</span>"
          : "";
      parts.push(
        '<button type="button" role="listitem" class="' +
          cls +
          '" data-iso="' +
          esc(iso) +
          '" aria-pressed="' +
          (isSel ? "true" : "false") +
          '" title="' +
          esc(formatIsoDateDisplayTr(iso) + " — " + st.total + " kayıt") +
          '">' +
          '<span class="reservation-upcoming-day__date">' +
          esc(formatIsoDateShortDisplay(iso)) +
          "</span>" +
          '<span class="reservation-upcoming-day__counts">' +
          '<span class="reservation-upcoming-day__total">' +
          esc(String(st.total)) +
          "</span>" +
          waitPart +
          "</span></button>"
      );
    }
    return (
      '<div class="reservation-upcoming-strip__inner" role="list">' +
      parts.join("") +
      "</div>"
    );
  }

  function paintReservationUpcomingStrip(el, rows, ctx, selectedIso) {
    if (!el) return;
    el.innerHTML = buildReservationUpcomingStripHtml(rows, ctx, selectedIso);
  }

  /** Takvim bugünü + bağlam: bugüne düşen kayıt ve beklemede sayısı (uyarı bandı). */
  function reservationCountsForCalendarToday(rows, ctx) {
    var today = todayIsoLocal();
    var list;
    if (ctx.mode === "overview") {
      list = reservationOverviewListFor(today, ctx.filterKey || "all", rows);
    } else {
      list = rows.filter(function (r) {
        return reservationServiceMatches(r, ctx.tabKey) && reservationDateValue(r) === today;
      });
    }
    var wait = 0;
    list.forEach(function (r) {
      if (reservationIsWaitStatus(reservationNormalizeStatusKey(r && r.status))) wait += 1;
    });
    return { total: list.length, wait: wait, todayIso: today };
  }

  function paintReservationTodayAlert(el, rows, ctx) {
    if (!el) return;
    var c = reservationCountsForCalendarToday(rows, ctx);
    if (c.total === 0) {
      el.textContent = "";
      el.className = "reservation-today-alert is-hidden";
      el.setAttribute("aria-hidden", "true");
      return;
    }
    el.setAttribute("aria-hidden", "false");
    if (c.wait > 0) {
      el.className = "reservation-today-alert reservation-today-alert--wait";
      el.textContent = "Bugüne " + c.wait + " bekleyen talep var.";
    } else {
      el.className = "reservation-today-alert reservation-today-alert--info";
      el.textContent = "Bugüne " + c.total + " kayıt var (bekleyen yok).";
    }
  }

  function clearReservationDayTicker(mountEl) {
    if (mountEl._vionaDayTicker) {
      clearInterval(mountEl._vionaDayTicker);
      mountEl._vionaDayTicker = null;
    }
    mountEl._vionaLastCalendarIso = undefined;
  }

  /** Yerel gün değişince: seçili tarih dünkü “bugün” ise yeni bugüne taşınır; tablo/şerit yenilenir. */
  function startReservationDayTicker(mountEl, onCalendarDayChange) {
    clearReservationDayTicker(mountEl);
    mountEl._vionaLastCalendarIso = todayIsoLocal();
    mountEl._vionaDayTicker = setInterval(function () {
      var nowDay = todayIsoLocal();
      if (nowDay === mountEl._vionaLastCalendarIso) return;
      mountEl._vionaLastCalendarIso = nowDay;
      onCalendarDayChange(mountEl._vionaLastCalendarIso);
    }, 30000);
  }

  function reservationOverviewListFor(iso, filterKey, rows) {
    var fk = String(filterKey || "all");
    return rows
      .filter(function (r) {
        if (!reservationServiceMatches(r, "overview")) return false;
        if (reservationDateValue(r) !== iso) return false;
        if (fk === "all") return true;
        return reservationServiceMatches(r, fk);
      })
      .sort(function (a, b) {
        return reservationTimeValue(a).localeCompare(reservationTimeValue(b));
      });
  }

  function reservationStatusOverviewCounts(list) {
    var wait = 0;
    var appr = 0;
    var rej = 0;
    var can = 0;
    list.forEach(function (r) {
      var s = reservationNormalizeStatusKey(r && r.status);
      if (s === "new" || s === "pending" || s === "in_progress") wait += 1;
      else if (s === "done") appr += 1;
      else if (s === "rejected") rej += 1;
      else if (s === "cancelled") can += 1;
    });
    return { wait: wait, approved: appr, rejected: rej, cancelled: can };
  }

  function reservationGuestCountNumber(row) {
    var v = reservationGuestCountValue(row);
    if (v === "-" || v === "") return 0;
    var n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function reservationDefaultViewDate(rows, venueKey) {
    if (!reservationIsVenueKey(venueKey)) return todayIsoLocal();
    return reservationSmartDefaultIso(rows, venueKey, "all");
  }

  function reservationManualFormHtml(activeTab, rows) {
    if (!Array.isArray(rows)) rows = [];
    var todayIso = todayIsoLocal();
    var gcMax = activeTab === "spa" ? 6 : 12;
    var timeOpts = manualTimeOptionsHtml(activeTab, rows, todayIso);
    return (
      '<form class="reservation-manual-form">' +
      '<div class="reservation-manual-grid">' +
      '<label>Misafir adı <input name="name" type="text" required autocomplete="name" /></label>' +
      '<label>Oda <input name="room" type="text" inputmode="numeric" required autocomplete="off" /></label>' +
      adminNationalitySelectHtml() +
      '<label class="reservation-manual-date-wrap">Tarih' +
      '<div class="reservation-date-combo">' +
      '<input name="date" type="date" class="reservation-manual-date-native" min="' +
      esc(todayIsoLocal()) +
      '" value="' +
      esc(todayIso) +
      '" required />' +
      '<span class="reservation-date-combo__display">' +
      esc(formatIsoDateDisplayTr(todayIso)) +
      "</span>" +
      "</div></label>" +
      '<label class="reservation-manual-time-label">Saat <select name="time" class="reservation-manual-time" required>' +
      timeOpts +
      "</select></label>" +
      '<label>Kişi sayısı <input name="guestCount" type="number" min="1" max="' +
      esc(gcMax) +
      '" step="1" value="1" required /></label>' +
      '<label class="reservation-manual-note-label">Özel not <input name="note" type="text" placeholder="İsteğe bağlı" autocomplete="off" /></label>' +
      "</div>" +
      '<p class="reservation-manual-help">Dolu saatler listede yok. Oda: otelin geçerli oda numarası (ör. 1205).</p>' +
      '<button type="submit" class="btn-small">Manuel kayıt ekle</button>' +
      '<p class="reservation-manual-status"></p>' +
      "</form>"
    );
  }

  function renderReservationBoard(mountEl, type, rows, handlers) {
    if (!Array.isArray(rows)) rows = [];

    /* Her yeniden çizimde mountEl üzerindeki talep panosu dinleyicilerini kaldır (aksi halde birikir). */
    if (typeof AbortController !== "undefined") {
      if (mountEl._vionaResAbc) {
        try {
          mountEl._vionaResAbc.abort();
        } catch (_e) {}
      }
      mountEl._vionaResAbc = new AbortController();
    } else {
      mountEl._vionaResAbc = null;
    }
    var resMountOpts = mountEl._vionaResAbc ? { signal: mountEl._vionaResAbc.signal } : undefined;

    clearReservationDayTicker(mountEl);

    var initialRaw = reservationNormalizeInitialSubtab(
      handlers && handlers.initialReservationSubtab != null ? handlers.initialReservationSubtab : "overview"
    );
    var activeTab = reservationIsVenueKey(initialRaw) ? initialRaw : "overview";

    if (activeTab === "overview") {
      var isoOv = reservationOverviewDefaultDate(rows);
      var ovFilterKey = "all";

      var venueCardInner = function (key, title) {
        var c = reservationVenueCountsForDate(isoOv, key, rows);
        return (
          '<article class="reservation-venue-summary-card">' +
          '<h4 class="reservation-venue-summary-card__title">' +
          esc(title) +
          "</h4>" +
          '<dl class="reservation-venue-summary-card__dl">' +
          '<div class="reservation-venue-summary-card__row"><dt>Beklemede</dt><dd class="js-vsum-wait" data-venue="' +
          esc(key) +
          '">' +
          esc(c.wait) +
          "</dd></div>" +
          '<div class="reservation-venue-summary-card__row"><dt>Onaylandı</dt><dd class="js-vsum-appr" data-venue="' +
          esc(key) +
          '">' +
          esc(c.approved) +
          "</dd></div>" +
          '<div class="reservation-venue-summary-card__row"><dt>Onaylanmadı</dt><dd class="js-vsum-rej" data-venue="' +
          esc(key) +
          '">' +
          esc(c.rejected) +
          "</dd></div>" +
          "</dl></article>"
        );
      };

      var ovHtml =
        '<div class="bucket-shell reservation-shell reservation-shell--overview">' +
        '<header class="reservation-hero reservation-hero--overview">' +
        '<div class="reservation-hero__intro">' +
        "<h3>Günlük talep takibi</h3>" +
        "<p>Özet, <strong>seçilen hizmet gününe</strong> göredir; <strong>Gönderim</strong> sütunu talebin ne zaman geldiğini gösterir. Seçilen güne göre tüm mekânların listesi. Durum değişikliği için soldan ilgili mekân sekmesine geçin. Üstteki chip’ler yalnızca tabloyu filtreler.</p>" +
        "</div>" +
        '<div class="reservation-venue-summary-grid">' +
        venueCardInner("laTerrace", "La Terrace A La Carte") +
        venueCardInner("sinton", "Sinton BBQ Restaurant") +
        venueCardInner("spa", "Spa & wellness") +
        "</div>" +
        "</header>" +
        '<p class="reservation-active-line">Aktif: <strong>' +
        esc(reservationSubtabLabel("overview")) +
        "</strong></p>" +
        '<div class="reservation-overview-filters" role="group" aria-label="Mekân filtresi">' +
        '<button type="button" class="reservation-filter-chip is-active" data-filter="all">Tümü</button>' +
        '<button type="button" class="reservation-filter-chip" data-filter="laTerrace">La Terrace</button>' +
        '<button type="button" class="reservation-filter-chip" data-filter="sinton">Sinton</button>' +
        '<button type="button" class="reservation-filter-chip" data-filter="spa">Spa & wellness</button>' +
        "</div>" +
        '<div class="reservation-overview-toolbar">' +
        '<label class="reservation-date-label reservation-date-label--combo">Tarih' +
        '<div class="reservation-date-combo">' +
        '<input type="date" class="reservation-overview-date-native" value="' +
        esc(isoOv) +
        '" />' +
        '<span class="reservation-date-combo__display">' +
        esc(formatIsoDateDisplayTr(isoOv)) +
        "</span>" +
        "</div></label>" +
        '<div class="reservation-overview-actions">' +
        '<span class="reservation-pdf-hint">' +
        esc("Mutfak / operasyon için yazdırılabilir özet") +
        "</span>" +
        '<button type="button" class="btn-small reservation-report-pdf" title="Günlük liste PDF — mutfak ve operasyon için">' +
        "PDF indir" +
        "</button>" +
        "</div>" +
        "</div>" +
        '<p class="reservation-today-alert is-hidden" role="status" aria-live="polite" aria-hidden="true"></p>' +
        '<div class="reservation-upcoming-strip" role="group" aria-label="Önümüzdeki günler"></div>' +
        '<p class="reservation-overview-summary"></p>' +
        '<div class="bucket-table-wrap">' +
        '<table class="admin-table reservation-overview-table">' +
        "<thead><tr>" +
        "<th>Saat</th><th>Mekân</th><th>Misafir</th><th>Oda</th><th>Milliyet</th><th>Kişi</th><th>Gönderim</th><th>Durum</th><th>Not</th>" +
        "</tr></thead>" +
        '<tbody class="reservation-overview-tbody"></tbody>' +
        "</table>" +
        "</div>" +
        "</div>";

      mountEl.innerHTML = ovHtml;

      var dateOv = mountEl.querySelector(".reservation-overview-date-native");
      var dateOvDisplay = mountEl.querySelector(".reservation-overview-toolbar .reservation-date-combo__display");
      var tbodyOv = mountEl.querySelector(".reservation-overview-tbody");
      var summaryEl = mountEl.querySelector(".reservation-overview-summary");
      var filterChips = mountEl.querySelectorAll(".reservation-filter-chip");
      var stripOv = mountEl.querySelector(".reservation-upcoming-strip");
      var alertTodayOv = mountEl.querySelector(".reservation-today-alert");

      function renderOverviewTable() {
        if (!tbodyOv) return;
        var iso = String((dateOv && dateOv.value) || "").slice(0, 10);
        if (!iso || iso.length !== 10) {
          iso = reservationOverviewDefaultDate(rows);
          if (dateOv) dateOv.value = iso;
        }
        syncReservationDateComboNativeDisplay(dateOv, dateOvDisplay);
        RESERVATION_VENUE_KEYS.forEach(function (vk) {
          var c = reservationVenueCountsForDate(iso, vk, rows);
          var w = mountEl.querySelector('.js-vsum-wait[data-venue="' + vk + '"]');
          var a = mountEl.querySelector('.js-vsum-appr[data-venue="' + vk + '"]');
          var j = mountEl.querySelector('.js-vsum-rej[data-venue="' + vk + '"]');
          if (w) w.textContent = String(c.wait);
          if (a) a.textContent = String(c.approved);
          if (j) j.textContent = String(c.rejected);
        });
        var list = reservationOverviewListFor(iso, ovFilterKey, rows);
        var guestSum = 0;
        list.forEach(function (r) {
          guestSum += reservationGuestCountNumber(r);
        });
        var fkLabel =
          ovFilterKey === "all"
            ? "tüm mekânlar"
            : reservationSubtabLabel(ovFilterKey);
        if (summaryEl) {
          summaryEl.textContent =
            "Tarih " +
            formatIsoDateDisplayTr(iso) +
            " — " +
            list.length +
            " kayıt, toplam " +
            guestSum +
            " kişi — filtre: " +
            fkLabel;
        }
        paintReservationUpcomingStrip(stripOv, rows, { mode: "overview", filterKey: ovFilterKey }, iso);
        paintReservationTodayAlert(alertTodayOv, rows, { mode: "overview", filterKey: ovFilterKey });
        if (!list.length) {
          tbodyOv.innerHTML =
            '<tr><td colspan="9" class="admin-table__empty">Bu tarih ve filtre için kayıt yok.</td></tr>';
          return;
        }
        var out = "";
        list.forEach(function (r) {
          var rowSt = String(r.status || "new");
          var rowStNormOv = reservationNormalizeStatusKey(rowSt);
          out +=
            "<tr>" +
            "<td>" +
            esc(String(reservationTimeValue(r) || "—")) +
            "</td>" +
            "<td>" +
            esc(reservationTypeLabel(r)) +
            "</td>" +
            "<td>" +
            esc(r.guest_name || "-") +
            "</td>" +
            "<td>" +
            esc(r.room_number || "-") +
            "</td>" +
            "<td>" +
            esc(r.nationality || "-") +
            "</td>" +
            "<td>" +
            esc(reservationGuestCountValue(r)) +
            "</td>" +
            "<td>" +
            esc(formatSubmittedAtShortTr(r.submitted_at)) +
            "</td>" +
            '<td><span class="status-badge status-' +
            esc(rowStNormOv) +
            (reservationIsWaitStatus(rowStNormOv) ? " status-badge--wait" : "") +
            '">' +
            esc(reservationStatusLabel(rowSt)) +
            "</span></td>" +
            "<td>" +
            esc(String(r.note || "").trim() || "—") +
            "</td>" +
            "</tr>";
        });
        tbodyOv.innerHTML = out;
      }

      var btnPdf = mountEl.querySelector(".reservation-report-pdf");
      if (stripOv) {
        stripOv.addEventListener("click", function (ev) {
          var btn = ev.target.closest(".reservation-upcoming-day");
          if (!btn || !stripOv.contains(btn)) return;
          var pick = String(btn.getAttribute("data-iso") || "").slice(0, 10);
          if (!pick || pick.length !== 10) return;
          if (dateOv) dateOv.value = pick;
          syncReservationDateComboNativeDisplay(dateOv, dateOvDisplay);
          renderOverviewTable();
        });
      }
      if (dateOv) {
        dateOv.addEventListener("change", renderOverviewTable);
        dateOv.addEventListener("input", function () {
          syncReservationDateComboNativeDisplay(dateOv, dateOvDisplay);
          renderOverviewTable();
        });
      }
      if (filterChips && filterChips.length) {
        filterChips.forEach(function (chip) {
          chip.addEventListener("click", function () {
            ovFilterKey = chip.getAttribute("data-filter") || "all";
            filterChips.forEach(function (c) {
              c.classList.toggle("is-active", c.getAttribute("data-filter") === ovFilterKey);
            });
            renderOverviewTable();
          });
        });
      }
      if (btnPdf) {
        btnPdf.addEventListener("click", function () {
          var iso = String((dateOv && dateOv.value) || "").slice(0, 10);
          if (!iso || iso.length !== 10) {
            iso = reservationOverviewDefaultDate(rows);
          }
          var list = reservationOverviewListFor(iso, ovFilterKey, rows);
          var guestSum = 0;
          list.forEach(function (r) {
            guestSum += reservationGuestCountNumber(r);
          });
          var fkLabel =
            ovFilterKey === "all"
              ? "Tümü"
              : reservationSubtabLabel(ovFilterKey);
          downloadReservationOverviewPdf(iso, list, fkLabel, guestSum, ovFilterKey);
        });
      }

      renderOverviewTable();
      startReservationDayTicker(mountEl, function (newToday) {
        var ymd = String(newToday || "").slice(0, 10) || todayIsoLocal();
        var cur = String((dateOv && dateOv.value) || "").slice(0, 10);
        var prev = addCalendarDaysIso(ymd, -1);
        if (cur === prev) {
          if (dateOv) dateOv.value = ymd;
          syncReservationDateComboNativeDisplay(dateOv, dateOvDisplay);
        }
        renderOverviewTable();
      });
      mountEl.addEventListener(
        "reservation:setSubtab",
        function () {
          renderOverviewTable();
        },
        resMountOpts
      );
      return;
    }

    function countVenue(vk) {
      return rows.filter(function (r) {
        return reservationServiceMatches(r, vk);
      }).length;
    }

    var venueTitle =
      activeTab === "laTerrace"
        ? "La Terrace A La Carte"
        : activeTab === "sinton"
          ? "Sinton BBQ Restaurant"
          : "Spa & wellness";

    var isoVenueDefault = reservationDefaultViewDate(rows, activeTab);
    var vcHero = reservationVenueCountsForDate(isoVenueDefault, activeTab, rows);
    var vcHeroTotal = vcHero.wait + vcHero.approved + vcHero.rejected + vcHero.cancelled;
    var venueAllTimeCount = countVenue(activeTab);

    var html =
      '<div class="bucket-shell reservation-shell reservation-shell--venue">' +
      '<header class="reservation-hero reservation-hero--venue">' +
      '<div class="reservation-hero__intro">' +
      "<h3>" +
      esc(venueTitle) +
      "</h3>" +
      "<p>Bu mekân ve seçili gün için sayılar aşağıda. Genel özet için ana paneli kullanın.</p>" +
      "</div>" +
      '<div class="reservation-hero__stats reservation-hero__stats--venue-only">' +
      '<div class="reservation-mini-stat reservation-mini-stat--wait"><span>Beklemede (bu gün)</span><strong class="js-vvenue-wait">' +
      esc(vcHero.wait) +
      "</strong></div>" +
      '<div class="reservation-mini-stat"><span>Onaylandı (bu gün)</span><strong class="js-vvenue-appr">' +
      esc(vcHero.approved) +
      "</strong></div>" +
      '<div class="reservation-mini-stat"><span>Onaylanmadı (bu gün)</span><strong class="js-vvenue-rej">' +
      esc(vcHero.rejected) +
      "</strong></div>" +
      '<div class="reservation-mini-stat"><span>Toplam (bu gün)</span><strong class="js-vvenue-daytotal">' +
      esc(vcHeroTotal) +
      "</strong></div>" +
      "</div>" +
      '<p class="reservation-hero__venue-footnote">Gün: <strong class="js-vvenue-day-display">' +
      esc(formatIsoDateDisplayTr(isoVenueDefault)) +
      "</strong> · Bu mekânda toplam kayıt: <strong class=\"js-vvenue-alltime\">" +
      esc(venueAllTimeCount) +
      "</strong></p>" +
      "</header>" +
      '<p class="reservation-active-line">Aktif: <strong class="reservation-active-subtab-value">' +
      esc(reservationSubtabLabel(activeTab)) +
      "</strong></p>" +
      '<div class="reservation-day-panel">' +
      '<div class="reservation-day-panel__toolbar">' +
      '<label class="reservation-date-label reservation-date-label--combo">Tarih' +
      '<div class="reservation-date-combo">' +
      '<input type="date" class="reservation-view-date-native" value="' +
      esc(isoVenueDefault) +
      '" />' +
      '<span class="reservation-date-combo__display">' +
      esc(formatIsoDateDisplayTr(isoVenueDefault)) +
      "</span>" +
      "</div></label>" +
      '<p class="reservation-day-summary"></p>' +
      "</div>" +
      '<p class="reservation-today-alert is-hidden" role="status" aria-live="polite" aria-hidden="true"></p>' +
      '<div class="reservation-upcoming-strip" role="group" aria-label="Önümüzdeki günler (hizmet günü)"></div>' +
      '<div class="reservation-day-filters">' +
      '<input type="search" class="bucket-search reservation-day-search" placeholder="Bu gün içinde ara (misafir, oda, not)..." />' +
      '<select class="bucket-filter-status reservation-day-status">' +
      '<option value="all">Tüm durumlar</option>' +
      '<option value="wait">Beklemede</option>' +
      '<option value="done">Onaylandı</option>' +
      '<option value="rejected">Onaylanmadı</option>' +
      '<option value="cancelled">İptal (eski kayıt)</option>' +
      "</select>" +
      "</div>" +
      '<div class="bucket-table-wrap reservation-table-wrap">' +
      '<table class="admin-table reservation-view-table">' +
      "<thead><tr>" +
      "<th>Saat</th><th>Misafir</th><th>Oda</th><th>Milliyet</th><th>Kişi</th><th>Hizmet</th><th>Not</th><th>Durum</th><th class=\"reservation-col-actions\">İşlemler</th>" +
      "</tr></thead>" +
      '<tbody class="reservation-tbody"></tbody>' +
      "</table>" +
      "</div>" +
      "</div>" +
      '<details class="reservation-ops-advanced glass-block">' +
      "<summary>Operasyon: manuel kayıt</summary>" +
      '<p class="bucket-help">Manuel kayıt yalnızca bu mekân içindir.</p>' +
      reservationManualFormHtml(activeTab, rows) +
      "</details>" +
      "</div>";

    mountEl.innerHTML = html;

    var activeSubtabValue = mountEl.querySelector(".reservation-active-subtab-value");
    var dateInput = mountEl.querySelector(".reservation-view-date-native");
    var dateInputDisplay = mountEl.querySelector(".reservation-day-panel__toolbar .reservation-date-combo__display");
    var daySummary = mountEl.querySelector(".reservation-day-summary");
    var tbody = mountEl.querySelector(".reservation-tbody");
    var daySearch = mountEl.querySelector(".reservation-day-search");
    var dayStatus = mountEl.querySelector(".reservation-day-status");
    var manualForm = mountEl.querySelector(".reservation-manual-form");
    var elVWait = mountEl.querySelector(".js-vvenue-wait");
    var elVAppr = mountEl.querySelector(".js-vvenue-appr");
    var elVRej = mountEl.querySelector(".js-vvenue-rej");
    var elVDayTot = mountEl.querySelector(".js-vvenue-daytotal");
    var elVDayDisp = mountEl.querySelector(".js-vvenue-day-display");
    var stripVenue = mountEl.querySelector(".reservation-upcoming-strip");
    var alertTodayVenue = mountEl.querySelector(".reservation-today-alert");

    function renderDayTable() {
      if (!tbody) return;
      var iso = String((dateInput && dateInput.value) || "").slice(0, 10);
      if (!iso || iso.length !== 10) {
        iso = reservationDefaultViewDate(rows, activeTab);
        if (dateInput) dateInput.value = iso;
      }
      syncReservationDateComboNativeDisplay(dateInput, dateInputDisplay);
      var list = rows
        .filter(function (r) {
          return reservationServiceMatches(r, activeTab) && reservationDateValue(r) === iso;
        })
        .sort(function (a, b) {
          return reservationTimeValue(a).localeCompare(reservationTimeValue(b));
        });

      var vcDay = reservationStatusOverviewCounts(list);
      var daySum = vcDay.wait + vcDay.approved + vcDay.rejected + vcDay.cancelled;
      if (elVWait) elVWait.textContent = String(vcDay.wait);
      if (elVAppr) elVAppr.textContent = String(vcDay.approved);
      if (elVRej) elVRej.textContent = String(vcDay.rejected);
      if (elVDayTot) elVDayTot.textContent = String(daySum);
      if (elVDayDisp) elVDayDisp.textContent = formatIsoDateDisplayTr(iso);

      if (daySummary) {
        daySummary.textContent = formatIsoDateDisplayTr(iso) + " — " + list.length + " kayıt";
      }

      paintReservationUpcomingStrip(stripVenue, rows, { mode: "venue", tabKey: activeTab }, iso);
      paintReservationTodayAlert(alertTodayVenue, rows, { mode: "venue", tabKey: activeTab });

      var q = String((daySearch && daySearch.value) || "").trim().toLowerCase();
      var statusSel = String((dayStatus && dayStatus.value) || "all");

      if (!list.length) {
        tbody.innerHTML =
          '<tr><td colspan="9" class="admin-table__empty">Bu tarihte bu mekân için kayıt yok.</td></tr>';
        return;
      }

      var out = "";
      var any = 0;
      list.forEach(function (r) {
        var rowSt = String(r.status || "new");
        var rowStNorm = reservationNormalizeStatusKey(rowSt);
        if (statusSel === "wait") {
          if (!reservationIsWaitStatus(rowStNorm)) return;
        } else if (statusSel !== "all" && rowStNorm !== statusSel) return;
        var serviceName = reservationTypeLabel(r);
        var time = String(reservationTimeValue(r) || "—");
        var guestCount = reservationGuestCountValue(r);
        var note = String(r.note || "").trim();
        var det = reservationDetailText(r);
        var noteCell = note || (det !== "-" ? det : "—");
        var rowSearchText = [
          String(r.guest_name || ""),
          String(r.room_number || ""),
          String(r.nationality || ""),
          note,
          String(serviceName || ""),
          String(det || ""),
        ]
          .join(" ")
          .toLowerCase();
        if (q && rowSearchText.indexOf(q) < 0) return;
        any += 1;
        var actions = '<div class="row-actions">' + reservationActionButtons(type, r, r.id) + "</div>";
        out +=
          '<tr class="bucket-row reservation-row" data-status="' +
          esc(rowStNorm) +
          '" data-search="' +
          esc(rowSearchText) +
          '">' +
          "<td>" +
          esc(time) +
          "</td>" +
          "<td>" +
          esc(r.guest_name || "-") +
          "</td>" +
          "<td>" +
          esc(r.room_number || "-") +
          "</td>" +
          "<td>" +
          esc(r.nationality || "-") +
          "</td>" +
          "<td>" +
          esc(guestCount) +
          "</td>" +
          "<td>" +
          esc(serviceName) +
          "</td>" +
          "<td>" +
          esc(noteCell) +
          "</td>" +
          '<td><span class="status-badge status-' +
          esc(rowStNorm) +
          (reservationIsWaitStatus(rowStNorm) ? " status-badge--wait" : "") +
          '">' +
          esc(reservationStatusLabel(rowSt)) +
          "</span></td>" +
          '<td class="reservation-col-actions">' +
          actions +
          "</td>" +
          "</tr>";
      });
      if (!any) {
        tbody.innerHTML =
          '<tr><td colspan="9" class="admin-table__empty">Filtre veya arama ile eşleşen kayıt yok.</td></tr>';
      } else {
        tbody.innerHTML = out;
      }
    }

    function setActiveTab(key) {
      var k = reservationNormalizeInitialSubtab(String(key || ""));
      if (!reservationIsVenueKey(k)) return;
      activeTab = k;
      if (activeSubtabValue) {
        activeSubtabValue.textContent = reservationSubtabLabel(activeTab);
      }
      if (dateInput) {
        dateInput.value = reservationDefaultViewDate(rows, activeTab);
        syncReservationDateComboNativeDisplay(dateInput, dateInputDisplay);
      }
      renderDayTable();
    }

    if (stripVenue) {
      stripVenue.addEventListener("click", function (ev) {
        var btn = ev.target.closest(".reservation-upcoming-day");
        if (!btn || !stripVenue.contains(btn)) return;
        var pick = String(btn.getAttribute("data-iso") || "").slice(0, 10);
        if (!pick || pick.length !== 10) return;
        if (dateInput) dateInput.value = pick;
        syncReservationDateComboNativeDisplay(dateInput, dateInputDisplay);
        renderDayTable();
      });
    }
    if (dateInput) {
      dateInput.addEventListener("change", renderDayTable);
      dateInput.addEventListener("input", function () {
        syncReservationDateComboNativeDisplay(dateInput, dateInputDisplay);
        renderDayTable();
      });
    }
    if (daySearch) daySearch.addEventListener("input", renderDayTable);
    if (dayStatus) dayStatus.addEventListener("change", renderDayTable);

    mountEl.addEventListener(
      "click",
      function (ev) {
        var stBtn = ev.target.closest(".js-status");
        if (stBtn && tbody && tbody.contains(stBtn)) {
          if (handlers && typeof handlers.onStatus === "function") {
            handlers.onStatus(stBtn.getAttribute("data-type"), stBtn.getAttribute("data-id"), stBtn.getAttribute("data-status"));
          }
          return;
        }
        var delBtn = ev.target.closest(".js-delete");
        if (delBtn && tbody && tbody.contains(delBtn)) {
          if (handlers && typeof handlers.onDelete === "function") {
            handlers.onDelete(delBtn.getAttribute("data-type"), delBtn.getAttribute("data-id"));
          }
        }
      },
      resMountOpts
    );

    function refreshManualTimeSlots() {
      var manDateNat = manualForm && manualForm.querySelector(".reservation-manual-date-native");
      var timeSel = manualForm && manualForm.querySelector(".reservation-manual-time");
      if (!manDateNat || !timeSel) return;
      var iso = String(manDateNat.value || "").slice(0, 10);
      if (!iso || iso.length !== 10) {
        iso = todayIsoLocal();
        manDateNat.value = iso;
      }
      var prev = timeSel.value;
      timeSel.innerHTML = manualTimeOptionsHtml(activeTab, rows, iso);
      if (prev) {
        var keep = false;
        for (var oi = 0; oi < timeSel.options.length; oi++) {
          if (timeSel.options[oi].value === prev) {
            keep = true;
            break;
          }
        }
        if (keep) timeSel.value = prev;
      }
    }

    if (manualForm) {
      var manDateNat = manualForm.querySelector(".reservation-manual-date-native");
      var manDateDisp = manualForm.querySelector(".reservation-date-combo__display");
      if (manDateNat && manDateDisp) {
        syncReservationDateComboNativeDisplay(manDateNat, manDateDisp);
        manDateNat.addEventListener("input", function () {
          syncReservationDateComboNativeDisplay(manDateNat, manDateDisp);
          refreshManualTimeSlots();
        });
        manDateNat.addEventListener("change", refreshManualTimeSlots);
      }
      refreshManualTimeSlots();
      manualForm.addEventListener("submit", async function (ev) {
        ev.preventDefault();
        var statusEl = manualForm.querySelector(".reservation-manual-status");
        if (statusEl) statusEl.textContent = "";
        var fd = new FormData(manualForm);
        var name = String(fd.get("name") || "").trim();
        var room = String(fd.get("room") || "").trim();
        var nationality = String(fd.get("nationality") || "").trim();
        var isoDate = String(fd.get("date") || "").trim().slice(0, 10);
        var time = String(fd.get("time") || "").trim();
        var guestCount = parseInt(String(fd.get("guestCount") || "0"), 10);
        var note = String(fd.get("note") || "").trim();
        var safeDescription = note ? note.trim() : "Manuel kayıt";
        if (!name || !room || !nationality || !isoDate || !time) {
          if (statusEl) statusEl.textContent = "Misafir, oda, uyruk, tarih ve saat zorunludur.";
          return;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
          if (statusEl) statusEl.textContent = "Tarihi takvimden seçin.";
          return;
        }
        if (isoDate < todayIsoLocal()) {
          if (statusEl) statusEl.textContent = "Geçmiş güne kayıt eklenemez.";
          return;
        }
        var gcMaxOp = activeTab === "spa" ? 6 : 12;
        if (!Number.isFinite(guestCount) || guestCount < 1 || guestCount > gcMaxOp) {
          if (statusEl) {
            statusEl.textContent =
              activeTab === "spa"
                ? "Kişi sayısı 1–6 arasında olmalıdır."
                : "Kişi sayısı 1–12 arasında olmalıdır.";
          }
          return;
        }
        var roomValid =
          typeof isValidVionaHotelRoomNumber === "function"
            ? isValidVionaHotelRoomNumber(room)
            : /^\d+$/.test(room);
        if (!roomValid) {
          if (statusEl) statusEl.textContent = "Lütfen geçerli bir oda numarası girin.";
          return;
        }
        var payload;
        if (activeTab === "spa") {
          payload = {
            type: "reservation_spa",
            name: name,
            room: room,
            nationality: nationality,
            description: safeDescription,
            guestCount: guestCount,
            language: "tr",
            reservation: {
              spaServiceId: "other_care",
              serviceCode: "other_care",
              serviceLabel: "Diğer bakım hizmetleri",
              date: isoDate,
              reservationDate: isoDate,
              time: time,
              guestCount: guestCount,
            },
          };
        } else if (activeTab === "laTerrace" || activeTab === "sinton") {
          var alCodeMap = { laTerrace: "la_terrace", sinton: "sinton_bbq" };
          var alLabelMap = {
            laTerrace: "La Terrace A La Carte",
            sinton: "Sinton BBQ Restaurant",
          };
          payload = {
            type: "reservation_alacarte",
            name: name,
            room: room,
            nationality: nationality,
            description: safeDescription,
            guestCount: guestCount,
            language: "tr",
            reservation: {
              restaurantId: activeTab,
              restaurantCode: alCodeMap[activeTab] || activeTab,
              serviceCode: alCodeMap[activeTab] || activeTab,
              serviceLabel: alLabelMap[activeTab] || activeTab,
              reservationDate: isoDate,
              time: time,
              guestCount: guestCount,
            },
          };
        } else {
          if (statusEl) {
            statusEl.textContent = "Manuel kayıt yalnızca mekân sekmelerinde kullanılabilir.";
          }
          return;
        }
        try {
          if (handlers && typeof handlers.onCreate === "function") {
            await handlers.onCreate(payload);
            if (statusEl) statusEl.textContent = "Manuel kayıt kaydedildi.";
            manualForm.reset();
            var natSel = manualForm.querySelector('select[name="nationality"]');
            if (natSel) natSel.value = "TR";
            var dNat = manualForm.querySelector(".reservation-manual-date-native");
            var dDisp = manualForm.querySelector(".reservation-date-combo__display");
            var tIso = todayIsoLocal();
            if (dNat) dNat.value = tIso;
            syncReservationDateComboNativeDisplay(dNat, dDisp);
            refreshManualTimeSlots();
          }
        } catch (_e) {
          if (statusEl) statusEl.textContent = "Kayıt sırasında hata oluştu.";
        }
      });
    }

    mountEl.addEventListener(
      "reservation:setSubtab",
      function (ev) {
        var key = ev && ev.detail && ev.detail.key ? String(ev.detail.key) : "overview";
        if (!reservationIsVenueKey(reservationNormalizeInitialSubtab(key))) return;
        setActiveTab(key);
      },
      resMountOpts
    );

    startReservationDayTicker(mountEl, function (newToday) {
      var ymd = String(newToday || "").slice(0, 10) || todayIsoLocal();
      var cur = String((dateInput && dateInput.value) || "").slice(0, 10);
      var prev = addCalendarDaysIso(ymd, -1);
      if (cur === prev) {
        if (dateInput) dateInput.value = ymd;
        syncReservationDateComboNativeDisplay(dateInput, dateInputDisplay);
      }
      renderDayTable();
    });

    setActiveTab(initialRaw);
  }
  function bucketTopStatsTotal(pagination, rows) {
    return pagination && pagination.total != null ? pagination.total : rows.length;
  }
  /** Dört kutulu özet: ilk kutu sunucu toplamı; diğer üçü yalnızca geçerli sayfa satırları. */
  var BUCKET_QUAD_STATS_TITLE_WHEN_PAGED =
    ' title="Toplam: tüm kayıtlar (sunucu). Beklemede ve diğer durum özetleri yalnızca bu sayfadaki satırlara göredir."';
  function attachAdminPager(mountEl, pagination, rows, onPage) {
    if (!pagination || typeof onPage !== "function") return;
    var p = pagination;
    var page = Math.max(1, p.page || 1);
    var totalPages = Math.max(1, p.totalPages || 1);
    var total = p.total != null ? p.total : 0;
    var pageSize = p.pageSize || 100;
    var from = rows.length === 0 ? 0 : (page - 1) * pageSize + 1;
    var to = rows.length === 0 ? 0 : from + rows.length - 1;
    var wrap = document.createElement("div");
    wrap.className = "admin-pager";
    var prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "btn-small admin-pager__prev";
    prevBtn.textContent = "Önceki";
    prevBtn.disabled = page <= 1;
    prevBtn.addEventListener("click", function () {
      if (page > 1) onPage(page - 1);
    });
    var nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "btn-small admin-pager__next";
    nextBtn.textContent = "Sonraki";
    nextBtn.disabled = page >= totalPages;
    nextBtn.addEventListener("click", function () {
      if (page < totalPages) onPage(page + 1);
    });
    var meta = document.createElement("span");
    meta.className = "admin-pager__meta";
    meta.textContent =
      "Sayfa " + page + " / " + totalPages + " · " + (from ? from + "–" + to : "0") + " / " + total + " kayıt";
    if (totalPages > 1) {
      wrap.appendChild(prevBtn);
    }
    wrap.appendChild(meta);
    if (totalPages > 1) {
      wrap.appendChild(nextBtn);
    }
    mountEl.appendChild(wrap);
  }
  function renderRequestsPanel(mountEl, rows, handlers) {
    if (!Array.isArray(rows)) rows = [];
    var pag = handlers && handlers.pagination;
    var ro = Boolean(handlers && handlers.readOnly);
    var satH = Boolean(handlers && typeof handlers.onSatisfaction === "function");
    var totalCount = bucketTopStatsTotal(pag, rows);
    var topstatsTitle = pag
      ? BUCKET_QUAD_STATS_TITLE_WHEN_PAGED
      : "";
    var open = rows.filter(function (r) {
      var s = normalizeBucketStatus(r.status);
      return s === "new" || s === "pending" || s === "in_progress";
    }).length;
    var done = rows.filter(function (r) {
      return normalizeBucketStatus(r.status) === "done";
    }).length;
    var rejected = rows.filter(function (r) {
      return normalizeBucketStatus(r.status) === "rejected";
    }).length;

    var helpReq = ro
      ? "Salt izleme: durum güncellemesi HK operasyon sayfasından yapılır. Misafir memnuniyeti (1–5 + not) yalnızca burada sunucuya kaydedilir."
      : "Kategori = talep grubu (form başlığı). Tür = seçilen satır. Adet = yalnızca adetli türlerde; diğerinde «-». Açıklama = misafir notu. Gelen kayıtlar operasyon WhatsApp (Cloud API) hattına düşer; gerekirse satırdaki WhatsApp ile tekrar gönderin.";

    var html =
      '<div class="bucket-shell bucket-shell--requests">' +
      '<div class="bucket-topstats bucket-topstats--quad"' +
      topstatsTitle +
      ">" +
      '<div class="bucket-stat"><span>Toplam</span><strong>' + esc(totalCount) + "</strong></div>" +
      '<div class="bucket-stat"><span>Beklemede</span><strong>' + esc(open) + "</strong></div>" +
      '<div class="bucket-stat"><span>Yapıldı</span><strong>' + esc(done) + "</strong></div>" +
      '<div class="bucket-stat"><span>Yapılmadı</span><strong>' + esc(rejected) + "</strong></div>" +
      "</div>" +
      '<p class="bucket-help bucket-help--requests">' +
      helpReq +
      "</p>" +
      '<div class="bucket-toolbar bucket-toolbar--requests">' +
      '<label class="bucket-filter-date-label">Kayıt tarihi' +
      '<div class="reservation-date-combo bucket-toolbar-date-combo">' +
      '<input type="date" class="bucket-filter-date-native" />' +
      '<span class="reservation-date-combo__display">Tümü</span>' +
      '<button type="button" class="btn-small bucket-filter-date-clear" title="Tüm tarihler">Temizle</button>' +
      "</div></label>" +
      '<input class="bucket-search" type="search" placeholder="Oda, misafir, kategori veya not ara..." />' +
      '<select class="bucket-filter-status">' +
      '<option value="all">Tüm Durumlar</option>' +
      '<option value="new_pending">Beklemede</option>' +
      '<option value="done">Yapıldı</option>' +
      '<option value="rejected">Yapılmadı</option>' +
      "</select>" +
      "</div>" +
      '<div class="viona-table-shell glass-block">' +
      '<div class="viona-table-scroll viona-table-scroll--compact">' +
      '<table class="admin-table viona-table admin-table--requests">' +
      "<thead><tr>" +
      "<th>Tarih</th><th>Oda</th><th>Misafir</th><th>Milliyet</th><th>Kategori</th><th>Tür</th><th>Adet</th><th>Açıklama</th>" +
      (ro
        ? "<th>Personel notu (salt okunur)</th><th>Süre</th><th>Durum</th>" + (satH ? "<th>Misafir memnuniyeti</th>" : "<th></th>")
        : "<th>Personel notu</th><th>Süre</th><th>Durum</th><th>İşlemler</th>") +
      "</tr></thead><tbody>";

    if (!rows.length) {
      html += '<tr><td colspan="12" class="admin-table__empty">Henüz istek kaydı yok.</td></tr>';
    } else {
      rows.forEach(function (r) {
        var st = normalizeBucketStatus(r.status);
        var catLabel = requestFormGroupLabel(r);
        var typeLabel = requestFormTypeLabel(r);
        var qtyDisp = requestFormQuantityDisplay(r);
        var descFull = requestFormDescription(r);
        var staffNote = getRequestStaffNote(r.id);
        var rowSearchText = [
          String(r.room_number || ""),
          String(r.guest_name || ""),
          String(r.nationality || ""),
          catLabel,
          typeLabel,
          qtyDisp,
          descFull,
          staffNote,
        ]
          .join(" ")
          .toLowerCase();
        html +=
          '<tr class="bucket-row request-row' +
          (ro && st === "new" ? " ops-row--new" : "") +
          bucketRowHighlightClass(handlers, r.id) +
          '" data-id="' +
          esc(r.id) +
          '" data-status="' +
          esc(st) +
          '" data-search="' +
          esc(rowSearchText) +
          '" data-cal-date="' +
          esc(submittedAtCalendarIso(r.submitted_at)) +
          '">';
        html += "<td>" + esc(formatSubmittedAtTr(r.submitted_at)) + "</td>";
        html += "<td>" + esc(r.room_number || "-") + "</td>";
        html += "<td>" + esc(r.guest_name || "-") + "</td>";
        html += "<td>" + esc(r.nationality || "-") + "</td>";
        html += '<td><span class="cat-badge">' + esc(catLabel) + "</span></td>";
        html += '<td class="request-cell-type">' + esc(typeLabel) + "</td>";
        html += '<td class="request-cell-qty">' + esc(qtyDisp) + "</td>";
        html += '<td class="request-cell-desc">' + esc(descFull) + "</td>";
        if (ro) {
          html += '<td class="request-cell-staff">' + esc(staffNote) + "</td>";
        } else {
          html +=
            '<td class="request-cell-staff"><textarea class="request-staff-note js-req-staff-note" rows="2" data-id="' +
            esc(r.id) +
            '" placeholder="İç not">' +
            esc(staffNote) +
            "</textarea></td>";
        }
        html += '<td class="viona-sla-cell">' + esc(operationalSlaDisplayTr(r)) + "</td>";
        html += '<td><span class="status-badge status-' + esc(st) + '">' + esc(issueStatusLabel("request", st)) + "</span></td>";
        if (ro) {
          html += satH ? "<td>" + satisfactionEditCellHtml("request", r) + "</td>" : "<td></td>";
        } else {
          html += '<td><div class="row-actions">';
          html += issueRowActionsHtml("request", r.id, st);
          html += "</div></td>";
        }
        html += "</tr>";
      });
    }

    html += "</tbody></table></div></div></div>";
    mountEl.innerHTML = html;
    if (handlers && handlers.pagination && handlers.onPage) {
      attachAdminPager(mountEl, handlers.pagination, rows, handlers.onPage);
    }

    wireAdminSatisfaction(mountEl, handlers);
    scrollBucketHighlightIntoView(mountEl);

    var search = mountEl.querySelector(".bucket-search");
    var statusFilter = mountEl.querySelector(".bucket-filter-status");
    var dateNat = mountEl.querySelector(".bucket-filter-date-native");
    var dateDisp = mountEl.querySelector(".bucket-toolbar-date-combo .reservation-date-combo__display");
    var dateClear = mountEl.querySelector(".bucket-filter-date-clear");

    function applyFilters() {
      var q = String((search && search.value) || "").trim().toLowerCase();
      var st = String((statusFilter && statusFilter.value) || "all");
      var dateIso = String((dateNat && dateNat.value) || "").slice(0, 10);
      mountEl.querySelectorAll(".request-row").forEach(function (row) {
        var okStatus = rowMatchesStatusFilter(row.getAttribute("data-status"), st);
        var okSearch = !q || String(row.getAttribute("data-search") || "").indexOf(q) >= 0;
        var cal = row.getAttribute("data-cal-date") || "";
        var okDate = !dateIso || dateIso.length !== 10 || cal === dateIso;
        row.classList.toggle("hidden", !(okStatus && okSearch && okDate));
      });
    }

    function refreshRowSearchFromStaffNote(ta) {
      var tr = ta && ta.closest ? ta.closest("tr") : null;
      if (!tr) return;
      var id = String(ta.getAttribute("data-id") || "");
      var row = null;
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i].id) === id) {
          row = rows[i];
          break;
        }
      }
      if (!row) return;
      var catLabel = requestFormGroupLabel(row);
      var typeLabel = requestFormTypeLabel(row);
      var qtyDisp = requestFormQuantityDisplay(row);
      var descFull = requestFormDescription(row);
      var staffNote = String(ta.value || "");
      var rowSearchText = [
        String(row.room_number || ""),
        String(row.guest_name || ""),
        String(row.nationality || ""),
        catLabel,
        typeLabel,
        qtyDisp,
        descFull,
        staffNote,
      ]
        .join(" ")
        .toLowerCase();
      tr.setAttribute("data-search", rowSearchText);
    }

    if (!ro) {
      mountEl.querySelectorAll(".js-req-staff-note").forEach(function (ta) {
        ta.addEventListener("blur", function () {
          var id = String(ta.getAttribute("data-id") || "");
          setRequestStaffNote(id, ta.value);
          refreshRowSearchFromStaffNote(ta);
          applyFilters();
        });
      });

      mountEl.querySelectorAll(".js-status").forEach(function (btn) {
        btn.addEventListener("click", function () {
          handlers.onStatus(btn.getAttribute("data-type"), btn.getAttribute("data-id"), btn.getAttribute("data-status"));
        });
      });
      if (handlers && typeof handlers.onDelete === "function") {
        mountEl.querySelectorAll(".js-delete").forEach(function (btn) {
          btn.addEventListener("click", function () {
            handlers.onDelete(btn.getAttribute("data-type"), btn.getAttribute("data-id"));
          });
        });
      }
      wireWhatsappResendButtons(mountEl, handlers);
    }

    if (search) search.addEventListener("input", applyFilters);
    if (statusFilter) statusFilter.addEventListener("change", applyFilters);
    wireBucketToolbarDateControls(dateNat, dateDisp, dateClear, handlers, applyFilters);

    applyFilters();
  }

  function renderComplaintsPanel(mountEl, rows, handlers) {
    if (!Array.isArray(rows)) rows = [];
    var pag = handlers && handlers.pagination;
    var ro = Boolean(handlers && handlers.readOnly);
    var satH = Boolean(handlers && typeof handlers.onSatisfaction === "function");
    var totalCount = bucketTopStatsTotal(pag, rows);
    var topstatsTitle = pag
      ? BUCKET_QUAD_STATS_TITLE_WHEN_PAGED
      : "";
    var open = rows.filter(function (r) {
      var s = normalizeBucketStatus(r.status);
      return s === "new" || s === "pending" || s === "in_progress";
    }).length;
    var done = rows.filter(function (r) {
      return normalizeBucketStatus(r.status) === "done";
    }).length;
    var rejected = rows.filter(function (r) {
      return normalizeBucketStatus(r.status) === "rejected";
    }).length;

    var html =
      '<div class="bucket-shell bucket-shell--complaints">' +
      '<div class="bucket-topstats bucket-topstats--quad"' +
      topstatsTitle +
      ">" +
      '<div class="bucket-stat"><span>Toplam</span><strong>' + esc(totalCount) + "</strong></div>" +
      '<div class="bucket-stat"><span>Beklemede</span><strong>' + esc(open) + "</strong></div>" +
      '<div class="bucket-stat"><span>Yapıldı</span><strong>' + esc(done) + "</strong></div>" +
      '<div class="bucket-stat"><span>Yapılmadı</span><strong>' + esc(rejected) + "</strong></div>" +
      "</div>" +
      '<p class="bucket-help bucket-help--complaints">' +
      (ro
        ? "Salt izleme: durum güncellemesi ön büro operasyon sayfasından yapılır. Misafir memnuniyeti burada kaydedilir."
        : "Kategori ve açıklama misafir formundan. Personel notu dahilidir. Gelen kayıtlar operasyon WhatsApp (Cloud API) hattına düşer; gerekirse satırdaki WhatsApp ile tekrar gönderin.") +
      "</p>" +
      '<div class="bucket-toolbar bucket-toolbar--complaints">' +
      '<label class="bucket-filter-date-label">Kayıt tarihi' +
      '<div class="reservation-date-combo bucket-toolbar-date-combo">' +
      '<input type="date" class="bucket-filter-date-native" />' +
      '<span class="reservation-date-combo__display">Tümü</span>' +
      '<button type="button" class="btn-small bucket-filter-date-clear" title="Tüm tarihler">Temizle</button>' +
      "</div></label>" +
      '<input class="bucket-search" type="search" placeholder="Oda, misafir, kategori, açıklama veya not ara..." />' +
      '<select class="bucket-filter-status">' +
      '<option value="all">Tüm Durumlar</option>' +
      '<option value="new_pending">Beklemede</option>' +
      '<option value="done">Yapıldı</option>' +
      '<option value="rejected">Yapılmadı</option>' +
      "</select>" +
      "</div>" +
      '<div class="viona-table-shell glass-block">' +
      '<div class="viona-table-scroll viona-table-scroll--compact">' +
      '<table class="admin-table viona-table admin-table--complaints">' +
      "<thead><tr>" +
      "<th>Tarih</th><th>Oda</th><th>Misafir</th><th>Milliyet</th><th>Şikâyet konusu</th><th>Açıklama</th>" +
      (ro
        ? "<th>Personel notu (salt okunur)</th><th>Süre</th><th>Durum</th>" + (satH ? "<th>Misafir memnuniyeti</th>" : "<th></th>")
        : "<th>Personel notu</th><th>Süre</th><th>Durum</th><th>İşlemler</th>") +
      "</tr></thead><tbody>";

    if (!rows.length) {
      html += '<tr><td colspan="10" class="admin-table__empty">Henüz şikâyet kaydı yok.</td></tr>';
    } else {
      rows.forEach(function (r) {
        var st = normalizeBucketStatus(r.status);
        var catLabel = categoryText("complaint", r.categories, r.category);
        var descFull = complaintFormDescription(r);
        var staffNote = getComplaintStaffNote(r.id);
        var rowSearchText = [
          String(r.room_number || ""),
          String(r.guest_name || ""),
          String(r.nationality || ""),
          catLabel,
          descFull,
          staffNote,
        ]
          .join(" ")
          .toLowerCase();
        html +=
          '<tr class="bucket-row complaint-row' +
          (ro && st === "new" ? " ops-row--new" : "") +
          bucketRowHighlightClass(handlers, r.id) +
          '" data-id="' +
          esc(r.id) +
          '" data-status="' +
          esc(st) +
          '" data-search="' +
          esc(rowSearchText) +
          '" data-cal-date="' +
          esc(submittedAtCalendarIso(r.submitted_at)) +
          '">';
        html += "<td>" + esc(formatSubmittedAtTr(r.submitted_at)) + "</td>";
        html += "<td>" + esc(r.room_number || "-") + "</td>";
        html += "<td>" + esc(r.guest_name || "-") + "</td>";
        html += "<td>" + esc(r.nationality || "-") + "</td>";
        html += '<td><span class="cat-badge cat-badge--complaint">' + esc(catLabel) + "</span></td>";
        html += '<td class="complaint-cell-desc">' + esc(descFull) + "</td>";
        if (ro) {
          html += '<td class="request-cell-staff">' + esc(staffNote) + "</td>";
        } else {
          html +=
            '<td class="request-cell-staff"><textarea class="request-staff-note js-compl-staff-note" rows="2" data-id="' +
            esc(r.id) +
            '" placeholder="İç not">' +
            esc(staffNote) +
            "</textarea></td>";
        }
        html += '<td class="viona-sla-cell">' + esc(operationalSlaDisplayTr(r)) + "</td>";
        html += '<td><span class="status-badge status-' + esc(st) + '">' + esc(issueStatusLabel("complaint", st)) + "</span></td>";
        if (ro) {
          html += satH ? "<td>" + satisfactionEditCellHtml("complaint", r) + "</td>" : "<td></td>";
        } else {
          html += '<td><div class="row-actions">';
          html += issueRowActionsHtml("complaint", r.id, st);
          html += "</div></td>";
        }
        html += "</tr>";
      });
    }

    html += "</tbody></table></div></div></div>";
    mountEl.innerHTML = html;
    if (handlers && handlers.pagination && handlers.onPage) {
      attachAdminPager(mountEl, handlers.pagination, rows, handlers.onPage);
    }

    wireAdminSatisfaction(mountEl, handlers);
    scrollBucketHighlightIntoView(mountEl);

    var search = mountEl.querySelector(".bucket-search");
    var statusFilter = mountEl.querySelector(".bucket-filter-status");
    var dateNat = mountEl.querySelector(".bucket-filter-date-native");
    var dateDisp = mountEl.querySelector(".bucket-toolbar-date-combo .reservation-date-combo__display");
    var dateClear = mountEl.querySelector(".bucket-filter-date-clear");

    function applyFilters() {
      var q = String((search && search.value) || "").trim().toLowerCase();
      var st = String((statusFilter && statusFilter.value) || "all");
      var dateIso = String((dateNat && dateNat.value) || "").slice(0, 10);
      mountEl.querySelectorAll(".complaint-row").forEach(function (row) {
        var okStatus = rowMatchesStatusFilter(row.getAttribute("data-status"), st);
        var okSearch = !q || String(row.getAttribute("data-search") || "").indexOf(q) >= 0;
        var cal = row.getAttribute("data-cal-date") || "";
        var okDate = !dateIso || dateIso.length !== 10 || cal === dateIso;
        row.classList.toggle("hidden", !(okStatus && okSearch && okDate));
      });
    }

    function refreshComplaintRowSearch(ta) {
      var tr = ta && ta.closest ? ta.closest("tr") : null;
      if (!tr) return;
      var id = String(ta.getAttribute("data-id") || "");
      var row = null;
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i].id) === id) {
          row = rows[i];
          break;
        }
      }
      if (!row) return;
      var catLabel = categoryText("complaint", row.categories, row.category);
      var descFull = complaintFormDescription(row);
      var staffNote = String(ta.value || "");
      var rowSearchText = [
        String(row.room_number || ""),
        String(row.guest_name || ""),
        String(row.nationality || ""),
        catLabel,
        descFull,
        staffNote,
      ]
        .join(" ")
        .toLowerCase();
      tr.setAttribute("data-search", rowSearchText);
    }

    if (!ro) {
      mountEl.querySelectorAll(".js-compl-staff-note").forEach(function (ta) {
        ta.addEventListener("blur", function () {
          var id = String(ta.getAttribute("data-id") || "");
          setComplaintStaffNote(id, ta.value);
          refreshComplaintRowSearch(ta);
          applyFilters();
        });
      });

      mountEl.querySelectorAll(".js-status").forEach(function (btn) {
        btn.addEventListener("click", function () {
          handlers.onStatus(btn.getAttribute("data-type"), btn.getAttribute("data-id"), btn.getAttribute("data-status"));
        });
      });
      if (handlers && typeof handlers.onDelete === "function") {
        mountEl.querySelectorAll(".js-delete").forEach(function (btn) {
          btn.addEventListener("click", function () {
            handlers.onDelete(btn.getAttribute("data-type"), btn.getAttribute("data-id"));
          });
        });
      }
      wireWhatsappResendButtons(mountEl, handlers);
    }

    if (search) search.addEventListener("input", applyFilters);
    if (statusFilter) statusFilter.addEventListener("change", applyFilters);
    wireBucketToolbarDateControls(dateNat, dateDisp, dateClear, handlers, applyFilters);

    applyFilters();
  }

  function renderGuestNotificationsPanel(mountEl, rows, handlers) {
    if (!Array.isArray(rows)) rows = [];
    var pag = handlers && handlers.pagination;
    var ro = Boolean(handlers && handlers.readOnly);
    var satH = Boolean(handlers && typeof handlers.onSatisfaction === "function");
    var totalCount = bucketTopStatsTotal(pag, rows);
    var topstatsTitle = pag
      ? BUCKET_QUAD_STATS_TITLE_WHEN_PAGED
      : "";
    var open = rows.filter(function (r) {
      var s = normalizeBucketStatus(r.status);
      return s === "new" || s === "pending" || s === "in_progress";
    }).length;
    var done = rows.filter(function (r) {
      return normalizeBucketStatus(r.status) === "done";
    }).length;
    var rejected = rows.filter(function (r) {
      return normalizeBucketStatus(r.status) === "rejected";
    }).length;

    var html =
      '<div class="bucket-shell bucket-shell--complaints">' +
      '<div class="bucket-topstats bucket-topstats--quad"' +
      topstatsTitle +
      ">" +
      '<div class="bucket-stat"><span>Toplam</span><strong>' + esc(totalCount) + "</strong></div>" +
      '<div class="bucket-stat"><span>Beklemede</span><strong>' + esc(open) + "</strong></div>" +
      '<div class="bucket-stat"><span>Yapıldı</span><strong>' + esc(done) + "</strong></div>" +
      '<div class="bucket-stat"><span>Yapılmadı</span><strong>' + esc(rejected) + "</strong></div>" +
      "</div>" +
      '<p class="bucket-help bucket-help--complaints">' +
      (ro
        ? "Salt izleme; durum ön büro operasyon sayfasından. Misafir memnuniyeti burada kaydedilir."
        : "Bildirim konusu ve açıklama misafir formundan gelir; personel notu yerel tarayıcıda saklanır. Gelen kayıtlar operasyon WhatsApp (Cloud API) hattına düşer; gerekirse satırdaki WhatsApp ile tekrar gönderin.") +
      "</p>" +
      '<div class="bucket-toolbar bucket-toolbar--complaints">' +
      '<label class="bucket-filter-date-label">Kayıt tarihi' +
      '<div class="reservation-date-combo bucket-toolbar-date-combo">' +
      '<input type="date" class="bucket-filter-date-native" />' +
      '<span class="reservation-date-combo__display">Tümü</span>' +
      '<button type="button" class="btn-small bucket-filter-date-clear" title="Tüm tarihler">Temizle</button>' +
      "</div></label>" +
      '<input class="bucket-search" type="search" placeholder="Oda, misafir, konu, açıklama veya not ara..." />' +
      '<select class="bucket-filter-status">' +
      '<option value="all">Tüm Durumlar</option>' +
      '<option value="new_pending">Beklemede</option>' +
      '<option value="done">Yapıldı</option>' +
      '<option value="rejected">Yapılmadı</option>' +
      "</select>" +
      "</div>" +
      '<div class="viona-table-shell glass-block">' +
      '<div class="viona-table-scroll viona-table-scroll--compact">' +
      '<table class="admin-table viona-table admin-table--complaints">' +
      "<thead><tr>" +
      "<th>Tarih</th><th>Oda</th><th>Misafir</th><th>Milliyet</th><th>Bildirim konusu</th><th>Açıklama</th>" +
      (ro
        ? "<th>Personel notu (salt okunur)</th><th>Süre</th><th>Durum</th>" + (satH ? "<th>Misafir memnuniyeti</th>" : "<th></th>")
        : "<th>Personel notu</th><th>Süre</th><th>Durum</th><th>İşlemler</th>") +
      "</tr></thead><tbody>";

    if (!rows.length) {
      html += '<tr><td colspan="10" class="admin-table__empty">Henüz misafir bildirimi yok.</td></tr>';
    } else {
      rows.forEach(function (r) {
        var st = normalizeBucketStatus(r.status);
        var catLabel = categoryText("guest_notification", r.categories, r.category);
        var descFull = complaintFormDescription(r);
        var staffNote = getGuestNotifStaffNote(r.id);
        var rowSearchText = [
          String(r.room_number || ""),
          String(r.guest_name || ""),
          String(r.nationality || ""),
          catLabel,
          descFull,
          staffNote,
        ]
          .join(" ")
          .toLowerCase();
        html +=
          '<tr class="bucket-row guest-notif-row' +
          (ro && st === "new" ? " ops-row--new" : "") +
          bucketRowHighlightClass(handlers, r.id) +
          '" data-id="' +
          esc(r.id) +
          '" data-status="' +
          esc(st) +
          '" data-search="' +
          esc(rowSearchText) +
          '" data-cal-date="' +
          esc(submittedAtCalendarIso(r.submitted_at)) +
          '">';
        html += "<td>" + esc(formatSubmittedAtTr(r.submitted_at)) + "</td>";
        html += "<td>" + esc(r.room_number || "-") + "</td>";
        html += "<td>" + esc(r.guest_name || "-") + "</td>";
        html += "<td>" + esc(r.nationality || "-") + "</td>";
        html += '<td><span class="cat-badge cat-badge--complaint">' + esc(catLabel) + "</span></td>";
        html += '<td class="complaint-cell-desc">' + esc(descFull) + "</td>";
        if (ro) {
          html += '<td class="request-cell-staff">' + esc(staffNote) + "</td>";
        } else {
          html +=
            '<td class="request-cell-staff"><textarea class="request-staff-note js-gn-staff-note" rows="2" data-id="' +
            esc(r.id) +
            '" placeholder="İç not">' +
            esc(staffNote) +
            "</textarea></td>";
        }
        html += '<td class="viona-sla-cell">' + esc(operationalSlaDisplayTr(r)) + "</td>";
        html +=
          '<td><span class="status-badge status-' +
          esc(st) +
          '">' +
          esc(issueStatusLabel("guest_notification", st)) +
          "</span></td>";
        if (ro) {
          html += satH ? "<td>" + satisfactionEditCellHtml("guest_notification", r) + "</td>" : "<td></td>";
        } else {
          html += '<td><div class="row-actions">';
          html += issueRowActionsHtml("guest_notification", r.id, st);
          html += "</div></td>";
        }
        html += "</tr>";
      });
    }

    html += "</tbody></table></div></div></div>";
    mountEl.innerHTML = html;
    if (handlers && handlers.pagination && handlers.onPage) {
      attachAdminPager(mountEl, handlers.pagination, rows, handlers.onPage);
    }

    wireAdminSatisfaction(mountEl, handlers);
    scrollBucketHighlightIntoView(mountEl);

    var search = mountEl.querySelector(".bucket-search");
    var statusFilter = mountEl.querySelector(".bucket-filter-status");
    var dateNat = mountEl.querySelector(".bucket-filter-date-native");
    var dateDisp = mountEl.querySelector(".bucket-toolbar-date-combo .reservation-date-combo__display");
    var dateClear = mountEl.querySelector(".bucket-filter-date-clear");

    function applyFilters() {
      var q = String((search && search.value) || "").trim().toLowerCase();
      var st = String((statusFilter && statusFilter.value) || "all");
      var dateIso = String((dateNat && dateNat.value) || "").slice(0, 10);
      mountEl.querySelectorAll(".guest-notif-row").forEach(function (row) {
        var okStatus = rowMatchesStatusFilter(row.getAttribute("data-status"), st);
        var okSearch = !q || String(row.getAttribute("data-search") || "").indexOf(q) >= 0;
        var cal = row.getAttribute("data-cal-date") || "";
        var okDate = !dateIso || dateIso.length !== 10 || cal === dateIso;
        row.classList.toggle("hidden", !(okStatus && okSearch && okDate));
      });
    }

    function refreshGnRowSearch(ta) {
      var tr = ta && ta.closest ? ta.closest("tr") : null;
      if (!tr) return;
      var id = String(ta.getAttribute("data-id") || "");
      var row = null;
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i].id) === id) {
          row = rows[i];
          break;
        }
      }
      if (!row) return;
      var catLabel = categoryText("guest_notification", row.categories, row.category);
      var descFull = complaintFormDescription(row);
      var staffNote = String(ta.value || "");
      var rowSearchText = [
        String(row.room_number || ""),
        String(row.guest_name || ""),
        String(row.nationality || ""),
        catLabel,
        descFull,
        staffNote,
      ]
        .join(" ")
        .toLowerCase();
      tr.setAttribute("data-search", rowSearchText);
    }

    if (!ro) {
      mountEl.querySelectorAll(".js-gn-staff-note").forEach(function (ta) {
        ta.addEventListener("blur", function () {
          var id = String(ta.getAttribute("data-id") || "");
          setGuestNotifStaffNote(id, ta.value);
          refreshGnRowSearch(ta);
          applyFilters();
        });
      });

      mountEl.querySelectorAll(".js-status").forEach(function (btn) {
        btn.addEventListener("click", function () {
          handlers.onStatus(btn.getAttribute("data-type"), btn.getAttribute("data-id"), btn.getAttribute("data-status"));
        });
      });
      if (handlers && typeof handlers.onDelete === "function") {
        mountEl.querySelectorAll(".js-delete").forEach(function (btn) {
          btn.addEventListener("click", function () {
            handlers.onDelete(btn.getAttribute("data-type"), btn.getAttribute("data-id"));
          });
        });
      }
      wireWhatsappResendButtons(mountEl, handlers);
    }

    if (search) search.addEventListener("input", applyFilters);
    if (statusFilter) statusFilter.addEventListener("change", applyFilters);
    wireBucketToolbarDateControls(dateNat, dateDisp, dateClear, handlers, applyFilters);

    applyFilters();
  }

  function renderLateCheckoutsPanel(mountEl, rows, handlers) {
    if (!Array.isArray(rows)) rows = [];
    var pag = handlers && handlers.pagination;
    var ro = Boolean(handlers && handlers.readOnly);
    var satH = Boolean(handlers && typeof handlers.onSatisfaction === "function");
    var totalCount = bucketTopStatsTotal(pag, rows);
    var topstatsTitle = pag ? BUCKET_QUAD_STATS_TITLE_WHEN_PAGED : "";
    var open = rows.filter(function (r) {
      var s = normalizeBucketStatus(r.status);
      return s === "new" || s === "pending" || s === "in_progress";
    }).length;
    var done = rows.filter(function (r) {
      return normalizeBucketStatus(r.status) === "done";
    }).length;
    var rejected = rows.filter(function (r) {
      return normalizeBucketStatus(r.status) === "rejected";
    }).length;

    var html =
      '<div class="bucket-shell bucket-shell--late-checkout">' +
      '<div class="bucket-topstats bucket-topstats--quad"' +
      topstatsTitle +
      ">" +
      '<div class="bucket-stat"><span>Toplam</span><strong>' + esc(totalCount) + "</strong></div>" +
      '<div class="bucket-stat"><span>Beklemede</span><strong>' + esc(open) + "</strong></div>" +
      '<div class="bucket-stat"><span>Onaylandı</span><strong>' + esc(done) + "</strong></div>" +
      '<div class="bucket-stat"><span>Onaylanmadı</span><strong>' + esc(rejected) + "</strong></div>" +
      "</div>" +
      '<p class="bucket-help bucket-help--late-checkout">' +
      (ro
        ? "Salt izleme; onay ön büro operasyon sayfasından. Memnuniyet burada kaydedilir."
        : "Web formundan gelen geç çıkış talepleri; misafir bildirimi şablonu ile iletilir ve operasyon WhatsApp (Cloud API) hattına düşer. Personel notu yerel tarayıcıda saklanır; gerekirse satırdaki WhatsApp ile tekrar gönderin.") +
      "</p>" +
      '<div class="bucket-toolbar bucket-toolbar--complaints">' +
      '<label class="bucket-filter-date-label">Kayıt tarihi' +
      '<div class="reservation-date-combo bucket-toolbar-date-combo">' +
      '<input type="date" class="bucket-filter-date-native" />' +
      '<span class="reservation-date-combo__display">Tümü</span>' +
      '<button type="button" class="btn-small bucket-filter-date-clear" title="Tüm tarihler">Temizle</button>' +
      "</div></label>" +
      '<input class="bucket-search" type="search" placeholder="Oda, misafir, çıkış tarihi/saati veya not ara..." />' +
      '<select class="bucket-filter-status">' +
      '<option value="all">Tüm Durumlar</option>' +
      '<option value="new_pending">Beklemede</option>' +
      '<option value="done">Onaylandı</option>' +
      '<option value="rejected">Onaylanmadı</option>' +
      "</select>" +
      "</div>" +
      '<div class="viona-table-shell glass-block">' +
      '<div class="viona-table-scroll viona-table-scroll--compact">' +
      '<table class="admin-table viona-table admin-table--late-checkout">' +
      "<thead><tr>" +
      "<th>Kayıt</th><th>Çıkış tarihi</th><th>Çıkış saati</th><th>Oda</th><th>Misafir</th><th>Milliyet</th><th>Misafir notu</th>" +
      (ro
        ? "<th>Personel notu (salt okunur)</th><th>Süre</th><th>Durum</th>" + (satH ? "<th>Misafir memnuniyeti</th>" : "<th></th>")
        : "<th>Personel notu</th><th>Süre</th><th>Durum</th><th>İşlemler</th>") +
      "</tr></thead><tbody>";

    function checkoutDateDisp(r) {
      var raw = String(r.checkout_date || "").slice(0, 10);
      if (raw.length === 10) return formatIsoDateDisplayTr(raw);
      return raw || "—";
    }

    if (!rows.length) {
      html += '<tr><td colspan="11" class="admin-table__empty">Henüz geç çıkış talebi yok.</td></tr>';
    } else {
      rows.forEach(function (r) {
        var st = normalizeBucketStatus(r.status);
        var descFull = complaintFormDescription(r);
        var staffNote = getLateCheckoutStaffNote(r.id);
        var coDate = checkoutDateDisp(r);
        var coTime = String(r.checkout_time || "").trim() || "—";
        var rowSearchText = [
          String(r.room_number || ""),
          String(r.guest_name || ""),
          String(r.nationality || ""),
          coDate,
          coTime,
          descFull,
          staffNote,
        ]
          .join(" ")
          .toLowerCase();
        html +=
          '<tr class="bucket-row late-checkout-row' +
          (ro && st === "new" ? " ops-row--new" : "") +
          bucketRowHighlightClass(handlers, r.id) +
          '" data-id="' +
          esc(r.id) +
          '" data-status="' +
          esc(st) +
          '" data-search="' +
          esc(rowSearchText) +
          '" data-cal-date="' +
          esc(submittedAtCalendarIso(r.submitted_at)) +
          '">';
        html += "<td>" + esc(formatSubmittedAtTr(r.submitted_at)) + "</td>";
        html += "<td>" + esc(coDate) + "</td>";
        html += "<td>" + esc(coTime) + "</td>";
        html += "<td>" + esc(r.room_number || "-") + "</td>";
        html += "<td>" + esc(r.guest_name || "-") + "</td>";
        html += "<td>" + esc(r.nationality || "-") + "</td>";
        html += '<td class="complaint-cell-desc">' + esc(descFull) + "</td>";
        if (ro) {
          html += '<td class="request-cell-staff">' + esc(staffNote) + "</td>";
        } else {
          html +=
            '<td class="request-cell-staff"><textarea class="request-staff-note js-lc-staff-note" rows="2" data-id="' +
            esc(r.id) +
            '" placeholder="İç not">' +
            esc(staffNote) +
            "</textarea></td>";
        }
        html += '<td class="viona-sla-cell">' + esc(operationalSlaDisplayTr(r)) + "</td>";
        html +=
          '<td><span class="status-badge status-' +
          esc(st) +
          '">' +
          esc(issueStatusLabel("late_checkout", st)) +
          "</span></td>";
        if (ro) {
          html += satH ? "<td>" + satisfactionEditCellHtml("late_checkout", r) + "</td>" : "<td></td>";
        } else {
          html += '<td><div class="row-actions">';
          html += issueRowActionsHtml("late_checkout", r.id, st);
          html += "</div></td>";
        }
        html += "</tr>";
      });
    }

    html += "</tbody></table></div></div></div>";
    mountEl.innerHTML = html;
    if (handlers && handlers.pagination && handlers.onPage) {
      attachAdminPager(mountEl, handlers.pagination, rows, handlers.onPage);
    }

    wireAdminSatisfaction(mountEl, handlers);
    scrollBucketHighlightIntoView(mountEl);

    var search = mountEl.querySelector(".bucket-search");
    var statusFilter = mountEl.querySelector(".bucket-filter-status");
    var dateNat = mountEl.querySelector(".bucket-filter-date-native");
    var dateDisp = mountEl.querySelector(".bucket-toolbar-date-combo .reservation-date-combo__display");
    var dateClear = mountEl.querySelector(".bucket-filter-date-clear");

    function applyFilters() {
      var q = String((search && search.value) || "").trim().toLowerCase();
      var st = String((statusFilter && statusFilter.value) || "all");
      var dateIso = String((dateNat && dateNat.value) || "").slice(0, 10);
      mountEl.querySelectorAll(".late-checkout-row").forEach(function (row) {
        var okStatus = rowMatchesStatusFilter(row.getAttribute("data-status"), st);
        var okSearch = !q || String(row.getAttribute("data-search") || "").indexOf(q) >= 0;
        var cal = row.getAttribute("data-cal-date") || "";
        var okDate = !dateIso || dateIso.length !== 10 || cal === dateIso;
        row.classList.toggle("hidden", !(okStatus && okSearch && okDate));
      });
    }

    function refreshLcRowSearch(ta) {
      var tr = ta && ta.closest ? ta.closest("tr") : null;
      if (!tr) return;
      var id = String(ta.getAttribute("data-id") || "");
      var row = null;
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i].id) === id) {
          row = rows[i];
          break;
        }
      }
      if (!row) return;
      var descFull = complaintFormDescription(row);
      var coDate = checkoutDateDisp(row);
      var coTime = String(row.checkout_time || "").trim() || "—";
      var staffNote = String(ta.value || "");
      var rowSearchText = [
        String(row.room_number || ""),
        String(row.guest_name || ""),
        String(row.nationality || ""),
        coDate,
        coTime,
        descFull,
        staffNote,
      ]
        .join(" ")
        .toLowerCase();
      tr.setAttribute("data-search", rowSearchText);
    }

    if (!ro) {
      mountEl.querySelectorAll(".js-lc-staff-note").forEach(function (ta) {
        ta.addEventListener("blur", function () {
          var id = String(ta.getAttribute("data-id") || "");
          setLateCheckoutStaffNote(id, ta.value);
          refreshLcRowSearch(ta);
          applyFilters();
        });
      });

      mountEl.querySelectorAll(".js-status").forEach(function (btn) {
        btn.addEventListener("click", function () {
          handlers.onStatus(btn.getAttribute("data-type"), btn.getAttribute("data-id"), btn.getAttribute("data-status"));
        });
      });
      if (handlers && typeof handlers.onDelete === "function") {
        mountEl.querySelectorAll(".js-delete").forEach(function (btn) {
          btn.addEventListener("click", function () {
            handlers.onDelete(btn.getAttribute("data-type"), btn.getAttribute("data-id"));
          });
        });
      }
      wireWhatsappResendButtons(mountEl, handlers);
    }

    if (search) search.addEventListener("input", applyFilters);
    if (statusFilter) statusFilter.addEventListener("change", applyFilters);
    wireBucketToolbarDateControls(dateNat, dateDisp, dateClear, handlers, applyFilters);

    applyFilters();
  }

  function renderFaultsPanel(mountEl, rows, handlers) {
    if (!Array.isArray(rows)) rows = [];
    var pag = handlers && handlers.pagination;
    var ro = Boolean(handlers && handlers.readOnly);
    var satH = Boolean(handlers && typeof handlers.onSatisfaction === "function");
    var totalCount = bucketTopStatsTotal(pag, rows);
    var topstatsTitle = pag
      ? BUCKET_QUAD_STATS_TITLE_WHEN_PAGED
      : "";
    var open = rows.filter(function (r) {
      var s = normalizeBucketStatus(r.status);
      return s === "new" || s === "pending" || s === "in_progress";
    }).length;
    var done = rows.filter(function (r) {
      return normalizeBucketStatus(r.status) === "done";
    }).length;
    var rejected = rows.filter(function (r) {
      return normalizeBucketStatus(r.status) === "rejected";
    }).length;

    var html =
      '<div class="bucket-shell bucket-shell--faults">' +
      '<div class="bucket-topstats bucket-topstats--quad"' +
      topstatsTitle +
      ">" +
      '<div class="bucket-stat"><span>Toplam</span><strong>' + esc(totalCount) + "</strong></div>" +
      '<div class="bucket-stat"><span>Beklemede</span><strong>' + esc(open) + "</strong></div>" +
      '<div class="bucket-stat"><span>Yapıldı</span><strong>' + esc(done) + "</strong></div>" +
      '<div class="bucket-stat"><span>Yapılmadı</span><strong>' + esc(rejected) + "</strong></div>" +
      "</div>" +
      '<p class="bucket-help bucket-help--faults">' +
      (ro
        ? "Salt izleme; durum teknik operasyon sayfasından. Misafir memnuniyeti burada kaydedilir."
        : "Kategori, lokasyon, aciliyet ve açıklama formdan. Personel notu dahilidir. Gelen kayıtlar operasyon WhatsApp (Cloud API) hattına düşer; gerekirse satırdaki WhatsApp ile tekrar gönderin.") +
      "</p>" +
      '<div class="bucket-toolbar bucket-toolbar--faults">' +
      '<label class="bucket-filter-date-label">Kayıt tarihi' +
      '<div class="reservation-date-combo bucket-toolbar-date-combo">' +
      '<input type="date" class="bucket-filter-date-native" />' +
      '<span class="reservation-date-combo__display">Tümü</span>' +
      '<button type="button" class="btn-small bucket-filter-date-clear" title="Tüm tarihler">Temizle</button>' +
      "</div></label>" +
      '<input class="bucket-search" type="search" placeholder="Oda, misafir, kategori, lokasyon, aciliyet, açıklama veya not ara..." />' +
      '<select class="bucket-filter-status">' +
      '<option value="all">Tüm Durumlar</option>' +
      '<option value="new_pending">Beklemede</option>' +
      '<option value="done">Yapıldı</option>' +
      '<option value="rejected">Yapılmadı</option>' +
      "</select>" +
      "</div>" +
      '<div class="viona-table-shell glass-block">' +
      '<div class="viona-table-scroll viona-table-scroll--compact">' +
      '<table class="admin-table viona-table admin-table--faults">' +
      "<thead><tr>" +
      "<th>Tarih</th><th>Oda</th><th>Misafir</th><th>Milliyet</th><th>Arıza kategorisi</th><th>Lokasyon</th><th>Aciliyet</th><th>Açıklama</th>" +
      (ro
        ? "<th>Personel notu (salt okunur)</th><th>Süre</th><th>Durum</th>" + (satH ? "<th>Misafir memnuniyeti</th>" : "<th></th>")
        : "<th>Personel notu</th><th>Süre</th><th>Durum</th><th>İşlemler</th>") +
      "</tr></thead><tbody>";

    if (!rows.length) {
      html += '<tr><td colspan="12" class="admin-table__empty">Henüz arıza kaydı yok.</td></tr>';
    } else {
      rows.forEach(function (r) {
        var st = normalizeBucketStatus(r.status);
        var fCatsR = faultEffectiveCategories(r);
        var fSingR = String(r.category || "").trim() || (fCatsR.length ? fCatsR[0] : "");
        var rawR = r.raw_payload && typeof r.raw_payload === "object" ? r.raw_payload : {};
        if (!fSingR) fSingR = String(rawR.category || "").trim();
        var catLabel = categoryText("fault", fCatsR, fSingR || null);
        var locLabel = faultLocationLabel(r);
        var urgLabel = faultUrgencyLabel(r);
        var descFull = faultFormDescription(r);
        var staffNote = getFaultStaffNote(r.id);
        var rowSearchText = [
          String(r.room_number || ""),
          operationGuestName(r),
          String(r.nationality || ""),
          catLabel,
          locLabel,
          urgLabel,
          descFull,
          staffNote,
        ]
          .join(" ")
          .toLowerCase();
        html +=
          '<tr class="bucket-row fault-row' +
          (ro && st === "new" ? " ops-row--new" : "") +
          bucketRowHighlightClass(handlers, r.id) +
          '" data-id="' +
          esc(r.id) +
          '" data-status="' +
          esc(st) +
          '" data-search="' +
          esc(rowSearchText) +
          '" data-cal-date="' +
          esc(submittedAtCalendarIso(bucketRowRecordTimestamp(r))) +
          '">';
        html += "<td>" + esc(formatSubmittedAtTr(bucketRowRecordTimestamp(r))) + "</td>";
        html += "<td>" + esc(r.room_number || "-") + "</td>";
        html += "<td>" + esc(operationGuestName(r) || "-") + "</td>";
        html += "<td>" + esc(r.nationality || "-") + "</td>";
        html += '<td><span class="cat-badge cat-badge--fault">' + esc(catLabel) + "</span></td>";
        html += '<td class="fault-cell-loc">' + esc(locLabel) + "</td>";
        html += '<td class="fault-cell-urg"><span class="fault-urg fault-urg--' + esc(String(faultRawUrgency(r) || "na")) + '">' + esc(urgLabel) + "</span></td>";
        html += '<td class="fault-cell-desc">' + esc(descFull) + "</td>";
        if (ro) {
          html += '<td class="request-cell-staff">' + esc(staffNote) + "</td>";
        } else {
          html +=
            '<td class="request-cell-staff"><textarea class="request-staff-note js-fault-staff-note" rows="2" data-id="' +
            esc(r.id) +
            '" placeholder="İç not">' +
            esc(staffNote) +
            "</textarea></td>";
        }
        html += '<td class="viona-sla-cell">' + esc(operationalSlaDisplayTr(r)) + "</td>";
        html += '<td><span class="status-badge status-' + esc(st) + '">' + esc(issueStatusLabel("fault", st)) + "</span></td>";
        if (ro) {
          html += satH ? "<td>" + satisfactionEditCellHtml("fault", r) + "</td>" : "<td></td>";
        } else {
          html += '<td><div class="row-actions">';
          html += issueRowActionsHtml("fault", r.id, st);
          html += "</div></td>";
        }
        html += "</tr>";
      });
    }

    html += "</tbody></table></div></div></div>";
    mountEl.innerHTML = html;
    if (handlers && handlers.pagination && handlers.onPage) {
      attachAdminPager(mountEl, handlers.pagination, rows, handlers.onPage);
    }

    wireAdminSatisfaction(mountEl, handlers);
    scrollBucketHighlightIntoView(mountEl);

    var search = mountEl.querySelector(".bucket-search");
    var statusFilter = mountEl.querySelector(".bucket-filter-status");
    var dateNat = mountEl.querySelector(".bucket-filter-date-native");
    var dateDisp = mountEl.querySelector(".bucket-toolbar-date-combo .reservation-date-combo__display");
    var dateClear = mountEl.querySelector(".bucket-filter-date-clear");

    function applyFilters() {
      var q = String((search && search.value) || "").trim().toLowerCase();
      var st = String((statusFilter && statusFilter.value) || "all");
      var dateIso = String((dateNat && dateNat.value) || "").slice(0, 10);
      mountEl.querySelectorAll(".fault-row").forEach(function (row) {
        var okStatus = rowMatchesStatusFilter(row.getAttribute("data-status"), st);
        var okSearch = !q || String(row.getAttribute("data-search") || "").indexOf(q) >= 0;
        var cal = row.getAttribute("data-cal-date") || "";
        var okDate = !dateIso || dateIso.length !== 10 || cal === dateIso;
        row.classList.toggle("hidden", !(okStatus && okSearch && okDate));
      });
    }

    function refreshFaultRowSearch(ta) {
      var tr = ta && ta.closest ? ta.closest("tr") : null;
      if (!tr) return;
      var id = String(ta.getAttribute("data-id") || "");
      var row = null;
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i].id) === id) {
          row = rows[i];
          break;
        }
      }
      if (!row) return;
      var fCatsS = faultEffectiveCategories(row);
      var fSingS = String(row.category || "").trim() || (fCatsS.length ? fCatsS[0] : "");
      var rawS = row.raw_payload && typeof row.raw_payload === "object" ? row.raw_payload : {};
      if (!fSingS) fSingS = String(rawS.category || "").trim();
      var catLabel = categoryText("fault", fCatsS, fSingS || null);
      var locLabel = faultLocationLabel(row);
      var urgLabel = faultUrgencyLabel(row);
      var descFull = faultFormDescription(row);
      var staffNote = String(ta.value || "");
      var rowSearchText = [
        String(row.room_number || ""),
        operationGuestName(row),
        String(row.nationality || ""),
        catLabel,
        locLabel,
        urgLabel,
        descFull,
        staffNote,
      ]
        .join(" ")
        .toLowerCase();
      tr.setAttribute("data-search", rowSearchText);
    }

    if (!ro) {
      mountEl.querySelectorAll(".js-fault-staff-note").forEach(function (ta) {
        ta.addEventListener("blur", function () {
          var id = String(ta.getAttribute("data-id") || "");
          setFaultStaffNote(id, ta.value);
          refreshFaultRowSearch(ta);
          applyFilters();
        });
      });

      mountEl.querySelectorAll(".js-status").forEach(function (btn) {
        btn.addEventListener("click", function () {
          handlers.onStatus(btn.getAttribute("data-type"), btn.getAttribute("data-id"), btn.getAttribute("data-status"));
        });
      });
      if (handlers && typeof handlers.onDelete === "function") {
        mountEl.querySelectorAll(".js-delete").forEach(function (btn) {
          btn.addEventListener("click", function () {
            handlers.onDelete(btn.getAttribute("data-type"), btn.getAttribute("data-id"));
          });
        });
      }
      wireWhatsappResendButtons(mountEl, handlers);
    }

    if (search) search.addEventListener("input", applyFilters);
    if (statusFilter) statusFilter.addEventListener("change", applyFilters);
    wireBucketToolbarDateControls(dateNat, dateDisp, dateClear, handlers, applyFilters);

    applyFilters();
  }

  /** Ops kart görünümü: kovaya göre etiket / değer (mobil; içerik türüne göre alanlar). */
  function operationOpsCardFields(bucketType, r) {
    var out = [];
    var gn = operationGuestName(r);
    var nat = String(r.nationality || "").trim();
    out.push({ k: "Kayıt", v: formatSubmittedAtTr(r.submitted_at) });
    out.push({ k: "Oda", v: String(r.room_number || "").trim() ? String(r.room_number) : "—" });
    if (gn) out.push({ k: "Misafir", v: gn });
    if (nat) out.push({ k: "Uyruk", v: nat });
    if (bucketType === "request") {
      var g = requestFormGroupLabel(r);
      var t = requestFormTypeLabel(r);
      var d = requestFormDescription(r);
      if (g) out.push({ k: "Grup", v: g });
      if (t) out.push({ k: "Tür", v: t });
      if (d) out.push({ k: "Açıklama", v: d, long: true });
    } else if (bucketType === "fault") {
      var fc = faultEffectiveCategories(r);
      var fs = String(r.category || "").trim() || (fc.length ? fc[0] : "");
      var rwf = r.raw_payload && typeof r.raw_payload === "object" ? r.raw_payload : {};
      if (!fs) fs = String(rwf.category || "").trim();
      var c = categoryText("fault", fc, fs || null);
      if (c && c !== "-" && c !== "—") out.push({ k: "Kategori", v: c });
      var locC = faultLocationLabel(r);
      if (locC && locC !== "—") out.push({ k: "Lokasyon", v: locC });
      var urgC = faultUrgencyLabel(r);
      if (urgC && urgC !== "—") out.push({ k: "Aciliyet", v: urgC });
      var fd = faultFormDescription(r);
      if (fd) out.push({ k: "Açıklama", v: fd, long: true });
    } else if (bucketType === "complaint" || bucketType === "guest_notification") {
      var c2 = categoryText(bucketType, r.categories, r.category);
      if (c2) out.push({ k: "Konu", v: c2 });
      var cd = complaintFormDescription(r);
      if (cd) out.push({ k: "Detay", v: cd, long: true });
    } else if (bucketType === "late_checkout") {
      if (r.checkout_date) out.push({ k: "Çıkış tarihi", v: String(r.checkout_date) });
      if (r.checkout_time) out.push({ k: "Çıkış saati", v: String(r.checkout_time) });
      var lcd = complaintFormDescription(r);
      if (lcd) out.push({ k: "Not", v: lcd, long: true });
    }
    out.push({ k: "Süre ölçümü", v: operationalSlaDisplayTr(r) });
    return out;
  }

  /** Mobil öncelikli kart listesi (`cfg.layout === "cards"`). */
  function renderOperationBucketCardsImpl(mountEl, cfg) {
    if (!mountEl || !cfg) return;
    var bucketType = cfg.bucketType;
    var rows = cfg.rows || [];
    var pagination = cfg.pagination;
    var onPage = cfg.onPage;
    var onStatus = cfg.onStatus;
    var onDelete = cfg.onDelete;
    var buttonLabels = cfg.buttonLabels || ["Bekliyor", "Yapılıyor", "Yapıldı", "Yapılmadı"];
    var highlightRowId = cfg.highlightRowId != null ? String(cfg.highlightRowId).trim() : "";
    var editableRowId = cfg.editableRowId != null ? String(cfg.editableRowId).trim() : "";
    function rowActionsEditable(rowId) {
      if (!editableRowId) return true;
      return String(rowId || "").trim().toLowerCase() === editableRowId.toLowerCase();
    }
    var statVals = [
      { v: "pending" },
      { v: "in_progress" },
      { v: "done" },
      { v: "rejected" },
    ];
    var opStatusBtnVariantClass =
      bucketType === "complaint" ||
      bucketType === "guest_notification" ||
      bucketType === "late_checkout"
        ? "op-status-btns--front op-status-btns--cards"
        : "op-status-btns--hktech op-status-btns--cards";
    function actionsBlockHtml(id, current, actionsOn) {
      var st = normalizeBucketStatus(current);
      var dis = actionsOn ? "" : " disabled";
      var roTitle = actionsOn ? "" : ' title="Bu bağlantıda yalnızca açılan kayıt değiştirilebilir"';
      var h = '<div class="op-status-btns ' + opStatusBtnVariantClass + '" data-op-id="' + esc(id) + '">';
      statVals.forEach(function (opt, i) {
        var on = st === opt.v || (st === "new" && opt.v === "pending");
        h +=
          '<button type="button" class="btn-small op-st js-op-st' +
          (on ? " is-active" : "") +
          '"' +
          dis +
          roTitle +
          ' data-status="' +
          esc(opt.v) +
          '">' +
          esc(buttonLabels[i] || opt.v) +
          "</button>";
      });
      h += "</div>";
      if (typeof onDelete === "function") {
        var delTitle = actionsOn ? "Kaydı kalıcı sil" : "Bu bağlantıda yalnızca açılan kayıt silinebilir";
        h +=
          '<button type="button" class="btn-small op-del op-del--card js-op-del" data-op-id="' +
          esc(id) +
          '"' +
          dis +
          ' title="' +
          esc(delTitle) +
          '">Sil</button>';
      }
      return h;
    }
    var html = '<div class="op-cards-shell glass-block"><div class="op-cards op-cards--ops">';
    if (!rows.length) {
      html += '<p class="op-cards-empty admin-table__empty">Kayıt yok.</p>';
    } else {
      rows.forEach(function (r) {
        var st = normalizeBucketStatus(r.status);
        var paletteClass =
          bucketType === "complaint" ||
          bucketType === "guest_notification" ||
          bucketType === "late_checkout"
            ? "op-card--palette-front"
            : "op-card--palette-hktech";
        var cardClasses = ["op-card", paletteClass];
        if (st === "new" || st === "pending") cardClasses.push("op-card--fresh");
        if (
          highlightRowId &&
          String(r.id || "").trim().toLowerCase() === highlightRowId.trim().toLowerCase()
        ) {
          cardClasses.push("op-card--deep");
        }
        if (editableRowId && !rowActionsEditable(r.id)) {
          cardClasses.push("op-card--readonly");
        }
        var fields = operationOpsCardFields(bucketType, r);
        var dl = '<dl class="op-card__dl">';
        fields.forEach(function (f) {
          var ddClass = f.long ? "op-card__dd op-card__dd--long" : "op-card__dd";
          dl +=
            '<div class="op-card__kv"><dt>' +
            esc(f.k) +
            '</dt><dd class="' +
            esc(ddClass) +
            '">' +
            esc(f.v) +
            "</dd></div>";
        });
        dl += "</dl>";
        html +=
          '<article class="' +
          esc(cardClasses.join(" ")) +
          '" data-op-row-id="' +
          esc(String(r.id)) +
          '">' +
          '<div class="op-card__top">' +
          '<span class="status-badge status-' +
          esc(st) +
          ' op-card__badge">' +
          esc(issueStatusLabel(bucketType, st)) +
          "</span></div>" +
          dl +
          '<div class="op-card__actions">' +
          actionsBlockHtml(r.id, r.status, rowActionsEditable(r.id)) +
          "</div></article>";
      });
    }
    html += "</div></div>";
    mountEl.innerHTML = html;
    if (pagination && typeof onPage === "function") {
      attachAdminPager(mountEl, pagination, rows, onPage);
    }
    if (typeof onStatus === "function") {
      mountEl.querySelectorAll(".js-op-st").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var cell = btn.closest(".op-status-btns");
          if (!cell) return;
          var id = cell.getAttribute("data-op-id");
          var status = btn.getAttribute("data-status");
          var p = onStatus(bucketType, id, status);
          if (p && typeof p.then === "function") {
            btn.disabled = true;
            p.finally(function () {
              btn.disabled = false;
            });
          }
        });
      });
    }
    if (typeof onDelete === "function") {
      mountEl.querySelectorAll(".js-op-del").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var id = btn.getAttribute("data-op-id");
          if (!id) return;
          if (
            !window.confirm(
              "Bu kaydı kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.",
            )
          ) {
            return;
          }
          var p = onDelete(bucketType, id);
          if (p && typeof p.then === "function") {
            btn.disabled = true;
            p.finally(function () {
              btn.disabled = false;
            });
          }
        });
      });
    }
  }

  /** Saha sekmeleri: hızlı durum düğmeleri (admin oturumu ile). */
  function renderOperationBucketImpl(mountEl, cfg) {
    if (!mountEl || !cfg) return;
    if (cfg.layout === "cards") {
      renderOperationBucketCardsImpl(mountEl, cfg);
      return;
    }
    var bucketType = cfg.bucketType;
    var rows = cfg.rows || [];
    var pagination = cfg.pagination;
    var onPage = cfg.onPage;
    var onStatus = cfg.onStatus;
    var onDelete = cfg.onDelete;
    var buttonLabels = cfg.buttonLabels || ["Bekliyor", "Yapılıyor", "Yapıldı", "Yapılmadı"];
    var highlightRowId = cfg.highlightRowId != null ? String(cfg.highlightRowId).trim() : "";
    /** Doluysa yalnızca bu satırda durum / sil düğmeleri etkin (tek kayıt / salt seçili satır modu). */
    var editableRowId = cfg.editableRowId != null ? String(cfg.editableRowId).trim() : "";
    function rowActionsEditable(rowId) {
      if (!editableRowId) return true;
      return String(rowId || "").trim().toLowerCase() === editableRowId.toLowerCase();
    }
    var summaryRow =
      cfg.summaryRow ||
      function (r) {
        try {
          return operationSummaryForType(bucketType, r);
        } catch (_e) {
          return "—";
        }
      };
    var statVals = [
      { v: "pending" },
      { v: "in_progress" },
      { v: "done" },
      { v: "rejected" },
    ];
    var opStatusBtnVariantClass =
      bucketType === "complaint" ||
      bucketType === "guest_notification" ||
      bucketType === "late_checkout"
        ? "op-status-btns--front"
        : "op-status-btns--hktech";
    var opTableVariantClass =
      bucketType === "complaint" ||
      bucketType === "guest_notification" ||
      bucketType === "late_checkout"
        ? "op-table--front"
        : "op-table--hktech";
    function actionsCellHtml(id, current, actionsOn) {
      var st = normalizeBucketStatus(current);
      var dis = actionsOn ? "" : " disabled";
      var roTitle = actionsOn ? "" : ' title="Bu bağlantıda yalnızca açılan kayıt değiştirilebilir"';
      var h = '<div class="op-actions-cell">';
      h +=
        '<div class="op-status-btns ' +
        opStatusBtnVariantClass +
        '" data-op-id="' +
        esc(id) +
        '">';
      statVals.forEach(function (opt, i) {
        var on = st === opt.v || (st === "new" && opt.v === "pending");
        h +=
          '<button type="button" class="btn-small op-st js-op-st' +
          (on ? " is-active" : "") +
          '"' +
          dis +
          roTitle +
          ' data-status="' +
          esc(opt.v) +
          '">' +
          esc(buttonLabels[i] || opt.v) +
          "</button>";
      });
      h += "</div>";
      if (typeof onDelete === "function") {
        var delTitle = actionsOn ? "Kaydı kalıcı sil" : "Bu bağlantıda yalnızca açılan kayıt silinebilir";
        h +=
          '<button type="button" class="btn-small op-del js-op-del" data-op-id="' +
          esc(id) +
          '"' +
          dis +
          ' title="' +
          esc(delTitle) +
          '">Sil</button>';
      }
      h += "</div>";
      return h;
    }
    var html =
      '<div class="viona-table-shell glass-block">' +
      '<div class="viona-table-scroll viona-table-scroll--ops">' +
      '<table class="admin-table viona-table op-table ' +
      opTableVariantClass +
      '">' +
      "<thead><tr>" +
      '<th scope="col" class="op-th-time">Kayıt</th>' +
      '<th scope="col" class="op-th-room">Oda</th>' +
      '<th scope="col" class="op-th-sum">Özet</th>' +
      '<th scope="col" class="op-th-sla">Süre</th>' +
      '<th scope="col" class="op-th-status">Durum</th>' +
      '<th scope="col" class="op-th-actions">İşlem</th>' +
      "</tr></thead><tbody>";
    if (!rows.length) {
      html += '<tr><td colspan="6" class="admin-table__empty">Kayıt yok.</td></tr>';
    } else {
      rows.forEach(function (r) {
        var st = normalizeBucketStatus(r.status);
        var trClasses = [];
        if (st === "new") trClasses.push("ops-row--new");
        if (
          highlightRowId &&
          String(r.id || "").trim().toLowerCase() === highlightRowId.trim().toLowerCase()
        ) {
          trClasses.push("ops-row--deep-link");
        }
        if (editableRowId && !rowActionsEditable(r.id)) {
          trClasses.push("ops-row--readonly");
        }
        var trCls = trClasses.length ? ' class="' + esc(trClasses.join(" ")) + '"' : "";
        var sum = String(summaryRow(r) || "—");
        if (sum.length > 140) sum = sum.slice(0, 137) + "…";
        html +=
          "<tr" +
          trCls +
          ' data-op-row-id="' +
          esc(String(r.id)) +
          '"><td>' +
          esc(formatSubmittedAtTr(r.submitted_at)) +
          "</td><td>" +
          esc(r.room_number || "—") +
          "</td><td>" +
          esc(sum) +
          '</td><td class="viona-sla-cell">' +
          esc(operationalSlaDisplayTr(r)) +
          '</td><td><span class="status-badge status-' +
          esc(st) +
          '">' +
          esc(issueStatusLabel(bucketType, st)) +
          "</span></td><td>" +
          actionsCellHtml(r.id, r.status, rowActionsEditable(r.id)) +
          "</td></tr>";
      });
    }
    html += "</tbody></table></div></div></div>";
    mountEl.innerHTML = html;
    if (pagination && typeof onPage === "function") {
      attachAdminPager(mountEl, pagination, rows, onPage);
    }
    if (typeof onStatus === "function") {
      mountEl.querySelectorAll(".js-op-st").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var cell = btn.closest(".op-status-btns");
          if (!cell) return;
          var id = cell.getAttribute("data-op-id");
          var status = btn.getAttribute("data-status");
          var p = onStatus(bucketType, id, status);
          if (p && typeof p.then === "function") {
            btn.disabled = true;
            p.finally(function () {
              btn.disabled = false;
            });
          }
        });
      });
    }
    if (typeof onDelete === "function") {
      mountEl.querySelectorAll(".js-op-del").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var id = btn.getAttribute("data-op-id");
          if (!id) return;
          if (
            !window.confirm(
              "Bu kaydı kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.",
            )
          ) {
            return;
          }
          var p = onDelete(bucketType, id);
          if (p && typeof p.then === "function") {
            btn.disabled = true;
            p.finally(function () {
              btn.disabled = false;
            });
          }
        });
      });
    }
  }

  /** Geç çıkış: panel tablosu ile aynı çıkış tarihi gösterimi. */
  function operationPdfLateCheckoutCheckoutDateDisp(r) {
    var raw = String((r && r.checkout_date) || "").slice(0, 10);
    if (raw.length === 10) return formatIsoDateDisplayTr(raw);
    return raw || "—";
  }

  /** Günlük operasyon PDF: admin tablosu ile aynı başlıklar (İşlemler sütunu yok). */
  function operationPdfTableHeaders(bucketType) {
    if (bucketType === "request") {
      return ["Tarih", "Oda", "Misafir", "Milliyet", "Kategori", "Tür", "Adet", "Açıklama", "Personel notu", "Durum"];
    }
    if (bucketType === "fault") {
      return [
        "Tarih",
        "Oda",
        "Misafir",
        "Milliyet",
        "Arıza kategorisi",
        "Lokasyon",
        "Aciliyet",
        "Açıklama",
        "Personel notu",
        "Durum",
      ];
    }
    if (bucketType === "complaint") {
      return ["Tarih", "Oda", "Misafir", "Milliyet", "Şikâyet konusu", "Açıklama", "Personel notu", "Durum"];
    }
    if (bucketType === "guest_notification") {
      return ["Tarih", "Oda", "Misafir", "Milliyet", "Bildirim konusu", "Açıklama", "Personel notu", "Durum"];
    }
    if (bucketType === "late_checkout") {
      return [
        "Kayıt",
        "Çıkış tarihi",
        "Çıkış saati",
        "Oda",
        "Misafir",
        "Milliyet",
        "Misafir notu",
        "Personel notu",
        "Durum",
      ];
    }
    return ["Tarih", "Oda", "Misafir", "Durum"];
  }

  /** Günlük operasyon PDF: panel tablosu ile aynı metinler (yerel personel notları dahil). */
  function operationPdfRowCells(bucketType, r) {
    if (!r || typeof r !== "object") return [];
    var st = normalizeBucketStatus(r.status);
    if (bucketType === "request") {
      return [
        formatSubmittedAtTr(r.submitted_at),
        String(r.room_number || "-"),
        String(r.guest_name || "-"),
        String(r.nationality || "-"),
        requestFormGroupLabel(r),
        requestFormTypeLabel(r),
        requestFormQuantityDisplay(r),
        requestFormDescription(r),
        getRequestStaffNote(r.id),
        issueStatusLabel("request", st),
      ];
    }
    if (bucketType === "fault") {
      var fCatsR = faultEffectiveCategories(r);
      var fSingR = String(r.category || "").trim() || (fCatsR.length ? fCatsR[0] : "");
      var rawR = r.raw_payload && typeof r.raw_payload === "object" ? r.raw_payload : {};
      if (!fSingR) fSingR = String(rawR.category || "").trim();
      var catLabel = categoryText("fault", fCatsR, fSingR || null);
      return [
        formatSubmittedAtTr(r.submitted_at),
        String(r.room_number || "-"),
        String(operationGuestName(r) || "-"),
        String(r.nationality || "-"),
        catLabel,
        faultLocationLabel(r),
        faultUrgencyLabel(r),
        faultFormDescription(r),
        getFaultStaffNote(r.id),
        issueStatusLabel("fault", st),
      ];
    }
    if (bucketType === "complaint") {
      var catC = categoryText("complaint", r.categories, r.category);
      return [
        formatSubmittedAtTr(r.submitted_at),
        String(r.room_number || "-"),
        String(r.guest_name || "-"),
        String(r.nationality || "-"),
        catC,
        complaintFormDescription(r),
        getComplaintStaffNote(r.id),
        issueStatusLabel("complaint", st),
      ];
    }
    if (bucketType === "guest_notification") {
      var catG = categoryText("guest_notification", r.categories, r.category);
      return [
        formatSubmittedAtTr(r.submitted_at),
        String(r.room_number || "-"),
        String(r.guest_name || "-"),
        String(r.nationality || "-"),
        catG,
        complaintFormDescription(r),
        getGuestNotifStaffNote(r.id),
        issueStatusLabel("guest_notification", st),
      ];
    }
    if (bucketType === "late_checkout") {
      var coTime = String(r.checkout_time || "").trim() || "—";
      return [
        formatSubmittedAtTr(r.submitted_at),
        operationPdfLateCheckoutCheckoutDateDisp(r),
        coTime,
        String(r.room_number || "-"),
        String(r.guest_name || "-"),
        String(r.nationality || "-"),
        complaintFormDescription(r),
        getLateCheckoutStaffNote(r.id),
        issueStatusLabel("late_checkout", st),
      ];
    }
    return [];
  }

  function operationSummaryForType(bucketType, r) {
    if (bucketType === "request") {
      return [
        requestFormGroupLabel(r),
        requestFormTypeLabel(r),
        requestFormDescription(r),
      ]
        .filter(Boolean)
        .join(" · ");
    }
    if (bucketType === "fault") {
      var fcats = faultEffectiveCategories(r);
      var fsingle = String(r.category || "").trim() || (fcats.length ? fcats[0] : "");
      var rawF = r.raw_payload && typeof r.raw_payload === "object" ? r.raw_payload : {};
      if (!fsingle) fsingle = String(rawF.category || "").trim();
      var partsOp = [];
      var gnf = operationGuestName(r);
      if (gnf) partsOp.push(gnf);
      var catLab = categoryText("fault", fcats, fsingle || null);
      if (catLab && catLab !== "-" && catLab !== "—") partsOp.push(catLab);
      var locLf = faultLocationLabel(r);
      if (locLf && locLf !== "—") partsOp.push(locLf);
      var urgLf = faultUrgencyLabel(r);
      if (urgLf && urgLf !== "—") partsOp.push(urgLf);
      var descF = faultFormDescription(r);
      if (descF && descF !== "—") partsOp.push(descF);
      return partsOp.length ? partsOp.join(" · ") : "—";
    }
    if (bucketType === "complaint" || bucketType === "guest_notification") {
      return [categoryText(bucketType, r.categories, r.category), complaintFormDescription(r)]
        .filter(Boolean)
        .join(" · ");
    }
    if (bucketType === "late_checkout") {
      return complaintFormDescription(r);
    }
    return "—";
  }

  function renderOperationFrontImpl(mountEl, packs, handlers, summary) {
    if (!mountEl) return;
    packs = packs || {};
    var onStatus = handlers && handlers.onStatus;
    var onPage = handlers && handlers.onPage;
    var onDelete = handlers && handlers.onDelete;
    var onTabChange = handlers && handlers.onTabChange;
    var onSat = handlers && handlers.onSatisfaction;
    var onWa = handlers && handlers.onWhatsappResend;
    var roFront = Boolean(handlers && handlers.readOnly);
    var initialHl = handlers && handlers.initialHighlight;
    var initialHlType = initialHl && initialHl.type ? String(initialHl.type).trim() : "";
    var initialHlRawId = initialHl && initialHl.id ? String(initialHl.id).trim() : "";

    var TAB_KEY = "viona_op_front_tab";
    var active = "complaint";
    try {
      var st = String(sessionStorage.getItem(TAB_KEY) || "").trim();
      if (st === "guest_notification" || st === "late_checkout" || st === "complaint") active = st;
    } catch (_e) {}

    function opFrontRowForType(typeKey) {
      var bt = summary && summary.byType && summary.byType[typeKey];
      if (!bt || typeof bt !== "object") {
        return { filtered: false, bekliyor: 0, islemde: 0, yapildi: 0, yapilmadi: 0, iptal: 0, toplam: 0 };
      }
      return {
        filtered: Boolean(bt.filtered),
        bekliyor: Number(bt.bekliyor) || 0,
        islemde: Number(bt.islemde) || 0,
        yapildi: Number(bt.yapildi) || 0,
        yapilmadi: Number(bt.yapilmadi) || 0,
        iptal: Number(bt.iptal) || 0,
        toplam: Number(bt.toplam) || 0,
      };
    }
    function opFrontOpenCount(row) {
      return row.bekliyor + row.islemde;
    }
    function opFrontStatLabels(typeKey) {
      if (typeKey === "late_checkout") {
        return ["Bekliyor", "Yapılıyor", "Onaylandı", "Onaylanmadı"];
      }
      return ["Bekliyor", "Yapılıyor", "Yapıldı", "Yapılmadı"];
    }
    function opFrontCatCardHtml(typeKey, title, row) {
      var labs = opFrontStatLabels(typeKey);
      if (row && row.filtered) {
        return (
          '<article class="op-front-cat-card" data-front-cat="' +
          esc(typeKey) +
          '"><h4 class="op-front-cat-card__title">' +
          esc(title) +
          '</h4><p class="op-front-cat-card__one"><span class="op-front-cat-card__k">Seçilen duruma göre</span> ' +
          '<strong class="op-front-cat-card__v">' +
          esc(String(row.toplam)) +
          "</strong> kayıt</p></article>"
        );
      }
      return (
        '<article class="op-front-cat-card" data-front-cat="' +
        esc(typeKey) +
        '"><h4 class="op-front-cat-card__title">' +
        esc(title) +
        '</h4><dl class="op-front-cat-card__dl">' +
        "<div><dt>" +
        esc(labs[0]) +
        '</dt><dd class="op-front-cat-card__dd--wait">' +
        esc(String(row.bekliyor)) +
        "</dd></div>" +
        "<div><dt>" +
        esc(labs[1]) +
        '</dt><dd>' +
        esc(String(row.islemde)) +
        "</dd></div>" +
        "<div><dt>" +
        esc(labs[2]) +
        '</dt><dd class="op-front-cat-card__dd--ok">' +
        esc(String(row.yapildi)) +
        "</dd></div>" +
        "<div><dt>" +
        esc(labs[3]) +
        '</dt><dd class="op-front-cat-card__dd--no">' +
        esc(String(row.yapilmadi)) +
        "</dd></div>" +
        (row.iptal > 0
          ? "<div><dt>İptal</dt><dd>" + esc(String(row.iptal)) + "</dd></div>"
          : "") +
        (row.digerCount > 0
          ? "<div><dt>Diğer</dt><dd>" + esc(String(row.digerCount)) + "</dd></div>"
          : "") +
        '<div class="op-front-cat-card__sum"><dt>Toplam</dt><dd>' +
        esc(String(row.toplam)) +
        "</dd></div></dl></article>"
      );
    }

    var summaryHtml = "";
    if (summary && summary.byType) {
      var anyFiltered = ["complaint", "guest_notification", "late_checkout"].some(function (k) {
        var r = opFrontRowForType(k);
        return r.filtered;
      });
      var headTitle = anyFiltered ? "Kategori özeti (en az bir süzgeçte durum seçili)" : "Kategori özeti (veritabanı canlı sayım)";
      var headMeta =
        "Üç kategori toplamı <strong>" +
        esc(String(summary.toplam != null ? summary.toplam : "0")) +
        "</strong> kayıt · Üstteki tek süzgeç yalnız <strong>seçili sekme</strong> listesine uygulanır; diğer iki kategorinin kayıtlı süzgeci ayrı kalır";
      if (summary._statusSumMismatch) {
        headMeta +=
          ' <span class="op-front-summary__hint">' +
          esc("Bir kategoride durum toplamları ile toplam kayıt uyumsuz olabilir; listeyi veya API özetini kontrol edin.") +
          "</span>";
      }
      summaryHtml =
        '<div class="op-front-summary glass-block" role="status">' +
        '<div class="op-front-summary__head">' +
        '<span class="op-front-summary__title">' +
        esc(headTitle) +
        '</span><span class="op-front-summary__meta">' +
        headMeta +
        "</span></div>" +
        '<div class="op-front-summary-cards' +
        (anyFiltered ? " op-front-summary-cards--filtered" : "") +
        '">' +
        opFrontCatCardHtml("complaint", "Şikâyetler", opFrontRowForType("complaint")) +
        opFrontCatCardHtml("guest_notification", "Misafir bildirimleri", opFrontRowForType("guest_notification")) +
        opFrontCatCardHtml("late_checkout", "Geç çıkış", opFrontRowForType("late_checkout")) +
        "</div></div>";
    }

    var tabs = [
      {
        key: "complaint",
        label: "Şikâyetler",
        labels: ["Bekliyor", "Yapılıyor", "Yapıldı", "Yapılmadı"],
      },
      {
        key: "guest_notification",
        label: "Misafir bildirimleri",
        labels: ["Bekliyor", "Yapılıyor", "Yapıldı", "Yapılmadı"],
      },
      { key: "late_checkout", label: "Geç çıkış", labels: ["Bekliyor", "Yapılıyor", "Onaylandı", "Onaylanmadı"] },
    ];
    var tabBtns = tabs
      .map(function (t) {
        var on = t.key === active ? " is-active" : "";
        var row = opFrontRowForType(t.key);
        var oc = opFrontOpenCount(row);
        var badge =
          summary && summary.byType && !row.filtered && oc > 0
            ? '<span class="op-front-tab__badge" title="Bekliyor + işlemde (açık iş)">' + esc(String(oc)) + "</span>"
            : "";
        return (
          '<button type="button" class="btn-small op-front-tab js-op-front-tab' +
          on +
          '" role="tab" aria-selected="' +
          (t.key === active ? "true" : "false") +
          '" data-front-tab="' +
          esc(t.key) +
          '"><span class="op-front-tab__label">' +
          esc(t.label) +
          "</span>" +
          badge +
          "</button>"
        );
      })
      .join("");

    mountEl.innerHTML =
      summaryHtml +
      '<div class="op-front-toolbar">' +
      '<div class="op-front-tabs" role="tablist">' +
      tabBtns +
      "</div></div>" +
      '<div class="op-front-panels"></div>';

    var panelsRoot = mountEl.querySelector(".op-front-panels");
    if (!panelsRoot) return;

    tabs.forEach(function (tab) {
      var wrap = document.createElement("div");
      wrap.className = "op-front-panel" + (tab.key === active ? "" : " hidden");
      wrap.setAttribute("role", "tabpanel");
      wrap.setAttribute("data-front-tab", tab.key);
      var pack = packs[tab.key] || {};
      var items = pack.items || [];
      var pagination = pack.pagination || null;
      var tableHandlers = {
        pagination: pagination,
        onPage:
          typeof onPage === "function"
            ? function (next) {
                onPage(tab.key, next);
              }
            : null,
        readOnly: roFront,
        onStatus: onStatus,
        onDelete:
          typeof onDelete === "function"
            ? function (bt, rid) {
                return onDelete(bt, rid);
              }
            : null,
        highlightRowId: initialHlRawId && initialHlType === tab.key ? initialHlRawId : "",
      };
      if (typeof onSat === "function") tableHandlers.onSatisfaction = onSat;
      if (typeof onWa === "function") tableHandlers.onWhatsappResend = onWa;
      if (handlers.toolbarCalendarSeedYmd) {
        tableHandlers.toolbarCalendarSeedYmd = handlers.toolbarCalendarSeedYmd;
      }
      if (typeof handlers.onToolbarCalendarDayChange === "function") {
        tableHandlers.onToolbarCalendarDayChange = handlers.onToolbarCalendarDayChange;
      }
      if (tab.key === "request") {
        renderRequestsPanel(wrap, items, tableHandlers);
      } else if (tab.key === "complaint") {
        renderComplaintsPanel(wrap, items, tableHandlers);
      } else if (tab.key === "guest_notification") {
        renderGuestNotificationsPanel(wrap, items, tableHandlers);
      } else if (tab.key === "late_checkout") {
        renderLateCheckoutsPanel(wrap, items, tableHandlers);
      } else {
        wrap.innerHTML = '<p class="admin-load-error">Bilinmeyen ön büro sekmesi.</p>';
      }
      panelsRoot.appendChild(wrap);
    });

    function activateFrontTab(k) {
      if (!k) return;
      try {
        sessionStorage.setItem(TAB_KEY, k);
      } catch (_e2) {}
      mountEl.querySelectorAll(".js-op-front-tab").forEach(function (b) {
        var is = b.getAttribute("data-front-tab") === k;
        b.classList.toggle("is-active", is);
        b.setAttribute("aria-selected", is ? "true" : "false");
      });
      mountEl.querySelectorAll(".op-front-panel").forEach(function (p) {
        p.classList.toggle("hidden", p.getAttribute("data-front-tab") !== k);
      });
    }
    function switchFrontTab(k) {
      if (!k) return;
      var prevBtn = mountEl.querySelector(".js-op-front-tab.is-active");
      var prevKey = prevBtn ? prevBtn.getAttribute("data-front-tab") : null;
      if (typeof onTabChange === "function") onTabChange(prevKey, k);
      activateFrontTab(k);
    }
    mountEl.querySelectorAll(".js-op-front-tab").forEach(function (btn) {
      btn.addEventListener("click", function () {
        switchFrontTab(btn.getAttribute("data-front-tab"));
      });
    });
    mountEl.querySelectorAll(".op-front-cat-card").forEach(function (card) {
      card.addEventListener("click", function () {
        switchFrontTab(card.getAttribute("data-front-cat"));
      });
    });
  }

  function formatYmdDotsFromCalendarIso(ymd) {
    var p = String(ymd || "").trim().split("-");
    if (p.length !== 3) return String(ymd || "").trim() || "—";
    return p[2] + "." + p[1] + "." + p[0];
  }

  /** HK / Teknik / Ön büro: bekleyen+yapılıyor kuyruğu özet şeridi (üst bilgi). */
  function renderOpsPendingQueueBannerImpl(mountEl, cfg) {
    if (!mountEl) return;
    cfg = cfg || {};
    var title = String(cfg.title || "Açık işler");
    var hint = String(cfg.hint || "");
    var rows = Array.isArray(cfg.rows) ? cfg.rows : [];
    var hideWhenEmpty = cfg.hideWhenEmpty !== false;
    var maxRows = Math.min(24, Math.max(4, Number(cfg.maxRows) || 12));

    if (!rows.length && hideWhenEmpty) {
      mountEl.innerHTML = "";
      return;
    }

    if (!rows.length) {
      mountEl.innerHTML =
        '<div class="ops-pending-queue ops-pending-queue--empty glass-block" role="status">' +
        '<div class="ops-pending-queue__head">' +
        '<span class="ops-pending-queue__title">' +
        esc(title) +
        '</span></div><p class="ops-pending-queue__empty">' +
        esc(cfg.emptyText || "Bu aralıkta bekleyen veya yapılıyor kaydı yok.") +
        "</p>" +
        (hint ? '<p class="ops-pending-queue__hint">' + esc(hint) + "</p>" : "") +
        "</div>";
      return;
    }

    var showing = rows.slice(0, maxRows);
    var more = rows.length - showing.length;
    var lines = showing.map(function (item) {
      var bt = item.bucketType;
      var r = item.row || {};
      var sum = operationSummaryForType(bt, r);
      var calDay = submittedAtCalendarIso(r.submitted_at);
      var dayDots = formatYmdDotsFromCalendarIso(calDay);
      var sla = operationalSlaDisplayTr(r);
      var st = normalizeBucketStatus(r.status);
      var badge =
        st === "in_progress"
          ? '<span class="ops-pending-queue__badge ops-pending-queue__badge--prog">Yapılıyor</span>'
          : '<span class="ops-pending-queue__badge ops-pending-queue__badge--wait">Bekliyor</span>';
      var typeLab =
        bt === "request"
          ? "İstek"
          : bt === "fault"
            ? "Arıza"
            : bt === "complaint"
              ? "Şikâyet"
              : bt === "guest_notification"
                ? "Bildirim"
                : bt === "late_checkout"
                  ? "Geç çıkış"
                  : String(bt || "");
      var room = String(r.room_number || "").trim();
      var roomHtml = room
        ? '<span class="ops-pending-queue__room">Oda ' + esc(room) + "</span>"
        : "";
      return (
        '<li class="ops-pending-queue__item">' +
        '<div class="ops-pending-queue__item-top">' +
        badge +
        '<span class="ops-pending-queue__type">' +
        esc(typeLab) +
        "</span>" +
        roomHtml +
        '<span class="ops-pending-queue__day" title="Kayıt günü (otel takvimi)">' +
        esc(dayDots) +
        "</span>" +
        "</div>" +
        '<div class="ops-pending-queue__sum">' +
        esc(sum) +
        "</div>" +
        '<div class="ops-pending-queue__sla">' +
        esc(sla) +
        "</div>" +
        "</li>"
      );
    });

    mountEl.innerHTML =
      '<div class="ops-pending-queue glass-block" role="region" aria-live="polite" aria-label="' +
      esc(title) +
      '">' +
      '<div class="ops-pending-queue__head">' +
      '<span class="ops-pending-queue__title">' +
      esc(title) +
      "</span>" +
      (hint ? '<span class="ops-pending-queue__meta">' + esc(hint) + "</span>" : "") +
      "</div>" +
      '<ul class="ops-pending-queue__list" role="list">' +
      lines.join("") +
      "</ul>" +
      (more > 0
        ? '<p class="ops-pending-queue__more">+' + esc(String(more)) + " kayıt daha (listede süzün)</p>"
        : "") +
      "</div>";
  }

  /** HK / Teknik ops-light: ön büro özet kartıyla aynı sınıflar, tek kova. */
  function renderOpsSingleBucketSummaryImpl(mountEl, cfg) {
    if (!mountEl) return;
    cfg = cfg || {};
    var bucketType = String(cfg.bucketType || "request").trim();
    var row = cfg.row || {};
    var filtered = Boolean(row.filtered);
    var title =
      bucketType === "fault"
        ? "Arıza kayıtları"
        : bucketType === "request"
          ? "Misafir istekleri"
          : "Özet";
    var labs = ["Bekliyor", "Yapılıyor", "Yapıldı", "Yapılmadı"];
    var headTitle = filtered ? "Özet (seçilen duruma göre)" : "Özet (veritabanı canlı sayım)";
    var headMeta =
      bucketType === "fault"
        ? "Teknik liste ile aynı süzgeç ve canlı sayım. Tablodan durum güncelleyince kart yenilenir."
        : "HK listesi ile aynı süzgeç ve canlı sayım. Tablodan durum güncelleyince kart yenilenir.";
    if (!filtered) {
      if (row._statusSumMismatch) {
        headMeta +=
          " Durum toplamı ile kayıt sayısı uyumsuz; özet API veya veriyi kontrol edin.";
      } else if (row._multiPageList && !row._reconciledFromList) {
        headMeta +=
          " Çok sayfalı liste: durum kırılımı özet API üzerinden (tüm sayfaları kapsar).";
      }
    }
    var cardsClass = "op-front-summary-cards" + (filtered ? " op-front-summary-cards--filtered" : "");
    var cardHtml;
    if (filtered) {
      cardHtml =
        '<article class="op-front-cat-card" data-ops-sum="' +
        esc(bucketType) +
        '"><h4 class="op-front-cat-card__title">' +
        esc(title) +
        '</h4><p class="op-front-cat-card__one"><span class="op-front-cat-card__k">Seçilen duruma göre</span> ' +
        '<strong class="op-front-cat-card__v">' +
        esc(String(row.toplam != null ? row.toplam : "0")) +
        "</strong> kayıt</p></article>";
    } else {
      cardHtml =
        '<article class="op-front-cat-card" data-ops-sum="' +
        esc(bucketType) +
        '"><h4 class="op-front-cat-card__title">' +
        esc(title) +
        '</h4><dl class="op-front-cat-card__dl">' +
        "<div><dt>" +
        esc(labs[0]) +
        '</dt><dd class="op-front-cat-card__dd--wait">' +
        esc(String(row.bekliyor != null ? row.bekliyor : "0")) +
        "</dd></div>" +
        "<div><dt>" +
        esc(labs[1]) +
        '</dt><dd>' +
        esc(String(row.islemde != null ? row.islemde : "0")) +
        "</dd></div>" +
        "<div><dt>" +
        esc(labs[2]) +
        '</dt><dd class="op-front-cat-card__dd--ok">' +
        esc(String(row.yapildi != null ? row.yapildi : "0")) +
        "</dd></div>" +
        "<div><dt>" +
        esc(labs[3]) +
        '</dt><dd class="op-front-cat-card__dd--no">' +
        esc(String(row.yapilmadi != null ? row.yapilmadi : "0")) +
        "</dd></div>" +
        (row.iptal > 0
          ? "<div><dt>İptal</dt><dd>" + esc(String(row.iptal)) + "</dd></div>"
          : "") +
        (row.digerCount > 0
          ? "<div><dt>Diğer</dt><dd>" + esc(String(row.digerCount)) + "</dd></div>"
          : "") +
        '<div class="op-front-cat-card__sum"><dt>Toplam</dt><dd>' +
        esc(String(row.toplam != null ? row.toplam : "0")) +
        "</dd></div></dl></article>";
    }
    mountEl.innerHTML =
      '<div class="op-front-summary glass-block" role="status">' +
      '<div class="op-front-summary__head">' +
      '<span class="op-front-summary__title">' +
      esc(headTitle) +
      '</span><span class="op-front-summary__meta">' +
      esc(headMeta) +
      "</span></div>" +
      '<div class="' +
      cardsClass +
      '">' +
      cardHtml +
      "</div></div>";
  }

  /** Oda detayı süzgeci: istek/arıza kategori `<select>` iç HTML (REQUESTS_CONFIG + panel etiketleri). */
  function adminRoomCategoryFilterSelectInnerHtml(bucketType) {
    var bt = bucketType === "fault" ? "fault" : "request";
    var cfg = typeof window !== "undefined" ? window.REQUESTS_CONFIG : null;
    var items =
      bt === "fault"
        ? (cfg && cfg.categories && cfg.categories.fault) || []
        : (cfg && cfg.categories && cfg.categories.request) || [];
    var html = '<option value="">Tüm kategoriler</option>';
    items.forEach(function (it) {
      var id = String((it && it.id) || "").trim();
      if (!id) return;
      var group = REQUEST_GROUP_LABELS[id] || "";
      var spec =
        (CATEGORY_LABELS.request && CATEGORY_LABELS.request[id]) ||
        (CATEGORY_LABELS.fault && CATEGORY_LABELS.fault[id]) ||
        "";
      var label = spec || group || id;
      if (group && spec && group !== spec) {
        label = group + " · " + spec;
      }
      html += '<option value="' + esc(id) + '">' + esc(label) + "</option>";
    });
    return html;
  }

  window.AdminUI = {
    getRoomCategoryFilterSelectInnerHtml: adminRoomCategoryFilterSelectInnerHtml,
    renderKpis: function (el, kpis) {
      if (!el) return;
      el.innerHTML = "";
      kpis = kpis || {};
      var fb = kpis.fallbackRate != null ? kpis.fallbackRate + "%" : "—";
      var cards = [
        {
          title: "Toplam sohbet sayısı",
          value: kpis.totalChats != null ? kpis.totalChats : "—",
          hint: "Tarih boşken pano ile aynı pencere (son ~30 gün); test kayıtları hariç.",
        },
        {
          title: "Fallback Oranı",
          value: fb,
          hint: "Yanıt üretilemeyen mesajların payı",
        },
        {
          title: "Genel Memnuniyet",
          value: kpis.overallSatisfaction != null ? kpis.overallSatisfaction : "—",
          hint: "Otel anketi ortalaması (1–5)",
        },
        {
          title: "Viona Memnuniyet",
          value: kpis.vionaSatisfaction != null ? kpis.vionaSatisfaction : "—",
          hint: "Viona anketi ortalaması (1–5)",
        },
      ];
      cards.forEach(function (c) {
        var d = document.createElement("div");
        d.className = "kpi-card";
        d.innerHTML =
          '<h4 class="kpi-card__title">' +
          esc(c.title) +
          "</h4>" +
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
    renderSurveyEvaluations: function (mountEl, report) {
      if (!mountEl) return;
      function barTierClass(avg) {
        var a = Number(avg);
        if (!Number.isFinite(a) || a <= 0) return "";
        if (a < 2.5) return " eval-bar__fill--low";
        if (a < 3.75) return " eval-bar__fill--mid";
        return " eval-bar__fill--high";
      }
      if (!report || typeof report !== "object") {
        mountEl.innerHTML =
          '<p class="eval-empty">Rapor yüklenemedi veya veri yok. Tarih aralığını kontrol edip yeniden deneyin.</p>';
        return;
      }
      var qb = report.questionBreakdown || { hotel: {}, viona: {} };
      var hotel = qb.hotel || {};
      var viona = qb.viona || {};
      var byCat = report.byCategory || {};
      var totals = report.totals || {};
      var byLang = report.byLanguage || {};
      var sub = totals.submissions != null ? totals.submissions : 0;
      var avgO = totals.avgOverall != null && totals.avgOverall > 0 ? String(totals.avgOverall) : "—";
      var avgV = totals.avgViona != null && totals.avgViona > 0 ? String(totals.avgViona) : "—";

      var langBits = Object.keys(byLang)
        .sort()
        .map(function (k) {
          return '<span class="eval-lang-chip">' + esc(String(k).toUpperCase()) + " · " + esc(byLang[k]) + "</span>";
        })
        .join("");

      function weightedAvgFromQuestionStats(questionIds, bucket) {
        var sumW = 0;
        var sumC = 0;
        questionIds.forEach(function (qid) {
          var st = bucket[qid];
          if (!st || st.avg == null || Number(st.avg) <= 0) return;
          var c = Number(st.count) || 0;
          if (c <= 0) return;
          sumW += Number(st.avg) * c;
          sumC += c;
        });
        if (sumC <= 0) return null;
        return sumW / sumC;
      }

      function avgOfCategoryKeys(keys, catMap) {
        var vals = [];
        (keys || []).forEach(function (k) {
          var v = Number(catMap[k]);
          if (Number.isFinite(v) && v > 0) vals.push(v);
        });
        if (!vals.length) return null;
        return vals.reduce(function (a, b) {
          return a + b;
        }, 0) / vals.length;
      }

      function collectSectionQuestionIds(sec) {
        var ids = [];
        if (sec.subgroups && sec.subgroups.length) {
          sec.subgroups.forEach(function (sg) {
            (sg.questions || []).forEach(function (q) {
              ids.push(q.id);
            });
          });
        } else if (sec.questions) {
          sec.questions.forEach(function (q) {
            ids.push(q.id);
          });
        }
        return ids;
      }

      function questionRowHtml(q, bucket) {
        var st = bucket[q.id];
        var has = st && st.avg != null && Number(st.avg) > 0;
        var avgStr = has ? Number(st.avg).toFixed(2) : "—";
        var cnt = st && st.count != null ? st.count : 0;
        var pct = has ? Math.min(100, Math.round((Number(st.avg) / 5) * 100)) : 0;
        var qTier = has ? barTierClass(st.avg) : "";
        return (
          '<div class="eval-question">' +
          '<div class="eval-question__row">' +
          '<div class="eval-question__main">' +
          '<span class="eval-question__label">' +
          esc(q.label) +
          "</span>" +
          '<div class="eval-bar" role="presentation" aria-hidden="true"><span class="eval-bar__fill' +
          qTier +
          '" style="width:' +
          pct +
          '%"></span></div>' +
          "</div>" +
          '<div class="eval-question__meta">' +
          '<span class="eval-question__score-num">' +
          esc(avgStr) +
          '<span class="eval-question__denom">/5</span></span>' +
          (cnt > 0
            ? '<span class="eval-question__n" title="Bu soruya 1–5 puanı kayıtlı anket satırı sayısı">' +
              esc(cnt) +
              " kayıt</span>"
            : '<span class="eval-question__n eval-question__n--empty">veri yok</span>') +
          "</div>" +
          "</div>" +
          "</div>"
        );
      }

      var sectionsHtml = SURVEY_EVAL_SECTIONS.map(function (sec, si) {
        var bucket = sec.isViona ? viona : hotel;
        var catAvg = null;
        if (sec.isViona) {
          var v0 = Number(byCat[sec.tabId]);
          if (Number.isFinite(v0) && v0 > 0) catAvg = v0;
          if (catAvg == null || Number(catAvg) <= 0) {
            var qv = (sec.questions || []).map(function (q) {
              return q.id;
            });
            var dv = weightedAvgFromQuestionStats(qv, viona);
            if (dv != null && Number(dv) > 0) catAvg = dv;
          }
        } else if (sec.categoryKeys && sec.categoryKeys.length) {
          catAvg = avgOfCategoryKeys(sec.categoryKeys, byCat);
        } else if (sec.tabId) {
          var tv = Number(byCat[sec.tabId]);
          if (Number.isFinite(tv) && tv > 0) catAvg = tv;
        }
        var catOk = catAvg != null && Number(catAvg) > 0;
        if (!catOk && !sec.isViona) {
          var d2 = weightedAvgFromQuestionStats(collectSectionQuestionIds(sec), hotel);
          if (d2 != null && Number(d2) > 0) {
            catAvg = d2;
            catOk = true;
          }
        }
        var catStr = catOk ? Number(catAvg).toFixed(2) : "—";
        var catPct = catOk ? Math.min(100, Math.round((Number(catAvg) / 5) * 100)) : 0;
        var catTier = catOk ? barTierClass(catAvg) : "";
        var vionaCatHint =
          sec.isViona && catOk
            ? '<p class="eval-section__cat-hint">Aşağıdaki soru puanlarından ağırlıklı hesaplanır.</p>'
            : "";
        var multiHint =
          !sec.isViona && sec.subgroups && sec.subgroups.length
            ? '<p class="eval-section__cat-hint">Çoklu alt başlık: üst ortalama, alt kategori özetlerinin ortalaması veya soru verisinden türetilir.</p>'
            : "";

        var rowsHtml = "";
        if (sec.subgroups && sec.subgroups.length) {
          rowsHtml = sec.subgroups
            .map(function (sg) {
              var sk = sg.categoryKey ? byCat[sg.categoryKey] : null;
              var sgOk = sk != null && Number(sk) > 0;
              var sgStr = sgOk ? Number(sk).toFixed(2) : "—";
              var inner = (sg.questions || []).map(function (q) {
                return questionRowHtml(q, hotel);
              }).join("");
              return (
                '<div class="eval-subgroup">' +
                '<div class="eval-subgroup__head">' +
                '<h4 class="eval-subgroup__title">' +
                esc(sg.title) +
                "</h4>" +
                (sg.categoryKey
                  ? '<span class="eval-subgroup__avg" title="Bu alt başlık için hotel_categories.' +
                    esc(sg.categoryKey) +
                    '">' +
                    esc(sgStr) +
                    '<span class="eval-subgroup__avg-denom">/5</span></span>'
                  : "") +
                "</div>" +
                '<div class="eval-subgroup__body">' +
                inner +
                "</div>" +
                "</div>"
              );
            })
            .join("");
        } else {
          rowsHtml = (sec.questions || [])
            .map(function (q) {
              return questionRowHtml(q, bucket);
            })
            .join("");
        }

        return (
          '<article class="eval-section glass-block">' +
          '<div class="eval-section__badge" aria-hidden="true">' +
          esc(String(si + 1)) +
          "</div>" +
          '<header class="eval-section__head">' +
          '<div class="eval-section__titles">' +
          '<h3 class="eval-section__title">' +
          esc(sec.title) +
          "</h3>" +
          "</div>" +
          '<div class="eval-section__cat" aria-label="Başlık ortalaması">' +
          '<p class="eval-section__cat-label">Başlık ortalaması</p>' +
          vionaCatHint +
          multiHint +
          '<span class="eval-section__cat-value">' +
          esc(catStr) +
          '</span><span class="eval-section__cat-denom">/5</span>' +
          '<div class="eval-bar eval-bar--cat" role="presentation"><span class="eval-bar__fill' +
          catTier +
          '" style="width:' +
          catPct +
          '%"></span></div>' +
          "</div>" +
          "</header>" +
          '<div class="eval-section__body">' +
          rowsHtml +
          "</div>" +
          "</article>"
        );
      }).join("");

      var truncWarn =
        report.rowsTruncated === true
          ? '<p class="eval-truncation-warn" role="status">Veri hacmi yüksek: rapor üst sınıra takıldı. Dönemi daraltın.</p>'
          : "";

      mountEl.innerHTML =
        '<div class="eval-report">' +
        truncWarn +
        '<div class="eval-summary glass-block">' +
        '<h3 class="eval-summary__title">Özet</h3>' +
        '<p class="eval-summary__lead">' +
        "Her satır kısmi gönderim olabilir (<code>hotel_categories</code> tek anahtar içerir). " +
        "Özet puan: <code>overall_score</code> dolu satırların ortalaması; boşsa kategori veya soru ortalamalarından türetilir. " +
        "Viona: <code>viona_rating</code> veya dört Viona sorusunun ağırlıklı ortalaması. " +
        "Yemek ve havuz/plaj bloklarında üst ortalama, alt başlık özetlerinin aritmetiğidir (yalnızca pozitif değerler)." +
        "</p>" +
        '<div class="eval-summary__grid">' +
        '<div class="eval-summary__item"><span class="eval-summary__k">Toplam kayıt</span><span class="eval-summary__v">' +
        esc(sub) +
        "</span></div>" +
        '<div class="eval-summary__item"><span class="eval-summary__k">Özet puan (tüm satırlar)</span><span class="eval-summary__v">' +
        esc(avgO) +
        '</span><span class="eval-summary__hint">/5</span></div>' +
        '<div class="eval-summary__item"><span class="eval-summary__k">Viona asistan</span><span class="eval-summary__v">' +
        esc(avgV) +
        '</span><span class="eval-summary__hint">/5</span></div>' +
        "</div>" +
        (langBits
          ? '<div class="eval-summary__langs"><span class="eval-summary__langs-label">Dil</span>' +
            langBits +
            "</div>"
          : "") +
        "</div>" +
        '<div class="eval-sections">' +
        sectionsHtml +
        "</div>" +
        '<p class="eval-footnote">Seçilen dönemdeki anket kayıtları.</p>' +
        "</div>";
    },
    wireWhatsappResendButtons: wireWhatsappResendButtons,
    renderBucketTable: function (mountEl, type, rows, handlers) {
      if (type === "request") {
        renderRequestsPanel(mountEl, rows || [], handlers);
        return;
      }
      if (type === "complaint") {
        renderComplaintsPanel(mountEl, rows || [], handlers);
        return;
      }
      if (type === "guest_notification") {
        renderGuestNotificationsPanel(mountEl, rows || [], handlers);
        return;
      }
      if (type === "late_checkout") {
        renderLateCheckoutsPanel(mountEl, rows || [], handlers);
        return;
      }
      if (type === "fault") {
        renderFaultsPanel(mountEl, rows || [], handlers);
        return;
      }
      if (type === "reservation") {
        mountEl.innerHTML =
          '<p class="admin-load-error">Bu liste türü devre dışıdır; panelden kaldırılmıştır.</p>';
        return;
      }
      rows = rows || [];
      var pagGeneric = handlers && handlers.pagination;
      if (!rows.length && (!pagGeneric || (pagGeneric.total || 0) === 0)) {
        mountEl.innerHTML = "<p>Kayıt yok.</p>";
        return;
      }
      var totalCount = bucketTopStatsTotal(pagGeneric, rows);
      var topstatsTitleGen = pagGeneric
        ? BUCKET_QUAD_STATS_TITLE_WHEN_PAGED
        : "";
      var open = rows.filter(function (r) {
        var s = normalizeBucketStatus(r.status);
        return s === "new" || s === "pending" || s === "in_progress";
      }).length;
      var done = rows.filter(function (r) {
        return normalizeBucketStatus(r.status) === "done";
      }).length;
      var rejected = rows.filter(function (r) {
        return normalizeBucketStatus(r.status) === "rejected";
      }).length;
      var negLabel = type === "late_checkout" ? "Onaylanmadı" : "Yapılmadı";
      var posLabel = type === "late_checkout" ? "Onaylandı" : "Yapıldı";
      var html =
        '<div class="bucket-shell">' +
        '<div class="bucket-topstats bucket-topstats--quad"' +
        topstatsTitleGen +
        ">" +
        '<div class="bucket-stat"><span>Toplam</span><strong>' + esc(totalCount) + "</strong></div>" +
        '<div class="bucket-stat"><span>Beklemede</span><strong>' + esc(open) + "</strong></div>" +
        '<div class="bucket-stat"><span>' +
        esc(posLabel) +
        '</span><strong>' +
        esc(done) +
        "</strong></div>" +
        '<div class="bucket-stat"><span>' +
        esc(negLabel) +
        '</span><strong>' +
        esc(rejected) +
        "</strong></div>" +
        "</div>" +
        '<p class="bucket-help">' +
        esc(typeLabel(type)) +
        ": ilk kayıt beklemede. Durumlar birbirine çevrilebilir (geç çıkışta onay dili). Süre sütunu bildirimden çözüme kadar geçen süreyi gösterir. Uygun kayıtlar operasyon WhatsApp (Cloud API) hattına gider; gerekirse satırdaki WhatsApp ile tekrar gönderin.</p>" +
        '<div class="bucket-toolbar">' +
        '<input class="bucket-search" type="search" placeholder="Oda, misafir veya detay ara..." />' +
        '<select class="bucket-filter-status">' +
        '<option value=\"all\">Tüm Durumlar</option>' +
        '<option value=\"new_pending\">Beklemede</option>' +
        '<option value=\"done\">' +
        esc(posLabel) +
        '</option>' +
        '<option value=\"rejected\">' +
        esc(negLabel) +
        "</option>" +
        "</select>" +
        "</div>" +
        '<div class="viona-table-shell glass-block"><div class="viona-table-scroll viona-table-scroll--compact"><table class="admin-table viona-table"><thead><tr><th>Tarih</th><th>Tip</th><th>Oda</th><th>Misafir</th><th>Milliyet</th><th>Kategori</th><th>Detay</th><th>Durum</th><th>İşlemler</th></tr></thead><tbody>';
      if (!rows.length) {
        html += '<tr><td colspan="9" class="admin-table__empty">Bu sayfada kayıt yok.</td></tr>';
      } else {
        rows.forEach(function (r) {
          var st = normalizeBucketStatus(r.status);
          var typeText = typeLabel(type);
          var detailText = issueDetailText(r, type);
          var catCell;
          if (type === "fault") {
            var fcg = faultEffectiveCategories(r);
            var fsg = String(r.category || "").trim() || (fcg.length ? fcg[0] : "");
            var rawg = r.raw_payload && typeof r.raw_payload === "object" ? r.raw_payload : {};
            if (!fsg) fsg = String(rawg.category || "").trim();
            catCell = categoryText("fault", fcg, fsg || null);
          } else {
            catCell = categoryText(type, r.categories, r.category);
          }
          var rowSearchText = [
            String(r.room_number || ""),
            operationGuestName(r),
            String(detailText || ""),
          ]
            .join(" ")
            .toLowerCase();
          html += '<tr class="bucket-row" data-status="' + esc(st) + '" data-search="' + esc(rowSearchText) + '">';
          html += "<td>" + esc(formatSubmittedAtTr(r.submitted_at)) + "</td>";
          html += "<td>" + esc(typeText) + "</td>";
          html += "<td>" + esc(r.room_number || "-") + "</td>";
          html += "<td>" + esc(operationGuestName(r) || "-") + "</td>";
          html += "<td>" + esc(r.nationality || "-") + "</td>";
          html += "<td>" + esc(catCell) + "</td>";
          html += "<td>" + esc(detailText) + "</td>";
          html += '<td><span class="status-badge status-' + esc(st) + '">' + esc(issueStatusLabel(type, st)) + "</span></td>";
          html += '<td><div class="row-actions">';
          html += issueRowActionsHtml(type, r.id, st);
          html += "</div></td>";
          html += "</tr>";
        });
      }
      html += "</tbody></table></div></div></div>";
      mountEl.innerHTML = html;
      if (handlers && handlers.pagination && handlers.onPage) {
        attachAdminPager(mountEl, handlers.pagination, rows, handlers.onPage);
      }

      mountEl.querySelectorAll(".js-status").forEach(function (btn) {
        btn.addEventListener("click", function () {
          handlers.onStatus(btn.getAttribute("data-type"), btn.getAttribute("data-id"), btn.getAttribute("data-status"));
        });
      });
      if (handlers && typeof handlers.onDelete === "function") {
        mountEl.querySelectorAll(".js-delete").forEach(function (btn) {
          btn.addEventListener("click", function () {
            handlers.onDelete(btn.getAttribute("data-type"), btn.getAttribute("data-id"));
          });
        });
      }
      wireWhatsappResendButtons(mountEl, handlers);

      var search = mountEl.querySelector(".bucket-search");
      var statusFilter = mountEl.querySelector(".bucket-filter-status");
      function applyFilters() {
        var q = String((search && search.value) || "").trim().toLowerCase();
        var st = String((statusFilter && statusFilter.value) || "all");
        mountEl.querySelectorAll(".bucket-row").forEach(function (row) {
          var okStatus = rowMatchesStatusFilter(row.getAttribute("data-status"), st);
          var okSearch = !q || String(row.getAttribute("data-search") || "").indexOf(q) >= 0;
          row.classList.toggle("hidden", !(okStatus && okSearch));
        });
      }
      if (search) search.addEventListener("input", applyFilters);
      if (statusFilter) statusFilter.addEventListener("change", applyFilters);
    },
    renderLogsSummary: function (mountEl, summary) {
      if (!mountEl) return;
      var s = summary || {};
      var total = s.total != null ? s.total : 0;
      function card(mod, label, value, hint) {
        return (
          '<div class="logs-kpi-card ' +
          mod +
          '">' +
          '<p class="logs-kpi-card__label">' +
          esc(label) +
          "</p>" +
          '<p class="logs-kpi-card__value">' +
          esc(value) +
          "</p>" +
          '<p class="logs-kpi-card__hint">' +
          esc(hint) +
          "</p>" +
          "</div>"
        );
      }
      mountEl.innerHTML =
        '<div class="logs-kpi-grid logs-kpi-grid--three" role="list">' +
        card(
          "logs-kpi-card--total",
          "Toplam sohbet sayısı",
          String(total),
          "Tarih boşken pano ile aynı pencere (son ~30 gün); test kayıtları hariç. Diğer filtreler uygulanır.",
        ) +
        card("logs-kpi-card--fallback", "Fallback oranı", String(s.fallbackRate || 0) + "%", "Fallback katmanına düşenlerin payı") +
        card("logs-kpi-card--multi", "Çoklu niyet", String(s.multiIntentRate || 0) + "%", "Birden fazla konu işaretli mesajların payı") +
        "</div>";
    },
    renderLogsTable: function (mountEl, rows, handlers) {
      if (!mountEl) return;
      var pag = handlers && handlers.pagination;
      if (!rows || !rows.length) {
        mountEl.innerHTML = '<p class="logs-empty">Bu filtrelerle eşleşen kayıt yok. Tarih aralığını veya arama terimini genişletin.</p>';
        return;
      }
      var logPageSize =
        pag && Number(pag.pageSize) > 0 ? Math.floor(Number(pag.pageSize)) : 70;
      var html =
        '<div class="logs-bulk-toolbar" role="toolbar" aria-label="Toplu seçim">' +
        '<label class="logs-bulk-toolbar__check">' +
        '<input type="checkbox" class="js-logs-select-page" aria-label="Bu sayfadaki tüm satırları seç" />' +
        "<span>Bu sayfadakilerin tümünü seç</span>" +
        "</label>" +
        '<button type="button" class="btn-small logs-bulk-toolbar__btn js-logs-clear-selection">Seçimi kaldır</button>' +
        '<button type="button" class="btn-small logs-bulk-toolbar__btn logs-bulk-toolbar__btn--danger js-logs-bulk-delete">Seçilenleri sil</button>' +
        '<p class="logs-bulk-toolbar__hint">Yalnızca işaretli satırlar silinir; bu sayfada en fazla ' +
        esc(String(logPageSize)) +
        " seçebilirsiniz. Sunucu tek istekte en fazla 200 kimlik kabul eder; daha fazlası için sayfa değiştirip işlemi yineleyin.</p>" +
        "</div>" +
        '<div class="bucket-table-wrap bucket-table-wrap--logs"><table class="admin-table admin-table--logs"><thead><tr>' +
        '<th class="admin-table__th--check"><span class="sr-only">Seç</span></th>' +
        "<th>Tarih</th><th>Kullanıcı Mesajı</th><th>Dil</th><th>Intent</th><th>Domain</th><th>Alt niyet</th><th>Güven</th><th>Fallback</th><th>Multi</th><th>Karar</th><th>Route</th><th>Öneri</th><th>Katman</th><th>Cevap</th><th>İşlem</th>" +
        "</tr></thead><tbody>";
      rows.forEach(function (r) {
        var userMsg = String(r.user_message || "-");
        var assistantMsg = String(r.assistant_response || "-");
        var confRaw = r.confidence;
        var confStr = "-";
        if (confRaw != null && confRaw !== "") {
          var cn = Number(confRaw);
          if (Number.isFinite(cn)) {
            confStr = cn >= 0 && cn <= 1 ? Math.round(cn * 100) + "%" : String(cn);
          }
        }
        var fbFull = String(r.fallback_reason || "").trim();
        var fbDisp = fbFull || "-";
        html += "<tr>";
        html +=
          '<td class="admin-table__td--check"><input type="checkbox" class="js-log-select" data-id="' +
          esc(r.id) +
          '" aria-label="Bu satırı seç" /></td>';
        html += "<td>" + esc(formatSubmittedAtTr(r.created_at)) + "</td>";
        html +=
          '<td class="logs-cell logs-cell--user"><div class="logs-cell__body" title="' +
          esc(userMsg) +
          '">' +
          esc(userMsg) +
          "</div></td>";
        html += "<td>" + esc((r.ui_language || "-") + " / " + (r.detected_language || "-")) + "</td>";
        html += "<td>" + esc(r.intent || "-") + "</td>";
        html += "<td>" + esc(r.domain || "-") + "</td>";
        html += "<td>" + esc(r.sub_intent || "-") + "</td>";
        html += "<td>" + esc(confStr) + "</td>";
        html +=
          '<td class="logs-cell logs-cell--fallback"><div class="logs-cell__body logs-cell__body--fallback" title="' +
          esc(fbFull || "-") +
          '">' +
          esc(fbDisp || "-") +
          "</div></td>";
        html += "<td>" + esc(r.multi_intent ? "Evet" : "Hayır") + "</td>";
        html += "<td>" + esc(r.response_type || "-") + "</td>";
        html += "<td>" + esc(r.route_target || "none") + "</td>";
        html += "<td>" + esc(r.recommendation_made ? "Evet" : "Hayır") + "</td>";
        html += "<td>" + esc(r.layer_used || "-") + "</td>";
        html +=
          '<td class="logs-cell logs-cell--assistant"><div class="logs-cell__body" title="' +
          esc(assistantMsg) +
          '">' +
          esc(assistantMsg) +
          "</div></td>";
        html +=
          '<td><div class="row-actions">' +
          '<button class="btn-small js-log-delete" data-id="' + esc(r.id) + '">Sil</button>' +
          "</div></td>";
        html += "</tr>";
      });
      html += "</tbody></table></div>";
      mountEl.innerHTML = html;

      var selectPage = mountEl.querySelector(".js-logs-select-page");
      var bulkDeleteBtn = mountEl.querySelector(".js-logs-bulk-delete");
      var clearSelBtn = mountEl.querySelector(".js-logs-clear-selection");

      function updateBulkDeleteLabel() {
        var n = mountEl.querySelectorAll(".js-log-select:checked").length;
        if (bulkDeleteBtn) {
          bulkDeleteBtn.textContent = n ? "Seçilenleri sil (" + n + ")" : "Seçilenleri sil";
          bulkDeleteBtn.disabled = n === 0;
        }
        if (selectPage) {
          var boxes = mountEl.querySelectorAll(".js-log-select");
          var allChecked = boxes.length > 0 && n === boxes.length;
          var noneChecked = n === 0;
          selectPage.checked = allChecked;
          selectPage.indeterminate = !allChecked && !noneChecked;
        }
      }

      if (selectPage) {
        selectPage.addEventListener("change", function () {
          var on = selectPage.checked;
          mountEl.querySelectorAll(".js-log-select").forEach(function (cb) {
            cb.checked = on;
          });
          updateBulkDeleteLabel();
        });
      }
      mountEl.querySelectorAll(".js-log-select").forEach(function (cb) {
        cb.addEventListener("change", updateBulkDeleteLabel);
      });
      if (clearSelBtn) {
        clearSelBtn.addEventListener("click", function () {
          mountEl.querySelectorAll(".js-log-select").forEach(function (cb) {
            cb.checked = false;
          });
          if (selectPage) {
            selectPage.checked = false;
            selectPage.indeterminate = false;
          }
          updateBulkDeleteLabel();
        });
      }
      if (bulkDeleteBtn && handlers && typeof handlers.onBulkDelete === "function") {
        bulkDeleteBtn.addEventListener("click", function () {
          var ids = [];
          mountEl.querySelectorAll(".js-log-select:checked").forEach(function (cb) {
            ids.push(cb.getAttribute("data-id"));
          });
          handlers.onBulkDelete(ids);
        });
      }
      updateBulkDeleteLabel();

      mountEl.querySelectorAll(".js-log-delete").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (!handlers || typeof handlers.onDelete !== "function") return;
          handlers.onDelete(btn.getAttribute("data-id"));
        });
      });
      if (pag && typeof handlers.onPage === "function") {
        attachAdminPager(mountEl, pag, rows, handlers.onPage);
      }
    },
    /** Tablo / metin: gg/aa/yyyy ss:dd (yerel). */
    formatDateTimeDisplayTr: function (iso) {
      return formatSubmittedAtTr(iso);
    },
    /** Tablo / metin: gg/aa/yyyy (ISO gün). */
    formatDateOnlyDisplayTr: function (iso) {
      return formatIsoDateDisplayTr(iso);
    },
    /** Eski kayıt satırı → laTerrace | mare | sinton | spa | null (ana sayfa özet sayımı). */
    reservationVenueKeyFromRow: reservationVenueKeyFromRow,
    /** Tarih YYYY-MM-DD (günlük özet filtresi). */
    reservationDateValue: reservationDateValue,
    /** Kayıt durumu normalizasyonu (sayım / etiket tek kaynak). */
    reservationNormalizeStatusKey: reservationNormalizeStatusKey,
    /** HK / Teknik saha sekmesi tablosu. */
    renderOperationBucket: function (mountEl, cfg) {
      renderOperationBucketImpl(mountEl, cfg);
    },
    /** Ön büro: üç liste. */
    renderOperationFront: function (mountEl, packs, handlers, summary) {
      renderOperationFrontImpl(mountEl, packs, handlers, summary);
    },
    /** HK / Teknik ops-light: tek özet kartı (`row`: normalizeFrontTypeSummary + isteğe bağlı enrich). */
    renderOpsSingleBucketSummary: function (mountEl, cfg) {
      renderOpsSingleBucketSummaryImpl(mountEl, cfg);
    },
    renderOpsPendingQueueBanner: function (mountEl, cfg) {
      renderOpsPendingQueueBannerImpl(mountEl, cfg);
    },
    /** Saha tabloları için kısa özet metni (istek / arıza / şikâyet vb.). */
    operationSummaryForType: function (bucketType, row) {
      return operationSummaryForType(bucketType, row);
    },
    /** Günlük operasyon PDF başlık satırı (admin tam tablo; İşlemler yok). */
    operationPdfTableHeaders: function (bucketType) {
      return operationPdfTableHeaders(bucketType);
    },
    /** Günlük operasyon PDF veri hücreleri (panel ile aynı kaynak). */
    operationPdfRowCells: function (bucketType, row) {
      return operationPdfRowCells(bucketType, row);
    },
    /** Durum rozeti metni (ops-hk seçili kayıt paneli vb.). */
    issueStatusLabel: function (issueType, status) {
      return issueStatusLabel(issueType, status);
    },
    normalizeBucketStatus: function (raw) {
      return normalizeBucketStatus(raw);
    },
  };
})();
