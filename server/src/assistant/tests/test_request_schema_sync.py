"""Sohbet istek kategorisi sırası: Python şema ↔ js/requests/config.js."""

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from assistant.core.chatbot_languages import CHATBOT_UI_LANGS  # noqa: E402
from assistant.schemas.chat import ChatRequest  # noqa: E402
from assistant.services.form_schema import (  # noqa: E402
    COMPLAINT_CATEGORIES,
    FAULT_CATEGORY_CHAT_SECTIONS,
    fault_categories_for_chat_ui,
    request_categories_for_chat_ui,
)


def _request_section_ids_from_js(js_text: str) -> list[str]:
    m = re.search(
        r"requestSections:\s*\[(.*?)\n\s*\],\s*\n\s*faultSections:",
        js_text,
        re.DOTALL,
    )
    assert m, "requestSections block not found in js/requests/config.js"
    block = m.group(1)
    return re.findall(r"\bid:\s*\"([^\"]+)\"", block)


def _fault_section_ids_from_js(js_text: str) -> list[str]:
    m = re.search(
        r"faultSections:\s*\[(.*?)\n\s*\],\s*\n\s*categories:",
        js_text,
        re.DOTALL,
    )
    assert m, "faultSections block not found in js/requests/config.js"
    block = m.group(1)
    return re.findall(r"\bid:\s*\"([^\"]+)\"", block)


def _fault_section_keys_from_js(js_text: str) -> list[str]:
    m = re.search(
        r"faultSections:\s*\[(.*?)\n\s*\],\s*\n\s*categories:",
        js_text,
        re.DOTALL,
    )
    assert m, "faultSections block not found in js/requests/config.js"
    block = m.group(1)
    return re.findall(r"sectionKey:\s*\"([^\"]+)\"", block)


def _complaint_ids_from_js(js_text: str) -> list[str]:
    m = re.search(
        r"complaint:\s*\[(.*?)\n\s*\],\s*\n\s*fault:",
        js_text,
        re.DOTALL,
    )
    assert m, "categories.complaint block not found in js/requests/config.js"
    block = m.group(1)
    return re.findall(r'\bid:\s*"([^"]+)"', block)


def test_fault_chat_category_order_matches_js_requests_config():
    root = Path(__file__).resolve().parents[4]
    js_path = root / "js" / "requests" / "config.js"
    js_text = js_path.read_text(encoding="utf-8")
    js_ids = _fault_section_ids_from_js(js_text)
    py_ids = list(fault_categories_for_chat_ui())
    assert js_ids == py_ids, f"faultSections order mismatch:\n  js ({len(js_ids)}): {js_ids}\n  py ({len(py_ids)}): {py_ids}"


def test_fault_section_keys_order_matches_js_requests_config():
    root = Path(__file__).resolve().parents[4]
    js_path = root / "js" / "requests" / "config.js"
    js_text = js_path.read_text(encoding="utf-8")
    js_keys = _fault_section_keys_from_js(js_text)
    py_keys = [sk for sk, _cats in FAULT_CATEGORY_CHAT_SECTIONS]
    assert js_keys == py_keys, (
        f"faultSections sectionKey order mismatch:\n  js ({len(js_keys)}): {js_keys}\n"
        f"  py ({len(py_keys)}): {py_keys}"
    )


def test_request_chat_category_order_matches_js_requests_config():
    root = Path(__file__).resolve().parents[4]
    js_path = root / "js" / "requests" / "config.js"
    js_text = js_path.read_text(encoding="utf-8")
    js_ids = _request_section_ids_from_js(js_text)
    py_ids = list(request_categories_for_chat_ui())
    assert js_ids == py_ids, f"requestSections order mismatch:\n  js ({len(js_ids)}): {js_ids}\n  py ({len(py_ids)}): {py_ids}"


def test_complaint_chat_category_order_matches_js_requests_config():
    root = Path(__file__).resolve().parents[4]
    js_path = root / "js" / "requests" / "config.js"
    js_text = js_path.read_text(encoding="utf-8")
    js_ids = _complaint_ids_from_js(js_text)
    py_ids = list(COMPLAINT_CATEGORIES)
    assert js_ids == py_ids, f"categories.complaint order mismatch:\n  js ({len(js_ids)}): {js_ids}\n  py ({len(py_ids)}): {py_ids}"


def test_chat_request_accepts_client_channel_alias_for_voice():
    """İstemci (viona-chat) sesli turda `client_channel`; şema birleşik `channel` kullanır."""
    r = ChatRequest.model_validate(
        {"message": "hello", "client_channel": "voice", "ui_language": "en", "locale": "en"}
    )
    assert r.channel == "voice"


def test_chat_fallback_localization_keys_exist():
    from assistant.services.localization_service import LocalizationService

    loc = LocalizationService()
    for lang in CHATBOT_UI_LANGS:
        for key in (
            "chat_fallback_throttled",
            "chat_fallback_validation_error",
            "chat_form_invalid_state_hint",
            "chat_form_request_section_prompt_lead",
            "chat_form_fault_section_prompt_lead",
            "chat_form_confirm_description_empty",
        ):
            v = loc.get(key, lang)
            assert v and v != key, f"missing or raw key {key!r} for {lang}"


def test_chat_form_section_headings_translated_for_extra_ui_langs():
    """İstek/arıza sohbet formu bölüm listesi — ru/da/… yerelleştirilmiş başlık (yalnızca EN fallback değil )."""
    from assistant.services.form_labels import fault_section_label, request_section_label

    ru_sleep = request_section_label("reqReqSecHkSleepComfort", "ru")
    assert "Кровать" in ru_sleep or "комфорт" in ru_sleep.lower()
    da_hvac = fault_section_label("reqFaultSecHvac", "da")
    assert "Klima" in da_hvac or "klima" in da_hvac.lower()
