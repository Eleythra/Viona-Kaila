(function () {
  "use strict";
  var P = window.VionaContent.pick;
  var discountCarouselTimers = [];

  function clearDiscountCarousels() {
    discountCarouselTimers.forEach(function (id) {
      clearInterval(id);
    });
    discountCarouselTimers = [];
  }

  function startDiscountCarousel(trackEl) {
    var slides = trackEl.querySelectorAll(".discount-carousel-slide");
    if (slides.length < 2) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    var idx = 0;
    var timerId = window.setInterval(function () {
      slides[idx].classList.remove("discount-carousel-slide--active");
      slides[idx].setAttribute("aria-hidden", "true");
      idx = (idx + 1) % slides.length;
      slides[idx].classList.add("discount-carousel-slide--active");
      slides[idx].setAttribute("aria-hidden", "false");
    }, 4500);
    discountCarouselTimers.push(timerId);
  }

  window._vionaClearDiscountCarousel = clearDiscountCarousels;

  function T(row) {
    return P(row || {});
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  var HERO = {
    title: {
      tr: "Otel misafirlerine özel indirimler",
      en: "Exclusive discounts for hotel guests",
      de: "Exklusive Rabatte für Hotelgäste",
      ru: "Скидки для гостей отеля",
    },
    lead: {
      tr:
        "Bu bölümde otelin anlaşmalı olduğu iki noktada (Moss Beach ve Sinton) Kaila misafirlerine tanınan %20 indirim açıklanır. Her iki mekân dışarıdan da kullanılabilir; indirim yalnızca otelde konaklayan misafirlerimize özeldir.",
      en:
        "Your 20% guest discount at Moss Beach and Sinton — explained here. Both venues are open to visitors who are not staying at the hotel; the discount applies only to Kaila Hotels guests.",
      de:
        "Ihr 20 % Gästerabatt bei Moss Beach und Sinton — hier erklärt. Beide sind auch für externe Besucher geöffnet; der Rabatt gilt nur für Kaila-Hotels-Gäste.",
      ru:
        "Скидка 20% в Moss Beach и Sinton для гостей отеля — описано здесь. Оба заведения доступны и без проживания; скидка только для гостей Kaila Hotels.",
    },
  };

  var HIGHLIGHT = {
    tr: "Kaila Hotels misafirlerine özel %20 indirim",
    en: "20% off for Kaila Hotels guests",
    de: "20 % Rabatt für Kaila-Hotels-Gäste",
    ru: "Скидка 20% для гостей Kaila Hotels",
  };

  var ITEMS = [
    {
      slides: [
        {
          img: "assets/images/discount/moss-1.png",
          alt: {
            tr: "Moss Beach bar ve deniz manzarası",
            en: "Moss Beach bar and sea view",
            de: "Moss Beach Bar und Meerblick",
            ru: "Moss Beach и вид на море",
          },
        },
        {
          img: "assets/images/discount/moss-2.png",
          alt: {
            tr: "Moss Beach restaurant ortamı",
            en: "Moss Beach restaurant atmosphere",
            de: "Atmosphäre Moss Beach Restaurant",
            ru: "Атмосфера Moss Beach",
          },
        },
      ],
      title: {
        tr: "Moss Beach Bar & Restaurant",
        en: "Moss Beach Bar & Restaurant",
        de: "Moss Beach Bar & Restaurant",
        ru: "Moss Beach Bar & Restaurant",
      },
      paras: [
        {
          tr:
            "Moss Beach, 10:00–19:00 saatleri arasında açık olup, deniz kenarında sakin ve huzurlu bir kaçamak noktasıdır. Taze ve sağlıklı bowl kaseler ve lezzetli hafif atıştırmalıklarla, deniz havası eşliğinde keyifli ve rahat bir mola verebilirsiniz.",
          en:
            "Moss Beach is open 10:00–19:00 — a calm seaside spot for a relaxing break. Enjoy fresh, healthy bowls and light bites with sea air and a laid-back mood.",
          de:
            "Moss Beach hat 10:00–19:00 geöffnet — ruhiger Ort am Meer. Frische Bowls und leichte Snacks mit Meeresbrise.",
          ru:
            "Moss Beach работает 10:00–19:00 — спокойное место у моря. Полезные боулы и лёгкие закуски, морской воздух.",
        },
        {
          tr:
            "Yerel alkollü ve alkolsüz içecekler, çay, kahve, meyve suları ve yiyecekler ekstra olarak temin edilebilir. Kaila Hotels misafirlerine özel %20 indirim avantajı sunulmaktadır.",
          en:
            "Local alcoholic and soft drinks, tea, coffee, juices and food are available for an extra charge. Kaila Hotels guests enjoy an exclusive 20% discount.",
          de:
            "Lokale alkoholische und alkoholfreie Getränke, Tee, Kaffee, Säfte und Speisen gegen Aufpreis. Kaila-Hotels-Gäste erhalten 20 % Rabatt.",
          ru:
            "Местные напитки, чай, кофе, соки и еда — за доплату. Для гостей Kaila Hotels — скидка 20%.",
        },
      ],
    },
    {
      slides: [
        {
          img: "assets/images/discount/sinton-1.png",
          alt: {
            tr: "Sinton BBQ Restaurant",
            en: "Sinton BBQ Restaurant",
            de: "Sinton BBQ Restaurant",
            ru: "Sinton BBQ Restaurant",
          },
        },
        {
          img: "assets/images/discount/sinton-2.png",
          alt: {
            tr: "Sinton BBQ iç mekân ve servis",
            en: "Sinton BBQ indoor dining",
            de: "Sinton BBQ Innenbereich",
            ru: "Sinton BBQ — зал",
          },
        },
      ],
      title: {
        tr: "Sinton BBQ Restaurant",
        en: "Sinton BBQ Restaurant",
        de: "Sinton BBQ Restaurant",
        ru: "Sinton BBQ Restaurant",
      },
      paras: [
        {
          tr:
            "Sinton, Amerikan usulü füme etleri ve özenle hazırlanan hamburgerleriyle güçlü ve iddialı lezzetler sunan keyifli bir mekândır. Sıcak ve enerjik atmosferini, özel imza kokteylleriyle tamamlar.",
          en:
            "Sinton serves bold flavours with American-style smoked meats and carefully crafted burgers — a lively spot where signature cocktails complete the warm, energetic atmosphere.",
          de:
            "Sinton bietet kräftige Aromen mit amerikanisch geräucherten Fleischspezialitäten und Burgern — warme Atmosphäre und Signature-Cocktails.",
          ru:
            "Sinton — смелые вкусы: копчёное мясо в американском стиле и бургеры, живая атмосфера и авторские коктейли.",
        },
        {
          tr:
            "Kaila Hotels misafirlerine özel %20 indirim avantajı sunulmaktadır. Restoranımız, pazartesi günleri hariç her gün 13:00–22:00 saatleri arasında hizmet vermektedir.",
          en:
            "Kaila Hotels guests enjoy an exclusive 20% discount. We are open 13:00–22:00 every day except Mondays.",
          de:
            "20 % Rabatt für Kaila-Hotels-Gäste. Geöffnet 13:00–22:00, montags geschlossen.",
          ru:
            "Скидка 20% для гостей Kaila Hotels. Режим: 13:00–22:00, выходной — понедельник.",
        },
      ],
    },
  ];

  function buildCarousel(slides) {
    var wrap = el("div", "discount-carousel");
    wrap.setAttribute("role", "region");
    wrap.setAttribute("aria-roledescription", "carousel");
    var track = el("div", "discount-carousel-track");
    slides.forEach(function (slide, i) {
      var slideEl = el(
        "div",
        "discount-carousel-slide" + (i === 0 ? " discount-carousel-slide--active" : "")
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
    wrap.appendChild(track);
    startDiscountCarousel(track);
    return wrap;
  }

  function renderDiscountModule(container) {
    clearDiscountCarousels();

    var root = el("div", "viona-mod viona-mod--discount");

    var hero = el("div", "discount-hero discount-hero--premium");
    hero.appendChild(el("p", "discount-hero__kicker", T({ tr: "%20 misafir avantajı", en: "20% guest benefit", de: "20 % Gästevorteil", ru: "Выгода 20%" })));
    hero.appendChild(el("h3", "discount-hero__title", T(HERO.title)));
    hero.appendChild(el("p", "discount-hero__lead", T(HERO.lead)));
    root.appendChild(hero);

    var grid = el("div", "discount-grid");
    ITEMS.forEach(function (v) {
      var card = el("article", "discount-card");
      var badge = el("span", "discount-badge", "%20");
      var media = el("div", "discount-card__media");
      media.appendChild(buildCarousel(v.slides));
      var body = el("div", "discount-card__body");
      body.appendChild(el("h4", "discount-card__title", T(v.title)));
      body.appendChild(el("p", "discount-card__highlight", T(HIGHLIGHT)));
      v.paras.forEach(function (para) {
        body.appendChild(el("p", "discount-card__text", T(para)));
      });
      card.appendChild(badge);
      card.appendChild(media);
      card.appendChild(body);
      grid.appendChild(card);
    });

    root.appendChild(grid);
    container.appendChild(root);
  }

  window.renderDiscountModule = renderDiscountModule;
})();
