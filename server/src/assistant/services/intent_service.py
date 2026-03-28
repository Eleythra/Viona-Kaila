from pathlib import Path

from assistant.core.config import Settings
from assistant.core.logger import get_logger
from assistant.schemas.intent import IntentResult
from assistant.adapters.openai_client import OpenAIClientAdapter
from assistant.utils.json_extract import parse_json_loose

logger = get_logger("assistant.intent")

_INTENT_JSON_RETRY_SUFFIX = (
    "\n\nOutput a single JSON object only. No markdown, no code fences, no text outside the JSON."
)


class IntentService:
    def __init__(self, settings: Settings, openai_adapter: OpenAIClientAdapter, prompt_path: Path):
        self.settings = settings
        self.openai = openai_adapter
        self.prompt = prompt_path.read_text(encoding="utf-8")

    def _parse_classifier_payload(self, raw: str) -> dict | None:
        data = parse_json_loose(raw)
        return data if isinstance(data, dict) else None

    def classify(self, message: str) -> IntentResult:
        try:
            res = self.openai.responses_create(
                model=self.settings.openai_model_intent,
                input=message,
                instructions=self.prompt,
            )
            raw = (res.output_text or "").strip()
            data = self._parse_classifier_payload(raw)
            if data is None:
                logger.info("intent_parse_retry after_invalid_json_output")
                res = self.openai.responses_create(
                    model=self.settings.openai_model_intent,
                    input=message,
                    instructions=f"{self.prompt}{_INTENT_JSON_RETRY_SUFFIX}",
                )
                raw = (res.output_text or "").strip()
                data = self._parse_classifier_payload(raw)
            if data is None:
                raise ValueError("intent_json_parse_failed")
            department = data.get("department")
            if department == "null" or department is None:
                department = None
            elif department not in ("reception", "guest_relations"):
                department = None
            rm_raw = data.get("response_mode", "fallback")
            response_mode = "fallback"
            if rm_raw in ("fixed", "guided", "answer", "fallback"):
                response_mode = rm_raw
            return IntentResult(
                intent=data.get("intent", "unknown"),
                sub_intent=data.get("sub_intent"),
                entity=data.get("entity"),
                department=department,
                reason=None,
                needs_rag=bool(data.get("needs_rag", False)),
                response_mode=response_mode,
                confidence=float(data.get("confidence", 0.0)),
                source="llm",
            )
        except Exception as exc:
            reason = "classifier_failure"
            exc_text = str(exc)
            if "missing_api_key" in exc_text:
                reason = "missing_api_key"
            elif "openai_401" in exc_text:
                reason = "openai_401"
            elif "openai_429" in exc_text:
                reason = "openai_429"
            elif "openai_timeout" in exc_text:
                reason = "openai_timeout"
            elif "openai_bad_response" in exc_text:
                reason = "openai_bad_response"
            elif "intent_json_parse_failed" in exc_text:
                reason = "openai_bad_response"
            logger.warning("intent_classification_failed reason=%s error=%s", reason, exc)
            return IntentResult(
                intent="unknown",
                sub_intent=None,
                entity=None,
                department=None,
                reason=reason,
                needs_rag=False,
                response_mode="fallback",
                confidence=0.0,
                source="llm",
            )

