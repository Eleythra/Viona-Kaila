/**
 * Sesli asistan API: TTS (JSON) ve STT (ham WAV gövdesi).
 */
import express from "express";
import { timingSafeEqual } from "node:crypto";
import { getEnv } from "../../config/env.js";
import { resolveVoiceForRequest, synthesizeToWav, transcribeWav } from "./azure-speech.service.js";

const MAX_TTS_CHARS = 4000;
const STT_RAW_LIMIT = "4mb";

function speechSecretMatches(candidate, expected) {
  const left = Buffer.from(String(candidate || ""), "utf8");
  const right = Buffer.from(String(expected || ""), "utf8");
  if (!right.length) return false;
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** SPEECH_CLIENT_SECRET doluysa `X-Viona-Speech-Secret` zorunlu (TTS/STT). */
export function speechClientAuthMiddleware(req, res, next) {
  const secret = String(getEnv().speechClientSecret || "").trim();
  if (!secret) return next();
  const header = String(req.headers["x-viona-speech-secret"] || "").trim();
  if (!speechSecretMatches(header, secret)) {
    return res.status(401).json({ ok: false, error: "speech_unauthorized" });
  }
  return next();
}

export function createSpeechRouter() {
  const router = express.Router();

  // POST /api/tts — { text, locale }
  router.post("/tts", speechClientAuthMiddleware, express.json({ limit: "512kb" }), async (req, res) => {
    const env = getEnv();
    if (!env.azureSpeechKey || !env.azureSpeechRegion) {
      return res.status(503).json({ ok: false, error: "speech_not_configured" });
    }

    const text = String(req.body?.text ?? "");
    const locale = req.body?.locale ?? "tr";

    if (text.length > MAX_TTS_CHARS) {
      return res.status(400).json({ ok: false, error: "text_too_long" });
    }

    const voiceSpec = resolveVoiceForRequest(locale);

    try {
      const wav = await synthesizeToWav({
        text,
        voiceSpec,
        key: env.azureSpeechKey,
        region: env.azureSpeechRegion,
        fetchTimeoutMs: env.azureSpeechFetchTimeoutMs,
      });
      res.setHeader("Content-Type", "audio/wav");
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).send(wav);
    } catch (err) {
      const code = err?.code || "tts_error";
      console.warn("tts_error code=%s msg=%s", code, err?.message || err);
      return res.status(500).json({ ok: false, error: code });
    }
  });

  return router;
}

/**
 * STT için ham gövde gerekir; router’dan ayrı mount edilir.
 */
export function createSttRawMiddleware() {
  return express.raw({ limit: STT_RAW_LIMIT, type: "application/octet-stream" });
}

export async function handleStt(req, res) {
  const env = getEnv();
  if (!env.azureSpeechKey || !env.azureSpeechRegion) {
    return res.status(503).json({ ok: false, error: "speech_not_configured" });
  }

  const localeParam = String(req.query?.locale || req.headers["x-viona-speech-locale"] || "tr");
  const voiceSpec = resolveVoiceForRequest(localeParam);
  const buf = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || []);

  try {
    const transcript = await transcribeWav({
      wavBuffer: buf,
      voiceSpec,
      key: env.azureSpeechKey,
      region: env.azureSpeechRegion,
      fetchTimeoutMs: env.azureSpeechFetchTimeoutMs,
    });
    return res.status(200).json({ ok: true, text: transcript });
  } catch (err) {
    const code = err?.code || "stt_error";
    console.warn("stt_error code=%s msg=%s", code, err?.message || err);
    return res.status(200).json({ ok: false, error: code });
  }
}
