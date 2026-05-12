import { buildHotspotListCacheKey } from "./elektra-hotspot-cache-key.js";
import { getHotspotListCached, setHotspotListCached } from "./hotspot-list-cache.js";

/**
 * Bearer: tam `hotspot#id$secret` veya sadece secret (hotelId ile birleştirilir).
 */
export function buildElektraBearerToken(hotelId, tokenRaw) {
  const t = String(tokenRaw || "").trim();
  if (!t) return "";
  if (t.toLowerCase().startsWith("hotspot#")) return t;
  const hid = String(hotelId || "").trim();
  if (!hid) return "";
  return `hotspot#${hid}$${t}`;
}

/**
 * @param {object} row
 */
export function normalizeHotspotRow(row) {
  const o = row && typeof row === "object" ? row : {};
  const pick = (keys) => {
    for (const k of keys) {
      if (k in o && o[k] != null && String(o[k]).trim() !== "") return String(o[k]).trim();
      const ku = k.toUpperCase();
      if (ku in o && o[ku] != null && String(o[ku]).trim() !== "") return String(o[ku]).trim();
    }
    return "";
  };
  return {
    name: pick(["NAME", "Name", "name"]),
    lname: pick(["LNAME", "LName", "lname"]),
    roomNo: pick(["ROOMNO", "RoomNo", "roomno", "ROOM_NO", "roomNo"]),
    /** Ham Elektra değeri; doğrulamada yalnız `parsePmsDateToIsoYmd` ile gün çıkarılır. */
    birthDateRaw: pick(["BIRTHDATE", "BirthDate", "birthdate", "BIRTH_DATE", "birthDate"]),
    checkin: pick(["CHECKIN", "CheckIn", "checkin"]),
    checkout: pick(["CHECKOUT", "CheckOut", "checkout"]),
    resId: pick(["RESID", "ResId", "resid"]),
    resNameId: pick(["RESNAMEID", "ResNameId", "resnameid"]),
    hotelId: pick(["HOTELID", "HotelId", "hotelid"]),
    pax: pick(["PAX", "Pax", "pax"]),
  };
}

/**
 * @param {unknown} parsed JSON.parse sonucu
 * @returns {object[]}
 */
export function extractHotspotRecordArray(parsed) {
  if (Array.isArray(parsed)) return parsed.filter((x) => x && typeof x === "object");
  if (parsed && typeof parsed === "object") {
    for (const v of Object.values(parsed)) {
      if (Array.isArray(v) && v.length && v.every((x) => x && typeof x === "object")) {
        return v;
      }
    }
  }
  return [];
}

/**
 * Elektra Hotspot tipik gövde: `{ STATUS: true, DATA: [...] }`.
 * STATUS varsa ve yanlışsa hata fırlatılır (yanlış başarılı doğrulama önlenir).
 *
 * @param {unknown} parsed
 * @returns {{ records: object[], statusFieldPresent: boolean, statusOk: boolean }}
 */
export function parseHotspotListEnvelope(parsed) {
  if (parsed == null) {
    return { records: [], statusFieldPresent: false, statusOk: true };
  }
  if (Array.isArray(parsed)) {
    return {
      records: parsed.filter((x) => x && typeof x === "object"),
      statusFieldPresent: false,
      statusOk: true,
    };
  }
  if (typeof parsed !== "object") {
    return { records: [], statusFieldPresent: false, statusOk: true };
  }
  /** @type {Record<string, unknown>} */
  const o = parsed;

  let statusFieldPresent = false;
  let statusOk = true;
  for (const key of ["STATUS", "Status", "status"]) {
    if (Object.prototype.hasOwnProperty.call(o, key)) {
      statusFieldPresent = true;
      statusOk = isTruthyElektraStatus(o[key]);
      break;
    }
  }
  if (statusFieldPresent && !statusOk) {
    const err = new Error("elektra_status_false");
    err.code = "elektra_status_false";
    throw err;
  }

  const dataKeys = [
    "DATA",
    "Data",
    "data",
    "GUESTDATA",
    "GuestData",
    "GuestDATA",
    "GuestDataList",
    "RECORDS",
    "Records",
    "GuestList",
    "guestList",
  ];
  for (const dk of dataKeys) {
    if (!Object.prototype.hasOwnProperty.call(o, dk)) continue;
    const v = o[dk];
    if (Array.isArray(v)) {
      return {
        records: v.filter((x) => x && typeof x === "object"),
        statusFieldPresent,
        statusOk,
      };
    }
  }

  return {
    records: extractHotspotRecordArray(parsed),
    statusFieldPresent,
    statusOk,
  };
}

/**
 * @param {unknown} v
 */
function isTruthyElektraStatus(v) {
  if (v === true) return true;
  if (v === false) return false;
  if (typeof v === "number" && Number.isFinite(v)) return v !== 0;
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  if (s === "true" || s === "1" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "no") return false;
  return Boolean(v);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * @param {string} baseUrl
 * @param {string} pathRaw
 * @param {string} hotelId
 * @param {string} [authQueryKey]
 * @param {string} [credential]
 */
export function buildHotspotListUrl(baseUrl, pathRaw, hotelId, authQueryKey, credential) {
  const base = String(baseUrl || "")
    .trim()
    .replace(/\/+$/, "");
  let path = String(pathRaw || "/apisequence/GetHotspotList").trim();
  if (!path.startsWith("/")) path = `/${path}`;
  const params = new URLSearchParams();
  params.set("HOTELID", String(hotelId || "").trim());
  const qk = String(authQueryKey || "").trim();
  const cred = String(credential || "").trim();
  if (qk && cred) params.set(qk, cred);
  return `${base}${path}?${params.toString()}`;
}

/**
 * @param {"bearer"|"raw"|"query"|"none"} authMode
 * @param {string} authHeaderName
 * @param {string} credential
 */
export function buildHotspotAuthHeaders(authMode, authHeaderName, credential) {
  const name = String(authHeaderName || "Authorization").trim() || "Authorization";
  const cred = String(credential || "").trim();
  const headers = {
    Accept: "application/json, text/plain;q=0.9,*/*;q=0.8",
  };
  const mode = authMode || "bearer";
  if (mode === "query" || mode === "none") return headers;
  if (!cred) return headers;
  if (mode === "raw") headers[name] = cred;
  else headers[name] = `Bearer ${cred}`;
  return headers;
}

/**
 * @param {object} opts
 * @param {string} opts.baseUrl
 * @param {string} opts.hotelId
 * @param {string} opts.bearerToken Kimlik bilgisi (geriye dönük ad).
 * @param {string} [opts.hotspotPath]
 * @param {"bearer"|"raw"|"query"|"none"} [opts.authMode]
 * @param {string} [opts.authHeaderName]
 * @param {string} [opts.authQueryKey]
 * @param {number} opts.timeoutMs
 * @param {number} opts.maxRetries
 * @param {number} opts.cacheTtlMs
 * @returns {Promise<object[]>}
 */
export async function fetchHotspotGuestList(opts) {
  const {
    baseUrl,
    hotelId,
    bearerToken,
    hotspotPath,
    authMode = "bearer",
    authHeaderName = "Authorization",
    authQueryKey = "",
    timeoutMs,
    maxRetries,
    cacheTtlMs,
  } = opts;
  const credential = String(opts.credential ?? bearerToken ?? "").trim();
  const key = String(hotelId || "").trim();
  const cacheKey = buildHotspotListCacheKey(
    key,
    hotspotPath,
    authMode,
    authHeaderName,
    authQueryKey,
  );
  const cached = getHotspotListCached(cacheKey, cacheTtlMs);
  if (cached) return cached;

  const url = buildHotspotListUrl(
    baseUrl,
    hotspotPath,
    key,
    authQueryKey,
    credential,
  );
  const headers = buildHotspotAuthHeaders(authMode, authHeaderName, credential);

  let lastErr = null;
  const attempts = Math.max(0, Number(maxRetries) || 0) + 1;

  const perAttemptMs = Math.min(
    90_000,
    Math.max(5000, Number(timeoutMs) || 12_000) + 5000,
  );

  for (let i = 0; i < attempts; i++) {
    try {
      /** Bağlantı asılı kalırsa sert üst süre (Node 20+ `AbortSignal.timeout`). */
      let signal;
      if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
        signal = AbortSignal.timeout(perAttemptMs);
      } else {
        const c = new AbortController();
        setTimeout(() => c.abort(), perAttemptMs);
        signal = c.signal;
      }
      const res = await fetch(url, {
        method: "GET",
        headers,
        signal,
      });
      const text = await res.text();
      if (!res.ok) {
        console.warn(
          "[elektra] GetHotspotList http_status=%s hotel_id=%s (gövde loglanmaz)",
          String(res.status),
          key,
        );
        lastErr = new Error(`elektra_http_${res.status}`);
        if (res.status >= 500 && i < attempts - 1) {
          await sleep(300 * (i + 1));
          continue;
        }
        throw lastErr;
      }
      let parsed = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        lastErr = new Error("elektra_invalid_json");
        throw lastErr;
      }
      let envelope;
      try {
        envelope = parseHotspotListEnvelope(parsed);
      } catch (e) {
        if (e && e.code === "elektra_status_false") {
          console.warn("[elektra] GetHotspotList STATUS=false hotel_id=%s", key);
        }
        throw e;
      }
      const rawRows = envelope.records;
      const records = rawRows.map((r) => normalizeHotspotRow(r));
      const first = records[0];
      console.info(
        "[elektra] GetHotspotList ok hotel_id=%s record_count=%s sample_has_room=%s sample_has_birthdate=%s",
        key,
        String(records.length),
        first && String(first.roomNo || "").trim() ? "1" : "0",
        first && String(first.birthDateRaw || "").trim() ? "1" : "0",
      );
      setHotspotListCached(cacheKey, records);
      return records;
    } catch (err) {
      lastErr = err;
      const msg = String(err?.message || err || "");
      const name = String(err?.name || "");
      const retryable =
        name === "TimeoutError" ||
        msg.includes("abort") ||
        msg.includes("timeout") ||
        msg.includes("fetch failed") ||
        msg.includes("ECONNRESET") ||
        msg.includes("ETIMEDOUT") ||
        msg.includes("elektra_http_5");
      if (retryable && i < attempts - 1) {
        await sleep(400 * (i + 1));
        continue;
      }
      throw err;
    }
  }
  throw lastErr || new Error("elektra_fetch_failed");
}
