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
      pl: "Ekskluzywne zniżki dla gości hotelu",
      ru: "Эксклюзивные скидки для гостей отеля",
      da: "Eksklusive rabatter til hotelgæster",
      cs: "Exkluzivní slevy pro hosty hotelu",
      ro: "Reduceri exclusive pentru oaspeții hotelului",
      nl: "Exclusieve kortingen voor hotelgasten",
      sk: "Exkluzívne zľavy pre hostí hotela",
    },
    lead: {
      tr:
        "Bu bölümde otelin anlaşmalı olduğu iki noktada (Moss Beach ve Sinton) Kaila misafirlerine tanınan %10 indirim açıklanır. Her iki mekân dışarıdan da kullanılabilir; indirim yalnızca otelde konaklayan misafirlerimize özeldir.",
      en:
        "Your 10% guest discount at Moss Beach and Sinton — explained here. Both venues are open to visitors who are not staying at the hotel; the discount applies only to Kaila Hotels guests.",
      de:
        "Ihr 10 % Gästerabatt bei Moss Beach und Sinton — hier erklärt. Beide sind auch für externe Besucher geöffnet; der Rabatt gilt nur für Kaila-Hotels-Gäste.",
      pl: "10% zniżki dla gości w Moss Beach i Sinton — wyjaśnienie poniżej. Oba lokale są dostępne także dla osób spoza hotelu; zniżka dotyczy wyłącznie gości Kaila Hotels.",
      ru: "Здесь описана скидка 10% для гостей Kaila в Moss Beach и Sinton. Оба заведения доступны и посторонним посетителям; скидка действует только для гостей отелей Kaila.",
      da: "Her forklares jeres 10% gæsterabat hos Moss Beach og Sinton. Begge steder er åbne for besøgende uden for hotellet; rabatten gælder kun Kaila Hotels-gæster.",
      cs: "Zde je vysvětlena 10% sleva pro hosty Kaila v Moss Beach a Sinton. Oba podniky navštíví i hosté mimo hotel; sleva platí jen pro hosty Kaila Hotels.",
      ro: "Aici este explicată reducerea de 10% pentru oaspeții Kaila la Moss Beach și Sinton. Ambele locații sunt deschise și vizitatorilor care nu cazează; reducerea se aplică doar oaspeților Kaila Hotels.",
      nl: "Hier leggen we je 10% gastenkorting bij Moss Beach en Sinton uit. Beide locaties zijn ook open voor bezoekers zonder overnachting; de korting geldt alleen voor Kaila Hotels-gasten.",
      sk: "Tu je vysvetlená 10% zľava pre hostí Kaila v Moss Beach a Sinton. Obe prevádzky sú dostupné aj návštevníkom mimo hotel; zľava platí len pre hostí Kaila Hotels.",
    },
  };

  var HIGHLIGHT = {
    tr: "Kaila Hotels misafirlerine özel %10 indirim",
    en: "10% off for Kaila Hotels guests",
    de: "10 % Rabatt für Kaila-Hotels-Gäste",
    pl: "10% zniżki dla gości Kaila Hotels",
    ru: "10% скидка для гостей Kaila Hotels",
    da: "10% rabat til Kaila Hotels-gæster",
    cs: "10% sleva pro hosty Kaila Hotels",
    ro: "10% reducere pentru oaspeții Kaila Hotels",
    nl: "10% korting voor Kaila Hotels-gasten",
    sk: "10% zľava pre hostí Kaila Hotels",
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
            pl: "Bar Moss Beach i widok na morze",
            ru: "Бар Moss Beach и вид на море",
            da: "Moss Beach bar og havudsigt",
            cs: "Bar Moss Beach a výhled na moře",
            ro: "Barul Moss Beach și vedere la mare",
            nl: "Moss Beach-bar en zeezicht",
            sk: "Bar Moss Beach a výhľad na more",
          },
        },
        {
          img: "assets/images/discount/moss-2.png",
          alt: {
            tr: "Moss Beach restaurant ortamı",
            en: "Moss Beach restaurant atmosphere",
            de: "Atmosphäre Moss Beach Restaurant",
            pl: "Atmosfera restauracji Moss Beach",
            ru: "Атмосфера ресторана Moss Beach",
            da: "Stemning på Moss Beach Restaurant",
            cs: "Atmosféra restaurace Moss Beach",
            ro: "Atmosfera restaurantului Moss Beach",
            nl: "Sfeer bij Moss Beach Restaurant",
            sk: "Atmosféra reštaurácie Moss Beach",
          },
        },
      ],
      title: {
        tr: "Moss Beach Bar & Restaurant",
        en: "Moss Beach Bar & Restaurant",
        de: "Moss Beach Bar & Restaurant",
        pl: "Moss Beach Bar & Restaurant",
        ru: "Moss Beach Bar & Restaurant",
        da: "Moss Beach Bar & Restaurant",
        cs: "Moss Beach Bar & Restaurant",
        ro: "Moss Beach Bar & Restaurant",
        nl: "Moss Beach Bar & Restaurant",
        sk: "Moss Beach Bar & Restaurant",
      },
      paras: [
        {
          tr:
            "Moss Beach, 10:00–19:00 saatleri arasında açık olup, deniz kenarında sakin ve huzurlu bir kaçamak noktasıdır. Taze ve sağlıklı bowl kaseler ve lezzetli hafif atıştırmalıklarla, deniz havası eşliğinde keyifli ve rahat bir mola verebilirsiniz.",
          en:
            "Moss Beach is open 10:00–19:00 — a calm seaside spot for a relaxing break. Enjoy fresh, healthy bowls and light bites with sea air and a laid-back mood.",
          de:
            "Moss Beach hat 10:00–19:00 geöffnet — ruhiger Ort am Meer. Frische Bowls und leichte Snacks mit Meeresbrise.",
          pl: "Moss Beach czynne 10:00–19:00 — spokojne miejsce nad morzem na relaks. Świeże, zdrowe miski i lekkie przekąski przy morskim powietrzu i swobodnej atmosferze.",
          ru: "Moss Beach открыт с 10:00 до 19:00 — спокойное место у моря для отдыха. Свежие полезные боулы и лёгкие закуски с морским бризом и расслабленной атмосферой.",
          da: "Moss Beach har åbent 10:00–19:00 — et roligt sted ved vandet. Friske, sunde bowls og lette snacks med havluft og afslappet stemning.",
          cs: "Moss Beach má otevřeno 10:00–19:00 — klidné místo u moře. Čerstvé zdravé mísy a lehké občerstvení s mořským vzduchem.",
          ro: "Moss Beach este deschis 10:00–19:00 — loc liniștit la mare. Boluri proaspete și gustări ușoare cu aer marin și atmosferă relaxată.",
          nl: "Moss Beach is open 10:00–19:00 — een rustige plek aan zee. Verse, gezonde bowls en lichte hapjes met zeelucht.",
          sk: "Moss Beach má otvorené 10:00–19:00 — pokojné miesto pri mori. Čerstvé zdravé misky a ľahké občerstvenie s morským vzduchom.",
        },
        {
          tr:
            "Yerel alkollü ve alkolsüz içecekler, çay, kahve, meyve suları ve yiyecekler ekstra olarak temin edilebilir. Kaila Hotels misafirlerine özel %10 indirim avantajı sunulmaktadır.",
          en:
            "Local alcoholic and soft drinks, tea, coffee, juices and food are available for an extra charge. Kaila Hotels guests enjoy an exclusive 10% discount.",
          de:
            "Lokale alkoholische und alkoholfreie Getränke, Tee, Kaffee, Säfte und Speisen gegen Aufpreis. Kaila-Hotels-Gäste erhalten 10 % Rabatt.",
          pl: "Lokalne napoje alkoholowe i bezalkoholowe, herbata, kawa, soki i jedzenie są dodatkowo płatne. Goście Kaila Hotels mają ekskluzywną zniżkę 10%.",
          ru: "Местные алкогольные и безалкогольные напитки, чай, кофе, соки и еда — за доплату. Гостям Kaila Hotels — эксклюзивная скидка 10%.",
          da: "Lokale drikkevarer, te, kaffe, juice og mad mod tillæg. Kaila Hotels-gæster får eksklusiv 10% rabat.",
          cs: "Místní alkoholické i nealkoholické nápoje, čaj, káva, džusy a jídlo za příplatek. Hosté Kaila Hotels mají exkluzivní slevu 10 %.",
          ro: "Băuturi locale, ceai, cafea, sucuri și mâncare contra cost. Oaspeții Kaila Hotels au reducere exclusivă de 10%.",
          nl: "Lokale dranken, thee, koffie, sapjes en eten tegen meerprijs. Kaila Hotels-gasten krijgen exclusief 10% korting.",
          sk: "Miestne nápoje, čaj, káva, džúsy a jedlo za doplatok. Hostia Kaila Hotels majú exkluzívnu zľavu 10 %.",
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
            pl: "Sinton BBQ Restaurant",
            ru: "Ресторан Sinton BBQ",
            da: "Sinton BBQ Restaurant",
            cs: "Restaurace Sinton BBQ",
            ro: "Restaurant Sinton BBQ",
            nl: "Sinton BBQ Restaurant",
            sk: "Reštaurácia Sinton BBQ",
          },
        },
        {
          img: "assets/images/discount/sinton-2.png",
          alt: {
            tr: "Sinton BBQ iç mekân ve servis",
            en: "Sinton BBQ indoor dining",
            de: "Sinton BBQ Innenbereich",
            pl: "Sinton BBQ — jadalnia wewnątrz",
            ru: "Sinton BBQ — зал и сервис",
            da: "Sinton BBQ indendørs servering",
            cs: "Sinton BBQ — vnitřní prostor",
            ro: "Sinton BBQ — interior și serviciu",
            nl: "Sinton BBQ binnen eten",
            sk: "Sinton BBQ — vnútorné priestory",
          },
        },
      ],
      title: {
        tr: "Sinton BBQ Restaurant",
        en: "Sinton BBQ Restaurant",
        de: "Sinton BBQ Restaurant",
        pl: "Sinton BBQ Restaurant",
        ru: "Sinton BBQ Restaurant",
        da: "Sinton BBQ Restaurant",
        cs: "Sinton BBQ Restaurant",
        ro: "Sinton BBQ Restaurant",
        nl: "Sinton BBQ Restaurant",
        sk: "Sinton BBQ Restaurant",
      },
      paras: [
        {
          tr:
            "Sinton, Amerikan usulü füme etleri ve özenle hazırlanan hamburgerleriyle güçlü ve iddialı lezzetler sunan keyifli bir mekândır. Sıcak ve enerjik atmosferini, özel imza kokteylleriyle tamamlar.",
          en:
            "Sinton serves bold flavours with American-style smoked meats and carefully crafted burgers — a lively spot where signature cocktails complete the warm, energetic atmosphere.",
          de:
            "Sinton bietet kräftige Aromen mit amerikanisch geräucherten Fleischspezialitäten und Burgern — warme Atmosphäre und Signature-Cocktails.",
          pl: "Sinton serwuje wyraziste smaki: wędzone mięsa w stylu amerykańskim i starannie przygotowane burgery — tętniące miejsce, gdzie koktajle sygnaturowe dopełniają ciepłą, energiczną atmosferę.",
          ru: "Sinton — живое место с насыщенными вкусами: копчёные мяса в американском стиле и бургеры; авторские коктейли дополняют тёплую энергичную атмосферу.",
          da: "Sinton byder på kraftfulde smage med amerikansk røget kød og håndlavede burgere — et livligt sted, hvor signaturcocktails fuldender den varme stemning.",
          cs: "Sinton nabízí výrazné chutě s americkým uzeným masem a burgery — živé místo, kde signaturní koktejly doplňují teplou atmosféru.",
          ro: "Sinton oferă arome puternice cu afumături în stil american și burgeri artizanali — loc plin de viață, unde cocktailurile semnătură completează atmosfera caldă.",
          nl: "Sinton serveert krachtige smaken met Amerikaanse gerookte vleeswaren en burgers — levendig, met signature cocktails in een warme sfeer.",
          sk: "Sinton ponúka výrazné chute s americkým údeným mäsom a burgerami — živé miesto, kde signatúrne koktaily dopĺňajú teplú atmosféru.",
        },
        {
          tr:
            "Kaila Hotels misafirlerine özel %10 indirim avantajı sunulmaktadır. Restoranımız, pazartesi günleri hariç her gün 13:00–22:00 saatleri arasında hizmet vermektedir.",
          en:
            "Kaila Hotels guests enjoy an exclusive 10% discount. We are open 13:00–22:00 every day except Mondays.",
          de:
            "10 % Rabatt für Kaila-Hotels-Gäste. Geöffnet 13:00–22:00, montags geschlossen.",
          pl: "Goście Kaila Hotels mają ekskluzywną zniżkę 10%. Czynne 13:00–22:00 codziennie z wyjątkiem poniedziałków.",
          ru: "Гостям Kaila Hotels — эксклюзивная скидка 10%. Ресторан открыт ежедневно 13:00–22:00, кроме понедельников.",
          da: "Kaila Hotels-gæster får eksklusiv 10% rabat. Åbent 13:00–22:00 alle dage undtagen mandage.",
          cs: "Hosté Kaila Hotels mají exkluzivní slevu 10 %. Otevřeno 13:00–22:00 denně kromě pondělí.",
          ro: "Oaspeții Kaila Hotels au reducere exclusivă de 10%. Deschis 13:00–22:00 în fiecare zi, exceptând lunea.",
          nl: "Kaila Hotels-gasten krijgen exclusief 10% korting. Open 13:00–22:00, behalve maandag.",
          sk: "Hostia Kaila Hotels majú exkluzívnu zľavu 10 %. Otvorené 13:00–22:00 denne okrem pondelka.",
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
    hero.appendChild(
      el("p", "discount-hero__kicker", T({
        tr: "%10 misafir avantajı",
        en: "10% guest benefit",
        de: "10 % Gästevorteil",
        pl: "10% korzyści dla gości",
        ru: "10% преимущество для гостей",
        da: "10% gæstefordel",
        cs: "10% výhoda pro hosty",
        ro: "Beneficiu 10% pentru oaspeți",
        nl: "10% gastenvoordeel",
        sk: "10% výhoda pre hostí",
      }))
    );
    hero.appendChild(el("h3", "discount-hero__title", T(HERO.title)));
    hero.appendChild(el("p", "discount-hero__lead", T(HERO.lead)));
    root.appendChild(hero);

    var grid = el("div", "discount-grid");
    ITEMS.forEach(function (v) {
      var card = el("article", "discount-card");
      var badge = el("span", "discount-badge", "%10");
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
