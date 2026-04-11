/**
 * Neredeyim — dik kroki + sabit numaralı işaretler; liste seçimi ve pin tıklaması ile kısa konum tarifi.
 * Düzen: styles.css — :has() yalnızca geniş modül (max-width) için; iç kaydırma yok, sayfa akışı.
 */
(function () {
  "use strict";
  var P = window.VionaContent && window.VionaContent.pick;

  function T(row) {
    if (typeof row === "string") return row;
    if (typeof P === "function") return P(row || {});
    if (row && typeof row === "object") return row.tr || row.en || row.de || row.ru || "";
    return row || "";
  }

  function L(tr, en, de, ru) {
    return { tr: tr, en: en, de: de, ru: ru };
  }

  /**
   * Kroki pin sırası (Sinton yok). tier alanı yalnızca veri mirası; arayüzde kullanılmıyor.
   */
  var WHERE_PLACES = [
    {
      tier: "hero",
      icon: "lobby",
      title: L("Lobi (Lobby)", "Lobby", "Lobby", "Лобби"),
      konum: L(
        "A Blok giriş katında, ana kapı hizasında.",
        "Block A, ground floor — right at the main entrance.",
        "Block A, Erdgeschoss — direkt am Haupteingang.",
        "Блок A, цокольный этаж у главного входа.",
      ),
      desc: L(
        "Resepsiyon ve otel içi yönlendirmenin başladığı yer.",
        "Front desk and the natural starting point for directions around the resort.",
        "Rezeption und erste Anlaufstelle für alle Wege innerhalb der Anlage.",
        "Ресепшн и удобная отправная точка для ориентира по отелю.",
      ),
    },
    {
      tier: "hero",
      icon: "utensils",
      title: L("Ana Restoran (Main Restaurant)", "Main Restaurant", "Hauptrestaurant", "Основной ресторан"),
      konum: L(
        "B Blok’ta, havuza bakan teras katında.",
        "Pool-facing terrace level in Block B.",
        "Poolseitige Terrassenebene in Block B.",
        "Террасный уровень блока B со стороны бассейна.",
      ),
      desc: L(
        "Günün ana öğünleri için açık büfe.",
        "Open-buffet dining for your main meals.",
        "Offenes Buffet für die Hauptmahlzeiten.",
        "Шведский стол на основные приёмы пищи.",
      ),
    },
    {
      tier: "standard",
      icon: "sofa",
      title: L("Lobi Alanı (Lobby Area)", "Lobby Area", "Lobbybereich", "Зона лобби"),
      konum: L(
        "A Blok lobi içinde, oturma düzeninin olduğu bölümde.",
        "Within Block A’s lobby, where the lounge seating is.",
        "Im inneren Lobbybereich von Block A, bei den Sitzgruppen.",
        "Внутри лобби блока A, в зоне мягкой мебели.",
      ),
      desc: L(
        "Rahat oturma ve bekleme.",
        "Comfortable seating while you wait or meet.",
        "Gemütliche Sitzecken zum Warten und Verweilen.",
        "Уютные места для ожидания и встреч.",
      ),
    },
    {
      tier: "standard",
      icon: "cup",
      title: L("Lobi Bar (Lobby Bar)", "Lobby Bar", "Lobby Bar", "Лобби-бар"),
      konum: L(
        "A Blok lobi alanı içinde.",
        "Inside Block A’s lobby lounge.",
        "Im Lobbybereich von Block A.",
        "В лаунж-зоне лобби блока A.",
      ),
      desc: L(
        "İçecek ve hafif servis.",
        "Drinks and light service throughout the day.",
        "Getränke und leichte Snacks.",
        "Напитки и лёгкие закуски.",
      ),
    },
    {
      tier: "standard",
      icon: "bed",
      title: L("Odalar (3101–3612) (Rooms)", "Rooms (3101–3612)", "Zimmer (3101–3612)", "Номера (3101–3612)"),
      konum: L(
        "A Blok’un üst katlarında (3101–3612).",
        "Upper floors of Block A — rooms 3101–3612.",
        "Obergeschosse von Block A — Zimmer 3101–3612.",
        "Верхние этажи блока A — номера 3101–3612.",
      ),
      desc: L(
        "A Blok konaklama katları.",
        "Guest room floors in Block A.",
        "Zimmeretagen in Block A.",
        "Жилые этажи блока A.",
      ),
    },
    {
      tier: "standard",
      icon: "users",
      title: L(
        "Astra Toplantı ve Etkinlik Salonu (Astra Meeting & Event Hall)",
        "Astra Meeting & Event Hall",
        "Astra Tagungs- & Veranstaltungssaal",
        "Зал Astra для встреч и мероприятий",
      ),
      konum: L(
        "A Blok, eksi birinci (-1) kat.",
        "Basement level −1, Block A.",
        "Untergeschoss −1 in Block A.",
        "Подземный уровень −1, блок A.",
      ),
      desc: L(
        "Toplantı ve etkinlik salonu.",
        "Meetings, events and private functions.",
        "Tagungen, Events und private Anlässe.",
        "Встречи, мероприятия и банкеты.",
      ),
    },
    {
      tier: "standard",
      icon: "pool",
      title: L("Relax Havuzu (Relax Pool)", "Relax Pool", "Relax Pool", "Релакс-бассейн"),
      konum: L(
        "A ve B blokların arasındaki açık alanda.",
        "Open-air pool deck between Blocks A and B.",
        "Freiluft-Pool zwischen Block A und B.",
        "Открытая зона бассейна между блоками A и B.",
      ),
      desc: L(
        "Ana dış havuzlardan biri.",
        "One of the resort’s main outdoor pools.",
        "Einer der Haupt-Außenpools der Anlage.",
        "Один из основных открытых бассейнов курорта.",
      ),
    },
    {
      tier: "standard",
      icon: "cup",
      title: L("Havuz Bar (Pool Bar)", "Pool Bar", "Pool Bar", "Бар у бассейна"),
      konum: L(
        "Relax Pool kenarında.",
        "Right by the Relax Pool.",
        "Direkt am Relax Pool.",
        "У бассейна Relax Pool.",
      ),
      desc: L(
        "Havuz başı içecek servisi.",
        "Poolside drinks without leaving the water’s edge.",
        "Getränke direkt am Becken.",
        "Напитки у кромки бассейна.",
      ),
    },
    {
      tier: "standard",
      icon: "utensils",
      title: L("Gusto Snack Bar (Gusto Snack Bar)", "Gusto Snack Bar", "Gusto Snack Bar", "Gusto Snack Bar"),
      konum: L(
        "Havuz bölgesinde, B Blok tarafında.",
        "Pool zone on the Block B side.",
        "Poolbereich auf Block-B-Seite.",
        "Зона бассейна со стороны блока B.",
      ),
      desc: L(
        "Gün boyu atıştırmalık ve hafif yemek.",
        "Casual snacks and light bites through the day.",
        "Snacks und kleine Gerichte über den Tag.",
        "Лёгкие закуски в течение дня.",
      ),
    },
    {
      tier: "standard",
      icon: "shop",
      title: L("Mağazalar (Shops)", "Shops", "Geschäfte", "Магазины"),
      konum: L(
        "B Blok’ta, blokları birbirine bağlayan koridorda.",
        "Along Block B’s internal connecting mall / corridor.",
        "Im verbindenden Gang von Block B.",
        "В проходе, соединяющем зоны блока B.",
      ),
      desc: L(
        "Hediyelik ve günlük ihtiyaçlar.",
        "Souvenirs, essentials and holiday shopping.",
        "Souvenirs, Kleinkram und Urlaubsbedarf.",
        "Сувениры и повседневные мелочи.",
      ),
    },
    {
      tier: "standard",
      icon: "utensils",
      title: L("A’la Carte Restoran (A’la Carte Restaurant)", "À La Carte Restaurant", "À-la-carte-Restaurant", "Ресторан à la carte"),
      konum: L(
        "B Blok, birinci (1) kat.",
        "1st floor, Block B.",
        "1. Obergeschoss, Block B.",
        "1-й этаж блока B.",
      ),
      desc: L(
        "Menüden sipariş, akşam konsepti.",
        "Table-service dining from the menu.",
        "Bedienung am Tisch mit Speisekarte.",
        "Обслуживание по меню.",
      ),
    },
    {
      tier: "standard",
      icon: "bed",
      title: L("Odalar (1001–1638) (Rooms)", "Rooms (1001–1638)", "Zimmer (1001–1638)", "Номера (1001–1638)"),
      konum: L(
        "B Blok’un üst katlarında (1001–1638).",
        "Upper floors of Block B — rooms 1001–1638.",
        "Obergeschosse von Block B — Zimmer 1001–1638.",
        "Верхние этажи блока B — номера 1001–1638.",
      ),
      desc: L(
        "B Blok konaklama katları.",
        "Guest room floors in Block B.",
        "Zimmeretagen in Block B.",
        "Жилые этажи блока B.",
      ),
    },
    {
      tier: "standard",
      icon: "spa",
      title: L("Spa (Spa)", "Spa", "Spa", "Спа"),
      konum: L(
        "B Blok alt katında, wellness girişi üzerinden.",
        "Lower level of Block B — follow spa signage.",
        "Untergeschoss von Block B — der Spa-Beschilderung folgen.",
        "Нижний уровень блока B — по указателям спа.",
      ),
      desc: L(
        "Spa, bakım ve rahatlama.",
        "Treatments, thermal experiences and quiet time.",
        "Anwendungen, Ruhezonen und Wellness.",
        "Процедуры, релакс и wellness.",
      ),
    },
    {
      tier: "standard",
      icon: "droplet",
      title: L("Kapalı Havuz (Indoor Pool)", "Indoor Pool", "Hallenbad", "Крытый бассейн"),
      konum: L(
        "Spa kompleksi içinde.",
        "Within the spa complex.",
        "Im Spa-Komplex.",
        "В составе спа-комплекса.",
      ),
      desc: L(
        "Isıtmalı kapalı havuz.",
        "Heated indoor pool for year-round swims.",
        "Beheiztes Hallenbad.",
        "Подогреваемый крытый бассейн.",
      ),
    },
    {
      tier: "standard",
      icon: "dumbbell",
      title: L("Fitness Salonu (Fitness)", "Fitness", "Fitness", "Фитнес"),
      konum: L(
        "B Blok alt katında, wellness girişi hizasında.",
        "Lower level of Block B — follow fitness / spa signage.",
        "Untergeschoss von Block B — Fitness-/Spa-Beschilderung folgen.",
        "Нижний уровень блока B — по указателям фитнеса / спа.",
      ),
      desc: L(
        "B Blok alt katında kardiyo ve ağırlık alanı.",
        "Cardio and strength equipment on Block B’s lower level.",
        "Cardio und Krafttraining im Untergeschoss von Block B.",
        "Кардио и силовые тренажёры на нижнем уровне блока B.",
      ),
    },
    {
      tier: "standard",
      icon: "cake",
      title: L("Libum Kafe (Libum Cafe)", "Libum Cafe", "Libum Cafe", "Libum Cafe"),
      konum: L(
        "B Blok zemin katta.",
        "Ground floor, Block B.",
        "Erdgeschoss, Block B.",
        "Цокольный этаж блока B.",
      ),
      desc: L(
        "Kahve, pasta ve tatlı molası.",
        "Coffee, cakes and sweet treats.",
        "Kaffee, Kuchen und Patisserie.",
        "Кофе, выпечка и десерты.",
      ),
    },
    {
      tier: "standard",
      icon: "bed",
      title: L("Odalar (2101–2612) (Rooms)", "Rooms (2101–2612)", "Zimmer (2101–2612)", "Номера (2101–2612)"),
      konum: L(
        "C Blok’un üst katlarında (2101–2612).",
        "Upper floors of Block C — rooms 2101–2612.",
        "Obergeschosse von Block C — Zimmer 2101–2612.",
        "Верхние этажи блока C — номера 2101–2612.",
      ),
      desc: L(
        "C Blok konaklama katları.",
        "Guest room floors in Block C.",
        "Zimmeretagen in Block C.",
        "Жилые этажи блока C.",
      ),
    },
    {
      tier: "standard",
      icon: "fish",
      title: L("Dolphin Restoran (Dolphin Restaurant)", "Dolphin Restaurant", "Dolphin Restaurant", "Ресторан Dolphin"),
      konum: L(
        "C Blok zemin katta, Dolphin havuz hattında.",
        "Ground floor, Block C — Dolphin pool frontage.",
        "Erdgeschoss Block C, entlang des Dolphin-Pools.",
        "Цокольный этаж блока C у линии бассейна Dolphin.",
      ),
      desc: L(
        "Havuz kenarı à la carte.",
        "À la carte dining beside the Dolphin pool.",
        "À la carte direkt am Dolphin-Pool.",
        "Ресторан à la carte у бассейна Dolphin.",
      ),
    },
    {
      tier: "standard",
      icon: "smile",
      title: L(
        "Dolphin Bar / Jammies Mini Club (Dolphin Bar / Jammies Mini Club)",
        "Dolphin Bar / Jammies Mini Club",
        "Dolphin Bar / Jammies Mini Club",
        "Dolphin Bar / Jammies Mini Club",
      ),
      konum: L(
        "C Blok zemin katta, aile havuzu hattında.",
        "Ground floor, Block C — family pool side.",
        "Erdgeschoss Block C, Familienpool-Seite.",
        "Цокольный этаж блока C, зона семейного бассейна.",
      ),
      desc: L(
        "Bar ve Jammies çocuk kulübü.",
        "Pool bar plus Jammies Mini Club for little guests.",
        "Poolbar und Jammies Mini Club für Kinder.",
        "Бар и мини-клуб Jammies для детей.",
      ),
    },
    {
      tier: "standard",
      icon: "pool",
      title: L("Dolphin Havuz (Dolphin Pool)", "Dolphin Pool", "Dolphin Pool", "Бассейн Dolphin"),
      konum: L(
        "C Blok zemin katta, açık alanda.",
        "Outdoor pool deck, ground floor Block C.",
        "Freibadbereich, Erdgeschoss Block C.",
        "Открытый бассейн, цокольный этаж блока C.",
      ),
      desc: L(
        "Aile ve aktivite havuzu.",
        "Family-friendly activity pool.",
        "Familien- und Aktivitätsbecken.",
        "Семейный активный бассейн.",
      ),
    },
    {
      tier: "standard",
      icon: "car",
      title: L("Otopark (Car Park)", "Car Park", "Parkplatz", "Парковка"),
      konum: L(
        "B Blok arka sağ çıkışından dışarıda.",
        "Exit Block B at the rear right door — parking is outside.",
        "Über die hintere rechte Tür von Block B nach draußen — Parkplatz dort.",
        "Через задний правый выход блока B — парковка снаружи.",
      ),
      desc: L(
        "Misafir araç parkı.",
        "Guest vehicle parking.",
        "Gästeparkplätze.",
        "Парковка для гостей.",
      ),
    },
    {
      tier: "standard",
      icon: "slide",
      title: L("Çocuk Oyun Alanı (Playground)", "Playground", "Kinderspielplatz", "Детская площадка"),
      konum: L(
        "Aquapark girişinden içeri girerken sol önde.",
        "From the aquapark entrance, forward and to your left.",
        "Vom Aquapark-Eingang aus geradeaus links.",
        "От входа в аквапарк — вперёд и слева.",
      ),
      desc: L(
        "Güvenli oyun ve tırmanış alanı.",
        "Outdoor play structures for children.",
        "Spielgeräte im Freien für Kinder.",
        "Игровое пространство на открытом воздухе.",
      ),
    },
    {
      tier: "standard",
      icon: "waves",
      title: L("Gösteri Alanı (Show Area)", "Show Area", "Showbereich", "Зона шоу"),
      konum: L(
        "Aquapark içinde, etkinlik platformu.",
        "Inside the aquapark — dedicated show space.",
        "Im Aquapark — eigener Showbereich.",
        "На территории аквапарка — площадка для шоу.",
      ),
      desc: L(
        "Akşam gösterileri ve animasyon.",
        "Evening shows and live entertainment.",
        "Abendshows und Live-Animation.",
        "Вечерние шоу и анимация.",
      ),
    },
    {
      tier: "standard",
      icon: "waves",
      title: L("Aquapark (Aquapark)", "Aquapark", "Aquapark", "Аквапарк"),
      konum: L(
        "C Blok girişinin önünde, sağ tarafta.",
        "Facing Block C’s entrance — turn right.",
        "Vor dem Eingang von Block C — rechts.",
        "Перед входом в блок C — справа.",
      ),
      desc: L(
        "Kaydıraklı aquapark deneyimi.",
        "Slides, splash zones and high-energy fun.",
        "Rutschen, Spritzzonen und Action.",
        "Горки, зоны брызг и активный отдых.",
      ),
    },
    {
      tier: "standard",
      icon: "pool",
      title: L("Çocuk Havuzu (Kiddie Pool)", "Kiddie Pool", "Kinderbecken", "Детский бассейн"),
      konum: L(
        "Aquapark, Relax ve Dolphin havuzlarına komşu.",
        "Beside the aquapark, Relax Pool and Dolphin Pool.",
        "Direkt neben Aquapark, Relax Pool und Dolphin Pool.",
        "Рядом с аквапарком, Relax Pool и Dolphin Pool.",
      ),
      desc: L(
        "Sığ, güvenli çocuk suyu.",
        "Shallow water designed for younger swimmers.",
        "Flaches Becken für kleine Schwimmer.",
        "Неглубокая зона для малышей.",
      ),
    },
    {
      tier: "standard",
      icon: "cup",
      title: L("Aqua Bar (Aqua Bar)", "Aqua Bar", "Aqua Bar", "Aqua Bar"),
      konum: L(
        "Aquapark giriş hattında.",
        "Right at the aquapark entry.",
        "Direkt am Eingang des Aquaparks.",
        "У входной зоны аквапарка.",
      ),
      desc: L(
        "Aquapark öncesi/sonrası içecek.",
        "Drinks before or after the slides.",
        "Getränke vor oder nach den Rutschen.",
        "Напитки до и после горок.",
      ),
    },
    {
      tier: "standard",
      icon: "tunnel",
      title: L("Alt Geçit (Underground)", "Underpass", "Unterführung", "Подземный переход"),
      konum: L(
        "Relax Pool, duşlar ve otel ile sahil şeridi arasında.",
        "Between Relax Pool, the outdoor showers, the hotel and the beach.",
        "Zwischen Relax Pool, Außenduschen, Hotel und Strand.",
        "Между Relax Pool, уличными душами, отелем и пляжем.",
      ),
      desc: L(
        "Sahile kapalı, düz geçiş.",
        "Covered, level walk straight to the sand.",
        "Überdachter, ebener Weg zum Strand.",
        "Крытый ровный проход к пляжу.",
      ),
    },
    {
      tier: "standard",
      icon: "umbrella",
      title: L("İmbiss Beach Restoran (Beach Imbiss)", "Beach Imbiss", "Beach Imbiss", "Beach Imbiss"),
      konum: L(
        "Alt geçitten plaja çıkınca sağda, kıyı şeridinde.",
        "After the underpass, on the sand — first stretch to your right.",
        "Nach der Unterführung am Strand — gleich rechts.",
        "После перехода на песок — справа вдоль берега.",
      ),
      desc: L(
        "Sahilde hızlı atıştırma.",
        "Quick beach bites and casual service.",
        "Schneller Imbiss direkt am Strand.",
        "Быстрые закуски на пляже.",
      ),
    },
    {
      tier: "standard",
      icon: "umbrella",
      title: L("Moss Bar (Moss Bar)", "Moss Bar", "Moss Bar", "Moss Bar"),
      konum: L(
        "Alt geçitten sahile çıkınca sağda, biraz ileride.",
        "Same beach side — continue right past the underpass.",
        "Ebenfalls rechts am Strand, etwas weiter nach vorn.",
        "Та же сторона пляжа — правее и чуть дальше от выхода.",
      ),
      desc: L(
        "Sahil bar ve hafif mutfak.",
        "Beachfront bar with light dining.",
        "Strandbar mit leichter Küche.",
        "Пляжный бар и лёгкая кухня.",
      ),
    },
  ];

  var KROKI_SRC = "assets/images/where/kroki-portrait.png?v=1";

  /** Sabit pin: Sinton hariç 29 nokta, kroki sol-üst köşeye göre yüzde. */
  var WHERE_KROKI_FIXED_POSITIONS = [
    { x: 40.2, y: 53.7 },
    { x: 72.9, y: 72.3 },
    { x: 48.3, y: 56.8 },
    { x: 48.8, y: 50.6 },
    { x: 47.7, y: 53.6 },
    { x: 54.4, y: 53.5 },
    { x: 49.8, y: 72 },
    { x: 59, y: 69.6 },
    { x: 61, y: 75.3 },
    { x: 93.8, y: 72 },
    { x: 74.6, y: 83.4 },
    { x: 94.2, y: 78.2 },
    { x: 91.9, y: 42 },
    { x: 92.5, y: 46.9 },
    { x: 93.1, y: 51.3 },
    { x: 94, y: 66 },
    { x: 66, y: 33.9 },
    { x: 66.7, y: 39.1 },
    { x: 66, y: 44.1 },
    { x: 28.1, y: 40.4 },
    { x: 91.5, y: 35.7 },
    { x: 53.8, y: 23.2 },
    { x: 69.4, y: 19 },
    { x: 80.4, y: 11.2 },
    { x: 87.7, y: 24.6 },
    { x: 46.3, y: 16.4 },
    { x: 77.9, y: 87.3 },
    { x: 54.2, y: 94.3 },
    { x: 34.4, y: 96.5 },
  ];

  var WHERE_KROKI_GROUP_A = [0, 2, 3, 4, 5];
  var WHERE_KROKI_GROUP_B = [1, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  var WHERE_KROKI_GROUP_C = [17, 18, 19];

  function placeKrokiPinEl(btn, xPct, yPct) {
    btn.style.left = xPct + "%";
    btn.style.top = yPct + "%";
  }

  function krokiPinAria(template, n) {
    return String(template).replace(/\{n\}/g, String(n));
  }

  function renderWhereModule(container, t) {
    if (!container || !WHERE_PLACES.length) return;

    var nPlaces = WHERE_PLACES.length;
    if (!WHERE_KROKI_FIXED_POSITIONS || WHERE_KROKI_FIXED_POSITIONS.length !== nPlaces) return;

    var positions = WHERE_KROKI_FIXED_POSITIONS.map(function (p) {
      return { x: p.x, y: p.y };
    });

    var selectedIndex = -1;

    /** Harita kutusunda scroll yok; seçili pin görünür alana taşınır (tarayıcı / modül dış kaydırma). */
    function scrollKrokiToPin(pinIx) {
      if (pinIx < 0 || pinIx >= pinButtons.length) return;
      var pin = pinButtons[pinIx];
      if (!pin) return;
      try {
        pin.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
      } catch (err) {
        pin.scrollIntoView(true);
      }
    }

    function scheduleScrollKrokiToSelectedPin() {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          if (selectedIndex >= 0) scrollKrokiToPin(selectedIndex);
        });
      });
    }

    function onKrokiImgLoad() {
      if (selectedIndex >= 0) scheduleScrollKrokiToSelectedPin();
    }

    var wrap = document.createElement("div");
    wrap.className = "where-module where-module--premium where-module--kroki-locked";
    wrap.setAttribute("role", "region");
    wrap.setAttribute("aria-labelledby", "where-module-heading");

    var pageTitle = document.createElement("h2");
    pageTitle.id = "where-module-heading";
    pageTitle.className = "where-premium-page-title";
    pageTitle.textContent = t("modWhere");

    var landscapeHero = document.createElement("div");
    landscapeHero.className = "where-kroki-premium-hero";
    landscapeHero.setAttribute("role", "status");
    var landscapeHeroP = document.createElement("p");
    landscapeHeroP.className = "where-kroki-premium-hero__text";
    landscapeHeroP.textContent = t("whereKrokiLandscapeLead");
    landscapeHero.appendChild(landscapeHeroP);

    var blockLegend = document.createElement("div");
    blockLegend.className = "where-kroki-block-legend";
    blockLegend.setAttribute("role", "note");
    var blockP = document.createElement("p");
    blockP.className = "where-kroki-block-legend__text";
    blockP.textContent = t("whereKrokiBlockLegend");
    blockLegend.appendChild(blockP);

    var orientHint = document.createElement("div");
    orientHint.className = "where-kroki-orient-hint";
    orientHint.setAttribute("role", "note");
    var o1 = document.createElement("p");
    o1.className = "where-kroki-orient-hint__line where-kroki-orient-hint__line--warn";
    o1.textContent = t("whereKrokiOrientP1");
    var o2 = document.createElement("p");
    o2.className = "where-kroki-orient-hint__line";
    o2.textContent = t("whereKrokiOrientP2");
    var o3 = document.createElement("p");
    o3.className = "where-kroki-orient-hint__line";
    o3.textContent = t("whereKrokiOrientP3");
    orientHint.appendChild(o1);
    orientHint.appendChild(o2);
    orientHint.appendChild(o3);

    var lead = document.createElement("p");
    lead.className = "where-premium-lead";
    lead.textContent = t("whereModuleIntro");

    var selectWrap = document.createElement("div");
    selectWrap.className = "where-kroki-select-wrap";
    var selectLabel = document.createElement("label");
    selectLabel.className = "where-kroki-select-label";
    selectLabel.setAttribute("for", "where-kroki-place-select");
    selectLabel.textContent = t("whereKrokiSelectLabel");
    var selectEl = document.createElement("select");
    selectEl.id = "where-kroki-place-select";
    selectEl.className = "where-kroki-select";
    selectEl.setAttribute("aria-label", t("whereKrokiSelectLabel"));

    var optEmpty = document.createElement("option");
    optEmpty.value = "";
    optEmpty.textContent = t("whereKrokiSelectPlaceholder");
    selectEl.appendChild(optEmpty);

    function appendOptgroup(labelKey, indices) {
      var og = document.createElement("optgroup");
      og.label = t(labelKey);
      for (var gi = 0; gi < indices.length; gi++) {
        var ix = indices[gi];
        var opt = document.createElement("option");
        opt.value = String(ix + 1);
        opt.textContent = T(WHERE_PLACES[ix].title);
        og.appendChild(opt);
      }
      selectEl.appendChild(og);
    }

    appendOptgroup("whereKrokiGroupA", WHERE_KROKI_GROUP_A);
    appendOptgroup("whereKrokiGroupB", WHERE_KROKI_GROUP_B);
    appendOptgroup("whereKrokiGroupC", WHERE_KROKI_GROUP_C);
    var otherIdx = [];
    for (var oi = 20; oi < nPlaces; oi++) otherIdx.push(oi);
    appendOptgroup("whereKrokiGroupOther", otherIdx);

    selectWrap.appendChild(selectLabel);
    selectWrap.appendChild(selectEl);

    var kroki = document.createElement("div");
    kroki.className = "where-kroki";

    var mapRegion = document.createElement("div");
    mapRegion.className = "where-kroki__map-region";
    mapRegion.setAttribute("role", "region");
    mapRegion.setAttribute("aria-label", t("whereMapViewLabel"));

    var stage = document.createElement("div");
    stage.className = "where-kroki__stage";

    var frame = document.createElement("div");
    frame.className = "where-kroki__frame";

    var imgEl = document.createElement("img");
    imgEl.className = "where-kroki__img";
    imgEl.src = KROKI_SRC;
    imgEl.alt = t("whereMapViewLabel");
    imgEl.loading = "eager";
    imgEl.decoding = "async";
    imgEl.draggable = false;
    if ("fetchPriority" in imgEl) imgEl.fetchPriority = "high";
    imgEl.addEventListener("load", onKrokiImgLoad);

    var pinsLayer = document.createElement("div");
    pinsLayer.className = "where-kroki__pins";

    var pinButtons = [];
    for (var pi = 0; pi < nPlaces; pi++) {
      var pBtn = document.createElement("button");
      pBtn.type = "button";
      pBtn.className = "where-kroki-pin";
      pBtn.textContent = String(pi + 1);
      pBtn.setAttribute("aria-label", krokiPinAria(t("whereKrokiPinAria"), pi + 1));
      placeKrokiPinEl(pBtn, positions[pi].x, positions[pi].y);
      pinsLayer.appendChild(pBtn);
      pinButtons.push(pBtn);
    }

    frame.appendChild(imgEl);
    frame.appendChild(pinsLayer);
    stage.appendChild(frame);
    mapRegion.appendChild(stage);

    var detail = document.createElement("div");
    detail.className = "where-kroki-detail where-kroki-detail--hidden";
    detail.setAttribute("role", "status");
    detail.setAttribute("aria-live", "polite");
    var detailTitle = document.createElement("h3");
    detailTitle.className = "where-kroki-detail__title";
    var detailLoc = document.createElement("p");
    detailLoc.className = "where-kroki-detail__loc";

    detail.appendChild(detailTitle);
    detail.appendChild(detailLoc);

    kroki.appendChild(detail);
    kroki.appendChild(mapRegion);

    function applySelection(ix) {
      selectedIndex = typeof ix === "number" && ix >= 0 && ix < nPlaces ? ix : -1;
      for (var si = 0; si < pinButtons.length; si++) {
        pinButtons[si].classList.toggle("where-kroki-pin--selected", si === selectedIndex);
        if (si === selectedIndex) {
          pinButtons[si].setAttribute("aria-current", "true");
        } else {
          pinButtons[si].removeAttribute("aria-current");
        }
      }
      if (selectedIndex < 0) {
        detail.classList.add("where-kroki-detail--hidden");
        detailTitle.textContent = "";
        detailLoc.textContent = "";
        return;
      }
      var pl = WHERE_PLACES[selectedIndex];
      detail.classList.remove("where-kroki-detail--hidden");
      detailTitle.textContent = T(pl.title);
      detailLoc.textContent = t("whereLocLabel") + ": " + T(pl.konum);
      scheduleScrollKrokiToSelectedPin();
    }

    selectEl.addEventListener("change", function () {
      var v = selectEl.value;
      if (!v) {
        applySelection(-1);
        return;
      }
      var n = parseInt(v, 10);
      if (isNaN(n) || n < 1 || n > nPlaces) {
        applySelection(-1);
        return;
      }
      applySelection(n - 1);
    });

    for (var pj = 0; pj < nPlaces; pj++) {
      (function (index) {
        pinButtons[index].addEventListener("click", function () {
          selectEl.value = String(index + 1);
          applySelection(index);
        });
      })(pj);
    }

    var controlsCol = document.createElement("div");
    controlsCol.className = "where-kroki-controls";
    var controlsScrollHint = document.createElement("p");
    controlsScrollHint.id = "where-kroki-scroll-hint";
    controlsScrollHint.className = "visually-hidden";
    controlsScrollHint.textContent = t("whereMapScrollLabel");
    controlsCol.setAttribute("aria-describedby", "where-kroki-scroll-hint");
    controlsCol.appendChild(controlsScrollHint);
    controlsCol.appendChild(blockLegend);
    controlsCol.appendChild(orientHint);
    controlsCol.appendChild(lead);
    controlsCol.appendChild(selectWrap);

    var layoutRow = document.createElement("div");
    layoutRow.className = "where-kroki-layout";
    layoutRow.appendChild(controlsCol);
    layoutRow.appendChild(kroki);

    wrap.appendChild(pageTitle);
    wrap.appendChild(landscapeHero);
    wrap.appendChild(layoutRow);
    container.appendChild(wrap);

    if (imgEl.complete && imgEl.naturalWidth > 0) {
      requestAnimationFrame(onKrokiImgLoad);
    }

    container._whereCleanup = function () {
      imgEl.removeEventListener("load", onKrokiImgLoad);
    };
  }

  window.renderWhereModule = renderWhereModule;
})();
