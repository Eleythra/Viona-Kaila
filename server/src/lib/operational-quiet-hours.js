/**
 * Sessiz pencere (Europe/Istanbul): takvimde 00:00–08:00 aralığının dışında kayıt kabulü.
 * Kapalı an: saat diliminde 08:00’a kadar (07:59 dahil), yani dakika < 8×60; 08:00:00 ve sonrası açık.
 *
 * Bu dört tür hem burada hem istemci (`js/lib/operational-quiet-hours.js`) hem Python asistan
 * (`operational_quiet_hours_active`) ile aynı formül; geç çıkış / rezervasyon / anket kapalı değildir.
 *
 * Kayıt kabul edildiğinde WhatsApp alıcıları (sessiz saatten bağımsız; env listeleri):
 *   fault → WHATSAPP_TECH_RECIPIENTS | request → WHATSAPP_HK_RECIPIENTS |
 *   complaint | guest_notification | late_checkout → WHATSAPP_FRONT_RECIPIENTS
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
