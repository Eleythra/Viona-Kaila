/**
 * İstek / şikayet / arıza / misafir bildirimleri — hub + formlar.
 */
(function () {
  "use strict";

  /** Anket modülü (survey-render.js) ile aynı süre: teşekkür kısa görünsün, sonra ana sayfa. */
  var REQ_SUCCESS_THEN_HOME_MS = 2600;

  /** Sohbet formu / sunucu `guest-full-name.js` ile aynı — değişince senkron tutun. */
  var GUEST_NAME_MAX_LEN = 120;
  var GUEST_DESC_MAX_LEN = 1000;

  /** Sunucu `error` metinleri → i18n anahtarı (bilinen İngilizce mesajlar). */
  var GUEST_REQUEST_API_ERR_I18N = {
    "invalid type": "reqApiErrInvalidType",
    "type is required": "reqApiErrTypeRequired",
    "name is required": "reqApiErrNameRequired",
    "room is required": "reqApiErrRoomRequired",
    "nationality is required": "reqApiErrNationalityRequired",
    "name must contain letters only": "reqErrNameInvalid",
    "name is too long": "reqErrNameTooLongForm",
    "name must be first and last name": "reqErrNameNeedTwoWords",
    "name is too short": "reqErrNameTooShortForm",
    "name word too short": "reqErrNameWordTooShort",
    "description is too long": "reqErrDescTooLong",
    "other category note is too long": "reqErrDescTooLong",
    "invalid hotel room number": "reqErrRoomDigits",
    "nationality must contain letters only": "reqErrNationalityInvalid",
    "description is required": "reqApiErrDescriptionRequired",
    "description is required for late checkout": "reqErrLateCheckoutNote",
    "checkout date is required (YYYY-MM-DD)": "reqErrLateCheckoutDate",
    "checkout time is required (HH:MM)": "reqErrLateCheckoutTime",
    "checkout date cannot be in the past": "reqApiErrCheckoutPast",
    "guest notification category is required": "reqErrGuestNotificationCategoryRequired",
    "description is required for selected notification category": "reqErrGuestNotificationDescriptionRequired",
    "guest_request_submit_failed": "reqErrSend",
    "guest_request_create_failed": "reqErrSend",
    "guest_request_bad_response": "reqApiErrBadResponse",
    request_timeout: "reqApiErrTimeout",
    SUPABASE_NOT_CONFIGURED: "reqApiErrSupabase",
  };

  function translateGuestRequestApiError(raw, t) {
    var s = String(raw || "").trim();
    if (!s) return t("reqErrSend");
    var key = GUEST_REQUEST_API_ERR_I18N[s];
    if (key) {
      var out = t(key);
      if (out && out !== key) return out;
    }
    if (/^http_\d+$/.test(s)) {
      return t("reqApiErrHttpStatus").replace(/\{code\}/g, s.replace(/^http_/, ""));
    }
    if (s === "Failed to fetch" || s.indexOf("NetworkError") === 0) {
      return t("reqApiErrNetwork");
    }
    if (s === "guest_request_submit_failed") return t("reqErrSend");
    var sl = s.toLowerCase();
    if (
      sl.indexOf("violates check constraint") >= 0 ||
      sl.indexOf("permission denied") >= 0 ||
      sl.indexOf("row-level security") >= 0 ||
      (sl.indexOf("could not find the") >= 0 && sl.indexOf("column") >= 0)
    ) {
      return t("reqApiErrDbGeneric");
    }
    if (sl.indexOf("database_insert_failed") >= 0) return t("reqApiErrDbGeneric");
    return s;
  }

  var HUB_ICONS = {
    request:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M21 15a4 4 0 01-4 4H8l-5 3v-3H5a4 4 0 01-4-4V7a4 4 0 014-4h14a4 4 0 014 4v8z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></svg>',
    complaint:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
    fault:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>',

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
    if (v !== "tr" && v !== "en" && v !== "de" && v !== "pl") return "tr";
    return v;
  }

  function pickLangObj(row) {
    if (!row || typeof row !== "object") return "";
    var lang = currentUiLanguage();
    if (row[lang] != null && String(row[lang]).trim() !== "") return String(row[lang]).trim();
    if (row.tr != null && String(row.tr).trim() !== "") return String(row.tr).trim();
    if (row.en != null && String(row.en).trim() !== "") return String(row.en).trim();
    return "";
  }

  function spaServiceDisplayLine(svc, t) {
    var name = "";
    if (svc.label && typeof svc.label === "object") name = pickLangObj(svc.label);
    else if (svc.key) name = t(svc.key);
    var dur =
      svc.durationLine && typeof svc.durationLine === "object" ? pickLangObj(svc.durationLine) : "";
    dur = String(dur || "").trim();
    var price = String(svc.price || "").trim();
    var parts = [];
    if (name) parts.push(name);
    if (dur) parts.push(dur);
    if (price) parts.push(price);
    return parts.length ? parts.join(" · ") : "";
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

  function normalizeGuestNameInputUi(s) {
    try {
      return String(s || "")
        .normalize("NFKC")
        .trim()
        .replace(/\p{Cf}/gu, "");
    } catch (eNorm) {
      return String(s || "").trim();
    }
  }

  function letterCountUi(str) {
    var n = 0;
    try {
      var chars = Array.from(str);
      var ci;
      for (ci = 0; ci < chars.length; ci++) {
        if (/\p{L}/u.test(chars[ci])) n++;
      }
    } catch (eLc) {
      var j;
      for (j = 0; j < str.length; j++) {
        if (/[A-Za-zÀ-žąćęłńóśźżĄĆĘŁŃÓŚŹŻİıĞğÜüŞşÖöÇç]/.test(str[j])) n++;
      }
    }
    return n;
  }

  function allowShortMononymUi(s) {
    if (s.length !== 1) return false;
    var o = s.codePointAt(0);
    return (
      (o >= 0x4e00 && o <= 0x9fff) ||
      (o >= 0x3400 && o <= 0x4dbf) ||
      (o >= 0xac00 && o <= 0xd7af)
    );
  }

  function isCjkOrHangulLetterUi(ch) {
    try {
      if (!/\p{L}/u.test(ch)) return false;
    } catch (e1) {
      return false;
    }
    var o = ch.codePointAt(0);
    return (
      (o >= 0x4e00 && o <= 0x9fff) ||
      (o >= 0x3400 && o <= 0x4dbf) ||
      (o >= 0xac00 && o <= 0xd7af)
    );
  }

  function allowsCjkStyleSingleTokenUi(token) {
    var letters = Array.from(token).filter(function (c) {
      try {
        return /\p{L}/u.test(c);
      } catch (e2) {
        return /[A-Za-zÀ-žąćęłńóśźżĄĆĘŁŃÓŚŹŻİıĞğÜüŞşÖöÇç]/.test(c);
      }
    });
    if (letters.length < 2) return false;
    var i;
    for (i = 0; i < letters.length; i++) {
      if (!isCjkOrHangulLetterUi(letters[i])) return false;
    }
    return true;
  }

  function tokenAlphaLenUi(token) {
    return letterCountUi(token);
  }

  function hasAnyDigitUi(s) {
    try {
      var arr = Array.from(s);
      var di;
      for (di = 0; di < arr.length; di++) {
        if (/\p{Nd}/u.test(arr[di])) return true;
      }
    } catch (e3) {
      return /\d/.test(s);
    }
    return false;
  }

  function hasAnyLetterUi(s) {
    try {
      return /\p{L}/u.test(s);
    } catch (e4) {
      return /[A-Za-zÀ-žąćęłńóśźżĄĆĘŁŃÓŚŹŻİıĞğÜüŞşÖöÇç]/.test(s);
    }
  }

  /** @returns {string|null} hata kodu veya null */
  function validateGuestFullNameUi(text) {
    var s = normalizeGuestNameInputUi(text);
    if (s.length < 1) return "too_short";
    if (s.length > GUEST_NAME_MAX_LEN) return "too_long";
    if (hasAnyDigitUi(s)) return "has_digit";
    if (!hasAnyLetterUi(s)) return "no_letters";
    var lc = letterCountUi(s);
    if (lc < 2 && !allowShortMononymUi(s)) return "too_short";
    var parts = s.split(/\s+/).filter(Boolean);
    if (!parts.length) return "too_short";
    if (parts.length === 1) {
      var tok = parts[0];
      if (tok.length === 1 && allowShortMononymUi(tok)) return null;
      if (allowsCjkStyleSingleTokenUi(tok)) return null;
      return "need_first_last";
    }
    var pi;
    for (pi = 0; pi < parts.length; pi++) {
      if (tokenAlphaLenUi(parts[pi]) < 2) return "token_too_short";
    }
    return null;
  }

  function guestFullNameErrorKey(code) {
    if (code === "need_first_last") return "reqErrNameNeedTwoWords";
    if (code === "too_long") return "reqErrNameTooLongForm";
    if (code === "too_short") return "reqErrNameTooShortForm";
    if (code === "token_too_short") return "reqErrNameWordTooShort";
    return "reqErrNameInvalid";
  }

  function validateGuestDescriptionsLength(form, err, t) {
    var selectors = ['textarea[name="description"]', 'textarea[name="otherCategoryNote"]'];
    var si;
    for (si = 0; si < selectors.length; si++) {
      var el = form.querySelector(selectors[si]);
      if (!el) continue;
      if (String(el.value || "").trim().length > GUEST_DESC_MAX_LEN) {
        err.textContent = t("reqErrDescTooLong");
        err.hidden = false;
        return false;
      }
    }
    return true;
  }

  function validateGuestFields(form, err, t) {
    var name = String((form.querySelector('[name="name"]') || {}).value || "").trim();
    var room = String((form.querySelector('[name="room"]') || {}).value || "").trim();
    var nationality = String((form.querySelector('[name="nationality"]') || {}).value || "").trim();
    var nameCode = validateGuestFullNameUi(name);
    if (nameCode) {
      err.textContent = t(guestFullNameErrorKey(nameCode));
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

  /** HTML time veya metin → HH:MM (sunucu ile aynı mantık). */
  function normalizeLateCheckoutTimeForPayload(raw) {
    var s = String(raw || "").trim();
    if (!s) return "";
    var m = /^(\d{1,2}):(\d{2})(?::\d{2})?/.exec(s);
    if (!m) return "";
    var h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
    var mi = Math.min(59, Math.max(0, parseInt(m[2], 10)));
    return String(h).padStart(2, "0") + ":" + String(mi).padStart(2, "0");
  }

  /**
   * Geç çıkış saati: tetikleyiciye basınca panel açılır; saat + dakika seçilir, dakikada panel kapanır ve saat alanında HH:MM görünür.
   */
  function buildLateCheckoutDropdownTimePicker(pid, t) {
    var root = document.createElement("div");
    root.className = "req-time-dropdown";

    var hidden = document.createElement("input");
    hidden.type = "hidden";
    hidden.name = "checkoutTime";
    hidden.id = pid + "-checkoutTime";

    var trigger = document.createElement("button");
    trigger.type = "button";
    trigger.id = pid + "-checkoutTime-trigger";
    trigger.className = "req-time-dropdown__trigger";
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", pid + "-time-dropdown-panel");

    var valSpan = document.createElement("span");
    valSpan.className = "req-time-dropdown__value";
    var chev = document.createElement("span");
    chev.className = "req-time-dropdown__chev";
    chev.setAttribute("aria-hidden", "true");
    chev.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
    trigger.appendChild(valSpan);
    trigger.appendChild(chev);

    var panel = document.createElement("div");
    panel.id = pid + "-time-dropdown-panel";
    panel.className = "req-time-dropdown__panel";
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", t("reqLabelCheckoutTime"));

    var hint = document.createElement("p");
    hint.className = "req-time-dropdown__hint";
    hint.textContent = t("reqTimeDropdownHint");

    var columns = document.createElement("div");
    columns.className = "req-time-dropdown__columns";

    function makeColumn(labelKey, count, dataKey) {
      var block = document.createElement("div");
      block.className = "req-time-dropdown__block";
      var cap = document.createElement("span");
      cap.className = "req-time-dropdown__caption";
      cap.textContent = t(labelKey);
      var col = document.createElement("div");
      col.className = "req-time-dropdown__col";
      var inner = document.createElement("div");
      inner.className = "req-time-dropdown__col-inner";
      for (var i = 0; i < count; i++) {
        var v = String(i).padStart(2, "0");
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "req-time-dropdown__opt";
        btn.setAttribute("data-" + dataKey, v);
        btn.textContent = v;
        inner.appendChild(btn);
      }
      col.appendChild(inner);
      block.appendChild(cap);
      block.appendChild(col);
      return { block: block, col: col };
    }

    var hoursBlk = makeColumn("reqTimeScrollHours", 24, "hour");
    var minsBlk = makeColumn("reqTimeScrollMinutes", 60, "min");
    var sep = document.createElement("span");
    sep.className = "req-time-dropdown__colon";
    sep.setAttribute("aria-hidden", "true");
    sep.textContent = ":";

    columns.appendChild(hoursBlk.block);
    columns.appendChild(sep);
    columns.appendChild(minsBlk.block);
    panel.appendChild(hint);
    panel.appendChild(columns);

    root.appendChild(trigger);
    root.appendChild(panel);
    root.appendChild(hidden);

    var selH = "12";
    var selM = "00";

    function displayStr() {
      return selH + ":" + selM;
    }

    function syncHidden() {
      hidden.value = displayStr();
      valSpan.textContent = displayStr();
    }

    function setOpen(open) {
      panel.hidden = !open;
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
      root.classList.toggle("req-time-dropdown--open", open);
      if (open) {
        requestAnimationFrame(function () {
          scrollActiveIntoView(hoursBlk.col);
          scrollActiveIntoView(minsBlk.col);
        });
      }
    }

    function setActive(colEl, dataKey, val) {
      colEl.querySelectorAll(".req-time-dropdown__opt").forEach(function (b) {
        b.classList.toggle("req-time-dropdown__opt--active", b.getAttribute("data-" + dataKey) === val);
      });
    }

    function scrollActiveIntoView(colEl) {
      var a = colEl.querySelector(".req-time-dropdown__opt--active");
      if (a && typeof a.scrollIntoView === "function") {
        a.scrollIntoView({ block: "nearest" });
      }
    }

    function applySelection(scrollHour, scrollMin, closeAfter) {
      selH = scrollHour;
      selM = scrollMin;
      setActive(hoursBlk.col, "hour", selH);
      setActive(minsBlk.col, "min", selM);
      syncHidden();
      if (closeAfter) setOpen(false);
    }

    trigger.addEventListener("click", function (ev) {
      ev.stopPropagation();
      setOpen(panel.hidden);
    });

    hoursBlk.col.addEventListener("click", function (ev) {
      var btn = ev.target.closest(".req-time-dropdown__opt");
      if (!btn || !hoursBlk.col.contains(btn)) return;
      applySelection(btn.getAttribute("data-hour"), selM, false);
      scrollActiveIntoView(hoursBlk.col);
    });
    minsBlk.col.addEventListener("click", function (ev) {
      var btn = ev.target.closest(".req-time-dropdown__opt");
      if (!btn || !minsBlk.col.contains(btn)) return;
      applySelection(selH, btn.getAttribute("data-min"), true);
    });

    function onDocDown(ev) {
      if (!root.contains(ev.target)) setOpen(false);
    }
    function onKey(ev) {
      if (ev.key === "Escape" && !panel.hidden) {
        setOpen(false);
        trigger.focus();
      }
    }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);

    applySelection(selH, selM, false);
    syncHidden();

    return root;
  }

  function fieldText(name, labelKey, t, required, idPrefix, opts) {
    opts = opts || {};
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
    if (name === "name") {
      inp.maxLength = GUEST_NAME_MAX_LEN;
      inp.setAttribute("maxlength", String(GUEST_NAME_MAX_LEN));
    }
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
    if (opts.hintKey) {
      var nh = document.createElement("p");
      nh.className = "req-field-hint";
      nh.textContent = t(opts.hintKey);
      w.appendChild(nh);
    }
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

  function fieldDesc(t, idPrefix, nameAttr, required, maxLen) {
    var pid = idPrefix || "rf";
    nameAttr = nameAttr || "description";
    required = required !== false;
    var mlen = typeof maxLen === "number" && maxLen > 0 ? maxLen : GUEST_DESC_MAX_LEN;
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
    ta.maxLength = mlen;
    ta.setAttribute("maxlength", String(mlen));
    var w = document.createElement("div");
    w.className = "req-field";
    w.appendChild(lab);
    w.appendChild(ta);
    return w;
  }

  /** Başlıklı form blokları (.req-res-section); alanlar `inner` içine eklenir. */
  function resSection(titleKey, t) {
    var section = document.createElement("div");
    section.className = "req-res-section";
    var title = document.createElement("h3");
    title.className = "req-res-section__title";
    title.textContent = t(titleKey);
    var inner = document.createElement("div");
    inner.className = "req-res-section__inner";
    section.appendChild(title);
    section.appendChild(inner);
    return { section: section, inner: inner };
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
    oi.maxLength = GUEST_DESC_MAX_LEN;
    oi.setAttribute("maxlength", String(GUEST_DESC_MAX_LEN));
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

  /** Şikâyet: kayıp eşya ayrı blok + kısa açıklama (oda arızası kategorileriyle karışmasın). */
  function buildComplaintCategoryField(t, nameAttr) {
    nameAttr = nameAttr || "complaintCategory";
    var cfg = getCfg();
    var full = (cfg.categories.complaint || []).slice();
    var lostItem = null;
    var main = [];
    full.forEach(function (c) {
      if (c.id === "lost_property") lostItem = c;
      else main.push(c);
    });
    var wrap = document.createElement("div");
    wrap.className = "req-field";
    var leg = document.createElement("span");
    leg.className = "req-label";
    leg.textContent = t("reqLabelComplaintCategory");
    var chips = document.createElement("div");
    chips.className = "req-chips";
    chips.setAttribute("role", "radiogroup");
    chips.setAttribute("aria-label", t("reqLabelComplaintCategory"));
    main.forEach(function (c, idx) {
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
    if (lostItem) {
      var split = document.createElement("div");
      split.className = "req-lost-property-split";
      var hint = document.createElement("p");
      hint.className = "req-lost-property-hint";
      hint.textContent = t("reqComplaintLostPropertyHint");
      var subLeg = document.createElement("span");
      subLeg.className = "req-label req-label--sub";
      subLeg.textContent = t("reqComplaintLostPropertyBlockTitle");
      split.appendChild(hint);
      split.appendChild(subLeg);
      var lostRow = document.createElement("div");
      lostRow.className = "req-chips req-chips--lost-property";
      var llab = document.createElement("label");
      llab.className = "req-chip req-chip--lost-property";
      var lrad = document.createElement("input");
      lrad.type = "radio";
      lrad.name = nameAttr;
      lrad.value = lostItem.id;
      var lsp = document.createElement("span");
      lsp.className = "req-chip__text";
      lsp.textContent = t(lostItem.key);
      llab.appendChild(lrad);
      llab.appendChild(lsp);
      lostRow.appendChild(llab);
      split.appendChild(lostRow);
      wrap.appendChild(split);
    }
    return { wrap: wrap, chips: chips };
  }

  function getRequestCategorySections() {
    var cfg = getCfg();
    if (cfg.requestSections && cfg.requestSections.length) return cfg.requestSections;
    var flat = (cfg.categories && cfg.categories.request) || [];
    return [{ sectionKey: null, items: flat.slice() }];
  }

  /** İstek formu: grup başlığı yalnızca etiket; seçim yalnızca alt kutularda. */
  function buildRequestCategoryPicker(t, nameAttr) {
    nameAttr = nameAttr || "category";
    var root = document.createElement("div");
    root.className = "req-request-picker";
    var sections = getRequestCategorySections();
    var firstRadio = true;
    sections.forEach(function (sec, gi) {
      var groupEl = document.createElement("div");
      groupEl.className = "req-request-picker__group";
      var titleId = "req-req-grp-" + gi;
      if (sec.sectionKey) {
        var st = document.createElement("div");
        st.className = "req-request-picker__group-title";
        st.id = titleId;
        st.setAttribute("role", "presentation");
        st.textContent = t(sec.sectionKey);
        groupEl.appendChild(st);
      }
      var chips = document.createElement("div");
      chips.className = "req-chips req-chips--request-grid";
      chips.setAttribute("role", "radiogroup");
      chips.setAttribute(
        "aria-label",
        sec.sectionKey ? t(sec.sectionKey) + " — " + t("reqLabelRequestCategory") : t("reqLabelRequestCategory")
      );
      if (sec.sectionKey) chips.setAttribute("aria-labelledby", titleId);
      (sec.items || []).forEach(function (c) {
        var lab = document.createElement("label");
        lab.className = "req-chip req-chip--tile";
        var radio = document.createElement("input");
        radio.type = "radio";
        radio.name = nameAttr;
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
      groupEl.appendChild(chips);
      root.appendChild(groupEl);
    });
    return { wrap: root, chips: root };
  }

  /** Sunucu REQUEST_QUANTITY_CATEGORIES / REQUEST_TIMING_CATEGORIES ile aynı. */
  var REQ_DETAIL_QTY = {
    towel_extra: true,
    room_towel: true,
    bathrobe: true,
    bedding_sheet: true,
    bedding_pillow: true,
    bedding_blanket: true,
    slippers: true,
    hanger: true,
    baby_bed: true,
    toilet_paper: true,
    toiletries: true,
  };
  var REQ_DETAIL_TIM = { room_cleaning: true, turndown: true };

  function requestCategoryNeedsQuantity(cat) {
    return !!REQ_DETAIL_QTY[cat];
  }

  function getRequestDetailSchema(category) {
    if (REQ_DETAIL_QTY[category]) {
      return {
        fields: [{ name: "quantity", label: "reqLabelQuantity", required: true, min: 1, max: 20 }],
      };
    }
    if (REQ_DETAIL_TIM[category]) {
      return {
        fields: [
          {
            name: "timing",
            label: category === "room_cleaning" ? "reqLabelTimingPreference" : "reqLabelTiming",
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
      var fid = "req-det-" + String(category || "x") + "-" + f.name;
      lab.htmlFor = fid;
      field.appendChild(lab);
      if (f.options) {
        var sel = document.createElement("select");
        sel.className = "req-input";
        sel.id = fid;
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
        input.id = fid;
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

  function buildRequestForm(t, onSuccessGoHome) {
    var bundle = document.createElement("div");
    bundle.className = "req-request-bundle";

    var form = document.createElement("form");
    form.className = "req-form";
    form.noValidate = true;

    var guestSection = resSection("reqResSectionGuest", t);
    guestSection.inner.appendChild(
      fieldText("name", "reqLabelName", t, true, undefined, { hintKey: "reqHintNameForm" })
    );
    guestSection.inner.appendChild(fieldText("room", "reqLabelRoom", t, true));
    guestSection.inner.appendChild(fieldNationality(t));
    form.appendChild(guestSection.section);

    var detailSection = resSection("reqSectionRequestPick", t);
    var pickHint = document.createElement("p");
    pickHint.className = "req-request-picker-hint";
    var hintKey = t("reqSectionRequestPickHint");
    if (hintKey && hintKey !== "reqSectionRequestPickHint") {
      pickHint.textContent = hintKey;
      detailSection.inner.appendChild(pickHint);
    }
    var categoryField = buildRequestCategoryPicker(t, "category");
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

    function selectedCategory() {
      var c = form.querySelector('input[name="category"]:checked');
      return c ? c.value : "";
    }

    renderRequestDetailsFields(dynamicFields, selectedCategory(), t);

    categoryField.chips.addEventListener("change", function () {
      renderRequestDetailsFields(dynamicFields, selectedCategory(), t);
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
      if (!validateGuestDescriptionsLength(form, err, t)) return;

      var details = collectRequestDetails(form, category);
      if (
        requestCategoryNeedsQuantity(category) &&
        (details.quantity == null || !Number.isFinite(details.quantity) || details.quantity < 1)
      ) {
        err.textContent = t("reqErrQuantity");
        err.hidden = false;
        return;
      }
      if (REQ_DETAIL_TIM[category] && (!details.timing || String(details.timing).trim() === "")) {
        err.textContent = t("reqErrTimingRequired");
        err.hidden = false;
        return;
      }
      var description = String((form.querySelector('[name="description"]') || {}).value || "").trim();
      var needsDesc = category === "other";
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
      runSubmit(payload, form, err, success, submit, t, { onSuccessGoHome: onSuccessGoHome });
    });
    return { form: bundle, success: success };
  }

  function buildComplaintForm(t, onSuccessGoHome) {
    var form = document.createElement("form");
    form.className = "req-form";
    form.noValidate = true;

    var guestSection = resSection("reqResSectionGuest", t);
    guestSection.inner.appendChild(
      fieldText("name", "reqLabelName", t, true, undefined, { hintKey: "reqHintNameForm" })
    );
    guestSection.inner.appendChild(fieldText("room", "reqLabelRoom", t, true));
    guestSection.inner.appendChild(fieldNationality(t));
    form.appendChild(guestSection.section);

    var detailSection = resSection("reqSectionRequestDetails", t);
    var categoryField = buildComplaintCategoryField(t, "complaintCategory");
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
      lost_property: true,
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
      if (!validateGuestDescriptionsLength(form, err, t)) return;
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
    guestSection.inner.appendChild(
      fieldText("name", "reqLabelName", t, true, undefined, { hintKey: "reqHintNameForm" })
    );
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
      if (!validateGuestDescriptionsLength(form, err, t)) return;
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

  /**
   * Tek ekran: üstte geç çıkış (şerit veya tam ekran form), altta misafir bildirimi formu.
   * opts.openLateCheckout: sohbetten gelince geç çıkış formunu doğrudan aç (Misafir bildirimleri sekmesi içinde).
   */
  function buildGuestNotificationUnifiedFlow(t, onSuccessGoHome, minIso, opts) {
    opts = opts || {};
    var root = document.createElement("div");
    root.className = "req-gn-unified";

    var strip = document.createElement("div");
    strip.className = "req-gn-late-card";
    strip.setAttribute("role", "region");
    strip.setAttribute("aria-label", t("reqLateCheckoutStripTitle"));

    var stripAccent = document.createElement("div");
    stripAccent.className = "req-gn-late-card__accent";
    stripAccent.setAttribute("aria-hidden", "true");

    var stripInner = document.createElement("div");
    stripInner.className = "req-gn-late-card__inner";

    var iconWrap = document.createElement("div");
    iconWrap.className = "req-gn-late-card__icon";
    iconWrap.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';

    var stripText = document.createElement("div");
    stripText.className = "req-gn-late-card__body";
    var stripTitle = document.createElement("h3");
    stripTitle.className = "req-gn-late-card__title";
    stripTitle.id = "req-gn-late-strip-heading";
    stripTitle.textContent = t("reqLateCheckoutStripTitle");
    var stripLead = document.createElement("p");
    stripLead.className = "req-gn-late-card__lead";
    stripLead.textContent = t("reqLateCheckoutCardLead");
    stripText.appendChild(stripTitle);
    stripText.appendChild(stripLead);

    var stripActions = document.createElement("div");
    stripActions.className = "req-gn-late-card__cta";
    var openLateBtn = document.createElement("button");
    openLateBtn.type = "button";
    openLateBtn.className = "btn-primary req-gn-late-open";
    openLateBtn.textContent = t("reqLateCheckoutOpenForm");

    var latePanel = document.createElement("div");
    latePanel.id = "req-gn-late-panel";
    latePanel.className = "req-gn-late-panel";
    latePanel.hidden = true;
    latePanel.setAttribute("role", "region");
    latePanel.setAttribute("aria-labelledby", "req-gn-late-panel-title");

    var lateHead = document.createElement("div");
    lateHead.className = "req-gn-late-panel__head";
    var backLateBtn = document.createElement("button");
    backLateBtn.type = "button";
    backLateBtn.className = "req-back-hub req-gn-late-back";
    backLateBtn.textContent = t("reqBackFromLateCheckout");
    var lateHeadText = document.createElement("div");
    lateHeadText.className = "req-gn-late-panel__head-text";
    var lateHeadTitle = document.createElement("span");
    lateHeadTitle.className = "req-gn-late-panel__title";
    lateHeadTitle.id = "req-gn-late-panel-title";
    lateHeadTitle.textContent = t("reqLateCheckoutStripTitle");
    var lateHeadHint = document.createElement("span");
    lateHeadHint.className = "req-gn-late-panel__hint";
    lateHeadHint.textContent = t("reqLateCheckoutPanelHint");
    lateHeadText.appendChild(lateHeadTitle);
    lateHeadText.appendChild(lateHeadHint);
    lateHead.appendChild(backLateBtn);
    lateHead.appendChild(lateHeadText);

    var lateBody = document.createElement("div");
    lateBody.className = "req-gn-late-panel__body";

    latePanel.appendChild(lateHead);
    latePanel.appendChild(lateBody);

    var divider = document.createElement("div");
    divider.className = "req-gn-divider";
    divider.setAttribute("aria-hidden", "true");

    var mainHeading = document.createElement("h3");
    mainHeading.className = "req-gn-main-heading";
    mainHeading.textContent = t("reqGuestNotifMainHeading");

    var mainIntro = document.createElement("p");
    mainIntro.className = "req-intro req-intro--tight";
    mainIntro.textContent = t("reqNotifIntro");

    var bn = buildGuestNotificationForm(t, onSuccessGoHome);

    var mainBlock = document.createElement("div");
    mainBlock.className = "req-gn-main-block";
    var mainCard = document.createElement("div");
    mainCard.className = "req-gn-main-card";
    mainCard.appendChild(divider);
    mainCard.appendChild(mainHeading);
    mainCard.appendChild(mainIntro);
    mainCard.appendChild(bn.form);
    mainCard.appendChild(bn.success);
    mainBlock.appendChild(mainCard);

    function setLateScreen(open) {
      latePanel.hidden = !open;
      strip.hidden = open;
      mainBlock.hidden = open;
      if (open && !lateBody.dataset.mounted) {
        var bl = buildLateCheckoutForm(t, onSuccessGoHome, minIso);
        lateBody.appendChild(bl.form);
        lateBody.appendChild(bl.success);
        lateBody.dataset.mounted = "1";
      }
    }

    openLateBtn.addEventListener("click", function () {
      setLateScreen(true);
    });
    backLateBtn.addEventListener("click", function () {
      setLateScreen(false);
    });

    stripActions.appendChild(openLateBtn);
    stripInner.appendChild(iconWrap);
    stripInner.appendChild(stripText);
    stripInner.appendChild(stripActions);
    strip.appendChild(stripAccent);
    strip.appendChild(stripInner);

    root.appendChild(strip);
    root.appendChild(latePanel);
    root.appendChild(mainBlock);

    if (opts.openLateCheckout) {
      setLateScreen(true);
      requestAnimationFrame(function () {
        try {
          latePanel.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (eScroll) {}
        try {
          var first = latePanel.querySelector(
            "input:not([type='hidden']), select, textarea, button.btn-primary"
          );
          if (first && typeof first.focus === "function") first.focus();
        } catch (eFocus) {}
      });
    }

    return root;
  }

  function buildLateCheckoutForm(t, onSuccessGoHome, minIso) {
    var form = document.createElement("form");
    form.className = "req-form req-form--late-checkout";
    form.noValidate = true;
    var pid = "lc";

    var guestSection = resSection("reqResSectionGuest", t);
    guestSection.inner.appendChild(
      fieldText("name", "reqLabelName", t, true, pid, { hintKey: "reqHintNameForm" })
    );
    guestSection.inner.appendChild(fieldText("room", "reqLabelRoom", t, true, pid));
    guestSection.inner.appendChild(fieldNationality(t, pid));
    form.appendChild(guestSection.section);

    var planSec = resSection("reqLateCheckoutSection", t);
    var intro = document.createElement("p");
    intro.className = "req-intro req-intro--inline";
    intro.textContent = t("reqLateCheckoutIntro");
    planSec.inner.appendChild(intro);

    var fd = document.createElement("div");
    fd.className = "req-field";
    var lDate = document.createElement("label");
    lDate.className = "req-label";
    lDate.htmlFor = pid + "-checkoutDate";
    lDate.textContent = t("reqLabelCheckoutDate");
    var inDate = document.createElement("input");
    inDate.type = "date";
    inDate.id = pid + "-checkoutDate";
    inDate.name = "checkoutDate";
    inDate.className = "req-input";
    inDate.required = true;
    inDate.min = minIso || (window.getCalendarMinDateISO && window.getCalendarMinDateISO()) || "";
    fd.appendChild(lDate);
    fd.appendChild(inDate);
    planSec.inner.appendChild(fd);

    var ft = document.createElement("div");
    ft.className = "req-field req-field--time-dropdown";
    var lTime = document.createElement("label");
    lTime.className = "req-label";
    lTime.setAttribute("for", pid + "-checkoutTime-trigger");
    lTime.textContent = t("reqLabelCheckoutTime");
    ft.appendChild(lTime);
    ft.appendChild(buildLateCheckoutDropdownTimePicker(pid, t));
    planSec.inner.appendChild(ft);
    form.appendChild(planSec.section);

    var noteSec = resSection("reqSectionExtraNote", t);
    var noteField = fieldDesc(t, pid, "description", true);
    noteField.querySelector("label").textContent = t("reqLabelLateCheckoutNote");
    var nh = document.createElement("p");
    nh.className = "req-notif-note-hint";
    nh.textContent = t("reqLateCheckoutNoteHint");
    noteSec.inner.appendChild(nh);
    noteSec.inner.appendChild(noteField);
    form.appendChild(noteSec.section);

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
      if (!form.reportValidity()) return;
      if (!validateGuestFields(form, err, t)) return;
      if (!validateGuestDescriptionsLength(form, err, t)) return;
      var dVal = String((form.querySelector('[name="checkoutDate"]') || {}).value || "").trim();
      var tVal = String((form.querySelector('[name="checkoutTime"]') || {}).value || "").trim();
      if (!dVal) {
        err.textContent = t("reqErrLateCheckoutDate");
        err.hidden = false;
        return;
      }
      if (!tVal) {
        err.textContent = t("reqErrLateCheckoutTime");
        err.hidden = false;
        return;
      }
      var timeNorm = normalizeLateCheckoutTimeForPayload(tVal);
      if (!timeNorm) {
        err.textContent = t("reqErrLateCheckoutTime");
        err.hidden = false;
        return;
      }
      var noteVal = String((form.querySelector('[name="description"]') || {}).value || "").trim();
      if (!noteVal) {
        err.textContent = t("reqErrLateCheckoutNote");
        err.hidden = false;
        return;
      }
      var payload = {
        type: "late_checkout",
        name: (form.querySelector('[name="name"]') || {}).value,
        room: (form.querySelector('[name="room"]') || {}).value,
        nationality: (form.querySelector('[name="nationality"]') || {}).value,
        checkoutDate: dVal,
        checkoutTime: timeNorm,
        description: noteVal,
        details: { checkoutDate: dVal, checkoutTime: timeNorm },
      };
      runSubmit(payload, form, err, success, submit, t, {
        onSuccessGoHome: onSuccessGoHome,
        successBodyKey: "reqSuccessBodyLateCheckout",
      });
    });

    return { form: form, success: success };
  }

  function buildGuestNotificationForm(t, onSuccessGoHome) {
    var form = document.createElement("form");
    form.className = "req-form";
    form.noValidate = true;

    var guestSection = resSection("reqResSectionGuest", t);
    guestSection.inner.appendChild(
      fieldText("name", "reqLabelName", t, true, undefined, { hintKey: "reqHintNameForm" })
    );
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
      if (!validateGuestDescriptionsLength(form, err, t)) return;
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
      if (String(note).trim().length > GUEST_DESC_MAX_LEN) {
        err.textContent = t("reqErrDescTooLong");
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
      if (!validateGuestDescriptionsLength(form, err, t)) return;
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
    var base = payload && typeof payload === "object" ? payload : {};
    var body = Object.assign({}, base);
    body.language = currentUiLanguage();
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
    fn(body)
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
      .catch(function (e) {
        var raw = e && e.message ? String(e.message).trim() : "";
        err.textContent = translateGuestRequestApiError(raw, t);
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
    form.appendChild(
      fieldText("name", "reqLabelName", t, true, undefined, { hintKey: "reqHintNameForm" })
    );
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
        var icoWrap = document.createElement("span");
        icoWrap.className = "req-hub__icon";
        icoWrap.setAttribute("aria-hidden", "true");
        icoWrap.innerHTML = HUB_ICONS[sub.id] || HUB_ICONS.request;
        var body = document.createElement("span");
        body.className = "req-hub__body";
        var lab = document.createElement("span");
        lab.className = "req-hub__label";
        lab.textContent = t(sub.i18nKey);
        body.appendChild(lab);
        if (sub.hintKey) {
          var hintText = t(sub.hintKey);
          if (hintText && hintText !== sub.hintKey) {
            var hint = document.createElement("span");
            hint.className = "req-hub__hint";
            hint.textContent = hintText;
            body.appendChild(hint);
          }
        }
        btn.appendChild(icoWrap);
        btn.appendChild(body);
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

    if (subId === "guest_notification") {
      wrap.classList.add("req-wrap--guest-notif");
      var gnHead = document.createElement("div");
      gnHead.className = "req-gn-module-head";
      gnHead.appendChild(backHub);
      var gnHeadText = document.createElement("div");
      gnHeadText.className = "req-gn-module-head__text";
      gnHeadText.appendChild(h2f);
      var gnHeadSub = document.createElement("p");
      gnHeadSub.className = "req-gn-module-head__sub";
      gnHeadSub.textContent = t("reqGuestNotifModuleSub");
      gnHeadText.appendChild(gnHeadSub);
      gnHead.appendChild(gnHeadText);
      wrap.appendChild(gnHead);
    } else {
      wrap.appendChild(h2f);
      wrap.appendChild(backHub);
    }

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
      var gnOpts = {};
      try {
        if (window.__vionaOpenLateCheckoutOnGuestNotif) {
          gnOpts.openLateCheckout = true;
          window.__vionaOpenLateCheckoutOnGuestNotif = false;
        }
      } catch (eGn) {}
      wrap.appendChild(buildGuestNotificationUnifiedFlow(t, onSuccessGoHome, minIso, gnOpts));
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
