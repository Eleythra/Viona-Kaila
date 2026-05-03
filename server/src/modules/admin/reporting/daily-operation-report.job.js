import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseOperationalRecipients } from "../../../services/whatsapp-operational-notification.service.js";
import { sendDailyOperationReportPdfTemplate } from "../../../services/whatsapp-daily-operation-report.service.js";
import { formatDailyReportBodyDateTr } from "./daily-operation-report-template.js";
import { buildDailyOperationReportPdfBuffer } from "./daily-operation-report.service.js";

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

/** HK → Teknik → Ön büro; her biri kendi PDF’i + alıcı listesi. */
const SEGMENTS = [
  {
    key: "hk",
    envKeys: ["WHATSAPP_DAILY_REPORT_HK_RECIPIENTS", "WHATSAPP_HK_RECIPIENTS"],
    fileSlug: "hk",
  },
  {
    key: "tech",
    envKeys: ["WHATSAPP_DAILY_REPORT_TECH_RECIPIENTS", "WHATSAPP_TECH_RECIPIENTS"],
    fileSlug: "tech",
  },
  {
    key: "front",
    envKeys: ["WHATSAPP_DAILY_REPORT_FRONT_RECIPIENTS", "WHATSAPP_FRONT_RECIPIENTS"],
    fileSlug: "front",
  },
];

/** Boş veya yok: üçü; `hk` veya `hk,tech,front` (Meta şablonu + alıcı hazır olmayan segmentleri dışarıda bırakmak için). */
function activeSegmentKeys() {
  const raw = String(process.env.DAILY_OPERATION_REPORT_SEGMENTS || "")
    .trim()
    .toLowerCase();
  if (!raw) return new Set(SEGMENTS.map((s) => s.key));
  const keys = new Set();
  for (const part of raw.split(/[\s,]+/)) {
    const p = part.trim();
    if (SEGMENTS.some((s) => s.key === p)) keys.add(p);
  }
  return keys.size ? keys : new Set(SEGMENTS.map((s) => s.key));
}

function allActiveSegmentsAlreadySent(ymd, active) {
  let any = false;
  for (const seg of SEGMENTS) {
    if (!active.has(seg.key)) continue;
    any = true;
    if (!existsSync(sentFlagPath(ymd, seg.fileSlug))) return false;
  }
  return any;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function betweenSendsMs() {
  const n = Number(process.env.DAILY_OPERATION_REPORT_BETWEEN_SENDS_MS);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 120_000) : 2000;
}

export function ymdTodayInHotelTz() {
  const tz = String(
    process.env.DAILY_OPERATION_REPORT_TZ || process.env.HOTEL_TIMEZONE || "Europe/Istanbul",
  ).trim();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value;
  const mo = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  if (!y || !mo || !d) return new Date().toISOString().slice(0, 10);
  return `${y}-${mo}-${d}`;
}

function sentFlagPath(ymd, fileSlug) {
  return path.join(process.cwd(), ".data", "daily-operation-report", `${ymd}.${fileSlug}.sent`);
}

function markSent(ymd, fileSlug) {
  const dir = path.join(process.cwd(), ".data", "daily-operation-report");
  mkdirSync(dir, { recursive: true });
  writeFileSync(sentFlagPath(ymd, fileSlug), `${new Date().toISOString()}\n`, "utf8");
}

const HK_FALLBACK_ENV_KEYS = ["WHATSAPP_DAILY_REPORT_HK_RECIPIENTS", "WHATSAPP_HK_RECIPIENTS"];

/** Teknik/ön büro listeleri boşken HK günlük listesine düş (aynı hatta 3 PDF). Kapatmak: DAILY_OPERATION_REPORT_FALLBACK_TO_HK_RECIPIENTS=0 */
function hkDailyRecipientsFallbackEnabled() {
  const v = String(process.env.DAILY_OPERATION_REPORT_FALLBACK_TO_HK_RECIPIENTS ?? "1")
    .trim()
    .toLowerCase();
  return v !== "0" && v !== "false" && v !== "no" && v !== "off";
}

/**
 * @param {string[]} envKeys
 * @param {"hk"|"tech"|"front"} segmentKey
 */
function recipientsForSegment(envKeys, segmentKey) {
  for (const k of envKeys) {
    const list = parseOperationalRecipients(process.env[k] || "");
    if (list.length) return { list, envKey: k, usedHkFallback: false };
  }
  const fallbackAll = parseOperationalRecipients(process.env.WHATSAPP_DAILY_REPORT_RECIPIENTS || "");
  if (fallbackAll.length) {
    return { list: fallbackAll, envKey: "WHATSAPP_DAILY_REPORT_RECIPIENTS", usedHkFallback: false };
  }
  if (
    (segmentKey === "tech" || segmentKey === "front") &&
    hkDailyRecipientsFallbackEnabled()
  ) {
    for (const k of HK_FALLBACK_ENV_KEYS) {
      const list = parseOperationalRecipients(process.env[k] || "");
      if (list.length) {
        return { list, envKey: k, usedHkFallback: true };
      }
    }
  }
  return { list: [], envKey: "", usedHkFallback: false };
}

/**
 * @param {{ ymd?: string, force?: boolean, source?: string }} opts
 */
export async function runDailyOperationReportJob(opts = {}) {
  const ymd = String(opts.ymd || "").trim() || ymdTodayInHotelTz();
  if (!YMD_RE.test(ymd)) {
    return { ok: false, error: "invalid_report_ymd", ymd };
  }

  const force = Boolean(opts.force);
  const source = String(opts.source || "").trim() || "-";
  const activeKeys = activeSegmentKeys();

  if (!force && allActiveSegmentsAlreadySent(ymd, activeKeys)) {
    console.info("[daily_operation_report] skipped reason=all_segments_sent ymd=%s source=%s", ymd, source);
    return { ok: true, skipped: true, reason: "all_segments_sent", ymd };
  }

  const hotelName = String(process.env.DAILY_OPERATION_REPORT_HOTEL_NAME || "Otel").trim() || "Otel";
  const reportDateText = formatDailyReportBodyDateTr(ymd);
  const pauseMs = betweenSendsMs();

  const results = [];
  let anyFailure = false;
  let pauseBeforeNextSend = false;

  for (const seg of SEGMENTS) {
    if (!activeKeys.has(seg.key)) {
      console.info(
        "[daily_operation_report] segment_skip reason=segment_disabled ymd=%s segment=%s source=%s (DAILY_OPERATION_REPORT_SEGMENTS)",
        ymd,
        seg.key,
        source,
      );
      results.push({ segment: seg.key, skipped: true, reason: "segment_disabled" });
      continue;
    }

    if (!force && existsSync(sentFlagPath(ymd, seg.fileSlug))) {
      const hint =
        source === "cron" || source === "external_cron_get"
          ? " (aynı gün manuel/API ile gönderildiyse bu normal; tekrar test için .data/daily-operation-report/*.sent silin)"
          : "";
      console.info(
        "[daily_operation_report] segment_skip reason=already_sent ymd=%s segment=%s source=%s%s",
        ymd,
        seg.key,
        source,
        hint,
      );
      results.push({ segment: seg.key, skipped: true, reason: "already_sent" });
      continue;
    }

    const { list: recipients, envKey, usedHkFallback } = recipientsForSegment(seg.envKeys, seg.key);
    if (usedHkFallback) {
      console.info(
        "[daily_operation_report] recipients_from_hk_fallback ymd=%s segment=%s env=%s source=%s",
        ymd,
        seg.key,
        envKey,
        source,
      );
    }
    if (!recipients.length) {
      console.warn(
        "[daily_operation_report] segment_skip reason=empty_recipients ymd=%s segment=%s tried_env=%s source=%s",
        ymd,
        seg.key,
        seg.envKeys.join("|"),
        source,
      );
      results.push({ segment: seg.key, skipped: true, reason: "empty_recipients" });
      continue;
    }

    if (pauseBeforeNextSend && pauseMs > 0) {
      await sleep(pauseMs);
    }

    const pdfBuffer = await buildDailyOperationReportPdfBuffer({
      ymd,
      hotelName,
      segment: seg.key,
    });
    const filename = `Gunluk-${seg.fileSlug}-${ymd}.pdf`;

    const wa = await sendDailyOperationReportPdfTemplate({
      pdfBuffer,
      filename,
      reportDateText,
      hotelName,
      recipients,
      segment: seg.key,
    });

    if (wa.skipped) {
      console.warn(
        "[daily_operation_report] whatsapp_skipped ymd=%s segment=%s reason=%s template=%s env=%s source=%s",
        ymd,
        seg.key,
        wa.reason || "-",
        wa.templateName || "-",
        envKey || "-",
        source,
      );
      results.push({ segment: seg.key, skipped: true, whatsapp: wa });
      anyFailure = true;
      pauseBeforeNextSend = true;
      continue;
    }
    if (!wa.ok) {
      const delivered = Number(wa.deliveredCount) || 0;
      const partialOk = wa.reason === "partial_failure" && delivered > 0;
      if (!partialOk) {
        console.warn(
          "[daily_operation_report] whatsapp_failed ymd=%s segment=%s template=%s reason=%s delivered=%s/%s body_params=%s source=%s",
          ymd,
          seg.key,
          wa.templateName || "-",
          wa.reason || "-",
          wa.deliveredCount ?? 0,
          recipients.length,
          wa.bodyParamCount ?? "-",
          source,
        );
        results.push({ segment: seg.key, ok: false, whatsapp: wa });
        anyFailure = true;
        pauseBeforeNextSend = true;
        continue;
      }
      console.warn(
        "[daily_operation_report] whatsapp_partial ymd=%s segment=%s template=%s delivered=%d/%s body_params=%s source=%s (mark_sent idempotency; kalan numaralar için ertesi gün veya force)",
        ymd,
        seg.key,
        wa.templateName || "-",
        delivered,
        recipients.length,
        wa.bodyParamCount ?? "-",
        source,
      );
      anyFailure = true;
    }

    markSent(ymd, seg.fileSlug);
    console.info(
      "[daily_operation_report] segment_done ymd=%s segment=%s delivered=%d/%s body_params=%s template=%s env=%s source=%s",
      ymd,
      seg.key,
      wa.deliveredCount ?? 0,
      recipients.length,
      wa.bodyParamCount ?? "-",
      wa.templateName || "-",
      envKey || "-",
      source,
    );
    results.push({ segment: seg.key, ok: Boolean(wa.ok), whatsapp: wa });
    pauseBeforeNextSend = true;
  }

  const hadDelivery = results.some((r) => r.ok);
  const allNoRecipients =
    results.length > 0 &&
    results.every(
      (r) =>
        r.reason === "empty_recipients" ||
        r.reason === "already_sent" ||
        r.reason === "segment_disabled",
    );

  if (!hadDelivery && allNoRecipients && !results.some((r) => r.reason === "already_sent")) {
    return {
      ok: false,
      ymd,
      source,
      reason: "no_recipients_configured",
      segments: results,
      betweenSendsMs: pauseMs,
    };
  }

  return {
    ok: !anyFailure,
    ymd,
    source,
    segments: results,
    betweenSendsMs: pauseMs,
  };
}
