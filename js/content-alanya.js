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

  var LEAD = {
    tr: "Bu bölümde Alanya merkezine yakın gezilebilecek önemli noktalar kısaca anlatılır. Tesisin merkeze yaklaşık mesafesi ve ulaşım: yaklaşık 3 km; toplu taşıma veya taksi ile kolay.",
    en: "Highlights near Alanya centre — short descriptions below. The resort is about 3 km from the centre — easy by taxi or public transport.",
    de: "Sehenswürdigkeiten nahe Alanya — kurz beschrieben. Die Anlage liegt ca. 3 km vom Zentrum — Taxi oder ÖPNV.",
    ru: "Что посмотреть рядом с центром Аланьи — кратко ниже. Отель около 3 км от центра — такси или общественный транспорт.",
  };

  /** Sıra: Dim → Kleopatra → Kızılkule → Kale → Teleferik → Damlataş — görseller dosya adlarıyla eşleşir */
  var ITEMS = [
    {
      img: "assets/images/alanya/dim.png",
      title: { tr: "Dim Çayı", en: "Dim River", de: "Dim-Fluss", ru: "Река Дим" },
      alt: {
        tr: "Dim Çayı ve doğa",
        en: "Dim River and nature",
        de: "Dim-Fluss und Natur",
        ru: "Река Дим и природа",
      },
      text: {
        tr:
          "Toros Dağları’ndan gelen buz gibi suyu sayesinde yazın serinlemek için çok tercih edilir. Çay kenarında su üstünde kurulmuş restoranlarda yemek yiyebilirsin. Doğa ile iç içe, sakin ve ferah bir ortam sunar. Piknik ve mangal için de oldukça uygundur. Özellikle sıcak havalarda kaçış noktasıdır.",
        en:
          "Ice-cold water from the Taurus Mountains makes it a favourite summer escape. Eat at restaurants built over the river — a calm, natural setting. Great for picnics and barbecues, especially on hot days.",
        de:
          "Eiskaltes Wasser aus dem Taurus macht den Fluss im Sommer beliebt. Restaurants über dem Wasser, ruhige Natur — ideal zum Picknick und Grillen an heißen Tagen.",
        ru:
          "Ледяная вода с Тавра — любимое место прохладиться летом. Рестораны над водой, спокойная природа, пикники и шашлыки в жаркие дни.",
      },
    },
    {
      img: "assets/images/alanya/kleopatra.png",
      title: {
        tr: "Kleopatra Plajı",
        en: "Cleopatra Beach",
        de: "Kleopatra-Strand",
        ru: "Пляж Клеопатры",
      },
      alt: {
        tr: "Kleopatra plajı ve deniz",
        en: "Cleopatra Beach and sea",
        de: "Kleopatra-Strand und Meer",
        ru: "Пляж Клеопатры и море",
      },
      text: {
        tr:
          "Alanya’nın en ünlü plajlarından biridir ve ince kumu ile berrak deniziyle bilinir. Efsaneye göre Kleopatra burada yüzmüştür. Deniz genellikle temiz ve yüzmeye uygundur. Sahil boyunca yürüyüş yapmak da oldukça keyiflidir. Gün batımı manzarası oldukça etkileyicidir.",
        en:
          "One of Alanya’s best-known beaches, famous for fine sand and clear water — legend says Cleopatra swam here. The sea is usually clean and good for swimming. A lovely stroll along the shore; sunsets are especially impressive.",
        de:
          "Einer der bekanntesten Strände Alanyas, feiner Sand und klares Wasser — der Legende nach badete Kleopatra hier. Gutes Schwimmen, schöne Promenade, beeindruckende Sonnenuntergänge.",
        ru:
          "Один из самых известных пляжей: мелкий песок и прозрачное море, по легенде здесь купалась Клеопатра. Чистое море, прогулка вдоль берега, закаты впечатляют.",
      },
    },
    {
      img: "assets/images/alanya/kizilkule.png",
      title: { tr: "Kızılkule", en: "Red Tower", de: "Roter Turm", ru: "Кызыл-куле" },
      alt: {
        tr: "Kızılkule ve liman",
        en: "Red Tower and harbour",
        de: "Roter Turm und Hafen",
        ru: "Красная башня и гавань",
      },
      text: {
        tr:
          "13. yüzyılda Selçuklular tarafından limanı korumak amacıyla inşa edilmiştir. Kırmızı tuğlalı yapısı ile Alanya’nın simgelerindendir. İçine girip üst katlara çıktığında güzel bir liman manzarası görürsün. Tarihi atmosferi oldukça etkileyicidir. Fotoğraf çekmek için popüler bir noktadır.",
        en:
          "Built in the 13th century by the Seljuks to protect the harbour. Its red brick makes it an Alanya landmark. Climb to the upper levels for harbour views — historic atmosphere and a favourite photo spot.",
        de:
          "Im 13. Jahrhundert von den Seldschuken zum Schutz des Hafens errichtet. Rotes Backstein — Wahrzeichen Alanyas. Oben Hafenblick, eindrucksvolle Geschichte, beliebt für Fotos.",
        ru:
          "Построена в XIII веке сельджуками для защиты гавани. Красный кирпич — символ Аланьи. С верхних ярусов вид на порт, атмосфера истории, популярное место для фото.",
      },
    },
    {
      img: "assets/images/alanya/kale.png",
      title: { tr: "Alanya Kalesi", en: "Alanya Castle", de: "Festung Alanya", ru: "Крепость Алании" },
      alt: {
        tr: "Alanya Kalesi ve manzara",
        en: "Alanya Castle and view",
        de: "Festung Alanya und Ausblick",
        ru: "Крепость Аланьи и вид",
      },
      text: {
        tr:
          "Şehri tepeden gören büyük ve tarihi bir kaledir. İçinde eski evler, camiler ve çeşitli tarihi yapılar bulunur. Manzarası özellikle gün batımında çok güzeldir. Alanya’yı en iyi izleyebileceğin yerlerden biridir. Hem tarih hem doğa deneyimi sunar.",
        en:
          "A large historic fortress overlooking the town — old houses, mosques and monuments inside. The view is especially beautiful at sunset; one of the best places to see Alanya. History and nature together.",
        de:
          "Große historische Festung über der Stadt — alte Häuser, Moscheen, Denkmäler. Besonders bei Sonnenuntergang ein herrlicher Blick — Geschichte und Natur.",
        ru:
          "Большая историческая крепость над городом — старые дома, мечети, памятники. Вид особенно на закате; одно из лучших мест, чтобы увидеть Аланью.",
      },
    },
    {
      img: "assets/images/alanya/teleferik.png",
      title: {
        tr: "Alanya Teleferik",
        en: "Alanya Cable Car",
        de: "Alanya-Seilbahn",
        ru: "Канатная дорога Аланьи",
      },
      alt: {
        tr: "Alanya teleferik manzarası",
        en: "Alanya cable car view",
        de: "Seilbahn Alanya",
        ru: "Канатная дорога Аланьи",
      },
      text: {
        tr:
          "Kleopatra Plajı’ndan kaleye ulaşımı sağlayan turistik bir ulaşım aracıdır. Kısa sürede yukarı çıkarken eşsiz manzaralar izlenir. Deniz ve şehir manzarası oldukça etkileyicidir. Özellikle gün batımında tercih edilir. Hem keyifli hem pratik bir deneyim sunar.",
        en:
          "A scenic ride from Cleopatra Beach up toward the castle. Short trip with unforgettable views over sea and city — especially popular at sunset. Fun and practical.",
        de:
          "Vom Kleopatra-Strand Richtung Burg — kurze Fahrt mit einzigartigem Meer- und Stadtpanorama, besonders bei Sonnenuntergang. Angenehm und praktisch.",
        ru:
          "Канатная дорога от пляжа Клеопатры к крепости — короткая поездка с видами на море и город; на закате особенно красиво. Удобно и живописно.",
      },
    },
    {
      img: "assets/images/alanya/damlatas.png",
      title: {
        tr: "Damlataş Mağarası",
        en: "Damlataş Cave",
        de: "Damlataş-Höhle",
        ru: "Пещера Дамлаташ",
      },
      alt: {
        tr: "Damlataş Mağarası içi",
        en: "Inside Damlataş Cave",
        de: "In der Damlataş-Höhle",
        ru: "Пещера Дамлаташ",
      },
      text: {
        tr:
          "1948 yılında keşfedilmiş doğal bir mağaradır. İçinde sarkıt ve dikit oluşumları bulunur. Nemli ve sabit sıcaklığa sahip havası ile dikkat çeker. Astım hastalarına iyi geldiği söylenir. Küçük ama etkileyici bir gezi noktasıdır.",
        en:
          "A natural cave discovered in 1948, with stalactites and stalagmites. Its humid, steady temperature is distinctive — some say it helps asthma sufferers. Small but memorable.",
        de:
          "Natürliche Höhle, 1948 entdeckt, mit Tropfsteinen. Feuchte, gleichbleibende Temperatur — traditionell auch bei Asthma erwähnt. Klein, aber eindrucksvoll.",
        ru:
          "Природная пещера, открытая в 1948 году, сталактиты и сталагмиты. Влажный постоянный микроклимат; говорят, полезен при астме. Небольшая, но запоминающаяся.",
      },
    },
  ];

  function renderAlanyaModule(container) {
    var root = el("div", "viona-mod viona-mod--alanya");

    var lead = el("p", "viona-mod-lead");
    lead.textContent = T(LEAD);
    root.appendChild(lead);

    var stack = el("div", "venue-stack");
    ITEMS.forEach(function (v) {
      var card = el("article", "venue-card venue-card--rest");
      var fig = el("div", "venue-card__media");
      var img = document.createElement("img");
      img.src = v.img;
      img.alt = T(v.alt);
      img.loading = "lazy";
      img.decoding = "async";
      fig.appendChild(img);
      var body = el("div", "venue-card__body");
      body.appendChild(el("h3", "venue-card__title", T(v.title)));
      body.appendChild(el("p", "venue-card__text", T(v.text)));
      card.appendChild(fig);
      card.appendChild(body);
      stack.appendChild(card);
    });
    root.appendChild(stack);
    container.appendChild(root);
  }

  window.renderAlanyaModule = renderAlanyaModule;
})();
