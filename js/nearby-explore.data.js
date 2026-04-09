/**
 * Çevrede Keşfet — manuel POI verisi (Google Places yok).
 * Koordinatlar yaklaşık; ileride güncellenebilir.
 */
(function () {
  "use strict";

  var HOTEL = {
    id: "kaila-beach-hotel",
    lat: 36.54825,
    lng: 31.98685,
    defaultZoom: 16,
    name: {
      tr: "Kaila Beach Hotel",
      en: "Kaila Beach Hotel",
      de: "Kaila Beach Hotel",
      ru: "Kaila Beach Hotel",
    },
    address: {
      tr: "Oba, 25151 Sk. No:4, 07400 Alanya/Antalya",
      en: "Oba, 25151 St. No:4, 07400 Alanya/Antalya, Türkiye",
      de: "Oba, 25151 Sk. Nr. 4, 07400 Alanya/Antalya, Türkei",
      ru: "Оба, ул. 25151, д. 4, 07400 Аланья/Анталья",
    },
  };

  /**
   * category: market | pharmacy | atm | beach | sight | food
   */
  var PLACES = [
    {
      id: "mk-oba-market",
      category: "market",
      isFeatured: true,
      lat: 36.5491,
      lng: 31.9882,
      name: {
        tr: "Oba Halk Pazarı çevresi marketler",
        en: "Markets near Oba public market area",
        de: "Markt / Lebensmittel (Oba)",
        ru: "Магазины у рынка Оба",
      },
      address: {
        tr: "Oba, Alanya (otelden yürüyüş mesafesinde)",
        en: "Oba, Alanya (walking distance from the hotel)",
        de: "Oba, Alanya (Fußweg vom Hotel)",
        ru: "Оба, Аланья (пешком от отеля)",
      },
      description: {
        tr: "Günlük ihtiyaçlar için bakkal ve süpermarket seçenekleri.",
        en: "Convenience stores and supermarkets for daily needs.",
        de: "Supermärkte und Märkte für den täglichen Bedarf.",
        ru: "Продукты и товары первой необходимости.",
      },
    },
    {
      id: "mk-migros-jet",
      category: "market",
      isFeatured: false,
      lat: 36.5502,
      lng: 31.9844,
      name: {
        tr: "Bölge süpermarketi (örnek)",
        en: "Local supermarket (sample)",
        de: "Supermarkt in der Gegend (Beispiel)",
        ru: "Супермаркет в районе (пример)",
      },
      address: {
        tr: "Oba caddeleri, Alanya",
        en: "Oba streets, Alanya",
        de: "Oba, Alanya",
        ru: "Оба, Аланья",
      },
      description: {
        tr: "Atıştırmalık ve temel gıda alışverişi için uygun nokta.",
        en: "Handy for snacks and basic groceries.",
        de: "Praktisch für Snacks und Grundnahrungsmittel.",
        ru: "Удобно для перекуса и базовых покупок.",
      },
    },
    {
      id: "ph-oba-ecz",
      category: "pharmacy",
      isFeatured: true,
      lat: 36.5476,
      lng: 31.9855,
      name: {
        tr: "Oba bölgesi eczane (örnek)",
        en: "Pharmacy in Oba area (sample)",
        de: "Apotheke in Oba (Beispiel)",
        ru: "Аптека в районе Оба (пример)",
      },
      address: {
        tr: "Oba merkez çevresi, Alanya",
        en: "Near Oba centre, Alanya",
        de: "Nahe Oba-Zentrum, Alanya",
        ru: "Рядом с центром Оба",
      },
      description: {
        tr: "Reçeteli ve reçetesiz ürünler için; çalışma saatlerini yerinde teyit ediniz.",
        en: "OTC and prescription products; confirm opening hours on site.",
        de: "Frei verkäufliche und rezeptpflichtige Artikel; Öffnungszeiten vor Ort prüfen.",
        ru: "Безрецептурные и рецептурные товары; часы уточняйте на месте.",
      },
    },
    {
      id: "ph-alanya-ecz",
      category: "pharmacy",
      isFeatured: false,
      lat: 36.5438,
      lng: 31.9998,
      name: {
        tr: "Alanya merkez eczane seçenekleri",
        en: "Central Alanya pharmacy options",
        de: "Apotheken in Alanya Zentrum",
        ru: "Аптеки в центре Аланьи",
      },
      address: {
        tr: "Alanya şehir merkezi (~3 km)",
        en: "Alanya city centre (~3 km)",
        de: "Alanya Stadtzentrum (~3 km)",
        ru: "Центр Аланьи (~3 км)",
      },
      description: {
        tr: "Merkeze kısa taksi veya otobüs ile ulaşım.",
        en: "Reach by short taxi or bus to the centre.",
        de: "Mit Taxi oder Bus ins Zentrum.",
        ru: "До центра на такси или автобусе.",
      },
    },
    {
      id: "atm-oba-1",
      category: "atm",
      isFeatured: true,
      lat: 36.5489,
      lng: 31.9874,
      name: {
        tr: "Oba — banka ATM (örnek)",
        en: "ATM in Oba (sample)",
        de: "Geldautomat in Oba (Beispiel)",
        ru: "Банкомат в Оба (пример)",
      },
      address: {
        tr: "Ana cadde çevresi, Oba",
        en: "Near main street, Oba",
        de: "Nahe Hauptstraße, Oba",
        ru: "У главной улицы, Оба",
      },
      description: {
        tr: "Nakit çekim; komisyonları bankanıza sorunuz.",
        en: "Cash withdrawal; check fees with your bank.",
        de: "Bargeld; Gebühren bei Ihrer Bank erfragen.",
        ru: "Снятие наличных; комиссию уточняйте в банке.",
      },
    },
    {
      id: "atm-oba-2",
      category: "atm",
      isFeatured: false,
      lat: 36.5465,
      lng: 31.9839,
      name: {
        tr: "ATM — ikinci nokta (örnek)",
        en: "Second ATM point (sample)",
        de: "Zweiter Geldautomat (Beispiel)",
        ru: "Второй банкомат (пример)",
      },
      address: {
        tr: "Oba, Alanya",
        en: "Oba, Alanya",
        de: "Oba, Alanya",
        ru: "Оба, Аланья",
      },
      description: {
        tr: "Alternatif çekim noktası.",
        en: "Alternative cash point.",
        de: "Alternative Bargeldversorgung.",
        ru: "Альтернативная точка.",
      },
    },
    {
      id: "beach-kaila",
      category: "beach",
      isFeatured: true,
      lat: 36.5479,
      lng: 31.9851,
      name: {
        tr: "Kaila Beach Hotel özel plaj alanı",
        en: "Kaila Beach Hotel beach area",
        de: "Strandbereich Kaila Beach Hotel",
        ru: "Пляжная зона Kaila Beach Hotel",
      },
      address: {
        tr: "Tesis önü, denize sıfır",
        en: "In front of the resort, seafront",
        de: "Direkt vor der Anlage, am Meer",
        ru: "Перед отелем, первая линия",
      },
      description: {
        tr: "Otel misafirlerine ait plaj ve iskele kullanımı otel kurallarına tabidir.",
        en: "Beach and pier use for hotel guests per hotel rules.",
        de: "Strand-/Stegnutzung für Hotelgäste gemäß Hausregeln.",
        ru: "Пляж и пирс по правилам отеля для гостей.",
      },
    },
    {
      id: "beach-obagol",
      category: "beach",
      isFeatured: false,
      lat: 36.551,
      lng: 31.9825,
      name: {
        tr: "Obagöl halk plajı çevresi",
        en: "Obagöl public beach area",
        de: "Öffentlicher Strandbereich Obagöl",
        ru: "Городской пляж Обагёль",
      },
      address: {
        tr: "Obagöl, Alanya",
        en: "Obagöl, Alanya",
        de: "Obagöl, Alanya",
        ru: "Обагёль, Аланья",
      },
      description: {
        tr: "Yürüyüş ve deniz keyfi için sahil bandı.",
        en: "Coastal strip for walks and swimming.",
        de: "Uferpromenade zum Flanieren und Baden.",
        ru: "Набережная для прогулок и купания.",
      },
    },
    {
      id: "sight-damlatas",
      category: "sight",
      isFeatured: true,
      lat: 36.5439,
      lng: 32.0097,
      name: {
        tr: "Damlataş Mağarası",
        en: "Damlataş Cave",
        de: "Damlataş-Höhle",
        ru: "Пещера Дамлаташ",
      },
      address: {
        tr: "Alanya merkez",
        en: "Alanya centre",
        de: "Alanya Zentrum",
        ru: "Центр Аланьи",
      },
      description: {
        tr: "Ünlü doğal mağara; giriş ücreti ve saatler için resmi bilgiyi kontrol edin.",
        en: "Famous natural cave; check official site for tickets and hours.",
        de: "Bekannte Tropfsteinhöhle; Eintritt und Zeiten offiziell prüfen.",
        ru: "Известная пещера; билеты и часы — на официальных сайтах.",
      },
    },
    {
      id: "sight-kale",
      category: "sight",
      isFeatured: true,
      lat: 36.5327,
      lng: 32.0136,
      name: {
        tr: "Alanya Kalesi & Kızılkule",
        en: "Alanya Castle & Red Tower",
        de: "Festung Alanya & Roter Turm",
        ru: "Крепость Аланьи и Красная башня",
      },
      address: {
        tr: "Alanya merkez",
        en: "Alanya centre",
        de: "Alanya Zentrum",
        ru: "Центр Аланьи",
      },
      description: {
        tr: "Şehrin simgeleri; manzara ve tarih turu için ideal.",
        en: "City icons; great views and history.",
        de: "Wahrzeichen; Aussicht und Geschichte.",
        ru: "Символы города; виды и история.",
      },
    },
    {
      id: "food-oba-cafe",
      category: "food",
      isFeatured: true,
      lat: 36.5495,
      lng: 31.9865,
      name: {
        tr: "Oba — kafe & restoran seçenekleri",
        en: "Cafés & restaurants in Oba",
        de: "Cafés & Restaurants in Oba",
        ru: "Кафе и рестораны в Оба",
      },
      address: {
        tr: "Oba sahil ve cadde çevresi",
        en: "Oba seaside and streets",
        de: "Oba, Strand und Straßen",
        ru: "Оба, набережная и улицы",
      },
      description: {
        tr: "Yürüyüş mesafesinde kahve ve hafif yemek seçenekleri.",
        en: "Coffee and light meals within walking distance.",
        de: "Kaffee und kleine Mahlzeiten fußläufig.",
        ru: "Кофе и лёгкие закуски в пешей доступности.",
      },
    },
    {
      id: "food-alanya-harbor",
      category: "food",
      isFeatured: false,
      lat: 36.5355,
      lng: 32.0025,
      name: {
        tr: "Alanya liman & merkez yeme içme",
        en: "Alanya harbour & dining",
        de: "Hafen Alanya & Gastronomie",
        ru: "Гавань Аланьи и рестораны",
      },
      address: {
        tr: "Alanya merkez / liman",
        en: "Alanya centre / harbour",
        de: "Alanya Zentrum / Hafen",
        ru: "Центр / гавань Аланьи",
      },
      description: {
        tr: "Balık restoranları ve kafe yoğunluğu; taksi ile kolay erişim.",
        en: "Many fish restaurants and cafés; easy by taxi.",
        de: "Viele Fischrestaurants; gut per Taxi erreichbar.",
        ru: "Много рыбных ресторанов; удобно на такси.",
      },
    },
  ];

  window.NEARBY_EXPLORE_DATA = {
    hotel: HOTEL,
    places: PLACES,
    categoryOrder: ["market", "pharmacy", "atm", "beach", "sight", "food"],
  };
})();
