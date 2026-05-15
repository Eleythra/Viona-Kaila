/**
 * Misafir / personel operasyon API’si için İngilizce doğrulama iletilerini Türkçe kullanıcı metnine çevirir.
 * Bilinmeyen metin aynen döner (zaten Türkçe veya harici servis iletisi olabilir).
 */

const MAP = {
  "type is required": "Kayıt türü gerekli.",
  "name is required": "Misafir adı gerekli.",
  "room is required": "Oda numarası gerekli.",
  "nationality is required": "Uyruk bilgisi gerekli.",
  "name must contain letters only": "İsim yalnızca harf içermelidir (rakam kullanılamaz).",
  "name is too long": "İsim çok uzun.",
  "name must be first and last name": "Lütfen ad ve soyadı birlikte girin.",
  "name is too short": "İsim çok kısa.",
  "name word too short": "İsimdeki bir kelime çok kısa.",
  "invalid hotel room number": "Geçersiz oda numarası.",
  "nationality must contain letters only":
    "Uyruk alanı yalnızca harf içermelidir (personel girişinde «-» kullanılabilir).",
  "invalid type": "Geçersiz kayıt türü.",
  "description is required": "Açıklama gerekli.",
  "request category is required": "Talep kategorisi gerekli.",
  "request details are required": "Talep detayı gerekli (adet veya zamanlama).",
  "description is required for other category": "«Diğer» kategorisinde açıklama zorunludur.",
  "complaint category is required": "Şikâyet kategorisi gerekli.",
  "description is required for selected complaint category": "Seçilen kategori için açıklama zorunludur.",
  "fault category is required": "Arıza kategorisi gerekli.",
  "guest notification category is required": "Bildirim kategorisi gerekli.",
  "description is required for selected notification category": "Seçilen bildirim kategorisi için açıklama zorunludur.",
  "checkout date is required (YYYY-MM-DD)": "Çıkış tarihi gerekli (YYYY-AA-GG).",
  "checkout time is required (HH:MM)": "Çıkış saati gerekli (SS:DD).",
  "description is required for late checkout": "Geç çıkış için açıklama gerekli.",
  "checkout date cannot be in the past": "Çıkış tarihi geçmiş olamaz.",
  "reservation is required": "Rezervasyon bilgisi gerekli.",
  "reservation date/time is required": "Rezervasyon tarihi ve saati gerekli.",
  "guest count is required": "Misafir sayısı gerekli.",
  "description is too long": "Açıklama çok uzun.",
  "other category note is too long": "Kategori notu çok uzun.",
  "manual entry does not support reservation types": "Personel manuel giriş rezervasyon türlerini desteklemez.",
  "invalid type for manual entry": "Bu kayıt türü manuel giriş için kullanılamaz.",
  guest_request_create_failed: "Talep kaydedilemedi. Bilgileri kontrol edip tekrar deneyin.",
  quiet_hours_reception_only: "Bu saatlerde misafir kanalı kapalı; resepsiyon ile iletişime geçin.",
  invalid_type: "Geçersiz kayıt türü.",
  admin_manual_create_failed: "Manuel kayıt oluşturulamadı. Bilgileri kontrol edip tekrar deneyin.",
  ops_manual_create_failed: "Manuel kayıt oluşturulamadı. Bilgileri kontrol edip tekrar deneyin.",
  forbidden_bucket: "Bu işlem bu hesap veya bağlantı için izinli değil.",
  conflict: "İstek çakışması; tekrar deneyin veya resepsiyon ile iletişime geçin.",
  bad_request: "Geçersiz istek.",
};

/**
 * @param {string} message
 * @returns {string}
 */
export function translateGuestRequestApiError(message) {
  const m = String(message ?? "").trim();
  if (!m) return "İşlem tamamlanamadı.";
  if (MAP[m]) return MAP[m];
  if (/violates check constraint|check constraint/i.test(m)) {
    return "Gönderilen değerlerden biri veritabanı kurallarına uymuyor. Kategori veya alanları kontrol edin.";
  }
  return m;
}
