import re
import unicodedata


def _en_token_matches(text: str, token: str) -> bool:
    """Avoid substring false positives (e.g. 'time' in 'sometimes', 'my' inside words)."""
    t = text
    if " " in token or "&" in token:
        return token in t
    # Multi-word phrases handled above; single-token uses word boundaries (ASCII letters).
    try:
        return bool(re.search(rf"(?ui)(?<![a-z]){re.escape(token)}(?![a-z])", t))
    except re.error:
        return token in t


def _normalize_for_detection(text: str) -> str:
    """NFKC + casefold so Turkish İ / combining marks don't break substring rules."""
    raw = unicodedata.normalize("NFKC", (text or "").strip())
    t = raw.casefold()
    t = unicodedata.normalize("NFKC", t)
    # Strip zero-width / format chars (copy-paste from PDF/UI); avoid stripping Mn (would break decomposed ü/ö).
    t = "".join(ch for ch in t if unicodedata.category(ch) != "Cf")
    return re.sub(r"\s+", " ", t).strip()


class LanguageService:
    def detect(self, text: str, fallback: str = "tr") -> str:
        t = _normalize_for_detection(text)
        if not t:
            return fallback if fallback in ("tr", "en", "de", "pl") else "tr"
        # Explicit language override phrases (user asks to speak a language).
        if any(x in t for x in ["türkçe", "turkce", "türkce", "please speak turkish", "turkish"]):
            return "tr"
        if any(x in t for x in ["english", "in english", "bitte auf englisch", "please speak english"]):
            return "en"
        if any(x in t for x in ["deutsch", "auf deutsch", "bitte auf deutsch"]):
            return "de"
        if any(
            x in t
            for x in [
                "po polsku",
                "popolsku",
                "proszę po polsku",
                "prosze po polsku",
                "polski",
                "polish",
                "please speak polish",
                "auf polnisch",
                "bitte auf polnisch",
            ]
        ):
            return "pl"
        if re.search(r"[ąćęłńóśźż]", t) or re.search(r"\b(proszę|dzień dobry|czy|gdzie|potrzebuję|potrzebuje)\b", t):
            return "pl"
        # Turkish-specific characters should win over ambiguous English markers
        # like "vegan" (e.g., "veganım" contains the Turkish dotless "ı").
        # Turkish-specific characters should win over ambiguous markers.
        # Note: German also uses "ö/ü/ä", so we only treat Turkish-unique letters as TR signals.
        if re.search(r"[çğış]", t):
            return "tr"
        # Turkish phrases that mix Latin loanwords (gluten, vegan, allergen) with Turkish grammar.
        # Must run before EN/DE keyword lists — "gluten" alone would otherwise force English.
        # Regex for hassasiyet* catches suffixes / minor typos; substring "hassasiyeti" alone can miss after Unicode.
        # Turkish allergy/diet morphology: alerjim, alerjisi, … (beat EN 'gluten' / short-token noise).
        if re.search(r"(?ui)\balerji\w*", t):
            return "tr"
        if re.search(r"hassasiyet", t) or any(
            x in t
            for x in [
                "alerjen",
                "alerji",
                "glutene",
                "intolerans",
                "glutensiz",
                "çölyak",
                "çölyağım",
                "çölya",
            ]
        ):
            return "tr"
        # Prefer explicit German markers before Turkish fallback.
        if any(
            x in t
            for x in [
                "wie",
                "uhrzeit",
                "beschwerde",
                "störung",
                "stoerung",
                "reservierung",
                "ich",
                "brauche",
                "bitte",
                "handtuch",
                "decke",
                "kissen",
                "wasser",
                # fault / broken
                "kaputt",
                "defekt",
                "funktioniert nicht",
                "geht nicht",
                "klimaanlage",
                "dusche",
                "licht",
                "schlüssel",
                "zimmerschlüssel",
                "tür",
                # complaint
                "unzufrieden",
                "beschwerde",
                "schlechter",
                "lärm",
                "sauberkeit",
                # request
                "handtuch",
                "wäsche",
                "bettwäsche",
                "wasser",
                "kissen",
                "decke",
                "bügeln",
                # reservation
                "frühzeitig",
                "früher check-in",
                "später check-out",
                "zimmerwechsel",
                # special need
                "glutenfrei",
                "allergie",
                "zöliakie",
                # general service
                "reinigung",
                "reinigungsservice",
                "wäscherei",
                "zeiten",
                "geöffnet",
                "geschlossen",
                "wo ist",
                "restaurantzeiten",
                "poolzeiten",
                "strandzeiten",
                "animationsprogramm",
                "pool & strand",
                "pool und strand",
            ]
        ):
            return "de"
        # Ambiguous single-token inputs (shared across languages) should follow the UI fallback.
        # This prevents cases like: UI=TR, message="gluten" => EN reply.
        if t in ("gluten", "vegan", "celiac", "allergy"):
            return fallback if fallback in ("tr", "en", "de", "pl") else "tr"
        # Prefer explicit English markers before Turkish fallback.
        # Use word boundaries for short tokens shared with German (e.g. "gluten" inside "glutenfrei").
        en_tokens = [
            "what",
            "time",
            "complaint",
            "request",
            "fault",
            "hotel",
            "reservation",
            "allergy",
            "i am",
            "please",
            "need",
            "my",
            "is broken",
            "broken",
            "not working",
            "doesn't work",
            "doesn't open",
            "door",
            "shower",
            "air conditioning",
            "light",
            "key card",
            "keycard",
            "television",
            "tv",
            "housekeeping",
            "laundry",
            "dry cleaning",
            "ironing",
            "towel",
            "blanket",
            "pillow",
            "water",
            "vegan",
            "celiac",
            "early check-in",
            "late check-out",
            "room change",
            "noise",
            "cleanliness",
            "unhappy",
            "restaurant",
            "pool & beach",
            "pool and beach",
            "animation",
            "where is",
            "how do i",
            "how can",
            "check in",
            "check out",
            # Hotel English (short tokens use word-boundary matching in _en_token_matches)
            "wifi",
            "reception",
            "lobby",
            "breakfast",
            "checkout",
            "spa",
            "gym",
            "beach",
            "safe",
            "minibar",
            "elevator",
            "thank you",
            "good morning",
            "excuse me",
            "could you",
            "would you",
        ]
        if any(_en_token_matches(t, x) for x in en_tokens) or re.search(
            r"(?<![a-z])gluten(?![a-z])", t
        ):
            return "en"
        if re.search(r"[çğış]", t) or any(
            x in t
            for x in [
                "selam",
                "merhaba",
                "nasılsın",
                "nasilsin",
                "naber",
                "şikayet",
                "ariza",
                "arıza",
                "istek",
                "saat kaç",
                "rezervasyon",
                "çölyak",
                "çölya",
            ]
        ):
            return "tr"
        return fallback if fallback in ("tr", "en", "de", "pl") else "tr"

    def coerce_reply_language(
        self, normalized: str, detected: str, ui_language: str | None
    ) -> str:
        """
        TR UI: loanword/kısa token yüzünden EN sanılırsa şablonu TR'ye çek.
        EN UI: nadiren TR dönen ama açıkça İngilizce otel cümlesi olan metinleri EN'ye çek.
        """
        ui = (ui_language or "tr").lower().strip()
        if ui not in ("tr", "en", "de", "pl"):
            ui = "tr"
        t = _normalize_for_detection(normalized)

        # --- Turkish UI: keep templates Turkish when detector guessed English wrongly ---
        if ui == "tr" and detected == "en":
            if re.search(r"[çğıöşüÇĞİÖŞÜ]", normalized) or re.search(r"[çğıöşü]", t):
                return "tr"
            if any(
                x in t
                for x in (
                    "alerjen",
                    "alerji",
                    "alerjim",
                    "alerjisi",
                    "hassasiyet",
                    "glutene",
                    "gluten",
                    "çölyak",
                    "laktoz",
                    "veganım",
                    "veganim",
                )
            ):
                return "tr"
            if re.search(r"(?ui)\balerji\w*", t):
                return "tr"
            return detected

        # --- English UI: prefer English replies for clear English hotel phrasing (no TR letters / TR words) ---
        if ui == "en" and detected == "tr":
            if re.search(r"[çğıöşü]", t):
                return "tr"
            if any(
                x in t
                for x in (
                    "merhaba",
                    "selam",
                    "lütfen",
                    "lutfen",
                    "alerjen",
                    "alerji",
                    "hassasiyet",
                    "çölyak",
                    "rezervasyon",
                    "şikayet",
                    "sikayet",
                )
            ):
                return "tr"
            if re.search(
                r"(?ui)\b("
                r"i\s+(need|want|have|would|am)|"
                r"we\s+(need|want|have)|"
                r"can\s+i|could\s+you|would\s+you|"
                r"where\s+(is|are|can)|"
                r"what\s+time|how\s+(do|can|to|much)|"
                r"is\s+there|do\s+you\s+have|"
                r"please"
                r")\b",
                t,
            ):
                return "en"
        return detected

