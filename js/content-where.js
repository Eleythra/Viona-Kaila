/**
 * Neredeyim — dik kroki + sabit numaralı işaretler; liste seçimi ve pin tıklaması ile kısa konum tarifi.
 * Düzen: styles.css — :has() yalnızca geniş modül (max-width) için; iç kaydırma yok, sayfa akışı. Üstte blok özeti + liste, altta kroki.
 */
(function () {
  "use strict";
  var P = window.VionaContent && window.VionaContent.pick;

  function T(row) {
    if (typeof row === "string") return row;
    if (typeof P === "function") return P(row || {});
    if (row && typeof row === "object") return row.tr || row.en || row.de || row.pl || "";
    return row || "";
  }

  function L(tr, en, de, pl) {
    return { tr: tr, en: en, de: de, pl: pl != null && String(pl).trim() !== "" ? pl : en };
  }

  /**
   * Kroki pin sırası (Sinton yok). tier alanı yalnızca veri mirası; arayüzde kullanılmıyor.
   */
  var WHERE_PLACES = [
    {
      tier: "hero",
      icon: "lobby",
      title: L("Lobi (Lobby)", "Lobby", "Lobby", "Hol"),
      konum: L(
        "A Blok giriş katında, ana kapı hizasında.",
        "Block A, ground floor — right at the main entrance.",
        "Block A, Erdgeschoss — direkt am Haupteingang.",
        "Blok A, parter — przy głównym wejściu.",
      ),
      desc: L(
        "Resepsiyon ve otel içi yönlendirmenin başladığı yer.",
        "Front desk and the natural starting point for directions around the resort.",
        "Rezeption und erste Anlaufstelle für alle Wege innerhalb der Anlage.",
        "Recepcja i naturalny punkt startowy orientacji po obiekcie.",
      ),
    },
    {
      tier: "hero",
      icon: "utensils",
      title: L("Ana Restoran (Main Restaurant)", "Main Restaurant", "Hauptrestaurant", "Restauracja główna"),
      konum: L(
        "B Blok’ta, havuza bakan teras katında.",
        "Pool-facing terrace level in Block B.",
        "Poolseitige Terrassenebene in Block B.",
        "Poziom tarasowy bloku B od strony basenu.",
      ),
      desc: L(
        "Günün ana öğünleri için açık büfe.",
        "Open-buffet dining for your main meals.",
        "Offenes Buffet für die Hauptmahlzeiten.",
        "Bufet szwedzki na główne posiłki.",
      ),
    },
    {
      tier: "standard",
      icon: "sofa",
      title: L("Lobi Alanı (Lobby Area)", "Lobby Area", "Lobbybereich", "Strefa lobby"),
      konum: L(
        "A Blok lobi içinde, oturma düzeninin olduğu bölümde.",
        "Within Block A’s lobby, where the lounge seating is.",
        "Im inneren Lobbybereich von Block A, bei den Sitzgruppen.",
        "W lobby bloku A, przy strefie wypoczynkowej.",
      ),
      desc: L(
        "Rahat oturma ve bekleme.",
        "Comfortable seating while you wait or meet.",
        "Gemütliche Sitzecken zum Warten und Verweilen.",
        "Wygodne miejsca do oczekiwania i spotkań.",
      ),
    },
    {
      tier: "standard",
      icon: "cup",
      title: L("Lobi Bar (Lobby Bar)", "Lobby Bar", "Lobby Bar", "Lobby Bar"),
      konum: L(
        "A Blok lobi alanı içinde.",
        "Inside Block A’s lobby lounge.",
        "Im Lobbybereich von Block A.",
        "W strefie lounge lobby bloku A.",
      ),
      desc: L(
        "İçecek ve hafif servis.",
        "Drinks and light service throughout the day.",
        "Getränke und leichte Snacks.",
        "Napoje i lekkie przekąski.",
      ),
    },
    {
      tier: "standard",
      icon: "bed",
      title: L("Odalar (3101–3612) (Rooms)", "Rooms (3101–3612)", "Zimmer (3101–3612)", "Pokoje (3101–3612)"),
      konum: L(
        "A Blok’un üst katlarında (3101–3612).",
        "Upper floors of Block A — rooms 3101–3612.",
        "Obergeschosse von Block A — Zimmer 3101–3612.",
        "Wyższe kondygnacje bloku A — pokoje 3101–3612.",
      ),
      desc: L(
        "A Blok konaklama katları.",
        "Guest room floors in Block A.",
        "Zimmeretagen in Block A.",
        "Kondygnacje hotelowe bloku A.",
      ),
    },
    {
      tier: "standard",
      icon: "users",
      title: L(
        "Astra Toplantı ve Etkinlik Salonu (Astra Meeting & Event Hall)",
        "Astra Meeting & Event Hall",
        "Astra Tagungs- & Veranstaltungssaal",
        "Sala Astra na spotkania i wydarzenia",
      ),
      konum: L(
        "A Blok, eksi birinci (-1) kat.",
        "Basement level −1, Block A.",
        "Untergeschoss −1 in Block A.",
        "Poziom −1, blok A.",
      ),
      desc: L(
        "Toplantı ve etkinlik salonu.",
        "Meetings, events and private functions.",
        "Tagungen, Events und private Anlässe.",
        "Spotkania, wydarzenia i bankiety.",
      ),
    },
    {
      tier: "standard",
      icon: "pool",
      title: L("Relax Havuzu (Relax Pool)", "Relax Pool", "Relax Pool", "Basen Relax"),
      konum: L(
        "A ve B blokların arasındaki açık alanda.",
        "Open-air pool deck between Blocks A and B.",
        "Freiluft-Pool zwischen Block A und B.",
        "Otwarta strefa basenowa między blokami A i B.",
      ),
      desc: L(
        "Ana dış havuzlardan biri.",
        "One of the resort’s main outdoor pools.",
        "Einer der Haupt-Außenpools der Anlage.",
        "Jeden z głównych basenów zewnętrznych obiektu.",
      ),
    },
    {
      tier: "standard",
      icon: "cup",
      title: L("Havuz Bar (Pool Bar)", "Pool Bar", "Pool Bar", "Bar przy basenie"),
      konum: L(
        "Relax Pool kenarında.",
        "Right by the Relax Pool.",
        "Direkt am Relax Pool.",
        "Przy basenie Relax Pool.",
      ),
      desc: L(
        "Havuz başı içecek servisi.",
        "Poolside drinks without leaving the water’s edge.",
        "Getränke direkt am Becken.",
        "Napoje przy samej krawędzi basenu.",
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
        "Strefa basenowa od strony bloku B.",
      ),
      desc: L(
        "Gün boyu atıştırmalık ve hafif yemek.",
        "Casual snacks and light bites through the day.",
        "Snacks und kleine Gerichte über den Tag.",
        "Lekkie przekąski przez cały dzień.",
      ),
    },
    {
      tier: "standard",
      icon: "shop",
      title: L("Mağazalar (Shops)", "Shops", "Geschäfte", "Sklepy"),
      konum: L(
        "B Blok’ta, blokları birbirine bağlayan koridorda.",
        "Along Block B’s internal connecting mall / corridor.",
        "Im verbindenden Gang von Block B.",
        "W łączącym korytarzu bloku B.",
      ),
      desc: L(
        "Hediyelik ve günlük ihtiyaçlar.",
        "Souvenirs, essentials and holiday shopping.",
        "Souvenirs, Kleinkram und Urlaubsbedarf.",
        "Pamiątki, drobiazgi i zakupy na co dzień.",
      ),
    },
    {
      tier: "standard",
      icon: "utensils",
      title: L("A’la Carte Restoran (A’la Carte Restaurant)", "À La Carte Restaurant", "À-la-carte-Restaurant", "Restauracja à la carte"),
      konum: L(
        "B Blok, birinci (1) kat.",
        "1st floor, Block B.",
        "1. Obergeschoss, Block B.",
        "1. piętro, blok B.",
      ),
      desc: L(
        "Menüden sipariş, akşam konsepti.",
        "Table-service dining from the menu.",
        "Bedienung am Tisch mit Speisekarte.",
        "Obsługa przy stoliku z menu.",
      ),
    },
    {
      tier: "standard",
      icon: "bed",
      title: L("Odalar (1001–1638) (Rooms)", "Rooms (1001–1638)", "Zimmer (1001–1638)", "Pokoje (1001–1638)"),
      konum: L(
        "B Blok’un üst katlarında (1001–1638).",
        "Upper floors of Block B — rooms 1001–1638.",
        "Obergeschosse von Block B — Zimmer 1001–1638.",
        "Wyższe kondygnacje bloku B — pokoje 1001–1638.",
      ),
      desc: L(
        "B Blok konaklama katları.",
        "Guest room floors in Block B.",
        "Zimmeretagen in Block B.",
        "Kondygnacje hotelowe bloku B.",
      ),
    },
    {
      tier: "standard",
      icon: "spa",
      title: L("Spa (Spa)", "Spa", "Spa", "Spa"),
      konum: L(
        "B Blok alt katında, wellness girişi üzerinden.",
        "Lower level of Block B — follow spa signage.",
        "Untergeschoss von Block B — der Spa-Beschilderung folgen.",
        "Niższa kondygnacja bloku B — według oznaczeń spa.",
      ),
      desc: L(
        "Spa, bakım ve rahatlama.",
        "Treatments, thermal experiences and quiet time.",
        "Anwendungen, Ruhezonen und Wellness.",
        "Zabiegi, relaks i wellness.",
      ),
    },
    {
      tier: "standard",
      icon: "droplet",
      title: L("Kapalı Havuz (Indoor Pool)", "Indoor Pool", "Hallenbad", "Basen kryty"),
      konum: L(
        "Spa kompleksi içinde.",
        "Within the spa complex.",
        "Im Spa-Komplex.",
        "W kompleksie spa.",
      ),
      desc: L(
        "Isıtmalı kapalı havuz.",
        "Heated indoor pool for year-round swims.",
        "Beheiztes Hallenbad.",
        "Podgrzewany basen kryty.",
      ),
    },
    {
      tier: "standard",
      icon: "dumbbell",
      title: L("Fitness Salonu (Fitness)", "Fitness", "Fitness", "Fitness"),
      konum: L(
        "B Blok alt katında, wellness girişi hizasında.",
        "Lower level of Block B — follow fitness / spa signage.",
        "Untergeschoss von Block B — Fitness-/Spa-Beschilderung folgen.",
        "Niższa kondygnacja bloku B — według oznaczeń fitness / spa.",
      ),
      desc: L(
        "B Blok alt katında kardiyo ve ağırlık alanı.",
        "Cardio and strength equipment on Block B’s lower level.",
        "Cardio und Krafttraining im Untergeschoss von Block B.",
        "Sprzęt cardio i siłowy na niższej kondygnacji bloku B.",
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
        "Parter bloku B.",
      ),
      desc: L(
        "Kahve, pasta ve tatlı molası.",
        "Coffee, cakes and sweet treats.",
        "Kaffee, Kuchen und Patisserie.",
        "Kawa, wypieki i desery.",
      ),
    },
    {
      tier: "standard",
      icon: "bed",
      title: L("Odalar (2101–2612) (Rooms)", "Rooms (2101–2612)", "Zimmer (2101–2612)", "Pokoje (2101–2612)"),
      konum: L(
        "C Blok’un üst katlarında (2101–2612).",
        "Upper floors of Block C — rooms 2101–2612.",
        "Obergeschosse von Block C — Zimmer 2101–2612.",
        "Wyższe kondygnacje bloku C — pokoje 2101–2612.",
      ),
      desc: L(
        "C Blok konaklama katları.",
        "Guest room floors in Block C.",
        "Zimmeretagen in Block C.",
        "Kondygnacje hotelowe bloku C.",
      ),
    },
    {
      tier: "standard",
      icon: "fish",
      title: L("Dolphin Restoran (Dolphin Restaurant)", "Dolphin Restaurant", "Dolphin Restaurant", "Restauracja Dolphin"),
      konum: L(
        "C Blok zemin katta, Dolphin havuz hattında.",
        "Ground floor, Block C — Dolphin pool frontage.",
        "Erdgeschoss Block C, entlang des Dolphin-Pools.",
        "Parter bloku C przy linii basenu Dolphin.",
      ),
      desc: L(
        "Havuz kenarı à la carte.",
        "À la carte dining beside the Dolphin pool.",
        "À la carte direkt am Dolphin-Pool.",
        "Restauracja à la carte przy basenie Dolphin.",
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
        "Parter bloku C, strefa basenu rodzinnego.",
      ),
      desc: L(
        "Bar ve Jammies çocuk kulübü.",
        "Pool bar plus Jammies Mini Club for little guests.",
        "Poolbar und Jammies Mini Club für Kinder.",
        "Bar oraz Jammies Mini Club dla najmłodszych.",
      ),
    },
    {
      tier: "standard",
      icon: "pool",
      title: L("Dolphin Havuz (Dolphin Pool)", "Dolphin Pool", "Dolphin Pool", "Basen Dolphin"),
      konum: L(
        "C Blok zemin katta, açık alanda.",
        "Outdoor pool deck, ground floor Block C.",
        "Freibadbereich, Erdgeschoss Block C.",
        "Basen zewnętrzny, parter bloku C.",
      ),
      desc: L(
        "Aile ve aktivite havuzu.",
        "Family-friendly activity pool.",
        "Familien- und Aktivitätsbecken.",
        "Rodzinny basen rekreacyjny.",
      ),
    },
    {
      tier: "standard",
      icon: "car",
      title: L("Otopark (Car Park)", "Car Park", "Parkplatz", "Parking"),
      konum: L(
        "B Blok arka sağ çıkışından dışarıda.",
        "Exit Block B at the rear right door — parking is outside.",
        "Über die hintere rechte Tür von Block B nach draußen — Parkplatz dort.",
        "Wyjście z bloku B tylnymi prawymi drzwiami — parking na zewnątrz.",
      ),
      desc: L(
        "Misafir araç parkı.",
        "Guest vehicle parking.",
        "Gästeparkplätze.",
        "Parking dla gości.",
      ),
    },
    {
      tier: "standard",
      icon: "slide",
      title: L("Çocuk Oyun Alanı (Playground)", "Playground", "Kinderspielplatz", "Plac zabaw"),
      konum: L(
        "Aquapark girişinden içeri girerken sol önde.",
        "From the aquapark entrance, forward and to your left.",
        "Vom Aquapark-Eingang aus geradeaus links.",
        "Od wejścia do aquaparku — prosto i w lewo.",
      ),
      desc: L(
        "Güvenli oyun ve tırmanış alanı.",
        "Outdoor play structures for children.",
        "Spielgeräte im Freien für Kinder.",
        "Plac zabaw na świeżym powietrzu.",
      ),
    },
    {
      tier: "standard",
      icon: "waves",
      title: L("Gösteri Alanı (Show Area)", "Show Area", "Showbereich", "Strefa pokazów"),
      konum: L(
        "Aquapark içinde, etkinlik platformu.",
        "Inside the aquapark — dedicated show space.",
        "Im Aquapark — eigener Showbereich.",
        "Na terenie aquaparku — dedykowana przestrzeń na pokazy.",
      ),
      desc: L(
        "Akşam gösterileri ve animasyon.",
        "Evening shows and live entertainment.",
        "Abendshows und Live-Animation.",
        "Wieczorne pokazy i animacja.",
      ),
    },
    {
      tier: "standard",
      icon: "waves",
      title: L("Aquapark (Aquapark)", "Aquapark", "Aquapark", "Aquapark"),
      konum: L(
        "C Blok girişinin önünde, sağ tarafta.",
        "Facing Block C’s entrance — turn right.",
        "Vor dem Eingang von Block C — rechts.",
        "Przed wejściem do bloku C — w prawo.",
      ),
      desc: L(
        "Kaydıraklı aquapark deneyimi.",
        "Slides, splash zones and high-energy fun.",
        "Rutschen, Spritzzonen und Action.",
        "Zjeżdżalnie, strefy plusku i aktywna zabawa.",
      ),
    },
    {
      tier: "standard",
      icon: "pool",
      title: L("Çocuk Havuzu (Kiddie Pool)", "Kiddie Pool", "Kinderbecken", "Brodzik dla dzieci"),
      konum: L(
        "Aquapark, Relax ve Dolphin havuzlarına komşu.",
        "Beside the aquapark, Relax Pool and Dolphin Pool.",
        "Direkt neben Aquapark, Relax Pool und Dolphin Pool.",
        "Obok aquaparku, basenu Relax i basenu Dolphin.",
      ),
      desc: L(
        "Sığ, güvenli çocuk suyu.",
        "Shallow water designed for younger swimmers.",
        "Flaches Becken für kleine Schwimmer.",
        "Płytka woda dla młodszych pływaków.",
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
        "Przy wejściu do aquaparku.",
      ),
      desc: L(
        "Aquapark öncesi/sonrası içecek.",
        "Drinks before or after the slides.",
        "Getränke vor oder nach den Rutschen.",
        "Napoje przed i po zjeżdżalniach.",
      ),
    },
    {
      tier: "standard",
      icon: "tunnel",
      title: L("Alt Geçit (Underground)", "Underpass", "Unterführung", "Przejście podziemne"),
      konum: L(
        "Relax Pool, duşlar ve otel ile sahil şeridi arasında.",
        "Between Relax Pool, the outdoor showers, the hotel and the beach.",
        "Zwischen Relax Pool, Außenduschen, Hotel und Strand.",
        "Między basenem Relax, prysznicami na zewnątrz, hotelem a plażą.",
      ),
      desc: L(
        "Sahile kapalı, düz geçiş.",
        "Covered, level walk straight to the sand.",
        "Überdachter, ebener Weg zum Strand.",
        "Zadaszone, poziome przejście na plażę.",
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
        "Za przejściem na plażę — w prawo wzdłuż brzegu.",
      ),
      desc: L(
        "Sahilde hızlı atıştırma.",
        "Quick beach bites and casual service.",
        "Schneller Imbiss direkt am Strand.",
        "Szybkie przekąski na plaży.",
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
        "Ta sama strona plaży — dalej w prawo od wyjścia.",
      ),
      desc: L(
        "Sahil bar ve hafif mutfak.",
        "Beachfront bar with light dining.",
        "Strandbar mit leichter Küche.",
        "Bar plażowy i lekka kuchnia.",
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

    var blockLegend = document.createElement("div");
    blockLegend.className = "where-kroki-block-legend where-kroki-block-legend--hub";
    blockLegend.setAttribute("role", "region");
    blockLegend.setAttribute("aria-labelledby", "where-kroki-block-hub-title");
    var blockTitle = document.createElement("h3");
    blockTitle.id = "where-kroki-block-hub-title";
    blockTitle.className = "where-kroki-block-legend__title";
    blockTitle.textContent = t("whereKrokiBlockHubTitle");
    var blockBody = document.createElement("div");
    blockBody.className = "where-kroki-block-legend__body";
    var guideKeys = ["whereKrokiBlockGuideP1", "whereKrokiBlockGuideP2", "whereKrokiBlockGuideP3"];
    for (var gi = 0; gi < guideKeys.length; gi++) {
      var gp = document.createElement("p");
      gp.className = "where-kroki-block-legend__para";
      gp.textContent = t(guideKeys[gi]);
      blockBody.appendChild(gp);
    }
    var matrixWrap = document.createElement("div");
    matrixWrap.className = "where-kroki-block-legend__matrix";
    matrixWrap.setAttribute("role", "group");
    var matrixCap = document.createElement("p");
    matrixCap.id = "where-kroki-legend-matrix-cap";
    matrixCap.className = "where-kroki-legend-matrix__caption";
    matrixCap.textContent = t("whereKrokiLegendMatrixCaption");
    matrixWrap.setAttribute("aria-labelledby", "where-kroki-legend-matrix-cap");
    var matrixGrid = document.createElement("div");
    matrixGrid.className = "where-kroki-legend-matrix__grid";
    var legendRows = [
      ["whereKrokiLegendRowALabel", "whereKrokiLegendRowAValues"],
      ["whereKrokiLegendRowBLabel", "whereKrokiLegendRowBValues"],
      ["whereKrokiLegendRowCLabel", "whereKrokiLegendRowCValues"],
      ["whereKrokiLegendRowSharedLabel", "whereKrokiLegendRowSharedValues"],
    ];
    for (var ri = 0; ri < legendRows.length; ri++) {
      var rowEl = document.createElement("div");
      rowEl.className = "where-kroki-legend-row";
      var rowLab = document.createElement("span");
      rowLab.className = "where-kroki-legend-row__label";
      rowLab.textContent = t(legendRows[ri][0]);
      var rowVal = document.createElement("span");
      rowVal.className = "where-kroki-legend-row__values";
      rowVal.textContent = t(legendRows[ri][1]);
      rowEl.appendChild(rowLab);
      rowEl.appendChild(rowVal);
      matrixGrid.appendChild(rowEl);
    }
    matrixWrap.appendChild(matrixCap);
    matrixWrap.appendChild(matrixGrid);
    blockLegend.appendChild(blockTitle);
    blockLegend.appendChild(blockBody);
    blockLegend.appendChild(matrixWrap);

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
    controlsCol.appendChild(selectWrap);

    var layoutRow = document.createElement("div");
    layoutRow.className = "where-kroki-layout";
    layoutRow.appendChild(controlsCol);
    layoutRow.appendChild(kroki);

    wrap.appendChild(pageTitle);
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
