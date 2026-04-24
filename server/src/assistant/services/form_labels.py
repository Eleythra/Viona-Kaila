from __future__ import annotations

from typing import Literal, Dict

from assistant.core.chatbot_languages import CHATBOT_UI_LANG_SET, FORM_LABEL_FALLBACK_ORDER
from assistant.services.form_labels_extra_langs import merge_extra_lang_columns

Lang = Literal["tr", "en", "de", "pl"]


# `js/requests/config.js` requestSections.sectionKey → `js/i18n.js` ile aynı metinler.
REQUEST_SECTION_LABELS: Dict[str, Dict[Lang, str]] = {
    "reqReqSecTowels": {
        "tr": "Yastık, havlu, bornoz ve terlik",
        "en": "Pillow, towels, bathrobe & slippers",
        "de": "Kissen, Handtücher, Bademantel & Hausschuhe",
        "pl": "Poduszka, ręczniki, szlafrok i kapcie",
    },
    "reqReqSecBedding": {
        "tr": "Çarşaf ve battaniye",
        "en": "Sheets & blanket",
        "de": "Bettwäsche & Decke",
        "pl": "Pościel i koc",
    },
    "reqReqSecRoomService": {
        "tr": "Oda hizmeti",
        "en": "Room service",
        "de": "Zimmerservice",
        "pl": "Obsługa pokoju",
    },
    "reqReqSecMinibarDrinks": {
        "tr": "Şişe su ve çay / kahve",
        "en": "Bottled water & tea / coffee",
        "de": "Flaschenwasser & Tee / Kaffee",
        "pl": "Woda butelkowana i herbata / kawa",
    },
    "reqReqSecBathAmenities": {
        "tr": "Tuvalet kağıdı ve şampuan / sabun",
        "en": "Toilet paper & shampoo / soap",
        "de": "Toilettenpapier & Shampoo / Seife",
        "pl": "Papier toaletowy i szampon / mydło",
    },
    "reqReqSecComfort": {
        "tr": "Konfor ve klima",
        "en": "Comfort & climate",
        "de": "Komfort & Klima",
        "pl": "Komfort i klimatyzacja",
    },
    "reqReqSecEquipment": {
        "tr": "Ekipman",
        "en": "Equipment",
        "de": "Ausstattung",
        "pl": "Wyposażenie",
    },
    "reqReqSecOther": {
        "tr": "Diğer",
        "en": "Other",
        "de": "Sonstiges",
        "pl": "Inne",
    },
}

CATEGORY_LABELS: Dict[str, Dict[str, Dict[Lang, str]]] = {
    "request": {
        "towel_extra": {
            "tr": "Ek havlu",
            "en": "Extra towels",
            "de": "Extra Handtücher",
            "pl": "Dodatkowe ręczniki",
        },
        "room_towel": {
            "tr": "Ek oda havlusu",
            "en": "Extra room towels",
            "de": "Zusätzliche Zimmerhandtücher",
            "pl": "Dodatkowe ręczniki do pokoju",
        },
        "bathrobe": {
            "tr": "Bornoz",
            "en": "Bathrobe",
            "de": "Bademantel",
            "pl": "Szlafrok",
        },
        "bedding_sheet": {
            "tr": "Çarşaf / nevresim",
            "en": "Sheets / duvet cover",
            "de": "Laken / Bezug",
            "pl": "Prześcieradła / poszewka na kołdrę",
        },
        "bedding_pillow": {
            "tr": "Yastık",
            "en": "Pillow",
            "de": "Kissen",
            "pl": "Poduszka",
        },
        "bedding_blanket": {
            "tr": "Battaniye",
            "en": "Blanket",
            "de": "Decke",
            "pl": "Koc",
        },
        "room_cleaning": {
            "tr": "Oda temizliği",
            "en": "Room cleaning",
            "de": "Zimmerreinigung",
            "pl": "Sprzątanie pokoju",
        },
        "turndown": {
            "tr": "Yatak düzenleme",
            "en": "Turndown service",
            "de": "Turndown-Service",
            "pl": "Serwis wieczorny (turndown)",
        },
        "slippers": {
            "tr": "Terlik",
            "en": "Slippers",
            "de": "Hausschuhe",
            "pl": "Kapcie",
        },
        "minibar_refill": {
            "tr": "Minibar yenileme",
            "en": "Minibar refill",
            "de": "Minibar auffüllen",
            "pl": "Uzupełnienie minibaru",
        },
        "bottled_water": {
            "tr": "Şişe su",
            "en": "Bottled water",
            "de": "Flaschenwasser",
            "pl": "Woda butelkowana",
        },
        "tea_coffee": {
            "tr": "Çay / kahve",
            "en": "Tea / coffee",
            "de": "Tee / Kaffee",
            "pl": "Herbata / kawa",
        },
        "toilet_paper": {
            "tr": "Tuvalet kağıdı",
            "en": "Toilet paper",
            "de": "Toilettenpapier",
            "pl": "Papier toaletowy",
        },
        "toiletries": {
            "tr": "Şampuan / sabun",
            "en": "Shampoo / soap",
            "de": "Shampoo / Seife",
            "pl": "Szampon / mydło",
        },
        "climate_request": {
            "tr": "Klima ayarı",
            "en": "AC adjustment",
            "de": "Klimaanlage einstellen",
            "pl": "Regulacja klimatyzacji",
        },
        "room_refresh": {
            "tr": "Oda kokusu",
            "en": "Room scent",
            "de": "Raumduft",
            "pl": "Zapach do pokoju",
        },
        "hanger": {
            "tr": "Askı",
            "en": "Hanger",
            "de": "Kleiderbügel",
            "pl": "Wieszak",
        },
        "kettle": {
            "tr": "Su ısıtıcı",
            "en": "Kettle",
            "de": "Wasserkocher",
            "pl": "Czajnik",
        },
        "room_safe": {
            "tr": "Kasa",
            "en": "Safe",
            "de": "Safe",
            "pl": "Sejf",
        },
        "baby_bed": {
            "tr": "Bebek yatağı",
            "en": "Baby bed",
            "de": "Babybett",
            "pl": "Łóżeczko dziecięce",
        },
        "towel": {
            "tr": "Havlu",
            "en": "Towel",
            "de": "Handtuch",
            "pl": "Ręcznik",
        },
        "bedding": {
            "tr": "Yatak takımı",
            "en": "Bedding",
            "de": "Bettwäsche",
            "pl": "Pościel",
        },
        "minibar": {
            "tr": "Minibar",
            "en": "Minibar",
            "de": "Minibar",
            "pl": "Minibar",
        },
        "baby_equipment": {
            "tr": "Bebek ekipmanları",
            "en": "Baby equipment",
            "de": "Babyausstattung",
            "pl": "Wyposażenie dla dzieci",
        },
        "room_equipment": {
            "tr": "Oda ekipmanları",
            "en": "Room equipment",
            "de": "Zimmerequipment",
            "pl": "Wyposażenie pokoju",
        },
        "other": {
            "tr": "Diğer",
            "en": "Other",
            "de": "Sonstiges",
            "pl": "Inne",
        },
    },
    "fault": {
        "hvac": {
            "tr": "Klima / Isıtma",
            "en": "HVAC",
            "de": "Klima / Heizung",
            "pl": "Klimatyzacja",
        },
        "electric": {
            "tr": "Elektrik",
            "en": "Electricity",
            "de": "Elektrik",
            "pl": "Elektryka",
        },
        "water_bathroom": {
            "tr": "Su / Banyo",
            "en": "Water / Bathroom",
            "de": "Wasser / Bad",
            "pl": "Woda / łazienka",
        },
        "tv_electronics": {
            "tr": "TV / Elektronik",
            "en": "TV / Electronics",
            "de": "TV / Elektronik",
            "pl": "TV / elektronika",
        },
        "door_lock": {
            "tr": "Kapı kilidi",
            "en": "Door lock",
            "de": "Türschloss",
            "pl": "Zamek do drzwi",
        },
        "furniture_item": {
            "tr": "Mobilya",
            "en": "Furniture",
            "de": "Möbel",
            "pl": "Meble",
        },
        "cleaning_equipment_damage": {
            "tr": "Temizlik ekipmanı hasarı",
            "en": "Cleaning equipment damage",
            "de": "Reinigungsgerät Schaden",
            "pl": "Uszkodzenie sprzętu sprzątającego",
        },
        "balcony_window": {
            "tr": "Balkon / Pencere",
            "en": "Balcony / Window",
            "de": "Balkon / Fenster",
            "pl": "Balkon / okno",
        },
        "other": {
            "tr": "Diğer",
            "en": "Other",
            "de": "Sonstiges",
            "pl": "Inne",
        },
    },
    "complaint": {
        "room_cleaning": {
            "tr": "Oda temizliği",
            "en": "Room cleaning",
            "de": "Zimmerreinigung",
            "pl": "Sprzątanie pokoju",
        },
        "noise": {
            "tr": "Gürültü",
            "en": "Noise",
            "de": "Lärm",
            "pl": "Hałas",
        },
        "climate": {
            "tr": "Isı / Klima",
            "en": "Climate",
            "de": "Klima",
            "pl": "Klimatyzacja",
        },
        "room_comfort": {
            "tr": "Oda konforu",
            "en": "Room comfort",
            "de": "Zimmerkomfort",
            "pl": "Komfort pokoju",
        },
        "minibar": {
            "tr": "Minibar",
            "en": "Minibar",
            "de": "Minibar",
            "pl": "Minibar",
        },
        "restaurant_service": {
            "tr": "Restoran servisi",
            "en": "Restaurant service",
            "de": "Restaurantservice",
            "pl": "Obsługa restauracji",
        },
        "staff_behavior": {
            "tr": "Personel davranışı",
            "en": "Staff behavior",
            "de": "Mitarbeiterverhalten",
            "pl": "Zachowanie personelu",
        },
        "general_areas": {
            "tr": "Genel alanlar",
            "en": "General areas",
            "de": "Allgemeine Bereiche",
            "pl": "Strefy ogólne",
        },
        "hygiene": {
            "tr": "Hijyen",
            "en": "Hygiene",
            "de": "Hygiene",
            "pl": "Higiena",
        },
        "internet_tv": {
            "tr": "İnternet / TV",
            "en": "Internet / TV",
            "de": "Internet / TV",
            "pl": "Internet / TV",
        },
        "lost_property": {
            "tr": "Kayıp eşya",
            "en": "Lost property",
            "de": "Verlorenes Eigentum / Fundsachen",
            "pl": "Zgubione rzeczy",
        },
        "other": {
            "tr": "Diğer",
            "en": "Other",
            "de": "Sonstiges",
            "pl": "Inne",
        },
    },
    "guest_notification": {
        "allergen_notice": {
            "tr": "Alerjen bildirimi",
            "en": "Allergen notice",
            "de": "Allergenhinweis",
            "pl": "Informacja o alergenach",
        },
        "gluten_sensitivity": {
            "tr": "Gluten hassasiyeti",
            "en": "Gluten sensitivity",
            "de": "Glutenunverträglichkeit",
            "pl": "Nietolerancja glutenu",
        },
        "lactose_sensitivity": {
            "tr": "Laktoz hassasiyeti",
            "en": "Lactose sensitivity",
            "de": "Laktoseunverträglichkeit",
            "pl": "Nietolerancja laktozy",
        },
        "vegan_vegetarian": {
            "tr": "Vegan / vejetaryen",
            "en": "Vegan / vegetarian",
            "de": "Vegan / vegetarisch",
            "pl": "Wegan / wegetarianin",
        },
        "food_sensitivity_general": {
            "tr": "Genel gıda hassasiyeti",
            "en": "General food sensitivity",
            "de": "Allgemeine Nahrungsmittelunverträglichkeit",
            "pl": "Ogólna wrażliwość pokarmowa",
        },
        "chronic_condition": {
            "tr": "Kronik rahatsızlık",
            "en": "Chronic condition",
            "de": "Chronische Erkrankung",
            "pl": "Choroba przewlekła",
        },
        "accessibility_special_needs": {
            "tr": "Erişilebilirlik / özel ihtiyaç",
            "en": "Accessibility / special needs",
            "de": "Barrierefreiheit / besondere Bedürfnisse",
            "pl": "Dostępność / specjalne potrzeby",
        },
        "pregnancy": {
            "tr": "Hamilelik",
            "en": "Pregnancy",
            "de": "Schwangerschaft",
            "pl": "Ciąża",
        },
        "medication_health_sensitivity": {
            "tr": "İlaç / sağlık hassasiyeti",
            "en": "Medication / health sensitivity",
            "de": "Medikamente / Gesundheit",
            "pl": "Leki / zdrowie",
        },
        "other_health": {
            "tr": "Diğer (sağlık)",
            "en": "Other (health)",
            "de": "Sonstiges (Gesundheit)",
            "pl": "Inne (zdrowie)",
        },
        "birthday_celebration": {
            "tr": "Doğum günü kutlaması",
            "en": "Birthday celebration",
            "de": "Geburtstagsfeier",
            "pl": "Urodziny",
        },
        "honeymoon_anniversary": {
            "tr": "Balayı / yıldönümü",
            "en": "Honeymoon / anniversary",
            "de": "Flitterwochen / Jahrestag",
            "pl": "Podróż poślubna / rocznica",
        },
        "surprise_organization": {
            "tr": "Sürpriz organizasyon",
            "en": "Surprise arrangement",
            "de": "Überraschungsorganisation",
            "pl": "Niespodzianka / organizacja",
        },
        "room_decoration": {
            "tr": "Oda süsleme",
            "en": "Room decoration",
            "de": "Zimmerdekoration",
            "pl": "Dekoracja pokoju",
        },
        "other_celebration": {
            "tr": "Diğer (kutlama)",
            "en": "Other (celebration)",
            "de": "Sonstiges (Feier)",
            "pl": "Inne (świętowanie)",
        },
        "late_checkout": {
            "tr": "Geç çıkış",
            "en": "Late check-out",
            "de": "Späterer Check-out",
            "pl": "Późne wymeldowanie",
        },
    },
}

merge_extra_lang_columns(CATEGORY_LABELS)

FIELD_LABELS: Dict[str, Dict[Lang, str]] = {
    "category": {"tr": "Kategori", "en": "Category", "de": "Kategorie", "pl": "Kategoria"},
    "itemType": {"tr": "Talep türü", "en": "Request type", "de": "Anfragetyp", "pl": "Rodzaj prośby"},
    "quantity": {"tr": "Adet", "en": "Quantity", "de": "Anzahl", "pl": "Ilość"},
    "requestType": {"tr": "Talep tipi", "en": "Request type", "de": "Anfragetyp", "pl": "Rodzaj prośby"},
    "timing": {"tr": "Zaman", "en": "Timing", "de": "Zeitpunkt", "pl": "Czas"},
    "location": {"tr": "Lokasyon", "en": "Location", "de": "Ort", "pl": "Lokalizacja"},
    "urgency": {"tr": "Aciliyet", "en": "Urgency", "de": "Dringlichkeit", "pl": "Pilność"},
}

VALUE_LABELS: Dict[str, Dict[str, Dict[Lang, str]]] = {
    "itemType": {
        "bath_towel": {"tr": "Banyo havlusu", "en": "Bath towel", "de": "Badetuch", "pl": "Ręcznik kąpielowy"},
        "hand_towel": {"tr": "El havlusu", "en": "Hand towel", "de": "Handtuch", "pl": "Ręcznik do rąk"},
        "pillow": {"tr": "Yastık", "en": "Pillow", "de": "Kissen", "pl": "Poduszka"},
        "duvet_cover": {"tr": "Nevresim", "en": "Duvet cover", "de": "Bettbezug", "pl": "Poszewka na kołdrę"},
        "blanket": {"tr": "Battaniye", "en": "Blanket", "de": "Decke", "pl": "Koc"},
        "baby_bed": {"tr": "Bebek yatağı", "en": "Baby bed", "de": "Babybett", "pl": "Łóżeczko dziecięce"},
        "high_chair": {"tr": "Mama sandalyesi", "en": "High chair", "de": "Kinderhochstuhl", "pl": "Krzesełko do karmienia"},
        "bathrobe": {"tr": "Bornoz", "en": "Bathrobe", "de": "Bademantel", "pl": "Szlafrok"},
        "slippers": {"tr": "Terlik", "en": "Slippers", "de": "Hausschuhe", "pl": "Kapcie"},
        "hanger": {"tr": "Askı", "en": "Hanger", "de": "Kleiderbügel", "pl": "Wieszak"},
        "kettle": {"tr": "Kettle / su ısıtıcısı", "en": "Kettle", "de": "Wasserkocher", "pl": "Czajnik"},
        "other": {"tr": "Diğer", "en": "Other", "de": "Sonstiges", "pl": "Inne"},
    },
    "requestType": {
        "general_cleaning": {
            "tr": "Genel temizlik",
            "en": "General cleaning",
            "de": "Allgemeine Reinigung",
            "pl": "Sprzątanie generalne",
        },
        "towel_change": {
            "tr": "Havlu değişimi",
            "en": "Towel change",
            "de": "Handtuchwechsel",
            "pl": "Wymiana ręczników",
        },
        "room_check": {
            "tr": "Oda kontrolü",
            "en": "Room check",
            "de": "Zimmerkontrolle",
            "pl": "Kontrola pokoju",
        },
        "refill": {
            "tr": "Minibar yenileme",
            "en": "Minibar refill",
            "de": "Minibar auffüllen",
            "pl": "Uzupełnienie minibaru",
        },
        "missing_item_report": {
            "tr": "Eksik ürün bildirimi",
            "en": "Missing item report",
            "de": "Fehlenden Artikel melden",
            "pl": "Zgłoszenie brakującego przedmiotu",
        },
        "check_request": {
            "tr": "Minibar kontrol talebi",
            "en": "Minibar check request",
            "de": "Minibar-Prüfung anfordern",
            "pl": "Prośba o kontrolę minibaru",
        },
    },
    "timing": {
        "now": {"tr": "Şimdi", "en": "Now", "de": "Jetzt", "pl": "Teraz"},
        "later": {"tr": "Sonra", "en": "Later", "de": "Später", "pl": "Później"},
    },
    "location": {
        "room_inside": {"tr": "Oda içi", "en": "Inside room", "de": "Im Zimmer", "pl": "W pokoju"},
        "bathroom": {"tr": "Banyo", "en": "Bathroom", "de": "Badezimmer", "pl": "Łazienka"},
        "balcony": {"tr": "Balkon", "en": "Balcony", "de": "Balkon", "pl": "Balkon"},
        "other": {"tr": "Diğer", "en": "Other", "de": "Sonstiges", "pl": "Inne"},
    },
    "urgency": {
        "normal": {"tr": "Normal", "en": "Normal", "de": "Normal", "pl": "Zwykła"},
        "urgent": {"tr": "Acil", "en": "Urgent", "de": "Dringend", "pl": "Pilna"},
    },
}


def _label_from_row(row: Dict[str, str], lang: str | None) -> str:
    code = (lang or "tr").strip().lower()
    if code not in CHATBOT_UI_LANG_SET:
        code = "tr"
    chain: list[str] = [code]
    for alt in FORM_LABEL_FALLBACK_ORDER:
        if alt != code and alt not in chain:
            chain.append(alt)
    for k in chain:
        v = row.get(k)
        if v is not None and str(v).strip() != "":
            return str(v).strip()
    for k in CHATBOT_UI_LANG_SET:
        if k in chain:
            continue
        v = row.get(k)
        if v is not None and str(v).strip() != "":
            return str(v).strip()
    return ""


def category_label(intent: str, category: str, lang: str | None) -> str:
    row = CATEGORY_LABELS.get(intent, {}).get(category, {})
    if not row:
        return category
    return _label_from_row(row, lang) or category


def request_section_label(section_key: str, lang: str | None) -> str:
    row = REQUEST_SECTION_LABELS.get(section_key, {})
    if not row:
        return section_key
    return _label_from_row(row, lang) or section_key


def field_label(field: str, lang: str | None) -> str:
    row = FIELD_LABELS.get(field, {})
    if not row:
        return field
    return _label_from_row(row, lang) or field


def value_label(field: str, value: str, lang: str | None) -> str:
    row = VALUE_LABELS.get(field, {}).get(value, {})
    if not row:
        return value
    return _label_from_row(row, lang) or value

