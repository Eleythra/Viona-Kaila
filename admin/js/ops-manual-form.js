(function () {
  "use strict";

  var VIONA_OPS_MANUAL_SOURCE = "viona_ops_manual";

  var REQUEST_QUANTITY = {
    towel_extra: 1,
    room_towel: 1,
    bathrobe: 1,
    bedding_sheet: 1,
    bedding_pillow: 1,
    bedding_blanket: 1,
    slippers: 1,
    hanger: 1,
    baby_bed: 1,
    toilet_paper: 1,
    toiletries: 1,
  };
  var REQUEST_TIMING = { room_cleaning: 1, turndown: 1 };

  var REQUEST_OPTS = [
    ["towel_extra", "Ek havlu"],
    ["room_towel", "Ek oda havlusu"],
    ["bathrobe", "Bornoz"],
    ["bedding_sheet", "Çarşaf / nevresim"],
    ["bedding_pillow", "Yastık"],
    ["bedding_blanket", "Battaniye"],
    ["room_cleaning", "Oda temizliği"],
    ["turndown", "Turndown"],
    ["slippers", "Terlik"],
    ["minibar_refill", "Minibar yenileme"],
    ["bottled_water", "Şişe su"],
    ["tea_coffee", "Çay / kahve"],
    ["toilet_paper", "Tuvalet kağıdı"],
    ["toiletries", "Şampuan / sabun"],
    ["climate_request", "Klima ayarı"],
    ["room_refresh", "Oda kokusu"],
    ["hanger", "Askı"],
    ["kettle", "Su ısıtıcı"],
    ["room_safe", "Kasa"],
    ["baby_bed", "Bebek yatağı"],
    ["other", "Diğer"],
  ];

  var FAULT_OPTS = [
    ["hvac", "Klima / Isıtma"],
    ["electric", "Elektrik"],
    ["water_bathroom", "Su / Banyo"],
    ["tv_electronics", "TV / Elektronik"],
    ["door_lock", "Kapı kilidi"],
    ["furniture_item", "Mobilya"],
    ["cleaning_equipment_damage", "Temizlik ekipmanı hasarı"],
    ["balcony_window", "Balkon / Pencere"],
    ["other", "Diğer"],
  ];

  var FAULT_LOC_OPTS = [
    ["room_inside", "Oda içi"],
    ["bathroom", "Banyo"],
    ["balcony", "Balkon"],
    ["other", "Diğer"],
  ];

  var URGENCY_OPTS = [
    ["normal", "Normal"],
    ["urgent", "Acil"],
  ];

  var COMPLAINT_OPTS = [
    ["room_cleaning", "Oda temizliği"],
    ["noise", "Gürültü"],
    ["climate", "Iklim"],
    ["room_comfort", "Oda konforu"],
    ["minibar", "Minibar"],
    ["restaurant_service", "Restoran hizmeti"],
    ["staff_behavior", "Personel davranışı"],
    ["general_areas", "Genel alanlar"],
    ["hygiene", "Hijyen"],
    ["internet_tv", "İnternet / TV"],
    ["lost_property", "Kayıp eşya"],
    ["other", "Diğer"],
  ];

  var GUEST_NOTIF_OPTS = [
    ["allergen_notice", "Alerjen bildirimi"],
    ["gluten_sensitivity", "Gluten hassasiyeti"],
    ["lactose_sensitivity", "Laktoz hassasiyeti"],
    ["vegan_vegetarian", "Vegan / vejetaryen"],
    ["food_sensitivity_general", "Gıda hassasiyeti (genel)"],
    ["chronic_condition", "Kronik durum"],
    ["accessibility_special_needs", "Erişilebilirlik"],
    ["pregnancy", "Hamilelik"],
    ["medication_health_sensitivity", "İlaç / sağlık"],
    ["other_health", "Diğer sağlık"],
    ["birthday_celebration", "Doğum günü"],
    ["honeymoon_anniversary", "Balayı / yıldönümü"],
    ["surprise_organization", "Sürpriz organizasyon"],
    ["room_decoration", "Oda süsleme"],
    ["other_celebration", "Diğer kutlama"],
  ];

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = String(s == null ? "" : s);
    return d.innerHTML;
  }

  function optionsHtml(arr) {
    return arr
      .map(function (pair) {
        return '<option value="' + esc(pair[0]) + '">' + esc(pair[1]) + "</option>";
      })
      .join("");
  }

  function syncRequestExtras(root) {
    var cat = root.querySelector(".js-manual-req-cat");
    var wrapQty = root.querySelector(".js-manual-req-qty-wrap");
    var wrapTim = root.querySelector(".js-manual-req-tim-wrap");
    if (!cat || !wrapQty || !wrapTim) return;
    var v = String(cat.value || "").trim();
    wrapQty.classList.toggle("hidden", !REQUEST_QUANTITY[v]);
    wrapTim.classList.toggle("hidden", !REQUEST_TIMING[v]);
  }

  function currentFrontType(root, opts) {
    var sel = root.querySelector(".js-manual-front-type");
    if (sel && sel.value) return String(sel.value).trim();
    if (opts.getRecordType) return String(opts.getRecordType() || "complaint").trim() || "complaint";
    return "complaint";
  }

  function syncFrontPanels(root, opts) {
    var t = currentFrontType(root, opts);
    var panC = root.querySelector(".js-manual-pan-complaint");
    var panG = root.querySelector(".js-manual-pan-gn");
    var panL = root.querySelector(".js-manual-pan-lc");
    if (panC) panC.classList.toggle("hidden", t !== "complaint");
    if (panG) panG.classList.toggle("hidden", t !== "guest_notification");
    if (panL) panL.classList.toggle("hidden", t !== "late_checkout");
    var sel = root.querySelector(".js-manual-front-type");
    if (sel) sel.value = t;
  }

  function collectPayload(root, opts) {
    var mode = opts.mode || "fixed";
    var name = root.querySelector(".js-manual-name");
    var room = root.querySelector(".js-manual-room");
    var nat = root.querySelector(".js-manual-nat");
    var desc = root.querySelector(".js-manual-desc");
    var n = name && name.value ? String(name.value).trim() : "";
    var r = room && room.value ? String(room.value).trim() : "";
    var nt = nat && nat.value ? String(nat.value).trim() : "-";
    var dtxt = desc && desc.value ? String(desc.value).trim() : "";
    if (!n) throw new Error("Misafir adı gerekli");
    if (!r) throw new Error("Oda numarası gerekli");

    if (mode === "fixed") {
      var rt = String(opts.recordType || "request").trim();
      if (rt === "request") {
        var rc = root.querySelector(".js-manual-req-cat");
        var cat = rc && rc.value ? String(rc.value).trim() : "";
        if (!cat) throw new Error("Kategori seçin");
        var details = {};
        if (REQUEST_QUANTITY[cat]) {
          var qn = root.querySelector(".js-manual-req-qty");
          var q = qn ? parseInt(String(qn.value || "1"), 10) : 1;
          if (!q || q < 1) throw new Error("Geçerli adet girin");
          details.quantity = q;
        }
        if (REQUEST_TIMING[cat]) {
          var tm = root.querySelector(".js-manual-req-tim");
          var tv = tm && tm.value ? String(tm.value).trim() : "";
          if (!tv) throw new Error("Zamanlama seçin");
          details.timing = tv;
        }
        if (cat === "other" && !dtxt) throw new Error("Diğer kategoride açıklama gerekli");
        return { type: "request", name: n, room: r, nationality: nt || "-", category: cat, details: details, description: dtxt, language: "tr" };
      }
      if (rt === "fault") {
        var fc = root.querySelector(".js-manual-fault-cat");
        var fl = root.querySelector(".js-manual-fault-loc");
        var fu = root.querySelector(".js-manual-fault-urg");
        var fcat = fc && fc.value ? String(fc.value).trim() : "";
        var loc = fl && fl.value ? String(fl.value).trim() : "";
        var urg = fu && fu.value ? String(fu.value).trim() : "";
        if (!fcat || !loc || !urg) throw new Error("Arıza kategorisi, konum ve aciliyet gerekli");
        if ((fcat === "other" || loc === "other") && !dtxt) throw new Error("Açıklama gerekli");
        return {
          type: "fault",
          name: n,
          room: r,
          nationality: nt || "-",
          category: fcat,
          location: loc,
          urgency: urg,
          description: dtxt,
          language: "tr",
        };
      }
      throw new Error("Geçersiz kayıt türü");
    }

    var ft = currentFrontType(root, opts);
    if (ft === "late_checkout") {
      var ld = root.querySelector(".js-manual-lc-date");
      var lt = root.querySelector(".js-manual-lc-time");
      var ymd = ld && ld.value ? String(ld.value).trim() : "";
      var hm = lt && lt.value ? String(lt.value).trim().slice(0, 5) : "";
      if (!ymd || !hm) throw new Error("Geç çıkış tarihi ve saati gerekli");
      if (!dtxt) throw new Error("Geç çıkış açıklaması gerekli");
      return {
        type: "late_checkout",
        name: n,
        room: r,
        nationality: nt || "-",
        checkoutDate: ymd,
        checkoutTime: hm,
        description: dtxt,
        language: "tr",
      };
    }
    if (ft === "complaint") {
      var cc = root.querySelector(".js-manual-complaint-cat");
      var ccat = cc && cc.value ? String(cc.value).trim() : "";
      if (!ccat) throw new Error("Şikâyet kategorisi gerekli");
      var needDesc =
        ccat === "staff_behavior" ||
        ccat === "general_areas" ||
        ccat === "hygiene" ||
        ccat === "lost_property" ||
        ccat === "other";
      if (needDesc && !dtxt) throw new Error("Bu kategori için açıklama gerekli");
      return { type: "complaint", name: n, room: r, nationality: nt || "-", category: ccat, description: dtxt, language: "tr" };
    }
    if (ft === "guest_notification") {
      var gc = root.querySelector(".js-manual-gn-cat");
      var gcat = gc && gc.value ? String(gc.value).trim() : "";
      if (!gcat) throw new Error("Bildirim kategorisi gerekli");
      var needG =
        gcat === "food_sensitivity_general" || gcat === "other_health" || gcat === "other_celebration";
      if (needG && !dtxt) throw new Error("Bu kategori için açıklama gerekli");
      return {
        type: "guest_notification",
        name: n,
        room: r,
        nationality: nt || "-",
        category: gcat,
        description: dtxt,
        language: "tr",
      };
    }
    throw new Error("Geçersiz ön büro türü");
  }

  function mount(host, opts) {
    if (!host || !opts || typeof opts.submitManual !== "function") return;
    try {
      host.classList.add("ops-manual-form-host");
    } catch (_e) {}
    var mode = opts.mode || "fixed";
    var title =
      mode === "front"
        ? "Yeni kayıt (personel · ön büro)"
        : opts.recordType === "request"
          ? "Yeni kayıt (personel · HK)"
          : "Yeni kayıt (personel · teknik)";

    var frontTypeRow =
      mode === "front"
        ? '<label class="op-filter-field op-filter-field--grow"><span class="op-filter-field__lbl">Kayıt türü</span>' +
          '<select class="op-filter-input js-manual-front-type">' +
          '<option value="complaint">Şikâyet</option>' +
          '<option value="guest_notification">Misafir bildirimi</option>' +
          '<option value="late_checkout">Geç çıkış</option>' +
          "</select></label>"
        : "";

    var requestBlock =
      mode === "fixed" && opts.recordType === "request"
        ? '<label class="op-filter-field"><span class="op-filter-field__lbl">Talep kategorisi</span>' +
          '<select class="op-filter-input js-manual-req-cat">' +
          optionsHtml(REQUEST_OPTS) +
          "</select></label>" +
          '<label class="op-filter-field js-manual-req-qty-wrap hidden"><span class="op-filter-field__lbl">Adet</span>' +
          '<input type="number" class="op-filter-input js-manual-req-qty" min="1" max="99" value="1" /></label>' +
          '<label class="op-filter-field js-manual-req-tim-wrap hidden"><span class="op-filter-field__lbl">Zamanlama</span>' +
          '<select class="op-filter-input js-manual-req-tim">' +
          '<option value="now">Şimdi</option>' +
          '<option value="later">Sonra</option>' +
          "</select></label>"
        : "";

    var faultBlock =
      mode === "fixed" && opts.recordType === "fault"
        ? '<label class="op-filter-field"><span class="op-filter-field__lbl">Arıza kategorisi</span>' +
          '<select class="op-filter-input js-manual-fault-cat">' +
          optionsHtml(FAULT_OPTS) +
          "</select></label>" +
          '<label class="op-filter-field"><span class="op-filter-field__lbl">Konum</span>' +
          '<select class="op-filter-input js-manual-fault-loc">' +
          optionsHtml(FAULT_LOC_OPTS) +
          "</select></label>" +
          '<label class="op-filter-field"><span class="op-filter-field__lbl">Aciliyet</span>' +
          '<select class="op-filter-input js-manual-fault-urg">' +
          optionsHtml(URGENCY_OPTS) +
          "</select></label>"
        : "";

    var frontComplaint =
      mode === "front"
        ? '<div class="js-manual-pan-complaint manual-front-panel">' +
          '<label class="op-filter-field op-filter-field--grow"><span class="op-filter-field__lbl">Şikâyet kategorisi</span>' +
          '<select class="op-filter-input js-manual-complaint-cat">' +
          optionsHtml(COMPLAINT_OPTS) +
          "</select></label></div>"
        : "";

    var frontGn =
      mode === "front"
        ? '<div class="js-manual-pan-gn manual-front-panel hidden">' +
          '<label class="op-filter-field op-filter-field--grow"><span class="op-filter-field__lbl">Bildirim kategorisi</span>' +
          '<select class="op-filter-input js-manual-gn-cat">' +
          optionsHtml(GUEST_NOTIF_OPTS) +
          "</select></label></div>"
        : "";

    var frontLc =
      mode === "front"
        ? '<div class="js-manual-pan-lc manual-front-panel hidden">' +
          '<label class="op-filter-field"><span class="op-filter-field__lbl">Çıkış tarihi</span>' +
          '<input type="date" class="op-filter-input js-manual-lc-date" autocomplete="off" /></label>' +
          '<label class="op-filter-field"><span class="op-filter-field__lbl">Çıkış saati</span>' +
          '<input type="time" class="op-filter-input js-manual-lc-time" autocomplete="off" /></label>' +
          "</div>"
        : "";

    var descLbl =
      '<label class="op-filter-field op-filter-field--grow op-filter-field--textarea"><span class="op-filter-field__lbl">Açıklama / not</span>' +
      '<textarea class="op-filter-input js-manual-desc" rows="2" placeholder="İsteğe bağlı veya zorunlu (kategoriye göre)"></textarea></label>';

    host.innerHTML =
      '<div class="glass-block ops-manual-form">' +
      '<h3 class="ops-manual-form__title">' +
      esc(title) +
      "</h3>" +
      '<p class="ops-manual-form__hint">Personel girişi veritabanına <code>' +
      esc(VIONA_OPS_MANUAL_SOURCE) +
      "</code> kaynağıyla yazılır; operasyon WhatsApp (misafir kaydıyla aynı akış) tetiklenir.</p>" +
      '<div class="op-filter-bar__row op-filter-bar__row--manual">' +
      '<label class="op-filter-field"><span class="op-filter-field__lbl">Misafir adı</span>' +
      '<input type="text" class="op-filter-input js-manual-name" maxlength="120" autocomplete="name" /></label>' +
      '<label class="op-filter-field"><span class="op-filter-field__lbl">Oda</span>' +
      '<input type="text" class="op-filter-input js-manual-room" maxlength="20" autocomplete="off" /></label>' +
      '<label class="op-filter-field"><span class="op-filter-field__lbl">Uyruk</span>' +
      '<input type="text" class="op-filter-input js-manual-nat" maxlength="12" value="-" placeholder="TR veya -" autocomplete="off" /></label>' +
      frontTypeRow +
      requestBlock +
      faultBlock +
      frontComplaint +
      frontGn +
      frontLc +
      descLbl +
      '<div class="op-filter-actions op-filter-actions--manual">' +
      '<button type="button" class="btn-primary btn-small js-manual-submit">Kaydet ve WhatsApp’a gönder</button>' +
      '<span class="ops-manual-form__status js-manual-status" role="status"></span>' +
      "</div></div></div>";

    var root = host.querySelector(".ops-manual-form");
    if (!root) return;

    var reqCat = root.querySelector(".js-manual-req-cat");
    if (reqCat) {
      reqCat.addEventListener("change", function () {
        syncRequestExtras(root);
      });
      syncRequestExtras(root);
    }

    var ftSel = root.querySelector(".js-manual-front-type");
    if (ftSel && opts.getRecordType) {
      var iv = String(opts.getRecordType() || "complaint").trim();
      if (iv === "complaint" || iv === "guest_notification" || iv === "late_checkout") ftSel.value = iv;
    }
    if (ftSel) {
      ftSel.addEventListener("change", function () {
        syncFrontPanels(root, opts);
      });
    }
    syncFrontPanels(root, opts);

    var sub = root.querySelector(".js-manual-submit");
    var st = root.querySelector(".js-manual-status");
    if (sub) {
      sub.addEventListener("click", async function () {
        if (st) st.textContent = "";
        try {
          var payload = collectPayload(root, opts);
          sub.disabled = true;
          await opts.submitManual(payload);
          if (st) st.textContent = "Kaydedildi.";
          var nameEl = root.querySelector(".js-manual-name");
          var descEl = root.querySelector(".js-manual-desc");
          if (nameEl) nameEl.value = "";
          if (descEl) descEl.value = "";
          if (typeof opts.onSuccess === "function") opts.onSuccess();
        } catch (e) {
          if (st) st.textContent = e && e.message ? String(e.message) : "Hata";
        } finally {
          sub.disabled = false;
        }
      });
    }

    host._vionaManualOpts = opts;
    host._vionaManualRoot = root;
  }

  function syncFrontType(type) {
    var t = String(type || "").trim();
    if (!t) return;
    document.querySelectorAll(".ops-manual-form-host").forEach(function (host) {
      var root = host._vionaManualRoot;
      var opts = host._vionaManualOpts;
      if (!root || !opts || opts.mode !== "front") return;
      var sel = root.querySelector(".js-manual-front-type");
      if (sel) sel.value = t;
      syncFrontPanels(root, opts);
    });
  }

  window.VionaOpsManualForm = {
    mount: mount,
    syncFrontType: syncFrontType,
    isManualRow: function (row) {
      if (!row || typeof row !== "object") return false;
      if (String(row.source || "").trim() === VIONA_OPS_MANUAL_SOURCE) return true;
      var rp = row.raw_payload;
      return Boolean(rp && typeof rp === "object" && String(rp.source || "").trim() === VIONA_OPS_MANUAL_SOURCE);
    },
    manualBadgeHtml: function () {
      return '<span class="ops-manual-badge" title="Personel manuel giriş">Manuel</span>';
    },
  };
})();
