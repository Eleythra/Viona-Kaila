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

function resolveLocale(locale) {
  const value = String(locale || "").toLowerCase().trim();
  if (value === "en" || value === "de" || value === "ru") return value;
  return "tr";
}

function isGreeting(text) {
  const t = String(text || "").toLowerCase().trim();
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
    "здравствуйте",
  ];
  return greetings.some((g) => t === g || t.startsWith(g + " "));
}

function isWellbeing(text) {
  const t = String(text || "").toLowerCase().trim();
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

function getHardcodedAnswer(text, locale) {
  const t = String(text || "").toLowerCase();
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

  if (t.includes("wifi") || t.includes("wi-fi") || t.includes("internet")) {
    return lang.wifi;
  }

  return null;
}

async function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body.trim()) {
    try {
      return JSON.parse(req.body);
    } catch (_err) {
      return {};
    }
  }
  return {};
}

function extractReplyFromResponse(data) {
  if (data && typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const output = data && Array.isArray(data.output) ? data.output : [];
  const parts = [];

  for (const item of output) {
    if (!item || item.type !== "message" || !Array.isArray(item.content)) continue;
    for (const contentItem of item.content) {
      if (contentItem && contentItem.type === "output_text" && typeof contentItem.text === "string") {
        const text = contentItem.text.trim();
        if (text) parts.push(text);
      }
    }
  }

  return parts.join("\n").trim();
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST,OPTIONS");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST,OPTIONS");
    return res.status(405).json({ reply: "Method not allowed." });
  }

  try {
    const body = await parseBody(req);
    const message = String(body.message || "").trim();
    const locale = resolveLocale(body.locale);
    const lang = TEXTS[locale];

    if (!message) {
      return res.status(400).json({ reply: "Mesaj boş olamaz." });
    }

    if (isGreeting(message)) {
      return res.status(200).json({ reply: lang.greeting });
    }

    if (isWellbeing(message)) {
      return res.status(200).json({ reply: lang.wellbeing });
    }

    const hardcoded = getHardcodedAnswer(message, locale);
    if (hardcoded) {
      return res.status(200).json({ reply: hardcoded });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;
    const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
    const includeFileResults = process.env.CHAT_DEBUG === "1";

    if (!apiKey || !vectorStoreId) {
      return res.status(500).json({
        reply: lang.fallback,
        error: "missing_openai_env",
      });
    }

    const openaiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
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
        `.trim(),
        tools: [
          {
            type: "file_search",
            vector_store_ids: [vectorStoreId],
            max_num_results: 5,
          },
        ],
        include: includeFileResults ? ["file_search_call.results"] : [],
      }),
    });

    console.log("[OPENAI STATUS]", openaiRes.status, openaiRes.statusText);
    const rawBody = await openaiRes.text();
    console.log("[OPENAI RESPONSE]", rawBody);

    let data = {};
    try {
      data = rawBody ? JSON.parse(rawBody) : {};
    } catch (parseError) {
      console.error("[OPENAI ERROR]", "response_parse_failed", parseError);
      data = {};
    }

    if (!openaiRes.ok) {
      console.error("[OPENAI ERROR]", {
        status: openaiRes.status,
        message: (data && (data.error?.message || data.message)) || "openai_request_failed",
      });
      const reply = lang.fallback;
      return res.status(200).json({ reply });
    }

    console.log("[OPENAI RESPONSE] output_text:", data ? data.output_text : undefined);
    console.log("[OPENAI RESPONSE] output:", data ? data.output : undefined);
    console.log("[OPENAI RESPONSE] error:", data ? data.error : undefined);

    const extractedReply = extractReplyFromResponse(data);
    const reply = extractedReply || lang.fallback;
    return res.status(200).json({ reply });
  } catch (error) {
    console.error("CHAT ERROR:", error);
    return res.status(500).json({
      reply: "Şu anda teknik bir sorun oluştu. Lütfen daha sonra tekrar deneyin.",
      error: error && error.message ? error.message : "unknown_error",
    });
  }
};
