import { Router } from "express";
import {
  deleteChatObservation,
  deleteAdminItem,
  getDashboardReports,
  getPromoConfig,
  getPdfReportPackage,
  getChatObservationSummary,
  exportChatObservations,
  getSurveyReport,
  listAdminBucket,
  listChatObservations,
  listSurveySubmissions,
  updateChatObservationReview,
  updateAdminItemStatus,
  upsertPromoConfig,
} from "./admin.service.js";

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

router.patch("/requests/:type/:id/status", async (req, res) => {
  try {
    const data = await updateAdminItemStatus(req.params.type, req.params.id, req.body?.status);
    return res.status(200).json({ ok: true, item: data });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || "admin_status_update_failed" });
  }
});

router.delete("/requests/:type/:id", async (req, res) => {
  try {
    const data = await deleteAdminItem(req.params.type, req.params.id);
    return res.status(200).json({ ok: true, ...data });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || "admin_item_delete_failed" });
  }
});

router.get("/promo-config", async (req, res) => {
  try {
    const config = await getPromoConfig();
    return res.status(200).json({ ok: true, config });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || "promo_config_fetch_failed" });
  }
});

router.put("/promo-config", async (req, res) => {
  try {
    const config = await upsertPromoConfig(req.body || {});
    return res.status(200).json({ ok: true, config });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || "promo_config_update_failed" });
  }
});

router.get("/reports/dashboard", async (req, res) => {
  try {
    const report = await getDashboardReports(req.query || {});
    return res.status(200).json({ ok: true, report });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || "dashboard_report_failed" });
  }
});

router.get("/logs", async (req, res) => {
  try {
    const result = await listChatObservations(req.query || {});
    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || "admin_logs_list_failed" });
  }
});

router.get("/logs/summary", async (req, res) => {
  try {
    const summary = await getChatObservationSummary(req.query || {});
    return res.status(200).json({ ok: true, summary });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || "admin_logs_summary_failed" });
  }
});

router.patch("/logs/:id/review", async (req, res) => {
  try {
    const item = await updateChatObservationReview(req.params.id, req.body || {});
    return res.status(200).json({ ok: true, item });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || "admin_log_review_failed" });
  }
});

router.delete("/logs/:id", async (req, res) => {
  try {
    const data = await deleteChatObservation(req.params.id);
    return res.status(200).json({ ok: true, ...data });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || "admin_log_delete_failed" });
  }
});

router.get("/logs/export.csv", async (req, res) => {
  try {
    const csv = await exportChatObservations(req.query || {}, "csv");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="chat_observations.csv"');
    return res.status(200).send(csv);
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || "admin_logs_export_csv_failed" });
  }
});

router.get("/logs/export.json", async (req, res) => {
  try {
    const json = await exportChatObservations(req.query || {}, "json");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="chat_observations.json"');
    return res.status(200).send(json);
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || "admin_logs_export_json_failed" });
  }
});

router.get("/reports/pdf", async (req, res) => {
  try {
    const result = await getPdfReportPackage(req.query || {});
    const pdfBuffer = Buffer.isBuffer(result.buffer) ? result.buffer : Buffer.from(result.buffer);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${result.fileName}"`);
    res.setHeader("X-Viona-Report-Snapshot-Id", String(result.reportData?.reportSnapshotId || ""));
    res.setHeader("X-Viona-No-Data", result.noData ? "1" : "0");
    res.setHeader("Content-Length", String(pdfBuffer.length));
    return res.status(200).end(pdfBuffer);
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || "pdf_report_failed" });
  }
});

export default router;
