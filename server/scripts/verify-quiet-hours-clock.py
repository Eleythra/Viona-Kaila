#!/usr/bin/env python3
"""
Orchestrator içindeki operational_quiet_hours_active ile aynı formül (tek kaynak kontrolü).
Bağımlılık yok — CI veya yerel: python3 server/scripts/verify-quiet-hours-clock.py
"""
from datetime import datetime
from zoneinfo import ZoneInfo


def operational_quiet_hours_active(now: datetime | None = None) -> bool:
    tz = ZoneInfo("Europe/Istanbul")
    t = now.astimezone(tz) if now else datetime.now(tz)
    return (t.hour * 60 + t.minute) < 8 * 60


def main() -> None:
    assert operational_quiet_hours_active(
        datetime(2026, 6, 1, 7, 59, tzinfo=ZoneInfo("Europe/Istanbul"))
    ), "07:59 TR → sessiz olmalı"
    assert not operational_quiet_hours_active(
        datetime(2026, 6, 1, 8, 0, tzinfo=ZoneInfo("Europe/Istanbul"))
    ), "08:00 TR → açık olmalı"
    assert operational_quiet_hours_active(
        datetime(2026, 6, 1, 0, 0, tzinfo=ZoneInfo("Europe/Istanbul"))
    ), "gece yarısı → sessiz"
    assert not operational_quiet_hours_active(
        datetime(2026, 6, 1, 12, 0, tzinfo=ZoneInfo("Europe/Istanbul"))
    ), "öğlen → açık"
    print("verify-quiet-hours-clock: ok")


if __name__ == "__main__":
    main()
