"""Misafir kimliği: chat formunda açıklama sonrası ad/oda atlama (Node oda + istemci ad)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from assistant.schemas.chat import ChatRequest  # noqa: E402
from assistant.services.orchestrator import _parsed_guest_identity_for_chat_form_skip  # noqa: E402
from assistant.tests.test_orchestrator import build_orchestrator  # noqa: E402


def test_parsed_guest_identity_ok():
    p = ChatRequest(
        message="x",
        ui_language="tr",
        locale="tr",
        guest_full_name="Ahmet Bay",
        verified_guest_room="1001",
    )
    n, r = _parsed_guest_identity_for_chat_form_skip(p)
    assert n == "Ahmet Bay"
    assert r == "1001"


def test_parsed_guest_identity_invalid_room():
    p = ChatRequest(
        message="x",
        ui_language="tr",
        locale="tr",
        guest_full_name="Ahmet Bay",
        verified_guest_room="9999",
    )
    assert _parsed_guest_identity_for_chat_form_skip(p) == (None, None)


def test_parsed_guest_identity_single_token_name():
    p = ChatRequest(
        message="x",
        ui_language="tr",
        locale="tr",
        guest_full_name="Ahmet",
        verified_guest_room="1001",
    )
    assert _parsed_guest_identity_for_chat_form_skip(p) == (None, None)


def test_parsed_guest_identity_missing_fields():
    p = ChatRequest(message="x", ui_language="tr", locale="tr", guest_full_name="Ahmet Bay")
    assert _parsed_guest_identity_for_chat_form_skip(p) == (None, None)


def test_fault_flow_description_with_identity_goes_to_confirm():
    """Arıza: kategori/lokasyon/aciliyet sonrası açıklama; geçerli ad+oda ile doğrudan onay adımı."""
    orch, _, _ = build_orchestrator()
    uid, sid = "u-fault-guest-id", "s-fault-guest-id"
    base = dict(ui_language="tr", locale="tr", user_id=uid, session_id=sid)

    r = orch.handle(ChatRequest(message="priz çalışmıyor", **base))
    assert r.meta.action and r.meta.action.kind == "chat_form"
    assert r.meta.action.operation == "fault"

    for _ in range(8):
        act = r.meta.action
        if not act:
            break
        st = act.step
        if st == "description":
            break
        if st == "category":
            r = orch.handle(ChatRequest(message="2", **base))
        elif st == "location":
            r = orch.handle(ChatRequest(message="1", **base))
        elif st == "urgency":
            r = orch.handle(ChatRequest(message="1", **base))
        else:
            break

    assert r.meta.action and r.meta.action.step == "description"

    r_final = orch.handle(
        ChatRequest(
            message="priz gevşedi",
            guest_full_name="Ahmet Bay",
            verified_guest_room="1001",
            **base,
        )
    )
    assert r_final.meta.action and r_final.meta.action.step == "confirm"
    assert "Ahmet Bay" in r_final.message
    assert "1001" in r_final.message
    assert "adınızı" not in r_final.message.lower()
