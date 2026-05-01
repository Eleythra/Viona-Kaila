/**
 * Otel operasyonu: Europe/Istanbul 00:00–07:59 arası misafir istek/şikayet/arıza/misafir bildirimi
 * formları kapalı; 08:00 tam olarak açık.
 */
const TZ = "Europe/Istanbul";

const OP_TYPES = new Set(["request", "complaint", "fault", "guest_notification"]);

export function isInOperationalQuietHours(date = new Date(), _tz = TZ) {
  const s = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (t) => {
    const p = s.find((x) => x.type === t);
    return p ? parseInt(p.value, 10) : 0;
  };
  const h = get("hour");
  const m = get("minute");
  return h * 60 + m < 8 * 60;
}

export function isOperationalGuestRequestTypeBlocked(type) {
  const t = String(type || "").trim();
  return OP_TYPES.has(t);
}

export { OP_TYPES as OPERATIONAL_QUIET_TYPES };
