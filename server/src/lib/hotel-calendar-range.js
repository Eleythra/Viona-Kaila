/**
 * Otel takvim günü (Europe/Istanbul) ↔ submitted_at UTC aralığı.
 * Admin listeleri ve günlük PDF’te aynı gün tanımı için kullanılır.
 */

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isoCalendarDateOnly(v) {
  const s = String(v ?? "").trim();
  return YMD_RE.test(s) ? s : "";
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

/**
 * @param {{ ymd: string, tz?: string }} opts
 * @returns {{ fromIso: string, toExclusiveIso: string, tz: string }}
 */
export function hotelCalendarDaySubmittedAtRange(opts = {}) {
  const ymd = String(opts.ymd || "").trim();
  if (!YMD_RE.test(ymd)) throw new Error("invalid_report_ymd");

  const tz = String(
    opts.tz || process.env.HOTEL_TIMEZONE || process.env.DAILY_OPERATION_REPORT_TZ || "Europe/Istanbul",
  ).trim();

  if (tz === "Europe/Istanbul") {
    const [y, m, d] = ymd.split("-").map(Number);
    const dayStart = new Date(`${y}-${pad2(m)}-${pad2(d)}T00:00:00+03:00`);
    const fromIso = dayStart.toISOString();
    const toExclusiveIso = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000).toISOString();
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

/**
 * `query.from` / `query.to` yalnızca YYYY-MM-DD ise otel takvim günü aralığına çevir (`HOTEL_TIMEZONE` / `DAILY_OPERATION_REPORT_TZ`).
 * Tarih-saat veya `to_lt` ile karışık sorgularda null döner; çağıran legacy filtreyi kullanır.
 *
 * @returns {{ kind: 'range', fromIso: string, toExclusiveIso: string } | { kind: 'from', fromIso: string } | { kind: 'to', toExclusiveIso: string } | null}
 */
export function submittedAtHotelCalendarFilter(query = {}) {
  const tz = String(process.env.HOTEL_TIMEZONE || process.env.DAILY_OPERATION_REPORT_TZ || "Europe/Istanbul").trim();

  const fromD = isoCalendarDateOnly(query.from);
  const toD = isoCalendarDateOnly(query.to);
  const fromRaw = fromD ? "" : String(query.from || "").trim();
  const toRaw = toD ? "" : String(query.to || "").trim();
  if (fromRaw || toRaw) return null;

  if (fromD && toD) {
    const { fromIso } = hotelCalendarDaySubmittedAtRange({ ymd: fromD, tz });
    const { toExclusiveIso } = hotelCalendarDaySubmittedAtRange({ ymd: toD, tz });
    return { kind: "range", fromIso, toExclusiveIso };
  }
  if (fromD && !toD) {
    const { fromIso } = hotelCalendarDaySubmittedAtRange({ ymd: fromD, tz });
    return { kind: "from", fromIso };
  }
  if (!fromD && toD) {
    const { toExclusiveIso } = hotelCalendarDaySubmittedAtRange({ ymd: toD, tz });
    return { kind: "to", toExclusiveIso };
  }
  return null;
}
