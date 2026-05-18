/**
 * Sesli asistan API: OpenAI Realtime (unified WebRTC proxy + ephemeral session yedek).
 */
import express from "express";
import rateLimit from "express-rate-limit";
import { timingSafeEqual } from "node:crypto";
import { getEnv } from "../../config/env.js";
import {
  buildPublicSiteOriginAllowlist,
  requestHasAllowedPublicSiteOrigin,
} from "../../lib/public-site-origins.js";
import {
  buildClientSecretsRequestBody,
  buildOpenAiRealtimeSessionBody,
  buildOpenAiRealtimeUnifiedSession,
  extractEphemeralClientSecret,
} from "./openai-realtime-session.js";

function speechSecretMatches(candidate, expected) {
  const left = Buffer.from(String(candidate || ""), "utf8");
  const right = Buffer.from(String(expected || ""), "utf8");
  if (!right.length) return false;
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

let speechTrustedOriginAllowlist = null;

function getSpeechTrustedOriginAllowlist() {
  if (!speechTrustedOriginAllowlist) {
    speechTrustedOriginAllowlist = buildPublicSiteOriginAllowlist(getEnv());
  }
  return speechTrustedOriginAllowlist;
}

/**
 * SPEECH_CLIENT_SECRET doluysa: doğru `X-Viona-Speech-Secret` veya CORS ile aynı allowlist’te Origin/Referer.
 */
export function speechClientAuthMiddleware(req, res, next) {
  const env = getEnv();
  const secret = String(env.speechClientSecret || "").trim();
  if (!secret) return next();
  const header = String(req.headers["x-viona-speech-secret"] || "").trim();
  if (speechSecretMatches(header, secret)) return next();
  if (
    requestHasAllowedPublicSiteOrigin(req, getSpeechTrustedOriginAllowlist(), {
      trustForwardedHeaders: env.speechTrustForwardedOrigin,
    })
  ) {
    return next();
  }
  console.warn(
    "speech_auth_reject path=%s origin=%s x_forwarded_host=%s x_vercel_fwd_host=%s forwarded_present=%s referer_present=%s",
    String(req.path || ""),
    req.headers.origin ? "yes" : "no",
    req.headers["x-forwarded-host"] ? "yes" : "no",
    req.headers["x-vercel-forwarded-host"] ? "yes" : "no",
    req.headers.forwarded ? "yes" : "no",
    req.headers.referer ? "yes" : "no",
  );
  return res.status(401).json({ ok: false, error: "speech_unauthorized" });
}

const OPENAI_REALTIME_SESSION_URL = "https://api.openai.com/v1/realtime/sessions";
const OPENAI_CLIENT_SECRETS_URL = "https://api.openai.com/v1/realtime/client_secrets";
const OPENAI_REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";
/** İstemci `realtimeSessionTimeoutMs` (varsayılan 22s) ile hizalı. */
const OPENAI_UPSTREAM_FETCH_MS = 22_000;
const OPENAI_CALLS_FETCH_MS = 35_000;

/** OpenAI JSON gövdesinden güvenli kısa özet (API anahtarı sızmaz). */
export function openAiErrorPublicDetail(data) {
  const e = data && typeof data === "object" ? data.error : null;
  if (!e || typeof e !== "object") return undefined;
  const typ = typeof e.type === "string" ? e.type.trim() : "";
  const cod = e.code != null ? String(e.code).trim() : "";
  const msg = typeof e.message === "string" ? e.message.trim() : "";
  const parts = [typ, cod, msg].filter(Boolean);
  if (!parts.length) return undefined;
  return parts.join(" — ").slice(0, 280);
}

let realtimeSessionLimiterMemo = null;
function getRealtimeSessionLimiter() {
  if (realtimeSessionLimiterMemo) return realtimeSessionLimiterMemo;
  const env = getEnv();
  realtimeSessionLimiterMemo = rateLimit({
    windowMs: env.rateLimitWindowMs,
    max: Math.min(60, Math.max(24, Math.floor(env.rateLimitMax / 4))),
    standardHeaders: true,
    legacyHeaders: false,
  });
  return realtimeSessionLimiterMemo;
}

function parseVoiceOptsFromRequest(req) {
  const uiLang = String(
    req.query?.ui_language ?? req.query?.locale ?? req.body?.ui_language ?? req.body?.locale ?? "tr",
  ).trim();
  const voice = String(req.query?.voice ?? req.body?.voice ?? "").trim();
  return { uiLang, voice };
}

async function openAiFetchJson(url, apiKey, body, timeoutMs) {
  const ac = new AbortController();
  const tid = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: ac.signal,
    });
    const rawText = await upstream.text();
    let data = null;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      data = null;
    }
    return { upstream, rawText, data };
  } finally {
    clearTimeout(tid);
  }
}

/**
 * Ephemeral token: birincil GA `client_secrets`; yedek eski `/sessions` (legacy şema).
 * @returns {{ ok: true, value: string, expiresAt: unknown, model: string, session_id: string|null } | { ok: false, error: string, detail?: string }}
 */
export async function mintEphemeralRealtimeSession({ apiKey, model, uiLang, voice }) {
  const opts = { model, uiLanguage: uiLang, voice };
  const secretsBody = buildClientSecretsRequestBody(opts);
  const legacyBody = buildOpenAiRealtimeSessionBody(opts);

  let lastDetail;
  try {
    const primary = await openAiFetchJson(
      OPENAI_CLIENT_SECRETS_URL,
      apiKey,
      secretsBody,
      OPENAI_UPSTREAM_FETCH_MS,
    );
    if (primary.upstream.ok) {
      const { value, expiresAt } = extractEphemeralClientSecret(primary.data);
      if (value) {
        return {
          ok: true,
          value,
          expiresAt,
          model: primary.data?.session?.model || primary.data?.model || model,
          session_id: primary.data?.session?.id || primary.data?.id || null,
        };
      }
      lastDetail = openAiErrorPublicDetail(primary.data) || "missing value in client_secrets";
      console.warn("openai_realtime_client_secrets_missing_value keys=%s", primary.data ? Object.keys(primary.data).join(",") : "");
    } else {
      lastDetail = openAiErrorPublicDetail(primary.data) || String(primary.rawText || "").slice(0, 200);
      console.warn(
        "openai_realtime_client_secrets_upstream status=%s detail=%s",
        primary.upstream.status,
        lastDetail,
      );
    }

    const legacy = await openAiFetchJson(OPENAI_REALTIME_SESSION_URL, apiKey, legacyBody, OPENAI_UPSTREAM_FETCH_MS);
    if (legacy.upstream.ok) {
      const { value, expiresAt } = extractEphemeralClientSecret(legacy.data);
      if (value) {
        console.warn("openai_realtime_session_legacy_fallback ok");
        return {
          ok: true,
          value,
          expiresAt,
          model: legacy.data?.model || model,
          session_id: legacy.data?.id || null,
        };
      }
      lastDetail = openAiErrorPublicDetail(legacy.data) || lastDetail || "missing client_secret";
    } else {
      const dLegacy = openAiErrorPublicDetail(legacy.data) || String(legacy.rawText || "").slice(0, 200);
      console.warn("openai_realtime_session_legacy_upstream status=%s detail=%s", legacy.upstream.status, dLegacy);
      lastDetail = dLegacy || lastDetail;
    }

    return { ok: false, error: "realtime_bad_response", detail: lastDetail };
  } catch (err) {
    const name = err?.name || "";
    console.warn("openai_realtime_mint_error name=%s msg=%s", name, err?.message || err);
    if (name === "AbortError") {
      return { ok: false, error: "realtime_upstream_timeout" };
    }
    return {
      ok: false,
      error: "realtime_upstream",
      detail: err?.message ? String(err.message).slice(0, 280) : undefined,
    };
  }
}

/**
 * Unified interface: SDP + session JSON → OpenAI `/v1/realtime/calls`.
 */
export async function proxyRealtimeCallSdp({ apiKey, model, uiLang, voice, sdp }) {
  const sessionJson = buildOpenAiRealtimeUnifiedSession({ model, uiLanguage: uiLang, voice });
  const fd = new FormData();
  fd.set("sdp", String(sdp || ""));
  fd.set("session", JSON.stringify(sessionJson));

  const ac = new AbortController();
  const tid = setTimeout(() => ac.abort(), OPENAI_CALLS_FETCH_MS);
  try {
    const upstream = await fetch(OPENAI_REALTIME_CALLS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: fd,
      signal: ac.signal,
    });
    const answerSdp = await upstream.text();
    if (!upstream.ok) {
      let data = null;
      try {
        data = answerSdp ? JSON.parse(answerSdp) : null;
      } catch {
        data = null;
      }
      const detail = openAiErrorPublicDetail(data) || String(answerSdp || "").slice(0, 280);
      console.warn("openai_realtime_call_upstream status=%s detail=%s", upstream.status, detail);
      return { ok: false, error: "realtime_upstream", detail, status: upstream.status };
    }
    if (!String(answerSdp || "").trim()) {
      return { ok: false, error: "realtime_bad_response", detail: "empty SDP answer" };
    }
    return { ok: true, sdp: answerSdp };
  } catch (err) {
    const name = err?.name || "";
    console.warn("openai_realtime_call_error name=%s msg=%s", name, err?.message || err);
    if (name === "AbortError") {
      return { ok: false, error: "realtime_upstream_timeout" };
    }
    return {
      ok: false,
      error: "realtime_upstream",
      detail: err?.message ? String(err.message).slice(0, 280) : undefined,
    };
  } finally {
    clearTimeout(tid);
  }
}

export function createSpeechRouter() {
  const router = express.Router();

  /**
   * POST /api/realtime/call — Unified WebRTC: ham SDP + sunucu oturum yapılandırması.
   * Query: ui_language, voice. Body: application/sdp
   */
  router.post(
    "/realtime/call",
    getRealtimeSessionLimiter(),
    speechClientAuthMiddleware,
    express.text({ type: ["application/sdp", "text/plain"], limit: "256kb" }),
    async (req, res) => {
      const env = getEnv();
      if (!String(env.openAiApiKey || "").trim()) {
        return res.status(503).json({ ok: false, error: "realtime_not_configured" });
      }
      const sdp = String(req.body || "").trim();
      if (!sdp) {
        return res.status(400).json({ ok: false, error: "bad_json", detail: "missing SDP" });
      }
      const { uiLang, voice } = parseVoiceOptsFromRequest(req);
      const model = String(env.openAiRealtimeModel || "gpt-realtime").trim();
      const result = await proxyRealtimeCallSdp({
        apiKey: env.openAiApiKey,
        model,
        uiLang,
        voice,
        sdp,
      });
      if (!result.ok) {
        const status = result.error === "realtime_upstream_timeout" ? 504 : 502;
        return res.status(status).json({
          ok: false,
          error: result.error,
          detail: result.detail,
        });
      }
      res.setHeader("Content-Type", "application/sdp");
      return res.status(200).send(result.sdp);
    },
  );

  /**
   * POST /api/realtime/session — Ephemeral client_secret (yedek / eski istemci).
   */
  router.post(
    "/realtime/session",
    getRealtimeSessionLimiter(),
    speechClientAuthMiddleware,
    express.json({ limit: "64kb" }),
    async (req, res) => {
      const env = getEnv();
      if (!String(env.openAiApiKey || "").trim()) {
        return res.status(503).json({ ok: false, error: "realtime_not_configured" });
      }

      const { uiLang, voice } = parseVoiceOptsFromRequest(req);
      const model = String(env.openAiRealtimeModel || "gpt-realtime").trim();
      const minted = await mintEphemeralRealtimeSession({
        apiKey: env.openAiApiKey,
        model,
        uiLang,
        voice,
      });

      if (!minted.ok) {
        const status = minted.error === "realtime_upstream_timeout" ? 504 : 502;
        return res.status(status).json({
          ok: false,
          error: minted.error,
          detail: minted.detail,
        });
      }

      return res.status(200).json({
        ok: true,
        model: minted.model || model,
        session_id: minted.session_id,
        client_secret: {
          value: minted.value,
          expires_at: minted.expiresAt,
        },
      });
    },
  );

  return router;
}
