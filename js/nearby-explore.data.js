/**
 * Çevrede Keşfet — manuel POI verisi (Google Places API yok).
 * Otel ve tüm noktalar Google Haritalar paylaşım linklerinden alınan koordinatlarla eşleştirildi.
 *
 * Sözleşme:
 * - categoryOrder içindeki her id için i18n.js’te nearCat_<id> (tr/en/de/pl) tanımlı olmalı.
 * - place.category değerleri categoryOrder ile uyumlu olmalı.
 * - name / address / description: { tr, en, de, pl }
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
      pl: "Kaila Beach Hotel",
    },
    address: {
      tr: "Oba, 25151 Sk. No:4, 07400 Alanya/Antalya",
      en: "Oba, 25151 St. No:4, 07400 Alanya/Antalya, Türkiye",
      de: "Oba, 25151 Sk. Nr. 4, 07400 Alanya/Antalya, Türkei",
      pl: "Oba, 25151 St. No:4, 07400 Alanya/Antalya, Türkiye",
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
      name: { tr: "A101", en: "A101", de: "A101", pl: "A101" },
      address: {
        tr: "Oba, Fatih Cd. No:1, 07000 Alanya/Antalya",
        en: "Oba, Fatih Cd. No:1, 07000 Alanya/Antalya, Türkiye",
        de: "Oba, Fatih Cd. Nr. 1, 07000 Alanya/Antalya, Türkei",
        pl: "Oba, Fatih Cd. No:1, 07000 Alanya/Antalya, Türkiye",
      },
      description: {
        tr: "Market ve günlük alışveriş.",
        en: "Supermarket and daily shopping.",
        de: "Supermarkt für den täglichen Einkauf.",
        pl: "Supermarket and daily shopping.",
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
        pl: "Migros",
      },
      address: {
        tr: "Oba, 8. Sk. No:1A, 07400 Alanya/Antalya",
        en: "Oba, 8th St. No:1A, 07400 Alanya/Antalya, Türkiye",
        de: "Oba, 8. Str. Nr. 1A, 07400 Alanya/Antalya, Türkei",
        pl: "Oba, 8th St. No:1A, 07400 Alanya/Antalya, Türkiye",
      },
      description: {
        tr: "Geniş ürün seçimi ile süpermarket.",
        en: "Supermarket with a wide product range.",
        de: "Supermarkt mit großer Auswahl.",
        pl: "Supermarket with a wide product range.",
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
        pl: "İrem Gök Pharmacy",
      },
      address: {
        tr: "Oba, Dadaşlar Cd. No:2/B, 07400 Alanya/Antalya",
        en: "Oba, Dadaşlar Cd. No:2/B, 07400 Alanya/Antalya, Türkiye",
        de: "Oba, Dadaşlar Cd. Nr. 2/B, 07400 Alanya/Antalya, Türkei",
        pl: "Oba, Dadaşlar Cd. No:2/B, 07400 Alanya/Antalya, Türkiye",
      },
      description: {
        tr: "Reçeteli ve reçetesiz ürünler; çalışma saatlerini yerinde teyit ediniz.",
        en: "Prescription and OTC products; confirm opening hours on site.",
        de: "Rezept- und frei verkäufliche Artikel; Öffnungszeiten vor Ort prüfen.",
        pl: "Prescription and OTC products; confirm opening hours on site.",
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
        pl: "Doğa Pharmacy",
      },
      address: {
        tr: "Tosmur, 9. Sk. No:3/C, 07400 Alanya/Antalya",
        en: "Tosmur, 9th St. No:3/C, 07400 Alanya/Antalya, Türkiye",
        de: "Tosmur, 9. Str. Nr. 3/C, 07400 Alanya/Antalya, Türkei",
        pl: "Tosmur, 9th St. No:3/C, 07400 Alanya/Antalya, Türkiye",
      },
      description: {
        tr: "Tosmur bölgesinde eczane hizmeti.",
        en: "Pharmacy in the Tosmur area.",
        de: "Apotheke im Viertel Tosmur.",
        pl: "Pharmacy in the Tosmur area.",
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
        pl: "Akbank ATM",
      },
      address: {
        tr: "Oba, Sultan Alaaddin Caddesi, 07400 Alanya/Antalya",
        en: "Oba, Sultan Alaaddin Avenue, 07400 Alanya/Antalya, Türkiye",
        de: "Oba, Sultan-Alaaddin-Straße, 07400 Alanya/Antalya, Türkei",
        pl: "Oba, Sultan Alaaddin Avenue, 07400 Alanya/Antalya, Türkiye",
      },
      description: {
        tr: "Nakit çekim; komisyonları bankanıza sorunuz.",
        en: "Cash withdrawal; check fees with your bank.",
        de: "Bargeld; Gebühren bei Ihrer Bank erfragen.",
        pl: "Cash withdrawal; check fees with your bank.",
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
        pl: "Yapı Kredi Bank ATM",
      },
      address: {
        tr: "Oba, Dadaşlar Cd., 07400 Alanya/Antalya",
        en: "Oba, Dadaşlar Cd., 07400 Alanya/Antalya, Türkiye",
        de: "Oba, Dadaşlar Cd., 07400 Alanya/Antalya, Türkei",
        pl: "Oba, Dadaşlar Cd., 07400 Alanya/Antalya, Türkiye",
      },
      description: {
        tr: "Alternatif banka ATM noktası.",
        en: "Alternative bank ATM.",
        de: "Weiterer Geldautomat.",
        pl: "Alternative bank ATM.",
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
        pl: "Kaila Beach",
      },
      address: {
        tr: "Oba mah., Ahmet Tokuş Blv., Oer-Erkenschwick Cd., 07400 Alanya/Antalya",
        en: "Oba, Ahmet Tokuş Blvd., Oer-Erkenschwick Cd., 07400 Alanya/Antalya, Türkiye",
        de: "Oba, Ahmet-Tokuş-Blvd., Oer-Erkenschwick-Str., 07400 Alanya/Antalya, Türkei",
        pl: "Oba, Ahmet Tokuş Blvd., Oer-Erkenschwick Cd., 07400 Alanya/Antalya, Türkiye",
      },
      description: {
        tr: "Otel sahil alanı ve plaj keyfi; kullanım otel kurallarına tabidir.",
        en: "Hotel beach area; use subject to hotel rules.",
        de: "Hotelstrand; Nutzung gemäß Hausregeln.",
        pl: "Hotel beach area; use subject to hotel rules.",
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
        pl: "Moss Beach",
      },
      address: {
        tr: "Oba, Ahmet Tokuş Blv. No:36, 07460 Alanya/Antalya",
        en: "Oba, Ahmet Tokuş Blvd. No:36, 07460 Alanya/Antalya, Türkiye",
        de: "Oba, Ahmet-Tokuş-Blvd. Nr. 36, 07460 Alanya/Antalya, Türkei",
        pl: "Oba, Ahmet Tokuş Blvd. No:36, 07460 Alanya/Antalya, Türkiye",
      },
      description: {
        tr: "Oba sahilinde plaj ve sosyal alan.",
        en: "Beach and social venue on the Oba coast.",
        de: "Strand und Lokal an der Küste in Oba.",
        pl: "Beach and social venue on the Oba coast.",
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
        pl: "Red Tower (Kızılkule)",
      },
      address: {
        tr: "Çarşı, İskele Cd. No:102, 07400 Alanya/Antalya",
        en: "Çarşı, İskele Cd. No:102, 07400 Alanya/Antalya, Türkiye",
        de: "Çarşı, İskele Cd. Nr. 102, 07400 Alanya/Antalya, Türkei",
        pl: "Çarşı, İskele Cd. No:102, 07400 Alanya/Antalya, Türkiye",
      },
      description: {
        tr: "Alanya’nın simgesi; giriş ve saatler için güncel bilgiyi kontrol edin.",
        en: "City landmark; check current tickets and hours.",
        de: "Wahrzeichen; Eintritt und Zeiten aktuell prüfen.",
        pl: "City landmark; check current tickets and hours.",
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
        pl: "Damlataş Cave",
      },
      address: {
        tr: "Çarşı, Damlataş Cd. No:81, 07400 Alanya/Antalya",
        en: "Çarşı, Damlataş Cd. No:81, 07400 Alanya/Antalya, Türkiye",
        de: "Çarşı, Damlataş Cd. Nr. 81, 07400 Alanya/Antalya, Türkei",
        pl: "Çarşı, Damlataş Cd. No:81, 07400 Alanya/Antalya, Türkiye",
      },
      description: {
        tr: "Ünlü doğal mağara; bilet ve saatler için resmi kaynaklara bakınız.",
        en: "Famous cave; see official sources for tickets and hours.",
        de: "Bekannte Höhle; Tickets und Zeiten offiziell prüfen.",
        pl: "Famous cave; see official sources for tickets and hours.",
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
        pl: "SINTON BBQ",
      },
      address: {
        tr: "Oba, 25151 Sk. No:4, 07400 Alanya/Antalya",
        en: "Oba, 25151 St. No:4, 07400 Alanya/Antalya, Türkiye",
        de: "Oba, 25151 Sk. Nr. 4, 07400 Alanya/Antalya, Türkei",
        pl: "Oba, 25151 St. No:4, 07400 Alanya/Antalya, Türkiye",
      },
      description: {
        tr: "BBQ ve ızgara seçenekleri; rezervasyon için işletmeyi arayabilirsiniz.",
        en: "BBQ and grill; call ahead for reservations if needed.",
        de: "Grill und BBQ; bei Bedarf reservieren.",
        pl: "BBQ and grill; call ahead for reservations if needed.",
      },
    },
    {
      id: "food-moss-beach",
      category: "food",
      isFeatured: false,
      /** Moss plaj hattı — Yeme & İçme listesinde; aynı konum plaj bölümünde de geçer. */
      mapsUrl: "https://maps.app.goo.gl/rbeiyoHEBPV9yfnH7",
      lat: 36.5303266,
      lng: 32.0412181,
      name: {
        tr: "Moss Beach Restaurant & Bar",
        en: "Moss Beach Restaurant & Bar",
        de: "Moss Beach Restaurant & Bar",
        pl: "Moss Beach Restaurant & Bar",
      },
      address: {
        tr: "Oba, Ahmet Tokuş Blv. No:36, 07460 Alanya/Antalya",
        en: "Oba, Ahmet Tokuş Blvd. No:36, 07460 Alanya/Antalya, Türkiye",
        de: "Oba, Ahmet-Tokuş-Blvd. Nr. 36, 07460 Alanya/Antalya, Türkei",
        pl: "Oba, Ahmet Tokuş Blvd. No:36, 07460 Alanya/Antalya, Türkiye",
      },
      description: {
        tr: "Oba sahil şeridinde yeme-içme; hafif öğünler, içecekler ve plaj atmosferi. Çalışma saatlerini işletmeden veya resepsiyondan teyit ediniz.",
        en: "Food and drinks on the Oba beachfront—light meals, beverages and a seaside setting. Confirm hours with the venue or reception.",
        de: "Essen und Getränke am Strand von Oba—leichte Gerichte, Getränke und Meeresblick. Öffnungszeiten beim Lokal oder an der Rezeption erfragen.",
        pl: "Food and drinks on the Oba beachfront—light meals, beverages and a seaside setting. Confirm hours with the venue or reception.",
      },
    },
  ];

  window.NEARBY_EXPLORE_DATA = {
    hotel: HOTEL,
    places: PLACES,
    categoryOrder: ["market", "pharmacy", "atm", "beach", "sight", "food"],
  };
})();
