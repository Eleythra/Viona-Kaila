from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Sequence, Dict


RequestCategory = Literal[
    "towel_extra",
    "room_towel",
    "bathrobe",
    "bedding_sheet",
    "bedding_pillow",
    "bedding_blanket",
    "room_cleaning",
    "turndown",
    "slippers",
    "minibar_refill",
    "bottled_water",
    "tea_coffee",
    "toilet_paper",
    "toiletries",
    "climate_request",
    "room_refresh",
    "hanger",
    "kettle",
    "room_safe",
    "baby_bed",
    "other",
]

FaultCategory = Literal[
    "hvac",
    "electric",
    "water_bathroom",
    "tv_electronics",
    "door_lock",
    "furniture_item",
    "cleaning_equipment_damage",
    "balcony_window",
    "other",
]

ComplaintCategory = Literal[
    "room_cleaning",
    "noise",
    "climate",
    "room_comfort",
    "minibar",
    "restaurant_service",
    "staff_behavior",
    "general_areas",
    "hygiene",
    "internet_tv",
    "lost_property",
    "other",
]

FaultLocation = Literal["room_inside", "bathroom", "balcony", "other"]
FaultUrgency = Literal["normal", "urgent"]


@dataclass(frozen=True)
class FieldDef:
    name: str
    kind: Literal["enum", "int"]


REQUEST_CATEGORIES: Sequence[RequestCategory] = (
    "towel_extra",
    "room_towel",
    "bathrobe",
    "bedding_sheet",
    "bedding_pillow",
    "bedding_blanket",
    "room_cleaning",
    "turndown",
    "slippers",
    "minibar_refill",
    "bottled_water",
    "tea_coffee",
    "toilet_paper",
    "toiletries",
    "climate_request",
    "room_refresh",
    "hanger",
    "kettle",
    "room_safe",
    "baby_bed",
    "other",
)

_QTY: FieldDef = FieldDef("quantity", "int")
_TIM: FieldDef = FieldDef("timing", "enum")
_EMPTY: tuple[FieldDef, ...] = ()

REQUEST_DETAIL_FIELDS: Dict[RequestCategory, Sequence[FieldDef]] = {
    "towel_extra": (_QTY,),
    "room_towel": (_QTY,),
    "bathrobe": (_QTY,),
    "bedding_sheet": (_QTY,),
    "bedding_pillow": (_QTY,),
    "bedding_blanket": (_QTY,),
    "room_cleaning": (_TIM,),
    "turndown": (_TIM,),
    "slippers": (_QTY,),
    "minibar_refill": _EMPTY,
    "bottled_water": _EMPTY,
    "tea_coffee": _EMPTY,
    "toilet_paper": (_QTY,),
    "toiletries": (_QTY,),
    "climate_request": _EMPTY,
    "room_refresh": _EMPTY,
    "hanger": (_QTY,),
    "kettle": _EMPTY,
    "room_safe": _EMPTY,
    "baby_bed": (_QTY,),
    "other": _EMPTY,
}

# Sohbet istek formu: `js/requests/config.js` → `requestSections` ile aynı gruplama ve sıra (yorumda yol).
# Uygulama seçicide görünmeyen id’ler: REQUEST_CATEGORY_IDS_NOT_IN_APP_PICKER (+ aşağıdaki açıklama).
REQUEST_CATEGORY_CHAT_SECTIONS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("reqReqSecTowels", ("bedding_pillow", "room_towel", "bathrobe", "slippers")),
    ("reqReqSecBedding", ("bedding_sheet", "bedding_blanket")),
    ("reqReqSecRoomService", ("room_cleaning",)),
    ("reqReqSecMinibarDrinks", ("bottled_water", "tea_coffee")),
    ("reqReqSecBathAmenities", ("toilet_paper", "toiletries")),
    ("reqReqSecComfort", ("climate_request", "room_refresh")),
    ("reqReqSecEquipment", ("hanger", "kettle", "room_safe", "baby_bed")),
    ("reqReqSecOther", ("other",)),
)


def request_categories_for_chat_ui() -> tuple[str, ...]:
    """Uygulamadaki İstekler formuyla aynı düz kategori sırası (sohbette numaralı seçim)."""
    return tuple(cat for _sk, cats in REQUEST_CATEGORY_CHAT_SECTIONS for cat in cats)


# Web `requestSections` listesinde yok; API / NLU ile hâlâ geçerli (guest-requests.service.js ile aynı kavram).
REQUEST_CATEGORY_IDS_NOT_IN_APP_PICKER: frozenset[str] = frozenset(
    {"towel_extra", "turndown", "minibar_refill"}
)


def assert_request_chat_schema_invariants() -> None:
    """Geliştirme hatası: sohbet bölümleri şemayı ihlal etmesin."""
    allowed = set(REQUEST_CATEGORIES)
    seen: list[str] = []
    for _sk, cats in REQUEST_CATEGORY_CHAT_SECTIONS:
        for c in cats:
            assert c in allowed, f"Unknown request category in chat sections: {c}"
            seen.append(c)
    assert len(seen) == len(set(seen)), "Duplicate category in REQUEST_CATEGORY_CHAT_SECTIONS"
    chat_set = set(seen)
    for hidden in REQUEST_CATEGORY_IDS_NOT_IN_APP_PICKER:
        assert hidden in allowed, hidden
        assert hidden not in chat_set, f"Hidden category {hidden} must not appear in chat picker list"


COMPLAINT_CATEGORIES: Sequence[ComplaintCategory] = (
    "room_cleaning",
    "noise",
    "climate",
    "room_comfort",
    "minibar",
    "restaurant_service",
    "staff_behavior",
    "general_areas",
    "hygiene",
    "internet_tv",
    "lost_property",
    "other",
)

FAULT_CATEGORIES: Sequence[FaultCategory] = (
    "hvac",
    "electric",
    "water_bathroom",
    "tv_electronics",
    "door_lock",
    "furniture_item",
    "cleaning_equipment_damage",
    "balcony_window",
    "other",
)

FAULT_LOCATIONS: Sequence[FaultLocation] = (
    "room_inside",
    "bathroom",
    "balcony",
    "other",
)

FAULT_URGENCIES: Sequence[FaultUrgency] = (
    "normal",
    "urgent",
)

# Web `REQUESTS_CONFIG.guestNotificationGroups` ile aynı sıra ve id’ler.
GUEST_NOTIFICATION_BY_GROUP: dict[str, tuple[str, ...]] = {
    "diet": (
        "allergen_notice",
        "gluten_sensitivity",
        "lactose_sensitivity",
        "vegan_vegetarian",
        "food_sensitivity_general",
    ),
    "health": (
        "chronic_condition",
        "accessibility_special_needs",
        "pregnancy",
        "medication_health_sensitivity",
        "other_health",
    ),
    "celebration": (
        "birthday_celebration",
        "honeymoon_anniversary",
        "surprise_organization",
        "room_decoration",
        "other_celebration",
    ),
    # Ön büro / resepsiyon (geç çıkış vb.) — rezervasyon modülü değil, misafir bildirimi kaydı.
    "reception": ("late_checkout",),
}

# Web’deki radyo grupları (diet/health/celebration) ile aynı. Geç çıkış ayrı type=late_checkout formu;
# sohbet tam listesine eklenmez — seçilse bile Node GUEST_NOTIFICATION_CATEGORIES reddederdi.
GUEST_NOTIFICATION_ALL: tuple[str, ...] = (
    *GUEST_NOTIFICATION_BY_GROUP["diet"],
    *GUEST_NOTIFICATION_BY_GROUP["health"],
    *GUEST_NOTIFICATION_BY_GROUP["celebration"],
)


def guest_notification_categories_for_group(group: str | None) -> list[str]:
    if group == "diet":
        return list(GUEST_NOTIFICATION_BY_GROUP["diet"])
    if group == "health":
        return list(GUEST_NOTIFICATION_BY_GROUP["health"])
    if group == "celebration":
        return list(GUEST_NOTIFICATION_BY_GROUP["celebration"])
    if group == "reception":
        return list(GUEST_NOTIFICATION_BY_GROUP["reception"])
    return list(GUEST_NOTIFICATION_ALL)

