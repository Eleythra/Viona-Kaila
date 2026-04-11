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
      ru: "Анимация и активности",
    },
    lead: {
      tr: "Aqua havuzda gün boyu animasyon ve su aktiviteleri. Katılım ücretsiz; güncel saatler tabloda.",
      en: "Poolside animation and aqua activities all day at Aqua Pool. Free to join — times below.",
      de: "Den ganzen Tag Animation und Wasseraktivitäten am Aqua Pool. Teilnahme kostenlos — Zeiten in der Tabelle.",
      ru: "Целый день анимация и активности у бассейна Aqua. Участие бесплатно — расписание в таблице.",
    },
    scheduleTitle: {
      tr: "Günlük program",
      en: "Daily programme",
      de: "Tagesprogramm",
      ru: "Программа дня",
    },
    colTime: { tr: "Saat", en: "Time", de: "Uhrzeit", ru: "Время" },
    colActivity: { tr: "Etkinlik", en: "Activity", de: "Aktivität", ru: "Активность" },
  };

  var SCHEDULE = [
    {
      time: "10:00",
      activity: {
        tr: "Müzik ve Animasyon Başlangıcı",
        en: "Music & Animation Start",
        de: "Musik- & Animationsbeginn",
        ru: "Начало музыки и анимации",
      },
    },
    {
      time: "10:30",
      activity: {
        tr: "Su Jimnastiği",
        en: "Aqua Gym",
        de: "Wassergymnastik",
        ru: "Аквааэробика",
      },
    },
    {
      time: "11:00",
      activity: {
        tr: "Dart Oyunu",
        en: "Darts",
        de: "Dart",
        ru: "Дартс",
      },
    },
    {
      time: "11:30",
      activity: {
        tr: "Su Topu",
        en: "Water Polo",
        de: "Wasserball",
        ru: "Водное поло",
      },
    },
    {
      time: "12:30 – 14:00",
      activity: {
        tr: "Serbest Aktivite Zamanı",
        en: "Free Activity Time",
        de: "Freie Aktivitätszeit",
        ru: "Свободное время для активностей",
      },
    },
    {
      time: "14:45",
      activity: {
        tr: "Su Jimnastiği",
        en: "Aqua Gym",
        de: "Wassergymnastik",
        ru: "Аквааэробика",
      },
    },
    {
      time: "15:00",
      activity: {
        tr: "Dart Oyunu",
        en: "Darts",
        de: "Dart",
        ru: "Дартс",
      },
    },
    {
      time: "16:00",
      activity: {
        tr: "Su Topu",
        en: "Water Polo",
        de: "Wasserball",
        ru: "Водное поло",
      },
    },
    {
      time: "17:00",
      activity: {
        tr: "Animasyon Programı Kapanışı",
        en: "Animation Program End",
        de: "Animationsprogramm Ende",
        ru: "Окончание анимационной программы",
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
        ru: "Аквагимнастика в бассейне",
      },
      title: {
        tr: "Su jimnastiği",
        en: "Water aerobics",
        de: "Wassergymnastik",
        ru: "Аквагимнастика",
      },
      text: {
        tr:
          "Sadece havuza girmeniz yeterli. Suyun doğal direnciyle vücudunuzu nazikçe çalıştırırken aynı zamanda serinliğin keyfini çıkarabilirsiniz. Ekstra yük bindirmeden yapılan bu egzersiz, her yaş grubuna uygun rahat ve eğlenceli bir aktivitedir.",
        en:
          "Just step into the pool. While the natural resistance of water works your body gently, you can enjoy a refreshing workout. This low-impact exercise is comfortable, fun, and suitable for all age groups.",
        de:
          "Steigen Sie einfach ins Becken. Der natürliche Wasserwiderstand trainiert den Körper sanft und sorgt gleichzeitig für Erfrischung. Diese gelenkschonende Übung ist angenehm, unterhaltsam und für alle Altersgruppen geeignet.",
        ru:
          "Достаточно зайти в бассейн. Естественное сопротивление воды мягко тренирует тело и одновременно освежает. Это комфортная и веселая активность без лишней нагрузки, подходящая для всех возрастов.",
      },
    },
    {
      img: "assets/images/activities/dart.png?v=3",
      alt: {
        tr: "Dart oyunu etkinliği",
        en: "Darts game activity",
        de: "Dartspiel-Aktivität",
        ru: "Активность дартс",
      },
      title: {
        tr: "Dart oyunu",
        en: "Darts game",
        de: "Dartspiel",
        ru: "Игра в дартс",
      },
      text: {
        tr:
          "Okunuzu alın ve hedefe odaklanın. Dostça rekabetin tadını çıkarabileceğiniz bu oyun, hem konsantrasyon hem keyif sunar. İlk kez deneyenler de deneyimli misafirler de rahatça katılabilir.",
        en:
          "Take your dart and focus on the target. This friendly game offers both concentration and fun. Whether you are trying it for the first time or already experienced, everyone can join.",
        de:
          "Nehmen Sie den Dartpfeil und konzentrieren Sie sich auf das Ziel. Dieses freundliche Spiel verbindet Fokus und Spaß. Ob Einsteiger oder erfahrene Gäste: alle können mitmachen.",
        ru:
          "Возьмите дротик и сосредоточьтесь на цели. Эта дружеская игра сочетает концентрацию и удовольствие. Подходит и для новичков, и для опытных игроков.",
      },
    },
    {
      img: "assets/images/activities/water-polo.png?v=3",
      alt: {
        tr: "Su topu havuz etkinliği",
        en: "Water polo pool activity",
        de: "Wasserball im Pool",
        ru: "Водное поло в бассейне",
      },
      title: {
        tr: "Su topu",
        en: "Water polo",
        de: "Wasserball",
        ru: "Водное поло",
      },
      text: {
        tr:
          "Havuzda hareket başlıyor. Takım halinde oynanan bu eğlenceli oyun enerjinizi yükseltir ve sosyal bir deneyim sunar. Serin suyun içinde aktif kalırken keyifli ve bol kahkahalı anlar sizi bekliyor.",
        en:
          "Action starts in the pool. This team game boosts your energy and creates a social, fun atmosphere. Stay active in cool water and enjoy plenty of laughter.",
        de:
          "Im Pool geht es los. Dieses Teamspiel steigert die Energie und bietet ein soziales, unterhaltsames Erlebnis. Bleiben Sie aktiv im kühlen Wasser und genießen Sie viele fröhliche Momente.",
        ru:
          "Движение начинается в бассейне. Эта командная игра заряжает энергией и дарит живое общение. Оставайтесь активными в прохладной воде и наслаждайтесь весёлыми моментами.",
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
        ru: "Вечерняя программа",
      },
      title: {
        tr: "Gece şovları & eğlenceler",
        en: "Evening shows & entertainment",
        de: "Abendshows & Unterhaltung",
        ru: "Вечерние шоу и развлечения",
      },
      text: {
        tr:
          "Güneş battıktan sonra Kaila Beach Hotel’de atmosfer bambaşka bir enerjiye bürünür. Her akşam farklı bir eğlence programı sunulur: akrobatik dans şovları, özel temalı geceler, canlı müzik veya DJ performansları.",
        en:
          "After sunset, Kaila Beach Hotel takes on a different energy. A new entertainment program is offered each evening, including acrobatic dance shows, themed nights, live music, and DJ performances.",
        de:
          "Nach Sonnenuntergang bekommt das Kaila Beach Hotel eine besondere Energie. Jeden Abend gibt es ein anderes Unterhaltungsprogramm: akrobatische Tanzshows, Themenabende, Live-Musik oder DJ-Auftritte.",
        ru:
          "После заката в Kaila Beach Hotel царит особая атмосфера. Каждый вечер проходит новая развлекательная программа: акробатические шоу, тематические вечера, живая музыка или DJ-сеты.",
      },
      images: [
        {
          src: "assets/images/activities/night-pool.png",
          alt: {
            tr: "Gece havuz etkinliği",
            en: "Night pool activity",
            de: "Abendaktivität am Pool",
            ru: "Вечерняя активность у бассейна",
          },
        },
        {
          src: "assets/images/activities/night-show.png",
          alt: {
            tr: "Gece gösterisi",
            en: "Night show",
            de: "Abendshow",
            ru: "Вечернее шоу",
          },
        },
      ],
    },
    {
      title: {
        tr: "Fitness merkezi",
        en: "Fitness centre",
        de: "Fitnessbereich",
        ru: "Фитнес-центр",
      },
      text: {
        tr:
          "Tam donanımlı fitness merkezinde koşu bantları, ağırlıklar ve modern spor ekipmanları bulunur. Tatil boyunca formda kalmak isteyen misafirler için motive edici bir alan sunar.",
        en:
          "The fully equipped fitness centre includes treadmills, weights, and modern training equipment. It offers a motivating space for guests who want to stay in shape during their holiday.",
        de:
          "Im voll ausgestatteten Fitnessbereich stehen Laufbänder, Gewichte und moderne Trainingsgeräte bereit. Ein motivierender Bereich für Gäste, die auch im Urlaub fit bleiben möchten.",
        ru:
          "В полностью оборудованном фитнес-центре есть беговые дорожки, веса и современные тренажёры. Это удобное место для гостей, которые хотят оставаться в форме во время отдыха.",
      },
      images: [
        {
          src: "assets/images/activities/fitness.png",
          alt: {
            tr: "Fitness merkezi",
            en: "Fitness centre",
            de: "Fitnessbereich",
            ru: "Фитнес-центр",
          },
        },
        {
          src: "assets/images/activities/fitness-2.png",
          alt: {
            tr: "Fitness merkezi ekipmanları",
            en: "Fitness centre equipment",
            de: "Fitnessgeräte im Fitnessbereich",
            ru: "Оборудование фитнес-центра",
          },
        },
      ],
    },
    {
      title: {
        tr: "Alışveriş alanı",
        en: "Shopping area",
        de: "Einkaufsbereich",
        ru: "Торговая зона",
      },
      text: {
        tr:
          "09:00–23:00 saatleri arasında fotoğrafçı, deri mağazası, market ve kuaför hizmetleri kullanılabilir.",
        en:
          "From 09:00 to 23:00, guests can access photographer, leather shop, market, and hairdresser services.",
        de:
          "Von 09:00 bis 23:00 stehen Fotograf, Ledergeschäft, Markt und Friseur zur Verfügung.",
        ru:
          "С 09:00 до 23:00 доступны услуги фотографа, магазина кожи, маркета и парикмахера.",
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
