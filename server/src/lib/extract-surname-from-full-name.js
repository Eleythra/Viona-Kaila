/**
 * Tek "Ad Soyad" alanından soyad (son kelime).
 * @param {string} fullName
 * @returns {string}
 */
export function extractSurnameFromFullName(fullName) {
  const s = String(fullName ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ");
  if (!s) return "";
  const parts = s.split(" ").filter(Boolean);
  if (!parts.length) return "";
  return parts[parts.length - 1] || "";
}

/**
 * Adın soyad dışı kısmı (PMS NAME ile ikincil karşılaştırma).
 * @param {string} fullName
 * @returns {string}
 */
export function extractGivenNamesPart(fullName) {
  const s = String(fullName ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ");
  if (!s) return "";
  const parts = s.split(" ").filter(Boolean);
  if (parts.length <= 1) return "";
  return parts.slice(0, -1).join(" ");
}
