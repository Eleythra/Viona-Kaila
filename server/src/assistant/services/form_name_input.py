"""Sohbet formu «ad soyad» adımı: yardım sorusu ayırma ve hafif doğrulama."""

from __future__ import annotations

import unicodedata

# Kısa / net ifadeler; tam isim metninde yanlış pozitif riskini azaltır.
_HELP_TR = (
    "ne yazayım",
    "ne yazmalıyım",
    "nasıl yazayım",
    "nasıl yazmalıyım",
    "anlamadım",
    "anlamıyorum",
    "ne demek",
    "ne istiyorsunuz",
    "ne istiyorsun",
    "açıklar mısın",
    "aciklar misin",
    "örnek ver",
    "ornek ver",
    "bilgi ver",
)
_HELP_EN = (
    "what should i write",
    "what do i write",
    "what to write",
    "don't understand",
    "do not understand",
    "not sure what",
    "what do you mean",
    "can you explain",
    "give an example",
)
# Not: «was schreib» gibi kısa alt dizgiler «Schreiber» soyadında yanlış pozitif üretir; kullanma.
_HELP_DE = (
    "was soll ich schreiben",
    "was soll ich eingeben",
    "verstehe nicht",
    "versteh nicht",
    "was meinen sie",
    "was meinst du",
    "zum beispiel",
    "ein beispiel",
    "erklären sie",
    "erklaeren sie",
)
_HELP_PL = (
    "co napisać",
    "co mam napisać",
    "nie rozumiem",
    "nie rozumiałem",
    "nie rozumiałam",
    "o co chodzi",
    "co to znaczy",
    "wyjaśnij",
    "wytłumacz",
    "przykład",
    "możesz wyjaśnić",
    "możesz wytłumaczyć",
)

_HELP_EXACT = frozenset(
    {
        "?",
        "??",
        "???",
    }
)

# Tek kelime; alt dizgi eşleşmesi «yardımsever» gibi isimlerde yanlış pozitif üretmesin diye token ile.
_HELP_SINGLE_TOKENS = frozenset(
    {
        "help",
        "hilfe",
        "pomoc",
        "yardım",
        "yardim",
    }
)


def _nfc(s: str) -> str:
    raw = unicodedata.normalize("NFKC", s or "").strip()
    # Görünmez biçim karakterleri (ZWJ, bidi işaretleri vb.) — kopyala-yapıştır hatalarını temizler.
    return "".join(ch for ch in raw if unicodedata.category(ch) != "Cf")


def is_full_name_input_effectively_empty(text: str) -> bool:
    """Yalnızca boşluk / görünmez karakter ise True (oda adımına sıçramayı önler)."""
    return not _nfc(text)


def _letter_count(s: str) -> int:
    return sum(1 for ch in s if ch.isalpha())


def _allow_short_mononym(s: str) -> bool:
    """Tek karakterlik Doğu Asya / Hangul adları (çok nadir; yanlış reddetmeyi önler)."""
    if len(s) != 1:
        return False
    o = ord(s[0])
    return (
        0x4E00 <= o <= 0x9FFF  # CJK Unified Ideographs
        or 0x3400 <= o <= 0x4DBF  # CJK Extension A
        or 0xAC00 <= o <= 0xD7AF  # Hangul syllables
    )


def _is_cjk_or_hangul_letter(ch: str) -> bool:
    if not ch.isalpha():
        return False
    o = ord(ch)
    return (
        0x4E00 <= o <= 0x9FFF
        or 0x3400 <= o <= 0x4DBF
        or 0xAC00 <= o <= 0xD7AF
    )


def _allows_cjk_style_single_token(token: str) -> bool:
    """Boşluksuz CJK/Hangul adı (ör. «张伟»); en az iki hece."""
    letters = [c for c in token if c.isalpha()]
    if len(letters) < 2:
        return False
    return all(_is_cjk_or_hangul_letter(c) for c in letters)


def _token_alpha_len(token: str) -> int:
    return sum(1 for c in token if c.isalpha())


def is_chat_form_full_name_help_request(text: str) -> bool:
    """Kullanıcı isim yerine açıklama / örnek istiyorsa True (aynı adımda kalınır)."""
    t = _nfc(text).lower()
    if not t:
        return False
    if t in _HELP_EXACT:
        return True
    for raw_tok in t.split():
        tok = raw_tok.strip("?!.,;:«»\"'").lower()
        if tok in _HELP_SINGLE_TOKENS:
            return True
    # Uzun metinlerde «i̇stanbul'da ne yazayım» gibi cümleler nadiren tam isimdir; yine de kısalt.
    if len(t) > 160:
        return False
    for group in (_HELP_TR, _HELP_EN, _HELP_DE, _HELP_PL):
        if any(h in t for h in group):
            return True
    return False


def validate_chat_form_full_name(text: str) -> str | None:
    """
    Geçerli ad soyad metni için None; aksi halde hata kodu.
    Rakam yok; en az iki harf (veya tek CJK/Hangul hecesi); makul uzunluk.
    """
    s = _nfc(text)
    if len(s) < 1:
        return "too_short"
    if len(s) > 120:
        return "too_long"
    if any(ch.isdigit() for ch in s):
        return "has_digit"
    if not any(ch.isalpha() for ch in s):
        return "no_letters"
    lc = _letter_count(s)
    if lc < 2 and not _allow_short_mononym(s):
        return "too_short"

    parts = [p for p in s.split() if p]
    if not parts:
        return "too_short"
    if len(parts) == 1:
        tok = parts[0]
        if len(tok) == 1 and _allow_short_mononym(tok):
            return None
        if _allows_cjk_style_single_token(tok):
            return None
        return "need_first_last"
    for p in parts:
        if _token_alpha_len(p) < 2:
            return "too_short"
    return None


def normalize_full_name_for_storage(text: str) -> str:
    """Tek tip boşluk + NFKC (kayıtta tutarlılık)."""
    s = _nfc(text)
    return " ".join(s.split())
