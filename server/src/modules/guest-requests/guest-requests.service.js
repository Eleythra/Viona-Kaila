import { supabase } from "../../lib/supabase.js";

const SIMPLE_TYPES = new Set(["request", "complaint", "fault"]);
const RESERVATION_TYPES = new Set(["reservation_alacarte", "reservation_spa"]);

function cleanText(value, maxLen = 5000) {
  return String(value || "").trim().slice(0, maxLen);
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
    categories: toArray(payload?.categories),
    otherCategoryNote: cleanText(payload?.otherCategoryNote, 1000),
    reservation: payload?.reservation || null,
    source: "viona_web",
    submittedAt: new Date().toISOString(),
  };
  return base;
}

function validate(normalized) {
  if (!normalized.type) throw new Error("type is required");
  if (!normalized.name) throw new Error("name is required");
  if (!normalized.room) throw new Error("room is required");
  if (!normalized.nationality) throw new Error("nationality is required");
  if (!normalized.description) throw new Error("description is required");
  if (!SIMPLE_TYPES.has(normalized.type) && !RESERVATION_TYPES.has(normalized.type)) {
    throw new Error("invalid type");
  }
}

async function insertSimple(table, normalized) {
  const row = {
    guest_name: normalized.name,
    room_number: normalized.room,
    nationality: normalized.nationality,
    description: normalized.description,
    categories: normalized.categories,
    other_category_note: normalized.otherCategoryNote || null,
    source: normalized.source,
    submitted_at: normalized.submittedAt,
    status: "new",
    raw_payload: normalized,
  };
  const { data, error } = await supabase.from(table).insert(row).select("id").single();
  if (error) throw error;
  return data.id;
}

async function insertReservation(normalized) {
  const row = {
    reservation_type: normalized.type,
    guest_name: normalized.name,
    room_number: normalized.room,
    nationality: normalized.nationality,
    note: normalized.description,
    reservation_data: normalized.reservation || {},
    source: normalized.source,
    submitted_at: normalized.submittedAt,
    status: "new",
    raw_payload: normalized,
  };
  const { data, error } = await supabase.from("guest_reservations").insert(row).select("id").single();
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
