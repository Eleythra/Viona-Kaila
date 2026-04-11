from assistant.utils.text_normalizer import normalize_text


DEVICE_MAP = [
    ("televizyon", "Televizyon"),
    ("tv", "Televizyon"),
    ("duş", "Duş"),
    ("dus", "Duş"),
    ("klima", "Klima"),
    ("kapı kartı", "Kart"),
    ("kapi karti", "Kart"),
    ("kart", "Kart"),
    ("ışık", "Işık"),
    ("isik", "Işık"),
    ("lamba", "Işık"),
    ("telefon", "Telefon"),
]

DEVICE_MAP_EN = [
    ("tv", "TV"),
    ("television", "TV"),
    ("shower", "Shower"),
    ("ac", "Air conditioner"),
    ("air conditioner", "Air conditioner"),
    ("card", "Card"),
    ("key card", "Card"),
    ("light", "Light"),
    ("lamp", "Light"),
    ("phone", "Phone"),
]

DEVICE_MAP_DE = [
    ("fernseher", "Fernseher"),
    ("dusche", "Dusche"),
    ("klimaanlage", "Klimaanlage"),
    ("karte", "Karte"),
    ("türkarte", "Karte"),
    ("licht", "Licht"),
    ("lampe", "Licht"),
    ("telefon", "Telefon"),
]

DEVICE_MAP_PL = [
    ("telewizor", "Telewizor"),
    ("tv", "Telewizor"),
    ("prysznic", "Prysznic"),
    ("klimatyzacja", "Klimatyzacja"),
    ("klimat", "Klimatyzacja"),
    ("karta", "Karta"),
    ("światło", "Oświetlenie"),
    ("swiatlo", "Oświetlenie"),
    ("lampa", "Oświetlenie"),
    ("telefon", "Telefon"),
]


class DeviceExtractor:
    def extract(self, message: str, language: str) -> str | None:
        text = normalize_text(message)
        if language == "en":
            return self._extract_from_map(text, DEVICE_MAP_EN)
        if language == "de":
            return self._extract_from_map(text, DEVICE_MAP_DE)
        if language == "pl":
            return self._extract_from_map(text, DEVICE_MAP_PL)
        return self._extract_from_map(text, DEVICE_MAP)

    @staticmethod
    def _extract_from_map(text: str, pairs: list[tuple[str, str]]) -> str | None:
        for needle, label in pairs:
            if needle in text:
                return label
        return None

