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
      "Merhaba, ben Viona. Kaila Beach Hotel için geliştirilen sanal asistanım. Size nasıl yardımcı olabilirim?",
    checkout: "Check-out saati en geç 12:00'dır.",
    checkin: "Check-in saati 14:00'tür.",
    wifi: "Wi-Fi hem odalarda hem genel alanlarda ücretsizdir.",
    fallback:
      "Bu konuda elimde doğrulanmış bilgi bulunmuyor. En doğru bilgi için lütfen resepsiyonla iletişime geçin.",
    responseLangRule: "Her zaman Türkçe cevap ver.",
    wellbeing: "Merhaba! Kaila Beach Hotel ile ilgili bir sorunuz varsa yardımcı olabilirim.",
  },
  en: {
    greeting:
      "Hello, I am Viona, the virtual assistant for Kaila Beach Hotel. How can I help you?",
    checkout: "Check-out time is 12:00 at the latest.",
    checkin: "Check-in time is 14:00.",
    wifi: "Wi-Fi is free in both rooms and common areas.",
    fallback:
      "I do not have verified information on this topic. Please contact reception for the most accurate information.",
    responseLangRule: "Always reply in English.",
    wellbeing: "Hello! If you have a question about Kaila Beach Hotel, I can help you.",
  },
  de: {
    greeting:
      "Hallo, ich bin Viona, die virtuelle Assistentin des Kaila Beach Hotels. Wie kann ich Ihnen helfen?",
    checkout: "Die Check-out-Zeit ist spaetestens 12:00 Uhr.",
    checkin: "Die Check-in-Zeit ist 14:00 Uhr.",
    wifi: "WLAN ist in Zimmern und Gemeinschaftsbereichen kostenlos.",
    fallback:
      "Dazu liegen mir keine verifizierten Informationen vor. Bitte wenden Sie sich fuer die genaueste Auskunft an die Rezeption.",
    responseLangRule: "Antworte immer auf Deutsch.",
    wellbeing: "Hallo! Wenn Sie eine Frage zum Kaila Beach Hotel haben, helfe ich Ihnen gerne.",
  },
  ru: {
    greeting:
      "Здравствуйте, я Viona, виртуальный ассистент Kaila Beach Hotel. Чем могу помочь?",
    checkout: "Время выезда не позднее 12:00.",
    checkin: "Время заезда с 14:00.",
    wifi: "Wi-Fi бесплатный и в номерах, и в общих зонах.",
    fallback:
      "У меня нет подтвержденной информации по этому вопросу. Для наиболее точной информации обратитесь на ресепшн.",
    responseLangRule: "Всегда отвечай на русском языке.",
    wellbeing: "Здравствуйте! Если у вас есть вопрос о Kaila Beach Hotel, я с радостью помогу.",
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
  const t = text.toLowerCase();
  const lang = TEXTS[locale] || TEXTS.tr;

  if (
    t.includes("check out") ||
    t.includes("checkout") ||
    t.includes("check-out") ||
    t.includes("çıkış saati")
  ) {
    return lang.checkout;
  }

  if (
    t.includes("check in") ||
    t.includes("check-in") ||
    t.includes("giriş saati")
  ) {
    return lang.checkin;
  }

  if (
    t.includes("wifi") ||
    t.includes("wi-fi") ||
    t.includes("internet")
  ) {
    return lang.wifi;
  }

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
