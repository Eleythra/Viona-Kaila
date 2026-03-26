from assistant.services.localization_service import LocalizationService
from datetime import datetime


DEVICE_LABELS = {
    "tr": {
        "television": "Televizyon",
        "shower": "Duş",
        "keycard": "Kart",
        "hvac": "Klima",
        "lighting": "Işık",
    },
    "en": {
        "television": "TV",
        "shower": "shower",
        "keycard": "key card",
        "hvac": "air conditioner",
        "lighting": "lighting",
    },
    "de": {
        "television": "Fernseher",
        "shower": "Dusche",
        "keycard": "Karte",
        "hvac": "Klimaanlage",
        "lighting": "Licht",
    },
    "ru": {
        "television": "Телевизор",
        "shower": "Душ",
        "keycard": "Карта",
        "hvac": "Кондиционер",
        "lighting": "Свет",
    },
}


class ResponseComposer:
    def __init__(self, localization_service: LocalizationService):
        self.i18n = localization_service

    def compose(self, intent: str, sub_intent: str | None, entity: str | None, language: str) -> str:
        if intent == "fault_report":
            return self._fault(sub_intent, entity, language)
        if intent == "complaint":
            return self._complaint(sub_intent, language)
        if intent == "request":
            return self._request(entity, language)
        if intent == "reservation":
            return self._reservation(sub_intent, entity, language)
        if intent == "special_need":
            return self._special_need(sub_intent, entity, language)
        if intent == "chitchat":
            return self._chitchat(sub_intent, entity, language)
        if intent == "current_time":
            return self._current_time(language)
        return self.i18n.get("reception_fallback_message", language)

    def _fault(self, sub_intent: str | None, entity: str | None, language: str) -> str:
        # Prefer explicit entity mapping when available.
        device = (DEVICE_LABELS.get(language, DEVICE_LABELS["tr"]).get(entity or "", None))
        if device:
            return self.i18n.get("fault_template_with_device", language).format(device=device)

        # If entity is missing/ambiguous, derive device from deterministic sub-intent.
        sub_to_device_entity = {
            "bathroom_fault": "shower",
            "keycard_fault": "keycard",
            "hvac_fault": "hvac",
            "lighting_fault": "lighting",
            # room_equipment_fault: keep generic unless entity is present.
        }
        device_entity = sub_to_device_entity.get(sub_intent or "")
        if device_entity:
            device = (DEVICE_LABELS.get(language, DEVICE_LABELS["tr"]).get(device_entity, None))
            if device:
                return self.i18n.get("fault_template_with_device", language).format(device=device)

        return self.i18n.get("fault_template_generic", language)

    def _complaint(self, sub_intent: str | None, language: str) -> str:
        if sub_intent == "noise_complaint":
            return self.i18n.get("complaint_noise", language)
        if sub_intent == "cleanliness_complaint":
            return self.i18n.get("complaint_cleanliness", language)
        return self.i18n.get("complaint_default", language)

    def _request(self, entity: str | None, language: str) -> str:
        if entity == "towel":
            return self.i18n.get("request_towel", language)
        if entity == "blanket":
            return self.i18n.get("request_blanket", language)
        return self.i18n.get("request_default", language)

    def _reservation(self, sub_intent: str | None, entity: str | None, language: str) -> str:
        s = sub_intent or ""
        if s == "early_checkin_request" or entity == "early_checkin":
            return self.i18n.get("reservation_early_checkin", language)
        if s == "late_checkout_request" or entity == "late_checkout":
            return self.i18n.get("reservation_late_checkout", language)
        if s == "room_change_request" or entity == "room_change":
            return self.i18n.get("reservation_room_change", language)
        return self.i18n.get("reservation_default", language)

    def _special_need(self, sub_intent: str | None, entity: str | None, language: str) -> str:
        if (
            sub_intent == "dietary_medical_restriction"
            or entity in ("celiac", "gluten_related_restriction", "lactose_related_restriction")
        ):
            return self.i18n.get("special_need_celiac", language)
        if sub_intent == "dietary_preference" or entity in ("vegan", "vegetarian"):
            return self.i18n.get("special_need_vegan", language)
        if sub_intent == "allergy" or entity == "allergy":
            return self.i18n.get("special_need_allergy", language)
        if sub_intent == "baby_need" or entity == "baby_need":
            return self.i18n.get("special_need_baby_need", language)
        if sub_intent == "accessibility_need" or entity == "accessibility_need":
            return self.i18n.get("special_need_accessibility_need", language)
        return self.i18n.get("special_need_default", language)

    def _chitchat(self, sub_intent: str | None, entity: str | None, language: str) -> str:
        if sub_intent == "language_switch" and entity in ("tr", "en", "de", "ru"):
            return self.i18n.get(f"chitchat_switch_{entity}", language)
        if sub_intent == "assistant_intro":
            return self.i18n.get("chitchat_assistant_intro", language)
        return self.i18n.get("chitchat_greeting", language)

    def _current_time(self, language: str) -> str:
        now = datetime.now()
        hhmm = now.strftime("%H:%M")
        return self.i18n.get("current_time_template", language).format(time=hhmm)

