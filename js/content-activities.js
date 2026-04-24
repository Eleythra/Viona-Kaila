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
      ru: "Анимация и мероприятия",
      da: "Animation og aktiviteter",
      cs: "Animace a aktivity",
      ro: "Animație și activități",
      nl: "Animatie en activiteiten",
      sk: "Animácia a aktivity",
    },
    lead: {
      tr:
        "Sezon boyunca her akşam canlı müzik, gösteri ve dans — aşağıdaki haftalık akşam programına göz atın. Gündüz Aqua havuzda ücretsiz su animasyonu ve oyunlar devam eder.",
      en:
        "Each evening through the season: live music, shows and dance — see the weekly night schedule below. By day, free aqua animation and pool games continue at Aqua Pool.",
      de:
        "Jeden Abend in der Saison: Live-Musik, Shows und Tanz — unten der wöchentliche Abendplan. Tagsüber kostenlose Wasser-Animation und Spiele am Aqua Pool.",
      pl:
        "Każdego wieczoru w sezonie: muzyka na żywo, pokazy i taniec — poniżej tygodniowy harmonogram wieczorny. W dzień bezpłatna animacja wodna i zabawy przy Aqua Pool.",
      ru:
        "Каждый вечер в течение сезона: живая музыка, шоу и танцы — ниже недельный вечерний график. Днём бесплатная водная анимация и игры у бассейна Aqua.",
      da:
        "Hver aften i sæsonen: live musik, shows og dans — se den ugentlige aftenplan nedenfor. Om dagen fortsætter gratis vandanimation og poollege ved Aqua Pool.",
      cs:
        "Každý večer během sezóny: živá hudba, představení a tanec — níže týdenní večerní program. Ve dne zdarma vodní animace a hry u bazénu Aqua.",
      ro:
        "În fiecare seară din sezon: muzică live, spectacole și dans — vezi programul săptămânal de seară mai jos. Ziua continuă animația acvatică gratuită și jocurile la Aqua Pool.",
      nl:
        "Elke avond het hele seizoen: livemuziek, shows en dans — zie het wekelijkse avondrooster hieronder. Overdag gratis wateranimatie en poolspellen bij Aqua Pool.",
      sk:
        "Každý večer počas sezóny: živá hudba, predstavenia a tanec — nižšie týždenný večerný program. Cez deň pokračuje bezplatná vodná animácia a hry pri Aqua Pool.",
    },
    scheduleTitle: {
      tr: "Haftalık akşam programı",
      en: "Weekly evening programme",
      de: "Wöchentliches Abendprogramm",
      pl: "Tygodniowy program wieczorny",
      ru: "Недельный вечерний график",
      da: "Ugentligt aftenprogram",
      cs: "Týdenní večerní program",
      ro: "Program săptămânal de seară",
      nl: "Wekelijks avondprogramma",
      sk: "Týždenný večerný program",
    },
  };

  /** Haftalık akşam gösterileri — tüm UI dilleri (pickFromLangRow). */
  var EVENING_SCHEDULE = [
    {
      day: {
        tr: "Pazartesi",
        en: "Monday",
        de: "Montag",
        pl: "Poniedziałek",
        ru: "Понедельник",
        da: "Mandag",
        cs: "Pondělí",
        ro: "Luni",
        nl: "Maandag",
        sk: "Pondelok",
      },
      time: "21:00",
      event: {
        tr: "Canlı müzik · Farşid",
        en: "Live music · Farşid",
        de: "Live-Musik · Farşid",
        pl: "Muzyka na żywo · Farşid",
        ru: "Живая музыка · Farşid",
        da: "Live musik · Farşid",
        cs: "Živá hudba · Farşid",
        ro: "Muzică live · Farşid",
        nl: "Livemuziek · Farşid",
        sk: "Živá hudba · Farşid",
      },
      variant: "",
    },
    {
      day: {
        tr: "Salı",
        en: "Tuesday",
        de: "Dienstag",
        pl: "Wtorek",
        ru: "Вторник",
        da: "Tirsdag",
        cs: "Úterý",
        ro: "Marți",
        nl: "Dinsdag",
        sk: "Utorok",
      },
      time: "21:15",
      event: {
        tr: "Akrobasi gösterisi",
        en: "Acrobatics show",
        de: "Akrobatik-Show",
        pl: "Pokaz akrobatyczny",
        ru: "Акробатическое шоу",
        da: "Akrobatikshow",
        cs: "Akrobatická show",
        ro: "Spectacol de acrobație",
        nl: "Acrobatiekshow",
        sk: "Akrobatická šou",
      },
      variant: "",
    },
    {
      day: {
        tr: "Çarşamba",
        en: "Wednesday",
        de: "Mittwoch",
        pl: "Środa",
        ru: "Среда",
        da: "Onsdag",
        cs: "Středa",
        ro: "Miercuri",
        nl: "Woensdag",
        sk: "Streda",
      },
      time: "—",
      variant: "empty",
    },
    {
      day: {
        tr: "Perşembe",
        en: "Thursday",
        de: "Donnerstag",
        pl: "Czwartek",
        ru: "Четвер",
        da: "Torsdag",
        cs: "Čtvrtek",
        ro: "Joi",
        nl: "Donderdag",
        sk: "Štvrtok",
      },
      time: "21:15",
      event: {
        tr: "Miss gösterisi",
        en: "Miss show",
        de: "Miss-Show",
        pl: "Pokaz Miss",
        ru: "Шоу Miss",
        da: "Miss-show",
        cs: "Miss show",
        ro: "Spectacol Miss",
        nl: "Miss-show",
        sk: "Miss šou",
      },
      variant: "",
    },
    {
      day: {
        tr: "Cuma",
        en: "Friday",
        de: "Freitag",
        pl: "Piątek",
        ru: "Пятница",
        da: "Fredag",
        cs: "Pátek",
        ro: "Vineri",
        nl: "Vrijdag",
        sk: "Piatok",
      },
      time: "21:00",
      event: {
        tr: "Canlı müzik · Aether Band",
        en: "Live music · Aether Band",
        de: "Live-Musik · Aether Band",
        pl: "Muzyka na żywo · Aether Band",
        ru: "Живая музыка · Aether Band",
        da: "Live musik · Aether Band",
        cs: "Živá hudba · Aether Band",
        ro: "Muzică live · Aether Band",
        nl: "Livemuziek · Aether Band",
        sk: "Živá hudba · Aether Band",
      },
      variant: "",
    },
    {
      day: {
        tr: "Cumartesi",
        en: "Saturday",
        de: "Samstag",
        pl: "Sobota",
        ru: "Суббота",
        da: "Lørdag",
        cs: "Sobota",
        ro: "Sâmbătă",
        nl: "Zaterdag",
        sk: "Sobota",
      },
      time: "21:15",
      event: {
        tr: "Modern dans gösterisi",
        en: "Modern dance show",
        de: "Modern Dance Show",
        pl: "Pokaz tańca nowoczesnego",
        ru: "Шоу современного танца",
        da: "Moderne danseforestilling",
        cs: "Show moderního tance",
        ro: "Spectacol de dans modern",
        nl: "Moderne dansshow",
        sk: "Show moderného tanca",
      },
      variant: "",
    },
    {
      day: {
        tr: "Pazar",
        en: "Sunday",
        de: "Sonntag",
        pl: "Niedziela",
        ru: "Воскресенье",
        da: "Søndag",
        cs: "Neděle",
        ro: "Duminică",
        nl: "Zondag",
        sk: "Nedeľa",
      },
      time: "—",
      variant: "off",
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
        ru: "Аквааэробика в бассейне",
        da: "Vandaerobik i poolen",
        cs: "Vodní aerobik v bazénu",
        ro: "Aerobic acvatic la piscină",
        nl: "Wateraerobics in het zwembad",
        sk: "Vodná aerobika v bazéne",
      },
      title: {
        tr: "Su jimnastiği",
        en: "Water aerobics",
        de: "Wassergymnastik",
        pl: "Aerobik wodny",
        ru: "Аквааэробика",
        da: "Vandaerobik",
        cs: "Vodní aerobik",
        ro: "Aerobic acvatic",
        nl: "Wateraerobics",
        sk: "Vodná aerobika",
      },
      text: {
        tr:
          "Sadece havuza girmeniz yeterli. Suyun doğal direnciyle vücudunuzu nazikçe çalıştırırken aynı zamanda serinliğin keyfini çıkarabilirsiniz. Ekstra yük bindirmeden yapılan bu egzersiz, her yaş grubuna uygun rahat ve eğlenceli bir aktivitedir.",
        en:
          "Just step into the pool. While the natural resistance of water works your body gently, you can enjoy a refreshing workout. This low-impact exercise is comfortable, fun, and suitable for all age groups.",
        de:
          "Steigen Sie einfach ins Becken. Der natürliche Wasserwiderstand trainiert den Körper sanft und sorgt gleichzeitig für Erfrischung. Diese gelenkschonende Übung ist angenehm, unterhaltsam und für alle Altersgruppen geeignet.",
        pl: "Wejdź do basenu. Naturalny opór wody delikatnie angažuje ciało, a Ty możesz cieszyć się orzeźwiającym treningiem. To ćwiczenie o niskim obciążeniu jest komfortowe, zabawne i dla każdej grupy wiekowej.",
        ru: "Просто войдите в бассейн. Естественное сопротивление воды мягко нагружает тело, а вы получаете освежающую тренировку. Это щадящее упражнение комфортно, весело и подходит для любого возраста.",
        da: "Træd bare i poolen. Vandets naturlige modstand træner kroppen blidt, mens du får en forfriskende træning. Denne skånsomme motion er behagelig, sjov og for alle aldre.",
        cs: "Stačí vstoupit do bazénu. Přirozený odpor vody šetrně zatíží tělo a vy si užijete osvěžující trénink. Toto šetrné cvičení je příjemné, zábavné a vhodné pro každý věk.",
        ro: "Intră în piscină. Rezistența naturală a apei lucrează corpul blând, iar tu te bucuri de un antrenament revigorant. Exercițiul cu impact redus e confortabil, distractiv și potrivit oricărei vârste.",
        nl: "Stap het zwembad in. De natuurlijke weerstand van water traint je lichaam zachtjes terwijl je geniet van een verfrissende work-out. Deze low-impact oefening is comfortabel, leuk en voor elke leeftijd.",
        sk: "Stačí vstúpiť do bazéna. Prirodzený odpor vody šetrne zaťaží telo a vy si užijete osviežujúci tréning. Toto šetrné cvičenie je príjemné, zábavné a vhodné pre každý vek.",
      },
    },
    {
      img: "assets/images/activities/dart.png?v=3",
      alt: {
        tr: "Dart oyunu etkinliği",
        en: "Darts game activity",
        de: "Dartspiel-Aktivität",
        pl: "Aktywność — gra w darta",
        ru: "Игра в дартс",
        da: "Dartaktivitet",
        cs: "Aktivita — šipky",
        ro: "Activitate — darts",
        nl: "Dartsactiviteit",
        sk: "Aktivita — šípky",
      },
      title: {
        tr: "Dart oyunu",
        en: "Darts game",
        de: "Dartspiel",
        pl: "Gra w darta",
        ru: "Дартс",
        da: "Dart",
        cs: "Šipky",
        ro: "Darts",
        nl: "Darts",
        sk: "Šípky",
      },
      text: {
        tr:
          "Okunuzu alın ve hedefe odaklanın. Dostça rekabetin tadını çıkarabileceğiniz bu oyun, hem konsantrasyon hem keyif sunar. İlk kez deneyenler de deneyimli misafirler de rahatça katılabilir.",
        en:
          "Take your dart and focus on the target. This friendly game offers both concentration and fun. Whether you are trying it for the first time or already experienced, everyone can join.",
        de:
          "Nehmen Sie den Dartpfeil und konzentrieren Sie sich auf das Ziel. Dieses freundliche Spiel verbindet Fokus und Spaß. Ob Einsteiger oder erfahrene Gäste: alle können mitmachen.",
        pl: "Weź lotkę i skup się na tarczy. Ta przyjazna gra łączy koncentrację i zabawę. Zarówno początkujący, jak i doświadczeni mogą wziąć udział.",
        ru: "Возьмите дротик и сосредоточьтесь на мишени. Дружеская игра сочетает концентрацию и веселье. Подойдёт и новичкам, и опытным гостям.",
        da: "Tag din pil og fokusér på målet. Dette venlige spil giver både koncentration og sjov. Begyndere og erfarne kan være med.",
        cs: "Vezměte šipku a soustřeďte se na terč. Tato přátelská hra spojuje koncentraci a zábavu. Zvládnou ji začátečníci i zkušení hosté.",
        ro: "Ia săgeata și concentrează-te pe țintă. Jocul prietenos combină concentrare și distracție. Se pot alătura începători și experimentați.",
        nl: "Neem je dartpijl en richt op het doel. Deze vriendelijke game combineert concentratie en plezier. Beginners en ervaren gasten doen mee.",
        sk: "Vezmite šípku a sústreďte sa na terč. Táto priateľská hra spája koncentráciu a zábavu. Zvládnu ju začiatočníci aj skúsení hostia.",
      },
    },
    {
      img: "assets/images/activities/water-polo.png?v=3",
      alt: {
        tr: "Su topu havuz etkinliği",
        en: "Water polo pool activity",
        de: "Wasserball im Pool",
        pl: "Zajęcia — piłka wodna w basenie",
        ru: "Водное поло в бассейне",
        da: "Vandpolo i poolen",
        cs: "Vodní pólo v bazénu",
        ro: "Polo pe apă la piscină",
        nl: "Waterpolo in het zwembad",
        sk: "Vodné pólo v bazéne",
      },
      title: {
        tr: "Su topu",
        en: "Water polo",
        de: "Wasserball",
        pl: "Piłka wodna",
        ru: "Водное поло",
        da: "Vandpolo",
        cs: "Vodní pólo",
        ro: "Polo pe apă",
        nl: "Waterpolo",
        sk: "Vodné pólo",
      },
      text: {
        tr:
          "Havuzda hareket başlıyor. Takım halinde oynanan bu eğlenceli oyun enerjinizi yükseltir ve sosyal bir deneyim sunar. Serin suyun içinde aktif kalırken keyifli ve bol kahkahalı anlar sizi bekliyor.",
        en:
          "Action starts in the pool. This team game boosts your energy and creates a social, fun atmosphere. Stay active in cool water and enjoy plenty of laughter.",
        de:
          "Im Pool geht es los. Dieses Teamspiel steigert die Energie und bietet ein soziales, unterhaltsames Erlebnis. Bleiben Sie aktiv im kühlen Wasser und genießen Sie viele fröhliche Momente.",
        pl: "Akcja zaczyna się w basenie. Ta gra zespołowa dodaje energii i buduje swobodną, radosną atmosferę. Rób ruch w chłodnej wodzie i śmiej się do woli.",
        ru: "В бассейне начинается движение. Командная игра заряжает энергией и создаёт дружескую атмосферу. Оставайтесь активными в прохладной воде и смейтесь вволю.",
        da: "Det går løs i poolen. Holdspillet giver energi og en social, sjov stemning. Vær aktiv i det kølige vand og nyd masser af latter.",
        cs: "V bazénu to začne. Týmová hra dodá energii a přinese společenskou, zábavnou atmosféru. Zůstaňte aktivní ve chladné vodě a užijte si spoustu smíchu.",
        ro: "Acțiunea începe în piscină. Jocul de echipă crește energia și o atmosferă socială, distractivă. Rămâi activ în apă răcoroare și bucură-te de multe râsete.",
        nl: "Het begint in het zwembad. Dit teamsportspel geeft energie en een gezellige sfeer. Blijf actief in koel water en geniet van veel gelach.",
        sk: "V bazéne to začína. Tímová hra dodá energiu a prinesie spoločenskú, zábavnú atmosféru. Zostaňte aktívni v chladnej vode a užite si veľa smiechu.",
      },
    },
  ];

  var LEGACY_CARDS = [
    {
      highlight: true,
      kicker: {
        tr: "Gece atmosferi",
        en: "Evening atmosphere",
        de: "Abendstimmung",
        pl: "Wieczorny klimat",
        ru: "Вечерняя атмосфера",
        da: "Aftenstemning",
        cs: "Večerní atmosféra",
        ro: "Atmosferă de seară",
        nl: "Avondsfeer",
        sk: "Večerná atmosféra",
      },
      title: {
        tr: "Gece şovları & eğlenceler",
        en: "Evening shows & entertainment",
        de: "Abendshows & Unterhaltung",
        pl: "Wieczorne pokazy i rozrywka",
        ru: "Вечерние шоу и развлечения",
        da: "Aftenunderholdning",
        cs: "Večerní show a zábava",
        ro: "Spectacole și divertisment de seară",
        nl: "Avondshows en entertainment",
        sk: "Večerné predstavenia a zábava",
      },
      text: {
        tr:
          "Güneş battıktan sonra otelde farklı bir enerji oluşur. Haftalık akşam programı (günler ve saatler) yukarıdaki listede; canlı müzik ve gösterilerle keyifli akşamlar.",
        en:
          "After sunset, the hotel takes on a different energy. The weekly evening programme — days and times — is in the list above; enjoy live music and shows.",
        de:
          "Nach Sonnenuntergang verändert sich die Stimmung im Hotel. Der wöchentliche Abendplan mit Tagen und Zeiten steht oben in der Liste — Live-Musik und Shows inklusive.",
        pl:
          "Po zachodzie słońca hotel nabiera innego klimatu. Tygodniowy harmonogram wieczorny — dni i godziny — jest na liście powyżej; muzyka na żywo i pokazy.",
        ru:
          "После заката в отеле особая атмосфера. Недельный вечерний график — дни и время — в списке выше; живая музыка и шоу.",
        da:
          "Efter solnedgang skifter stemningen på hotellet. Den ugentlige aftenplan — dage og tider — står i listen ovenfor; live musik og shows.",
        cs:
          "Po západu slunce má hotel jinou atmosféru. Týdenní večerní program — dny a časy — je v seznamu výše; živá hudba a představení.",
        ro:
          "După apus, hotelul capătă o altă energie. Programul săptămânal de seară — zile și ore — este în lista de mai sus; muzică live și spectacole.",
        nl:
          "Na zonsondergang verandert de sfeer in het hotel. Het wekelijkse avondrooster — dagen en tijden — staat in de lijst hierboven; livemuziek en shows.",
        sk:
          "Po západe slnka má hotel inú atmosféru. Týždenný večerný program — dni a časy — je v zozname vyššie; živá hudba a predstavenia.",
      },
      images: [
        {
          src: "assets/images/activities/night-pool.png",
          alt: {
            tr: "Gece havuz etkinliği",
            en: "Night pool activity",
            de: "Abendaktivität am Pool",
            pl: "Wieczorna aktywność przy basenie",
            ru: "Вечерняя активность у бассейна",
            da: "Aftenaktivitet ved poolen",
            cs: "Večerní aktivita u bazénu",
            ro: "Activitate de seară la piscină",
            nl: "Avondactiviteit bij het zwembad",
            sk: "Večerná aktivita pri bazéne",
          },
        },
        {
          src: "assets/images/activities/night-show.png",
          alt: {
            tr: "Gece gösterisi",
            en: "Night show",
            de: "Abendshow",
            pl: "Pokaz wieczorny",
            ru: "Вечернее шоу",
            da: "Aftenforestilling",
            cs: "Večerní show",
            ro: "Spectacol de seară",
            nl: "Avondshow",
            sk: "Večerná šou",
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
        ru: "Фитнес-центр",
        da: "Fitnesscenter",
        cs: "Fitness centrum",
        ro: "Centru fitness",
        nl: "Fitnessruimte",
        sk: "Fitness centrum",
      },
      text: {
        tr:
          "Tam donanımlı fitness merkezinde koşu bantları, ağırlıklar ve modern spor ekipmanları bulunur. Tatil boyunca formda kalmak isteyen misafirler için motive edici bir alan sunar.",
        en:
          "The fully equipped fitness centre includes treadmills, weights, and modern training equipment. It offers a motivating space for guests who want to stay in shape during their holiday.",
        de:
          "Im voll ausgestatteten Fitnessbereich stehen Laufbänder, Gewichte und moderne Trainingsgeräte bereit. Ein motivierender Bereich für Gäste, die auch im Urlaub fit bleiben möchten.",
        pl: "W pełni wyposażona siłownia: bieżnie, wolne ciężary i nowoczesny sprzęt. Motywująca przestrzeń dla gości, którzy chcą zachować formę w wakacje.",
        ru: "В полностью оборудованном фитнес-центре — беговые дорожки, свободные веса и современные тренажёры. Простор для гостей, которые хотят оставаться в форме во время отдыха.",
        da: "Det fuldt udstyrede fitnesscenter har løbebånd, vægte og moderne træningsudstyr. Et motiverende sted for gæster, der vil holde formen på ferien.",
        cs: "Plně vybavené fitness centrum s běžeckými pásy, činkami a moderním vybavením. Motivující prostor pro hosty, kteří chtějí zůstat ve formě i na dovolené.",
        ro: "Centrul de fitness complet echipat include benzi de alergat, greutăți și aparate moderne. Spațiu motivant pentru oaspeții care vor să rămână în formă în vacanță.",
        nl: "Het volledig uitgeruste fitnesscentrum heeft loopbanden, gewichten en moderne apparatuur. Een motiverende ruimte voor gasten die fit willen blijven tijdens hun verblijf.",
        sk: "Plne vybavené fitness centrum s bežeckými pásmi, činkami a moderným vybavením. Motivujúci priestor pre hostí, ktorí chcú zostať vo forme aj na dovolenke.",
      },
      images: [
        {
          src: "assets/images/activities/fitness.png",
          alt: {
            tr: "Fitness merkezi",
            en: "Fitness centre",
            de: "Fitnessbereich",
            pl: "Siłownia / fitness",
            ru: "Фитнес-центр",
            da: "Fitnesscenter",
            cs: "Fitness centrum",
            ro: "Centru fitness",
            nl: "Fitnessruimte",
            sk: "Fitness centrum",
          },
        },
        {
          src: "assets/images/activities/fitness-2.png",
          alt: {
            tr: "Fitness merkezi ekipmanları",
            en: "Fitness centre equipment",
            de: "Fitnessgeräte im Fitnessbereich",
            pl: "Sprzęt na siłowni",
            ru: "Оборудование фитнес-центра",
            da: "Fitnessudstyr",
            cs: "Fitness vybavení",
            ro: "Echipamente fitness",
            nl: "Fitnessapparatuur",
            sk: "Fitness vybavenie",
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
        ru: "Зона шопинга",
        da: "Shoppingområde",
        cs: "Nákupní zóna",
        ro: "Zonă de cumpărături",
        nl: "Winkelruimte",
        sk: "Nákupná zóna",
      },
      text: {
        tr:
          "09:00–23:00 saatleri arasında fotoğrafçı, deri mağazası, market ve kuaför hizmetleri kullanılabilir.",
        en:
          "From 09:00 to 23:00, guests can access photographer, leather shop, market, and hairdresser services.",
        de:
          "Von 09:00 bis 23:00 stehen Fotograf, Ledergeschäft, Markt und Friseur zur Verfügung.",
        pl: "Od 09:00 do 23:00 goście mogą skorzystać z fotografa, sklepu ze skórą, marketu i fryzjera.",
        ru: "С 09:00 до 23:00 доступны фотограф, кожаный магазин, мини-маркет и парикмахерская.",
        da: "Fra 09:00 til 23:00 kan gæster benytte fotograf, skindbutik, market og frisør.",
        cs: "Od 09:00 do 23:00 jsou k dispozici fotograf, obchod s kůží, market a kadeřnictví.",
        ro: "Între 09:00 și 23:00 oaspeții pot folosi fotograf, magazin de piele, market și frizerie.",
        nl: "Van 09:00 tot 23:00 zijn fotograaf, lederwinkel, market en kapper beschikbaar.",
        sk: "Od 09:00 do 23:00 sú k dispozícii fotograf, obchod s kožou, market a kaderníctvo.",
      },
      images: [],
    },
  ];

  function renderEveningSchedule() {
    var wrap = el("div", "activities-evening");
    wrap.setAttribute("role", "region");
    wrap.setAttribute("aria-labelledby", "activities-evening-title");
    var head = el("div", "activities-evening__head");
    var h3 = el("h3", "activities-evening__title");
    h3.id = "activities-evening-title";
    h3.textContent = T(MODULE_TEXT.scheduleTitle);
    head.appendChild(h3);
    wrap.appendChild(head);

    var list = el("div", "activities-evening__list");
    EVENING_SCHEDULE.forEach(function (row) {
      var rowCls = "activities-evening-row";
      if (row.variant === "empty") rowCls += " activities-evening-row--empty";
      if (row.variant === "off") rowCls += " activities-evening-row--off";
      var rowEl = el("div", rowCls);
      rowEl.appendChild(el("span", "activities-evening-row__day", T(row.day)));
      rowEl.appendChild(el("span", "activities-evening-row__time", row.time));
      var eventSpan = el("span", "activities-evening-row__event");
      if (row.variant === "empty" || row.variant === "off") {
        eventSpan.classList.add("activities-evening-row__event--silent");
        eventSpan.setAttribute("aria-hidden", "true");
      } else if (row.event) {
        eventSpan.textContent = T(row.event);
      }
      rowEl.appendChild(eventSpan);
      list.appendChild(rowEl);
    });
    wrap.appendChild(list);
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
    root.appendChild(renderEveningSchedule());
    root.appendChild(renderActivityCards());
    root.appendChild(renderLegacySection());
    container.appendChild(root);
  }

  window.renderActivitiesModule = renderActivitiesModule;
})();
