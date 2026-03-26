"""Extract JSON objects from LLM output (fences, prose, or first balanced object)."""

from __future__ import annotations

import json
import re
from typing import Any


_FENCE_RE = re.compile(r"```(?:json)?\s*([\s\S]*?)\s*```", re.IGNORECASE)


def extract_first_json_object(text: str) -> str | None:
    """Return a substring likely to be parseable JSON (fenced block or first `{...}`)."""
    if not text or not str(text).strip():
        return None
    s = str(text).strip()
    m = _FENCE_RE.search(s)
    if m:
        inner = (m.group(1) or "").strip()
        if inner:
            s = inner
    try:
        json.loads(s)
        return s
    except Exception:
        pass
    start = s.find("{")
    if start == -1:
        return None
    depth = 0
    in_str = False
    esc = False
    for i in range(start, len(s)):
        c = s[i]
        if in_str:
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == '"':
                in_str = False
            continue
        if c == '"':
            in_str = True
            continue
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return s[start : i + 1]
    return None


def parse_json_loose(text: str) -> Any | None:
    """Parse JSON from model output: full string, fenced region, or first object."""
    if text is None:
        return None
    s = str(text).strip()
    if not s:
        return None
    try:
        return json.loads(s)
    except Exception:
        pass
    sub = extract_first_json_object(s)
    if sub:
        try:
            return json.loads(sub)
        except Exception:
            pass
    return None
