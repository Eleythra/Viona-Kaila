/**
 * Çevrede Keşfet — manuel POI verisi (Google Places API yok).
 * Otel ve tüm noktalar Google Haritalar paylaşım linklerinden alınan koordinatlarla eşleştirildi.
 *
 * Sözleşme:
 * - categoryOrder içindeki her id için i18n.js’te nearCat_<id> (tr/en/de/ru) tanımlı olmalı.
 * - place.category değerleri categoryOrder ile uyumlu olmalı.
 * - name / address / description: { tr, en, de, ru }
 */
(function () {
  "use strict";

  var HOTEL = {
    id: "kaila-beach-hotel",
    /** Google Haritalar: https://maps.app.goo.gl/WunSkVZEbTBuFAHP9 */
    lat: 36.5316753,
    lng: 32.041667,
    googleMapsShareUrl: "https://maps.app.goo.gl/WunSkVZEbTBuFAHP9",
    defaultZoom: 17,
    name: {
      tr: "Kaila Beach Otel",
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

  var PLACES = [
    {
      id: "market-a101-fatih",
      category: "market",
      isFeatured: true,
      mapsUrl: "https://maps.app.goo.gl/UBTWNnYctNpeAFk87",
      lat: 36.532001,
      lng: 32.043063,
      name: { tr: "A101", en: "A101", de: "A101", ru: "A101" },
      address: {
        tr: "Oba, Fatih Cd. No:1, 07000 Alanya/Antalya",
        en: "Oba, Fatih Cd. No:1, 07000 Alanya/Antalya, Türkiye",
        de: "Oba, Fatih Cd. Nr. 1, 07000 Alanya/Antalya, Türkei",
        ru: "Оба, ул. Фатих, д. 1, 07000 Аланья/Анталья",
      },
      description: {
        tr: "Market ve günlük alışveriş.",
        en: "Supermarket and daily shopping.",
        de: "Supermarkt für den täglichen Einkauf.",
        ru: "Супермаркет и повседневные покупки.",
      },
    },
    {
      id: "market-migros-oba-8",
      category: "market",
      isFeatured: false,
      mapsUrl: "https://maps.app.goo.gl/EzrNMhAiZWGfYnnm7",
      lat: 36.5299,
      lng: 32.0432,
      name: {
        tr: "Migros",
        en: "Migros",
        de: "Migros",
        ru: "Migros",
      },
      address: {
        tr: "Oba, 8. Sk. No:1A, 07400 Alanya/Antalya",
        en: "Oba, 8th St. No:1A, 07400 Alanya/Antalya, Türkiye",
        de: "Oba, 8. Str. Nr. 1A, 07400 Alanya/Antalya, Türkei",
        ru: "Оба, 8-я ул., д. 1A, 07400 Аланья/Анталья",
      },
      description: {
        tr: "Geniş ürün seçimi ile süpermarket.",
        en: "Supermarket with a wide product range.",
        de: "Supermarkt mit großer Auswahl.",
        ru: "Супермаркет с широким ассортиментом.",
      },
    },
    {
      id: "pharmacy-irem-gok",
      category: "pharmacy",
      isFeatured: true,
      mapsUrl: "https://maps.app.goo.gl/YgCpuX5c5b6NW96H8",
      lat: 36.5322908,
      lng: 32.0397899,
      name: {
        tr: "İREM GÖK ECZANESİ",
        en: "İrem Gök Pharmacy",
        de: "Apotheke İrem Gök",
        ru: "Аптека İrem Gök",
      },
      address: {
        tr: "Oba, Dadaşlar Cd. No:2/B, 07400 Alanya/Antalya",
        en: "Oba, Dadaşlar Cd. No:2/B, 07400 Alanya/Antalya, Türkiye",
        de: "Oba, Dadaşlar Cd. Nr. 2/B, 07400 Alanya/Antalya, Türkei",
        ru: "Оба, ул. Дадашлар, д. 2/B, 07400 Аланья/Анталья",
      },
      description: {
        tr: "Reçeteli ve reçetesiz ürünler; çalışma saatlerini yerinde teyit ediniz.",
        en: "Prescription and OTC products; confirm opening hours on site.",
        de: "Rezept- und frei verkäufliche Artikel; Öffnungszeiten vor Ort prüfen.",
        ru: "Рецептурные и безрецептурные товары; часы работы уточняйте на месте.",
      },
    },
    {
      id: "pharmacy-doga-tosmur",
      category: "pharmacy",
      isFeatured: false,
      mapsUrl: "https://maps.app.goo.gl/HvZmupQBvoVL9PAE6",
      lat: 36.5308898,
      lng: 32.0449286,
      name: {
        tr: "Doğa Eczanesi",
        en: "Doğa Pharmacy",
        de: "Apotheke Doğa",
        ru: "Аптека Doğa",
      },
      address: {
        tr: "Tosmur, 9. Sk. No:3/C, 07400 Alanya/Antalya",
        en: "Tosmur, 9th St. No:3/C, 07400 Alanya/Antalya, Türkiye",
        de: "Tosmur, 9. Str. Nr. 3/C, 07400 Alanya/Antalya, Türkei",
        ru: "Тосмур, 9-я ул., д. 3/C, 07400 Аланья/Анталья",
      },
      description: {
        tr: "Tosmur bölgesinde eczane hizmeti.",
        en: "Pharmacy in the Tosmur area.",
        de: "Apotheke im Viertel Tosmur.",
        ru: "Аптека в районе Тосмур.",
      },
    },
    {
      id: "atm-akbank-sultan",
      category: "atm",
      isFeatured: true,
      mapsUrl: "https://maps.app.goo.gl/3b5mbavDBztuRAcL8",
      lat: 36.532769,
      lng: 32.039919,
      name: {
        tr: "Akbank ATM",
        en: "Akbank ATM",
        de: "Akbank-Geldautomat",
        ru: "Банкомат Akbank",
      },
      address: {
        tr: "Oba, Sultan Alaaddin Caddesi, 07400 Alanya/Antalya",
        en: "Oba, Sultan Alaaddin Avenue, 07400 Alanya/Antalya, Türkiye",
        de: "Oba, Sultan-Alaaddin-Straße, 07400 Alanya/Antalya, Türkei",
        ru: "Оба, проспект Султана Алааддина, 07400 Аланья/Анталья",
      },
      description: {
        tr: "Nakit çekim; komisyonları bankanıza sorunuz.",
        en: "Cash withdrawal; check fees with your bank.",
        de: "Bargeld; Gebühren bei Ihrer Bank erfragen.",
        ru: "Снятие наличных; комиссию уточняйте в банке.",
      },
    },
    {
      id: "atm-yapi-kredi-dadaslar",
      category: "atm",
      isFeatured: false,
      mapsUrl: "https://maps.app.goo.gl/6LUqVwzFpcL8SfVn7",
      lat: 36.532756,
      lng: 32.039824,
      name: {
        tr: "Yapı Kredi Bankası ATM",
        en: "Yapı Kredi Bank ATM",
        de: "Yapı Kredi Bank-Geldautomat",
        ru: "Банкомат Yapı Kredi",
      },
      address: {
        tr: "Oba, Dadaşlar Cd., 07400 Alanya/Antalya",
        en: "Oba, Dadaşlar Cd., 07400 Alanya/Antalya, Türkiye",
        de: "Oba, Dadaşlar Cd., 07400 Alanya/Antalya, Türkei",
        ru: "Оба, ул. Дадашлар, 07400 Аланья/Анталья",
      },
      description: {
        tr: "Alternatif banka ATM noktası.",
        en: "Alternative bank ATM.",
        de: "Weiterer Geldautomat.",
        ru: "Дополнительный банкомат.",
      },
    },
    {
      id: "beach-kaila-plaj",
      category: "beach",
      isFeatured: true,
      mapsUrl: "https://maps.app.goo.gl/xPFH9LwA12UMHVrE8",
      lat: 36.5307338,
      lng: 32.0408392,
      name: {
        tr: "Kaila Plaj",
        en: "Kaila Beach",
        de: "Kaila Strand",
        ru: "Пляж Kaila",
      },
      address: {
        tr: "Oba mah., Ahmet Tokuş Blv., Oer-Erkenschwick Cd., 07400 Alanya/Antalya",
        en: "Oba, Ahmet Tokuş Blvd., Oer-Erkenschwick Cd., 07400 Alanya/Antalya, Türkiye",
        de: "Oba, Ahmet-Tokuş-Blvd., Oer-Erkenschwick-Str., 07400 Alanya/Antalya, Türkei",
        ru: "Оба, бульв. Ахмет Токуш, Oer-Erkenschwick Cd., 07400 Аланья/Анталья",
      },
      description: {
        tr: "Otel sahil alanı ve plaj keyfi; kullanım otel kurallarına tabidir.",
        en: "Hotel beach area; use subject to hotel rules.",
        de: "Hotelstrand; Nutzung gemäß Hausregeln.",
        ru: "Пляж отеля; правила — по регламенту отеля.",
      },
    },
    {
      id: "beach-moss-36",
      category: "beach",
      isFeatured: false,
      mapsUrl: "https://maps.app.goo.gl/rbeiyoHEBPV9yfnH7",
      lat: 36.5303266,
      lng: 32.0412181,
      name: {
        tr: "Moss Beach",
        en: "Moss Beach",
        de: "Moss Beach",
        ru: "Moss Beach",
      },
      address: {
        tr: "Oba, Ahmet Tokuş Blv. No:36, 07460 Alanya/Antalya",
        en: "Oba, Ahmet Tokuş Blvd. No:36, 07460 Alanya/Antalya, Türkiye",
        de: "Oba, Ahmet-Tokuş-Blvd. Nr. 36, 07460 Alanya/Antalya, Türkei",
        ru: "Оба, бульв. Ахмет Токуш, д. 36, 07460 Аланья/Анталья",
      },
      description: {
        tr: "Oba sahilinde plaj ve sosyal alan.",
        en: "Beach and social venue on the Oba coast.",
        de: "Strand und Lokal an der Küste in Oba.",
        ru: "Пляж и заведение на побережье Оба.",
      },
    },
    {
      id: "sight-kizilkule",
      category: "sight",
      isFeatured: true,
      mapsUrl: "https://maps.app.goo.gl/6hYhCAksXtHUU9Zh8",
      lat: 36.5364529,
      lng: 31.9982858,
      name: {
        tr: "Kızılkule",
        en: "Red Tower (Kızılkule)",
        de: "Roter Turm (Kızılkule)",
        ru: "Красная башня (Кызылкуле)",
      },
      address: {
        tr: "Çarşı, İskele Cd. No:102, 07400 Alanya/Antalya",
        en: "Çarşı, İskele Cd. No:102, 07400 Alanya/Antalya, Türkiye",
        de: "Çarşı, İskele Cd. Nr. 102, 07400 Alanya/Antalya, Türkei",
        ru: "Чарши, ул. Искеле, д. 102, 07400 Аланья/Анталья",
      },
      description: {
        tr: "Alanya’nın simgesi; giriş ve saatler için güncel bilgiyi kontrol edin.",
        en: "City landmark; check current tickets and hours.",
        de: "Wahrzeichen; Eintritt und Zeiten aktuell prüfen.",
        ru: "Символ города; билеты и часы уточняйте заранее.",
      },
    },
    {
      id: "sight-damlatas",
      category: "sight",
      isFeatured: false,
      mapsUrl: "https://maps.app.goo.gl/ApHkY9kfak7pZ21M7",
      lat: 36.5418062,
      lng: 31.9886644,
      name: {
        tr: "Damlataş Mağarası",
        en: "Damlataş Cave",
        de: "Damlataş-Höhle",
        ru: "Пещера Дамлаташ",
      },
      address: {
        tr: "Çarşı, Damlataş Cd. No:81, 07400 Alanya/Antalya",
        en: "Çarşı, Damlataş Cd. No:81, 07400 Alanya/Antalya, Türkiye",
        de: "Çarşı, Damlataş Cd. Nr. 81, 07400 Alanya/Antalya, Türkei",
        ru: "Чарши, ул. Дамлаташ, д. 81, 07400 Аланья/Анталья",
      },
      description: {
        tr: "Ünlü doğal mağara; bilet ve saatler için resmi kaynaklara bakınız.",
        en: "Famous cave; see official sources for tickets and hours.",
        de: "Bekannte Höhle; Tickets und Zeiten offiziell prüfen.",
        ru: "Известная пещера; билеты и время — по официальным данным.",
      },
    },
    {
      id: "food-sinton-bbq",
      category: "food",
      isFeatured: true,
      mapsUrl: "https://maps.app.goo.gl/frjxk2RWJuXTR73J7",
      lat: 36.531625,
      lng: 32.0417981,
      name: {
        tr: "SINTON BBQ",
        en: "SINTON BBQ",
        de: "SINTON BBQ",
        ru: "SINTON BBQ",
      },
      address: {
        tr: "Oba, 25151 Sk. No:4, 07400 Alanya/Antalya",
        en: "Oba, 25151 St. No:4, 07400 Alanya/Antalya, Türkiye",
        de: "Oba, 25151 Sk. Nr. 4, 07400 Alanya/Antalya, Türkei",
        ru: "Оба, ул. 25151, д. 4, 07400 Аланья/Анталья",
      },
      description: {
        tr: "BBQ ve ızgara seçenekleri; rezervasyon için işletmeyi arayabilirsiniz.",
        en: "BBQ and grill; call ahead for reservations if needed.",
        de: "Grill und BBQ; bei Bedarf reservieren.",
        ru: "Барбекю и гриль; при необходимости бронируйте заранее.",
      },
    },
    {
      id: "food-enberi-cafe",
      category: "food",
      isFeatured: false,
      mapsUrl: "https://maps.app.goo.gl/94WBHkKHNJt9NziW7",
      lat: 36.5310405,
      lng: 32.041334,
      name: {
        tr: "Enberi Cafe",
        en: "Enberi Cafe",
        de: "Enberi Cafe",
        ru: "Enberi Cafe",
      },
      address: {
        tr: "Göl Mah., Oba, Oer-Erkenschwick Cd. No:2, 07460 Alanya/Antalya",
        en: "Göl neighbourhood, Oba, Oer-Erkenschwick Cd. No:2, 07460 Alanya/Antalya, Türkiye",
        de: "Stadtteil Göl, Oba, Oer-Erkenschwick-Str. Nr. 2, 07460 Alanya/Antalya, Türkei",
        ru: "Мах. Гёль, Оба, Oer-Erkenschwick Cd., д. 2, 07460 Аланья/Анталья",
      },
      description: {
        tr: "Kahve ve hafif yemek; çalışma saatlerini yerinde teyit ediniz.",
        en: "Coffee and light meals; confirm hours on site.",
        de: "Kaffee und kleine Speisen; Zeiten vor Ort prüfen.",
        ru: "Кофе и лёгкие закуски; часы уточняйте на месте.",
      },
    },
  ];

  window.NEARBY_EXPLORE_DATA = {
    hotel: HOTEL,
    places: PLACES,
    categoryOrder: ["market", "pharmacy", "atm", "beach", "sight", "food"],
  };
})();
