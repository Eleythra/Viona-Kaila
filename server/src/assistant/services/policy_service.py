from typing import Literal

from assistant.schemas.intent import IntentName


PolicyName = Literal[
    "compose_fault",
    "compose_complaint",
    "compose_request",
    "compose_reservation",
    "compose_special_need",
    "compose_chitchat",
    "compose_current_time",
    "answer_hotel_info",
    "fallback",
]


class PolicyService:
    def choose(self, intent: IntentName, confidence: float, threshold: float, source: str | None = None) -> PolicyName:
        if intent == "fault_report":
            return "compose_fault"
        if intent == "complaint":
            return "compose_complaint"
        if intent == "request":
            return "compose_request"
        if intent == "reservation":
            return "compose_reservation"
        if intent == "special_need":
            return "compose_special_need"
        if intent == "chitchat":
            return "compose_chitchat"
        if intent == "current_time":
            return "compose_current_time"
        if intent == "hotel_info":
            # If rules matched, do controlled hotel_info retrieval even without classifier threshold.
            if source == "rule":
                return "answer_hotel_info"
            if confidence >= threshold:
                return "answer_hotel_info"
            # Slightly lenient path: try RAG once more, fallback remains last.
            if confidence >= max(0.45, threshold - 0.15):
                return "answer_hotel_info"
            return "fallback"

        return "fallback"

