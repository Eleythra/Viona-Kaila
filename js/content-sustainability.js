/**
 * Sürdürülebilirlik — dil bazlı bilgi görselleri (PDF’ten sayfa sırası korunur, tek akış).
 */
(function () {
  "use strict";

  var COUNTS = { tr: 6, en: 6, de: 6, ru: 6 };
  var BASE = "assets/sustainability/";

  function normLang(code) {
    var c = String(code || "tr").toLowerCase();
    if (c === "en" || c === "de" || c === "ru") return c;
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
      img.loading = i <= 2 ? "eager" : "lazy";
      img.decoding = "async";
      img.draggable = false;
      media.appendChild(img);
      link.appendChild(media);

      doc.appendChild(link);
    }

    root.appendChild(doc);
    container.appendChild(root);
  }

  window.renderSustainabilityModule = renderSustainabilityModule;
})();
