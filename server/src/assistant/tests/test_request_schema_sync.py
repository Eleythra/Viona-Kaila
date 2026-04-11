"""Sohbet istek kategorisi sırası: Python şema ↔ js/requests/config.js."""

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from assistant.services.form_schema import request_categories_for_chat_ui  # noqa: E402


def _request_section_ids_from_js(js_text: str) -> list[str]:
    m = re.search(
        r"requestSections:\s*\[(.*?)\n\s*\],\s*\n\s*categories:",
        js_text,
        re.DOTALL,
    )
    assert m, "requestSections block not found in js/requests/config.js"
    block = m.group(1)
    return re.findall(r"\bid:\s*\"([^\"]+)\"", block)


def test_request_chat_category_order_matches_js_requests_config():
    root = Path(__file__).resolve().parents[4]
    js_path = root / "js" / "requests" / "config.js"
    js_text = js_path.read_text(encoding="utf-8")
    js_ids = _request_section_ids_from_js(js_text)
    py_ids = list(request_categories_for_chat_ui())
    assert js_ids == py_ids, f"requestSections order mismatch:\n  js ({len(js_ids)}): {js_ids}\n  py ({len(py_ids)}): {py_ids}"


def test_chat_fallback_localization_keys_exist():
    from assistant.services.localization_service import LocalizationService

    loc = LocalizationService()
    for lang in ("tr", "en", "de", "ru"):
        for key in (
            "chat_fallback_throttled",
            "chat_fallback_validation_error",
            "chat_form_invalid_state_hint",
        ):
            v = loc.get(key, lang)
            assert v and v != key, f"missing or raw key {key!r} for {lang}"
