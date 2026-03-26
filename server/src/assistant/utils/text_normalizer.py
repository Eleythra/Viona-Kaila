import re
import unicodedata


def normalize_text(text: str) -> str:
    # Turkish dotted capital İ (U+0130): str.lower() yields i + combining dot (U+0307), which breaks
    # exact phrase matching. Fold to ASCII i before/after lower().
    t = (text or "").strip()
    t = t.replace("İ", "i")
    lowered = t.lower()
    lowered = lowered.replace("i\u0307", "i")
    lowered = re.sub(r"\s+", " ", lowered)
    # NFC: e.g. "konuş" as s + U+0327 must match precomposed ş (phrase keys / rules).
    return unicodedata.normalize("NFC", lowered)

