import { Router } from "express";
import { createSurveySubmission } from "./surveys.service.js";

const router = Router();

function routeErr(res, error, fallbackMsg) {
  const code = error?.statusCode === 503 ? 503 : 400;
  return res.status(code).json({
    ok: false,
    error: error?.message || fallbackMsg,
  });
}

router.post("/", async (req, res) => {
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
