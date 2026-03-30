import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { getEnv } from "./config/env.js";
import guestRequestsRouter from "./modules/guest-requests/guest-requests.router.js";
import surveysRouter from "./modules/surveys/surveys.router.js";
import adminRouter from "./modules/admin/admin.router.js";
import { createSpeechRouter, createSttRawMiddleware, handleStt } from "./modules/speech/speech.router.js";
import { getSupabase, isSupabaseConfigured } from "./lib/supabase.js";

const env = getEnv();
const app = express();

const ASSISTANT_CHAT_ENDPOINT =
  process.env.ASSISTANT_CHAT_ENDPOINT || "http://127.0.0.1:8010/api/chat";

const SAFE_FALLBACK_BY_LANG = {
  tr: "Bu konuda doğrulanmış bilgiye şu anda erişemiyorum. Size en doğru destek için lütfen resepsiyon ile iletişime geçiniz.",
  en: "I do not have verified information on this right now. For the most accurate assistance, please contact reception.",
  de: "Ich kann dazu derzeit keine verifizierten Informationen bereitstellen. Bitte wenden Sie sich für die sicherste Auskunft an die Rezeption.",
  ru: "Сейчас у меня нет подтвержденной информации по этому вопросу. Для наиболее точной помощи, пожалуйста, обратитесь на ресепшн.",
};

const UPSTREAM_UNAVAILABLE_BY_LANG = {
  tr: "Şu anda asistana kısa süreli erişim sorunu yaşıyorum. Lütfen birkaç saniye sonra tekrar deneyiniz.",
  en: "I am temporarily unavailable at the moment. Please try again in a few seconds.",
  de: "Ich bin momentan kurzzeitig nicht erreichbar. Bitte versuchen Sie es in wenigen Sekunden erneut.",
  ru: "Сейчас я временно недоступна. Пожалуйста, попробуйте снова через несколько секунд.",
};

function normalizeLocale(value = "") {
  const v = String(value || "").toLowerCase().trim();
  return v === "en" || v === "de" || v === "ru" ? v : "tr";
}

function safeFallback(locale = "tr", reason = "safe") {
  const lang = normalizeLocale(locale);
  const message =
    reason === "upstream_unavailable"
      ? UPSTREAM_UNAVAILABLE_BY_LANG[lang]
      : SAFE_FALLBACK_BY_LANG[lang];
  return {
    type: "fallback",
    message,
    meta: {
      intent: "unknown",
      confidence: 0.0,
      language: lang,
      ui_language: lang,
      source: "fallback",
      action: null,
    },
  };
}

function safeTimeoutMs(rawValue, fallback = 12000) {
  const n = Number(rawValue);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(60000, Math.max(3000, Math.round(n)));
}

function isValidAssistantPayload(data) {
  if (!data || typeof data !== "object") return false;
  if (typeof data.message !== "string" || !data.message.trim()) return false;
  if (!data.meta || typeof data.meta !== "object") return false;
  return true;
}

function domainForIntent(intent = "unknown") {
  const map = {
    recommendation: "recommendation",
    fault_report: "room_and_maintenance",
    complaint: "guest_relations",
    request: "frontdesk_and_operations",
    reservation: "frontdesk_and_operations",
    special_need: "allergy_and_diet",
    hotel_info: "general_information",
    chitchat: "social",
    current_time: "general_information",
    unknown: "general_information",
  };
  return map[String(intent || "unknown")] || "general_information";
}

function routeTargetForResponse(data) {
  const target = data?.meta?.action?.target_department;
  if (target === "reception" || target === "guest_relations") return target;
  const intent = String(data?.meta?.intent || "unknown");
  if (intent === "fault_report" || intent === "request" || intent === "reservation") return "reception";
  if (intent === "complaint" || intent === "special_need") return "guest_relations";
  return "none";
}

function guessMultiIntent(message = "") {
  const t = String(message || "").toLowerCase();
  return /\s(ama|ayrıca|ayrica|fakat|but|also)\s/.test(t);
}

function normalizeOrigin(value = "") {
  const s = String(value || "").trim().replace(/\/+$/, "");
  if (!s) return "";
  return s.toLowerCase();
}

/** Ortamdan gelen origin’ler + yerel/statik test için sabitler (birleşim).
 * CORS_ALLOWED_ORIGINS dolu olsa bile önceden sadece boşken localhost ekleniyordu;
 * bu yüzden .env’de yalnızca üretim domain’leri varken lokal 5500 reddediliyordu. */
const corsAllowlist = new Set(
  (env.corsAllowedOrigins || []).map((x) => normalizeOrigin(x)).filter(Boolean),
);
[
  "https://viona-kaila.onrender.com",
  "https://viona-node-api.onrender.com",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://127.0.0.1:3000",
]
  .map(normalizeOrigin)
  .forEach((x) => corsAllowlist.add(x));

function isAllowedOrigin(origin = "") {
  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;
  if (corsAllowlist.has(normalized)) return true;
  return false;
}

/** Supabase chat_observations.chat_obs_response_type_chk */
const CHAT_OBS_RESPONSE_TYPES = new Set(["answer", "redirect", "inform", "fallback"]);
/** Supabase chat_observations.chat_obs_layer_used_chk */
const CHAT_OBS_LAYER_USED = new Set(["rule", "rag", "llm", "fallback"]);

function normalizeChatObsResponseType(type) {
  const s = String(type || "").toLowerCase().trim();
  if (CHAT_OBS_RESPONSE_TYPES.has(s)) return s;
  if (s === "error" || s === "exception") return "fallback";
  return "inform";
}

function normalizeChatObsLayerUsed(source) {
  const s = String(source || "").toLowerCase().trim();
  if (CHAT_OBS_LAYER_USED.has(s)) return s;
  if (s === "openai" || s === "assistant" || s === "upstream" || s === "proxy" || s === "llm_pipeline") {
    return "llm";
  }
  return null;
}

/** numeric(5,4): en fazla 9.9999 */
function normalizeChatObsConfidence(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(9.9999, Math.max(0, n));
}

async function writeChatObservation({
  sessionId,
  userId,
  message,
  uiLanguage,
  response,
  fallbackReason,
  decisionPath,
}) {
  try {
    if (!isSupabaseConfigured()) return;
    const userMessage = String(message || "").trim();
    if (!userMessage) return;

    const intent = String(response?.meta?.intent || "unknown");
    const responseType = normalizeChatObsResponseType(response?.type);
    const layerUsed = normalizeChatObsLayerUsed(response?.meta?.source);
    const action = response?.meta?.action || null;
    const recommendationMade = intent === "recommendation" || action?.kind === "suggest_venue";
    const routeTarget = routeTargetForResponse(response);
    const routeValue = routeTarget === "none" ? null : routeTarget;

    const row = {
      session_id: sessionId || null,
      user_id: userId || null,
      user_message: userMessage,
      ui_language: uiLanguage || null,
      detected_language: response?.meta?.language || null,
      intent,
      domain: domainForIntent(intent),
      sub_intent: action?.sub_intent || null,
      entity: action?.entity || null,
      confidence: normalizeChatObsConfidence(response?.meta?.confidence),
      multi_intent:
        typeof response?.meta?.multi_intent === "boolean"
          ? response.meta.multi_intent
          : guessMultiIntent(userMessage),
      response_type: responseType,
      route_target: routeValue,
      recommendation_made: Boolean(recommendationMade),
      layer_used: layerUsed,
      fallback_reason: fallbackReason || null,
      decision_path: decisionPath || null,
      assistant_response: String(response?.message || "").trim() || " ",
      raw_payload: {
        message: userMessage,
        response,
      },
    };
    await getSupabase().from("chat_observations").insert(row);
  } catch (err) {
    console.warn("chat_observation_write_failed error=%s", err?.message || err);
  }
}

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  }),
);

app.use(
  cors({
    origin(origin, callback) {
      // Server-to-server / curl / health-check requests may have no Origin.
      if (!origin) return callback(null, true);
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error("cors_not_allowed"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Admin-Token"],
    credentials: false,
  }),
);

app.use(
  "/api",
  rateLimit({
    windowMs: env.rateLimitWindowMs,
    max: env.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.use(
  "/api/admin",
  rateLimit({
    windowMs: env.rateLimitWindowMs,
    max: env.adminRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "viona-node-api",
    adminAuthConfigured: Boolean(env.adminApiToken),
    hasSupabase: env.hasSupabase,
  });
});

app.use("/api/guest-requests", guestRequestsRouter);
app.use("/api/surveys", surveysRouter);
app.use("/api/admin", adminRouter);
app.use("/api", createSpeechRouter());
app.post("/api/stt", createSttRawMiddleware(), handleStt);

// Single chatbot entrypoint: proxy only, no business logic.
app.post("/api/chat", async (req, res) => {
  const message = String(req.body?.message || "").trim();
  const locale = normalizeLocale(req.body?.locale);
  const uiLanguage = normalizeLocale(req.body?.ui_language || req.body?.locale);
  const userId = req.body?.user_id || null;
  const sessionId = req.body?.session_id || req.headers["x-session-id"] || userId || null;
  const rawConv = String(req.body?.conversation_language || "")
    .toLowerCase()
    .trim();
  const conversationLanguage =
    rawConv === "en" || rawConv === "de" || rawConv === "ru" || rawConv === "tr"
      ? rawConv
      : null;

  if (!message) {
    const fb = safeFallback(locale, "validation_error");
    return res.status(200).json(fb);
  }

  const timeoutMs = safeTimeoutMs(process.env.ASSISTANT_TIMEOUT_MS, 12000);
  try {
    const payload = {
      message,
      locale,
      ui_language: uiLanguage,
      user_id: userId,
    };
    if (conversationLanguage) payload.conversation_language = conversationLanguage;
    const abortController = new AbortController();
    const timer = setTimeout(() => abortController.abort(), timeoutMs);
    const upstream = await fetch(ASSISTANT_CHAT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: abortController.signal,
    });
    clearTimeout(timer);

    if (!upstream.ok) {
      console.warn("chat_proxy_fallback proxy_reason=upstream_http_error status=%s", upstream.status);
      const fb = safeFallback(locale, "upstream_unavailable");
      await writeChatObservation({
        sessionId,
        userId,
        message,
        uiLanguage,
        response: fb,
        fallbackReason: "upstream_http_error",
        decisionPath: "proxy:upstream_http_error",
      });
      return res.status(200).json(fb);
    }

    let data = null;
    try {
      data = await upstream.json();
    } catch (_err) {
      console.warn("chat_proxy_fallback proxy_reason=upstream_non_json");
      const fb = safeFallback(locale, "upstream_unavailable");
      await writeChatObservation({
        sessionId,
        userId,
        message,
        uiLanguage,
        response: fb,
        fallbackReason: "upstream_non_json",
        decisionPath: "proxy:upstream_non_json",
      });
      return res.status(200).json(fb);
    }
    if (!isValidAssistantPayload(data)) {
      console.warn("chat_proxy_fallback proxy_reason=upstream_invalid_payload");
      const fb = safeFallback(locale, "upstream_unavailable");
      await writeChatObservation({
        sessionId,
        userId,
        message,
        uiLanguage,
        response: fb,
        fallbackReason: "upstream_invalid_payload",
        decisionPath: "proxy:upstream_invalid_payload",
      });
      return res.status(200).json(fb);
    }
    await writeChatObservation({
      sessionId,
      userId,
      message,
      uiLanguage,
      response: data,
      fallbackReason: null,
      decisionPath: `proxy:${String(data?.meta?.source || "unknown")}`,
    });
    return res.status(200).json(data);
  } catch (error) {
    const isAbort = error?.name === "AbortError";
    const proxyReason = isAbort ? "upstream_timeout" : "upstream_network_error";
    console.error("chat_proxy_fallback proxy_reason=%s error=%s", proxyReason, error?.message || error);
    const fb = safeFallback(locale, "upstream_unavailable");
    await writeChatObservation({
      sessionId,
      userId,
      message,
      uiLanguage,
      response: fb,
      fallbackReason: proxyReason,
      decisionPath: `proxy:${proxyReason}`,
    });
    return res.status(200).json(fb);
  }
});

app.use((err, _req, res, next) => {
  if (err && err.message === "cors_not_allowed") {
    return res.status(403).json({ ok: false, error: "cors_not_allowed" });
  }
  return next(err);
});

app.listen(env.port, () => {
  console.log(`Server running on http://localhost:${env.port}`);
});
