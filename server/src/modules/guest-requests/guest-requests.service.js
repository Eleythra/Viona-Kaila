import { getSupabase } from "../../lib/supabase.js";

const SIMPLE_TYPES = new Set(["request", "complaint", "fault"]);
const RESERVATION_TYPES = new Set(["reservation_alacarte", "reservation_spa"]);
const REQUEST_CATEGORIES = new Set([
  "towel",
  "bedding",
  "room_cleaning",
  "minibar",
  "baby_equipment",
  "room_equipment",
  "other",
]);
const REQUEST_CATEGORY_ALIASES = {
  extraTowels: "towel",
  extra_towels: "towel",
  towels: "towel",
  linen: "bedding",
  roomCleaning: "room_cleaning",
  room_cleaning_request: "room_cleaning",
  minibarRefill: "minibar",
  minibar_request: "minibar",
  babyNeeds: "baby_equipment",
  baby_equipment_request: "baby_equipment",
  roomSupplies: "room_equipment",
  room_equipment_request: "room_equipment",
  otherRequest: "other",
};
const COMPLAINT_CATEGORIES = new Set([
  "room_cleaning",
  "noise",
  "climate",
  "room_comfort",
  "minibar",
  "restaurant_service",
  "staff_behavior",
  "general_areas",
  "hygiene",
  "internet_tv",
  "other",
]);
const COMPLAINT_DESC_REQUIRED = new Set(["staff_behavior", "general_areas", "hygiene", "other"]);
const FAULT_CATEGORIES = new Set([
  "hvac",
  "electric",
  "water_bathroom",
  "tv_electronics",
  "door_lock",
  "furniture_item",
  "cleaning_equipment_damage",
  "balcony_window",
  "other",
]);
const FAULT_CATEGORY_ALIASES = {
  ac: "hvac",
  klima: "hvac",
  heating: "hvac",
  electric_issue: "electric",
  electricity: "electric",
  water: "water_bathroom",
  bathroom: "water_bathroom",
  tv: "tv_electronics",
  electronics: "tv_electronics",
  door: "door_lock",
  lock: "door_lock",
  furniture: "furniture_item",
  cleaning_damage: "cleaning_equipment_damage",
  balcony: "balcony_window",
  window: "balcony_window",
  otherFault: "other",
};
const FAULT_LOCATIONS = new Set(["room_inside", "bathroom", "balcony", "other"]);
const FAULT_URGENCY = new Set(["normal", "urgent"]);

function cleanText(value, maxLen = 5000) {
  return String(value || "").trim().slice(0, maxLen);
}

function looksLikeRoomNumber(value) {
  return /^\d+$/.test(String(value || "").trim());
}

function looksLikeNationality(value) {
  return /^[A-Za-z]{2,12}$/.test(String(value || "").trim());
}

function looksLikePersonName(value) {
  const s = String(value || "").trim();
  if (!s) return false;
  if (/\d/.test(s)) return false;
  return /[A-Za-zÀ-žА-Яа-яİıĞğÜüŞşÖöÇç]/.test(s);
}

function toArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((x) => String(x || "").trim()).filter(Boolean);
}

function normalizePayload(payload) {
  const type = cleanText(payload?.type, 64);
  const base = {
    type,
    name: cleanText(payload?.name, 160),
    room: cleanText(payload?.room, 50),
    nationality: cleanText(payload?.nationality, 20),
    description: cleanText(payload?.description, 4000),
    category: cleanText(payload?.category, 64),
    details: payload?.details && typeof payload.details === "object" ? payload.details : {},
    location: cleanText(payload?.location, 64),
    urgency: cleanText(payload?.urgency, 32),
    language: cleanText(payload?.language, 8),
    guestCount: toPositiveInt(payload?.guestCount),
    categories: toArray(payload?.categories),
    otherCategoryNote: cleanText(payload?.otherCategoryNote, 1000),
    reservation: payload?.reservation || null,
    source: "viona_web",
    submittedAt: new Date().toISOString(),
  };
  return base;
}

function toPositiveInt(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const int = Math.floor(n);
  return int > 0 ? int : null;
}

function cleanEnum(value, allowed) {
  const v = cleanText(value, 80);
  return allowed.has(v) ? v : "";
}

function normalizeRequestCategory(value) {
  const raw = cleanText(value, 80);
  return REQUEST_CATEGORY_ALIASES[raw] || raw;
}

function normalizeFaultCategory(value) {
  const raw = cleanText(value, 80);
  return FAULT_CATEGORY_ALIASES[raw] || raw;
}

function normalizeRequestDetails(category, details = {}) {
  const d = details && typeof details === "object" ? details : {};
  if (category === "towel") {
    return {
      itemType: cleanEnum(d.itemType, new Set(["bath_towel", "hand_towel"])),
      quantity: toPositiveInt(d.quantity),
    };
  }
  if (category === "bedding") {
    return {
      itemType: cleanEnum(d.itemType, new Set(["pillow", "duvet_cover", "blanket"])),
      quantity: toPositiveInt(d.quantity),
    };
  }
  if (category === "room_cleaning") {
    return {
      requestType: cleanEnum(d.requestType, new Set(["general_cleaning", "towel_change", "room_check"])),
      timing: cleanEnum(d.timing, new Set(["now", "later"])),
    };
  }
  if (category === "minibar") {
    return {
      requestType: cleanEnum(d.requestType, new Set(["refill", "missing_item_report", "check_request"])),
    };
  }
  if (category === "baby_equipment") {
    return {
      itemType: cleanEnum(d.itemType, new Set(["baby_bed", "high_chair", "other"])),
      quantity: toPositiveInt(d.quantity),
    };
  }
  if (category === "room_equipment") {
    return {
      itemType: cleanEnum(d.itemType, new Set(["bathrobe", "slippers", "hanger", "kettle", "other"])),
      quantity: toPositiveInt(d.quantity),
    };
  }
  return {};
}

function validateRequestDetails(normalized) {
  var category = normalizeRequestCategory(normalized.category);
  if (!category && Array.isArray(normalized.categories) && normalized.categories.length) {
    category = normalizeRequestCategory(String(normalized.categories[0] || "").trim());
  }
  if (!REQUEST_CATEGORIES.has(category)) {
    throw new Error("request category is required");
  }
  normalized.category = category;
  const details = normalizeRequestDetails(category, normalized.details);
  normalized.details = details;
  normalized.categories = [category];
  normalized.otherCategoryNote = category === "other" ? normalized.description || null : null;

  if (category === "towel" || category === "bedding") {
    if (!details.itemType || !details.quantity) throw new Error("request details are required");
    return;
  }
  if (category === "room_cleaning") {
    if (!details.requestType || !details.timing) throw new Error("request details are required");
    return;
  }
  if (category === "minibar") {
    if (!details.requestType) throw new Error("request details are required");
    return;
  }
  if (category === "baby_equipment" || category === "room_equipment") {
    if (!details.itemType || !details.quantity) throw new Error("request details are required");
    if (details.itemType === "other" && !normalized.description) {
      throw new Error("description is required for other item type");
    }
    return;
  }
  if (category === "other" && !normalized.description) {
    throw new Error("description is required for other category");
  }
}

function validateComplaintPayload(normalized) {
  var category = normalized.category;
  if (!category && Array.isArray(normalized.categories) && normalized.categories.length) {
    category = String(normalized.categories[0] || "").trim();
  }
  if (!COMPLAINT_CATEGORIES.has(category)) {
    throw new Error("complaint category is required");
  }
  normalized.category = category;
  normalized.categories = [category];
  if (COMPLAINT_DESC_REQUIRED.has(category) && !normalized.description) {
    throw new Error("description is required for selected complaint category");
  }
  if (category === "other") {
    normalized.otherCategoryNote = normalized.description || normalized.otherCategoryNote || null;
  }
}

function validateFaultPayload(normalized) {
  var category = normalizeFaultCategory(normalized.category);
  if (!category && Array.isArray(normalized.categories) && normalized.categories.length) {
    category = normalizeFaultCategory(String(normalized.categories[0] || "").trim());
  }
  if (!FAULT_CATEGORIES.has(category)) {
    throw new Error("fault category is required");
  }
  const location = cleanText(normalized.location || normalized.details?.location, 64);
  const urgency = cleanText(normalized.urgency || normalized.details?.urgency, 64);
  if (!FAULT_LOCATIONS.has(location)) {
    throw new Error("fault location is required");
  }
  if (!FAULT_URGENCY.has(urgency)) {
    throw new Error("fault urgency is required");
  }
  normalized.category = category;
  normalized.categories = [category];
  normalized.details = {
    ...(normalized.details && typeof normalized.details === "object" ? normalized.details : {}),
    location,
    urgency,
  };
  normalized.location = location;
  normalized.urgency = urgency;
  if ((category === "other" || location === "other") && !normalized.description) {
    throw new Error("description is required for other category");
  }
}

function validate(normalized) {
  if (!normalized.type) throw new Error("type is required");
  if (!normalized.name) throw new Error("name is required");
  if (!normalized.room) throw new Error("room is required");
  if (!normalized.nationality) throw new Error("nationality is required");
  if (!looksLikePersonName(normalized.name)) throw new Error("name must contain letters only");
  if (!looksLikeRoomNumber(normalized.room)) throw new Error("room must be numeric");
  if (!looksLikeNationality(normalized.nationality)) throw new Error("nationality must contain letters only");
  if (!SIMPLE_TYPES.has(normalized.type) && !RESERVATION_TYPES.has(normalized.type)) {
    throw new Error("invalid type");
  }
  if (normalized.type !== "request" && !normalized.description) {
    if (normalized.type !== "complaint" && normalized.type !== "fault" && !RESERVATION_TYPES.has(normalized.type)) {
      throw new Error("description is required");
    }
  }
  if (normalized.type === "request") {
    validateRequestDetails(normalized);
  } else if (normalized.type === "complaint") {
    validateComplaintPayload(normalized);
  } else if (normalized.type === "fault") {
    validateFaultPayload(normalized);
  } else if (RESERVATION_TYPES.has(normalized.type)) {
    if (!normalized.reservation || typeof normalized.reservation !== "object") {
      throw new Error("reservation is required");
    }
    const r = normalized.reservation;
    const reservationDate = cleanText(r.reservationDate || r.date, 32);
    const reservationTime = cleanText(r.time, 16);
    if (!reservationDate || !reservationTime) {
      throw new Error("reservation date/time is required");
    }
    const guestCount = toPositiveInt(r.guestCount || normalized.guestCount);
    if (!guestCount) throw new Error("guest count is required");
    normalized.guestCount = guestCount;
    normalized.reservation.guestCount = guestCount;
    normalized.reservationDate = reservationDate;
    normalized.reservationTime = reservationTime;
    normalized.language = cleanText(normalized.language, 8) || "tr";
  }
}

async function insertSimple(table, normalized) {
  const row = {
    guest_name: normalized.name,
    room_number: normalized.room,
    nationality: normalized.nationality,
    description: normalized.description || "",
    categories: normalized.categories,
    other_category_note: normalized.otherCategoryNote || null,
    source: normalized.source,
    submitted_at: normalized.submittedAt,
    status: "new",
    raw_payload: normalized,
  };
  if (table === "guest_requests" || table === "guest_faults" || table === "guest_complaints") {
    row.category = normalized.category || null;
    row.details = normalized.details || {};
  }
  let { data, error } = await getSupabase().from(table).insert(row).select("id").single();
  if (
    error &&
    (table === "guest_requests" || table === "guest_faults" || table === "guest_complaints") &&
    /column .*category|column .*details/i.test(String(error.message || ""))
  ) {
    delete row.category;
    delete row.details;
    const retry = await getSupabase().from(table).insert(row).select("id").single();
    data = retry.data;
    error = retry.error;
  }
  if (error) throw error;
  return data.id;
}

async function insertReservation(normalized) {
  const reservation = normalized.reservation || {};
  const serviceCode =
    cleanText(
      reservation.serviceCode ||
        reservation.restaurantCode ||
        reservation.restaurantId ||
        reservation.spaServiceId,
      80
    ) || null;
  const serviceLabel = cleanText(reservation.serviceLabel || "", 160) || null;
  const row = {
    reservation_type: normalized.type,
    guest_name: normalized.name,
    room_number: normalized.room,
    nationality: normalized.nationality,
    language: normalized.language || "tr",
    service_code: serviceCode,
    service_label: serviceLabel,
    reservation_date: normalized.reservationDate || null,
    reservation_time: normalized.reservationTime || null,
    guest_count: normalized.guestCount || null,
    note: normalized.description,
    reservation_data: normalized.reservation || {},
    source: normalized.source,
    submitted_at: normalized.submittedAt,
    updated_at: normalized.submittedAt,
    status: "new",
    raw_payload: normalized,
  };
  let { data, error } = await getSupabase().from("guest_reservations").insert(row).select("id").single();
  if (
    error &&
    /column .*language|column .*service_code|column .*service_label|column .*reservation_date|column .*reservation_time|column .*guest_count|column .*updated_at/i.test(
      String(error.message || "")
    )
  ) {
    delete row.language;
    delete row.service_code;
    delete row.service_label;
    delete row.reservation_date;
    delete row.reservation_time;
    delete row.guest_count;
    delete row.updated_at;
    const retry = await getSupabase().from("guest_reservations").insert(row).select("id").single();
    data = retry.data;
    error = retry.error;
  }
  if (error) throw error;
  return data.id;
}

export async function createGuestRequest(payload) {
  const normalized = normalizePayload(payload);
  validate(normalized);

  if (normalized.type === "request") {
    const id = await insertSimple("guest_requests", normalized);
    return { id, bucket: "request" };
  }
  if (normalized.type === "complaint") {
    const id = await insertSimple("guest_complaints", normalized);
    return { id, bucket: "complaint" };
  }
  if (normalized.type === "fault") {
    const id = await insertSimple("guest_faults", normalized);
    return { id, bucket: "fault" };
  }
  const id = await insertReservation(normalized);
  return { id, bucket: "reservation" };
}
