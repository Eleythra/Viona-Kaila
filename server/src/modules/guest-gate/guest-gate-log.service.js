import { getEnv } from "../../config/env.js";
import {
  getSupabase,
  isSupabaseConfigured,
  throwIfSupabaseDatastoreDnsError,
  withSupabaseFetchGuard,
} from "../../lib/supabase.js";

const NAME_MAX = 120;
const ROOM_MAX = 32;
const UA_MAX = 512;
const IP_MAX = 64;

function sliceUtf8(s, max) {
  const t = String(s ?? "").trim();
  if (!t) return "";
  return t.length <= max ? t : t.slice(0, max);
}

/**
 * @param {string} ymd
 * @returns {string|null}
 */
function normalizeBirthDateForDb(ymd) {
  const s = String(ymd ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

/**
 * Başarılı kapı girişi: yapılandırılmış log + Supabase.
 * `hotel_advisor` ve `operator_bypass`: Supabase yapılandırıysa her zaman insert (denetim); aksi yalnızca `VIONA_GUEST_GATE_AUDIT_LOG=1` iken.
 * @param {{
 *   fullName: string,
 *   roomNumber: string,
 *   verificationMethod: 'deploy_bypass' | 'elektra' | 'password_dual' | 'hotel_advisor' | 'operator_bypass',
 *   clientIp?: string,
 *   userAgent?: string,
 *   hotelId?: number|null,
 *   resId?: number|null,
 *   resNameId?: number|null,
 *   birthDate?: string|null,
 * }} p
 */
export async function recordGuestGateEntry(p) {
  const fullName = sliceUtf8(p.fullName, NAME_MAX);
  const roomNumber = sliceUtf8(p.roomNumber, ROOM_MAX);
  const raw = String(p.verificationMethod || "").trim();
  let verificationMethod = "password_dual";
  if (raw === "deploy_bypass") verificationMethod = "deploy_bypass";
  else if (raw === "elektra") verificationMethod = "elektra";
  else if (raw === "password_dual") verificationMethod = "password_dual";
  else if (raw === "hotel_advisor") verificationMethod = "hotel_advisor";
  else if (raw === "operator_bypass") verificationMethod = "operator_bypass";

  const clientIp = sliceUtf8(p.clientIp, IP_MAX) || null;
  const userAgent = sliceUtf8(p.userAgent, UA_MAX) || null;

  const auditEnv = getEnv().guestGateAuditLogEnabled;
  const alwaysSupabase =
    verificationMethod === "hotel_advisor" || verificationMethod === "operator_bypass";
  const shouldStructuredLog = auditEnv || alwaysSupabase;

  if (!shouldStructuredLog && !isSupabaseConfigured()) return;

  if (shouldStructuredLog) {
    console.info(
      JSON.stringify({
        event: "guest_gate_entry",
        verification_method: verificationMethod,
        full_name: fullName,
        room_number: roomNumber,
        client_ip: clientIp,
      }),
    );
  }

  const shouldInsertSupabase =
    isSupabaseConfigured() && (alwaysSupabase || auditEnv);

  if (!shouldInsertSupabase) return;

  const birthDateNorm = normalizeBirthDateForDb(p.birthDate);
  const row = {
    full_name: fullName,
    room_number: roomNumber,
    verification_method: verificationMethod,
    client_ip: clientIp,
    user_agent: userAgent,
  };

  if (verificationMethod === "hotel_advisor") {
    const hid = p.hotelId;
    row.hotel_id = hid != null && Number.isFinite(Number(hid)) ? Math.trunc(Number(hid)) : null;
    const rid = p.resId;
    row.res_id = rid != null && Number.isFinite(Number(rid)) ? Math.trunc(Number(rid)) : null;
    const rnid = p.resNameId;
    row.res_name_id = rnid != null && Number.isFinite(Number(rnid)) ? Math.trunc(Number(rnid)) : null;
    row.birth_date = birthDateNorm;
  } else if (verificationMethod === "operator_bypass") {
    row.birth_date = birthDateNorm;
  }

  try {
    await withSupabaseFetchGuard(async () => {
      const { error } = await getSupabase().from("guest_gate_entries").insert(row);
      if (error) throwIfSupabaseDatastoreDnsError(error);
      if (error) throw Object.assign(new Error(error.message || "guest_gate_entries_insert"), { cause: error });
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        event: "guest_gate_entry_supabase_failed",
        verification_method: verificationMethod,
        message: err && err.message ? String(err.message) : "unknown",
      }),
    );
  }
}
