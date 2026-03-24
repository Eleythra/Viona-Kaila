import express from "express";
import cors from "cors";
import OpenAI from "openai";
import { getEnv } from "./config/env.js";
import guestRequestsRouter from "./modules/guest-requests/guest-requests.router.js";
import surveysRouter from "./modules/surveys/surveys.router.js";
import adminRouter from "./modules/admin/admin.router.js";

const env = getEnv();

const app = express();

app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: env.openAiApiKey,
});

const VECTOR_STORE_ID = env.openAiVectorStoreId;
const MODEL = env.openAiModel;
const INCLUDE_FILE_RESULTS = env.chatDebug;

const TEXTS = {
  tr: {
    greeting:
      "Merhaba, ben Viona. Kaila Beach Hotel'deki tatilinizi daha keyifli hale getirmek icin buradayim; size hemen yardimci olayim.",
    checkout: "Check-out saati en geç 12:00'dır.",
    checkin: "Check-in saati 14:00'tür.",
    wifi: "Wi-Fi hem odalarda hem genel alanlarda ücretsizdir.",
    fallback:
      "Bu konuda elimde doğrulanmış bilgi bulunmuyor. En doğru bilgi için lütfen resepsiyonla iletişime geçin.",
    responseLangRule: "Her zaman Türkçe cevap ver.",
    wellbeing: "Cok iyiyim, tesekkur ederim. Kaila Beach Hotel ile ilgili neye ihtiyaciniz varsa memnuniyetle yardimci olurum.",
  },
  en: {
    greeting:
      "Hello, I am Viona. I am here to make your Kaila Beach Hotel stay easier and more enjoyable.",
    checkout: "Check-out time is 12:00 at the latest.",
    checkin: "Check-in time is 14:00.",
    wifi: "Wi-Fi is free in both rooms and common areas.",
    fallback:
      "I do not have verified information on this topic. Please contact reception for the most accurate information.",
    responseLangRule: "Always reply in English.",
    wellbeing: "I am doing great, thank you. I am here if you need anything about Kaila Beach Hotel.",
  },
  de: {
    greeting:
      "Hallo, ich bin Viona. Ich bin hier, um Ihren Aufenthalt im Kaila Beach Hotel einfacher und angenehmer zu machen.",
    checkout: "Die Check-out-Zeit ist spaetestens 12:00 Uhr.",
    checkin: "Die Check-in-Zeit ist 14:00 Uhr.",
    wifi: "WLAN ist in Zimmern und Gemeinschaftsbereichen kostenlos.",
    fallback:
      "Dazu liegen mir keine verifizierten Informationen vor. Bitte wenden Sie sich fuer die genaueste Auskunft an die Rezeption.",
    responseLangRule: "Antworte immer auf Deutsch.",
    wellbeing: "Mir geht es sehr gut, danke. Wenn Sie etwas zum Kaila Beach Hotel brauchen, helfe ich Ihnen gern.",
  },
  ru: {
    greeting:
      "Здравствуйте, я Viona. Я здесь, чтобы сделать ваш отдых в Kaila Beach Hotel более комфортным и приятным.",
    checkout: "Время выезда не позднее 12:00.",
    checkin: "Время заезда с 14:00.",
    wifi: "Wi-Fi бесплатный и в номерах, и в общих зонах.",
    fallback:
      "У меня нет подтвержденной информации по этому вопросу. Для наиболее точной информации обратитесь на ресепшн.",
    responseLangRule: "Всегда отвечай на русском языке.",
    wellbeing: "Спасибо, у меня все отлично. С радостью помогу вам по любым вопросам о Kaila Beach Hotel.",
  },
};

function resolveLocale(locale = "") {
  const v = String(locale || "").toLowerCase().trim();
  if (v === "en" || v === "de" || v === "ru") return v;
  return "tr";
}

function isGreeting(text = "") {
  const t = text.toLowerCase().trim();

  const greetings = [
    "selam",
    "merhaba",
    "merhabalar",
    "günaydın",
    "iyi günler",
    "iyi akşamlar",
    "selamlar",
    "sa",
    "hi",
    "hello",
    "hallo",
    "servus",
    "привет",
    "здравствуйте"
  ];

  return greetings.some((g) => t === g || t.startsWith(g + " "));
}

function isWellbeing(text = "") {
  const t = text.toLowerCase().trim();
  const words = [
    "naber",
    "nabere",
    "nasılsın",
    "nasilsin",
    "how are you",
    "how are u",
    "wie geht",
    "wie gehts",
    "wie geht's",
    "как дела",
  ];
  return words.some((w) => t === w || t.includes(w));
}

function getHardcodedAnswer(text = "", locale = "tr") {
  const t = String(text || "").toLowerCase().trim();
  const lang = resolveLocale(locale);

  const answers = {
    tr: {
      restaurant:
        "Restoran saatleri:\nKaila Beach Hotel restoran ve yeme icme birimlerinin saatleri su sekildedir:\n- Ana Restoran: Kahvalti 07:00-10:00, Gec kahvalti 10:00-10:30, Ogle yemegi 12:30-14:00, Aksam yemegi 19:00-21:00, Mini gece bufesi 23:30-00:00\n- Sinton BBQ Restaurant (a la carte): 13:00-22:00, Pazartesi kapali\n- La Terrace A La Carte Restaurant: 18:45-21:00\n- Mare Restaurant (a la carte, balik): rezervasyonlu\n- Dolphin Snack: 12:00-16:00\n- Beach Imbiss: 12:00-16:00, Icecek servisi 10:00-17:00\n- Gusto Snack: 11:00-18:00\n- Libum Cafe: 11:00-16:30\n- Moss Bar ve Snack Restoran: 10:00-19:00\nBarlar:\n- Havuz Bar: 10:00-00:00\n- Lobby Bar: 10:00-00:00\n- Aqua Bar: 10:00-18:00 ve 20:00-23:00\n- Dolphin Bar: 10:00-17:00",
      pool:
        "Havuz ve plaj:\nKaila Beach Hotel'de ozel plaj bulunmaktadir; plajda sezlong, semsiye ve plaj havlusu ucretsizdir, plaj kullanim saatleri 08:30-19:00 arasindadir. Havuz olarak ise acik havuzlardan Relax Pool (08:00-19:00), aquapark (10:00-12:00 ve 14:00-16:00) ve Dolphin Pool (10:00-12:00 ve 14:00-16:00) ile kapali havuz (08:00-19:00) mevcuttur.",
      spa:
        "Spa ve wellness:\nKaila Beach Hotel'de La Serenite Spa adiyla bir spa alani bulunmaktadir; 08:30-19:00 saatleri arasinda acik olup, sauna, Turk hamami, buhar odasi ve kapali havuz ucretsiz; masaj, peeling, cilt bakimi gibi profesyonel bakim hizmetleri ise ucretlidir.",
      animation:
        "Animasyon ve etkinlikler:\nKaila Beach Hotel'de animasyon ve etkinlikler aksam programlarinda duzenlenir; akrobatik dans sovlari, temali geceler, canli muzik, DJ performanslari ve animasyon etkinlikleri yer alabilir. Ayrica cocuklar icin Mini Club (10:00-12:30, 14:30-17:00) ve Mini Disco (20:45-21:30) ucretsiz olarak sunulmaktadir.",
    },
    en: {
      restaurant:
        "Restaurant hours:\nThe restaurant and food service hours at Kaila Beach Hotel are as follows:\n- Main Restaurant: Breakfast 07:00-10:00, Late breakfast 10:00-10:30, Lunch 12:30-14:00, Dinner 19:00-21:00, Mini night buffet 23:30-00:00\n- Sinton BBQ Restaurant (a la carte): 13:00-22:00, closed on Mondays\n- La Terrace A La Carte Restaurant: 18:45-21:00\n- Mare Restaurant (a la carte, fish): reservation required\n- Dolphin Snack: 12:00-16:00\n- Beach Imbiss: 12:00-16:00, Drink service 10:00-17:00\n- Gusto Snack: 11:00-18:00\n- Libum Cafe: 11:00-16:30\n- Moss Bar and Snack Restaurant: 10:00-19:00\nBars:\n- Pool Bar: 10:00-00:00\n- Lobby Bar: 10:00-00:00\n- Aqua Bar: 10:00-18:00 and 20:00-23:00\n- Dolphin Bar: 10:00-17:00",
      pool:
        "Pool and beach:\nKaila Beach Hotel has a private beach; sunbeds, umbrellas, and beach towels are free of charge. Beach use hours are between 08:30 and 19:00. Pool options include Relax Pool (08:00-19:00), aquapark (10:00-12:00 and 14:00-16:00), Dolphin Pool (10:00-12:00 and 14:00-16:00), and an indoor pool (08:00-19:00).",
      spa:
        "Spa and wellness:\nKaila Beach Hotel offers a spa area called La Serenite Spa, open between 08:30 and 19:00. Sauna, Turkish bath, steam room, and indoor pool are free of charge; professional care services such as massage, peeling, and skin care are paid.",
      animation:
        "Animation and events:\nAt Kaila Beach Hotel, animation and events are organized in evening programs; acrobatic dance shows, themed nights, live music, DJ performances, and animation activities may take place. In addition, Mini Club (10:00-12:30, 14:30-17:00) and Mini Disco (20:45-21:30) are offered free of charge for children.",
    },
    de: {
      restaurant:
        "Restaurantzeiten:\nDie Oeffnungszeiten der Restaurants und Verpflegungsbereiche im Kaila Beach Hotel sind wie folgt:\n- Hauptrestaurant: Fruehstueck 07:00-10:00, Spaetfruehstueck 10:00-10:30, Mittagessen 12:30-14:00, Abendessen 19:00-21:00, Mini-Nachtbuffet 23:30-00:00\n- Sinton BBQ Restaurant (a la carte): 13:00-22:00, montags geschlossen\n- La Terrace A La Carte Restaurant: 18:45-21:00\n- Mare Restaurant (a la carte, Fisch): mit Reservierung\n- Dolphin Snack: 12:00-16:00\n- Beach Imbiss: 12:00-16:00, Getraenkeservice 10:00-17:00\n- Gusto Snack: 11:00-18:00\n- Libum Cafe: 11:00-16:30\n- Moss Bar und Snack-Restaurant: 10:00-19:00\nBars:\n- Pool Bar: 10:00-00:00\n- Lobby Bar: 10:00-00:00\n- Aqua Bar: 10:00-18:00 und 20:00-23:00\n- Dolphin Bar: 10:00-17:00",
      pool:
        "Pool und Strand:\nDas Kaila Beach Hotel verfuegt ueber einen privaten Strand. Liegen, Sonnenschirme und Strandhandtuecher sind kostenlos; die Strandnutzung ist zwischen 08:30 und 19:00 moeglich. Zu den Pools gehoeren Relax Pool (08:00-19:00), Aquapark (10:00-12:00 und 14:00-16:00), Dolphin Pool (10:00-12:00 und 14:00-16:00) sowie ein Hallenbad (08:00-19:00).",
      spa:
        "Spa und Wellness:\nIm Kaila Beach Hotel gibt es den Spa-Bereich La Serenite Spa, geoeffnet von 08:30 bis 19:00 Uhr. Sauna, Tuerkisches Bad, Dampfbad und Hallenbad sind kostenlos; professionelle Anwendungen wie Massage, Peeling und Hautpflege sind kostenpflichtig.",
      animation:
        "Animation und Veranstaltungen:\nIm Kaila Beach Hotel werden Animation und Veranstaltungen im Abendprogramm organisiert; akrobatische Tanzshows, Themenabende, Live-Musik, DJ-Auftritte und Animationsaktivitaeten sind moeglich. Fuer Kinder werden zusaetzlich Mini Club (10:00-12:30, 14:30-17:00) und Mini Disco (20:45-21:30) kostenlos angeboten.",
    },
    ru: {
      restaurant:
        "Часы работы ресторанов:\nЧасы работы ресторанов и точек питания в Kaila Beach Hotel:\n- Основной ресторан: завтрак 07:00-10:00, поздний завтрак 10:00-10:30, обед 12:30-14:00, ужин 19:00-21:00, мини-ночной буфет 23:30-00:00\n- Sinton BBQ Restaurant (a la carte): 13:00-22:00, по понедельникам закрыт\n- La Terrace A La Carte Restaurant: 18:45-21:00\n- Mare Restaurant (a la carte, рыбный): по предварительной записи\n- Dolphin Snack: 12:00-16:00\n- Beach Imbiss: 12:00-16:00, напитки 10:00-17:00\n- Gusto Snack: 11:00-18:00\n- Libum Cafe: 11:00-16:30\n- Moss Bar и Snack Restaurant: 10:00-19:00\nБары:\n- Pool Bar: 10:00-00:00\n- Lobby Bar: 10:00-00:00\n- Aqua Bar: 10:00-18:00 и 20:00-23:00\n- Dolphin Bar: 10:00-17:00",
      pool:
        "Бассейн и пляж:\nВ Kaila Beach Hotel есть собственный пляж; шезлонги, зонты и пляжные полотенца предоставляются бесплатно. Время использования пляжа: 08:30-19:00. По бассейнам доступны Relax Pool (08:00-19:00), аквапарк (10:00-12:00 и 14:00-16:00), Dolphin Pool (10:00-12:00 и 14:00-16:00), а также крытый бассейн (08:00-19:00).",
      spa:
        "Спа и wellness:\nВ Kaila Beach Hotel работает спа-зона La Serenite Spa с 08:30 до 19:00. Сауна, турецкий хаммам, паровая комната и крытый бассейн бесплатны; профессиональные услуги, такие как массаж, пилинг и уход за кожей, предоставляются за дополнительную плату.",
      animation:
        "Анимация и мероприятия:\nВ Kaila Beach Hotel анимация и мероприятия проходят в вечерних программах; возможны акробатические танцевальные шоу, тематические вечера, живая музыка, DJ-выступления и анимационные активности. Для детей также бесплатно доступны Mini Club (10:00-12:30, 14:30-17:00) и Mini Disco (20:45-21:30).",
    },
  };

  const map = answers[lang] || answers.tr;

  if (
    t.includes("restoran saatleri") ||
    t.includes("restaurant hours") ||
    t.includes("restaurantzeiten") ||
    t.includes("часы ресторанов")
  ) return map.restaurant;

  if (
    t.includes("havuz ve plaj") ||
    t.includes("pool & beach") ||
    t.includes("pool and beach") ||
    t.includes("pool strand") ||
    t.includes("бассейн и пляж")
  ) return map.pool;

  if (
    t.includes("spa ve wellness") ||
    t.includes("spa & wellness") ||
    t.includes("spa wellness") ||
    t.includes("спа")
  ) return map.spa;

  if (
    t.includes("animasyon ve etkinlikler") ||
    t.includes("animation & events") ||
    t.includes("animation and events") ||
    t.includes("animation veranstaltungen") ||
    t.includes("анимация и мероприятия")
  ) return map.animation;

  return null;
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    hasApiKey: !!env.openAiApiKey,
    hasVectorStoreId: !!VECTOR_STORE_ID,
    hasSupabase: !!env.supabaseUrl && !!env.supabaseServiceRoleKey,
  });
});

app.use("/api/guest-requests", guestRequestsRouter);
app.use("/api/surveys", surveysRouter);
app.use("/api/admin", adminRouter);

app.post("/api/chat", async (req, res) => {
  try {
    const message = req.body.message?.trim();
    const locale = resolveLocale(req.body?.locale);
    const lang = TEXTS[locale];

    if (!message) {
      return res.status(400).json({
        reply: "Mesaj boş olamaz."
      });
    }

    if (isGreeting(message)) {
      return res.json({
        reply: lang.greeting
      });
    }

    if (isWellbeing(message)) {
      return res.json({
        reply: lang.wellbeing
      });
    }

    const hardcoded = getHardcodedAnswer(message, locale);
    if (hardcoded) {
      return res.json({ reply: hardcoded });
    }

    const response = await client.responses.create({
      model: MODEL,
      input: message,
      instructions: `
Sen Viona'sın. Kaila Beach Hotel için geliştirilmiş bir sanal asistansın.
${lang.responseLangRule}

Kurallar:
- Yalnızca vector store içindeki Kaila Beach Hotel bilgi dosyasına dayanarak cevap ver.
- Bilgi dosyada açıkça varsa kısa ve net cevap ver.
- Bilgi yoksa şu cevabı ver:
"${lang.fallback}"
- Asla bilgi uydurma.
- Çelişkili bilgi varsa kesin cevap verme; belirsizlik olduğunu söyle ve resepsiyondan teyit edilmesini öner.
- Cevabı mümkünse tek cümlede ver.
      `,
      tools: [
        {
          type: "file_search",
          vector_store_ids: [VECTOR_STORE_ID],
          max_num_results: 5
        }
      ],
      include: INCLUDE_FILE_RESULTS ? ["file_search_call.results"] : []
    });

    const reply =
      response.output_text ||
      lang.fallback;

    return res.json({ reply });
  } catch (error) {
    console.error("CHAT ERROR:", error);
    return res.status(500).json({
      reply: "Şu anda teknik bir sorun oluştu. Lütfen daha sonra tekrar deneyin.",
      error: error?.message || "unknown_error"
    });
  }
});

app.listen(env.port, () => {
  console.log(`Server running on http://localhost:${env.port}`);
});
