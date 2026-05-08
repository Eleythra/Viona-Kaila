import { getEnv } from "../../config/env.js";
import { extractGivenNamesPart, extractSurnameFromFullName } from "../../lib/extract-surname-from-full-name.js";
import { normalizeGuestMatchString } from "../../lib/guest-match-normalize.js";
import {
  buildElektraBearerToken,
  fetchHotspotGuestList,
} from "../pms/elektra/elektra-hotspot.provider.js";
import { hotelTodayIsoYmd, isStayActiveOnDate } from "./hotel-date.js";
import { guestVerificationUserMessage } from "./guest-verification-messages.js";
import {
  clearVerificationFailures,
  recordVerificationFailure,
  shouldBlockVerificationAttempts,
} from "./verification-failure-tracker.js";

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
  else err.statusCode = 422;
  return err;
}

function compositeFullNameNorm(r) {
  const s = [r.name, r.lname].filter(Boolean).join(" ").trim();
  return normalizeGuestMatchString(s);
}

/**
 * Insert öncesi PMS doğrulaması. Env kapalıysa veya tip listede yoksa no-op.
 * @param {object} normalized createGuestRequest içi normalize edilmiş payload
 * @param {{ clientIp?: string }} options
 * @returns {Promise<object|null>} meta veya null
 */
export async function maybeVerifyGuestForPms(normalized, options = {}) {
  const env = getEnv();
  if (!env.guestPmsVerifyEnabled) return null;

  const typ = String(normalized.type || "").trim().toLowerCase();
  if (!env.guestPmsVerifyTypeSet.has(typ)) return null;

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

  const clientIp = String(options.clientIp || "unknown").trim() || "unknown";
  if (
    shouldBlockVerificationAttempts(clientIp, {
      max: env.guestVerifyFailMax,
      windowMs: env.guestVerifyFailWindowMs,
    })
  ) {
    throw createGuestVerificationHttpError("too_many_verification_attempts");
  }

  const bearer = buildElektraBearerToken(hid, tok);
  let records;
  try {
    records = await fetchHotspotGuestList({
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
  } catch {
    recordVerificationFailure(clientIp);
    throw createGuestVerificationHttpError("pms_unavailable");
  }

  const normRoom = normalizeGuestMatchString(normalized.room);
  const normLname = normalizeGuestMatchString(extractSurnameFromFullName(normalized.name));
  const givenNorm = normalizeGuestMatchString(extractGivenNamesPart(normalized.name));
  const fullNorm = normalizeGuestMatchString(normalized.name);

  if (!normRoom || !normLname) {
    recordVerificationFailure(clientIp);
    throw createGuestVerificationHttpError("surname_mismatch");
  }

  const roomMatches = records.filter((r) => normalizeGuestMatchString(r.roomNo) === normRoom);
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
    hotelId: row.hotelId || hid,
  };
}
