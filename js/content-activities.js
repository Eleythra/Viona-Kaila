(function () {
  "use strict";
  var P = window.VionaContent.pick;
  var activitiesCarouselTimerId = null;

  function clearActivitiesCarousel() {
    if (activitiesCarouselTimerId !== null) {
      clearInterval(activitiesCarouselTimerId);
      activitiesCarouselTimerId = null;
    }
  }

  function startActivitiesCarousel(trackEl) {
    clearActivitiesCarousel();
    var slides = trackEl.querySelectorAll(".activities-carousel-slide");
    if (slides.length < 2) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    var idx = 0;
    activitiesCarouselTimerId = window.setInterval(function () {
      slides[idx].classList.remove("activities-carousel-slide--active");
      slides[idx].setAttribute("aria-hidden", "true");
      idx = (idx + 1) % slides.length;
      slides[idx].classList.add("activities-carousel-slide--active");
      slides[idx].setAttribute("aria-hidden", "false");
    }, 4000);
  }

  window._vionaClearActivitiesCarousel = clearActivitiesCarousel;

  function T(row) {
    return P(row || {});
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function renderKv(pairs) {
    var dl = document.createElement("dl");
    dl.className = "beach-kv activities-kv";
    pairs.forEach(function (pair) {
      var dt = document.createElement("dt");
      dt.textContent = T(pair.label);
      var dd = document.createElement("dd");
      dd.textContent = typeof pair.value === "string" ? pair.value : T(pair.value);
      dl.appendChild(dt);
      dl.appendChild(dd);
    });
    return dl;
  }

  var CARDS = [
    {
      slides: [
        {
          img: "assets/images/activities/night-pool.png",
          alt: {
            tr: "Gece havuz ve otel ışıkları",
            en: "Evening pool and resort lights",
            de: "Abendstimmung am Pool",
            ru: "Вечер у бассейна",
          },
        },
        {
          img: "assets/images/activities/night-show.png",
          alt: {
            tr: "Gece gösterisi ve sahne",
            en: "Evening show on stage",
            de: "Abendshow auf der Bühne",
            ru: "Вечернее шоу на сцене",
          },
        },
      ],
      title: {
        tr: "Gece şovları & eğlenceler",
        en: "Evening shows & entertainment",
        de: "Abendshows & Unterhaltung",
        ru: "Вечерние шоу и развлечения",
      },
      text: {
        tr:
          "Güneş battıktan sonra Kaila Beach Hotel’de atmosfer bambaşka bir enerjiye bürünür. Her akşam misafirlerimizi farklı bir eğlence programı beklemektedir; akrobatik dans showları, özel temalı geceler, canlı müzik veya DJ performansları bunlardan yalnızca bazılarıdır. Animasyon ekibimiz sayesinde geceler; neşe, ritim ve Akdeniz ruhuyla dolu geçer.",
        en:
          "After sunset, Kaila Beach Hotel takes on a whole new energy. Each evening brings a different entertainment programme for our guests—acrobatic dance shows, themed nights, live music or DJ sets are just a few examples. Thanks to our animation team, evenings are filled with joy, rhythm and the spirit of the Mediterranean.",
        de:
          "Nach Sonnenuntergang gewinnt das Kaila Beach Hotel eine ganz eigene Energie. Jeden Abend erwartet Sie ein anderes Unterhaltungsprogramm: akrobatische Tanzshows, thematische Abende, Live-Musik oder DJ-Auftritte sind nur einige Beispiele. Dank unseres Animationsteams sind die Abende voller Lebensfreude, Rhythmus und Mittelmeerflair.",
        ru:
          "После заката в Kaila Beach Hotel царит особая атмосфера. Каждый вечер вас ждёт развлекательная программа: акробатические шоу, тематические вечера, живая музыка или выступления DJ — лишь часть того, что мы предлагаем. Благодаря команде анимации вечера наполнены радостью, ритмом и духом Средиземноморья.",
      },
    },
    {
      img: "assets/images/activities/fitness.png",
      alt: {
        tr: "Fitness merkezi ve spor aletleri",
        en: "Fitness centre and gym equipment",
        de: "Fitnessbereich und Geräte",
        ru: "Фитнес-зал и тренажёры",
      },
      title: {
        tr: "Fitness merkezi",
        en: "Fitness centre",
        de: "Fitnessbereich",
        ru: "Фитнес-центр",
      },
      text: {
        tr:
          "Tam donanımlı fitness merkezimizde enerjik bir antrenman için ihtiyacınız olan her şey var. Koşu bantları, ağırlıklar, modern spor aletleri ve gerekli tüm ekipmanlar sizi bekliyor. Rahat ve motive edici bir ortamda, tatiliniz boyunca formda kalmak için ideal bir alan sunmaktayız.",
        en:
          "Our fully equipped fitness centre has everything you need for an energetic workout. Treadmills, weights, modern machines and all essential equipment await you. In a comfortable, motivating setting, it is the ideal place to stay in shape throughout your holiday.",
        de:
          "In unserem voll ausgestatteten Fitnessbereich finden Sie alles für ein energiegeladenes Training: Laufbänder, Gewichte, moderne Geräte und die nötige Ausstattung. In einer angenehmen, motivierenden Atmosphäre bleiben Sie ideal in Form.",
        ru:
          "В нашем полностью оборудованном фитнес-зале есть всё для энергичной тренировки: беговые дорожки, веса, современные тренажёры и всё необходимое. Уютная, мотивирующая обстановка — идеальное место, чтобы оставаться в форме во время отпуска.",
      },
      kv: [
        {
          label: { tr: "Çalışma saatleri", en: "Opening hours", de: "Öffnungszeiten", ru: "Часы работы" },
          value: "07:00 – 19:00",
        },
      ],
    },
    {
      textOnly: true,
      title: {
        tr: "Alışveriş merkezi",
        en: "Shopping area",
        de: "Einkaufsbereich",
        ru: "Торговая зона",
      },
      text: {
        tr:
          "09:00 ile 23:00 arasında Fotoğrafçı, Deri Mağazası, Market ve Kuaför olarak hizmet vermektedirler.",
        en:
          "From 09:00 to 23:00, services include a photographer, leather shop, market and hairdresser.",
        de:
          "Von 09:00 bis 23:00 Uhr: Fotograf, Lederwaren, Markt und Friseur.",
        ru:
          "С 09:00 до 23:00 работают фотограф, магазин кожаных изделий, мини-маркет и парикмахерская.",
      },
    },
  ];

  function renderActivitiesModule(container) {
    clearActivitiesCarousel();
    var root = el("div", "viona-mod viona-mod--activities");

    var secTitle = el("p", "rest-section-title", T({ tr: "Aktiviteler", en: "Activities", de: "Aktivitäten", ru: "Активности" }));
    root.appendChild(secTitle);

    var lead = el("p", "viona-mod-lead");
    lead.textContent = T({
      tr:
        "Bu bölümde gece eğlenceleri, fitness ve alışveriş alanına dair genel bilgiler yer alır. Günlük program paylaşılmadığında yine de burada özet bilgilere yer verilir.",
      en:
        "Evening entertainment, fitness and shopping — overview below, including when no daily programme sheet is available.",
      de:
        "Abendprogramm, Fitness und Einkauf — Kurzüberblick; auch wenn kein Tagesplan ausliegt.",
      ru:
        "Вечерние развлечения, фитнес и торговая зона — краткий обзор, в том числе если нет листа с расписанием на день.",
    });
    root.appendChild(lead);

    var stack = el("div", "venue-stack");
    CARDS.forEach(function (c) {
      if (c.textOnly) {
        var textBlock = el("div", "activities-text-block");
        textBlock.appendChild(el("h3", "activities-text-block__title", T(c.title)));
        textBlock.appendChild(el("p", "activities-text-block__text", T(c.text)));
        stack.appendChild(textBlock);
        return;
      }

      var card = el("article", "venue-card venue-card--rest");
      var fig = el("div", "venue-card__media venue-card__media--activities-carousel");

      if (c.slides && c.slides.length) {
        var car = el("div", "activities-carousel");
        car.setAttribute("role", "region");
        car.setAttribute("aria-roledescription", "carousel");
        var track = el("div", "activities-carousel-track");
        c.slides.forEach(function (slide, i) {
          var slideEl = el(
            "div",
            "activities-carousel-slide" + (i === 0 ? " activities-carousel-slide--active" : "")
          );
          slideEl.setAttribute("aria-hidden", i === 0 ? "false" : "true");
          var img = document.createElement("img");
          img.src = slide.img;
          img.alt = T(slide.alt);
          img.decoding = "async";
          img.loading = i === 0 ? "eager" : "lazy";
          slideEl.appendChild(img);
          track.appendChild(slideEl);
        });
        car.appendChild(track);
        fig.appendChild(car);
        startActivitiesCarousel(track);
      } else {
        var img = document.createElement("img");
        img.src = c.img;
        img.alt = T(c.alt);
        img.loading = "lazy";
        fig.appendChild(img);
      }

      var body = el("div", "venue-card__body");
      var h = el("h3", "venue-card__title", T(c.title));
      var p = el("p", "venue-card__text", T(c.text));
      body.appendChild(h);
      body.appendChild(p);
      if (c.kv) body.appendChild(renderKv(c.kv));

      card.appendChild(fig);
      card.appendChild(body);
      stack.appendChild(card);
    });
    root.appendChild(stack);
    container.appendChild(root);
  }

  window.renderActivitiesModule = renderActivitiesModule;
})();
