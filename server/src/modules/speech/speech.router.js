/**
 * Sesli asistan API: OpenAI Realtime (ephemeral session) — istemci WebRTC.
 */
import express from "express";
import rateLimit from "express-rate-limit";
import { timingSafeEqual } from "node:crypto";
import { getEnv } from "../../config/env.js";
import {
  buildPublicSiteOriginAllowlist,
  requestHasAllowedPublicSiteOrigin,
} from "../../lib/public-site-origins.js";
import { buildOpenAiRealtimeSessionBody } from "./openai-realtime-session.js";

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
const OPENAI_SESSION_FETCH_MS = 18_000;

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

export function createSpeechRouter() {
  const router = express.Router();

  /**
   * POST /api/realtime/session — OpenAI ephemeral client_secret (Realtime WebRTC).
   * Gövde: { ui_language?, locale?, voice? } — anahtar sızmaz.
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

      const uiLang = String(req.body?.ui_language ?? req.body?.locale ?? "tr").trim();
      const voice = String(req.body?.voice ?? "").trim();
      const model = String(env.openAiRealtimeModel || "gpt-realtime").trim();

      const sessionBody = buildOpenAiRealtimeSessionBody({
        model,
        uiLanguage: uiLang,
        voice,
      });

      try {
        const ac = new AbortController();
        const tid = setTimeout(() => ac.abort(), OPENAI_SESSION_FETCH_MS);
        let upstream;
        try {
          upstream = await fetch(OPENAI_REALTIME_SESSION_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${env.openAiApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(sessionBody),
            signal: ac.signal,
          });
        } finally {
          clearTimeout(tid);
        }

        const rawText = await upstream.text();
        let data = null;
        try {
          data = rawText ? JSON.parse(rawText) : null;
        } catch {
          data = null;
        }

        if (!upstream.ok) {
          const snippet = String(rawText || "").slice(0, 200);
          console.warn(
            "openai_realtime_session_upstream status=%s snippet=%s",
            upstream.status,
            snippet,
          );
          return res.status(502).json({ ok: false, error: "realtime_upstream" });
        }

        const cs = data?.client_secret;
        const value = cs && typeof cs.value === "string" ? cs.value.trim() : "";
        const expiresAt =
          cs && (typeof cs.expires_at === "number" || typeof cs.expires_at === "string") ? cs.expires_at : null;
        if (!value) {
          console.warn(
            "openai_realtime_session_missing_client_secret keys=%s",
            data ? Object.keys(data).join(",") : "",
          );
          return res.status(502).json({ ok: false, error: "realtime_bad_response" });
        }

        return res.status(200).json({
          ok: true,
          model: data?.model || model,
          session_id: data?.id || null,
          client_secret: {
            value,
            expires_at: expiresAt,
          },
        });
      } catch (err) {
        const name = err?.name || "";
        console.warn("openai_realtime_session_error name=%s msg=%s", name, err?.message || err);
        if (name === "AbortError") {
          return res.status(504).json({ ok: false, error: "realtime_upstream_timeout" });
        }
        return res.status(502).json({ ok: false, error: "realtime_upstream" });
      }
    },
  );

  return router;
}
