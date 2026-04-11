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

  var MODULE_TEXT = {
    sectionTitle: {
      tr: "Animasyon & aktiviteler",
      en: "Animation & activities",
      de: "Animation & Aktivitäten",
      pl: "Animacja i aktywności",
    },
    lead: {
      tr: "Aqua havuzda gün boyu animasyon ve su aktiviteleri. Katılım ücretsiz; güncel saatler tabloda.",
      en: "Poolside animation and aqua activities all day at Aqua Pool. Free to join — times below.",
      de: "Den ganzen Tag Animation und Wasseraktivitäten am Aqua Pool. Teilnahme kostenlos — Zeiten in der Tabelle.",
      pl: "Przy basenie Aqua całodniowa animacja i zajęcia wodne. Udział bezpłatny — godziny poniżej.",
    },
    scheduleTitle: {
      tr: "Günlük program",
      en: "Daily programme",
      de: "Tagesprogramm",
      pl: "Program dnia",
    },
    colTime: { tr: "Saat", en: "Time", de: "Uhrzeit", pl: "Time" },
    colActivity: { tr: "Etkinlik", en: "Activity", de: "Aktivität", pl: "Activity" },
  };

  var SCHEDULE = [
    {
      time: "10:00",
      activity: {
        tr: "Müzik ve Animasyon Başlangıcı",
        en: "Music & Animation Start",
        de: "Musik- & Animationsbeginn",
        pl: "Start muzyki i animacji",
      },
    },
    {
      time: "10:30",
      activity: {
        tr: "Su Jimnastiği",
        en: "Aqua Gym",
        de: "Wassergymnastik",
        pl: "Aqua gym",
      },
    },
    {
      time: "11:00",
      activity: {
        tr: "Dart Oyunu",
        en: "Darts",
        de: "Dart",
        pl: "Dart",
      },
    },
    {
      time: "11:30",
      activity: {
        tr: "Su Topu",
        en: "Water Polo",
        de: "Wasserball",
        pl: "Piłka wodna",
      },
    },
    {
      time: "12:30 – 14:00",
      activity: {
        tr: "Serbest Aktivite Zamanı",
        en: "Free Activity Time",
        de: "Freie Aktivitätszeit",
        pl: "Czas wolnych aktywności",
      },
    },
    {
      time: "14:45",
      activity: {
        tr: "Su Jimnastiği",
        en: "Aqua Gym",
        de: "Wassergymnastik",
        pl: "Aqua gym",
      },
    },
    {
      time: "15:00",
      activity: {
        tr: "Dart Oyunu",
        en: "Darts",
        de: "Dart",
        pl: "Dart",
      },
    },
    {
      time: "16:00",
      activity: {
        tr: "Su Topu",
        en: "Water Polo",
        de: "Wasserball",
        pl: "Piłka wodna",
      },
    },
    {
      time: "17:00",
      activity: {
        tr: "Animasyon Programı Kapanışı",
        en: "Animation Program End",
        de: "Animationsprogramm Ende",
        pl: "Koniec programu animacji",
      },
    },
  ];

  var ACTIVITY_CARDS = [
    {
      img: "assets/images/activities/aqua-gym.png?v=3",
      alt: {
        tr: "Su jimnastiği havuz etkinliği",
        en: "Water aerobics pool activity",
        de: "Wassergymnastik im Pool",
        pl: "Zajęcia aerobiku wodnego w basenie",
      },
      title: {
        tr: "Su jimnastiği",
        en: "Water aerobics",
        de: "Wassergymnastik",
        pl: "Aerobik wodny",
      },
      text: {
        tr:
          "Sadece havuza girmeniz yeterli. Suyun doğal direnciyle vücudunuzu nazikçe çalıştırırken aynı zamanda serinliğin keyfini çıkarabilirsiniz. Ekstra yük bindirmeden yapılan bu egzersiz, her yaş grubuna uygun rahat ve eğlenceli bir aktivitedir.",
        en:
          "Just step into the pool. While the natural resistance of water works your body gently, you can enjoy a refreshing workout. This low-impact exercise is comfortable, fun, and suitable for all age groups.",
        de:
          "Steigen Sie einfach ins Becken. Der natürliche Wasserwiderstand trainiert den Körper sanft und sorgt gleichzeitig für Erfrischung. Diese gelenkschonende Übung ist angenehm, unterhaltsam und für alle Altersgruppen geeignet.",
        pl: "Wejdź do basenu. Naturalny opór wody delikatnie angażuje ciało, a Ty możesz cieszyć się orzeźwiającym treningiem. To ćwiczenie o niskim obciążeniu jest komfortowe, zabawne i dla każdej grupy wiekowej.",
      },
    },
    {
      img: "assets/images/activities/dart.png?v=3",
      alt: {
        tr: "Dart oyunu etkinliği",
        en: "Darts game activity",
        de: "Dartspiel-Aktivität",
        pl: "Aktywność — gra w darta",
      },
      title: {
        tr: "Dart oyunu",
        en: "Darts game",
        de: "Dartspiel",
        pl: "Gra w darta",
      },
      text: {
        tr:
          "Okunuzu alın ve hedefe odaklanın. Dostça rekabetin tadını çıkarabileceğiniz bu oyun, hem konsantrasyon hem keyif sunar. İlk kez deneyenler de deneyimli misafirler de rahatça katılabilir.",
        en:
          "Take your dart and focus on the target. This friendly game offers both concentration and fun. Whether you are trying it for the first time or already experienced, everyone can join.",
        de:
          "Nehmen Sie den Dartpfeil und konzentrieren Sie sich auf das Ziel. Dieses freundliche Spiel verbindet Fokus und Spaß. Ob Einsteiger oder erfahrene Gäste: alle können mitmachen.",
        pl: "Weź lotkę i skup się na tarczy. Ta przyjazna gra łączy koncentrację i zabawę. Zarówno początkujący, jak i doświadczeni mogą wziąć udział.",
      },
    },
    {
      img: "assets/images/activities/water-polo.png?v=3",
      alt: {
        tr: "Su topu havuz etkinliği",
        en: "Water polo pool activity",
        de: "Wasserball im Pool",
        pl: "Zajęcia — piłka wodna w basenie",
      },
      title: {
        tr: "Su topu",
        en: "Water polo",
        de: "Wasserball",
        pl: "Piłka wodna",
      },
      text: {
        tr:
          "Havuzda hareket başlıyor. Takım halinde oynanan bu eğlenceli oyun enerjinizi yükseltir ve sosyal bir deneyim sunar. Serin suyun içinde aktif kalırken keyifli ve bol kahkahalı anlar sizi bekliyor.",
        en:
          "Action starts in the pool. This team game boosts your energy and creates a social, fun atmosphere. Stay active in cool water and enjoy plenty of laughter.",
        de:
          "Im Pool geht es los. Dieses Teamspiel steigert die Energie und bietet ein soziales, unterhaltsames Erlebnis. Bleiben Sie aktiv im kühlen Wasser und genießen Sie viele fröhliche Momente.",
        pl: "Akcja zaczyna się w basenie. Ta gra zespołowa dodaje energii i buduje swobodną, radosną atmosferę. Rób ruch w chłodnej wodzie i śmiej się do woli.",
      },
    },
  ];

  var LEGACY_CARDS = [
    {
      highlight: true,
      kicker: {
        tr: "Gece programı",
        en: "Night program",
        de: "Abendprogramm",
        pl: "Program wieczorny",
      },
      title: {
        tr: "Gece şovları & eğlenceler",
        en: "Evening shows & entertainment",
        de: "Abendshows & Unterhaltung",
        pl: "Wieczorne pokazy i rozrywka",
      },
      text: {
        tr:
          "Güneş battıktan sonra Kaila Beach Hotel’de atmosfer bambaşka bir enerjiye bürünür. Her akşam farklı bir eğlence programı sunulur: akrobatik dans şovları, özel temalı geceler, canlı müzik veya DJ performansları.",
        en:
          "After sunset, Kaila Beach Hotel takes on a different energy. A new entertainment program is offered each evening, including acrobatic dance shows, themed nights, live music, and DJ performances.",
        de:
          "Nach Sonnenuntergang bekommt das Kaila Beach Hotel eine besondere Energie. Jeden Abend gibt es ein anderes Unterhaltungsprogramm: akrobatische Tanzshows, Themenabende, Live-Musik oder DJ-Auftritte.",
        pl: "Po zachodzie słońca Kaila Beach Hotel nabiera innej energii. Każdego wieczoru nowy program: pokazy taneczno-akrobatyczne, wieczory tematyczne, muzyka na żyko i DJ.",
      },
      images: [
        {
          src: "assets/images/activities/night-pool.png",
          alt: {
            tr: "Gece havuz etkinliği",
            en: "Night pool activity",
            de: "Abendaktivität am Pool",
            pl: "Wieczorna aktywność przy basenie",
          },
        },
        {
          src: "assets/images/activities/night-show.png",
          alt: {
            tr: "Gece gösterisi",
            en: "Night show",
            de: "Abendshow",
            pl: "Pokaz wieczorny",
          },
        },
      ],
    },
    {
      title: {
        tr: "Fitness merkezi",
        en: "Fitness centre",
        de: "Fitnessbereich",
        pl: "Siłownia / fitness",
      },
      text: {
        tr:
          "Tam donanımlı fitness merkezinde koşu bantları, ağırlıklar ve modern spor ekipmanları bulunur. Tatil boyunca formda kalmak isteyen misafirler için motive edici bir alan sunar.",
        en:
          "The fully equipped fitness centre includes treadmills, weights, and modern training equipment. It offers a motivating space for guests who want to stay in shape during their holiday.",
        de:
          "Im voll ausgestatteten Fitnessbereich stehen Laufbänder, Gewichte und moderne Trainingsgeräte bereit. Ein motivierender Bereich für Gäste, die auch im Urlaub fit bleiben möchten.",
        pl: "W pełni wyposażona siłownia: bieżnie, wolne ciężary i nowoczesny sprzęt. Motywująca przestrzeń dla gości, którzy chcą zachować formę w wakacje.",
      },
      images: [
        {
          src: "assets/images/activities/fitness.png",
          alt: {
            tr: "Fitness merkezi",
            en: "Fitness centre",
            de: "Fitnessbereich",
            pl: "Siłownia / fitness",
          },
        },
        {
          src: "assets/images/activities/fitness-2.png",
          alt: {
            tr: "Fitness merkezi ekipmanları",
            en: "Fitness centre equipment",
            de: "Fitnessgeräte im Fitnessbereich",
            pl: "Sprzęt na siłowni",
          },
        },
      ],
    },
    {
      title: {
        tr: "Alışveriş alanı",
        en: "Shopping area",
        de: "Einkaufsbereich",
        pl: "Strefa zakupów",
      },
      text: {
        tr:
          "09:00–23:00 saatleri arasında fotoğrafçı, deri mağazası, market ve kuaför hizmetleri kullanılabilir.",
        en:
          "From 09:00 to 23:00, guests can access photographer, leather shop, market, and hairdresser services.",
        de:
          "Von 09:00 bis 23:00 stehen Fotograf, Ledergeschäft, Markt und Friseur zur Verfügung.",
        pl: "Od 09:00 do 23:00 goście mogą skorzystać z fotografa, sklepu ze skórą, marketu i fryzjera.",
      },
      images: [],
    },
  ];

  function renderScheduleTable() {
    var wrap = el("div", "activities-table-wrap");
    var title = el("h3", "activities-block-title", T(MODULE_TEXT.scheduleTitle));
    wrap.appendChild(title);

    var table = document.createElement("table");
    table.className = "activities-table";
    var thead = document.createElement("thead");
    var trh = document.createElement("tr");
    var thTime = document.createElement("th");
    thTime.textContent = T(MODULE_TEXT.colTime);
    var thAct = document.createElement("th");
    thAct.textContent = T(MODULE_TEXT.colActivity);
    trh.appendChild(thTime);
    trh.appendChild(thAct);
    thead.appendChild(trh);

    var tbody = document.createElement("tbody");
    SCHEDULE.forEach(function (row) {
      var tr = document.createElement("tr");
      var tdTime = document.createElement("td");
      tdTime.className = "activities-table__time";
      tdTime.textContent = row.time;
      var tdAct = document.createElement("td");
      tdAct.className = "activities-table__activity";
      tdAct.textContent = T(row.activity);
      tr.appendChild(tdTime);
      tr.appendChild(tdAct);
      tbody.appendChild(tr);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  }

  function renderActivityCards() {
    var grid = el("div", "activities-cards");
    ACTIVITY_CARDS.forEach(function (c) {
      var card = el("article", "venue-card venue-card--rest");
      var fig = el("div", "venue-card__media");
      var img = document.createElement("img");
      img.src = c.img;
      img.alt = T(c.alt);
      img.loading = "lazy";
      img.decoding = "async";
      fig.appendChild(img);
      var body = el("div", "venue-card__body");
      body.appendChild(el("h3", "venue-card__title", T(c.title)));
      body.appendChild(el("p", "venue-card__text", T(c.text)));
      card.appendChild(fig);
      card.appendChild(body);
      grid.appendChild(card);
    });
    return grid;
  }

  function renderLegacySection() {
    var wrap = el("section", "activities-legacy");
    var stack = el("div", "activities-legacy__stack");
    LEGACY_CARDS.forEach(function (item) {
      var card = el("article", "activities-legacy-card" + (item.highlight ? " activities-legacy-card--highlight" : ""));
      if (item.kicker) {
        card.appendChild(el("p", "activities-legacy-card__kicker", T(item.kicker)));
      }
      card.appendChild(el("h4", "activities-legacy-card__title", T(item.title)));
      card.appendChild(el("p", "activities-legacy-card__text", T(item.text)));

      if (item.images && item.images.length) {
        var gallery = item.highlight
          ? renderShowcaseGallery(item.images)
          : renderSimpleGallery(item.images);
        card.appendChild(gallery);
      }
      stack.appendChild(card);
    });
    wrap.appendChild(stack);
    return wrap;
  }

  function renderSimpleGallery(images) {
    var gallery = el("div", "activities-legacy-card__gallery");
    images.forEach(function (imgSpec) {
      var fig = el("figure", "activities-legacy-card__figure");
      var img = document.createElement("img");
      img.src = imgSpec.src;
      img.alt = T(imgSpec.alt || {});
      img.loading = "lazy";
      img.decoding = "async";
      fig.appendChild(img);
      gallery.appendChild(fig);
    });
    return gallery;
  }

  function renderShowcaseGallery(images) {
    var root = el("div", "activities-showcase");
    var viewport = el("div", "activities-showcase__viewport");
    var track = el("div", "activities-showcase__track");
    var idx = 0;
    var slides = [];
    var timer = null;

    images.forEach(function (imgSpec, i) {
      var fig = el("figure", "activities-showcase__slide" + (i === 0 ? " is-active" : ""));
      var img = document.createElement("img");
      img.src = imgSpec.src;
      img.alt = T(imgSpec.alt || {});
      img.loading = i === 0 ? "eager" : "lazy";
      img.decoding = "async";
      fig.appendChild(img);
      track.appendChild(fig);
      slides.push(fig);
    });

    function setIndex(nextIdx, noReset) {
      if (!slides.length) return;
      idx = (nextIdx + slides.length) % slides.length;
      track.style.transform = "translateX(" + String(idx * -100) + "%)";
      slides.forEach(function (s, i) {
        s.classList.toggle("is-active", i === idx);
      });
      if (!noReset) restartAuto();
    }

    function restartAuto() {
      if (timer) clearInterval(timer);
      if (slides.length < 2) return;
      timer = window.setInterval(function () {
        setIndex(idx + 1, true);
      }, 2500);
    }

    viewport.appendChild(track);
    root.appendChild(viewport);
    restartAuto();
    return root;
  }

  function renderActivitiesModule(container) {
    var root = el("div", "viona-mod viona-mod--activities");
    root.appendChild(el("p", "rest-section-title", T(MODULE_TEXT.sectionTitle)));
    root.appendChild(el("p", "viona-mod-lead viona-mod-lead--tight", T(MODULE_TEXT.lead)));
    root.appendChild(renderScheduleTable());
    root.appendChild(renderActivityCards());
    root.appendChild(renderLegacySection());
    container.appendChild(root);
  }

  window.renderActivitiesModule = renderActivitiesModule;
})();
