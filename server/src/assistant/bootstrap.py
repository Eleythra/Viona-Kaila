from pathlib import Path
from functools import lru_cache

from assistant.core.config import get_settings
from assistant.adapters.openai_client import OpenAIClientAdapter
from assistant.services.language_service import LanguageService
from assistant.services.localization_service import LocalizationService
from assistant.services.rule_engine import RuleEngine
from assistant.services.intent_service import IntentService
from assistant.services.policy_service import PolicyService
from assistant.services.rag_service import RagService
from assistant.services.response_service import ResponseService
from assistant.services.orchestrator import ChatOrchestrator
from assistant.services.throttle_service import ThrottleService
from assistant.services.device_extractor import DeviceExtractor
from assistant.services.response_composer import ResponseComposer


BASE_DIR = Path(__file__).resolve().parent


@lru_cache(maxsize=1)
def get_orchestrator() -> ChatOrchestrator:
    settings = get_settings()
    openai_adapter = OpenAIClientAdapter(
        api_key=settings.openai_api_key,
        timeout_seconds=settings.openai_timeout_seconds,
    )
    return ChatOrchestrator(
        settings=settings,
        language_service=LanguageService(),
        localization_service=LocalizationService(),
        rule_engine=RuleEngine(BASE_DIR / "rules" / "routing_rules.yaml"),
        intent_service=IntentService(settings, openai_adapter, BASE_DIR / "prompts" / "intent_classifier.txt"),
        policy_service=PolicyService(),
        rag_service=RagService(settings, openai_adapter, BASE_DIR / "prompts" / "rag_answer.txt"),
        response_service=ResponseService(),
        throttle_service=ThrottleService(
            window_seconds=settings.throttle_window_seconds,
            max_messages=settings.throttle_max_messages,
        ),
        device_extractor=DeviceExtractor(),
        response_composer=ResponseComposer(LocalizationService()),
    )

