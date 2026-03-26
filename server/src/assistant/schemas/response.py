from typing import Literal
from pydantic import BaseModel

from .intent import IntentName, SourceName


ResponseType = Literal["answer", "redirect", "inform", "fallback"]


class ChatMeta(BaseModel):
    intent: IntentName
    confidence: float
    language: Literal["tr", "en", "de", "ru"]
    ui_language: Literal["tr", "en", "de", "ru"]
    source: SourceName


class ChatResponse(BaseModel):
    type: ResponseType
    message: str
    meta: ChatMeta

