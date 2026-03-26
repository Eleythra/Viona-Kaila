import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from assistant.utils.json_extract import extract_first_json_object, parse_json_loose  # noqa: E402


def test_parse_json_loose_plain_object():
    assert parse_json_loose('{"found": true, "answer": "x"}') == {"found": True, "answer": "x"}


def test_parse_json_loose_fenced():
    raw = '```json\n{"intent": "hotel_info", "confidence": 0.9}\n```'
    assert parse_json_loose(raw) == {"intent": "hotel_info", "confidence": 0.9}


def test_parse_json_loose_prose_prefix():
    raw = 'Sure, here is the result:\n{"found": false, "answer": ""}'
    assert parse_json_loose(raw) == {"found": False, "answer": ""}


def test_extract_first_json_object_nested_string_braces():
    # Braces inside JSON string must not end extraction early
    s = '{"a": "foo { bar }", "b": 1}'
    assert extract_first_json_object(s) == s


def test_parse_json_loose_none_empty():
    assert parse_json_loose("") is None
    assert parse_json_loose("   ") is None
