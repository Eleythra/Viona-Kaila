import { Router } from "express";
import { timingSafeEqual } from "node:crypto";
import { getEnv } from "../../config/env.js";
import {
  deleteChatObservation,
  deleteChatObservationsBulk,
  deleteAdminItem,
  getDashboardReports,
  getPdfReportPackage,
  getChatObservationSummary,
  exportChatObservations,
  getSurveyReport,
  getFrontOfficeOperationSummary,
  getFrontOfficeTypeSummary,
  listAdminBucket,
  listChatObservations,
  listSurveySubmissions,
  updateChatObservationReview,
  updateAdminItemStatus,
  mergeGuestSatisfactionAdmin,
  resendWhatsappForAdminItem,
} from "./admin.service.js";
const router = Router();
const ADMIN_API_TOKEN = String(process.env.ADMIN_API_TOKEN || "").trim();

function extractAdminToken(req) {
  const bearer = String(req.headers?.authorization || "").trim();
  if (bearer.toLowerCase().startsWith("bearer ")) {
    const token = bearer.slice(7).trim();
    if (token) return token;
  }
  const headerToken = String(req.headers?.["x-admin-token"] || "").trim();
  return headerToken || "";
}

function isAdminTokenValid(candidate = "") {
  if (!ADMIN_API_TOKEN) return false;
  const left = Buffer.from(String(candidate || ""), "utf8");
  const right = Buffer.from(ADMIN_API_TOKEN, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

router.get("/auth/validate", (req, res) => {
  if (!ADMIN_API_TOKEN) {
    return res.status(503).json({ ok: false, error: "admin_auth_not_configured" });
  }
  const token = extractAdminToken(req);
  if (!isAdminTokenValid(token)) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }
  return res.status(200).json({ ok: true });
});

router.use((req, res, next) => {
  if (!ADMIN_API_TOKEN) {
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
  let msg = error?.message || fallbackMsg;
  if (msg === "datastore_dns_unavailable") {
    msg =
      "Sunucu veritabanına şu an bağlanılamıyor (DNS veya geçici ağ). Lütfen bir süre sonra tekrar deneyin. Sorun sürerse sunucuda DNS_SERVERS (ör. 8.8.8.8,1.1.1.1) tanımlanmalıdır.";
  }
  return res.status(code).json({ ok: false, error: msg });
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

router.get("/requests/front-summary", async (req, res) => {
  try {
    const summary = await getFrontOfficeOperationSummary(req.query || {});
    return res.status(200).json({ ok: true, summary });
  } catch (error) {
    return adminErr(res, error, "admin_front_summary_failed");
  }
});

router.get("/requests/front-type-summary", async (req, res) => {
  try {
    const type = String(req.query.type || "");
    const summary = await getFrontOfficeTypeSummary(type, req.query || {});
    return res.status(200).json({ ok: true, summary });
  } catch (error) {
    return adminErr(res, error, "admin_front_type_summary_failed");
  }
});

router.get("/ops-team-entry-urls", (req, res) => {
  try {
    const env = getEnv();
    const page = (file, tok) => {
      const t = String(tok || "").trim();
      if (!t) return { href: file, hasToken: false };
      return { href: `${file}?k=${encodeURIComponent(t)}`, hasToken: true };
    };
    return res.status(200).json({
      ok: true,
      pages: {
        hk: page("ops-hk.html", env.opsLinkTokenHk),
        tech: page("ops-tech.html", env.opsLinkTokenTech),
        front: page("ops-front.html", env.opsLinkTokenFront),
      },
    });
  } catch (error) {
    return adminErr(res, error, "admin_ops_urls_failed");
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

router.patch("/requests/:type/:id/satisfaction", async (req, res) => {
  try {
    const data = await mergeGuestSatisfactionAdmin(req.params.type, req.params.id, req.body || {});
    return res.status(200).json({ ok: true, item: data });
  } catch (error) {
    return adminErr(res, error, "admin_satisfaction_update_failed");
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
