import express from "express";
import rateLimit from "express-rate-limit";
import { getEnv } from "../../config/env.js";
import {
  getFeedbackPublicSnapshot,
  normalizeFeedbackTokenParam,
  submitGuestFeedback,
} from "./feedback.service.js";

export function createPublicFeedbackRouter() {
  const router = express.Router();
  const env = getEnv();

  const getLimiter = rateLimit({
    windowMs: Math.max(5000, Number(env.feedbackGetWindowMs) || 60_000),
    max: Math.max(10, Number(env.feedbackGetMax) || 120),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const tok = normalizeFeedbackTokenParam(req.params?.token || "");
      const ip = String(req.ip || req.socket?.remoteAddress || "unknown");
      return `${tok}:${ip}`;
    },
  });

  const submitLimiter = rateLimit({
    windowMs: Math.max(5000, Number(env.feedbackSubmitWindowMs) || 60_000),
    max: Math.max(5, Number(env.feedbackSubmitMax) || 40),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const tok = normalizeFeedbackTokenParam(req.params?.token || "");
      const ip = String(req.ip || req.socket?.remoteAddress || "unknown");
      return `${tok}:${ip}`;
    },
  });

  router.get("/:token", getLimiter, async (req, res) => {
    try {
      const snap = await getFeedbackPublicSnapshot(req.params.token);
      return res.status(200).json(snap);
    } catch (err) {
      const msg = String(err?.message || "");
      const code = err?.statusCode || 400;
      if (msg === "feedback_not_found") return res.status(404).json({ ok: false, error: "not_found" });
      if (msg === "feedback_already_used") return res.status(410).json({ ok: false, error: "already_used" });
      if (msg === "feedback_feature_disabled") return res.status(503).json({ ok: false, error: "feedback_feature_disabled" });
      return res.status(code).json({ ok: false, error: msg || "feedback_lookup_failed" });
    }
  });

  router.post("/:token/submit", express.json({ limit: "64kb" }), submitLimiter, async (req, res) => {
    try {
      const out = await submitGuestFeedback(req.params.token, req.body || {});
      return res.status(200).json(out);
    } catch (err) {
      const msg = String(err?.message || "");
      const code = err?.statusCode || 400;
      if (msg === "feedback_not_found") return res.status(404).json({ ok: false, error: "not_found" });
      if (msg === "feedback_already_used") return res.status(410).json({ ok: false, error: "already_used" });
      if (msg === "feedback_feature_disabled") return res.status(503).json({ ok: false, error: "feedback_feature_disabled" });
      return res.status(code).json({ ok: false, error: msg || "feedback_submit_failed" });
    }
  });

  return router;
}
