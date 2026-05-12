import express from "express";
import crypto from "node:crypto";
import { clearVerifiedGuestCookie, setVerifiedGuestCookie } from "../../lib/guest-verified-session.js";
import { verifyGuestIdentityRoomBirthdate } from "../guest-verification/guest-verification.service.js";
import { guestVerificationUserMessage } from "../guest-verification/guest-verification-messages.js";
import { recordGuestGateEntry } from "./guest-gate-log.service.js";

function sha256Utf8(s) {
  return crypto.createHash("sha256").update(String(s ?? ""), "utf8").digest();
}

/** Büyük/küçük harf duyarsızlık; Türkçe İ/I için `tr`. */
function normalizeGatePassword(s) {
  return String(s ?? "").trim().toLocaleLowerCase("tr");
}

/**
 * @param {unknown} input
 * @param {string[]} acceptedList
 */
function verifyGuestGatePassword(input, acceptedList) {
  const list = Array.isArray(acceptedList) ? acceptedList : [];
  if (!list.length) return true;
  const normalizedInput = normalizeGatePassword(input);
  if (!normalizedInput) return false;
  const inputHash = sha256Utf8(normalizedInput);
  for (const cand of list) {
    const nc = normalizeGatePassword(cand);
    if (!nc) continue;
    const candHash = sha256Utf8(nc);
    if (inputHash.length === candHash.length && crypto.timingSafeEqual(inputHash, candHash)) {
      return true;
    }
  }
  return false;
}

/**
 * @param {{
 *   guestUiGateRequired: boolean,
 *   guestUiGatePasswordList: string[],
 *   guestUiGateStrict: boolean,
 *   elektraGateVerifyConfigured: boolean,
 *   guestGateRoomAllowlistActive: boolean,
 * }} envSlice
 */
export function createGuestGateRouter(envSlice) {
  const router = express.Router();

  router.get("/status", (_req, res) => {
    res.json({
      required: Boolean(envSlice.guestUiGateRequired),
      strict: Boolean(envSlice.guestUiGateStrict),
      identityRequired: Boolean(envSlice.elektraGateVerifyConfigured),
      identityRequiresBirthDate: Boolean(envSlice.elektraGateVerifyConfigured),
      identityRequiresFullName: false,
      pmsIdentity: Boolean(envSlice.elektraGateVerifyConfigured),
      deployBypass: false,
      roomAllowlistActive: Boolean(envSlice.guestGateRoomAllowlistActive),
    });
  });

  router.post("/logout", (_req, res) => {
    clearVerifiedGuestCookie(res);
    return res.status(200).json({ ok: true });
  });

  router.post("/verify", async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};

    const hasElektraIdentity = Boolean(envSlice.elektraGateVerifyConfigured);
    const needsIdentity = hasElektraIdentity;

    if (!envSlice.guestUiGateRequired && !needsIdentity) {
      return res.status(200).json({ ok: true });
    }

    if (envSlice.guestUiGateRequired) {
      const password = body.password;
      if (password === undefined || password === null || String(password).trim() === "") {
        return res.status(400).json({ ok: false, error: "password_required" });
      }
      const pwOk = verifyGuestGatePassword(password, envSlice.guestUiGatePasswordList);
      if (!pwOk) {
        return res.status(401).json({ ok: false, error: "invalid_password" });
      }
    }

    if (!needsIdentity) {
      return res.status(200).json({ ok: true });
    }

    const clientIp = String(req.ip || req.socket?.remoteAddress || "unknown").trim() || "unknown";
    const userAgent = String(req.get("user-agent") || "").trim();

    const room = body.room ?? body.roomNumber ?? body.room_number;
    const rn = String(room ?? "").trim();
    const birthDate = body.birthDate ?? body.birth_date ?? body.birthdate;
    const bd = String(birthDate ?? "").trim();

    if (!rn || !bd) {
      return res.status(400).json({ ok: false, error: "identity_required" });
    }

    try {
      const meta = await verifyGuestIdentityRoomBirthdate(rn, bd, { clientIp });
      const display = String(meta.displayName || "").trim() || "Misafir";
      await recordGuestGateEntry({
        fullName: display,
        roomNumber: rn,
        verificationMethod: "elektra",
        clientIp,
        userAgent,
      });
      setVerifiedGuestCookie(res, rn);
      return res.status(200).json({ ok: true, verification: "room_birthdate" });
    } catch (e) {
      const reason = e && e.guestVerificationReason ? String(e.guestVerificationReason) : "pms_unavailable";
      const status = Number(e && e.statusCode) || 422;
      const message =
        (e && e.guestVerificationMessage && String(e.guestVerificationMessage).trim()) ||
        guestVerificationUserMessage(reason);
      return res.status(status).json({ ok: false, error: reason, message });
    }
  });

  return router;
}
