from __future__ import annotations

from typing import Literal, Dict

Lang = Literal["tr", "en", "de", "ru"]


CATEGORY_LABELS: Dict[str, Dict[str, Dict[Lang, str]]] = {
    "request": {
        "towel": {
            "tr": "Havlu",
            "en": "Towel",
            "de": "Handtuch",
            "ru": "Полотенце",
        },
        "bedding": {
            "tr": "Yatak takımı",
            "en": "Bedding",
            "de": "Bettwäsche",
            "ru": "Постельное бельё",
        },
        "room_cleaning": {
            "tr": "Oda temizliği",
            "en": "Room cleaning",
            "de": "Zimmerreinigung",
            "ru": "Уборка номера",
        },
        "minibar": {
            "tr": "Minibar",
            "en": "Minibar",
            "de": "Minibar",
            "ru": "Мини-бар",
        },
        "baby_equipment": {
            "tr": "Bebek ekipmanları",
            "en": "Baby equipment",
            "de": "Babyausstattung",
            "ru": "Детское оборудование",
        },
        "room_equipment": {
            "tr": "Oda ekipmanları",
            "en": "Room equipment",
            "de": "Zimmerequipment",
            "ru": "Оснащение номера",
        },
        "other": {
            "tr": "Diğer",
            "en": "Other",
            "de": "Sonstiges",
            "ru": "Другое",
        },
    },
    "fault": {
        "hvac": {
            "tr": "Klima / Isıtma",
            "en": "HVAC",
            "de": "Klima / Heizung",
            "ru": "Климат",
        },
        "electric": {
            "tr": "Elektrik",
            "en": "Electricity",
            "de": "Elektrik",
            "ru": "Электрика",
        },
        "water_bathroom": {
            "tr": "Su / Banyo",
            "en": "Water / Bathroom",
            "de": "Wasser / Bad",
            "ru": "Вода / ванная",
        },
        "tv_electronics": {
            "tr": "TV / Elektronik",
            "en": "TV / Electronics",
            "de": "TV / Elektronik",
            "ru": "TV / Электроника",
        },
        "door_lock": {
            "tr": "Kapı kilidi",
            "en": "Door lock",
            "de": "Türschloss",
            "ru": "Дверной замок",
        },
        "furniture_item": {
            "tr": "Mobilya",
            "en": "Furniture",
            "de": "Möbel",
            "ru": "Мебель",
        },
        "cleaning_equipment_damage": {
            "tr": "Temizlik ekipmanı hasarı",
            "en": "Cleaning equipment damage",
            "de": "Reinigungsgerät Schaden",
            "ru": "Повреждение инвентаря",
        },
        "balcony_window": {
            "tr": "Balkon / Pencere",
            "en": "Balcony / Window",
            "de": "Balkon / Fenster",
            "ru": "Балкон / окно",
        },
        "other": {
            "tr": "Diğer",
            "en": "Other",
            "de": "Sonstiges",
            "ru": "Другое",
        },
    },
    "complaint": {
        "room_cleaning": {
            "tr": "Oda temizliği",
            "en": "Room cleaning",
            "de": "Zimmerreinigung",
            "ru": "Уборка номера",
        },
        "noise": {
            "tr": "Gürültü",
            "en": "Noise",
            "de": "Lärm",
            "ru": "Шум",
        },
        "climate": {
            "tr": "Isı / Klima",
            "en": "Climate",
            "de": "Klima",
            "ru": "Климат",
        },
        "room_comfort": {
            "tr": "Oda konforu",
            "en": "Room comfort",
            "de": "Zimmerkomfort",
            "ru": "Комфорт номера",
        },
        "minibar": {
            "tr": "Minibar",
            "en": "Minibar",
            "de": "Minibar",
            "ru": "Мини-бар",
        },
        "restaurant_service": {
            "tr": "Restoran servisi",
            "en": "Restaurant service",
            "de": "Restaurantservice",
            "ru": "Сервис ресторана",
        },
        "staff_behavior": {
            "tr": "Personel davranışı",
            "en": "Staff behavior",
            "de": "Mitarbeiterverhalten",
            "ru": "Поведение персонала",
        },
        "general_areas": {
            "tr": "Genel alanlar",
            "en": "General areas",
            "de": "Allgemeine Bereiche",
            "ru": "Общие зоны",
        },
        "hygiene": {
            "tr": "Hijyen",
            "en": "Hygiene",
            "de": "Hygiene",
            "ru": "Гигиена",
        },
        "internet_tv": {
            "tr": "İnternet / TV",
            "en": "Internet / TV",
            "de": "Internet / TV",
            "ru": "Интернет / ТВ",
        },
        "other": {
            "tr": "Diğer",
            "en": "Other",
            "de": "Sonstiges",
            "ru": "Другое",
        },
    },
    "guest_notification": {
        "allergen_notice": {
            "tr": "Alerjen bildirimi",
            "en": "Allergen notice",
            "de": "Allergenhinweis",
            "ru": "Уведомление об аллергенах",
        },
        "gluten_sensitivity": {
            "tr": "Gluten hassasiyeti",
            "en": "Gluten sensitivity",
            "de": "Glutenunverträglichkeit",
            "ru": "Чувствительность к глютену",
        },
        "lactose_sensitivity": {
            "tr": "Laktoz hassasiyeti",
            "en": "Lactose sensitivity",
            "de": "Laktoseunverträglichkeit",
            "ru": "Непереносимость лактозы",
        },
        "vegan_vegetarian": {
            "tr": "Vegan / vejetaryen",
            "en": "Vegan / vegetarian",
            "de": "Vegan / vegetarisch",
            "ru": "Веган / вегетарианец",
        },
        "food_sensitivity_general": {
            "tr": "Genel gıda hassasiyeti",
            "en": "General food sensitivity",
            "de": "Allgemeine Nahrungsmittelunverträglichkeit",
            "ru": "Общая пищевая чувствительность",
        },
        "chronic_condition": {
            "tr": "Kronik rahatsızlık",
            "en": "Chronic condition",
            "de": "Chronische Erkrankung",
            "ru": "Хроническое состояние",
        },
        "accessibility_special_needs": {
            "tr": "Erişilebilirlik / özel ihtiyaç",
            "en": "Accessibility / special needs",
            "de": "Barrierefreiheit / besondere Bedürfnisse",
            "ru": "Доступность / особые потребности",
        },
        "pregnancy": {
            "tr": "Hamilelik",
            "en": "Pregnancy",
            "de": "Schwangerschaft",
            "ru": "Беременность",
        },
        "medication_health_sensitivity": {
            "tr": "İlaç / sağlık hassasiyeti",
            "en": "Medication / health sensitivity",
            "de": "Medikamente / Gesundheit",
            "ru": "Лекарства / здоровье",
        },
        "other_health": {
            "tr": "Diğer (sağlık)",
            "en": "Other (health)",
            "de": "Sonstiges (Gesundheit)",
            "ru": "Другое (здоровье)",
        },
        "birthday_celebration": {
            "tr": "Doğum günü kutlaması",
            "en": "Birthday celebration",
            "de": "Geburtstagsfeier",
            "ru": "День рождения",
        },
        "honeymoon_anniversary": {
            "tr": "Balayı / yıldönümü",
            "en": "Honeymoon / anniversary",
            "de": "Flitterwochen / Jahrestag",
            "ru": "Медовый месяц / годовщина",
        },
        "surprise_organization": {
            "tr": "Sürpriz organizasyon",
            "en": "Surprise arrangement",
            "de": "Überraschungsorganisation",
            "ru": "Сюрприз / организация",
        },
        "room_decoration": {
            "tr": "Oda süsleme",
            "en": "Room decoration",
            "de": "Zimmerdekoration",
            "ru": "Украшение номера",
        },
        "other_celebration": {
            "tr": "Diğer (kutlama)",
            "en": "Other (celebration)",
            "de": "Sonstiges (Feier)",
            "ru": "Другое (праздник)",
        },
    },
}

FIELD_LABELS: Dict[str, Dict[Lang, str]] = {
    "category": {"tr": "Kategori", "en": "Category", "de": "Kategorie", "ru": "Категория"},
    "itemType": {"tr": "Talep türü", "en": "Request type", "de": "Anfragetyp", "ru": "Тип запроса"},
    "quantity": {"tr": "Adet", "en": "Quantity", "de": "Anzahl", "ru": "Количество"},
    "requestType": {"tr": "Talep tipi", "en": "Request type", "de": "Anfragetyp", "ru": "Тип запроса"},
    "timing": {"tr": "Zaman", "en": "Timing", "de": "Zeitpunkt", "ru": "Время"},
    "location": {"tr": "Lokasyon", "en": "Location", "de": "Ort", "ru": "Локация"},
    "urgency": {"tr": "Aciliyet", "en": "Urgency", "de": "Dringlichkeit", "ru": "Срочность"},
}

VALUE_LABELS: Dict[str, Dict[str, Dict[Lang, str]]] = {
    "itemType": {
        "bath_towel": {"tr": "Banyo havlusu", "en": "Bath towel", "de": "Badetuch", "ru": "Банное полотенце"},
        "hand_towel": {"tr": "El havlusu", "en": "Hand towel", "de": "Handtuch", "ru": "Ручное полотенце"},
        "pillow": {"tr": "Yastık", "en": "Pillow", "de": "Kissen", "ru": "Подушка"},
        "duvet_cover": {"tr": "Nevresim", "en": "Duvet cover", "de": "Bettbezug", "ru": "Пододеяльник"},
        "blanket": {"tr": "Battaniye", "en": "Blanket", "de": "Decke", "ru": "Одеяло"},
        "baby_bed": {"tr": "Bebek yatağı", "en": "Baby bed", "de": "Babybett", "ru": "Детская кроватка"},
        "high_chair": {"tr": "Mama sandalyesi", "en": "High chair", "de": "Kinderhochstuhl", "ru": "Детский стул"},
        "other": {"tr": "Diğer", "en": "Other", "de": "Sonstiges", "ru": "Другое"},
    },
    "location": {
        "room_inside": {"tr": "Oda içi", "en": "Inside room", "de": "Im Zimmer", "ru": "Внутри номера"},
        "bathroom": {"tr": "Banyo", "en": "Bathroom", "de": "Badezimmer", "ru": "Ванная"},
        "balcony": {"tr": "Balkon", "en": "Balcony", "de": "Balkon", "ru": "Балкон"},
        "other": {"tr": "Diğer", "en": "Other", "de": "Sonstiges", "ru": "Другое"},
    },
    "urgency": {
        "normal": {"tr": "Normal", "en": "Normal", "de": "Normal", "ru": "Обычная"},
        "urgent": {"tr": "Acil", "en": "Urgent", "de": "Dringend", "ru": "Срочная"},
    },
}


def _normalize_lang(lang: str | None) -> Lang:
    if lang in ("en", "de", "ru"):
        return lang  # type: ignore[return-value]
    return "tr"


def category_label(intent: str, category: str, lang: str | None) -> str:
    l = _normalize_lang(lang)
    return CATEGORY_LABELS.get(intent, {}).get(category, {}).get(l, category)


def field_label(field: str, lang: str | None) -> str:
    l = _normalize_lang(lang)
    return FIELD_LABELS.get(field, {}).get(l, field)


def value_label(field: str, value: str, lang: str | None) -> str:
    l = _normalize_lang(lang)
    return VALUE_LABELS.get(field, {}).get(value, {}).get(l, value)

