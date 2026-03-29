/**
 * Misafir formlarındaki enum değerleri için Türkçe kısa etiketler (js/i18n.js tr ile uyumlu).
 */

export const REQUEST_CATEGORY_TR = {
  towel: "Havlu",
  bedding: "Yastık / nevresim",
  room_cleaning: "Oda temizliği",
  minibar: "Minibar",
  baby_equipment: "Bebek ekipmanı",
  room_equipment: "Oda ekipmanı",
  other: "Diğer",
};

export const FAULT_CATEGORY_TR = {
  hvac: "Klima / ısıtma",
  electric: "Elektrik",
  water_bathroom: "Su / banyo",
  tv_electronics: "TV / elektronik",
  door_lock: "Kapı / kilit",
  furniture_item: "Mobilya / eşya",
  cleaning_equipment_damage: "Temizlik ekipmanı hasarı",
  balcony_window: "Balkon / pencere",
  other: "Diğer",
};

export const FAULT_LOCATION_TR = {
  room_inside: "Oda içi",
  bathroom: "Banyo",
  balcony: "Balkon",
  other: "Diğer",
};

export const FAULT_URGENCY_TR = {
  normal: "Normal",
  urgent: "Acil",
};

export const REQUEST_ITEM_TYPE_TR = {
  bath_towel: "Banyo havlusu",
  hand_towel: "El havlusu",
  pillow: "Yastık",
  duvet_cover: "Nevresim",
  blanket: "Battaniye",
  baby_bed: "Bebek yatağı",
  high_chair: "Mama sandalyesi",
  bathrobe: "Bornoz",
  slippers: "Terlik",
  hanger: "Askı",
  kettle: "Su ısıtıcısı",
  other: "Diğer",
};

export const REQUEST_REQUEST_TYPE_TR = {
  general_cleaning: "Genel temizlik",
  towel_change: "Havlu değişimi",
  room_check: "Oda kontrolü",
  refill: "Yenileme",
  missing_item_report: "Eksik ürün bildirimi",
  check_request: "Kontrol talebi",
};

export const REQUEST_TIMING_TR = {
  now: "Şimdi",
  later: "Daha sonra",
};

export function labelOrRaw(map, key, maxLen = 120) {
  const k = String(key || "").trim();
  if (!k) return "—";
  const label = map[k];
  if (label) return label;
  const raw = k.slice(0, maxLen);
  return raw || "—";
}
