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
 * Başarılı kapı girişi: yapılandırılmış log + isteğe bağlı Supabase satırı (hata giriş yanıtını bozmaz).
 *
 * @param {{
 *   fullName: string,
 *   roomNumber: string,
 *   verificationMethod: 'deploy_bypass' | 'elektra' | 'password_dual',
 *   clientIp?: string,
 *   userAgent?: string,
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
  const clientIp = sliceUtf8(p.clientIp, IP_MAX) || null;
  const userAgent = sliceUtf8(p.userAgent, UA_MAX) || null;

  console.info(
    JSON.stringify({
      event: "guest_gate_entry",
      verification_method: verificationMethod,
      full_name: fullName,
      room_number: roomNumber,
      client_ip: clientIp,
    }),
  );

  if (!isSupabaseConfigured()) return;

  const row = {
    full_name: fullName,
    room_number: roomNumber,
    verification_method: verificationMethod,
    client_ip: clientIp,
    user_agent: userAgent,
  };

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
