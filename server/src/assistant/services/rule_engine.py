from pathlib import Path
from typing import Optional
import yaml
import re

from assistant.core.logger import get_logger
from assistant.schemas.intent import IntentResult

logger = get_logger("assistant.rule_engine")

FAULT_WORDS = [
    # TR
    "bozuldu",
    "bozuk",
    "çalışmıyor",
    "calismiyor",
    "soğutmuyor",
    "sogutmuyor",
    "arızalı",
    "arizali",
    "kırıldı",
    "kirildi",
    "açılmıyor",
    "acilmiyor",
    "kapanmıyor",
    "kapanmiyor",
    "yanmıyor",
    "yanmiyor",
    "çekmiyor",
    "cekmiyor",
    "arıza var",
    "ariza var",
    "arızalandı",
    "arizalandi",
    "tıkandı",
    "tikandi",
    "tıkanıyor",
    "tikanıyor",
    "tikanıyor",
    "yandı",
    "yandi",
    "patladı",
    "patladi",
    # EN
    "broken",
    "not working",
    "doesn't work",
    "doesnt work",
    "doesn't open",
    "doesnt open",
    "out of order",
    "stuck",
    "clogged",
    "blocked",
    "burned out",
    "burnt out",
    "burned",
    "burnt",
    # DE
    "kaputt",
    "defekt",
    "funktioniert nicht",
    "geht nicht",
    "blockiert",
    "verstopft",
    "durchgebrannt",
    # RU
    "не работает",
    "сломался",
    "сломалась",
    "сломано",
    "не открывается",
    "не закрывается",
    "не включается",
    "неисправен",
    "неисправна",
    "сломалось",
    "застрял",
    "засорился",
    "сгорел",
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
ROUTING_HOUSEKEEPING_WORDS = [
    "oda temizliği", "oda temizligi", "oda düzenle", "oda duzenle",
    "housekeeping", "room cleaning", "clean my room",
    "zimmerreinigung", "reinigung bitte",
    "уборка номера", "уберите номер",
]
ROUTING_RECEPTION_WORDS = [
    "resepsiyon", "resepsiyonla görüş", "resepsiyonla gorus",
    "reception", "front desk",
    "rezeption",
    "ресепшн", "стойка регистрации",
]
ROUTING_GUEST_RELATIONS_WORDS = [
    "misafir ilişkileri", "misafir iliskileri",
    "guest relations",
    "gästebetreuung", "gaestebetreuung",
    "служба по работе с гостями",
]
ROUTING_TRANSFER_WORDS = [
    "transfer istiyorum", "transfer",
    "i need transfer", "airport transfer",
    "transfer bitte",
    "нужен трансфер", "трансфер",
]
ROUTING_LUNCHBOX_WORDS = [
    "lunch box", "lunchbox", "öğle paketi", "ogle paketi", "paket kahvaltı", "paket kahvalti",
]
ROUTING_GENERIC_COMPLAINT_WORDS = [
    "bir sorunum var", "sorunum var",
    "i have a problem", "problem with service",
    "ich habe ein problem",
    "у меня проблема",
]
RESERVATION_WORDS = [
    "erken giriş",
    "erken giris",
    "rezervasyon",
    "rezrvasyon",
    "reservation",
    "oda değiş",
    "oda degis",
    "room change",
    "early checkin",
    "extension",
    "reservierung",
    "früher check-in",
    "ранний заезд",
    "бронирование",
]
def _matches_late_checkout_guest_notif(normalized_text: str) -> bool:
    """Yalnızca tam ifadeler; 'çıkış saati' gibi hotel_info sorgularını yanlış yakalamaz."""
    tl = normalized_text or ""
    needles = (
        "geç çıkış",
        "gec cikis",
        "late checkout",
        "später check-out",
        "spater check-out",
        "поздний выезд",
        "delayed checkout",
        "checkout uzat",
    )
    return any(n in tl for n in needles)
# Eski SPECIAL_WORDS parçalandı: kutlama / sağlık / beslenme → chat’te misafir bildirimi formu.
CELEBRATION_NOTIF_WORDS = [
    "kutlama",
    "kkutlama",
    "kutlaması",
    "kutlamak",
    "doğum günü",
    "dogum gunu",
    "dogumgunu",
    "birthday",
    "geburtstag",
    "день рождения",
    "balayı",
    "balayi",
    "honeymoon",
    "flitterwochen",
    "медовый месяц",
    "yıldönümü",
    "yildonumu",
    "anniversary",
    "jahrestag",
    "годовщина",
    "sürpriz",
    "surpriz",
    "surprise",
    "überraschung",
    "сюрприз",
    "nişan",
    "nisn",
    "düğün",
    "dugun",
    "wedding",
    "hochzeit",
    "oda süsleme",
    "oda susleme",
    "room decoration",
    "zimmerdekoration",
    "evlenme teklifi",
    "özel gün",
    "ozel gun",
    "ozelgun",
    "özel günler",
    "ozel gunler",
    "organizasyon",
    "organizasyonu",
]
HEALTH_NOTIF_WORDS = [
    "hamile",
    "hamileyim",
    "hamilelik",
    "pregnancy",
    "pregnant",
    "schwanger",
    "беременн",
    "kronik",
    "chronic",
    "chronisch",
    "хроническ",
    "ilaç",
    "ilac",
    "ilacım",
    "medication",
    "medikament",
    "лекарств",
    "diyabet",
    "diabetes",
    "insulin",
    "insülin",
    "şeker hastalığı",
    "seker hastaligi",
    "kalp rahatsızlığı",
    "kalp rahatsizligi",
    "heart condition",
    "erişilebilirlik",
    "erisilebilirlik",
    "accessibility",
    "barrierefrei",
    "barrierefreie",
    "wheelchair",
    "rollstuhl",
    "tekerlekli sandalye",
    "доступность",
    "доступ",
    "коляска",
    "engelli",
    "disabled access",
]
MISAFIR_BILDIRIM_STRICT = [
    "misafir bildirimi",
    "misafir bildirim",
    "guest notification",
    "gästemitteilung",
    "bildirim formu",
    "otel bilgilendirme",
    "bilgilendirmek istiyorum",
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
    "guluten",
    "glutten",
    "glutenfree",
    "gluten free",
    "glutenfrei",
    "без глютена",
    "kein gluten",
    "gluten yiyemem",
    "gluten can not",
    # TR: users often write only the label/keyword
    "alerjen",
    "hassasiyet",
    "hassasiyeti",
    "gluten hassasiyeti",
    "laktoz",
    "midem hassas",
    "hassas mide",
    "mide hassas",
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
]

# Chat istek formu (web ile aynı kategori id’leri). Önce daha özgül ifadeler.
REQUEST_ITEM_CATEGORY_PHRASES: list[tuple[str, list[str]]] = [
    (
        "room_cleaning",
        [
            "oda temizliği",
            "oda temizligi",
            "oda düzenle",
            "oda duzenle",
            "housekeeping",
            "room cleaning",
            "clean my room",
            "zimmerreinigung",
            "уборка номера",
            "genel temizlik",
        ],
    ),
    (
        "baby_equipment",
        [
            "bebek ekipmanı",
            "bebek ekipmani",
            "bebek yatağı",
            "bebek yatagi",
            "mama sandalyesi",
            "baby equipment",
            "baby bed",
            "high chair",
            "beşik",
            "besik",
        ],
    ),
    ("minibar", ["minibar", "mini bar", "mini-bar"]),
    (
        "bedding",
        [
            "yastık",
            "yastik",
            "nevresim",
            "yatak takımı",
            "yatak takimi",
            "battaniye",
            "pillow",
            "duvet cover",
            "duvet",
            "bedding",
            "blanket",
            "kissen",
            "bettwäsche",
            "bettwasche",
            "decke",
            "подушка",
            "одеяло",
        ],
    ),
    (
        "towel",
        [
            "havlu",
            "havlum",
            "towel",
            "handtuch",
            "полотенце",
            "ek havlu",
            "extra towel",
        ],
    ),
    (
        "room_equipment",
        [
            "oda ekipmanı",
            "oda ekipmani",
            "room equipment",
            "ütü",
            "utu",
            "iron",
            "ironing",
            "kettle",
            "askı",
            "aski",
            "hanger",
            "bornoz",
            "bathrobe",
            "terlik",
            "slippers",
        ],
    ),
]


def extract_request_category_from_text(normalized_text: str) -> str | None:
    for cat_id, phrases in REQUEST_ITEM_CATEGORY_PHRASES:
        if any(_fuzzy_has(normalized_text, p) for p in phrases):
            return cat_id
    return None


def _text_suggests_celebration_notif(text: str) -> bool:
    """Kutlama grubu: fuzzy liste + 'kutlam' kökü (LLM yanlışlıkla diyet seçmesin)."""
    if any(_fuzzy_has(text, w) for w in CELEBRATION_NOTIF_WORDS):
        return True
    t = (text or "").lower()
    if "kutlam" in t:
        return True
    return False


def _has_strong_service_request_intent(text: str) -> bool:
    """Açık talep dili → sohbet istek formu; yalnızca eşya anahtar kelimesi → bilgi (RAG)."""
    t = (text or "").lower()
    markers = (
        "talep",
        "istiyorum",
        "isterim",
        "gönder",
        "gonder",
        "gönderin",
        "gonderin",
        "getirin",
        "gelsin",
        "yolla",
        "sipariş",
        "siparis",
        "lütfen",
        "lutfen",
        "rica ederim",
        "rica ",
        "formu",
        "doldur",
        "ekstra",
        "extra ",
        "another ",
        "bring ",
        "please send",
        "can you bring",
        "can i get",
        "order ",
        "мне нужно",
        "нужен ",
        "bitte bring",
        "bitte schick",
        "bestellen",
    )
    return any(m in t for m in markers)


RECOMMENDATION_WORDS = [
    "öner", "oner", "öneri", "oneri",
    "ne yesem", "karar veremedim",
    "romantik", "romantic",
    "çok açım", "cok acim", "hızlı bir şey", "hizli bir sey",
    "deniz ürünü sevmiyor", "deniz urunu sevmiyor", "seafood sevmiyor", "doesn't like seafood",
    "balık", "balik", "fish",
    "et", "meat", "bbq", "barbeku", "barbecue",
    "pizza", "snack", "atıştırmalık", "atistirmalik",
    "kahve", "coffee", "tatlı", "tatli", "dessert",
    "çikolata", "cikolata", "chocolate",
    "çocuk", "cocuk", "çocuğum", "cocugum", "kids", "mini club", "mini disco", "5 yaş", "5 yas", "aktivite", "activity",
]
URGENT_CONTACT_WORDS = [
    "acil", "hemen", "urgent", "right now", "asap",
    "şimdi biriyle konuşmam lazım", "simdi biriyle konusmam lazim",
]
OUTSIDE_HOTEL_WORDS = [
    "otel dışında", "otel disinda", "outside hotel", "outside the hotel", "dışarıda", "disarida",
]


def _matches_alanya_discover_intent(normalized_text: str) -> bool:
    """Alanya'da gezi / turistik yer soruları → sabit metin + uygulama modülü."""
    tl = (normalized_text or "").lower()
    has_alanya = "alanya" in tl or "аланья" in tl
    has_en_de_ru_place = any(
        x in tl
        for x in (
            "visit alanya",
            "in alanya",
            "around alanya",
            "alanya sightseeing",
            "things to do in alanya",
            "what to see in alanya",
            "places in alanya",
            "alanya sehen",
            "sehenswürdigkeiten alanya",
            "was kann man in alanya",
            "alanya entdecken",
            "аланья что посмотреть",
            "куда сходить в аланье",
            "в аланье",
            "достопримечательности аланьи",
        )
    )
    tour_markers = (
        "gez",
        "gezeyim",
        "gezilecek",
        "gezelim",
        "gideyim",
        "gidelim",
        "görüle",
        "gorule",
        "görül",
        "gorul",
        "turist",
        "meşhur",
        "meshur",
        "keşfet",
        "kesfet",
        "nereler",
        "nereye",
        "nereyi",
        "ne var",
        "neler",
        "sightseeing",
        "attraction",
        "worth seeing",
        "famous",
        "popular",
        "discover",
        "visit ",
        "places to",
        "things to",
        "sehensw",
        "besicht",
        "unternehm",
        "что посмотреть",
        "куда сходить",
        "достопримечатель",
        "погулять",
        "экскурс",
    )
    has_tour = any(m in tl for m in tour_markers)
    if has_alanya and has_tour:
        return True
    if has_en_de_ru_place and (has_tour or "see" in tl or "places" in tl or "things" in tl):
        return True
    return False
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
    "akşam aktivitesi",
    "aksam aktivitesi",
    "yetişkin aktivitesi",
    "yetiskin aktivitesi",
    "eğlenmek istiyoruz",
    "eglenmek istiyoruz",
    "yetişkin etkinliği",
    "yetiskin etkinligi",
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
    "internet": ["internet", "wifi", "wi-fi", "kablosuz", "wlan", "интернет", "вайфай"],
    "kettle": ["kettle", "su ısıtıcısı", "su isiticisi", "wasserkocher", "чайник"],
    "minibar": ["minibar", "mini bar"],
    "cabinet": ["dolap", "wardrobe", "schrank", "шкаф"],
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
    text_l = (text or "").lower()
    word_l = (word or "").lower().strip()
    if not word_l:
        return False
    # For very short single-token keys ("su", "et"), require whole-token match
    # to prevent false positives from substring collisions.
    if " " not in word_l and len(word_l) <= 3:
        return word_l in _norm_tokens(text_l)
    if word_l in text_l:
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


def _has_any_phrase(text: str, phrases: list[str]) -> bool:
    return any(_fuzzy_has(text, p) for p in phrases)


def _has_any_phrase_strict(text: str, phrases: list[str]) -> bool:
    lowered = (text or "").lower()
    return any(str(p).lower() in lowered for p in phrases)


class RuleEngine:
    def __init__(self, rules_path: Path):
        with open(rules_path, "r", encoding="utf-8") as f:
            self.rules = yaml.safe_load(f) or {}

    @staticmethod
    def matches_late_checkout_guest_notif(normalized_text: str) -> bool:
        """Policy / çoklu cümle yollarında kural ile aynı geç çıkış tespiti."""
        return _matches_late_checkout_guest_notif(normalized_text)

    def extract_request_category(self, text: str) -> str | None:
        """text: `normalize_text` çıktısı veya en azından küçük harf / tutarlı boşluk."""
        return extract_request_category_from_text(text)

    @staticmethod
    def is_strong_service_item_request(normalized_text: str) -> bool:
        return _has_strong_service_request_intent(normalized_text)

    def infer_guest_notification_group(self, normalized_text: str) -> str | None:
        """Sınıflandırıcı misafir bildirimi dediğinde metinden grup çıkarır (tam liste önce diyet göstermesin)."""
        if _matches_late_checkout_guest_notif(normalized_text):
            return "reception"
        if _text_suggests_celebration_notif(normalized_text):
            return "celebration"
        if any(_fuzzy_has(normalized_text, w) for w in HEALTH_NOTIF_WORDS):
            return "health"
        if any(_fuzzy_has(normalized_text, w) for w in SPECIAL_WORDS):
            return "diet"
        return None

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

        # Geç çıkış → Talepler / Misafir bildirimleri (resepsiyon); rezervasyon formu değil.
        if _matches_late_checkout_guest_notif(normalized_text):
            logger.info("RULE MATCH: guest_notification (reception / late checkout)")
            return IntentResult(
                intent="guest_notification",
                sub_intent="notif_group_reception",
                entity=None,
                department="reception",
                needs_rag=False,
                response_mode="guided",
                confidence=1.0,
                source="rule",
            )

        # Misafir bildirimi (web modülüyle aynı kategori grupları): önce kutlama, sonra sağlık, sonra beslenme/alerji.
        if _text_suggests_celebration_notif(normalized_text):
            logger.info("RULE MATCH: guest_notification (celebration group)")
            return IntentResult(
                intent="guest_notification",
                sub_intent="notif_group_celebration",
                entity=None,
                department="guest_relations",
                needs_rag=False,
                response_mode="guided",
                confidence=1.0,
                source="rule",
            )
        if any(_fuzzy_has(normalized_text, w) for w in HEALTH_NOTIF_WORDS):
            logger.info("RULE MATCH: guest_notification (health group)")
            return IntentResult(
                intent="guest_notification",
                sub_intent="notif_group_health",
                entity=None,
                department="guest_relations",
                needs_rag=False,
                response_mode="guided",
                confidence=1.0,
                source="rule",
            )
        if any(_fuzzy_has(normalized_text, w) for w in SPECIAL_WORDS):
            logger.info("RULE MATCH: guest_notification (diet / allergy group)")
            return IntentResult(
                intent="guest_notification",
                sub_intent="notif_group_diet",
                entity=self._extract_entity(normalized_text),
                department="guest_relations",
                needs_rag=False,
                response_mode="guided",
                confidence=1.0,
                source="rule",
            )
        if _has_any_phrase_strict(normalized_text, MISAFIR_BILDIRIM_STRICT):
            logger.info("RULE MATCH: guest_notification (all categories)")
            return IntentResult(
                intent="guest_notification",
                sub_intent="notif_group_all",
                entity=None,
                department="guest_relations",
                needs_rag=False,
                response_mode="guided",
                confidence=1.0,
                source="rule",
            )

        if any(_fuzzy_has(normalized_text, w) for w in URGENT_CONTACT_WORDS):
            logger.info("RULE MATCH: request (urgent_reception_contact)")
            return IntentResult(
                intent="request",
                sub_intent="reception_contact_request",
                entity="reception_contact",
                department="reception",
                needs_rag=False,
                response_mode="guided",
                confidence=1.0,
                source="rule",
            )

        if self._is_night_food_query(normalized_text):
            logger.info("RULE MATCH: hotel_info (night_food)")
            return IntentResult(
                intent="hotel_info",
                sub_intent="service_information",
                entity="fixed_restaurant_info",
                department=None,
                needs_rag=False,
                response_mode="answer",
                confidence=0.98,
                source="rule",
            )

        if self._is_relaxation_query(normalized_text):
            logger.info("RULE MATCH: hotel_info (relaxation_suggestion)")
            return IntentResult(
                intent="hotel_info",
                sub_intent="service_information",
                entity="fixed_spa_info",
                department=None,
                needs_rag=False,
                response_mode="answer",
                confidence=0.95,
                source="rule",
            )

        if self._is_early_departure_query(normalized_text):
            logger.info("RULE MATCH: request (early_departure_lunchbox)")
            return IntentResult(
                intent="request",
                sub_intent="lunch_box_request",
                entity="lunch_box_request",
                department="reception",
                needs_rag=False,
                response_mode="guided",
                confidence=0.98,
                source="rule",
            )

        if _matches_alanya_discover_intent(normalized_text):
            logger.info("RULE MATCH: hotel_info (alanya_discover)")
            return IntentResult(
                intent="hotel_info",
                sub_intent="service_information",
                entity="fixed_alanya_discover_intro",
                department=None,
                needs_rag=False,
                response_mode="answer",
                confidence=0.94,
                source="rule",
            )

        if _has_any_phrase_strict(normalized_text, OUTSIDE_HOTEL_WORDS):
            logger.info("RULE MATCH: hotel_info (outside_hotel)")
            return IntentResult(
                intent="hotel_info",
                sub_intent="service_information",
                entity="fixed_outside_hotel_info",
                department=None,
                needs_rag=False,
                response_mode="answer",
                confidence=0.9,
                source="rule",
            )

        # Ice cream / frozen treat availability: fixed answer before recommendation/LLM drift.
        if self._is_ice_cream_hotel_info_query(normalized_text):
            logger.info("RULE MATCH: hotel_info (ice_cream)")
            return IntentResult(
                intent="hotel_info",
                sub_intent="service_information",
                entity="fixed_ice_cream_info",
                department=None,
                needs_rag=False,
                response_mode="answer",
                confidence=0.97,
                source="rule",
            )

        # Recommendation block (separate from routing and knowledge flows).
        rec_entity = self._recommendation_entity(normalized_text)
        if rec_entity and any(_fuzzy_has(normalized_text, w) for w in RECOMMENDATION_WORDS):
            logger.info("RULE MATCH: recommendation (%s)", rec_entity)
            return IntentResult(
                intent="recommendation",
                sub_intent="activity_recommendation" if rec_entity == "kids_activity_pref" else "venue_recommendation",
                entity=rec_entity,
                department=None,
                needs_rag=False,
                response_mode="guided",
                confidence=0.95,
                source="rule",
            )

        # Routing block: keep operations/routing separate from recommendation/knowledge.
        if _has_any_phrase_strict(normalized_text, ROUTING_HOUSEKEEPING_WORDS):
            logger.info("RULE MATCH: request (housekeeping_request)")
            return IntentResult(
                intent="request",
                sub_intent="housekeeping_request",
                entity="housekeeping_service",
                department="reception",
                needs_rag=False,
                response_mode="guided",
                confidence=1.0,
                source="rule",
            )
        if _has_any_phrase_strict(normalized_text, ROUTING_RECEPTION_WORDS):
            logger.info("RULE MATCH: request (reception_contact)")
            return IntentResult(
                intent="request",
                sub_intent="reception_contact_request",
                entity="reception_contact",
                department="reception",
                needs_rag=False,
                response_mode="guided",
                confidence=1.0,
                source="rule",
            )
        if _has_any_phrase_strict(normalized_text, ROUTING_GUEST_RELATIONS_WORDS):
            logger.info("RULE MATCH: request (guest_relations_contact)")
            return IntentResult(
                intent="request",
                sub_intent="guest_relations_contact_request",
                entity="guest_relations_contact",
                department="guest_relations",
                needs_rag=False,
                response_mode="guided",
                confidence=1.0,
                source="rule",
            )
        if _has_any_phrase_strict(normalized_text, ROUTING_TRANSFER_WORDS):
            logger.info("RULE MATCH: request (transfer_request)")
            return IntentResult(
                intent="request",
                sub_intent="transfer_request",
                entity="transfer_request",
                department="reception",
                needs_rag=False,
                response_mode="guided",
                confidence=1.0,
                source="rule",
            )
        if _has_any_phrase_strict(normalized_text, ROUTING_LUNCHBOX_WORDS):
            logger.info("RULE MATCH: request (lunch_box_request)")
            return IntentResult(
                intent="request",
                sub_intent="lunch_box_request",
                entity="lunch_box_request",
                department="reception",
                needs_rag=False,
                response_mode="guided",
                confidence=1.0,
                source="rule",
            )
        if _has_any_phrase_strict(normalized_text, ROUTING_GENERIC_COMPLAINT_WORDS):
            logger.info("RULE MATCH: complaint (generic_problem)")
            return IntentResult(
                intent="complaint",
                sub_intent="service_complaint",
                entity=None,
                department="guest_relations",
                needs_rag=False,
                response_mode="guided",
                confidence=0.95,
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

        # Yalnız "çıkış" / "giriş" → bilgi (RAG); LLM rezervasyon veya yanlış modüle düşmesin.
        if self._is_bare_checkin_or_checkout_keyword(normalized_text):
            logger.info("RULE MATCH: hotel_info (bare_checkin_checkout_keyword)")
            return IntentResult(
                intent="hotel_info",
                sub_intent="opening_hours",
                entity=None,
                department=None,
                needs_rag=True,
                response_mode="answer",
                confidence=0.96,
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
                department="guest_relations",
                needs_rag=False,
                response_mode="guided",
                confidence=1.0,
                source="rule",
            )

        rq_cat = extract_request_category_from_text(normalized_text)
        if rq_cat is not None and not _has_strong_service_request_intent(normalized_text):
            logger.info("RULE MATCH: hotel_info (soft_service_item) inferred_category=%s", rq_cat)
            return IntentResult(
                intent="hotel_info",
                sub_intent="service_information",
                entity=None,
                department=None,
                needs_rag=True,
                response_mode="answer",
                confidence=0.92,
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
            "please speaking english": "en",
            "please speakig english": "en",
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
                "teşekkür", "tesekkur", "tesekkurler", "tesekkur ederim", "cok tesekkurler",
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
                "akşam aktivitesi",
                "aksam aktivitesi",
                "yetişkin aktivitesi",
                "yetiskin aktivitesi",
                "eğlenmek istiyoruz",
                "eglenmek istiyoruz",
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
    def _is_ice_cream_hotel_info_query(text: str) -> bool:
        t = (text or "").lower()
        if any(
            p in t
            for p in (
                "dondurma",
                "ice cream",
                "ice-cream",
                "icecream",
                "gelato",
                "мороженое",
                "мороженого",
                "eiscreme",
                "eis am stiel",
            )
        ):
            return True
        return "eis" in _norm_tokens(t)

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
    def _recommendation_entity(text: str) -> str | None:
        t = (text or "").lower()
        if any(
            k in t
            for k in [
                "canım tatlı",
                "canim tatli",
                "tatlı çekti",
                "tatli cekti",
                "canım çikolata",
                "canim cikolata",
                "çikolata çekti",
                "cikolata cekti",
                "craving something sweet",
                "something sweet",
            ]
        ):
            return "coffee_dessert_pref"
        if any(k in t for k in ["romantik", "romantic"]):
            return "romantic_dinner_pref"
        if any(k in t for k in ["ne yesem", "karar veremedim", "what should i eat"]):
            return "general_dining_pref"
        if any(k in t for k in ["çok açım", "cok acim", "hızlı bir şey", "hizli bir sey", "quick bite", "quick food"]):
            return "pizza_snack_pref"
        if any(k in t for k in ["deniz ürünü sevmiyor", "deniz urunu sevmiyor", "seafood sevmiyor", "doesn't like seafood"]):
            return "meat_bbq_pref"
        if any(k in t for k in ["balık", "balik", "fish"]):
            return "fish_pref"
        if any(k in t for k in ["bbq", "barbeku", "barbecue", "et severim", "meat"]) or re.search(r"(?<![a-zçğıöşü])et(?![a-zçğıöşü])", t):
            return "meat_bbq_pref"
        if any(k in t for k in ["pizza", "snack", "atıştırmalık", "atistirmalik"]):
            return "pizza_snack_pref"
        if any(k in t for k in ["kahve", "coffee", "tatlı", "tatli", "dessert"]):
            return "coffee_dessert_pref"
        if any(k in t for k in ["çocuk", "cocuk", "çocuğum", "cocugum", "kids", "mini club", "mini disco", "5 yaş", "5 yas"]):
            return "kids_activity_pref"
        return None

    @staticmethod
    def _is_night_food_query(text: str) -> bool:
        t = (text or "").lower()
        has_night = any(k in t for k in ["gece 12", "gece 12'de", "12 de", "12'de", "midnight"])
        has_food = any(k in t for k in ["yemek", "büfe", "bufe", "food", "eat"])
        return has_night and has_food

    @staticmethod
    def _is_early_departure_query(text: str) -> bool:
        t = (text or "").lower()
        return any(k in t for k in ["yarın sabah erken çık", "yarin sabah erken cik", "early departure", "leave early"])

    @staticmethod
    def _is_relaxation_query(text: str) -> bool:
        t = (text or "").lower()
        return any(k in t for k in ["çok yorgun", "cok yorgun", "yorgunum", "relax", "dinlenmek istiyorum", "rahatlamak istiyorum"])

    @staticmethod
    def _is_bare_checkin_or_checkout_keyword(text: str) -> bool:
        """Tek kelime / kısa ifade; 'geç çıkış' kuralı zaten üstte ayrı eşlenir."""
        raw = (text or "").strip().lower()
        raw = raw.strip(".,!? ")
        if not raw or len(raw) > 36:
            return False
        if "geç çıkış" in raw or "gec cikis" in raw:
            return False
        multiword_ok = frozenset({"check in", "check out", "check-in", "check-out"})
        if " " in raw and raw not in multiword_ok:
            return False
        singles = frozenset(
            {
                "çıkış",
                "cikis",
                "giriş",
                "giris",
                "checkout",
                "checkin",
                "abreise",
                "anreise",
                "выезд",
                "заезд",
            }
        ) | multiword_ok
        return raw in singles

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
        if entity in ("internet", "kettle", "minibar", "cabinet"):
            return "room_equipment_fault"
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
        if entity == "housekeeping_service":
            return "housekeeping_request"
        if entity == "reception_contact":
            return "reception_contact_request"
        if entity == "guest_relations_contact":
            return "guest_relations_contact_request"
        if entity == "transfer_request":
            return "transfer_request"
        if entity == "lunch_box_request":
            return "lunch_box_request"
        return "room_supply_request"

    @staticmethod
    def _reservation_sub_intent(text: str, entity: str | None) -> str:
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

