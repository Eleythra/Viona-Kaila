/**
 * Operasyon kayıtları için payload normalizasyonu ve Türkçe etiket sözlüğü.
 * WhatsApp Cloud API şablon gövdesi parametreleriyle uyumlu (grup / whatsapp-web.js yok).
 */

import {
  formatInstantHotelDdMmYyyy,
  formatInstantHotelHhMm,
  formatIsoCalendarYmdAsDdMmYyyy,
} from "../lib/hotel-calendar-range.js";

export const WH_CATEGORY_LABELS = {
  request: {
    hk_duvet_request: "Yorgan isteği (adet)",
    hk_bed_join: "Yatak birleştirme (adet)",
    hk_bed_soften: "Yatağın yumuşatılması (adet)",
    hk_pillow_request: "Yastık isteği (adet)",
    hk_pique_request: "Pike isteği (adet)",
    hk_extra_bed: "Ek yatak (adet)",
    hk_baby_crib: "Bebek yatağı (adet)",
    hk_sheet_change: "Çarşaf değişimi (adet)",
    hk_towel_request: "Havlu isteği (adet)",
    hk_towel_change: "Havlu değişimi (adet)",
    hk_toilet_paper: "Tuvalet kağıdı (adet)",
    hk_slippers: "Terlik isteği (adet)",
    hk_dental_set: "Diş seti isteği (adet)",
    hk_amenity_kit: "Banyo ve kişisel bakım seti (şampuan, sabun vb.) (adet)",
    hk_water: "Su isteği (adet)",
    hk_coffee_tea_supplies: "Kahve, süt tozu, çay isteği (adet)",
    hk_cup_request: "Kupa isteği (adet)",
    hk_room_cleaning: "Oda temizliği (adet)",
    hk_trash_removal: "Çöplerin alınması (adet)",
    hk_balcony_cleaning: "Balkon temizliği (adet)",
    hk_cleaning_dnd_coordinate:
      "Temizlik ve rahatsız etmeyin koordinasyonu / tercih bildirimi (adet)",
    hk_bad_odor: "Kötü koku şikayeti (adet)",
    hk_pest_control: "İlaçlama isteği (adet)",
    hk_iron: "Ütü isteği (adet)",
    hk_vase: "Vazo isteği (adet)",
    other: "Diğer",
  },
  fault: {
    ft_ac_not_cooling: "Klima soğutmuyor",
    ft_ac_not_heating: "Klima ısıtmıyor",
    ft_ac_remote: "Klima kumandası",
    ft_ac_fault: "Klima Arızası",
    ft_ventilation_fault: "Havalandırma arızası",
    ft_socket_fault: "Priz arızası",
    ft_electric_fault: "Elektrik arızası",
    ft_led_fault: "LED arızası",
    ft_lamp_fault: "Lamba arızası",
    ft_sconce_fault: "Aplik arızası",
    ft_ceiling_water_leak: "Tavandan su akıyor",
    ft_bidet_faucet_fault: "Taharet musluğu arızası",
    ft_cold_water_no_flow: "Su soğuk akmıyor",
    ft_hot_water_no_flow: "Su sıcak akmıyor",
    ft_siphon_fault: "Sifon arızası",
    ft_faucet_fault: "Musluk arızası",
    ft_sink_drain_fault: "Lavabo gideri arızası",
    ft_toilet_seat_broken: "Klozet kapağı kırık",
    ft_shower_cabin_fault: "Duşakabin arızası",
    ft_shower_head_fault: "Duş başlığı arızası",
    ft_towel_rail_fault: "Banyo havluluk",
    ft_bathroom_drain_clog: "Banyo gideri tıkalı",
    ft_tv_remote: "Televizyon kumandası",
    ft_tv_fault: "Televizyon arızası",
    ft_phone_fault: "Telefon arızası",
    ft_minibar_fault: "Minibar arızası",
    ft_safe_fault: "Kasa arızası",
    ft_kettle_fault: "Kettle arızası",
    ft_hair_dryer_fault: "Fön makinesi çalışmıyor",
    ft_tv_channel_fault: "Kanal arızası",
    ft_curtain_fallen: "Perde düşmüş",
    ft_window_fault: "Pencere arızası",
    ft_window_cleaning: "Pencere temizliği",
    ft_room_door_fault: "Oda kapısı arızası",
    ft_bathroom_door_fault: "Banyo kapısı arızası",
    ft_balcony_door_fault: "Balkon kapısı arızası",
    ft_balcony_railing_loose: "Balkon korkuluğu gevşek / sallanıyor",
    ft_cornice_fault: "Korniş arızası",
    ft_headboard_fault: "Yatak başlığı arızası",
    ft_dresser_drawer_fault: "Şifonyer çekmecesi",
    ft_drawer_fault: "Çekmece arızası",
    ft_wardrobe_fault: "Gardırop arızası",
    ft_mirror_damage: "Ayna kırık / çatlak",
    ft_elevator_fault: "Asansör arızası",
    ft_indoor_pool_temperature: "Kapalı havuz sıcaklığı / ayar arızası",
    ft_other: "Diğer (teknik)",
  },
  guest_notification: {
    allergen_notice: "Alerjen bildirimi",
    gluten_sensitivity: "Gluten hassasiyeti",
    lactose_sensitivity: "Laktoz hassasiyeti",
    vegan_vegetarian: "Vegan / vejetaryen",
    food_sensitivity_general: "Genel gıda hassasiyeti",
    chronic_condition: "Kronik rahatsızlık",
    accessibility_special_needs: "Erişilebilirlik / özel ihtiyaç",
    pregnancy: "Hamilelik",
    medication_health_sensitivity: "İlaç / sağlık",
    other_health: "Diğer (sağlık)",
    birthday_celebration: "Doğum günü",
    honeymoon_anniversary: "Balayı / yıldönümü",
    surprise_organization: "Sürpriz organizasyon",
    room_decoration: "Oda süsleme",
    other_celebration: "Diğer (kutlama)",
  },
  guest_notification_main: {
    allergen_notice: "Beslenme",
    gluten_sensitivity: "Beslenme",
    lactose_sensitivity: "Beslenme",
    vegan_vegetarian: "Beslenme",
    food_sensitivity_general: "Beslenme",
    chronic_condition: "Sağlık",
    accessibility_special_needs: "Sağlık",
    pregnancy: "Sağlık",
    medication_health_sensitivity: "Sağlık",
    other_health: "Sağlık",
    birthday_celebration: "Kutlama",
    honeymoon_anniversary: "Kutlama",
    surprise_organization: "Kutlama",
    room_decoration: "Kutlama",
    other_celebration: "Kutlama",
  },
  complaint: {
    room_cleaning: "Oda temizliği",
    noise: "Gürültü",
    climate: "Isı / klima",
    room_comfort: "Oda konforu",
    minibar: "Minibar",
    restaurant_service: "Restoran servisi",
    staff_behavior: "Personel davranışı",
    general_areas: "Genel alanlar",
    hygiene: "Hijyen",
    internet_tv: "İnternet / TV",
    lost_property: "Kayıp eşya",
    other: "Diğer",
  },
};

/** Teknik `ft_*` → HK ile aynı üst başlık mantığı (WhatsApp / önizleme / PDF). */
const FAULT_OPERATIONAL_SECTION_KEYS = {
  hvac: "Klima & Havalandırma",
  electric: "Elektrik & Aydınlatma",
  water_bath: "Su & Banyo Sistemleri",
  tv_electronics: "TV & Elektronik",
  door_window: "Kapı, Pencere & Balkon",
  furniture: "Mobilya & Oda Ekipmanları",
  general_facility: "Genel Tesis & Ortak Alan",
  other: "Diğer Teknik Arızalar",
};

const FAULT_ID_TO_SECTION = {
  ft_ac_not_cooling: "hvac",
  ft_ac_not_heating: "hvac",
  ft_ac_remote: "hvac",
  ft_ac_fault: "hvac",
  ft_ventilation_fault: "hvac",
  ft_socket_fault: "electric",
  ft_electric_fault: "electric",
  ft_led_fault: "electric",
  ft_lamp_fault: "electric",
  ft_sconce_fault: "electric",
  ft_ceiling_water_leak: "water_bath",
  ft_bidet_faucet_fault: "water_bath",
  ft_cold_water_no_flow: "water_bath",
  ft_hot_water_no_flow: "water_bath",
  ft_siphon_fault: "water_bath",
  ft_faucet_fault: "water_bath",
  ft_sink_drain_fault: "water_bath",
  ft_toilet_seat_broken: "water_bath",
  ft_shower_cabin_fault: "water_bath",
  ft_shower_head_fault: "water_bath",
  ft_towel_rail_fault: "water_bath",
  ft_bathroom_drain_clog: "water_bath",
  ft_tv_remote: "tv_electronics",
  ft_tv_fault: "tv_electronics",
  ft_phone_fault: "tv_electronics",
  ft_minibar_fault: "tv_electronics",
  ft_safe_fault: "tv_electronics",
  ft_kettle_fault: "tv_electronics",
  ft_hair_dryer_fault: "tv_electronics",
  ft_tv_channel_fault: "tv_electronics",
  ft_curtain_fallen: "door_window",
  ft_window_fault: "door_window",
  ft_window_cleaning: "door_window",
  ft_room_door_fault: "door_window",
  ft_bathroom_door_fault: "door_window",
  ft_balcony_door_fault: "door_window",
  ft_balcony_railing_loose: "door_window",
  ft_cornice_fault: "furniture",
  ft_headboard_fault: "furniture",
  ft_dresser_drawer_fault: "furniture",
  ft_drawer_fault: "furniture",
  ft_wardrobe_fault: "furniture",
  ft_mirror_damage: "furniture",
  ft_elevator_fault: "general_facility",
  ft_indoor_pool_temperature: "general_facility",
  ft_other: "other",
};

/** @param {string} ftIdRaw */
export function operationalFaultRequestCategoryTr(ftIdRaw) {
  const id = String(ftIdRaw || "")
    .trim()
    .toLowerCase();
  const sec = FAULT_ID_TO_SECTION[id] || "other";
  return FAULT_OPERATIONAL_SECTION_KEYS[sec] || FAULT_OPERATIONAL_SECTION_KEYS.other;
}

function toPositiveIntOperational(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const int = Math.floor(n);
  return int > 0 ? int : null;
}

const DEFAULT_WHATSAPP_PARAM_MAX = 900;

function clipOperationalParam(s, maxLen) {
  const t = String(s ?? "");
  const cap = maxLen > 0 ? maxLen : DEFAULT_WHATSAPP_PARAM_MAX;
  if (t.length <= cap) return t;
  return `${t.slice(0, cap - 1)}…`;
}

/** Boş değerler «-» (WhatsApp gövde parametreleri). */
function dashWabaBody(v) {
  const s = String(v ?? "").trim();
  return s.length ? s : "-";
}

/**
 * HK (`request`) ve teknik (`fault`) için sekiz Meta parametre sırası (HK şablonu):
 * ad, oda, talep kategorisi, talep türü, adet, tarih (gg.aa.yyyy), saat (SS:dd), açıklama (boş olabilir).
 * Teknik şablonu Meta’da 7 parametre ise `buildOperationalWhatsappTemplateBodyParams` adet satırını düşürür.
 * @returns {string[]}
 */
export function buildOperationalWhatsappEightParamValues(recordType, payload, eventInstant, options = {}) {
  const paramMax = options.paramMax ?? DEFAULT_WHATSAPP_PARAM_MAX;
  const clip = (x) => clipOperationalParam(x, paramMax);
  const rt = String(recordType || "").trim();
  const p = payload && typeof payload === "object" ? payload : {};
  const d = p.details && typeof p.details === "object" ? p.details : {};
  const name = clip(dashWabaBody(p.name));
  const room = clip(dashWabaBody(p.room));
  const dateStr = formatInstantHotelDdMmYyyy(eventInstant);
  const timeStr = formatInstantHotelHhMm(eventInstant);
  let requestCategory = "-";
  let requestType = "-";
  let quantity = "1";
  const descRaw = String(p.description ?? "").trim();

  if (rt === "request") {
    const cat = normalizeRequestCategoryKey(p.category);
    requestCategory = clip(dashWabaBody(requestSectionLabelTr(cat)));
    requestType = clip(dashWabaBody(buildRequestTypeLineTr(cat, d)));
    const qLine = buildRequestQuantityLine(cat, d);
    if (qLine != null) {
      quantity = clip(String(qLine).trim() || "1");
    } else {
      const qFall = toPositiveIntOperational(d.quantity);
      quantity = clip(qFall != null ? String(qFall) : "1");
    }
  } else if (rt === "fault") {
    const cat = String(p.category || "")
      .trim()
      .toLowerCase();
    requestCategory = clip(dashWabaBody(operationalFaultRequestCategoryTr(cat)));
    requestType = clip(dashWabaBody(categoryLabel("fault", cat)));
    const qn = toPositiveIntOperational(d.quantity);
    quantity = clip(String(qn != null && qn >= 1 ? qn : 1));
  }

  const note = clip(descRaw);

  return [name, room, requestCategory, requestType, quantity, dateStr, timeStr, note];
}

function operationalWhatsappTemplateRawParamCount(recordType) {
  const rt = String(recordType || "").trim();
  if (rt === "fault") {
    return String(process.env.WHATSAPP_CLOUD_FAULT_PARAM_COUNT ?? "7").trim();
  }
  return String(process.env.WHATSAPP_CLOUD_REQUEST_PARAM_COUNT ?? "8").trim();
}

/**
 * Meta şablonu:
 * - İstek (HK): 8 parametre (adet dahil) veya eski 4 parametre (birleşik kategori+tür).
 * - Teknik (arıza): varsayılan 7 parametre (adet yok; sıra: ad, oda, üst kategori, tür, tarih, saat, açıklama).
 *   Eski 8 parametreli Meta şablonu için `WHATSAPP_CLOUD_FAULT_PARAM_COUNT=8`.
 * @returns {string[]}
 */
export function buildOperationalWhatsappTemplateBodyParams(recordType, payload, eventInstant, options = {}) {
  const paramMax = options.paramMax ?? DEFAULT_WHATSAPP_PARAM_MAX;
  const eight = buildOperationalWhatsappEightParamValues(recordType, payload, eventInstant, { paramMax });
  const raw = operationalWhatsappTemplateRawParamCount(recordType);
  const rt = String(recordType || "").trim();
  if (raw === "7" || raw === "seven") {
    if (rt === "fault") {
      return [eight[0], eight[1], eight[2], eight[3], eight[5], eight[6], eight[7]];
    }
  }
  if (raw === "4" || raw === "four") {
    const parts = [eight[2], eight[3]].filter((x) => x && x !== "-" && x !== "—");
    const combined = clipOperationalParam(parts.length ? parts.join(" · ") : "-", paramMax);
    return [eight[0], eight[1], combined, eight[7]];
  }
  return eight;
}

export function operationalCategoryLabelTr(kind, cat) {
  return categoryLabel(kind, cat);
}

export function operationalGuestNotificationMainTr(catId) {
  return guestNotificationMainCategoryLabel(catId);
}

/** Web formu «bölüm» başlıkları (WhatsApp sohbet grubu değil). */
const REQUEST_SECTION_LABELS_TR = {
  hk_duvet_request: "Yatak & uyku konforu",
  hk_bed_join: "Yatak & uyku konforu",
  hk_bed_soften: "Yatak & uyku konforu",
  hk_pillow_request: "Yatak & uyku konforu",
  hk_pique_request: "Yatak & uyku konforu",
  hk_extra_bed: "Yatak & uyku konforu",
  hk_baby_crib: "Yatak & uyku konforu",
  hk_sheet_change: "Yatak & uyku konforu",
  hk_towel_request: "Havlu & banyo ihtiyaçları",
  hk_towel_change: "Havlu & banyo ihtiyaçları",
  hk_toilet_paper: "Havlu & banyo ihtiyaçları",
  hk_slippers: "Havlu & banyo ihtiyaçları",
  hk_dental_set: "Havlu & banyo ihtiyaçları",
  hk_amenity_kit: "Havlu & banyo ihtiyaçları",
  hk_water: "İçecek & oda ikramları",
  hk_coffee_tea_supplies: "İçecek & oda ikramları",
  hk_cup_request: "İçecek & oda ikramları",
  hk_room_cleaning: "Temizlik & hijyen",
  hk_trash_removal: "Temizlik & hijyen",
  hk_balcony_cleaning: "Temizlik & hijyen",
  hk_cleaning_dnd_coordinate: "Temizlik & hijyen",
  hk_bad_odor: "Temizlik & hijyen",
  hk_pest_control: "Temizlik & hijyen",
  hk_iron: "Ekipman & diğer",
  hk_vase: "Ekipman & diğer",
  other: "Diğer",
};

const ITEM_TYPE_LABELS = {
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
  kettle: "Kettle",
  other: "Diğer",
};

const ROOM_CLEANING_REQ = {
  general_cleaning: "Genel temizlik",
  towel_change: "Havlu değişimi",
  room_check: "Oda kontrolü",
};

const TIMING_LABELS = {
  now: "Şimdi",
  later: "Daha sonra",
};

const MINIBAR_REQ = {
  refill: "Minibar yenileme",
  missing_item_report: "Eksik ürün bildirimi",
  check_request: "Kontrol talebi",
};


/**
 * Uygulama modülü → operasyon hedefi (istek=HK, şikâyet/misafir/geç çıkış=ön büro, arıza=teknik).
 * Başlık sabit; Türkçe I/i büyük harf tuzağından kaçınmak için toUpperCase kullanılmaz.
 */
const ROUTING_LINE = {
  request: { line: "*İSTEK* · HK" },
  complaint: { line: "*ŞİKÂYET* · Ön büro" },
  fault: { line: "*ARIZA* · Teknik" },
  guest_notification: { line: "*MİSAFİR BİLDİRİMİ* · Ön büro" },
  late_checkout: { line: "*GEÇ ÇIKIŞ* · Ön büro" },
};

function dash(v) {
  const s = String(v ?? "").trim();
  return s.length ? s : "—";
}

/** İstemci / eski kayıtlarda camelCase veya büyük harf; sözlük anahtarları snake_case küçük harf. */
export function normalizeRequestCategoryKey(cat) {
  return String(cat ?? "")
    .trim()
    .toLowerCase();
}

/**
 * Supabase raw_payload: bazen yalnızca categories[] dolu; yeniden gönderimde category eksik kalabiliyor.
 */
export function coerceOperationalPayload(recordType, payload) {
  if (!payload || typeof payload !== "object") return payload || {};
  const out = { ...payload };
  const rt = String(recordType || "").trim();
  if (
    (rt === "request" || rt === "complaint" || rt === "fault" || rt === "guest_notification") &&
    !String(out.category || "").trim() &&
    Array.isArray(out.categories) &&
    out.categories.length
  ) {
    out.category = String(out.categories[0] || "").trim();
  }
  return out;
}

function categoryLabel(kind, cat) {
  const c = String(cat || "").trim();
  const lower = c.toLowerCase();
  const map = WH_CATEGORY_LABELS?.[kind];
  return dash(map?.[c] || map?.[lower] || c);
}

function guestNotificationMainCategoryLabel(catId) {
  const c = String(catId || "")
    .trim()
    .toLowerCase();
  const m = WH_CATEGORY_LABELS?.guest_notification_main?.[c];
  return dash(m || "Misafir bildirimi");
}

function requestItemLabelTr(category) {
  const c = normalizeRequestCategoryKey(category);
  if (!c) return "—";
  return WH_CATEGORY_LABELS.request[c] || "—";
}

function requestSectionLabelTr(category) {
  const c = normalizeRequestCategoryKey(category);
  if (!c) return "—";
  const g = REQUEST_SECTION_LABELS_TR[c];
  if (g) return dash(g);
  return categoryLabel("request", c);
}

function itemTypeLabel(v) {
  const x = String(v || "")
    .trim()
    .toLowerCase();
  return dash(ITEM_TYPE_LABELS[x] || String(v || "").trim() || "—");
}

function buildRequestTypeLineTr(category, details) {
  const d = details && typeof details === "object" ? details : {};
  const c = normalizeRequestCategoryKey(category);
  const base = requestItemLabelTr(c);
  if (c.startsWith("hk_") || c === "other") return dash(base);
  if (d.timing && (c === "room_cleaning" || c === "turndown")) {
    return dash(`${base} · ${TIMING_LABELS[d.timing] || String(d.timing)}`);
  }
  if (c === "room_cleaning" && d.requestType) {
    const parts = [ROOM_CLEANING_REQ[d.requestType] || String(d.requestType)];
    if (d.timing) parts.push(TIMING_LABELS[d.timing] || String(d.timing));
    return dash(parts.join(" · "));
  }
  if (c === "towel" || c === "bedding") {
    return dash(itemTypeLabel(d.itemType) || base);
  }
  if (c === "minibar") {
    return dash(MINIBAR_REQ[d.requestType] || d.requestType || base);
  }
  if (c === "baby_equipment" || c === "room_equipment") {
    return dash(itemTypeLabel(d.itemType) || base);
  }
  if (c === "other") return dash(base);
  return dash(base);
}

function buildRequestQuantityLine(category, details) {
  const d = details && typeof details === "object" ? details : {};
  const c = normalizeRequestCategoryKey(category);
  if (!/^hk_/.test(c)) return null;
  if (d.quantity != null && String(d.quantity).trim() !== "") {
    return dash(String(d.quantity));
  }
  return null;
}

/**
 * @param {string} recordType — fault | request | complaint | guest_notification | late_checkout
 * @param {object} payload — normalize edilmiş misafir kaydı
 */
export function formatOperationalTemplatePreviewText(recordType, payload) {
  const rt = String(recordType || "").trim();
  payload = coerceOperationalPayload(rt, payload);
  const route = ROUTING_LINE[rt] || { line: "*OPERASYON*" };
  const submittedRaw = payload?.submittedAt ? new Date(payload.submittedAt) : new Date();
  const submitted =
    Number.isFinite(submittedRaw.getTime()) ? submittedRaw : new Date();
  const dateStr = formatInstantHotelDdMmYyyy(submitted);
  const timeStr = formatInstantHotelHhMm(submitted);

  const lines = [];

  lines.push(route.line);
  lines.push("────────────────");

  lines.push(`Misafir: ${dash(payload?.name)}`);
  lines.push(`Oda: ${dash(payload?.room)}`);

  if (rt === "request") {
    const cat = normalizeRequestCategoryKey(payload?.category);
    const details = payload?.details && typeof payload.details === "object" ? payload.details : {};
    lines.push(`Talep kategorisi: ${requestSectionLabelTr(cat)}`);
    lines.push(`Talep türü: ${buildRequestTypeLineTr(cat, details)}`);
    const qty = buildRequestQuantityLine(cat, details);
    if (qty != null) lines.push(`Adet: ${qty}`);
    const desc = dash(payload?.description);
    if (desc !== "—") lines.push(`Açıklama notu: ${desc}`);
  } else if (rt === "fault") {
    const catf = String(payload?.category || "")
      .trim()
      .toLowerCase();
    lines.length = 0;
    lines.push("Arıza Kaydı Oluşturuldu");
    lines.push("");
    lines.push("Arıza kaydı detayları aşağıdadır.");
    lines.push("");
    lines.push(`Misafir adı: ${dash(payload?.name)}`);
    lines.push(`Oda numarası: ${dash(payload?.room)}`);
    lines.push(`Talep kategorisi: ${operationalFaultRequestCategoryTr(catf)}`);
    lines.push(`Talep türü: ${categoryLabel("fault", catf)}`);
    lines.push(`Tarih bilgisi: ${dateStr}`);
    lines.push(`Saat bilgisi: ${timeStr}`);
    const descRaw = String(payload?.description ?? "").trim();
    if (descRaw) lines.push(`Açıklama notu: ${descRaw} olarak iletildi`);
  } else if (rt === "complaint") {
    lines.push(`Konu: ${categoryLabel("complaint", payload?.category)}`);
    const desc = dash(payload?.description);
    if (desc !== "—") lines.push(`Açıklama: ${desc}`);
  } else if (rt === "guest_notification") {
    const cat = String(payload?.category || "").trim();
    lines.push(`Genel alan: ${guestNotificationMainCategoryLabel(cat)}`);
    lines.push(`Alt başlık: ${categoryLabel("guest_notification", cat)}`);
    const desc = dash(payload?.description);
    if (desc !== "—") lines.push(`Detay: ${desc}`);
  } else if (rt === "late_checkout") {
    const rawD = String(payload.checkoutDate || payload.details?.checkoutDate || "").trim();
    const rawT = String(payload.checkoutTime || payload.details?.checkoutTime || "").trim();
    const dateHuman = formatIsoCalendarYmdAsDdMmYyyy(rawD) || dash(rawD);
    lines.push(`İstenen çıkış tarihi: ${dateHuman}`);
    lines.push(`İstenen çıkış saati: ${dash(rawT)}`);
    const desc = dash(payload?.description);
    if (desc !== "—") lines.push(`Açıklama: ${desc}`);
  }

  if (rt !== "fault") {
    lines.push(`Kayıt zamanı: ${dateStr} ${timeStr}`);
  }

  return lines.join("\n");
}

function mergeRowPayloadDetails(row) {
  const r = row && typeof row === "object" ? row : {};
  const details = r.details && typeof r.details === "object" ? r.details : {};
  const raw = r.raw_payload && typeof r.raw_payload === "object" ? r.raw_payload : {};
  const rd = raw.details && typeof raw.details === "object" ? raw.details : {};
  return { ...rd, ...details };
}

/** Günlük operasyon PDF — HK istek satırı «form bölümü». */
export function opReportRequestSection(row) {
  const r = coerceOperationalPayload("request", row);
  return requestSectionLabelTr(normalizeRequestCategoryKey(r.category));
}

/** Günlük operasyon PDF — HK «talep türü». */
export function opReportRequestTypeLine(row) {
  const r = coerceOperationalPayload("request", row);
  return buildRequestTypeLineTr(normalizeRequestCategoryKey(r.category), mergeRowPayloadDetails(r));
}

/** Günlük operasyon PDF — HK adet (yoksa «—»). */
export function opReportRequestQuantityDisplay(row) {
  const r = coerceOperationalPayload("request", row);
  const q = buildRequestQuantityLine(normalizeRequestCategoryKey(r.category), mergeRowPayloadDetails(r));
  return q != null ? q : "—";
}

export function opReportFaultCategory(row) {
  const r = coerceOperationalPayload("fault", row);
  return categoryLabel("fault", r.category);
}

/** Günlük operasyon PDF — teknik «talep kategorisi» (üst başlık). */
export function opReportFaultRequestSection(row) {
  const r = coerceOperationalPayload("fault", row);
  return operationalFaultRequestCategoryTr(String(r.category || "").toLowerCase());
}

/** Günlük operasyon PDF — teknik adet (yoksa 1). */
export function opReportFaultQuantityDisplay(row) {
  const r = coerceOperationalPayload("fault", row);
  const d = mergeRowPayloadDetails(r);
  const q = toPositiveIntOperational(d.quantity);
  return String(q != null && q >= 1 ? q : 1);
}

export function opReportComplaintSubject(row) {
  const r = coerceOperationalPayload("complaint", row);
  return categoryLabel("complaint", r.category);
}

export function opReportGuestNotificationMain(row) {
  const r = coerceOperationalPayload("guest_notification", row);
  return guestNotificationMainCategoryLabel(r.category);
}

export function opReportGuestNotificationSub(row) {
  const r = coerceOperationalPayload("guest_notification", row);
  return categoryLabel("guest_notification", r.category);
}
