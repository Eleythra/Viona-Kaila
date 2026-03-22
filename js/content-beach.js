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

  function renderKv(dlClass, pairs) {
    var dl = document.createElement("dl");
    dl.className = dlClass || "beach-kv";
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
        "Kaila Beach Hotel’de misafirler, farklı beklenti ve tatil tercihlerine hitap eden dört ayrı havuzun keyfini çıkarabilirler. Üçü açık havuzdur: Gün boyu aktiviteler ve müzik eşliğinde hareketli anlar sunan eğlence havuzu, aquaparkıyla öne çıkan aquapark havuzu, sakin atmosferiyle dinlenmek isteyenler için ideal olan dinlenme havuzu.",
      en:
        "Guests can enjoy four distinct pools for different moods. Three are outdoor: an activity pool with music and animation, an aquapark pool with slides, and a calm relaxation pool.",
      de:
        "Vier verschiedene Pools: drei Außenbecken — Aktivitätsbecken mit Musik, Aquapark-Becken und ruhiges Relax-Becken.",
      ru:
        "Четыре бассейна на выбор: три открытых — активный с музыкой, с аквапарком и спокойный для отдыха.",
    },
    {
      tr:
        "Spa alanında yer alan 12 metre uzunluğundaki kapalı ve ısıtmalı havuz ise yılın her döneminde dingin ve rahatlatıcı bir yüzme deneyimi sunar.",
      en:
        "The 12 m heated indoor pool in the spa offers a calm swim experience year-round.",
      de:
        "Das 12 m beheizte Hallenbad im Spa lädt ganzjährig zum entspannten Schwimmen ein.",
      ru:
        "Крытый подогреваемый бассейн 12 м в спа — круглый год.",
    },
    {
      tr:
        "Otelin özel alt geçidinden geçerek size ayrılmış plaj alanımıza kolayca ulaşabilirsiniz. Gün boyunca atıştırmalıklar, alkolsüz içecekler, bira ve gözleme gibi geleneksel Türk lezzetleri ikram edilir; hepsi konaklamanıza dahildir. Daha özel ve seçkin bir deniz keyfi arayanlar için ise sahilde yer alan Moss Beach bar & restaurant sizi bekliyor. Bu özel beach club’da lezzetli à la carte yemekler, sağlıklı seçenekler ve geniş bir premium alkollü ve alkolsüz içecek menüsü sunulmaktadır.",
      en:
        "Reach the private beach via the hotel’s underpass. During the day, snacks, soft drinks, beer and gözleme are served on the beach — included in your stay. Moss Beach bar & restaurant on the shore offers à la carte dining and a premium drink menu for an extra special sea experience.",
      de:
        "Über die Unterführung gelangen Sie zum Privatstrand. Snacks, alkoholfreie Getränke, Bier und Gözleme sind inklusive. Moss Beach bar & restaurant bietet À-la-carte und Premium-Getränke.",
      ru:
        "Через подземный переход — к собственному пляжу. Закуски, безалкогольные напитки, пиво и гёзлеме включены. Moss Beach — à la carte и премиальные напитки.",
    },
  ];

  var BEACH_KV = [
    { label: { tr: "Plaj mesafesi", en: "Distance to beach", de: "Strandentfernung", ru: "До пляжа" }, value: "50 m" },
    { label: { tr: "Plaj konumu", en: "Beach position", de: "Lage", ru: "Позиция" }, value: { tr: "1. sıra · otele çok yakın", en: "First line · very close", de: "Erste Reihe", ru: "Первая линия" } },
    { label: { tr: "Plaj türü", en: "Beach type", de: "Strandart", ru: "Тип пляжа" }, value: { tr: "Kum ve çakıl", en: "Sand & pebble", de: "Sand & Kies", ru: "Песок и галька" } },
    { label: { tr: "Plaj statüsü", en: "Beach status", de: "Status", ru: "Статус" }, value: { tr: "Otelin özel plajı", en: "Hotel private beach", de: "Hotelprivatstrand", ru: "Собственный пляж отеля" } },
    { label: { tr: "Kullanım saatleri", en: "Hours", de: "Zeiten", ru: "Часы" }, value: "08:30 – 19:00" },
    { label: { tr: "Plaj havlusu", en: "Beach towels", de: "Strandtücher", ru: "Полотенца" }, value: { tr: "Ücretsiz", en: "Free", de: "Kostenlos", ru: "Бесплатно" } },
    { label: { tr: "Şemsiye", en: "Parasols", de: "Schirme", ru: "Зонты" }, value: { tr: "Ücretsiz", en: "Free", de: "Kostenlos", ru: "Бесплатно" } },
    { label: { tr: "Şezlong", en: "Sun loungers", de: "Liegen", ru: "Шезлонги" }, value: { tr: "Ücretsiz", en: "Free", de: "Kostenlos", ru: "Бесплатно" } },
    { label: { tr: "Wi-Fi", en: "Wi-Fi", de: "WLAN", ru: "Wi‑Fi" }, value: { tr: "Plajda mevcut", en: "Available on the beach", de: "Am Strand", ru: "На пляже" } },
    { label: { tr: "Pavilion", en: "Pavilion", de: "Pavillon", ru: "Павильон" }, value: { tr: "Yoktur", en: "Not available", de: "Nein", ru: "Нет" } },
    { label: { tr: "Otel–plaj erişimi", en: "Hotel–beach access", de: "Zugang", ru: "Доступ" }, value: { tr: "Alt geçit", en: "Underpass", de: "Unterführung", ru: "Подземный переход" } },
    { label: { tr: "Beach Imbiss içecek", en: "Beach Imbiss drinks", de: "Beach Imbiss Getränke", ru: "Напитки Beach Imbiss" }, value: "10:00 – 17:00" },
    { label: { tr: "Beach Imbiss yiyecek", en: "Beach Imbiss food", de: "Beach Imbiss Essen", ru: "Еда Beach Imbiss" }, value: "12:00 – 16:00" },
    {
      label: { tr: "İçecek seçenekleri", en: "Drinks", de: "Getränke", ru: "Напитки" },
      value: {
        tr: "Bira, çay, kahve, konsantre meyve suyu, gazlı içecekler, su, ayran",
        en: "Beer, tea, coffee, juices, soft drinks, water, ayran",
        de: "Bier, Tee, Kaffee, Säfte, Limonaden, Wasser, Ayran",
        ru: "Пиво, чай, кофе, соки, газировка, вода, айран",
      },
    },
    {
      label: { tr: "Yiyecek seçenekleri", en: "Food", de: "Essen", ru: "Еда" },
      value: {
        tr: "Patates kızartması, sosisli sandviç, gözleme",
        en: "Fries, sausage sandwich, gözleme",
        de: "Pommes, Wurst-Sandwich, Gözleme",
        ru: "Картофель фри, сэндвич, гёзлеме",
      },
    },
    {
      label: { tr: "Moss Beach bar & restaurant", en: "Moss Beach bar & restaurant", de: "Moss Beach", ru: "Moss Beach" },
      value: {
        tr: "10:00 – 19:00 · ücretli (à la carte)",
        en: "10:00 – 19:00 · paid (à la carte)",
        de: "10:00 – 19:00 · kostenpflichtig",
        ru: "10:00 – 19:00 · платно (à la carte)",
      },
    },
  ];

  var POOLS = [
    {
      img: "assets/images/beach/havuz1-a7d2f8ca-d530-46a2-be40-09ba2a6ee720.png",
      title: { tr: "Relax Pool", en: "Relax Pool", de: "Relax Pool", ru: "Relax Pool" },
      tag: { tr: "Dinlenme havuzu", en: "Relaxation pool", de: "Ruhepool", ru: "Релакс-бассейн" },
      kv: [
        { label: { tr: "Havuz türü", en: "Type", de: "Typ", ru: "Тип" }, value: { tr: "Açık havuz", en: "Outdoor", de: "Außen", ru: "Открытый" } },
        { label: { tr: "Su türü", en: "Water", de: "Wasser", ru: "Вода" }, value: { tr: "Tatlı su", en: "Fresh water", de: "Süßwasser", ru: "Пресная" } },
        { label: { tr: "Hacim", en: "Volume", de: "Volumen", ru: "Объём" }, value: "560 m³" },
        { label: { tr: "Kullanım saatleri", en: "Hours", de: "Zeiten", ru: "Часы" }, value: "08:00 – 19:00" },
        { label: { tr: "Derinlik", en: "Depth", de: "Tiefe", ru: "Глубина" }, value: "140 cm (1,4 m)" },
      ],
    },
    {
      img: "assets/images/beach/aquapark-64349b4a-d920-4b2d-88bf-d95de9a38d1b.png",
      title: { tr: "Aquapark / Activity Pool", en: "Aquapark / Activity Pool", de: "Aquapark", ru: "Аквапарк" },
      tag: { tr: "Eğlence & aquapark", en: "Fun & aquapark", de: "Spaß & Rutschen", ru: "Развлечения" },
      kv: [
        { label: { tr: "Havuz türü", en: "Type", de: "Typ", ru: "Тип" }, value: { tr: "Açık havuz", en: "Outdoor", de: "Außen", ru: "Открытый" } },
        { label: { tr: "Su türü", en: "Water", de: "Wasser", ru: "Вода" }, value: { tr: "Tatlı su", en: "Fresh water", de: "Süßwasser", ru: "Пресная" } },
        { label: { tr: "Hacim", en: "Volume", de: "Volumen", ru: "Объём" }, value: "550 m³" },
        { label: { tr: "Aquapark", en: "Aquapark", de: "Aquapark", ru: "Аквапарк" }, value: { tr: "Var", en: "Yes", de: "Ja", ru: "Есть" } },
        { label: { tr: "Yetişkin kaydırak", en: "Adult slides", de: "Rutschen Erw.", ru: "Взрослые горки" }, value: "3" },
        { label: { tr: "Çocuk kaydırak", en: "Kids’ slide", de: "Kinder-Rutsche", ru: "Детская горка" }, value: "1" },
        {
          label: { tr: "Aquapark saatleri", en: "Aquapark hours", de: "Aquapark-Zeiten", ru: "Часы аквапарка" },
          value: "10:00 – 12:00 · 14:00 – 16:00",
        },
      ],
    },
    {
      img: "assets/images/beach/havuz2-9839c4c2-5299-42d9-93c0-4aabdf8beacb.png",
      title: { tr: "Dolphin Pool", en: "Dolphin Pool", de: "Dolphin Pool", ru: "Dolphin Pool" },
      tag: { tr: "Dolphin havuz", en: "Dolphin pool", de: "Dolphin-Becken", ru: "Бассейн Dolphin" },
      kv: [
        { label: { tr: "Havuz türü", en: "Type", de: "Typ", ru: "Тип" }, value: { tr: "Açık havuz", en: "Outdoor", de: "Außen", ru: "Открытый" } },
        { label: { tr: "Su türü", en: "Water", de: "Wasser", ru: "Вода" }, value: { tr: "Tatlı su", en: "Fresh water", de: "Süßwasser", ru: "Пресная" } },
        { label: { tr: "Hacim", en: "Volume", de: "Volumen", ru: "Объём" }, value: "125 m³" },
        {
          label: { tr: "Kullanım saatleri", en: "Hours", de: "Zeiten", ru: "Часы" },
          value: "10:00 – 12:00 · 14:00 – 16:00",
        },
      ],
    },
    {
      img: "assets/images/beach/kapal_havuz-9e4e184d-4009-4063-9f22-681e94241d68.png",
      title: { tr: "Indoor Pool (Spa)", en: "Indoor Pool (Spa)", de: "Hallenbad (Spa)", ru: "Крытый бассейн (Spa)" },
      tag: { tr: "Kapalı · ısıtmalı · 12 m", en: "Indoor · heated · 12 m", de: "Hallenbad · beheizt · 12 m", ru: "Крытый · 12 м" },
      kv: [
        { label: { tr: "Havuz türü", en: "Type", de: "Typ", ru: "Тип" }, value: { tr: "Kapalı havuz", en: "Indoor", de: "Hallenbad", ru: "Крытый" } },
        { label: { tr: "Su türü", en: "Water", de: "Wasser", ru: "Вода" }, value: { tr: "Tatlı su", en: "Fresh water", de: "Süßwasser", ru: "Пресная" } },
        { label: { tr: "Uzunluk", en: "Length", de: "Länge", ru: "Длина" }, value: "12 m" },
        { label: { tr: "Kullanım saatleri", en: "Hours", de: "Zeiten", ru: "Часы" }, value: "08:00 – 19:00" },
      ],
    },
    {
      img: "assets/images/beach/_ocukhavuzu-7c4e7f00-8a93-4633-917a-cdb1a596b1c6.png",
      title: { tr: "Çocuk havuzu", en: "Kids’ pool", de: "Kinderbecken", ru: "Детский бассейн" },
      tag: { tr: "Güvenli sığ alan", en: "Shallow & safe", de: "Flach & sicher", ru: "Мелководье" },
      kv: [
        {
          label: { tr: "Açıklama", en: "Description", de: "Beschreibung", ru: "Описание" },
          value: {
            tr: "Çocuklar için güvenli sığ su ve oyun alanı (aquapark / açık havuz bölgesi ile entegre kullanım).",
            en: "Shallow water and play area for children (integrated with the outdoor / aquapark zone).",
            de: "Flaches Wasser und Spielbereich für Kinder.",
            ru: "Безопасная зона для детей.",
          },
        },
      ],
    },
  ];

  var STATS = {
    tr: [
      { k: "Açık havuz", v: "3" },
      { k: "Kapalı havuz", v: "1" },
      { k: "Çocuk havuzu", v: "1" },
    ],
    en: [
      { k: "Outdoor pools", v: "3" },
      { k: "Indoor pool", v: "1" },
      { k: "Kids’ pool", v: "1" },
    ],
    de: [
      { k: "Außenbecken", v: "3" },
      { k: "Hallenbad", v: "1" },
      { k: "Kinderbecken", v: "1" },
    ],
    ru: [
      { k: "Открытых бассейнов", v: "3" },
      { k: "Крытый бассейн", v: "1" },
      { k: "Детский бассейн", v: "1" },
    ],
  };

  var SUPPORT = {
    title: {
      tr: "Plaj / havuz destek hizmetleri",
      en: "Beach & pool services",
      de: "Service Strand & Pool",
      ru: "Сервис пляжа и бассейнов",
    },
    lines: [
      {
        tr: "Plaj / havuz havlu servisi 08:30 – 19:00 arasındadır.",
        en: "Beach / pool towel service 08:30 – 19:00.",
        de: "Handtuchservice Strand/Pool 08:30 – 19:00.",
        ru: "Полотенца пляж/бассейн 08:30 – 19:00.",
      },
      {
        tr: "Plaj havlusu konaklamanıza dahil olarak ücretsiz sunulmaktadır.",
        en: "Beach towels are included free of charge with your stay.",
        de: "Strandtücher sind im Aufenthalt inklusive.",
        ru: "Пляжные полотенца включены в проживание.",
      },
    ],
  };

  function pickStats() {
    var lang = window.VionaContent.lang();
    return STATS[lang] || STATS.en;
  }

  function renderIntroCard() {
    var card = el("div", "beach-intro");
    INTRO_PARAS.forEach(function (para) {
      var p = el("p", "beach-intro__p");
      p.textContent = T(para);
      card.appendChild(p);
    });
    return card;
  }

  function renderStats() {
    var wrap = el("div", "beach-stats");
    pickStats().forEach(function (s) {
      var ch = el("div", "beach-stat");
      ch.appendChild(el("span", "beach-stat__v", s.v));
      ch.appendChild(el("span", "beach-stat__k", s.k));
      wrap.appendChild(ch);
    });
    return wrap;
  }

  function renderPoolCard(pool) {
    var card = el("article", "venue-card venue-card--rest venue-card--beach");
    var fig = el("div", "venue-card__media");
    var img = document.createElement("img");
    img.src = pool.img;
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    fig.appendChild(img);
    var body = el("div", "venue-card__body");
    body.appendChild(el("h3", "venue-card__title", T(pool.title)));
    if (pool.tag) {
      body.appendChild(el("p", "venue-card__loc", T(pool.tag)));
    }
    body.appendChild(renderKv("beach-kv", pool.kv));
    card.appendChild(fig);
    card.appendChild(body);
    return card;
  }

  function renderSupport() {
    var box = el("div", "rest-rules beach-support");
    box.appendChild(el("h3", "rest-rules__title", T(SUPPORT.title)));
    SUPPORT.lines.forEach(function (line) {
      var p = el("p", "beach-support__line");
      p.textContent = T(line);
      box.appendChild(p);
    });
    return box;
  }

  function renderBeachModule(container) {
    var root = el("div", "viona-mod viona-mod--rest viona-mod--beach");
    var lead = el("p", "viona-mod-lead");
    lead.textContent = T({
      tr: "Bu bölüm özel plajımızı, havuzları ve sahil hizmetlerini özetler. Şezlong ve şemsiye konaklamanıza dahildir.",
      en: "Your private beach, pools and beach services. Loungers and parasols are included in your stay.",
      de: "Strand, Pools und Service am Meer. Liegen und Schirme im Aufenthalt inklusive.",
      ru: "Пляж, бассейны и сервисы. Шезлонги и зонты включены в проживание.",
    });
    root.appendChild(lead);
    root.appendChild(renderIntroCard());

    var hPlaj = el("h2", "rest-section-title", T({ tr: "Plaj", en: "Beach", de: "Strand", ru: "Пляж" }));
    root.appendChild(hPlaj);

    var beachCard = el("article", "venue-card venue-card--rest venue-card--beach");
    var figB = el("div", "venue-card__media");
    var imgB = document.createElement("img");
    imgB.src = "assets/images/beach/plaj1-604d174c-869e-44a1-8e11-775df57b5d1b.png";
    imgB.alt = "";
    imgB.loading = "lazy";
    figB.appendChild(imgB);
    var bodyB = el("div", "venue-card__body");
    bodyB.appendChild(el("h3", "venue-card__title", T({ tr: "Plaj bilgileri", en: "Beach information", de: "Strandinfos", ru: "Пляж" })));
    bodyB.appendChild(renderKv("beach-kv", BEACH_KV));
    beachCard.appendChild(figB);
    beachCard.appendChild(bodyB);
    root.appendChild(beachCard);

    var hHavuz = el("h2", "rest-section-title", T({ tr: "Havuzlar", en: "Pools", de: "Pools", ru: "Бассейны" }));
    root.appendChild(hHavuz);
    root.appendChild(renderStats());

    POOLS.forEach(function (pool) {
      root.appendChild(renderPoolCard(pool));
    });

    root.appendChild(renderSupport());

    container.appendChild(root);
  }

  window.renderBeachModule = renderBeachModule;
})();
