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

/**
 * Oda eşlemesi: önce `normalizeGuestMatchString`, sonra yalnızca rakamlardan oluşuyorsa
 * baştaki sıfırları kaldırır (`01106` ile `1106` aynı anahtar).
 * Harf / tire / suffix içeren odalar (örn. `1204a`, `vip01`) olduğu gibi kalır.
 * @param {string} input
 * @returns {string}
 */
export function normalizeGuestRoomForMatch(input) {
  const base = normalizeGuestMatchString(input);
  if (!base) return "";
  if (/^\d+$/.test(base)) return String(parseInt(base, 10));
  return base;
}
