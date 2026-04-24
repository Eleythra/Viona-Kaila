from pathlib import Path
from typing import Optional
import yaml
import re

from assistant.core.logger import get_logger
from assistant.schemas.intent import IntentResult

logger = get_logger("assistant.rule_engine")

# RuleEngine.match() — üstten alta ilk eşleşen kazanır. (Orchestrator’da «rezervasyon» anahtar kelimesi
# _handle_chat_request içinde kural motorundan ÖNCE işlenir; spa / à la carte / premium / genel metin.)
#
# Özet sıra:
#   dil değişimi → chitchat / iptal benzeri → geç çıkış (misafir bildirimi)
#   → bebek maması (MR) → erken oda tedariki (minibar/kettle; arıza kelimesi yoksa)
#   → kutlama / sağlık / diyet (SPECIAL) → MISAFIR_BILDIRIM_STRICT (tüm kategoriler)
#   → acil resepsiyon → gece yemeği / spa rahatlama / spa fiyat / restoran-bar modülü / oda servisi bilgisi
#   → erken çıkış öğle kutusu → Alanya / dış otel / dondurma → çamaşırhane sabit bilgisi (FAULT yoksa)
#   → temizlik yalnız bilgi → animasyon programı → envanter+güçlü talep → öneri
#   → housekeeping (şikâyet kalitesi bağlamında atlama) → resepsiyon / MR / transfer / öğle kutusu
#   → kayıp eşya şikâyeti → genel şikâyet sözcükleri → giriş-çıkış saati / saat / service_info (FAULT yoksa)
#   → genel oda isteği / genel oda+teknik arıza (strict) → hizmet deneyimi şikâyeti (service_experience)
#   → arıza: FAULT_WORDS + öncelikli tesisat/elektrik + eksik parça + FAULT_STRICT_SUBSTRING_PHRASES
#   → temizlik şikâyeti (strict) → COMPLAINT_WORDS → soft ürün bilgisi (RAG) → REQUEST_WORDS
#   → spa/à la carte/premium rezervasyon iletişimi → RESERVATION_WORDS → hotel_info anahtarları → None
#
# routing_rules.yaml yalnızca örnek listeler içerir; üretim kuralları bu dosyadaki sabitler + yardımcılar.

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
    # PL
    "nie działa",
    "zepsute",
    "zepsula sie",
    "zepsulo sie",
    "nie otwiera się",
    "nie otwiera sie",
    "nie zamyka się",
    "nie wlacza sie",
    "awaria",
    "uszkodzone",
    "zacięło",
    "zatkane",
    "spaliło się",
    # TR — ek arıza / çalışmama kalıpları (genel «sorun var» şikâyet yolunu çalmamak için çok anlamlı ifadeler)
    "hasarlı",
    "hasarli",
    "kırık",
    "kirik",
    # «çalışmıyor …» / «… değil» çok kelimeli kalıplar FAULT_STRICT_SUBSTRING_PHRASES — _fuzzy_has tek tokenla
    # «oda beklediğim gibi değil», «internet çok yavaş» vb. yanlış arızaya düşmesin.
    "tepki vermiyor",
    "takıldı",
    "tikildi",
    "dondu",
    "kitlendi",
    "hata veriyor",
    "hata oluştu",
    "hata olustu",
    "error veriyor",
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
    # TR — oda ekipmanı / sistem arızası (kısa belirti listesi)
    "sinyal yok",
    "su akıtıyor",
    "su akitor",
    "tıkalı",
    "tikali",
    # «eksik parça» tam ifade match() içinde alt dize ile — _fuzzy_has «eksik» ile «su ısıtıcısı eksik» talebini arızaya düşürüyordu.
    "ısıtmıyor",
    "isitmiyor",
    "donuyor",
    "takılıyor",
    "takiliyor",
    "kilitlenmiş",
    "kilitlenmis",
    "resetlenmiyor",
    # EN / DE / PL — kısa teknik kalıplar
    "not responding",
    "no sound",
    "no picture",
    "no signal",
    "no power",
    "frozen",
    "kein ton",
    "kein bild",
    "kein signal",
    "nie odpowiada",
    "brak dźwięku",
    "brak obrazu",
    "technical problem",
    "technical issue",
    # DA / NL / CS / RO / SK / RU
    "virker ikke",
    "i stykker",
    "defekt",
    "ødelagt",
    "odelagt",
    "kapot",
    "werkt niet",
    "doet het niet",
    "verstopt",
    "nefunguje",
    "nefunguje to",
    "rozbitý",
    "rozbita",
    "rozbité",
    "zaseknuté",
    "zaseknute",
    "nu functionează",
    "nu functioneaza",
    "stricat",
    "defect",
    "nu merge",
    "pokazené",
    "pokazene",
    "neotvára sa",
    "neotvara sa",
    "не работает",
    "не работают",
    "сломано",
    "сломалось",
    "сломан",
    "забито",
    "засор",
    "нет сигнала",
    "нет звука",
    "нет изображения",
    "техническая неисправность",
    "техническая проблема",
]

# _fuzzy_has çok kelimede «herhangi bir token» yeterli olduğu için yalnızca tam alt dize ile eşleştirilir.
FAULT_STRICT_SUBSTRING_PHRASES = (
    "düzgün değil",
    "duzgun degil",
    "düzgün çalışmıyor",
    "duzgun calismiyor",
    "aktif değil",
    "aktif degil",
    "gürültü yapıyor",
    "gurultu yapiyor",
    "yavaş çalışıyor",
    "yavas calisiyor",
    "fonksiyon çalışmıyor",
    "fonksiyon calismiyor",
    "hiç çalışmıyor",
    "hic calismiyor",
    "çalışmıyor gibi",
    "calismiyor gibi",
    "çalışmıyor sanırım",
    "calismiyor sanirim",
)


def text_suggests_service_experience_complaint(text: str) -> bool:
    """
    Hizmet kalitesi / personel / gürültü / sipariş — arıza formundan önce şikâyet.
    Tesisat·elektrik·sıcak su öncelikli arıza yollarına takılmaz.
    """
    if text_suggests_priority_plumbing_or_electric_fault(text):
        return False
    t = (text or "").lower()
    needles = (
        "geç hizmet",
        "gec hizmet",
        "memnun değil",
        "memnun degil",
        "şikayetim var",
        "sikayetim var",
        "siparişim yanlış",
        "siparisim yanlis",
        "hizmet kalitesi düşük",
        "hizmet kalitesi dusuk",
        "bekleme süresi uzun",
        "bekleme suresi uzun",
        "ilgilenilmedi",
        "sorunum çözülmedi",
        "sorunum cozulmedi",
        "oda kokuyor",
        "banyoda sorun var",
        "internet çok yavaş",
        "internet cok yavas",
        "klima düzgün çalışmıyor",
        "klima duzgun calismiyor",
        "oda beklediğim gibi değil",
        "oda bekledigim gibi degil",
        "gürültü var",
        "gurultu var",
        "skarga na hałas",
        "skarga na halas",
        "za głośno",
        "za glosno",
        "oda temizliği yetersiz",
        "oda temizligi yetersiz",
        "temizlik yeterli değil",
        "temizlik yeterli degil",
        "personel ilgisiz",
        "şikayet oluşturmak",
        "sikayet olusturmak",
    )
    if any(n in t for n in needles):
        return True
    if "personel" in t and "ilgisiz" in t:
        return True
    return False


def text_suggests_plumbing_leak_or_flood_fault(text: str) -> bool:
    """
    «Odam su akıtıyor» gibi ifadelerde «su» tek başına istek (içme suyu) sayılmasın — arıza (Su/Banyo).
    """
    t = (text or "").lower()
    if any(
        p in t
        for p in (
            # TR — kaçak / taşma / sızıntı
            "su akıtıyor",
            "su akitor",
            "su akıt",
            "su akit",
            "su sızıyor",
            "su siziyor",
            "su sız",
            "su siz",
            "sızıntı",
            "sizinti",
            "sızdırıyor",
            "sizdiriyor",
            "su damlıyor",
            "su damliyor",
            "damlıyor",
            "damliyor",
            "tavandan su",
            "tavan dan su",
            "tavan su",
            "musluktan su",
            "musluk dan su",
            "lavabo taştı",
            "lavabo tasti",
            "lavabo taşıyor",
            "lavabo tasiyor",
            "klozet taştı",
            "klozet tasti",
            "wc taştı",
            "wc tasti",
            "banyo su bastı",
            "banyo su basti",
            "boru patladı",
            "boru patladi",
            "su baskını",
            "su baskini",
            "su bastı",
            "su basti",
            "patlak boru",
            "kanalizasyon",
            "gider kokuyor",
            "gider tıkan",
            "gider tikan",
            # EN
            "water leak",
            "water leaking",
            "leaking water",
            "water dripping",
            "ceiling leak",
            "pipe burst",
            "burst pipe",
            "bathroom flood",
            "toilet overflow",
            "flooded bathroom",
            # DE
            "wasser tropft",
            "wasser läuft aus",
            "wasser lauft aus",
            "wasserschaden",
            "rohrbruch",
            "decke tropft",
            "überlauf",
            "uberlauf",
            # PL
            "cieknie woda",
            "woda cieknie",
            "przeciek",
            "zalanie",
            "peknela rura",
            "zalanie lazienki",
        )
    ):
        return True
    roomish = (
        "oda",
        "odam",
        "odada",
        "banyo",
        "tuvalet",
        "wc",
        "lavabo",
        "bathroom",
        "shower",
        "room ",
        " my room",
        "zimmer",
        "prysznic",
        "lazienk",
        "pokoj",
        "toaleta",
    )
    leakish = (
        "akıtıyor",
        "akitor",
        "akıyor",
        "akiyor",
        "sızıyor",
        "siziyor",
        "sızdır",
        "sizdir",
        "damlıyor",
        "damliyor",
        "leak",
        "drip",
        "dripping",
        "tropf",
        "leck",
        "läuft",
        "lauft",
        "running water",
        "przeciek",
        "kapa",
        "cieknie",
    )
    if any(r in t for r in roomish) and any(k in t for k in leakish):
        return True
    return False


def text_suggests_electrical_hazard_fault(text: str) -> bool:
    """Priz / kısa devre kokusu gibi «yok/çalışmıyor» dışı elektrik riski — arıza formu."""
    t = (text or "").lower()
    return any(
        p in t
        for p in (
            "kıvılcım",
            "kivilcim",
            "kısa devre",
            "kisa devre",
            "priz duman",
            "prizden duman",
            "elektrik kokusu",
            "elektrik yanıyor",
            "elektrik yaniyor",
            "sigorta attı",
            "sigorta atti",
            "sigortalar attı",
            "yanık kokusu",
            "yanik kokusu",
            "electrical smell",
            "burning smell",
            "socket spark",
            "outlet spark",
            "short circuit",
            "funke",
            "funken",
            "kurzschluss",
            "brandgeruch",
            "iskra z gniazdka",
            "iskra w gnieździe",
            "zapach palenia",
            "zwarcie",
            "iskrzy gniazdko",
        )
    )


def text_suggests_water_supply_or_pressure_fault(text: str) -> bool:
    """Sıcak su / basınç — «su» kelimesi istek yerine tesisat arızası."""
    t = (text or "").lower()
    return any(
        p in t
        for p in (
            "sıcak su yok",
            "sicak su yok",
            "sıcak su sorunu",
            "sicak su sorunu",
            "sıcak su problemi",
            "sicak su problemi",
            "soğuk su yok",
            "soguk su yok",
            "ılık su yok",
            "ilik su yok",
            "su gelmiyor",
            "musluk su vermiyor",
            "musluk su vermi",
            "su basıncı",
            "su basinci",
            "basınç düşük",
            "basinc dusuk",
            "basıncı düşük",
            "basinci dusuk",
            "basıncı az",
            "basinci az",
            "düşük basınç",
            "dusuk basinc",
            "no hot water",
            "no cold water",
            "low water pressure",
            "water pressure low",
            "water pressure is low",
            "kein warmwasser",
            "kein kaltwasser",
            "niedriger wasserdruck",
            "wasserdruck niedrig",
            "zu wenig wasserdruck",
            "brak ciepłej wody",
            "brak cieplej wody",
            "brak zimnej wody",
            "brak wody",
            "niskie ciśnienie wody",
            "niskie cisnienie wody",
            "za niskie ciśnienie",
            "za niskie cisnienie",
        )
    )


def text_suggests_drain_blockage_fault(text: str) -> bool:
    """Gider / lavabo / duş tıkanıklığı — «tıkandı» listede var, «tıkalı» ayrı."""
    t = (text or "").lower()
    if any(
        p in t
        for p in (
            "duş gider",
            "dus gider",
            "lavabo gider",
            "gider tıkalı",
            "gider tikali",
            "gider tıkan",
            "gider tikan",
            "gider açılmıyor",
            "gider acilmiyor",
            "clogged drain",
            "blocked drain",
            "drain clogged",
            "sink clogged",
            "shower drain",
            "verstopfter abfluss",
            "abfluss verstopft",
            "zatkany odpływ",
            "zatkany odpływ prysznic",
            "zatkany zlew",
            "zatkany prysznic",
            "zatkana toaleta",
            "waschbecken verstopft",
            "spüle verstopft",
            "verstopfte spüle",
            "toilette verstopft",
            "wc verstopft",
        )
    ):
        return True
    if "tıkalı" in t or "tikali" in t or "tıkanmış" in t or "tikanmis" in t:
        if any(
            x in t
            for x in (
                "gider",
                "lavabo",
                "duş",
                "dus",
                "klozet",
                "wc",
                "boru",
                "abfluss",
                "waschbecken",
                "spüle",
                "dusche",
                "toilette",
                "drain",
                "sink",
                "shower",
                "odpływ",
                "odplyw",
                "toaleta",
                "umywalka",
                "prysznic",
            )
        ):
            return True
    return False


def text_suggests_tv_signal_fault(text: str) -> bool:
    """TV görüntü / sinyal — «sinyal yok» çoğunlukla oda televizyonu (Wi-Fi hariç)."""
    t = (text or "").lower()
    if any(
        p in t
        for p in (
            "tv sinyal",
            "televizyon sinyal",
            "televizyonum sinyal",
            "televizyonuma sinyal",
            "television signal",
            "tv no signal",
            "fernseher signal",
            "fernseher kein signal",
            "telewizor brak sygnału",
            "telewizor brak sygnalu",
            "brak sygnału telewizji",
            "brak sygnalu telewizji",
        )
    ):
        return True
    if "no signal" in t and any(w in t for w in ("tv", "television", "screen", "hdmi", "cable", "kanal")):
        return True
    if "sinyal yok" in t or "sinyal gelmiyor" in t or "kanal yok" in t:
        if any(w in t for w in ("wifi", "wi-fi", "internet", "wlan", "kablosuz", "i̇nternet")):
            return False
        return True
    if "görüntü yok" in t or "goruntu yok" in t:
        if any(w in t for w in ("tv", "televizyon", "ekran", "screen", "hdmi", "kanal")):
            return True
    return False


def text_suggests_bulb_or_fixture_break_fault(text: str) -> bool:
    """Ampul / lamba patlak — «patladı» listede; «patlak» sıfatı ayrı."""
    t = (text or "").lower()
    if any(
        p in t
        for p in (
            "ampul patlak",
            "lamba patlak",
            "ampul patladı",
            "ampul patladi",
            "lamba patladı",
            "lamba patladi",
            "blown bulb",
            "burnt out bulb",
            "burned out bulb",
            "kaputt glühbirne",
            "defekte lampe",
            "przepalona żarówka",
            "przepalona zarowka",
            "żarówka nie świeci",
            "zarowka nie swieci",
        )
    ):
        return True
    if "patlak" in t or "patlamış" in t or "patlamis" in t:
        if any(
            x in t
            for x in (
                "ampul",
                "lamba",
                "ışık",
                "isik",
                "bulb",
                "lampe",
                "glühb",
                "gluhb",
                "żarówk",
                "zarowk",
            )
        ):
            return True
    return False


def text_suggests_wifi_connectivity_fault(text: str) -> bool:
    """Wi‑Fi / WLAN / internet — bağlantı sorunu (TR «bağlantı yok» FAULT_WORDS’ta; EN/DE/PL eşdeğer)."""
    t = (text or "").lower()
    has_net = any(
        w in t
        for w in (
            "wifi",
            "wi-fi",
            "wlan",
            "kablosuz",
            "wireless",
            "internet",
            "i̇nternet",
            "internet nie działa",
            "internet nie dziala",
            "brak internetu",
            "wifi nie działa",
            "wifi nie dziala",
        )
    )
    if not has_net:
        return False
    return any(
        p in t
        for p in (
            "no connection",
            "no wifi",
            "no wi-fi",
            "not connecting",
            "cannot connect",
            "can't connect",
            "cant connect",
            "won't connect",
            "wont connect",
            "lost connection",
            "connection lost",
            "doesn't connect",
            "doesnt connect",
            "keine verbindung",
            "verbindet nicht",
            "nicht verbunden",
            "kein wlan",
            "wlan geht nicht",
            "nie łączy się",
            "brak połączenia",
            "nie mogę się połączyć",
            "brak internetu",
        )
    )


def text_suggests_priority_plumbing_or_electric_fault(text: str) -> bool:
    """İstek/yanlış entity öncesi yakalanacak oda tesisat·elektrik·TV·Wi‑Fi arızaları (çok dilli)."""
    return (
        text_suggests_plumbing_leak_or_flood_fault(text)
        or text_suggests_electrical_hazard_fault(text)
        or text_suggests_water_supply_or_pressure_fault(text)
        or text_suggests_drain_blockage_fault(text)
        or text_suggests_tv_signal_fault(text)
        or text_suggests_bulb_or_fixture_break_fault(text)
        or text_suggests_wifi_connectivity_fault(text)
    )


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
    "room dirty",
    "room is dirty",
    "dirty room",
    "zimmer schmutzig",
    "brudny pokój",
    "brudny pokoj",
    "værelset er beskidt",
    "vaerelset er beskidt",
    "kamer is vies",
    "špinavý pokoj",
    "spinavy pokoj",
    "cameră murdară",
    "camera murdara",
    "izba špinavá",
    "izba spinava",
    "грязный номер",
    "номер грязный",
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
    # PL
    "reklamacja", "hałas", "halas", "źle", "zle", "niezadowolony", "niezadowolona", "okropnie",
    "rozczarowany", "rozczarowana", "zła obsługa", "zla obsluga", "bardzo źle", "bardzo zle",
    # DA / NL / CS / RO / SK / RU
    "klage",
    "utilfreds",
    "støj",
    "stoj",
    "klacht",
    "ontevreden",
    "herrie",
    "lawaai",
    "nespokojenost",
    "hluk",
    "nemultumit",
    "nemulțumit",
    "zgomot",
    "reklamácia",
    "nespokojnosť",
    "жалоба",
    "недоволен",
    "недовольна",
    "шумно",
    "плохой сервис",
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
    "ręcznik",
    # blanket / battaniye
    "battaniye",
    "blanket",
    "decke",
    "koc",
    # pillow / yastık
    "yastık",
    "yastik",
    "pillow",
    "kissen",
    "poduszka",
    # water / su
    "su",
    "water",
    "wasser",
    "woda",
    "håndklæde",
    "handklæde",
    "handdoek",
    "handdoeken",
    "ručník",
    "rucnik",
    "prosop",
    "uterák",
    "uterak",
    "полотенце",
    "tæppe",
    "taeppe",
    "deken",
    "dekens",
    "deka",
    "pătură",
    "patura",
    "prikrývka",
    "prikryvka",
    "одеяло",
    "kussen",
    "kussens",
    "polštář",
    "polstar",
    "pernă",
    "perna",
    "vankúš",
    "vankus",
    "подушка",
    "вода",
]
ROUTING_HOUSEKEEPING_WORDS = [
    "oda temizliği", "oda temizligi", "oda düzenle", "oda duzenle",
    "housekeeping", "room cleaning", "clean my room",
    "zimmerreinigung", "reinigung bitte",
    "sprzątanie pokoju", "posprzątajcie pokój",
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
    "sprzątanie do pokoju",
    "værelsesrengøring",
    "vaerelsesrengoring",
    "rengøring af værelset",
    "rengoring af vaerelset",
    "gør værelset rent",
    "gor vaerelset rent",
    "kamer schoonmaken",
    "graag schoonmaken",
    "schoonmaak kamer",
    "uklid pokoje",
    "úklid pokoje",
    "uklid v pokoji",
    "curățenie cameră",
    "curatenie camera",
    "curatenie in camera",
    "upratovanie izby",
    "upratovanie v izbe",
    "уборка номера",
    "уборка в номере",
    "нужна уборка",
]
ROUTING_RECEPTION_WORDS = [
    "resepsiyon", "resepsiyonla görüş", "resepsiyonla gorus",
    "reception", "front desk",
    "rezeption",
    "recepcja", "lobby hotelowe",
    "receptionen",
    "hotelreception",
    "receptie",
    "balie",
    "hotelbalie",
    "recepcja hotelowa",
    "u recepce",
    "recepție",
    "receptie",
    "la recepție",
    "la receptie",
    "recepcia",
    "na recepcii",
    "ресепшн",
    "на ресепшене",
    "стойка регистрации",
]
ROUTING_GUEST_RELATIONS_WORDS = [
    "misafir ilişkileri", "misafir iliskileri",
    "guest relations",
    "gästebetreuung", "gaestebetreuung",
    "obsługa gościa",
]
ROUTING_TRANSFER_WORDS = [
    "transfer istiyorum",
    "transfer talebi",
    "transfer rezervasyonu",
    "transfer rezervasyon",
    "transfer var mı",
    "transfer var mi",
    "transfer varmı",
    "transfer varmi",
    "havalimanı transferi",
    "havalimani transferi",
    "airport transfer",
    "airport shuttle",
    "shuttle",
    "i need transfer",
    "need a transfer",
    "transfer bitte",
    "flughafentransfer",
    "zum flughafen",
    "potrzebny transfer",
    "zamówić transfer",
]
ROUTING_LUNCHBOX_WORDS = [
    "lunch box", "lunchbox", "öğle paketi", "ogle paketi", "paket kahvaltı", "paket kahvalti",
]
ROUTING_GENERIC_COMPLAINT_WORDS = [
    "bir sorunum var", "sorunum var",
    "i have a problem", "problem with service",
    "ich habe ein problem",
    "mam problem",
    "jeg har et problem",
    "et problem med",
    "ik heb een probleem",
    "probleem met de service",
    "mám problém",
    "mam problem se sluzbou",
    "am o problemă",
    "am o problema",
    "mám problém",
    "mam problem",
    "у меня проблема",
    "есть проблема",
]

# Kayıp eşya → resepsiyon (şikâyet formu / «oda» ile room_condition şikâyeti değil).
_LOST_FOUND_TOPIC_PHRASES_STRICT = (
    "kayıp eşya",
    "kayip esya",
    "kayıp-eşya",
    "lost and found",
    "lost & found",
    "lost found",
    "lost-and-found",
    "fundbüro",
    "fundbuero",
    "fundsachen",
    "biuro rzeczy znalezionych",
)
_LOST_FOUND_POLICY_INFO_MARKERS = (
    "ne kadar",
    "how long",
    "wie lange",
    "ile",
    "przechowują",
    "przechowywane",
    "saklanır",
    "saklanir",
    "süre",
    "süresi",
    "policy",
    "politika",
    "politikası",
    "politikasi",
    "kural",
    "rules",
    "nedir",
    "nasıl çalışır",
    "nasil calisir",
    "what is",
    "was ist",
    "was passiert",
    "aufbewahrung",
    "aufbewahrt",
    "where are items",
    "lost items kept",
)
_LOST_ITEM_LOSS_VERBS = (
    "kaybettim",
    "kayboldu",
    "kayboldum",
    "kayıp var",
    "kayip var",
    "kaybettik",
    "lost my",
    "lost the",
    "lost a",
    "lost an",
    "can't find",
    "cannot find",
    "cant find",
    "bulamıyorum",
    "bulamiyorum",
    "missing",
    "misplaced",
    "was stolen",
    "çalındı",
    "calindi",
    "stolen",
    "verloren",
    "vermisst",
    "habe verloren",
    "hab verloren",
    "verlegt",
    "zgubiłem",
    "zgubiłam",
    "zgubiliśmy",
    "zaginione",
    "nie mogę znaleźć",
    "nie moge znalezc",
    "zginęło",
    "zginelo",
)
_LOST_ITEM_OBJECT_WORDS = (
    "eşya",
    "esya",
    "telefon",
    "cüzdan",
    "phone",
    "wallet",
    "anahtar",
    "key",
    "passport",
    "pasaport",
    "çanta",
    "bag",
    "airpods",
    "kulaklık",
    "kulaklik",
    "gözlük",
    "gozluk",
    "sunglasses",
    "watch",
    "saat",
    "kart",
    "card",
    "kimlik",
    "ring",
    "yüzük",
    "yuzuk",
    "jewelry",
    "laptop",
    "tablet",
    "kolye",
    "necklace",
    "bracelet",
    "bilezik",
    "zegarek",
    "okulary",
)
# Türkçe iyelik / çekimle tam kelime eşleşmez («gözlük» ⊄ «gözlüğüm»); kök + yaygın nesneler.
_LOST_ITEM_OBJECT_STEMS = (
    "gözlü",
    "gozlu",
    "kolye",
    "bilezik",
    "telefon",
    "cüzdan",
    "saat",
    "yüzük",
    "yuzuk",
    "kulaklık",
    "kulaklik",
    "çantam",
    "cantam",
    "kartım",
    "kartim",
    "anahtarım",
    "anahtarim",
    "cüzdanım",
    "cuzdanim",
    "telefonum",
    "saatim",
    "kimliğim",
    "kimligim",
)
_LOST_ITEM_CONTEXT_PLACES = (
    "oda",
    "room",
    "zimmer",
    "pokój",
    "havuz",
    "pool",
    "plaj",
    "beach",
    "deniz",
    "sea",
    "lobi",
    "lobby",
    "otel",
    "hotel",
)


def lost_item_object_mentioned(t: str) -> bool:
    """Tam kelime veya TR iyelik kökü (gözlüğüm, saatim, …) ile eşleşme."""
    if any(o in t for o in _LOST_ITEM_OBJECT_WORDS):
        return True
    return any(s in t for s in _LOST_ITEM_OBJECT_STEMS)


# «kayboldu» ailesi: kaybıoldu / kaybldu; «ayboldu» «kyboldu» (k veya a düşmüş); son ekler.
# (?<!\w): «mayboldu» içindeki «ayboldu» yanlış pozitif olmasın.
_LOST_ITEM_KAYBOL_TYPO_RE = re.compile(
    r"(?:"
    r"kayb(?:[ıi]?oldu|ldu)"
    r"|"
    r"(?<!\w)(?:kay|ay|ky)boldu"
    r")(?:m|k|mu|mus|muz|sunuz)?"
)
# «bulamıyorum» / «bulamiyorum» / «bulamyorum» (m–y arası ı düşmüş).
_LOST_ITEM_BULAMIYORUM_RE = re.compile(r"bulam[ıi]?yorum")
# «kaybettim» / «kaybettım»; «kaybettik».
_LOST_ITEM_KAYBETTIM_RE = re.compile(r"kaybett[ıi][mk]")


def lost_found_topic_in_text(text: str) -> bool:
    t = (text or "").lower()
    return any(p in t for p in _LOST_FOUND_TOPIC_PHRASES_STRICT)


def matches_lost_found_policy_info_query(normalized_text: str) -> bool:
    if not lost_found_topic_in_text(normalized_text):
        return False
    t = (normalized_text or "").lower()
    return any(m in t for m in _LOST_FOUND_POLICY_INFO_MARKERS)


def text_suggests_lost_property_not_room_complaint(text: str) -> bool:
    """«Oda» geçti diye kayıp eşya cümlesi room_condition şikâyet formuna düşmesin."""
    t = (text or "").lower().strip()
    t = t.strip(" \t-*–—•·")
    if lost_found_topic_in_text(t):
        return True
    if matches_lost_found_policy_info_query(t):
        return True
    if any(v in t for v in _LOST_ITEM_LOSS_VERBS) and lost_item_object_mentioned(t):
        return True
    if any(v in t for v in _LOST_ITEM_LOSS_VERBS) and any(p in t for p in _LOST_ITEM_CONTEXT_PLACES):
        return True
    # Yazım hatası «kaybıoldu» vb. _LOST_ITEM_LOSS_VERBS’te yok; nesne veya yer + kaybol ailesi → kayıp eşya.
    if _LOST_ITEM_KAYBOL_TYPO_RE.search(t) and (
        lost_item_object_mentioned(t) or any(p in t for p in _LOST_ITEM_CONTEXT_PLACES)
    ):
        return True
    # «bulamıyorum» yazımı; nesne veya yer ile birlikte (yalnız «bulamıyorum» LLM’ye kalabilir).
    if _LOST_ITEM_BULAMIYORUM_RE.search(t) and (
        lost_item_object_mentioned(t) or any(p in t for p in _LOST_ITEM_CONTEXT_PLACES)
    ):
        return True
    if _LOST_ITEM_KAYBETTIM_RE.search(t) and (
        lost_item_object_mentioned(t) or any(p in t for p in _LOST_ITEM_CONTEXT_PLACES)
    ):
        return True
    return False


def matches_lost_property_complaint_flow(normalized_text: str) -> bool:
    """Kayıp eşya ifadeleri → şikâyet formu + üst bilgi metni (policy + MI/resepsiyon + form)."""
    return text_suggests_lost_property_not_room_complaint(normalized_text)


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
    "wcześniejsze zameldowanie",
    "rezerwacja",
]


def _booking_or_reservation_marker_in_text(t: str) -> bool:
    tl = (t or "").lower()
    return any(
        m in tl
        for m in (
            "rezervasyon",
            "reservation",
            "randevu",
            "booking",
            "book a table",
            "book an appointment",
            "buchung",
            "reservierung",
            "termin",
            "tisch reserv",
            "appointment",
            "rezerwacja",
            "zarezerwowane",
            "zapis na",
            "zapis na",
            "reserve a table",
            "book a dinner",
        )
    )


def is_spa_reservation_handoff_text(text: str) -> bool:
    """Spa / masaj / ücretli bakım randevusu → doğrudan spa ekibi."""
    tl = (text or "").lower()
    if not _booking_or_reservation_marker_in_text(tl):
        return False
    return any(
        x in tl
        for x in (
            "spa",
            "la serenite",
            "serenite",
            "masaj",
            "massage",
            "sauna",
            "türk hamam",
            "turk hamam",
            "hamam",
            "peeling",
            "cilt bakım",
            "cilt bakim",
            "skin care",
        )
    )


def is_ala_carte_reservation_handoff_text(text: str) -> bool:
    """À la carte / ücretli restoran masa rezervasyonu → Misafir İlişkileri."""
    tl = (text or "").lower()
    if not _booking_or_reservation_marker_in_text(tl):
        return False
    return any(
        x in tl
        for x in (
            "a la carte",
            "alacarte",
            "à la carte",
            "alakart",
            "alakarte",
            "la terrace",
            "terrace a la",
            "moss beach",
            "sinton bbq",
            "sinton barbecue",
            "ücretli restoran",
            "ucretli restoran",
            "paid restaurant",
            "fine dining",
            "dinner reservation",
            "table for",
            "masa rezerv",
            "romantic dinner",
            "romantik akşam",
            "romantik aksam",
            "akşam yemeği rezerv",
            "aksam yemegi rezerv",
        )
    )


def is_premium_reservation_reception_handoff_text(text: str) -> bool:
    """Premium ifadeli masa / deneyim rezervasyonu (spa ve à la carte hariç) → ön büro / resepsiyon."""
    tl = (text or "").lower()
    if not _booking_or_reservation_marker_in_text(tl):
        return False
    if is_spa_reservation_handoff_text(tl) or is_ala_carte_reservation_handoff_text(tl):
        return False
    return any(
        x in tl
        for x in (
            "premium",
            "vip",
            "özel menü",
            "ozel menu",
            "chef",
            "wine pairing",
            "şarap eşleşme",
            "sarap eslesme",
            "özel akşam",
            "ozel aksam",
            "private dining",
            "gala yemeği",
            "gala yemegi",
        )
    )


def _matches_late_checkout_guest_notif(normalized_text: str) -> bool:
    """Yalnızca tam ifadeler; 'çıkış saati' gibi hotel_info sorgularını yanlış yakalamaz."""
    tl = normalized_text or ""
    needles = (
        "geç çıkış",
        "gec cikis",
        "late checkout",
        "später check-out",
        "spater check-out",
        "późne wymeldowanie",
        "pozne wymeldowanie",
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
    # «doğum günü» burada değil: _fuzzy_has «dolum»≈«doğum» ile minibar dolum taleplerini kutlamaya düşürüyordu.
    "birthday",
    "geburtstag",
    "urodziny",
    "balayı",
    "balayi",
    "honeymoon",
    "flitterwochen",
    "podróż poślubna",
    "yıldönümü",
    "yildonumu",
    "anniversary",
    "jahrestag",
    "rocznica",
    "sürpriz",
    "surpriz",
    "surprise",
    "überraschung",
    "niespodzianka",
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
    "fødselsdag",
    "fodselsdag",
    "verjaardag",
    "narozeniny",
    "ziua de naștere",
    "ziua de nastere",
    "narodeniny",
    "день рождения",
    "bryllupsdag",
    "bruiloft",
    "svatba",
    "nuntă",
    "nunta",
    "svadba",
    "свадьба",
]
HEALTH_NOTIF_WORDS = [
    "hamile",
    "hamileyim",
    "hamilelik",
    "pregnancy",
    "pregnant",
    "schwanger",
    "ciąż",
    "kronik",
    "chronic",
    "chronisch",
    "przewlekł",
    "ilaç",
    "ilac",
    "ilacım",
    "medication",
    "medikament",
    "leków",
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
    "dostępność",
    "dostęp",
    "wózek",
    "engelli",
    "disabled access",
    "graviditet",
    "zwangerschap",
    "těhotenství",
    "tehotenstvi",
    "sarcină",
    "sarcina",
    "tehotenstvo",
    "беременность",
    "kronisk sygdom",
    "chronische aandoening",
    "chronické onemocnění",
    "chronicke onemocneni",
    "afecțiune cronică",
    "afectiune cronica",
    "chronické ochorenie",
    "chronicke ochorenie",
    "хроническое заболевание",
    "medicin",
    "medicijn",
    "léky",
    "leky",
    "medicamente",
    "lieky",
    "лекарства",
    "tilgængelighed",
    "tilgængelig",
    "toegankelijkheid",
    "bezbariérový",
    "bezbarierovy",
    "accesibilitate",
    "bezbariérový prístup",
    "bezbarierovy pristup",
    "доступность",
]
MISAFIR_BILDIRIM_STRICT = [
    "misafir bildirimi",
    "misafir bildirim",
    "guest notification",
    "gästemitteilung",
    "bildirim formu",
    "otel bilgilendirme",
    "bilgilendirmek istiyorum",
    # Sağlık / erişilebilirlik / özel durum — diyet anahtarı geçmeyen uzun ifadeler
    "özel ihtiyaç durumumu",
    "ozel ihtiyac durumumu",
    "özel ihtiyaç durumum",
    "ozel ihtiyac durumum",
    "ek sağlık bilgisi",
    "ek saglik bilgisi",
    "sağlık bilgisi paylaşmak",
    "saglik bilgisi paylasmak",
    "health information to share",
    "gæstenotifikation",
    "gaestenotifikation",
    "gæstemeddelelse",
    "gaestemeddelelse",
    "gastmelding",
    "melding til hotellet",
    "oznámení pro hotel",
    "oznameni pro hotel",
    "notificare oaspete",
    "notificare pentru hotel",
    "oznámenie hosťa",
    "oznamenie hosta",
    "уведомление гостя",
    "гостевое уведомление",
]

# «Cihaz» adı geçmeyen kısa cümleler — LLM yokken deterministik yönlendirme (service_info sonrası, FAULT_WORDS öncesi).
GENERIC_ROOM_REQUEST_WISH_STRICT_PHRASES = [
    "oda için isteğim var",
    "oda icin istegim var",
    "oda için bir isteğim var",
    "oda icin bir istegim var",
    "bir ihtiyacım var",
    "bir ihtiyacim var",
    "bir ihtiyacımız var",
    "bir ihtiyacimiz var",
    "bir talebim olacak",
    "bir talebim var",
    "talebim olacak",
    "talebim var",
    "odamda eksik var",
    "odada eksik var",
    "i have a room request",
    "ich habe eine zimmeranfrage",
    "jeg har en værelsesanmodning",
    "jeg har en vaerelsesanmodning",
    "ik heb een kamerverzoek",
    "mám požadavek na pokoj",
    "mam pozadavek na pokoj",
    "am o cerere la cameră",
    "am o cerere la camera",
    "mám požiadavku na izbu",
    "mam poziadavku na izbu",
    "у меня запрос в номер",
]
GENERIC_ROOM_PROBLEM_OR_TECH_FAULT_STRICT_PHRASES = [
    "odamda bir sorun var",
    "odamda sorun var",
    "odada bir sorun var",
    "odada sorun var",
    "there is a problem in my room",
    "there's a problem in my room",
    "something wrong in my room",
    "teknik destek lazım",
    "teknik destek lazim",
    "teknik destek istiyorum",
    "teknik destek isterim",
    "teknik destek talebim var",
    "arıza var",
    "ariza var",
    "bir arıza var",
    "bir ariza var",
    "destek rica ediyorum",
    "destek rica ederim",
    "technical support please",
    "need technical support",
    "technical help please",
    "technischer support bitte",
    "potrzebuję wsparcia technicznego",
    "potrzebuje wsparcia technicznego",
    "jeg har brug for teknisk support",
    "teknisk support venligst",
    "technische ondersteuning",
    "ik heb technische ondersteuning nodig",
    "potřebuji technickou podporu",
    "potrebuji technickou podporu",
    "am nevoie de suport tehnic",
    "potrebujem technickú podporu",
    "нужна техническая поддержка",
    "техническая поддержка",
    "нужен техник",
]

SPECIAL_WORDS = [
    # Dietary preference
    "vegan",
    "vejetaryen",
    "vejetaryenim",
    "vegetarian",
    "vegetarier",
    "vegetari",
    "wegetarian",
    # Dietary medical restriction
    "çölya",
    "çölyak",
    "colyak",
    "celiac",
    "zöliakie",
    "celiakia",
    "gluten",
    "guluten",
    "glutten",
    "glutenfree",
    "gluten free",
    "glutenfrei",
    "bez glutenu",
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
    "laktoza",
    "mleko",
    # Allergy
    "alerji",
    "allergy",
    "allergie",
    "alergia pokarmowa",
    "fıstık",
    "peanut",
    "erdnuss",
    "orzeszki ziemne",
    "nuts",
    # Baby nutrition only (not crib/bed — those go to İstek / bebek ekipmanı kuralı)
    "baby food",
    "babynahrung",
    "żywność dla niemowląt",
    "bebek maması",
    "bebek mamasi",
]

# Chat istek formu — kategori id’leri web / form_schema / guest-requests ile aynı.
# Liste sırası önemli: önce daha özgül ifadeler (turndown, çarşaf…) sonra genel olanlar.
REQUEST_ITEM_CATEGORY_PHRASES: list[tuple[str, list[str]]] = [
    (
        "turndown",
        [
            "yatak düzenleme",
            "yatak duzenleme",
            "yatak düzenle",
            "yatak duzenle",
            "bed turndown",
            "turndown",
            "turn down",
            "turn-down",
        ],
    ),
    (
        "bedding_sheet",
        [
            "çarşaf değişim",
            "carsaf degisim",
            "çarşaf değişimi",
            "carsaf degisimi",
            "sheet change",
            "nevresim",
            "duvet cover",
            "yatak takımı",
            "yatak takimi",
            "bedding",
            "bettwäsche",
            "bettwasche",
            "laken",
            "bettlaken",
            "sheets",
            "bed sheets",
            "çarşaf",
            "carsaf",
            "lagen",
            "lagen skift",
            "lakens verversen",
            "vers linnen",
            "prostěradlo",
            "prosteradlo",
            "cearșaf",
            "cearsaf",
            "prestieradlo",
            "простыня",
            "смена белья",
        ],
    ),
    (
        "bedding_pillow",
        [
            "yastık",
            "yastik",
            "pillow",
            "kissen",
            "poduszka",
        ],
    ),
    (
        "bedding_blanket",
        [
            "battaniye",
            "battiye",
            "batiye",
            "battainiye",
            "batniye",
            "blanket",
            "duvet",
            "decke",
            "koc",
        ],
    ),
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
            "sprzątanie pokoju",
            "genel temizlik",
            "temizlik hizmeti",
            "værelsesrengøring",
            "vaerelsesrengoring",
            "rengøring af værelset",
            "rengoring af vaerelset",
            "kamer schoonmaken",
            "schoonmaak kamer",
            "uklid pokoje",
            "úklid pokoje",
            "curatenie in camera",
            "curățenie cameră",
            "upratovanie izby",
            "уборка номера",
            "уборка в номере",
        ],
    ),
    (
        "minibar_refill",
        [
            "minibar dolum",
            "minibar yenile",
            "minibar yenileme",
            "minibar refill",
            "minibar restock",
            "minibar",
            "mini bar",
            "mini-bar",
            "minibar påfyldning",
            "minibar genopfyldning",
            "minibar bijvullen",
            "minibar doplnění",
            "minibar doplneni",
            "reumplere minibar",
            "doplnenie minibar",
            "пополнение мини-бара",
            "мини-бар пустой",
        ],
    ),
    (
        "bottled_water",
        [
            "şişe su",
            "sise su",
            "su şişe",
            "su sise",
            "su şişesi",
            "su sisesi",
            "bottled water",
            "water bottle",
            "wasserflasche",
            "butelka wody",
            "flaskevand",
            "mineralvand",
            "fles water",
            "waterfles",
            "láhev vody",
            "lahev vody",
            "apă îmbuteliată",
            "apa imbuteliata",
            "fľaša vody",
            "flasa vody",
            "бутилированная вода",
            "бутылка воды",
        ],
    ),
    (
        "tea_coffee",
        [
            "çay kahve",
            "cay kahve",
            "çay–kahve",
            "cay-kahve",
            "tea coffee",
            "coffee and tea",
            "tea and coffee",
            "çay kahve seti",
            "cay kahve seti",
            "kahve seti",
            "çay seti",
            "cay seti",
            "tea tray",
            "coffee tray",
            "te og kaffe",
            "thee en koffie",
            "čaj a káva",
            "caj a kava",
            "ceai și cafea",
            "ceai si cafea",
            "чай и кофе",
        ],
    ),
    (
        "toilet_paper",
        [
            "tuvalet kağıdı",
            "tuvalet kagidi",
            "toilet paper",
            "klopapier",
            "papier toaletowy",
            "toiletpapir",
            "wc papir",
            "toiletpapier",
            "wc papier",
            "toaletní papír",
            "toaletni papir",
            "hartie igienica",
            "toaletný papier",
            "toaletni papier",
            "туалетная бумага",
        ],
    ),
    (
        "toiletries",
        [
            "şampuan sabun",
            "sampuan sabun",
            "şampuan",
            "sampuan",
            "sabun",
            "shampoo",
            "soap",
            "toiletries",
            "shampoo og sæbe",
            "shampoo og saebe",
            "shampoo en zeep",
            "šampon",
            "sampon",
            "săpun",
            "sapun",
            "mydlo",
            "гель для душа",
            "шампунь",
        ],
    ),
    (
        "climate_request",
        [
            "klima ayar",
            "klima ayarı",
            "klima ayari",
            "klima istiyorum",
            "thermostat",
            "air conditioning",
            "klimat",
            "aircondition",
            "airco",
            "klimaanlæg",
            "klimaanlaeg",
            "airconditioning",
            "klimatizace",
            "aer conditionat",
            "klimatizácia",
            "klimatizacia",
            "кондиционер",
        ],
    ),
    (
        "room_refresh",
        [
            "oda kokusu",
            "koku giderici",
            "air freshener",
            "raumspray",
            "room spray",
            "værelsesduft",
            "vaerelsesduft",
            "roomspray",
            "luchtverfrisser",
            "osvěžovač vzduchu",
            "osvezovac vzduchu",
            "odorizant cameră",
            "odorizant camera",
            "osviežovač vzduchu",
            "osviezovac vzduchu",
            "освежитель воздуха",
        ],
    ),
    (
        "slippers",
        [
            "terlik",
            "slippers",
            "hausschuhe",
            "kapcie",
            "hjemmesko",
            "pantoffels",
            "pantofle",
            "papuci",
            "papuci de casa",
            "papuče",
            "papuce",
            "тапочки",
        ],
    ),
    (
        "bathrobe",
        [
            "bornoz",
            "bathrobe",
            "bademantel",
            "szlafrok",
            "badekåbe",
            "badekabe",
            "badjas",
            "župan",
            "zupan",
            "halat de baie",
            "халат",
        ],
    ),
    (
        "hanger",
        [
            "ek askı",
            "ek aski",
            "askı",
            "aski",
            "hanger",
            "kleiderbügel",
            "kleiderbugel",
            "wieszak",
            "oda ekipmanı",
            "oda ekipmani",
            "room equipment",
        ],
    ),
    (
        "kettle",
        [
            "su ısıtıcı",
            "su isitici",
            "su ısıtıcısı",
            "su isiticisi",
            "çaydanlık",
            "caydanlik",
            "kettle",
            "wasserkocher",
            "czajnik",
            "elkedel",
            "vandkoger",
            "waterkoker",
            "rychlovarná konvice",
            "rychlovarna konvice",
            "fierbător",
            "fierbator",
            "varná kanvica",
            "varna kanvica",
            "чайник",
            "электрический чайник",
        ],
    ),
    (
        "room_safe",
        [
            "kasa aç",
            "kasa ac",
            "oda kasası",
            "oda kasasi",
            "room safe",
            "safe box",
            "tresor",
            "sejf",
            "hotel safe",
            "værelsessafe",
            "vaerelsessafe",
            "kluisje",
            "trezor v pokoji",
            "seif camera",
            "sejf v izbe",
            "сейф в номере",
        ],
    ),
    (
        "baby_bed",
        [
            "bebek yatağı",
            "bebek yatagi",
            "bebek yatağına",
            "bebek yatagina",
            "bebek yatağa",
            "bebek yataga",
            "baby bed",
            "crib",
            "cot",
            "kinderbett",
            "reisebett",
            "travel cot",
            "beşik",
            "besik",
            "babyseng",
            "baby seng",
            "babybedje",
            "dětská postýlka",
            "detska postylka",
            "pătuț copii",
            "patut copii",
            "detská postieľka",
            "detska postielka",
            "детская кроватка",
            "детская кровать",
        ],
    ),
    # Web: «Ek oda havlusu» (room_towel). «havlu»/towel_extra’dan önce — aksi halde «oda havlusu» ek havluya düşer.
    (
        "room_towel",
        [
            "oda havlusu",
            "oda havlus",
            "ek oda havlusu",
            "ek oda havlus",
            "banyo havlusu",
            "banyo havlus",
            "room towel",
            "room towels",
            "bath towel",
            "bath towels",
            "hand towel",
            "hand towels",
            "zimmerhandtuch",
            "zimmerhandtücher",
            "zimmerhandtucher",
            "ręcznik do pokoju",
            "værelseshåndklæde",
            "vaerelseshandklæde",
            "kamerhanddoek",
            "ručník na pokoj",
            "rucnik na pokoj",
            "prosop cameră",
            "prosop camera",
            "uterák do izby",
            "uterak do izby",
            "номерное полотенце",
        ],
    ),
    (
        "towel_extra",
        [
            "ek havlu",
            "extra towel",
            "havlu talebi",
            "plaj havlusu",
            "beach towel",
            "pool towel",
            "havlu",
            "havlum",
            "towel",
            "towels",
            "handtuch",
            "handtücher",
            "handtucher",
            "ręcznik",
            "ekstra håndklæde",
            "ekstra handklæde",
            "extra handdoek",
            "plážový ručník",
            "plazovy rucnik",
            "prosop plajă",
            "prosop plaja",
            "plážový uterák",
            "plazovy uterak",
            "пляжное полотенце",
        ],
    ),
]

# Fiil olmadan yazılan kısa oda tedarikleri → istek formu (kahve önerisine düşmesin).
_IMPLICIT_ROOM_SUPPLY_PHRASES: tuple[str, ...] = (
    "çay kahve seti",
    "cay kahve seti",
    "kahve seti",
    "çay seti",
    "cay seti",
    "tea and coffee",
    "coffee and tea",
)


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


def _adjust_water_entity_for_supply_context(normalized_text: str, entity: str | None) -> str | None:
    """
    DEVICE_HINTS «su» → water; metin aslında kettle veya şişe su tedariki ise
    extra_item_request (içme suyu / resepsiyon) yoluna düşmeyi engeller.
    Envanter eşlemesi kaçırıldığında kettle/bottled ifadeleri alt dizgeden yedeklenir.
    """
    if entity != "water":
        return entity
    cat = _request_item_category_from_inventory_phrases(normalized_text)
    if cat in ("bottled_water", "kettle"):
        return None
    tl = (normalized_text or "").lower()
    for cat_id, phrases in REQUEST_ITEM_CATEGORY_PHRASES:
        if cat_id not in ("kettle", "bottled_water"):
            continue
        for p in phrases:
            ps = p.strip().lower()
            if len(ps) < 4 and ps != "kettle":
                continue
            if ps in tl:
                return None
    return entity


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
                    "sprzątanie",
                    "sprzątanie",
                )
            ):
                return "room_cleaning"
    return None


# «su ısıtıcım yok» — odada yok / bende yok = tedarik; kısa EN «kettle yok» bilgi sorusu olarak kalır.
_KETTLE_ABSENCE_IMPLIES_SUPPLY_TR: tuple[str, ...] = (
    "ısıtıcım yok",
    "isiticim yok",
    "ısıtıcımız yok",
    "isiticimiz yok",
    "su ısıtıcım",
    "su isiticim",
    "su ısıtıcısı yok",
    "su isiticisi yok",
    "su ısıtıcı yok",
    "su isitici yok",
    "ısıtıcısı yok",
    "isiticisi yok",
    "odamda yok",
    "odada yok",
    "odamızda yok",
    "odamizda yok",
)


def extract_room_supply_request_entity(text: str) -> str | None:
    """
    Minibar dolum/eksik veya kettle için açık talep → İstek formu.
    «minibar yok» / kısa «kettle yok» (EN) gibi saf bilgi veya var mı soruları → None (RAG).
    TR «su ısıtıcım yok» gibi eksiklik ifadeleri tedarik sayılır.
    """
    raw = text or ""
    if any(_fuzzy_has(raw, w) for w in FAULT_WORDS):
        return None
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
                "pust",
                "uzupełn",
            )
        ):
            return False
        if any(x in t for x in ("var mı", "varmi", "var mi", "is there", "do you have", "haben sie", "czy jest")):
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
                "pust",
                "uzupełn",
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
                "su ısıtıcı",
                "su isitici",
                "wasserkocher",
                "czajnik",
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
        # Eksiklik / oda bağlamı: bilgi sorusu değil, kettle isteği.
        if any(x in t for x in _KETTLE_ABSENCE_IMPLIES_SUPPLY_TR):
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
        if (
            _has_strong_service_request_intent(raw)
            or any(
                x in t
                for x in (
                    "eksik",
                    "gelmedi",
                    "missing",
                    "getir",
                    "getirin",
                    "gönder",
                    "gonder",
                )
            )
            or any(x in t for x in _KETTLE_ABSENCE_IMPLIES_SUPPLY_TR)
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
            "żywność dla niemowląt",
            "żywnosc dla niemowlat",
            "jedzenia dla niemowląt",
            "jedzenia dla niemowlat",
            "pokarm dla niemowląt",
            "pokarm dla niemowlat",
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
            "potrzeb",
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
    if extract_request_category_from_text(text) == "baby_bed":
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
    if any(_fuzzy_has(text, w) for w in FAULT_WORDS):
        return False
    t = (text or "").lower()
    if "kutlam" in t:
        return True
    if any(p in t for p in ("doğum günü", "dogum gunu", "dogumgunu")):
        return True
    if any(_fuzzy_has(text, w) for w in CELEBRATION_NOTIF_WORDS):
        return True
    return False


# «terlik yok odamda» / «bornoz yok» = tedarik talebi. «minibar yok» bilgi (RAG) kalsın (test_minibar_yok).
_INVENTORY_YOK_STRONG_SUPPLY_CATEGORIES: frozenset[str] = frozenset(
    {
        "slippers",
        "bathrobe",
        "bedding_pillow",
        "bedding_blanket",
        "bedding_sheet",
        "towel_extra",
        "room_towel",
        "kettle",
        "hanger",
        "toilet_paper",
        "toiletries",
        "tea_coffee",
        "bottled_water",
        "climate_request",
        "room_refresh",
        "turndown",
        "baby_bed",
        "room_safe",
    }
)


def _inventory_yok_implies_strong_supply_request(text: str) -> bool:
    """
    Envanter kategorisi eşleşiyor + «yok» → güçlü istek (soft hotel_info / RAG düşmesin).
    Yalnızca `_request_item_category_from_inventory_phrases` — `extract_request_category_from_text`
    çağrılmaz (iç içe `_has_strong` döngüsü olmasın).
    """
    tl = (text or "").lower()
    if "yok" not in tl:
        return False
    if any(
        x in tl
        for x in (
            "var mı",
            "varmi",
            "var mi",
            "is there",
            "do you have",
            "haben sie",
            "czy jest",
        )
    ):
        return False
    if any(_fuzzy_has(text, w) for w in FAULT_WORDS):
        return False
    # Kısa EN «kettle yok» bilgi sorusu (RAG); TR «su ısıtıcı yok» ayrı kurallarda.
    compact = re.sub(r"[\s?.!]+", " ", tl).strip()
    if compact in ("kettle yok", "yok kettle", "no kettle"):
        return False
    cat = _request_item_category_from_inventory_phrases(text)
    if cat is None or cat not in _INVENTORY_YOK_STRONG_SUPPLY_CATEGORIES:
        return False
    return True


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
        "potrzebuję",
        "potrzebuje",
        "proszę o ",
        "prosze o ",
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
        # TR — isim tamlaması («talebi» içinde «talep» yok)
        "talebi",
        "talebim",
        "talebimize",
        "isteği",
        "istegi",
        "isteğim",
        "istegim",
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
        "proszę przysłać",
        "można przynieść",
        "trzeba przynieść",
    )
    if any(m in t for m in markers):
        return True
    # TR — oda tedariki: tek kelime → bilgi; bu kalıplar gelince sohbet istek formu / talep akışı.
    _explicit_tr_supply_phrases = (
        "ihtiyacım var",
        "ihtiyacim var",
        "ihtiyacımız var",
        "ihtiyacimiz var",
        "eksik var",
        "eksik bulunuyor",
        "eksik bulunmakta",
        "gönderilmesini istiyorum",
        "gonderilmesini istiyorum",
        "gönderilmesini isterim",
        "gonderilmesini isterim",
        "temin edilmesini istiyorum",
        "temin edilmesini isterim",
        "sağlanmasını istiyorum",
        "saglanmasini istiyorum",
        "sağlanmasını isterim",
        "eklenmesini istiyorum",
        "eklenmesini isterim",
        "değiştirilmesini istiyorum",
        "degistirilmesini istiyorum",
        "yenilenmesini istiyorum",
        "yenilenmesini isterim",
        "getirilmesini istiyorum",
        "getirilmesini isterim",
        "destek talep ediyorum",
        "destek talep",
        "acil lazım",
        "acil lazim",
        "müsaitse gönderin",
        "musaitse gonderin",
        "müsaitse gonderin",
        "mümkünse temin edin",
        "mumkunse temin edin",
        "mümkünse temin",
        "rica ediyorum",
    )
    if any(p in t for p in _explicit_tr_supply_phrases):
        return True
    # «şampuan eksik» vb.: envanterde kategori varken «eksik» / «missing» talep sayılır (soft bilgiye düşmesin).
    if "eksik" in t or re.search(r"(?<![a-z])missing(?![a-z])", t):
        if not any(_fuzzy_has(text, w) for w in FAULT_WORDS):
            if _request_item_category_from_inventory_phrases(text or "") is not None:
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
    if _inventory_yok_implies_strong_supply_request(text):
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
    "haster",
    "øjeblikkeligt",
    "ojeblikkeligt",
    "spoed",
    "direct",
    "nalehavě",
    "nalehave",
    "urgentă",
    "urgenta",
    "naliehavé",
    "naliehave",
    "срочно",
    "сейчас же",
]
OUTSIDE_HOTEL_WORDS = [
    "otel dışında", "otel disinda", "outside hotel", "outside the hotel", "dışarıda", "disarida",
]


def _matches_alanya_discover_intent(normalized_text: str) -> bool:
    """Alanya'da gezi / turistik yer soruları → sabit metin + uygulama modülü."""
    tl = (normalized_text or "").lower()
    has_alanya = "alanya" in tl
    has_en_de_pl_place = any(
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
            "co zobaczyć w alanyi",
            "alanya atrakcje",
            "w alanyi",
            "zwiedzanie alanyi",
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
        "co zobaczyć",
        "zwiedzanie",
        "atrakcje",
        "wyciecz",
    )
    has_tour = any(m in tl for m in tour_markers)
    if has_alanya and has_tour:
        return True
    if has_en_de_pl_place and (has_tour or "see" in tl or "places" in tl or "things" in tl):
        return True
    return False
# Oda servisi — ücretli hizmet; şimdilik yalnız bilgi (RAG), istek formu yok.
_ROOM_SERVICE_SUBSTRINGS: tuple[str, ...] = (
    "oda servisi",
    "oda servis",
    "oda-servisi",
    "room service",
    "room-service",
    "roomservice",
    "zimmerservice",
    "zimmer service",
    "serwis pokojowy",
    "obsługa pokoju",
    "servizio in camera",
)

HOTEL_INFO_WORDS = [
    # Fixed / strong location & service keywords (avoid very generic tokens like "where" alone).
    "spa saat",
    "moss beach",
    "lobi",
    "lobby",
    "gdzie jest lobby",
    "restoran saatleri",
    "restaurant hours",
    "restaurantzeiten",
    "godziny restauracji",
    "havuz ve plaj",
    "pool & beach",
    "pool and beach",
    "pool & strand",
    "basen i plaża",
    "spa ve wellness",
    "spa und wellness",
    "spa & wellness",
    "spa and wellness",
    "spa i wellness",
    "spa i wellness",
    "animasyon",
    "animasyon ve etkinlikler",
    "akşam aktivitesi",
    "aksam aktivitesi",
    "yetişkin aktivitesi",
    "yetiskin aktivitesi",
    # «eğlenmek istiyoruz/istiyorum» burada değil: _fuzzy_has(istiyorum, istiyoruz) DL=1 ile
    # «…oluşturmak istiyorum» gibi cümleleri yanlışlıkla animasyon bilgisine düşürüyordu.
    "yetişkin etkinliği",
    "yetiskin etkinligi",
    "animation & events",
    "animation and events",
    "animation & veranstaltungen",
    "program animacji",
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
    "sprzątanie",
    "pralnia",
    "pralnia chemiczna",
    "prasowanie",

    # "I'm bored" => suggest animations & events
    "canım sıkıldı",
    "canim sikildi",
    "sıkıldım",
    "bored",
    "i am bored",
    "langweilig",
    "mir ist langweilig",
    "nudzi mi się",
    "nudno",
]


def _wants_fun_animation_tr_phrase(text: str) -> bool:
    """TR: eğlenmek + istiyor* — HOTEL_INFO fuzzy listesinde değil (istiyorum/istiyoruz çakışması)."""
    t = (text or "").lower()
    if "eğlenmek" not in t and "eglenmek" not in t:
        return False
    return (
        "istiyoruz" in t
        or "istiyorum" in t
        or "istiyorsunuz" in t
        or "istiyorsun" in t
    )


DEVICE_HINTS = {
    "television": ["televizyon", "tv", "fernseher", "telewizor"],
    "shower": ["duş", "dus", "shower", "dusche", "prysznic"],
    "keycard": ["kart", "kapı kartı", "key card", "karte", "karta"],
    "hvac": ["klima", "ac", "air conditioner", "klimaanlage", "klimatyzacja"],
    "lighting": ["ışık", "isik", "lamba", "light", "lampe", "światło"],
    "internet": ["internet", "wifi", "wi-fi", "kablosuz", "wlan", "internet", "wifi"],
    "kettle": [
        "kettle",
        "su ısıtıcısı",
        "su isiticisi",
        "su ısıtıcı",
        "su isitici",
        "wasserkocher",
        "czajnik",
        "kettele",
        "ketıl",
        "ketil",
    ],
    "minibar": ["minibar", "mini bar"],
    "cabinet": ["dolap", "wardrobe", "schrank", "szafa"],
    "phone": ["telefon", "phone", "telefon"],
    "towel": ["havlu", "towel", "towels", "handtuch", "handtücher", "handtucher", "ręcznik"],
    "blanket": ["battaniye", "battiye", "batiye", "battainiye", "batniye", "blanket", "decke", "koc"],
    "pillow": ["yastık", "yastik", "pillow", "kissen", "poduszka"],
    "water": ["su", "water", "wasser", "woda"],
    # Dietary preference
    "vegan": ["vegan", "wegan", "veganım", "i am vegan"],
    "vegetarian": ["vejetaryen", "vegetarian", "vegetarier", "vejetaryenim", "vejetaryenler", "jestem wegetarianinem", "wegetarianin"],

    # Dietary medical restriction
    "celiac": ["çölya", "çölyak", "colyak", "celiac", "zöliakie", "celiakia"],
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
    "lactose_related_restriction": [
        "laktoz",
        "laktose",
        "lactose",
        "laktozum",
        "laktoza",
        "süt dokunuyor",
        "milk",
        "dairy",
        "mleko",
    ],

    # Allergy
    "allergy": [
        "alerji",
        "alerjen",
        "allergy",
        "allergie",
        "fıstık",
        "peanut",
        "erdnuss",
        "orzechy arachidowe",
        "nuts",
        "nut allergy",
        "peanut allergy",
    ],

    # Baby need
    "baby_need": [
        "baby food",
        "babynahrung",
        "pokarm dla niemowląt",
        "pokarm dla niemowlat",
        "jedzenie dla dziecka",
        "bebek",
        "bebeğim",
        "bebeği",
        "mama",
        "bebeğim için",
    ],

    # Accessibility need
    "accessibility_need": [
        "accessibility",
        "erişilebilirlik",
        "wheelchair",
        "rollstuhl",
        "dostępność",
        "dostepnosc",
        "wózek inwalidzki",
        "wozek inwalidzki",
    ],
    "early_checkin": ["erken giriş", "erken giris", "early checkin"],
    "room_change": ["oda değiş", "oda degis", "room change"],
    "reservation_issue": ["rezervasyonum görünmüyor", "rezervasyon görünmüyor", "reservation not found", "reservation issue"],
    "fixed_restaurant_info": [
        "restoran saatleri",
        "restaurant hours",
        "restaurantzeiten",
        "godziny restauracji",
    ],
    "fixed_pool_beach_info": [
        "havuz ve plaj",
        "pool & beach",
        "pool and beach",
        "pool strand",
        "basen i plaża",
        "basen i plaza",
    ],
    "fixed_spa_info": [
        "spa ve wellness",
        "spa & wellness",
        "spa und wellness",
        "spa and wellness",
        "spa wellness",
        "spa i wellness",
    ],
    "fixed_animation_info": [
        "animasyon ve etkinlikler",
        "animation & events",
        "animation and events",
        "animation veranstaltungen",
        "program animacji",
    ],
}


def _norm_tokens(text: str) -> list[str]:
    return re.findall(r"[a-zA-ZçğıöşüÇĞİÖŞÜąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+", text.lower())


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


# «transferred» içinde «transfer» alt dizgisi var; yalnızca tam kelime kabul et.
_ROUTING_TRANSFER_STANDALONE_RE = re.compile(r"\btransfer\b", re.IGNORECASE)


def _text_matches_transfer_routing_intent(text: str) -> bool:
    """Havalimanı / talep kalıpları + tek başına «transfer» (kelime sınırı)."""
    tl = (text or "").lower()
    if _has_any_phrase_strict(tl, ROUTING_TRANSFER_WORDS):
        return True
    return bool(_ROUTING_TRANSFER_STANDALONE_RE.search(tl))


class RuleEngine:
    def __init__(self, rules_path: Path):
        with open(rules_path, "r", encoding="utf-8") as f:
            self.rules = yaml.safe_load(f) or {}

    @staticmethod
    def matches_late_checkout_guest_notif(normalized_text: str) -> bool:
        """Policy / çoklu cümle yollarında kural ile aynı geç çıkış tespiti."""
        return _matches_late_checkout_guest_notif(normalized_text)

    @staticmethod
    def is_spa_reservation_handoff(normalized_text: str) -> bool:
        return is_spa_reservation_handoff_text(normalized_text)

    @staticmethod
    def is_ala_carte_reservation_handoff(normalized_text: str) -> bool:
        return is_ala_carte_reservation_handoff_text(normalized_text)

    @staticmethod
    def is_premium_reservation_reception_handoff(normalized_text: str) -> bool:
        return is_premium_reservation_reception_handoff_text(normalized_text)

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

    def _try_inventory_strong_request(self, normalized_text: str) -> Optional[IntentResult]:
        """Envanter kategorisi + güçlü talep dili (veya çay/kahve seti gibi kısa tedarik) → istek formu; öneri/şikâyet öncesi."""
        if text_suggests_priority_plumbing_or_electric_fault(normalized_text):
            return None
        if any(_fuzzy_has(normalized_text, w) for w in FAULT_WORDS):
            return None
        tl = (normalized_text or "").lower()
        strong = _has_strong_service_request_intent(normalized_text)
        implicit_eq = (not strong) and any(p in tl for p in _IMPLICIT_ROOM_SUPPLY_PHRASES)
        if not strong and not implicit_eq:
            return None
        cat = _request_item_category_from_inventory_phrases(normalized_text)
        if cat is None:
            cat = extract_request_category_from_text(normalized_text)
        if cat is None and implicit_eq:
            cat = "tea_coffee"
        if cat is None:
            return None
        entity = self._extract_entity(normalized_text)
        if cat == "room_cleaning":
            entity = "housekeeping_service"
        else:
            entity = _adjust_water_entity_for_supply_context(normalized_text, entity)
        sub = self._request_sub_intent(entity)
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

        # Geç çıkış → yalnız misafir bildirimi / resepsiyon akışı (genel istek formu ile karıştırılmaz).
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
        if ("animasyon" in tl_anim or "animation" in tl_anim or "animacj" in tl_anim) and any(
            k in tl_anim
            for k in (
                "program",
                "programı",
                "programi",
                "schedule",
                "tagesprogramm",
                "harmonogram",
                "programu",
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

        inv_req_early = self._try_inventory_strong_request(normalized_text)
        if inv_req_early is not None:
            logger.info("RULE MATCH: request (inventory_strong_or_implicit_supply)")
            return inv_req_early

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
            tl_hk = (normalized_text or "").lower()
            if any(
                m in tl_hk
                for m in (
                    "yetersiz",
                    "yeterli değil",
                    "yeterli degil",
                    "kötü",
                    "kotu",
                    "berbat",
                    "rezalet",
                    "şikayet",
                    "sikayet",
                    "memnun değil",
                    "memnun degil",
                    "kirli",
                    "ilgisiz",
                )
            ):
                logger.info("RULE SKIP: housekeeping_request (complaint_quality_context)")
            else:
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
        if _text_matches_transfer_routing_intent(normalized_text):
            logger.info("RULE MATCH: hotel_info (transfer_module_hint)")
            return IntentResult(
                intent="hotel_info",
                sub_intent="service_information",
                entity="fixed_transfer_module_hint",
                department=None,
                needs_rag=False,
                response_mode="answer",
                confidence=0.97,
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
        if matches_lost_property_complaint_flow(normalized_text):
            logger.info("RULE MATCH: complaint (lost_property_complaint)")
            return IntentResult(
                intent="complaint",
                sub_intent="lost_property_complaint",
                entity=None,
                department="guest_relations",
                needs_rag=False,
                response_mode="guided",
                confidence=0.98,
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

        if _has_any_phrase_strict(normalized_text, GENERIC_ROOM_REQUEST_WISH_STRICT_PHRASES):
            logger.info("RULE MATCH: request (generic_room_wish_strict)")
            return IntentResult(
                intent="request",
                sub_intent="room_supply_request",
                entity=None,
                department="reception",
                needs_rag=False,
                response_mode="guided",
                confidence=0.97,
                source="rule",
            )

        if _has_any_phrase_strict(
            normalized_text, GENERIC_ROOM_PROBLEM_OR_TECH_FAULT_STRICT_PHRASES
        ) and not text_suggests_lost_property_not_room_complaint(normalized_text):
            entity = self._extract_entity(normalized_text)
            sub = self._fault_sub_intent(entity)
            logger.info("RULE MATCH: fault_report (generic_room_problem_or_tech_strict)")
            return IntentResult(
                intent="fault_report",
                sub_intent=sub,
                entity=entity,
                department="reception",
                needs_rag=False,
                response_mode="guided",
                confidence=0.98,
                source="rule",
            )

        if text_suggests_service_experience_complaint(normalized_text):
            entity = self._extract_entity(normalized_text)
            sub = self._complaint_sub_intent(normalized_text, entity)
            logger.info("RULE MATCH: complaint (service_experience)")
            return IntentResult(
                intent="complaint",
                sub_intent=sub,
                entity=entity,
                department="guest_relations",
                needs_rag=False,
                response_mode="guided",
                confidence=0.97,
                source="rule",
            )

        # Strong, deterministic classes first (su kaçağı / elektrik riski: «su» istek kelimesinden önce arıza)
        priority_fault = text_suggests_priority_plumbing_or_electric_fault(normalized_text)
        tl_f = (normalized_text or "").lower()
        missing_part_fault = "eksik parça" in tl_f or "eksik parca" in tl_f
        strict_fault_sub = any(p in tl_f for p in FAULT_STRICT_SUBSTRING_PHRASES)
        if (
            not text_suggests_lost_property_not_room_complaint(normalized_text)
            and (
                any(_fuzzy_has(normalized_text, w) for w in FAULT_WORDS)
                or priority_fault
                or missing_part_fault
                or strict_fault_sub
            )
        ):
            entity = self._extract_entity(normalized_text)
            if text_suggests_tv_signal_fault(normalized_text) and entity in (None, "water"):
                entity = "television"
            elif text_suggests_wifi_connectivity_fault(normalized_text) and entity in (None, "water"):
                entity = "internet"
            elif text_suggests_bulb_or_fixture_break_fault(normalized_text):
                entity = "lighting"
            elif (
                text_suggests_plumbing_leak_or_flood_fault(normalized_text)
                or text_suggests_water_supply_or_pressure_fault(normalized_text)
                or text_suggests_drain_blockage_fault(normalized_text)
            ) and entity in (None, "water"):
                entity = "shower"
            elif text_suggests_electrical_hazard_fault(normalized_text) and entity is None:
                entity = "lighting"
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
            entity = _adjust_water_entity_for_supply_context(normalized_text, entity)
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

        # Uygulamada rezervasyon modülü yok: spa → spa ekibi; à la carte → Misafir İlişkileri; premium masa → resepsiyon.
        if is_spa_reservation_handoff_text(normalized_text):
            logger.info("RULE MATCH: request (spa_booking_contact)")
            return IntentResult(
                intent="request",
                sub_intent="spa_contact_request",
                entity="spa_contact",
                department="reception",
                needs_rag=False,
                response_mode="guided",
                confidence=1.0,
                source="rule",
            )
        if is_ala_carte_reservation_handoff_text(normalized_text):
            logger.info("RULE MATCH: request (ala_carte_reservation_guest_relations)")
            return IntentResult(
                intent="request",
                sub_intent="guest_relations_contact_request",
                entity="ala_carte_reservation",
                department="guest_relations",
                needs_rag=False,
                response_mode="guided",
                confidence=1.0,
                source="rule",
            )
        if is_premium_reservation_reception_handoff_text(normalized_text):
            logger.info("RULE MATCH: request (premium_table_reception)")
            return IntentResult(
                intent="request",
                sub_intent="reception_contact_request",
                entity="premium_table_reservation",
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

        if RuleEngine._kuafor_service_fixed_info_query(normalized_text):
            logger.info("RULE MATCH: hotel_info (kuafor_fixed)")
            return IntentResult(
                intent="hotel_info",
                sub_intent="service_information",
                entity="fixed_kuafor_info",
                department=None,
                needs_rag=False,
                response_mode="answer",
                confidence=0.94,
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

        if RuleEngine._hotel_wayfinding_campus_map_query(normalized_text):
            logger.info("RULE MATCH: hotel_info (wayfinding_rag)")
            return IntentResult(
                intent="hotel_info",
                sub_intent="wayfinding",
                entity="wayfinding_location_rag",
                department=None,
                needs_rag=True,
                response_mode="answer",
                confidence=0.94,
                source="rule",
            )

        if _wants_fun_animation_tr_phrase(normalized_text):
            logger.info("RULE MATCH: hotel_info (want_fun_animation_tr)")
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

        if not text_suggests_service_experience_complaint(normalized_text) and any(
            _fuzzy_has(normalized_text, w) for w in HOTEL_INFO_WORDS
        ):
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
            # Polish
            "polski": "pl",
            "po polsku": "pl",
            "popolsku": "pl",
            "polska proszę": "pl",
            "polska prosze": "pl",
            "proszę po polsku": "pl",
            "prosze po polsku": "pl",
            "mów po polsku": "pl",
            "mow po polsku": "pl",
            "mów po angielsku": "en",
            "mow po angielsku": "en",
            "po angielsku": "en",
            "mów po niemiecku": "de",
            "mow po niemiecku": "de",
            "po niemiecku": "de",
            "mów po turecku": "tr",
            "mow po turecku": "tr",
            "po turecku": "tr",
            "please speak polish": "pl",
            "speak polish": "pl",
            "switch to polish": "pl",
            "bitte polnisch": "pl",
            "auf polnisch": "pl",
            "auf polnisch bitte": "pl",
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
            "auf polnisch wechseln": "pl",
            "wechsel zu polnisch": "pl",
            "bitte polnisch": "pl",
            # Russian
            "русский": "ru",
            "русском": "ru",
            "по-русски": "ru",
            "по русски": "ru",
            "speak russian": "ru",
            "please speak russian": "ru",
            "switch to russian": "ru",
            "russian please": "ru",
            # Danish
            "dansk": "da",
            "på dansk": "da",
            "pa dansk": "da",
            "speak danish": "da",
            "please speak danish": "da",
            "switch to danish": "da",
            # Czech
            "česky": "cs",
            "cesky": "cs",
            "česky prosím": "cs",
            "cesky prosim": "cs",
            "speak czech": "cs",
            "please speak czech": "cs",
            "switch to czech": "cs",
            # Romanian
            "română": "ro",
            "romana": "ro",
            "în română": "ro",
            "in romana": "ro",
            "speak romanian": "ro",
            "please speak romanian": "ro",
            "switch to romanian": "ro",
            # Dutch
            "nederlands": "nl",
            "spreek nederlands": "nl",
            "speak dutch": "nl",
            "please speak dutch": "nl",
            "switch to dutch": "nl",
            # Slovak
            "slovensky": "sk",
            "po slovensky": "sk",
            "slovenčina": "sk",
            "slovencina": "sk",
            "speak slovak": "sk",
            "please speak slovak": "sk",
            "switch to slovak": "sk",
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
        if re.match(rf"^polski\s+{_speak_word}\b", t) or re.match(rf"^po\s+polsku\s+{_speak_word}\b", t):
            return RuleEngine._language_switch_result("pl")

        # German: longer / polite switch phrases
        _de_switch = [
            (r"^sprich\s+(bitte\s+)?englisch", "en"),
            (r"^sprechen\s+sie\s+(bitte\s+)?englisch", "en"),
            (r"^kannst\s+du\s+englisch", "en"),
            (r"^können\s+sie\s+englisch", "en"),
            (r"^sprich\s+(bitte\s+)?türkisch", "tr"),
            (r"^sprich\s+(bitte\s+)?turkisch", "tr"),
            (r"^sprich\s+(bitte\s+)?polnisch", "pl"),
            (r"^sprich\s+(bitte\s+)?deutsch", "de"),
            (r"^wechsel\s+zu\s+türkisch", "tr"),
            (r"^wechsel\s+zu\s+turkisch", "tr"),
            (r"^wechsel\s+zu\s+polnisch", "pl"),
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
            "nie rozumiem",
            "nie rozumiemy",
            "co masz na myśli",
            "co to znaczy",
        }
    )

    @staticmethod
    def _normalize_social_text(text: str) -> str:
        t = (text or "").lower().strip()
        t = re.sub(r"[^a-zA-ZçğıöşüÇĞİÖŞÜäöüßÄÖÜẞąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s'’‘]", " ", t)
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
                "kim jesteś",
            },
            "how_are_you": {
                "nasılsın", "nasilsin", "iyi misin", "naber", "nasıl gidiyor", "nasil gidiyor", "ne haber",
                "how are you", "how are u", "how is it going", "how's it going", "whats up", "what's up",
                "hi how are you", "hello how are you",
                "wie geht's", "wie geht’s", "wie gehts", "wie geht es dir", "wie läuft's", "wie laeufts", "wie läuft es",
                "hallo wie gehts", "hallo wie geht es",
                "jak się masz", "jak leci", "jak leci", "cześć jak się masz", "cześć jak się masz",
            },
            "thanks": {
                "teşekkürler", "teşekkür ederim", "çok teşekkürler",
                "teşekkür", "tesekkur", "tesekkurler", "tesekkur ederim", "cok tesekkurler",
                "sağ ol", "sag ol", "sağ olun", "sag olun",
                "thanks", "thank you", "thanks a lot", "appreciate it",
                "danke", "danke schön", "dankeschön", "vielen dank",
                "dziękuję", "bardzo dziękuję", "dziękuję",
            },
            "farewell": {
                "görüşürüz", "gorusuruz", "hoşça kal", "hosca kal", "iyi günler", "iyi gunler",
                "bye", "goodbye", "see you",
                "tschüss", "tschuss", "auf wiedersehen",
                "pa", "do widzenia",
            },
            "apology_from_user": {
                "kusura bakmayın", "kusura bakmayin", "pardon", "özür dilerim", "ozur dilerim",
                "sorry", "my apologies",
                "entschuldigung", "tut mir leid",
                "przepraszam", "bardzo przepraszam",
            },
            "compliment": {
                "harikasın", "harikasin", "çok iyisin", "cok iyisin",
                "you are great", "awesome", "very helpful",
                "du bist toll", "sehr hilfreich",
                "świetna robota", "bardzo pomocne",
            },
            "greeting": {
                "merhaba", "selam", "günaydın", "gunaydin", "iyi akşamlar", "iyi aksamlar",
                "yardımcı olur musunuz",
                "yardim olur musunuz",
                "bana yardımcı olur musunuz",
                "bana yardim olur musunuz",
                "hi", "hello", "good morning", "good evening",
                "hallo", "guten morgen", "guten abend",
                "cześć", "dzień dobry", "dzień dobry", "dobry wieczór",
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
        if any(x in t for x in ("o której", "kiedy zaczyna się", "harmonogram")):
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
        if "która jest godzina" in t or "ile jest czasu" in t:
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
        if any(k in t for k in ["restoran saatleri", "restaurant hours", "restaurantzeiten", "godziny restauracji"]):
            return "fixed_restaurant_info"
        if any(k in t for k in ["havuz ve plaj", "pool & beach", "pool and beach", "pool & strand", "pool strand", "basen i plaża"]):
            return "fixed_pool_beach_info"
        if any(k in t for k in ["spa ve wellness", "spa & wellness", "spa und wellness", "spa and wellness", "spa wellness", "spa i wellness", "spa i wellness"]):
            return "fixed_spa_info"
        if any(
            k in t
            for k in [
                "animasyon ve etkinlikler",
                "animation & events",
                "animation and events",
                "animation & veranstaltungen",
                "animation veranstaltungen",
                "program animacji",
                "akşam aktivitesi",
                "aksam aktivitesi",
                "yetişkin aktivitesi",
                "yetiskin aktivitesi",
                "eğlenmek istiyoruz",
                "eglenmek istiyoruz",
                "eğlenmek istiyorum",
                "eglenmek istiyorum",
                # boredom -> suggest animations & events
                "canım sıkıldı",
                "canim sikildi",
                "sıkıldım",
                "bored",
                "i am bored",
                "langweilig",
                "mir ist langweilig",
                "nudzi mi się",
                "nudno",
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
                "lody",
                "lody",
                "eiscreme",
                "eis am stiel",
            )
        ):
            return True
        return "eis" in _norm_tokens(t)

    @staticmethod
    def _mentions_laundry_dry_cleaning_topic(text: str) -> bool:
        """Kuru temizleme, çamaşırhane, laundry, ütü (ücretli) vb. — «kutu» gibi yanlış pozitif için token bazlı."""
        t = (text or "").lower()
        if any(
            tok
            in frozenset(
                {
                    "ütü",
                    "utu",
                    "iron",
                    "ironing",
                    "bügeln",
                    "buegeln",
                }
            )
            for tok in _norm_tokens(t)
        ):
            return True
        if any(
            k in t
            for k in (
                "dry cleaning",
                "laundry",
                "çamaşırhane",
                "camasirhane",
                "pralnia chemiczna",
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
                "skarg",
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
        if any(_fuzzy_has(text, w) for w in FAULT_WORDS):
            return False
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
            "sprzątanie",
            "pralnia",
            "pralnia chemiczna",
            "prasowanie",
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
        if t in ("iptal et", "iptal", "vazgeç", "vazgec", "cancel", "abbrechen", "anuluj"):
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
                "masaż",
                "hamam",
                "spa",
                "wellness",
                "peeling",
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
                "cena",
                "koszt",
                "ile",
                "cennik",
                "taryfa",
                "kosztuje",
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
        """Ücretli oda servisi → yalnız bilgi (RAG); «talebi / istiyorum» dahil istek formuna düşmez (şimdilik)."""
        t = (text or "").lower().strip()
        if not any(m in t for m in _ROOM_SERVICE_SUBSTRINGS):
            return False
        if any(_fuzzy_has(text, w) for w in FAULT_WORDS):
            return False
        return True

    @staticmethod
    def _menu_word_or_typo_in(t: str) -> bool:
        """«bar mneü», menyu vb. yazım hataları dahil menü sinyali."""
        if any(x in t for x in ("menü", "menu", "karta dań", "speisekarte", "menyu")):
            return True
        if "mneü" in t or "mneu" in t:
            return True
        if "mnü" in t or " mnu" in t or t.endswith("mnu"):
            return True
        return False

    @staticmethod
    def _matches_restaurants_bars_module_redirect(text: str) -> bool:
        """Havuz Bar / Lobby Bar / Moss menü ve bar içki fiyat listeleri → Restaurant & barlar modülü (uzun metin yok)."""
        t = (text or "").lower()
        # «Moss beach nerede» gibi: önce kampüs yön özeti; moss+beach yanlışlıkla buraya düşmesin.
        if RuleEngine._hotel_wayfinding_campus_map_query(text):
            return False
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
                        "moduł",
                        "aplikacji",
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
                        "godziny restauracji",
                    )
                ):
                    return True
        _tok = set(re.findall(r"[a-zA-ZçğıöşüÇĞİÖŞÜąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+", t))
        has_bar_word = "bar" in _tok or "bars" in _tok
        if any(
            k in t
            for k in ("restoran saatleri", "restaurant hours", "restaurantzeiten", "godziny restauracji")
        ) and not any(m in t for m in ("menü", "menu", "speisekarte", "karta dań", "menyu", "pdf", "mneü", "mneu")):
            return False
        if has_bar_word and RuleEngine._menu_word_or_typo_in(t):
            return True
        if len(t) <= 30 and t.startswith("ar ") and RuleEngine._menu_word_or_typo_in(t):
            return True
        # «beach» burada yok: «Moss Beach» mekân adı; tek başına menü/PDF niyeti sayılmaz (konum ayrı kural).
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
                    "jedzenie",
                )
            )
        ):
            return True
        if ("lobby" in t or "lobi" in t or "lobby" in t) and has_bar_word:
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
                    "napoje",
                    "koktajl",
                )
            ):
                return True
        if has_bar_word:
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
                    "karta dań",
                    "cena",
                    "napoje",
                    "alkohol",
                    "import",
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
                "menu hotelu",
                "menu hotelu",
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
    def _kuafor_service_fixed_info_query(text: str) -> bool:
        """Kuaför / berber / saç — sabit iletişim; arıza ve deneyim şikâyetini ele."""
        t = (text or "").lower()
        if any(_fuzzy_has(text, w) for w in FAULT_WORDS):
            return False
        if text_suggests_service_experience_complaint(text):
            return False
        if any(x in t for x in ("şikayet", "sikayet", "complaint")):
            return False
        markers = (
            "kuaför",
            "kuafor",
            "kuaför hizmet",
            "kuafor hizmet",
            "kuaför randevu",
            "kuafor randevu",
            "berber",
            "berber randevu",
            "saç kesimi",
            "sac kesimi",
            "saç traşı",
            "sac tras",
            "hairdresser",
            "hair salon",
            "hair cut",
            "haircut",
            "hair stylist",
            "friseur",
            "frisör",
            "frisor",
            "coiffeur",
            "fryzjer",
            "strzyżenie",
            "fryzura",
        )
        return any(m in t for m in markers)

    @staticmethod
    def _hotel_wayfinding_campus_map_query(text: str) -> bool:
        """«Nerede», «nasıl giderim», where is — tesis içi tek nokta yanıtı (RAG / vektör mağazası)."""
        t = (text or "").lower()
        if any(_fuzzy_has(text, w) for w in FAULT_WORDS):
            return False
        if text_suggests_service_experience_complaint(text):
            return False
        if _matches_alanya_discover_intent(text):
            return False
        if _has_any_phrase_strict(text, OUTSIDE_HOTEL_WORDS):
            return False
        # Şehir / havaalanı tek başına — kampüs haritası yerine genel bilgi/RAG
        if any(x in t for x in ("alanya", "Alanya", "havaalanı", "havalimani", "airport", "flughafen", "lotnisko")):
            return False
        loc_markers = (
            "nerede",
            "nerde",  # konuşma dili («otopark nerde», «moss beach nerde»)
            "nereye",
            "nasıl gider",
            "nasil gider",
            "nasıl gideceğ",
            "nasil gideceg",
            "nasıl ulaş",
            "nasil ulas",
            "konum",
            "yeri neresi",
            "yer neresi",
            "bulamıyorum",
            "bulamiyorum",
            "yol tarifi",
            "hangi blok",
            "hangi katta",
            "where is",
            "where can i find",
            "where do i find",
            "how do i get",
            "how to get",
            "how can i get",
            "directions to",
            "location of",
            "which floor",
            "which block",
            "wo ist",
            "wie komme ich",
            "wie gelange ich",
            "standort",
            "weg zum",
            "gdzie jest",
            "jak dojść",
            "jak przejść",
            "zlokalizowany",
        )
        return any(m in t for m in loc_markers)

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
                "wymeldowanie",
                "zameldowanie",
            }
        ) | multiword_ok
        return raw in singles

    @staticmethod
    def _is_checkin_checkout_time_query(text: str) -> bool:
        """
        Detect questions like:
        - "giriş saat kaçta", "çıkış saat kaçta"
        - English/German/Polish (and other) equivalents where time is requested.
        """
        t = (text or "").lower()

        # Turkish: "giriş/çıkış" + ("saat" or "kaçta") + "kaç"
        if any(x in t for x in ["giriş", "giris", "check-in", "check in", "checkin", "zameldowanie"]) and (
            any(x in t for x in ["saat", "time", "czas", "hours"]) or any(x in t for x in ["kaçta", "kac ta", "kac"])  # quick formats
        ):
            if any(x in t for x in ["kaç", "kac", "what", "hangi", "how", "kiedy", "o której godzinie"]):
                return True

        if any(x in t for x in ["çıkış", "cikis", "check-out", "check out", "checkout", "abreise", "wymeldowanie"]) and (
            any(x in t for x in ["saat", "time", "czas", "hours"]) or any(x in t for x in ["kaçta", "kac ta", "kac"])
        ):
            if any(x in t for x in ["kaç", "kac", "what", "hangi", "how", "kiedy", "o której godzinie"]):
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
                "skarga",
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
            or "hałas" in text
            or "halas" in text
        ):
            return "noise_complaint"
        if "temizlik" in text or "clean" in text:
            return "cleanliness_complaint"
        if "personel" in text or "staff" in text:
            return "staff_complaint"
        if text_suggests_lost_property_not_room_complaint(text):
            return "lost_property_complaint"
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
                or "hałas" in text
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
                or "brud" in text
            ):
                return "cleanliness_complaint"
            if "personel" in text or "staff" in text or "personel" in text:
                return "staff_complaint"
            if "oda" in text or "room" in text or "zimmer" in text or "pokój" in text:
                return "room_condition_complaint"
        return "service_complaint"

    @staticmethod
    def _request_sub_intent(entity: str | None) -> str:
        if entity in ("towel", "blanket", "pillow", "water"):
            return "extra_item_request"
        if entity == "housekeeping_service":
            return "housekeeping_request"
        if entity in ("reception_contact", "premium_table_reservation"):
            return "reception_contact_request"
        if entity == "guest_relations_contact":
            return "guest_relations_contact_request"
        if entity == "transfer_request":
            return "transfer_request"
        if entity == "lunch_box_request":
            return "lunch_box_request"
        if entity == "spa_contact":
            return "spa_contact_request"
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

