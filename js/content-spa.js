(function () {
  "use strict";
  var P = window.VionaContent.pick;

  function T(row) {
    return P(row || {});
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function currentUiLang() {
    try {
      var c = String(localStorage.getItem("viona_lang") || "tr").toLowerCase();
      if (c === "en" || c === "de" || c === "pl") return c;
      return "tr";
    } catch (e) {
      return "tr";
    }
  }

  function pickByLang(row) {
    if (!row || typeof row !== "object") return "";
    var lang = currentUiLang();
    if (row[lang] != null && String(row[lang]).trim() !== "") return String(row[lang]);
    if (row.tr != null && String(row.tr).trim() !== "") return String(row.tr);
    if (row.en != null && String(row.en).trim() !== "") return String(row.en);
    return "";
  }

  function resolveAssetUrl(relPath) {
    if (!relPath) return "";
    try {
      return new URL(relPath, window.location.href).href;
    } catch (e) {
      return relPath;
    }
  }

  function createPdfCtaIcon() {
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "spa-pdf-strip__icon");
    svg.setAttribute("width", "20");
    svg.setAttribute("height", "20");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    var p = document.createElementNS(ns, "path");
    p.setAttribute("fill", "currentColor");
    p.setAttribute(
      "d",
      "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2 5 5h-5V4zM8 17h8v-2H8v2zm0-4h8v-2H8v2zm0-4h5V6H8v2z",
    );
    svg.appendChild(p);
    return svg;
  }

  var SPA_PRICE_STRIP = {
    intro: {
      tr:
        "Ücretli bakım ve terapi seçeneklerinizi La Serenite Spa ekibimizle yüz yüze veya çalışma saatleri içinde doğrudan spa resepsiyonundan netleştirmenizi öneririz; güncel fiyat ve menü özeti PDF’dedir — indirmek için düğmeye dokunun.",
      en:
        "We invite you to refine your treatment choices in person with our La Serenite Spa team or at the spa reception during opening hours. Current prices and menus are in the PDF — tap the button to download.",
      de:
        "Wählen Sie Ihre Anwendungen gern direkt mit unserem La-Serenite-Team oder an der Spa-Rezeption in den Öffnungszeiten. Aktuelle Preise und Menüs stehen in der PDF — zum Herunterladen tippen.",
      pl: "Zapraszamy do omówienia wyboru zabiegów osobiście z zespołem La Serenite Spa lub w recepcji spa w godzinach otwarcia. Aktualne ceny i menu są w pliku PDF — dotknij przycisku, aby pobrać.",
    },
    btnLabel: {
      tr: "Spa fiyat listesi (PDF)",
      en: "Spa price list (PDF)",
      de: "Spa-Preisliste (PDF)",
      pl: "Cennik spa (PDF)",
    },
    href: {
      tr: "assets/docs/spa-price-list-tr.pdf",
      en: "assets/docs/spa-price-list-en.pdf",
      de: "assets/docs/spa-price-list-de.pdf",
      pl: "assets/docs/pl-SpaMenu.pdf",
    },
    download: {
      tr: "kaila-spa-fiyat-listesi-tr.pdf",
      en: "kaila-spa-price-list-en.pdf",
      de: "kaila-spa-preisliste-de.pdf",
      pl: "pl-SpaMenu.pdf",
    },
  };

  var SPA_MENU_ACCORDION_TITLE = {
    tr: "Ücretli bakım menüsü",
    en: "Paid treatment menu",
    de: "Kostenpflichtiges Angebotsmenü",
    pl: "Płatne menu zabiegów",
  };

  var INTRO_PARAS = [
    {
      tr:
        "Spa & Wellness merkezimizin huzurlu atmosferinde bedeninizi ve zihninizi yenileyin. Birbirinden rahatlatıcı masajlar, geleneksel Türk hamamı ritüelleri ve dengeyi yeniden kazandıran özel bakımlarla kendinizi şımartın. Wellness alanında sauna, buhar odası ve ısıtmalı kapalı havuz bulunmaktadır.",
      en:
        "Renew body and mind in our calm spa & wellness area. Relaxing massages, traditional Turkish bath rituals and restorative treatments await. The wellness zone includes sauna, steam room and a heated indoor pool.",
      de:
        "Körper und Geist in ruhiger Atmosphäre erneuern: Massagen, Hamam-Rituale und Pflege. Wellness: Sauna, Dampfbad und beheiztes Hallenbad.",
      pl: "Odśwież ciało i umysł w naszej spokojnej strefie spa i wellness. Czekają relaksujące masaże, tradycyjne rytuały hammam oraz zabiegi regenerujące. Strefa wellness obejmuje saunę, łaźnię parową i podgrzewany basen kryty.",
    },
    {
      tr:
        "İster derin bir rahatlama, ister tazelenmiş bir enerji arayın; profesyonel terapistlerimiz ve sakin ortamımız sayesinde hem bedeninize hem ruhunuza iyi gelen bir deneyim sizi bekliyor.",
      en:
        "Whether you seek deep relaxation or renewed energy, our therapists and peaceful setting are here for you.",
      de:
        "Ob tiefe Entspannung oder neue Energie — unsere Therapeuten und die ruhige Atmosphäre begleiten Sie.",
      pl: "Niezależnie od tego, czy szukasz głębokiego relaksu, czy nowej energii — nasi terapeuci i spokojna atmosfera są do Państwa dyspozycji.",
    },
    {
      tr:
        "Ücretli masaj ve bakım seanslarınız için en doğru saat, süre ve ritüel önerisini La Serenite Spa’daki uzmanlarımızdan birebir alabilirsiniz; ekibimiz sizi spa resepsiyonunda ağırlamaktan memnuniyet duyar.",
      en:
        "For paid massages and treatments, our La Serenite specialists will guide you personally on timing, duration and ritual — you are always welcome at the spa reception during spa hours.",
      de:
        "Für kostenpflichtige Massagen und Anwendungen beraten Sie unsere La-Serenite-Spezialistinnen und -Spezialisten persönlich zu Zeit, Dauer und Ritual — die Spa-Rezeption heißt Sie in den Öffnungszeiten willkommen.",
      pl: "W przypadku płatnych masaży i zabiegów specjaliści La Serenite doradzą osobiście w kwestii czasu, długości i rytuału — recepcja spa w godzinach pracy jest zawsze otwarta.",
    },
  ];

  var LA_SERENITE = {
    img: "assets/images/spa/spa-hall.png",
    title: { tr: "La Serenite Spa", en: "La Serenite Spa", de: "La Serenite Spa", pl: "La Serenite Spa" },
    tag: {
      tr: "Spa merkezi · wellness",
      en: "Spa centre · wellness",
      de: "Spa · Wellness",
      pl: "Centrum spa · wellness",
    },
    note: {
      tr:
        "09:00 – 19:00 arası açıktır. Sauna, Türk hamamı, buhar odası ve kapalı havuz ücretsizdir; masaj ve bakım hizmetleri ücretlidir. Terapi planınız için La Serenite spa resepsiyonu ile doğrudan iletişime geçebilirsiniz.",
      en:
        "Open 09:00 – 19:00. Sauna, Turkish bath, steam room and indoor pool are complimentary; massages and treatments are charged. For therapies, please speak directly with the La Serenite spa reception.",
      de:
        "Geöffnet 09:00 – 19:00. Sauna, Hamam, Dampfbad und Hallenbad inklusive; Massagen kostenpflichtig. Für Therapien wenden Sie sich bitte direkt an die La-Serenite-Spa-Rezeption.",
      pl: "Otwarte 09:00 – 19:00. Sauna, łaźnia turecka, łaźnia parowa i basen kryty są bezpłatne; masaże i zabiegi są płatne. W sprawie terapii prosimy o kontakt bezpośrednio z recepcją La Serenite.",
    },
    kv: [
      {
        label: { tr: "Genel çalışma saatleri", en: "Opening hours", de: "Öffnungszeiten", pl: "Godziny otwarcia" },
        value: "09:00 – 19:00",
      },
      {
        label: { tr: "Konum", en: "Location", de: "Ort", pl: "Lokalizacja" },
        value: { tr: "Spa merkezi", en: "Spa centre", de: "Spa-Bereich", pl: "Centrum spa" },
      },
      {
        label: { tr: "Hizmet türü", en: "Service type", de: "Leistung", pl: "Rodzaj usługi" },
        value: {
          tr: "Ücretsiz ve ücretli hizmetler",
          en: "Complimentary and paid services",
          de: "Kostenlose und kostenpflichtige Leistungen",
          pl: "Usługi bezpłatne i płatne",
        },
      },
    ],
  };

  var FREE_FACILITIES = [
    {
      img: "assets/images/beach/kapal_havuz-9e4e184d-4009-4063-9f22-681e94241d68.png",
      title: { tr: "Kapalı havuz", en: "Indoor pool", de: "Hallenbad", pl: "Basen kryty" },
      tag: { tr: "Spa alanı · ısıtmalı", en: "Spa zone · heated", de: "Spa · beheizt", pl: "Strefa spa · podgrzewany" },
      kv: [
        {
          label: { tr: "Saatler", en: "Hours", de: "Zeiten", pl: "Godziny" },
          value: "08:00 – 19:00",
        },
        {
          label: { tr: "Ücret", en: "Charge", de: "Preis", pl: "Opłata" },
          value: { tr: "Ücretsiz", en: "Complimentary", de: "Kostenlos", pl: "Bezpłatnie" },
        },
        {
          label: { tr: "Önceden haber", en: "Advance arrangement", de: "Voranmeldung", pl: "Rezerwacja z wyprzedzeniem" },
          value: { tr: "Gerekmiyor", en: "Not required", de: "Nicht nötig", pl: "Nie jest wymagana" },
        },
      ],
    },
    {
      img: "assets/images/spa/sauna.png",
      title: { tr: "Sauna", en: "Sauna", de: "Sauna", pl: "Sauna" },
      tag: { tr: "Wellness", en: "Wellness", de: "Wellness", pl: "Wellness" },
      kv: [
        {
          label: { tr: "Saatler", en: "Hours", de: "Zeiten", pl: "Godziny" },
          value: "09:00 – 19:00",
        },
        {
          label: { tr: "Ücret", en: "Charge", de: "Preis", pl: "Opłata" },
          value: { tr: "Ücretsiz", en: "Complimentary", de: "Kostenlos", pl: "Bezpłatnie" },
        },
        {
          label: { tr: "Önceden haber", en: "Advance arrangement", de: "Voranmeldung", pl: "Rezerwacja z wyprzedzeniem" },
          value: { tr: "Gerekmiyor", en: "Not required", de: "Nicht nötig", pl: "Nie jest wymagana" },
        },
      ],
    },
    {
      img: "assets/images/spa/hamam.png",
      title: { tr: "Türk hamamı", en: "Turkish bath", de: "Türkisches Bad", pl: "Łaźnia turecka (hammam)" },
      tag: { tr: "Geleneksel ritüel", en: "Traditional ritual", de: "Traditionell", pl: "Tradycyjny rytuał" },
      kv: [
        {
          label: { tr: "Saatler", en: "Hours", de: "Zeiten", pl: "Godziny" },
          value: "09:00 – 19:00",
        },
        {
          label: { tr: "Ücret", en: "Charge", de: "Preis", pl: "Opłata" },
          value: { tr: "Ücretsiz", en: "Complimentary", de: "Kostenlos", pl: "Bezpłatnie" },
        },
        {
          label: { tr: "Önceden haber", en: "Advance arrangement", de: "Voranmeldung", pl: "Rezerwacja z wyprzedzeniem" },
          value: { tr: "Gerekmiyor", en: "Not required", de: "Nicht nötig", pl: "Nie jest wymagana" },
        },
      ],
    },
    {
      img: "assets/images/spa/buhar.png",
      title: { tr: "Buhar odası", en: "Steam room", de: "Dampfbad", pl: "Łaźnia parowa" },
      tag: { tr: "Spa alanı", en: "Spa area", de: "Spa-Bereich", pl: "Strefa spa" },
      kv: [
        {
          label: { tr: "Saatler", en: "Hours", de: "Zeiten", pl: "Godziny" },
          value: "09:00 – 19:00",
        },
        {
          label: { tr: "Ücret", en: "Charge", de: "Preis", pl: "Opłata" },
          value: { tr: "Ücretsiz", en: "Complimentary", de: "Kostenlos", pl: "Bezpłatnie" },
        },
        {
          label: { tr: "Önceden haber", en: "Advance arrangement", de: "Voranmeldung", pl: "Rezerwacja z wyprzedzeniem" },
          value: { tr: "Gerekmiyor", en: "Not required", de: "Nicht nötig", pl: "Nie jest wymagana" },
        },
      ],
    },
  ];

  var FREE_LIST = {
    title: { tr: "Ücretsiz hizmetler", en: "Complimentary", de: "Inklusive", pl: "Bezpłatnie" },
    items: [
      { tr: "Sauna", en: "Sauna", de: "Sauna", pl: "Sauna" },
      { tr: "Kapalı havuz", en: "Indoor pool", de: "Hallenbad", pl: "Basen kryty" },
      { tr: "Türk hamamı", en: "Turkish bath", de: "Hamam", pl: "Łaźnia turecka (hammam)" },
      { tr: "Buhar odası", en: "Steam room", de: "Dampfbad", pl: "Łaźnia parowa" },
    ],
  };

  var PAID_LIST = {
    title: { tr: "Ücretli hizmetler", en: "Paid services", de: "Kostenpflichtig", pl: "Usługi płatne" },
    items: [
      { tr: "Masaj", en: "Massage", de: "Massage", pl: "Masaż" },
      { tr: "Kese", en: "Kese scrub", de: "Kese", pl: "Peeling Kese" },
      { tr: "Peeling", en: "Peeling", de: "Peeling", pl: "Peeling" },
      { tr: "Cilt bakımı", en: "Skin care", de: "Hautpflege", pl: "Pielęgnacja skóry" },
      { tr: "Diğer bakım hizmetleri", en: "Other treatments", de: "Weitere Anwendungen", pl: "Inne zabiegi" },
    ],
  };

  var PAID_CARD = {
    img: "assets/images/spa/masaj.png",
    title: { tr: "Masaj & bakım", en: "Massage & treatments", de: "Massage & Pflege", pl: "Masaż i zabiegi" },
    tag: {
      tr: "Ücretli · La Serenite ekibiyle doğrudan",
      en: "Paid · Directly with La Serenite",
      de: "Kostenpflichtig · direkt mit La Serenite",
      pl: "Płatne · Bezpośrednio z La Serenite",
    },
    text: {
      tr:
        "Masaj, kese, peeling, cilt bakımı ve diğer özel bakım hizmetleri ücretlidir. Süre, yoğunluk ve kişisel tercihleriniz için La Serenite spa resepsiyonundaki ekibimizle doğrudan görüşmenizi rica ederiz; güncel fiyatlar PDF menümüzdedir.",
      en:
        "Massage, scrub, peeling, skin care and other treatments are charged. Please speak directly with our team at the La Serenite spa reception for timing, availability and personal preferences; current prices are in our PDF menu.",
      de:
        "Massage, Kese, Peeling, Hautpflege und weitere Anwendungen sind kostenpflichtig. Zeitfenster, Auslastung und persönliche Wünsche besprechen Sie bitte direkt an der La-Serenite-Spa-Rezeption; aktuelle Preise finden Sie im PDF-Menü.",
      pl: "Masaż, peeling Kese, peeling, pielęgnacja skóry i inne zabiegi są płatne. Prosimy o rozmowę z recepcją La Serenite w sprawie terminów, dostępności i preferencji; aktualne ceny znajdują się w menu PDF.",
    },
  };

  function renderKv(pairs) {
    var dl = el("dl", "beach-kv spa-kv");
    pairs.forEach(function (pair) {
      var dt = document.createElement("dt");
      dt.textContent = T(pair.label);
      var dd = document.createElement("dd");
      dd.textContent = typeof pair.value === "string" ? pair.value : T(pair.value);
      dl.appendChild(dt);
      dl.appendChild(dd);
    });
    return dl;
  }

  function wireSpaPdfButton(btn, relHref, dlName, absHref) {
    btn.addEventListener("click", function (ev) {
      if (!relHref) return;
      var proto = "";
      try {
        proto = String(window.location.protocol || "");
      } catch (e) {}
      if (proto === "file:" || typeof fetch !== "function") return;
      ev.preventDefault();
      fetch(absHref || relHref, { credentials: "same-origin", cache: "no-store" })
        .then(function (res) {
          if (!res.ok) throw new Error("pdf");
          return res.blob();
        })
        .then(function (blob) {
          var url = URL.createObjectURL(blob);
          var a = document.createElement("a");
          a.href = url;
          a.download = dlName;
          a.style.display = "none";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.setTimeout(function () {
            URL.revokeObjectURL(url);
          }, 3000);
        })
        .catch(function () {
          window.open(absHref || relHref, "_blank", "noopener");
        });
    });
  }

  function renderSpaPriceStrip() {
    var wrap = el("div", "spa-pdf-strip");
    var intro = el("p", "spa-pdf-strip__intro");
    intro.textContent = T(SPA_PRICE_STRIP.intro);
    var relHref = pickByLang(SPA_PRICE_STRIP.href);
    var dlName = pickByLang(SPA_PRICE_STRIP.download) || "kaila-spa-price-list.pdf";
    var absHref = resolveAssetUrl(relHref);
    var btn = document.createElement("a");
    btn.className = "spa-pdf-strip__btn";
    btn.href = absHref || relHref;
    btn.setAttribute("download", dlName);
    btn.setAttribute("rel", "noopener");
    wireSpaPdfButton(btn, relHref, dlName, absHref);
    var lbl = T(SPA_PRICE_STRIP.btnLabel);
    btn.setAttribute("aria-label", lbl);
    btn.appendChild(createPdfCtaIcon());
    var span = document.createElement("span");
    span.textContent = lbl;
    btn.appendChild(span);
    wrap.appendChild(intro);
    wrap.appendChild(btn);
    return wrap;
  }

  function renderSpaMenuAccordion() {
    var wrap = el("div", "spa-menu-accordion");
    wrap.appendChild(
      el("h2", "rest-section-title rest-section-title--spa spa-menu-accordion__h", T(SPA_MENU_ACCORDION_TITLE)),
    );
    var C = window.VionaSpaWellnessCatalog;
    if (!C || !Array.isArray(C.categories) || !C.categories.length) {
      wrap.appendChild(
        el(
          "p",
          "spa-menu-accordion__fallback",
          T({
            tr: "Menü yüklenemedi. Lütfen sayfayı yenileyin.",
            en: "Menu could not be loaded. Please refresh.",
            de: "Menü konnte nicht geladen werden.",
            pl: "Nie udało się wczytać menu. Odśwież stronę.",
          }),
        ),
      );
      return wrap;
    }

    C.categories.forEach(function (cat) {
      var det = document.createElement("details");
      det.className = "spa-menu-accordion__cat";
      var sum = document.createElement("summary");
      sum.className = "spa-menu-accordion__summary";
      sum.textContent = pickByLang(cat.title);
      det.appendChild(sum);

      var ul = el("ul", "spa-menu-accordion__list");
      (cat.items || []).forEach(function (item) {
        var line = pickByLang(item.label);
        var price = String(item.price || "").trim();
        var dur =
          item.durationLine && typeof item.durationLine === "object"
            ? String(pickByLang(item.durationLine) || "").trim()
            : "";
        var li = el("li", "spa-menu-accordion__item");
        if (line && price) {
          li.appendChild(el("span", "spa-menu-accordion__item-name", line));
          if (dur) li.appendChild(el("span", "spa-menu-accordion__item-dur", dur));
          li.appendChild(el("span", "spa-menu-accordion__item-price", price));
        } else {
          li.textContent = line || price;
        }
        ul.appendChild(li);
      });
      det.appendChild(ul);
      wrap.appendChild(det);
    });

    return wrap;
  }

  function renderSpaProgramPackages() {
    var wrap = el("div", "spa-program-section");
    var C = window.VionaSpaWellnessCatalog;
    if (!C || !Array.isArray(C.programPackages) || !C.programPackages.length) return wrap;
    var h2txt = pickByLang(C.programCategoryTitle);
    if (h2txt) {
      wrap.appendChild(
        el("h2", "rest-section-title rest-section-title--spa spa-program-section__h", h2txt),
      );
    }
    var grid = el("div", "spa-program-grid");
    C.programPackages.forEach(function (pkg) {
      var card = el("article", "spa-program-card");
      card.appendChild(el("h3", "spa-program-card__title", pickByLang(pkg.label)));
      var ul = el("ul", "spa-program-card__list");
      (pkg.bullets || []).forEach(function (b) {
        var txt = pickByLang(b);
        if (txt) ul.appendChild(el("li", "spa-program-card__li", txt));
      });
      card.appendChild(ul);
      var meta = el("div", "spa-program-card__meta");
      var dur = pkg.durationLine && typeof pkg.durationLine === "object" ? pickByLang(pkg.durationLine) : "";
      var price = String(pkg.price || "").trim();
      meta.appendChild(el("span", "spa-program-card__dur", dur));
      meta.appendChild(el("span", "spa-program-card__dot", "·"));
      meta.appendChild(el("span", "spa-program-card__price", price));
      card.appendChild(meta);
      grid.appendChild(card);
    });
    wrap.appendChild(grid);
    return wrap;
  }

  function renderIntro() {
    var wrap = el("div", "spa-intro");
    INTRO_PARAS.forEach(function (para) {
      var p = el("p", "spa-intro__p");
      p.textContent = T(para);
      wrap.appendChild(p);
    });
    return wrap;
  }

  function renderFacilityCard(item) {
    var card = el("article", "venue-card venue-card--rest venue-card--beach venue-card--spa");
    var fig = el("div", "venue-card__media");
    var img = document.createElement("img");
    img.src = item.img;
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    fig.appendChild(img);
    var body = el("div", "venue-card__body");
    body.appendChild(el("h3", "venue-card__title", T(item.title)));
    if (item.tag) body.appendChild(el("p", "venue-card__loc", T(item.tag)));
    body.appendChild(renderKv(item.kv));
    if (item.note) {
      var n = el("p", "venue-card__text venue-card__text--spa-note");
      n.textContent = T(item.note);
      body.appendChild(n);
    }
    card.appendChild(fig);
    card.appendChild(body);
    return card;
  }

  function renderLaSerenite() {
    var card = el("article", "venue-card venue-card--rest venue-card--beach venue-card--spa venue-card--spa-hero");
    var fig = el("div", "venue-card__media");
    var img = document.createElement("img");
    img.src = LA_SERENITE.img;
    img.alt = "";
    img.loading = "lazy";
    fig.appendChild(img);
    var body = el("div", "venue-card__body");
    body.appendChild(el("h3", "venue-card__title", T(LA_SERENITE.title)));
    body.appendChild(el("p", "venue-card__loc", T(LA_SERENITE.tag)));
    body.appendChild(renderKv(LA_SERENITE.kv));
    var note = el("p", "venue-card__text venue-card__text--spa-note");
    note.textContent = T(LA_SERENITE.note);
    body.appendChild(note);
    card.appendChild(fig);
    card.appendChild(body);
    return card;
  }

  function renderPaidCard() {
    var card = el("article", "venue-card venue-card--rest venue-card--beach venue-card--spa venue-card--spa-paid");
    var fig = el("div", "venue-card__media");
    var img = document.createElement("img");
    img.src = PAID_CARD.img;
    img.alt = "";
    img.loading = "lazy";
    fig.appendChild(img);
    var body = el("div", "venue-card__body");
    body.appendChild(el("h3", "venue-card__title", T(PAID_CARD.title)));
    body.appendChild(el("p", "venue-card__loc", T(PAID_CARD.tag)));
    var p = el("p", "venue-card__text");
    p.textContent = T(PAID_CARD.text);
    body.appendChild(p);
    card.appendChild(fig);
    card.appendChild(body);
    return card;
  }

  function renderSplitList(spec, compact) {
    var box = el("div", "spa-split" + (compact ? " spa-split--compact" : ""));
    var colF = el("div", "spa-split__col spa-split__col--free");
    colF.appendChild(el("h4", "spa-split__title", T(spec.freeTitle)));
    var ulf = el("ul", "spa-split__list");
    spec.freeItems.forEach(function (it) {
      ulf.appendChild(el("li", null, T(it)));
    });
    colF.appendChild(ulf);

    var colP = el("div", "spa-split__col spa-split__col--paid");
    colP.appendChild(el("h4", "spa-split__title", T(spec.paidTitle)));
    var ulp = el("ul", "spa-split__list");
    spec.paidItems.forEach(function (it) {
      ulp.appendChild(el("li", null, T(it)));
    });
    colP.appendChild(ulp);

    box.appendChild(colF);
    box.appendChild(colP);
    return box;
  }

  function renderSpaModule(container) {
    var root = el("div", "viona-mod viona-mod--rest viona-mod--beach viona-mod--spa");

    root.appendChild(renderIntro());
    root.appendChild(renderSpaPriceStrip());
    root.appendChild(renderSpaMenuAccordion());
    root.appendChild(renderSpaProgramPackages());

    var h1 = el(
      "h2",
      "rest-section-title rest-section-title--spa",
      T({ tr: "Spa merkezi", en: "Spa centre", de: "Spa-Bereich", pl: "Centrum spa" })
    );
    root.appendChild(h1);
    root.appendChild(renderLaSerenite());

    var hFree = el(
      "h2",
      "rest-section-title rest-section-title--spa",
      T({
        tr: "Ücretsiz kullanım (wellness alanı)",
        en: "Complimentary (wellness area)",
        de: "Inklusive (Wellness-Bereich)",
        pl: "Bezpłatnie (strefa wellness)",
      })
    );
    root.appendChild(hFree);
    FREE_FACILITIES.forEach(function (f) {
      root.appendChild(renderFacilityCard(f));
    });

    var hPaid = el(
      "h2",
      "rest-section-title rest-section-title--spa rest-section-title--spa-paid-lead",
      T({
        tr: "Ücretli bakım hizmetleri",
        en: "Paid treatments",
        de: "Kostenpflichtige Anwendungen",
        pl: "Zabiegi płatne",
      })
    );
    root.appendChild(hPaid);
    root.appendChild(renderPaidCard());

    var hSum = el(
      "h2",
      "rest-section-title rest-section-title--spa rest-section-title--spa-summary",
      T({
        tr: "Özet: ne ücretsiz, ne ücretli?",
        en: "At a glance: what’s included vs paid",
        de: "Überblick: inklusive / kostenpflichtig",
        pl: "Na pierwszy rzut oka: co w cenie, a co płatne",
      })
    );
    root.appendChild(hSum);
    root.appendChild(
      renderSplitList(
        {
          freeTitle: FREE_LIST.title,
          freeItems: FREE_LIST.items,
          paidTitle: PAID_LIST.title,
          paidItems: PAID_LIST.items,
        },
        true
      )
    );

    container.appendChild(root);
  }

  window.renderSpaModule = renderSpaModule;
})();
