import express from "express";
import crypto from "node:crypto";
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

const OPTIONAL_LOG_NAME_MAX = 120;
const OPTIONAL_LOG_ROOM_MAX = 32;

/** İsteğe bağlı ad/oda — yalnızca kayıt; rezervasyonla doğrulanmaz. */
function optionalGateLogField(value, maxLen) {
  const t = String(value ?? "")
    .replace(/\0/g, "")
    .trim()
    .replace(/\s+/g, " ");
  if (!t) return "";
  return t.length <= maxLen ? t : t.slice(0, maxLen);
}

/**
 * İki kodun da beklenen değerlerle eşleşmesi (AND).
 * @param {unknown} input1
 * @param {unknown} input2
 * @param {string} expected1
 * @param {string} expected2
 */
function verifyDualGatePasswords(input1, input2, expected1, expected2) {
  const e1 = String(expected1 ?? "").trim();
  const e2 = String(expected2 ?? "").trim();
  if (!e1 || !e2) return false;
  const n1 = normalizeGatePassword(input1);
  const n2 = normalizeGatePassword(input2);
  if (!n1 || !n2) return false;
  const h1 = sha256Utf8(n1);
  const h1e = sha256Utf8(normalizeGatePassword(e1));
  const h2 = sha256Utf8(n2);
  const h2e = sha256Utf8(normalizeGatePassword(e2));
  if (h1.length !== h1e.length || h2.length !== h2e.length) return false;
  return crypto.timingSafeEqual(h1, h1e) && crypto.timingSafeEqual(h2, h2e);
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

  router.post("/verify", async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};

    if (!envSlice.guestUiGateRequired) {
      return res.status(200).json({ ok: true });
    }

    const pw1 = body.password ?? body.password1 ?? body.password_primary;
    const pw2 = body.password2 ?? body.password_secondary;
    const s1 = String(pw1 ?? "").trim();
    const s2 = String(pw2 ?? "").trim();

    if (!s1) {
      return res.status(400).json({
        ok: false,
        error: "password_required",
        message: "İlk erişim kodunu girin.",
      });
    }
    if (!s2) {
      return res.status(400).json({
        ok: false,
        error: "password2_required",
        message: "İkinci erişim kodunu girin.",
      });
    }

    const env = getEnv();
    const ok = verifyDualGatePasswords(s1, s2, env.vionaGatePassword1, env.vionaGatePassword2);
    if (!ok) {
      return res.status(401).json({
        ok: false,
        error: "invalid_password",
        message: "Erişim kodları doğrulanamadı. Her iki kodu da kontrol edip tekrar deneyin.",
      });
    }

    const clientIp = String(req.ip || req.socket?.remoteAddress || "unknown").trim() || "unknown";
    const userAgent = String(req.get("user-agent") || "").trim();

    const optName = optionalGateLogField(body.fullName ?? body.name, OPTIONAL_LOG_NAME_MAX);
    const optRoom = optionalGateLogField(body.room ?? body.roomNumber, OPTIONAL_LOG_ROOM_MAX);

    await recordGuestGateEntry({
      fullName: optName || "Misafir",
      roomNumber: optRoom || "—",
      verificationMethod: "password_dual",
      clientIp,
      userAgent,
    });
    setVerifiedGuestCookie(res, "gate");
    return res.status(200).json({ ok: true, verification: "password_dual" });
  });

  return router;
}
