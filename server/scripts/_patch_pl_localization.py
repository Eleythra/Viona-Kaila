#!/usr/bin/env python3
"""Historic one-off locale migrations (idempotent; safe to re-run).

- rule_engine: legacy Cyrillic letter class in token regex → Polish letters (no-op if already updated).
- content-where: legacy ``L(tr,en,de,ru)`` stub → ``L(tr,en,de,pl)`` (no-op if already migrated).
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def patch_rule_engine() -> None:
    path = ROOT / "src" / "assistant" / "services" / "rule_engine.py"
    text = path.read_text(encoding="utf-8")
    # Current tree already uses the Polish class; this only upgrades very old checkouts.
    old_rx = "[a-zA-ZçğıöşüÇĞİÖŞÜ" + "\u0430-\u044f\u0410-\u042f\u0451\u0401]+"
    new_rx = r"[a-zA-ZçğıöşüÇĞİÖŞÜąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+"
    if old_rx in text:
        text = text.replace(old_rx, new_rx)
    path.write_text(text, encoding="utf-8")


def patch_content_where() -> None:
    path = ROOT.parent / "js" / "content-where.js"
    if not path.exists():
        return
    t = path.read_text(encoding="utf-8")
    t = t.replace(
        "  function L(tr, en, de, ru) {\n    void ru;\n    return { tr: tr, en: en, de: de, pl: en };\n  }",
        "  function L(tr, en, de, pl) {\n    return { tr: tr, en: en, de: de, pl: pl };\n  }",
    )
    if re.search(r"[\u0400-\u04FF]", t):
        raise SystemExit("content-where.js still has Cyrillic")
    path.write_text(t, encoding="utf-8")


def main() -> None:
    patch_rule_engine()
    patch_content_where()
    print("rule_engine + content-where: migrations applied (no-op if repo already current).")


if __name__ == "__main__":
    main()
