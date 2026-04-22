/**
 * Misafir web formları ve API `language` alanı — `js/lang-registry.js` ile aynı kod listesi kalmalı.
 * (Asistan / chatbot pipeline ayrı; burada yalnızca Node tarafı misafir istekleri.)
 */
export const VIONA_UI_LANGUAGE_CODES = ["tr", "en", "de", "pl", "ru", "da", "cs", "ro", "nl", "sk"];

export function normalizeVionaUiLanguage(value) {
  let v = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
  if (v.length > 2 && v.includes("-")) v = v.slice(0, 2);
  return VIONA_UI_LANGUAGE_CODES.includes(v) ? v : "tr";
}
