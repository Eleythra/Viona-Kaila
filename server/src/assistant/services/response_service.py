from assistant.schemas.response import ChatMeta, ChatResponse
from assistant.core.logger import get_logger
from assistant.services.localization_service import LocalizationService
import re


logger = get_logger("assistant.response")
FORBIDDEN_TECH_TERMS = [
    "bilgi dosyasında",
    "veri bulunamadı",
    "veri bulunamadi",
    "dokümanda yok",
    "dokumanda yok",
    "kaynakta geçmiyor",
    "kaynakta gecmiyor",
    "database",
    "context içinde yok",
    "context icinde yok",
]

def _normalize_message(message: str) -> str:
    # Preserve paragraph/list line breaks while still cleaning extra spaces.
    raw = (message or "").replace("\r\n", "\n").strip()
    if not raw:
        return ""
    lines = [" ".join(line.split()) for line in raw.split("\n")]
    # Remove duplicated empty lines, keep single separators.
    compact: list[str] = []
    prev_empty = False
    for line in lines:
        is_empty = line == ""
        if is_empty and prev_empty:
            continue
        compact.append(line)
        prev_empty = is_empty
    normalized = "\n".join(compact).strip()
    # Remove inline citation artifacts from model output (e.g. 【5:16†file.md】).
    normalized = re.sub(r"【[^】]+】", "", normalized)
    normalized = re.sub(r"\[[^\]]+†[^\]]+\]", "", normalized)
    return normalized.strip()


def _contains_forbidden_tech_terms(message: str) -> bool:
    lowered = (message or "").lower()
    return any(term in lowered for term in FORBIDDEN_TECH_TERMS)


class ResponseService:
    def __init__(self):
        self.i18n = LocalizationService()

    def build(
        self,
        type_: str,
        message: str,
        intent: str,
        confidence: float,
        language: str,
        ui_language: str,
        source: str,
        action: dict | ChatMeta.ChatAction | None = None,
        multi_intent: bool = False,
        exit_chat_after_ms: int | None = None,
    ) -> ChatResponse:
        action_payload = action
        if isinstance(action, dict):
            action_payload = ChatMeta.ChatAction.model_validate(action)
        exit_ms = exit_chat_after_ms
        if exit_ms is not None:
            try:
                exit_ms = int(exit_ms)
            except (TypeError, ValueError):
                exit_ms = None
            if exit_ms is not None and (exit_ms < 500 or exit_ms > 120_000):
                exit_ms = None
        meta = ChatMeta(
            intent=intent,
            confidence=confidence,
            language=language,
            ui_language=ui_language,
            source=source,
            multi_intent=bool(multi_intent),
            action=action_payload,
            exit_chat_after_ms=exit_ms,
        )
        normalized = _normalize_message(message)
        if _contains_forbidden_tech_terms(normalized):
            normalized = self.i18n.canonical_fallback(language, reason="safe")
        try:
            return ChatResponse.model_validate({"type": type_, "message": normalized, "meta": meta})
        except Exception as exc:
            logger.exception("response_validation_failed: %s", exc)
            safe_lang = language if language in ("tr", "en", "de", "ru") else "tr"
            safe_ui = ui_language if ui_language in ("tr", "en", "de", "ru") else "tr"
            safe_meta = ChatMeta(
                intent="unknown",
                confidence=0.0,
                language=safe_lang,
                ui_language=safe_ui,
                source="fallback",
            )
            safe_message = self.i18n.canonical_fallback(safe_lang, reason="validation_error")
            return ChatResponse(type="fallback", message=safe_message, meta=safe_meta)

