#!/usr/bin/env python3
"""
Ad-hoc multilingual / edge-case smoke test for ChatOrchestrator.
Run from repo: PYTHONPATH=server/src server/.venv-assistant/bin/python server/scripts/multilingual_smoke_test.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

os.environ.setdefault("THROTTLE_MAX_MESSAGES", "9999")

from assistant.bootstrap import get_orchestrator  # noqa: E402
from assistant.schemas.chat import ChatRequest  # noqa: E402


def main() -> None:
    orch = get_orchestrator()
    uid = "smoke-test-user"

    cases: list[tuple[str, str, str, str | None, list[str]]] = [
        # message, ui_language, locale, note, expected_checks (prefix tags)
        ("havlu lazım", "tr", "tr", "TR request", ["intent:request", "lang:tr"]),
        ("I need extra towels please", "en", "en", "EN request", ["intent:request", "lang:en"]),
        ("Ich brauche ein Handtuch", "de", "de", "DE request", ["intent:request", "lang:de"]),
        ("potrzebuję ręcznika", "pl", "pl", "PL request", ["intent:request", "lang:pl"]),
        ("televizyonum bozuldu", "tr", "tr", "TR fault", ["intent:fault_report", "lang:tr"]),
        ("The AC is broken", "en", "en", "EN fault", ["intent:fault_report", "lang:en"]),
        ("veganım", "tr", "tr", "TR special", ["intent:special_need", "lang:tr"]),
        ("jestem wegetarianinem", "pl", "pl", "PL special", ["intent:special_need", "lang:pl"]),
        ("Alerjen- Gluten Hassasiyeti", "en", "en", "TR-looking allergen, UI en", ["intent:special_need", "lang:tr"]),
        ("çıkış saat kaçta", "tr", "tr", "TR hotel_info RAG/rule", ["intent:hotel_info"]),
        ("Where is the lobby?", "en", "en", "EN hotel_info", ["intent:hotel_info", "lang:en"]),
        ("Bitte auf Deutsch: wo ist die Lobby", "de", "de", "DE + explicit Deutsch", ["intent:hotel_info"]),
        ("cześć jak się masz", "pl", "pl", "PL chitchat", ["intent:chitchat", "lang:pl"]),
        ("saat kaç", "tr", "tr", "current time", ["intent:current_time", "lang:tr"]),
        ("please speak english", "tr", "tr", "override → en", ["lang:en"]),
        ("türkçe konuş", "en", "en", "override → tr", ["lang:tr"]),
        ("", "tr", "tr", "empty → fallback", ["type:fallback"]),
        ("çok kötü gürültü var", "tr", "tr", "complaint", ["intent:complaint", "lang:tr"]),
    ]

    issues: list[str] = []
    print("has_openai_key=", bool((orch.settings.openai_api_key or "").strip()))
    print("has_vector_store=", bool((orch.settings.openai_vector_store_id or "").strip()))
    print("-" * 80)

    for message, ui, loc, note, checks in cases:
        req = ChatRequest(message=message, ui_language=ui, locale=loc, user_id=uid)
        try:
            res = orch.handle(req)
        except Exception as e:
            issues.append(f"EXC {note!r}: {e}")
            print(f"FAIL {note}: {e}")
            continue

        mlang = res.meta.language
        uilang = res.meta.ui_language
        intent = res.meta.intent
        rtype = res.type
        msg_preview = (res.message or "")[:120].replace("\n", " ")

        def check(tag: str) -> bool:
            if tag.startswith("intent:"):
                return intent == tag.split(":", 1)[1]
            if tag.startswith("lang:"):
                return mlang == tag.split(":", 1)[1]
            if tag.startswith("type:"):
                return rtype == tag.split(":", 1)[1]
            return True

        failed = [c for c in checks if not check(c)]
        status = "OK " if not failed else "BAD"
        if failed:
            issues.append(f"{note}: expected {failed}, got intent={intent} lang={mlang} type={rtype}")

        print(f"{status} | {note}")
        print(f"      ui={uilang} reply_lang={mlang} intent={intent} type={rtype}")
        print(f"      msg={msg_preview!r}")
        if failed:
            print(f"      FAILED: {failed}")
        print()

    print("=" * 80)
    if issues:
        print("ISSUES:", len(issues))
        for i in issues:
            print(" -", i)
        sys.exit(1)
    print("All checks passed.")
    sys.exit(0)


if __name__ == "__main__":
    main()
