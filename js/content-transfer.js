(function () {
  "use strict";

  var LANG_KEY = "viona_lang";

  var PDF_BY_LANG = {
    tr: { href: "assets/documents/transfer/tr-Transfer.pdf", file: "Kaila-Transfer-TR.pdf" },
    en: { href: "assets/documents/transfer/en-Transfer-fixed.pdf", file: "Kaila-Transfer-EN.pdf" },
    de: { href: "assets/documents/transfer/de-Transfer-fixed.pdf", file: "Kaila-Transfer-DE.pdf" },
    ru: { href: "assets/documents/transfer/ru-Transfer-fixed.pdf", file: "Kaila-Transfer-RU.pdf" },
  };

  var ROWS = [
    { a: "transferR1a", b: "transferR1b", p16: "75 €", p716: "95 €" },
    { a: "transferR2a", b: "transferR2b", p16: "75 €", p716: "105 €" },
    { a: "transferR3a", b: "transferR3b", p16: "55 €", p716: "80 €" },
    { a: "transferR4a", b: "transferR4b", p16: "40 €", p716: "70 €" },
    { a: "transferR5a", b: "transferR5b", p16: "70 €", p716: "90 €" },
    { a: "transferR6a", b: "transferR6b", p16: "75 €", p716: "95 €" },
    { a: "transferR7a", b: "transferR7b", p16: "50 €", p716: "70 €" },
    { a: "transferR8a", b: "transferR8b", p16: "40 €", p716: "60 €" },
  ];

  function resolveLang(code) {
    if (code === "en" || code === "de" || code === "ru" || code === "tr") return code;
    try {
      var c = localStorage.getItem(LANG_KEY);
      if (c === "en" || c === "de" || c === "ru" || c === "tr") return c;
    } catch (e) {}
    return "tr";
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null && text !== "") n.textContent = text;
    return n;
  }

  var PDF_ICO_SVG =
    '<svg class="transfer-mod__pdf-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>';

  function renderTransferModule(container, t, langFromApp) {
    var root = el("div", "transfer-mod viona-mod viona-mod--transfer");

    var hero = el("div", "transfer-mod__hero");
    hero.appendChild(el("h2", "transfer-mod__title", t("transferListTitle")));
    hero.appendChild(el("p", "transfer-mod__subtitle", t("transferListSubtitle")));
    root.appendChild(hero);

    var lang = resolveLang(langFromApp);
    var pdf = PDF_BY_LANG[lang] || PDF_BY_LANG.tr;
    var pdfA = document.createElement("a");
    pdfA.className = "transfer-mod__pdf btn-transfer-pdf";
    pdfA.href = pdf.href;
    pdfA.setAttribute("download", pdf.file);
    pdfA.setAttribute("target", "_blank");
    pdfA.setAttribute("rel", "noopener noreferrer");
    pdfA.setAttribute("aria-label", t("transferDownloadPdf"));
    var ico = document.createElement("span");
    ico.className = "transfer-mod__pdf-ico";
    ico.innerHTML = PDF_ICO_SVG;
    pdfA.appendChild(ico);
    pdfA.appendChild(document.createTextNode(t("transferDownloadPdf")));
    root.appendChild(pdfA);

    var wrap = el("div", "transfer-mod__tablewrap");
    var table = el("table", "transfer-mod__table");
    table.setAttribute("role", "table");

    var thead = el("thead", "");
    var hr = el("tr", "");
    var th1 = el("th", "", t("transferColFrom"));
    th1.setAttribute("scope", "col");
    var th2 = el("th", "", t("transferColTo"));
    th2.setAttribute("scope", "col");
    hr.appendChild(th1);
    hr.appendChild(th2);
    var th3 = el("th", "transfer-mod__th-num", t("transferColP16"));
    th3.setAttribute("scope", "col");
    var th4 = el("th", "transfer-mod__th-num", t("transferColP716"));
    th4.setAttribute("scope", "col");
    hr.appendChild(th3);
    hr.appendChild(th4);
    thead.appendChild(hr);
    table.appendChild(thead);

    var tbody = el("tbody", "");
    ROWS.forEach(function (row) {
      var tr = el("tr", "");
      tr.appendChild(el("td", "transfer-mod__cell-from", t(row.a)));
      tr.appendChild(el("td", "transfer-mod__cell-to", t(row.b)));
      var td3 = el("td", "transfer-mod__cell-price", row.p16);
      var td4 = el("td", "transfer-mod__cell-price", row.p716);
      tr.appendChild(td3);
      tr.appendChild(td4);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    root.appendChild(wrap);

    var detH = el("h3", "transfer-mod__section-title", t("transferSectionDetails"));
    root.appendChild(detH);
    var detUl = el("ul", "transfer-mod__list");
    for (var i = 1; i <= 5; i++) {
      detUl.appendChild(el("li", "", t("transferDetail" + i)));
    }
    root.appendChild(detUl);

    var vehH = el("h3", "transfer-mod__section-title", t("transferSectionVehicles"));
    root.appendChild(vehH);
    var vehUl = el("ul", "transfer-mod__list transfer-mod__list--vehicles");
    for (var j = 1; j <= 4; j++) {
      vehUl.appendChild(el("li", "", t("transferVeh" + j)));
    }
    root.appendChild(vehUl);

    container.appendChild(root);
  }

  window.renderTransferModule = renderTransferModule;
})();
