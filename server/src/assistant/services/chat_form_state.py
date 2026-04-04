from __future__ import annotations

from dataclasses import dataclass, field
from threading import Lock
from time import time
from typing import Literal, Optional, Dict, Tuple


NotifGroupFilter = Literal["diet", "health", "celebration", "reception"]
OperationType = Literal["request", "fault", "complaint", "guest_notification"]
FormStep = Literal[
    "category",
    "detail_enum",
    "detail_int",
    "location",
    "urgency",
    "description",
    "full_name",
    "room",
    "confirm",
]


@dataclass
class ChatFormState:
    operation: OperationType
    language: str
    ui_language: str
    """Sohbet misafir bildirimi: yalnızca bir grubun kategorileri (None = tümü)."""
    notif_group: NotifGroupFilter | None = None
    step: FormStep = "category"
    category: Optional[str] = None
    subcategory: Optional[str] = None
    quantity: Optional[int] = None
    description: str = ""
    full_name: Optional[str] = None
    room: Optional[str] = None
    details: dict[str, object] = field(default_factory=dict)
    current_detail_field: Optional[str] = None
    pending_detail_fields: list[str] = field(default_factory=list)
    initial_message: str = ""
    created_at: float = field(default_factory=time)


class InMemoryChatFormStore:
    """Simple in-memory state store for chat form flows.

    Keyed by (channel, user_id or \"\", session_id or \"\").
    Intended as a replaceable abstraction so we can later swap with Redis/DB.
    """

    def __init__(self, ttl_seconds: int = 900) -> None:
        self._ttl_seconds = max(60, int(ttl_seconds or 0))
        self._items: Dict[Tuple[str, str, str], ChatFormState] = {}
        self._lock = Lock()

    def _make_key(self, channel: str | None, user_id: str | None, session_id: str | None) -> Tuple[str, str, str]:
        ch = (channel or "web").strip().lower() or "web"
        uid = (user_id or "").strip()
        sid = (session_id or "").strip()
        return ch, uid, sid

    def _purge_expired(self) -> None:
        now = time()
        ttl = self._ttl_seconds
        to_delete = []
        for key, state in self._items.items():
            if now - state.created_at > ttl:
                to_delete.append(key)
        for key in to_delete:
            self._items.pop(key, None)

    def get(self, channel: str | None, user_id: str | None, session_id: str | None) -> Optional[ChatFormState]:
        key = self._make_key(channel, user_id, session_id)
        with self._lock:
            self._purge_expired()
            return self._items.get(key)

    def upsert(
        self,
        channel: str | None,
        user_id: str | None,
        session_id: str | None,
        state: ChatFormState,
    ) -> ChatFormState:
        key = self._make_key(channel, user_id, session_id)
        with self._lock:
            self._purge_expired()
            self._items[key] = state
        return state

    def clear(self, channel: str | None, user_id: str | None, session_id: str | None) -> None:
        key = self._make_key(channel, user_id, session_id)
        with self._lock:
            self._items.pop(key, None)

