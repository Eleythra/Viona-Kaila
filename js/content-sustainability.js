/**
 * Sürdürülebilirlik — dil bazlı bilgi görselleri (PDF’ten sayfa sırası korunur, tek akış).
 */
(function () {
  "use strict";

  var COUNTS = { tr: 6, en: 6, de: 6 };
  var BASE = "assets/sustainability/";

  function normLang(code) {
    var c = String(code || "tr").toLowerCase().slice(0, 2);
    if (window.VIONA_LANG && typeof window.VIONA_LANG.normalizeToUiLang === "function") {
      c = window.VIONA_LANG.normalizeToUiLang(c);
    }
    if (c === "pl") return "en";
    if (c === "en" || c === "de") return c;
    if (c !== "tr") return "en";
    return "tr";
  }

  function el(tag, cls) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }

  function renderSustainabilityModule(container, t, lang) {
    var L = normLang(lang);
    var n = COUNTS[L] || 6;
    var root = el("div", "viona-mod viona-mod--sustainability");

    var intro = el("p", "viona-mod-lead sustainability-intro");
    intro.textContent = t("sustainabilityIntro");
    root.appendChild(intro);

    var doc = el("div", "sustainability-doc");
    doc.setAttribute("role", "region");
    doc.setAttribute("aria-label", t("sustainabilityDocAria"));

    var openHint = t("sustainabilityOpenImageHint");
    var altFirst = t("sustainabilityDocAltFirst");

    for (var i = 1; i <= n; i++) {
      var href = BASE + L + "-" + i + ".png";
      var link = document.createElement("a");
      link.className = "sustain-slide sustain-slide--link";
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", openHint);

      var media = el("div", "sustain-slide__media");
      var img = document.createElement("img");
      img.src = href;
      img.alt = i === 1 ? altFirst : "";
      img.loading = i <= 3 ? "eager" : "lazy";
      img.decoding = "async";
      img.draggable = false;
      if ("fetchPriority" in img) {
        if (i === 1) img.fetchPriority = "high";
        else if (i > 3) img.fetchPriority = "low";
      }
      media.appendChild(img);
      link.appendChild(media);

      doc.appendChild(link);
    }

    root.appendChild(doc);
    container.appendChild(root);
  }

  window.renderSustainabilityModule = renderSustainabilityModule;
})();
