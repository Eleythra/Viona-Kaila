from typing import Literal, Optional
from pydantic import BaseModel, Field


IntentName = Literal[
    "fault_report",
    "complaint",
    "request",
    "reservation",
    "special_need",
    "hotel_info",
    "chitchat",
    "current_time",
    "unknown",
]
SourceName = Literal["rule", "llm", "rag", "fallback"]
DepartmentName = Literal["reception", "guest_relations"]
ResponseMode = Literal["fixed", "guided", "answer", "fallback"]


class IntentResult(BaseModel):
    intent: IntentName
    sub_intent: Optional[str] = None
    entity: Optional[str] = None
    department: Optional[DepartmentName] = None
    needs_rag: bool = False
    response_mode: ResponseMode = "fallback"
    confidence: float = Field(ge=0.0, le=1.0)
    source: SourceName

