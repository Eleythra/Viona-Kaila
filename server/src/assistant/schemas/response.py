from typing import Literal
from pydantic import BaseModel

from .intent import IntentName, SourceName


ResponseType = Literal["answer", "redirect", "inform", "fallback"]


class ChatMeta(BaseModel):
    class ChatAction(BaseModel):
        kind: Literal[
            "create_guest_request",
            "suggest_venue",
            "chat_form",
            "open_reservation_form",
            "open_guest_notifications_form",
            "open_complaint_form",
            "open_alanya_module",
            "open_spa_module",
            "open_restaurants_bars_module",
            "open_transfer_module",
            "open_where_module",
        ]
        target_department: Literal["reception", "guest_relations"] | None = None
        priority: Literal["low", "medium", "high"] | None = None
        sub_intent: str | None = None
        entity: str | None = None
        issue_type: str | None = None
        venue_id: str | None = None
        policy_hint: str | None = None
        # Chat form-specific fields (optional; ignored by existing consumers if absent).
        operation: Literal["request", "fault", "complaint", "guest_notification"] | None = None
        step: str | None = None
        payload: dict | None = None

    intent: IntentName
    confidence: float
    language: Literal["tr", "en", "de", "pl"]
    ui_language: Literal["tr", "en", "de", "pl"]
    source: SourceName
    multi_intent: bool = False
    action: ChatAction | None = None
    # Web sohbet: kayıt tamamlandıktan sonra istemci modalı kapatıp ana sayfaya döner (ms). WhatsApp vb. için None.
    exit_chat_after_ms: int | None = None


class ChatResponse(BaseModel):
    type: ResponseType
    message: str
    meta: ChatMeta

