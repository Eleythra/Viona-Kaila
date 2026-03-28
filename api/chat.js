const ASSISTANT_CHAT_ENDPOINT =
  process.env.ASSISTANT_CHAT_ENDPOINT || "http://127.0.0.1:8010/api/chat";
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

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

function normalizeLocale(value) {
  const v = String(value || "").toLowerCase().trim();
  return v === "en" || v === "de" || v === "ru" ? v : "tr";
}

function safeFallback(locale, reason = "safe") {
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
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;
    const intent = String(response?.meta?.intent || "unknown");
    const source = String(response?.meta?.source || "fallback");
    const responseType = String(response?.type || "fallback");
    const action = response?.meta?.action || null;
    const recommendationMade = intent === "recommendation" || action?.kind === "suggest_venue";
    const routeTarget = routeTargetForResponse(response);
    const routeValue = routeTarget === "none" ? null : routeTarget;
    const row = {
      session_id: sessionId || null,
      user_id: userId || null,
      user_message: String(message || ""),
      ui_language: uiLanguage || null,
      detected_language: response?.meta?.language || null,
      intent,
      domain: domainForIntent(intent),
      sub_intent: action?.sub_intent || null,
      entity: action?.entity || null,
      confidence: Number(response?.meta?.confidence || 0),
      multi_intent:
        typeof response?.meta?.multi_intent === "boolean"
          ? response.meta.multi_intent
          : guessMultiIntent(message),
      response_type: responseType,
      route_target: routeValue,
      recommendation_made: Boolean(recommendationMade),
      layer_used: source,
      fallback_reason: fallbackReason || null,
      decision_path: decisionPath || null,
      assistant_response: String(response?.message || ""),
      raw_payload: { message, response },
    };
    await fetch(`${SUPABASE_URL}/rest/v1/chat_observations`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });
  } catch (_err) {}
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
  const userId = body.user_id || null;
  const sessionId = body.session_id || req.headers["x-session-id"] || userId || null;
  const rawConv = String(body.conversation_language || "").toLowerCase().trim();
  const conversationLanguage =
    rawConv === "en" || rawConv === "de" || rawConv === "ru" || rawConv === "tr"
      ? rawConv
      : null;

  if (!message) {
    const fb = safeFallback(locale, "validation_error");
    await writeChatObservation({
      sessionId,
      userId,
      message,
      uiLanguage,
      response: fb,
      fallbackReason: "validation_error",
      decisionPath: "proxy:validation_error",
    });
    return res.status(200).json(fb);
  }

  const timeoutMs = safeTimeoutMs(process.env.ASSISTANT_TIMEOUT_MS, 12000);
  try {
    const payload = {
      message,
      locale,
      ui_language: uiLanguage,
      user_id: body.user_id || null,
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
};
