import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from assistant.services.form_schema import (  # noqa: E402
    REQUEST_CATEGORIES,
    REQUEST_CATEGORY_IDS_NOT_IN_APP_PICKER,
    assert_request_chat_schema_invariants,
    request_categories_for_chat_ui,
)
from assistant.services.rule_engine import (  # noqa: E402
    REQUEST_ITEM_CATEGORY_PHRASES,
    extract_request_category_from_text,
)
from assistant.utils.text_normalizer import normalize_text  # noqa: E402


def test_request_chat_schema_invariants():
    assert_request_chat_schema_invariants()


def test_request_inventory_phrase_category_ids_in_schema():
    allowed = set(REQUEST_CATEGORIES)
    for cat_id, _phrases in REQUEST_ITEM_CATEGORY_PHRASES:
        assert cat_id in allowed, cat_id


def test_hidden_request_categories_not_in_chat_picker():
    chat = set(request_categories_for_chat_ui())
    for h in REQUEST_CATEGORY_IDS_NOT_IN_APP_PICKER:
        assert h in set(REQUEST_CATEGORIES)
        assert h not in chat


def test_oda_havlusu_extracts_room_towel_before_towel_extra():
    """«oda havlusu» içinde «havlu» geçer; room_towel önceliği towel_extra genel eşlemesinden önce olmalı."""
    t = normalize_text("oda havlusu istiyorum")
    assert extract_request_category_from_text(t) == "room_towel"
