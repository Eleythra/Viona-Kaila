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
        "Kaila Beach Hotel’de üç açık havuz bulunmaktadır: gün boyu aktiviteler ve müzik eşliğinde hareketli anlar sunan eğlence havuzu, aquaparkıyla öne çıkan aquapark havuzu ve sakin atmosferiyle dinlenmek isteyenler için ideal dinlenme havuzu. Aquapark ve açık alanlarda çocuklara uygun sığ su bölgeleri de yer alır; ayrıntılar aşağıdaki görsellerde.",
      en:
        "There are three outdoor pools: an activity pool with music and animation, an aquapark pool with slides, and a calm relaxation pool. Shallow areas for children are part of the outdoor / aquapark zone — see the cards below.",
      de:
        "Drei Außenbecken: Aktivitätsbecken mit Musik, Aquapark mit Rutschen und ruhiges Relax-Becken. Flache Bereiche für Kinder gehören zum Außen- und Aquaparkbereich — siehe die Karten unten.",
      pl: "Są trzy baseny zewnętrzne: basen aktywności z muzyką i animacją, basen aquaparku ze zjeżdżalniami oraz spokojny basen relaksacyjny. Płytkie strefy dla dzieci są w strefie zewnętrznej / aquaparku — szczegóły na kartach poniżej.",
    },
    {
      tr:
        "Spa alanında yer alan 12 metre uzunluğundaki kapalı ve ısıtmalı havuz ise yılın her döneminde dingin ve rahatlatıcı bir yüzme deneyimi sunar.",
      en:
        "The 12 m heated indoor pool in the spa offers a calm swim experience year-round.",
      de:
        "Das 12 m beheizte Hallenbad im Spa lädt ganzjährig zum entspannten Schwimmen ein.",
      pl: "12-metrowy podgrzewany basen kryty w spa zapewnia spokojną pływalnię przez cały rok.",
    },
    {
      tr:
        "Otelin özel alt geçidinden geçerek size ayrılmış plaj alanımıza kolayca ulaşabilirsiniz. Gün boyunca atıştırmalıklar, alkolsüz içecekler, bira ve gözleme gibi geleneksel Türk lezzetleri ikram edilir; hepsi konaklamanıza dahildir. Daha özel ve seçkin bir deniz keyfi arayanlar için ise sahilde yer alan Moss Beach Restaurant & Bar sizi bekliyor. Bu özel beach club’da lezzetli à la carte yemekler, sağlıklı seçenekler ve geniş bir premium alkollü ve alkolsüz içecek menüsü sunulmaktadır.",
      en:
        "Reach the private beach via the hotel’s underpass. During the day, snacks, soft drinks, beer and gözleme are served on the beach — included in your stay. Moss Beach Restaurant & Bar on the shore offers à la carte dining and a premium drink menu for an extra special sea experience.",
      de:
        "Über die Unterführung gelangen Sie zum Privatstrand. Snacks, alkoholfreie Getränke, Bier und Gözleme sind inklusive. Moss Beach Restaurant & Bar bietet À-la-carte und Premium-Getränke.",
      pl: "Do prywatnej plaży dojdziesz przejściem podziemnym hotelu. W ciągu dnia na plaży serwowane są przekąski, napoje bezalkoholowe, piwo i gözleme — w cenie pobytu. Moss Beach Restaurant & Bar nad brzegiem oferuje dania à la carte i premium menu napojów za dodatkową opłatą.",
    },
  ];

  /** Can kurtaran — tüm açık havuz, aquapark ve deniz (plaj); vurgulu uyarı. */
  var LIFEGUARD_ALERT = {
    title: {
      tr: "Önemli — can güvenliği",
      en: "Important — water safety",
      de: "Wichtig — Badesicherheit",
      pl: "Ważne — bezpieczeństwo w wodzie",
    },
    body: {
      tr:
        "Can kurtaran hizmeti her gün 10:00 – 18:00 saatleri arasındadır. Bu süre tüm açık havuzları, aquapark alanını ve denizi (otel plajı) kapsar. Bu saatlerin dışında can gözetimi bulunmayabilir; lütfen dikkatli olun, özellikle çocuklarla. Saatler ve gözetim kapsamı mevsim ile operasyonel koşullara göre değişebilir.",
      en:
        "Lifeguard service runs daily from 10:00 to 18:00. This covers every outdoor pool, the aquapark area and the sea at the hotel beach. Outside these hours supervised rescue may not be present — please take care, especially with children. Hours and the scope of supervision may vary depending on season and operational conditions.",
      de:
        "Badeaufsicht (Rettungsschwimmer) ist täglich von 10:00 bis 18:00 Uhr aktiv — für alle Außenbecken, den Aquapark und das Meer am Hotelstrand. Außerhalb dieser Zeiten kann keine ständige Beaufsichtigung gewährleistet sein; bitte seien Sie vorsichtig, vor allem mit Kindern. Zeiten und der Umfang der Aufsicht können je nach Jahreszeit und betrieblichen Gegebenheiten variieren.",
      pl: "Ratownicy pracują codziennie 10:00–18:00. Obejmuje to wszystkie baseny zewnętrzne, aquapark i morze przy plaży hotelowej. Poza tymi godzinami nadzór ratowniczy może nie obowiązywać — prosimy o ostrożność, zwłaszcza z dziećmi. Godziny oraz zakres nadzoru mogą ulec zmianie w zależności od sezonu i warunków operacyjnych.",
    },
  };

  var BEACH_KV = [
    { label: { tr: "Plaj mesafesi", en: "Distance to beach", de: "Strandentfernung", pl: "Distance to beach" }, value: "50 m" },
    { label: { tr: "Plaj konumu", en: "Beach position", de: "Lage", pl: "Beach position" }, value: { tr: "1. sıra · otele çok yakın", en: "First line · very close", de: "Erste Reihe", pl: "First line · very close" } },
    { label: { tr: "Plaj türü", en: "Beach type", de: "Strandart", pl: "Beach type" }, value: { tr: "Kum ve çakıl", en: "Sand & pebble", de: "Sand & Kies", pl: "Sand & pebble" } },
    { label: { tr: "Plaj statüsü", en: "Beach status", de: "Status", pl: "Beach status" }, value: { tr: "Otelin özel plajı", en: "Hotel private beach", de: "Hotelprivatstrand", pl: "Hotel private beach" } },
    { label: { tr: "Kullanım saatleri", en: "Hours", de: "Zeiten", pl: "Hours" }, value: "08:30 – 18:30" },
    { label: { tr: "Plaj havlusu", en: "Beach towels", de: "Strandtücher", pl: "Beach towels" }, value: { tr: "Ücretsiz", en: "Free", de: "Kostenlos", pl: "Free" } },
    { label: { tr: "Şemsiye", en: "Parasols", de: "Schirme", pl: "Parasols" }, value: { tr: "Ücretsiz", en: "Free", de: "Kostenlos", pl: "Free" } },
    { label: { tr: "Şezlong", en: "Sun loungers", de: "Liegen", pl: "Sun loungers" }, value: { tr: "Ücretsiz", en: "Free", de: "Kostenlos", pl: "Free" } },
    { label: { tr: "Wi-Fi", en: "Wi-Fi", de: "WLAN", pl: "Wi-Fi" }, value: { tr: "Plajda mevcut", en: "Available on the beach", de: "Am Strand", pl: "Dostępne na plaży" } },
    { label: { tr: "Pavilion", en: "Pavilion", de: "Pavillon", pl: "Pavilion" }, value: { tr: "Yoktur", en: "Not available", de: "Nein", pl: "Not available" } },
    { label: { tr: "Otel–plaj erişimi", en: "Hotel–beach access", de: "Zugang", pl: "Hotel–beach access" }, value: { tr: "Alt geçit", en: "Underpass", de: "Unterführung", pl: "Underpass" } },
    { label: { tr: "Beach Imbiss içecek", en: "Beach Imbiss drinks", de: "Beach Imbiss Getränke", pl: "Beach Imbiss drinks" }, value: "10:00 – 17:00" },
    { label: { tr: "Beach Imbiss yiyecek", en: "Beach Imbiss food", de: "Beach Imbiss Essen", pl: "Beach Imbiss food" }, value: "12:00 – 16:00" },
    {
      label: { tr: "İçecek seçenekleri", en: "Drinks", de: "Getränke", pl: "Drinks" },
      value: {
        tr: "Bira, çay, kahve, konsantre meyve suyu, gazlı içecekler, su, ayran",
        en: "Beer, tea, coffee, juices, soft drinks, water, ayran",
        de: "Bier, Tee, Kaffee, Säfte, Limonaden, Wasser, Ayran",
        pl: "Beer, tea, coffee, juices, soft drinks, water, ayran",
      },
    },
    {
      label: { tr: "Yiyecek seçenekleri", en: "Food", de: "Essen", pl: "Food" },
      value: {
        tr: "Patates kızartması, sosisli sandviç, gözleme",
        en: "Fries, sausage sandwich, gözleme",
        de: "Pommes, Wurst-Sandwich, Gözleme",
        pl: "Fries, sausage sandwich, gözleme",
      },
    },
    {
      label: { tr: "Moss Beach Restaurant & Bar", en: "Moss Beach Restaurant & Bar", de: "Moss Beach Restaurant & Bar", pl: "Moss Beach Restaurant & Bar" },
      value: {
        tr: "10:00 – 19:00 · ücretli (à la carte) · Kaila misafirlerine %10 indirim",
        en: "10:00 – 19:00 · paid (à la carte) · 10% discount for Kaila guests",
        de: "10:00 – 19:00 · kostenpflichtig · 10 % Rabatt für Kaila-Gäste",
        pl: "10:00 – 19:00 · płatne (à la carte) · 10% zniżki dla gości Kaila",
      },
    },
  ];

  var POOLS = [
    {
      img: "assets/images/beach/havuz2-9839c4c2-5299-42d9-93c0-4aabdf8beacb.png",
      title: { tr: "Relax Pool", en: "Relax Pool", de: "Relax Pool", pl: "Relax Pool" },
      tag: { tr: "Dinlenme havuzu", en: "Relaxation pool", de: "Ruhepool", pl: "Relaxation pool" },
      kv: [
        { label: { tr: "Havuz türü", en: "Type", de: "Typ", pl: "Type" }, value: { tr: "Açık havuz", en: "Outdoor", de: "Außen", pl: "Outdoor" } },
        { label: { tr: "Su türü", en: "Water", de: "Wasser", pl: "Water" }, value: { tr: "Tatlı su", en: "Fresh water", de: "Süßwasser", pl: "Fresh water" } },
        { label: { tr: "Hacim", en: "Volume", de: "Volumen", pl: "Volume" }, value: "560 m³" },
        { label: { tr: "Kullanım saatleri", en: "Hours", de: "Zeiten", pl: "Hours" }, value: "08:30 – 18:30" },
        { label: { tr: "Derinlik", en: "Depth", de: "Tiefe", pl: "Depth" }, value: "140 cm (1,4 m)" },
      ],
    },
    {
      img: "assets/images/beach/aquapark-64349b4a-d920-4b2d-88bf-d95de9a38d1b.png",
      title: { tr: "Aquapark / Activity Pool", en: "Aquapark / Activity Pool", de: "Aquapark", pl: "Aquapark / Activity Pool" },
      tag: { tr: "Eğlence & aquapark", en: "Fun & aquapark", de: "Spaß & Rutschen", pl: "Fun & aquapark" },
      kv: [
        { label: { tr: "Havuz türü", en: "Type", de: "Typ", pl: "Type" }, value: { tr: "Açık havuz", en: "Outdoor", de: "Außen", pl: "Outdoor" } },
        { label: { tr: "Su türü", en: "Water", de: "Wasser", pl: "Water" }, value: { tr: "Tatlı su", en: "Fresh water", de: "Süßwasser", pl: "Fresh water" } },
        { label: { tr: "Hacim", en: "Volume", de: "Volumen", pl: "Volume" }, value: "550 m³" },
        { label: { tr: "Aquapark", en: "Aquapark", de: "Aquapark", pl: "Aquapark" }, value: { tr: "Var", en: "Yes", de: "Ja", pl: "Yes" } },
        { label: { tr: "Yetişkin kaydırak", en: "Adult slides", de: "Rutschen Erw.", pl: "Adult slides" }, value: "3" },
        { label: { tr: "Çocuk kaydırak", en: "Kids’ slide", de: "Kinder-Rutsche", pl: "Kids’ slide" }, value: "1" },
        {
          label: { tr: "Aquapark saatleri", en: "Aquapark hours", de: "Aquapark-Zeiten", pl: "Aquapark hours" },
          value: "10:00 – 12:00 · 14:00 – 16:00",
        },
      ],
    },
    {
      img: "assets/images/beach/havuz1-a7d2f8ca-d530-46a2-be40-09ba2a6ee720.png",
      title: { tr: "Dolphin Pool", en: "Dolphin Pool", de: "Dolphin Pool", pl: "Dolphin Pool" },
      tag: { tr: "Dolphin havuz", en: "Dolphin pool", de: "Dolphin-Becken", pl: "Dolphin pool" },
      kv: [
        { label: { tr: "Havuz türü", en: "Type", de: "Typ", pl: "Type" }, value: { tr: "Açık havuz", en: "Outdoor", de: "Außen", pl: "Outdoor" } },
        { label: { tr: "Su türü", en: "Water", de: "Wasser", pl: "Water" }, value: { tr: "Tatlı su", en: "Fresh water", de: "Süßwasser", pl: "Fresh water" } },
        { label: { tr: "Hacim", en: "Volume", de: "Volumen", pl: "Volume" }, value: "125 m³" },
        {
          label: { tr: "Kullanım saatleri", en: "Hours", de: "Zeiten", pl: "Hours" },
          value: "08:30 – 18:30",
        },
      ],
    },
    {
      img: "assets/images/beach/kapal_havuz-9e4e184d-4009-4063-9f22-681e94241d68.png",
      title: { tr: "Indoor Pool (Spa)", en: "Indoor Pool (Spa)", de: "Hallenbad (Spa)", pl: "Indoor Pool (Spa)" },
      tag: { tr: "Kapalı · ısıtmalı · 12 m", en: "Indoor · heated · 12 m", de: "Hallenbad · beheizt · 12 m", pl: "Indoor · heated · 12 m" },
      kv: [
        { label: { tr: "Havuz türü", en: "Type", de: "Typ", pl: "Type" }, value: { tr: "Kapalı havuz", en: "Indoor", de: "Hallenbad", pl: "Indoor" } },
        { label: { tr: "Su türü", en: "Water", de: "Wasser", pl: "Water" }, value: { tr: "Tatlı su", en: "Fresh water", de: "Süßwasser", pl: "Fresh water" } },
        { label: { tr: "Uzunluk", en: "Length", de: "Länge", pl: "Length" }, value: "12 m" },
        { label: { tr: "Kullanım saatleri", en: "Hours", de: "Zeiten", pl: "Hours" }, value: "08:00 – 19:00" },
      ],
    },
    {
      img: "assets/images/beach/_ocukhavuzu-7c4e7f00-8a93-4633-917a-cdb1a596b1c6.png",
      title: { tr: "Çocuk havuzu", en: "Kids’ pool", de: "Kinderbecken", pl: "Kids’ pool" },
      tag: { tr: "Güvenli sığ alan", en: "Shallow & safe", de: "Flach & sicher", pl: "Shallow & safe" },
      kv: [
        {
          label: { tr: "Açıklama", en: "Description", de: "Beschreibung", pl: "Description" },
          value: {
            tr: "Çocuklar için güvenli sığ su ve oyun alanı (aquapark / açık havuz bölgesi ile entegre kullanım).",
            en: "Shallow water and play area for children (integrated with the outdoor / aquapark zone).",
            de: "Flaches Wasser und Spielbereich für Kinder.",
            pl: "Płytka woda i strefa zabaw dla dzieci (w ramach strefy zewnętrznej / aquaparku).",
          },
        },
      ],
    },
  ];

  var STATS = {
    tr: [
      { k: "Açık havuz", v: "3" },
      { k: "Kapalı havuz", v: "1" },
    ],
    en: [
      { k: "Outdoor pools", v: "3" },
      { k: "Indoor pool", v: "1" },
    ],
    de: [
      { k: "Außenbecken", v: "3" },
      { k: "Hallenbad", v: "1" },
    ],
    pl: [
      { k: "Outdoor pools", v: "3" },
      { k: "Indoor pool", v: "1" },
    ],
  };

  var SUPPORT = {
    title: {
      tr: "Plaj / havuz destek hizmetleri",
      en: "Beach & pool services",
      de: "Service Strand & Pool",
      pl: "Usługi plażowe i basenowe",
    },
    lines: [
      {
        tr: "Plaj / havuz havlu servisi 08:30 – 18:30 arasındadır.",
        en: "Beach / pool towel service 08:30 – 18:30.",
        de: "Handtuchservice Strand/Pool 08:30 – 18:30.",
        pl: "Wypożyczalnia ręczników plażowych / basenowych 08:30 – 18:30.",
      },
      {
        tr: "Plaj havlusu konaklamanıza dahil olarak ücretsiz sunulmaktadır.",
        en: "Beach towels are included free of charge with your stay.",
        de: "Strandtücher sind im Aufenthalt inklusive.",
        pl: "Ręczniki plażowe są bezpłatnie w cenie pobytu.",
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

  function renderLifeguardAlert() {
    var wrap = el("div", "beach-lifeguard-alert");
    wrap.setAttribute("role", "region");
    var kick = el("p", "beach-lifeguard-alert__kicker");
    kick.id = "beach-lifeguard-kicker";
    kick.textContent = T(LIFEGUARD_ALERT.title);
    wrap.setAttribute("aria-labelledby", "beach-lifeguard-kicker");
    wrap.appendChild(kick);
    wrap.appendChild(el("p", "beach-lifeguard-alert__text", T(LIFEGUARD_ALERT.body)));
    return wrap;
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
    root.appendChild(renderLifeguardAlert());
    var lead = el("p", "viona-mod-lead");
    lead.textContent = T({
      tr: "Bu bölüm özel plajımızı, havuzları ve sahil hizmetlerini özetler. Şezlong ve şemsiye konaklamanıza dahildir.",
      en: "Your private beach, pools and beach services. Loungers and parasols are included in your stay.",
      de: "Strand, Pools und Service am Meer. Liegen und Schirme im Aufenthalt inklusive.",
      pl: "Prywatna plaża, baseny i usługi plażowe. Leżaki i parasole w cenie pobytu.",
    });
    root.appendChild(lead);
    root.appendChild(renderIntroCard());

    var hPlaj = el("h2", "rest-section-title", T({ tr: "Plaj", en: "Beach", de: "Strand", pl: "Beach" }));
    root.appendChild(hPlaj);

    var beachCard = el("article", "venue-card venue-card--rest venue-card--beach");
    var figB = el("div", "venue-card__media");
    var imgB = document.createElement("img");
    imgB.src = "assets/images/beach/plaj1-604d174c-869e-44a1-8e11-775df57b5d1b.png";
    imgB.alt = "";
    imgB.loading = "lazy";
    figB.appendChild(imgB);
    var bodyB = el("div", "venue-card__body");
    bodyB.appendChild(el("h3", "venue-card__title", T({ tr: "Plaj bilgileri", en: "Beach information", de: "Strandinfos", pl: "Beach information" })));
    bodyB.appendChild(renderKv("beach-kv", BEACH_KV));
    beachCard.appendChild(figB);
    beachCard.appendChild(bodyB);
    root.appendChild(beachCard);

    var hHavuz = el("h2", "rest-section-title", T({ tr: "Havuzlar", en: "Pools", de: "Pools", pl: "Pools" }));
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
