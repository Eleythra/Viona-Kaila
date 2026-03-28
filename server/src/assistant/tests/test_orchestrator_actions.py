import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from assistant.schemas.chat import ChatRequest  # noqa: E402
from assistant.services.device_extractor import DeviceExtractor  # noqa: E402
from assistant.services.language_service import LanguageService  # noqa: E402
from assistant.services.localization_service import LocalizationService  # noqa: E402
from assistant.services.orchestrator import ChatOrchestrator  # noqa: E402
from assistant.services.policy_service import PolicyService  # noqa: E402
from assistant.services.response_composer import ResponseComposer  # noqa: E402
from assistant.services.response_service import ResponseService  # noqa: E402
from assistant.services.rule_engine import RuleEngine  # noqa: E402
from assistant.services.throttle_service import ThrottleService  # noqa: E402
from assistant.core.config import Settings  # noqa: E402


class DummyIntentService:
    def classify(self, _message):
        from assistant.schemas.intent import IntentResult

        return IntentResult(
            intent="unknown",
            sub_intent=None,
            entity=None,
            department=None,
            reason=None,
            needs_rag=False,
            response_mode="fallback",
            confidence=0.0,
            source="llm",
        )


class DummyRagService:
    def __init__(self):
        self.called = False
        self.last_reason = "not_called"

    def answer(self, _message, _language):
        self.called = True
        self.last_reason = "ok"
        return "Spa 08:30-19:00 saatleri arasında açıktır."


def build_orchestrator():
    settings = Settings()
    rag = DummyRagService()
    intent = DummyIntentService()
    return ChatOrchestrator(
        settings=settings,
        language_service=LanguageService(),
        localization_service=LocalizationService(),
        rule_engine=RuleEngine(Path(__file__).resolve().parents[1] / "rules" / "routing_rules.yaml"),
        intent_service=intent,
        policy_service=PolicyService(),
        rag_service=rag,
        response_service=ResponseService(),
        throttle_service=ThrottleService(window_seconds=10, max_messages=9999),
        device_extractor=DeviceExtractor(),
        response_composer=ResponseComposer(LocalizationService()),
    )


def test_fault_report_has_guest_request_action():
    orch = build_orchestrator()
    res = orch.handle(ChatRequest(message="internet çekmiyor", ui_language="tr", locale="tr"))
    assert res.meta.intent == "fault_report"
    assert res.meta.action is not None
    assert res.meta.action.kind == "create_guest_request"
    assert res.meta.action.target_department == "reception"
    assert res.meta.action.priority == "medium"


def test_special_need_has_high_priority_guest_relations_action():
    orch = build_orchestrator()
    res = orch.handle(ChatRequest(message="gluten alerjim var", ui_language="tr", locale="tr"))
    assert res.meta.intent == "special_need"
    assert res.meta.action is not None
    assert res.meta.action.kind == "create_guest_request"
    assert res.meta.action.target_department == "guest_relations"
    assert res.meta.action.priority == "high"


def test_recommendation_has_suggest_venue_action():
    orch = build_orchestrator()
    res = orch.handle(ChatRequest(message="balık", ui_language="tr", locale="tr"))
    assert res.meta.intent == "recommendation"
    assert res.meta.action is not None
    assert res.meta.action.kind == "suggest_venue"
    assert res.meta.action.venue_id == "mare_restaurant"


def test_fallback_has_no_action():
    orch = build_orchestrator()
    res = orch.handle(ChatRequest(message="qzxw 123 ???", ui_language="tr", locale="tr"))
    assert res.type == "fallback"
    assert res.meta.action is None
