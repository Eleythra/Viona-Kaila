/**
 * Neredeyim / Nasıl giderim — premium konum rehberi (liste + ikonlar, harita yok).
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

  var S = ' fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"';

  function whereIconSvg(kind) {
    var c = "<svg class=\"where-place-card__ico\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"" + S + ">";
    switch (kind) {
      case "lobby":
        c += "<path d=\"M4 20h16\"/><path d=\"M6 20V10l6-4 6 4v10\"/><path d=\"M9 20v-6h6v6\"/>";
        break;
      case "sofa":
        c += "<path d=\"M5 11V9a2 2 0 012-2h10a2 2 0 012 2v2\"/><path d=\"M3 14v3h2\"/><path d=\"M19 14v3h-2\"/><rect x=\"5\" y=\"11\" width=\"14\" height=\"5\" rx=\"1\"/>";
        break;
      case "cup":
        c += "<path d=\"M18 8h1a4 4 0 010 8h-1\"/><path d=\"M2 8h16v5a4 4 0 01-4 4H6a4 4 0 01-4-4V8z\"/><line x1=\"6\" y1=\"2\" x2=\"6\" y2=\"4\"/><line x1=\"10\" y1=\"2\" x2=\"10\" y2=\"4\"/><line x1=\"14\" y1=\"2\" x2=\"14\" y2=\"4\"/>";
        break;
      case "bed":
        c += "<path d=\"M3 10v9\"/><path d=\"M21 10v9\"/><path d=\"M3 14h18\"/><path d=\"M5 10V7a2 2 0 012-2h10a2 2 0 012 2v3\"/>";
        break;
      case "users":
        c += "<path d=\"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2\"/><circle cx=\"9\" cy=\"7\" r=\"4\"/><path d=\"M23 21v-2a4 4 0 00-3-3.87\"/><path d=\"M16 3.13a4 4 0 010 7.75\"/>";
        break;
      case "pool":
        c += "<path d=\"M2 12c2-1 4-1 6 0s4 1 6 0 4-1 6 0\"/><path d=\"M2 17c2-1 4-1 6 0s4 1 6 0 4-1 6 0\"/>";
        break;
      case "utensils":
        c += "<path d=\"M3 2v7c0 1.1.9 2 2 2h0a2 2 0 002-2V2\"/><path d=\"M7 2v20\"/><path d=\"M21 15V2v0a5 5 0 00-5 5v6\"/><path d=\"M21 15v7\"/>";
        break;
      case "shop":
        c += "<circle cx=\"9\" cy=\"21\" r=\"1\"/><circle cx=\"20\" cy=\"21\" r=\"1\"/><path d=\"M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6\"/>";
        break;
      case "spa":
        c += "<path d=\"M12 3c-1.5 3-6 4-6 9a6 6 0 1012 0c0-5-4.5-6-6-9z\"/><path d=\"M8 15h8\"/>";
        break;
      case "droplet":
        c += "<path d=\"M12 2.69l5.66 5.66a8 8 0 11-11.31 0z\"/>";
        break;
      case "dumbbell":
        c += "<path d=\"M6.5 6.5l11 11\"/><path d=\"M21 12l-2 2\"/><path d=\"M3 12l2 2\"/><path d=\"M18 7l3-3\"/><path d=\"M3 21l3-3\"/><path d=\"M14 3l3 3\"/><path d=\"M7 18l-3 3\"/>";
        break;
      case "cake":
        c += "<path d=\"M20 21V10a2 2 0 00-2-2H6a2 2 0 00-2 2v11\"/><path d=\"M4 16s1-1 4-1 4 2 6 2 4-1 4-1\"/><path d=\"M12 7V3\"/><path d=\"M8 3h8\"/>";
        break;
      case "fish":
        c += "<path d=\"M6.5 12c.94-2.46 3.28-4 6.5-4 3.5 0 6 2.5 6 4s-2.5 4-6 4c-3.22 0-5.56-1.54-6.5-4z\"/><path d=\"M6 12h.01\"/><path d=\"M9 9l-3 3 3 3\"/>";
        break;
      case "smile":
        c += "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M8 14s1.5 2 4 2 4-2 4-2\"/><line x1=\"9\" y1=\"9\" x2=\"9.01\" y2=\"9\"/><line x1=\"15\" y1=\"9\" x2=\"15.01\" y2=\"9\"/>";
        break;
      case "car":
        c += "<path d=\"M19 17h2l-1-5H5l-1 5h2\"/><circle cx=\"7.5\" cy=\"17.5\" r=\"2.5\"/><circle cx=\"16.5\" cy=\"17.5\" r=\"2.5\"/><path d=\"M5 12L7 5h10l2 7\"/>";
        break;
      case "slide":
        c += "<path d=\"M4 20h16\"/><path d=\"M6 20V8l6-4 6 4v12\"/><path d=\"M10 12l4 2\"/>";
        break;
      case "waves":
        c += "<path d=\"M2 12c2-1 4-1 6 0s4 1 6 0 4-1 6 0\"/><path d=\"M2 17c2-1 4-1 6 0s4 1 6 0 4-1 6 0\"/><path d=\"M2 7c2-1 4-1 6 0s4 1 6 0 4-1 6 0\"/>";
        break;
      case "tunnel":
        c += "<path d=\"M4 20h16\"/><path d=\"M6 20V10a6 6 0 0112 0v10\"/><path d=\"M9 14h6\"/>";
        break;
      case "umbrella":
        c += "<path d=\"M23 12a11 11 0 00-22 0z\"/><path d=\"M12 12v8a2 2 0 004 0\"/>";
        break;
      case "flame":
        c += "<path d=\"M12 2c2 3 7 5 7 11a7 7 0 11-14 0c0-3 2-6 4-7 0 2 1.5 3.5 3 4z\"/>";
        break;
      default:
        c += "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 16v-4\"/><path d=\"M12 8h.01\"/>";
    }
    return c + "</svg>";
  }

  /**
   * Sıra: sık sorulanlar üstte (lobi, ana restoran, Sinton), ardından kullanıcı listesi.
   * tier "hero" → büyük vurgulu kart.
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
      tier: "hero",
      icon: "flame",
      title: L("Sinton Restaurant", "Sinton Restaurant", "Sinton Restaurant", "Ресторан Sinton"),
      konum: L(
        "A Blok ana girişinden çıkınca sağda, biraz ileride.",
        "Step outside Block A’s main entrance, then ahead and to your right.",
        "Vor dem Haupteingang von Block A hinaus, dann geradeaus und rechts.",
        "Выйдя из главного входа блока A — чуть вперёд и справа.",
      ),
      desc: L(
        "Ana giriş hattında à la carte restoran.",
        "À la carte restaurant by the main arrival side.",
        "À-la-carte-Restaurant in der Nähe des Haupteingangs.",
        "Ресторан à la carte у зоны главного входа.",
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
        "A Blok, eksi birinci (-1) kat.",
        "Basement −1, Block A.",
        "Untergeschoss −1, Block A.",
        "Уровень −1, блок A.",
      ),
      desc: L(
        "Kardiyo ve ağırlık alanı.",
        "Cardio and strength equipment.",
        "Cardio- und Krafttraining.",
        "Кардио и силовые тренажёры.",
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

  function renderWhereModule(container, t) {
    if (!container || !WHERE_PLACES.length) return;

    var wrap = document.createElement("div");
    wrap.className = "where-module where-module--premium";
    wrap.setAttribute("role", "region");
    wrap.setAttribute("aria-labelledby", "where-module-heading");

    var pageTitle = document.createElement("h2");
    pageTitle.id = "where-module-heading";
    pageTitle.className = "where-premium-page-title";
    pageTitle.textContent = t("modWhere");

    var lead = document.createElement("p");
    lead.className = "where-premium-lead";
    lead.textContent = t("whereModuleIntro");

    var heroRow = document.createElement("div");
    heroRow.className = "where-premium-hero-row";
    heroRow.setAttribute("role", "presentation");

    var list = document.createElement("div");
    list.className = "where-premium-grid";
    list.setAttribute("role", "list");

    function buildCard(place) {
      var art = document.createElement("article");
      art.className =
        "where-place-card" + (place.tier === "hero" ? " where-place-card--hero" : " where-place-card--standard");
      art.setAttribute("role", "listitem");

      var iconWrap = document.createElement("div");
      iconWrap.className = "where-place-card__icon-wrap";
      iconWrap.innerHTML = whereIconSvg(place.icon);

      var body = document.createElement("div");
      body.className = "where-place-card__body";

      var h = document.createElement("h3");
      h.className = "where-place-card__title";
      h.textContent = T(place.title);

      var loc = document.createElement("div");
      loc.className = "where-place-card__block";
      var locLbl = document.createElement("span");
      locLbl.className = "where-place-card__label";
      locLbl.textContent = t("whereLocLabel");
      var locVal = document.createElement("p");
      locVal.className = "where-place-card__text";
      locVal.textContent = T(place.konum);
      loc.appendChild(locLbl);
      loc.appendChild(locVal);

      var dsc = document.createElement("div");
      dsc.className = "where-place-card__block where-place-card__block--desc";
      var dscLbl = document.createElement("span");
      dscLbl.className = "where-place-card__label";
      dscLbl.textContent = t("whereDescLabel");
      var dscVal = document.createElement("p");
      dscVal.className = "where-place-card__text";
      dscVal.textContent = T(place.desc);
      dsc.appendChild(dscLbl);
      dsc.appendChild(dscVal);

      body.appendChild(h);
      body.appendChild(loc);
      body.appendChild(dsc);
      art.appendChild(iconWrap);
      art.appendChild(body);
      return art;
    }

    for (var i = 0; i < WHERE_PLACES.length; i++) {
      var p = WHERE_PLACES[i];
      var card = buildCard(p);
      if (p.tier === "hero") {
        heroRow.appendChild(card);
      } else {
        list.appendChild(card);
      }
    }

    var subHead = document.createElement("h2");
    subHead.className = "where-premium-subhead";
    subHead.textContent = t("whereListSectionTitle");

    wrap.appendChild(pageTitle);
    wrap.appendChild(lead);
    wrap.appendChild(heroRow);
    wrap.appendChild(subHead);
    wrap.appendChild(list);
    container.appendChild(wrap);
    container._whereCleanup = function () {};
  }

  window.renderWhereModule = renderWhereModule;
})();
