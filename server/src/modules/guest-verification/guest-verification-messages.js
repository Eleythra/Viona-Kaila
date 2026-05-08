/** @typedef {'room_not_found'|'surname_mismatch'|'stay_not_active'|'ambiguous_guest'|'pms_unavailable'|'too_many_verification_attempts'} GuestVerifyReason */

const TR_MESSAGES = {
  room_not_found: "Bu oda numarasına ait aktif kayıt bulunamadı.",
  surname_mismatch: "Soyad bilgisi doğrulanamadı.",
  stay_not_active: "Konaklama süresi aktif görünmüyor.",
  ambiguous_guest: "Kayıt eşleştirilemedi. Lütfen resepsiyon ile iletişime geçin.",
  pms_unavailable:
    "Doğrulama şu an yapılamıyor. Lütfen bir süre sonra tekrar deneyin veya resepsiyon ile iletişime geçin.",
  too_many_verification_attempts:
    "Çok fazla deneme yapıldı. Lütfen bir süre sonra tekrar deneyin veya resepsiyon ile iletişime geçin.",
};

/**
 * @param {string} reason
 * @returns {string}
 */
export function guestVerificationUserMessage(reason) {
  const r = String(reason || "").trim();
  return TR_MESSAGES[r] || TR_MESSAGES.pms_unavailable;
}
