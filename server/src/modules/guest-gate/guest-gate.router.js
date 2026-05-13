import express from "express";
import crypto from "node:crypto";
import rateLimit from "express-rate-limit";
import { getEnv } from "../../config/env.js";
import { clearVerifiedGuestCookie, setVerifiedGuestCookie } from "../../lib/guest-verified-session.js";
import { recordGuestGateEntry } from "./guest-gate-log.service.js";

function sha256Utf8(s) {
  return crypto.createHash("sha256").update(String(s ?? ""), "utf8").digest();
}

/** Büyük/küçük harf duyarsızlık; Türkçe İ/I için `tr`. */
function normalizeGatePassword(s) {
  return String(s ?? "").trim().toLocaleLowerCase("tr");
}

/**
 * Tek giriş alanı; env’deki iki değerden biriyle eşleşirse geçer (OR).
 * Her iki eşleşmeyi de timing-safe hesaplar (hangi kod olduğu sızmasın diye).
 */
function verifyEitherConfiguredPassword(input, expected1, expected2) {
  const e1 = String(expected1 ?? "").trim();
  const e2 = String(expected2 ?? "").trim();
  if (!e1 || !e2) return false;
  const n = normalizeGatePassword(input);
  if (!n) return false;
  const h = sha256Utf8(n);
  const h1e = sha256Utf8(normalizeGatePassword(e1));
  const h2e = sha256Utf8(normalizeGatePassword(e2));
  if (h.length !== h1e.length || h.length !== h2e.length) return false;
  const ok1 = crypto.timingSafeEqual(h, h1e);
  const ok2 = crypto.timingSafeEqual(h, h2e);
  return ok1 || ok2;
}

/**
 * @param {{
 *   guestUiGateRequired: boolean,
 *   guestUiGateStrict: boolean,
 *   guestGateDualPasswordConfigured: boolean,
 * }} envSlice
 */
export function createGuestGateRouter(envSlice) {
  const router = express.Router();
  const env = getEnv();
  const gateWindowMs = Math.max(120_000, Number(env.guestGateVerifyWindowMs) || 900_000);
  const gateMax = Math.min(200, Math.max(15, Number(env.guestGateVerifyMax) || 40));
  const verifyFailLimiter = rateLimit({
    windowMs: gateWindowMs,
    max: gateMax,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        ok: false,
        error: "rate_limit_exceeded",
        message: "Çok fazla başarısız deneme yapıldı. Lütfen bir süre sonra tekrar deneyin.",
      });
    },
  });

  router.get("/status", (_req, res) => {
    res.json({
      required: Boolean(envSlice.guestUiGateRequired),
      strict: Boolean(envSlice.guestUiGateStrict),
      dualPassword: Boolean(envSlice.guestGateDualPasswordConfigured),
      identityRequired: false,
      identityRequiresBirthDate: false,
      identityRequiresFullName: false,
      pmsIdentity: false,
    });
  });

  router.post("/logout", (_req, res) => {
    clearVerifiedGuestCookie(res);
    return res.status(200).json({ ok: true });
  });

  router.post("/verify", verifyFailLimiter, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};

    if (!envSlice.guestUiGateRequired) {
      return res.status(200).json({ ok: true });
    }

    const raw = body.password ?? body.password1 ?? body.password_primary;
    const s = String(raw ?? "").trim();

    if (!s) {
      return res.status(400).json({
        ok: false,
        error: "password_required",
        message: "Erişim kodunu girin.",
      });
    }

    const ok = verifyEitherConfiguredPassword(s, env.vionaGatePassword1, env.vionaGatePassword2);
    if (!ok) {
      return res.status(401).json({
        ok: false,
        error: "invalid_password",
        message: "Kod doğrulanamadı. Kontrol edip tekrar deneyin.",
      });
    }

    const clientIp = String(req.ip || req.socket?.remoteAddress || "unknown").trim() || "unknown";
    const userAgent = String(req.get("user-agent") || "").trim();

    await recordGuestGateEntry({
      fullName: "Misafir",
      roomNumber: "gate",
      verificationMethod: "password_dual",
      clientIp,
      userAgent,
    });
    setVerifiedGuestCookie(res, "gate");
    return res.status(200).json({ ok: true, verification: "password_dual" });
  });

  return router;
}
