import { Router } from "express";
import rateLimit from "express-rate-limit";
import { getEnv } from "../../config/env.js";
import { translateGuestRequestApiError } from "../../lib/guest-request-api-error-tr.js";
import { createGuestRequest } from "./guest-requests.service.js";

const router = Router();
const env = getEnv();

const guestRequestSubmitLimiter = rateLimit({
  windowMs: Math.max(60_000, env.rateLimitWindowMs || 60_000),
  max: Math.min(120, Math.max(40, Math.floor((env.rateLimitMax || 180) / 2))),
  standardHeaders: true,
  legacyHeaders: false,
});

function clientFacingErrorMessage(error, fallbackMsg) {
  if (error == null) return translateGuestRequestApiError(fallbackMsg);
  if (typeof error === "string" && error.trim()) return translateGuestRequestApiError(error.trim());
  const m = error.message;
  if (m === "datastore_dns_unavailable") {
    return "Sunucu veritabanına şu an bağlanılamıyor (DNS veya geçici ağ). Lütfen bir süre sonra tekrar deneyin. Sorun sürerse sunucuda DNS_SERVERS (ör. 8.8.8.8,1.1.1.1) tanımlanmalıdır.";
  }
  if (typeof m === "string" && m.trim()) return translateGuestRequestApiError(m.trim());
  return translateGuestRequestApiError(fallbackMsg);
}

function routeErr(res, error, fallbackMsg) {
  const sc = error && typeof error.statusCode === "number" ? error.statusCode : null;
  const reason = error && error.guestVerificationReason ? String(error.guestVerificationReason) : null;
  const code =
    sc === 503 ? 503 : sc === 429 ? 429 : sc === 422 ? 422 : sc === 409 ? 409 : 400;
  const msg = clientFacingErrorMessage(error, fallbackMsg);
  if (code === 409 && msg === "quiet_hours_reception_only") {
    return res.status(409).json({
      ok: false,
      error: translateGuestRequestApiError("quiet_hours_reception_only"),
    });
  }
  const body = {
    ok: false,
    error: msg,
  };
  if (reason) body.reason = reason;
  return res.status(code).json(body);
}

router.post("/", guestRequestSubmitLimiter, async (req, res) => {
  try {
    const payload = req.body || {};
    const result = await createGuestRequest(payload, { clientIp: req.ip || req.socket?.remoteAddress });
    const out = {
      ok: true,
      id: String(result.id),
      bucket: result.bucket,
    };
    if (result.whatsapp != null) out.whatsapp = result.whatsapp;
    return res.status(201).json(out);
  } catch (error) {
    return routeErr(res, error, "guest_request_create_failed");
  }
});

export default router;
