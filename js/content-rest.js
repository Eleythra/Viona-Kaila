(function () {
  "use strict";
  var P = window.VionaContent.pick;

  function T(row) {
    return P(row || {});
  }

  function currentUiLang() {
    try {
      var c = String(localStorage.getItem("viona_lang") || "tr").toLowerCase();
      if (c === "en" || c === "de" || c === "pl") return c;
      return "tr";
    } catch (e) {
      return "tr";
    }
  }

  function pickByLang(row) {
    if (!row || typeof row !== "object") return "";
    var lang = currentUiLang();
    if (row[lang] != null && String(row[lang]).trim() !== "") return String(row[lang]);
    if (row.tr != null && String(row.tr).trim() !== "") return String(row.tr);
    if (row.en != null && String(row.en).trim() !== "") return String(row.en);
    return "";
  }

  function createPdfCtaIcon() {
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "venue-card__cta-icon");
    svg.setAttribute("width", "18");
    svg.setAttribute("height", "18");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    var p = document.createElementNS(ns, "path");
    p.setAttribute("fill", "currentColor");
    p.setAttribute(
      "d",
      "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2 5 5h-5V4zM8 17h8v-2H8v2zm0-4h8v-2H8v2zm0-4h5V6H8v2z",
    );
    svg.appendChild(p);
    return svg;
  }

  var SECTIONS = [
    {
      type: "zoneStart",
      variant: "dining",
      title: {
        tr: "Restoranlar ve gün içi",
        en: "Restaurants & daytime dining",
        de: "Restaurants & Tagesgastronomie",
        pl: "Restauracje i wyżywienie w ciągu dnia",
      },
    },
    {
      type: "card",
      img: "assets/images/rest/anarestaurant-8f4cde02-6c41-4770-9b8c-041525cdc4c9.png",
      title: {
        tr: "Ana Restaurant",
        en: "Main Restaurant",
        de: "Hauptrestaurant",
        pl: "Restauracja główna",
      },
      sub: {
        tr: "Açık büfe · Ana bina",
        en: "Open buffet · Main building",
        de: "Offenes Buffet · Hauptgebäude",
        pl: "Bufet szwedzki · budynek główny",
      },
      slots: [
        {
          name: { tr: "Kahvaltı", en: "Breakfast", de: "Frühstück", pl: "Śniadanie" },
          time: "07:00 – 10:00",
          format: { tr: "Açık büfe", en: "Open buffet", de: "Buffet", pl: "Bufet szwedzki" },
          charge: { tr: "Ücretsiz", en: "Included", de: "Inklusive", pl: "W cenie" },
          res: { tr: "Önceden haber gerekmez", en: "No advance notice needed", de: "Keine Voranmeldung nötig", pl: "Rezerwacja z wyprzedzeniem nie jest wymagana" },
          detail: {
            tr: "Açık büfe servis ve alkolsüz içecekler.",
            en: "Buffet service and non-alcoholic drinks.",
            de: "Buffet und alkoholfreie Getränke.",
            pl: "Bufet oraz napoje bezalkoholowe.",
          },
        },
        {
          name: { tr: "Geç kahvaltı", en: "Late breakfast", de: "Spätfrühstück", pl: "Późne śniadanie" },
          time: "10:00 – 10:30",
          format: { tr: "Azaltılmış açık büfe", en: "Reduced buffet", de: "Reduziertes Buffet", pl: "Uproszczony bufet" },
          charge: { tr: "Ücretsiz", en: "Included", de: "Inklusive", pl: "W cenie" },
          res: { tr: "Önceden haber gerekmez", en: "No advance notice needed", de: "Keine Voranmeldung nötig", pl: "Rezerwacja z wyprzedzeniem nie jest wymagana" },
          detail: {
            tr: "Azaltılmış açık büfe ve alkolsüz içecekler.",
            en: "Reduced buffet and non-alcoholic drinks.",
            de: "Reduziertes Buffet und alkoholfreie Getränke.",
            pl: "Uproszczony bufet i napoje bezalkoholowe.",
          },
        },
        {
          name: { tr: "Öğle yemeği", en: "Lunch", de: "Mittagessen", pl: "Obiad" },
          time: "12:30 – 14:00",
          format: { tr: "Açık büfe", en: "Open buffet", de: "Buffet", pl: "Bufet szwedzki" },
          charge: { tr: "Ücretsiz", en: "Included", de: "Inklusive", pl: "W cenie" },
          res: { tr: "Önceden haber gerekmez", en: "No advance notice needed", de: "Keine Voranmeldung nötig", pl: "Rezerwacja z wyprzedzeniem nie jest wymagana" },
          detail: {
            tr: "Açık büfe servis ve yerel alkollü / alkolsüz içecekler.",
            en: "Buffet with local alcoholic and non-alcoholic drinks.",
            de: "Buffet mit lokalen alkoholischen und alkoholfreien Getränken.",
            pl: "Bufet z lokalnymi napojami alkoholowymi i bezalkoholowymi.",
          },
        },
        {
          name: { tr: "Akşam yemeği", en: "Dinner", de: "Abendessen", pl: "Kolacja" },
          time: "19:00 – 21:00",
          format: { tr: "Açık büfe", en: "Open buffet", de: "Buffet", pl: "Bufet szwedzki" },
          charge: { tr: "Ücretsiz", en: "Included", de: "Inklusive", pl: "W cenie" },
          res: { tr: "Önceden haber gerekmez", en: "No advance notice needed", de: "Keine Voranmeldung nötig", pl: "Rezerwacja z wyprzedzeniem nie jest wymagana" },
          detail: {
            tr: "Açık büfe servis ve yerel alkollü / alkolsüz içecekler.",
            en: "Buffet with local alcoholic and non-alcoholic drinks.",
            de: "Buffet mit lokalen alkoholischen und alkoholfreien Getränken.",
            pl: "Bufet z lokalnymi napojami alkoholowymi i bezalkoholowymi.",
          },
        },
        {
          name: { tr: "Mini gece büfesi", en: "Late-night mini buffet", de: "Nachtbuffet", pl: "Nocny mini bufet" },
          time: "23:30 – 00:00",
          format: { tr: "Gece servisi", en: "Night service", de: "Nachtservice", pl: "Serwis nocny" },
          charge: { tr: "Ücretsiz", en: "Included", de: "Inklusive", pl: "W cenie" },
          res: { tr: "Önceden haber gerekmez", en: "No advance notice needed", de: "Keine Voranmeldung nötig", pl: "Rezerwacja z wyprzedzeniem nie jest wymagana" },
          detail: {
            tr: "Gece çorbası ve mini kahvaltı büfesi.",
            en: "Night soup and mini breakfast buffet.",
            de: "Nachtsuppe und kleines Frühstücksbuffet.",
            pl: "Zupa nocna i mini bufet śniadaniowy.",
          },
        },
      ],
    },
    {
      type: "heading",
      key: {
        tr: "Snack ve gün içi yeme-içme",
        en: "Snacks & daytime dining",
        de: "Snacks & Tagesverpflegung",
        pl: "Przekąski i wyżywienie w ciągu dnia",
      },
    },
    {
      type: "card",
      img: "assets/images/rest/dolphinresandbar-d65f4aa4-19c9-47e8-9c76-9fbdcfda7433.png",
      title: { tr: "Dolphin Snack", en: "Dolphin Snack", de: "Dolphin Snack", pl: "Dolphin Snack" },
      location: {
        tr: "C Blok · Havuz kenarı · Snack alanı",
        en: "Block C · Poolside · Snack area",
        de: "Block C · Poolseite",
        pl: "Blok C · przy basenie · strefa snacków",
      },
      slots: [
        {
          name: { tr: "Gün içi servis", en: "Daytime service", de: "Tagservice", pl: "Serwis w ciągu dnia" },
          time: "12:00 – 16:00",
          format: { tr: "Hızlı servis · hafif atıştırmalık", en: "Quick service · light snacks", de: "Schnellservice", pl: "Szybki serwis · lekkie przekąski" },
          charge: { tr: "Ücretsiz", en: "Included", de: "Inklusive", pl: "W cenie" },
          res: { tr: "Önceden haber gerekmez", en: "No advance notice needed", de: "Keine Voranmeldung nötig", pl: "Rezerwacja z wyprzedzeniem nie jest wymagana" },
          detail: {
            tr: "Pizza, hamburger, hot dog, nugget, patates kızartması ve çeşitli hafif atıştırmalıklar.",
            en: "Pizza, burgers, hot dogs, nuggets, fries and assorted light snacks.",
            de: "Pizza, Burger, Hot Dogs, Nuggets, Pommes und weitere Snacks.",
            pl: "Pizza, burgery, hot dogi, nuggetsy, frytki i inne lekkie przekąski.",
          },
        },
      ],
    },
    {
      type: "card",
      img: "assets/images/rest/imbissnack-64ad19b9-7533-476e-9f04-ca3bc28f5850.png",
      title: { tr: "Beach Imbiss", en: "Beach Snack", de: "Strand-Snack", pl: "Snack plażowy" },
      location: {
        tr: "Plaj · Snack (sahil)",
        en: "Beach · Shore snack point",
        de: "Strand",
        pl: "Plaża · punkt snackowy przy brzegu",
      },
      slots: [
        {
          name: { tr: "Yiyecek servisi", en: "Food service", de: "Essen", pl: "Serwis żywności" },
          time: "12:00 – 16:00",
          format: { tr: "Hızlı servis", en: "Quick service", de: "Schnellservice", pl: "Szybki serwis" },
          charge: { tr: "Ücretsiz", en: "Included", de: "Inklusive", pl: "W cenie" },
          res: { tr: "Önceden haber gerekmez", en: "No advance notice needed", de: "Keine Voranmeldung nötig", pl: "Rezerwacja z wyprzedzeniem nie jest wymagana" },
          detail: {
            tr: "Patates kızartması, sosisli sandviç, gözleme.",
            en: "Fries, sausage sandwich, gözleme.",
            de: "Pommes, Wurst-Sandwich, Gözleme.",
            pl: "Frytki, kanapka z kiełbasą, gözleme.",
          },
        },
        {
          name: { tr: "İçecek servisi bar", en: "Drinks bar", de: "Getränkebar", pl: "Bar napojów" },
          time: "10:00 – 17:00",
          format: { tr: "İçecek servisi", en: "Drinks service", de: "Getränke", pl: "Serwis napojów" },
          charge: { tr: "Ücretsiz", en: "Included", de: "Inklusive", pl: "W cenie" },
          res: { tr: "Önceden haber gerekmez", en: "No advance notice needed", de: "Keine Voranmeldung nötig", pl: "Rezerwacja z wyprzedzeniem nie jest wymagana" },
          detail: {
            tr: "Bira, çay, kahve, konsantre meyve suyu, gazlı içecekler, su, ayran.",
            en: "Beer, tea, coffee, concentrated juices, soft drinks, water, ayran.",
            de: "Bier, Tee, Kaffee, Fruchtsaftkonzentrate, Limonaden, Wasser, Ayran.",
            pl: "Piwo, herbata, kawa, soki z koncentratu, napoje gazowane, woda, ajran.",
          },
        },
      ],
    },
    {
      type: "card",
      img: "assets/images/rest/gustosnack-6162dfea-ef2d-434c-b3b8-ca5c2ad10d26.png",
      title: { tr: "Gusto Snack", en: "Gusto Snack", de: "Gusto Snack", pl: "Gusto Snack" },
      location: { tr: "Snack alanı · masaya servis", en: "Snack area · table service", de: "Snack-Bereich", pl: "Strefa snacków · obsługa przy stoliku" },
      slots: [
        {
          name: { tr: "Servis", en: "Service", de: "Service", pl: "Serwis" },
          time: "11:00 – 18:00",
          format: { tr: "Masaya servis", en: "Table service", de: "Bedienung", pl: "Obsługa przy stoliku" },
          charge: { tr: "Ücretsiz", en: "Included", de: "Inklusive", pl: "W cenie" },
          res: { tr: "Önceden haber gerekmez", en: "No advance notice needed", de: "Keine Voranmeldung nötig", pl: "Rezerwacja z wyprzedzeniem nie jest wymagana" },
          detail: {
            tr: "Atıştırmalık yiyecekler.",
            en: "Snack foods.",
            de: "Snacks.",
            pl: "Przekąski.",
          },
        },
      ],
    },
    {
      type: "card",
      img: "assets/images/rest/libum-e2326908-0c8b-4197-8ae1-fccf5c59878d.png",
      title: { tr: "Libum Cafe", en: "Libum Cafe", de: "Libum Cafe", pl: "Libum Cafe" },
      location: {
        tr: "Kafe / pastane · self servis",
        en: "Café / patisserie · self-service",
        de: "Café · Selbstbedienung",
        pl: "Kawiarnia / cukiernia · samoobsługa",
      },
      slots: [
        {
          name: { tr: "Servis", en: "Service", de: "Service", pl: "Serwis" },
          time: "11:00 – 18:00",
          format: { tr: "Self servis", en: "Self-service", de: "Selbstbedienung", pl: "Samoobsługa" },
          charge: { tr: "Ücretsiz", en: "Included", de: "Inklusive", pl: "W cenie" },
          res: { tr: "Önceden haber gerekmez", en: "No advance notice needed", de: "Keine Voranmeldung nötig", pl: "Rezerwacja z wyprzedzeniem nie jest wymagana" },
          detail: {
            tr: "Çay, kahve, konsantre meyve suyu, gazlı içecekler, su; pasta, kek, kurabiye çeşitleri; atıştırmalık yiyecekler.",
            en: "Tea, coffee, concentrated juices, soft drinks, water; cakes, pastries, cookies; snacks.",
            de: "Tee, Kaffee, Fruchtsaftkonzentrate, Limonaden, Wasser; Kuchen, Gebäck; Snacks.",
            pl: "Herbata, kawa, soki z koncentratu, napoje gazowane, woda; ciasta, wypieki, ciasteczka; przekąski.",
          },
        },
      ],
    },
    {
      type: "card",
      img: "assets/images/rest/mossrestaurant-1a5f4011-0342-4d17-b484-8f91a1b97456.png",
      title: {
        tr: "Moss Beach Restaurant & Bar",
        en: "Moss Beach Restaurant & Bar",
        de: "Moss Beach Restaurant & Bar",
        pl: "Moss Beach Restaurant & Bar",
      },
      location: { tr: "Sahilde · masaya servis", en: "Beachfront · table service", de: "Am Strand", pl: "Przy plaży · obsługa przy stoliku" },
      action: {
        label: {
          tr: "Menüye Ulaşın",
          en: "Open Menu",
          de: "Menü Öffnen",
          pl: "Otwórz menu",
        },
        href: "assets/docs/moss-beach-menu.pdf",
        download: "moss-beach-menu.pdf",
        icon: true,
      },
      slots: [
        {
          name: { tr: "Bar ve snack", en: "Bar & snack", de: "Bar & Snack", pl: "Bar i przekąski" },
          time: "10:00 – 19:00",
          format: { tr: "Bar ve snack servisi", en: "Bar and snack service", de: "Bar- und Snackservice", pl: "Bar i serwis przekąsek" },
          charge: { tr: "Ücretli", en: "Paid", de: "Kostenpflichtig", pl: "Płatne" },
          res: { tr: "Yoğunluk durumunda önceden haber verin", en: "Busy times: call ahead", de: "Zu Stoßzeiten bitte vorher melden", pl: "W godzinach szczytu: zgłoś się wcześniej" },
          detail: {
            tr: "Ev yapımı yiyecekler; alkollü ve alkolsüz içecekler.",
            en: "Homemade food; alcoholic and non-alcoholic drinks.",
            de: "Hausgemachte Speisen; alkoholische und alkoholfreie Getränke.",
            pl: "Domowe jedzenie; napoje alkoholowe i bezalkoholowe.",
          },
        },
      ],
    },
    { type: "zoneEnd" },
    {
      type: "zoneStart",
      variant: "bars",
      title: {
        tr: "Barlar",
        en: "Bars",
        de: "Bars",
        pl: "Bary",
      },
    },
    {
      type: "barExtras",
      blockTitle: {
        tr: "İthal içecekler · ücretli liste",
        en: "Imported drinks · paid price list",
        de: "Importgetränke · kostenpflichtige Preisliste",
        pl: "Napoje importowane · płatny cennik",
      },
      intro: {
        tr: "İthal içeceklerin güncel fiyatları PDF listesindedir. İndirmek için aşağıdaki düğmeye dokunun.",
        en: "Imported drinks are priced as in the PDF list. Tap the button below to download.",
        de: "Aktuelle Preise für Importgetränke stehen in der PDF-Liste. Zum Herunterladen auf die Schaltfläche tippen.",
        pl: "Napoje importowane są wyceniane zgodnie z listą PDF. Dotknij przycisku poniżej, aby pobrać.",
      },
      drink: {
        label: {
          tr: "İçecek fiyat listesi (PDF)",
          en: "Drinks price list (PDF)",
          de: "Getränkepreisliste (PDF)",
          pl: "Cennik napojów (PDF)",
        },
        href: {
          tr: "assets/docs/drinks-price-list-tr.pdf",
          en: "assets/docs/drinks-price-list-en.pdf",
          de: "assets/docs/drinks-price-list-de.pdf",
          pl: "assets/docs/drinks-price-list-en.pdf",
        },
        download: {
          tr: "kaila-icecek-fiyat-listesi-tr.pdf",
          en: "kaila-drinks-price-list-en.pdf",
          de: "kaila-getraenkepreisliste-de.pdf",
          pl: "kaila-drinks-price-list-en.pdf",
        },
      },
    },
    {
      type: "card",
      img: "assets/images/rest/lobibar-8b3f3aac-f8ab-4421-84c5-e32fab6caab0.png",
      title: { tr: "Lobby Bar", en: "Lobby Bar", de: "Lobby Bar", pl: "Lobby Bar" },
      location: { tr: "Lobide", en: "In the lobby", de: "In der Lobby", pl: "W lobby" },
      action: {
        label: {
          tr: "Lobby Bar menüsü (PDF)",
          en: "Lobby Bar menu (PDF)",
          de: "Lobby Bar Menü (PDF)",
          pl: "Menu Lobby Bar (PDF)",
        },
        hrefByLang: {
          tr: "assets/docs/lobby-bar-menu-tr.pdf",
          en: "assets/docs/lobby-bar-menu-en.pdf",
          de: "assets/docs/lobby-bar-menu-de.pdf",
          pl: "assets/docs/lobby-bar-menu-en.pdf",
        },
        downloadByLang: {
          tr: "lobby-bar-menu-tr.pdf",
          en: "lobby-bar-menu-en.pdf",
          de: "lobby-bar-menu-de.pdf",
          pl: "lobby-bar-menu-en.pdf",
        },
        icon: true,
      },
      slots: [
        {
          name: { tr: "Bar servisi", en: "Bar service", de: "Bar", pl: "Serwis baru" },
          time: "10:00 – 00:00",
          format: { tr: "Bar servisi", en: "Bar service", de: "Bar", pl: "Serwis baru" },
          charge: { tr: "Ücretsiz", en: "Included", de: "Inklusive", pl: "W cenie" },
          res: { tr: "Önceden haber gerekmez", en: "No advance notice needed", de: "Keine Voranmeldung nötig", pl: "Rezerwacja z wyprzedzeniem nie jest wymagana" },
          detail: {
            tr: "Yerel alkollü ve alkolsüz içecekler; Türk kahvesi.",
            en: "Local alcoholic and non-alcoholic drinks; Turkish coffee.",
            de: "Lokale Getränke; türkischer Kaffee.",
            pl: "Lokalne napoje alkoholowe i bezalkoholowe; kawa po turecku.",
          },
        },
      ],
    },
    {
      type: "card",
      img: "assets/images/rest/poolbar-1328efd6-bd3d-4fc1-a2ad-7a54cb8ebfb8.png",
      title: { tr: "Havuz Bar", en: "Pool Bar", de: "Pool Bar", pl: "Pool Bar" },
      location: { tr: "Havuz kenarında", en: "Poolside", de: "Am Pool", pl: "Przy basenie" },
      action: {
        label: {
          tr: "Havuz Bar menüsü (PDF)",
          en: "Pool Bar menu (PDF)",
          de: "Pool Bar Menü (PDF)",
          pl: "Menu Pool Bar (PDF)",
        },
        hrefByLang: {
          tr: "assets/docs/pool-bar-menu-tr.pdf",
          en: "assets/docs/pool-bar-menu-en.pdf",
          de: "assets/docs/pool-bar-menu-de.pdf",
          pl: "assets/docs/pool-bar-menu-en.pdf",
        },
        downloadByLang: {
          tr: "pool-bar-menu-tr.pdf",
          en: "pool-bar-menu-en.pdf",
          de: "pool-bar-menu-de.pdf",
          pl: "pool-bar-menu-en.pdf",
        },
        icon: true,
      },
      slots: [
        {
          name: { tr: "Bar servisi", en: "Bar service", de: "Bar", pl: "Serwis baru" },
          time: "10:00 – 00:00",
          format: { tr: "Bar servisi", en: "Bar service", de: "Bar", pl: "Serwis baru" },
          charge: { tr: "Ücretsiz", en: "Included", de: "Inklusive", pl: "W cenie" },
          res: { tr: "Önceden haber gerekmez", en: "No advance notice needed", de: "Keine Voranmeldung nötig", pl: "Rezerwacja z wyprzedzeniem nie jest wymagana" },
          detail: {
            tr: "Yerel alkollü ve alkolsüz içecekler.",
            en: "Local alcoholic and non-alcoholic drinks.",
            de: "Lokale alkoholische und alkoholfreie Getränke.",
            pl: "Lokalne napoje alkoholowe i bezalkoholowe.",
          },
        },
        {
          name: { tr: "Dondurma servisi", en: "Ice cream service", de: "Eisservice", pl: "Serwis lodów" },
          time: "15:00 – 17:00",
          format: { tr: "Havuz Bar", en: "At Pool Bar", de: "Pool Bar", pl: "Przy Pool Bar" },
          charge: { tr: "Ücretsiz", en: "Included", de: "Inklusive", pl: "W cenie" },
          res: { tr: "Önceden haber gerekmez", en: "No advance notice needed", de: "Keine Voranmeldung nötig", pl: "Rezerwacja z wyprzedzeniem nie jest wymagana" },
          detail: {
            tr: "Dondurma çeşitleri.",
            en: "Assorted ice cream.",
            de: "Eissorten.",
            pl: "Wybór lodów.",
          },
        },
      ],
    },
    {
      type: "card",
      img: "assets/images/rest/aquabar-918957cf-8651-424d-8ccd-eaeba70c5d44.png",
      title: { tr: "Aqua Bar", en: "Aqua Bar", de: "Aqua Bar", pl: "Aqua Bar" },
      location: { tr: "Aquapark", en: "Aquapark", de: "Aquapark", pl: "Aquapark" },
      slots: [
        {
          name: { tr: "Bar servisi", en: "Bar service", de: "Bar", pl: "Serwis baru" },
          time: "10:00 – 18:00 · 20:00 – 23:00",
          format: { tr: "Bar servisi", en: "Bar service", de: "Bar", pl: "Serwis baru" },
          charge: { tr: "Ücretsiz", en: "Included", de: "Inklusive", pl: "W cenie" },
          res: { tr: "Önceden haber gerekmez", en: "No advance notice needed", de: "Keine Voranmeldung nötig", pl: "Rezerwacja z wyprzedzeniem nie jest wymagana" },
          detail: {
            tr: "Yerel alkollü ve alkolsüz içecekler.",
            en: "Local alcoholic and non-alcoholic drinks.",
            de: "Lokale alkoholische und alkoholfreie Getränke.",
            pl: "Lokalne napoje alkoholowe i bezalkoholowe.",
          },
        },
      ],
    },
    {
      type: "card",
      img: "assets/images/rest/dolphinresandbar-d65f4aa4-19c9-47e8-9c76-9fbdcfda7433.png",
      title: { tr: "Dolphin Bar", en: "Dolphin Bar", de: "Dolphin Bar", pl: "Dolphin Bar" },
      location: { tr: "Bar alanı", en: "Bar area", de: "Bar-Bereich", pl: "Strefa baru" },
      slots: [
        {
          name: { tr: "Bar servisi", en: "Bar service", de: "Bar", pl: "Serwis baru" },
          time: "10:00 – 17:00",
          format: { tr: "Bar servisi", en: "Bar service", de: "Bar", pl: "Serwis baru" },
          charge: { tr: "Ücretsiz", en: "Included", de: "Inklusive", pl: "W cenie" },
          res: { tr: "Önceden haber gerekmez", en: "No advance notice needed", de: "Keine Voranmeldung nötig", pl: "Rezerwacja z wyprzedzeniem nie jest wymagana" },
          detail: {
            tr: "Yerel alkollü ve alkolsüz içecekler.",
            en: "Local alcoholic and non-alcoholic drinks.",
            de: "Lokale alkoholische und alkoholfreie Getränke.",
            pl: "Lokalne napoje alkoholowe i bezalkoholowe.",
          },
        },
      ],
    },
    { type: "zoneEnd" },
    {
      type: "rules",
      key: {
        tr:
          "İçecek ve servis kuralları · Alerjen ve genel uyarılar",
        en: "Drink & service rules · Allergens & notices",
        de: "Getränke & Regeln · Hinweise",
        pl: "Zasady napojów i serwisu · Alergeny i informacje",
      },
      bullets: [
        {
          tr:
            "Menümüzdeki bazı yiyecekler Türk Gıda Kodeksi kapsamında alerjen içerebilir. Gıda alerjisi veya özel beslenme ihtiyacı için misafir ilişkileri ile iletişime geçiniz.",
          en:
            "Some dishes may contain allergens under the Turkish Food Codex. For allergies or special diets, contact guest relations.",
          de:
            "Einige Speisen können Allergene enthalten. Bei Allergien oder Diäten: Guest Relations.",
          pl: "Niektóre dania mogą zawierać alergeny zgodnie z tureckim kodeksem żywnościowym. W razie alergii lub diety specjalnej skontaktuj się z relacjami z gośćmi.",
        },
        {
          tr: "Barlardaki içecekler bardak ile servis edilir; şişe ile talep ekstra ücretlidir.",
          en: "Drinks at bars are served in glasses; bottles are charged extra.",
          de: "Getränke im Glas; Flaschen gegen Aufpreis.",
          pl: "W barach napoje podawane są w szklankach; butelki są dodatkowo płatne.",
        },
        {
          tr: "18 yaş altı misafirlere alkollü içecek servisi yapılmaz.",
          en: "Alcoholic drinks are not served to guests under 18.",
          de: "Kein Alkohol unter 18 Jahren.",
          pl: "Napojów alkoholowych nie podaje się gościom poniżej 18 roku życia.",
        },
        {
          tr: "Restoranlarda uygun kıyafet zorunludur; plaj kıyafeti ile gelinmemesi rica olunur.",
          en: "Appropriate dress is required in restaurants; please avoid beachwear.",
          de: "Angemessene Kleidung in Restaurants; bitte keine Strandkleidung.",
          pl: "W restauracjach obowiązuje odpowiedni strój; prosimy unikać stroju plażowego.",
        },
        {
          tr: "Lunch box talepleri en geç 20:00’ye kadar resepsiyona bildirilmelidir.",
          en: "Lunch box requests must be reported to reception by 20:00 at the latest.",
          de: "Lunchbox bitte bis spätestens 20:00 an der Rezeption melden.",
          pl: "Prośby o lunch box należy zgłosić w recepcji najpóźniej do godz. 20:00.",
        },
      ],
    },
  ];

  function renderSlot(slot) {
    var row = document.createElement("div");
    row.className = "venue-slot";
    var head = document.createElement("div");
    head.className = "venue-slot__head";
    var name = document.createElement("span");
    name.className = "venue-slot__name";
    name.textContent = T(slot.name);
    var time = document.createElement("span");
    time.className = "venue-slot__time";
    time.textContent = slot.time;
    head.appendChild(name);
    head.appendChild(time);
    var meta = document.createElement("div");
    meta.className = "venue-slot__meta";
    meta.textContent = T(slot.format);
    var badges = document.createElement("div");
    badges.className = "venue-slot__badges";
    ["charge", "res"].forEach(function (k) {
      if (!slot[k]) return;
      var b = document.createElement("span");
      b.className = "venue-slot__badge";
      b.textContent = T(slot[k]);
      badges.appendChild(b);
    });
    var detail = document.createElement("p");
    detail.className = "venue-slot__detail";
    detail.textContent = T(slot.detail);
    row.appendChild(head);
    row.appendChild(meta);
    row.appendChild(badges);
    row.appendChild(detail);
    return row;
  }

  function renderCard(item) {
    var card = document.createElement("article");
    card.className = "venue-card venue-card--rest";
    var fig = document.createElement("div");
    fig.className = "venue-card__media";
    var img = document.createElement("img");
    img.src = item.img;
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    fig.appendChild(img);
    var body = document.createElement("div");
    body.className = "venue-card__body";
    var h = document.createElement("h3");
    h.className = "venue-card__title";
    h.textContent = T(item.title);
    body.appendChild(h);
    if (item.location) {
      var loc = document.createElement("p");
      loc.className = "venue-card__loc";
      loc.textContent = T(item.location);
      body.appendChild(loc);
    }
    if (item.sub) {
      var sub = document.createElement("p");
      sub.className = "venue-card__sub";
      sub.textContent = T(item.sub);
      body.appendChild(sub);
    }
    var slotsWrap = document.createElement("div");
    slotsWrap.className = "venue-slots";
    item.slots.forEach(function (slot) {
      slotsWrap.appendChild(renderSlot(slot));
    });
    body.appendChild(slotsWrap);
    if (item.action && (item.action.href || item.action.hrefByLang)) {
      var href = item.action.hrefByLang ? pickByLang(item.action.hrefByLang) : item.action.href;
      var dl = item.action.downloadByLang ? pickByLang(item.action.downloadByLang) : item.action.download || "";
      if (href) {
        var actions = document.createElement("div");
        actions.className = "venue-card__actions";
        var cta = document.createElement("a");
        cta.className = "venue-card__cta" + (item.action.icon ? " venue-card__cta--icon" : "");
        cta.href = href;
        if (dl) cta.setAttribute("download", dl);
        cta.setAttribute("target", "_blank");
        cta.setAttribute("rel", "noopener");
        var lbl = T(item.action.label || {});
        cta.setAttribute("aria-label", lbl);
        if (item.action.icon) {
          cta.appendChild(createPdfCtaIcon());
          var span = document.createElement("span");
          span.className = "venue-card__cta-label";
          span.textContent = lbl;
          cta.appendChild(span);
        } else {
          cta.textContent = lbl;
        }
        actions.appendChild(cta);
        body.appendChild(actions);
      }
    }
    card.appendChild(fig);
    card.appendChild(body);
    return card;
  }

  function renderBarExtras(item) {
    var wrap = document.createElement("div");
    wrap.className = "rest-bar-extras rest-bar-extras--import-prices";
    if (item.blockTitle) {
      var bt = document.createElement("h3");
      bt.className = "rest-bar-extras__block-title";
      bt.textContent = T(item.blockTitle);
      wrap.appendChild(bt);
    }
    var intro = document.createElement("p");
    intro.className = "rest-bar-extras__intro";
    intro.textContent = T(item.intro || {});
    var href = pickByLang(item.drink && item.drink.href);
    var dl = pickByLang(item.drink && item.drink.download);
    if (href) {
      var btn = document.createElement("a");
      btn.className = "rest-bar-extras__pdf-btn";
      btn.href = href;
      if (dl) btn.setAttribute("download", dl);
      btn.setAttribute("target", "_blank");
      btn.setAttribute("rel", "noopener");
      var btnLabel = T((item.drink && item.drink.label) || {});
      btn.setAttribute("aria-label", btnLabel);
      btn.appendChild(createPdfCtaIcon());
      var span = document.createElement("span");
      span.textContent = btnLabel;
      btn.appendChild(span);
      wrap.appendChild(intro);
      wrap.appendChild(btn);
    } else {
      wrap.appendChild(intro);
    }
    return wrap;
  }

  function renderRules(item) {
    var box = document.createElement("div");
    box.className = "rest-rules";
    var h = document.createElement("h3");
    h.className = "rest-rules__title";
    h.textContent = T(item.key);
    var ul = document.createElement("ul");
    ul.className = "rest-rules__list";
    item.bullets.forEach(function (b) {
      var li = document.createElement("li");
      li.textContent = T(b);
      ul.appendChild(li);
    });
    box.appendChild(h);
    box.appendChild(ul);
    return box;
  }

  function renderRestaurantModule(container) {
    var root = document.createElement("div");
    root.className = "viona-mod viona-mod--rest";
    var lead = document.createElement("p");
    lead.className = "viona-mod-lead";
    lead.textContent = T({
      tr: "Bu bölümde ana restoran, barlar ve gün içi yemek noktalarının çalışma saatleri ile servis şekilleri özetlenir.",
      en: "Main restaurant, bars and daytime dining — hours and how service works, at a glance.",
      de: "Hauptrestaurant, Bars und Tagesgastronomie — Zeiten und Serviceform kurz zusammengefasst.",
      pl: "Restauracja główna, bary i wyżywienie w ciągu dnia — godziny i forma serwisu w skrócie.",
    });
    root.appendChild(lead);
    var stack = document.createElement("div");
    stack.className = "venue-stack";
    var zoneEl = null;

    SECTIONS.forEach(function (item) {
      if (item.type === "zoneStart") {
        zoneEl = document.createElement("section");
        zoneEl.className = "rest-zone rest-zone--" + item.variant;
        if (item.title) {
          var zt = document.createElement("h2");
          zt.className = "rest-zone__title";
          zt.textContent = T(item.title);
          zoneEl.appendChild(zt);
        }
        stack.appendChild(zoneEl);
        return;
      }
      if (item.type === "zoneEnd") {
        zoneEl = null;
        return;
      }
      var parent = zoneEl || stack;
      if (item.type === "heading") {
        var h2 = document.createElement("h2");
        h2.className = "rest-section-title" + (item.variant === "sub" ? " rest-section-title--sub" : "");
        h2.textContent = T(item.key);
        parent.appendChild(h2);
      } else if (item.type === "barExtras") {
        parent.appendChild(renderBarExtras(item));
      } else if (item.type === "card") {
        parent.appendChild(renderCard(item));
      } else if (item.type === "rules") {
        parent.appendChild(renderRules(item));
      }
    });

    root.appendChild(stack);
    container.appendChild(root);
  }

  window.renderRestaurantModule = renderRestaurantModule;
})();
