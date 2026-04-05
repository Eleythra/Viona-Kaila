import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from assistant.services.form_name_input import (  # noqa: E402
    is_chat_form_full_name_help_request,
    is_full_name_input_effectively_empty,
    normalize_full_name_for_storage,
    validate_chat_form_full_name,
)


def test_validate_rejects_digits():
    assert validate_chat_form_full_name("Ali 123") == "has_digit"
    assert validate_chat_form_full_name("Mehmet2") == "has_digit"


def test_validate_accepts_hyphen_apostrophe():
    assert validate_chat_form_full_name("Jean-Pierre O'Neil") is None


def test_validate_rejects_no_letters():
    assert validate_chat_form_full_name("---") == "no_letters"


def test_validate_single_letter_too_short():
    assert validate_chat_form_full_name("A") == "too_short"


def test_validate_rejects_trivial_two_letter_one_token():
    assert validate_chat_form_full_name("ah") == "need_first_last"
    assert validate_chat_form_full_name("Ali") == "need_first_last"


def test_validate_allows_cjk_mononym():
    assert validate_chat_form_full_name("李") is None


def test_validate_allows_cjk_two_char_single_token():
    assert validate_chat_form_full_name("张伟") is None


def test_schreiber_not_help_german_substring_trap():
    assert is_chat_form_full_name_help_request("Maria Schreiber") is False


def test_effectively_empty_strips_invisible():
    assert is_full_name_input_effectively_empty("\u200b\u200b") is True


def test_help_request_phrases():
    assert is_chat_form_full_name_help_request("ne yazayım") is True
    assert is_chat_form_full_name_help_request("what should i write") is True


def test_help_single_token_not_substring_false_positive():
    assert is_chat_form_full_name_help_request("yardımsever Yılmaz") is False


def test_normalize_storage_collapses_spaces():
    assert normalize_full_name_for_storage("  Ali    Yılmaz  ") == "Ali Yılmaz"
