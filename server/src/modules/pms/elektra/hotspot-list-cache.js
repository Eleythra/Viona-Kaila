/** @type {Map<string, { at: number, records: object[] }>} */
const cache = new Map();

/**
 * @param {string} hotelKey
 * @param {number} ttlMs
 * @returns {object[] | null}
 */
export function getHotspotListCached(hotelKey, ttlMs) {
  const ent = cache.get(hotelKey);
  if (!ent) return null;
  if (Date.now() - ent.at > ttlMs) {
    cache.delete(hotelKey);
    return null;
  }
  return ent.records;
}

/**
 * @param {string} hotelKey
 * @param {object[]} records
 */
export function setHotspotListCached(hotelKey, records) {
  cache.set(hotelKey, { at: Date.now(), records });
}

/** Test / yönetim için */
export function clearHotspotListCache() {
  cache.clear();
}
