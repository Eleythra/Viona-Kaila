"""Kullanıcı başına sohbet oturum özeti: aktif akış, son olay, son birkaç tur (omurga: kural + form state)."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from threading import Lock
from time import time
from typing import Any, Deque, Dict, List, Literal, Optional, Tuple

from assistant.services.chat_form_state import ChatFormState

MAX_TURNS = 5
TTL_SECONDS = 900

NotableEvent = Literal["none", "form_cancelled", "form_submitted"]
ActiveFlow = Literal["idle", "chat_form", "voice"]
ActionableFollowupKind = Literal["none", "baby_equipment_how"]


@dataclass
class ConversationTurn:
    user: str
    assistant_excerpt: str
    intent: str


@dataclass
class ConversationSessionState:
    updated_at: float = field(default_factory=time)
    turns: Deque[ConversationTurn] = field(default_factory=lambda: deque(maxlen=MAX_TURNS))
    active_flow: ActiveFlow = "idle"
    chat_form_operation: Optional[str] = None
    chat_form_step: Optional[str] = None
    last_notable_event: NotableEvent = "none"
    last_event_operation: str = ""
    """Son iptal / onay hangi form türündeydi (request, fault, …)."""
    pending_post_cancel_followup: bool = False
    """«Anlamadım» için bir kerelik ipucu (iptal hemen ardından)."""
    reservation_module_hint_active: bool = False
    """Kısa süreli: kullanıcı rezervasyon modülüne yönlendirildi; «yarınki» gibi kısa cevaplar buna bağlanır."""
    reservation_hint_until: float = 0.0
    followup_kind: ActionableFollowupKind = "none"
    """Bilgi cevabından sonra «tamam nasıl» ile istek formuna köprü (TTL ile)."""
    followup_until: float = 0.0
    followup_request_category: Optional[str] = None

    def sync_from_form(self, form_state: ChatFormState | None, channel_is_voice: bool) -> None:
        if channel_is_voice:
            self.active_flow = "voice"
            self.chat_form_operation = None
            self.chat_form_step = None
            return
        if form_state is not None:
            self.active_flow = "chat_form"
            self.chat_form_operation = form_state.operation
            self.chat_form_step = form_state.step
        else:
            self.active_flow = "idle"
            self.chat_form_operation = None
            self.chat_form_step = None
        self.updated_at = time()

    def record_turn(self, user: str, assistant_message: str, intent: str) -> None:
        excerpt = (assistant_message or "").strip().replace("\n", " ")[:480]
        self.turns.append(
            ConversationTurn(
                user=(user or "")[:900],
                assistant_excerpt=excerpt,
                intent=(intent or "")[:64],
            )
        )
        self.updated_at = time()

    def mark_form_cancelled(self, operation: str) -> None:
        self.last_notable_event = "form_cancelled"
        self.last_event_operation = operation or ""
        self.pending_post_cancel_followup = True
        self.updated_at = time()

    def mark_form_submitted(self, operation: str) -> None:
        self.last_notable_event = "form_submitted"
        self.last_event_operation = operation or ""
        self.pending_post_cancel_followup = False
        self.updated_at = time()

    def consume_post_cancel_followup(self) -> bool:
        if not self.pending_post_cancel_followup:
            return False
        self.pending_post_cancel_followup = False
        self.updated_at = time()
        return True

    def clear_misleading_cancel_context(self) -> None:
        """İptal sonrası 'tamam' / konu değişimi: RAG veya tekrar 'tamam' yanlış eşleşmesin."""
        self.pending_post_cancel_followup = False
        if self.last_notable_event == "form_cancelled":
            self.last_notable_event = "none"
            self.last_event_operation = ""
        self.clear_actionable_followup()
        self.updated_at = time()

    def touch_reservation_module_hint(self, ttl_seconds: int = 420) -> None:
        self.reservation_module_hint_active = True
        self.reservation_hint_until = time() + max(60, ttl_seconds)
        self.updated_at = time()

    def reservation_followup_alive(self) -> bool:
        if not self.reservation_module_hint_active:
            return False
        if time() > self.reservation_hint_until:
            self.reservation_module_hint_active = False
            return False
        return True

    def touch_actionable_followup(
        self,
        kind: ActionableFollowupKind,
        *,
        ttl_seconds: int = 300,
        request_category: str | None = None,
    ) -> None:
        if kind == "none":
            self.clear_actionable_followup()
            return
        self.followup_kind = kind
        self.followup_until = time() + max(60, int(ttl_seconds))
        self.followup_request_category = request_category
        self.updated_at = time()

    def clear_actionable_followup(self) -> None:
        self.followup_kind = "none"
        self.followup_until = 0.0
        self.followup_request_category = None
        self.updated_at = time()

    def actionable_followup_alive(self) -> bool:
        if self.followup_kind == "none":
            return False
        if time() > self.followup_until:
            self.clear_actionable_followup()
            return False
        return True

    def recent_turns_dict(self) -> List[Dict[str, Any]]:
        return [
            {"user": t.user, "assistant": t.assistant_excerpt, "intent": t.intent}
            for t in self.turns
        ]


class InMemoryConversationSessionStore:
    def __init__(self, ttl_seconds: int = TTL_SECONDS) -> None:
        self._ttl_seconds = max(60, int(ttl_seconds))
        self._items: Dict[Tuple[str, str, str], ConversationSessionState] = {}
        self._lock = Lock()

    @staticmethod
    def _key(channel: str | None, user_id: str | None, session_id: str | None) -> Tuple[str, str, str]:
        ch = (channel or "web").strip().lower() or "web"
        return ch, (user_id or "").strip(), (session_id or "").strip()

    def _purge_locked(self) -> None:
        now = time()
        ttl = self._ttl_seconds
        dead = [k for k, st in self._items.items() if now - st.updated_at > ttl]
        for k in dead:
            self._items.pop(k, None)

    def get(self, channel: str | None, user_id: str | None, session_id: str | None) -> ConversationSessionState:
        k = self._key(channel, user_id, session_id)
        with self._lock:
            self._purge_locked()
            st = self._items.get(k)
            if st is None:
                st = ConversationSessionState()
                self._items[k] = st
            return st
