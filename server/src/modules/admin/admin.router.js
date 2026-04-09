import { Router } from "express";
import { timingSafeEqual } from "node:crypto";
import {
  deleteChatObservation,
  deleteChatObservationsBulk,
  deleteAdminItem,
  getDashboardReports,
  getPdfReportPackage,
  getChatObservationSummary,
  exportChatObservations,
  getSurveyReport,
  listAdminBucket,
  listChatObservations,
  listSurveySubmissions,
  updateChatObservationReview,
  updateAdminItemStatus,
  resendWhatsappForAdminItem,
} from "./admin.service.js";
import { discoverWhatsappGroups, verifyConfiguredWhatsappGroups } from "../../services/whatsapp-group-discovery.service.js";
import { getWhatsappGroupBotState } from "../../services/whatsapp-group-bot.service.js";

const router = Router();

/** Her istekte okunur (.env güncellemesi / yanlış modül yükleme sırası riskini azaltır). */
function configuredAdminToken() {
  return String(process.env.ADMIN_API_TOKEN || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)[0]
    .trim();
}

function extractAdminToken(req) {
  const bearer = String(req.headers?.authorization || "").trim();
  if (bearer.toLowerCase().startsWith("bearer ")) {
    const token = bearer.slice(7).trim();
    if (token) return token;
  }
  const headerToken = String(req.headers?.["x-admin-token"] || "").trim();
  if (headerToken) return headerToken;
  /** Vercel → harici HTTP rewrite bazen Authorization / X-Admin-Token düşürür; gövde veya sorgu ile aynı token. */
  const body = req.body;
  if (body && typeof body === "object" && !Buffer.isBuffer(body)) {
    const fromBody = String(body.adminToken || body.token || "").trim();
    if (fromBody) return fromBody;
  }
  const qtok = String(req.query?.admin_token || req.query?.token || "").trim();
  if (qtok) return qtok;
  return "";
}

function isAdminTokenValid(candidate = "") {
  const secret = configuredAdminToken();
  if (!secret) return false;
  const left = Buffer.from(String(candidate || ""), "utf8");
  const right = Buffer.from(secret, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

router.get("/auth/validate", (req, res) => {
  if (!configuredAdminToken()) {
    return res.status(503).json({ ok: false, error: "admin_auth_not_configured" });
  }
  const token = extractAdminToken(req);
  if (!isAdminTokenValid(token)) {
    console.warn(
      "[admin] auth_validate unauthorized token_len=%s secret_len=%s has_auth_header=%s has_x_admin=%s",
      String(token || "").length,
      String(configuredAdminToken() || "").length,
      Boolean(req.headers?.authorization),
      Boolean(req.headers?.["x-admin-token"]),
    );
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }
  return res.status(200).json({ ok: true });
});

router.use((req, res, next) => {
  if (!configuredAdminToken()) {
    return res.status(503).json({ ok: false, error: "admin_auth_not_configured" });
  }
  const token = extractAdminToken(req);
  if (!isAdminTokenValid(token)) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }
  return next();
});

function adminErr(res, error, fallbackMsg) {
  const code = error?.statusCode === 503 ? 503 : 400;
  return res.status(code).json({ ok: false, error: error?.message || fallbackMsg });
}

router.get("/requests", async (req, res) => {
  try {
    const type = String(req.query.type || "");
    const result = await listAdminBucket(type, req.query || {});
    return res.status(200).json({ ok: true, type, ...result });
  } catch (error) {
    return adminErr(res, error, "admin_list_failed");
  }
});

router.get("/surveys", async (req, res) => {
  try {
    const result = await listSurveySubmissions(req.query || {});
    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    return adminErr(res, error, "admin_survey_list_failed");
  }
});

router.get("/surveys/report", async (req, res) => {
  try {
    const report = await getSurveyReport(req.query || {});
    return res.status(200).json({ ok: true, report });
  } catch (error) {
    return adminErr(res, error, "admin_survey_report_failed");
  }
});

router.patch("/requests/:type/:id/status", async (req, res) => {
  try {
    const data = await updateAdminItemStatus(req.params.type, req.params.id, req.body?.status);
    return res.status(200).json({ ok: true, item: data });
  } catch (error) {
    return adminErr(res, error, "admin_status_update_failed");
  }
});

router.delete("/requests/:type/:id", async (req, res) => {
  try {
    const data = await deleteAdminItem(req.params.type, req.params.id);
    return res.status(200).json({ ok: true, ...data });
  } catch (error) {
    return adminErr(res, error, "admin_item_delete_failed");
  }
});

router.post("/requests/:type/:id/whatsapp-resend", async (req, res) => {
  try {
    const data = await resendWhatsappForAdminItem(req.params.type, req.params.id);
    return res.status(200).json({ ok: true, ...data });
  } catch (error) {
    return adminErr(res, error, "admin_whatsapp_resend_failed");
  }
});

router.get("/whatsapp-groups/state", async (_req, res) => {
  try {
    const state = getWhatsappGroupBotState();
    return res.status(200).json({ ok: true, state });
  } catch (error) {
    return adminErr(res, error, "admin_whatsapp_group_state_failed");
  }
});

router.get("/whatsapp-groups/discovery", async (_req, res) => {
  try {
    const groups = await discoverWhatsappGroups();
    return res.status(200).json({ ok: true, groups });
  } catch (error) {
    return adminErr(res, error, "admin_whatsapp_group_discovery_failed");
  }
});

router.get("/whatsapp-groups/verify", async (_req, res) => {
  try {
    const report = await verifyConfiguredWhatsappGroups();
    return res.status(200).json({ ok: true, ...report });
  } catch (error) {
    return adminErr(res, error, "admin_whatsapp_group_verify_failed");
  }
});

router.get("/reports/dashboard", async (req, res) => {
  try {
    const report = await getDashboardReports(req.query || {});
    return res.status(200).json({ ok: true, report });
  } catch (error) {
    return adminErr(res, error, "dashboard_report_failed");
  }
});

router.get("/logs", async (req, res) => {
  try {
    const result = await listChatObservations(req.query || {});
    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    return adminErr(res, error, "admin_logs_list_failed");
  }
});

router.get("/logs/summary", async (req, res) => {
  try {
    const summary = await getChatObservationSummary(req.query || {});
    return res.status(200).json({ ok: true, summary });
  } catch (error) {
    return adminErr(res, error, "admin_logs_summary_failed");
  }
});

router.patch("/logs/:id/review", async (req, res) => {
  try {
    const item = await updateChatObservationReview(req.params.id, req.body || {});
    return res.status(200).json({ ok: true, item });
  } catch (error) {
    return adminErr(res, error, "admin_log_review_failed");
  }
});

router.delete("/logs/:id", async (req, res) => {
  try {
    const data = await deleteChatObservation(req.params.id);
    return res.status(200).json({ ok: true, ...data });
  } catch (error) {
    return adminErr(res, error, "admin_log_delete_failed");
  }
});

router.post("/logs/bulk-delete", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const ids = Array.isArray(body.ids) ? body.ids : [];
    const data = await deleteChatObservationsBulk(ids);
    return res.status(200).json({ ok: true, ...data });
  } catch (error) {
    return adminErr(res, error, "admin_logs_bulk_delete_failed");
  }
});

router.get("/logs/export.csv", async (req, res) => {
  try {
    const csv = await exportChatObservations(req.query || {}, "csv");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="chat_observations.csv"');
    return res.status(200).send(csv);
  } catch (error) {
    return adminErr(res, error, "admin_logs_export_csv_failed");
  }
});

router.get("/logs/export.json", async (req, res) => {
  try {
    const json = await exportChatObservations(req.query || {}, "json");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="chat_observations.json"');
    return res.status(200).send(json);
  } catch (error) {
    return adminErr(res, error, "admin_logs_export_json_failed");
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
    return adminErr(res, error, "pdf_report_failed");
  }
});

export default router;
