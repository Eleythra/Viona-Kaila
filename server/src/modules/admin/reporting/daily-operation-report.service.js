import {
  getFrontOfficeOperationSummary,
  getGuestBucketTypeSummary,
  listAdminBucket,
} from "../admin.service.js";
import { buildDailyOperationReportHtml } from "./daily-operation-report-template.js";
import { renderDailyOperationPdfBuffer } from "./pdf.service.js";

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

/** @typedef {'hk' | 'tech' | 'front'} DailyReportSegment */

function pad2(n) {
  return String(n).padStart(2, "0");
}

/**
 * Otel takvim günü `YYYY-MM-DD` için `submitted_at` aralığı (üst sınır exclusive).
 * `Europe/Istanbul` için yerel gece yarısı +03:00; diğer IANA dilimleri için UTC takvim gününe düşer.
 */
export function hotelCalendarDaySubmittedAtRange(query = {}) {
  const ymd = String(query.ymd || "").trim();
  if (!YMD_RE.test(ymd)) throw new Error("invalid_report_ymd");

  const tz = String(
    query.tz || process.env.DAILY_OPERATION_REPORT_TZ || process.env.HOTEL_TIMEZONE || "Europe/Istanbul",
  ).trim();

  if (tz === "Europe/Istanbul") {
    const [y, m, d] = ymd.split("-").map(Number);
    const fromIso = new Date(`${y}-${pad2(m)}-${pad2(d)}T00:00:00+03:00`).toISOString();
    const toExclusiveIso = new Date(
      new Date(`${y}-${pad2(m)}-${pad2(d)}T00:00:00+03:00`).getTime() + 24 * 60 * 60 * 1000,
    ).toISOString();
    return { fromIso, toExclusiveIso, tz };
  }

  const [y, m, d] = ymd.split("-").map(Number);
  const fromIso = `${ymd}T00:00:00.000Z`;
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const ny = next.getUTCFullYear();
  const nm = String(next.getUTCMonth() + 1).padStart(2, "0");
  const nd = String(next.getUTCDate()).padStart(2, "0");
  const toExclusiveIso = `${ny}-${nm}-${nd}T00:00:00.000Z`;
  return { fromIso, toExclusiveIso, tz };
}

function listQueryForHotelDay(ymd, extra = {}) {
  const { fromIso, toExclusiveIso } = hotelCalendarDaySubmittedAtRange({ ymd });
  return { from: fromIso, to_lt: toExclusiveIso, ...extra };
}

async function listAllAdminBucket(type, baseQuery) {
  const pageSize = 500;
  let page = 1;
  const all = [];
  for (;;) {
    const { items, pagination } = await listAdminBucket(type, { ...baseQuery, page, pageSize });
    all.push(...(items || []));
    if (!items?.length || items.length < pageSize || page >= (pagination?.totalPages || 1)) break;
    page += 1;
    if (page > 200) break;
  }
  return all;
}

function emptyGuestBucketSummary(type) {
  return { mode: "full", type, bekliyor: 0, islemde: 0, yapildi: 0, yapilmadi: 0, iptal: 0, toplam: 0 };
}

function emptyFrontSummary() {
  const z = { bekliyor: 0, islemde: 0, yapildi: 0, yapilmadi: 0, iptal: 0, toplam: 0 };
  return {
    mode: "full",
    bekliyor: 0,
    islemde: 0,
    yapildi: 0,
    yapilmadi: 0,
    iptal: 0,
    toplam: 0,
    byType: {
      complaint: { ...z },
      guest_notification: { ...z },
      late_checkout: { ...z },
    },
  };
}

/**
 * @param {{ ymd: string, hotelName?: string, segment: DailyReportSegment }} opts
 * @returns {Promise<Buffer>}
 */
export async function buildDailyOperationReportPdfBuffer(opts = {}) {
  const ymd = String(opts.ymd || "").trim();
  const segment = String(opts.segment || "").trim();
  if (!YMD_RE.test(ymd)) throw new Error("invalid_report_ymd");
  if (!["hk", "tech", "front"].includes(segment)) throw new Error("invalid_daily_report_segment");

  const q = listQueryForHotelDay(ymd);

  const hotelName =
    String(opts.hotelName || process.env.DAILY_OPERATION_REPORT_HOTEL_NAME || "Otel").trim() || "Otel";

  let summaryRequest = emptyGuestBucketSummary("request");
  let summaryFault = emptyGuestBucketSummary("fault");
  let summaryFront = emptyFrontSummary();
  let rowsRequest = [];
  let rowsFault = [];
  let rowsComplaint = [];
  let rowsGuestNotification = [];
  let rowsLateCheckout = [];

  if (segment === "hk") {
    const [sr, rr] = await Promise.all([getGuestBucketTypeSummary("request", q), listAllAdminBucket("request", q)]);
    summaryRequest = sr;
    rowsRequest = rr;
  } else if (segment === "tech") {
    const [sf, rf] = await Promise.all([getGuestBucketTypeSummary("fault", q), listAllAdminBucket("fault", q)]);
    summaryFault = sf;
    rowsFault = rf;
  } else {
    const [sf, rc, rgn, rlc] = await Promise.all([
      getFrontOfficeOperationSummary(q),
      listAllAdminBucket("complaint", q),
      listAllAdminBucket("guest_notification", q),
      listAllAdminBucket("late_checkout", q),
    ]);
    summaryFront = sf;
    rowsComplaint = rc;
    rowsGuestNotification = rgn;
    rowsLateCheckout = rlc;
  }

  const html = buildDailyOperationReportHtml({
    segment,
    reportYmd: ymd,
    hotelName,
    summaryRequest,
    summaryFault,
    summaryFront,
    rowsRequest,
    rowsFault,
    rowsComplaint,
    rowsGuestNotification,
    rowsLateCheckout,
  });

  const buf = await renderDailyOperationPdfBuffer(html);
  return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
}
