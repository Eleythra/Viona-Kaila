import { Router } from "express";
import { createSurveySubmission } from "./surveys.service.js";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const result = await createSurveySubmission(req.body || {});
    return res.status(201).json({
      ok: true,
      id: String(result.id),
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: error?.message || "survey_submit_failed",
    });
  }
});

export default router;
