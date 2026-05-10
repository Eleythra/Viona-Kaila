import express from "express";
import crypto from "node:crypto";
import { normalizeGuestMatchString } from "../../lib/guest-match-normalize.js";
import { verifyGuestIdentityAtGate } from "../guest-verification/guest-verification.service.js";
import { guestVerificationUserMessage } from "../guest-verification/guest-verification-messages.js";
import { recordGuestGateEntry } from "./guest-gate-log.service.js";

function sha256Utf8(s) {
  return crypto.createHash("sha256").update(String(s ?? ""), "utf8").digest();
}

/** UTF-8 baytlarında zamanlamaya duyarlı eşitlik (normalize edilmiş dizgiler için). */
function timingSafeEqualUtf8(a, b) {
  const x = Buffer.from(String(a ?? ""), "utf8");
  const y = Buffer.from(String(b ?? ""), "utf8");
  if (x.length !== y.length) return false;
  return crypto.timingSafeEqual(x, y);
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
 *   guestDeployIdentityConfigured: boolean,
 *   vionaDeployGuestFullName: string,
 *   vionaDeployGuestRoom: string,
 *   elektraGateVerifyConfigured: boolean,
 * }} envSlice
 */
export function createGuestGateRouter(envSlice) {
  const router = express.Router();

  router.get("/status", (_req, res) => {
    res.json({
      required: Boolean(envSlice.guestUiGateRequired),
      strict: Boolean(envSlice.guestUiGateStrict),
      identityRequired: Boolean(
        envSlice.elektraGateVerifyConfigured || envSlice.guestDeployIdentityConfigured,
      ),
      pmsIdentity: Boolean(envSlice.elektraGateVerifyConfigured),
      deployBypass: Boolean(envSlice.guestDeployIdentityConfigured),
    });
  });

  router.post("/verify", async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};

    const hasElektraIdentity = Boolean(envSlice.elektraGateVerifyConfigured);
    const hasDeployBypass = Boolean(envSlice.guestDeployIdentityConfigured);
    const needsIdentity = hasElektraIdentity || hasDeployBypass;

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

    const fullName = body.fullName ?? body.full_name ?? body.name;
    const room = body.room ?? body.roomNumber ?? body.room_number;
    const fn = String(fullName ?? "").trim();
    const rn = String(room ?? "").trim();
    if (!fn || !rn) {
      return res.status(400).json({ ok: false, error: "identity_required" });
    }

    const clientIp = String(req.ip || req.socket?.remoteAddress || "unknown").trim() || "unknown";
    const userAgent = String(req.get("user-agent") || "").trim();

    /** Operatör bypass: env’deki ad+oda ile eşleşirse Elektra çağrılmaz. */
    if (hasDeployBypass) {
      const expName = normalizeGuestMatchString(envSlice.vionaDeployGuestFullName);
      const expRoom = normalizeGuestMatchString(envSlice.vionaDeployGuestRoom);
      const gotName = normalizeGuestMatchString(fn);
      const gotRoom = normalizeGuestMatchString(rn);
      if (expName && expRoom && timingSafeEqualUtf8(gotName, expName) && timingSafeEqualUtf8(gotRoom, expRoom)) {
        await recordGuestGateEntry({
          fullName: fn,
          roomNumber: rn,
          verificationMethod: "deploy_bypass",
          clientIp,
          userAgent,
        });
        return res.status(200).json({ ok: true, bypass: true });
      }
    }

    if (hasElektraIdentity) {
      try {
        await verifyGuestIdentityAtGate(fn, rn, { clientIp });
      } catch (e) {
        const reason = e && e.guestVerificationReason ? String(e.guestVerificationReason) : "pms_unavailable";
        const status = Number(e && e.statusCode) || 422;
        const message =
          (e && e.guestVerificationMessage && String(e.guestVerificationMessage).trim()) ||
          guestVerificationUserMessage(reason);
        return res.status(status).json({ ok: false, error: reason, message });
      }
      await recordGuestGateEntry({
        fullName: fn,
        roomNumber: rn,
        verificationMethod: "elektra",
        clientIp,
        userAgent,
      });
      return res.status(200).json({ ok: true });
    }

    if (hasDeployBypass) {
      return res.status(401).json({ ok: false, error: "identity_mismatch" });
    }

    return res.status(503).json({ ok: false, error: "identity_not_configured" });
  });

  return router;
}
