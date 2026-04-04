"""Kaila Beach geçerli oda numaraları (363). Node ``hotel-room-numbers.js`` ile senkron tutun."""

from __future__ import annotations

_ROOM_RANGES: tuple[tuple[int, int], ...] = (
    (1001, 1008),
    (1101, 1123),
    (1201, 1244),
    (1301, 1342),
    (1401, 1442),
    (1501, 1542),
    (1601, 1638),
    (2101, 2108),
    (2201, 2208),
    (2301, 2308),
    (2401, 2408),
    (2501, 2508),
    (2601, 2612),
    (3101, 3112),
    (3201, 3212),
    (3301, 3312),
    (3401, 3412),
    (3501, 3512),
    (3601, 3612),
)


def _build_frozenset() -> frozenset[str]:
    s: set[str] = set()
    for a, b in _ROOM_RANGES:
        s.update(str(n) for n in range(a, b + 1))
    return frozenset(s)


ALLOWED_HOTEL_ROOM_NUMBERS: frozenset[str] = _build_frozenset()


def is_valid_hotel_room_number(value: str | None) -> bool:
    return str(value or "").strip() in ALLOWED_HOTEL_ROOM_NUMBERS
