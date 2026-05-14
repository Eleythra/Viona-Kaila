(function () {
  "use strict";

  /**
   * Çok dillilik: menü gövdesi yalnızca ROOM_SERVICE_MENU_DATA içinden gelir (i18n.js ile karıştırılmaz).
   * Dil: app’teki UI kodu → normalizeToUiLang → paket varsa o dil, yoksa en. Bölüm başlığı/marka anahtarlar JSON’da.
   * Ana sayfa karosu vb. için modRoomService → i18n (t) kullanılmaya devam eder.
   */
  function resolveMenuLang(code) {
    var a = String(code || "en").toLowerCase().slice(0, 2);
    if (window.VIONA_LANG && typeof window.VIONA_LANG.normalizeToUiLang === "function") {
      a = window.VIONA_LANG.normalizeToUiLang(a);
    }
    var DATA = window.ROOM_SERVICE_MENU_DATA;
    if (DATA && DATA[a] && DATA[a].flow && DATA[a].foot) return a;
    return "en";
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null && text !== "") n.textContent = text;
    return n;
  }

  function appendDish(panel, row) {
    var wrap = el("div", "room-service-mod__dish" + (row.s && row.s.length ? " room-service-mod__dish--has-subs" : ""));
    var head = el("div", "room-service-mod__dish-head");
    if (row.r != null && row.r !== "") {
      head.appendChild(el("span", "room-service-mod__ref", String(row.r)));
    }
    head.appendChild(el("span", "room-service-mod__name", row.n || ""));
    if (row.p != null && row.p !== "") {
      head.appendChild(el("span", "room-service-mod__price", row.p));
    }
    wrap.appendChild(head);
    if (row.d != null && row.d !== "") {
      wrap.appendChild(el("p", "room-service-mod__desc", row.d));
    }
    if (row.o && row.o.length) {
      var ul = el("ul", "room-service-mod__opts");
      for (var i = 0; i < row.o.length; i++) {
        ul.appendChild(el("li", null, row.o[i]));
      }
      wrap.appendChild(ul);
    }
    if (row.s && row.s.length) {
      var subRoot = el("div", "room-service-mod__subs");
      for (var j = 0; j < row.s.length; j++) {
        var sub = row.s[j];
        var sw = el("div", "room-service-mod__sub");
        var sh = el("div", "room-service-mod__sub-head");
        sh.appendChild(el("span", "room-service-mod__sub-name", sub.n || ""));
        if (sub.p != null && sub.p !== "") {
          sh.appendChild(el("span", "room-service-mod__price", sub.p));
        }
        sw.appendChild(sh);
        if (sub.d != null && sub.d !== "") {
          sw.appendChild(el("p", "room-service-mod__desc room-service-mod__desc--sub", sub.d));
        }
        subRoot.appendChild(sw);
      }
      wrap.appendChild(subRoot);
    }
    panel.appendChild(wrap);
  }

  function renderRoomServiceModule(container, t, langFromApp) {
    var uiLang = String(langFromApp || "en").toLowerCase().slice(0, 2);
    if (window.VIONA_LANG && typeof window.VIONA_LANG.normalizeToUiLang === "function") {
      uiLang = window.VIONA_LANG.normalizeToUiLang(uiLang);
    }
    var menuLang = resolveMenuLang(langFromApp);
    var DATA = window.ROOM_SERVICE_MENU_DATA || {};
    var pack = DATA[menuLang] || DATA.en;
    if (!pack || !pack.flow) {
      var fallback = el("p", "placeholder", t("placeholderBody"));
      container.appendChild(fallback);
      return;
    }

    var root = el("div", "room-service-mod viona-mod viona-mod--room-service");
    var inner = document.createElement("section");
    inner.className = "room-service-mod__inner";
    inner.setAttribute("aria-labelledby", "viona-room-service-menu-heading");
    inner.setAttribute("data-menu-lang", menuLang);
    inner.setAttribute("data-ui-lang", uiLang);
    if (window.VIONA_LANG && typeof window.VIONA_LANG.htmlLangFor === "function") {
      inner.setAttribute("lang", window.VIONA_LANG.htmlLangFor(menuLang));
    } else {
      inner.setAttribute("lang", menuLang);
    }

    var header = el("header", "room-service-mod__header");
    header.appendChild(el("div", "room-service-mod__brand", pack.brand || "KAILA HOTELS"));
    var menuTitle = document.createElement("h2");
    menuTitle.className = "room-service-mod__menu-title";
    menuTitle.id = "viona-room-service-menu-heading";
    menuTitle.textContent = pack.menuTitle || "";
    header.appendChild(menuTitle);
    inner.appendChild(header);

    var panel = el("div", "room-service-mod__menu");
    for (var k = 0; k < pack.flow.length; k++) {
      var row = pack.flow[k];
      if (row.ty === "sc") {
        panel.appendChild(el("h3", "room-service-mod__section-title", row.t || ""));
      } else if (row.ty === "no") {
        panel.appendChild(el("p", "room-service-mod__note", row.t || ""));
      } else if (row.ty === "di") {
        appendDish(panel, row);
      }
    }

    var foot = el("footer", "room-service-mod__foot");
    if (pack.foot && pack.foot.length) {
      for (var f = 0; f < pack.foot.length; f++) {
        var line = pack.foot[f];
        var cls = "room-service-mod__foot-line";
        if (pack.brand && line === pack.brand) cls += " room-service-mod__foot-line--brand";
        else if (String(line).indexOf("5008") !== -1) cls += " room-service-mod__foot-line--order";
        foot.appendChild(el("p", cls, line));
      }
    }
    inner.appendChild(panel);
    inner.appendChild(foot);

    root.appendChild(inner);
    container.appendChild(root);
  }

  window.renderRoomServiceModule = renderRoomServiceModule;
})();
