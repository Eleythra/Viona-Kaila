import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const VECTOR_STORE_ID = process.env.OPENAI_VECTOR_STORE_ID;
const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const INCLUDE_FILE_RESULTS = process.env.CHAT_DEBUG === "1";

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
  };

  answers.en = answers.tr;
  answers.de = answers.tr;
  answers.ru = answers.tr;

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
    hasApiKey: !!process.env.OPENAI_API_KEY,
    hasVectorStoreId: !!VECTOR_STORE_ID
  });
});

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

app.listen(process.env.PORT || 3001, () => {
  console.log(`Server running on http://localhost:${process.env.PORT || 3001}`);
});
