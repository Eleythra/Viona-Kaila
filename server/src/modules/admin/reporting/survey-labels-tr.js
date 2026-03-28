/**
 * Anket şeması (js/survey-schema.js) ile uyumlu PDF / rapor etiketleri.
 * hotel_categories veya hotel_answers anahtarları için kısa Türkçe açıklama.
 */
const META = {
  food_taste: { label: "Ana restoran ve büfe lezzeti", hint: "Yemek kalitesi algısı" },
  food_variety: { label: "Menü çeşitliliği", hint: "İçecek/yemek seçenekleri" },
  food_presentation: { label: "Servis hızı ve sunum", hint: "Yemek servisinin hızı ve düzeni" },
  room_comfort: { label: "Oda düzeni, klima ve ekipman", hint: "Odanın kullanım rahatlığı" },
  bed_comfort: { label: "Yatak ve uyku konforu", hint: "Uyku kalitesi" },
  quietness: { label: "Gürültü ve dinlenme ortamı", hint: "Koridor, komşu oda ve dış gürültü" },
  room_cleanliness: { label: "Oda temizliği ve tedarik", hint: "Oda hijyeni ve malzeme" },
  common_area_cleanliness: { label: "Lobi ve ortak alan temizliği", hint: "Koridor, lobi, ortak alanlar" },
  staff_kindness: { label: "Resepsiyon ilgisi ve karşılama", hint: "İlk temas ve nezaket" },
  staff_speed: { label: "Talep ve şikâyet yanıt süresi", hint: "İsteklere dönüş hızı" },
  staff_helpfulness: { label: "Yardımseverlik (ekip)", hint: "Çözüm odaklı destek" },
  pool_beach_cleanliness: { label: "Havuz ve plaj düzeni", hint: "Alan bakımı" },
  pool_beach_access: { label: "Şezlong ve erişim", hint: "Havuz/plaj kullanım kolaylığı" },
  pool_beach_satisfaction: { label: "Havuz ve plaj memnuniyeti", hint: "Genel havuz/plaj deneyimi" },
  spa_quality: { label: "Spa hizmet kalitesi", hint: "Randevu ve uygulama" },
  spa_ambience: { label: "Spa ortamı", hint: "Atmosfer ve dinlenme" },
  spa_satisfaction: { label: "Spa fiyat / değer", hint: "Ücret–kalite dengesi" },
  general_satisfaction: { label: "Genel otel memnuniyeti (soru)", hint: "Toplam deneyim özeti" },
  return_again: { label: "Tekrar konaklama niyeti", hint: "Geri dönüş eğilimi" },
  recommend: { label: "Tavsiye etme", hint: "Başkasına önerme isteği" },
  food: { label: "Yemek ve içecek (özet)", hint: "Yemek bölümü ortalaması" },
  comfort: { label: "Oda ve konfor (özet)", hint: "Konfor bölümü ortalaması" },
  cleanliness: { label: "Temizlik (özet)", hint: "Temizlik bölümü ortalaması" },
  staff: { label: "Personel (özet)", hint: "Ekip bölümü ortalaması" },
  poolBeach: { label: "Havuz ve plaj (özet)", hint: "Havuz/plaj bölümü ortalaması" },
  spaWellness: { label: "Spa ve wellness (özet)", hint: "Spa bölümü ortalaması" },
  generalExperience: { label: "Genel deneyim (özet)", hint: "Genel bölüm ortalaması" },
  viona_helpfulness: { label: "Faydalı olma", hint: "Asistanın çözüm / yönlendirme faydası" },
  viona_understanding: { label: "Anlaşılma", hint: "Sorunun doğru anlaşılması" },
  viona_usability: { label: "Kullanım kolaylığı", hint: "Arayüz ve akış" },
  viona_overall: { label: "Genel memnuniyet (Viona)", hint: "Dijital asistana toplam puan" },
};

export function hotelSurveyKeyMeta(key) {
  const k = String(key || "").trim();
  return META[k] || { label: k, hint: "Anket kırılımı" };
}

export function labelHotelSurveyKey(key) {
  return hotelSurveyKeyMeta(key).label;
}

export function hintHotelSurveyKey(key) {
  return hotelSurveyKeyMeta(key).hint;
}
