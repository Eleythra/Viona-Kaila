/**
 * Günlük operasyon PDF’i: Graph `/{phone-id}/media` yükleme + departman şablonu
 * (`daily_operation_report_hk` | `daily_operation_report_tech` | `daily_operation_report_front`).
 * Belge başlığı: PDF; gövde {{1}} tarih, {{2}} tesis adı (DAILY_OPERATION_REPORT_HOTEL_NAME).
 */

import {
  buildWhatsappGraphMessagesUrl,
  parseMetaError,
  resolveWhatsappAccessToken,
  resolveWhatsappPhoneNumberId,
  templateLanguageCode,
} from "./whatsapp-operational-notification.service.js";

const PARAM_MAX = 900;

function buildWhatsappGraphMediaUrl() {
  const phoneNumberId = resolveWhatsappPhoneNumberId();
  if (!phoneNumberId) return "";
  const rawGraphVer = String(process.env.WHATSAPP_GRAPH_API_VERSION || "v21.0").trim();
  const graphVer = rawGraphVer.startsWith("v") ? rawGraphVer : `v${rawGraphVer}`;
  return `https://graph.facebook.com/${graphVer}/${phoneNumberId}/media`;
}

const DEFAULT_TEMPLATE_BY_SEGMENT = {
  hk: "daily_operation_report_hk",
  tech: "daily_operation_report_tech",
  front: "daily_operation_report_front",
};

const TEMPLATE_ENV_BY_SEGMENT = {
  hk: "WHATSAPP_TEMPLATE_DAILY_OPERATION_HK",
  tech: "WHATSAPP_TEMPLATE_DAILY_OPERATION_TECH",
  front: "WHATSAPP_TEMPLATE_DAILY_OPERATION_FRONT",
};

function resolveDailyReportTemplateName(segment) {
  const s = String(segment || "").trim();
  if (!["hk", "tech", "front"].includes(s)) {
    throw new Error("invalid_daily_report_whatsapp_segment");
  }
  const envKey = TEMPLATE_ENV_BY_SEGMENT[s];
  const fromEnv = String(process.env[envKey] || "").trim();
  if (fromEnv) return fromEnv;
  return DEFAULT_TEMPLATE_BY_SEGMENT[s];
}

function clipText(t, max = PARAM_MAX) {
  const s = String(t ?? "").trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

async function uploadPdfMedia(token, pdfBuffer, filename) {
  const url = buildWhatsappGraphMediaUrl();
  if (!url) throw new Error("missing_whatsapp_phone_number_id");

  const blob = new Blob([pdfBuffer], { type: "application/pdf" });
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("file", blob, filename);

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const raw = await res.text().catch(() => "");
  if (!res.ok) {
    const { detail } = parseMetaError(raw);
    throw new Error(`whatsapp_media_upload http=${res.status} ${detail.slice(0, 800)}`);
  }
  let id = "";
  try {
    id = String(JSON.parse(raw).id || "").trim();
  } catch {
    /* ignore */
  }
  if (!id) throw new Error("whatsapp_media_upload_no_id");
  return id;
}

/**
 * @param {{ pdfBuffer: Buffer, filename: string, reportDateText: string, hotelName: string, recipients: string[], segment: 'hk'|'tech'|'front' }} opts
 * @returns {Promise<{ ok: boolean, skipped?: boolean, reason?: string, deliveredCount?: number, recipients?: number, mediaId?: string, templateName?: string }>}
 */
export async function sendDailyOperationReportPdfTemplate(opts = {}) {
  const { token, envKey: tokenEnvKey } = resolveWhatsappAccessToken();
  const phoneNumberId = resolveWhatsappPhoneNumberId();
  const recipients = Array.isArray(opts.recipients) ? opts.recipients.filter(Boolean) : [];
  const segment = String(opts.segment || "").trim();

  if (!["hk", "tech", "front"].includes(segment)) {
    console.warn("[whatsapp_daily_report] skipped reason=invalid_segment segment=%s", segment || "-");
    return { ok: false, skipped: true, reason: "invalid_segment" };
  }

  if (!token || !phoneNumberId) {
    console.warn(
      "[whatsapp_daily_report] skipped reason=missing_credentials token_env=%s",
      tokenEnvKey || "-",
    );
    return { ok: false, skipped: true, reason: "missing_credentials" };
  }
  if (!recipients.length) {
    console.warn("[whatsapp_daily_report] skipped reason=empty_recipients env=WHATSAPP_DAILY_REPORT_RECIPIENTS");
    return { ok: false, skipped: true, reason: "empty_recipients" };
  }

  const pdfBuffer = opts.pdfBuffer;
  if (!pdfBuffer || !pdfBuffer.length) {
    return { ok: false, skipped: true, reason: "empty_pdf" };
  }

  const filename = String(opts.filename || "rapor.pdf").trim() || "rapor.pdf";
  const reportDateText = clipText(opts.reportDateText || "—", 900);
  const hotelName = clipText(opts.hotelName || "—", 900);
  const templateName = resolveDailyReportTemplateName(segment);
  const lang = templateLanguageCode();
  const graphUrl = buildWhatsappGraphMessagesUrl();

  let mediaId = "";
  try {
    mediaId = await uploadPdfMedia(token, pdfBuffer, filename);
  } catch (e) {
    console.warn("[whatsapp_daily_report] media_upload_failed error=%s", e?.message || e);
    return { ok: false, reason: "media_upload_failed", detail: String(e?.message || e) };
  }

  const components = [
    {
      type: "header",
      parameters: [
        {
          type: "document",
          document: { id: mediaId, filename: clipText(filename, 240) },
        },
      ],
    },
    {
      type: "body",
      parameters: [
        { type: "text", text: reportDateText },
        { type: "text", text: hotelName },
      ],
    },
  ];

  console.info(
    "[whatsapp_daily_report] send_start segment=%s template=%s language=%s recipient_count=%d media_id=%s",
    segment,
    templateName,
    lang,
    recipients.length,
    mediaId,
  );

  let deliveredCount = 0;
  for (const to of recipients) {
    let res;
    let raw = "";
    try {
      res = await fetch(graphUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: templateName,
            language: { code: lang },
            components,
          },
        }),
      });
      raw = await res.text().catch(() => "");
    } catch (err) {
      console.warn("[whatsapp_daily_report] send_error to=%s error=%s", to, err?.message || err);
      continue;
    }

    if (res.ok) {
      deliveredCount += 1;
      console.info("[whatsapp_daily_report] send_ok to=%s http_status=%s", to, res.status);
      continue;
    }

    const { detail, code, msg } = parseMetaError(raw);
    console.warn(
      "[whatsapp_daily_report] send_failed to=%s http_status=%s error_code=%s msg=%s meta=%s",
      to,
      res.status,
      code || "-",
      String(msg || "-").slice(0, 200),
      detail.slice(0, 900),
    );
  }

  if (deliveredCount === 0) {
    return {
      ok: false,
      reason: "all_recipients_failed",
      recipients: recipients.length,
      mediaId,
      templateName,
    };
  }
  if (deliveredCount < recipients.length) {
    return {
      ok: false,
      reason: "partial_failure",
      recipients: recipients.length,
      deliveredCount,
      mediaId,
      templateName,
    };
  }

  return { ok: true, recipients: recipients.length, deliveredCount, mediaId, templateName };
}
