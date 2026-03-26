import express from "express";
import cors from "cors";
import { getEnv } from "./config/env.js";
import guestRequestsRouter from "./modules/guest-requests/guest-requests.router.js";
import surveysRouter from "./modules/surveys/surveys.router.js";
import adminRouter from "./modules/admin/admin.router.js";

const env = getEnv();
const app = express();

const ASSISTANT_CHAT_ENDPOINT =
  process.env.ASSISTANT_CHAT_ENDPOINT || "http://127.0.0.1:8010/api/chat";

const SAFE_FALLBACK_BY_LANG = {
  tr: "Bu konuda doğrulanmış bilgiye erişemiyorum. Lütfen resepsiyon ile iletişime geçiniz.",
  en: "I don't have verified information about this. Please contact reception for assistance.",
  de: "Dazu liegen mir keine verifizierten Informationen vor. Bitte wenden Sie sich an die Rezeption.",
  ru: "У меня нет проверенной информации по этому вопросу. Пожалуйста, обратитесь на ресепшн.",
};

function normalizeLocale(value = "") {
  const v = String(value || "").toLowerCase().trim();
  return v === "en" || v === "de" || v === "ru" ? v : "tr";
}

function safeFallback(locale = "tr") {
  const lang = normalizeLocale(locale);
  return {
    type: "fallback",
    message: SAFE_FALLBACK_BY_LANG[lang],
    meta: {
      intent: "unknown",
      confidence: 0.0,
      language: lang,
      ui_language: lang,
      source: "fallback",
    },
  };
}

app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    hasApiKey: !!env.openAiApiKey,
    hasVectorStoreId: !!env.openAiVectorStoreId,
    hasSupabase: !!env.supabaseUrl && !!env.supabaseServiceRoleKey,
    assistantEndpoint: ASSISTANT_CHAT_ENDPOINT,
  });
});

app.use("/api/guest-requests", guestRequestsRouter);
app.use("/api/surveys", surveysRouter);
app.use("/api/admin", adminRouter);

// Single chatbot entrypoint: proxy only, no business logic.
app.post("/api/chat", async (req, res) => {
  const message = String(req.body?.message || "").trim();
  const locale = normalizeLocale(req.body?.locale);
  const uiLanguage = normalizeLocale(req.body?.ui_language || req.body?.locale);
  const userId = req.body?.user_id || null;
  const rawConv = String(req.body?.conversation_language || "")
    .toLowerCase()
    .trim();
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
      user_id: userId,
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
    console.error("ASSISTANT PROXY ERROR:", error?.message || error);
    return res.status(200).json(safeFallback(locale));
  }
});

app.listen(env.port, () => {
  console.log(`Server running on http://localhost:${env.port}`);
});
