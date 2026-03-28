from typing import Literal
from pydantic import BaseModel

from .intent import IntentName, SourceName


ResponseType = Literal["answer", "redirect", "inform", "fallback"]


class ChatMeta(BaseModel):
    class ChatAction(BaseModel):
        kind: Literal["create_guest_request", "suggest_venue"]
        target_department: Literal["reception", "guest_relations"] | None = None
        priority: Literal["low", "medium", "high"] | None = None
        sub_intent: str | None = None
        entity: str | None = None
        issue_type: str | None = None
        venue_id: str | None = None
        policy_hint: str | None = None

    intent: IntentName
    confidence: float
    language: Literal["tr", "en", "de", "ru"]
    ui_language: Literal["tr", "en", "de", "ru"]
    source: SourceName
    multi_intent: bool = False
    action: ChatAction | None = None


class ChatResponse(BaseModel):
    type: ResponseType
    message: str
    meta: ChatMeta

