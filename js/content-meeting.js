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

  function meetFigure(src, altRow) {
    var fig = el("figure", "meet-figure");
    var img = document.createElement("img");
    img.src = src;
    img.alt = T(altRow);
    img.loading = "lazy";
    img.decoding = "async";
    fig.appendChild(img);
    return fig;
  }

  var VENUE_LINES = [
    {
      tr: "Astra Ball Room — Toplantı salonu · Organizasyon alanı — Ücretli — Misafir İlişkileri ile önceden planlanır",
      en: "Astra Ball Room — Meeting room · Event space — Charged — Arrange in advance with Guest Relations",
      de: "Astra Ball Room — Tagungsraum · Veranstaltungsfläche — kostenpflichtig — nach Absprache mit Guest Relations",
      pl: "Astra Ball Room — sala konferencyjna · przestrzeń eventowa — płatne — uzgodnij wcześniej z Guest Relations",
    },
    {
      tr: "Function Meeting Room — Toplantı salonu · Organizasyon alanı — Ücretli — Misafir İlişkileri ile önceden planlanır",
      en: "Function Meeting Room — Meeting room · Event space — Charged — Arrange in advance with Guest Relations",
      de: "Function Meeting Room — Tagungsraum · Veranstaltungsfläche — kostenpflichtig — nach Absprache mit Guest Relations",
      pl: "Function Meeting Room — sala spotkań · przestrzeń eventowa — płatne — uzgodnij wcześniej z Guest Relations",
    },
    {
      tr: "Business Center — İş merkezi · Hizmet alanı — Ücretli",
      en: "Business Center — Business hub · Service area — Charged",
      de: "Business Center — Business-Bereich · Service — kostenpflichtig",
      pl: "Business Center — centrum biznesowe · strefa usług — płatne",
    },
  ];

  var SECTIONS = [
    {
      title: {
        tr: "1. Kurumsal etkinlikler",
        en: "1. Corporate events",
        de: "1. Firmenveranstaltungen",
        pl: "1. Corporate events",
      },
      img: "assets/images/meeting/astra-corporate.png",
      alt: {
        tr: "Astra Balo Salonu toplantı ve kurumsal etkinlik düzeni",
        en: "Astra Ballroom set up for meetings and corporate events",
        de: "Astra-Ballsaal für Tagungen und Firmenveranstaltungen",
        pl: "Astra Ballroom przygotowany na spotkania i eventy firmowe",
      },
      paras: [
        {
          tr:
            "Astra Balo Salonu; toplantılar, seminerler, uluslararası workshop’lar ve eğitim organizasyonları dâhil olmak üzere her türlü kurumsal etkinlik için çok yönlü ve tam donanımlı bir ortam sunmaktadır. Salon, modern ses ve görüntü sistemleri, esnek yerleşim seçenekleri ve konforlu oturma düzeniyle her ölçekte profesyonel organizasyonu destekleyecek şekilde tasarlanmıştır.",
          en:
            "The Astra Ballroom offers a versatile, fully equipped setting for all kinds of corporate events, including meetings, seminars, international workshops and training programmes. It is designed with modern audio-visual systems, flexible layouts and comfortable seating to support professional events of any scale.",
          de:
            "Der Astra-Ballsaal bietet eine vielseitige, voll ausgestattete Umgebung für sämtliche Firmenveranstaltungen — von Tagungen und Seminaren über internationale Workshops bis zu Schulungen. Moderne Bild- und Tontechnik, flexible Bestuhlung und komfortable Sitzplätze unterstützen professionelle Events jeder Größe.",
          pl: "Astra Ballroom to elastyczna, w pełni wyposażona przestrzeń na spotkania, seminaria, warsztaty międzynarodowe i szkolenia. Nowoczesny sprzęt AV, układy sal i komfortowe miejsca wspierają wydarzenia każdej skali.",
        },
        {
          tr:
            "Tiyatro, sınıf, banket, U düzeni ya da kare masa düzeni gibi farklı yerleşim alternatifleri, grubunuzun ihtiyaçlarına göre kolayca uygulanabilir. Geniş yapısı ve Kaila Beach Hotel bünyesindeki grup konaklama imkânları sayesinde, iş ve konaklamayı bir arada planlamak isteyen firmalar için ideal bir tercihtir.",
          en:
            "Layouts such as theatre, classroom, banquet, U-shape or square tables can be adapted easily to your group’s needs. Its generous space and on-site group accommodation at Kaila Beach Hotel make it an ideal choice for companies that want to combine business and lodging.",
          de:
            "Theater-, Klassenzimmer-, Bankett-, U- oder Tischgruppenbestuhlung lässt sich flexibel an Ihre Gruppe anpassen. Die großzügige Fläche und Gruppenunterkünfte im Kaila Beach Hotel machen den Saal ideal für Firmen, die Arbeit und Übernachtung kombinieren möchten.",
          pl: "Układy typu teatr, szkoła, bankiet, U lub stoliki kwadratowe łatwo dopasujemy do grupy. Przestronność i noclegi grupowe w Kaila Beach Hotel to idealne połączenie pracy i zakwaterowania.",
        },
      ],
    },
    {
      title: {
        tr: "2. Özel etkinlikler",
        en: "2. Private celebrations",
        de: "2. Private Anlässe",
        pl: "2. Private celebrations",
      },
      img: "assets/images/meeting/special-event.png",
      alt: {
        tr: "Özel davet ve organizasyon atmosferi",
        en: "Private celebration and event atmosphere",
        de: "Atmosphäre für private Feiern",
        pl: "Klimat prywatnych uroczystości i wydarzeń",
      },
      paras: [
        {
          tr:
            "Astra Balo Salonu yalnızca kurumsal etkinlikler için değil; düğün, nişan, doğum günü, gala yemeği gibi özel davetleriniz için de unutulmaz bir atmosfer sunar. Zarif mimarisi ve sıcak ambiyansı, her türlü özel organizasyon için şık bir arka plan oluşturur.",
          en:
            "The Astra Ballroom is not only for corporate use — it creates a memorable setting for weddings, engagements, birthdays, gala dinners and other private celebrations. Its elegant architecture and warm ambience provide a stylish backdrop for any special occasion.",
          de:
            "Der Astra-Ballsaal eignet sich nicht nur für Firmen — auch für Hochzeiten, Verlobungen, Geburtstage, Galadinner und private Feiern schafft er eine unvergessliche Atmosphäre. Elegante Architektur und warme Stimmung bilden einen stilvollen Rahmen.",
          pl: "Astra Ballroom to nie tylko eventy firmowe — to miejsce na wesela, zaręczyny, urodziny, kolacje galowe i inne święta. Elegancka architektura i ciepła atmosfera tworzą stylowe tło każdej uroczystości.",
        },
        {
          tr:
            "Usta şeflerimizin imzasını taşıyan banket menülerimiz, ihtiyaç ve beklentilerinize göre hazırlanarak misafirlerinize yüksek kaliteli bir lezzet deneyimi sunar. Dekorasyondan teknik altyapıya, canlı müzikten eğlence organizasyonlarına kadar tüm detaylar, hayalinizdeki etkinliği gerçeğe dönüştürmek için titizlikle planlanır.",
          en:
            "Our banquet menus, created by our chefs, are tailored to your needs and expectations for a high-quality dining experience. From décor to technical setup, from live music to entertainment, every detail is planned with care to turn your vision into reality.",
          de:
            "Unsere Bankettmenüs der Küchenchefs werden auf Ihre Wünsche zugeschnitten und bieten ein hochwertiges kulinarisches Erlebnis. Von Dekoration über Technik bis zu Live-Musik und Show — jedes Detail wird sorgfältig geplant.",
          pl: "Menu bankietowe przygotowane przez szefów kuchni dopasujemy do oczekiwań. Od dekoracji po technikę, od muzyki na żywo po oprawę — każdy detal planujemy z troską, by spełnić Państwa wizję.",
        },
        {
          tr:
            "Geniş alanı ve esnek tasarımı sayesinde Astra Balo Salonu; stil, konfor ve kusursuz hizmeti bir araya getirerek her türlü kutlama için ideal bir mekândır.",
          en:
            "With its spacious layout and flexible design, the Astra Ballroom combines style, comfort and attentive service — an ideal venue for every kind of celebration.",
          de:
            "Dank großzügiger Fläche und flexiblem Design vereint der Astra-Ballsaal Stil, Komfort und Service — ideal für jede Art von Feier.",
          pl: "Przestronny układ i elastyczny design łączą styl, komfort i profesjonalną obsługę — idealna przestrzeń na każdą celebrację.",
        },
      ],
    },
    {
      title: {
        tr: "Function Room",
        en: "Function Room",
        de: "Function Room",
        pl: "Function Room",
      },
      img: "assets/images/meeting/function-room.png",
      alt: {
        tr: "Function Room toplantı ve küçük grup oturumu",
        en: "Function Room for meetings and small groups",
        de: "Function Room für kleine Tagungen",
        pl: "Function Room na spotkania i małe grupy",
      },
      paras: [
        {
          tr:
            "Function Room, küçük ölçekli toplantılar, özel bilgilendirme oturumları, eğitimler ve odaklı grup görüşmeleri için ideal bir ortam sunar. Konfor ve kullanım kolaylığı düşünülerek tasarlanan salon; modern ses ve görüntü sistemleri, esnek oturma düzenleri ve verimli çalışmayı destekleyen sakin bir atmosfere sahiptir.",
          en:
            "The Function Room is ideal for small meetings, briefings, training sessions and focused group discussions. Designed for comfort and ease of use, it offers modern audio-visual equipment, flexible seating and a calm atmosphere that supports productive work.",
          de:
            "Der Function Room eignet sich für kleine Tagungen, Briefings, Schulungen und fokussierte Gruppengespräche. Komfort, moderne AV-Technik, flexible Bestuhlung und eine ruhige Atmosphäre fördern produktives Arbeiten.",
          pl: "Function Room sprawdzi się przy małych spotkaniach, briefingach, szkoleniach i dyskusjach grupowych. Komfort, nowoczesny AV, elastyczne ustawienie krzeseł i spokojna atmosfera sprzyjają produktywnej pracy.",
        },
        {
          tr:
            "U düzeni, sınıf ya da yönetim kurulu (boardroom) yerleşimi gibi farklı düzen seçenekleri, etkinliğinizin ihtiyaçlarına göre kolayca uygulanabilir. Tesis içi konaklama imkânı ve ekibimizin profesyonel desteğiyle toplantı salonumuz, küçük ama etkili kurumsal organizasyonlar için güvenilir bir tercihtir.",
          en:
            "Layouts such as U-shape, classroom or boardroom can be arranged to suit your event. With on-site accommodation and our team’s professional support, the room is a reliable choice for compact but impactful corporate gatherings.",
          de:
            "U-Form, Klassenzimmer- oder Boardroom-Bestuhlung lässt sich flexibel wählen. Unterkunft im Haus und professionelle Betreuung machen den Raum zur verlässlichen Wahl für kompakte, wirkungsvolle Firmenveranstaltungen.",
          pl: "Możliwe układy U, szkoła lub boardroom. Nocleg na miejscu i wsparcie zespołu czynią salę solidnym wyborem na zwięzłe, ale ważne spotkania firmowe.",
        },
      ],
    },
  ];

  var BUSINESS_IMG_ALT = {
    tr: "Business Center iş ve hizmet alanı",
    en: "Business Center workspace and services",
    de: "Business Center Arbeits- und Servicebereich",
    pl: "Business Center — przestrzeń robocza i usługi",
  };

  function renderMeetingModule(container) {
    var root = el("div", "viona-mod viona-mod--meeting");

    var secTitle = el("p", "rest-section-title", T({ tr: "Toplantı & organizasyon alanları", en: "Meeting & event spaces", de: "Tagungs- & Veranstaltungsbereiche", pl: "Meeting & event spaces" }));
    root.appendChild(secTitle);

    var lead = el("p", "viona-mod-lead");
    lead.textContent = T({
      tr: "Bu bölümde toplantı ve organizasyon salonları ile iş merkezi hakkında bilgi ve kullanım koşulları yer alır.",
      en: "Meeting & event spaces and the business centre — information and fees below.",
      de: "Tagungs- und Veranstaltungsräume sowie Business Center — Informationen und Konditionen unten.",
      pl: "Sale spotkań i eventów oraz centrum biznesowe — informacje i opłaty poniżej.",
    });
    root.appendChild(lead);

    var summary = el("div", "meet-summary");
    VENUE_LINES.forEach(function (line) {
      var row = el("p", "meet-summary__line", T(line));
      summary.appendChild(row);
    });
    root.appendChild(summary);

    var prose = el("div", "meet-prose");
    SECTIONS.forEach(function (sec) {
      var h = el("h3", "meet-prose__h", T(sec.title));
      prose.appendChild(h);
      if (sec.img) {
        prose.appendChild(meetFigure(sec.img, sec.alt));
      }
      sec.paras.forEach(function (para) {
        var p = el("p", "meet-prose__p", T(para));
        prose.appendChild(p);
      });
    });
    root.appendChild(prose);

    var business = el("div", "meet-business");
    business.appendChild(meetFigure("assets/images/meeting/business-center.png", BUSINESS_IMG_ALT));
    var bizCap = el("p", "meet-business__cap", T(VENUE_LINES[2]));
    business.appendChild(bizCap);
    root.appendChild(business);

    container.appendChild(root);
  }

  window.renderMeetingModule = renderMeetingModule;
})();
