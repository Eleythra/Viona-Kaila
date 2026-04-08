/**
 * Anket şeması (misafir uyg. js/survey-schema.js) ile uyumlu PDF / rapor etiketleri.
 * hotel_categories ve hotel_answers anahtarları.
 */
const META = {
  generalEval: { label: "Genel değerlendirme (özet)", hint: "Genel bölüm gönderim ortalaması" },
  food_main_restaurant: { label: "Ana restoran — özet", hint: "Açık büfe gönderim ortalaması" },
  food_la_terracca: { label: "La Terraca — özet", hint: "À la carte gönderim ortalaması" },
  food_snack_dolphin_gusto: { label: "Snack Dolphin & Gusto — özet", hint: "Snack alanları gönderim ortalaması" },
  food_bars: { label: "Barlar — özet", hint: "Bar gönderim ortalaması" },
  comfort: { label: "Oda ve konfor (özet)", hint: "Konfor bölümü ortalaması" },
  staff: { label: "Resepsiyon ve ekip (özet)", hint: "Resepsiyon bölümü ortalaması" },
  pool_area: { label: "Havuz — özet", hint: "Havuz gönderim ortalaması" },
  beach_area: { label: "Plaj — özet", hint: "Plaj gönderim ortalaması" },
  spaWellness: { label: "Spa ve wellness (özet)", hint: "Spa bölümü ortalaması" },
  guestExperience: { label: "Misafir deneyimi ve hizmet (özet)", hint: "Misafir deneyimi bölümü ortalaması" },

  gen_stay_experience: { label: "Genel konaklama deneyimi", hint: "Genel değerlendirme" },
  gen_service_quality: { label: "Otel hizmetlerinin genel kalitesi", hint: "Genel değerlendirme" },
  gen_return_intent: { label: "Tekrar tercih etme isteği", hint: "Genel değerlendirme" },

  food_buffet_quality: { label: "Yemek kalitesi (ana restoran)", hint: "Açık büfe" },
  food_buffet_variety: { label: "Menü çeşitliliği (ana restoran)", hint: "Açık büfe" },
  food_buffet_service: { label: "Servis ve personel ilgisi (ana restoran)", hint: "Açık büfe" },
  food_terrace_quality: { label: "Yemek kalitesi (La Terraca)", hint: "À la carte" },
  food_terrace_speed: { label: "Servis hızı (La Terraca)", hint: "À la carte" },
  food_terrace_overall: { label: "Genel deneyim (La Terraca)", hint: "À la carte" },
  food_snack_quality: { label: "Ürün kalitesi (snack)", hint: "Dolphin & Gusto" },
  food_snack_speed: { label: "Servis hızı (snack)", hint: "Dolphin & Gusto" },
  food_snack_area: { label: "Alan konforu ve düzen (snack)", hint: "Dolphin & Gusto" },
  food_bar_quality: { label: "İçecek kalitesi (barlar)", hint: "Barlar" },
  food_bar_speed: { label: "Servis hızı (barlar)", hint: "Barlar" },
  food_bar_staff: { label: "Personel ilgisi (barlar)", hint: "Barlar" },

  room_comfort_overall: { label: "Odanın genel konforu", hint: "Oda ve konfor" },
  room_cleanliness: { label: "Odanın temizliği", hint: "Oda ve konfor" },
  bed_sleep_quality: { label: "Yatak ve uyku konforu", hint: "Oda ve konfor" },
  noise_insulation: { label: "Gürültü ve izolasyon", hint: "Oda ve konfor" },

  reception_check_in_out: { label: "Check-in ve check-out süreci", hint: "Resepsiyon" },
  staff_interest_approach: { label: "Personel ilgisi ve yaklaşımı", hint: "Resepsiyon" },
  request_resolution_speed: { label: "Taleplere çözüm hızı", hint: "Resepsiyon" },

  pool_cleanliness: { label: "Havuz alanının temizliği", hint: "Havuz" },
  pool_lounger_space: { label: "Şezlong ve dinlenme alanı (havuz)", hint: "Havuz" },
  pool_overall: { label: "Genel havuz deneyimi", hint: "Havuz" },
  beach_cleanliness: { label: "Plaj alanının temizliği", hint: "Plaj" },
  beach_lounger_space: { label: "Şezlong ve dinlenme alanı (plaj)", hint: "Plaj" },
  beach_overall: { label: "Genel plaj deneyimi", hint: "Plaj" },

  spa_service_quality: { label: "Spa hizmet kalitesi", hint: "Spa" },
  spa_staff_interest: { label: "Spa personel ilgisi", hint: "Spa" },
  spa_overall_experience: { label: "Genel spa deneyimi", hint: "Spa" },

  guest_response_speed: { label: "Taleplere yanıt hızı", hint: "Misafir deneyimi" },
  guest_issue_resolution: { label: "Sorun çözüm süreci", hint: "Misafir deneyimi" },
  guest_solution_focus: { label: "Çözüm odaklı yaklaşım", hint: "Misafir deneyimi" },
  guest_hotel_care: { label: "Otelin ilgisi ve takibi", hint: "Misafir deneyimi" },

  viona_helpfulness: { label: "Yanıtların yararlılığı", hint: "Viona" },
  viona_understanding: { label: "İsteğin anlaşılması", hint: "Viona" },
  viona_usability: { label: "Sohbet kullanım kolaylığı", hint: "Viona" },
  viona_overall: { label: "Viona genel memnuniyet", hint: "Viona" },

  food: { label: "Yemek ve içecek (özet)", hint: "Eski şema uyumu" },
  food_taste: { label: "Ana restoran lezzeti (eski)", hint: "Eski anket anahtarı" },
  food_variety: { label: "Menü çeşitliliği (eski)", hint: "Eski anket anahtarı" },
  food_presentation: { label: "Servis ve sunum (eski)", hint: "Eski anket anahtarı" },
  room_comfort: { label: "Oda konforu (eski)", hint: "Eski anket" },
  bed_comfort: { label: "Yatak konforu (eski)", hint: "Eski anket" },
  quietness: { label: "Gürültü (eski)", hint: "Eski anket" },
  common_area_cleanliness: { label: "Ortak alan temizliği (eski)", hint: "Eski anket" },
  staff_kindness: { label: "Resepsiyon ilgisi (eski)", hint: "Eski anket" },
  staff_speed: { label: "Yanıt süresi (eski)", hint: "Eski anket" },
  staff_helpfulness: { label: "Yardımseverlik (eski)", hint: "Eski anket" },
  pool_beach_cleanliness: { label: "Havuz/plaj düzeni (eski)", hint: "Eski anket" },
  pool_beach_access: { label: "Şezlong erişimi (eski)", hint: "Eski anket" },
  pool_beach_satisfaction: { label: "Havuz/plaj memnuniyeti (eski)", hint: "Eski anket" },
  spa_quality: { label: "Spa kalitesi (eski)", hint: "Eski anket" },
  spa_ambience: { label: "Spa ortamı (eski)", hint: "Eski anket" },
  spa_satisfaction: { label: "Spa değer (eski)", hint: "Eski anket" },
  general_satisfaction: { label: "Genel memnuniyet (eski)", hint: "Eski anket" },
  return_again: { label: "Tekrar konaklama (eski)", hint: "Eski anket" },
  recommend: { label: "Tavsiye (eski)", hint: "Eski anket" },
  cleanliness: { label: "Temizlik (özet, eski)", hint: "Eski şema" },
  poolBeach: { label: "Havuz ve plaj (özet, eski)", hint: "Eski şema" },
  generalExperience: { label: "Genel deneyim (özet, eski)", hint: "Eski şema" },
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
