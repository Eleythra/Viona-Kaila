(function () {
  "use strict";
  var P = window.VionaContent.pick;

  function T(row) {
    return P(row || {});
  }

  var SINTON_MENU_PDF = {
    tr: "assets/docs/sinton-menu-tr.pdf",
    en: "assets/docs/sinton-menu-en.pdf",
    ru: "assets/docs/sinton-menu-ru.pdf",
  };

  function normLang(code) {
    var c = String(code || "tr").toLowerCase();
    if (c === "en" || c === "de" || c === "ru") return c;
    return "tr";
  }

  function sintonMenuHref(lang) {
    var L = normLang(lang);
    if (L === "de") L = "en";
    return SINTON_MENU_PDF[L] || SINTON_MENU_PDF.tr;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  var INTRO = {
    tr:
      "La Terrace ve Sinton BBQ, otelimizin à la carte deneyimleridir; her birinin ücretlendirmesi ve yoğunluk yönetimi farklıdır. Özellikle La Terrace A La Carte için masa ve akşam akışı Misafir İlişkileri (Guest Relations) ekibimizle zarif ve eksiksiz şekilde planlanır — böylece siz sadece anın tadını çıkarırsınız. Özet bilgiler aşağıdadır.",
    en:
      "La Terrace and Sinton BBQ are our à la carte venues, each with its own pricing and capacity rhythm. For La Terrace A La Carte in particular, seating and the evening flow are arranged with care through Guest Relations — so you can simply enjoy the moment. Summaries below.",
    de:
      "La Terrace und Sinton BBQ sind unsere À-la-carte-Adressen — mit jeweils eigenen Preisen und Kapazitätslogik. Für La Terrace A La Carte koordiniert unser Guest-Relations-Team Tisch und Ablauf diskret und reibungslos, damit Sie den Abend genießen können. Unten die Kurzinfos.",
    ru:
      "La Terrace и Sinton BBQ — наши à la carte площадки с разными ценами и логистикой загрузки. Для La Terrace A La Carte рассадка и вечерний сервис выстраиваются бережно через Guest Relations — вам остаётся только наслаждаться вечером. Кратко ниже.",
  };

  var BADGE_PAID = {
    tr: "Ücretli",
    en: "Charged",
    de: "Kostenpflichtig",
    ru: "Платно",
  };

  var BADGE_RES_REQUIRED = {
    tr: "Misafir İlişkileri ile önceden planlanır",
    en: "Arranged in advance with Guest Relations",
    de: "Nach Rücksprache mit dem Guest-Relations-Team",
    ru: "По предварительной договорённости через Guest Relations",
  };

  function renderSlot(slot) {
    var row = el("div", "venue-slot");
    var head = el("div", "venue-slot__head");
    head.appendChild(el("span", "venue-slot__name", T(slot.name)));
    if (slot.time) {
      head.appendChild(el("span", "venue-slot__time", slot.time));
    }
    row.appendChild(head);
    row.appendChild(el("div", "venue-slot__meta", T(slot.format)));
    var badges = el("div", "venue-slot__badges");
    if (slot.charge) {
      badges.appendChild(el("span", "venue-slot__badge", T(slot.charge)));
    }
    if (slot.res) {
      badges.appendChild(el("span", "venue-slot__badge", T(slot.res)));
    }
    if (slot.extraBadges) {
      slot.extraBadges.forEach(function (b) {
        badges.appendChild(el("span", "venue-slot__badge venue-slot__badge--accent", T(b)));
      });
    }
    row.appendChild(badges);
    row.appendChild(el("p", "venue-slot__detail", T(slot.detail)));
    return row;
  }

  var CARDS = [
    {
      img: "assets/images/alacarte/terrace-1.png",
      alt: {
        tr: "La Terrace a la carte restoran",
        en: "La Terrace à la carte restaurant",
        de: "Restaurant La Terrace",
        ru: "Ресторан La Terrace",
      },
      title: {
        tr: "La Terrace A La Carte Restaurant",
        en: "La Terrace A La Carte Restaurant",
        de: "La Terrace A La Carte Restaurant",
        ru: "La Terrace A La Carte Restaurant",
      },
      sub: {
        tr: "A La Carte · Menü servisi",
        en: "À la carte · Table service",
        de: "À la carte · Menüservice",
        ru: "À la carte · обслуживание",
      },
      slots: [
        {
          name: {
            tr: "La Terrace A La Carte Restaurant",
            en: "La Terrace A La Carte Restaurant",
            de: "La Terrace A La Carte Restaurant",
            ru: "La Terrace A La Carte Restaurant",
          },
          time: "18:30 – 20:30",
          format: {
            tr: "A La Carte restoran · Menü servisi",
            en: "À la carte restaurant · Table service",
            de: "À-la-carte-Restaurant · Menüservice",
            ru: "Ресторан à la carte · обслуживание",
          },
          charge: BADGE_PAID,
          res: BADGE_RES_REQUIRED,
          detail: {
            tr: "5 gece ve üzeri konaklamalarda 1 kez ücretsiz. 18:30 – 20:30 arası hizmet verir.",
            en: "One complimentary visit for stays of 5 nights or more. Service hours: 18:30 – 20:30.",
            de: "Bei Aufenthalten ab 5 Nächten einmal kostenfrei. Servicezeit: 18:30 – 20:30.",
            ru: "При проживании от 5 ночей — один раз бесплатно. Часы работы: 18:30 – 20:30.",
          },
        },
      ],
    },
    {
      img: "assets/images/alacarte/sinton-1.png",
      alt: {
        tr: "Sinton BBQ Restaurant",
        en: "Sinton BBQ Restaurant",
        de: "Sinton BBQ Restaurant",
        ru: "Sinton BBQ Restaurant",
      },
      title: {
        tr: "Sinton BBQ Restaurant",
        en: "Sinton BBQ Restaurant",
        de: "Sinton BBQ Restaurant",
        ru: "Sinton BBQ Restaurant",
      },
      sub: {
        tr: "Amerikan BBQ · Kokteyl",
        en: "American BBQ · Cocktails",
        de: "Amerikanisches BBQ · Cocktails",
        ru: "Американское BBQ · коктейли",
      },
      menuKey: "sinton",
      slots: [
        {
          name: {
            tr: "Sinton BBQ Restaurant",
            en: "Sinton BBQ Restaurant",
            de: "Sinton BBQ Restaurant",
            ru: "Sinton BBQ Restaurant",
          },
          time: "13:00 – 22:00",
          format: {
            tr: "A La Carte restoran · Menü servisi · Otel misafirleri ve dışarıdan gelenlere açık",
            en: "À la carte restaurant · Table service · Open to hotel guests and visitors",
            de: "À-la-carte-Restaurant · Menüservice · für Hotelgäste und externe Gäste",
            ru: "Ресторан à la carte · для гостей отеля и посетителей",
          },
          charge: BADGE_PAID,
          extraBadges: [
            {
              tr: "Kaila misafirlerine %10 indirim",
              en: "10% off for Kaila guests",
              de: "10 % Rabatt für Kaila-Gäste",
              ru: "Скидка 10% для гостей Kaila",
            },
          ],
          detail: {
            tr:
              "Amerikan usulü füme etler, hamburgerler ve imza kokteyller. Çalışma günleri: Pazartesi hariç.",
            en:
              "American-style smoked meats, burgers and signature cocktails. Open daily except Mondays.",
            de:
              "Amerikanisch geräucherte Fleischspezialitäten, Burger und Signature-Cocktails. Außer montags geöffnet.",
            ru:
              "Копчёные блюда в американском стиле, бургеры и авторские коктейли. Выходной — понедельник.",
          },
        },
      ],
    },
  ];

  function renderCard(item, t, lang) {
    var card = el("article", "venue-card venue-card--rest alacarte-card");
    var fig = el("div", "venue-card__media");
    var img = document.createElement("img");
    img.src = item.img;
    img.alt = T(item.alt);
    img.loading = "lazy";
    img.decoding = "async";
    fig.appendChild(img);
    var body = el("div", "venue-card__body");
    body.appendChild(el("h3", "venue-card__title", T(item.title)));
    if (item.sub) {
      body.appendChild(el("p", "venue-card__sub", T(item.sub)));
    }
    var slotsWrap = el("div", "venue-slots");
    item.slots.forEach(function (slot) {
      slotsWrap.appendChild(renderSlot(slot));
    });
    body.appendChild(slotsWrap);

    if (item.menuKey === "sinton" && typeof t === "function") {
      var menuRow = el("div", "alacarte-menu-cta");
      var a = document.createElement("a");
      a.className = "alacarte-menu-cta__btn";
      a.href = sintonMenuHref(lang);
      a.setAttribute("download", "");
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.setAttribute("aria-label", t("alacarteSintonMenuAria"));
      var ico = el("span", "alacarte-menu-cta__ico");
      ico.setAttribute("aria-hidden", "true");
      ico.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
      a.appendChild(ico);
      a.appendChild(el("span", "alacarte-menu-cta__label", t("alacarteSintonMenuCta")));
      menuRow.appendChild(a);
      body.appendChild(menuRow);
    }

    card.appendChild(fig);
    card.appendChild(body);
    return card;
  }

  function renderAlacarteModule(container, t, lang) {
    var root = el("div", "viona-mod viona-mod--alacarte");
    var stored = "tr";
    try {
      if (typeof localStorage !== "undefined") {
        var s = localStorage.getItem("viona_lang");
        if (s) stored = s;
      }
    } catch (e) {
      /* no-op */
    }
    var L = lang != null && lang !== "" ? lang : normLang(stored);

    var intro = el("div", "alacarte-intro");
    intro.appendChild(el("p", "alacarte-intro__p", T(INTRO)));
    root.appendChild(intro);

    var stack = el("div", "venue-stack");
    CARDS.forEach(function (item) {
      stack.appendChild(renderCard(item, t, L));
    });
    root.appendChild(stack);

    container.appendChild(root);
  }

  window.renderAlacarteModule = renderAlacarteModule;
})();
