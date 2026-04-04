import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from assistant.services.metadata_catalog import (  # noqa: E402
    DEPARTMENT_METADATA,
    INTENT_METADATA,
    ISSUE_TAXONOMY,
    POLICY_METADATA,
    VENUE_METADATA,
    domain_for_intent,
    metadata_for_intent,
)


def test_domain_for_intent_defaults_to_unknown():
    assert domain_for_intent(None) == "general_information"
    assert domain_for_intent("non_existing_intent") == "general_information"


def test_metadata_for_known_intent_contains_required_keys():
    data = metadata_for_intent("recommendation")
    assert data["intent_id"] == "recommendation"
    assert data["domain"] == "recommendation"
    assert "answer" in data["allowed_response_modes"]


def test_intent_metadata_has_minimum_core_intents():
    for key in (
        "chitchat",
        "recommendation",
        "special_need",
        "guest_notification",
        "fault_report",
        "hotel_info",
        "unknown",
    ):
        assert key in INTENT_METADATA


def test_department_metadata_contains_operational_units():
    assert "reception" in DEPARTMENT_METADATA
    assert "guest_relations" in DEPARTMENT_METADATA
    assert "housekeeping" in DEPARTMENT_METADATA
    assert "technical_team" in DEPARTMENT_METADATA


def test_venue_metadata_contains_key_recommendation_venues():
    assert "mare_restaurant" in VENUE_METADATA
    assert VENUE_METADATA["mare_restaurant"]["reservation_required"] is True
    assert "sinton_bbq" in VENUE_METADATA


def test_issue_taxonomy_contains_critical_routes():
    assert ISSUE_TAXONOMY["allergy_or_special_diet"]["route_department"] == "guest_relations"
    assert ISSUE_TAXONOMY["internet_fault"]["fallback_department"] == "technical_team"


def test_policy_metadata_contains_core_hotel_rules():
    assert "a_la_carte_reservation" in POLICY_METADATA
    assert POLICY_METADATA["lunch_box_cutoff_2000"]["route_if_uncertain"] == "reception"
