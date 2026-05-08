/**
 * PMS misafir eşlemesi: oda, soyad, ad — NFKC, trim, Türkçe harita, lowercase.
 */

const TR_MAP = new Map([
  ["ı", "i"],
  ["İ", "i"],
  ["I", "i"],
  ["ş", "s"],
  ["Ş", "s"],
  ["ğ", "g"],
  ["Ğ", "g"],
  ["ü", "u"],
  ["Ü", "u"],
  ["ö", "o"],
  ["Ö", "o"],
  ["ç", "c"],
  ["Ç", "c"],
]);

/**
 * @param {string} input
 * @returns {string}
 */
export function normalizeGuestMatchString(input) {
  let s = String(input ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ");
  if (!s) return "";
  try {
    s = s.toLocaleLowerCase("tr-TR");
  } catch {
    s = s.toLowerCase();
  }
  let out = "";
  for (const ch of s) {
    out += TR_MAP.get(ch) ?? ch;
  }
  return out.replace(/\s+/g, " ").trim();
}
