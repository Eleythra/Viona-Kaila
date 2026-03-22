/**
 * İstek / şikayet / arıza / rezervasyon — hub + formlar (mock API, ileride endpoint’e bağlanabilir).
 */
(function () {
  "use strict";

  var RES_TAB_KEY = "viona_req_res_tab";

  var HUB_ICONS = {
    request:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M21 15a4 4 0 01-4 4H8l-5 3v-3H5a4 4 0 01-4-4V7a4 4 0 014-4h14a4 4 0 014 4v8z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></svg>',
    complaint:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
    fault:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>',
    res:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>',
  };

  function getCfg() {
    return window.REQUESTS_CONFIG || { categories: {}, restaurants: [], spaServices: [], nationalities: [] };
  }

  function nightsBetween(inIso, outIso) {
    var a = inIso.split("-");
    var b = outIso.split("-");
    var d1 = new Date(parseInt(a[0], 10), parseInt(a[1], 10) - 1, parseInt(a[2], 10));
    var d2 = new Date(parseInt(b[0], 10), parseInt(b[1], 10) - 1, parseInt(b[2], 10));
    return Math.round((d2 - d1) / 86400000);
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

  function fieldDesc(t, idPrefix, nameAttr) {
    var pid = idPrefix || "rf";
    nameAttr = nameAttr || "description";
    var lab = document.createElement("label");
    lab.className = "req-label";
    lab.htmlFor = pid + "-desc";
    lab.textContent = t("reqLabelDesc");
    var ta = document.createElement("textarea");
    ta.id = pid + "-desc";
    ta.name = nameAttr;
    ta.className = "req-input req-textarea";
    ta.rows = 4;
    ta.required = true;
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

  function wireSimpleSubmit(form, err, success, submitBtn, typeKey, t) {
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      err.hidden = true;
      if (!validateSimpleForm(form, err, t)) return;
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
      runSubmit(payload, form, err, success, submitBtn, t);
    });
  }

  function runSubmit(payload, form, err, success, submitBtn, t) {
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
          t("reqSuccessBody") + (res && res.id ? " (" + res.id + ")" : "");
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

  function buildSimpleTypeForm(typeKey, group, t) {
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

    wireSimpleSubmit(form, err, success, submit, typeKey, t);
    return { form: form, success: success };
  }

  function buildReservationBlock(t, minIso, minMonth) {
    var cfg = getCfg();
    var calMinMonth = minIso.slice(0, 7) >= "2026-03" ? minIso.slice(0, 7) : "2026-03";

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
      }

      restGrid.addEventListener("change", function () {
        var sel = form.querySelector('input[name="restaurant"]:checked');
        refreshSlotsFromRestaurant(sel ? sel.value : "");
      });
      refreshSlotsFromRestaurant("");

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
        if (n >= 7) {
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

      var noteAl = fieldDesc(t, "al", "note");
      noteAl.querySelector("label").textContent = t("reqLabelNote");
      noteAl.querySelector("textarea").classList.add("req-input--res");
      form.appendChild(noteAl);

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
        if (!form.reportValidity()) return;
        var fd = new FormData(form);
        var nts = nightsBetween(fd.get("stayCheckIn"), fd.get("stayCheckOut"));
        var payload = {
          type: "reservation_alacarte",
          name: fd.get("name"),
          room: fd.get("room"),
          nationality: fd.get("nationality"),
          description: fd.get("note"),
          reservation: {
            restaurantId: fd.get("restaurant"),
            reservationDate: fd.get("reservationDate"),
            time: fd.get("time"),
            stayCheckIn: fd.get("stayCheckIn"),
            stayCheckOut: fd.get("stayCheckOut"),
            nights: nts,
            stayPromoApplies: nts >= 7,
          },
        };
        runSubmit(payload, form, errAl, okAl, subAl, t);
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

      var noteSp = fieldDesc(t, "sp", "note");
      noteSp.querySelector("label").textContent = t("reqLabelNote");
      noteSp.querySelector("textarea").classList.add("req-input--res");
      form.appendChild(noteSp);

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
        var fd = new FormData(form);
        var payload = {
          type: "reservation_spa",
          name: fd.get("name"),
          room: fd.get("room"),
          nationality: fd.get("nationality"),
          description: fd.get("note"),
          reservation: {
            spaServiceId: fd.get("spaService"),
            date: fd.get("spaDate"),
            time: fd.get("time"),
          },
        };
        runSubmit(payload, form, errSp, okSp, subSp, t);
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
      var b = buildSimpleTypeForm("request", "request", t);
      wrap.appendChild(b.form);
      wrap.appendChild(b.success);
    } else if (subId === "complaint") {
      var bc = buildSimpleTypeForm("complaint", "complaint", t);
      wrap.appendChild(bc.form);
      wrap.appendChild(bc.success);
    } else if (subId === "fault") {
      var bf = buildSimpleTypeForm("fault", "fault", t);
      wrap.appendChild(bf.form);
      wrap.appendChild(bf.success);
    } else if (subId === "res") {
      wrap.appendChild(buildReservationBlock(t, minIso, minMonth));
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
