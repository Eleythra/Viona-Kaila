from typing import TypedDict


class IntentMetadata(TypedDict):
    intent_id: str
    domain: str
    route_type: str
    action_type: str
    allowed_response_modes: tuple[str, ...]


class DepartmentMetadata(TypedDict):
    department_id: str
    name: str
    synonyms: tuple[str, ...]
    responsibility_tags: tuple[str, ...]
    escalation_rules: tuple[str, ...]
    contact_hint: str


class VenueMetadata(TypedDict):
    venue_id: str
    name: str
    category: str
    cuisine_or_service_type: str
    tags: tuple[str, ...]
    synonyms: tuple[str, ...]
    recommendation_weight: int
    reservation_required: bool
    paid_status: str
    owner_department: str


class IssueTaxonomy(TypedDict):
    issue_type: str
    severity: str
    route_department: str
    fallback_department: str


class PolicyMetadata(TypedDict):
    policy_id: str
    title: str
    domain: str
    route_if_uncertain: str


INTENT_METADATA: dict[str, IntentMetadata] = {
    "chitchat": {
        "intent_id": "chitchat",
        "domain": "social",
        "route_type": "none",
        "action_type": "social_reply",
        "allowed_response_modes": ("fixed",),
    },
    "recommendation": {
        "intent_id": "recommendation",
        "domain": "recommendation",
        "route_type": "none",
        "action_type": "venue_recommendation",
        "allowed_response_modes": ("guided", "answer"),
    },
    "special_need": {
        "intent_id": "special_need",
        "domain": "allergy_and_diet",
        "route_type": "guest_relations_first",
        "action_type": "triage",
        "allowed_response_modes": ("guided", "inform"),
    },
    "guest_notification": {
        "intent_id": "guest_notification",
        "domain": "guest_relations",
        "route_type": "reception_and_guest_relations",
        "action_type": "guest_notification_form",
        "allowed_response_modes": ("guided",),
    },
    "fault_report": {
        "intent_id": "fault_report",
        "domain": "room_and_maintenance",
        "route_type": "reception_first",
        "action_type": "triage",
        "allowed_response_modes": ("guided", "redirect"),
    },
    "complaint": {
        "intent_id": "complaint",
        "domain": "guest_relations",
        "route_type": "guest_relations_first",
        "action_type": "triage",
        "allowed_response_modes": ("guided", "redirect"),
    },
    "request": {
        "intent_id": "request",
        "domain": "frontdesk_and_operations",
        "route_type": "reception_first",
        "action_type": "triage",
        "allowed_response_modes": ("guided", "redirect"),
    },
    "reservation": {
        "intent_id": "reservation",
        "domain": "frontdesk_and_operations",
        "route_type": "reception_first",
        "action_type": "triage",
        "allowed_response_modes": ("guided", "redirect"),
    },
    "hotel_info": {
        "intent_id": "hotel_info",
        "domain": "general_information",
        "route_type": "none",
        "action_type": "knowledge_answer",
        "allowed_response_modes": ("answer",),
    },
    "current_time": {
        "intent_id": "current_time",
        "domain": "general_information",
        "route_type": "none",
        "action_type": "deterministic_answer",
        "allowed_response_modes": ("fixed", "answer"),
    },
    "unknown": {
        "intent_id": "unknown",
        "domain": "general_information",
        "route_type": "fallback",
        "action_type": "fallback",
        "allowed_response_modes": ("fallback",),
    },
}


DEPARTMENT_METADATA: dict[str, DepartmentMetadata] = {
    "reception": {
        "department_id": "reception",
        "name": "Reception",
        "synonyms": ("reception", "front desk", "resepsiyon", "rezeption", "ресепшн"),
        "responsibility_tags": ("operations", "triage", "room_support"),
        "escalation_rules": ("route_to_technical_team", "route_to_housekeeping", "route_to_guest_relations"),
        "contact_hint": "Please contact reception for immediate assistance.",
    },
    "guest_relations": {
        "department_id": "guest_relations",
        "name": "Guest Relations",
        "synonyms": ("guest relations", "misafir ilişkileri", "gästebetreuung", "служба по работе с гостями"),
        "responsibility_tags": ("complaint_resolution", "special_needs", "guest_experience"),
        "escalation_rules": ("route_to_reception_if_unavailable",),
        "contact_hint": "Please contact Guest Relations for personalized support.",
    },
    "housekeeping": {
        "department_id": "housekeeping",
        "name": "Housekeeping",
        "synonyms": ("housekeeping", "oda temizliği", "zimmerreinigung", "уборка"),
        "responsibility_tags": ("cleaning", "room_order"),
        "escalation_rules": ("route_via_reception",),
        "contact_hint": "Housekeeping requests are coordinated through reception.",
    },
    "technical_team": {
        "department_id": "technical_team",
        "name": "Technical Team",
        "synonyms": ("technical team", "teknik ekip", "technik", "техническая служба"),
        "responsibility_tags": ("fault_fix", "room_maintenance"),
        "escalation_rules": ("route_via_reception",),
        "contact_hint": "Technical support is routed via reception.",
    },
}


VENUE_METADATA: dict[str, VenueMetadata] = {
    "la_terrace_a_la_carte": {
        "venue_id": "la_terrace_a_la_carte",
        "name": "La Terrace A La Carte",
        "category": "a_la_carte_restaurant",
        "cuisine_or_service_type": "a_la_carte",
        "tags": ("a_la_carte", "dinner", "terrace"),
        "synonyms": ("la terrace", "terrace", "la terrace a la carte"),
        "recommendation_weight": 100,
        "reservation_required": True,
        "paid_status": "paid",
        "owner_department": "reception",
    },
    "sinton_bbq": {
        "venue_id": "sinton_bbq",
        "name": "Sinton BBQ Restaurant",
        "category": "a_la_carte_restaurant",
        "cuisine_or_service_type": "meat_bbq",
        "tags": ("meat", "bbq"),
        "synonyms": ("sinton", "bbq"),
        "recommendation_weight": 95,
        "reservation_required": True,
        "paid_status": "paid",
        "owner_department": "reception",
    },
    "libum_cafe": {
        "venue_id": "libum_cafe",
        "name": "Libum Cafe",
        "category": "cafe",
        "cuisine_or_service_type": "coffee_dessert",
        "tags": ("coffee", "dessert"),
        "synonyms": ("libum", "cafe"),
        "recommendation_weight": 90,
        "reservation_required": False,
        "paid_status": "included_or_paid_by_item",
        "owner_department": "reception",
    },
}


ISSUE_TAXONOMY: dict[str, IssueTaxonomy] = {
    "hvac_fault": {
        "issue_type": "hvac_fault",
        "severity": "medium",
        "route_department": "reception",
        "fallback_department": "technical_team",
    },
    "internet_fault": {
        "issue_type": "internet_fault",
        "severity": "medium",
        "route_department": "reception",
        "fallback_department": "technical_team",
    },
    "allergy_or_special_diet": {
        "issue_type": "allergy_or_special_diet",
        "severity": "high",
        "route_department": "guest_relations",
        "fallback_department": "reception",
    },
}


POLICY_METADATA: dict[str, PolicyMetadata] = {
    "a_la_carte_reservation": {
        "policy_id": "a_la_carte_reservation",
        "title": "A la carte requires reservation",
        "domain": "hotel_rules",
        "route_if_uncertain": "reception",
    },
    "lunch_box_cutoff_2000": {
        "policy_id": "lunch_box_cutoff_2000",
        "title": "Lunch Box deadline 20:00",
        "domain": "hotel_rules",
        "route_if_uncertain": "reception",
    },
}


def domain_for_intent(intent: str | None) -> str:
    key = (intent or "unknown").strip()
    return INTENT_METADATA.get(key, INTENT_METADATA["unknown"])["domain"]


def metadata_for_intent(intent: str | None) -> IntentMetadata:
    key = (intent or "unknown").strip()
    return INTENT_METADATA.get(key, INTENT_METADATA["unknown"])
