(function () {
  "use strict";
  var P = window.VionaContent.pick;

  function T(row) {
    return P(row || {});
  }

  var SECTIONS = [
    {
      type: "card",
      img: "assets/images/rest/anarestaurant-8f4cde02-6c41-4770-9b8c-041525cdc4c9.png",
      title: {
        tr: "Ana Restaurant",
        en: "Main Restaurant",
        de: "Hauptrestaurant",
        ru: "Основной ресторан",
      },
      sub: {
        tr: "Açık büfe · Ana bina",
        en: "Open buffet · Main building",
        de: "Offenes Buffet · Hauptgebäude",
        ru: "Шведский стол · Основной корпус",
      },
      slots: [
        {
          name: { tr: "Kahvaltı", en: "Breakfast", de: "Frühstück", ru: "Завтрак" },
          time: "07:00 – 10:00",
          format: { tr: "Açık büfe", en: "Open buffet", de: "Buffet", ru: "Шведский стол" },
          charge: { tr: "Ücretsiz", en: "Included", de: "Inklusive", ru: "Включено" },
          res: { tr: "Rezervasyon gerekmiyor", en: "No reservation", de: "Keine Reservierung", ru: "Без записи" },
          detail: {
            tr: "Açık büfe servis ve alkolsüz içecekler.",
            en: "Buffet service and non-alcoholic drinks.",
            de: "Buffet und alkoholfreie Getränke.",
            ru: "Шведский стол и безалкогольные напитки.",
          },
        },
        {
          name: { tr: "Geç kahvaltı", en: "Late breakfast", de: "Spätfrühstück", ru: "Поздний завтрак" },
          time: "10:00 – 10:30",
          format: { tr: "Azaltılmış açık büfe", en: "Reduced buffet", de: "Reduziertes Buffet", ru: "Сокращённый стол" },
          charge: { tr: "Ücretsiz", en: "Included", de: "Inklusive", ru: "Включено" },
          res: { tr: "Rezervasyon gerekmiyor", en: "No reservation", de: "Keine Reservierung", ru: "Без записи" },
          detail: {
            tr: "Azaltılmış açık büfe ve alkolsüz içecekler.",
            en: "Reduced buffet and non-alcoholic drinks.",
            de: "Reduziertes Buffet und alkoholfreie Getränke.",
            ru: "Сокращённый стол и безалкогольные напитки.",
          },
        },
        {
          name: { tr: "Öğle yemeği", en: "Lunch", de: "Mittagessen", ru: "Обед" },
          time: "12:30 – 14:00",
          format: { tr: "Açık büfe", en: "Open buffet", de: "Buffet", ru: "Шведский стол" },
          charge: { tr: "Ücretsiz", en: "Included", de: "Inklusive", ru: "Включено" },
          res: { tr: "Rezervasyon gerekmiyor", en: "No reservation", de: "Keine Reservierung", ru: "Без записи" },
          detail: {
            tr: "Açık büfe servis ve yerel alkollü / alkolsüz içecekler.",
            en: "Buffet with local alcoholic and non-alcoholic drinks.",
            de: "Buffet mit lokalen alkoholischen und alkoholfreien Getränken.",
            ru: "Шведский стол, местные алкогольные и безалкогольные напитки.",
          },
        },
        {
          name: { tr: "Akşam yemeği", en: "Dinner", de: "Abendessen", ru: "Ужин" },
          time: "19:00 – 21:00",
          format: { tr: "Açık büfe", en: "Open buffet", de: "Buffet", ru: "Шведский стол" },
          charge: { tr: "Ücretsiz", en: "Included", de: "Inklusive", ru: "Включено" },
          res: { tr: "Rezervasyon gerekmiyor", en: "No reservation", de: "Keine Reservierung", ru: "Без записи" },
          detail: {
            tr: "Açık büfe servis ve yerel alkollü / alkolsüz içecekler.",
            en: "Buffet with local alcoholic and non-alcoholic drinks.",
            de: "Buffet mit lokalen alkoholischen und alkoholfreien Getränken.",
            ru: "Шведский стол, местные алкогольные и безалкогольные напитки.",
          },
        },
        {
          name: { tr: "Mini gece büfesi", en: "Late-night mini buffet", de: "Nachtbuffet", ru: "Поздний ночной буфет" },
          time: "23:30 – 00:00",
          format: { tr: "Gece servisi", en: "Night service", de: "Nachtservice", ru: "Ночное обслуживание" },
          charge: { tr: "Ücretsiz", en: "Included", de: "Inklusive", ru: "Включено" },
          res: { tr: "Rezervasyon gerekmiyor", en: "No reservation", de: "Keine Reservierung", ru: "Без записи" },
          detail: {
            tr: "Gece çorbası ve mini kahvaltı büfesi.",
            en: "Night soup and mini breakfast buffet.",
            de: "Nachtsuppe und kleines Frühstücksbuffet.",
            ru: "Ночной суп и мини-завтрак.",
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
        ru: "Снеки и дневное питание",
      },
    },
    {
      type: "card",
      img: "assets/images/rest/dolphinresandbar-d65f4aa4-19c9-47e8-9c76-9fbdcfda7433.png",
      title: { tr: "Dolphin Snack", en: "Dolphin Snack", de: "Dolphin Snack", ru: "Dolphin Snack" },
      location: {
        tr: "C Blok · Havuz kenarı · Snack alanı",
        en: "Block C · Poolside · Snack area",
        de: "Block C · Poolseite",
        ru: "Блок С · у бассейна",
      },
      slots: [
        {
          name: { tr: "Gün içi servis", en: "Daytime service", de: "Tagservice", ru: "Дневное обслуживание" },
          time: "12:00 – 16:00",
          format: { tr: "Hızlı servis · hafif atıştırmalık", en: "Quick service · light snacks", de: "Schnellservice", ru: "Быстрое обслуживание" },
          charge: { tr: "Ücretsiz", en: "Included", de: "Inklusive", ru: "Включено" },
          res: { tr: "Rezervasyon gerekmiyor", en: "No reservation", de: "Keine Reservierung", ru: "Без записи" },
          detail: {
            tr: "Pizza, hamburger, hot dog, nugget, patates kızartması ve çeşitli hafif atıştırmalıklar.",
            en: "Pizza, burgers, hot dogs, nuggets, fries and assorted light snacks.",
            de: "Pizza, Burger, Hot Dogs, Nuggets, Pommes und weitere Snacks.",
            ru: "Пицца, бургеры, хот-доги, наггетсы, картофель фри и закуски.",
          },
        },
      ],
    },
    {
      type: "card",
      img: "assets/images/rest/imbissnack-64ad19b9-7533-476e-9f04-ca3bc28f5850.png",
      title: { tr: "Beach Imbiss", en: "Beach Snack", de: "Strand-Snack", ru: "Пляжный снек" },
      location: {
        tr: "Plaj · Snack (sahil)",
        en: "Beach · Shore snack point",
        de: "Strand",
        ru: "Пляж",
      },
      slots: [
        {
          name: { tr: "Yiyecek servisi", en: "Food service", de: "Essen", ru: "Еда" },
          time: "12:00 – 16:00",
          format: { tr: "Hızlı servis", en: "Quick service", de: "Schnellservice", ru: "Быстрое обслуживание" },
          charge: { tr: "Ücretsiz", en: "Included", de: "Inklusive", ru: "Включено" },
          res: { tr: "Rezervasyon gerekmiyor", en: "No reservation", de: "Keine Reservierung", ru: "Без записи" },
          detail: {
            tr: "Patates kızartması, sosisli sandviç, gözleme.",
            en: "Fries, sausage sandwich, gözleme.",
            de: "Pommes, Wurst-Sandwich, Gözleme.",
            ru: "Картофель фри, сэндвич с сосиской, гёзлеме.",
          },
        },
        {
          name: { tr: "İçecek servisi bar", en: "Drinks bar", de: "Getränkebar", ru: "Бар напитков" },
          time: "10:00 – 17:00",
          format: { tr: "İçecek servisi", en: "Drinks service", de: "Getränke", ru: "Напитки" },
          charge: { tr: "Ücretsiz", en: "Included", de: "Inklusive", ru: "Включено" },
          res: { tr: "Rezervasyon gerekmiyor", en: "No reservation", de: "Keine Reservierung", ru: "Без записи" },
          detail: {
            tr: "Bira, çay, kahve, konsantre meyve suyu, gazlı içecekler, su, ayran.",
            en: "Beer, tea, coffee, concentrated juices, soft drinks, water, ayran.",
            de: "Bier, Tee, Kaffee, Fruchtsaftkonzentrate, Limonaden, Wasser, Ayran.",
            ru: "Пиво, чай, кофе, соки, газировка, вода, айран.",
          },
        },
      ],
    },
    {
      type: "card",
      img: "assets/images/rest/gustosnack-6162dfea-ef2d-434c-b3b8-ca5c2ad10d26.png",
      title: { tr: "Gusto Snack", en: "Gusto Snack", de: "Gusto Snack", ru: "Gusto Snack" },
      location: { tr: "Snack alanı · masaya servis", en: "Snack area · table service", de: "Snack-Bereich", ru: "Зона снеков" },
      slots: [
        {
          name: { tr: "Servis", en: "Service", de: "Service", ru: "Сервис" },
          time: "11:00 – 18:00",
          format: { tr: "Masaya servis", en: "Table service", de: "Bedienung", ru: "К столу" },
          charge: { tr: "Ücretsiz", en: "Included", de: "Inklusive", ru: "Включено" },
          res: { tr: "Rezervasyon gerekmiyor", en: "No reservation", de: "Keine Reservierung", ru: "Без записи" },
          detail: {
            tr: "Atıştırmalık yiyecekler.",
            en: "Snack foods.",
            de: "Snacks.",
            ru: "Закуски.",
          },
        },
      ],
    },
    {
      type: "card",
      img: "assets/images/rest/libum-e2326908-0c8b-4197-8ae1-fccf5c59878d.png",
      title: { tr: "Libum Cafe", en: "Libum Cafe", de: "Libum Cafe", ru: "Libum Cafe" },
      location: {
        tr: "Kafe / pastane · self servis",
        en: "Café / patisserie · self-service",
        de: "Café · Selbstbedienung",
        ru: "Кафе / кондитерская",
      },
      slots: [
        {
          name: { tr: "Servis", en: "Service", de: "Service", ru: "Сервис" },
          time: "11:00 – 18:00",
          format: { tr: "Self servis", en: "Self-service", de: "Selbstbedienung", ru: "Самообслуживание" },
          charge: { tr: "Ücretsiz", en: "Included", de: "Inklusive", ru: "Включено" },
          res: { tr: "Rezervasyon gerekmiyor", en: "No reservation", de: "Keine Reservierung", ru: "Без записи" },
          detail: {
            tr: "Çay, kahve, konsantre meyve suyu, gazlı içecekler, su; pasta, kek, kurabiye çeşitleri; atıştırmalık yiyecekler.",
            en: "Tea, coffee, concentrated juices, soft drinks, water; cakes, pastries, cookies; snacks.",
            de: "Tee, Kaffee, Fruchtsaftkonzentrate, Limonaden, Wasser; Kuchen, Gebäck; Snacks.",
            ru: "Чай, кофе, соки, газировка, вода; торты, печенье; закуски.",
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
        ru: "Moss Beach Restaurant & Bar",
      },
      location: { tr: "Sahilde · masaya servis", en: "Beachfront · table service", de: "Am Strand", ru: "На пляже" },
      action: {
        label: {
          tr: "Menüye Ulaşın",
          en: "Open Menu",
          de: "Menü Öffnen",
          ru: "Открыть меню",
        },
        href: "assets/docs/moss-beach-menu.pdf",
        download: "moss-beach-menu.pdf",
      },
      slots: [
        {
          name: { tr: "Bar ve snack", en: "Bar & snack", de: "Bar & Snack", ru: "Бар и снек" },
          time: "10:00 – 19:00",
          format: { tr: "Bar ve snack servisi", en: "Bar and snack service", de: "Bar- und Snackservice", ru: "Бар и закуски" },
          charge: { tr: "Ücretli", en: "Paid", de: "Kostenpflichtig", ru: "Платно" },
          res: { tr: "Rezervasyon gerekmiyor", en: "Reservation required", de: "Reservierung nötig", ru: "Нужна запись" },
          detail: {
            tr: "Ev yapımı yiyecekler; alkollü ve alkolsüz içecekler.",
            en: "Homemade food; alcoholic and non-alcoholic drinks.",
            de: "Hausgemachte Speisen; alkoholische und alkoholfreie Getränke.",
            ru: "Домашняя кухня; алкогольные и безалкогольные напитки.",
          },
        },
      ],
    },
    {
      type: "heading",
      key: {
        tr: "Barlar",
        en: "Bars",
        de: "Bars",
        ru: "Бары",
      },
    },
    {
      type: "card",
      img: "assets/images/rest/poolbar-1328efd6-bd3d-4fc1-a2ad-7a54cb8ebfb8.png",
      title: { tr: "Havuz Bar", en: "Pool Bar", de: "Pool Bar", ru: "Бар у бассейна" },
      location: { tr: "Havuz kenarında", en: "Poolside", de: "Am Pool", ru: "У бассейна" },
      slots: [
        {
          name: { tr: "Bar servisi", en: "Bar service", de: "Bar", ru: "Бар" },
          time: "10:00 – 00:00",
          format: { tr: "Bar servisi", en: "Bar service", de: "Bar", ru: "Обслуживание в баре" },
          charge: { tr: "Ücretsiz", en: "Included", de: "Inklusive", ru: "Включено" },
          res: { tr: "Rezervasyon gerekmiyor", en: "No reservation", de: "Keine Reservierung", ru: "Без записи" },
          detail: {
            tr: "Yerel alkollü ve alkolsüz içecekler.",
            en: "Local alcoholic and non-alcoholic drinks.",
            de: "Lokale alkoholische und alkoholfreie Getränke.",
            ru: "Местные алкогольные и безалкогольные напитки.",
          },
        },
        {
          name: { tr: "Dondurma servisi", en: "Ice cream service", de: "Eisservice", ru: "Мороженое" },
          time: "15:00 – 17:00",
          format: { tr: "Havuz Bar", en: "At Pool Bar", de: "Pool Bar", ru: "У бассейна" },
          charge: { tr: "Ücretsiz", en: "Included", de: "Inklusive", ru: "Включено" },
          res: { tr: "Rezervasyon gerekmiyor", en: "No reservation", de: "Keine Reservierung", ru: "Без записи" },
          detail: {
            tr: "Dondurma çeşitleri.",
            en: "Assorted ice cream.",
            de: "Eissorten.",
            ru: "Ассорти мороженого.",
          },
        },
      ],
    },
    {
      type: "card",
      img: "assets/images/rest/lobibar-8b3f3aac-f8ab-4421-84c5-e32fab6caab0.png",
      title: { tr: "Lobby Bar", en: "Lobby Bar", de: "Lobby Bar", ru: "Лобби-бар" },
      location: { tr: "Lobide", en: "In the lobby", de: "In der Lobby", ru: "В лобби" },
      slots: [
        {
          name: { tr: "Bar servisi", en: "Bar service", de: "Bar", ru: "Бар" },
          time: "10:00 – 00:00",
          format: { tr: "Bar servisi", en: "Bar service", de: "Bar", ru: "Бар" },
          charge: { tr: "Ücretsiz", en: "Included", de: "Inklusive", ru: "Включено" },
          res: { tr: "Rezervasyon gerekmiyor", en: "No reservation", de: "Keine Reservierung", ru: "Без записи" },
          detail: {
            tr: "Yerel alkollü ve alkolsüz içecekler; Türk kahvesi.",
            en: "Local alcoholic and non-alcoholic drinks; Turkish coffee.",
            de: "Lokale Getränke; türkischer Kaffee.",
            ru: "Местные напитки; турецкий кофе.",
          },
        },
      ],
    },
    {
      type: "card",
      img: "assets/images/rest/aquabar-918957cf-8651-424d-8ccd-eaeba70c5d44.png",
      title: { tr: "Aqua Bar", en: "Aqua Bar", de: "Aqua Bar", ru: "Aqua Bar" },
      location: { tr: "Aquapark", en: "Aquapark", de: "Aquapark", ru: "Аквапарк" },
      slots: [
        {
          name: { tr: "Bar servisi", en: "Bar service", de: "Bar", ru: "Бар" },
          time: "10:00 – 18:00 · 20:00 – 23:00",
          format: { tr: "Bar servisi", en: "Bar service", de: "Bar", ru: "Бар" },
          charge: { tr: "Ücretsiz", en: "Included", de: "Inklusive", ru: "Включено" },
          res: { tr: "Rezervasyon gerekmiyor", en: "No reservation", de: "Keine Reservierung", ru: "Без записи" },
          detail: {
            tr: "Yerel alkollü ve alkolsüz içecekler.",
            en: "Local alcoholic and non-alcoholic drinks.",
            de: "Lokale alkoholische und alkoholfreie Getränke.",
            ru: "Местные алкогольные и безалкогольные напитки.",
          },
        },
      ],
    },
    {
      type: "card",
      img: "assets/images/rest/dolphinresandbar-d65f4aa4-19c9-47e8-9c76-9fbdcfda7433.png",
      title: { tr: "Dolphin Bar", en: "Dolphin Bar", de: "Dolphin Bar", ru: "Dolphin Bar" },
      location: { tr: "Bar alanı", en: "Bar area", de: "Bar-Bereich", ru: "Барная зона" },
      slots: [
        {
          name: { tr: "Bar servisi", en: "Bar service", de: "Bar", ru: "Бар" },
          time: "10:00 – 17:00",
          format: { tr: "Bar servisi", en: "Bar service", de: "Bar", ru: "Бар" },
          charge: { tr: "Ücretsiz", en: "Included", de: "Inklusive", ru: "Включено" },
          res: { tr: "Rezervasyon gerekmiyor", en: "No reservation", de: "Keine Reservierung", ru: "Без записи" },
          detail: {
            tr: "Yerel alkollü ve alkolsüz içecekler.",
            en: "Local alcoholic and non-alcoholic drinks.",
            de: "Lokale alkoholische und alkoholfreie Getränke.",
            ru: "Местные алкогольные и безалкогольные напитки.",
          },
        },
      ],
    },
    {
      type: "rules",
      key: {
        tr:
          "İçecek ve servis kuralları · Alerjen ve genel uyarılar",
        en: "Drink & service rules · Allergens & notices",
        de: "Getränke & Regeln · Hinweise",
        ru: "Правила · Аллергены",
      },
      bullets: [
        {
          tr:
            "Menümüzdeki bazı yiyecekler Türk Gıda Kodeksi kapsamında alerjen içerebilir. Gıda alerjisi veya özel beslenme ihtiyacı için misafir ilişkileri ile iletişime geçiniz.",
          en:
            "Some dishes may contain allergens under the Turkish Food Codex. For allergies or special diets, contact guest relations.",
          de:
            "Einige Speisen können Allergene enthalten. Bei Allergien oder Diäten: Guest Relations.",
          ru:
            "В блюдах могут быть аллергены. При аллергии или диете — guest relations.",
        },
        {
          tr: "Barlardaki içecekler bardak ile servis edilir; şişe ile talep ekstra ücretlidir.",
          en: "Drinks at bars are served in glasses; bottles are charged extra.",
          de: "Getränke im Glas; Flaschen gegen Aufpreis.",
          ru: "Напитки в бокалах; бутылки — доплата.",
        },
        {
          tr: "18 yaş altı misafirlere alkollü içecek servisi yapılmaz.",
          en: "Alcoholic drinks are not served to guests under 18.",
          de: "Kein Alkohol unter 18 Jahren.",
          ru: "Алкоголь не подаётся лицам младше 18 лет.",
        },
        {
          tr: "Restoranlarda uygun kıyafet zorunludur; plaj kıyafeti ile gelinmemesi rica olunur.",
          en: "Appropriate dress is required in restaurants; please avoid beachwear.",
          de: "Angemessene Kleidung in Restaurants; bitte keine Strandkleidung.",
          ru: "В ресторанах — подходящая одежда; не в пляжной одежде.",
        },
        {
          tr: "Lunch box talepleri en geç 20:00’ye kadar resepsiyona bildirilmelidir.",
          en: "Lunch box requests must be reported to reception by 20:00 at the latest.",
          de: "Lunchbox bitte bis spätestens 20:00 an der Rezeption melden.",
          ru: "Ланч-бокс — сообщить на ресепшене до 20:00.",
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
    if (item.action && item.action.href) {
      var actions = document.createElement("div");
      actions.className = "venue-card__actions";
      var cta = document.createElement("a");
      cta.className = "venue-card__cta";
      cta.href = item.action.href;
      cta.setAttribute("download", item.action.download || "");
      cta.setAttribute("target", "_blank");
      cta.setAttribute("rel", "noopener");
      cta.textContent = T(item.action.label || {});
      actions.appendChild(cta);
      body.appendChild(actions);
    }
    card.appendChild(fig);
    card.appendChild(body);
    return card;
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
      ru: "Основной ресторан, бары и дневное питание — часы и формат обслуживания в кратком виде.",
    });
    root.appendChild(lead);
    var stack = document.createElement("div");
    stack.className = "venue-stack";

    SECTIONS.forEach(function (item) {
      if (item.type === "heading") {
        var h2 = document.createElement("h2");
        h2.className = "rest-section-title";
        h2.textContent = T(item.key);
        stack.appendChild(h2);
      } else if (item.type === "card") {
        stack.appendChild(renderCard(item));
      } else if (item.type === "rules") {
        stack.appendChild(renderRules(item));
      }
    });

    root.appendChild(stack);
    container.appendChild(root);
  }

  window.renderRestaurantModule = renderRestaurantModule;
})();
