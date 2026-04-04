/**
 * Operasyon kayıtları (arıza / istek / şikayet) Supabase’e yazıldıktan sonra tetiklenen
 * WhatsApp Cloud API template bildirim katmanı. Rezervasyon göndermez.
 *
 * Şablon adları: arıza/istek/şikâyet sabit; misafir bildirimi + geç çıkış için varsayılan
 * `viona_guest_relation_notification` (7 gövde parametresi: ad, oda, üst kategori, alt kategori, tarih, saat, açıklama).
 * Geç çıkış aynı şablonu kullanır; üst/alt kategori sabit metin, tarih-saat istenen çıkış.
 * Şablon adı önceliği: WHATSAPP_GUEST_RELATION_TEMPLATE_NAME → WHATSAPP_GUEST_NOTIFICATION_TEMPLATE → viona_guest_relation_notification.
 * Eski Manager adı: viona_guest_notification → env ile geçici bağlanabilir.
 * Env: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
 * WHATSAPP_TECH_RECIPIENTS | WHATSAPP_HK_RECIPIENTS | WHATSAPP_FRONT_RECIPIENTS |
 * WHATSAPP_RECEPTION_RECIPIENTS | WHATSAPP_GUEST_RELATIONS_RECIPIENTS
 * (misafir bildirimi / geç çıkış: hepsi birleştirilir; en az biri dolu olmalı — genelde WHATSAPP_FRONT_RECIPIENTS)
 */

const TEMPLATE_FAULT = "viona_issue_notification";
const TEMPLATE_REQUEST = "viona_request_notification";
const TEMPLATE_COMPLAINT = "viona_complaint_notification";
const DEFAULT_TEMPLATE_GUEST_RELATION = "viona_guest_relation_notification";

const PARAM_MAX = 900;

const WH_CATEGORY_LABELS = {
  request: {
    towel: "Havlu",
    bedding: "Yatak takımı",
    room_cleaning: "Oda temizliği",
    minibar: "Minibar",
    baby_equipment: "Bebek ekipmanları",
    room_equipment: "Oda ekipmanları",
    other: "Diğer",
  },
  fault: {
    hvac: "Klima / Isıtma",
    electric: "Elektrik",
    water_bathroom: "Su / Banyo",
    tv_electronics: "TV / Elektronik",
    door_lock: "Kapı kilidi",
    furniture_item: "Mobilya",
    cleaning_equipment_damage: "Temizlik ekipmanı hasarı",
    balcony_window: "Balkon / Pencere",
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
    climate: "Isı / Klima",
    room_comfort: "Oda konforu",
    minibar: "Minibar",
    restaurant_service: "Restoran servisi",
    staff_behavior: "Personel davranışı",
    general_areas: "Genel alanlar",
    hygiene: "Hijyen",
    internet_tv: "İnternet / TV",
    other: "Diğer",
  },
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
  later: "Sonra",
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

function dash(v) {
  const s = String(v ?? "").trim();
  return s.length ? s : "-";
}

function clip(s) {
  const t = String(s ?? "");
  if (t.length <= PARAM_MAX) return t;
  return t.slice(0, PARAM_MAX - 1) + "…";
}

function categoryLabel(kind, cat) {
  const k = String(kind);
  const c = String(cat || "").trim();
  return clip(dash(WH_CATEGORY_LABELS?.[k]?.[c] || c));
}

function guestNotificationMainCategoryLabel(catId) {
  const c = String(catId || "").trim();
  const m = WH_CATEGORY_LABELS?.guest_notification_main?.[c];
  return clip(dash(m || "Misafir bildirimi"));
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

function normalizeGuestType(payload, intentFallback) {
  const raw = String(payload?.type || "").toLowerCase();
  if (
    raw === "fault" ||
    raw === "request" ||
    raw === "complaint" ||
    raw === "guest_notification" ||
    raw === "late_checkout"
  )
    return raw;
  const i = String(intentFallback || "").toLowerCase();
  if (i === "fault_report") return "fault";
  if (i === "request") return "request";
  if (i === "complaint") return "complaint";
  if (i === "guest_notification") return "guest_notification";
  if (i === "late_checkout") return "late_checkout";
  return raw || "unknown";
}

function mergeRecipientLists(...lists) {
  const seen = new Set();
  const out = [];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const n of list) {
      if (!seen.has(n)) {
        seen.add(n);
        out.push(n);
      }
    }
  }
  return out;
}

/**
 * Virgül / noktalı virgül / satır sonu ile ayrılmış numaralar; segment trim; API için E.164 rakamları.
 */
export function parseOperationalRecipients(raw) {
  if (raw == null) return [];
  const text = String(raw).trim();
  if (!text) return [];
  const seen = new Set();
  const out = [];
  for (const segment of text.split(/[,;\n\r]+/)) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length >= 10 && digits.length <= 15) {
      if (!seen.has(digits)) {
        seen.add(digits);
        out.push(digits);
      }
    }
  }
  return out;
}

export const parseWhatsappRecipientList = parseOperationalRecipients;

export function recipientsForGuestPayload(payload, intentFallback = "unknown") {
  const pt = String(payload?.type || "").toLowerCase();
  if (pt === "fault") return parseOperationalRecipients(process.env.WHATSAPP_TECH_RECIPIENTS || "");
  if (pt === "request") return parseOperationalRecipients(process.env.WHATSAPP_HK_RECIPIENTS || "");
  if (pt === "complaint") return parseOperationalRecipients(process.env.WHATSAPP_FRONT_RECIPIENTS || "");
  if (pt === "guest_notification" || pt === "late_checkout") {
    const front = parseOperationalRecipients(process.env.WHATSAPP_FRONT_RECIPIENTS || "");
    const reception = parseOperationalRecipients(process.env.WHATSAPP_RECEPTION_RECIPIENTS || "");
    const gr = parseOperationalRecipients(process.env.WHATSAPP_GUEST_RELATIONS_RECIPIENTS || "");
    const hk = parseOperationalRecipients(process.env.WHATSAPP_HK_RECIPIENTS || "");
    // Önce ön büro (WHATSAPP_FRONT_RECIPIENTS), sonra resepsiyon / misafir ilişkileri / HK.
    const merged = mergeRecipientLists(front, reception, gr, hk);
    if (merged.length) return merged;
    return [];
  }
  const t = normalizeGuestType(payload, intentFallback);
  if (t === "fault") return parseOperationalRecipients(process.env.WHATSAPP_TECH_RECIPIENTS || "");
  if (t === "request") return parseOperationalRecipients(process.env.WHATSAPP_HK_RECIPIENTS || "");
  if (t === "complaint") return parseOperationalRecipients(process.env.WHATSAPP_FRONT_RECIPIENTS || "");
  if (t === "guest_notification" || t === "late_checkout") {
    const front = parseOperationalRecipients(process.env.WHATSAPP_FRONT_RECIPIENTS || "");
    const reception = parseOperationalRecipients(process.env.WHATSAPP_RECEPTION_RECIPIENTS || "");
    const gr = parseOperationalRecipients(process.env.WHATSAPP_GUEST_RELATIONS_RECIPIENTS || "");
    const hk = parseOperationalRecipients(process.env.WHATSAPP_HK_RECIPIENTS || "");
    const merged = mergeRecipientLists(front, reception, gr, hk);
    if (merged.length) return merged;
    return [];
  }
  return [];
}

function locLabel(v) {
  const x = String(v || "").trim();
  return clip(dash(LOCATION_LABELS[x] || x));
}

function urgLabel(v) {
  const x = String(v || "").trim();
  return clip(dash(URGENCY_LABELS[x] || x));
}

function itemTypeLabel(v) {
  const x = String(v || "").trim();
  return clip(dash(ITEM_TYPE_LABELS[x] || x));
}

function buildFaultBodyParams(payload, now) {
  const loc = payload.location || payload.details?.location;
  const urg = payload.urgency || payload.details?.urgency;
  return [
    clip(dash(payload.name)),
    clip(dash(payload.room)),
    categoryLabel("fault", payload.category),
    locLabel(loc),
    urgLabel(urg),
    dash(formatDateDDMMYYYY(now)),
    dash(formatTimeHHmm(now)),
    clip(dash(payload.description)),
  ];
}

function buildRequestTalepTuru(category, details) {
  const d = details && typeof details === "object" ? details : {};
  const c = String(category || "").trim();
  if (c === "towel" || c === "bedding") {
    return itemTypeLabel(d.itemType);
  }
  if (c === "room_cleaning") {
    const parts = [];
    if (d.requestType) parts.push(ROOM_CLEANING_REQ[d.requestType] || String(d.requestType));
    if (d.timing) parts.push(TIMING_LABELS[d.timing] || String(d.timing));
    return clip(dash(parts.length ? parts.join(" · ") : "-"));
  }
  if (c === "minibar") {
    return clip(dash(MINIBAR_REQ[d.requestType] || d.requestType));
  }
  if (c === "baby_equipment" || c === "room_equipment") {
    return itemTypeLabel(d.itemType);
  }
  if (c === "other") return "-";
  return "-";
}

function buildRequestQuantity(category, details) {
  const d = details && typeof details === "object" ? details : {};
  const c = String(category || "").trim();
  if (c === "towel" || c === "bedding" || c === "baby_equipment" || c === "room_equipment") {
    if (d.quantity != null && String(d.quantity).trim() !== "") return clip(dash(String(d.quantity)));
  }
  return "-";
}

function buildRequestBodyParams(payload, now) {
  const cat = payload.category;
  const details = payload.details || {};
  return [
    clip(dash(payload.name)),
    clip(dash(payload.room)),
    categoryLabel("request", cat),
    buildRequestTalepTuru(cat, details),
    buildRequestQuantity(cat, details),
    dash(formatDateDDMMYYYY(now)),
    dash(formatTimeHHmm(now)),
    clip(dash(payload.description)),
  ];
}

function buildComplaintBodyParams(payload, now) {
  return [
    clip(dash(payload.name)),
    clip(dash(payload.room)),
    categoryLabel("complaint", payload.category),
    dash(formatDateDDMMYYYY(now)),
    dash(formatTimeHHmm(now)),
    clip(dash(payload.description)),
  ];
}

/**
 * Meta şablon sırası: {{1}} ad, {{2}} oda, {{3}} üst kategori, {{4}} alt kategori, {{5}} tarih, {{6}} saat, {{7}} açıklama.
 * Genel bildirimlerde {{5}}/{{6}} kayıt anı; geç çıkışta istenen çıkış tarihi/saati.
 */
function buildGuestNotificationBodyParams(payload, now) {
  const cat = String(payload.category || "").trim();
  return [
    clip(dash(payload.name)),
    clip(dash(payload.room)),
    guestNotificationMainCategoryLabel(cat),
    categoryLabel("guest_notification", cat),
    dash(formatDateDDMMYYYY(now)),
    dash(formatTimeHHmm(now)),
    clip(dash(payload.description)),
  ];
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

function buildLateCheckoutBodyParams(payload) {
  const rawD = String(payload.checkoutDate || payload.details?.checkoutDate || "").trim();
  const rawT = String(payload.checkoutTime || payload.details?.checkoutTime || "").trim();
  const dt = parseIsoDateToLocalDate(rawD);
  const dateStr = dt ? formatDateDDMMYYYY(dt) : dash(rawD);
  return [
    clip(dash(payload.name)),
    clip(dash(payload.room)),
    clip("Geç çıkış"),
    clip("Talep edilen çıkış"),
    dash(dateStr),
    dash(rawT || "-"),
    clip(dash(payload.description)),
  ];
}

function templateLanguageCode() {
  return (
    String(process.env.WHATSAPP_TEMPLATE_LANGUAGE || process.env.WHATSAPP_OPERATIONAL_TEMPLATE_LANGUAGE || "tr").trim() ||
    "tr"
  );
}

/** Meta Business’ta onaylı şablon adı (misafir bildirimi + geç çıkış, 7 parametre). */
function resolveGuestRelationTemplateName() {
  const raw = String(
    process.env.WHATSAPP_GUEST_RELATION_TEMPLATE_NAME ||
      process.env.WHATSAPP_GUEST_NOTIFICATION_TEMPLATE ||
      "",
  ).trim();
  return raw || DEFAULT_TEMPLATE_GUEST_RELATION;
}

/** .env’de tırnak / boşluk / yanlış satır sonu token’ı bozmasın; iki anahtar adı desteklenir. */
function normalizeSecretEnv(raw) {
  let s = String(raw ?? "").trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s.replace(/\s+/g, "");
}

/**
 * @returns {{ token: string, envKey: string }}
 */
export function resolveWhatsappAccessToken() {
  const keys = ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_CLOUD_ACCESS_TOKEN"];
  for (const k of keys) {
    const t = normalizeSecretEnv(process.env[k]);
    if (t) return { token: t, envKey: k };
  }
  return { token: "", envKey: "" };
}

export function resolveWhatsappPhoneNumberId() {
  return String(process.env.WHATSAPP_PHONE_NUMBER_ID ?? "")
    .trim()
    .replace(/\s+/g, "");
}

/** Cloud API `POST .../messages` tam URL; phone ID yoksa boş. */
export function buildWhatsappGraphMessagesUrl() {
  const phoneNumberId = resolveWhatsappPhoneNumberId();
  if (!phoneNumberId) return "";
  const rawGraphVer = String(process.env.WHATSAPP_GRAPH_API_VERSION || "v21.0").trim();
  const graphVer = rawGraphVer.startsWith("v") ? rawGraphVer : `v${rawGraphVer}`;
  return `https://graph.facebook.com/${graphVer}/${phoneNumberId}/messages`;
}

/** /api/health: anahtar sızdırmaz; misafir bildirimi + geç çıkış şablonu alıcı sayısı. */
export function getWhatsappOperationalHealthSummary() {
  const { token } = resolveWhatsappAccessToken();
  const phoneId = resolveWhatsappPhoneNumberId();
  const front = parseOperationalRecipients(process.env.WHATSAPP_FRONT_RECIPIENTS || "");
  const reception = parseOperationalRecipients(process.env.WHATSAPP_RECEPTION_RECIPIENTS || "");
  const gr = parseOperationalRecipients(process.env.WHATSAPP_GUEST_RELATIONS_RECIPIENTS || "");
  const hk = parseOperationalRecipients(process.env.WHATSAPP_HK_RECIPIENTS || "");
  const mergedGuest = mergeRecipientLists(front, reception, gr, hk);
  return {
    accessTokenConfigured: Boolean(token),
    phoneNumberIdConfigured: Boolean(phoneId),
    cloudApiSendReady: Boolean(token && phoneId),
    guestRelationRecipientCount: mergedGuest.length,
  };
}

function parseMetaError(raw) {
  let detail = String(raw || "").slice(0, 1200);
  let code = "";
  let sub = "";
  let msg = "";
  try {
    const j = JSON.parse(raw);
    const e = j?.error;
    if (e && typeof e === "object") {
      msg = String(e.message || "");
      code = e.code != null ? String(e.code) : "";
      sub = e.error_subcode != null ? String(e.error_subcode) : "";
      detail = [
        msg,
        e.error_user_title,
        e.error_user_msg,
        code ? `code=${code}` : "",
        sub ? `subcode=${sub}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
      if (code === "190" || /session has expired|invalid oauth|logged out/i.test(msg)) {
        detail +=
          " | token_invalid: Meta Business → System Users → kalıcı token (User/Graph Explorer token veya çıkış yapılmış oturum 190/467 verir)";
      }
      if (/template/i.test(msg) && /invalid|not found|mismatch/i.test(msg)) {
        detail += " | template_error: Manager adı/dil/parametre sayısı";
      }
      if (/permission|denied|forbidden/i.test(msg)) {
        detail += " | permission_error";
      }
      if (/phone number|recipient/i.test(msg)) {
        detail += " | invalid_recipient_or_not_onboarded";
      }
    }
  } catch {
    /* ham metin */
  }
  return { detail, code, sub, msg };
}

/**
 * Kayıt başarıyla oluşturulduktan sonra çağrılır (createGuestRequest içinden).
 * @param {object} payload — normalize edilmiş misafir kaydı
 * @param {string} [intentFallback]
 */
export async function sendOperationalWhatsappNotification(payload, intentFallback = "unknown") {
  const recordType = normalizeGuestType(payload, intentFallback);
  const { token, envKey: tokenEnvKey } = resolveWhatsappAccessToken();
  const phoneNumberId = resolveWhatsappPhoneNumberId();

  if (!token || !phoneNumberId) {
    console.warn(
      "[whatsapp_ops] notify_skipped reason=missing_credentials record_type=%s detail=set_WHATSAPP_ACCESS_TOKEN_or_WHATSAPP_CLOUD_ACCESS_TOKEN_and_WHATSAPP_PHONE_NUMBER_ID",
      recordType,
    );
    return;
  }

  if (
    recordType !== "fault" &&
    recordType !== "request" &&
    recordType !== "complaint" &&
    recordType !== "guest_notification" &&
    recordType !== "late_checkout"
  ) {
    console.info("[whatsapp_ops] notify_skipped reason=not_operational_type record_type=%s", recordType);
    return;
  }

  let templateName = "";
  if (recordType === "fault") templateName = TEMPLATE_FAULT;
  else if (recordType === "request") templateName = TEMPLATE_REQUEST;
  else if (recordType === "complaint") templateName = TEMPLATE_COMPLAINT;
  else templateName = resolveGuestRelationTemplateName();

  const recipients = recipientsForGuestPayload(payload, intentFallback);
  if (!recipients.length) {
    const listName =
      recordType === "fault"
        ? "WHATSAPP_TECH_RECIPIENTS"
        : recordType === "request"
          ? "WHATSAPP_HK_RECIPIENTS"
          : recordType === "complaint"
            ? "WHATSAPP_FRONT_RECIPIENTS"
            : "WHATSAPP_FRONT_RECIPIENTS veya RECEPTION / GUEST_RELATIONS / HK (en az biri dolu olmalı)";
    console.warn(
      "[whatsapp_ops] notify_skipped reason=empty_recipient_list record_type=%s template=%s env_list=%s (virgülle numara ekleyin)",
      recordType,
      templateName,
      listName,
    );
    return;
  }

  const now = new Date();
  let bodyParams = [];
  if (recordType === "fault") bodyParams = buildFaultBodyParams(payload, now);
  else if (recordType === "request") bodyParams = buildRequestBodyParams(payload, now);
  else if (recordType === "complaint") bodyParams = buildComplaintBodyParams(payload, now);
  else if (recordType === "late_checkout") bodyParams = buildLateCheckoutBodyParams(payload);
  else bodyParams = buildGuestNotificationBodyParams(payload, now);

  const graphUrl = buildWhatsappGraphMessagesUrl();
  const lang = templateLanguageCode();

  console.info(
    "[whatsapp_ops] send_start record_type=%s template=%s language=%s recipient_count=%d recipients=%s param_count=%d waba_env_set=%s token_env=%s token_len=%d",
    recordType,
    templateName,
    lang,
    recipients.length,
    recipients.join(","),
    bodyParams.length,
    process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ? "yes" : "no",
    tokenEnvKey || "-",
    token.length,
  );

  const bodyParameters = bodyParams.map((text) => ({ type: "text", text: dash(text) }));

  for (const to of recipients) {
    let res;
    let raw = "";
    try {
      res = await fetch(graphUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: templateName,
            language: { code: lang },
            components: [{ type: "body", parameters: bodyParameters }],
          },
        }),
      });
      raw = await res.text().catch(() => "");
    } catch (err) {
      console.warn(
        "[whatsapp_ops] send_error record_type=%s template=%s to=%s error=%s",
        recordType,
        templateName,
        to,
        err?.message || err,
      );
      continue;
    }

    if (res.ok) {
      let msgId = "";
      try {
        const j = JSON.parse(raw);
        msgId = j?.messages?.[0]?.id || "";
      } catch {
        /* ignore */
      }
      console.info(
        "[whatsapp_ops] send_ok record_type=%s template=%s to=%s http_status=%s message_id=%s",
        recordType,
        templateName,
        to,
        res.status,
        msgId || "-",
      );
      continue;
    }

    const { detail, code, sub, msg } = parseMetaError(raw);
    console.warn(
      "[whatsapp_ops] send_failed record_type=%s template=%s to=%s http_status=%s error_code=%s error_subcode=%s error_message=%s meta_response=%s",
      recordType,
      templateName,
      to,
      res.status,
      code || "-",
      sub || "-",
      (msg || "-").slice(0, 500),
      detail.slice(0, 1000),
    );
  }
}

/** Geriye dönük uyum: önceki import adı. */
export const sendWhatsappOperationalNotification = sendOperationalWhatsappNotification;
