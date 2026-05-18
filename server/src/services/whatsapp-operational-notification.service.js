/**
 * Operasyon kayıtları (arıza / istek / şikayet / misafir bildirimi) Supabase’e yazıldıktan sonra tetiklenen
 * WhatsApp Cloud API şablon bildirimi (Meta Graph: access token + Phone number ID + alıcı numaraları).
 *
 * Meta’da onaylı şablon gövdeleri (gövde parametreleri sırası kodla uyumlu olmalı):
 *
 * Misafir bildirimi: {{1}} ad, {{2}} oda, {{3}} kategori, {{4}} alt kategori, {{5}} tarih, {{6}} saat, {{7}} açıklama.
 * Şikayet: {{1}}–{{6}} (ad, oda, şikayet kategorisi, tarih, saat, açıklama).
 * İstek (HK): {{1}}–{{8}} (ad, oda, talep kategorisi, talep türü, adet, tarih, saat, açıklama — açıklama boş olabilir).
 * Teknik (arıza): varsayılan {{1}}–{{7}} (ad, oda, talep kategorisi, talep türü, tarih, saat, açıklama; Meta gövdesinde «Açıklama notu: {{7}} olarak iletildi»).
 *   Eski 8 parametreli arıza şablonu için `WHATSAPP_CLOUD_FAULT_PARAM_COUNT=8`.
 *
 * Yönlendirme: arıza → WHATSAPP_TECH_RECIPIENTS | istek → WHATSAPP_HK_RECIPIENTS |
 * şikayet + misafir bildirimi + geç çıkış → WHATSAPP_FRONT_RECIPIENTS (ön büro).
 *
 * Teknik bildirim: HK isteği 8 parametre (`viona_request_notification`); arıza 7 parametre (`viona_issue_notification`, adet yok). Meta’da eski 8 parametreli arıza şablonu varsa `WHATSAPP_CLOUD_FAULT_PARAM_COUNT=8`.
 *
 * Meta «Visit Website / Dynamic URL» butonu: şablonda Base URL (örn. https://viona-admin.eleythra.com/admin/) tanımlı;
 * gövde aynı kalır. Env ile açılır; suffix sunucu üretir (şablonda URL butonu index 0 ile uyumlu olmalı):
 * - İstek: `WHATSAPP_HK_PANEL_URL_BUTTON=1` → `ops-hk.html?id=<uuid>` (ops-light: yalnızca o kayıt kartı; `?id=` adres çubuğunda kalır, yenilemede aynı kayıt)
 * - Arıza: `WHATSAPP_TECH_PANEL_URL_BUTTON=1` → `ops-tech.html?id=<uuid>` (aynı mantık)
 * - Ön büro (şikâyet / misafir bildirimi / geç çıkış): `WHATSAPP_FRONT_PANEL_URL_BUTTON=1`
 *   → `ops-front.html?type=<complaint|guest_notification|late_checkout>&id=<uuid>` (aynı mantık; `type`+`id` kalır)
 *
 * Env: WHATSAPP_ACCESS_TOKEN (veya WHATSAPP_CLOUD_ACCESS_TOKEN), WHATSAPP_PHONE_NUMBER_ID,
 * isteğe bağlı WHATSAPP_BUSINESS_ACCOUNT_ID (referans), WHATSAPP_TEMPLATE_* ile şablon adı override.
 */

import {
  formatInstantHotelDdMmYyyy,
  formatInstantHotelHhMm,
  formatIsoCalendarYmdAsDdMmYyyy,
} from "../lib/hotel-calendar-range.js";
import {
  coerceOperationalPayload,
  buildOperationalWhatsappTemplateBodyParams,
  operationalCategoryLabelTr,
  operationalGuestNotificationMainTr,
} from "./operational-template-format.js";
import { isOperationalRecordType } from "./operational-notification-routing.service.js";

const TEMPLATE_FAULT = "viona_issue_notification";
const TEMPLATE_REQUEST = "viona_request_notification";
const TEMPLATE_COMPLAINT = "viona_complaint_notification";
const DEFAULT_TEMPLATE_GUEST_RELATION = "viona_guest_relation_notification";

function resolveFaultTemplateName() {
  return String(process.env.WHATSAPP_TEMPLATE_FAULT || "").trim() || TEMPLATE_FAULT;
}
function resolveRequestTemplateName() {
  return String(process.env.WHATSAPP_TEMPLATE_REQUEST || "").trim() || TEMPLATE_REQUEST;
}
function resolveComplaintTemplateName() {
  return String(process.env.WHATSAPP_TEMPLATE_COMPLAINT || "").trim() || TEMPLATE_COMPLAINT;
}

const PARAM_MAX = 900;

const HK_PANEL_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Meta şablon «Dynamic URL» suffix: base URL’e eklenir. Tam site adresi üretilmez.
 * @param {string} recordId — guest_requests.id
 * @returns {string|null}
 */
export function buildHkOpsPanelUrlSuffix(recordId) {
  const id = String(recordId ?? "").trim().toLowerCase();
  if (!id || !HK_PANEL_UUID_RE.test(id)) return null;
  return `ops-hk.html?id=${id}`;
}

/** Arıza kaydı → teknik operasyon paneli (guest_faults.id). */
export function buildTechOpsPanelUrlSuffix(recordId) {
  const id = String(recordId ?? "").trim().toLowerCase();
  if (!id || !HK_PANEL_UUID_RE.test(id)) return null;
  return `ops-tech.html?id=${id}`;
}

const FRONT_PANEL_TYPES = new Set(["complaint", "guest_notification", "late_checkout"]);

/** Ön büro kaydı → `type` + `id` ile panel. */
export function buildFrontOpsPanelUrlSuffix(recordType, recordId) {
  const t = String(recordType ?? "")
    .trim()
    .toLowerCase();
  if (!FRONT_PANEL_TYPES.has(t)) return null;
  const id = String(recordId ?? "").trim().toLowerCase();
  if (!id || !HK_PANEL_UUID_RE.test(id)) return null;
  return `ops-front.html?type=${encodeURIComponent(t)}&id=${id}`;
}

function ellipsisEmDashToHyphen(s) {
  const t = String(s ?? "");
  return t === "—" ? "-" : t;
}

function categoryLabel(kind, cat) {
  return clip(ellipsisEmDashToHyphen(operationalCategoryLabelTr(kind, cat)));
}

function guestNotificationMainCategoryLabel(catId) {
  return clip(ellipsisEmDashToHyphen(operationalGuestNotificationMainTr(catId)));
}

function dash(v) {
  const s = String(v ?? "").trim();
  return s.length ? s : "-";
}

function clip(s) {
  const t = String(s ?? "");
  if (t.length <= PARAM_MAX) return t;
  return t.slice(0, PARAM_MAX - 1) + "…";
}

/**
 * Bekliyor cron tekrarı (`resend`): aynı şablon + son parametreye kısa hatırlatma metni (Meta’da ek şablon gerekmez).
 * Kapatmak: OPERATIONAL_PENDING_REMINDER_APPEND_SUFFIX=0
 */
function appendOperationalReminderSuffix(bodyParams, options) {
  const params = Array.isArray(bodyParams) ? bodyParams : [];
  if (!options?.resend || params.length === 0) return params;
  const rawOff = String(process.env.OPERATIONAL_PENDING_REMINDER_APPEND_SUFFIX ?? "1").trim().toLowerCase();
  if (rawOff === "0" || rawOff === "false" || rawOff === "off") return params;
  const suffix = String(
    process.env.OPERATIONAL_PENDING_REMINDER_SUFFIX_TR ??
      "\n\n[HATIRLATMA] Kayıt hâlâ «Bekliyor» durumunda.",
  ).trim();
  if (!suffix) return params;
  const out = params.slice();
  const i = out.length - 1;
  out[i] = clip(String(out[i] ?? "") + suffix);
  return out;
}

/** Misafir kaydı anı — şablonda UTC yerine otel saat diliminde gösterim için. */
function operationalEventInstant(payload) {
  const raw = payload?.submittedAt ?? payload?.submitted_at;
  if (raw != null && String(raw).trim()) {
    const d = new Date(raw);
    if (Number.isFinite(d.getTime())) return d;
  }
  return new Date();
}

function normalizeGuestType(payload, intentFallback) {
  const raw = String(payload?.type || "").toLowerCase();
  if (
    raw === "fault" ||
    raw === "request" ||
    raw === "complaint" ||
    raw === "guest_notification" ||
    raw === "late_checkout"
  )
    return raw;
  const i = String(intentFallback || "").toLowerCase();
  if (i === "fault_report") return "fault";
  if (i === "request") return "request";
  if (i === "complaint") return "complaint";
  if (i === "guest_notification") return "guest_notification";
  if (i === "late_checkout") return "late_checkout";
  return raw || "unknown";
}

/**
 * Virgül / noktalı virgül / satır sonu ile ayrılmış numaralar; segment trim; API için E.164 rakamları.
 */
export function parseOperationalRecipients(raw) {
  if (raw == null) return [];
  const text = String(raw).trim();
  if (!text) return [];
  const seen = new Set();
  const out = [];
  for (const segment of text.split(/[,;\n\r]+/)) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length >= 10 && digits.length <= 15) {
      if (!seen.has(digits)) {
        seen.add(digits);
        out.push(digits);
      }
    }
  }
  return out;
}

export const parseWhatsappRecipientList = parseOperationalRecipients;

export function recipientsForGuestPayload(payload, intentFallback = "unknown") {
  const pt = String(payload?.type || "").toLowerCase();
  if (pt === "fault") return parseOperationalRecipients(process.env.WHATSAPP_TECH_RECIPIENTS || "");
  if (pt === "request") return parseOperationalRecipients(process.env.WHATSAPP_HK_RECIPIENTS || "");
  /* Şikayet + misafir bildirimi + geç çıkış: yalnızca ön büro numaraları */
  if (pt === "complaint" || pt === "guest_notification" || pt === "late_checkout") {
    return parseOperationalRecipients(process.env.WHATSAPP_FRONT_RECIPIENTS || "");
  }
  const t = normalizeGuestType(payload, intentFallback);
  if (t === "fault") return parseOperationalRecipients(process.env.WHATSAPP_TECH_RECIPIENTS || "");
  if (t === "request") return parseOperationalRecipients(process.env.WHATSAPP_HK_RECIPIENTS || "");
  if (t === "complaint" || t === "guest_notification" || t === "late_checkout") {
    return parseOperationalRecipients(process.env.WHATSAPP_FRONT_RECIPIENTS || "");
  }
  return [];
}

function buildHkStyleRequestOrFaultBodyParams(recordType, payload, eventInstant) {
  return buildOperationalWhatsappTemplateBodyParams(recordType, payload, eventInstant, {
    paramMax: PARAM_MAX,
  });
}

function buildComplaintBodyParams(payload, eventInstant) {
  return [
    clip(dash(payload.name)),
    clip(dash(payload.room)),
    categoryLabel("complaint", payload.category),
    dash(formatInstantHotelDdMmYyyy(eventInstant)),
    dash(formatInstantHotelHhMm(eventInstant)),
    clip(dash(payload.description)),
  ];
}

/**
 * Meta şablon sırası: {{1}} ad, {{2}} oda, {{3}} üst kategori, {{4}} alt kategori, {{5}} tarih, {{6}} saat, {{7}} açıklama.
 * Genel bildirimlerde {{5}}/{{6}} kayıt anı; geç çıkışta istenen çıkış tarihi/saati.
 */
function buildGuestNotificationBodyParams(payload, eventInstant) {
  const cat = String(payload.category || "").trim();
  return [
    clip(dash(payload.name)),
    clip(dash(payload.room)),
    guestNotificationMainCategoryLabel(cat),
    categoryLabel("guest_notification", cat),
    dash(formatInstantHotelDdMmYyyy(eventInstant)),
    dash(formatInstantHotelHhMm(eventInstant)),
    clip(dash(payload.description)),
  ];
}

function buildLateCheckoutBodyParams(payload) {
  const rawD = String(payload.checkoutDate || payload.details?.checkoutDate || "").trim();
  const rawT = String(payload.checkoutTime || payload.details?.checkoutTime || "").trim();
  const dateStr = formatIsoCalendarYmdAsDdMmYyyy(rawD) || dash(rawD);
  return [
    clip(dash(payload.name)),
    clip(dash(payload.room)),
    clip("Geç çıkış"),
    clip("Talep edilen çıkış"),
    dash(dateStr),
    dash(rawT || "-"),
    clip(dash(payload.description)),
  ];
}

export function templateLanguageCode() {
  return (
    String(process.env.WHATSAPP_TEMPLATE_LANGUAGE || process.env.WHATSAPP_OPERATIONAL_TEMPLATE_LANGUAGE || "tr").trim() ||
    "tr"
  );
}

/** Meta Business’ta onaylı şablon adı (misafir bildirimi + geç çıkış, 7 parametre). */
function resolveGuestRelationTemplateName() {
  const raw = String(
    process.env.WHATSAPP_GUEST_RELATION_TEMPLATE_NAME ||
      process.env.WHATSAPP_GUEST_NOTIFICATION_TEMPLATE ||
      "",
  ).trim();
  return raw || DEFAULT_TEMPLATE_GUEST_RELATION;
}

/** .env’de tırnak / boşluk / yanlış satır sonu token’ı bozmasın; iki anahtar adı desteklenir. */
function normalizeSecretEnv(raw) {
  let s = String(raw ?? "").trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s.replace(/\s+/g, "");
}

/**
 * @returns {{ token: string, envKey: string }}
 */
export function resolveWhatsappAccessToken() {
  const keys = ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_CLOUD_ACCESS_TOKEN"];
  for (const k of keys) {
    const t = normalizeSecretEnv(process.env[k]);
    if (t) return { token: t, envKey: k };
  }
  return { token: "", envKey: "" };
}

export function resolveWhatsappPhoneNumberId() {
  return String(process.env.WHATSAPP_PHONE_NUMBER_ID ?? "")
    .trim()
    .replace(/\s+/g, "");
}

/** Cloud API `POST .../messages` tam URL; phone ID yoksa boş. */
export function buildWhatsappGraphMessagesUrl() {
  const phoneNumberId = resolveWhatsappPhoneNumberId();
  if (!phoneNumberId) return "";
  const rawGraphVer = String(process.env.WHATSAPP_GRAPH_API_VERSION || "v21.0").trim();
  const graphVer = rawGraphVer.startsWith("v") ? rawGraphVer : `v${rawGraphVer}`;
  return `https://graph.facebook.com/${graphVer}/${phoneNumberId}/messages`;
}

function dailyReportWhatsappBodyParamCountHealth() {
  const raw = String(
    process.env.DAILY_OPERATION_REPORT_WHATSAPP_BODY_PARAMS ||
      process.env.WHATSAPP_DAILY_OPERATION_BODY_PARAM_COUNT ||
      "2",
  )
    .trim()
    .toLowerCase();
  if (raw === "3" || raw === "three" || raw === "dynamic") return 3;
  return 2;
}

function dailyReportEffectiveTemplateNamesHealth() {
  const def = { hk: "hk_operasyon", tech: "teknik_operasyon", front: "front_operasyon" };
  return {
    hk: String(process.env.WHATSAPP_TEMPLATE_DAILY_OPERATION_HK || "").trim() || def.hk,
    tech: String(process.env.WHATSAPP_TEMPLATE_DAILY_OPERATION_TECH || "").trim() || def.tech,
    front: String(process.env.WHATSAPP_TEMPLATE_DAILY_OPERATION_FRONT || "").trim() || def.front,
  };
}

/** /api/health: anahtar sızdırmaz; ön büro / HK / teknik alıcı sayıları. */
export function getWhatsappOperationalHealthSummary() {
  const { token } = resolveWhatsappAccessToken();
  const phoneId = resolveWhatsappPhoneNumberId();
  const techN = parseOperationalRecipients(process.env.WHATSAPP_TECH_RECIPIENTS || "").length;
  const hkN = parseOperationalRecipients(process.env.WHATSAPP_HK_RECIPIENTS || "").length;
  const frontN = parseOperationalRecipients(process.env.WHATSAPP_FRONT_RECIPIENTS || "").length;
  return {
    mode: "cloud",
    accessTokenConfigured: Boolean(token),
    phoneNumberIdConfigured: Boolean(phoneId),
    whatsappBusinessAccountIdConfigured: Boolean(
      String(process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "").trim(),
    ),
    cloudApiSendReady: Boolean(token && phoneId),
    cloudRecipientCounts: {
      tech: techN,
      hk: hkN,
      front: frontN,
    },
    /** Şikayet + misafir bildirimi + geç çıkış → WHATSAPP_FRONT_RECIPIENTS */
    guestRelationRecipientCount: frontN,
    /** Günlük PDF: HK / teknik / ön büro (önce DAILY_REPORT_* sonra operasyon listeleri; yedek: WHATSAPP_DAILY_REPORT_RECIPIENTS). */
    dailyReportRecipientCounts: {
      hk: parseOperationalRecipients(
        process.env.WHATSAPP_DAILY_REPORT_HK_RECIPIENTS || process.env.WHATSAPP_HK_RECIPIENTS || "",
      ).length,
      tech: parseOperationalRecipients(
        process.env.WHATSAPP_DAILY_REPORT_TECH_RECIPIENTS || process.env.WHATSAPP_TECH_RECIPIENTS || "",
      ).length,
      front: parseOperationalRecipients(
        process.env.WHATSAPP_DAILY_REPORT_FRONT_RECIPIENTS || process.env.WHATSAPP_FRONT_RECIPIENTS || "",
      ).length,
      fallbackAll: parseOperationalRecipients(process.env.WHATSAPP_DAILY_REPORT_RECIPIENTS || "").length,
    },
    /** Günlük PDF WhatsApp: Meta gövde parametre sayısı (2=klasik; 3=dinamik departman) + çözümlenen şablon adları. */
    dailyReportWhatsapp: {
      bodyParamCount: dailyReportWhatsappBodyParamCountHealth(),
      effectiveTemplateNames: dailyReportEffectiveTemplateNamesHealth(),
      segmentsEnv: String(process.env.DAILY_OPERATION_REPORT_SEGMENTS || "").trim() || "hk,tech,front (default)",
      reportTz: String(
        process.env.DAILY_OPERATION_REPORT_TZ || process.env.HOTEL_TIMEZONE || "Europe/Istanbul",
      ).trim(),
      hkFallbackToHkRecipientsEnabled: (() => {
        const v = String(process.env.DAILY_OPERATION_REPORT_FALLBACK_TO_HK_RECIPIENTS ?? "1")
          .trim()
          .toLowerCase();
        return v !== "0" && v !== "false" && v !== "no" && v !== "off";
      })(),
    },
    /** Meta şablonunda «Dynamic URL» butonu env ile açıksa (suffix sunucu üretir). */
    panelUrlButtons: {
      hk: String(process.env.WHATSAPP_HK_PANEL_URL_BUTTON || "").trim() === "1",
      tech: String(process.env.WHATSAPP_TECH_PANEL_URL_BUTTON || "").trim() === "1",
      front: String(process.env.WHATSAPP_FRONT_PANEL_URL_BUTTON || "").trim() === "1",
    },
  };
}

export function parseMetaError(raw) {
  let detail = String(raw || "").slice(0, 1200);
  let code = "";
  let sub = "";
  let msg = "";
  try {
    const j = JSON.parse(raw);
    const e = j?.error;
    if (e && typeof e === "object") {
      msg = String(e.message || "");
      code = e.code != null ? String(e.code) : "";
      sub = e.error_subcode != null ? String(e.error_subcode) : "";
      detail = [
        msg,
        e.error_user_title,
        e.error_user_msg,
        code ? `code=${code}` : "",
        sub ? `subcode=${sub}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
      if (code === "190" || /session has expired|invalid oauth|logged out/i.test(msg)) {
        detail +=
          " | token_invalid: Meta Business → System Users → kalıcı token (User/Graph Explorer token veya çıkış yapılmış oturum 190/467 verir)";
      }
      if (/template/i.test(msg) && /invalid|not found|mismatch/i.test(msg)) {
        detail += " | template_error: Manager adı/dil/parametre sayısı";
      }
      if (/permission|denied|forbidden/i.test(msg)) {
        detail += " | permission_error";
      }
      if (/phone number|recipient/i.test(msg)) {
        detail += " | invalid_recipient_or_not_onboarded";
      }
    }
  } catch {
    /* ham metin */
  }
  return { detail, code, sub, msg };
}

/**
 * Kayıt başarıyla oluşturulduktan sonra çağrılır (createGuestRequest içinden).
 * @param {object} payload — normalize edilmiş misafir kaydı
 * @param {string} [intentFallback]
 * @param {{ recordId?: string, resend?: boolean }} [options]
 * @returns {Promise<{ ok: boolean, skipped?: boolean, channel: string, reason?: string, recipients?: number, deliveredCount?: number }>} — erken çıkışlar `skipped`/`reason` ile döner; tüm numaralar hata verirse `ok: false`, `reason: all_recipients_failed`.
 */
export async function sendOperationalWhatsappNotification(payload, intentFallback = "unknown", options = {}) {
  const recordType = normalizeGuestType(payload, intentFallback);
  payload = coerceOperationalPayload(recordType, payload);
  const { token, envKey: tokenEnvKey } = resolveWhatsappAccessToken();
  const phoneNumberId = resolveWhatsappPhoneNumberId();

  if (!token || !phoneNumberId) {
    console.warn(
      "[whatsapp_ops] notify_skipped reason=missing_credentials record_type=%s detail=set_WHATSAPP_ACCESS_TOKEN_or_WHATSAPP_CLOUD_ACCESS_TOKEN_and_WHATSAPP_PHONE_NUMBER_ID",
      recordType,
    );
    return { ok: false, skipped: true, channel: "cloud", reason: "missing_credentials" };
  }

  if (!isOperationalRecordType(recordType)) {
    console.info("[whatsapp_ops] notify_skipped reason=not_operational_type record_type=%s", recordType);
    return { ok: false, skipped: true, channel: "cloud", reason: "not_operational_type" };
  }

  let templateName = "";
  if (recordType === "fault") templateName = resolveFaultTemplateName();
  else if (recordType === "request") templateName = resolveRequestTemplateName();
  else if (recordType === "complaint") templateName = resolveComplaintTemplateName();
  else templateName = resolveGuestRelationTemplateName();

  const recipients = recipientsForGuestPayload(payload, intentFallback);
  if (!recipients.length) {
    const listName =
      recordType === "fault"
        ? "WHATSAPP_TECH_RECIPIENTS"
        : recordType === "request"
          ? "WHATSAPP_HK_RECIPIENTS"
          : "WHATSAPP_FRONT_RECIPIENTS";
    console.warn(
      "[whatsapp_ops] notify_skipped reason=empty_recipient_list record_type=%s template=%s env_list=%s (virgülle numara ekleyin)",
      recordType,
      templateName,
      listName,
    );
    return { ok: false, skipped: true, channel: "cloud", reason: "empty_recipient_list" };
  }

  const eventInstant = operationalEventInstant(payload);
  let bodyParams = [];
  if (recordType === "fault" || recordType === "request") {
    bodyParams = buildHkStyleRequestOrFaultBodyParams(recordType, payload, eventInstant);
  } else if (recordType === "complaint") bodyParams = buildComplaintBodyParams(payload, eventInstant);
  else if (recordType === "late_checkout") bodyParams = buildLateCheckoutBodyParams(payload);
  else bodyParams = buildGuestNotificationBodyParams(payload, eventInstant);

  bodyParams = appendOperationalReminderSuffix(bodyParams, options);

  const graphUrl = buildWhatsappGraphMessagesUrl();
  const lang = templateLanguageCode();

  console.info(
    "[whatsapp_ops] send_start record_type=%s template=%s language=%s reminder=%s recipient_count=%d recipients=%s param_count=%d hotel_tz=%s waba_env_set=%s token_env=%s token_len=%d",
    recordType,
    templateName,
    lang,
    options?.resend ? "1" : "0",
    recipients.length,
    recipients.join(","),
    bodyParams.length,
    String(process.env.HOTEL_TIMEZONE || process.env.DAILY_OPERATION_REPORT_TZ || "Europe/Istanbul").trim(),
    process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ? "yes" : "no",
    tokenEnvKey || "-",
    token.length,
  );

  const bodyParameters = bodyParams.map((text, idx, arr) => {
    const isLast = idx === arr.length - 1;
    const allowBlankNote =
      isLast && (recordType === "fault" || recordType === "request") && arr.length === 8;
    if (allowBlankNote) return { type: "text", text: clip(String(text ?? "").trim()) };
    return { type: "text", text: dash(text) };
  });

  const components = [{ type: "body", parameters: bodyParameters }];
  let panelSuffix = null;
  let panelButtonOn = false;
  if (recordType === "request") {
    panelSuffix = buildHkOpsPanelUrlSuffix(options.recordId);
    panelButtonOn = String(process.env.WHATSAPP_HK_PANEL_URL_BUTTON || "").trim() === "1";
  } else if (recordType === "fault") {
    panelSuffix = buildTechOpsPanelUrlSuffix(options.recordId);
    panelButtonOn = String(process.env.WHATSAPP_TECH_PANEL_URL_BUTTON || "").trim() === "1";
  } else if (FRONT_PANEL_TYPES.has(recordType)) {
    panelSuffix = buildFrontOpsPanelUrlSuffix(recordType, options.recordId);
    panelButtonOn = String(process.env.WHATSAPP_FRONT_PANEL_URL_BUTTON || "").trim() === "1";
  }
  if (panelSuffix && panelButtonOn) {
    components.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [{ type: "text", text: panelSuffix }],
    });
  }

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
      console.warn(
        "[whatsapp_ops] send_error record_type=%s template=%s to=%s error=%s",
        recordType,
        templateName,
        to,
        err?.message || err,
      );
      continue;
    }

    if (res.ok) {
      deliveredCount += 1;
      let msgId = "";
      try {
        const j = JSON.parse(raw);
        msgId = j?.messages?.[0]?.id || "";
      } catch {
        /* ignore */
      }
      console.info(
        "[whatsapp_ops] send_ok record_type=%s template=%s to=%s http_status=%s message_id=%s",
        recordType,
        templateName,
        to,
        res.status,
        msgId || "-",
      );
      continue;
    }

    const { detail, code, sub, msg } = parseMetaError(raw);
    console.warn(
      "[whatsapp_ops] send_failed record_type=%s template=%s to=%s http_status=%s error_code=%s error_subcode=%s error_message=%s meta_response=%s",
      recordType,
      templateName,
      to,
      res.status,
      code || "-",
      sub || "-",
      (msg || "-").slice(0, 500),
      detail.slice(0, 1000),
    );
  }
  if (deliveredCount === 0) {
    return {
      ok: false,
      skipped: false,
      channel: "cloud",
      reason: "all_recipients_failed",
      recipients: recipients.length,
    };
  }
  return {
    ok: true,
    channel: "cloud",
    recipients: recipients.length,
    deliveredCount,
  };
}

/** Geriye dönük uyum: önceki import adı. */
export const sendWhatsappOperationalNotification = sendOperationalWhatsappNotification;
