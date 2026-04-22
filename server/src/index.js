/** Dotenv + process.env önce yüklensin (diğer modüllerden önce). */
import { getEnv, getEnvBootstrapDiagnostics } from "./config/env.js";
import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import guestRequestsRouter from "./modules/guest-requests/guest-requests.router.js";
import surveysRouter from "./modules/surveys/surveys.router.js";
import adminRouter from "./modules/admin/admin.router.js";
import opsLinkRouter from "./modules/ops-link/ops-link.router.js";
import {
  createSpeechRouter,
  createSttRawMiddleware,
  handleStt,
  speechClientAuthMiddleware,
} from "./modules/speech/speech.router.js";
import { getSupabase, isSupabaseConfigured, withSupabaseFetchGuard } from "./lib/supabase.js";
import { createGuestRequest } from "./modules/guest-requests/guest-requests.service.js";
import { normalizeVionaUiLanguage, VIONA_UI_LANGUAGE_CODES } from "./lib/viona-ui-languages.js";
import {
  buildWhatsappGraphMessagesUrl,
  getWhatsappOperationalHealthSummary,
  resolveWhatsappAccessToken,
} from "./services/whatsapp-operational-notification.service.js";
const env = getEnv();
const app = express();

const ASSISTANT_CHAT_ENDPOINT =
  process.env.ASSISTANT_CHAT_ENDPOINT || "http://127.0.0.1:8010/api/chat";

const SAFE_FALLBACK_BY_LANG = {
  tr: "Bu konuda doğrulanmış bilgiye şu anda erişemiyorum. Size en doğru destek için lütfen resepsiyon ile iletişime geçiniz.",
  en: "I do not have verified information on this right now. For the most accurate assistance, please contact reception.",
  de: "Ich kann dazu derzeit keine verifizierten Informationen bereitstellen. Bitte wenden Sie sich für die sicherste Auskunft an die Rezeption.",
  pl: "Nie mam teraz zweryfikowanych informacji na ten temat. Aby uzyskać najdokładniejszą pomoc, skontaktuj się z recepcją.",
};

const UPSTREAM_UNAVAILABLE_BY_LANG = {
  tr: "Şu anda asistana kısa süreli erişim sorunu yaşıyorum. Lütfen birkaç saniye sonra tekrar deneyiniz.",
  en: "I am temporarily unavailable at the moment. Please try again in a few seconds.",
  de: "Ich bin momentan kurzzeitig nicht erreichbar. Bitte versuchen Sie es in wenigen Sekunden erneut.",
  pl: "Chwilowo jestem niedostępna. Spróbuj ponownie za kilka sekund.",
};

const RESERVATION_REDIRECT_BY_LANG = {
  tr:
    "Konaklama ve özel masa düzenlemeleri için resepsiyon veya Misafir İlişkileri ekibimiz size yardımcı olur. Restoran saatleri, menüler ve bar bilgileri için aşağıdaki kısayola uygulamadaki «Restaurant & barlar» bölümünü açabilirsiniz.",
  en:
    "For your stay or special table arrangements, our reception or Guest Relations team can help. For restaurant hours, menus and bar information, use the shortcut below to open «Restaurants & bars» in the app.",
  de:
    "Für Ihren Aufenthalt oder besondere Tischwünsche helfen Ihnen Rezeption oder Guest Relations. Für Restaurantzeiten, Speisekarten und Barinfos öffnen Sie über die Schaltfläche unten «Restaurants & Bars» in der App.",
  pl:
    "W sprawie pobytu lub specjalnych stolików pomogą recepcja lub Guest Relations. Godziny, menu i bary — otwórz przyciskiem poniżej sekcję «Restauracje i bary» w aplikacji.",
};

function isReservationLikeMessage(msg = "") {
  const t = String(msg || "").toLowerCase();
  if (!t) return false;
  return (
    t.includes("rezervasyon") ||
    t.includes("rezrvasyon") ||
    t.includes("reservation") ||
    t.includes("a la carte") ||
    t.includes("alacarte")
  );
}

function normalizeLocale(value = "") {
  return normalizeVionaUiLanguage(value);
}

function pickChatLangMessage(map, lang) {
  const code = normalizeLocale(lang);
  return map[code] || map.en || map.tr;
}

function safeFallback(locale = "tr", reason = "safe", userMessage = "") {
  const lang = normalizeLocale(locale);
  const isReservationLike = isReservationLikeMessage(userMessage);

  // Konaklama / masa / restoran bağlamında: resepsiyon + MI yönlendirmesi ve Restaurant & barlar kısayolu (open_reservation_form istemci tarafında bu modüle map edilir).
  if (isReservationLike) {
    const text = pickChatLangMessage(RESERVATION_REDIRECT_BY_LANG, lang);
    return {
      type: "inform",
      message: text,
      meta: {
        intent: "reservation",
        confidence: 1.0,
        language: lang,
        ui_language: lang,
        source: "fallback",
        action: {
          kind: "open_reservation_form",
          sub_intent: null,
          entity: null,
        },
      },
    };
  }

  const message =
    reason === "upstream_unavailable"
      ? pickChatLangMessage(UPSTREAM_UNAVAILABLE_BY_LANG, lang)
      : pickChatLangMessage(SAFE_FALLBACK_BY_LANG, lang);
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
  /** Vercel / özel alan: doğrudan Render’a istek (proxy dışı veya eski istemci) */
  "https://viona.eleythra.com",
  "https://www.viona.eleythra.com",
  "https://viona-admin.eleythra.com",
  "https://www.viona-admin.eleythra.com",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://127.0.0.1:3000",
  /** Yerel statik sunucu: python -m http.server 8080 (Viona + /admin/) */
  "http://localhost:8080",
  "http://127.0.0.1:8080",
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
    await withSupabaseFetchGuard(() => getSupabase().from("chat_observations").insert(row));
  } catch (err) {
    console.warn("chat_observation_write_failed error=%s", err?.message || err);
  }
}


async function processCreateGuestRequestAction(data) {
  try {
    const action = data?.meta?.action;
    if (!action || action.kind !== "create_guest_request" || !action.payload) {
      return data;
    }
    const payload = {
      ...action.payload,
      // Chatbot kaynaklı kayıtları backend validasyonunda ayrıştırmak için.
      source: "viona_chat",
    };
    const result = await createGuestRequest(payload);
    if (data?.meta) {
      data.meta.action = {
        ...action,
        created_record: {
          id: String(result.id),
          bucket: result.bucket,
        },
      };
    }
    // Operasyon WhatsApp: createGuestRequest içinde türe göre (arıza/istek/şikâyet/misafir bildirimi/geç çıkış) tetiklenir.
    return data;
  } catch (err) {
    console.warn("chat_form_create_guest_request_failed error=%s", err?.message || err);
    return data;
  }
}

/** Meta X-Hub-Signature-256 = sha256(HMAC_SHA256(app_secret, raw_body)). req.body önce Buffer olmalı. */
function verifyWhatsappWebhookSignature(req, res, next) {
  const buf = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || [], "utf8");
  const secret = String(getEnv().whatsappAppSecret || "").trim();

  /* Sır yok: eski davranış (Meta çalışmaya devam eder). Sır varken sahte POST’lar reddedilir. */
  if (!secret) {
    try {
      req.body = buf.length ? JSON.parse(buf.toString("utf8")) : {};
    } catch {
      return res.status(400).json({ ok: false, error: "invalid_json" });
    }
    return next();
  }

  const sig = String(req.headers["x-hub-signature-256"] || "").trim();
  if (!sig.startsWith("sha256=")) {
    console.warn("whatsapp_webhook_rejected reason=bad_signature_header");
    return res.status(403).type("text/plain").send("invalid_signature");
  }
  const digest = crypto.createHmac("sha256", secret).update(buf).digest("hex");
  const expected = `sha256=${digest}`;
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    console.warn("whatsapp_webhook_rejected reason=signature_mismatch");
    return res.status(403).type("text/plain").send("invalid_signature");
  }
  try {
    req.body = buf.length ? JSON.parse(buf.toString("utf8")) : {};
  } catch {
    return res.status(400).json({ ok: false, error: "invalid_json" });
  }
  return next();
}

async function handleWhatsappWebhookPost(req, res) {
  try {
    const entry = Array.isArray(req.body?.entry) ? req.body.entry[0] : null;
    const change = entry && Array.isArray(entry.changes) ? entry.changes[0] : null;
    const value = change?.value || {};
    const messages = Array.isArray(value.messages) ? value.messages : [];
    if (!messages.length) {
      return res.status(200).json({ ok: true, skipped: "no_messages" });
    }
    const msg = messages[0];
    if (msg.type !== "text" || !msg.text?.body) {
      return res.status(200).json({ ok: true, skipped: "non_text_message" });
    }
    const from = msg.from;
    const text = String(msg.text.body || "").trim();
    const sessionId = from;

    const timeoutMs = safeTimeoutMs(process.env.ASSISTANT_TIMEOUT_MS, 12000);
    const payload = {
      message: text,
      locale: "tr",
      ui_language: "tr",
      user_id: from,
      session_id: sessionId,
      channel: "whatsapp",
    };
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
      console.warn(
        "whatsapp_chat_proxy_fallback proxy_reason=upstream_http_error status=%s",
        upstream.status,
      );
      return res.status(200).json({ ok: false, reason: "upstream_http_error" });
    }

    let data = null;
    try {
      data = await upstream.json();
    } catch (err) {
      console.warn("whatsapp_chat_proxy_fallback proxy_reason=upstream_non_json");
      return res.status(200).json({ ok: false, reason: "upstream_non_json" });
    }
    if (!isValidAssistantPayload(data)) {
      console.warn("whatsapp_chat_proxy_fallback proxy_reason=upstream_invalid_payload");
      return res.status(200).json({ ok: false, reason: "upstream_invalid_payload" });
    }

    await processCreateGuestRequestAction(data);

    try {
      const { token } = resolveWhatsappAccessToken();
      const graphUrl = buildWhatsappGraphMessagesUrl();
      if (token && graphUrl) {
        await fetch(graphUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: from,
            type: "text",
            text: { body: String(data?.message || "").trim() || " " },
          }),
        });
      } else {
        console.warn("whatsapp_reply_skipped reason=missing_token_or_phone_id");
      }
    } catch (sendErr) {
      console.warn("whatsapp_send_message_failed error=%s", sendErr?.message || sendErr);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("whatsapp_webhook_handler_failed error=%s", err?.message || err);
    return res.status(500).json({ ok: false, error: "internal_error" });
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
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Admin-Token",
      "X-Ops-Token",
      "X-Viona-Ops-Page",
      "X-Viona-Speech-Secret",
    ],
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

app.use(
  "/api/ops",
  rateLimit({
    windowMs: env.rateLimitWindowMs,
    max: Math.max(env.adminRateLimitMax, 120),
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

/** Ham gövde + imza; `express.json` önce olmamalı. */
app.post(
  "/api/webhooks/whatsapp",
  express.raw({ limit: "6mb" }),
  verifyWhatsappWebhookSignature,
  handleWhatsappWebhookPost,
);

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

const speechLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: Math.min(60, Math.max(24, Math.floor(env.rateLimitMax / 4))),
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/tts", speechLimiter);

/** Tarayıcıda http://localhost:PORT/ açıldığında boş / "Cannot GET /" yerine kısa yönlendirme. */
app.get("/", (_req, res) => {
  res
    .type("text/html; charset=utf-8")
    .send(
      `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Viona API</title></head><body style="font-family:system-ui,sans-serif;padding:1.5rem;max-width:40rem;line-height:1.5">
<h1>Viona Node API</h1>
<p>Bu süreç yalnızca REST API sunar; misafir arayüzü ayrı (statik site / domain).</p>
<p><strong>Test:</strong> <a href="/api/health?pretty=1">/api/health?pretty=1</a> (tarayıcıda okunaklı) — ham JSON: <a href="/api/health">/api/health</a></p>
<p>Operasyon WhatsApp (Cloud API): <code>WHATSAPP_ACCESS_TOKEN</code>, <code>WHATSAPP_PHONE_NUMBER_ID</code>, <code>WHATSAPP_TECH_RECIPIENTS</code> / <code>WHATSAPP_HK_RECIPIENTS</code> / <code>WHATSAPP_FRONT_RECIPIENTS</code> — ayrıntı <code>server/.env.example</code>.</p>
</body></html>`,
    );
});

function escapeHtmlJsonPreview(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

app.get("/api/health", (req, res) => {
  const hotelTz = String(process.env.HOTEL_TIMEZONE || process.env.HOTEL_TZ || "Europe/Istanbul").trim();
  const payload = {
    ok: true,
    service: "viona-node-api",
    envBootstrap: getEnvBootstrapDiagnostics(),
    adminAuthConfigured: Boolean(env.adminApiToken),
    hasSupabase: env.hasSupabase,
    /** TTS/STT için Azure anahtarı yüklü mü (Render’da AZURE_SPEECH_KEY kontrolü). */
    azureSpeechConfigured: Boolean(String(env.azureSpeechKey || "").trim()),
    /** Geç çıkış “bugün” eşiği için kullanılan IANA dilimi (varsayılan Europe/Istanbul). */
    hotelTimezone: hotelTz || "Europe/Istanbul",
    /** WhatsApp operasyon (Cloud): token/phone id ve alıcı sayıları (numara listelenmez). */
    whatsappOperational: getWhatsappOperationalHealthSummary(),
    /** Render’da WHATSAPP_APP_SECRET tanımlı mı (değer sızmaz); webhook POST imza kontrolü buna bağlı. */
    whatsappWebhookSignatureConfigured: Boolean(env.whatsappAppSecret),
    /** Saha /api/ops: env’de token tanımlı mı (değerler listelenmez). Bu alan yoksa sunucu sürümü /api/ops öncesi. */
    opsLinkTokensConfigured: {
      hk: Boolean(String(env.opsLinkTokenHk || "").trim()),
      tech: Boolean(String(env.opsLinkTokenTech || "").trim()),
      front: Boolean(String(env.opsLinkTokenFront || "").trim()),
    },
    /** 1 iken /api/ops token olmadan yalnızca güvenilir origin + X-Viona-Ops-Page ile açılır (dahili kullanım). */
    opsTrustOpsPageHeader: Boolean(env.opsTrustOpsPageHeader),
  };
  const pretty =
    String(req.query?.pretty || "") === "1" ||
    String(req.headers?.accept || "").toLowerCase().includes("text/html");
  if (pretty) {
    const body = escapeHtmlJsonPreview(JSON.stringify(payload, null, 2));
    return res
      .type("text/html; charset=utf-8")
      .send(
        `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>/api/health</title></head><body style="font-family:ui-monospace,monospace;padding:1rem;font-size:14px;line-height:1.4;background:#fafafa"><pre style="white-space:pre-wrap;word-break:break-word;margin:0">${body}</pre></body></html>`,
      );
  }
  res.json(payload);
});

app.use("/api/guest-requests", guestRequestsRouter);
app.use("/api/surveys", surveysRouter);
app.use("/api/admin", adminRouter);
app.use("/api/ops", opsLinkRouter);
app.use("/api", createSpeechRouter());
app.post(
  "/api/stt",
  speechLimiter,
  speechClientAuthMiddleware,
  createSttRawMiddleware(),
  handleStt,
);

// WhatsApp webhook (Meta Cloud API).
app.get("/api/webhooks/whatsapp", (req, res) => {
  try {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode !== "subscribe") {
      return res.status(400).send("invalid_mode");
    }
    if (!process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(503).send("verify_token_not_configured");
    }
    if (token !== process.env.WHATSAPP_VERIFY_TOKEN) {
      return res.status(403).send("verification_failed");
    }
    return res.status(200).send(String(challenge || ""));
  } catch (err) {
    console.error("whatsapp_webhook_verify_failed error=%s", err?.message || err);
    return res.status(500).send("error");
  }
});

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
  const conversationLanguage = VIONA_UI_LANGUAGE_CODES.includes(rawConv) ? rawConv : null;

  if (!message) {
    const fb = safeFallback(locale, "validation_error", message);
    return res.status(200).json(fb);
  }

  const timeoutMs = safeTimeoutMs(process.env.ASSISTANT_TIMEOUT_MS, 12000);
  /** Tarayıcıdan yalnızca sesli tur için "voice"; aksi halde web (WhatsApp ayrı webhook). */
  const rawClientChannel = String(req.body?.client_channel || "").toLowerCase().trim();
  const channel = rawClientChannel === "voice" ? "voice" : "web";
  try {
    const payload = {
      message,
      locale,
      ui_language: uiLanguage,
      user_id: userId,
      session_id: sessionId,
      channel,
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
      const fb = safeFallback(locale, "upstream_unavailable", message);
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
      const fb = safeFallback(locale, "upstream_unavailable", message);
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
      const fb = safeFallback(locale, "upstream_unavailable", message);
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
    // Güvenli fallback metni + rezervasyon benzeri mesaj: metni ve CTA’yı Restaurant & barlar ile hizala.
    try {
      const userText = String(message || "");
      const isResLike = isReservationLikeMessage(userText);
      const lang = locale || "tr";
      const normalizedLang = normalizeLocale(lang);
      const safeFallbackText = pickChatLangMessage(SAFE_FALLBACK_BY_LANG, normalizedLang);
      const rawMsg = String(data?.message || "").trim();
      if (isResLike && rawMsg === safeFallbackText) {
        const redirectText = pickChatLangMessage(RESERVATION_REDIRECT_BY_LANG, normalizedLang);
        data = {
          type: "inform",
          message: redirectText,
          meta: {
            intent: "reservation",
            confidence: 1.0,
            language: normalizedLang,
            ui_language: uiLanguage,
            source: "fallback",
            multi_intent: false,
            action: {
              kind: "open_reservation_form",
              sub_intent: null,
              entity: null,
            },
          },
        };
      }
    } catch (patchErr) {
      console.warn(
        "chat_proxy_reservation_fallback_patch_failed error=%s",
        patchErr?.message || patchErr,
      );
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
    // Kayıt createGuestRequest içinde; operasyon WhatsApp türe göre (.env alıcı listeleri).
    data = await processCreateGuestRequestAction(data);
    return res.status(200).json(data);
  } catch (error) {
    const isAbort = error?.name === "AbortError";
    const proxyReason = isAbort ? "upstream_timeout" : "upstream_network_error";
    console.error("chat_proxy_fallback proxy_reason=%s error=%s", proxyReason, error?.message || error);
    const fb = safeFallback(locale, "upstream_unavailable", message);
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

const httpServer = app.listen(env.port, () => {
  console.log(`Server running on http://localhost:${env.port}`);
});
httpServer.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    console.error(
      `[sunucu] Port ${env.port} dolu — başka bir terminalde veya arka planda zaten bu API çalışıyor olabilir. ` +
        `Eski süreci durdur (Ctrl+C) veya: ss -tlnp | grep ${env.port}  /  lsof -i :${env.port}`,
    );
    process.exit(1);
    return;
  }
  console.error("[sunucu] listen hatası:", err?.message || err);
  process.exit(1);
});

let shuttingDown = false;
function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info("[sunucu] %s — HTTP kapatılıyor", signal);
  httpServer.close(() => {
    process.exit(0);
  });
  setTimeout(() => {
    console.warn("[sunucu] graceful timeout — process.exit(1)");
    process.exit(1);
  }, 28_000).unref();
}
process.once("SIGINT", () => gracefulShutdown("SIGINT"));
process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));
