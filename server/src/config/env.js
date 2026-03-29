import dotenv from "dotenv";

dotenv.config();

function optional(name, fallback = "") {
  const value = process.env[name];
  if (value === undefined || value === null || String(value).trim() === "") {
    return fallback;
  }
  return String(value).trim();
}

/** İlk dolu anahtarı kullanır (Render’da yanlış isimle eklenmiş değişkenler için). */
function optionalAny(names, fallback = "") {
  for (const name of names) {
    const v = optional(name, "");
    if (v) return v;
  }
  return fallback;
}

function optionalInt(name, fallback) {
  const raw = optional(name, String(fallback));
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

/** 0 = özellik kapalı; boş = varsayılan (ms). */
function optionalNonNegativeMs(name, fallbackMs) {
  const v = process.env[name];
  if (v === "0") return 0;
  if (v === undefined || v === null || String(v).trim() === "") return fallbackMs;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return fallbackMs;
  return Math.floor(n);
}

export function getEnv() {
  return {
    port: optionalInt("PORT", 3001),
    openAiApiKey: optional("OPENAI_API_KEY", ""),
    openAiVectorStoreId: optional("OPENAI_VECTOR_STORE_ID", ""),
    openAiModel: optional("OPENAI_MODEL", "gpt-4.1-mini"),
    /** PDF insight katmanı; boşsa AI devre dışı, deterministic metinler kullanılır. */
    geminiApiKey: optional("GEMINI_API_KEY", ""),
    geminiModel: optional("GEMINI_MODEL", "gemini-2.5-flash-lite"),
    /** PDF insight önbelleği (ms). 0 = önbellek yok (prompt değişince anında yeni metin). */
    geminiPdfCacheTtlMs: optionalNonNegativeMs("GEMINI_PDF_CACHE_TTL_MS", 5 * 60 * 1000),
    /** PDF kapak görseli; yoksa proje varsayılanları denenir. */
    reportHotelCoverPath: optional("REPORT_HOTEL_COVER_PATH", ""),
    reportBrandLogoPath: optional("REPORT_BRAND_LOGO_PATH", ""),
    /** Eski davranış (tüm zaman); artık kullanılmıyor — PDF/pano varsayılanı son 30 gündür. */
    reportPdfFullFrom: optional("REPORT_PDF_FULL_FROM", ""),
    chatDebug: optional("CHAT_DEBUG", "0") === "1",
    supabaseUrl: optional("SUPABASE_URL", ""),
    supabaseServiceRoleKey: optional("SUPABASE_SERVICE_ROLE_KEY", ""),
    get hasSupabase() {
      return Boolean(
        String(this.supabaseUrl || "").trim() && String(this.supabaseServiceRoleKey || "").trim(),
      );
    },
    /** Misafir arıza kaydı → Teknik Telegram grubu (boşsa bildirim atlanır). */
    telegramTeknikBotToken: optionalAny([
      "TELEGRAM_TEKNIK_BOT_TOKEN",
      "TELEGRAM_TECHNICAL_BOT_TOKEN",
    ]),
    telegramTeknikChatId: optionalAny([
      "TELEGRAM_TEKNIK_CHAT_ID",
      "TELEGRAM_TECHNICAL_CHAT_ID",
    ]),
    /** Misafir istek kaydı → HK Telegram grubu (boşsa bildirim atlanır). */
    telegramHkBotToken: optionalAny(["TELEGRAM_HK_BOT_TOKEN", "TELEGRAM_HOUSEKEEPING_BOT_TOKEN"]),
    telegramHkChatId: optionalAny(["TELEGRAM_HK_CHAT_ID", "TELEGRAM_HOUSEKEEPING_CHAT_ID"]),
    /** Azure Speech (TTS/STT) — yalnızca sunucu; boşsa /api/tts ve /api/stt 503 döner */
    azureSpeechKey: optional("AZURE_SPEECH_KEY", ""),
    azureSpeechRegion: optional("AZURE_SPEECH_REGION", "westeurope"),
    /** Azure REST çağrıları için ms; 0 = zaman sınırı yok (STT iki deneme yapabilir, süre ikiye katlanabilir). */
    azureSpeechFetchTimeoutMs: optionalNonNegativeMs("AZURE_SPEECH_FETCH_TIMEOUT_MS", 25_000),
  };
}
