import { Router } from "express";
import { getSurveyReport, listAdminBucket, listSurveySubmissions } from "./admin.service.js";

const router = Router();

router.get("/requests", async (req, res) => {
  try {
    const type = String(req.query.type || "");
    const result = await listAdminBucket(type, req.query || {});
    return res.status(200).json({ ok: true, type, ...result });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || "admin_list_failed" });
  }
});

router.get("/surveys", async (req, res) => {
  try {
    const result = await listSurveySubmissions(req.query || {});
    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || "admin_survey_list_failed" });
  }
});

router.get("/surveys/report", async (req, res) => {
  try {
    const report = await getSurveyReport(req.query || {});
    return res.status(200).json({ ok: true, report });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || "admin_survey_report_failed" });
  }
});

export default router;
