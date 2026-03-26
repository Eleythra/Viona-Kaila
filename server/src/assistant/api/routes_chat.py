from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from assistant.schemas.chat import ChatRequest
from assistant.schemas.response import ChatResponse, ChatMeta
from assistant.services.orchestrator import ChatOrchestrator
from assistant.services.localization_service import LocalizationService
from assistant.bootstrap import get_orchestrator
from assistant.core.logger import get_logger

logger = get_logger("assistant.api.chat")

router = APIRouter(prefix="/api", tags=["chat"])

_LOCALIZATION = LocalizationService()


def _resolve_chat_lang(payload: ChatRequest) -> str:
    for cand in (payload.ui_language, payload.locale):
        if cand and str(cand).lower().strip() in ("tr", "en", "de", "ru"):
            return str(cand).lower().strip()
    return "tr"


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest, orchestrator: ChatOrchestrator = Depends(get_orchestrator)) -> ChatResponse:
    try:
        return orchestrator.handle(payload)
    except Exception as exc:
        logger.exception("chat_endpoint_failed: %s", exc)
        lang = _resolve_chat_lang(payload)
        message = _LOCALIZATION.get("reception_fallback_message", lang)
        ui = payload.ui_language if payload.ui_language in ("tr", "en", "de", "ru") else lang
        safe = ChatResponse(
            type="fallback",
            message=message,
            meta=ChatMeta(
                intent="unknown",
                confidence=0.0,
                language=lang,
                ui_language=ui,
                source="fallback",
            ),
        )
        return JSONResponse(status_code=200, content=safe.model_dump())

