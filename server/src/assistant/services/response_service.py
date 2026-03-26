from assistant.schemas.response import ChatMeta, ChatResponse
from assistant.core.logger import get_logger


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

SAFE_FALLBACK_BY_LANG = {
    "tr": "Bu konuda doğrulanmış bilgiye erişemiyorum. Lütfen resepsiyon ile iletişime geçiniz.",
    "en": "I don’t have verified information about this. Please contact reception for assistance.",
    "de": "Ich kann zu diesem Thema keine verifizierten Informationen abrufen. Bitte kontaktieren Sie die Rezeption.",
    "ru": "У меня нет подтвержденной информации по этому вопросу. Пожалуйста, обратитесь на ресепшн.",
}


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
    return "\n".join(compact).strip()


def _contains_forbidden_tech_terms(message: str) -> bool:
    lowered = (message or "").lower()
    return any(term in lowered for term in FORBIDDEN_TECH_TERMS)


class ResponseService:
    def build(
        self,
        type_: str,
        message: str,
        intent: str,
        confidence: float,
        language: str,
        ui_language: str,
        source: str,
    ) -> ChatResponse:
        meta = ChatMeta(
            intent=intent,
            confidence=confidence,
            language=language,
            ui_language=ui_language,
            source=source,
        )
        normalized = _normalize_message(message)
        if _contains_forbidden_tech_terms(normalized):
            normalized = SAFE_FALLBACK_BY_LANG.get(language, SAFE_FALLBACK_BY_LANG["tr"])
        try:
            return ChatResponse.model_validate({"type": type_, "message": normalized, "meta": meta})
        except Exception as exc:
            logger.exception("response_validation_failed: %s", exc)
            safe_meta = ChatMeta(
                intent="unknown",
                confidence=0.0,
                language=language if language in ("tr", "en", "de", "ru") else "tr",
                ui_language=ui_language if ui_language in ("tr", "en", "de", "ru") else "tr",
                source="fallback",
            )
            return ChatResponse(type="fallback", message="Güvenli yanıt üretilemedi.", meta=safe_meta)

