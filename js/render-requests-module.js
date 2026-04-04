/**
 * İstek / şikayet / arıza / misafir bildirimleri / rezervasyon — hub + formlar.
 */
(function () {
  "use strict";

  var RES_TAB_KEY = "viona_req_res_tab";
  /** Anket modülü (survey-render.js) ile aynı süre: teşekkür kısa görünsün, sonra ana sayfa. */
  var REQ_SUCCESS_THEN_HOME_MS = 2600;

  var HUB_ICONS = {
    request:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M21 15a4 4 0 01-4 4H8l-5 3v-3H5a4 4 0 01-4-4V7a4 4 0 014-4h14a4 4 0 014 4v8z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></svg>',
    complaint:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
    fault:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>',
    res:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>',
    guest_notification:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>',
  };

  function getCfg() {
    return (
      window.REQUESTS_CONFIG || {
        categories: {},
        guestNotificationGroups: [],
        restaurants: [],
        spaServices: [],
        nationalities: [],
      }
    );
  }

  function nightsBetween(inIso, outIso) {
    var a = inIso.split("-");
    var b = outIso.split("-");
    var d1 = new Date(parseInt(a[0], 10), parseInt(a[1], 10) - 1, parseInt(a[2], 10));
    var d2 = new Date(parseInt(b[0], 10), parseInt(b[1], 10) - 1, parseInt(b[2], 10));
    return Math.round((d2 - d1) / 86400000);
  }

  function weekdayFromIso(iso) {
    if (!iso) return -1;
    var p = String(iso).split("-");
    if (p.length !== 3) return -1;
    var d = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
    if (isNaN(d.getTime())) return -1;
    return d.getDay();
  }

  function currentUiLanguage() {
    var v = (document.documentElement && document.documentElement.lang) || "tr";
    v = String(v).toLowerCase();
    if (v !== "tr" && v !== "en" && v !== "de" && v !== "ru") return "tr";
    return v;
  }

  function isRoomNumber(v) {
    var s = String(v || "").trim();
    if (typeof window !== "undefined" && typeof window.isValidVionaHotelRoomNumber === "function") {
      return window.isValidVionaHotelRoomNumber(s);
    }
    return /^\d+$/.test(s);
  }

  function isNationalityText(v) {
    return /^[A-Za-z]{2,12}$/.test(String(v || "").trim());
  }

  function isNameText(v) {
    var s = String(v || "").trim();
    if (!s) return false;
    if (/\d/.test(s)) return false;
    return /[A-Za-zÀ-žА-Яа-яİıĞğÜüŞşÖöÇç]/.test(s);
  }

  function validateGuestFields(form, err, t) {
    var name = String((form.querySelector('[name="name"]') || {}).value || "").trim();
    var room = String((form.querySelector('[name="room"]') || {}).value || "").trim();
    var nationality = String((form.querySelector('[name="nationality"]') || {}).value || "").trim();
    if (!isNameText(name)) {
      err.textContent = t("reqErrNameInvalid");
      err.hidden = false;
      return false;
    }
    if (!isRoomNumber(room)) {
      err.textContent = t("reqErrRoomDigits");
      err.hidden = false;
      return false;
    }
    if (!isNationalityText(nationality)) {
      err.textContent = t("reqErrNationalityInvalid");
      err.hidden = false;
      return false;
    }
    return true;
  }

  function mountCalendar(host, hidden, minIso, minMonth) {
    if (!window.CalendarPicker) return;
    var v = (hidden && hidden.value) || "";
    new window.CalendarPicker(host, {
      min: minIso,
      minMonth: minMonth,
      value: v,
      onChange: function (iso) {
        if (hidden) {
          hidden.value = iso;
          hidden.dispatchEvent(new Event("input", { bubbles: true }));
          hidden.dispatchEvent(new Event("change", { bubbles: true }));
        }
      },
    });
  }

  function syncCalDisplay(hidden, el) {
    if (!el || !hidden) return;
    var upd = function () {
      el.textContent = hidden.value || "";
    };
    hidden.addEventListener("change", upd);
    upd();
  }

  function fillSlotButtons(container, slots, timeHidden, t, emptyMsgKey) {
    container.innerHTML = "";
    timeHidden.value = "";
    if (!slots || !slots.length) {
      var empty = document.createElement("p");
      empty.className = "req-res-slots-empty";
      empty.textContent = t(emptyMsgKey || "reqPickRestaurantFirst");
      container.appendChild(empty);
      return;
    }
    slots.forEach(function (slot) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "req-res-slot";
      btn.textContent = slot;
      btn.setAttribute("data-slot", slot);
      btn.addEventListener("click", function () {
        timeHidden.value = slot;
        container.querySelectorAll(".req-res-slot").forEach(function (b) {
          b.classList.toggle("req-res-slot--active", b === btn);
        });
      });
      container.appendChild(btn);
    });
  }

  function resSection(titleKey, t) {
    var s = document.createElement("section");
    s.className = "req-res-section";
    var h = document.createElement("h3");
    h.className = "req-res-section__title";
    h.textContent = t(titleKey);
    var inner = document.createElement("div");
    inner.className = "req-res-section__inner";
    s.appendChild(h);
    s.appendChild(inner);
    return { section: s, inner: inner };
  }

  function calBlock(labelText, hidden, host, minIso, minMonth, t) {
    var wrap = document.createElement("div");
    wrap.className = "req-res-cal";
    var lab = document.createElement("span");
    lab.className = "req-label";
    lab.textContent = labelText;
    var row = document.createElement("div");
    row.className = "req-res-cal__row";
    row.appendChild(host);
    var disp = document.createElement("div");
    disp.className = "req-res-cal__picked";
    var dlab = document.createElement("span");
    dlab.className = "req-res-cal__picked-label";
    dlab.textContent = t("reqCalSelectedLabel");
    var dval = document.createElement("span");
    dval.className = "req-res-cal__picked-val";
    dval.setAttribute("data-cal-display", "1");
    disp.appendChild(dlab);
    disp.appendChild(dval);
    wrap.appendChild(lab);
    wrap.appendChild(row);
    wrap.appendChild(disp);
    wrap.appendChild(hidden);
    mountCalendar(host, hidden, minIso, minMonth);
    syncCalDisplay(hidden, dval);
    return wrap;
  }

  function fieldText(name, labelKey, t, required, idPrefix) {
    var pid = idPrefix || "rf";
    var lab = document.createElement("label");
    lab.className = "req-label";
    lab.htmlFor = pid + "-" + name;
    lab.textContent = t(labelKey);
    var inp = document.createElement("input");
    inp.id = pid + "-" + name;
    inp.name = name;
    inp.className = "req-input";
    inp.type = "text";
    inp.autocomplete = "name";
    if (name === "room") {
      inp.inputMode = "numeric";
      inp.pattern = "[0-9]+";
      inp.autocomplete = "off";
    }
    if (required) inp.required = true;
    var w = document.createElement("div");
    w.className = "req-field";
    w.appendChild(lab);
    w.appendChild(inp);
    return w;
  }

  function fieldNationality(t, idPrefix) {
    var pid = idPrefix || "rf";
    var cfg = getCfg();
    var lab = document.createElement("label");
    lab.className = "req-label";
    lab.htmlFor = pid + "-nationality";
    lab.textContent = t("reqLabelNationality");
    var sel = document.createElement("select");
    sel.id = pid + "-nationality";
    sel.name = "nationality";
    sel.className = "req-input";
    sel.required = true;
    var ph = document.createElement("option");
    ph.value = "";
    ph.textContent = t("reqNatPlaceholder");
    sel.appendChild(ph);
    cfg.nationalities.forEach(function (n) {
      var o = document.createElement("option");
      o.value = n.value;
      o.textContent = t(n.key);
      sel.appendChild(o);
    });
    var w = document.createElement("div");
    w.className = "req-field";
    w.appendChild(lab);
    w.appendChild(sel);
    return w;
  }

  function fieldDesc(t, idPrefix, nameAttr, required) {
    var pid = idPrefix || "rf";
    nameAttr = nameAttr || "description";
    required = required !== false;
    var lab = document.createElement("label");
    lab.className = "req-label";
    lab.htmlFor = pid + "-desc";
    lab.textContent = t("reqLabelDesc");
    var ta = document.createElement("textarea");
    ta.id = pid + "-desc";
    ta.name = nameAttr;
    ta.className = "req-input req-textarea";
    ta.rows = 4;
    ta.required = required;
    var w = document.createElement("div");
    w.className = "req-field";
    w.appendChild(lab);
    w.appendChild(ta);
    return w;
  }

  function buildCategorySection(group, t) {
    var cfg = getCfg();
    var list = (cfg.categories[group] || []).slice();
    var wrap = document.createElement("div");
    wrap.className = "req-field";
    var leg = document.createElement("span");
    leg.className = "req-label";
    leg.textContent = t("reqLabelCategories");
    var chips = document.createElement("div");
    chips.className = "req-chips";
    chips.setAttribute("role", "group");

    list.forEach(function (c) {
      var lab = document.createElement("label");
      lab.className = "req-chip";
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.name = "categories";
      cb.value = c.id;
      var span = document.createElement("span");
      span.className = "req-chip__text";
      span.textContent = t(c.key);
      lab.appendChild(cb);
      lab.appendChild(span);
      chips.appendChild(lab);
    });

    var otherWrap = document.createElement("div");
    otherWrap.className = "req-field req-other-detail hidden";
    var ol = document.createElement("label");
    ol.className = "req-label";
    ol.htmlFor = "rf-other-cat";
    ol.textContent = t("reqLabelOtherDetail");
    var oi = document.createElement("textarea");
    oi.id = "rf-other-cat";
    oi.name = "otherCategoryNote";
    oi.className = "req-input req-textarea";
    oi.rows = 2;
    otherWrap.appendChild(ol);
    otherWrap.appendChild(oi);

    function syncOther() {
      var hasOther = false;
      chips.querySelectorAll('input[name="categories"]:checked').forEach(function (x) {
        if (x.value === "other") hasOther = true;
      });
      otherWrap.classList.toggle("hidden", !hasOther);
      if (!hasOther) oi.value = "";
    }
    chips.addEventListener("change", syncOther);

    wrap.appendChild(leg);
    wrap.appendChild(chips);
    wrap.appendChild(otherWrap);
    return wrap;
  }

  function buildSingleCategoryField(group, labelKey, t, nameAttr) {
    var cfg = getCfg();
    var list = (cfg.categories[group] || []).slice();
    nameAttr = nameAttr || "category";
    var wrap = document.createElement("div");
    wrap.className = "req-field";
    var leg = document.createElement("span");
    leg.className = "req-label";
    leg.textContent = t(labelKey);
    var chips = document.createElement("div");
    chips.className = "req-chips";
    chips.setAttribute("role", "radiogroup");
    chips.setAttribute("aria-label", t(labelKey));

    list.forEach(function (c, idx) {
      var lab = document.createElement("label");
      lab.className = "req-chip";
      var radio = document.createElement("input");
      radio.type = "radio";
      radio.name = nameAttr;
      radio.value = c.id;
      radio.required = idx === 0;
      var span = document.createElement("span");
      span.className = "req-chip__text";
      span.textContent = t(c.key);
      lab.appendChild(radio);
      lab.appendChild(span);
      chips.appendChild(lab);
    });
    wrap.appendChild(leg);
    wrap.appendChild(chips);
    return { wrap: wrap, chips: chips };
  }

  function getRequestDetailSchema(category) {
    if (category === "towel") {
      return {
        fields: [
          {
            name: "itemType",
            label: "reqLabelItemType",
            required: true,
            options: [
              { value: "", key: "reqSelectPlaceholder" },
              { value: "bath_towel", key: "reqOptBathTowel" },
              { value: "hand_towel", key: "reqOptHandTowel" },
            ],
          },
          { name: "quantity", label: "reqLabelQuantity", required: true, min: 1, max: 20 },
        ],
      };
    }
    if (category === "bedding") {
      return {
        fields: [
          {
            name: "itemType",
            label: "reqLabelProductType",
            required: true,
            options: [
              { value: "", key: "reqSelectPlaceholder" },
              { value: "pillow", key: "reqOptPillow" },
              { value: "duvet_cover", key: "reqOptDuvetCover" },
              { value: "blanket", key: "reqOptBlanket" },
            ],
          },
          { name: "quantity", label: "reqLabelQuantity", required: true, min: 1, max: 20 },
        ],
      };
    }
    if (category === "room_cleaning") {
      return {
        fields: [
          {
            name: "requestType",
            label: "reqLabelRequestType",
            required: true,
            options: [
              { value: "", key: "reqSelectPlaceholder" },
              { value: "general_cleaning", key: "reqOptGeneralCleaning" },
              { value: "towel_change", key: "reqOptTowelChange" },
              { value: "room_check", key: "reqOptRoomCheck" },
            ],
          },
          {
            name: "timing",
            label: "reqLabelTiming",
            required: true,
            options: [
              { value: "", key: "reqSelectPlaceholder" },
              { value: "now", key: "reqOptNow" },
              { value: "later", key: "reqOptLater" },
            ],
          },
        ],
      };
    }
    if (category === "minibar") {
      return {
        fields: [
          {
            name: "requestType",
            label: "reqLabelRequestType",
            required: true,
            options: [
              { value: "", key: "reqSelectPlaceholder" },
              { value: "refill", key: "reqOptRefill" },
              { value: "missing_item_report", key: "reqOptMissingItem" },
              { value: "check_request", key: "reqOptCheckRequest" },
            ],
          },
        ],
      };
    }
    if (category === "baby_equipment") {
      return {
        fields: [
          {
            name: "itemType",
            label: "reqLabelEquipmentType",
            required: true,
            options: [
              { value: "", key: "reqSelectPlaceholder" },
              { value: "baby_bed", key: "reqOptBabyBed" },
              { value: "high_chair", key: "reqOptHighChair" },
              { value: "other", key: "reqCatOther" },
            ],
          },
          { name: "quantity", label: "reqLabelQuantity", required: true, min: 1, max: 20 },
        ],
      };
    }
    if (category === "room_equipment") {
      return {
        fields: [
          {
            name: "itemType",
            label: "reqLabelEquipmentType",
            required: true,
            options: [
              { value: "", key: "reqSelectPlaceholder" },
              { value: "bathrobe", key: "reqOptBathrobe" },
              { value: "slippers", key: "reqOptSlippers" },
              { value: "hanger", key: "reqOptHanger" },
              { value: "kettle", key: "reqOptKettle" },
              { value: "other", key: "reqCatOther" },
            ],
          },
          { name: "quantity", label: "reqLabelQuantity", required: true, min: 1, max: 20 },
        ],
      };
    }
    return { fields: [] };
  }

  function renderRequestDetailsFields(mount, category, t) {
    mount.innerHTML = "";
    var schema = getRequestDetailSchema(category);
    schema.fields.forEach(function (f) {
      var field = document.createElement("div");
      field.className = "req-field";
      var lab = document.createElement("label");
      lab.className = "req-label";
      lab.textContent = t(f.label);
      field.appendChild(lab);
      if (f.options) {
        var sel = document.createElement("select");
        sel.className = "req-input";
        sel.name = "detail_" + f.name;
        if (f.required) sel.required = true;
        f.options.forEach(function (opt) {
          var o = document.createElement("option");
          o.value = opt.value;
          o.textContent = t(opt.key);
          sel.appendChild(o);
        });
        field.appendChild(sel);
      } else {
        var input = document.createElement("input");
        input.type = "number";
        input.className = "req-input";
        input.name = "detail_" + f.name;
        input.step = "1";
        if (f.min != null) input.min = String(f.min);
        if (f.max != null) input.max = String(f.max);
        if (f.required) input.required = true;
        field.appendChild(input);
      }
      mount.appendChild(field);
    });
  }

  function collectRequestDetails(form, category) {
    var details = {};
    var schema = getRequestDetailSchema(category);
    schema.fields.forEach(function (f) {
      var el = form.querySelector('[name="detail_' + f.name + '"]');
      if (!el) return;
      var v = String(el.value || "").trim();
      if (f.name === "quantity") {
        details[f.name] = Number(v || "0");
      } else {
        details[f.name] = v;
      }
    });
    return details;
  }

  /** HK talep formu: “istiyorum / talep / var mı” vb. + kategori anahtar kelimesi → form; yalnızca kelime → netleştirme. */
  function hasRequestIntentPhrase(raw) {
    var n = raw.toLocaleLowerCase("tr-TR");
    var e = raw.toLowerCase();
    var blob = n + " | " + e;
    var phrases = [
      "talep ediyorum",
      "talep",
      "istiyorum",
      "isterim",
      "rica ediyorum",
      "ricam",
      "rica ",
      " rica",
      "var mı",
      "var mi",
      "varmı",
      "lazım",
      "lazim",
      "gerekli",
      " gerek",
      "ihtiyacım",
      "ihtiyacim",
      "yollar mısınız",
      "yollar misiniz",
      "gönderebilir",
      "gonder",
      "getirebilir",
      "ekleyebilir",
      "doldur",
      "yenile",
      "yenileme",
      "sipariş",
      "siparis",
      "ederim",
      "olur mu",
      "olmaz mı",
      "sağ ol",
      "sag ol",
      "please",
      "would like",
      " i need",
      "need ",
      "request",
      "can i get",
      "could you",
      "нужно",
      "надо",
      "пожалуйста",
      "можно ли",
      "прошу",
      "заказать",
      "bitte schicken",
      "bräuchte",
      "brauchte",
      "gäbe es",
      "gabe es",
    ];
    for (var i = 0; i < phrases.length; i++) {
      if (blob.indexOf(phrases[i]) >= 0) return true;
    }
    return false;
  }

  function detectRequestCategoryFromText(raw) {
    var n = raw.toLocaleLowerCase("tr-TR") + " " + raw.toLowerCase();
    if (/\bminibar\b|mini\s*bar|mini bar/.test(n)) return "minibar";
    if (
      /oda\s*temiz|room\s*clean|temizlik|havlu\s*değiş|havlu\s*degis|towel\s*change|genel\s*temiz|room\s*check|süpür|supur|kirli/.test(
        n
      )
    ) {
      return "room_cleaning";
    }
    if (/bebek|mama\s*sandalyesi|bebek\s*yatağı|bebek\s*yatagi|baby\s*bed|high\s*chair/.test(n)) {
      return "baby_equipment";
    }
    if (/nevresim|yastık|yastik|battaniye|yatak\s*takımı|yatak\s*takimi|duvet|pillow|blanket|bedding/.test(n)) {
      return "bedding";
    }
    if (/\bhavlu\b|havlular|banyo\s*havlusu|el\s*havlusu|towel/.test(n)) return "towel";
    if (/bornoz|terlik|askı|aski|kettle|ütü|utu|oda\s*ekipman|bathrobe|slippers|hanger/.test(n)) {
      return "room_equipment";
    }
    if (/diğer|diger|başka|baska|other\b/.test(n)) return "other";
    return null;
  }

  function buildRequestForm(t, onSuccessGoHome) {
    var bundle = document.createElement("div");
    bundle.className = "req-request-bundle";

    var intentPanel = document.createElement("div");
    intentPanel.className = "req-intent-panel";
    var intentLead = document.createElement("p");
    intentLead.className = "req-intro req-intent-lead";
    intentLead.textContent = t("reqIntentLead");
    var taIntent = document.createElement("textarea");
    taIntent.className = "req-input req-textarea req-intent-text";
    taIntent.rows = 3;
    taIntent.setAttribute("aria-label", t("reqIntentLead"));
    taIntent.placeholder = t("reqIntentPlaceholder");
    var intentErr = document.createElement("p");
    intentErr.className = "req-err req-intent-err";
    intentErr.hidden = true;
    var intentHint = document.createElement("p");
    intentHint.className = "req-intent-hint";
    intentHint.hidden = true;
    var intentActions = document.createElement("div");
    intentActions.className = "req-intent-actions";
    var btnIntent = document.createElement("button");
    btnIntent.type = "button";
    btnIntent.className = "btn-primary";
    btnIntent.textContent = t("reqIntentContinue");
    var btnSkip = document.createElement("button");
    btnSkip.type = "button";
    btnSkip.className = "req-intent-skip";
    btnSkip.textContent = t("reqIntentSkip");
    intentActions.appendChild(btnIntent);
    intentActions.appendChild(btnSkip);
    intentPanel.appendChild(intentLead);
    intentPanel.appendChild(taIntent);
    intentPanel.appendChild(intentErr);
    intentPanel.appendChild(intentHint);
    intentPanel.appendChild(intentActions);
    bundle.appendChild(intentPanel);

    var form = document.createElement("form");
    form.className = "req-form";
    form.noValidate = true;
    form.hidden = true;

    var guestSection = resSection("reqResSectionGuest", t);
    guestSection.inner.appendChild(fieldText("name", "reqLabelName", t, true));
    guestSection.inner.appendChild(fieldText("room", "reqLabelRoom", t, true));
    guestSection.inner.appendChild(fieldNationality(t));
    form.appendChild(guestSection.section);

    var detailSection = resSection("reqSectionRequestDetails", t);
    var categoryField = buildSingleCategoryField("request", "reqLabelRequestCategory", t, "category");
    detailSection.inner.appendChild(categoryField.wrap);
    var dynamicFields = document.createElement("div");
    dynamicFields.className = "req-request-details";
    detailSection.inner.appendChild(dynamicFields);
    form.appendChild(detailSection.section);

    var noteSection = resSection("reqSectionExtraNote", t);
    var noteField = fieldDesc(t, "rr", "description", false);
    noteField.querySelector("label").textContent = t("reqLabelExtraNote");
    noteSection.inner.appendChild(noteField);
    form.appendChild(noteSection.section);

    var err = document.createElement("p");
    err.className = "req-err";
    err.hidden = true;
    form.appendChild(err);

    var submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "btn-primary req-submit";
    submit.textContent = t("reqSubmit");
    form.appendChild(submit);

    bundle.appendChild(form);

    var success = document.createElement("div");
    success.className = "req-success";
    success.hidden = true;
    success.innerHTML = '<h3 class="req-success__title"></h3><p class="req-success__body"></p>';

    var intentState = { mode: "gate", pendingCategory: null };

    function selectedCategory() {
      var c = form.querySelector('input[name="category"]:checked');
      return c ? c.value : "";
    }

    function unlockRequestForm(preselectCat) {
      intentState.mode = "unlocked";
      intentState.pendingCategory = null;
      intentErr.hidden = true;
      intentHint.hidden = true;
      form.hidden = false;
      intentPanel.classList.add("req-intent-panel--done");
      taIntent.setAttribute("readonly", "readonly");
      if (preselectCat) {
        var radio = form.querySelector('input[name="category"][value="' + preselectCat + '"]');
        if (radio) radio.checked = true;
        renderRequestDetailsFields(dynamicFields, preselectCat, t);
      } else {
        renderRequestDetailsFields(dynamicFields, selectedCategory(), t);
      }
    }

    categoryField.chips.addEventListener("change", function () {
      renderRequestDetailsFields(dynamicFields, selectedCategory(), t);
    });

    btnSkip.addEventListener("click", function () {
      intentErr.hidden = true;
      intentHint.hidden = true;
      unlockRequestForm(null);
    });

    btnIntent.addEventListener("click", function () {
      intentErr.hidden = true;
      intentHint.hidden = true;
      var raw = String(taIntent.value || "").trim();
      if (raw.length < 2) {
        intentErr.textContent = t("reqIntentTooShort");
        intentErr.hidden = false;
        return;
      }
      var cat = detectRequestCategoryFromText(raw);
      var hasPhrase = hasRequestIntentPhrase(raw);

      if (cat && hasPhrase) {
        unlockRequestForm(cat);
        return;
      }
      if (cat && !hasPhrase) {
        if (intentState.mode === "clarify" && intentState.pendingCategory === cat) {
          unlockRequestForm(cat);
          return;
        }
        intentState.mode = "clarify";
        intentState.pendingCategory = cat;
        intentHint.textContent = t("reqIntentClarify");
        intentHint.hidden = false;
        return;
      }
      intentHint.textContent = t("reqIntentNoKeyword");
      intentHint.hidden = false;
      unlockRequestForm(null);
    });

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      err.hidden = true;
      var category = selectedCategory();
      if (!category) {
        err.textContent = t("reqErrCategoryRequired");
        err.hidden = false;
        return;
      }
      if (!form.reportValidity()) return;
      if (!validateGuestFields(form, err, t)) return;

      var details = collectRequestDetails(form, category);
      if (details.quantity != null && (!Number.isFinite(details.quantity) || details.quantity < 1)) {
        err.textContent = t("reqErrQuantity");
        err.hidden = false;
        return;
      }
      var description = String((form.querySelector('[name="description"]') || {}).value || "").trim();
      var needsDesc = category === "other" || details.itemType === "other";
      if (needsDesc && !description) {
        err.textContent = t("reqErrDescriptionRequiredForOther");
        err.hidden = false;
        return;
      }
      var payload = {
        type: "request",
        name: (form.querySelector('[name="name"]') || {}).value,
        room: (form.querySelector('[name="room"]') || {}).value,
        nationality: (form.querySelector('[name="nationality"]') || {}).value,
        category: category,
        details: details,
        description: description,
        categories: [category],
      };
      runSubmit(payload, bundle, err, success, submit, t, { onSuccessGoHome: onSuccessGoHome });
    });
    return { form: bundle, success: success };
  }

  function buildComplaintForm(t, onSuccessGoHome) {
    var form = document.createElement("form");
    form.className = "req-form";
    form.noValidate = true;

    var guestSection = resSection("reqResSectionGuest", t);
    guestSection.inner.appendChild(fieldText("name", "reqLabelName", t, true));
    guestSection.inner.appendChild(fieldText("room", "reqLabelRoom", t, true));
    guestSection.inner.appendChild(fieldNationality(t));
    form.appendChild(guestSection.section);

    var detailSection = resSection("reqSectionRequestDetails", t);
    var categoryField = buildSingleCategoryField("complaint", "reqLabelComplaintCategory", t, "complaintCategory");
    detailSection.inner.appendChild(categoryField.wrap);
    form.appendChild(detailSection.section);

    var noteSection = resSection("reqSectionExtraNote", t);
    var noteField = fieldDesc(t, "cf", "description", false);
    noteField.querySelector("label").textContent = t("reqLabelExtraNote");
    noteSection.inner.appendChild(noteField);
    form.appendChild(noteSection.section);

    var err = document.createElement("p");
    err.className = "req-err";
    err.hidden = true;
    form.appendChild(err);

    var submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "btn-primary req-submit";
    submit.textContent = t("reqSubmit");
    form.appendChild(submit);

    var success = document.createElement("div");
    success.className = "req-success";
    success.hidden = true;
    success.innerHTML = '<h3 class="req-success__title"></h3><p class="req-success__body"></p>';

    var descriptionRequiredCategories = {
      staff_behavior: true,
      general_areas: true,
      hygiene: true,
      other: true,
    };

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      err.hidden = true;
      var catEl = form.querySelector('input[name="complaintCategory"]:checked');
      var category = catEl ? catEl.value : "";
      if (!category) {
        err.textContent = t("reqErrComplaintCategoryRequired");
        err.hidden = false;
        return;
      }
      if (!form.reportValidity()) return;
      if (!validateGuestFields(form, err, t)) return;
      var description = String((form.querySelector('[name="description"]') || {}).value || "").trim();
      if (descriptionRequiredCategories[category] && !description) {
        err.textContent = t("reqErrComplaintDescriptionRequired");
        err.hidden = false;
        return;
      }
      var payload = {
        type: "complaint",
        name: (form.querySelector('[name="name"]') || {}).value,
        room: (form.querySelector('[name="room"]') || {}).value,
        nationality: (form.querySelector('[name="nationality"]') || {}).value,
        category: category,
        description: description,
        categories: [category],
      };
      if (category === "other") {
        payload.otherCategoryNote = description;
      }
      runSubmit(payload, form, err, success, submit, t, { onSuccessGoHome: onSuccessGoHome });
    });

    return { form: form, success: success };
  }

  function buildFaultForm(t, onSuccessGoHome) {
    var form = document.createElement("form");
    form.className = "req-form";
    form.noValidate = true;

    var guestSection = resSection("reqResSectionGuest", t);
    guestSection.inner.appendChild(fieldText("name", "reqLabelName", t, true));
    guestSection.inner.appendChild(fieldText("room", "reqLabelRoom", t, true));
    guestSection.inner.appendChild(fieldNationality(t));
    form.appendChild(guestSection.section);

    var detailSection = resSection("reqSectionRequestDetails", t);
    var categoryField = buildSingleCategoryField("fault", "reqLabelFaultCategory", t, "faultCategory");
    detailSection.inner.appendChild(categoryField.wrap);

    var locField = document.createElement("div");
    locField.className = "req-field";
    var locLabel = document.createElement("label");
    locLabel.className = "req-label";
    locLabel.textContent = t("reqLabelFaultLocation");
    var locSelect = document.createElement("select");
    locSelect.className = "req-input";
    locSelect.name = "location";
    locSelect.required = true;
    [
      { value: "", key: "reqSelectPlaceholder" },
      { value: "room_inside", key: "reqOptFaultLocationRoomInside" },
      { value: "bathroom", key: "reqOptFaultLocationBathroom" },
      { value: "balcony", key: "reqOptFaultLocationBalcony" },
      { value: "other", key: "reqCatOther" },
    ].forEach(function (o) {
      var op = document.createElement("option");
      op.value = o.value;
      op.textContent = t(o.key);
      locSelect.appendChild(op);
    });
    locField.appendChild(locLabel);
    locField.appendChild(locSelect);
    detailSection.inner.appendChild(locField);

    var urgField = document.createElement("div");
    urgField.className = "req-field";
    var urgLabel = document.createElement("label");
    urgLabel.className = "req-label";
    urgLabel.textContent = t("reqLabelFaultUrgency");
    var urgSelect = document.createElement("select");
    urgSelect.className = "req-input";
    urgSelect.name = "urgency";
    urgSelect.required = true;
    [
      { value: "", key: "reqSelectPlaceholder" },
      { value: "normal", key: "reqOptFaultUrgencyNormal" },
      { value: "urgent", key: "reqOptFaultUrgencyUrgent" },
    ].forEach(function (o2) {
      var op2 = document.createElement("option");
      op2.value = o2.value;
      op2.textContent = t(o2.key);
      urgSelect.appendChild(op2);
    });
    urgField.appendChild(urgLabel);
    urgField.appendChild(urgSelect);
    detailSection.inner.appendChild(urgField);
    form.appendChild(detailSection.section);

    var noteSection = resSection("reqSectionExtraNote", t);
    var noteField = fieldDesc(t, "ff", "description", false);
    noteField.querySelector("label").textContent = t("reqLabelExtraNote");
    noteSection.inner.appendChild(noteField);
    form.appendChild(noteSection.section);

    var err = document.createElement("p");
    err.className = "req-err";
    err.hidden = true;
    form.appendChild(err);

    var submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "btn-primary req-submit";
    submit.textContent = t("reqSubmit");
    form.appendChild(submit);

    var success = document.createElement("div");
    success.className = "req-success";
    success.hidden = true;
    success.innerHTML = '<h3 class="req-success__title"></h3><p class="req-success__body"></p>';

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      err.hidden = true;
      var catEl = form.querySelector('input[name="faultCategory"]:checked');
      var category = catEl ? catEl.value : "";
      if (!category) {
        err.textContent = t("reqErrFaultCategoryRequired");
        err.hidden = false;
        return;
      }
      if (!form.reportValidity()) return;
      if (!validateGuestFields(form, err, t)) return;
      var description = String((form.querySelector('[name="description"]') || {}).value || "").trim();
      var location = String((form.querySelector('[name="location"]') || {}).value || "").trim();
      if ((category === "other" || location === "other") && !description) {
        err.textContent = t("reqErrDescriptionRequiredForOther");
        err.hidden = false;
        return;
      }
      var payload = {
        type: "fault",
        name: (form.querySelector('[name="name"]') || {}).value,
        room: (form.querySelector('[name="room"]') || {}).value,
        nationality: (form.querySelector('[name="nationality"]') || {}).value,
        category: category,
        location: location,
        urgency: (form.querySelector('[name="urgency"]') || {}).value,
        description: description,
        categories: [category],
      };
      if (category === "other") {
        payload.otherCategoryNote = description;
      }
      runSubmit(payload, form, err, success, submit, t, { onSuccessGoHome: onSuccessGoHome });
    });

    return { form: form, success: success };
  }

  var GUEST_NOTIF_DESC_REQUIRED = {
    food_sensitivity_general: true,
    other_health: true,
    other_celebration: true,
  };

  function buildGuestNotificationForm(t, onSuccessGoHome) {
    var form = document.createElement("form");
    form.className = "req-form";
    form.noValidate = true;

    var guestSection = resSection("reqResSectionGuest", t);
    guestSection.inner.appendChild(fieldText("name", "reqLabelName", t, true));
    guestSection.inner.appendChild(fieldText("room", "reqLabelRoom", t, true));
    guestSection.inner.appendChild(fieldNationality(t));
    form.appendChild(guestSection.section);

    var detailSection = resSection("reqSectionGuestNotificationDetails", t);
    var groups = (getCfg().guestNotificationGroups || []).slice();
    var firstRadio = true;
    groups.forEach(function (g) {
      var groupWrap = document.createElement("div");
      groupWrap.className = "req-notif-group";
      var groupTitle = document.createElement("div");
      groupTitle.className = "req-notif-group__title";
      groupTitle.textContent = t(g.sectionKey);
      var chips = document.createElement("div");
      chips.className = "req-chips";
      chips.setAttribute("role", "radiogroup");
      chips.setAttribute("aria-label", t(g.sectionKey));
      (g.items || []).forEach(function (c) {
        var lab = document.createElement("label");
        lab.className = "req-chip";
        var radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "guestNotifCategory";
        radio.value = c.id;
        if (firstRadio) {
          radio.required = true;
          firstRadio = false;
        }
        var span = document.createElement("span");
        span.className = "req-chip__text";
        span.textContent = t(c.key);
        lab.appendChild(radio);
        lab.appendChild(span);
        chips.appendChild(lab);
      });
      groupWrap.appendChild(groupTitle);
      groupWrap.appendChild(chips);
      detailSection.inner.appendChild(groupWrap);
    });
    form.appendChild(detailSection.section);

    var noteSection = resSection("reqSectionExtraNote", t);
    var noteField = fieldDesc(t, "gn", "description", false);
    noteField.querySelector("label").textContent = t("reqLabelGuestNotificationNote");
    var noteHint = document.createElement("p");
    noteHint.className = "req-notif-note-hint";
    noteHint.textContent = t("reqNotifNoteHint");
    noteSection.inner.appendChild(noteHint);
    noteSection.inner.appendChild(noteField);
    form.appendChild(noteSection.section);

    var err = document.createElement("p");
    err.className = "req-err";
    err.hidden = true;
    form.appendChild(err);

    var submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "btn-primary req-submit";
    submit.textContent = t("reqSubmit");
    form.appendChild(submit);

    var success = document.createElement("div");
    success.className = "req-success";
    success.hidden = true;
    success.innerHTML = '<h3 class="req-success__title"></h3><p class="req-success__body"></p>';

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      err.hidden = true;
      var catEl = form.querySelector('input[name="guestNotifCategory"]:checked');
      var category = catEl ? catEl.value : "";
      if (!category) {
        err.textContent = t("reqErrGuestNotificationCategoryRequired");
        err.hidden = false;
        return;
      }
      if (!form.reportValidity()) return;
      if (!validateGuestFields(form, err, t)) return;
      var description = String((form.querySelector('[name="description"]') || {}).value || "").trim();
      if (GUEST_NOTIF_DESC_REQUIRED[category] && !description) {
        err.textContent = t("reqErrGuestNotificationDescriptionRequired");
        err.hidden = false;
        return;
      }
      var payload = {
        type: "guest_notification",
        name: (form.querySelector('[name="name"]') || {}).value,
        room: (form.querySelector('[name="room"]') || {}).value,
        nationality: (form.querySelector('[name="nationality"]') || {}).value,
        category: category,
        description: description,
        categories: [category],
      };
      if (category === "other_health" || category === "other_celebration") {
        payload.otherCategoryNote = description || null;
      }
      runSubmit(payload, form, err, success, submit, t, {
        onSuccessGoHome: onSuccessGoHome,
        successBodyKey: "reqSuccessBodyGuestNotification",
      });
    });

    return { form: form, success: success };
  }

  function validateSimpleForm(form, err, t) {
    var cats = form.querySelectorAll('input[name="categories"]:checked');
    if (!cats.length) {
      err.textContent = t("reqErrCategories");
      err.hidden = false;
      return false;
    }
    var hasOther = false;
    for (var i = 0; i < cats.length; i++) {
      if (cats[i].value === "other") hasOther = true;
    }
    if (hasOther) {
      var note = (form.querySelector('[name="otherCategoryNote"]') || {}).value;
      if (!note || !String(note).trim()) {
        err.textContent = t("reqErrOtherDetail");
        err.hidden = false;
        return false;
      }
    }
    if (!form.reportValidity()) return false;
    return true;
  }

  function wireSimpleSubmit(form, err, success, submitBtn, typeKey, t, onSuccessGoHome) {
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      err.hidden = true;
      if (!validateSimpleForm(form, err, t)) return;
      if (!validateGuestFields(form, err, t)) return;
      var fd = new FormData(form);
      var catIds = [];
      form.querySelectorAll('input[name="categories"]:checked').forEach(function (c) {
        catIds.push(c.value);
      });
      var payload = {
        type: typeKey,
        name: fd.get("name"),
        room: fd.get("room"),
        nationality: fd.get("nationality"),
        description: fd.get("description"),
        categories: catIds,
      };
      if (catIds.indexOf("other") >= 0) {
        payload.otherCategoryNote = fd.get("otherCategoryNote") || "";
      }
      runSubmit(payload, form, err, success, submitBtn, t, { onSuccessGoHome: onSuccessGoHome });
    });
  }

  function runSubmit(payload, form, err, success, submitBtn, t, options) {
    options = options || {};
    submitBtn.disabled = true;
    submitBtn.textContent = t("reqSending");
    var fn = window.submitGuestRequest;
    if (typeof fn !== "function") {
      err.textContent = t("reqErrApi");
      err.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = t("reqSubmit");
      return;
    }
    fn(payload)
      .then(function (res) {
        form.hidden = true;
        success.hidden = false;
        success.querySelector(".req-success__title").textContent = t("reqSuccessTitle");
        success.querySelector(".req-success__body").textContent =
          t(options.successBodyKey || "reqSuccessBody");
        var goHome = options.onSuccessGoHome;
        if (typeof goHome === "function") {
          var ms =
            typeof options.successThenHomeMs === "number" && options.successThenHomeMs >= 0
              ? options.successThenHomeMs
              : REQ_SUCCESS_THEN_HOME_MS;
          setTimeout(function () {
            goHome();
          }, ms);
        }
      })
      .catch(function () {
        err.textContent = t("reqErrSend");
        err.hidden = false;
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = t("reqSubmit");
      });
  }

  function buildSimpleTypeForm(typeKey, group, t, onSuccessGoHome) {
    var form = document.createElement("form");
    form.className = "req-form";
    form.noValidate = true;
    form.appendChild(fieldText("name", "reqLabelName", t, true));
    form.appendChild(fieldText("room", "reqLabelRoom", t, true));
    form.appendChild(fieldNationality(t));
    form.appendChild(buildCategorySection(group, t));
    form.appendChild(fieldDesc(t));

    var err = document.createElement("p");
    err.className = "req-err";
    err.hidden = true;
    form.appendChild(err);

    var submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "btn-primary req-submit";
    submit.textContent = t("reqSubmit");
    form.appendChild(submit);

    var success = document.createElement("div");
    success.className = "req-success";
    success.hidden = true;
    success.innerHTML = '<h3 class="req-success__title"></h3><p class="req-success__body"></p>';

    wireSimpleSubmit(form, err, success, submit, typeKey, t, onSuccessGoHome);
    return { form: form, success: success };
  }

  function buildReservationBlock(t, minIso, minMonth, onSuccessGoHome) {
    var cfg = getCfg();
    var calMinMonth = minIso.slice(0, 7);

    var root = document.createElement("div");
    root.className = "req-res-prestige";

    var lead = document.createElement("p");
    lead.className = "req-res-lead";
    lead.textContent = t("reqResLead");

    var pick = document.createElement("p");
    pick.className = "req-res-pick-label";
    pick.textContent = t("reqResPickType");

    var seg = document.createElement("div");
    seg.className = "req-res-segmented";
    seg.setAttribute("role", "tablist");

    var tabAl = document.createElement("button");
    tabAl.type = "button";
    tabAl.className = "req-res-seg__btn";
    tabAl.setAttribute("role", "tab");
    tabAl.setAttribute("aria-selected", "true");
    tabAl.innerHTML =
      '<span class="req-res-seg__ico">' +
      HUB_ICONS.res +
      '</span><span>' +
      t("reqTabAlacarte") +
      "</span>";

    var tabSp = document.createElement("button");
    tabSp.type = "button";
    tabSp.className = "req-res-seg__btn";
    tabSp.setAttribute("role", "tab");
    tabSp.setAttribute("aria-selected", "false");
    tabSp.innerHTML =
      '<span class="req-res-seg__ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 3c-2 3-6 4-6 9a6 6 0 0012 0c0-5-4-6-6-9z"/><path d="M12 18v3"/></svg></span><span>' +
      t("reqTabSpa") +
      "</span>";

    var mount = document.createElement("div");
    mount.className = "req-res-form-mount";

    function buildAlacarteDom() {
      var outer = document.createElement("div");
      outer.className = "req-res-active";

      var form = document.createElement("form");
      form.className = "req-form req-form--res";
      form.noValidate = true;

      var s0 = resSection("reqResSectionGuest", t);
      s0.inner.appendChild(fieldText("name", "reqLabelName", t, true, "al"));
      s0.inner.appendChild(fieldText("room", "reqLabelRoom", t, true, "al"));
      s0.inner.appendChild(fieldNationality(t, "al"));
      form.appendChild(s0.section);

      var s1 = resSection("reqResSectionRestaurant", t);
      var restGrid = document.createElement("div");
      restGrid.className = "req-res-rest-grid";
      restGrid.setAttribute("role", "radiogroup");
      cfg.restaurants.forEach(function (r) {
        var lab = document.createElement("label");
        lab.className = "req-res-rest-card";
        var rad = document.createElement("input");
        rad.type = "radio";
        rad.name = "restaurant";
        rad.value = r.id;
        rad.required = true;
        var tx = document.createElement("span");
        tx.className = "req-res-rest-card__text";
        tx.textContent = t(r.key);
        lab.appendChild(rad);
        lab.appendChild(tx);
        restGrid.appendChild(lab);
      });
      s1.inner.appendChild(restGrid);
      var ruleInfo = document.createElement("p");
      ruleInfo.className = "req-res-info-note";
      s1.inner.appendChild(ruleInfo);
      form.appendChild(s1.section);

      var s2 = resSection("reqResSectionDateTime", t);
      var hiddenRes = document.createElement("input");
      hiddenRes.type = "hidden";
      hiddenRes.name = "reservationDate";
      hiddenRes.value = "";
      var hostRes = document.createElement("div");
      s2.inner.appendChild(
        calBlock(t("reqLabelResDate"), hiddenRes, hostRes, minIso, calMinMonth, t)
      );

      var timeHidden = document.createElement("input");
      timeHidden.type = "hidden";
      timeHidden.name = "time";
      timeHidden.value = "";

      var timeLab = document.createElement("span");
      timeLab.className = "req-label";
      timeLab.textContent = t("reqLabelTime");
      var slotWrap = document.createElement("div");
      slotWrap.className = "req-res-slot-wrap req-res-slot-wrap--scroll";
      s2.inner.appendChild(timeLab);
      s2.inner.appendChild(slotWrap);
      s2.inner.appendChild(timeHidden);

      function refreshSlotsFromRestaurant(rid) {
        var slots = (window.getTimeSlotsForRestaurant || function () {
          return [];
        })(rid);
        fillSlotButtons(slotWrap, slots, timeHidden, t, "reqPickRestaurantFirst");
        var rest = cfg.restaurants.filter(function (x) { return x.id === rid; })[0];
        ruleInfo.textContent = rest && rest.infoKey ? t(rest.infoKey) : "";
        var isSinton = rid === "sinton";
        s3.section.classList.toggle("hidden", isSinton);
        s3.section.setAttribute("aria-hidden", isSinton ? "true" : "false");
        if (isSinton) {
          hIn.value = "";
          hOut.value = "";
          refreshStay();
        }
      }

      restGrid.addEventListener("change", function () {
        var sel = form.querySelector('input[name="restaurant"]:checked');
        refreshSlotsFromRestaurant(sel ? sel.value : "");
      });

      form.appendChild(s2.section);

      var s3 = resSection("reqResSectionStay", t);
      var stayGrid = document.createElement("div");
      stayGrid.className = "req-res-stay-grid";
      var hIn = document.createElement("input");
      hIn.type = "hidden";
      hIn.name = "stayCheckIn";
      hIn.value = "";
      var hOut = document.createElement("input");
      hOut.type = "hidden";
      hOut.name = "stayCheckOut";
      hOut.value = "";
      var cIn = document.createElement("div");
      var cOut = document.createElement("div");
      stayGrid.appendChild(calBlock(t("reqLabelStayCheckIn"), hIn, cIn, minIso, calMinMonth, t));
      stayGrid.appendChild(calBlock(t("reqLabelStayCheckOut"), hOut, cOut, minIso, calMinMonth, t));
      s3.inner.appendChild(stayGrid);

      var stayBanner = document.createElement("div");
      stayBanner.className = "req-stay-banner";
      var stayLine = document.createElement("p");
      stayLine.className = "req-stay-banner__main";
      var staySub = document.createElement("p");
      staySub.className = "req-stay-banner__nights";
      stayBanner.appendChild(stayLine);
      stayBanner.appendChild(staySub);
      s3.inner.appendChild(stayBanner);

      function refreshStay() {
        var a = hIn.value;
        var b = hOut.value;
        stayLine.textContent = "";
        staySub.textContent = "";
        stayBanner.classList.remove("req-stay-banner--promo", "req-stay-banner--paid", "req-stay-banner--warn");
        if (!a || !b) return;
        var n = nightsBetween(a, b);
        if (n <= 0) {
          stayLine.textContent = t("reqErrStayRange");
          stayBanner.classList.add("req-stay-banner--warn");
          return;
        }
        staySub.textContent = t("reqStayNightsCount").replace(/\{n\}/g, String(n));
        if (n >= 5) {
          stayLine.textContent = t("reqStayPromo7");
          stayBanner.classList.add("req-stay-banner--promo");
        } else {
          stayLine.textContent = t("reqStayPaid");
          stayBanner.classList.add("req-stay-banner--paid");
        }
      }
      hIn.addEventListener("change", refreshStay);
      hOut.addEventListener("change", refreshStay);

      form.appendChild(s3.section);
      refreshSlotsFromRestaurant("");

      var noteAl = fieldDesc(t, "al", "note", false);
      noteAl.querySelector("label").textContent = t("reqLabelNote");
      noteAl.querySelector("textarea").classList.add("req-input--res");
      form.appendChild(noteAl);

      var guestCountField = document.createElement("div");
      guestCountField.className = "req-field";
      var guestCountLabel = document.createElement("label");
      guestCountLabel.className = "req-label";
      guestCountLabel.textContent = t("reqLabelGuestCount");
      var guestCountInput = document.createElement("input");
      guestCountInput.type = "number";
      guestCountInput.name = "guestCount";
      guestCountInput.className = "req-input";
      guestCountInput.min = "1";
      guestCountInput.max = "12";
      guestCountInput.step = "1";
      guestCountInput.required = true;
      guestCountField.appendChild(guestCountLabel);
      guestCountField.appendChild(guestCountInput);
      form.appendChild(guestCountField);

      var errAl = document.createElement("p");
      errAl.className = "req-err";
      errAl.hidden = true;
      form.appendChild(errAl);
      var subAl = document.createElement("button");
      subAl.type = "submit";
      subAl.className = "btn-primary req-submit req-submit--res";
      subAl.textContent = t("reqSubmit");
      form.appendChild(subAl);

      var okAl = document.createElement("div");
      okAl.className = "req-success req-success--res";
      okAl.hidden = true;
      okAl.innerHTML = '<h3 class="req-success__title"></h3><p class="req-success__body"></p>';

      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        errAl.hidden = true;
        if (!hiddenRes.value) {
          errAl.textContent = t("reqErrDate");
          errAl.hidden = false;
          return;
        }
        if (!timeHidden.value) {
          errAl.textContent = t("reqErrTime");
          errAl.hidden = false;
          return;
        }
        var ridEarly = String((new FormData(form)).get("restaurant") || "");
        var skipStay = ridEarly === "sinton";
        if (!skipStay) {
          if (!hIn.value || !hOut.value) {
            errAl.textContent = t("reqErrStayDates");
            errAl.hidden = false;
            return;
          }
          if (nightsBetween(hIn.value, hOut.value) <= 0) {
            errAl.textContent = t("reqErrStayRange");
            errAl.hidden = false;
            return;
          }
        }
        if (!form.reportValidity()) return;
        if (!validateGuestFields(form, errAl, t)) return;
        var fd = new FormData(form);
        var rid = String(fd.get("restaurant") || "");
        var restCfg = cfg.restaurants.filter(function (x) { return x.id === rid; })[0] || null;
        var selectedWeekday = weekdayFromIso(String(fd.get("reservationDate") || ""));
        if (
          restCfg &&
          Array.isArray(restCfg.closedWeekdays) &&
          restCfg.closedWeekdays.indexOf(selectedWeekday) >= 0
        ) {
          errAl.textContent = t("reqErrRestaurantClosedDay");
          errAl.hidden = false;
          return;
        }
        var isSintonRes = rid === "sinton";
        var nts = isSintonRes
          ? 0
          : nightsBetween(fd.get("stayCheckIn"), fd.get("stayCheckOut"));
        var guestCount = parseInt(String(fd.get("guestCount") || "0"), 10);
        if (!Number.isFinite(guestCount) || guestCount < 1) {
          errAl.textContent = t("reqErrGuestCount");
          errAl.hidden = false;
          return;
        }
        var resObj = {
          restaurantId: rid,
          restaurantCode: restCfg && restCfg.code ? restCfg.code : rid,
          serviceLabel: restCfg ? t(restCfg.key) : rid,
          reservationDate: fd.get("reservationDate"),
          time: fd.get("time"),
          guestCount: guestCount,
        };
        if (!isSintonRes) {
          resObj.stayCheckIn = fd.get("stayCheckIn");
          resObj.stayCheckOut = fd.get("stayCheckOut");
          resObj.nights = nts;
          resObj.stayPromoApplies = nts >= 5;
        }
        var payload = {
          type: "reservation_alacarte",
          name: fd.get("name"),
          room: fd.get("room"),
          nationality: fd.get("nationality"),
          description: fd.get("note"),
          language: currentUiLanguage(),
          guestCount: guestCount,
          reservation: resObj,
        };
        runSubmit(payload, form, errAl, okAl, subAl, t, {
          successBodyKey: "reqSuccessBodyReservation",
          onSuccessGoHome: onSuccessGoHome,
        });
      });

      outer.appendChild(form);
      outer.appendChild(okAl);
      return outer;
    }

    function buildSpaDom() {
      var outer = document.createElement("div");
      outer.className = "req-res-active";

      var form = document.createElement("form");
      form.className = "req-form req-form--res";
      form.noValidate = true;

      var s0 = resSection("reqResSectionGuest", t);
      s0.inner.appendChild(fieldText("name", "reqLabelName", t, true, "sp"));
      s0.inner.appendChild(fieldText("room", "reqLabelRoom", t, true, "sp"));
      s0.inner.appendChild(fieldNationality(t, "sp"));
      form.appendChild(s0.section);

      var s1 = resSection("reqResSectionSpa", t);
      var svcGrid = document.createElement("div");
      svcGrid.className = "req-res-rest-grid";
      svcGrid.setAttribute("role", "radiogroup");
      cfg.spaServices.forEach(function (s) {
        var lab = document.createElement("label");
        lab.className = "req-res-rest-card";
        var rad = document.createElement("input");
        rad.type = "radio";
        rad.name = "spaService";
        rad.value = s.id;
        rad.required = true;
        var tx = document.createElement("span");
        tx.className = "req-res-rest-card__text";
        tx.textContent = t(s.key);
        lab.appendChild(rad);
        lab.appendChild(tx);
        svcGrid.appendChild(lab);
      });
      s1.inner.appendChild(svcGrid);
      form.appendChild(s1.section);

      var s2 = resSection("reqResSectionDateTime", t);
      var hiddenSp = document.createElement("input");
      hiddenSp.type = "hidden";
      hiddenSp.name = "spaDate";
      hiddenSp.value = "";
      var hostSp = document.createElement("div");
      s2.inner.appendChild(calBlock(t("reqLabelSpaDate"), hiddenSp, hostSp, minIso, calMinMonth, t));

      var timeHidden = document.createElement("input");
      timeHidden.type = "hidden";
      timeHidden.name = "time";
      timeHidden.value = "";

      var timeLab = document.createElement("span");
      timeLab.className = "req-label";
      timeLab.textContent = t("reqLabelTime");
      var slotWrap = document.createElement("div");
      slotWrap.className = "req-res-slot-wrap req-res-slot-wrap--scroll";
      s2.inner.appendChild(timeLab);
      s2.inner.appendChild(slotWrap);
      s2.inner.appendChild(timeHidden);

      fillSlotButtons(slotWrap, cfg.spaTimeSlots || [], timeHidden, t, "reqErrApi");

      form.appendChild(s2.section);

      var noteSp = fieldDesc(t, "sp", "note", false);
      noteSp.querySelector("label").textContent = t("reqLabelNote");
      noteSp.querySelector("textarea").classList.add("req-input--res");
      form.appendChild(noteSp);

      var guestCountField = document.createElement("div");
      guestCountField.className = "req-field";
      var guestCountLabel = document.createElement("label");
      guestCountLabel.className = "req-label";
      guestCountLabel.textContent = t("reqLabelGuestCount");
      var guestCountInput = document.createElement("input");
      guestCountInput.type = "number";
      guestCountInput.name = "guestCount";
      guestCountInput.className = "req-input";
      guestCountInput.min = "1";
      guestCountInput.max = "6";
      guestCountInput.step = "1";
      guestCountInput.required = true;
      guestCountField.appendChild(guestCountLabel);
      guestCountField.appendChild(guestCountInput);
      form.appendChild(guestCountField);

      var errSp = document.createElement("p");
      errSp.className = "req-err";
      errSp.hidden = true;
      form.appendChild(errSp);
      var subSp = document.createElement("button");
      subSp.type = "submit";
      subSp.className = "btn-primary req-submit req-submit--res";
      subSp.textContent = t("reqSubmit");
      form.appendChild(subSp);

      var okSp = document.createElement("div");
      okSp.className = "req-success req-success--res";
      okSp.hidden = true;
      okSp.innerHTML = '<h3 class="req-success__title"></h3><p class="req-success__body"></p>';

      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        errSp.hidden = true;
        if (!hiddenSp.value) {
          errSp.textContent = t("reqErrDate");
          errSp.hidden = false;
          return;
        }
        if (!timeHidden.value) {
          errSp.textContent = t("reqErrTime");
          errSp.hidden = false;
          return;
        }
        if (!form.reportValidity()) return;
        if (!validateGuestFields(form, errSp, t)) return;
        var fd = new FormData(form);
        var guestCount = parseInt(String(fd.get("guestCount") || "0"), 10);
        if (!Number.isFinite(guestCount) || guestCount < 1) {
          errSp.textContent = t("reqErrGuestCount");
          errSp.hidden = false;
          return;
        }
        var svcId = String(fd.get("spaService") || "");
        var svcCfg = cfg.spaServices.filter(function (x) { return x.id === svcId; })[0] || null;
        var payload = {
          type: "reservation_spa",
          name: fd.get("name"),
          room: fd.get("room"),
          nationality: fd.get("nationality"),
          description: fd.get("note"),
          language: currentUiLanguage(),
          guestCount: guestCount,
          reservation: {
            spaServiceId: svcId,
            serviceCode: svcCfg && svcCfg.code ? svcCfg.code : svcId,
            serviceLabel: svcCfg ? t(svcCfg.key) : svcId,
            date: fd.get("spaDate"),
            time: fd.get("time"),
            guestCount: guestCount,
          },
        };
        runSubmit(payload, form, errSp, okSp, subSp, t, {
          successBodyKey: "reqSuccessBodyReservation",
          onSuccessGoHome: onSuccessGoHome,
        });
      });

      outer.appendChild(form);
      outer.appendChild(okSp);
      return outer;
    }

    function renderMount(which) {
      while (mount.firstChild) {
        mount.removeChild(mount.firstChild);
      }
      if (which === "alacarte") {
        mount.appendChild(buildAlacarteDom());
      } else {
        mount.appendChild(buildSpaDom());
      }
    }

    function setTab(which) {
      try {
        sessionStorage.setItem(RES_TAB_KEY, which);
      } catch (e) {}
      var al = which === "alacarte";
      tabAl.classList.toggle("req-res-seg__btn--active", al);
      tabSp.classList.toggle("req-res-seg__btn--active", !al);
      tabAl.setAttribute("aria-selected", al ? "true" : "false");
      tabSp.setAttribute("aria-selected", al ? "false" : "true");
      renderMount(which);
    }

    var initial = "alacarte";
    try {
      initial = sessionStorage.getItem(RES_TAB_KEY) || "alacarte";
    } catch (e2) {}
    if (initial !== "spa" && initial !== "alacarte") initial = "alacarte";

    tabAl.addEventListener("click", function () {
      setTab("alacarte");
    });
    tabSp.addEventListener("click", function () {
      setTab("spa");
    });

    seg.appendChild(tabAl);
    seg.appendChild(tabSp);
    root.appendChild(lead);
    root.appendChild(pick);
    root.appendChild(seg);
    root.appendChild(mount);
    setTab(initial);

    return root;
  }

  function renderGuestRequestsModule(container, t, subId, api) {
    api = api || {};
    var setSub = api.setSub || function () {};
    var moduleTitleKey = api.moduleTitleKey || "modRequests";
    var subDefs = api.subDefs || [];
    var onSuccessGoHome =
      typeof api.onRequestSuccessGoHome === "function" ? api.onRequestSuccessGoHome : null;

    var minIso = (window.getCalendarMinDateISO || function () {
      return "2026-03-01";
    })();
    var minMonth = minIso.slice(0, 7);

    var wrap = document.createElement("div");
    wrap.className = "req-wrap";

    if (!subId) {
      var h2 = document.createElement("h2");
      h2.textContent = t(moduleTitleKey);
      var intro = document.createElement("p");
      intro.className = "req-intro";
      intro.textContent = t("reqIntro");
      var hub = document.createElement("div");
      hub.className = "req-hub";
      subDefs.forEach(function (sub) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "req-hub__card";
        var ico = HUB_ICONS[sub.id] || HUB_ICONS.request;
        btn.innerHTML =
          '<span class="req-hub__icon" aria-hidden="true">' +
          ico +
          '</span><span class="req-hub__label">' +
          t(sub.i18nKey) +
          "</span>";
        btn.addEventListener("click", function () {
          setSub(sub.id);
        });
        hub.appendChild(btn);
      });
      wrap.appendChild(h2);
      wrap.appendChild(intro);
      wrap.appendChild(hub);
      container.appendChild(wrap);
      return;
    }

    var subMeta = subDefs.filter(function (s) {
      return s.id === subId;
    })[0];
    var h2f = document.createElement("h2");
    h2f.textContent = subMeta ? t(subMeta.i18nKey) : t(moduleTitleKey);
    h2f.className = "req-form-title";

    var backHub = document.createElement("button");
    backHub.type = "button";
    backHub.className = "req-back-hub";
    backHub.textContent = t("reqBackToHub");

    backHub.addEventListener("click", function () {
      setSub(null);
    });

    wrap.appendChild(h2f);
    wrap.appendChild(backHub);

    if (subId === "request") {
      var b = buildRequestForm(t, onSuccessGoHome);
      wrap.appendChild(b.form);
      wrap.appendChild(b.success);
    } else if (subId === "complaint") {
      var bc = buildComplaintForm(t, onSuccessGoHome);
      wrap.appendChild(bc.form);
      wrap.appendChild(bc.success);
    } else if (subId === "fault") {
      var bf = buildFaultForm(t, onSuccessGoHome);
      wrap.appendChild(bf.form);
      wrap.appendChild(bf.success);
    } else if (subId === "guest_notification") {
      var leadN = document.createElement("p");
      leadN.className = "req-intro";
      leadN.textContent = t("reqNotifIntro");
      wrap.appendChild(leadN);
      var bn = buildGuestNotificationForm(t, onSuccessGoHome);
      wrap.appendChild(bn.form);
      wrap.appendChild(bn.success);
    } else if (subId === "res") {
      wrap.appendChild(buildReservationBlock(t, minIso, minMonth, onSuccessGoHome));
    } else {
      var p = document.createElement("p");
      p.className = "placeholder";
      p.textContent = t("placeholderBody");
      wrap.appendChild(p);
    }

    container.appendChild(wrap);
  }

  window.renderGuestRequestsModule = renderGuestRequestsModule;
  window.renderRequestsModule = renderGuestRequestsModule;
})();
