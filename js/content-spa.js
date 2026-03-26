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

  var INTRO_PARAS = [
    {
      tr:
        "Spa & Wellness merkezimizin huzurlu atmosferinde bedeninizi ve zihninizi yenileyin. Birbirinden rahatlatıcı masajlar, geleneksel Türk hamamı ritüelleri ve dengeyi yeniden kazandıran özel bakımlarla kendinizi şımartın. Wellness alanında sauna, buhar odası ve ısıtmalı kapalı havuz bulunmaktadır.",
      en:
        "Renew body and mind in our calm spa & wellness area. Relaxing massages, traditional Turkish bath rituals and restorative treatments await. The wellness zone includes sauna, steam room and a heated indoor pool.",
      de:
        "Körper und Geist in ruhiger Atmosphäre erneuern: Massagen, Hamam-Rituale und Pflege. Wellness: Sauna, Dampfbad und beheiztes Hallenbad.",
      ru:
        "Обновите тело и дух в спа: массажи, ритуалы хамама и уход. В wellness — сауна, парная и подогреваемый крытый бассейн.",
    },
    {
      tr:
        "İster derin bir rahatlama, ister tazelenmiş bir enerji arayın; profesyonel terapistlerimiz ve sakin ortamımız sayesinde hem bedeninize hem ruhunuza iyi gelen bir deneyim sizi bekliyor.",
      en:
        "Whether you seek deep relaxation or renewed energy, our therapists and peaceful setting are here for you.",
      de:
        "Ob tiefe Entspannung oder neue Energie — unsere Therapeuten und die ruhige Atmosphäre begleiten Sie.",
      ru:
        "Глубокий отдых или новая энергия — профессиональные терапевты и спокойная атмосфера.",
    },
  ];

  var LA_SERENITE = {
    img: "assets/images/spa/spa-hall.png",
    title: { tr: "La Serenite Spa", en: "La Serenite Spa", de: "La Serenite Spa", ru: "La Serenite Spa" },
    tag: {
      tr: "Spa merkezi · wellness",
      en: "Spa centre · wellness",
      de: "Spa · Wellness",
      ru: "Спа-центр · wellness",
    },
    note: {
      tr:
        "09:00 – 19:00 arası açıktır. Sauna, Türk hamamı, buhar odası ve kapalı havuz ücretsizdir; masaj ve bakım hizmetleri ücretlidir.",
      en:
        "Open 09:00 – 19:00. Sauna, Turkish bath, steam room and indoor pool are complimentary; massages and treatments are charged.",
      de:
        "Geöffnet 09:00 – 19:00. Sauna, Hamam, Dampfbad und Hallenbad inklusive; Massagen kostenpflichtig.",
      ru:
        "09:00 – 19:00. Сауна, хамам, парная и бассейн бесплатно; массаж и уход — платно.",
    },
    kv: [
      {
        label: { tr: "Genel çalışma saatleri", en: "Opening hours", de: "Öffnungszeiten", ru: "Часы работы" },
        value: "09:00 – 19:00",
      },
      {
        label: { tr: "Konum", en: "Location", de: "Ort", ru: "Место" },
        value: { tr: "Spa merkezi", en: "Spa centre", de: "Spa-Bereich", ru: "Спа-центр" },
      },
      {
        label: { tr: "Hizmet türü", en: "Service type", de: "Leistung", ru: "Тип услуг" },
        value: {
          tr: "Ücretsiz ve ücretli hizmetler",
          en: "Complimentary and paid services",
          de: "Kostenlose und kostenpflichtige Leistungen",
          ru: "Бесплатные и платные",
        },
      },
    ],
  };

  var FREE_FACILITIES = [
    {
      img: "assets/images/beach/kapal_havuz-9e4e184d-4009-4063-9f22-681e94241d68.png",
      title: { tr: "Kapalı havuz", en: "Indoor pool", de: "Hallenbad", ru: "Крытый бассейн" },
      tag: { tr: "Spa alanı · ısıtmalı", en: "Spa zone · heated", de: "Spa · beheizt", ru: "Спа · подогрев" },
      kv: [
        {
          label: { tr: "Saatler", en: "Hours", de: "Zeiten", ru: "Часы" },
          value: "08:00 – 19:00",
        },
        {
          label: { tr: "Ücret", en: "Charge", de: "Preis", ru: "Оплата" },
          value: { tr: "Ücretsiz", en: "Complimentary", de: "Kostenlos", ru: "Бесплатно" },
        },
        {
          label: { tr: "Rezervasyon", en: "Reservation", de: "Reservierung", ru: "Запись" },
          value: { tr: "Gerekmiyor", en: "Not required", de: "Nicht nötig", ru: "Не требуется" },
        },
      ],
    },
    {
      img: "assets/images/spa/sauna.png",
      title: { tr: "Sauna", en: "Sauna", de: "Sauna", ru: "Сауна" },
      tag: { tr: "Wellness", en: "Wellness", de: "Wellness", ru: "Wellness" },
      kv: [
        {
          label: { tr: "Saatler", en: "Hours", de: "Zeiten", ru: "Часы" },
          value: "09:00 – 19:00",
        },
        {
          label: { tr: "Ücret", en: "Charge", de: "Preis", ru: "Оплата" },
          value: { tr: "Ücretsiz", en: "Complimentary", de: "Kostenlos", ru: "Бесплатно" },
        },
        {
          label: { tr: "Rezervasyon", en: "Reservation", de: "Reservierung", ru: "Запись" },
          value: { tr: "Gerekmiyor", en: "Not required", de: "Nicht nötig", ru: "Не требуется" },
        },
      ],
    },
    {
      img: "assets/images/spa/hamam.png",
      title: { tr: "Türk hamamı", en: "Turkish bath", de: "Türkisches Bad", ru: "Турецкая баня" },
      tag: { tr: "Geleneksel ritüel", en: "Traditional ritual", de: "Traditionell", ru: "Традиция" },
      kv: [
        {
          label: { tr: "Saatler", en: "Hours", de: "Zeiten", ru: "Часы" },
          value: "09:00 – 19:00",
        },
        {
          label: { tr: "Ücret", en: "Charge", de: "Preis", ru: "Оплата" },
          value: { tr: "Ücretsiz", en: "Complimentary", de: "Kostenlos", ru: "Бесплатно" },
        },
        {
          label: { tr: "Rezervasyon", en: "Reservation", de: "Reservierung", ru: "Запись" },
          value: { tr: "Gerekmiyor", en: "Not required", de: "Nicht nötig", ru: "Не требуется" },
        },
      ],
    },
    {
      img: "assets/images/spa/buhar.png",
      title: { tr: "Buhar odası", en: "Steam room", de: "Dampfbad", ru: "Парная" },
      tag: { tr: "Spa alanı", en: "Spa area", de: "Spa-Bereich", ru: "Спа-зона" },
      kv: [
        {
          label: { tr: "Saatler", en: "Hours", de: "Zeiten", ru: "Часы" },
          value: "09:00 – 19:00",
        },
        {
          label: { tr: "Ücret", en: "Charge", de: "Preis", ru: "Оплата" },
          value: { tr: "Ücretsiz", en: "Complimentary", de: "Kostenlos", ru: "Бесплатно" },
        },
        {
          label: { tr: "Rezervasyon", en: "Reservation", de: "Reservierung", ru: "Запись" },
          value: { tr: "Gerekmiyor", en: "Not required", de: "Nicht nötig", ru: "Не требуется" },
        },
      ],
    },
  ];

  var FREE_LIST = {
    title: { tr: "Ücretsiz hizmetler", en: "Complimentary", de: "Inklusive", ru: "Бесплатно" },
    items: [
      { tr: "Sauna", en: "Sauna", de: "Sauna", ru: "Сауна" },
      { tr: "Kapalı havuz", en: "Indoor pool", de: "Hallenbad", ru: "Крытый бассейн" },
      { tr: "Türk hamamı", en: "Turkish bath", de: "Hamam", ru: "Хамам" },
      { tr: "Buhar odası", en: "Steam room", de: "Dampfbad", ru: "Парная" },
    ],
  };

  var PAID_LIST = {
    title: { tr: "Ücretli hizmetler", en: "Paid services", de: "Kostenpflichtig", ru: "Платно" },
    items: [
      { tr: "Masaj", en: "Massage", de: "Massage", ru: "Массаж" },
      { tr: "Kese", en: "Kese scrub", de: "Kese", ru: "Кесе" },
      { tr: "Peeling", en: "Peeling", de: "Peeling", ru: "Пилинг" },
      { tr: "Cilt bakımı", en: "Skin care", de: "Hautpflege", ru: "Уход за кожей" },
      { tr: "Diğer bakım hizmetleri", en: "Other treatments", de: "Weitere Anwendungen", ru: "Другие процедуры" },
    ],
  };

  var PAID_CARD = {
    img: "assets/images/spa/masaj.png",
    title: { tr: "Masaj & bakım", en: "Massage & treatments", de: "Massage & Pflege", ru: "Массаж и уход" },
    tag: {
      tr: "Ücretli · randevu önerilir",
      en: "Paid · booking recommended",
      de: "Kostenpflichtig · Termin empfohlen",
      ru: "Платно · лучше по записи",
    },
    text: {
      tr:
        "Masaj, kese, peeling, cilt bakımı ve diğer özel bakım hizmetleri ücretlidir. Fiyat ve randevu bilgisi spa bölümünde paylaşılır.",
      en:
        "Massage, scrub, peeling, skin care and other treatments are charged. Prices and booking are shown at the spa area.",
      de:
        "Massage, Kese, Peeling, Hautpflege und weitere Anwendungen sind kostenpflichtig — Preise und Termine im Spa-Bereich ausgewiesen.",
      ru:
        "Массаж, кесе, пилинг, уход и другие процедуры платно — цены и запись указаны в зоне спа.",
    },
  };

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

  function renderSplitList(spec) {
    var box = el("div", "spa-split");
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

    var lead = el("p", "viona-mod-lead");
    lead.textContent = T({
      tr: "Bu bölüm spa ve wellness alanını tanıtır: ücretsiz kullanım alanları ile ücretli bakımlar ayrı ayrı belirtilmiştir. Ücretli hizmetler için spa bölümündeki güncel listeyi kullanabilirsiniz.",
      en: "Spa and wellness: complimentary areas and paid treatments are clearly separated. Paid services and prices are listed in the spa area.",
      de: "Spa-Bereich: kostenlose Wellness-Flächen und kostenpflichtige Anwendungen sind getrennt beschrieben. Kostenpflichtige Leistungen sind im Spa-Bereich ausgewiesen.",
      ru: "Спа-зона: бесплатные зоны и платные процедуры указаны отдельно. Платные услуги и цены — в зоне спа.",
    });
    root.appendChild(lead);
    root.appendChild(renderIntro());

    var h1 = el(
      "h2",
      "rest-section-title rest-section-title--spa",
      T({ tr: "Spa merkezi", en: "Spa centre", de: "Spa-Bereich", ru: "Спа-центр" })
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
        ru: "Бесплатно (wellness)",
      })
    );
    root.appendChild(hFree);
    FREE_FACILITIES.forEach(function (f) {
      root.appendChild(renderFacilityCard(f));
    });

    var hPaid = el(
      "h2",
      "rest-section-title rest-section-title--spa",
      T({
        tr: "Ücretli bakım hizmetleri",
        en: "Paid treatments",
        de: "Kostenpflichtige Anwendungen",
        ru: "Платные процедуры",
      })
    );
    root.appendChild(hPaid);
    root.appendChild(renderPaidCard());

    var hSum = el(
      "h2",
      "rest-section-title rest-section-title--spa",
      T({
        tr: "Özet: ne ücretsiz, ne ücretli?",
        en: "At a glance: what’s included vs paid",
        de: "Überblick: inklusive / kostenpflichtig",
        ru: "Кратко: что входит, что платно",
      })
    );
    root.appendChild(hSum);
    root.appendChild(
      renderSplitList({
        freeTitle: FREE_LIST.title,
        freeItems: FREE_LIST.items,
        paidTitle: PAID_LIST.title,
        paidItems: PAID_LIST.items,
      })
    );

    container.appendChild(root);
  }

  window.renderSpaModule = renderSpaModule;
})();
