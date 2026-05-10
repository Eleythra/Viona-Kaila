/**
 * Ek UI dilleri: İngilizce (en) tam tabanın üzerine yerelleştirilmiş katman.
 * Tüm anahtarlar en ile aynı kalır; burada tanımlı olanlar değişir — formlar ve yapı bozulmaz.
 * Yeni anahtar çevirisi: aynı isimle bu objelere ekleyin.
 */
(function () {
  "use strict";
  if (typeof I18N === "undefined" || typeof window === "undefined" || !window.VIONA_LANG) return;
  var E = I18N.en;
  if (!E) return;

  var PATCH = {
    ru: {
      metaTitle: "Viona — отель Kaila Beach",
      langScreenTitle: "Выберите язык",
      langScreenSubtitle: "Kaila Beach Hotel · Умный отельный помощник",
      continue: "Продолжить",
      langGridAria: "Выбор языка",
      gateScreenTitle: "Проверка гостя",
      gateScreenSubtitle:
        "Прочитайте уведомление ниже и подтвердите продолжение.",
      gateScreenSubtitleWithPassword:
        "Введите код доступа отеля; затем прочитайте уведомление и подтвердите.",
      gateScreenSubtitleWithIdentity:
        "Введите имя и фамилию, затем номер комнаты как в бронировании.",
      gateScreenSubtitleWithPasswordAndIdentity:
        "Сначала подтвердите проживание; при необходимости добавьте код доступа.",
      gateIdentityKicker: "Проживание",
      gateIdentityTitle: "Подтвердите личность",
      gateIdentityLead:
        "Данные сверяются с активным списком гостей отеля — доступ только для зарегистрированных гостей.",
      gatePasswordSectionLead:
        "По желанию — код доступа, выданный отелем (если предусмотрен).",
      gateFullNameLabel: "Имя и фамилия",
      gateFullNamePlaceholder: "Как в документе или бронировании",
      gateRoomLabel: "Номер комнаты",
      gateRoomPlaceholder: "напр. 1204, 0007 или VIP01",
      gatePasswordLabel: "Код доступа отеля",
      gatePasswordPlaceholder: "Код от отеля",
      gatePrivacyTitle: "Персональные данные — краткое уведомление",
      gatePrivacyBody:
        "Сведения, которые вы передаёте через Viona, используются для обработки запросов, связанных с вашим проживанием в Kaila Beach Hotel, и для информирования; не распространяются незаконно. Подробности и ваши права — в официальном уведомлении отеля о конфиденциальности.",
      gatePrivacyAgeLine:
        "• Вы подтверждаете, что достигли совершеннолетия (18+); иначе не следует пользоваться приложением.",
      gateCheckPrivacy:
        "Я прочитал(а) уведомление и пункт о возрасте выше и согласен(на).",
      gateSubmit: "Подтвердить и продолжить",
      gateBackLang: "Назад к выбору языка",
      gateErrorPassword: "Неверный пароль. Введите актуальный пароль доступа.",
      gateErrorPasswordEmpty: "Введите пароль доступа.",
      gateErrorGateVerify: "Не удалось проверить пароль. Проверьте подключение и попробуйте снова.",
      gateErrorGateLoading: "Проверка доступа — подождите несколько секунд и нажмите снова.",
      gateErrorGateStrict:
        "Нельзя подтвердить доступ (сервер недоступен). Проверьте интернет или нажмите «Повторить».",
      gateRetryStatus: "Повторить",
      gateErrorPrivacy: "Отметьте галочку подтверждения, чтобы продолжить.",
      homeTitle: "Kaila Beach Hotel",
      introLead:
        "Первая линия у моря в Обагёле, Аланья — концепция «всё включено» для комфортного отдыха.",
      appVionaTitle: "Viona · Умный спутник вашего проживания",
      homeAppCardAria: "О приложении Viona",
      homeModuleGridAria: "Сервисы и информационные разделы отеля",
      homeCarouselAria: "Фотогалерея курорта",
      homeQuickActionsAria: "Быстрые действия",
      appIntro:
        "Во время проживания получайте доступ к услугам отеля, практической информации и объявлениям на одном экране.",
      btnRate: "Оцените нас",
      btnRateHint: "Внешние площадки, соцсети и официальный сайт",
      btnViona: "Отельный помощник Viona",
      btnVionaHint: "Viona — цифровой помощник вашего отеля.",
      close: "Закрыть",
      modGeneral: "Общая информация об отеле",
      modWhere: "Где я? Как добраться?",
      modRest: "Рестораны и бары",
      modAlacarte: "Рестораны à la carte",
      alacarteSintonMenuCta: "Скачать меню",
      alacarteSintonMenuAria: "Скачать меню Sinton BBQ",
      modBeach: "Пляж и бассейны",
      modRequests: "Запросы / жалобы / неисправности / уведомления гостя",
      subRequest: "Запросы",
      subRequestHint:
        "Сообщите, что вам нужно — полотенца, бельё, мини-бар, принадлежности; запрос фиксируется для персонала.",
      subComplaint: "Жалобы",
      subComplaintHint:
        "Опишите недовольство проживанием или услугой; отель рассмотрит обращение и при необходимости свяжется с вами.",
      subFault: "Неисправность",
      subFaultHint:
        "Сообщите о технических проблемах в номере (кондиционер, ТВ, санузел, электрика); укажите место и срочность.",
      subGuestNotification: "Уведомления гостя",
      subGuestNotificationHint:
        "Диета и аллергии, здоровье, праздники или поздний выезд — с учётом вашего пребывания.",
      modSpa: "Спа и wellness",
      modDiscount: "Эксклюзивные предложения для гостей отеля",
      modAnim: "Анимация и мероприятия",
      modSustainability: "Устойчивое развитие",
      modComingSoon: "Окрестности",
      modMini: "Мини-клуб",
      modMeet: "Переговорные и конференц-залы",
      modAlanya: "Откройте Аланью",
      modTransfer: "Трансфер",
      modRoomService: "Обслуживание номеров",
      modSurvey: "Оцените впечатления",
      footer: "Eleythra Derin Teknoloji · Viona",
      rateModalTitle: "Отзывы и ссылки",
      rateModalLead:
        "Оставьте отзыв на Google, Otelpuan, CHECK24, HolidayCheck, Booking.com, Tripadvisor и др.; ниже — Corendon, Zoover, соцсети и официальный сайт.",
      rateModalSurveyHint:
        "Структурированный опрос о проживании и помощнике Viona (1–5 по разделам) — плитка «Оцените впечатления» на главном экране. Это окно только внешние ссылки.",
      reqErrAfterHoursReception:
        "С 0:00 до 8:00 оперативная команда недоступна — через приложение запросы, жалобы, заявки и уведомления гостя не принимаются. Обратитесь на ресепшн напрямую.",
      linkOtelpuan: "Otelpuan",
      linkCheck24: "CHECK24",
      hintOtelpuan: "Оцените отель на Otelpuan — турецкой платформе отзывов об отелях.",
      hintCheck24: "CHECK24 (Германия) — отзыв об отеле после поездки.",
    },
    da: {
      metaTitle: "Viona — Kaila Beach Hotel",
      langScreenTitle: "Vælg sprog",
      langScreenSubtitle: "Kaila Beach Hotel · Smart hotelassistent",
      continue: "Fortsæt",
      langGridAria: "Sprogvalg",
      gateScreenTitle: "Gæste verifikation",
      gateScreenSubtitle:
        "Læs den korte meddelelse og bekræft for at fortsætte.",
      gateScreenSubtitleWithPassword:
        "Indtast hotellets adgangskode; læs meddelelsen og bekræft.",
      gateScreenSubtitleWithIdentity:
        "Indtast for- og efternavn og derefter værelsesnummer som i reservationen.",
      gateScreenSubtitleWithPasswordAndIdentity:
        "Bekræft først dit ophold; tilføj adgangskode om nødvendigt.",
      gateIdentityKicker: "Ophold",
      gateIdentityTitle: "Bekræft din identitet",
      gateIdentityLead:
        "Vi matcher dine oplysninger med hotellets aktive gæsteliste — kun registrerede gæster får adgang.",
      gatePasswordSectionLead:
        "Valgfrit — hotellets adgangskode til gæster (hvis relevant).",
      gateFullNameLabel: "Fulde navn",
      gateFullNamePlaceholder: "Som på ID eller reservation",
      gateRoomLabel: "Værelsesnummer",
      gateRoomPlaceholder: "f.eks. 1204, 0007 eller VIP01",
      gatePasswordLabel: "Hotel adgangskode",
      gatePasswordPlaceholder: "Kode fra hotellet",
      gatePrivacyTitle: "Beskyttelse af persondata — kort meddelelse",
      gatePrivacyBody:
        "Oplysninger, du deler via Viona, bruges til at håndtere henvendelser vedrørende dit ophold på Kaila Beach Hotel og til relevant information; de offentliggøres ikke i strid med loven. Se hotellets officielle privatlivsbesked for fulde detaljer.",
      gatePrivacyAgeLine:
        "• Du erklærer, at du er myndig (18+); ellers må du ikke bruge appen.",
      gateCheckPrivacy:
        "Jeg har læst meddelelsen og alderspunktet ovenfor og accepterer.",
      gateSubmit: "Bekræft og fortsæt",
      gateBackLang: "Tilbage til sprogvalg",
      gateErrorPassword: "Forkert adgangskode. Indtast den aktuelle kode.",
      gateErrorPasswordEmpty: "Indtast adgangskoden.",
      gateErrorGateVerify: "Adgangskoden kunne ikke bekræftes. Tjek forbindelsen og prøv igen.",
      gateErrorGateLoading: "Adgang indlæses — vent et øjeblik og prøv igen.",
      gateErrorGateStrict:
        "Adgang kan ikke bekræftes (serveren er ikke tilgængelig). Tjek forbindelsen eller tryk «Prøv igen».",
      gateRetryStatus: "Prøv igen",
      gateErrorPrivacy: "Sæt kryds i feltet for at fortsætte.",
      homeTitle: "Kaila Beach Hotel",
      introLead: "Strandfront i Obagöl, Alanya — All Inclusive til en behagelig ferie.",
      appVionaTitle: "Viona · Din smarte opholdsledsager",
      homeAppCardAria: "Om Viona-appen",
      homeModuleGridAria: "Hotellets tjenester og informationsmoduler",
      homeCarouselAria: "Billedgalleri fra resortet",
      homeQuickActionsAria: "Hurtige handlinger",
      appIntro:
        "Under dit ophold: adgang til hotellets tjenester, praktisk information og meddelelser samlet på én skærm.",
      btnRate: "Bedøm os",
      btnRateHint: "Eksterne platforme, sociale medier og officielt site",
      btnViona: "Viona hotelassistent",
      btnVionaHint: "Viona: hotellets digitale assistent.",
      close: "Luk",
      modGeneral: "Generel hotelinformation",
      modWhere: "Hvor er jeg? & Hvordan kommer jeg derhen?",
      modRest: "Restauranter og barer",
      modAlacarte: "À la carte-restauranter",
      alacarteSintonMenuCta: "Download menu",
      alacarteSintonMenuAria: "Download Sinton BBQ-menu",
      modBeach: "Strand og pools",
      modRequests: "Forespørgsler / klager / fejl / gæstemeldinger",
      subRequest: "Forespørgsler",
      subRequestHint:
        "Sig til teamet, hvad du mangler—håndklæder, sengetøj, minibar, forsyninger; din forespørgsel logges.",
      subComplaint: "Klager",
      subComplaintHint:
        "Beskriv utilfredshed med ophold eller service; hotellet gennemgår sagen og kan følge op.",
      subFault: "Fejlrapport",
      subFaultHint:
        "Rapporter tekniske problemer på værelset (AC, TV, bad, el); angiv sted og hastighed for vedligehold.",
      subGuestNotification: "Gæstemeldinger",
      subGuestNotificationHint:
        "Kost/allergi, helbred, fejringer eller sen udtjekning—behandles i forhold til dit ophold.",
      modSpa: "Spa & wellness",
      modDiscount: "Eksklusive tilbud til hotelgæster",
      modAnim: "Animation og aktiviteter",
      modSustainability: "Bæredygtighed",
      modComingSoon: "Udforsk nærområdet",
      modMini: "Mini Club",
      modMeet: "Mødelokaler",
      modAlanya: "Oplev Alanya",
      modTransfer: "Transfer",
      modRoomService: "Roomservice",
      modSurvey: "Bedøm din oplevelse",
      footer: "Eleythra Derin Teknoloji · Viona",
      rateModalTitle: "Anmeldelser og links",
      rateModalLead:
        "Skriv en anmeldelse på Google, Otelpuan, CHECK24, HolidayCheck, Booking.com, Tripadvisor m.fl.; Corendon, Zoover, sociale medier og det officielle site nedenfor.",
      rateModalSurveyHint:
        "Den strukturerede undersøgelse om dit ophold og Viona-assistenten (1–5 pr. afsnit) findes på flisen «Bedøm din oplevelse». Dette vindue er kun eksterne links.",
      reqErrAfterHoursReception:
        "Mellem kl. 00.00 og 08.00 er driftsteamet ikke tilgængeligt; forespørgsler, klager, fejlrapporter og gæstemeldinger kan ikke modtages via appen. Kontakt venligst receptionen direkte.",
      linkOtelpuan: "Otelpuan",
      linkCheck24: "CHECK24",
      hintOtelpuan: "Bedøm dit ophold på Otelpuan — Tyrkiets hotelplatform.",
      hintCheck24: "CHECK24 (Tyskland) — hotelbedømmelse efter ophold.",
    },
    cs: {
      metaTitle: "Viona — Kaila Beach Hotel",
      langScreenTitle: "Vyberte jazyk",
      langScreenSubtitle: "Kaila Beach Hotel · Chytrý hotelový asistent",
      continue: "Pokračovat",
      langGridAria: "Volba jazyka",
      gateScreenTitle: "Ověření hosta",
      gateScreenSubtitle:
        "Přečtěte si stručnou informaci a potvrďte pokračování.",
      gateScreenSubtitleWithPassword:
        "Zadejte přístupový kód hotelu; poté si přečtěte informaci a potvrďte.",
      gateScreenSubtitleWithIdentity:
        "Zadejte jméno a příjmení a číslo pokoje jako v rezervaci.",
      gateScreenSubtitleWithPasswordAndIdentity:
        "Nejprve potvrďte pobyt; v případě potřeby doplňte přístupový kód.",
      gateIdentityKicker: "Pobyt",
      gateIdentityTitle: "Potvrďte totožnost",
      gateIdentityLead:
        "Údaje porovnáváme s aktivním seznamem hostů hotelu — přístup mají jen registrovaní hosté.",
      gatePasswordSectionLead:
        "Volitelně — přístupový kód sdílený hotelem (pokud platí).",
      gateFullNameLabel: "Jméno a příjmení",
      gateFullNamePlaceholder: "Jako v dokladu nebo rezervaci",
      gateRoomLabel: "Číslo pokoje",
      gateRoomPlaceholder: "např. 1204, 0007 nebo VIP01",
      gatePasswordLabel: "Přístupový kód hotelu",
      gatePasswordPlaceholder: "Kód od hotelu",
      gatePrivacyTitle: "Ochrana osobních údajů — stručná informace",
      gatePrivacyBody:
        "Údaje sdílené prostřednictvím Viona slouží k vyřízení požadavků souvisejících s pobytem v Kaila Beach Hotel a k přiměřenému informování; nejsou zveřejňovány nezákoně. Podrobnosti a svá práva najdete v oficiálním oznámení hotelu.",
      gatePrivacyAgeLine:
        "• Prohlašujete, že jste zletilý/á (18+); jinak aplikaci nepoužívejte.",
      gateCheckPrivacy:
        "Seznámil(a) jsem se s informací i bodem o věku výše a souhlasím.",
      gateSubmit: "Potvrdit a pokračovat",
      gateBackLang: "Zpět k výběru jazyka",
      gateErrorPassword: "Nesprávné heslo. Zadejte aktuální přístupové heslo.",
      gateErrorPasswordEmpty: "Zadejte přístupové heslo.",
      gateErrorGateVerify: "Heslo se nepodařilo ověřit. Zkontrolujte připojení a zkuste to znovu.",
      gateErrorGateLoading: "Načítání přístupu — chvíli počkejte a zkuste to znovu.",
      gateErrorGateStrict:
        "Přístup nelze ověřit (server nedostupný). Zkontrolujte připojení nebo klepněte na «Zkusit znovu».",
      gateRetryStatus: "Zkusit znovu",
      gateErrorPrivacy: "Zaškrtněte prosím pole pro pokračování.",
      homeTitle: "Kaila Beach Hotel",
      introLead: "Přímo u moře v Obagöl, Alanya — All Inclusive pro pohodlnou dovolenou.",
      appVionaTitle: "Viona · Chytrý průvodce pobytem",
      homeAppCardAria: "O aplikaci Viona",
      homeModuleGridAria: "Služby hotelu a informační moduly",
      homeCarouselAria: "Fotogalerie resortu",
      homeQuickActionsAria: "Rychlé akce",
      appIntro:
        "Během pobytu máte na jedné obrazovce přístup ke službám hotelu, praktickým informacím a oznámením.",
      btnRate: "Ohodnoťte nás",
      btnRateHint: "Externí platformy, sociální sítě a oficiální web",
      btnViona: "Hotelový asistent Viona",
      btnVionaHint: "Viona: digitální asistent vašeho hotelu.",
      close: "Zavřít",
      modGeneral: "Obecné informace o hotelu",
      modWhere: "Kde jsem? Jak se tam dostanu?",
      modRest: "Restaurace a bary",
      modAlacarte: "À la carte restaurace",
      alacarteSintonMenuCta: "Stáhnout menu",
      alacarteSintonMenuAria: "Stáhnout menu Sinton BBQ",
      modBeach: "Pláž a bazény",
      modRequests: "Požadavky / stížnosti / závady / hlášení hostů",
      subRequest: "Požadavky",
      subRequestHint:
        "Napište, co potřebujete—ručníky, ložní prádlo, minibar, vybavení; požadavek se zaznamená pro personál.",
      subComplaint: "Stížnosti",
      subComplaintHint:
        "Popište nespokojenost s pobytem nebo službou; hotel případ prověří a může se ozvat.",
      subFault: "Hlášení závady",
      subFaultHint:
        "Nahlaste technické problémy na pokoji (klimatizace, TV, koupelna, elektřina); uveďte místo a naléhavost.",
      subGuestNotification: "Hlášení hostů",
      subGuestNotificationHint:
        "Strava/alergie, zdraví, oslavy nebo pozdější odhlášení—s ohledem na váš pobyt.",
      modSpa: "Spa a wellness",
      modDiscount: "Exkluzivní nabídky pro hosty hotelu",
      modAnim: "Animace a aktivity",
      modSustainability: "Udržitelnost",
      modComingSoon: "Objevujte okolí",
      modMini: "Mini klub",
      modMeet: "Konferenční místnosti",
      modAlanya: "Objevte Alanyi",
      modTransfer: "Transfer",
      modRoomService: "Pokojová služba",
      modSurvey: "Ohodnoťte svůj zážitek",
      footer: "Eleythra Derin Teknoloji · Viona",
      rateModalTitle: "Recenze a odkazy",
      rateModalLead:
        "Napište recenzi na Google, Otelpuan, CHECK24, HolidayCheck, Booking.com, Tripadvisor a další; níže Corendon, Zoover, sociální sítě a oficiální web.",
      rateModalSurveyHint:
        "Strukturovaný dotazník k pobytu a asistentovi Viona (1–5 podle sekcí) najdete na dlaždici «Ohodnoťte svůj zážitek». Toto okno obsahuje jen externí odkazy.",
      reqErrAfterHoursReception:
        "Mezi 0:00 a 8:00 je provozní tým nedostupný — přes aplikaci v tuto dobu nepřijímám požadavky, stížnosti, hlášení závad ani hlášení hostů. V naléhavých případech kontaktujte recepci.",
      linkOtelpuan: "Otelpuan",
      linkCheck24: "CHECK24",
      hintOtelpuan: "Ohodnoťte pobyt na Otelpuan — turecké platformě hodnocení hotelů.",
      hintCheck24: "CHECK24 (Německo) — hodnocení hotelu po pobytu.",
    },
    ro: {
      metaTitle: "Viona — Kaila Beach Hotel",
      langScreenTitle: "Alegeți limba",
      langScreenSubtitle: "Kaila Beach Hotel · Asistent hotelier inteligent",
      continue: "Continuare",
      langGridAria: "Opțiuni limbă",
      gateScreenTitle: "Verificare oaspete",
      gateScreenSubtitle:
        "Citiți informarea scurtă și confirmați pentru a continua.",
      gateScreenSubtitleWithPassword:
        "Introduceți codul de acces al hotelului; apoi citiți informarea și confirmați.",
      gateScreenSubtitleWithIdentity:
        "Introduceți numele complet și numărul camerei ca în rezervare.",
      gateScreenSubtitleWithPasswordAndIdentity:
        "Confirmați mai întâi sejurul; adăugați codul de acces dacă este necesar.",
      gateIdentityKicker: "Sejur",
      gateIdentityTitle: "Confirmați identitatea",
      gateIdentityLead:
        "Datele sunt comparate cu lista activă de oaspeți a hotelului — acces doar pentru oaspeți înregistrați.",
      gatePasswordSectionLead:
        "Opțional — cod de acces oferit de hotel (dacă este cazul).",
      gateFullNameLabel: "Nume complet",
      gateFullNamePlaceholder: "Ca în act sau rezervare",
      gateRoomLabel: "Număr cameră",
      gateRoomPlaceholder: "ex. 1204, 0007 sau VIP01",
      gatePasswordLabel: "Cod acces hotel",
      gatePasswordPlaceholder: "Cod furnizat de hotel",
      gatePrivacyTitle: "Date personale — informare scurtă",
      gatePrivacyBody:
        "Informațiile transmise prin Viona sunt folosite pentru solicitările legate de sejurul la Kaila Beach Hotel și pentru informare adecvată; nu sunt publicate ilegal. Detaliile și drepturile dvs. sunt în notificarea oficială de confidențialitate a hotelului.",
      gatePrivacyAgeLine:
        "• Declarați că aveți cel puțin 18 ani; altfel nu trebuie să folosiți aplicația.",
      gateCheckPrivacy:
        "Am citit informarea și punctul privind vârsta de mai sus și sunt de acord.",
      gateSubmit: "Verifică și continuă",
      gateBackLang: "Înapoi la limbi",
      gateErrorPassword: "Parolă incorectă. Introduceți parola curentă.",
      gateErrorPasswordEmpty: "Introduceți parola de acces.",
      gateErrorGateVerify: "Parola nu a putut fi verificată. Verificați conexiunea și încercați din nou.",
      gateErrorGateLoading: "Se verifică accesul — așteptați puțin și încercați din nou.",
      gateErrorGateStrict:
        "Accesul nu poate fi verificat (server indisponibil). Verificați conexiunea sau apăsați «Reîncearcă».",
      gateRetryStatus: "Reîncearcă",
      gateErrorPrivacy: "Bifați caseta pentru a continua.",
      homeTitle: "Kaila Beach Hotel",
      introLead: "La malul mării în Obagöl, Alanya — All Inclusive pentru o vacanță confortabilă.",
      appVionaTitle: "Viona · Companionul inteligent al sejurului",
      homeAppCardAria: "Despre aplicația Viona",
      homeModuleGridAria: "Servicii hotel și module de informare",
      homeCarouselAria: "Galerie foto a resortului",
      homeQuickActionsAria: "Acțiuni rapide",
      appIntro:
        "În timpul sejurului: acces la serviciile hotelului, informații practice și anunțuri într-un singur loc.",
      btnRate: "Evaluați-ne",
      btnRateHint: "Platforme externe, rețele sociale și site oficial",
      btnViona: "Asistent hotelier Viona",
      btnVionaHint: "Viona: asistentul digital al hotelului.",
      close: "Închideți",
      modGeneral: "Informații generale despre hotel",
      modWhere: "Unde sunt? Cum ajung?",
      modRest: "Restaurante și baruri",
      modAlacarte: "Restaurante à la carte",
      alacarteSintonMenuCta: "Descărcați meniul",
      alacarteSintonMenuAria: "Descărcați meniul Sinton BBQ",
      modBeach: "Plajă și piscine",
      modRequests: "Cereri / reclamații / defecțiuni / înștiințări oaspeți",
      subRequest: "Cereri",
      subRequestHint:
        "Spuneți echipei ce aveți nevoie—prosoape, lenjerie, minibar, consumabile; cererea este înregistrată.",
      subComplaint: "Reclamații",
      subComplaintHint:
        "Descrieți nemulțumirea față de sejur sau serviciu; hotelul analizează cazul și vă poate contacta.",
      subFault: "Raport defecțiune",
      subFaultHint:
        "Raportați probleme tehnice în cameră (AC, TV, baie, electricitate); indicați locul și urgența.",
      subGuestNotification: "Înștiințări oaspeți",
      subGuestNotificationHint:
        "Dietă/alergii, sănătate, sărbători sau check-out târziu—legate de sejurul dumneavoastră.",
      modSpa: "Spa & wellness",
      modDiscount: "Oferte exclusive pentru oaspeții hotelului",
      modAnim: "Animație și activități",
      modSustainability: "Sustenabilitate",
      modComingSoon: "Explorați împrejurimile",
      modMini: "Mini Club",
      modMeet: "Săli de întâlniri",
      modAlanya: "Descoperiți Alanya",
      modTransfer: "Transfer",
      modRoomService: "Room service",
      modSurvey: "Evaluați experiența",
      footer: "Eleythra Derin Teknoloji · Viona",
      rateModalTitle: "Recenzii și linkuri",
      rateModalLead:
        "Lăsați o recenzie pe Google, Otelpuan, CHECK24, HolidayCheck, Booking.com, Tripadvisor și altele; mai jos Corendon, Zoover, rețele sociale și site-ul oficial.",
      rateModalSurveyHint:
        "Chestionarul structurat despre sejur și asistentul Viona (1–5 pe secțiuni) este pe dala «Evaluați experiența». Această fereastră listează doar linkuri externe.",
      reqErrAfterHoursReception:
        "Între 0:00 și 8:00 echipa operațională nu este disponibilă — nu pot înregistra solicitări, reclamații, sesizări sau notificări pentru oaspeți prin aplicație. Pentru asistență, contactați recepția.",
      linkOtelpuan: "Otelpuan",
      linkCheck24: "CHECK24",
      hintOtelpuan: "Evaluați sejurul pe Otelpuan — platforma turcă de recenzii hoteliere.",
      hintCheck24: "CHECK24 (Germania) — recenzie hotel după sejur.",
    },
    nl: {
      metaTitle: "Viona — Kaila Beach Hotel",
      langScreenTitle: "Kies uw taal",
      langScreenSubtitle: "Kaila Beach Hotel · Slimme hotelassistent",
      continue: "Doorgaan",
      langGridAria: "Taalkeuze",
      gateScreenTitle: "Gastverificatie",
      gateScreenSubtitle:
        "Lees de korte mededeling en bevestig om door te gaan.",
      gateScreenSubtitleWithPassword:
        "Voer de hoteltoegangscode in; lees de mededeling en bevestig.",
      gateScreenSubtitleWithIdentity:
        "Voer uw voor- en achternaam en kamernummer in zoals in de reservering.",
      gateScreenSubtitleWithPasswordAndIdentity:
        "Bevestig eerst uw verblijf; voeg indien nodig een toegangscode toe.",
      gateIdentityKicker: "Verblijf",
      gateIdentityTitle: "Bevestig uw identiteit",
      gateIdentityLead:
        "We vergelijken uw gegevens met de actieve gastenlijst van het hotel — alleen geregistreerde gasten krijgen toegang.",
      gatePasswordSectionLead:
        "Optioneel — toegangscode van het hotel (indien van toepassing).",
      gateFullNameLabel: "Voor- en achternaam",
      gateFullNamePlaceholder: "Zoals op ID of reservering",
      gateRoomLabel: "Kamernummer",
      gateRoomPlaceholder: "bijv. 1204, 0007 of VIP01",
      gatePasswordLabel: "Hoteltoegangscode",
      gatePasswordPlaceholder: "Code van het hotel",
      gatePrivacyTitle: "Privacy — korte mededeling",
      gatePrivacyBody:
        "Gegevens die u via Viona deelt, worden gebruikt voor verzoeken met betrekking tot uw verblijf in Kaila Beach Hotel en voor passende informatie; ze worden niet onrechtmatig gepubliceerd. Zie de officiële privacyverklaring van het hotel voor details en uw rechten.",
      gatePrivacyAgeLine:
        "• U verklaart meerderjarig te zijn (18+); anders mag u de app niet gebruiken.",
      gateCheckPrivacy:
        "Ik heb de mededeling en het leeftijdspunt hierboven gelezen en ga akkoord.",
      gateSubmit: "Verifiëren en doorgaan",
      gateBackLang: "Terug naar taalkeuze",
      gateErrorPassword: "Onjuist wachtwoord. Voer het actuele toegangswachtwoord in.",
      gateErrorPasswordEmpty: "Voer het toegangswachtwoord in.",
      gateErrorGateVerify: "Het wachtwoord kon niet worden gecontroleerd. Controleer uw verbinding en probeer opnieuw.",
      gateErrorGateLoading: "Toegang wordt geladen — even geduld en probeer opnieuw.",
      gateErrorGateStrict:
        "Toegang kan niet worden gecontroleerd (server niet bereikbaar). Controleer uw verbinding of tik op «Opnieuw».",
      gateRetryStatus: "Opnieuw",
      gateErrorPrivacy: "Vink het vakje aan om door te gaan.",
      homeTitle: "Kaila Beach Hotel",
      introLead: "Strandzijde in Obagöl, Alanya — all-inclusive voor een comfortabel verblijf.",
      appVionaTitle: "Viona · Uw slimme verblijfsmetgezel",
      homeAppCardAria: "Over de Viona-app",
      homeModuleGridAria: "Hotelservices en infomodules",
      homeCarouselAria: "Fotogalerij van het resort",
      homeQuickActionsAria: "Snelle acties",
      appIntro:
        "Tijdens uw verblijf: hoteldiensten, praktische info en mededelingen op één verfijnd scherm.",
      btnRate: "Beoordeel ons",
      btnRateHint: "Externe platforms, social media en officiële site",
      btnViona: "Viona hotelassistent",
      btnVionaHint: "Viona: de digitale assistent van uw hotel.",
      close: "Sluiten",
      modGeneral: "Algemene hotelinformatie",
      modWhere: "Waar ben ik? & Hoe kom ik er?",
      modRest: "Restaurants en bars",
      modAlacarte: "À-la-carte-restaurants",
      alacarteSintonMenuCta: "Menu downloaden",
      alacarteSintonMenuAria: "Sinton BBQ-menu downloaden",
      modBeach: "Strand en zwembaden",
      modRequests: "Verzoeken / klachten / storingen / gastmeldingen",
      subRequest: "Verzoeken",
      subRequestHint:
        "Laat weten wat u nodig heeft—handdoeken, beddengoed, minibar, voorraden; uw verzoek wordt geregistreerd.",
      subComplaint: "Klachten",
      subComplaintHint:
        "Beschrijf ontevredenheid over verblijf of dienst; het hotel bekijkt de zaak en kan contact opnemen.",
      subFault: "Storingsmelding",
      subFaultHint:
        "Meld technische problemen op de kamer (airco, tv, badkamer, elektriciteit); geef locatie en urgentie door.",
      subGuestNotification: "Gastmeldingen",
      subGuestNotificationHint:
        "Dieet/allergieën, gezondheid, vieringen of late check-out—passend bij uw verblijf.",
      modSpa: "Spa & wellness",
      modDiscount: "Exclusieve aanbiedingen voor hotelgasten",
      modAnim: "Animatie & activiteiten",
      modSustainability: "Duurzaamheid",
      modComingSoon: "Ontdek de omgeving",
      modMini: "Mini Club",
      modMeet: "Vergaderzalen",
      modAlanya: "Ontdek Alanya",
      modTransfer: "Transfer",
      modRoomService: "Roomservice",
      modSurvey: "Beoordeel uw ervaring",
      footer: "Eleythra Derin Teknoloji · Viona",
      rateModalTitle: "Recensies en links",
      rateModalLead:
        "Laat een review achter op Google, Otelpuan, CHECK24, HolidayCheck, Booking.com, Tripadvisor e.a.; hieronder Corendon, Zoover, social media en de officiële site.",
      rateModalSurveyHint:
        "De gestructureerde enquête over uw verblijf en de Viona-assistent (1–5 per sectie) staat op de tegel «Beoordeel uw ervaring». Dit venster toont alleen externe links.",
      reqErrAfterHoursReception:
        "Tussen 00:00 en 08:00 kan ik geen verzoeken, klachten, storingsmeldingen of gastmeldingen via de app registreren. Neem contact op met de receptie.",
      linkOtelpuan: "Otelpuan",
      linkCheck24: "CHECK24",
      hintOtelpuan: "Beoordeel uw verblijf op Otelpuan — het Turkse hotelreviewplatform.",
      hintCheck24: "CHECK24 (Duitsland) — hotelbeoordeling na verblijf.",
    },
    sk: {
      metaTitle: "Viona — Kaila Beach Hotel",
      langScreenTitle: "Vyberte jazyk",
      langScreenSubtitle: "Kaila Beach Hotel · Inteligentný hotelový asistent",
      continue: "Pokračovať",
      langGridAria: "Voľba jazyka",
      gateScreenTitle: "Overenie hosťa",
      gateScreenSubtitle:
        "Prečítajte si stručnú informáciu a potvrďte pokračovanie.",
      gateScreenSubtitleWithPassword:
        "Zadajte prístupový kód hotela; potom si prečítajte informáciu a potvrďte.",
      gateScreenSubtitleWithIdentity:
        "Zadajte meno a priezvisko a číslo izby ako v rezervácii.",
      gateScreenSubtitleWithPasswordAndIdentity:
        "Najprv potvrďte pobyt; v prípade potreby doplňte prístupový kód.",
      gateIdentityKicker: "Pobyt",
      gateIdentityTitle: "Potvrďte identitu",
      gateIdentityLead:
        "Údaje porovnávame s aktívnym zoznamom hostí hotela — prístup majú len registrovaní hostia.",
      gatePasswordSectionLead:
        "Voliteľné — prístupový kód poskytnutý hotelom (ak platí).",
      gateFullNameLabel: "Meno a priezvisko",
      gateFullNamePlaceholder: "Ako v doklade alebo rezervácii",
      gateRoomLabel: "Číslo izby",
      gateRoomPlaceholder: "napr. 1204, 0007 alebo VIP01",
      gatePasswordLabel: "Prístupový kód hotela",
      gatePasswordPlaceholder: "Kód od hotela",
      gatePrivacyTitle: "Osobné údaje — stručná informácia",
      gatePrivacyBody:
        "Údaje zdieľané cez Viona slúžia na vybavenie požiadaviek súvisiacich s pobytom v Kaila Beach Hotel a na primerané informovanie; nezverejňujú sa nezákonne. Podrobnosti a svoje práva nájdete v oficiálnom oznámení hotela.",
      gatePrivacyAgeLine:
        "• Potvrdzujete, že ste plnoletý/á (18+); inak aplikáciu nepoužívajte.",
      gateCheckPrivacy:
        "Prečítal(a) som si vyššie informáciu aj bod o veku a súhlasím.",
      gateSubmit: "Potvrdiť a pokračovať",
      gateBackLang: "Späť na výber jazyka",
      gateErrorPassword: "Nesprávne heslo. Zadajte aktuálne prístupové heslo.",
      gateErrorPasswordEmpty: "Zadajte prístupové heslo.",
      gateErrorGateVerify: "Heslo sa nepodarilo overiť. Skontrolujte pripojenie a skúste znova.",
      gateErrorGateLoading: "Načítava sa prístup — počkajte chvíľu a skúste znova.",
      gateErrorGateStrict:
        "Prístup sa nepodarilo overiť (server nedostupný). Skontrolujte pripojenie alebo ťuknite na «Skúsiť znova».",
      gateRetryStatus: "Skúsiť znova",
      gateErrorPrivacy: "Zaškrtnite pole na pokračovanie.",
      homeTitle: "Kaila Beach Hotel",
      introLead: "Pri mori v Obagöl, Alanya — all inclusive pre pohodlnú dovolenku.",
      appVionaTitle: "Viona · Váš inteligentný sprievodca pobytom",
      homeAppCardAria: "O aplikácii Viona",
      homeModuleGridAria: "Služby hotela a informačné moduly",
      homeCarouselAria: "Fotogaléria rezortu",
      homeQuickActionsAria: "Rýchle akcie",
      appIntro:
        "Počas pobytu máte na jednej obrazovke prístup k službám hotela, praktickým informáciám a oznámeniam.",
      btnRate: "Ohodnoťte nás",
      btnRateHint: "Externé platformy, sociálne siete a oficiálna stránka",
      btnViona: "Hotelový asistent Viona",
      btnVionaHint: "Viona: digitálny asistent vášho hotela.",
      close: "Zavrieť",
      modGeneral: "Všeobecné informácie o hoteli",
      modWhere: "Kde som? Ako sa tam dostanem?",
      modRest: "Reštaurácie a bary",
      modAlacarte: "À la carte reštaurácie",
      alacarteSintonMenuCta: "Stiahnuť menu",
      alacarteSintonMenuAria: "Stiahnuť menu Sinton BBQ",
      modBeach: "Pláž a bazény",
      modRequests: "Požiadavky / sťažnosti / poruchy / oznámenia hostí",
      subRequest: "Požiadavky",
      subRequestHint:
        "Napíšte, čo potrebujete—uteráky, posteľnú bielizeň, minibar, doplnky; požiadavka sa zaznamená pre personál.",
      subComplaint: "Sťažnosti",
      subComplaintHint:
        "Opíšte nespokojnosť s pobytom alebo službou; hotel prípad preverí a môže vás kontaktovať.",
      subFault: "Hlásenie poruchy",
      subFaultHint:
        "Nahláste technické problémy na izbe (klimatizácia, TV, kúpeľňa, elektrina); uveďte miesto a naliehavosť.",
      subGuestNotification: "Oznámenia hostí",
      subGuestNotificationHint:
        "Strava/alergie, zdravie, oslavy alebo neskorší odchod—v súvislosti s vaším pobytom.",
      modSpa: "Spa a wellness",
      modDiscount: "Exkluzívne ponuky pre hostí hotela",
      modAnim: "Animácia a aktivity",
      modSustainability: "Udržateľnosť",
      modComingSoon: "Objavujte okolie",
      modMini: "Mini klub",
      modMeet: "Zasadacie miestnosti",
      modAlanya: "Objavte Alanju",
      modTransfer: "Transfer",
      modRoomService: "Izbový servis",
      modSurvey: "Ohodnoťte svoj zážitok",
      footer: "Eleythra Derin Teknoloji · Viona",
      rateModalTitle: "Recenzie a odkazy",
      rateModalLead:
        "Zanechajte recenziu na Google, Otelpuan, CHECK24, HolidayCheck, Booking.com, Tripadvisor a ďalšie; nižšie Corendon, Zoover, sociálne siete a oficiálna stránka.",
      rateModalSurveyHint:
        "Štruktúrovaný dotazník k pobytu a asistentovi Viona (1–5 podľa sekcií) je na dlaždici «Ohodnoťte svoj zážitok». Toto okno obsahuje len externé odkazy.",
      reqErrAfterHoursReception:
        "Medzi 0:00 a 8:00 nemôžem prijímať požiadavky, sťažnosti, hlásenia porúch ani oznámenia hostí cez aplikáciu. Kontaktujte recepciu.",
      linkOtelpuan: "Otelpuan",
      linkCheck24: "CHECK24",
      hintOtelpuan: "Ohodnoťte pobyt na Otelpuan — tureckej platforme hodnotení hotelov.",
      hintCheck24: "CHECK24 (Nemecko) — hodnotenie hotela po pobyte.",
    },
  };

  /** Sohbet modülü: karşılama, kısayollar, «Din besked» — ek UI dilleri (en tabanı üzerine). */
  var CHAT_UI_PATCH = {
    ru: {
      chatWelcomeTitleLine: " · Чем я могу помочь вам сегодня?",
      chatWelcomeLead:
        "Спрашивайте о ресторанах и барах, бассейнах, спа, как добраться и деталях проживания — всё в одном месте.",
      chatEmptyHint: "Выберите быстрый вопрос ниже или напишите своё.",
      chatPlaceholder: "Введите сообщение…",
      chatComposerLabel: "Ваше сообщение",
      chatFormOptionsIntro: "Варианты",
      chatQuickRest: "Часы работы ресторанов",
      chatQuickPool: "Бассейн и пляж",
      chatQuickSpa: "Спа и wellness",
      chatQuickAnim: "Анимация и мероприятия",
      chatQuickCheck: "Время заезда и выезда",
      chatQuickWifi: "Wi‑Fi и интернет",
      chatOpenComplaint: "Открыть форму жалобы",
      chatOpenRoomService: "Открыть обслуживание в номере",
    },
    da: {
      chatWelcomeTitleLine: " · Hvordan kan jeg hjælpe dig i dag?",
      chatWelcomeLead:
        "Spørg om restauranter og barer, pool, strand, spa, beliggenhed og praktisk info om opholdet — samlet ét sted.",
      chatEmptyHint: "Prøv en genvej nedenfor, eller skriv dit eget spørgsmål.",
      chatPlaceholder: "Skriv din besked…",
      chatComposerLabel: "Din besked",
      chatFormOptionsIntro: "Valgmuligheder",
      chatQuickRest: "Restauranttider",
      chatQuickPool: "Pool og strand",
      chatQuickSpa: "Spa og wellness",
      chatQuickAnim: "Animation og aktiviteter",
      chatQuickCheck: "Ind- og udtjekningstider",
      chatQuickWifi: "Wi‑Fi og internet",
      chatOpenComplaint: "Åbn klageformular",
      chatOpenRoomService: "Åbn roomservice",
    },
    cs: {
      chatWelcomeTitleLine: " · Jak vám dnes mohu pomoci?",
      chatWelcomeLead:
        "Zeptejte se na restaurace a bary, bazény, spa, polohu a praktické informace k pobytu — vše na jednom místě.",
      chatEmptyHint: "Zkuste zkratku níže nebo napište vlastní dotaz.",
      chatPlaceholder: "Napište zprávu…",
      chatComposerLabel: "Vaše zpráva",
      chatFormOptionsIntro: "Možnosti",
      chatQuickRest: "Otevírací doba restaurací",
      chatQuickPool: "Bazén a pláž",
      chatQuickSpa: "Spa a wellness",
      chatQuickAnim: "Animace a akce",
      chatQuickCheck: "Časy přihlášení a odhlášení",
      chatQuickWifi: "Wi‑Fi a internet",
      chatOpenComplaint: "Otevřít stížnostní formulář",
      chatOpenRoomService: "Otevřít room service",
    },
    ro: {
      chatWelcomeTitleLine: " · Cu ce vă pot ajuta astăzi?",
      chatWelcomeLead:
        "Întrebați despre restaurante și baruri, piscină, plajă, spa, locație și detalii practice despre sejur — totul într-un singur loc.",
      chatEmptyHint: "Folosiți o scurtătură de mai jos sau scrieți propria întrebare.",
      chatPlaceholder: "Scrieți mesajul…",
      chatComposerLabel: "Mesajul dvs.",
      chatFormOptionsIntro: "Opțiuni",
      chatQuickRest: "Program restaurant",
      chatQuickPool: "Piscină și plajă",
      chatQuickSpa: "Spa și wellness",
      chatQuickAnim: "Animație și evenimente",
      chatQuickCheck: "Ore check-in și check-out",
      chatQuickWifi: "Wi‑Fi și internet",
      chatOpenComplaint: "Deschide formularul de reclamație",
      chatOpenRoomService: "Deschide room service",
    },
    nl: {
      chatWelcomeTitleLine: " · Hoe kan ik u vandaag helpen?",
      chatWelcomeLead:
        "Vraag over restaurants en bars, zwembad, strand, spa, locatie en praktische verblijfsinfo — alles op één plek.",
      chatEmptyHint: "Probeer hieronder een snelkoppeling of stel uw eigen vraag.",
      chatPlaceholder: "Typ uw bericht…",
      chatComposerLabel: "Uw bericht",
      chatFormOptionsIntro: "Opties",
      chatQuickRest: "Restauranttijden",
      chatQuickPool: "Zwembad en strand",
      chatQuickSpa: "Spa en wellness",
      chatQuickAnim: "Animatie en activiteiten",
      chatQuickCheck: "In- en uitchecktijden",
      chatQuickWifi: "Wi‑Fi en internet",
      chatOpenComplaint: "Klachtenformulier openen",
      chatOpenRoomService: "Roomservice openen",
    },
    sk: {
      chatWelcomeTitleLine: " · Ako vám dnes môžem pomôcť?",
      chatWelcomeLead:
        "Opýtajte sa na reštaurácie a bary, bazény, spa, polohu a praktické informácie k pobytu — všetko na jednom mieste.",
      chatEmptyHint: "Skúste skratku nižšie alebo napíšte vlastnú otázku.",
      chatPlaceholder: "Napíšte správu…",
      chatComposerLabel: "Vaša správa",
      chatFormOptionsIntro: "Možnosti",
      chatQuickRest: "Otváracie hodiny reštaurácií",
      chatQuickPool: "Bazén a pláž",
      chatQuickSpa: "Spa a wellness",
      chatQuickAnim: "Animácia a podujatia",
      chatQuickCheck: "Časy príchodu a odchodu",
      chatQuickWifi: "Wi‑Fi a internet",
      chatOpenComplaint: "Otvoriť formulár sťažnosti",
      chatOpenRoomService: "Otvoriť room service",
    },
  };
  Object.keys(CHAT_UI_PATCH).forEach(function (c) {
    if (PATCH[c]) Object.assign(PATCH[c], CHAT_UI_PATCH[c]);
  });

  /**
   * Sesli asistan: bar + ipuçları + durum + ARIA + hata (STT/TTS locale ayrı; `viona-voice.js` + Azure).
   * Zorunlu: voiceSectionTitle, voiceSectionTapToOpen, voiceInfoOnlyHint, voiceSectionTapAvatar,
   * voiceAvatarAria, voiceAsideAria, voicePanelAria — en tabanı üzerine aynı anahtarlar.
   */
  var VOICE_UI_PATCH = {
    ru: {
      voiceSectionTitle: "Голосовой помощник",
      voiceSectionTapToOpen: "Нажмите, чтобы открыть голосовой режим",
      voiceInfoOnlyHint:
        "Голос только для справок. Для заявок, жалоб и форм откройте текстовый чат.",
      voiceSectionTapAvatar: "Нажмите на аватар, чтобы говорить",
      voiceAvatarAria: "Viona — нажмите на аватар, чтобы говорить",
      voiceAsideAria: "Голосовой помощник (дополнительно)",
      voicePanelAria: "Аватар голосового помощника",
      voiceStatusIdle: "Коснитесь аватара Viona, чтобы говорить",
      voiceStatusListening: "Слушаю…",
      voiceStatusThinking: "Думаю…",
      voiceStatusSpeaking: "Говорю…",
      voiceToggleExpandAria: "Открыть панель голосового помощника",
      voiceToggleCollapseAria: "Закрыть панель голосового помощника",
      voiceBackToChat: "Вернуться к текстовому чату",
      voiceBackToChatAria: "Вернуться к текстовому чату",
      voiceErrorNoSpeech:
        "Речь не распознана — говорите громче или ближе к микрофону.",
      voiceErrorNetwork:
        "Сбой голосового соединения или сервера. Попробуйте текстовый чат.",
      voiceErrorPlayback:
        "Не удалось воспроизвести ответ (ограничение браузера). Нажмите снова или используйте текст.",
      voiceErrorAssistant:
        "Ответ не получен. Повторите попытку или перейдите в текстовый чат.",
    },
    da: {
      voiceSectionTitle: "Stemmeassistent",
      voiceSectionTapToOpen: "Tryk for at åbne stemmetilstand",
      voiceInfoOnlyHint:
        "Stemme kun til oplysninger. Brug tekstchat til forespørgsler, klager eller formularer.",
      voiceSectionTapAvatar: "Tryk på avataren for at tale",
      voiceAvatarAria: "Viona — tryk på avataren for at tale",
      voiceAsideAria: "Stemmeassistent (sekundær)",
      voicePanelAria: "Stemmeassistent-avatar",
      voiceStatusIdle: "Tryk på Viona-avatar for at tale",
      voiceStatusListening: "Lytter…",
      voiceStatusThinking: "Tænker…",
      voiceStatusSpeaking: "Taler…",
      voiceToggleExpandAria: "Åbn stemmeassistent-panelet",
      voiceToggleCollapseAria: "Luk stemmeassistent-panelet",
      voiceBackToChat: "Tilbage til tekstchat",
      voiceBackToChatAria: "Tilbage til tekstchat",
      voiceErrorNoSpeech:
        "Ingen tale registreret — prøv højere eller tættere på mikrofonen.",
      voiceErrorNetwork: "Stemme- eller serverforbindelse afbrudt. Prøv tekstchat.",
      voiceErrorPlayback:
        "Kunne ikke afspille svar (browserbegrænsning). Tryk igen eller brug tekstchat.",
      voiceErrorAssistant: "Intet svar. Prøv igen eller skift til tekstchat.",
    },
    cs: {
      voiceSectionTitle: "Hlasová asistentka",
      voiceSectionTapToOpen: "Klepněte pro otevření hlasového režimu",
      voiceInfoOnlyHint:
        "Hlas jen pro informace. Pro žádosti, stížnosti nebo formuláře použijte textový chat.",
      voiceSectionTapAvatar: "Klepněte na avatar a mluvte",
      voiceAvatarAria: "Viona — klepněte na avatar a mluvte",
      voiceAsideAria: "Hlasová asistentka (vedlejší)",
      voicePanelAria: "Avatar hlasové asistentky",
      voiceStatusIdle: "Pro mluvení klepněte na avatar Viona",
      voiceStatusListening: "Naslouchám…",
      voiceStatusThinking: "Přemýšlím…",
      voiceStatusSpeaking: "Mluvím…",
      voiceToggleExpandAria: "Otevřít panel hlasové asistentky",
      voiceToggleCollapseAria: "Zavřít panel hlasové asistentky",
      voiceBackToChat: "Zpět na textový chat",
      voiceBackToChatAria: "Zpět na textový chat",
      voiceErrorNoSpeech:
        "Nepovedlo se rozpoznat řeč — zkuste mluvit hlasitěji nebo blíž k mikrofonu.",
      voiceErrorNetwork: "Hlasové nebo serverové spojení selhalo. Zkuste textový chat.",
      voiceErrorPlayback:
        "Odpověď se nepřehrála (omezení prohlížeče). Klepněte znovu nebo použijte text.",
      voiceErrorAssistant: "Odpověď nepřišla. Zkuste to znovu nebo přejděte na textový chat.",
    },
    ro: {
      voiceSectionTitle: "Asistent vocal",
      voiceSectionTapToOpen: "Atingeți pentru a deschide modul vocal",
      voiceInfoOnlyHint:
        "Vocea este doar pentru informații. Pentru cereri, reclamații sau formulare folosiți chatul text.",
      voiceSectionTapAvatar: "Atingeți avatarul pentru a vorbi",
      voiceAvatarAria: "Viona — atingeți avatarul pentru a vorbi",
      voiceAsideAria: "Asistent vocal (secundar)",
      voicePanelAria: "Avatar asistent vocal",
      voiceStatusIdle: "Atingeți avatarul Viona pentru a vorbi",
      voiceStatusListening: "Ascult…",
      voiceStatusThinking: "Mă gândesc…",
      voiceStatusSpeaking: "Vorbesc…",
      voiceToggleExpandAria: "Deschide panoul asistentului vocal",
      voiceToggleCollapseAria: "Închide panoul asistentului vocal",
      voiceBackToChat: "Înapoi la chat text",
      voiceBackToChatAria: "Înapoi la chat text",
      voiceErrorNoSpeech:
        "Nu s-a detectat vocea — vorbiți mai tare sau mai aproape de microfon.",
      voiceErrorNetwork:
        "Conexiune vocală sau la server întreruptă. Încercați chatul text.",
      voiceErrorPlayback:
        "Răspunsul audio nu a putut fi redat (browser). Atingeți din nou sau folosiți chatul text.",
      voiceErrorAssistant: "Fără răspuns. Reîncercați sau comutați la chat text.",
    },
    nl: {
      voiceSectionTitle: "Spraakassistent",
      voiceSectionTapToOpen: "Tik om spraakmodus te openen",
      voiceInfoOnlyHint:
        "Spraak alleen voor informatie. Voor verzoeken, klachten of formulieren: tekstchat.",
      voiceSectionTapAvatar: "Tik op de avatar om te spreken",
      voiceAvatarAria: "Viona — tik op de avatar om te spreken",
      voiceAsideAria: "Spraakassistent (secundair)",
      voicePanelAria: "Spraakassistent-avatar",
      voiceStatusIdle: "Tik op de Viona-avatar om te spreken",
      voiceStatusListening: "Ik luister…",
      voiceStatusThinking: "Even nadenken…",
      voiceStatusSpeaking: "Ik spreek…",
      voiceToggleExpandAria: "Paneel spraakassistent openen",
      voiceToggleCollapseAria: "Paneel spraakassistent sluiten",
      voiceBackToChat: "Terug naar tekstchat",
      voiceBackToChatAria: "Terug naar tekstchat",
      voiceErrorNoSpeech:
        "Geen spraak herkend — probeer harder of dichter bij de microfoon.",
      voiceErrorNetwork: "Spraak- of serververbinding mislukt. Probeer tekstchat.",
      voiceErrorPlayback:
        "Antwoord kon niet worden afgespeeld (browser). Tik opnieuw of gebruik tekstchat.",
      voiceErrorAssistant: "Geen antwoord. Probeer opnieuw of schakel over naar tekstchat.",
    },
    sk: {
      voiceSectionTitle: "Hlasová asistentka",
      voiceSectionTapToOpen: "Ťuknite pre otvorenie hlasového režimu",
      voiceInfoOnlyHint:
        "Hlas len na informácie. Pre požiadavky, sťažnosti alebo formuláre použite textový chat.",
      voiceSectionTapAvatar: "Ťuknite na avatar a hovorte",
      voiceAvatarAria: "Viona — ťuknite na avatar a hovorte",
      voiceAsideAria: "Hlasová asistentka (vedľajšia)",
      voicePanelAria: "Avatar hlasovej asistentky",
      voiceStatusIdle: "Ťuknite na avatar Viona a budete hovoriť",
      voiceStatusListening: "Počúvam…",
      voiceStatusThinking: "Premýšľam…",
      voiceStatusSpeaking: "Hovorím…",
      voiceToggleExpandAria: "Otvoriť panel hlasovej asistentky",
      voiceToggleCollapseAria: "Zavrieť panel hlasovej asistentky",
      voiceBackToChat: "Späť na textový chat",
      voiceBackToChatAria: "Späť na textový chat",
      voiceErrorNoSpeech:
        "Reč nebola rozpoznaná — hovorte hlasnejší alebo bližšie k mikrofónu.",
      voiceErrorNetwork: "Hlasové alebo serverové spojenie zlyhalo. Skúste textový chat.",
      voiceErrorPlayback:
        "Odpoveď sa neprehrala (obmedzenie prehliadača). Ťuknite znova alebo použite text.",
      voiceErrorAssistant: "Žiadna odpoveď. Skúste znova alebo prejdite na textový chat.",
    },
  };
  Object.keys(VOICE_UI_PATCH).forEach(function (c) {
    if (PATCH[c]) Object.assign(PATCH[c], VOICE_UI_PATCH[c]);
  });

  var VOICE_ERROR_EXTRA = {
    ru: {
      voiceErrorSpeechUnauthorized:
        "Голос для этого адреса не подтверждён. Используйте основной домен или текстовый чат.",
      voiceErrorSpeechNotConfigured: "Голосовой сервис не настроен. Попробуйте текстовый чат позже.",
      voiceErrorSpeechAzure: "Распознавание речи временно недоступно. Используйте текст или повторите позже.",
      voiceErrorAzureKey:
        "Ключ Azure Speech недействителен или не от этого ресурса. Проверьте AZURE_SPEECH_KEY в Render.",
      voiceErrorAzureQuota: "Запрос отклонён Azure (квота или политика). Проверьте ресурс в портале Azure.",
      voiceErrorAzureRegion:
        "Неверный регион: AZURE_SPEECH_REGION должен совпадать с регионом ресурса Speech в Azure.",
      voiceErrorRateLimit: "Слишком частые попытки. Подождите или используйте текстовый чат.",
    },
    da: {
      voiceErrorSpeechUnauthorized:
        "Stemme kunne ikke verificeres for dette domæne. Brug produktionssitet eller tekstchat.",
      voiceErrorSpeechNotConfigured: "Stemmeservice er ikke konfigureret. Prøv tekstchat eller senere.",
      voiceErrorSpeechAzure: "Stemmegenkendelse er midlertidigt utilgængelig. Brug tekstchat eller prøv igen.",
      voiceErrorAzureKey:
        "Azure Speech-nøgle ugyldig eller forkert ressource. Tjek AZURE_SPEECH_KEY i Render.",
      voiceErrorAzureQuota: "Azure afviste anmodning (kvote/politik). Tjek ressource i Azure Portal.",
      voiceErrorAzureRegion: "Region mismatch: AZURE_SPEECH_REGION skal matche Speech-ressourcens region.",
      voiceErrorRateLimit: "For mange forsøg. Vent lidt eller brug tekstchat.",
    },
    cs: {
      voiceErrorSpeechUnauthorized:
        "Hlas pro tuto doménu nelze ověřit. Použijte produkční web nebo textový chat.",
      voiceErrorSpeechNotConfigured: "Hlasová služba není nakonfigurována. Zkuste textový chat.",
      voiceErrorSpeechAzure: "Rozpoznávání řeči je dočasně nedostupné. Použijte text nebo zkuste později.",
      voiceErrorAzureKey:
        "Klíč Azure Speech je neplatný nebo nepatří k této prostředku. Zkontrolujte AZURE_SPEECH_KEY v Render.",
      voiceErrorAzureQuota: "Azure žádost zamítnuta (kvóta nebo zásady). Zkontrolujte prostředek v Azure Portal.",
      voiceErrorAzureRegion: "Neshoda regionu: AZURE_SPEECH_REGION musí odpovídat regionu Speech prostředku.",
      voiceErrorRateLimit: "Příliš mnoho pokusů. Počkejte nebo použijte textový chat.",
    },
    ro: {
      voiceErrorSpeechUnauthorized:
        "Vocea nu poate fi verificată pentru acest domeniu. Folosiți site-ul de producție sau chat text.",
      voiceErrorSpeechNotConfigured: "Serviciul vocal nu este configurat. Încercați chat text sau mai târziu.",
      voiceErrorSpeechAzure: "Recunoașterea vocală este temporar indisponibilă. Folosiți chat text sau reîncercați.",
      voiceErrorAzureKey:
        "Cheia Azure Speech este invalidă sau nu este pentru această resursă. Verificați AZURE_SPEECH_KEY în Render.",
      voiceErrorAzureQuota: "Cerere respinsă de Azure (cotă sau politică). Verificați resursa în Azure Portal.",
      voiceErrorAzureRegion: "Regiune incorectă: AZURE_SPEECH_REGION trebuie să coincidă cu regiunea resursei Speech.",
      voiceErrorRateLimit: "Prea multe încercări. Așteptați sau folosiți chat text.",
    },
    nl: {
      voiceErrorSpeechUnauthorized:
        "Stem kan voor dit adres niet worden geverifieerd. Gebruik de productiesite of tekstchat.",
      voiceErrorSpeechNotConfigured: "Stemdienst is niet geconfigureerd. Probeer tekstchat of later opnieuw.",
      voiceErrorSpeechAzure: "Spraakherkenning is tijdelijk niet beschikbaar. Gebruik tekstchat of probeer later.",
      voiceErrorAzureKey:
        "Azure Speech-sleutel ongeldig of niet voor deze resource. Controleer AZURE_SPEECH_KEY in Render.",
      voiceErrorAzureQuota: "Azure weigerde het verzoek (quota of beleid). Controleer de resource in Azure Portal.",
      voiceErrorAzureRegion: "Regio komt niet overeen: AZURE_SPEECH_REGION moet die van de Speech-resource zijn.",
      voiceErrorRateLimit: "Te veel pogingen. Wacht even of gebruik tekstchat.",
    },
    sk: {
      voiceErrorSpeechUnauthorized:
        "Hlas sa pre túto doménu nepodarilo overiť. Použite produkčnú stránku alebo textový chat.",
      voiceErrorSpeechNotConfigured: "Hlasová služba nie je nakonfigurovaná. Skúste textový chat.",
      voiceErrorSpeechAzure: "Rozpoznávanie reči je dočasne nedostupné. Použite text alebo skúste neskôr.",
      voiceErrorAzureKey:
        "Kľúč Azure Speech je neplatný alebo nie je pre tento zdroj. Skontrolujte AZURE_SPEECH_KEY v Render.",
      voiceErrorAzureQuota: "Azure odmietol požiadavku (kvóta alebo pravidlá). Skontrolujte zdroj v Azure Portáli.",
      voiceErrorAzureRegion: "Nezhoda regiónu: AZURE_SPEECH_REGION musí zodpovedať regiónu Speech zdroja.",
      voiceErrorRateLimit: "Príliš veľa pokusov. Počkajte alebo použite textový chat.",
    },
  };
  Object.keys(VOICE_ERROR_EXTRA).forEach(function (c) {
    if (PATCH[c]) Object.assign(PATCH[c], VOICE_ERROR_EXTRA[c]);
  });

  window.VIONA_LANG.EXTRA.forEach(function (code) {
    var p = PATCH[code];
    I18N[code] = Object.assign({}, E, p || {});
  });
})();
