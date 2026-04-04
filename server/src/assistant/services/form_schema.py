from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Sequence, Dict


RequestCategory = Literal[
    "towel",
    "bedding",
    "room_cleaning",
    "minibar",
    "baby_equipment",
    "room_equipment",
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
    "other",
]

FaultLocation = Literal["room_inside", "bathroom", "balcony", "other"]
FaultUrgency = Literal["normal", "urgent"]


@dataclass(frozen=True)
class FieldDef:
    name: str
    kind: Literal["enum", "int"]


REQUEST_CATEGORIES: Sequence[RequestCategory] = (
    "towel",
    "bedding",
    "room_cleaning",
    "minibar",
    "baby_equipment",
    "room_equipment",
    "other",
)

REQUEST_DETAIL_FIELDS: Dict[RequestCategory, Sequence[FieldDef]] = {
    "towel": (
        FieldDef("itemType", "enum"),
        FieldDef("quantity", "int"),
    ),
    "bedding": (
        FieldDef("itemType", "enum"),
        FieldDef("quantity", "int"),
    ),
    "room_cleaning": (
        FieldDef("requestType", "enum"),
        FieldDef("timing", "enum"),
    ),
    "minibar": (
        FieldDef("requestType", "enum"),
    ),
    "baby_equipment": (
        FieldDef("itemType", "enum"),
        FieldDef("quantity", "int"),
    ),
    "room_equipment": (
        FieldDef("itemType", "enum"),
        FieldDef("quantity", "int"),
    ),
    "other": (),
}

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
}

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
    return list(GUEST_NOTIFICATION_ALL)

