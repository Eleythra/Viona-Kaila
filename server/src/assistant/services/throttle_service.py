from collections import deque
from time import time


class ThrottleService:
    def __init__(self, window_seconds: int, max_messages: int):
        self.window_seconds = window_seconds
        self.max_messages = max_messages
        self._store: dict[str, deque[float]] = {}

    def is_limited(self, user_id: str | None) -> bool:
        if not user_id:
            return False
        now = time()
        q = self._store.setdefault(user_id, deque())
        while q and (now - q[0]) > self.window_seconds:
            q.popleft()
        if len(q) >= self.max_messages:
            return True
        q.append(now)
        return False

