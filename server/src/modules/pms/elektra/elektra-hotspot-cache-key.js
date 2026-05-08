/**
 * Aynı otelde farklı path veya auth şeması farklı yanıt üretebilir; önbellek anahtarı buna göre ayrılır.
 * Kimlik bilgisi (token) anahtara dahil edilmez — yalnızca yapılandırma imzası.
 *
 * @param {string} hotelId
 * @param {string} [hotspotPath]
 * @param {string} [authMode]
 * @param {string} [authHeaderName]
 * @param {string} [authQueryKey]
 */
export function buildHotspotListCacheKey(
  hotelId,
  hotspotPath,
  authMode,
  authHeaderName,
  authQueryKey,
) {
  const hid = String(hotelId || "").trim();
  const p = String(hotspotPath || "/apisequence/GetHotspotList").trim();
  const m = String(authMode || "bearer").trim();
  const h = String(authHeaderName || "Authorization").trim();
  const q = String(authQueryKey || "").trim();
  return `${hid}|${p}|${m}|${h}|${q}`;
}
