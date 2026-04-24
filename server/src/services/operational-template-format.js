/**
 * Operasyon kayıtları için payload normalizasyonu ve Türkçe etiket sözlüğü.
 * WhatsApp Cloud API şablon gövdesi parametreleriyle uyumlu (grup / whatsapp-web.js yok).
 */

const WH_CATEGORY_LABELS = {
  request: {
    towel_extra: "Ek havlu",
    room_towel: "Ek oda havlusu",
    bathrobe: "Bornoz",
    bedding_sheet: "Çarşaf / nevresim",
    bedding_pillow: "Yastık",
    bedding_blanket: "Battaniye",
    room_cleaning: "Oda temizliği",
    turndown: "Yatak düzenleme (turndown)",
    slippers: "Terlik",
    minibar_refill: "Minibar yenileme",
    bottled_water: "Şişe su",
    tea_coffee: "Çay / kahve",
    toilet_paper: "Tuvalet kağıdı",
    toiletries: "Şampuan / sabun",
    climate_request: "Klima ayarı",
    room_refresh: "Oda kokusu",
    hanger: "Askı",
    kettle: "Su ısıtıcı",
    room_safe: "Kasa",
    baby_bed: "Bebek yatağı",
    towel: "Havlu",
    bedding: "Yatak / nevresim",
    minibar: "Minibar",
    baby_equipment: "Bebek ekipmanı",
    room_equipment: "Oda ekipmanı",
    other: "Diğer",
  },
  fault: {
    hvac: "Klima / ısıtma",
    electric: "Elektrik",
    water_bathroom: "Su / banyo",
    tv_electronics: "TV / elektronik",
    door_lock: "Kapı kilidi",
    furniture_item: "Mobilya",
    cleaning_equipment_damage: "Temizlik ekipmanı hasarı",
    balcony_window: "Balkon / pencere",
    other: "Diğer",
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

/** Web formu «bölüm» başlıkları (WhatsApp sohbet grubu değil). */
const REQUEST_SECTION_LABELS_TR = {
  towel_extra: "Yastık, havlu, bornoz ve terlik",
  room_towel: "Yastık, havlu, bornoz ve terlik",
  bathrobe: "Yastık, havlu, bornoz ve terlik",
  slippers: "Yastık, havlu, bornoz ve terlik",
  towel: "Yastık, havlu, bornoz ve terlik",
  bedding_sheet: "Çarşaf ve battaniye",
  bedding_blanket: "Çarşaf ve battaniye",
  bedding: "Çarşaf ve battaniye",
  bedding_pillow: "Yastık, havlu, bornoz ve terlik",
  room_cleaning: "Oda hizmeti",
  turndown: "Oda hizmeti",
  minibar_refill: "Şişe su ve çay / kahve",
  bottled_water: "Şişe su ve çay / kahve",
  tea_coffee: "Şişe su ve çay / kahve",
  minibar: "Şişe su ve çay / kahve",
  toilet_paper: "Tuvalet kağıdı ve şampuan / sabun",
  toiletries: "Tuvalet kağıdı ve şampuan / sabun",
  climate_request: "Konfor ve klima",
  room_refresh: "Konfor ve klima",
  hanger: "Ekipman",
  kettle: "Ekipman",
  room_safe: "Ekipman",
  baby_bed: "Ekipman",
  baby_equipment: "Ekipman",
  room_equipment: "Ekipman",
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

const LOCATION_LABELS = {
  room_inside: "Oda içi",
  bathroom: "Banyo",
  balcony: "Balkon",
  other: "Diğer",
};

const URGENCY_LABELS = {
  normal: "Normal",
  urgent: "Acil",
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

function formatDateDDMMYYYY(d) {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function formatTimeHHmm(d) {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
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
  if (d.quantity != null && String(d.quantity).trim() !== "") {
    return dash(String(d.quantity));
  }
  return null;
}

function locLabel(v) {
  const x = String(v || "").trim();
  return dash(LOCATION_LABELS[x] || x);
}

function urgLabel(v) {
  const x = String(v || "").trim();
  return dash(URGENCY_LABELS[x] || x);
}

function parseIsoDateToLocalDate(isoYmd) {
  const s = String(isoYmd || "").trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
  return dt;
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
  const dateStr = formatDateDDMMYYYY(submitted);
  const timeStr = formatTimeHHmm(submitted);

  const lines = [];

  lines.push(route.line);
  lines.push("────────────────");

  lines.push(`Misafir: ${dash(payload?.name)}`);
  lines.push(`Oda: ${dash(payload?.room)}`);

  if (rt === "request") {
    const cat = normalizeRequestCategoryKey(payload?.category);
    const details = payload?.details && typeof payload.details === "object" ? payload.details : {};
    lines.push(`Form bölümü: ${requestSectionLabelTr(cat)}`);
    lines.push(`Talep türü: ${buildRequestTypeLineTr(cat, details)}`);
    const qty = buildRequestQuantityLine(cat, details);
    if (qty != null) lines.push(`Adet: ${qty}`);
    const desc = dash(payload?.description);
    if (desc !== "—") lines.push(`Misafir notu: ${desc}`);
  } else if (rt === "fault") {
    lines.push(`Arıza kategorisi: ${categoryLabel("fault", payload?.category)}`);
    lines.push(`Konum: ${locLabel(payload?.location || payload?.details?.location)}`);
    lines.push(`Öncelik: ${urgLabel(payload?.urgency || payload?.details?.urgency)}`);
    const desc = dash(payload?.description);
    if (desc !== "—") lines.push(`Açıklama: ${desc}`);
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
    const dt = parseIsoDateToLocalDate(rawD);
    const dateHuman = dt ? formatDateDDMMYYYY(dt) : dash(rawD);
    lines.push(`İstenen çıkış tarihi: ${dateHuman}`);
    lines.push(`İstenen çıkış saati: ${dash(rawT)}`);
    const desc = dash(payload?.description);
    if (desc !== "—") lines.push(`Açıklama: ${desc}`);
  }

  lines.push(`Kayıt zamanı: ${dateStr} ${timeStr}`);

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

export function opReportFaultLocation(row) {
  const r = coerceOperationalPayload("fault", row);
  const d = mergeRowPayloadDetails(r);
  return locLabel(r.location || d.location);
}

export function opReportFaultUrgency(row) {
  const r = coerceOperationalPayload("fault", row);
  const d = mergeRowPayloadDetails(r);
  return urgLabel(r.urgency || d.urgency);
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
