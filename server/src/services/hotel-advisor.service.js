import { getEnv } from "../config/env.js";
import { normalizeGuestRoomForMatch } from "../lib/guest-match-normalize.js";

/** @type {{ guests: HotelGuest[]|null, fetchedAt: number }} */
let hotspotGuestsCache = { guests: null, fetchedAt: 0 };

/**
 * @typedef {object} HotelGuest
 * @property {string} [NAME]
 * @property {string} [LNAME]
 * @property {string|number} [ROOMNO]
 * @property {string|null} [BIRTHDATE]
 * @property {string|null} [CHECKIN]
 * @property {string|null} [CHECKOUT]
 * @property {number} [RESID]
 * @property {number} [RESNAMEID]
 * @property {number} [HOTELID]
 * @property {string|null} [EMAIL]
 * @property {string|null} [PHONE]
 */

/**
 * @param {string|null|undefined} value
 * @returns {string|null}
 */
export function normalizeDate(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.slice(0, 10);
}

/**
 * @param {string|null|undefined} checkin
 * @param {string|null|undefined} checkout
 * @returns {boolean}
 */
export function isActiveStay(checkin, checkout) {
  if (!checkin || !checkout) return false;
  const today = new Date();
  const inDate = new Date(checkin);
  const outDate = new Date(checkout);
  if (Number.isNaN(inDate.getTime()) || Number.isNaN(outDate.getTime())) return false;
  return inDate <= today && today <= outDate;
}

/**
 * @param {unknown} apiResponse
 * @returns {HotelGuest[]}
 */
export function extractGuests(apiResponse) {
  if (!Array.isArray(apiResponse)) return [];

  if (apiResponse[0]?.DATA && Array.isArray(apiResponse[0].DATA)) {
    return apiResponse[0].DATA;
  }

  if (Array.isArray(apiResponse[0])) {
    return apiResponse[0];
  }

  return [];
}

/**
 * @returns {Promise<HotelGuest[]>}
 */
export async function getHotelGuests() {
  const cfg = getEnv();
  const baseUrl = String(cfg.hotelAdvisorBaseUrl || "").trim();
  const hotelId = String(cfg.hotelAdvisorHotelId || "").trim();
  const token = String(cfg.hotelAdvisorToken || "").trim();

  if (!baseUrl || !hotelId || !token) {
    throw new Error("HotelAdvisor env variables are missing.");
  }

  const rawMs = Number(cfg.hotelAdvisorGuestsCacheMs);
  const ttl =
    typeof cfg.hotelAdvisorGuestsCacheMs === "number" && Number.isFinite(rawMs)
      ? Math.min(120_000, Math.max(0, Math.floor(rawMs)))
      : 12_000;
  const now = Date.now();
  if (ttl > 0 && hotspotGuestsCache.guests && now - hotspotGuestsCache.fetchedAt < ttl) {
    return hotspotGuestsCache.guests;
  }

  const body = {
    Parameters: {
      HOTELID: Number(hotelId),
    },
    Action: "Function",
    Object: "FN_EASYPMS_HOTSPOT_GUESTS",
    OrderBy: [
      {
        Column: "null",
        Direction: null,
      },
    ],
    Paging: {
      ItemsPerPage: 1000,
      Current: 1,
    },
    Where: [],
  };

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 15_000);
  try {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: ac.signal,
    });

    if (!response.ok) {
      hotspotGuestsCache = { guests: null, fetchedAt: 0 };
      throw new Error(`HotelAdvisor HTTP ${response.status}`);
    }

    const data = await response.json();
    const guests = extractGuests(data);
    if (ttl > 0) {
      hotspotGuestsCache = { guests, fetchedAt: Date.now() };
    } else {
      hotspotGuestsCache = { guests: null, fetchedAt: 0 };
    }
    return guests;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {{ roomNo: string, birthDate: string }} params
 * @returns {Promise<null | { guestName: string, roomNo: string, resId: number, resNameId: number, hotelId: number|null, checkin: string|null, checkout: string|null }>}
 */
export async function verifyHotelGuest(params) {
  const guests = await getHotelGuests();

  const roomNo = String(params.roomNo ?? "").trim();
  const birthDate = String(params.birthDate ?? "").trim();
  const roomKey = normalizeGuestRoomForMatch(roomNo);

  const matchedGuest = guests.find((guest) => {
    const guestRoom = String(guest.ROOMNO ?? "").trim();
    const guestRoomKey = normalizeGuestRoomForMatch(guestRoom);
    const guestBirthDate = normalizeDate(guest.BIRTHDATE);

    if (!guestBirthDate) return false;

    return (
      guestRoomKey === roomKey &&
      guestBirthDate === birthDate &&
      isActiveStay(guest.CHECKIN, guest.CHECKOUT)
    );
  });

  if (!matchedGuest) return null;

  const resId = Number(matchedGuest.RESID);
  const resNameId = Number(matchedGuest.RESNAMEID);
  const hid = Number(matchedGuest.HOTELID);
  const hotelId = Number.isFinite(hid) ? hid : null;
  const roomCanonical =
    normalizeGuestRoomForMatch(String(matchedGuest.ROOMNO ?? "").trim()) ||
    String(matchedGuest.ROOMNO ?? "").trim();

  return {
    guestName: `${matchedGuest.NAME ?? ""} ${matchedGuest.LNAME ?? ""}`.trim(),
    roomNo: roomCanonical,
    resId: Number.isFinite(resId) ? resId : 0,
    resNameId: Number.isFinite(resNameId) ? resNameId : 0,
    hotelId,
    checkin: matchedGuest.CHECKIN != null ? String(matchedGuest.CHECKIN) : null,
    checkout: matchedGuest.CHECKOUT != null ? String(matchedGuest.CHECKOUT) : null,
  };
}
