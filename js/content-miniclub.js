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
    ru: "Наши маленькие гости могут провести целый день со смехом, творчеством и весельем в Jammies Kids Club. На открытой площадке и под присмотром аниматоров дети получат незабываемый отдых — как и их родители.",
    da: "Vores mindste gæster kan nyde en hel dag med latter, kreativitet og sjov i Jammies Kids Club. Med udendørs leg og aktiviteter under opsyn får børnene en ferie at huske — ligesom deres forældre.",
    cs: "Naši nejmenší hosté si v Jammies Kids Club užijí celý den smíchu, tvořivosti a zábavy. S aktivitami venku pod dohledem mají děti nezapomenutelnou dovolenou — stejně jako rodiče.",
    ro: "Cei mai mici oaspeți se pot bucura de o zi întreagă de râs, creativitate și distracție la Jammies Kids Club. Cu joacă în aer liber și activități supravegheate, copiii au o vacanță de neuitat — la fel ca părinții.",
    nl: "Onze jongste gasten kunnen de hele dag genieten van lachen, creativiteit en plezier in Jammies Kids Club. Met buitenspel en begeleide activiteiten beleven kinderen een vakantie om nooit te vergeten — net als hun ouders.",
    sk: "Naši najmenší hostia si v Jammies Kids Club užijú celý deň smiechu, tvorivosti a zábavy. S aktivitami vonku pod dohľadom majú deti nezabudnuteľnú dovolenku — rovnako ako rodičia.",
  };

  var BADGE_FREE = {
    tr: "Ücretsiz",
    en: "Included",
    de: "Kostenlos",
    pl: "W cenie",
    ru: "Бесплатно",
    da: "Gratis",
    cs: "Zdarma",
    ro: "Gratuit",
    nl: "Gratis",
    sk: "Bezplatne",
  };

  var BADGE_NO_RES = {
    tr: "Önceden haber gerekmez",
    en: "No advance notice needed",
    de: "Keine Voranmeldung nötig",
    pl: "Rezerwacja z wyprzedzeniem nie jest wymagana",
    ru: "Предварительная запись не требуется",
    da: "Forhåndsbestilling ikke nødvendig",
    cs: "Předchozí rezervace není potřeba",
    ro: "Nu este necesară rezervarea în avans",
    nl: "Geen voorafgaande melding nodig",
    sk: "Predbežná rezervácia nie je potrebná",
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
        ru: "Jammies Kids Club — зона активности внутри",
        da: "Jammies Kids Club — indendørs aktivitetsområde",
        cs: "Jammies Kids Club — vnitřní aktivní zóna",
        ro: "Jammies Kids Club — zonă de activități interioară",
        nl: "Jammies Kids Club — binnenactiviteiten",
        sk: "Jammies Kids Club — vnútorná aktivná zóna",
      },
      title: {
        tr: "Jammies Kids Club",
        en: "Jammies Kids Club",
        de: "Jammies Kids Club",
        pl: "Jammies Kids Club",
        ru: "Jammies Kids Club",
        da: "Jammies Kids Club",
        cs: "Jammies Kids Club",
        ro: "Jammies Kids Club",
        nl: "Jammies Kids Club",
        sk: "Jammies Kids Club",
      },
      sub: {
        tr: "Mini Club · Aktivite alanı · 4–12 yaş",
        en: "Mini Club · Activity area · Ages 4–12",
        de: "Mini Club · Aktivitätsbereich · 4–12 Jahre",
        pl: "Mini Club · strefa aktywności · wiek 4–12",
        ru: "Мини-клуб · зона активности · 4–12 лет",
        da: "Mini Club · aktivitetsområde · 4–12 år",
        cs: "Mini klub · aktivní zóna · 4–12 let",
        ro: "Mini club · zonă de activități · 4–12 ani",
        nl: "Mini Club · activiteitenruimte · 4–12 jaar",
        sk: "Mini klub · aktivná zóna · 4–12 rokov",
      },
      slots: [
        {
          name: {
            tr: "Çocuk Kulübü",
            en: "Kids Club",
            de: "Kids Club",
            pl: "Klub dziecięcy",
            ru: "Детский клуб",
            da: "Børneklub",
            cs: "Dětský klub",
            ro: "Club copii",
            nl: "Kidsclub",
            sk: "Detský klub",
          },
          time: "10:00 – 12:30",
          format: {
            tr: "Mini Club · Aktivite alanı",
            en: "Mini Club · Activity area",
            de: "Mini Club · Aktivitätsbereich",
            pl: "Mini Club · strefa aktywności",
            ru: "Мини-клуб · зона активности",
            da: "Mini Club · aktivitetsområde",
            cs: "Mini klub · aktivní zóna",
            ro: "Mini club · zonă de activități",
            nl: "Mini Club · activiteitenruimte",
            sk: "Mini klub · aktivná zóna",
          },
          charge: BADGE_FREE,
          res: BADGE_NO_RES,
          detail: {
            tr: "4–12 yaş çocuklar için mini club aktiviteleri.",
            en: "Mini club activities for children aged 4–12.",
            de: "Mini-Club-Aktivitäten für Kinder von 4–12 Jahren.",
            pl: "Aktywności mini clubu dla dzieci w wieku 4–12 lat.",
            ru: "Активности мини-клуба для детей 4–12 лет.",
            da: "Mini Club-aktiviteter for børn 4–12 år.",
            cs: "Aktivity mini klubu pro děti 4–12 let.",
            ro: "Activități mini club pentru copii 4–12 ani.",
            nl: "Mini Club-activiteiten voor kinderen van 4–12 jaar.",
            sk: "Aktivity mini klubu pre deti 4–12 rokov.",
          },
        },
        {
          name: {
            tr: "Çocuk Kulübü",
            en: "Kids Club",
            de: "Kids Club",
            pl: "Klub dziecięcy",
            ru: "Детский клуб",
            da: "Børneklub",
            cs: "Dětský klub",
            ro: "Club copii",
            nl: "Kidsclub",
            sk: "Detský klub",
          },
          time: "14:30 – 17:00",
          format: {
            tr: "Mini Club · Aktivite alanı",
            en: "Mini Club · Activity area",
            de: "Mini Club · Aktivitätsbereich",
            pl: "Mini Club · strefa aktywności",
            ru: "Мини-клуб · зона активности",
            da: "Mini Club · aktivitetsområde",
            cs: "Mini klub · aktivní zóna",
            ro: "Mini club · zonă de activități",
            nl: "Mini Club · activiteitenruimte",
            sk: "Mini klub · aktivná zóna",
          },
          charge: BADGE_FREE,
          res: BADGE_NO_RES,
          detail: {
            tr: "4–12 yaş çocuklar için mini club aktiviteleri.",
            en: "Mini club activities for children aged 4–12.",
            de: "Mini-Club-Aktivitäten für Kinder von 4–12 Jahren.",
            pl: "Aktywności mini clubu dla dzieci w wieku 4–12 lat.",
            ru: "Активности мини-клуба для детей 4–12 лет.",
            da: "Mini Club-aktiviteter for børn 4–12 år.",
            cs: "Aktivity mini klubu pro děti 4–12 let.",
            ro: "Activități mini club pentru copii 4–12 ani.",
            nl: "Mini Club-activiteiten voor kinderen van 4–12 jaar.",
            sk: "Aktivity mini klubu pre deti 4–12 rokov.",
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
        ru: "Мини-диско и зона шоу",
        da: "Mini disco og showområde",
        cs: "Mini disco a showová zóna",
        ro: "Mini disco și zonă spectacol",
        nl: "Mini disco en showruimte",
        sk: "Mini disco a showová zóna",
      },
      title: {
        tr: "Mini Disco",
        en: "Mini Disco",
        de: "Mini-Disco",
        pl: "Mini Disco",
        ru: "Мини-диско",
        da: "Mini Disco",
        cs: "Mini disco",
        ro: "Mini Disco",
        nl: "Mini Disco",
        sk: "Mini disco",
      },
      sub: {
        tr: "Amfi / gösteri alanı · Eğlence aktivitesi · 4–12 yaş",
        en: "Amphitheatre / show area · Entertainment · Ages 4–12",
        de: "Amphitheater / Show · Unterhaltung · 4–12 Jahre",
        pl: "Amfiteatr / strefa pokazów · rozrywka · wiek 4–12",
        ru: "Амфитеатр / шоу · развлечения · 4–12 лет",
        da: "Amfiteater / show · underholdning · 4–12 år",
        cs: "Amfiteátr / show · zábava · 4–12 let",
        ro: "Amfiteatru / spectacol · divertisment · 4–12 ani",
        nl: "Amfitheater / show · entertainment · 4–12 jaar",
        sk: "Amfiteáter / show · zábava · 4–12 rokov",
      },
      slots: [
        {
          name: {
            tr: "Mini Disco",
            en: "Mini Disco",
            de: "Mini-Disco",
            pl: "Mini Disco",
            ru: "Мини-диско",
            da: "Mini Disco",
            cs: "Mini disco",
            ro: "Mini Disco",
            nl: "Mini Disco",
            sk: "Mini disco",
          },
          time: "20:45 – 21:00",
          format: {
            tr: "Amfi / gösteri alanı · Eğlence aktivitesi",
            en: "Amphitheatre / show area · Entertainment activity",
            de: "Amphitheater · Show · Unterhaltung",
            pl: "Amfiteatr / strefa pokazów · aktywność rozrywkowa",
            ru: "Амфитеатр / шоу · развлекательная активность",
            da: "Amfiteater / show · underholdningsaktivitet",
            cs: "Amfiteátr / show · zábavní aktivita",
            ro: "Amfiteatru / spectacol · activitate de divertisment",
            nl: "Amfitheater / show · entertainmentactiviteit",
            sk: "Amfiteáter / show · zábavná aktivita",
          },
          charge: BADGE_FREE,
          res: BADGE_NO_RES,
          detail: {
            tr: "4–12 yaş çocuklar için mini disko etkinliği.",
            en: "Mini disco for children aged 4–12.",
            de: "Mini-Disco für Kinder von 4–12 Jahren.",
            pl: "Mini disco dla dzieci w wieku 4–12 lat.",
            ru: "Мини-диско для детей 4–12 лет.",
            da: "Mini disco for børn 4–12 år.",
            cs: "Mini disco pro děti 4–12 let.",
            ro: "Mini disco pentru copii 4–12 ani.",
            nl: "Mini disco voor kinderen van 4–12 jaar.",
            sk: "Mini disco pre deti 4–12 rokov.",
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
        ru: "Детская площадка и открытая зона",
        da: "Legeplads og udendørsområde",
        cs: "Dětské hřiště a venkovní prostor",
        ro: "Loc de joacă pentru copii și zonă exterioară",
        nl: "Speeltuin en buitenruimte",
        sk: "Detské ihrisko a vonkajší priestor",
      },
      title: {
        tr: "Çocuk oyun parkı",
        en: "Children’s playground",
        de: "Kinderspielplatz",
        pl: "Plac zabaw dla dzieci",
        ru: "Детская площадка",
        da: "Legeplads",
        cs: "Dětské hřiště",
        ro: "Loc de joacă",
        nl: "Speeltuin",
        sk: "Detské ihrisko",
      },
      sub: {
        tr: "Açık alan · Oyun alanı",
        en: "Outdoor · Play area",
        de: "Freiluft · Spielbereich",
        pl: "Na zewnątrz · strefa zabaw",
        ru: "На улице · игровая зона",
        da: "Udendørs · legeområde",
        cs: "Venku · hrací zóna",
        ro: "În aer liber · zonă de joacă",
        nl: "Buiten · speelruimte",
        sk: "Vonku · hracia zóna",
      },
      slots: [
        {
          name: {
            tr: "Çocuk oyun parkı",
            en: "Children’s playground",
            de: "Kinderspielplatz",
            pl: "Plac zabaw dla dzieci",
            ru: "Детская площадка",
            da: "Legeplads",
            cs: "Dětské hřiště",
            ro: "Loc de joacă",
            nl: "Speeltuin",
            sk: "Detské ihrisko",
          },
          time: "07:00 – 21:00",
          format: {
            tr: "Açık alan · Oyun alanı",
            en: "Outdoor area · Play area",
            de: "Freiluft · Spielbereich",
            pl: "Strefa na zewnątrz · plac zabaw",
            ru: "Открытая зона · игровая площадка",
            da: "Udendørsområde · legeområde",
            cs: "Venkovní prostor · hrací zóna",
            ro: "Zonă exterioară · loc de joacă",
            nl: "Buitenruimte · speelruimte",
            sk: "Vonkajší priestor · hracia zóna",
          },
          charge: BADGE_FREE,
          res: BADGE_NO_RES,
          detail: {
            tr: "Çocuklar su ve oyun ekipmanı yakınında yalnız bırakılmamalıdır.",
            en: "Children must not be left unattended near water or play equipment.",
            de: "Kinder dürfen in Wasser- und Spielnähe nicht unbeaufsichtigt gelassen werden.",
            pl: "Dzieci nie mogą pozostawać bez opieki przy wodzie lub na placu zabaw.",
            ru: "Нельзя оставлять детей без присмотра у воды или игрового оборудования.",
            da: "Børn må ikke efterlades uden opsyn ved vand eller legeudstyr.",
            cs: "Děti nesmí zůstávat bez dozoru u vody nebo herního vybavení.",
            ro: "Copiii nu trebuie lăsați nesupravegheați lângă apă sau echipamente de joacă.",
            nl: "Kinderen mogen niet alleen worden gelaten bij water of speeltoestellen.",
            sk: "Deti nesmú zostať bez dozoru pri vode alebo hernom vybavení.",
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

  function renderMiniclubModule(container, t) {
    var root = el("div", "viona-mod viona-mod--miniclub");

    var kicker =
      typeof t === "function"
        ? t("modMiniClubKicker")
        : T({
            tr: "Çocuk ve animasyon aktiviteleri",
            en: "Kids & animation",
            de: "Kinder & Animation",
            pl: "Dzieci i animacja",
            ru: "Дети и анимация",
            da: "Børn og animation",
            cs: "Děti a animační program",
            ro: "Copii și animație",
            nl: "Kinderen en animatie",
            sk: "Deti a animácia",
          });
    root.appendChild(el("p", "rest-section-title", kicker));

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
