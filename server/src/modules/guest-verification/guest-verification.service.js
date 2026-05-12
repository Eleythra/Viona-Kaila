import { getEnv } from "../../config/env.js";
import { extractGivenNamesPart, extractSurnameFromFullName } from "../../lib/extract-surname-from-full-name.js";
import { normalizeGuestMatchString, normalizeGuestRoomForMatch } from "../../lib/guest-match-normalize.js";
import {
  buildElektraBearerToken,
  fetchHotspotGuestList,
} from "../pms/elektra/elektra-hotspot.provider.js";
import { hotelTodayIsoYmd, isPlausibleGuestBirthYmd, isStayActiveOnDate, parsePmsDateToIsoYmd } from "./hotel-date.js";
import { guestVerificationUserMessage } from "./guest-verification-messages.js";
import {
  clearVerificationFailures,
  recordVerificationFailure,
  shouldBlockVerificationAttempts,
} from "./verification-failure-tracker.js";
import { parseVerifiedGuestCookie } from "../../lib/guest-verified-session.js";

/**
 * @param {string} reason
 */
export function createGuestVerificationHttpError(reason) {
  const message = guestVerificationUserMessage(reason);
  const err = new Error(message);
  err.guestVerificationReason = reason;
  err.guestVerificationMessage = message;
  if (reason === "pms_unavailable") err.statusCode = 503;
  else if (reason === "too_many_verification_attempts") err.statusCode = 429;
  else if (reason === "guest_session_required" || reason === "guest_session_room_mismatch") err.statusCode = 401;
  else err.statusCode = 422;
  return err;
}

function compositeFullNameNorm(r) {
  const s = [r.name, r.lname].filter(Boolean).join(" ").trim();
  return normalizeGuestMatchString(s);
}

/**
 * Hotspot kayıtlarında ad + oda + tarih eşlemesi (kapı ve insert öncesi ortak).
 * @param {{ name: string, room: string }} normalized
 * @param {object[]} records — `normalizeHotspotRow` çıktısı
 * @param {string} clientIp
 * @param {string} [hotelIdFallback]
 * @returns {{ verified: true, resId: string|null, resNameId: string|null, checkin: string|null, checkout: string|null, hotelId: string }}
 */
export function matchGuestToHotspotRecords(normalized, records, clientIp, hotelIdFallback = "") {
  const normRoom = normalizeGuestRoomForMatch(normalized.room);
  const normLname = normalizeGuestMatchString(extractSurnameFromFullName(normalized.name));
  const givenNorm = normalizeGuestMatchString(extractGivenNamesPart(normalized.name));
  const fullNorm = normalizeGuestMatchString(normalized.name);

  if (!normRoom || !normLname) {
    recordVerificationFailure(clientIp);
    throw createGuestVerificationHttpError("surname_mismatch");
  }

  const roomMatches = records.filter((r) => normalizeGuestRoomForMatch(String(r.roomNo ?? "")) === normRoom);
  if (!roomMatches.length) {
    recordVerificationFailure(clientIp);
    throw createGuestVerificationHttpError("room_not_found");
  }

  let candidates = roomMatches.filter((r) => normalizeGuestMatchString(r.lname) === normLname);
  if (!candidates.length) {
    recordVerificationFailure(clientIp);
    throw createGuestVerificationHttpError("surname_mismatch");
  }

  if (candidates.length > 1) {
    const narrowed = candidates.filter((r) => {
      const comp = compositeFullNameNorm(r);
      if (fullNorm && comp && comp === fullNorm) return true;
      if (givenNorm && normalizeGuestMatchString(r.name) === givenNorm) return true;
      return false;
    });
    if (narrowed.length === 1) {
      candidates = narrowed;
    } else if (narrowed.length === 0) {
      recordVerificationFailure(clientIp);
      throw createGuestVerificationHttpError("ambiguous_guest");
    } else {
      recordVerificationFailure(clientIp);
      throw createGuestVerificationHttpError("ambiguous_guest");
    }
  }

  const row = candidates[0];
  const today = hotelTodayIsoYmd();
  if (!isStayActiveOnDate(today, row.checkin, row.checkout)) {
    recordVerificationFailure(clientIp);
    throw createGuestVerificationHttpError("stay_not_active");
  }

  clearVerificationFailures(clientIp);
  return {
    verified: true,
    resId: row.resId || null,
    resNameId: row.resNameId || null,
    checkin: row.checkin || null,
    checkout: row.checkout || null,
    hotelId: String(row.hotelId || hotelIdFallback || "").trim() || String(hotelIdFallback || "").trim(),
    displayName: [row.name, row.lname].filter(Boolean).join(" ").trim() || "",
  };
}

/**
 * Oda + doğum tarihi (YYYY-MM-DD) + aktif konak (CHECKIN/CHECKOUT) — Elektra Hotspot `BIRTHDATE` ile.
 * @param {string} roomInput
 * @param {string} birthYmd — `YYYY-MM-DD`
 * @param {object[]} records — `normalizeHotspotRow` çıktısı
 * @param {string} clientIp
 * @param {string} [hotelIdFallback]
 */
export function matchGuestRoomBirthdateToHotspotRecords(
  roomInput,
  birthYmd,
  records,
  clientIp,
  hotelIdFallback = "",
) {
  const normRoom = normalizeGuestRoomForMatch(String(roomInput ?? "").trim());
  const birth = String(birthYmd ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birth)) {
    recordVerificationFailure(clientIp);
    throw createGuestVerificationHttpError("invalid_birthdate");
  }
  if (!normRoom) {
    recordVerificationFailure(clientIp);
    throw createGuestVerificationHttpError("room_not_found");
  }

  const roomMatches = records.filter((r) => normalizeGuestRoomForMatch(String(r.roomNo ?? "")) === normRoom);
  if (!roomMatches.length) {
    recordVerificationFailure(clientIp);
    throw createGuestVerificationHttpError("room_not_found");
  }

  const withBirth = roomMatches
    .map((r) => {
      const apiYmd = parsePmsDateToIsoYmd(r.birthDateRaw || "");
      return { r, apiYmd };
    })
    .filter((x) => x.apiYmd === birth);

  if (!withBirth.length) {
    recordVerificationFailure(clientIp);
    throw createGuestVerificationHttpError("birthdate_mismatch");
  }

  const today = hotelTodayIsoYmd();
  const active = withBirth.filter((x) => isStayActiveOnDate(today, x.r.checkin, x.r.checkout));
  if (!active.length) {
    recordVerificationFailure(clientIp);
    throw createGuestVerificationHttpError("stay_not_active");
  }
  if (active.length > 1) {
    recordVerificationFailure(clientIp);
    throw createGuestVerificationHttpError("ambiguous_guest");
  }

  const row = active[0].r;
  clearVerificationFailures(clientIp);
  return {
    verified: true,
    resId: row.resId || null,
    resNameId: row.resNameId || null,
    checkin: row.checkin || null,
    checkout: row.checkout || null,
    hotelId: String(row.hotelId || hotelIdFallback || "").trim() || String(hotelIdFallback || "").trim(),
    displayName: [row.name, row.lname].filter(Boolean).join(" ").trim() || "",
  };
}

/**
 * @param {string} clientIp
 * @returns {Promise<object[]>}
 */
async function fetchHotspotRecordsForVerification(clientIp) {
  const env = getEnv();
  const base = String(env.elektraBaseUrl || "").trim();
  const hid = String(env.elektraHotelId || "").trim();
  const tok = String(env.elektraToken || "").trim();
  const authQk = String(env.elektraAuthQueryKey || "").trim();
  if (!base || !hid || !tok) {
    throw createGuestVerificationHttpError("pms_unavailable");
  }
  if (env.elektraAuthModeNormalized === "query" && !authQk) {
    throw createGuestVerificationHttpError("pms_unavailable");
  }

  if (
    shouldBlockVerificationAttempts(clientIp, {
      max: env.guestVerifyFailMax,
      windowMs: env.guestVerifyFailWindowMs,
    })
  ) {
    throw createGuestVerificationHttpError("too_many_verification_attempts");
  }

  const bearer = buildElektraBearerToken(hid, tok);
  try {
    const records = await fetchHotspotGuestList({
      baseUrl: base,
      hotelId: hid,
      bearerToken: bearer,
      hotspotPath: env.elektraHotspotPath,
      authMode: env.elektraAuthModeNormalized,
      authHeaderName: env.elektraAuthHeader,
      authQueryKey: authQk,
      timeoutMs: env.elektraFetchTimeoutMs,
      maxRetries: env.elektraFetchMaxRetries,
      cacheTtlMs: env.elektraCacheTtlMs,
    });
    return { records, hotelIdDefault: hid };
  } catch {
    recordVerificationFailure(clientIp);
    throw createGuestVerificationHttpError("pms_unavailable");
  }
}

/**
 * Kapı ekranı: Elektra ile ad + oda doğrulaması. `GUEST_PMS_GATE_VERIFY_ENABLED` (veya geriye dönük: `GUEST_PMS_VERIFY_ENABLED`) ve `ELEKTRA_*` tam olmalı.
 * @param {string} fullName
 * @param {string} room
 * @param {{ clientIp?: string }} options
 */
export async function verifyGuestIdentityAtGate(fullName, room, options = {}) {
  const env = getEnv();
  if (!env.guestPmsGateVerifyEnabled) {
    throw createGuestVerificationHttpError("pms_unavailable");
  }
  const clientIp = String(options.clientIp || "unknown").trim() || "unknown";
  const normalized = {
    name: String(fullName ?? "").trim(),
    room: String(room ?? "").trim(),
  };
  const { records, hotelIdDefault } = await fetchHotspotRecordsForVerification(clientIp);
  return matchGuestToHotspotRecords(normalized, records, clientIp, hotelIdDefault);
}

/**
 * Kapı: Elektra ile oda + doğum tarihi (`YYYY-MM-DD`).
 * @param {string} room
 * @param {string} birthDateRaw — `type=date` veya `YYYY-MM-DD`
 * @param {{ clientIp?: string }} options
 */
export async function verifyGuestIdentityRoomBirthdate(room, birthDateRaw, options = {}) {
  const env = getEnv();
  if (!env.guestPmsGateVerifyEnabled) {
    throw createGuestVerificationHttpError("pms_unavailable");
  }
  const clientIp = String(options.clientIp || "unknown").trim() || "unknown";

  const normRoom = normalizeGuestRoomForMatch(String(room ?? "").trim());
  if (!normRoom) {
    recordVerificationFailure(clientIp);
    throw createGuestVerificationHttpError("room_not_found");
  }
  const allow = env.guestGateRoomAllowlistNormalizedSet;
  if (allow.size > 0 && !allow.has(normRoom)) {
    recordVerificationFailure(clientIp);
    throw createGuestVerificationHttpError("invalid_room");
  }

  const s = String(birthDateRaw ?? "").trim();
  const birthYmd = /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
  if (!birthYmd) {
    recordVerificationFailure(clientIp);
    throw createGuestVerificationHttpError("invalid_birthdate");
  }
  const today = hotelTodayIsoYmd();
  if (!isPlausibleGuestBirthYmd(birthYmd, today)) {
    recordVerificationFailure(clientIp);
    throw createGuestVerificationHttpError("invalid_birthdate");
  }

  const { records, hotelIdDefault } = await fetchHotspotRecordsForVerification(clientIp);
  return matchGuestRoomBirthdateToHotspotRecords(room, birthYmd, records, clientIp, hotelIdDefault);
}

/**
 * Insert öncesi PMS doğrulaması. Env kapalıysa veya tip listede yoksa no-op.
 * Kapı doğrulaması açıksa (`GUEST_PMS_GATE_VERIFY_ENABLED`) HttpOnly çerez ile oda eşleşmesi yeterlidir (Hotspot tekrar çağrılmaz).
 * @param {object} normalized createGuestRequest içi normalize edilmiş payload
 * @param {{ clientIp?: string, cookieHeader?: string|null }} options
 * @returns {Promise<object|null>} meta veya null
 */
export async function maybeVerifyGuestForPms(normalized, options = {}) {
  const env = getEnv();
  if (!env.guestPmsVerifyEnabled) return null;

  const typ = String(normalized.type || "").trim().toLowerCase();
  if (!env.guestPmsVerifyTypeSet.has(typ)) return null;

  const clientIp = String(options.clientIp || "unknown").trim() || "unknown";

  if (env.guestPmsGateVerifyEnabled) {
    const session = parseVerifiedGuestCookie(options.cookieHeader);
    if (!session) {
      throw createGuestVerificationHttpError("guest_session_required");
    }
    const sr = normalizeGuestRoomForMatch(String(session.room || ""));
    const pr = normalizeGuestRoomForMatch(String(normalized.room || "").trim());
    if (!sr || !pr || sr !== pr) {
      throw createGuestVerificationHttpError("guest_session_room_mismatch");
    }
    clearVerificationFailures(clientIp);
    return { verified_via: "guest_session", room: session.room };
  }

  const { records, hotelIdDefault } = await fetchHotspotRecordsForVerification(clientIp);
  return matchGuestToHotspotRecords(normalized, records, clientIp, hotelIdDefault);
}
