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
        pl: "Ogólne informacje o hotelu",
      },
      html: {
        tr:
          "<p>Kaila Beach Hotel, Antalya’nın Alanya bölgesinde, denize sıfır konumda yer alan modern ve konfor odaklı bir tatil otelidir. Misafirlerine hem dinlenme hem de eğlenceyi bir arada sunan tesis, aileler, çiftler ve bireysel tatilciler için uygun konsepti ile hizmet vermektedir. Her Şey Dahil konsepti ile gün boyu yeme-içme, aktivite ve dinlenme imkanlarını bir arada sunmaktadır.</p><p>Havuz alanında üç açık yüzme havuzu ve spa bölümünde bir kapalı ısıtmalı havuz bulunmaktadır; aquaparkta kaydıraklar ve çocuklara uygun sığ su bölgeleri yer alır. Tesis, modern mimarisi, geniş sosyal alanları, aquaparkı, spa merkezi ve çeşitli restoran/bar seçenekleri ile dikkat çekmektedir. Hem şehir merkezine yakınlığı hem de sahil erişimi sayesinde konforlu ve erişilebilir bir tatil deneyimi sunar.</p>",
        en:
          "<p>Kaila Beach Hotel is a modern comfort-focused resort in Alanya, Antalya, directly on the sea. It combines relaxation and entertainment for families, couples and individual travellers. All Inclusive brings dining, activities and leisure together throughout the day.</p><p>The pool area offers three outdoor pools and one heated indoor pool in the spa; the aquapark includes slides and shallow zones for children. Contemporary architecture, generous social areas, aquapark, spa and several restaurant/bar options stand out. Proximity to the town centre and direct beach access ensure a comfortable stay.</p>",
        de:
          "<p>Das Kaila Beach Hotel in Alanya, Antalya, liegt direkt am Meer und bietet modernen Komfort für Familien, Paare und Einzelreisende. All Inclusive vereint Verpflegung, Aktivitäten und Erholung über den Tag.</p><p>Am Pool gibt es drei Außenbecken und im Spa ein beheiztes Hallenbad; im Aquapark Rutschen und flache Bereiche für Kinder. Moderne Architektur, großzügige Bereiche, Aquapark, Spa sowie Restaurants und Bars; zudem Nähe zum Zentrum und Strandzugang.</p>",
        pl: "<p>Kaila Beach Hotel to nowoczesny kurort w Alanii (Antalya), bezpośrednio nad morzem. Łączy relaks i rozrywkę dla rodzin, par i podróżujących indywidualnie. Formuła All Inclusive łączy wyżywienie, atrakcje i wypoczynek przez cały dzień.</p><p>W strefie basenów są trzy baseny zewnętrzne oraz jeden podgrzewany basen kryty w spa; w aquaparku zjeżdżalnie i płytkie strefy dla dzieci. Wyróżnia się współczesna architektura, przestronne strefy wypoczynku, aquapark, spa oraz kilka restauracji i barów. Bliskość centrum miasta i bezpośredni dostęp do plaży zapewniają komfortowy pobyt.</p>",
      },
    },
    {
      icon: IC.list,
      defaultOpen: true,
      title: {
        tr: "Genel operasyon",
        en: "General operations",
        de: "Allgemeiner Betrieb",
        pl: "Prowadzenie hotelu — informacje praktyczne",
      },
      html: {
        tr:
          '<p><strong>Erken check-in / geç check-out</strong></p><ul class="viona-list"><li>Check-in: 14:00</li><li>Check-out: 12:00</li><li>Erken giriş ve geç çıkış oda müsaitliği ve operasyonel duruma bağlıdır; ücret ve onay için resepsiyona danışınız.</li></ul>' +
          '<p><strong>Otopark</strong></p><ul class="viona-list"><li>Otopark mevcuttur.</li></ul>' +
          '<p><strong>Transfer</strong></p><ul class="viona-list"><li>Mevcut — ek ücretlidir.</li></ul>' +
          '<p><strong>Kayıp eşya (lost &amp; found)</strong></p><ul class="viona-list"><li>Değerli eşyalar en fazla 1 yıl, diğer eşyalar en fazla 6 ay saklanır.</li></ul>' +
          '<p><strong>Bileklik / kart sistemi</strong></p><ul class="viona-list"><li>Bileklik kullanımı: zorunludur.</li><li>Renk / segment (Her Şey Dahil): yetişkin — siyah; 18 yaş altı — beyaz.</li><li>Kayıp durumunda işlem: tanımlı yedekleme prosedürü bulunmamaktadır (resepsiyona bilgi veriniz).</li></ul>' +
          '<p><strong>Bagaj hizmeti</strong></p><ul class="viona-list"><li>Bellboy: mevcuttur.</li><li>Bagaj taşıma: check-in sırasında.</li></ul>' +
          '<p><strong>Kasa (oda içi)</strong></p><ul class="viona-list"><li>Kullanım: şifreli kasa.</li><li>Ücret: gün başına 2 €.</li></ul>' +
          '<p><strong>Havlu kartı / depozito</strong></p><ul class="viona-list"><li>Havlu kart sistemi: mevcuttur.</li><li>Depozito: alınmaz.</li><li>Kayıp halinde: 10 € ücret.</li></ul>' +
          '<p><strong>Telefon</strong></p><ul class="viona-list"><li>Oda içi telefon: dahili aramalar (otel içi).</li></ul>' +
          '<p><strong>TV / yayın</strong></p><ul class="viona-list"><li>Uluslararası kanallar mevcuttur; Almanya, İngiltere, İskandinav ülkeleri ve diğer bölgesel yayınlar izlenebilir.</li></ul>' +
          '<p><strong>Enerji / elektrik kesintisi</strong></p><ul class="viona-list"><li>Jeneratör kapasitesi: 1400 kW.</li><li>Olası kesintilerde jeneratör otomatik devreye girer.</li></ul>' +
          '<p><strong>Havuz ve plaj güvenliği</strong></p><ul class="viona-list"><li>Can kurtaran: havuzlarda ve denizde mevcuttur.</li></ul>',
        en:
          '<p><strong>Early check-in / late check-out</strong></p><ul class="viona-list"><li>Check-in: 14:00</li><li>Check-out: 12:00</li><li>Early check-in and late check-out depend on availability and operations; please ask reception about fees and approval.</li></ul>' +
          '<p><strong>Parking</strong></p><ul class="viona-list"><li>On-site parking is available.</li></ul>' +
          '<p><strong>Transfer</strong></p><ul class="viona-list"><li>Available — extra charge applies.</li></ul>' +
          '<p><strong>Lost &amp; found</strong></p><ul class="viona-list"><li>Valuables are kept for up to 1 year; other items for up to 6 months.</li></ul>' +
          '<p><strong>Wristband / card system</strong></p><ul class="viona-list"><li>Wearing a wristband is mandatory.</li><li>All Inclusive colour coding: adults — black; under 18 — white.</li><li>If lost: no standard replacement process (please inform reception).</li></ul>' +
          '<p><strong>Luggage</strong></p><ul class="viona-list"><li>Bellboy service: yes.</li><li>Luggage handling: at check-in.</li></ul>' +
          '<p><strong>In-room safe</strong></p><ul class="viona-list"><li>Type: code lock.</li><li>Fee: €2 per day.</li></ul>' +
          '<p><strong>Towel card / deposit</strong></p><ul class="viona-list"><li>Towel card system: yes.</li><li>Deposit: none.</li><li>If lost: €10 charge.</li></ul>' +
          '<p><strong>Phone</strong></p><ul class="viona-list"><li>In-room phone: internal (in-hotel) calls.</li></ul>' +
          '<p><strong>TV</strong></p><ul class="viona-list"><li>International channels available, including Germany, UK, Scandinavia and other regional stations.</li></ul>' +
          '<p><strong>Power backup</strong></p><ul class="viona-list"><li>Generator capacity: 1400 kW.</li><li>In case of outage, the generator starts automatically.</li></ul>' +
          '<p><strong>Pool &amp; beach safety</strong></p><ul class="viona-list"><li>Lifeguards are present at the pools and on the sea.</li></ul>',
        de:
          '<p><strong>Früher Check-in / später Check-out</strong></p><ul class="viona-list"><li>Check-in: 14:00</li><li>Check-out: 12:00</li><li>Früher Check-in und später Check-out abhängig von Verfügbarkeit und Betrieb; bitte an der Rezeption nach Gebühren und Freigabe fragen.</li></ul>' +
          '<p><strong>Parken</strong></p><ul class="viona-list"><li>Parkplätze vorhanden.</li></ul>' +
          '<p><strong>Transfer</strong></p><ul class="viona-list"><li>Verfügbar — gegen Aufpreis.</li></ul>' +
          '<p><strong>Fundsachen (Lost &amp; Found)</strong></p><ul class="viona-list"><li>Wertgegenstände bis zu 1 Jahr, übrige Gegenstände bis zu 6 Monate.</li></ul>' +
          '<p><strong>Armband / Kartensystem</strong></p><ul class="viona-list"><li>Armbandpflicht: ja.</li><li>All-inclusive-Kennzeichnung: Erwachsene — schwarz; unter 18 — weiß.</li><li>Bei Verlust: kein festes Ersatzverfahren (bitte Rezeption informieren).</li></ul>' +
          '<p><strong>Gepäck</strong></p><ul class="viona-list"><li>Porter/Bellboy: ja.</li><li>Gepäckservice: bei Check-in.</li></ul>' +
          '<p><strong>Safe (Zimmer)</strong></p><ul class="viona-list"><li>Art: Zahlenschloss.</li><li>Gebühr: 2 € pro Tag.</li></ul>' +
          '<p><strong>Handtuchkarte / Kaution</strong></p><ul class="viona-list"><li>Handtuchkartensystem: ja.</li><li>Kaution: nein.</li><li>Bei Verlust: 10 €.</li></ul>' +
          '<p><strong>Telefon</strong></p><ul class="viona-list"><li>Zimmertelefon: interne (hotelinterne) Gespräche.</li></ul>' +
          '<p><strong>TV</strong></p><ul class="viona-list"><li>Internationale Sender u. a. aus Deutschland, UK, Skandinavien und weiteren Regionen.</li></ul>' +
          '<p><strong>Strom / Notstrom</strong></p><ul class="viona-list"><li>Generatorleistung: 1400 kW.</li><li>Bei Ausfall schaltet der Generator automatisch ein.</li></ul>' +
          '<p><strong>Sicherheit Pool &amp; Strand</strong></p><ul class="viona-list"><li>Rettungsschwimmer an Pools und am Meer vorhanden.</li></ul>',
        pl:
          '<p><strong>Wcześniejsze zameldowanie / późniejsze wymeldowanie</strong></p><ul class="viona-list"><li>Zameldowanie: 14:00</li><li>Wymeldowanie: 12:00</li><li>Wcześniejsze zameldowanie i późniejsze wymeldowanie zależą od dostępności i operacji hotelu; opłaty i zgodę uzyskaj w recepcji.</li></ul>' +
          '<p><strong>Parking</strong></p><ul class="viona-list"><li>Parking na terenie hotelu jest dostępny.</li></ul>' +
          '<p><strong>Transfer</strong></p><ul class="viona-list"><li>Dostępny — za dodatkową opłatą.</li></ul>' +
          '<p><strong>Rzeczy znalezione (lost &amp; found)</strong></p><ul class="viona-list"><li>Przedmioty wartościowe przechowujemy do 1 roku, pozostałe do 6 miesięcy.</li></ul>' +
          '<p><strong>Opaska / karta</strong></p><ul class="viona-list"><li>Noszenie opaski jest obowiązkowe.</li><li>All Inclusive: dorośli — czarna; poniżej 18 lat — biała.</li><li>W razie zgubienia: brak stałej procedury wymiany (zgłoś recepcji).</li></ul>' +
          '<p><strong>Bagaż</strong></p><ul class="viona-list"><li>Obsługa bagażowa: tak.</li><li>Transport bagażu: przy zameldowaniu.</li></ul>' +
          '<p><strong>Sejf w pokoju</strong></p><ul class="viona-list"><li>Typ: zamek kodowy.</li><li>Opłata: 2 € za dobę.</li></ul>' +
          '<p><strong>Karta ręczników / kaucja</strong></p><ul class="viona-list"><li>System kart na ręczniki: tak.</li><li>Kaucja: nie pobieramy.</li><li>W razie zgubienia karty: opłata 10 €.</li></ul>' +
          '<p><strong>Telefon</strong></p><ul class="viona-list"><li>Telefon w pokoju: połączenia wewnętrzne w hotelu.</li></ul>' +
          '<p><strong>Telewizja</strong></p><ul class="viona-list"><li>Kanały międzynarodowe, m.in. z Niemiec, Wielkiej Brytanii, krajów skandynawskich i innych regionów.</li></ul>' +
          '<p><strong>Energia / awaria prądu</strong></p><ul class="viona-list"><li>Moc agregatu: 1400 kW.</li><li>Przy wyłączeniu zasilania agregat włącza się automatycznie.</li></ul>' +
          '<p><strong>Bezpieczeństwo przy basenach i na plaży</strong></p><ul class="viona-list"><li>Ratownicy przy basenach i nad morzem.</li></ul>',
      },
    },
    {
      icon: IC.map,
      defaultOpen: true,
      title: { tr: "Konum bilgileri", en: "Location", de: "Lage", pl: "Lokalizacja" },
      html: {
        tr:
          '<ul class="viona-list"><li>Şehir: Antalya</li><li>Bölge: Alanya</li><li>Konum: Obagöl Mevki</li><li>Alanya şehir merkezi: yaklaşık 3 km</li><li>Gazipaşa Havalimanı: yaklaşık 38 km</li><li>Antalya Havalimanı: yaklaşık 125 km</li></ul><p>Tesis, Alanya şehir merkezine yakın konumda olup ulaşım açısından avantajlı bir lokasyonda bulunmaktadır. Toplu taşıma ve taksi ile kolay erişim sağlanabilir.</p>',
        en:
          '<ul class="viona-list"><li>City: Antalya</li><li>Area: Alanya</li><li>Location: Obagöl</li><li>Alanya city centre: approx. 3 km</li><li>Gazipaşa Airport: approx. 38 km</li><li>Antalya Airport: approx. 125 km</li></ul><p>The hotel is close to Alanya centre with good transport links. Public transport and taxis are readily available.</p>',
        de:
          '<ul class="viona-list"><li>Stadt: Antalya</li><li>Region: Alanya</li><li>Lage: Obagöl</li><li>Zentrum Alanya: ca. 3 km</li><li>Flughafen Gazipaşa: ca. 38 km</li><li>Flughafen Antalya: ca. 125 km</li></ul><p>Gute Anbindung; öffentliche Verkehrsmittel und Taxis verfügbar.</p>',
        pl: '<ul class="viona-list"><li>Miasto: Antalya</li><li>Region: Alanya</li><li>Lokalizacja: Obagöl</li><li>Centrum Alanii: ok. 3 km</li><li>Lotnisko Gazipaşa: ok. 38 km</li><li>Lotnisko Antalya: ok. 125 km</li></ul><p>Hotel leży blisko centrum Alanii z dogodnymi połączeniami. Dostępny jest transport publiczny i taksówki.</p>',
      },
    },
    {
      icon: IC.grid,
      defaultOpen: true,
      title: {
        tr: "Tesis genel özellikleri",
        en: "Property overview",
        de: "Anlage im Überblick",
        pl: "Charakter obiektu",
      },
      html: {
        tr:
          '<ul class="viona-list"><li>Toplam alan: 10.000 m²</li><li>Toplam bina sayısı: 3</li><li>Toplam oda sayısı: 363</li><li>Toplam yatak sayısı: 886</li><li>Konsept: Her Şey Dahil – 5 yıldızlı</li><li>Sezon: Yaz sezonu ağırlıklı hizmet</li><li>Misafir profili: Aileler, çiftler ve bireysel tatilciler</li></ul>',
        en:
          '<ul class="viona-list"><li>Total area: 10,000 m²</li><li>Buildings: 3</li><li>Rooms: 363</li><li>Beds: 886</li><li>Concept: All Inclusive – 5-star</li><li>Season: summer-focused operation</li><li>Guests: families, couples, individual travellers</li></ul>',
        de:
          '<ul class="viona-list"><li>Gesamtfläche: 10.000 m²</li><li>Gebäude: 3</li><li>Zimmer: 363</li><li>Betten: 886</li><li>Konzept: All Inclusive – 5 Sterne</li><li>Saison: schwerpunktmäßig Sommer</li><li>Gäste: Familien, Paare, Einzelreisende</li></ul>',
        pl: '<ul class="viona-list"><li>Powierzchnia: 10 000 m²</li><li>Budynki: 3</li><li>Pokoje: 363</li><li>Łóżka: 886</li><li>Koncept: All Inclusive – 5 gwiazdek</li><li>Sezon: działalność nastawiona na lato</li><li>Goście: rodziny, pary, podróżni indywidualni</li></ul>',
      },
    },
    {
      icon: IC.phone,
      defaultOpen: false,
      title: {
        tr: "İletişim ve adres",
        en: "Contact & address",
        de: "Kontakt & Adresse",
        pl: "Kontakt i adres",
      },
      html: {
        tr:
          '<dl class="viona-kv"><dt>Telefon</dt><dd>+90 (242) 514 3090 · +90 (242) 514 1171</dd><dt>E-posta</dt><dd>kailabeach@kailahotels.com</dd><dt>Adres</dt><dd>Oba Mah. 25151 Sk. No:4, 07400 Alanya/Antalya</dd><dt>Web</dt><dd>www.kailahotels.com</dd></dl>',
        en:
          '<dl class="viona-kv"><dt>Phone</dt><dd>+90 (242) 514 3090 · +90 (242) 514 1171</dd><dt>Email</dt><dd>kailabeach@kailahotels.com</dd><dt>Address</dt><dd>Oba Mah. 25151 Sk. No:4, 07400 Alanya/Antalya</dd><dt>Web</dt><dd>www.kailahotels.com</dd></dl>',
        de:
          '<dl class="viona-kv"><dt>Telefon</dt><dd>+90 (242) 514 3090 · +90 (242) 514 1171</dd><dt>E-Mail</dt><dd>kailabeach@kailahotels.com</dd><dt>Adresse</dt><dd>Oba Mah. 25151 Sk. No:4, 07400 Alanya/Antalya</dd><dt>Web</dt><dd>www.kailahotels.com</dd></dl>',
        pl: '<dl class="viona-kv"><dt>Telefon</dt><dd>+90 (242) 514 3090 · +90 (242) 514 1171</dd><dt>E-mail</dt><dd>kailabeach@kailahotels.com</dd><dt>Adres</dt><dd>Oba Mah. 25151 Sk. No:4, 07400 Alanya/Antalya</dd><dt>Strona</dt><dd>www.kailahotels.com</dd></dl>',
      },
    },
    {
      icon: IC.waves,
      defaultOpen: false,
      title: { tr: "Plaj ve deniz", en: "Beach & sea", de: "Strand & Meer", pl: "Plaża i morze" },
      html: {
        tr:
          '<ul class="viona-list"><li>Konum: Denize sıfır</li><li>Plaj türü: Kum ve çakıl karışık plaj</li><li>Şezlong: Ücretsiz</li><li>Şemsiye: Ücretsiz</li><li>Plaj havlusu: Ücretsiz</li></ul><p>Plaj alanında misafirlerin gün boyu faydalanabileceği içecek ve snack servis noktaları bulunmaktadır.</p>',
        en:
          '<ul class="viona-list"><li>Location: beachfront</li><li>Beach: sand and pebble mix</li><li>Sun loungers: free</li><li>Parasols: free</li><li>Beach towels: free</li></ul><p>Drink and snack service points are available on the beach during the day.</p>',
        de:
          '<ul class="viona-list"><li>Lage: direkt am Strand</li><li>Strand: Sand und Kies</li><li>Liegen: kostenlos</li><li>Sonnenschirme: kostenlos</li><li>Strandtücher: kostenlos</li></ul><p>Getränke- und Snack-Service am Strand.</p>',
        pl: '<ul class="viona-list"><li>Lokalizacja: pierwsza linia plaży</li><li>Plaża: piasek z domieszką żwiru</li><li>Leżaki: bezpłatnie</li><li>Parasole: bezpłatnie</li><li>Ręczniki plażowe: bezpłatnie</li></ul><p>W ciągu dnia na plaży dostępne są punkty z napojami i przekąskami.</p>',
      },
    },
    {
      icon: IC.pool,
      defaultOpen: false,
      title: {
        tr: "Havuz ve aquapark",
        en: "Pools & aquapark",
        de: "Pools & Aquapark",
        pl: "Baseny i aquapark",
      },
      html: {
        tr:
          '<ul class="viona-list"><li>Açık havuz: 3 adet</li><li>Kapalı havuz: 1 adet (spa, ısıtmalı)</li><li>Aquapark: Mevcut (kaydıraklar; çocuklara uygun sığ bölümler aquapark / açık alanda)</li></ul><p>Havuz alanlarında şezlong ve şemsiye ücretsiz olarak sunulmaktadır. Aquapark kullanım saatleri operasyonel programa göre değişiklik gösterebilir.</p>',
        en:
          '<ul class="viona-list"><li>Outdoor pools: 3</li><li>Indoor pool: 1 (spa, heated)</li><li>Aquapark: yes (slides; shallow areas for children in the outdoor / aquapark zone)</li></ul><p>Loungers and parasols are free at the pool areas. Aquapark hours may vary according to operations.</p>',
        de:
          '<ul class="viona-list"><li>Außenbecken: 3</li><li>Hallenbad: 1 (Spa, beheizt)</li><li>Aquapark: ja (Rutschen; flache Kinderbereiche im Außen- und Aquaparkbereich)</li></ul><p>Liegen und Schirme kostenlos. Aquapark-Zeiten können betriebsbedingt variieren.</p>',
        pl: '<ul class="viona-list"><li>Baseny zewnętrzne: 3</li><li>Basen kryty: 1 (spa, podgrzewany)</li><li>Aquapark: tak (zjeżdżalnie; płytkie strefy dla dzieci na zewnątrz / w aquaparku)</li></ul><p>Leżaki i parasole przy basenach są bezpłatne. Godziny aquaparku mogą się zmieniać w zależności od operacji hotelu.</p>',
      },
    },
    {
      icon: IC.spark,
      defaultOpen: false,
      title: {
        tr: "Genel hizmet ve olanaklar",
        en: "Services & facilities",
        de: "Service & Ausstattung",
        pl: "Usługi i udogodnienia",
      },
      html: {
        tr:
          '<ul class="viona-list"><li>24 saat resepsiyon</li><li>Lobi alanı</li><li>Ücretsiz Wi-Fi (genel alanlar ve odalar)</li><li>Asansör</li></ul>',
        en:
          '<ul class="viona-list"><li>24-hour reception</li><li>Lobby</li><li>Free Wi-Fi (public areas and rooms)</li><li>Lifts</li></ul>',
        de:
          '<ul class="viona-list"><li>24h Rezeption</li><li>Lobby</li><li>Kostenloses WLAN (öffentliche Bereiche und Zimmer)</li><li>Aufzüge</li></ul>',
        pl: '<ul class="viona-list"><li>Recepcja 24h</li><li>Hol</li><li>Bezpłatne Wi-Fi (strefy ogólne i pokoje)</li><li>Windy</li></ul>',
      },
    },
    {
      icon: IC.clock,
      defaultOpen: false,
      title: {
        tr: "Teknik ve operasyonel bilgiler",
        en: "Technical & operations",
        de: "Technik & Ablauf",
        pl: "Informacje techniczne i operacyjne",
      },
      html: {
        tr:
          '<ul class="viona-list"><li>Check-in saati: 14:00</li><li>Check-out saati: 12:00</li><li>Resepsiyon telefon kodu: 9</li><li>Kredi kartları: Visa ve MasterCard</li><li>Elektrik: 220 Volt</li><li>Evcil hayvan: Kabul edilmez</li></ul><p>Otel yönetimi operasyon saatlerinde ve hizmet içeriklerinde değişiklik yapma hakkını saklı tutar.</p>',
        en:
          '<ul class="viona-list"><li>Check-in: 14:00</li><li>Check-out: 12:00</li><li>Reception dial: 9</li><li>Cards: Visa and MasterCard</li><li>Electricity: 220 V</li><li>Pets: not accepted</li></ul><p>The hotel may change operating hours and service content.</p>',
        de:
          '<ul class="viona-list"><li>Check-in: 14:00</li><li>Check-out: 12:00</li><li>Rezeption: 9</li><li>Karten: Visa und MasterCard</li><li>Strom: 220 V</li><li>Haustiere: nein</li></ul><p>Änderungen von Zeiten und Leistungen vorbehalten.</p>',
        pl: '<ul class="viona-list"><li>Zameldowanie: 14:00</li><li>Wymeldowanie: 12:00</li><li>Recepcja (numer wewnętrzny): 9</li><li>Karty: Visa i MasterCard</li><li>Napięcie: 220 V</li><li>Zwierzęta: nie są akceptowane</li></ul><p>Hotel zastrzega sobie prawo do zmiany godzin pracy i zakresu usług.</p>',
      },
    },
    {
      icon: IC.shield,
      defaultOpen: false,
      title: {
        tr: "Güvenlik ve politikalar",
        en: "Security & policies",
        de: "Sicherheit & Regeln",
        pl: "Bezpieczeństwo i zasady",
      },
      html: {
        tr:
          "<p>Misafir güvenliği ve konforu ön planda tutulmaktadır. Otel içerisinde genel güvenlik önlemleri uygulanmaktadır. Alkollü içecekler 18 yaş altı misafirlere servis edilmez.</p>",
        en:
          "<p>Guest safety and comfort are a priority. General security measures apply on the property. Alcoholic drinks are not served to guests under 18.</p>",
        de:
          "<p>Sicherheit und Komfort stehen im Vordergrund. Allgemeine Sicherheitsmaßnahmen. Kein Alkohol unter 18 Jahren.</p>",
        pl: "<p>Bezpieczeństwo i komfort gości są priorytetem. Na terenie obiektu obowiązują ogólne środki bezpieczeństwa. Napojów alkoholowych nie podaje się osobom poniżej 18 roku życia.</p>",
      },
    },
    {
      icon: IC.leaf,
      defaultOpen: false,
      title: {
        tr: "Çevre ve sürdürülebilirlik",
        en: "Environment & sustainability",
        de: "Umwelt & Nachhaltigkeit",
        pl: "Środowisko i zrównoważony rozwój",
      },
      html: {
        tr:
          "<p>Kaila Beach Hotel, çevreye duyarlı bir işletme anlayışı benimsemektedir. Güneş enerjisi sistemleri (GES), atık ayrıştırma ve geri dönüşüm uygulamaları, su tasarrufu politikaları, plastik kullanımının azaltılması ve doğal kaynakların korunması ile sürdürülebilir turizm ilkeleri doğrultusunda faaliyet gösterilmektedir.</p>",
        en:
          "<p>Kaila Beach Hotel is committed to environmental responsibility: solar (GES), waste separation and recycling, water saving, reducing plastic, protecting natural resources and sustainable tourism principles.</p>",
        de:
          "<p>Umweltbewusstsein: Photovoltaik, Mülltrennung und Recycling, Wassersparen, weniger Plastik, Schutz der Ressourcen und nachhaltiger Tourismus.</p>",
        pl: "<p>Kaila Beach Hotel dba o środowisko: energia słoneczna (PV), segregacja i recykling odpadów, oszczędzanie wody, ograniczanie plastiku, ochrona zasobów naturalnych oraz zasady zrównoważonej turystyki.</p>",
      },
    },
    {
      icon: IC.globe,
      defaultOpen: false,
      title: {
        tr: "Dil ve hizmet dilleri",
        en: "Languages",
        de: "Sprachen",
        pl: "Języki",
      },
      html: {
        tr: "<p>Konuşulan diller: Türkçe, İngilizce, Almanca ve Lehçe (Polski).</p>",
        en: "<p>Languages spoken: Turkish, English, German and Polish.</p>",
        de: "<p>Gesprochene Sprachen: Türkisch, Englisch, Deutsch und Polnisch.</p>",
        pl: "<p>Języki: turecki, angielski, niemiecki i polski.</p>",
      },
    },
    {
      icon: IC.wifi,
      defaultOpen: false,
      title: { tr: "İnternet", en: "Internet", de: "Internet", pl: "Internet" },
      html: {
        tr: "<p>Wi-Fi: Tüm alanlarda ücretsiz. Oda içi Wi-Fi: Mevcut.</p>",
        en: "<p>Wi-Fi: free in all areas. In-room Wi-Fi: available.</p>",
        de: "<p>WLAN: überall kostenlos. WLAN im Zimmer: verfügbar.</p>",
        pl: "<p>Wi-Fi: bezpłatnie we wszystkich strefach. Wi-Fi w pokoju: dostępne.</p>",
      },
    },
    {
      icon: IC.bus,
      defaultOpen: false,
      title: {
        tr: "Ulaşım ve erişim",
        en: "Transport & access",
        de: "Anreise & Mobilität",
        pl: "Dojazd i dostęp",
      },
      html: {
        tr:
          '<ul class="viona-list"><li>Toplu taşıma: Mevcut</li><li>Taksi: 24 saat erişilebilir</li><li>Araç kiralama: Ücretli hizmet</li><li>Antalya Havalimanı: yaklaşık 125 km</li><li>Gazipaşa Havalimanı: yaklaşık 38 km</li><li>Alanya şehir merkezi: yaklaşık 3 km</li></ul>',
        en:
          '<ul class="viona-list"><li>Public transport: available</li><li>Taxi: 24h</li><li>Car rental: paid</li><li>Antalya Airport: approx. 125 km</li><li>Gazipaşa Airport: approx. 38 km</li><li>Alanya centre: approx. 3 km</li></ul>',
        de:
          '<ul class="viona-list"><li>ÖPNV: vorhanden</li><li>Taxi: 24 h</li><li>Mietwagen: kostenpflichtig</li><li>Flughafen Antalya: ca. 125 km</li><li>Flughafen Gazipaşa: ca. 38 km</li><li>Zentrum Alanya: ca. 3 km</li></ul>',
        pl: '<ul class="viona-list"><li>Komunikacja publiczna: dostępna</li><li>Taksówki: 24h</li><li>Wynajem samochodu: płatny</li><li>Lotnisko Antalya: ok. 125 km</li><li>Lotnisko Gazipaşa: ok. 38 km</li><li>Centrum Alanii: ok. 3 km</li></ul>',
      },
    },
    {
      icon: IC.cam,
      defaultOpen: false,
      title: {
        tr: "Güvenlik detayları",
        en: "Security details",
        de: "Sicherheitsdetails",
        pl: "Szczegóły bezpieczeństwa",
      },
      html: {
        tr:
          '<ul class="viona-list"><li>Güvenlik personeli: Mevcut</li><li>Oda kasası: Ücretli (ayrıntılar için «Genel operasyon» bölümüne bakınız)</li></ul>',
        en:
          '<ul class="viona-list"><li>Security staff: available</li><li>In-room safe: paid (see «General operations» for details)</li></ul>',
        de:
          '<ul class="viona-list"><li>Sicherheitspersonal: vorhanden</li><li>Tresor im Zimmer: kostenpflichtig (Details unter «Allgemeiner Betrieb»)</li></ul>',
        pl: '<ul class="viona-list"><li>Personel ochrony: dostępny</li><li>Sejf w pokoju: płatny (szczegóły w sekcji «Prowadzenie hotelu — informacje praktyczne»)</li></ul>',
      },
    },
    {
      icon: IC.med,
      defaultOpen: false,
      title: {
        tr: "Sağlık hizmetleri",
        en: "Health services",
        de: "Gesundheit",
        pl: "Opieka medyczna",
      },
      html: {
        tr:
          "<p>Doktor ve sağlık hizmetleri ücretlidir. İhtiyaç durumunda 24 saat hastane destekli sağlık hizmeti sağlanabilmektedir. Doktor: Ücretli / çağrılı. İlk yardım: Mevcut.</p>",
        en:
          "<p>Doctor and health services are charged. When needed, 24-hour hospital-backed support may be arranged. Doctor: paid / on call. First aid: available.</p>",
        de:
          "<p>Arzt und medizinische Leistungen kostenpflichtig. Bei Bedarf 24h kliniknahe Unterstützung. Arzt: kostenpflichtig / auf Abruf. Erste Hilfe: vorhanden.</p>",
        pl: "<p>Lekarz i usługi medyczne są płatne. W razie potrzeby możliwe jest wsparcie 24h związane ze szpitalem. Lekarz: płatnie / na wezwanie. Pierwsza pomoc: dostępna.</p>",
      },
    },
    {
      icon: IC.shop,
      defaultOpen: false,
      title: {
        tr: "Alışveriş ve ticari alanlar",
        en: "Shopping",
        de: "Einkaufen",
        pl: "Zakupy",
      },
      html: {
        tr: "<p>Market, deri mağazası, fotoğrafçı, kuaför.</p>",
        en: "<p>Market, leather shop, photographer, hairdresser.</p>",
        de: "<p>Markt, Lederwaren, Fotograf, Friseur.</p>",
        pl: "<p>Sklep spożywczy, galanteria skórzana, fotograf, fryzjer.</p>",
      },
    },
    {
      icon: IC.baby,
      defaultOpen: false,
      title: {
        tr: "Çocuk / bebek",
        en: "Children & babies",
        de: "Kinder & Babys",
        pl: "Dzieci i niemowlęta",
      },
      html: {
        tr:
          '<ul class="viona-list"><li>Bebek yatağı: Ücretsiz</li><li>Bebek bakıcısı: Ücretli</li><li>Mama sandalyesi: Mevcut</li></ul>',
        en:
          '<ul class="viona-list"><li>Baby cot: free</li><li>Babysitting: paid</li><li>High chair: available</li></ul>',
        de:
          '<ul class="viona-list"><li>Babybett: kostenlos</li><li>Babysitter: kostenpflichtig</li><li>Hochstuhl: vorhanden</li></ul>',
        pl: '<ul class="viona-list"><li>Łóżeczko dziecięce: bezpłatnie</li><li>Opieka nad dzieckiem: płatna</li><li>Krzesło do karmienia: dostępne</li></ul>',
      },
    },
    {
      icon: IC.alert,
      defaultOpen: false,
      title: {
        tr: "Genel operasyon uyarıları",
        en: "Operational notices",
        de: "Betriebshinweise",
        pl: "Informacje operacyjne",
      },
      html: {
        tr:
          "<p>Otel yönetimi, hizmet saatleri ve içeriklerinde düzenleme yapma hakkını saklı tutar. Bazı hizmetlerin sunumu kapasite ve operasyonel düzene göre düzenlenebilir.</p>",
        en:
          "<p>The hotel may adjust service hours and offerings. How some services are delivered can follow capacity and operational planning.</p>",
        de:
          "<p>Änderungen von Zeiten und Leistungen vorbehalten. Einige Angebote richten sich nach Kapazität und Betriebsablauf.</p>",
        pl: "<p>Hotel może zmieniać godziny i zakres usług. Sposób świadczenia niektórych usług może zależeć od pojemności i planu operacyjnego.</p>",
      },
    },
    {
      icon: IC.food,
      defaultOpen: false,
      title: {
        tr: "Gıda ve alerjen uyarısı",
        en: "Food & allergen notice",
        de: "Lebensmittel & Allergene",
        pl: "Żywność i alergeny",
      },
      html: {
        tr:
          "<p>Menülerde yer alan bazı yiyecekler, Türk Gıda Kodeksi kapsamında alerjen olarak kabul edilen hammaddeler içerebilir. Herhangi bir gıda alerjisi veya özel beslenme ihtiyacı bulunan misafirlerin misafir ilişkileri departmanı ile iletişime geçmeleri gerekmektedir.</p>",
        en:
          "<p>Some dishes may contain allergens under the Turkish Food Codex. Guests with allergies or special dietary needs should contact guest relations.</p>",
        de:
          "<p>Einige Speisen können Allergene enthalten (türkisches Lebensmittelrecht). Bei Allergien oder Diäten bitte Guest Relations kontaktieren.</p>",
        pl: "<p>Niektóre dania mogą zawierać alergeny zgodnie z tureckim kodeksem żywnościowym. Goście z alergiami lub specjalnymi wymaganiami dietetycznymi powinni skontaktować się z działem relacji z gośćmi.</p>",
      },
    },
    {
      icon: IC.drink,
      defaultOpen: false,
      title: {
        tr: "Konsept dışı ürün ve hizmetler",
        en: "Not included in the concept",
        de: "Nicht im Konzept enthalten",
        pl: "Poza konceptem (All Inclusive)",
      },
      html: {
        tr:
          "<p>Aşağıdaki ürün ve hizmetler her şey dahil konseptine dahil değildir ve ekstra ücrete tabidir:</p><ul class=\"viona-list\"><li>Taze sıkılmış meyve suları</li><li>İthal içecekler</li><li>Kokteyller</li><li>Enerji içecekleri</li></ul>",
        en:
          "<p>The following are not included in all-inclusive and are charged extra:</p><ul class=\"viona-list\"><li>Freshly squeezed juices</li><li>Imported drinks</li><li>Cocktails</li><li>Energy drinks</li></ul>",
        de:
          "<p>Folgendes ist nicht All-inclusive und kostenpflichtig:</p><ul class=\"viona-list\"><li>Frisch gepresste Säfte</li><li>Importgetränke</li><li>Cocktails</li><li>Energydrinks</li></ul>",
        pl: "<p>Poniższe nie wchodzą w zakres All Inclusive i są dodatkowo płatne:</p><ul class=\"viona-list\"><li>Świeżo wyciskane soki</li><li>Napoje importowane</li><li>Koktajle</li><li>Napoje energetyzujące</li></ul>",
      },
    },
    {
      icon: IC.cal,
      defaultOpen: false,
      title: {
        tr: "Önceden haber gerektiren hizmetler",
        en: "Services needing advance notice",
        de: "Leistungen mit Voranmeldung",
        pl: "Usługi wymagające wcześniejszej rezerwacji",
      },
      html: {
        tr:
          "<p>A la carte ücretlidir; kullanmadan önce resepsiyon veya ilgili restoran ile önceden haber vermeniz gerekir. 5 gece ve üzeri konaklamalarda 1 kez ücretsiz kullanım hakkı olabilir; yine de önceden haber vermeniz istenir.</p>",
        en:
          "<p>À la carte is charged; please arrange in advance with reception or the restaurant. For stays of 5 nights or more, one complimentary visit may apply; advance notice is still requested.</p>",
        de:
          "<p>À la carte kostenpflichtig; bitte vorher bei Rezeption oder Restaurant anmelden. Ab 5 Nächten kann einmal kostenfrei sein; Voranmeldung bleibt erforderlich.</p>",
        pl: "<p>Restauracja à la carte jest płatna; prosimy o wcześniejsze uzgodnienie z recepcją lub restauracją. Przy pobytach od 5 nocy może przysługiwać jedna bezpłatna wizyta; nadal prosimy o wcześniejsze zgłoszenie.</p>",
      },
    },
    {
      icon: IC.box,
      defaultOpen: false,
      title: {
        tr: "Özel talep (lunch box)",
        en: "Special request (lunch box)",
        de: "Sonderwunsch (Lunchbox)",
        pl: "Prośba specjalna (lunch box)",
      },
      html: {
        tr:
          "<p>Lunch box hizmetinden yararlanmak isteyen misafirlerin, en geç saat 20:00’a kadar resepsiyonu bilgilendirmeleri gerekmektedir.</p>",
        en:
          "<p>Guests who wish to use the lunch box service must inform reception by 20:00 at the latest.</p>",
        de:
          "<p>Für Lunchbox bitte spätestens bis 20:00 Uhr an der Rezeption melden.</p>",
        pl: "<p>Goście chcący skorzystać z lunch boxa muszą poinformować recepcję najpóźniej do godz. 20:00.</p>",
      },
    },
    {
      icon: IC.users,
      defaultOpen: false,
      title: {
        tr: "Yaş ve kullanım kısıtlamaları",
        en: "Age & usage rules",
        de: "Altersregeln",
        pl: "Wiek i zasady korzystania",
      },
      html: {
        tr:
          "<p>Fitness Center: 16 yaş altı misafirlerin kullanımına izin verilmez. Alkollü içecekler: 18 yaş altı misafirlere servis edilmez.</p>",
        en:
          "<p>Fitness centre: not permitted for guests under 16. Alcoholic drinks: not served to guests under 18.</p>",
        de:
          "<p>Fitness: nicht unter 16 Jahren. Alkohol: nicht unter 18 Jahren.</p>",
        pl: "<p>Strefa fitness: niedozwolona dla gości poniżej 16 roku życia. Napoje alkoholowe: nie podawane osobom poniżej 18 roku życia.</p>",
      },
    },
    {
      icon: IC.child,
      defaultOpen: false,
      title: {
        tr: "Çocuk güvenliği uyarıları",
        en: "Child safety",
        de: "Kindersicherheit",
        pl: "Bezpieczeństwo dzieci",
      },
      html: {
        tr:
          "<p>Misafirlerin çocuklarını oyun alanlarında ve su kaydıraklarında yalnız bırakmamaları gerekmektedir.</p>",
        en:
          "<p>Please do not leave children unattended in play areas or on water slides.</p>",
        de:
          "<p>Kinder auf Spielplätzen und Rutschen nicht unbeaufsichtigt lassen.</p>",
        pl: "<p>Prosimy nie zostawiać dzieci bez opieki na placach zabaw i na zjeżdżalniach wodnych.</p>",
      },
    },
    {
      icon: IC.wallet,
      defaultOpen: false,
      title: { tr: "Ekstra hizmetler", en: "Extra services", de: "Zusatzleistungen", pl: "Usługi dodatkowe" },
      html: {
        tr:
          "<p>Aşağıdaki hizmetler ücretlidir: oda içi kasa (safe) kullanımı, çamaşırhane (yıkama, ütüleme, kuru temizleme), spa bakımları (masaj, cilt bakımı vb.).</p>",
        en:
          "<p>Charged services include: in-room safe, laundry (wash, iron, dry cleaning), spa treatments (massage, skincare, etc.).</p>",
        de:
          "<p>Kostenpflichtig: Zimmertresor, Wäscherei, Spa-Behandlungen.</p>",
        pl: "<p>Usługi płatne m.in.: sejf w pokoju, pralnia (pranie, prasowanie, chemiczne), zabiegi spa (masaż, pielęgnacja skóry itd.).</p>",
      },
    },
    {
      icon: IC.list,
      defaultOpen: false,
      title: {
        tr: "Genel hizmetler (özet)",
        en: "General services (summary)",
        de: "Leistungen (Überblick)",
        pl: "Usługi ogólne (skrót)",
      },
      html: {
        tr:
          '<ul class="viona-list"><li>Wi-Fi internet — genel alan ve odalar — 24 saat — ücretsiz</li><li>Kiralık kasa (oda içi safe) — 24 saat — ücretli</li><li>Oda servisi — mevcut ve ücretlidir</li></ul>',
        en:
          '<ul class="viona-list"><li>Wi-Fi — public areas and rooms — 24h — free</li><li>In-room safe — 24h — paid</li><li>Room service — available, charged</li></ul>',
        de:
          '<ul class="viona-list"><li>WLAN — überall — 24h — kostenlos</li><li>Tresor im Zimmer — 24h — kostenpflichtig</li><li>Zimmerservice — verfügbar, kostenpflichtig</li></ul>',
        pl: '<ul class="viona-list"><li>Wi-Fi — strefy ogólne i pokoje — 24h — bezpłatnie</li><li>Sejf w pokoju — 24h — płatny</li><li>Room service — dostępny, płatny</li></ul>',
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
      pl: "Ogólne informacje o hotelu pogrupowane według tematów — dotknij nagłówka, aby rozwinąć.",
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
