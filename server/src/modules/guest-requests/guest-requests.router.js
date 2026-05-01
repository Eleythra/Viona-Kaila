import { Router } from "express";
import { createGuestRequest } from "./guest-requests.service.js";

const router = Router();

function clientFacingErrorMessage(error, fallbackMsg) {
  if (error == null) return fallbackMsg;
  if (typeof error === "string" && error.trim()) return error.trim();
  const m = error.message;
  if (m === "datastore_dns_unavailable") {
    return "Sunucu veritabanına şu an bağlanılamıyor (DNS veya geçici ağ). Lütfen bir süre sonra tekrar deneyin. Sorun sürerse sunucuda DNS_SERVERS (ör. 8.8.8.8,1.1.1.1) tanımlanmalıdır.";
  }
  if (typeof m === "string" && m.trim()) return m.trim();
  return fallbackMsg;
}

function routeErr(res, error, fallbackMsg) {
  const sc = error && typeof error.statusCode === "number" ? error.statusCode : null;
  const code = sc === 503 ? 503 : sc === 409 ? 409 : 400;
  const msg = clientFacingErrorMessage(error, fallbackMsg);
  if (code === 409 && msg === "quiet_hours_reception_only") {
    return res.status(409).json({ ok: false, error: "quiet_hours_reception_only" });
  }
  return res.status(code).json({
    ok: false,
    error: msg,
  });
}

router.post("/", async (req, res) => {
  try {
    const payload = req.body || {};
    const result = await createGuestRequest(payload);
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
