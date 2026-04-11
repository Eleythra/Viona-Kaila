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
    pl: "Nasi najmłodsi goście mogą spędzić cały dzień pełen śmiechu, kreatywności i zabawy w Jammies Kids Club. Z zabawą na świeżym powietrzu i aktywnościami pod opieką dzieci mają wakacje do zapamiętania — tak jak ich rodzice.",
  };

  var BADGE_FREE = {
    tr: "Ücretsiz",
    en: "Included",
    de: "Kostenlos",
    pl: "W cenie",
  };

  var BADGE_NO_RES = {
    tr: "Önceden haber gerekmez",
    en: "No advance notice needed",
    de: "Keine Voranmeldung nötig",
    pl: "Rezerwacja z wyprzedzeniem nie jest wymagana",
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
        pl: "Jammies Kids Club — strefa aktywności wewnątrz",
      },
      title: {
        tr: "Jammies Kids Club",
        en: "Jammies Kids Club",
        de: "Jammies Kids Club",
        pl: "Jammies Kids Club",
      },
      sub: {
        tr: "Mini Club · Aktivite alanı · 4–12 yaş",
        en: "Mini Club · Activity area · Ages 4–12",
        de: "Mini Club · Aktivitätsbereich · 4–12 Jahre",
        pl: "Mini Club · strefa aktywności · wiek 4–12",
      },
      slots: [
        {
          name: { tr: "Çocuk Kulübü", en: "Kids Club", de: "Kids Club", pl: "Klub dziecięcy" },
          time: "10:00 – 12:30",
          format: {
            tr: "Mini Club · Aktivite alanı",
            en: "Mini Club · Activity area",
            de: "Mini Club · Aktivitätsbereich",
            pl: "Mini Club · strefa aktywności",
          },
          charge: BADGE_FREE,
          res: BADGE_NO_RES,
          detail: {
            tr: "4–12 yaş çocuklar için mini club aktiviteleri.",
            en: "Mini club activities for children aged 4–12.",
            de: "Mini-Club-Aktivitäten für Kinder von 4–12 Jahren.",
            pl: "Aktywności mini clubu dla dzieci w wieku 4–12 lat.",
          },
        },
        {
          name: { tr: "Çocuk Kulübü", en: "Kids Club", de: "Kids Club", pl: "Klub dziecięcy" },
          time: "14:30 – 17:00",
          format: {
            tr: "Mini Club · Aktivite alanı",
            en: "Mini Club · Activity area",
            de: "Mini Club · Aktivitätsbereich",
            pl: "Mini Club · strefa aktywności",
          },
          charge: BADGE_FREE,
          res: BADGE_NO_RES,
          detail: {
            tr: "4–12 yaş çocuklar için mini club aktiviteleri.",
            en: "Mini club activities for children aged 4–12.",
            de: "Mini-Club-Aktivitäten für Kinder von 4–12 Jahren.",
            pl: "Aktywności mini clubu dla dzieci w wieku 4–12 lat.",
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
        pl: "Mini disco i strefa pokazów",
      },
      title: { tr: "Mini Disco", en: "Mini Disco", de: "Mini-Disco", pl: "Mini Disco" },
      sub: {
        tr: "Amfi / gösteri alanı · Eğlence aktivitesi · 4–12 yaş",
        en: "Amphitheatre / show area · Entertainment · Ages 4–12",
        de: "Amphitheater / Show · Unterhaltung · 4–12 Jahre",
        pl: "Amfiteatr / strefa pokazów · rozrywka · wiek 4–12",
      },
      slots: [
        {
          name: { tr: "Mini Disco", en: "Mini Disco", de: "Mini-Disco", pl: "Mini Disco" },
          time: "20:45 – 21:00",
          format: {
            tr: "Amfi / gösteri alanı · Eğlence aktivitesi",
            en: "Amphitheatre / show area · Entertainment activity",
            de: "Amphitheater · Show · Unterhaltung",
            pl: "Amfiteatr / strefa pokazów · aktywność rozrywkowa",
          },
          charge: BADGE_FREE,
          res: BADGE_NO_RES,
          detail: {
            tr: "4–12 yaş çocuklar için mini disko etkinliği.",
            en: "Mini disco for children aged 4–12.",
            de: "Mini-Disco für Kinder von 4–12 Jahren.",
            pl: "Mini disco dla dzieci w wieku 4–12 lat.",
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
        pl: "Plac zabaw i strefa na zewnątrz",
      },
      title: {
        tr: "Çocuk oyun parkı",
        en: "Children’s playground",
        de: "Kinderspielplatz",
        pl: "Plac zabaw dla dzieci",
      },
      sub: {
        tr: "Açık alan · Oyun alanı",
        en: "Outdoor · Play area",
        de: "Freiluft · Spielbereich",
        pl: "Na zewnątrz · strefa zabaw",
      },
      slots: [
        {
          name: {
            tr: "Çocuk oyun parkı",
            en: "Children’s playground",
            de: "Kinderspielplatz",
            pl: "Plac zabaw dla dzieci",
          },
          time: "07:00 – 21:00",
          format: {
            tr: "Açık alan · Oyun alanı",
            en: "Outdoor area · Play area",
            de: "Freiluft · Spielbereich",
            pl: "Strefa na zewnątrz · plac zabaw",
          },
          charge: BADGE_FREE,
          res: BADGE_NO_RES,
          detail: {
            tr: "Çocuklar su ve oyun ekipmanı yakınında yalnız bırakılmamalıdır.",
            en: "Children must not be left unattended near water or play equipment.",
            de: "Kinder dürfen in Wasser- und Spielnähe nicht unbeaufsichtigt gelassen werden.",
            pl: "Dzieci nie mogą pozostawać bez opieki przy wodzie lub na placu zabaw.",
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
      el("p", "rest-section-title", T({ tr: "Çocuk ve animasyon aktiviteleri", en: "Kids & animation", de: "Kinder & Animation", pl: "Dzieci i animacja" }))
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
