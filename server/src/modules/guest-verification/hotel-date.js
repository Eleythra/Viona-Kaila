/**
 * Otel TZ ile bugün YYYY-MM-DD (guest-requests ile aynı mantık).
 */
export function hotelTodayIsoYmd() {
  const raw = String(process.env.HOTEL_TIMEZONE || process.env.HOTEL_TZ || "Europe/Istanbul").trim();
  const tz = raw || "Europe/Istanbul";
  try {
    const s = new Date().toLocaleDateString("en-CA", { timeZone: tz });
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  } catch {
    /* geçersiz IANA */
  }
  return new Date().toISOString().slice(0, 10);
}

/**
 * Elektra tarih alanını YYYY-MM-DD yapar.
 * @param {string} raw
 * @returns {string|null}
 */
export function parsePmsDateToIsoYmd(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  /** Elektra `BIRTHDATE` / `CHECKIN` sıkça `YYYY-MM-DDTHH:mm:ss` döner — yalnız gün kısmı kullanılır. */
  const isoPrefix = /^(\d{4}-\d{2}-\d{2})[T\s]/.exec(s);
  if (isoPrefix) return isoPrefix[1];
  const m = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(s);
  if (m) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    const yyyy = m[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
}

/**
 * today inclusive [checkin, checkout] — string YYYY-MM-DD ile güvenli.
 * @param {string} todayYmd
 * @param {string} checkinRaw
 * @param {string} checkoutRaw
 */
export function isStayActiveOnDate(todayYmd, checkinRaw, checkoutRaw) {
  const cin = parsePmsDateToIsoYmd(checkinRaw);
  const cout = parsePmsDateToIsoYmd(checkoutRaw);
  if (!cin || !cout) return false;
  return todayYmd >= cin && todayYmd <= cout;
}
