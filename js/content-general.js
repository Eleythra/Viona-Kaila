(function () {
  "use strict";
  var P = window.VionaContent.pick;

  var IC = {
    bld:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65"><path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-6h6v6"/></svg>',
    map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65"><path d="M12 21s7-4.5 7-11a7 7 0 10-14 0c0 6.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    grid:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    phone:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>',
    waves:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65"><path d="M2 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0 4 2 6 0"/><path d="M2 17c2-2 4-2 6 0s4 2 6 0 4-2 6 0 4 2 6 0"/></svg>',
    pool:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65"><path d="M2 15c2.5 2 5.5 2 8 0s5.5-2 8 0 5.5 2 8 0"/><path d="M2 19c2.5 2 5.5 2 8 0"/><ellipse cx="12" cy="7" rx="7" ry="3"/></svg>',
    spark:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>',
    clock:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    shield:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65"><path d="M12 3l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V7l8-4z"/></svg>',
    leaf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65"><path d="M12 22c-5-3-8-8-8-12A8 8 0 0119 4c0 4-3 9-7 12z"/><path d="M12 22V12"/></svg>',
    globe:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 000 18"/></svg>',
    wifi:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65"><path d="M5 12.55a11 11 0 0114.08 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><path d="M12 20h.01"/></svg>',
    bus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65"><path d="M8 6v12M16 6v12"/><rect x="4" y="4" width="16" height="12" rx="2"/><path d="M4 14h16"/></svg>',
    cam:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65"><path d="M14.5 4h-5L7 7H4a2 2 0 00-2 2v6a2 2 0 002 2h3l2.5 3h5L21 7l-6.5-3z"/><circle cx="12" cy="12" r="3"/></svg>',
    med:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v8M8 12h8"/></svg>',
    shop:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65"><path d="M6 9l2 12h8l2-12"/><path d="M9 9V7a3 3 0 016 0v2"/></svg>',
    baby:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0112 0v2"/><path d="M12 12v4"/></svg>',
    alert:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>',
    food:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65"><path d="M3 3v18M8 3v9a4 4 0 008 0V3"/><path d="M18 12V3"/></svg>',
    drink:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65"><path d="M8 2h8l-1 18H9L8 2z"/><path d="M7 8h10"/></svg>',
    cal:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>',
    box:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><path d="M3.27 6.96L12 12.01l8.73-5.05"/></svg>',
    users:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>',
    child:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65"><circle cx="12" cy="8" r="3"/><path d="M6 20v-1a6 6 0 0112 0v1"/><circle cx="18" cy="12" r="2"/></svg>',
    wallet:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M16 12h.01"/><path d="M3 10h18"/></svg>',
    list:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65"><path d="M8 6h13M8 12h13M8 18h13"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></svg>',
  };

  var SECTIONS = [
    {
      icon: IC.bld,
      defaultOpen: true,
      title: {
        tr: "Genel otel bilgileri",
        en: "General hotel information",
        de: "Allgemeine Hotelinformationen",
        ru: "Общая информация об отеле",
      },
      html: {
        tr:
          "<p>Kaila Beach Hotel, Antalya’nın Alanya bölgesinde, denize sıfır konumda yer alan modern ve konfor odaklı bir tatil otelidir. Misafirlerine hem dinlenme hem de eğlenceyi bir arada sunan tesis, aileler, çiftler ve bireysel tatilciler için uygun konsepti ile hizmet vermektedir. Her Şey Dahil konsepti ile gün boyu yeme-içme, aktivite ve dinlenme imkanlarını bir arada sunmaktadır.</p><p>Tesis, modern mimarisi, geniş sosyal alanları, havuzları, aquaparkı, spa merkezi ve çeşitli restoran/bar seçenekleri ile dikkat çekmektedir. Hem şehir merkezine yakınlığı hem de sahil erişimi sayesinde konforlu ve erişilebilir bir tatil deneyimi sunar.</p>",
        en:
          "<p>Kaila Beach Hotel is a modern comfort-focused resort in Alanya, Antalya, directly on the sea. It combines relaxation and entertainment for families, couples and individual travellers. All Inclusive brings dining, activities and leisure together throughout the day.</p><p>The resort features contemporary architecture, generous social areas, pools, aquapark, spa and several restaurant/bar options. Proximity to the town centre and direct beach access ensure a comfortable stay.</p>",
        de:
          "<p>Das Kaila Beach Hotel in Alanya, Antalya, liegt direkt am Meer und bietet modernen Komfort für Familien, Paare und Einzelreisende. All Inclusive vereint Verpflegung, Aktivitäten und Erholung über den Tag.</p><p>Moderne Architektur, großzügige Bereiche, Pools, Aquapark, Spa sowie Restaurants und Bars; zudem Nähe zum Zentrum und Strandzugang.</p>",
        ru:
          "<p>Kaila Beach Hotel в Аланье (Анталья) на первой линии моря — современный комфортный курорт для семей, пар и индивидуальных гостей. All Inclusive объединяет питание, активности и отдых.</p><p>Современная архитектура, зоны отдыха, бассейны, аквапарк, спа, рестораны и бары; близко к центру и к пляжу.</p>",
      },
    },
    {
      icon: IC.map,
      defaultOpen: true,
      title: { tr: "Konum bilgileri", en: "Location", de: "Lage", ru: "Расположение" },
      html: {
        tr:
          '<ul class="viona-list"><li>Şehir: Antalya</li><li>Bölge: Alanya</li><li>Konum: Obagöl Mevki</li><li>Alanya şehir merkezi: yaklaşık 3 km</li><li>Gazipaşa Havalimanı: yaklaşık 38 km</li><li>Antalya Havalimanı: yaklaşık 125 km</li></ul><p>Tesis, Alanya şehir merkezine yakın konumda olup ulaşım açısından avantajlı bir lokasyonda bulunmaktadır. Toplu taşıma ve taksi ile kolay erişim sağlanabilir.</p>',
        en:
          '<ul class="viona-list"><li>City: Antalya</li><li>Area: Alanya</li><li>Location: Obagöl</li><li>Alanya city centre: approx. 3 km</li><li>Gazipaşa Airport: approx. 38 km</li><li>Antalya Airport: approx. 125 km</li></ul><p>The hotel is close to Alanya centre with good transport links. Public transport and taxis are readily available.</p>',
        de:
          '<ul class="viona-list"><li>Stadt: Antalya</li><li>Region: Alanya</li><li>Lage: Obagöl</li><li>Zentrum Alanya: ca. 3 km</li><li>Flughafen Gazipaşa: ca. 38 km</li><li>Flughafen Antalya: ca. 125 km</li></ul><p>Gute Anbindung; öffentliche Verkehrsmittel und Taxis verfügbar.</p>',
        ru:
          '<ul class="viona-list"><li>Город: Анталья</li><li>Район: Аланья</li><li>Место: Обагёль</li><li>Центр Аланьи: около 3 км</li><li>Аэропорт Газипаша: около 38 км</li><li>Аэропорт Антальи: около 125 км</li></ul><p>Удобное расположение; общественный транспорт и такси.</p>',
      },
    },
    {
      icon: IC.grid,
      defaultOpen: true,
      title: {
        tr: "Tesis genel özellikleri",
        en: "Property overview",
        de: "Anlage im Überblick",
        ru: "Общие характеристики",
      },
      html: {
        tr:
          '<ul class="viona-list"><li>Toplam alan: 10.000 m²</li><li>Toplam bina sayısı: 3</li><li>Toplam oda sayısı: 363</li><li>Toplam yatak sayısı: 886</li><li>Konsept: Her Şey Dahil – 5 yıldızlı</li><li>Sezon: Yaz sezonu ağırlıklı hizmet</li><li>Misafir profili: Aileler, çiftler ve bireysel tatilciler</li></ul>',
        en:
          '<ul class="viona-list"><li>Total area: 10,000 m²</li><li>Buildings: 3</li><li>Rooms: 363</li><li>Beds: 886</li><li>Concept: All Inclusive – 5-star</li><li>Season: summer-focused operation</li><li>Guests: families, couples, individual travellers</li></ul>',
        de:
          '<ul class="viona-list"><li>Gesamtfläche: 10.000 m²</li><li>Gebäude: 3</li><li>Zimmer: 363</li><li>Betten: 886</li><li>Konzept: All Inclusive – 5 Sterne</li><li>Saison: schwerpunktmäßig Sommer</li><li>Gäste: Familien, Paare, Einzelreisende</li></ul>',
        ru:
          '<ul class="viona-list"><li>Площадь: 10 000 м²</li><li>Корпусов: 3</li><li>Номеров: 363</li><li>Мест: 886</li><li>Концепция: All Inclusive, 5*</li><li>Сезон: преимущественно лето</li><li>Гости: семьи, пары, индивидуальные</li></ul>',
      },
    },
    {
      icon: IC.phone,
      defaultOpen: false,
      title: {
        tr: "İletişim ve adres",
        en: "Contact & address",
        de: "Kontakt & Adresse",
        ru: "Контакты и адрес",
      },
      html: {
        tr:
          '<dl class="viona-kv"><dt>Telefon</dt><dd>+90 (242) 514 3090 · +90 (242) 514 1171</dd><dt>E-posta</dt><dd>kailabeach@kailahotels.com</dd><dt>Adres</dt><dd>Oba Mah. 25151 Sk. No:4, 07400 Alanya/Antalya</dd><dt>Web</dt><dd>www.kailahotels.com</dd></dl>',
        en:
          '<dl class="viona-kv"><dt>Phone</dt><dd>+90 (242) 514 3090 · +90 (242) 514 1171</dd><dt>Email</dt><dd>kailabeach@kailahotels.com</dd><dt>Address</dt><dd>Oba Mah. 25151 Sk. No:4, 07400 Alanya/Antalya</dd><dt>Web</dt><dd>www.kailahotels.com</dd></dl>',
        de:
          '<dl class="viona-kv"><dt>Telefon</dt><dd>+90 (242) 514 3090 · +90 (242) 514 1171</dd><dt>E-Mail</dt><dd>kailabeach@kailahotels.com</dd><dt>Adresse</dt><dd>Oba Mah. 25151 Sk. No:4, 07400 Alanya/Antalya</dd><dt>Web</dt><dd>www.kailahotels.com</dd></dl>',
        ru:
          '<dl class="viona-kv"><dt>Телефон</dt><dd>+90 (242) 514 3090 · +90 (242) 514 1171</dd><dt>Email</dt><dd>kailabeach@kailahotels.com</dd><dt>Адрес</dt><dd>Oba Mah. 25151 Sk. No:4, 07400 Alanya/Antalya</dd><dt>Сайт</dt><dd>www.kailahotels.com</dd></dl>',
      },
    },
    {
      icon: IC.waves,
      defaultOpen: false,
      title: { tr: "Plaj ve deniz", en: "Beach & sea", de: "Strand & Meer", ru: "Пляж и море" },
      html: {
        tr:
          '<ul class="viona-list"><li>Konum: Denize sıfır</li><li>Plaj türü: Kum ve çakıl karışık plaj</li><li>Şezlong: Ücretsiz</li><li>Şemsiye: Ücretsiz</li><li>Plaj havlusu: Ücretsiz</li></ul><p>Plaj alanında misafirlerin gün boyu faydalanabileceği içecek ve snack servis noktaları bulunmaktadır.</p>',
        en:
          '<ul class="viona-list"><li>Location: beachfront</li><li>Beach: sand and pebble mix</li><li>Sun loungers: free</li><li>Parasols: free</li><li>Beach towels: free</li></ul><p>Drink and snack service points are available on the beach during the day.</p>',
        de:
          '<ul class="viona-list"><li>Lage: direkt am Strand</li><li>Strand: Sand und Kies</li><li>Liegen: kostenlos</li><li>Sonnenschirme: kostenlos</li><li>Strandtücher: kostenlos</li></ul><p>Getränke- und Snack-Service am Strand.</p>',
        ru:
          '<ul class="viona-list"><li>Расположение: первая линия</li><li>Пляж: песок и галька</li><li>Шезлонги: бесплатно</li><li>Зонты: бесплатно</li><li>Полотенца: бесплатно</li></ul><p>Точки напитков и снеков на пляже в течение дня.</p>',
      },
    },
    {
      icon: IC.pool,
      defaultOpen: false,
      title: {
        tr: "Havuz ve aquapark",
        en: "Pools & aquapark",
        de: "Pools & Aquapark",
        ru: "Бассейны и аквапарк",
      },
      html: {
        tr:
          '<ul class="viona-list"><li>Açık yüzme havuzu: Mevcut</li><li>Kapalı havuz: Mevcut</li><li>Çocuk havuzu: Mevcut</li><li>Aquapark: Mevcut</li></ul><p>Havuz alanlarında şezlong ve şemsiye ücretsiz olarak sunulmaktadır. Aquapark kullanım saatleri operasyonel programa göre değişiklik gösterebilir.</p>',
        en:
          '<ul class="viona-list"><li>Outdoor pool: yes</li><li>Indoor pool: yes</li><li>Kids’ pool: yes</li><li>Aquapark: yes</li></ul><p>Loungers and parasols are free at the pool areas. Aquapark hours may vary according to operations.</p>',
        de:
          '<ul class="viona-list"><li>Außenpool: ja</li><li>Hallenbad: ja</li><li>Kinderbecken: ja</li><li>Aquapark: ja</li></ul><p>Liegen und Schirme kostenlos. Aquapark-Zeiten können betriebsbedingt variieren.</p>',
        ru:
          '<ul class="viona-list"><li>Открытый бассейн: да</li><li>Крытый бассейн: да</li><li>Детский бассейн: да</li><li>Аквапарк: да</li></ul><p>Шезлонги и зонты бесплатно. Часы аквапарка могут меняться.</p>',
      },
    },
    {
      icon: IC.spark,
      defaultOpen: false,
      title: {
        tr: "Genel hizmet ve olanaklar",
        en: "Services & facilities",
        de: "Service & Ausstattung",
        ru: "Услуги и удобства",
      },
      html: {
        tr:
          '<ul class="viona-list"><li>24 saat resepsiyon</li><li>Lobi alanı</li><li>Ücretsiz Wi-Fi (genel alanlar ve odalar)</li><li>Asansör</li></ul>',
        en:
          '<ul class="viona-list"><li>24-hour reception</li><li>Lobby</li><li>Free Wi-Fi (public areas and rooms)</li><li>Lifts</li></ul>',
        de:
          '<ul class="viona-list"><li>24h Rezeption</li><li>Lobby</li><li>Kostenloses WLAN (öffentliche Bereiche und Zimmer)</li><li>Aufzüge</li></ul>',
        ru:
          '<ul class="viona-list"><li>Круглосуточная стойка</li><li>Лобби</li><li>Бесплатный Wi‑Fi (общие зоны и номера)</li><li>Лифты</li></ul>',
      },
    },
    {
      icon: IC.clock,
      defaultOpen: false,
      title: {
        tr: "Teknik ve operasyonel bilgiler",
        en: "Technical & operations",
        de: "Technik & Ablauf",
        ru: "Техническая информация",
      },
      html: {
        tr:
          '<ul class="viona-list"><li>Check-in saati: 14:00</li><li>Check-out saati: 12:00</li><li>Resepsiyon telefon kodu: 9</li><li>Kredi kartları: Visa ve MasterCard</li><li>Elektrik: 220 Volt</li><li>Evcil hayvan: Kabul edilmez</li></ul><p>Otel yönetimi operasyon saatlerinde ve hizmet içeriklerinde değişiklik yapma hakkını saklı tutar.</p>',
        en:
          '<ul class="viona-list"><li>Check-in: 14:00</li><li>Check-out: 12:00</li><li>Reception dial: 9</li><li>Cards: Visa and MasterCard</li><li>Electricity: 220 V</li><li>Pets: not accepted</li></ul><p>The hotel may change operating hours and service content.</p>',
        de:
          '<ul class="viona-list"><li>Check-in: 14:00</li><li>Check-out: 12:00</li><li>Rezeption: 9</li><li>Karten: Visa und MasterCard</li><li>Strom: 220 V</li><li>Haustiere: nein</li></ul><p>Änderungen von Zeiten und Leistungen vorbehalten.</p>',
        ru:
          '<ul class="viona-list"><li>Заезд: 14:00</li><li>Выезд: 12:00</li><li>Ресепшен: 9</li><li>Карты: Visa и MasterCard</li><li>Сеть: 220 В</li><li>Животные: не принимаются</li></ul><p>Отель оставляет за собой право менять часы и услуги.</p>',
      },
    },
    {
      icon: IC.shield,
      defaultOpen: false,
      title: {
        tr: "Güvenlik ve politikalar",
        en: "Security & policies",
        de: "Sicherheit & Regeln",
        ru: "Безопасность и правила",
      },
      html: {
        tr:
          "<p>Misafir güvenliği ve konforu ön planda tutulmaktadır. Otel içerisinde genel güvenlik önlemleri uygulanmaktadır. Alkollü içecekler 18 yaş altı misafirlere servis edilmez.</p>",
        en:
          "<p>Guest safety and comfort are a priority. General security measures apply on the property. Alcoholic drinks are not served to guests under 18.</p>",
        de:
          "<p>Sicherheit und Komfort stehen im Vordergrund. Allgemeine Sicherheitsmaßnahmen. Kein Alkohol unter 18 Jahren.</p>",
        ru:
          "<p>Безопасность и комфорт гостей в приоритете. Общие меры безопасности. Алкоголь не подаётся лицам младше 18 лет.</p>",
      },
    },
    {
      icon: IC.leaf,
      defaultOpen: false,
      title: {
        tr: "Çevre ve sürdürülebilirlik",
        en: "Environment & sustainability",
        de: "Umwelt & Nachhaltigkeit",
        ru: "Экология и устойчивость",
      },
      html: {
        tr:
          "<p>Kaila Beach Hotel, çevreye duyarlı bir işletme anlayışı benimsemektedir. Güneş enerjisi sistemleri (GES), atık ayrıştırma ve geri dönüşüm uygulamaları, su tasarrufu politikaları, plastik kullanımının azaltılması ve doğal kaynakların korunması ile sürdürülebilir turizm ilkeleri doğrultusunda faaliyet gösterilmektedir.</p>",
        en:
          "<p>Kaila Beach Hotel is committed to environmental responsibility: solar (GES), waste separation and recycling, water saving, reducing plastic, protecting natural resources and sustainable tourism principles.</p>",
        de:
          "<p>Umweltbewusstsein: Photovoltaik, Mülltrennung und Recycling, Wassersparen, weniger Plastik, Schutz der Ressourcen und nachhaltiger Tourismus.</p>",
        ru:
          "<p>Экологическая ответственность: солнечная энергия, раздельный сбор и переработка, экономия воды, сокращение пластика, охрана природы и устойчивый туризм.</p>",
      },
    },
    {
      icon: IC.globe,
      defaultOpen: false,
      title: {
        tr: "Dil ve hizmet dilleri",
        en: "Languages",
        de: "Sprachen",
        ru: "Языки",
      },
      html: {
        tr: "<p>Konuşulan diller: Türkçe, İngilizce, Almanca ve Rusça.</p>",
        en: "<p>Languages spoken: Turkish, English, German and Russian.</p>",
        de: "<p>Gesprochene Sprachen: Türkisch, Englisch, Deutsch und Russisch.</p>",
        ru: "<p>Языки: турецкий, английский, немецкий и русский.</p>",
      },
    },
    {
      icon: IC.wifi,
      defaultOpen: false,
      title: { tr: "İnternet", en: "Internet", de: "Internet", ru: "Интернет" },
      html: {
        tr: "<p>Wi-Fi: Tüm alanlarda ücretsiz. Oda içi Wi-Fi: Mevcut.</p>",
        en: "<p>Wi-Fi: free in all areas. In-room Wi-Fi: available.</p>",
        de: "<p>WLAN: überall kostenlos. WLAN im Zimmer: verfügbar.</p>",
        ru: "<p>Wi‑Fi бесплатно во всех зонах. В номере: доступен.</p>",
      },
    },
    {
      icon: IC.bus,
      defaultOpen: false,
      title: {
        tr: "Ulaşım ve erişim",
        en: "Transport & access",
        de: "Anreise & Mobilität",
        ru: "Транспорт и доступ",
      },
      html: {
        tr:
          '<ul class="viona-list"><li>Toplu taşıma: Mevcut</li><li>Taksi: 24 saat erişilebilir</li><li>Araç kiralama: Ücretli hizmet</li><li>Antalya Havalimanı: yaklaşık 125 km</li><li>Gazipaşa Havalimanı: yaklaşık 38 km</li><li>Alanya şehir merkezi: yaklaşık 3 km</li></ul>',
        en:
          '<ul class="viona-list"><li>Public transport: available</li><li>Taxi: 24h</li><li>Car rental: paid</li><li>Antalya Airport: approx. 125 km</li><li>Gazipaşa Airport: approx. 38 km</li><li>Alanya centre: approx. 3 km</li></ul>',
        de:
          '<ul class="viona-list"><li>ÖPNV: vorhanden</li><li>Taxi: 24 h</li><li>Mietwagen: kostenpflichtig</li><li>Flughafen Antalya: ca. 125 km</li><li>Flughafen Gazipaşa: ca. 38 km</li><li>Zentrum Alanya: ca. 3 km</li></ul>',
        ru:
          '<ul class="viona-list"><li>Общественный транспорт: есть</li><li>Такси: 24 ч</li><li>Аренда авто: платно</li><li>Аэропорт Антальи: около 125 км</li><li>Аэропорт Газипаша: около 38 км</li><li>Центр Аланьи: около 3 км</li></ul>',
      },
    },
    {
      icon: IC.cam,
      defaultOpen: false,
      title: {
        tr: "Güvenlik detayları",
        en: "Security details",
        de: "Sicherheitsdetails",
        ru: "Охрана",
      },
      html: {
        tr:
          '<ul class="viona-list"><li>Güvenlik personeli: Mevcut</li><li>Oda kasası: Ücretli</li></ul>',
        en:
          '<ul class="viona-list"><li>Security staff: available</li><li>In-room safe: paid</li></ul>',
        de:
          '<ul class="viona-list"><li>Sicherheitspersonal: vorhanden</li><li>Tresor im Zimmer: kostenpflichtig</li></ul>',
        ru:
          '<ul class="viona-list"><li>Охрана: есть</li><li>Сейф в номере: платно</li></ul>',
      },
    },
    {
      icon: IC.med,
      defaultOpen: false,
      title: {
        tr: "Sağlık hizmetleri",
        en: "Health services",
        de: "Gesundheit",
        ru: "Медицина",
      },
      html: {
        tr:
          "<p>Doktor ve sağlık hizmetleri ücretlidir. İhtiyaç durumunda 24 saat hastane destekli sağlık hizmeti sağlanabilmektedir. Doktor: Ücretli / çağrılı. İlk yardım: Mevcut.</p>",
        en:
          "<p>Doctor and health services are charged. When needed, 24-hour hospital-backed support may be arranged. Doctor: paid / on call. First aid: available.</p>",
        de:
          "<p>Arzt und medizinische Leistungen kostenpflichtig. Bei Bedarf 24h kliniknahe Unterstützung. Arzt: kostenpflichtig / auf Abruf. Erste Hilfe: vorhanden.</p>",
        ru:
          "<p>Врач и медуслуги платные. При необходимости — поддержка 24 ч. Врач: платно / вызов. Первая помощь: есть.</p>",
      },
    },
    {
      icon: IC.shop,
      defaultOpen: false,
      title: {
        tr: "Alışveriş ve ticari alanlar",
        en: "Shopping",
        de: "Einkaufen",
        ru: "Магазины",
      },
      html: {
        tr: "<p>Market, deri mağazası, fotoğrafçı, kuaför.</p>",
        en: "<p>Market, leather shop, photographer, hairdresser.</p>",
        de: "<p>Markt, Lederwaren, Fotograf, Friseur.</p>",
        ru: "<p>Маркет, кожаные изделия, фотограф, парикмахерская.</p>",
      },
    },
    {
      icon: IC.baby,
      defaultOpen: false,
      title: {
        tr: "Çocuk / bebek",
        en: "Children & babies",
        de: "Kinder & Babys",
        ru: "Дети и малыши",
      },
      html: {
        tr:
          '<ul class="viona-list"><li>Bebek yatağı: Ücretsiz</li><li>Bebek bakıcısı: Ücretli</li><li>Mama sandalyesi: Mevcut</li></ul>',
        en:
          '<ul class="viona-list"><li>Baby cot: free</li><li>Babysitting: paid</li><li>High chair: available</li></ul>',
        de:
          '<ul class="viona-list"><li>Babybett: kostenlos</li><li>Babysitter: kostenpflichtig</li><li>Hochstuhl: vorhanden</li></ul>',
        ru:
          '<ul class="viona-list"><li>Кроватка: бесплатно</li><li>Няня: платно</li><li>Стульчик: есть</li></ul>',
      },
    },
    {
      icon: IC.alert,
      defaultOpen: false,
      title: {
        tr: "Genel operasyon uyarıları",
        en: "Operational notices",
        de: "Betriebshinweise",
        ru: "Эксплуатация",
      },
      html: {
        tr:
          "<p>Otel yönetimi, hizmet saatleri ve içeriklerinde düzenleme yapma hakkını saklı tutar. Bazı hizmetlerin sunumu kapasite ve operasyonel düzene göre düzenlenebilir.</p>",
        en:
          "<p>The hotel may adjust service hours and offerings. How some services are delivered can follow capacity and operational planning.</p>",
        de:
          "<p>Änderungen von Zeiten und Leistungen vorbehalten. Einige Angebote richten sich nach Kapazität und Betriebsablauf.</p>",
        ru:
          "<p>Отель может корректировать часы и услуги. Часть сервисов зависит от вместимости и организации работы.</p>",
      },
    },
    {
      icon: IC.food,
      defaultOpen: false,
      title: {
        tr: "Gıda ve alerjen uyarısı",
        en: "Food & allergen notice",
        de: "Lebensmittel & Allergene",
        ru: "Еда и аллергены",
      },
      html: {
        tr:
          "<p>Menülerde yer alan bazı yiyecekler, Türk Gıda Kodeksi kapsamında alerjen olarak kabul edilen hammaddeler içerebilir. Herhangi bir gıda alerjisi veya özel beslenme ihtiyacı bulunan misafirlerin misafir ilişkileri departmanı ile iletişime geçmeleri gerekmektedir.</p>",
        en:
          "<p>Some dishes may contain allergens under the Turkish Food Codex. Guests with allergies or special dietary needs should contact guest relations.</p>",
        de:
          "<p>Einige Speisen können Allergene enthalten (türkisches Lebensmittelrecht). Bei Allergien oder Diäten bitte Guest Relations kontaktieren.</p>",
        ru:
          "<p>Некоторые блюда могут содержать аллергены. При аллергии или диете обратитесь в guest relations.</p>",
      },
    },
    {
      icon: IC.drink,
      defaultOpen: false,
      title: {
        tr: "Konsept dışı ürün ve hizmetler",
        en: "Not included in the concept",
        de: "Nicht im Konzept enthalten",
        ru: "Не входит в концепцию",
      },
      html: {
        tr:
          "<p>Aşağıdaki ürün ve hizmetler her şey dahil konseptine dahil değildir ve ekstra ücrete tabidir:</p><ul class=\"viona-list\"><li>Taze sıkılmış meyve suları</li><li>İthal içecekler</li><li>Kokteyller</li><li>Enerji içecekleri</li></ul>",
        en:
          "<p>The following are not included in all-inclusive and are charged extra:</p><ul class=\"viona-list\"><li>Freshly squeezed juices</li><li>Imported drinks</li><li>Cocktails</li><li>Energy drinks</li></ul>",
        de:
          "<p>Folgendes ist nicht All-inclusive und kostenpflichtig:</p><ul class=\"viona-list\"><li>Frisch gepresste Säfte</li><li>Importgetränke</li><li>Cocktails</li><li>Energydrinks</li></ul>",
        ru:
          "<p>Не входит в всё включено, доплата:</p><ul class=\"viona-list\"><li>Свежевыжатые соки</li><li>Импортные напитки</li><li>Коктейли</li><li>Энергетики</li></ul>",
      },
    },
    {
      icon: IC.cal,
      defaultOpen: false,
      title: {
        tr: "Rezervasyon gerektiren hizmetler",
        en: "Services requiring reservation",
        de: "Reservierungspflichtig",
        ru: "По предварительной записи",
      },
      html: {
        tr:
          "<p>A la carte ücretlidir; kullanmadan önce rezervasyon yaptırılması gerekir. A la carte restoran hizmeti: 5 gece ve üzeri konaklamalarda 1 kez ücretsizdir ve rezervasyon gereklidir.</p>",
        en:
          "<p>À la carte is charged; reservation is required before use. À la carte restaurant: for stays of 5 nights or more, one visit is free and reservation is still required.</p>",
        de:
          "<p>À la carte kostenpflichtig; Reservierung erforderlich. Bei Aufenthalten ab 5 Nächten: einmal kostenfrei, dennoch Reservierung nötig.</p>",
        ru:
          "<p>À la carte платно; нужна запись. При проживании от 5 ночей — один раз бесплатно, запись обязательна.</p>",
      },
    },
    {
      icon: IC.box,
      defaultOpen: false,
      title: {
        tr: "Özel talep (lunch box)",
        en: "Special request (lunch box)",
        de: "Sonderwunsch (Lunchbox)",
        ru: "Ланч-бокс",
      },
      html: {
        tr:
          "<p>Lunch box hizmetinden yararlanmak isteyen misafirlerin, en geç saat 20:00’a kadar resepsiyonu bilgilendirmeleri gerekmektedir.</p>",
        en:
          "<p>Guests who wish to use the lunch box service must inform reception by 20:00 at the latest.</p>",
        de:
          "<p>Für Lunchbox bitte spätestens bis 20:00 Uhr an der Rezeption melden.</p>",
        ru:
          "<p>Ланч-бокс: сообщите на ресепшене до 20:00.</p>",
      },
    },
    {
      icon: IC.users,
      defaultOpen: false,
      title: {
        tr: "Yaş ve kullanım kısıtlamaları",
        en: "Age & usage rules",
        de: "Altersregeln",
        ru: "Возрастные ограничения",
      },
      html: {
        tr:
          "<p>Fitness Center: 16 yaş altı misafirlerin kullanımına izin verilmez. Alkollü içecekler: 18 yaş altı misafirlere servis edilmez.</p>",
        en:
          "<p>Fitness centre: not permitted for guests under 16. Alcoholic drinks: not served to guests under 18.</p>",
        de:
          "<p>Fitness: nicht unter 16 Jahren. Alkohol: nicht unter 18 Jahren.</p>",
        ru:
          "<p>Фитнес: не младше 16 лет. Алкоголь: не младше 18 лет.</p>",
      },
    },
    {
      icon: IC.child,
      defaultOpen: false,
      title: {
        tr: "Çocuk güvenliği uyarıları",
        en: "Child safety",
        de: "Kindersicherheit",
        ru: "Безопасность детей",
      },
      html: {
        tr:
          "<p>Misafirlerin çocuklarını oyun alanlarında ve su kaydıraklarında yalnız bırakmamaları gerekmektedir.</p>",
        en:
          "<p>Please do not leave children unattended in play areas or on water slides.</p>",
        de:
          "<p>Kinder auf Spielplätzen und Rutschen nicht unbeaufsichtigt lassen.</p>",
        ru:
          "<p>Не оставляйте детей без присмотра на площадках и горках.</p>",
      },
    },
    {
      icon: IC.wallet,
      defaultOpen: false,
      title: { tr: "Ekstra hizmetler", en: "Extra services", de: "Zusatzleistungen", ru: "Доп. услуги" },
      html: {
        tr:
          "<p>Aşağıdaki hizmetler ücretlidir: oda içi kasa (safe) kullanımı, çamaşırhane (yıkama, ütüleme, kuru temizleme), spa bakımları (masaj, cilt bakımı vb.).</p>",
        en:
          "<p>Charged services include: in-room safe, laundry (wash, iron, dry cleaning), spa treatments (massage, skincare, etc.).</p>",
        de:
          "<p>Kostenpflichtig: Zimmertresor, Wäscherei, Spa-Behandlungen.</p>",
        ru:
          "<p>Платно: сейф в номере, прачечная, спа-процедуры.</p>",
      },
    },
    {
      icon: IC.list,
      defaultOpen: false,
      title: {
        tr: "Genel hizmetler (özet)",
        en: "General services (summary)",
        de: "Leistungen (Überblick)",
        ru: "Услуги (кратко)",
      },
      html: {
        tr:
          '<ul class="viona-list"><li>Wi-Fi internet — genel alan ve odalar — 24 saat — ücretsiz</li><li>Kiralık kasa (oda içi safe) — 24 saat — ücretli</li><li>Oda servisi — mevcut ve ücretlidir</li></ul>',
        en:
          '<ul class="viona-list"><li>Wi-Fi — public areas and rooms — 24h — free</li><li>In-room safe — 24h — paid</li><li>Room service — available, charged</li></ul>',
        de:
          '<ul class="viona-list"><li>WLAN — überall — 24h — kostenlos</li><li>Tresor im Zimmer — 24h — kostenpflichtig</li><li>Zimmerservice — verfügbar, kostenpflichtig</li></ul>',
        ru:
          '<ul class="viona-list"><li>Wi‑Fi — везде — 24 ч — бесплатно</li><li>Сейф в номере — 24 ч — платно</li><li>Обслуживание номеров — платно</li></ul>',
      },
    },
  ];

  function renderGeneralModule(container) {
    var wrap = document.createElement("div");
    wrap.className = "viona-mod viona-mod--general";

    var lead = document.createElement("p");
    lead.className = "viona-mod-lead";
    lead.textContent = P({
      tr: "Bu bölümde otelle ilgili genel bilgiler konulara göre gruplandırılmıştır. Aşağıdaki başlıklara dokunarak açabilirsiniz.",
      en: "General hotel information grouped by topic — tap a heading to expand.",
      de: "Allgemeine Hotelinformationen nach Themen — zum Öffnen auf die Überschrift tippen.",
      ru: "Общая информация об отеле по темам — нажмите на заголовок, чтобы раскрыть.",
    });
    wrap.appendChild(lead);

    SECTIONS.forEach(function (sec) {
      var det = document.createElement("details");
      det.className = "viona-acc";
      if (sec.defaultOpen) det.open = true;
      var sum = document.createElement("summary");
      var ico = document.createElement("span");
      ico.className = "viona-acc__icon";
      ico.setAttribute("aria-hidden", "true");
      ico.innerHTML = sec.icon;
      var ttl = document.createElement("span");
      ttl.className = "viona-acc__title";
      ttl.textContent = P(sec.title);
      sum.appendChild(ico);
      sum.appendChild(ttl);
      var body = document.createElement("div");
      body.className = "viona-acc__body";
      body.innerHTML = P(sec.html);
      det.appendChild(sum);
      det.appendChild(body);
      wrap.appendChild(det);
    });

    container.appendChild(wrap);
  }

  window.renderGeneralModule = renderGeneralModule;
})();
