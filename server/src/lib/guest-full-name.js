/**
 * Misafir formları / API ad soyad doğrulaması.
 * Python `assistant/services/form_name_input.py` (`validate_chat_form_full_name`) ile aynı kurallar — değişince iki yeri güncelleyin.
 */

export const GUEST_NAME_MAX_LEN = 120;
export const GUEST_DESC_MAX_LEN = 1000;

function normalizeGuestNameInput(s) {
  const raw = String(s || "")
    .normalize("NFKC")
    .trim()
    .replace(/\p{Cf}/gu, "");
  return raw;
}

export function normalizeGuestFullNameForStorage(text) {
  const s = normalizeGuestNameInput(text);
  return s.split(/\s+/).filter(Boolean).join(" ");
}

function letterCount(s) {
  let n = 0;
  for (const ch of s) {
    if (/\p{L}/u.test(ch)) n += 1;
  }
  return n;
}

function allowShortMononym(s) {
  if (s.length !== 1) return false;
  const o = s.codePointAt(0);
  return (
    (o >= 0x4e00 && o <= 0x9fff) ||
    (o >= 0x3400 && o <= 0x4dbf) ||
    (o >= 0xac00 && o <= 0xd7af)
  );
}

function isCjkOrHangulLetter(ch) {
  if (!/\p{L}/u.test(ch)) return false;
  const o = ch.codePointAt(0);
  return (
    (o >= 0x4e00 && o <= 0x9fff) ||
    (o >= 0x3400 && o <= 0x4dbf) ||
    (o >= 0xac00 && o <= 0xd7af)
  );
}

function allowsCjkStyleSingleToken(token) {
  const letters = [...token].filter((c) => /\p{L}/u.test(c));
  if (letters.length < 2) return false;
  return letters.every((c) => isCjkOrHangulLetter(c));
}

function tokenAlphaLen(token) {
  return letterCount(token);
}

/**
 * @returns {null | "too_short" | "too_long" | "has_digit" | "no_letters" | "need_first_last" | "token_too_short"}
 */
export function validateGuestFullName(text) {
  const s = normalizeGuestNameInput(text);
  if (s.length < 1) return "too_short";
  if (s.length > GUEST_NAME_MAX_LEN) return "too_long";
  for (const ch of s) {
    if (/\p{Nd}/u.test(ch)) return "has_digit";
  }
  if (!/\p{L}/u.test(s)) return "no_letters";
  const lc = letterCount(s);
  if (lc < 2 && !allowShortMononym(s)) return "too_short";

  const parts = s.split(/\s+/).filter(Boolean);
  if (!parts.length) return "too_short";
  if (parts.length === 1) {
    const tok = parts[0];
    if (tok.length === 1 && allowShortMononym(tok)) return null;
    if (allowsCjkStyleSingleToken(tok)) return null;
    return "need_first_last";
  }
  for (const p of parts) {
    if (tokenAlphaLen(p) < 2) return "token_too_short";
  }
  return null;
}

export function guestFullNameErrorMessage(code) {
  const map = {
    has_digit: "name must contain letters only",
    no_letters: "name must contain letters only",
    too_long: "name is too long",
    need_first_last: "name must be first and last name",
    too_short: "name is too short",
    token_too_short: "name word too short",
  };
  return map[code] || "name must contain letters only";
}
