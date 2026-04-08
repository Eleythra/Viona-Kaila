(function () {
  "use strict";
  var P = window.VionaContent.pick;

  function T(row) {
    return P(row || {});
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  var INTRO = {
    tr:
      "Minik misafirlerimiz, gün boyu kahkaha, yaratıcılık ve eğlencenin bir arada olduğu Jammies Kids Club’da doyasıya vakit geçirebilir. Açık hava oyun alanı ve gözetmenler eşliğinde yapılan aktiviteler sayesinde çocuklar da en az aileleri kadar unutulmaz bir tatil yaşar.",
    en:
      "Our youngest guests can enjoy a full day of laughter, creativity and fun at Jammies Kids Club. With outdoor play and supervised activities, children have a holiday to remember — just like their parents.",
    de:
      "Unsere kleinen Gäste erleben im Jammies Kids Club den ganzen Tag Lachen, Kreativität und Spaß. Mit Aktivitäten im Freien und unter Aufsicht wird der Urlaub für Kinder ebenso unvergesslich wie für die Familie.",
    ru:
      "Маленькие гости целый день смеются, творят и веселятся в Jammies Kids Club. Занятия на свежем воздухе под присмотром — и отдых для детей так же яркий, как для родителей.",
  };

  var BADGE_FREE = {
    tr: "Ücretsiz",
    en: "Included",
    de: "Kostenlos",
    ru: "Бесплатно",
  };

  var BADGE_NO_RES = {
    tr: "Önceden haber gerekmez",
    en: "No advance notice needed",
    de: "Keine Voranmeldung nötig",
    ru: "Без предварительной договорённости",
  };

  function renderSlot(slot) {
    var row = el("div", "venue-slot");
    var head = el("div", "venue-slot__head");
    var name = el("span", "venue-slot__name", T(slot.name));
    var time = el("span", "venue-slot__time", slot.time);
    head.appendChild(name);
    head.appendChild(time);
    var meta = el("div", "venue-slot__meta", T(slot.format));
    var badges = el("div", "venue-slot__badges");
    if (slot.charge) {
      var b1 = el("span", "venue-slot__badge", T(slot.charge));
      badges.appendChild(b1);
    }
    if (slot.res) {
      var b2 = el("span", "venue-slot__badge", T(slot.res));
      badges.appendChild(b2);
    }
    var detail = el("p", "venue-slot__detail", T(slot.detail));
    row.appendChild(head);
    row.appendChild(meta);
    row.appendChild(badges);
    row.appendChild(detail);
    return row;
  }

  var CARDS = [
    {
      img: "assets/images/miniclub/club-1.png",
      alt: {
        tr: "Jammies Kids Club iç mekân ve aktivite alanı",
        en: "Jammies Kids Club indoor activity area",
        de: "Jammies Kids Club Innenbereich",
        ru: "Jammies Kids Club — зона активности",
      },
      title: {
        tr: "Jammies Kids Club",
        en: "Jammies Kids Club",
        de: "Jammies Kids Club",
        ru: "Jammies Kids Club",
      },
      sub: {
        tr: "Mini Club · Aktivite alanı · 4–12 yaş",
        en: "Mini Club · Activity area · Ages 4–12",
        de: "Mini Club · Aktivitätsbereich · 4–12 Jahre",
        ru: "Мини-клуб · зона активности · 4–12 лет",
      },
      slots: [
        {
          name: { tr: "Çocuk Kulübü", en: "Kids Club", de: "Kids Club", ru: "Детский клуб" },
          time: "10:00 – 12:30",
          format: {
            tr: "Mini Club · Aktivite alanı",
            en: "Mini Club · Activity area",
            de: "Mini Club · Aktivitätsbereich",
            ru: "Мини-клуб · зона активности",
          },
          charge: BADGE_FREE,
          res: BADGE_NO_RES,
          detail: {
            tr: "4–12 yaş çocuklar için mini club aktiviteleri.",
            en: "Mini club activities for children aged 4–12.",
            de: "Mini-Club-Aktivitäten für Kinder von 4–12 Jahren.",
            ru: "Активности мини-клуба для детей 4–12 лет.",
          },
        },
        {
          name: { tr: "Çocuk Kulübü", en: "Kids Club", de: "Kids Club", ru: "Детский клуб" },
          time: "14:30 – 17:00",
          format: {
            tr: "Mini Club · Aktivite alanı",
            en: "Mini Club · Activity area",
            de: "Mini Club · Aktivitätsbereich",
            ru: "Мини-клуб · зона активности",
          },
          charge: BADGE_FREE,
          res: BADGE_NO_RES,
          detail: {
            tr: "4–12 yaş çocuklar için mini club aktiviteleri.",
            en: "Mini club activities for children aged 4–12.",
            de: "Mini-Club-Aktivitäten für Kinder von 4–12 Jahren.",
            ru: "Активности мини-клуба для детей 4–12 лет.",
          },
        },
      ],
    },
    {
      img: "assets/images/miniclub/club-2.png",
      alt: {
        tr: "Mini disko ve gösteri alanı",
        en: "Mini disco and show area",
        de: "Mini-Disco und Showbereich",
        ru: "Мини-диско и зона шоу",
      },
      title: { tr: "Mini Disco", en: "Mini Disco", de: "Mini-Disco", ru: "Мини-диско" },
      sub: {
        tr: "Amfi / gösteri alanı · Eğlence aktivitesi · 4–12 yaş",
        en: "Amphitheatre / show area · Entertainment · Ages 4–12",
        de: "Amphitheater / Show · Unterhaltung · 4–12 Jahre",
        ru: "Амфитеатр / шоу · развлечение · 4–12 лет",
      },
      slots: [
        {
          name: { tr: "Mini Disco", en: "Mini Disco", de: "Mini-Disco", ru: "Мини-диско" },
          time: "20:45 – 21:00",
          format: {
            tr: "Amfi / gösteri alanı · Eğlence aktivitesi",
            en: "Amphitheatre / show area · Entertainment activity",
            de: "Amphitheater · Show · Unterhaltung",
            ru: "Амфитеатр · развлекательная активность",
          },
          charge: BADGE_FREE,
          res: BADGE_NO_RES,
          detail: {
            tr: "4–12 yaş çocuklar için mini disko etkinliği.",
            en: "Mini disco for children aged 4–12.",
            de: "Mini-Disco für Kinder von 4–12 Jahren.",
            ru: "Мини-диско для детей 4–12 лет.",
          },
        },
      ],
    },
    {
      img: "assets/images/miniclub/playground.png",
      alt: {
        tr: "Çocuk oyun parkı ve açık alan",
        en: "Children’s playground and outdoor area",
        de: "Kinderspielplatz im Freien",
        ru: "Детская игровая площадка",
      },
      title: {
        tr: "Çocuk oyun parkı",
        en: "Children’s playground",
        de: "Kinderspielplatz",
        ru: "Детская площадка",
      },
      sub: {
        tr: "Açık alan · Oyun alanı",
        en: "Outdoor · Play area",
        de: "Freiluft · Spielbereich",
        ru: "Открытая зона · игровая площадка",
      },
      slots: [
        {
          name: {
            tr: "Çocuk oyun parkı",
            en: "Children’s playground",
            de: "Kinderspielplatz",
            ru: "Детская площадка",
          },
          time: "07:00 – 21:00",
          format: {
            tr: "Açık alan · Oyun alanı",
            en: "Outdoor area · Play area",
            de: "Freiluft · Spielbereich",
            ru: "Открытая зона · игровая площадка",
          },
          charge: BADGE_FREE,
          res: BADGE_NO_RES,
          detail: {
            tr: "Çocuklar su ve oyun ekipmanı yakınında yalnız bırakılmamalıdır.",
            en: "Children must not be left unattended near water or play equipment.",
            de: "Kinder dürfen in Wasser- und Spielnähe nicht unbeaufsichtigt gelassen werden.",
            ru: "Не оставляйте детей без присмотра у воды и на площадке.",
          },
        },
      ],
    },
  ];

  function renderCard(item) {
    var card = el("article", "venue-card venue-card--rest");
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
    card.appendChild(fig);
    card.appendChild(body);
    return card;
  }

  function renderMiniclubModule(container) {
    var root = el("div", "viona-mod viona-mod--miniclub");

    root.appendChild(
      el("p", "rest-section-title", T({ tr: "Çocuk ve animasyon aktiviteleri", en: "Kids & animation", de: "Kinder & Animation", ru: "Детям и анимация" }))
    );

    var intro = el("div", "miniclub-intro");
    intro.appendChild(el("p", "miniclub-intro__p", T(INTRO)));
    root.appendChild(intro);

    var stack = el("div", "venue-stack");
    CARDS.forEach(function (item) {
      stack.appendChild(renderCard(item));
    });
    root.appendChild(stack);

    container.appendChild(root);
  }

  window.renderMiniclubModule = renderMiniclubModule;
})();
