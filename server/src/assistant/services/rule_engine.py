from pathlib import Path
from typing import Optional
import yaml
import re

from assistant.core.logger import get_logger
from assistant.schemas.intent import IntentResult

logger = get_logger("assistant.rule_engine")

# RuleEngine.match() — üstten alta ilk eşleşen kazanır (özet):
#   dil değişimi → chitchat / iptal benzeri → özel ihtiyaç & misafir bildirimi → acil resepsiyon
#   → gece yemeği (sabit restoran metni) → spa rahatlama / spa fiyat modülü
#   → restaurants & bars modülü → oda servisi bilgisi (RAG) → erken çıkış öğle kutusu → Alanya → …
#   → arıza (FAULT_WORDS) → şikâyet → istek envanteri + güçlü talep → REQUEST_WORDS → rezervasyon → …
# routing_rules.yaml yalnızca örnek listeler içerir; genişletme için bu dosyadaki sabitler esas alınır.

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
    # TR — ek arıza / çalışmama kalıpları (genel «sorun var» şikâyet yolunu çalmamak için çok anlamlı ifadeler)
    "hasarlı",
    "hasarli",
    "kırık",
    "kirik",
    "hiç çalışmıyor",
    "hic calismiyor",
    "çalışmıyor gibi",
    "calismiyor gibi",
    "çalışmıyor sanırım",
    "calismiyor sanirim",
    "tepki vermiyor",
    "takıldı",
    "tikildi",
    "dondu",
    "kitlendi",
    "hata veriyor",
    "hata oluştu",
    "hata olustu",
    "error veriyor",
    "düzgün değil",
    "duzgun degil",
    "düzgün çalışmıyor",
    "duzgun calismiyor",
    "ses gelmiyor",
    "görüntü yok",
    "goruntu yok",
    "bağlantı yok",
    "baglanti yok",
    "bağlantı kesildi",
    "baglanti kesildi",
    "elektrik yok",
    "su akmıyor",
    "su akmiyor",
    "çalışmayı durdurdu",
    "calismayi durdurdu",
    "devre dışı",
    "devre disi",
    "arızaya geçti",
    "arizaya gecti",
    "fonksiyon çalışmıyor",
    "fonksiyon calismiyor",
    "aktif değil",
    "aktif degil",
    # EN / DE / RU — kısa teknik kalıplar
    "not responding",
    "no sound",
    "no picture",
    "no signal",
    "no power",
    "frozen",
    "kein ton",
    "kein bild",
    "kein signal",
    "не отвечает",
    "нет звука",
    "нет изображения",
    "technical problem",
    "technical issue",
]
# "temizlik kötü" burada olmamalı: _fuzzy_has çok kelimeli ifadede tek token (temizlik) ile
# "temizlik istiyorum" gibi talepleri yanlışlıkla şikayet sayıyor. Aşağıdaki strict liste kullanılır.
COMPLAINT_CLEANLINESS_STRICT_PHRASES = [
    "temizlik kötü",
    "temizlik kotu",
    "temizlik berbat",
    "temizlik rezalet",
    "temizlik çok kötü",
    "temizlik cok kotu",
    "oda kirli",
    "oda pis",
    "oda çok kirli",
    "oda cok kirli",
]
COMPLAINT_WORDS = [
    # TR
    "çok kötü", "cok kotu", "memnun değilim", "memnun degilim",
    "gürültü", "gurultu", "şikayet", "berbat",
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
    "towels",
    "handtuch",
    "handtücher",
    "handtucher",
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
    "temizlik istiyorum",
    "temizlik istiyoruz",
    "temizliğe ihtiyacım var",
    "temizlige ihtiyacim var",
    "temizliğe ihtiyacımız var",
    "temizlige ihtiyacimiz var",
    "temizlik talebi",
    "temizlik talep",
    "oda temizliği istiyorum",
    "oda temizligi istiyorum",
    "temizlik gelsin",
    "oda temizlensin",
    "temizleyin",
    "cleaning please",
    "need cleaning",
    "need room cleaning",
    "room cleaned",
    "уборку в номер",
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
    # Baby nutrition only (not crib/bed — those go to İstek / bebek ekipmanı kuralı)
    "baby food",
    "babynahrung",
    "детское питание",
    "bebek maması",
    "bebek mamasi",
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
            "odamı temizleyin",
            "odami temizleyin",
            "odamı toplayın",
            "odami toplayin",
            "oda toplama",
            "housekeeping",
            "room cleaning",
            "clean my room",
            "zimmerreinigung",
            "уборка номера",
            "genel temizlik",
            "temizlik hizmeti",
        ],
    ),
    (
        "baby_equipment",
        [
            "bebek ekipmanı",
            "bebek ekipmani",
            "bebek yatağı",
            "bebek yatagi",
            "bebek yatağına",
            "bebek yatagina",
            "bebek yatağa",
            "bebek yataga",
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
            "battiye",
            "batiye",
            "battainiye",
            "batniye",
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
            "banyo havlusu",
            "plaj havlusu",
            "havlu talebi",
            "towel",
            "towels",
            "handtuch",
            "handtücher",
            "handtucher",
            "полотенце",
            "ek havlu",
            "extra towel",
            "beach towel",
            "pool towel",
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
            "su ısıtıcı",
            "su isitici",
            "su ısıtıcısı",
            "su isiticisi",
            "çaydanlık",
            "caydanlik",
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


def _fuzzy_multiword_phrase_matches(text: str, phrase: str) -> bool:
    """
    Çok kelimeli istek ifadesinde yalnızca bir tokenın (ör. 'ekipmanı') eşleşmesiyle
    yanlış kategori (bebek ekipmanı vs oda ekipmanı) seçilmesini engeller.
    """
    text_l = (text or "").lower()
    parts = phrase.lower().split()
    if len(parts) < 2:
        return False
    tokens = _norm_tokens(text)
    for p in parts:
        lp = len(p)
        if lp <= 3:
            # «odaya» içinde «oda» alt dizgesiyle «oda temizliği» yanlış eşleşmesin; yalnız tam token.
            if p not in tokens:
                return False
            continue
        found = p in text_l
        if not found:
            for u in tokens:
                if abs(lp - len(u)) > 2:
                    continue
                if lp >= 4 and _dl(p, u) <= 1:
                    found = True
                    break
        if not found:
            return False
    return True


def _request_item_category_from_inventory_phrases(normalized_text: str) -> str | None:
    """İstek formu kategori envanteri (havlu, bebek ekipmanı, …); güçlü niyet / temizlik eki yok — döngü güvenli."""
    for cat_id, phrases in REQUEST_ITEM_CATEGORY_PHRASES:
        for p in phrases:
            ps = p.strip()
            if " " in ps:
                if _fuzzy_multiword_phrase_matches(normalized_text, ps):
                    return cat_id
            elif _fuzzy_has(normalized_text, ps):
                return cat_id
    return None


def extract_request_category_from_text(normalized_text: str) -> str | None:
    t = (normalized_text or "").lower()
    inv = _request_item_category_from_inventory_phrases(normalized_text)
    if inv is not None:
        return inv
    # «temizlik istiyorum» genelde 'genel temizlik' alt dizgesi taşımaz; açık talep + temizlik → housekeeping.
    if _has_strong_service_request_intent(normalized_text):
        if not any(
            x in t
            for x in (
                "kötü",
                "kotu",
                "berbat",
                "şikayet",
                "sikayet",
                "rezalet",
                "kirli",
                "pis",
            )
        ):
            if any(
                x in t
                for x in (
                    "temizlik",
                    "temzilik",
                    "cleaning",
                    "housekeeping",
                    "zimmerreinigung",
                    "уборка",
                    "уборку",
                )
            ):
                return "room_cleaning"
    return None


def extract_room_supply_request_entity(text: str) -> str | None:
    """
    Minibar dolum/eksik veya kettle için açık talep → İstek formu.
    «minibar yok» / «kettle yok» gibi saf bilgi veya var mı soruları → None (RAG).
    """
    raw = text or ""
    t = raw.lower()

    def mentions_minibar() -> bool:
        return "minibar" in t or "mini bar" in t or "mini-bar" in t

    def minibar_info_only() -> bool:
        if not mentions_minibar():
            return False
        if any(
            x in t
            for x in (
                "ihtiyaç",
                "ihtiyac",
                "istiyorum",
                "isterim",
                "talep",
                "içi boş",
                "ici bos",
                "içi bos",
                "boş",
                "bos",
                "empty",
                "refill",
                "dolum",
                "doldur",
                "yenile",
                "yenileme",
                "eksik",
                "restock",
                "içinde",
                "icinde",
                "auffüll",
                "nachfüll",
                "leer",
                "пуст",
                "пополн",
            )
        ):
            return False
        if any(x in t for x in ("var mı", "varmi", "var mi", "is there", "do you have", "haben sie", "есть ли")):
            return True
        compact = re.sub(r"[\s?.!]+", " ", t).strip()
        if compact in ("minibar yok", "yok minibar"):
            return True
        return False

    def minibar_wants_supply() -> bool:
        if not mentions_minibar():
            return False
        if minibar_info_only():
            return False
        return any(
            x in t
            for x in (
                "içi boş",
                "ici bos",
                "içi bos",
                "boş",
                "bos",
                "empty",
                "refill",
                "dolum",
                "doldur",
                "yenile",
                "yenileme",
                "eksik",
                "dolu değil",
                "dolu degil",
                "hiç yok",
                "hic yok",
                "ihtiyaç",
                "ihtiyac",
                "istiyorum",
                "isterim",
                "talep",
                "sipariş",
                "siparis",
                "restock",
                "içinde",
                "icinde",
                "auffüll",
                "nachfüll",
                "leer",
                "leere",
                "пуст",
                "пополн",
                "need minibar",
                "fill minibar",
                "minibar refill",
                " lazım",
                " lazim",
                "gerekiyor",
                "gerekli",
                "getirebilir misiniz",
                "sağlayabilir misiniz",
                "saglayabilir misiniz",
                "temin eder misiniz",
                "rica olunur",
            )
        )

    def mentions_kettle() -> bool:
        if any(
            x in t
            for x in (
                "kettle",
                "su ısıtıcısı",
                "su isiticisi",
                "wasserkocher",
                "чайник",
                "kettele",
                "ketıl",
                "ketil",
            )
        ):
            return True
        return _fuzzy_has(raw, "kettle")

    def kettle_info_denial_only() -> bool:
        if not mentions_kettle():
            return False
        if _has_strong_service_request_intent(raw):
            return False
        if any(x in t for x in ("çalışmıyor", "calismiyor", "broken", "arıza", "ariza", "not working")):
            return False
        # «eksik» / «missing» / «gelmedi» tedarik; «yok» / «no kettle» çoğunlukla bilgi sorusu (RAG).
        if any(x in t for x in ("eksik", "gelmedi", "getirmediler", "getirilmedi", "missing")):
            return False
        if "yok" in t or "no kettle" in t:
            return True
        return False

    if minibar_wants_supply():
        return "minibar"
    if mentions_kettle() and not kettle_info_denial_only():
        if _has_strong_service_request_intent(raw) or any(
            x in t for x in ("eksik", "gelmedi", "missing", "getir", "getirin", "gönder", "gonder")
        ):
            return "kettle"
    return None


def _is_baby_formula_guest_relations_request(text: str) -> bool:
    """
    Bebek maması / «mama lazım» → Misafir İlişkileri iletişim talebi.
    «Mama sandalyesi» (yüksek sandalye) hariç — o bebek ekipmanı formuna gider.

    Otel metninde sık karışanlar: mama ↔ mama sandalyesi; su ↔ su ısıtıcısı;
    bebek yatağı ↔ bebek maması; oda suyu ↔ kettle.
    """
    raw = text or ""
    t = raw.lower()
    if any(_fuzzy_has(raw, w) for w in FAULT_WORDS):
        return False
    if "mama sandalyesi" in t:
        return False
    if "high chair" in t or "feeding chair" in t:
        return False
    explicit = any(
        p in t
        for p in (
            "bebek maması",
            "bebek mamasi",
            "baby formula",
            "baby food",
            "infant formula",
            "süt maması",
            "sut mamasi",
            "babynahrung",
            "детское питание",
        )
    )
    want_markers = _has_strong_service_request_intent(raw) or any(
        m in t
        for m in (
            "lazım",
            "lazim",
            "ihtiyaç",
            "ihtiyac",
            "gerek",
            "talep",
            "istem",
            "istiyorum",
            "need",
            "brauche",
            "нужн",
        )
    )
    if explicit and want_markers:
        return True
    tokens = _norm_tokens(t)
    if "mama" in tokens and want_markers and "sandalyesi" not in t:
        return True
    return False


def _is_baby_equipment_intent(text: str) -> bool:
    """
    Bebek yatağı / sandalye / beşik talebi; beslenme bildirimi (gluten, bebek maması) değil.
    """
    if _is_baby_formula_guest_relations_request(text):
        return False
    if extract_request_category_from_text(text) == "baby_equipment":
        return True
    t = (text or "").lower()
    if any(
        m in t
        for m in (
            "mama sandalyesi",
            "baby bed",
            "high chair",
            "baby equipment",
            "crib",
            "cot",
            "kinderbett",
            "reisebett",
            "travel cot",
        )
    ):
        return True
    if ("beşik" in t or "besik" in t) and ("bebek" in t or "baby" in t):
        return True
    if ("bebek" in t or "baby" in t) and (
        "yatak" in t or "yatağ" in t or "yatag" in t or "ekipman" in t or "equipment" in t
    ):
        return True
    return False


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
        "ihtiyacım",
        "ihtiyacim",
        "ihtiyacımız",
        "ihtiyacimiz",
        "need room",
        "need cleaning",
        "brauche ",
        "benötige ",
        # TR — ek talep dili (form kategorisi + bu kalıplar → sohbet istek formu)
        "talep ediyorum",
        "talep ediyoruz",
        "talep var",
        "talepte bulunuyorum",
        "getirebilir misiniz",
        "getirir misiniz",
        "sağlayabilir misiniz",
        "saglayabilir misiniz",
        "temin eder misiniz",
        "verir misiniz",
        "ekleyebilir misiniz",
        "ayarlayabilir misiniz",
        "hazırlanabilir mi",
        "hazirlanabilir mi",
        "rica olunur",
        "istesem",
        "istekte bulun",
        "bir şey isteyeceğim",
        "bir sey isteyecegim",
        "talep ederim",
        "gönderir misiniz",
        "gonderir misiniz",
        # EN / DE / RU
        "please provide",
        "could you bring",
        "could you send",
        "would you mind bringing",
        "can you provide",
        "könnten sie bringen",
        "konnten sie bringen",
        "bitte stellen sie",
        "bitte besorgen",
        "пришлите",
        "можно принести",
        "нужно принести",
    )
    if any(m in t for m in markers):
        return True
    # EN: «I need towels» vb.; «I need to know…» bilgi sorusu sayılmasın.
    if re.search(r"(?<![a-z])(?:i|we) need (?!(?:to|someone)\b)", t):
        return True
    # TR: «… lazım» sık talep kalıbı (bebek yatağı, minibar vb.)
    if " lazım" in t or " lazim" in t:
        return True
    # TR: «bebek yatağı gerekli» / «battaniye gerekiyor» — yalnız bilinen istek kategorisiyle (genel «bilgi gerekli» değil).
    if "gerekli" in t and _request_item_category_from_inventory_phrases(text or "") is not None:
        return True
    if ("gerekiyor" in t or "gerekıyor" in t) and _request_item_category_from_inventory_phrases(text or "") is not None:
        return True
    ts = t.rstrip(".!? ")
    return ts.endswith("lazım") or ts.endswith("lazim")


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
    # "mini club" / "mini disco" burada olmamalı: "mini disco kaçta" gibi saat soruları yanlışlıkla öneri metnine düşmesin.
    "çocuk", "cocuk", "çocuğum", "cocugum", "kids", "5 yaş", "5 yas", "aktivite", "activity",
]
# Çok kelimeli ifadeler _fuzzy_has ile değil: aksi halde yalnızca "lazım" içeren
# oda talepleri (ör. battaniye lazım) yanlışlıkla acil resepsiyon yoluna düşer.
URGENT_RECEPTION_STRICT_PHRASES = [
    "şimdi biriyle konuşmam lazım",
    "simdi biriyle konusmam lazim",
]
URGENT_RECEPTION_SHORT_MARKERS = [
    "acil",
    "hemen",
    "urgent",
    "right now",
    "asap",
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
# Oda servisi / room service — bilgi (RAG) veya açık talep (istek formu) ayrımı.
_ROOM_SERVICE_SUBSTRINGS: tuple[str, ...] = (
    "oda servisi",
    "oda servis",
    "oda-servisi",
    "room service",
    "room-service",
    "roomservice",
    "zimmerservice",
    "zimmer service",
    "обслуживание в номер",
    "обслуживание номера",
    "servizio in camera",
)

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
    "kettle": ["kettle", "su ısıtıcısı", "su isiticisi", "wasserkocher", "чайник", "kettele", "ketıl", "ketil"],
    "minibar": ["minibar", "mini bar"],
    "cabinet": ["dolap", "wardrobe", "schrank", "шкаф"],
    "phone": ["telefon", "phone", "telefon"],
    "towel": ["havlu", "towel", "towels", "handtuch", "handtücher", "handtucher", "полотенце"],
    "blanket": ["battaniye", "battiye", "batiye", "battainiye", "batniye", "blanket", "decke", "одеяло"],
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

    @staticmethod
    def is_baby_equipment_intent(normalized_text: str) -> bool:
        return _is_baby_equipment_intent(normalized_text)

    @staticmethod
    def sub_intent_for_room_request_entity(entity: str | None) -> str:
        return RuleEngine._request_sub_intent(entity)

    def infer_guest_notification_group(self, normalized_text: str) -> str | None:
        """Sınıflandırıcı misafir bildirimi dediğinde metinden grup çıkarır (tam liste önce diyet göstermesin)."""
        if _matches_late_checkout_guest_notif(normalized_text):
            return "reception"
        if _text_suggests_celebration_notif(normalized_text):
            return "celebration"
        if extract_room_supply_request_entity(normalized_text):
            return None
        if _is_baby_equipment_intent(normalized_text) and _has_strong_service_request_intent(
            normalized_text
        ):
            return None
        if any(_fuzzy_has(normalized_text, w) for w in HEALTH_NOTIF_WORDS):
            return "health"
        if any(_fuzzy_has(normalized_text, w) for w in SPECIAL_WORDS):
            if _is_baby_equipment_intent(normalized_text):
                return None
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

        if RuleEngine._text_is_cancel_like_short_message(normalized_text):
            logger.info("RULE MATCH: chitchat (cancel_like_phrase)")
            return IntentResult(
                intent="chitchat",
                sub_intent="cancel_command_hint",
                entity=None,
                department=None,
                needs_rag=False,
                response_mode="fixed",
                confidence=0.99,
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

        if _is_baby_formula_guest_relations_request(normalized_text):
            logger.info("RULE MATCH: request (baby_formula_guest_relations)")
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

        # Oda tedariki (bebek yatağı, minibar/kettle): kutlama/sağlık/diyet bildiriminden önce — yanlış form önlenir.
        if _is_baby_equipment_intent(normalized_text) and _has_strong_service_request_intent(
            normalized_text
        ):
            logger.info("RULE MATCH: request (baby_equipment_supply)")
            return IntentResult(
                intent="request",
                sub_intent="room_supply_request",
                entity=None,
                department="reception",
                needs_rag=False,
                response_mode="guided",
                confidence=1.0,
                source="rule",
            )
        supply_entity_early = extract_room_supply_request_entity(normalized_text)
        if supply_entity_early:
            sub_sup = self._request_sub_intent(supply_entity_early)
            logger.info("RULE MATCH: request (room_supply_early) entity=%s", supply_entity_early)
            return IntentResult(
                intent="request",
                sub_intent=sub_sup,
                entity=supply_entity_early,
                department="reception",
                needs_rag=False,
                response_mode="guided",
                confidence=1.0,
                source="rule",
            )

        # Misafir bildirimi grupları: kutlama → sağlık → beslenme/alerji.
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
            if _is_baby_equipment_intent(normalized_text):
                logger.info("RULE SKIP: diet guest_notification (baby equipment context)")
            else:
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

        if _has_any_phrase_strict(normalized_text, URGENT_RECEPTION_STRICT_PHRASES) or any(
            _fuzzy_has(normalized_text, w) for w in URGENT_RECEPTION_SHORT_MARKERS
        ):
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

        if RuleEngine._is_spa_price_module_redirect_query(normalized_text):
            logger.info("RULE MATCH: hotel_info (spa_prices_module_redirect)")
            return IntentResult(
                intent="hotel_info",
                sub_intent="service_information",
                entity="fixed_spa_prices_module_hint",
                department=None,
                needs_rag=False,
                response_mode="answer",
                confidence=0.98,
                source="rule",
            )

        if RuleEngine._matches_restaurants_bars_module_redirect(normalized_text):
            logger.info("RULE MATCH: hotel_info (restaurants_bars_module_redirect)")
            return IntentResult(
                intent="hotel_info",
                sub_intent="service_information",
                entity="fixed_restaurants_bars_module_hint",
                department=None,
                needs_rag=False,
                response_mode="answer",
                confidence=0.97,
                source="rule",
            )

        if RuleEngine._is_room_service_information_query(normalized_text):
            logger.info("RULE MATCH: hotel_info (room_service)")
            return IntentResult(
                intent="hotel_info",
                sub_intent="service_information",
                entity=None,
                department=None,
                needs_rag=True,
                response_mode="answer",
                confidence=0.94,
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

        # Çamaşırhane / kuru temizleme / ütü: ücretli hizmet bilgisi (yazım hataları dahil); arıza formuna düşmesin.
        if self._is_laundry_dry_cleaning_fixed_info_query(normalized_text):
            logger.info("RULE MATCH: hotel_info (laundry_dry_cleaning_fixed)")
            return IntentResult(
                intent="hotel_info",
                sub_intent="service_information",
                entity="fixed_laundry_dry_cleaning_info",
                department=None,
                needs_rag=False,
                response_mode="answer",
                confidence=0.97,
                source="rule",
            )

        # «temizlik» / «temzilik» tek başına → önce bilgi (RAG); «temizlik istiyorum» housekeeping kuralında kalır.
        if self._is_cleaning_service_info_only_query(normalized_text):
            logger.info("RULE MATCH: hotel_info (cleaning_service_info)")
            return IntentResult(
                intent="hotel_info",
                sub_intent="service_information",
                entity=None,
                department=None,
                needs_rag=True,
                response_mode="answer",
                confidence=0.94,
                source="rule",
            )

        # Mini Club / Mini Disco / günlük animasyon saati soruları → sabit program metni (RAG/öneri öncesi).
        if self._is_animation_kids_schedule_query(normalized_text):
            logger.info("RULE MATCH: hotel_info (animation_kids_schedule)")
            return IntentResult(
                intent="hotel_info",
                sub_intent="service_information",
                entity="fixed_animation_info",
                department=None,
                needs_rag=False,
                response_mode="answer",
                confidence=0.98,
                source="rule",
            )

        # «Animasyon programı» genel soru → sabit metin; yoksa genel anahtar RAG’e düşer, ardından «yarın» bağlamı kopar.
        tl_anim = (normalized_text or "").lower()
        if ("animasyon" in tl_anim or "animation" in tl_anim or "анимац" in tl_anim) and any(
            k in tl_anim
            for k in (
                "program",
                "programı",
                "programi",
                "schedule",
                "tagesprogramm",
                "расписан",
                "програм",
            )
        ):
            logger.info("RULE MATCH: hotel_info (animation_program_overview)")
            return IntentResult(
                intent="hotel_info",
                sub_intent="service_information",
                entity="fixed_animation_info",
                department=None,
                needs_rag=False,
                response_mode="answer",
                confidence=0.96,
                source="rule",
            )

        # Recommendation block (separate from routing and knowledge flows).
        if RuleEngine._text_is_cancel_like_short_message(normalized_text):
            rec_entity = None
        else:
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

        tl = (normalized_text or "").lower()
        if any(p in tl for p in COMPLAINT_CLEANLINESS_STRICT_PHRASES):
            logger.info("RULE MATCH: complaint (cleanliness_strict)")
            return IntentResult(
                intent="complaint",
                sub_intent="cleanliness_complaint",
                entity=None,
                department="guest_relations",
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

        if RuleEngine._spa_wellness_chat_redirect_query(normalized_text):
            logger.info("RULE MATCH: hotel_info (spa_wellness_fixed)")
            return IntentResult(
                intent="hotel_info",
                sub_intent="service_information",
                entity="fixed_spa_info",
                department=None,
                needs_rag=False,
                response_mode="answer",
                confidence=0.93,
                source="rule",
            )

        tl_rs = (normalized_text or "").lower()
        if (
            _has_strong_service_request_intent(normalized_text)
            and any(m in tl_rs for m in _ROOM_SERVICE_SUBSTRINGS)
            and not any(_fuzzy_has(normalized_text, w) for w in FAULT_WORDS)
        ):
            # «istiyorum» ile «eğlenmek istiyoruz» HOTEL_INFO bulanık eşleşmesini keser; istek formu / resepsiyon akışı.
            logger.info("RULE MATCH: request (room_service_explicit)")
            return IntentResult(
                intent="request",
                sub_intent="room_supply_request",
                entity=None,
                department="reception",
                needs_rag=False,
                response_mode="guided",
                confidence=0.95,
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

    # «Anlamadım» kısa mesajları: form iptali sonrası veya LLM düşük güven yolunda özel yanıt.
    _CHITCHAT_CONFUSION_SOCIAL = frozenset(
        {
            "anlamadım",
            "anlamiyorum",
            "anlamadim",
            "ne demek",
            "ne demek istiyorsun",
            "ne demek istiyorsunuz",
            "i don't understand",
            "i do not understand",
            "what do you mean",
            "don't understand",
            "do not understand",
            "verstehe nicht",
            "versteh nicht",
            "nicht verstanden",
            "не понял",
            "не поняла",
            "не понимаю",
            "что значит",
            "что это значит",
        }
    )

    @staticmethod
    def _normalize_social_text(text: str) -> str:
        t = (text or "").lower().strip()
        t = re.sub(r"[^a-zA-ZçğıöşüÇĞİÖŞÜäöüßÄÖÜẞа-яА-ЯёЁ\s'’‘]", " ", t)
        t = re.sub(r"\s+", " ", t).strip()
        return t

    @staticmethod
    def _chitchat_sub_intent(text: str) -> str | None:
        t = RuleEngine._normalize_social_text(text)
        if not t:
            return None
        if t in RuleEngine._CHITCHAT_CONFUSION_SOCIAL:
            return "confusion"

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
    def is_confusion_followup_social(text: str) -> bool:
        """Kısa «anlamadım» ifadesi (normalize_social_text uzayından)."""
        t = RuleEngine._normalize_social_text(text or "")
        return bool(t) and t in RuleEngine._CHITCHAT_CONFUSION_SOCIAL

    @staticmethod
    def _mentions_animation_or_kids_program_topic(text: str) -> bool:
        """Günlük animasyon / çocuk kulübü / mini disco gibi programlar (duvar saatinden ayrıştırmak için)."""
        t = (text or "").lower()
        return any(
            k in t
            for k in (
                "mini disco",
                "mini club",
                "mini-club",
                "miniclub",
                "minidisco",
                "jammies",
                "kids club",
                "kidsclub",
                "çocuk kulübü",
                "cocuk kulubu",
                "çocuk oyun",
                "cocuk oyun",
                "playground",
                "kinderclub",
                "kinder club",
                "kinder disco",
                "günlük program",
                "gunluk program",
                "daily program",
                "tagesprogramm",
                "animasyon",
                "animation program",
                "aqua gym",
                "çocuk aktivite",
                "cocuk aktivite",
            )
        )

    @staticmethod
    def _asks_activity_or_animation_schedule(text: str) -> bool:
        """'Kaçta / saat kaç / ne zaman' ve benzeri program saati niyeti."""
        t = (text or "").lower()
        if any(
            x in t
            for x in (
                "kaçta",
                "kac ta",
                "kacta",
                "saat kaç",
                "saat kac",
                "ne zaman",
                "hangi saatte",
                "hangi saate",
            )
        ):
            return True
        if any(x in t for x in ("what time", "when does", "when is", "what hours")):
            return True
        if any(
            x in t
            for x in (
                "wann ist",
                "wann beginnt",
                "wann startet",
                "um wie viel uhr",
                "welche zeit",
                "wie spät ist",
                "wie spaet ist",
            )
        ):
            return True
        if any(x in t for x in ("во сколько", "когда начинается", "расписание")):
            return True
        if ("saatleri" in t or "saatler" in t) and any(
            x in t
            for x in (
                "mini",
                "disco",
                "kulüb",
                "kulub",
                "jammies",
                "çocuk",
                "cocuk",
                "playground",
                "kids club",
                "animasyon",
                "günlük",
                "gunluk",
                "aqua gym",
                "program",
            )
        ):
            return True
        return False

    @classmethod
    def _is_animation_kids_schedule_query(cls, text: str) -> bool:
        t = (text or "").lower()
        return cls._asks_activity_or_animation_schedule(t) and cls._mentions_animation_or_kids_program_topic(t)

    @staticmethod
    def _is_current_time_query(text: str) -> bool:
        t = (text or "").lower()
        # Turkish: "saat kaç" / "saat kac" (exclude "saatleri" opening hours, and check-in/out)
        if any(x in t for x in ["saat kaç", "saat kac"]) and not any(x in t for x in ["giriş", "giris", "çıkış", "cikis"]):
            if RuleEngine._mentions_animation_or_kids_program_topic(t):
                return False
            return True
        if any(x in t for x in ["what time is it", "what time now"]) or "what time" in t and ("now" in t or "is it" in t):
            if RuleEngine._mentions_animation_or_kids_program_topic(t):
                return False
            return True
        if "wie spät" in t or "wie spaet" in t:
            if RuleEngine._mentions_animation_or_kids_program_topic(t):
                return False
            return True
        if "который час" in t or "сколько времени" in t:
            if RuleEngine._mentions_animation_or_kids_program_topic(t):
                return False
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
    def _mentions_laundry_dry_cleaning_topic(text: str) -> bool:
        """Kuru temizleme, çamaşırhane, laundry vb. (yaygın yazım hataları)."""
        t = (text or "").lower()
        if any(
            k in t
            for k in (
                "dry cleaning",
                "laundry",
                "çamaşırhane",
                "camasirhane",
                "химчистка",
                "chemische reinigung",
                "wäscherei",
                "waescherei",
            )
        ):
            return True
        if "ütü hizmeti" in t or "utu hizmeti" in t:
            return True
        # kuru temizleme / kuru temilzeme / kuru temizlme …
        if "kuru tem" in t:
            return True
        compact = re.sub(r"\s+", "", t)
        if "kurutem" in compact or "kurutemiz" in compact:
            return True
        return False

    @classmethod
    def _is_laundry_dry_cleaning_fixed_info_query(cls, text: str) -> bool:
        """Oda temizliği talebinden ayrı: ücretli çamaşır / kuru temizleme bilgisi."""
        if any(_fuzzy_has(text, w) for w in FAULT_WORDS):
            return False
        if not cls._mentions_laundry_dry_cleaning_topic(text):
            return False
        tl = (text or "").lower()
        if any(
            x in tl
            for x in (
                "şikayet",
                "sikayet",
                "complaint",
                "beschwerde",
                "жалоб",
                "çok kötü",
                "cok kotu",
                "berbat",
                "rezalet",
            )
        ):
            return False
        # Sadece oda temizliği isteği → housekeeping (üst kurallarda yakalanır); burada yakalama.
        if _has_any_phrase_strict(tl, ROUTING_HOUSEKEEPING_WORDS):
            return False
        return True

    @staticmethod
    def _is_cleaning_service_info_only_query(text: str) -> bool:
        """Açık talep ('istiyorum' vb.) yokken temizlik → bilgi (RAG); talep housekeeping yolunda."""
        if _has_strong_service_request_intent(text):
            return False
        tl = (text or "").lower().strip().strip(".,!?")
        if any(
            x in tl
            for x in (
                "kötü",
                "kotu",
                "berbat",
                "şikayet",
                "sikayet",
                "kirli",
                "pis",
                "rezalet",
            )
        ):
            return False
        # «housekeeping» tek başına aşağıdaki routing listesinde talep olarak geçer; burada yakalama.
        if tl in ("temizlik", "temzilik", "cleaning", "reinigung"):
            return True
        if len(tl) > 56:
            return False
        short_q = (
            "temizlik nasıl",
            "temizlik nedir",
            "temizlik var",
            "temizlik ücretli",
            "temizlik ucretli",
            "temizlik hizmeti",
            "temizlik saat",
            "cleaning service",
            "room cleaning info",
        )
        for p in short_q:
            if tl == p or tl.startswith(p + " ") or tl.startswith(p + "?"):
                return True
        return False

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
        if any(k in t for k in info_terms):
            return True
        return RuleEngine._mentions_laundry_dry_cleaning_topic(text)

    @staticmethod
    def _text_is_cancel_like_short_message(text: str) -> bool:
        """«İptal et» vb. — içindeki «et» et (yemek) önerisi veya başka yanlış niyet tetiklemesin."""
        t = (text or "").lower().strip()
        if re.search(r"\biptal\s+et\b", t):
            return True
        if t in ("iptal et", "iptal", "vazgeç", "vazgec", "cancel", "abbrechen", "отмена"):
            return True
        return False

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
        if any(k in t for k in ["bbq", "barbeku", "barbecue", "et severim", "meat"]) or re.search(
            r"(?<!iptal )(?<![a-zçğıöşü])et(?![a-zçğıöşü])", t
        ):
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
    def _is_spa_price_module_redirect_query(text: str) -> bool:
        """Yalnızca açık fiyat / tarife soruları → modül; «ücretli ne var» gibi bilgi soruları dışarıda."""
        t = (text or "").lower()
        if not any(
            x in t
            for x in (
                "spa",
                "wellness",
                "serenite",
                "masaj",
                "massage",
                "hamam",
                "peeling",
                "cilt bakım",
                "cilt bakim",
                "skin care",
                "hautpflege",
                "массаж",
                "хаммам",
                "спа",
                "велнес",
                "пилинг",
            )
        ):
            return False
        if any(
            p in t
            for p in (
                "fiyat",
                "fiyatı",
                "fiyatlari",
                "tarife",
                "ne kadar",
                "kaç para",
                "kac para",
                "price",
                "prices",
                "cost",
                "how much",
                "preis",
                "preise",
                "kosten",
                "tariff",
                "цена",
                "стоимость",
                "сколько",
                "прайс",
                "тариф",
                "стоит",
                "preisliste",
                "preis list",
            )
        ):
            return True
        # «ücret» yalnız kelime sınırı: «ücretli» bilgi sorusunu yanlış yakalamasın.
        if re.search(r"(?<![a-zçğıöşü])ücret(i|ler|leri|lerdir)?(?![a-zçğıöşü])", t):
            return True
        if re.search(r"(?<![a-zçğıöşü])ucret(i|ler|leri)?(?![a-zçğıöşü])", t):
            return True
        return False

    @staticmethod
    def _is_room_service_information_query(text: str) -> bool:
        """«Oda servisi» bilgi sorusu → RAG; açık talep dili (istiyorum, sipariş…) → istek formu yoluna bırakılır."""
        t = (text or "").lower().strip()
        if not any(m in t for m in _ROOM_SERVICE_SUBSTRINGS):
            return False
        if any(_fuzzy_has(text, w) for w in FAULT_WORDS):
            return False
        if _has_strong_service_request_intent(text):
            return False
        return True

    @staticmethod
    def _menu_word_or_typo_in(t: str) -> bool:
        """«bar mneü», menyu vb. yazım hataları dahil menü sinyali."""
        if any(x in t for x in ("menü", "menu", "меню", "speisekarte", "menyu")):
            return True
        if "mneü" in t or "mneu" in t:
            return True
        if "mnü" in t or " mnu" in t or t.endswith("mnu"):
            return True
        return False

    @staticmethod
    def _matches_restaurants_bars_module_redirect(text: str) -> bool:
        """Lobby Bar / Moss menü ve bar içki fiyat listeleri → Restaurant & barlar modülü (uzun metin yok)."""
        t = (text or "").lower()
        # Boşluksuz yazım: «armenü» (= bar menü), «barmenu» vb.
        if any(x in t for x in ("armenü", "armenu", "barmenü", "barmenu", "barmneü", "barmneu")):
            return True
        # «menü» / «menu» tek başına veya kısa cümle → modül; minibar menüsü bilgi/RAG yolu ayrı kalsın.
        if (
            "minibar" not in t
            and "mini bar" not in t
            and "mini-bar" not in t
            and RuleEngine._menu_word_or_typo_in(t)
        ):
            tl = t.strip()
            short_menu = len(tl) <= 72
            menu_plus_app_hint = len(tl) <= 96 and (
                any(
                    x in tl
                    for x in (
                        "uygulama",
                        "modül",
                        "modul",
                        "pdf",
                        "link",
                        "application",
                        "модул",
                        "приложен",
                    )
                )
                or re.search(r"(?<![a-zçğıöşü])app(?![a-z])", tl) is not None
            )
            if short_menu or menu_plus_app_hint:
                if not any(
                    k in tl
                    for k in (
                        "restoran saatleri",
                        "restaurant hours",
                        "restaurantzeiten",
                        "часы ресторанов",
                    )
                ):
                    return True
        _tok = set(re.findall(r"[a-zA-ZçğıöşüÇĞİÖŞÜа-яА-ЯёЁ]+", t))
        has_bar_word = "bar" in _tok or "bars" in _tok
        if any(
            k in t
            for k in ("restoran saatleri", "restaurant hours", "restaurantzeiten", "часы ресторанов")
        ) and not any(m in t for m in ("menü", "menu", "speisekarte", "меню", "menyu", "pdf", "mneü", "mneu")):
            return False
        if has_bar_word and RuleEngine._menu_word_or_typo_in(t):
            return True
        if len(t) <= 30 and t.startswith("ar ") and RuleEngine._menu_word_or_typo_in(t):
            return True
        if "moss" in t and (
            RuleEngine._menu_word_or_typo_in(t)
            or any(
                m in t
                for m in (
                    "restaurant",
                    "yemek",
                    "food",
                    "speise",
                    "essen",
                    "еда",
                    "beach",
                )
            )
        ):
            return True
        if ("lobby" in t or "lobi" in t or "лобби" in t) and has_bar_word:
            if RuleEngine._menu_word_or_typo_in(t) or any(
                m in t
                for m in (
                    "içecek",
                    "icecek",
                    "drink",
                    "cocktail",
                    "fiyat",
                    "price",
                    "preis",
                    "liste",
                    "list",
                    "pdf",
                    "напитк",
                    "коктейл",
                )
            ):
                return True
        if has_bar_word or "бар" in t:
            if any(
                m in t
                for m in (
                    "içki",
                    "icki",
                    "import",
                    "ithal",
                    "alkol",
                    "alcohol",
                    "spirits",
                    "viski",
                    "vodka",
                    "şarap",
                    "sarap",
                    "wine",
                    "bier",
                    "bira",
                    "cocktail",
                    "drink",
                    "getränk",
                    "getrank",
                    "fiyat",
                    "price",
                    "preis",
                    "liste",
                    "list",
                    "tarife",
                    "меню",
                    "цена",
                    "напитк",
                    "алкогол",
                    "импорт",
                )
            ):
                return True
        if ("import" in t or "ithal" in t) and any(m in t for m in ("içki", "icki", "alkol", "alcohol", "drink", "bar")):
            return True
        if any(
            p in t
            for p in (
                "restoran menüsü",
                "restoran menusu",
                "otel menüsü",
                "otel menusu",
                "hotel menu",
                "restaurant menu",
                "hotelmenü",
                "speisekarte hotel",
                "меню отеля",
                "отель меню",
            )
        ):
            return True
        if RuleEngine._menu_word_or_typo_in(t) and (
            has_bar_word
            or "moss" in t
            or "lobby" in t
            or "lobi" in t
            or "restoran" in t
            or "restaurant" in t
            or "otel" in t
            or "hotel" in t
            or "a la carte" in t
            or "ala carte" in t
            or "à la carte" in t
        ):
            return True
        return False

    @staticmethod
    def _spa_wellness_chat_redirect_query(text: str) -> bool:
        """Genel spa / wellness bilgi soruları → sabit metin + modül; arıza/şikayet cümlelerini ele."""
        t = (text or "").lower()
        if RuleEngine._is_spa_price_module_redirect_query(text):
            return False
        if any(
            f in t
            for f in (
                "arıza",
                "ariza",
                "bozuk",
                "çalışmıyor",
                "calismiyor",
                "fault",
                "broken",
                "wifi",
                "wi-fi",
                "internet",
                "şikayet",
                "sikayet",
                "complaint",
            )
        ):
            return False
        if "la serenite" in t or "serenite" in t:
            return True
        if "wellness" in t:
            return True
        if "spa" in t:
            return True
        if "türk hamam" in t or "turk hamam" in t or "hamam" in t or "buhar odası" in t or "buhar odasi" in t:
            return True
        if "sauna" in t and any(x in t for x in ("spa", "otel", "hotel", "wellness", "ücretsiz", "ucretsiz", "ücretli", "ucretli")):
            return True
        return False

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
        # Tek kelimelik «şikayet» / complaint → uygulama formu butonu (service_complaint = yalnız metin).
        tl_raw = (text or "").strip().lower()
        core = tl_raw.strip(".,!?…").replace("؟", "")
        parts = [p for p in core.split() if p]
        _bare_complaint = frozenset(
            {
                "şikayet",
                "sikayet",
                "complaint",
                "beschwerde",
                "жалоба",
            }
        )
        if len(parts) == 1 and parts[0] in _bare_complaint:
            return "complaint_intake"
        if (
            "gürültü" in text
            or "gurultu" in text
            or "noise" in text
            or "lärm" in text
            or "laerm" in text
            or "шум" in text
        ):
            return "noise_complaint"
        if "temizlik" in text or "clean" in text:
            return "cleanliness_complaint"
        if "personel" in text or "staff" in text:
            return "staff_complaint"
        if "oda" in text or "room" in text:
            return "room_condition_complaint"
        # «şikayetçiyim» + konu: butonlu şikayet formu için alt tür (genel «şikayetçiyim» tek başına değil).
        if (
            "şikayetçiyim" in text
            or "şikayetciyim" in text
            or "sikayetciyim" in text
            or "şikayet ediyorum" in text
            or "sikayet ediyorum" in text
            or "complaining about" in text
        ):
            if (
                "gürültü" in text
                or "gurultu" in text
                or "noise" in text
                or "lärm" in text
                or "laerm" in text
                or "шум" in text
                or "rahatsız" in text
                or "rahatsiz" in text
            ):
                return "noise_complaint"
            if (
                "temizlik" in text
                or "kirli" in text
                or "pis" in text
                or "clean" in text
                or "dirty" in text
                or "schmutz" in text
                or "грязн" in text
            ):
                return "cleanliness_complaint"
            if "personel" in text or "staff" in text or "персонал" in text:
                return "staff_complaint"
            if "oda" in text or "room" in text or "zimmer" in text or "номер" in text:
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

