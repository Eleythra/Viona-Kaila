const ASSISTANT_CHAT_ENDPOINT =
  process.env.ASSISTANT_CHAT_ENDPOINT || "http://127.0.0.1:8010/api/chat";

const SAFE_FALLBACK_BY_LANG = {
  tr: "Bu konuda doğrulanmış bilgiye erişemiyorum. Lütfen resepsiyon ile iletişime geçiniz.",
  en: "I don't have verified information about this. Please contact reception for assistance.",
  de: "Dazu liegen mir keine verifizierten Informationen vor. Bitte wenden Sie sich an die Rezeption.",
  ru: "У меня нет проверенной информации по этому вопросу. Пожалуйста, обратитесь на ресепшн.",
};

function normalizeLocale(value) {
  const v = String(value || "").toLowerCase().trim();
  return v === "en" || v === "de" || v === "ru" ? v : "tr";
}

function safeFallback(locale) {
  return {
    type: "fallback",
    message: SAFE_FALLBACK_BY_LANG[normalizeLocale(locale)],
    action: null,
    meta: {
      intent: "unknown",
      confidence: 0.0,
      language: normalizeLocale(locale),
      ui_language: normalizeLocale(locale),
      source: "fallback",
    },
  };
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

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST,OPTIONS");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST,OPTIONS");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const body = await parseBody(req);
  const message = String(body.message || "").trim();
  const locale = normalizeLocale(body.locale);
  const uiLanguage = normalizeLocale(body.ui_language || body.locale);
  const rawConv = String(body.conversation_language || "").toLowerCase().trim();
  const conversationLanguage =
    rawConv === "en" || rawConv === "de" || rawConv === "ru" || rawConv === "tr"
      ? rawConv
      : null;

  if (!message) {
    return res.status(200).json(safeFallback(locale));
  }

  try {
    const payload = {
      message,
      locale,
      ui_language: uiLanguage,
      user_id: body.user_id || null,
    };
    if (conversationLanguage) payload.conversation_language = conversationLanguage;
    const upstream = await fetch(ASSISTANT_CHAT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await upstream.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(200).json(safeFallback(locale));
  }
};
