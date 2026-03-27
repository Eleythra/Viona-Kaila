from pathlib import Path
from typing import Optional
import yaml
import re

from assistant.core.logger import get_logger
from assistant.schemas.intent import IntentResult

logger = get_logger("assistant.rule_engine")

FAULT_WORDS = [
    # TR
    "bozuldu", "bozuk", "çalışmıyor", "calismiyor", "soğutmuyor", "sogutmuyor",
    "arızalı", "arizali", "kırıldı", "kirildi", "açılmıyor", "acilmiyor",
    "kapanmıyor", "kapanmiyor", "yanmıyor", "yanmiyor",
    # EN
    "broken", "not working", "doesn't work", "doesnt work",
    "doesn't open", "doesnt open", "out of order",
    # DE
    "kaputt", "defekt", "funktioniert nicht", "geht nicht",
    # RU
    "не работает", "сломался", "сломалась", "сломано", "не открывается",
    "не закрывается", "не включается", "не работает", "неисправен", "неисправна",
]
COMPLAINT_WORDS = [
    # TR
    "çok kötü", "cok kotu", "memnun değilim", "memnun degilim",
    "gürültü", "gurultu", "temizlik kötü", "şikayet", "berbat",
    "hayal kırıklığı", "rezalet",
    # EN
    "complaint", "noisy", "dissatisfied", "unhappy", "terrible",
    "awful", "horrible", "disappointed", "very bad", "not satisfied",
    "bad service", "bad experience",
    # DE
    "beschwerde", "unzufrieden", "lärm", "laerm", "schlecht",
    "furchtbar", "enttäuscht", "enttaeuscht", "schlechter service",
    # RU
    "жалоба", "шум", "плохо", "недоволен", "недовольна", "ужасно",
    "разочарован", "разочарована", "плохой сервис", "очень плохо",
]
REQUEST_WORDS = [
    # Stronger signals: entity/item keywords (keep verbs out to reduce false matches).
    # towel / havlu
    "havlu",
    "towel",
    "handtuch",
    "полотенце",
    # blanket / battaniye
    "battaniye",
    "blanket",
    "decke",
    "одеяло",
    # pillow / yastık
    "yastık",
    "yastik",
    "pillow",
    "kissen",
    "подушка",
    # water / su
    "su",
    "water",
    "wasser",
    "вода",
    # ironing (optional; entity may stay None, composer will use default request template)
    "ütü",
    "utu",
    "iron",
    "ironing",
    "buegeln",
    "bügeln",
]
RESERVATION_WORDS = [
    "erken giriş",
    "erken giris",
    "geç çıkış",
    "gec cikis",
    "rezervasyon",
    "reservation",
    "oda değiş",
    "oda degis",
    "room change",
    "late checkout",
    "early checkin",
    "extension",
    "reservierung",
    "früher check-in",
    "später check-out",
    "ранний заезд",
    "поздний выезд",
    "бронирование",
]
SPECIAL_WORDS = [
    # Dietary preference
    "vegan",
    "vejetaryen",
    "vejetaryenim",
    "vegetarian",
    "vegetarier",
    "vegetari",
    "вегетариан",
    # Dietary medical restriction
    "çölya",
    "çölyak",
    "colyak",
    "celiac",
    "zöliakie",
    "целиакия",
    "gluten",
    "kein gluten",
    "gluten yiyemem",
    "gluten can not",
    # TR: users often write only the label/keyword
    "alerjen",
    "hassasiyet",
    "hassasiyeti",
    "gluten hassasiyeti",
    "laktoz",
    "laktose",
    "lactose",
    "süt dokunuyor",
    "milk",
    "dairy",
    "лактоz",
    "лактоз",
    "молоко",
    # Allergy
    "alerji",
    "allergy",
    "allergie",
    "ист аллерг",
    "fıstık",
    "peanut",
    "erdnuss",
    "арахис",
    "nuts",
    # Baby need
    "baby food",
    "babynahrung",
    "детское питание",
    "baby",
    # TR baby / food
    "bebek",
    "bebeğim",
    "bebeği",
    "bebeği",
    "mama",
    "bebek maması",
    "bebek maması",
    # DE baby
    "babynahrung",
    # Accessibility need
    "accessibility",
    "erişilebilirlik",
    "wheelchair",
    "rollstuhl",
    "доступность",
    "доступ",
    "коляска",
]
HOTEL_INFO_WORDS = [
    # Fixed / strong location & service keywords (avoid very generic tokens like "where" alone).
    "spa saat",
    "moss beach",
    "lobi",
    "lobby",
    "лобби",
    "где лобби",
    "restoran saatleri",
    "restaurant hours",
    "restaurantzeiten",
    "часы ресторанов",
    "havuz ve plaj",
    "pool & beach",
    "pool and beach",
    "pool & strand",
    "бассейн и пляж",
    "spa ve wellness",
    "spa und wellness",
    "spa & wellness",
    "spa and wellness",
    "спа и wellness",
    "спа и велнес",
    "animasyon",
    "animasyon ve etkinlikler",
    "animation & events",
    "animation and events",
    "animation & veranstaltungen",
    "анимация и мероприятия",
    # Check-in/check-out time is handled by a dedicated guard.

    # Laundry / cleaning info
    "temizlik hizmeti",
    "temizlik ücretli",
    "temizlik ucretli",
    "kuru temizleme",
    "ütü hizmeti",
    "utu hizmeti",
    "çamaşırhane",
    "camasirhane",
    "laundry",
    "dry cleaning",
    "ironing service",
    "reinigung",
    "wäscherei",
    "waescherei",
    "bügeln",
    "buegeln",
    "уборка",
    "прачечная",
    "химчистка",
    "глажка",

    # "I'm bored" => suggest animations & events
    "canım sıkıldı",
    "canim sikildi",
    "sıkıldım",
    "bored",
    "i am bored",
    "langweilig",
    "mir ist langweilig",
    "мне скучно",
    "скучно",
]

DEVICE_HINTS = {
    "television": ["televizyon", "tv", "fernseher", "телевизор"],
    "shower": ["duş", "dus", "shower", "dusche", "душ"],
    "keycard": ["kart", "kapı kartı", "key card", "karte", "карта"],
    "hvac": ["klima", "ac", "air conditioner", "klimaanlage", "кондиционер"],
    "lighting": ["ışık", "isik", "lamba", "light", "lampe", "свет"],
    "phone": ["telefon", "phone", "telefon"],
    "towel": ["havlu", "towel", "handtuch", "полотенце"],
    "blanket": ["battaniye", "blanket", "decke", "одеяло"],
    "pillow": ["yastık", "yastik", "pillow", "kissen", "подушка"],
    "water": ["su", "water", "wasser", "вода"],
    # Dietary preference
    "vegan": ["vegan", "веган", "veganım", "i am vegan"],
    "vegetarian": ["vejetaryen", "vegetarian", "vegetarier", "vejetaryenim", "vejetaryenler", "я вегетарианец", "вегетарианец"],

    # Dietary medical restriction
    "celiac": ["çölya", "çölyak", "colyak", "celiac", "zöliakie", "целиакия"],
    "gluten_related_restriction": [
        "gluten",
        "kein gluten",
        "gluten yiyemem",
        "ich kann kein gluten",
        # TR label-style inputs
        "hassasiyet",
        "hassasiyeti",
        "gluten hassasiyeti",
    ],
    "lactose_related_restriction": ["laktoz", "laktose", "lactose", "laktozum", "süt dokunuyor", "milk", "dairy", "лактоз", "лактоза", "молоко", "лактоz"],

    # Allergy
    "allergy": [
        "alerji",
        "alerjen",
        "allergy",
        "allergie",
        "fıstık",
        "peanut",
        "erdnuss",
        "арахис",
        "nuts",
        "nut allergy",
        "peanut allergy",
    ],

    # Baby need
    "baby_need": [
        "baby food",
        "babynahrung",
        "детское питание",
        "детям",
        "мне нужно детское питание",
        "bebek",
        "bebeğim",
        "bebeği",
        "mama",
        "bebeğim için",
    ],

    # Accessibility need
    "accessibility_need": ["accessibility", "erişilebilirlik", "wheelchair", "rollstuhl", "доступность", "доступ", "коляска"],
    "late_checkout": ["geç çıkış", "gec cikis", "late checkout", "выезд позже"],
    "early_checkin": ["erken giriş", "erken giris", "early checkin"],
    "room_change": ["oda değiş", "oda degis", "room change"],
    "reservation_issue": ["rezervasyonum görünmüyor", "rezervasyon görünmüyor", "reservation not found", "reservation issue"],
    "fixed_restaurant_info": ["restoran saatleri", "restaurant hours", "restaurantzeiten", "часы ресторанов"],
    "fixed_pool_beach_info": ["havuz ve plaj", "pool & beach", "pool and beach", "pool strand", "бассейн и пляж"],
    "fixed_spa_info": ["spa ve wellness", "spa & wellness", "spa und wellness", "spa and wellness", "spa wellness", "спа и wellness", "спа и велнес"],
    "fixed_animation_info": ["animasyon ve etkinlikler", "animation & events", "animation and events", "animation veranstaltungen", "анимация и мероприятия"],
}


def _norm_tokens(text: str) -> list[str]:
    return re.findall(r"[a-zA-ZçğıöşüÇĞİÖŞÜа-яА-ЯёЁ]+", text.lower())


def _dl(a: str, b: str) -> int:
    m, n = len(a), len(b)
    d = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        d[i][0] = i
    for j in range(n + 1):
        d[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            c = 0 if a[i - 1] == b[j - 1] else 1
            d[i][j] = min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c)
    return d[m][n]


def _fuzzy_has(text: str, word: str) -> bool:
    if word in text:
        return True
    wt = [w for w in _norm_tokens(word) if w]
    if not wt:
        return False
    tokens = _norm_tokens(text)
    for w in wt:
        for t in tokens:
            if abs(len(w) - len(t)) > 2:
                continue
            # Avoid aggressive false positives on short tokens across languages.
            if len(w) < 5:
                continue
            if _dl(w, t) <= 1:
                return True
    return False


class RuleEngine:
    def __init__(self, rules_path: Path):
        with open(rules_path, "r", encoding="utf-8") as f:
            self.rules = yaml.safe_load(f) or {}

    def match(self, normalized_text: str) -> Optional[IntentResult]:
        lang_switch = self._match_language_switch(normalized_text)
        if lang_switch:
            logger.info("RULE MATCH: chitchat (language_switch) -> %s", lang_switch.entity)
            return lang_switch

        if self._is_chitchat_query(normalized_text):
            logger.info("RULE MATCH: chitchat")
            sub = self._chitchat_sub_intent(normalized_text)
            return IntentResult(
                intent="chitchat",
                sub_intent=sub,
                entity=None,
                department=None,
                needs_rag=False,
                response_mode="fixed",
                confidence=1.0,
                source="rule",
            )

        # Important: When user asks for check-in/check-out times,
        # it must be handled as hotel_info (RAG), not reservation.
        if self._is_checkin_checkout_time_query(normalized_text):
            logger.info("RULE MATCH: hotel_info (checkin_checkout_time)")
            return IntentResult(
                intent="hotel_info",
                sub_intent="opening_hours",
                entity=None,
                department=None,
                needs_rag=True,
                response_mode="answer",
                confidence=0.97,
                source="rule",
            )

        # Current time question (not hotel check-in/out)
        if self._is_current_time_query(normalized_text):
            logger.info("RULE MATCH: current_time")
            return IntentResult(
                intent="current_time",
                sub_intent=None,
                entity=None,
                department=None,
                needs_rag=False,
                response_mode="fixed",
                confidence=1.0,
                source="rule",
            )

        # High-priority service-information queries should go to hotel_info,
        # not complaint/request flows.
        if self._is_service_info_query(normalized_text):
            logger.info("RULE MATCH: hotel_info (service_info)")
            return IntentResult(
                intent="hotel_info",
                sub_intent="service_information",
                entity=self._hotel_info_entity(normalized_text),
                department=None,
                needs_rag=True,
                response_mode="answer",
                confidence=0.95,
                source="rule",
            )

        # Strong, deterministic classes first
        if any(_fuzzy_has(normalized_text, w) for w in FAULT_WORDS):
            entity = self._extract_entity(normalized_text)
            sub = self._fault_sub_intent(entity)
            logger.info("RULE MATCH: fault_report (%s)", entity or "generic")
            return IntentResult(
                intent="fault_report",
                sub_intent=sub,
                entity=entity,
                department="reception",
                needs_rag=False,
                response_mode="guided",
                confidence=1.0,
                source="rule",
            )

        if any(_fuzzy_has(normalized_text, w) for w in COMPLAINT_WORDS):
            entity = self._extract_entity(normalized_text)
            sub = self._complaint_sub_intent(normalized_text, entity)
            logger.info("RULE MATCH: complaint (%s)", sub)
            return IntentResult(
                intent="complaint",
                sub_intent=sub,
                entity=entity,
                department="reception",
                needs_rag=False,
                response_mode="guided",
                confidence=1.0,
                source="rule",
            )

        if any(_fuzzy_has(normalized_text, w) for w in REQUEST_WORDS):
            entity = self._extract_entity(normalized_text)
            sub = self._request_sub_intent(entity)
            logger.info("RULE MATCH: request (%s)", sub)
            return IntentResult(
                intent="request",
                sub_intent=sub,
                entity=entity,
                department="reception",
                needs_rag=False,
                response_mode="guided",
                confidence=1.0,
                source="rule",
            )

        if any(_fuzzy_has(normalized_text, w) for w in RESERVATION_WORDS):
            entity = self._extract_entity(normalized_text)
            sub = self._reservation_sub_intent(normalized_text, entity)
            logger.info("RULE MATCH: reservation (%s)", sub)
            return IntentResult(
                intent="reservation",
                sub_intent=sub,
                entity=entity,
                department="reception",
                needs_rag=False,
                response_mode="guided",
                confidence=1.0,
                source="rule",
            )

        if any(_fuzzy_has(normalized_text, w) for w in SPECIAL_WORDS):
            entity = self._extract_entity(normalized_text)
            sub = self._special_sub_intent(entity)
            logger.info("RULE MATCH: special_need (%s)", sub)
            return IntentResult(
                intent="special_need",
                sub_intent=sub,
                entity=entity,
                department="guest_relations",
                needs_rag=False,
                response_mode="guided",
                confidence=1.0,
                source="rule",
            )

        if any(_fuzzy_has(normalized_text, w) for w in HOTEL_INFO_WORDS):
            logger.info("RULE MATCH: hotel_info (keyword)")
            return IntentResult(
                intent="hotel_info",
                sub_intent="service_information",
                entity=self._hotel_info_entity(normalized_text),
                department=None,
                needs_rag=True,
                response_mode="answer",
                confidence=0.9,
                source="rule",
            )

        # YAML fuzzy fallback is intentionally disabled to avoid false positives.
        # Deterministic in-code keyword sets above + semantic classifier are the
        # primary routing strategy for production stability.
        return None

    @staticmethod
    def _language_switch_result(entity: str) -> IntentResult:
        return IntentResult(
            intent="chitchat",
            sub_intent="language_switch",
            entity=entity,
            department=None,
            needs_rag=False,
            response_mode="fixed",
            confidence=1.0,
            source="rule",
        )

    @staticmethod
    def _match_language_switch(text: str) -> Optional[IntentResult]:
        """Short meta phrases: user only asks to switch reply language (deterministic, no LLM)."""
        t = (text or "").strip().lower()
        t = re.sub(r"\s+", " ", t).strip().strip(".,!?")
        # Common typo (i/l swap) — still route to English switch intent.
        t = t.replace("iniglizce", "ingilizce")
        # Exact phrases — avoids false positives with request/complaint flows.
        phrase_to_lang: dict[str, str] = {
            # English (single-word asks are common; exact match only)
            "ingilizce": "en",
            "ingilizce konuş": "en",
            "ingilizce konus": "en",
            "ingilizce yaz": "en",
            "ingilizceye geç": "en",
            "ingilizceye gec": "en",
            "lütfen ingilizce": "en",
            "lutfen ingilizce": "en",
            "please speak english": "en",
            "speak english": "en",
            "in english": "en",
            "english please": "en",
            "switch to english": "en",
            "bitte auf englisch": "en",
            "auf englisch": "en",
            "auf englisch bitte": "en",
            # Turkish
            "türkçe": "tr",
            "turkce": "tr",
            "türkçe konuş": "tr",
            "turkce konus": "tr",
            "türkçe yaz": "tr",
            "turkce yaz": "tr",
            "türkçeye geç": "tr",
            "turkceye gec": "tr",
            "please speak turkish": "tr",
            "speak turkish": "tr",
            "switch to turkish": "tr",
            "bitte türkisch": "tr",
            "bitte turkisch": "tr",
            "auf türkisch": "tr",
            "auf turkisch": "tr",
            "по-турецки": "tr",
            "по турецки": "tr",
            # German
            "almanca": "de",
            "almanca konuş": "de",
            "almanca konus": "de",
            "almancaya geç": "de",
            "almancaya gec": "de",
            "please speak german": "de",
            "speak german": "de",
            "switch to german": "de",
            "deutsch bitte": "de",
            "bitte deutsch": "de",
            "bitte auf deutsch": "de",
            "auf deutsch": "de",
            "auf deutsch bitte": "de",
            "german please": "de",
            # Russian
            "rusça": "ru",
            "rusca": "ru",
            "rusça konuş": "ru",
            "rusca konus": "ru",
            "rusçaya geç": "ru",
            "ruscaya gec": "ru",
            "please speak russian": "ru",
            "speak russian": "ru",
            "switch to russian": "ru",
            "по-русски": "ru",
            "по русски": "ru",
            "по русски пожалуйста": "ru",
            "bitte auf russisch": "ru",
            "auf russisch": "ru",
            "auf russisch bitte": "ru",
            # Russian (exact) — switch target language
            "по-английски": "en",
            "по английски": "en",
            "по-немецки": "de",
            "по немецки": "de",
            "перейди на английский": "en",
            "перейдите на английский": "en",
            "перейди на немецкий": "de",
            "перейдите на немецкий": "de",
            "перейди на турецкий": "tr",
            "перейдите на турецкий": "tr",
            "перейди на русский": "ru",
            "перейдите на русский": "ru",
            # German (exact)
            "bitte englisch": "en",
            "englisch bitte": "en",
            "auf englisch wechseln": "en",
            "wechsel zu englisch": "en",
            "zu englisch wechseln": "en",
            "auf türkisch wechseln": "tr",
            "auf turkisch wechseln": "tr",
            "wechsel zu türkisch": "tr",
            "wechsel zu turkisch": "tr",
            "auf russisch wechseln": "ru",
            "wechsel zu russisch": "ru",
            "bitte russisch": "ru",
        }
        tgt = phrase_to_lang.get(t)
        if tgt:
            return RuleEngine._language_switch_result(tgt)

        # Turkish polite / longer asks: "ingilizce konuşur musun", "almanca konuşabilir misiniz", …
        _speak_word = r"(konuşur|konusur|konuşabilir|konusabilir|konuş|konus|yaz|yazabilir)"
        if re.match(rf"^ingilizce\s+{_speak_word}\b", t):
            return RuleEngine._language_switch_result("en")
        if re.match(rf"^türkçe\s+{_speak_word}\b", t) or re.match(rf"^turkce\s+{_speak_word}\b", t):
            return RuleEngine._language_switch_result("tr")
        if re.match(rf"^almanca\s+{_speak_word}\b", t):
            return RuleEngine._language_switch_result("de")
        if re.match(rf"^rusça\s+{_speak_word}\b", t) or re.match(rf"^rusca\s+{_speak_word}\b", t):
            return RuleEngine._language_switch_result("ru")

        # Russian: meta phrases (говори по-английски, переключись на немецкий, …)
        _ru_switch = [
            (r"^говори(те)?\s+по-английски", "en"),
            (r"^говори(те)?\s+по английски", "en"),
            (r"^говори(те)?\s+по-немецки", "de"),
            (r"^говори(те)?\s+по немецки", "de"),
            (r"^говори(те)?\s+по-турецки", "tr"),
            (r"^говори(те)?\s+по турецки", "tr"),
            (r"^говори(те)?\s+по-русски", "ru"),
            (r"^говори(те)?\s+по русски", "ru"),
            (r"^переключ(ись|итесь)\s+на\s+английский", "en"),
            (r"^переключ(ись|итесь)\s+на\s+немецкий", "de"),
            (r"^переключ(ись|итесь)\s+на\s+турецкий", "tr"),
            (r"^переключ(ись|итесь)\s+на\s+русский", "ru"),
            (r"^перейти\s+на\s+английский", "en"),
            (r"^перейти\s+на\s+немецкий", "de"),
            (r"^перейти\s+на\s+турецкий", "tr"),
            (r"^перейти\s+на\s+русский", "ru"),
            (r"^давай(те)?\s+по-английски", "en"),
            (r"^давай(те)?\s+по-немецки", "de"),
            (r"^на\s+английском\s+пожалуйста", "en"),
            (r"^на\s+немецком\s+пожалуйста", "de"),
            (r"^на\s+турецком\s+пожалуйста", "tr"),
            (r"^на\s+русском\s+пожалуйста", "ru"),
        ]
        for pat, lang in _ru_switch:
            if re.match(pat, t):
                return RuleEngine._language_switch_result(lang)

        # German: longer / polite switch phrases
        _de_switch = [
            (r"^sprich\s+(bitte\s+)?englisch", "en"),
            (r"^sprechen\s+sie\s+(bitte\s+)?englisch", "en"),
            (r"^kannst\s+du\s+englisch", "en"),
            (r"^können\s+sie\s+englisch", "en"),
            (r"^sprich\s+(bitte\s+)?türkisch", "tr"),
            (r"^sprich\s+(bitte\s+)?turkisch", "tr"),
            (r"^sprich\s+(bitte\s+)?russisch", "ru"),
            (r"^sprich\s+(bitte\s+)?deutsch", "de"),
            (r"^wechsel\s+zu\s+türkisch", "tr"),
            (r"^wechsel\s+zu\s+turkisch", "tr"),
            (r"^wechsel\s+zu\s+russisch", "ru"),
            (r"^wechsel\s+zu\s+englisch", "en"),
            (r"^wechsel\s+zu\s+deutsch", "de"),
        ]
        for pat, lang in _de_switch:
            if re.match(pat, t):
                return RuleEngine._language_switch_result(lang)

        return None

    @staticmethod
    def _is_chitchat_query(text: str) -> bool:
        return RuleEngine._chitchat_sub_intent(text) is not None

    @staticmethod
    def _normalize_social_text(text: str) -> str:
        t = (text or "").lower().strip()
        t = re.sub(r"[^a-zA-ZçğıöşüÇĞİÖŞÜäöüßÄÖÜẞа-яА-ЯёЁ\\s'’‘]", " ", t)
        t = re.sub(r"\\s+", " ", t).strip()
        return t

    @staticmethod
    def _chitchat_sub_intent(text: str) -> str | None:
        t = RuleEngine._normalize_social_text(text)
        if not t:
            return None

        social_patterns: dict[str, set[str]] = {
            "identity_question": {
                "sen kimsin", "kimsin", "nesin",
                "who are you", "what are you",
                "wer bist du",
                "кто ты",
            },
            "how_are_you": {
                "nasılsın", "nasilsin", "iyi misin", "naber", "nasıl gidiyor", "nasil gidiyor", "ne haber",
                "how are you", "how are u", "how is it going", "how's it going", "whats up", "what's up",
                "hi how are you", "hello how are you",
                "wie geht's", "wie geht’s", "wie gehts", "wie geht es dir", "wie läuft's", "wie laeufts", "wie läuft es",
                "hallo wie gehts", "hallo wie geht es",
                "как дела", "как идет", "как идёт", "привет как дела", "привет как ты",
            },
            "thanks": {
                "teşekkürler", "teşekkür ederim", "çok teşekkürler",
                "tesekkurler", "tesekkur ederim", "cok tesekkurler",
                "sağ ol", "sag ol", "sağ olun", "sag olun",
                "thanks", "thank you", "thanks a lot", "appreciate it",
                "danke", "danke schön", "dankeschön", "vielen dank",
                "спасибо", "большое спасибо", "благодарю",
            },
            "farewell": {
                "görüşürüz", "gorusuruz", "hoşça kal", "hosca kal", "iyi günler", "iyi gunler",
                "bye", "goodbye", "see you",
                "tschüss", "tschuss", "auf wiedersehen",
                "пока", "до свидания",
            },
            "apology_from_user": {
                "kusura bakmayın", "kusura bakmayin", "pardon", "özür dilerim", "ozur dilerim",
                "sorry", "my apologies",
                "entschuldigung", "tut mir leid",
                "извините", "прошу прощения",
            },
            "compliment": {
                "harikasın", "harikasin", "çok iyisin", "cok iyisin",
                "you are great", "awesome", "very helpful",
                "du bist toll", "sehr hilfreich",
                "ты молодец", "очень полезно",
            },
            "greeting": {
                "merhaba", "selam", "günaydın", "gunaydin", "iyi akşamlar", "iyi aksamlar",
                "hi", "hello", "good morning", "good evening",
                "hallo", "guten morgen", "guten abend",
                "привет", "здравствуйте", "доброе утро", "добрый вечер",
            },
        }
        for intent_name, patterns in social_patterns.items():
            if t in patterns:
                return intent_name
        return None

    @staticmethod
    def _is_current_time_query(text: str) -> bool:
        t = (text or "").lower()
        # Turkish: "saat kaç" / "saat kac" (exclude "saatleri" opening hours, and check-in/out)
        if any(x in t for x in ["saat kaç", "saat kac"]) and not any(x in t for x in ["giriş", "giris", "çıkış", "cikis"]):
            return True
        if any(x in t for x in ["what time is it", "what time now"]) or "what time" in t and ("now" in t or "is it" in t):
            return True
        if "wie spät" in t or "wie spaet" in t:
            return True
        if "который час" in t or "сколько времени" in t:
            return True
        return False

    def extract_entity(self, text: str) -> str | None:
        """
        Extract an entity identifier from text using the shared keyword map.
        This does not change routing intent; it is used by services like
        ResponseComposer to build deterministic, localized outputs.
        """
        return self._extract_entity(text)

    def _extract_entity(self, text: str) -> str | None:
        for entity, variants in DEVICE_HINTS.items():
            for v in variants:
                if _fuzzy_has(text, v):
                    return entity
        return None

    @staticmethod
    def _hotel_info_entity(text: str) -> str | None:
        t = text.lower()
        if any(k in t for k in ["restoran saatleri", "restaurant hours", "restaurantzeiten", "часы ресторанов"]):
            return "fixed_restaurant_info"
        if any(k in t for k in ["havuz ve plaj", "pool & beach", "pool and beach", "pool & strand", "pool strand", "бассейн и пляж"]):
            return "fixed_pool_beach_info"
        if any(k in t for k in ["spa ve wellness", "spa & wellness", "spa und wellness", "spa and wellness", "spa wellness", "спа и wellness", "спа и велнес"]):
            return "fixed_spa_info"
        if any(
            k in t
            for k in [
                "animasyon ve etkinlikler",
                "animation & events",
                "animation and events",
                "animation & veranstaltungen",
                "animation veranstaltungen",
                "анимация и мероприятия",
                # boredom -> suggest animations & events
                "canım sıkıldı",
                "canim sikildi",
                "sıkıldım",
                "bored",
                "i am bored",
                "langweilig",
                "mir ist langweilig",
                "мне скучно",
                "скучно",
            ]
        ):
            return "fixed_animation_info"
        return None

    @staticmethod
    def _is_service_info_query(text: str) -> bool:
        t = text.lower()
        info_terms = [
            "temizlik hizmeti",
            "temizlik ücretli",
            "temizlik ucretli",
            "kuru temizleme",
            "ütü hizmeti",
            "utu hizmeti",
            "çamaşırhane",
            "camasirhane",
            "laundry",
            "dry cleaning",
            "ironing service",
            "reinigung",
            "wäscherei",
            "waescherei",
            "bügeln",
            "buegeln",
            "уборка",
            "прачечная",
            "химчистка",
            "глажка",
        ]
        return any(k in t for k in info_terms)

    @staticmethod
    def _is_checkin_checkout_time_query(text: str) -> bool:
        """
        Detect questions like:
        - "giriş saat kaçta", "çıkış saat kaçta"
        - English/German/Russian equivalents where time is requested.
        """
        t = (text or "").lower()

        # Turkish: "giriş/çıkış" + ("saat" or "kaçta") + "kaç"
        if any(x in t for x in ["giriş", "giris", "check-in", "check in", "checkin", "заезд"]) and (
            any(x in t for x in ["saat", "time", "время", "hours"]) or any(x in t for x in ["kaçta", "kac ta", "kac"])  # quick formats
        ):
            if any(x in t for x in ["kaç", "kac", "what", "hangi", "how", "когда", "в какое время"]):
                return True

        if any(x in t for x in ["çıkış", "cikis", "check-out", "check out", "checkout", "abreise", "выезд"]) and (
            any(x in t for x in ["saat", "time", "время", "hours"]) or any(x in t for x in ["kaçta", "kac ta", "kac"])
        ):
            if any(x in t for x in ["kaç", "kac", "what", "hangi", "how", "когда", "в какое время"]):
                return True

        # English quick patterns
        if any(x in t for x in ["what time", "check-in time", "check out time", "check-in", "check-in hours", "check-out", "checkout"]) and any(
            x in t for x in ["time", "hour", "hours"]
        ):
            return True

        return False

    @staticmethod
    def _fault_sub_intent(entity: str | None) -> str:
        if entity in ("television", "phone"):
            return "room_equipment_fault"
        if entity == "shower":
            return "bathroom_fault"
        if entity == "keycard":
            return "keycard_fault"
        if entity == "hvac":
            return "hvac_fault"
        if entity == "lighting":
            return "lighting_fault"
        return "room_equipment_fault"

    @staticmethod
    def _complaint_sub_intent(text: str, entity: str | None) -> str:
        if "gürültü" in text or "gurultu" in text or "noise" in text:
            return "noise_complaint"
        if "temizlik" in text or "clean" in text:
            return "cleanliness_complaint"
        if "personel" in text or "staff" in text:
            return "staff_complaint"
        if "oda" in text or "room" in text:
            return "room_condition_complaint"
        return "service_complaint"

    @staticmethod
    def _request_sub_intent(entity: str | None) -> str:
        if entity in ("towel", "blanket", "pillow", "water"):
            return "extra_item_request"
        return "room_supply_request"

    @staticmethod
    def _reservation_sub_intent(text: str, entity: str | None) -> str:
        if entity == "late_checkout" or "geç çıkış" in text or "gec cikis" in text or "late checkout" in text:
            return "late_checkout_request"
        if entity == "early_checkin" or "erken giriş" in text or "erken giris" in text or "early checkin" in text:
            return "early_checkin_request"
        if entity == "room_change" or "oda değiş" in text or "room change" in text:
            return "room_change_request"
        if entity == "reservation_issue" or "görünmüyor" in text or "not found" in text:
            return "reservation_issue"
        if "uzat" in text or "extend" in text or "iki gece daha" in text:
            return "extension_request"
        return "new_reservation"

    @staticmethod
    def _special_sub_intent(entity: str | None) -> str:
        if entity in ("vegan", "vegetarian"):
            return "dietary_preference"
        if entity in ("celiac", "gluten_related_restriction", "lactose_related_restriction"):
            return "dietary_medical_restriction"
        if entity == "allergy":
            return "allergy"
        if entity == "baby_need":
            return "baby_need"
        if entity == "accessibility_need":
            return "accessibility_need"
        return "other_special_need"

