"""Misafir kimliği: chat formunda açıklama sonrası ad/oda atlama (Node oda + istemci ad)."""

import sys
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

_PATCH_QUIET_OFF = patch(
    "assistant.services.orchestrator.operational_quiet_hours_active",
    new=lambda now=None: False,
)


def setup_module():
    _PATCH_QUIET_OFF.start()


def teardown_module():
    _PATCH_QUIET_OFF.stop()


from assistant.schemas.chat import ChatRequest  # noqa: E402
from assistant.services.chat_form_state import ChatFormState  # noqa: E402
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
    """Arıza: spesifik arıza ifadesi → açıklama; geçerli ad+oda ile doğrudan onay adımı."""
    orch, _, _ = build_orchestrator()
    uid, sid = "u-fault-guest-id", "s-fault-guest-id"
    base = dict(ui_language="tr", locale="tr", user_id=uid, session_id=sid)

    r = orch.handle(ChatRequest(message="priz çalışmıyor", **base))
    assert r.meta.action and r.meta.action.kind == "chat_form"
    assert r.meta.action.operation == "fault"
    assert r.meta.action.step == "description"

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


def test_request_category_fast_path_skips_full_name_with_verified_identity():
    """İstek: kategori seçiminden sonra açıklama ön-doldurma + adım; ad+oda (payload) varsa doğrudan onay."""
    orch, _, _ = build_orchestrator()
    uid, sid = "u-req-ident-fast", "s-req-ident-fast"
    base = dict(
        ui_language="tr",
        locale="tr",
        user_id=uid,
        session_id=sid,
        guest_full_name="Ahmet Bay",
        verified_guest_room="1001",
    )
    orch.form_store.upsert(
        "web",
        uid,
        sid,
        ChatFormState(
            operation="request",
            language="tr",
            ui_language="tr",
            step="category",
            section_index=2,
            initial_message="şişe su rica ediyorum",
        ),
    )
    # İçecekler bölümünde: hk_water ilk sırada
    r_qty = orch.handle(ChatRequest(message="1", **base))
    assert r_qty.meta.action and r_qty.meta.action.kind == "chat_form"
    assert r_qty.meta.action.step == "detail_int"
    orch.handle(ChatRequest(message="1", **base))
    r = orch.handle(ChatRequest(message="şişe su rica ediyorum", **base))
    assert r.meta.action and r.meta.action.kind == "chat_form"
    assert r.meta.action.step == "confirm"
    assert "Ahmet Bay" in r.message
    assert "1001" in r.message
    low = r.message.lower()
    assert "adınızı" not in low
    assert "soyadınızı" not in low


def test_guest_notification_optional_description_empty_goes_confirm_with_identity():
    """Zorunlu not gerektirmeyen bildirim: boş tur + ilk mesaj + doğrulanmış ad/oda → onay."""
    orch, _, _ = build_orchestrator()
    uid, sid = "u-gn-ident-empty", "s-gn-ident-empty"
    base: dict = dict(ui_language="tr", locale="tr", user_id=uid, session_id=sid)
    r = orch.handle(ChatRequest(message="misafir bildirimi doldurmak istiyorum", **base))
    assert r.meta.action and r.meta.action.kind == "chat_form"
    assert r.meta.action.operation == "guest_notification"
    assert r.meta.action.step == "category"
    r2 = orch.handle(
        ChatRequest(
            message="1",
            guest_full_name="Ahmet Bay",
            verified_guest_room="1001",
            **base,
        )
    )
    assert r2.meta.action and r2.meta.action.step == "description"
    r3 = orch.handle(
        ChatRequest(
            message="",
            guest_full_name="Ahmet Bay",
            verified_guest_room="1001",
            **base,
        )
    )
    assert r3.meta.action and r3.meta.action.step == "confirm"
    assert "Ahmet Bay" in r3.message
    assert "1001" in r3.message
    low = r3.message.lower()
    assert "adınızı" not in low


def test_complaint_chat_description_with_identity_goes_to_confirm():
    """Sohbet şikayet formu: kategori → açıklama; payload ad+oda ile doğrudan onay."""
    orch, _, _ = build_orchestrator()
    uid, sid = "u-cmp-ident", "s-cmp-ident"
    base: dict = dict(ui_language="tr", locale="tr", user_id=uid, session_id=sid)
    orch.form_store.upsert(
        "web",
        uid,
        sid,
        ChatFormState(
            operation="complaint",
            language="tr",
            ui_language="tr",
            step="category",
            initial_message="gürültü şikayetim var",
        ),
    )
    # COMPLAINT_CATEGORIES: 1=room_cleaning, 2=noise (açıklama şemada zorunlu değil)
    r = orch.handle(ChatRequest(message="2", **base))
    assert r.meta.action and r.meta.action.step == "description"
    r2 = orch.handle(
        ChatRequest(
            message="koridor çok sesli",
            guest_full_name="Ahmet Bay",
            verified_guest_room="1001",
            **base,
        )
    )
    assert r2.meta.action and r2.meta.action.step == "confirm"
    assert "Ahmet Bay" in r2.message
    assert "1001" in r2.message
    low = r2.message.lower()
    assert "adınızı" not in low
