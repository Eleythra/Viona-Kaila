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

function resolveHotelTimezone() {
  return String(process.env.HOTEL_TIMEZONE || process.env.DAILY_OPERATION_REPORT_TZ || "Europe/Istanbul").trim();
}

/**
 * Kayıt anı (UTC ISO) → gg.aa.yyyy — WhatsApp operasyon şablonları ve PDF ile uyumlu otel saati.
 * @param {Date|string|number} input
 */
export function formatInstantHotelDdMmYyyy(input) {
  const dt = input instanceof Date ? input : new Date(input);
  if (!Number.isFinite(dt.getTime())) return "—";
  const tz = resolveHotelTimezone();
  try {
    const ymd = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(dt);
    const p = ymd.split("-");
    if (p.length !== 3) return "—";
    return `${p[2]}.${p[1]}.${p[0]}`;
  } catch {
    const day = String(dt.getUTCDate()).padStart(2, "0");
    const month = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const year = dt.getUTCFullYear();
    return `${day}.${month}.${year}`;
  }
}

/**
 * Kayıt anı → HH:mm (24 saat, otel saat dilimi).
 * @param {Date|string|number} input
 */
export function formatInstantHotelHhMm(input) {
  const dt = input instanceof Date ? input : new Date(input);
  if (!Number.isFinite(dt.getTime())) return "—";
  const tz = resolveHotelTimezone();
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      hourCycle: "h23",
    })
      .format(dt)
      .replace(/\u202f|\u00a0/g, " ")
      .trim();
  } catch {
    const h = String(dt.getUTCHours()).padStart(2, "0");
    const m = String(dt.getUTCMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }
}

/** Takvim günü YYYY-MM-DD → gg.aa.yyyy (saat dilimi kayması yok; geç çıkış istenen tarih vb.). */
export function formatIsoCalendarYmdAsDdMmYyyy(isoYmd) {
  const s = String(isoYmd ?? "").trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return "";
  return `${m[3]}.${m[2]}.${m[1]}`;
}
