import express from "express";
import rateLimit from "express-rate-limit";
import { getEnv } from "../../config/env.js";
import { clearVerifiedGuestCookie, setVerifiedGuestCookie } from "../../lib/guest-verified-session.js";
import { recordGuestGateEntry } from "./guest-gate-log.service.js";
import { normalizeGuestRoomForMatch } from "../../lib/guest-match-normalize.js";
import { verifyHotelGuest } from "../../services/hotel-advisor.service.js";
import {
  formatGuestWhatsAppPhoneDisplay,
  normalizeGuestWhatsAppRecipientDigits,
} from "../../services/whatsapp-feedback-invite.service.js";

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
      });
    },
  });

  router.get("/status", (_req, res) => {
    const e = getEnv();
    const pms = Boolean(e.hotelAdvisorConfigured);
    const out = {
      required: Boolean(envSlice.guestUiGateRequired),
      strict: Boolean(envSlice.guestUiGateStrict),
      dualPassword: false,
      pmsIdentity: pms,
      identityRequired: Boolean(envSlice.guestUiGateRequired),
      identityRequiresBirthDate: pms,
      identityRequiresFullName: false,
    };
    if (e.operatorGateBypassConfigured) {
      const r = String(e.operatorGateRoom || "").trim();
      const birth = String(e.operatorGateBirthdate || "").trim();
      const displayName = String(e.operatorGateDisplayName || "Viona Kontrol").trim() || "Viona Kontrol";
      if (r) {
        const canon = normalizeGuestRoomForMatch(r) || r;
        out.extraValidRoomNumbers = [canon];
      }
      out.operatorBypassPrefill = {
        roomNo: normalizeGuestRoomForMatch(r) || r,
        birthDate: birth,
        displayName,
      };
    }
    res.json(out);
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

    const roomNo = String(body.roomNo ?? body.room ?? "").trim();
    const birthDate = String(body.birthDate ?? "").trim();

    if (!roomNo || !birthDate) {
      return res.status(400).json({
        ok: false,
        error: "identity_required",
      });
    }

    const cfg = getEnv();
    if (cfg.operatorGateBypassConfigured) {
      const wantRoom = String(cfg.operatorGateRoom || "").trim();
      const wantBirth = String(cfg.operatorGateBirthdate || "").trim();
      if (
        normalizeGuestRoomForMatch(roomNo) === normalizeGuestRoomForMatch(wantRoom) &&
        birthDate === wantBirth
      ) {
        const clientIp = String(req.ip || req.socket?.remoteAddress || "unknown").trim() || "unknown";
        const userAgent = String(req.get("user-agent") || "").trim();
        const displayName = String(cfg.operatorGateDisplayName || "Viona Kontrol").trim() || "Viona Kontrol";
        const roomCanonical = normalizeGuestRoomForMatch(roomNo) || roomNo;
        await recordGuestGateEntry({
          fullName: displayName,
          roomNumber: roomCanonical,
          verificationMethod: "operator_bypass",
          clientIp,
          userAgent,
          birthDate,
        });
        setVerifiedGuestCookie(res, roomCanonical);
        let guestPhone = null;
        const bypassDigits = normalizeGuestWhatsAppRecipientDigits(
          cfg.operatorGatePhone,
          cfg.whatsappGuestDefaultCountryCode || "90",
        );
        if (bypassDigits) guestPhone = formatGuestWhatsAppPhoneDisplay(bypassDigits);
        return res.status(200).json({
          ok: true,
          verification: "operator_bypass",
          guest: {
            guestName: displayName,
            roomNo: roomCanonical,
            resId: null,
            resNameId: null,
            guestPhone,
            guestEmail: null,
          },
        });
      }
    }

    if (!getEnv().hotelAdvisorConfigured) {
      return res.status(503).json({
        ok: false,
        error: "hotel_advisor_not_configured",
      });
    }

    try {
      const guest = await verifyHotelGuest({ roomNo, birthDate });
      if (!guest) {
        return res.status(401).json({
          ok: false,
          error: "invalid_identity",
        });
      }

      const clientIp = String(req.ip || req.socket?.remoteAddress || "unknown").trim() || "unknown";
      const userAgent = String(req.get("user-agent") || "").trim();

      await recordGuestGateEntry({
        fullName: guest.guestName || "Misafir",
        roomNumber: guest.roomNo,
        verificationMethod: "hotel_advisor",
        clientIp,
        userAgent,
        hotelId: guest.hotelId,
        resId: guest.resId,
        resNameId: guest.resNameId,
        birthDate,
      });

      setVerifiedGuestCookie(res, guest.roomNo);
      return res.status(200).json({
        ok: true,
        verification: "hotel_advisor",
        guest: {
          guestName: guest.guestName || "Misafir",
          roomNo: guest.roomNo,
          resId: guest.resId,
          resNameId: guest.resNameId,
          guestPhone: guest.guestPhone ?? null,
          guestEmail: guest.guestEmail ?? null,
        },
      });
    } catch (err) {
      const msg = String(err?.message || err);
      if (msg.includes("HotelAdvisor env variables are missing")) {
        return res.status(503).json({
          ok: false,
          error: "hotel_advisor_not_configured",
        });
      }
      console.error("[guest_gate] verify_hotel_advisor_failed", msg);
      return res.status(500).json({
        ok: false,
        error: "verification_failed",
      });
    }
  });

  return router;
}
