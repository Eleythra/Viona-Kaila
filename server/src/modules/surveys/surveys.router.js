import { Router } from "express";
import rateLimit from "express-rate-limit";
import { getEnv } from "../../config/env.js";
import { createSurveySubmission } from "./surveys.service.js";

const env = getEnv();
const surveySubmitLimiter = rateLimit({
  windowMs: Math.max(60_000, Number(env.surveySubmitWindowMs) || 60_000),
  max: Math.min(120, Math.max(15, Number(env.surveySubmitMax) || 45)),
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

const router = Router();

function routeErr(res, error, fallbackMsg) {
  const code = error?.statusCode === 503 ? 503 : 400;
  let msg = error?.message || fallbackMsg;
  if (msg === "datastore_dns_unavailable") {
    msg =
      "Sunucu veritabanına şu an bağlanılamıyor (DNS veya geçici ağ). Lütfen bir süre sonra tekrar deneyin. Sorun sürerse sunucuda DNS_SERVERS (ör. 8.8.8.8,1.1.1.1) tanımlanmalıdır.";
  }
  return res.status(code).json({
    ok: false,
    error: msg,
  });
}

router.post("/", surveySubmitLimiter, async (req, res) => {
  try {
    const result = await createSurveySubmission(req.body || {});
    return res.status(201).json({
      ok: true,
      id: String(result.id),
    });
  } catch (error) {
    return routeErr(res, error, "survey_submit_failed");
  }
});

export default router;
