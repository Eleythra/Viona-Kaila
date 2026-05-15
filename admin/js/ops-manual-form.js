(function () {
  "use strict";

  var VIONA_OPS_MANUAL_SOURCE = "viona_ops_manual";

  var REQUEST_QUANTITY = {
    hk_duvet_request: 1,
    hk_bed_join: 1,
    hk_bed_soften: 1,
    hk_pillow_request: 1,
    hk_pique_request: 1,
    hk_extra_bed: 1,
    hk_baby_crib: 1,
    hk_sheet_change: 1,
    hk_towel_request: 1,
    hk_towel_change: 1,
    hk_toilet_paper: 1,
    hk_slippers: 1,
    hk_dental_set: 1,
    hk_amenity_kit: 1,
    hk_water: 1,
    hk_coffee_tea_supplies: 1,
    hk_cup_request: 1,
    hk_room_cleaning: 1,
    hk_trash_removal: 1,
    hk_balcony_cleaning: 1,
    hk_cleaning_dnd_coordinate: 1,
    hk_bad_odor: 1,
    hk_pest_control: 1,
    hk_iron: 1,
    hk_vase: 1,
  };
  var REQUEST_OPTS = [
    ["hk_duvet_request", "Yorgan isteği (adet)"],
    ["hk_bed_join", "Yatak birleştirme (adet)"],
    ["hk_bed_soften", "Yatağın yumuşatılması (adet)"],
    ["hk_pillow_request", "Yastık isteği (adet)"],
    ["hk_pique_request", "Pike isteği (adet)"],
    ["hk_extra_bed", "Ek yatak (adet)"],
    ["hk_baby_crib", "Bebek yatağı (adet)"],
    ["hk_sheet_change", "Çarşaf değişimi (adet)"],
    ["hk_towel_request", "Havlu isteği (adet)"],
    ["hk_towel_change", "Havlu değişimi (adet)"],
    ["hk_toilet_paper", "Tuvalet kağıdı (adet)"],
    ["hk_slippers", "Terlik isteği (adet)"],
    ["hk_dental_set", "Diş seti isteği (adet)"],
    ["hk_amenity_kit", "Banyo ve kişisel bakım seti (şampuan, sabun vb.) (adet)"],
    ["hk_water", "Su isteği (adet)"],
    ["hk_coffee_tea_supplies", "Kahve, süt tozu, çay isteği (adet)"],
    ["hk_cup_request", "Kupa isteği (adet)"],
    ["hk_room_cleaning", "Oda temizliği (adet)"],
    ["hk_trash_removal", "Çöplerin alınması (adet)"],
    ["hk_balcony_cleaning", "Balkon temizliği (adet)"],
    ["hk_cleaning_dnd_coordinate", "Temizlik ve DND koordinasyonu (adet)"],
    ["hk_bad_odor", "Kötü koku şikayeti (adet)"],
    ["hk_pest_control", "İlaçlama isteği (adet)"],
    ["hk_iron", "Ütü isteği (adet)"],
    ["hk_vase", "Vazo isteği (adet)"],
    ["other", "Diğer"],
  ];

  var FAULT_OPTS = [
    ["ft_ac_not_cooling", "Klima soğutmuyor"],
    ["ft_ac_not_heating", "Klima ısıtmıyor"],
    ["ft_ac_remote", "Klima kumandası"],
    ["ft_ac_fault", "Klima arızası"],
    ["ft_ventilation_fault", "Havalandırma arızası"],
    ["ft_socket_fault", "Priz arızası"],
    ["ft_electric_fault", "Elektrik arızası"],
    ["ft_led_fault", "LED arızası"],
    ["ft_lamp_fault", "Lamba arızası"],
    ["ft_sconce_fault", "Aplik arızası"],
    ["ft_ceiling_water_leak", "Tavandan su akıyor"],
    ["ft_bidet_faucet_fault", "Taharet musluğu arızası"],
    ["ft_cold_water_no_flow", "Su soğuk akmıyor"],
    ["ft_hot_water_no_flow", "Su sıcak akmıyor"],
    ["ft_siphon_fault", "Sifon arızası"],
    ["ft_faucet_fault", "Musluk arızası"],
    ["ft_sink_drain_fault", "Lavabo gideri arızası"],
    ["ft_toilet_seat_broken", "Klozet kapağı kırık"],
    ["ft_shower_cabin_fault", "Duşakabin arızası"],
    ["ft_shower_head_fault", "Duş başlığı arızası"],
    ["ft_towel_rail_fault", "Banyo havluluk"],
    ["ft_bathroom_drain_clog", "Banyo gideri tıkalı"],
    ["ft_tv_remote", "Televizyon kumandası"],
    ["ft_tv_fault", "Televizyon arızası"],
    ["ft_phone_fault", "Telefon arızası"],
    ["ft_minibar_fault", "Minibar arızası"],
    ["ft_safe_fault", "Kasa arızası"],
    ["ft_kettle_fault", "Kettle arızası"],
    ["ft_hair_dryer_fault", "Fön makinesi çalışmıyor"],
    ["ft_tv_channel_fault", "Kanal arızası"],
    ["ft_curtain_fallen", "Perde düşmüş"],
    ["ft_window_fault", "Pencere arızası"],
    ["ft_window_cleaning", "Pencere temizliği"],
    ["ft_room_door_fault", "Oda kapısı arızası"],
    ["ft_bathroom_door_fault", "Banyo kapısı arızası"],
    ["ft_balcony_door_fault", "Balkon kapısı arızası"],
    ["ft_balcony_railing_loose", "Balkon korkuluğu gevşek / sallanıyor"],
    ["ft_cornice_fault", "Korniş arızası"],
    ["ft_headboard_fault", "Yatak başlığı arızası"],
    ["ft_dresser_drawer_fault", "Şifonyer çekmecesi"],
    ["ft_drawer_fault", "Çekmece arızası"],
    ["ft_wardrobe_fault", "Gardırop arızası"],
    ["ft_mirror_damage", "Ayna kırık / çatlak"],
    ["ft_elevator_fault", "Asansör arızası"],
    ["ft_indoor_pool_temperature", "Kapalı havuz sıcaklığı / ayar arızası"],
    ["ft_other", "Diğer (teknik)"],
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

  var NATIONALITY_OPTS = [
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

  function nationalitySelectFieldHtml() {
    var inner = NATIONALITY_OPTS.map(function (pair) {
      return '<option value="' + esc(pair[0]) + '">' + esc(pair[1]) + " (" + esc(pair[0]) + ")</option>";
    }).join("");
    return (
      '<label class="op-filter-field"><span class="op-filter-field__lbl">Uyruk <span class="op-filter-field__hint">isteğe bağlı</span></span>' +
      '<select class="op-filter-input js-manual-nat" aria-label="Uyruk (isteğe bağlı)">' +
      '<option value="">Belirtilmedi</option>' +
      inner +
      "</select></label>"
    );
  }

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
    if (!cat || !wrapQty) return;
    var v = String(cat.value || "").trim();
    wrapQty.classList.toggle("hidden", !REQUEST_QUANTITY[v]);
    if (wrapTim) wrapTim.classList.add("hidden");
  }

  function currentFrontType(root, opts) {
    if (opts && typeof opts.getRecordType === "function") {
      var g = String(opts.getRecordType() || "complaint").trim() || "complaint";
      if (g === "complaint" || g === "guest_notification" || g === "late_checkout") return g;
    }
    var sel = root.querySelector(".js-manual-front-type");
    if (sel && sel.value) return String(sel.value).trim();
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
    var nt = "";
    if (nat && nat.tagName === "SELECT") {
      nt = nat.value != null ? String(nat.value).trim() : "";
    } else if (nat && nat.value != null && nat.value !== "") {
      nt = String(nat.value).trim();
    }
    if (!nt) nt = "-";
    var dtxt = desc && desc.value ? String(desc.value).trim() : "";
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
        if (cat === "other" && !dtxt) throw new Error("Diğer kategoride açıklama gerekli");
        return { type: "request", name: n, room: r, nationality: nt || "-", category: cat, details: details, description: dtxt, language: "tr" };
      }
      if (rt === "fault") {
        var fc = root.querySelector(".js-manual-fault-cat");
        var fcat = fc && fc.value ? String(fc.value).trim() : "";
        if (!fcat) throw new Error("Arıza türü gerekli");
        if ((fcat === "ft_other") && !dtxt) throw new Error("Diğer arıza için açıklama gerekli");
        var fq = root.querySelector(".js-manual-fault-qty");
        var fqN = fq ? parseInt(String(fq.value || "1"), 10) : 1;
        if (!fqN || fqN < 1) throw new Error("Geçerli adet girin");
        return {
          type: "fault",
          name: n,
          room: r,
          nationality: nt || "-",
          category: fcat,
          details: { quantity: fqN },
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

    var requestBlock =
      mode === "fixed" && opts.recordType === "request"
        ? '<label class="op-filter-field"><span class="op-filter-field__lbl">Talep kategorisi <abbr class="op-filter-req-star" title="Zorunlu">*</abbr></span>' +
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
        ? '<label class="op-filter-field"><span class="op-filter-field__lbl">Arıza türü <abbr class="op-filter-req-star" title="Zorunlu">*</abbr></span>' +
          '<select class="op-filter-input js-manual-fault-cat">' +
          optionsHtml(FAULT_OPTS) +
          "</select></label>" +
          '<label class="op-filter-field"><span class="op-filter-field__lbl">Adet</span>' +
          '<input type="number" class="op-filter-input js-manual-fault-qty" min="1" max="99" value="1" /></label>'
        : "";

    var frontComplaint =
      mode === "front"
        ? '<div class="js-manual-pan-complaint manual-front-panel">' +
          '<label class="op-filter-field op-filter-field--grow"><span class="op-filter-field__lbl">Şikâyet kategorisi <abbr class="op-filter-req-star" title="Zorunlu">*</abbr></span>' +
          '<select class="op-filter-input js-manual-complaint-cat">' +
          optionsHtml(COMPLAINT_OPTS) +
          "</select></label></div>"
        : "";

    var frontGn =
      mode === "front"
        ? '<div class="js-manual-pan-gn manual-front-panel hidden">' +
          '<label class="op-filter-field op-filter-field--grow"><span class="op-filter-field__lbl">Bildirim kategorisi <abbr class="op-filter-req-star" title="Zorunlu">*</abbr></span>' +
          '<select class="op-filter-input js-manual-gn-cat">' +
          optionsHtml(GUEST_NOTIF_OPTS) +
          "</select></label></div>"
        : "";

    var frontLc =
      mode === "front"
        ? '<div class="js-manual-pan-lc manual-front-panel hidden">' +
          '<label class="op-filter-field"><span class="op-filter-field__lbl">Çıkış tarihi <abbr class="op-filter-req-star" title="Zorunlu">*</abbr></span>' +
          '<input type="date" class="op-filter-input js-manual-lc-date" autocomplete="off" /></label>' +
          '<label class="op-filter-field"><span class="op-filter-field__lbl">Çıkış saati <abbr class="op-filter-req-star" title="Zorunlu">*</abbr></span>' +
          '<input type="time" class="op-filter-input js-manual-lc-time" autocomplete="off" /></label>' +
          "</div>"
        : "";

    var scopeLine =
      mode === "front"
        ? '<p class="ops-manual-form__scope">Üstte <strong>Misafir adı soyadı</strong> ile uyruk isteğe bağlıdır; sonra <strong>oda numarası</strong> ve (aktif sekmeye göre) kategori alanları zorunludur. Kayıt türü, alttaki listelerdeki <strong>aktif sekme</strong> ile aynıdır. Ad boşsa liste ve WhatsApp’ta «-» görünür.</p>'
        : mode === "fixed" && opts.recordType === "request"
          ? '<p class="ops-manual-form__scope">Üstte <strong>Misafir adı soyadı</strong> ve uyruk isteğe bağlı. <strong>Oda</strong> ve <strong>talep kategorisi</strong> zorunlu. Ad boşsa liste ve WhatsApp’ta «-» görünür.</p>'
          : '<p class="ops-manual-form__scope">Üstte <strong>Misafir adı soyadı</strong> ve uyruk isteğe bağlı. <strong>Oda</strong> ve arıza <strong>kategorisi</strong> zorunlu; «Diğer (teknik)» ve eski «Diğer» için açıklama gerekir. Ad boşsa liste ve WhatsApp’ta «-» görünür.</p>';

    var roomField =
      '<label class="op-filter-field"><span class="op-filter-field__lbl">Oda numarası <abbr class="op-filter-req-star" title="Zorunlu">*</abbr></span>' +
      '<input type="text" class="op-filter-input js-manual-room" maxlength="20" autocomplete="off" /></label>';

    var nameField =
      '<label class="op-filter-field"><span class="op-filter-field__lbl">Misafir adı soyadı <span class="op-filter-field__hint">isteğe bağlı</span></span>' +
      '<input type="text" class="op-filter-input js-manual-name" maxlength="120" autocomplete="name" placeholder="İsteğe bağlı · boşsa listede ve bildirimde «-»" /></label>';

    var natField = nationalitySelectFieldHtml();

    var descLbl =
      '<label class="op-filter-field op-filter-field--grow op-filter-field--textarea"><span class="op-filter-field__lbl">Açıklama <span class="op-filter-field__hint">isteğe bağlı · bazı kategoriler zorunlu tutar</span></span>' +
      '<textarea class="op-filter-input js-manual-desc" rows="2" placeholder="İsteğe bağlı"></textarea></label>';

    var manualFieldsCore =
      mode === "front"
        ? nameField + natField + roomField + frontComplaint + frontGn + frontLc
        : nameField + natField + roomField + requestBlock + faultBlock;

    host.innerHTML =
      '<div class="glass-block ops-manual-form">' +
      '<h3 class="ops-manual-form__title">' +
      esc(title) +
      "</h3>" +
      scopeLine +
      '<p class="ops-manual-form__hint">Kayıt <code>' +
      esc(VIONA_OPS_MANUAL_SOURCE) +
      "</code> kaynağıyla yazılır; uygunsa operasyon WhatsApp iletilir.</p>" +
      '<div class="op-filter-bar__row op-filter-bar__row--manual">' +
      manualFieldsCore +
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
          var natEl = root.querySelector(".js-manual-nat");
          if (nameEl) nameEl.value = "";
          if (descEl) descEl.value = "";
          if (natEl && natEl.tagName === "SELECT") natEl.value = "";
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

  function syncFrontType(_type) {
    document.querySelectorAll(".ops-manual-form-host").forEach(function (host) {
      var root = host._vionaManualRoot;
      var opts = host._vionaManualOpts;
      if (!root || !opts || opts.mode !== "front") return;
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
