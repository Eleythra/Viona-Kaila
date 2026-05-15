import { Router } from "express";
import { getEnv } from "../../config/env.js";
import { extractAdminToken, getAdminApiToken, isAdminTokenValid } from "../../lib/admin-auth.js";
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
  getGuestBucketTypeSummary,
  getAdminBucketItem,
  listAdminBucket,
  listChatObservations,
  listGuestGateEntries,
  getGuestGateEntriesSummary,
  exportGuestGateEntriesCsv,
  deleteGuestGateEntry,
  deleteGuestGateEntriesBulk,
  listSurveySubmissions,
  updateChatObservationReview,
  updateAdminItemStatus,
  mergeGuestSatisfactionAdmin,
  resendWhatsappForAdminItem,
} from "./admin.service.js";
import { translateGuestRequestApiError } from "../../lib/guest-request-api-error-tr.js";
import { createOperationalManualEntry } from "../guest-requests/guest-requests.service.js";
import { inviteGuestFeedback } from "../feedback/feedback.service.js";
const router = Router();
const ADMIN_API_TOKEN = getAdminApiToken();

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

const MANUAL_ENTRY_TYPES = new Set(["request", "complaint", "fault", "guest_notification", "late_checkout"]);

router.post("/requests/manual", async (req, res) => {
  try {
    const type = String(req.body?.type || "").trim();
    if (!MANUAL_ENTRY_TYPES.has(type)) {
      return res.status(400).json({ ok: false, error: translateGuestRequestApiError("invalid_type") });
    }
    const out = await createOperationalManualEntry(req.body || {});
    return res.status(200).json({ ok: true, ...out });
  } catch (error) {
    const raw = String(error?.message || "");
    const msg = translateGuestRequestApiError(raw);
    if (raw === "quiet_hours_reception_only") {
      return res.status(409).json({ ok: false, error: msg });
    }
    if (error?.statusCode === 409) {
      return res.status(409).json({ ok: false, error: msg || translateGuestRequestApiError("conflict") });
    }
    if (error?.statusCode === 400) {
      return res.status(400).json({ ok: false, error: msg || translateGuestRequestApiError("bad_request") });
    }
    const display = raw ? msg : translateGuestRequestApiError("admin_manual_create_failed");
    return adminErr(res, { ...error, message: display }, display);
  }
});

router.get("/requests", async (req, res) => {
  try {
    const type = String(req.query.type || "");
    const result = await listAdminBucket(type, req.query || {});
    return res.status(200).json({ ok: true, type, ...result });
  } catch (error) {
    return adminErr(res, error, "admin_list_failed");
  }
});

/** Tek kayıt (WhatsApp «panelde aç» / tam panel derin bağlantı). */
router.get("/requests/:type/:id", async (req, res) => {
  try {
    const type = String(req.params.type || "");
    const item = await getAdminBucketItem(type, req.params.id);
    return res.status(200).json({ ok: true, type, item });
  } catch (error) {
    const msg = String(error?.message || "");
    if (msg === "invalid_id") return res.status(400).json({ ok: false, error: "invalid_id" });
    if (msg === "record_not_found") return res.status(404).json({ ok: false, error: "record_not_found" });
    return adminErr(res, error, "admin_item_get_failed");
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

/** HK / Teknik ops listesi ile aynı süzgeçte canlı durum sayımı (ops-light ile uyumlu). */
router.get("/requests/bucket-type-summary", async (req, res) => {
  try {
    const type = String(req.query.type || "");
    const summary = await getGuestBucketTypeSummary(type, req.query || {});
    return res.status(200).json({ ok: true, summary });
  } catch (error) {
    return adminErr(res, error, "admin_bucket_type_summary_failed");
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

router.post("/requests/:type/:id/feedback-invite", async (req, res) => {
  try {
    const data = await inviteGuestFeedback(req.params.type, req.params.id);
    return res.status(200).json({ ok: true, ...data });
  } catch (error) {
    const msg = String(error?.message || "");
    const code = Number(error?.statusCode) || 400;
    if (msg === "record_not_found") return res.status(404).json({ ok: false, error: msg });
    if (msg === "feedback_invite_already_pending") return res.status(409).json({ ok: false, error: msg });
    if (msg === "feedback_public_origin_not_configured") return res.status(503).json({ ok: false, error: msg });
    if (msg === "feedback_test_phone_not_configured") return res.status(503).json({ ok: false, error: msg });
    if (msg === "feedback_feature_disabled") return res.status(503).json({ ok: false, error: msg });
    if (code >= 400 && code < 600) return res.status(code).json({ ok: false, error: msg || "feedback_invite_failed" });
    return adminErr(res, error, "feedback_invite_failed");
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

router.get("/guest-gate-entries", async (req, res) => {
  try {
    const result = await listGuestGateEntries(req.query || {});
    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    return adminErr(res, error, "admin_guest_gate_entries_failed");
  }
});

router.get("/guest-gate-entries/summary", async (req, res) => {
  try {
    const summary = await getGuestGateEntriesSummary(req.query || {});
    return res.status(200).json({ ok: true, summary });
  } catch (error) {
    return adminErr(res, error, "admin_guest_gate_summary_failed");
  }
});

router.get("/guest-gate-entries/export.csv", async (req, res) => {
  try {
    const csv = await exportGuestGateEntriesCsv(req.query || {});
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="guest_gate_entries.csv"');
    return res.status(200).send(csv);
  } catch (error) {
    return adminErr(res, error, "admin_guest_gate_export_failed");
  }
});

router.post("/guest-gate-entries/bulk-delete", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const ids = Array.isArray(body.ids) ? body.ids : [];
    const data = await deleteGuestGateEntriesBulk(ids);
    return res.status(200).json({ ok: true, ...data });
  } catch (error) {
    return adminErr(res, error, "admin_guest_gate_bulk_delete_failed");
  }
});

router.delete("/guest-gate-entries/:id", async (req, res) => {
  try {
    const data = await deleteGuestGateEntry(req.params.id);
    return res.status(200).json({ ok: true, ...data });
  } catch (error) {
    return adminErr(res, error, "admin_guest_gate_delete_failed");
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

router.get("/logs/export.xlsx", async (req, res) => {
  try {
    const buf = await exportChatObservations(req.query || {}, "xlsx");
    const payload = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", 'attachment; filename="chat_observations.xlsx"');
    return res.status(200).send(payload);
  } catch (error) {
    return adminErr(res, error, "admin_logs_export_xlsx_failed");
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
