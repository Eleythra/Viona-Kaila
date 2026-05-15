from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Literal, Sequence, get_args

RequestCategory = str
FaultCategory = str

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
    "lost_property",
]


@dataclass(frozen=True)
class FieldDef:
    name: str
    kind: Literal["enum", "int"]


HK_REQUEST_IDS: tuple[str, ...] = (
    "hk_duvet_request",
    "hk_bed_join",
    "hk_bed_soften",
    "hk_pillow_request",
    "hk_pique_request",
    "hk_extra_bed",
    "hk_baby_crib",
    "hk_sheet_change",
    "hk_towel_request",
    "hk_towel_change",
    "hk_toilet_paper",
    "hk_slippers",
    "hk_dental_set",
    "hk_amenity_kit",
    "hk_water",
    "hk_coffee_tea_supplies",
    "hk_cup_request",
    "hk_room_cleaning",
    "hk_trash_removal",
    "hk_balcony_cleaning",
    "hk_cleaning_dnd_coordinate",
    "hk_bad_odor",
    "hk_pest_control",
    "hk_iron",
    "hk_vase",
)

REQUEST_CATEGORIES: tuple[str, ...] = (*HK_REQUEST_IDS, "other")

_QTY: FieldDef = FieldDef("quantity", "int")
_EMPTY: tuple[FieldDef, ...] = ()

REQUEST_DETAIL_FIELDS: Dict[str, Sequence[FieldDef]] = {h: (_QTY,) for h in HK_REQUEST_IDS}
REQUEST_DETAIL_FIELDS["other"] = _EMPTY

# Sohbet istek formu: `js/requests/config.js` → `requestSections` ile aynı gruplama ve sıra.
REQUEST_CATEGORY_CHAT_SECTIONS: tuple[tuple[str, tuple[str, ...]], ...] = (
    (
        "reqReqSecHkSleepComfort",
        (
            "hk_duvet_request",
            "hk_bed_join",
            "hk_bed_soften",
            "hk_pillow_request",
            "hk_pique_request",
            "hk_extra_bed",
            "hk_baby_crib",
            "hk_sheet_change",
        ),
    ),
    (
        "reqReqSecHkTowelBath",
        (
            "hk_towel_request",
            "hk_towel_change",
            "hk_toilet_paper",
            "hk_slippers",
            "hk_dental_set",
            "hk_amenity_kit",
        ),
    ),
    ("reqReqSecHkDrinks", ("hk_water", "hk_coffee_tea_supplies", "hk_cup_request")),
    (
        "reqReqSecHkCleaning",
        (
            "hk_room_cleaning",
            "hk_trash_removal",
            "hk_balcony_cleaning",
            "hk_cleaning_dnd_coordinate",
            "hk_bad_odor",
            "hk_pest_control",
        ),
    ),
    ("reqReqSecHkEquipment", ("hk_iron", "hk_vase")),
    ("reqReqSecHkOther", ("other",)),
)


def request_categories_for_chat_ui() -> tuple[str, ...]:
    """Uygulamadaki İstekler formuyla aynı düz kategori sırası (sohbette numaralı seçim)."""
    return tuple(cat for _sk, cats in REQUEST_CATEGORY_CHAT_SECTIONS for cat in cats)


REQUEST_CATEGORY_IDS_NOT_IN_APP_PICKER: frozenset[str] = frozenset()


def assert_request_chat_schema_invariants() -> None:
    """Geliştirme hatası: sohbet bölümleri şemayı ihlal etmesin."""
    allowed = set(REQUEST_CATEGORIES)
    seen: list[str] = []
    for _sk, cats in REQUEST_CATEGORY_CHAT_SECTIONS:
        for c in cats:
            assert c in allowed, f"Unknown request category in chat sections: {c}"
            seen.append(c)
    assert len(seen) == len(set(seen)), "Duplicate category in REQUEST_CATEGORY_CHAT_SECTIONS"


# Sıra: `js/requests/config.js` → `categories.complaint` ile birebir (sohbette numaralı liste = uygulama).
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
    "lost_property",
)


def assert_complaint_chat_schema_invariants() -> None:
    """Literal kümesi ile düz liste birebir; tekrarlı id yok."""
    tpl = tuple(COMPLAINT_CATEGORIES)
    assert len(tpl) == len(set(tpl)), "Duplicate id in COMPLAINT_CATEGORIES"
    allowed = set(get_args(ComplaintCategory))
    assert set(tpl) == allowed, "COMPLAINT_CATEGORIES must match ComplaintCategory Literal exactly"


FAULT_TECH_IDS: tuple[str, ...] = (
    "ft_ac_not_cooling",
    "ft_ac_not_heating",
    "ft_ac_remote",
    "ft_ac_fault",
    "ft_ventilation_fault",
    "ft_socket_fault",
    "ft_electric_fault",
    "ft_led_fault",
    "ft_lamp_fault",
    "ft_sconce_fault",
    "ft_ceiling_water_leak",
    "ft_bidet_faucet_fault",
    "ft_cold_water_no_flow",
    "ft_hot_water_no_flow",
    "ft_siphon_fault",
    "ft_faucet_fault",
    "ft_sink_drain_fault",
    "ft_toilet_seat_broken",
    "ft_shower_cabin_fault",
    "ft_shower_head_fault",
    "ft_towel_rail_fault",
    "ft_bathroom_drain_clog",
    "ft_tv_remote",
    "ft_tv_fault",
    "ft_phone_fault",
    "ft_minibar_fault",
    "ft_safe_fault",
    "ft_kettle_fault",
    "ft_hair_dryer_fault",
    "ft_tv_channel_fault",
    "ft_curtain_fallen",
    "ft_window_fault",
    "ft_window_cleaning",
    "ft_room_door_fault",
    "ft_bathroom_door_fault",
    "ft_balcony_door_fault",
    "ft_balcony_railing_loose",
    "ft_cornice_fault",
    "ft_headboard_fault",
    "ft_dresser_drawer_fault",
    "ft_drawer_fault",
    "ft_wardrobe_fault",
    "ft_mirror_damage",
    "ft_elevator_fault",
    "ft_indoor_pool_temperature",
    "ft_other",
)

FAULT_CATEGORIES: tuple[str, ...] = FAULT_TECH_IDS


def fault_categories_for_chat_ui() -> tuple[str, ...]:
    """Misafir uygulaması faultSections düz sırası (`ft_*`)."""
    return FAULT_TECH_IDS


def assert_fault_chat_schema_invariants() -> None:
    assert len(FAULT_CATEGORIES) == len(set(FAULT_CATEGORIES)), "Duplicate fault category id"


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
    "reception": ("late_checkout",),
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
    if group == "reception":
        return list(GUEST_NOTIFICATION_BY_GROUP["reception"])
    return list(GUEST_NOTIFICATION_ALL)
