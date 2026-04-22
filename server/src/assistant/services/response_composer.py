from assistant.core.chatbot_languages import CHATBOT_UI_LANG_SET, orchestrator_branch_lang
from assistant.services.localization_service import LocalizationService
from datetime import datetime
import re


DEVICE_LABELS = {
    "tr": {
        "television": "Televizyon",
        "shower": "Duş",
        "keycard": "Kart",
        "hvac": "Klima",
        "lighting": "Işık",
        "internet": "İnternet bağlantısı",
        "kettle": "Kettle",
        "minibar": "Minibar",
        "cabinet": "Dolap",
    },
    "en": {
        "television": "TV",
        "shower": "shower",
        "keycard": "key card",
        "hvac": "air conditioner",
        "lighting": "lighting",
        "internet": "internet connection",
        "kettle": "kettle",
        "minibar": "minibar",
        "cabinet": "cabinet",
    },
    "de": {
        "television": "Fernseher",
        "shower": "Dusche",
        "keycard": "Karte",
        "hvac": "Klimaanlage",
        "lighting": "Licht",
        "internet": "Internetverbindung",
        "kettle": "Wasserkocher",
        "minibar": "Minibar",
        "cabinet": "Schrank",
    },
    "pl": {
        "television": "Telewizor",
        "shower": "Prysznic",
        "keycard": "Karta",
        "hvac": "Klimatyzacja",
        "lighting": "Oświetlenie",
        "internet": "internet",
        "kettle": "Czajnik",
        "minibar": "minibar",
        "cabinet": "szafa",
    },
}

SOCIAL_VARIANTS = {
    "tr": {
        "greeting": [
            "Merhaba, ben Viona; Kaila Beach Hotel'deki dijital asistanınızım. Size nasıl yardımcı olabilirim?",
            "Merhaba. Kaila Beach Hotel'de konaklamanızla ilgili sorularınızda yardımcı olabilirim.",
            "Selam, hoş geldiniz. Otel hizmetleriyle ilgili size kısa ve net şekilde yardımcı olabilirim.",
        ],
        "thanks": [
            "Rica ederim. Konaklamanızla ilgili başka bir konuda yardımcı olabilirim.",
            "Ne demek, memnuniyetle. Kaila Beach Hotel ile ilgili başka bir sorunuz varsa buradayım.",
            "Ben teşekkür ederim. İsterseniz başka bir konuda da yardımcı olabilirim.",
        ],
        "farewell": [
            "Görüşmek üzere. İhtiyacınız olursa yine buradayım.",
            "Hoşça kalın. Dilediğiniz zaman yazabilirsiniz.",
        ],
        "apology_from_user": [
            "Hiç sorun değil. Size memnuniyetle yardımcı olmaya devam edebilirim.",
            "Sorun değil, anlayışla karşılıyorum. Devam edebiliriz.",
        ],
        "compliment": [
            "Nazik geri bildiriminiz için teşekkür ederim. Yardımcı olabildiysem ne mutlu bana.",
            "Güzel sözleriniz için teşekkür ederim. Her zaman yardımcı olmaya hazırım.",
        ],
        "how_are_you": [
            "Teşekkür ederim, iyiyim. Kaila Beach Hotel ile ilgili sorularınızda yanınızdayım.",
            "Gayet iyiyim, teşekkürler. Konaklamanızla ilgili nasıl yardımcı olabilirim?",
        ],
    },
    "en": {
        "greeting": [
            "Hello, I'm Viona, your digital assistant at Kaila Beach Hotel. How can I help you?",
            "Hello. I can help with your stay and hotel services at Kaila Beach Hotel.",
            "Hi and welcome. Ask me anything about the hotel or your stay.",
        ],
        "thanks": [
            "You're very welcome. I'm here if you need any help with your stay at Kaila Beach Hotel.",
            "Glad to help. Let me know if you need anything else about the hotel or your stay.",
            "My pleasure. I can also help with other questions about your stay.",
        ],
        "farewell": [
            "See you. I'm here whenever you need help during your stay.",
            "Goodbye for now. Feel free to message me anytime.",
        ],
        "apology_from_user": [
            "No worries at all. I'm happy to keep helping you.",
            "That's absolutely okay. We can continue anytime.",
        ],
        "compliment": [
            "Thank you for your kind words. Glad I could help.",
            "I appreciate it. I'm always here to support your stay.",
        ],
        "how_are_you": [
            "I'm doing well, thank you. I'm here to help with anything about Kaila Beach Hotel.",
            "Doing great, thank you. How can I assist you with your stay?",
        ],
    },
    "de": {
        "greeting": [
            "Hallo, ich bin Viona, Ihre digitale Assistentin im Kaila Beach Hotel. Wie kann ich Ihnen helfen?",
            "Hallo. Ich unterstütze Sie gern bei Fragen zu Ihrem Aufenthalt im Kaila Beach Hotel.",
            "Willkommen. Ich helfe Ihnen gern bei Hotelservices und Aufenthaltsthemen.",
        ],
        "thanks": [
            "Gern geschehen. Wenn Sie noch Fragen zu Ihrem Aufenthalt haben, helfe ich Ihnen gern weiter.",
            "Sehr gern. Ich bin hier, wenn Sie weitere Hilfe rund um das Hotel benötigen.",
            "Keine Ursache. Bei weiteren Fragen unterstütze ich Sie gern.",
        ],
        "farewell": [
            "Auf Wiedersehen. Ich bin jederzeit für Sie da, wenn Sie Hilfe brauchen.",
            "Bis bald. Schreiben Sie mir gern wieder.",
        ],
        "apology_from_user": [
            "Kein Problem. Ich helfe Ihnen gern weiter.",
            "Alles gut. Wir können direkt weitermachen.",
        ],
        "compliment": [
            "Vielen Dank für Ihr nettes Feedback. Es freut mich, dass ich helfen konnte.",
            "Danke für die freundlichen Worte. Ich unterstütze Sie jederzeit gern.",
        ],
        "how_are_you": [
            "Danke, mir geht es gut. Ich unterstütze Sie gern bei Fragen rund um das Kaila Beach Hotel.",
            "Mir geht es gut, danke. Wie kann ich Ihnen bei Ihrem Aufenthalt helfen?",
        ],
    },
    "pl": {
        "greeting": [
            "Dzień dobry! Jestem Viona, cyfrowa asystentka w hotelu Kaila Beach. W czym mogę pomóc?",
            "Dzień dobry. Chętnie pomogę w sprawach pobytu i usług Kaila Beach Hotel.",
            "Witamy. Jestem do dyspozycji w kwestiach hotelu i pobytu.",
        ],
        "thanks": [
            "Proszę bardzo. Jeśli pojawią się kolejne pytania o hotel lub pobyt, chętnie pomogę.",
            "Cała przyjemność. Jestem dostępna, gdy potrzebujesz wsparcia w sprawach hotelu.",
            "Cieszę się, że mogłam pomóc. W razie potrzeby odpowiem też na inne pytania.",
        ],
        "farewell": [
            "Do zobaczenia. Gdy będziesz potrzebować pomocy, jestem tutaj.",
            "Do widzenia. Pisz w dowolnym momencie.",
        ],
        "apology_from_user": [
            "Nic się nie stało. Chętnie dalej pomogę.",
            "Wszystko w porządku. Możemy kontynuować.",
        ],
        "compliment": [
            "Dziękuję za miłe słowa. Cieszę się, że mogłam pomóc.",
            "Dziękuję za feedback. Zawsze chętnie pomogę.",
        ],
        "how_are_you": [
            "Dziękuję, u mnie wszystko w porządku. Jestem tutaj, by pomóc w sprawach Kaila Beach Hotel.",
            "U mnie dobrze, dziękuję. W czym mogę pomóc w sprawie pobytu?",
        ],
    },
}


class ResponseComposer:
    def __init__(self, localization_service: LocalizationService):
        self.i18n = localization_service

    def compose(
        self,
        intent: str,
        sub_intent: str | None,
        entity: str | None,
        language: str,
        seed_text: str | None = None,
    ) -> str:
        if intent == "fault_report":
            return self._fault(sub_intent, entity, language)
        if intent == "recommendation":
            return self._recommendation(sub_intent, entity, language)
        if intent == "complaint":
            return self._complaint(sub_intent, language)
        if intent == "request":
            return self._request(entity, language)
        if intent == "reservation":
            return self._reservation(sub_intent, entity, language)
        if intent == "special_need":
            return self._special_need(sub_intent, entity, language)
        if intent == "chitchat":
            return self._chitchat(sub_intent, entity, language, seed_text)
        if intent == "current_time":
            return self._current_time(language)
        return self.i18n.get("reception_fallback_message", language)

    def _fault(self, sub_intent: str | None, entity: str | None, language: str) -> str:
        # Prefer explicit entity mapping when available.
        _dl = orchestrator_branch_lang(language)
        device = (DEVICE_LABELS.get(_dl, DEVICE_LABELS["tr"]).get(entity or "", None))
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
            device = (DEVICE_LABELS.get(_dl, DEVICE_LABELS["tr"]).get(device_entity, None))
            if device:
                return self.i18n.get("fault_template_with_device", language).format(device=device)

        return self.i18n.get("fault_template_generic", language)

    def _recommendation(self, sub_intent: str | None, entity: str | None, language: str) -> str:
        key_by_entity = {
            "fish_pref": "recommendation_fish",
            "meat_bbq_pref": "recommendation_meat",
            "pizza_snack_pref": "recommendation_pizza_snack",
            "coffee_dessert_pref": "recommendation_coffee_dessert",
            "kids_activity_pref": "recommendation_kids_activity",
            "romantic_dinner_pref": "recommendation_romantic_dinner",
            "general_dining_pref": "recommendation_general_dining",
        }
        key = key_by_entity.get(entity or "")
        if not key:
            key = "recommendation_kids_activity" if sub_intent == "activity_recommendation" else "recommendation_pizza_snack"
        return self.i18n.get(key, language)

    def _complaint(self, sub_intent: str | None, language: str) -> str:
        if sub_intent == "noise_complaint":
            return self.i18n.get("complaint_noise", language)
        if sub_intent == "cleanliness_complaint":
            return self.i18n.get("complaint_cleanliness", language)
        if sub_intent == "lost_property_complaint":
            return self.i18n.get("complaint_lost_property", language)
        return self.i18n.get("complaint_default", language)

    def _request(self, entity: str | None, language: str) -> str:
        if entity == "towel":
            return self.i18n.get("request_towel", language)
        if entity == "blanket":
            return self.i18n.get("request_blanket", language)
        if entity == "water":
            return self.i18n.get("request_water", language)
        if entity == "pillow":
            return self.i18n.get("request_pillow", language)
        if entity == "housekeeping_service":
            return self.i18n.get("request_housekeeping", language)
        if entity == "reception_contact":
            return self.i18n.get("request_reception_contact", language)
        if entity == "premium_table_reservation":
            return self.i18n.get("request_premium_reservation_reception", language)
        if entity == "spa_contact":
            return self.i18n.get("request_spa_booking_contact", language)
        if entity == "ala_carte_reservation":
            return self.i18n.get("request_ala_carte_reservation", language)
        if entity == "guest_relations_contact":
            return self.i18n.get("request_guest_relations_contact", language)
        if entity == "transfer_request":
            return self.i18n.get("request_transfer", language)
        if entity == "lunch_box_request":
            return self.i18n.get("request_lunch_box", language)
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

    def _pick_social_variant(self, language: str, intent_key: str, seed_text: str | None) -> str | None:
        lang = orchestrator_branch_lang(language)
        if lang not in SOCIAL_VARIANTS:
            lang = "en"
        choices = SOCIAL_VARIANTS.get(lang, {}).get(intent_key, [])
        if not choices:
            return None
        seed = (seed_text or "").lower().strip()
        seed = re.sub(r"\s+", " ", seed)
        sig = f"{lang}|{intent_key}|{seed}"
        idx = sum(ord(ch) for ch in sig) % len(choices)
        return choices[idx]

    def _chitchat(self, sub_intent: str | None, entity: str | None, language: str, seed_text: str | None = None) -> str:
        if sub_intent == "language_switch" and entity in CHATBOT_UI_LANG_SET:
            return self.i18n.get(f"chitchat_switch_{entity}", language)
        if sub_intent in ("assistant_intro", "identity_question"):
            return self.i18n.get("chitchat_identity_question", language)
        if sub_intent == "thanks":
            return self._pick_social_variant(language, "thanks", seed_text) or self.i18n.get("chitchat_thanks", language)
        if sub_intent == "farewell":
            return self._pick_social_variant(language, "farewell", seed_text) or self.i18n.get("chitchat_farewell", language)
        if sub_intent == "apology_from_user":
            return self._pick_social_variant(language, "apology_from_user", seed_text) or self.i18n.get(
                "chitchat_apology_from_user", language
            )
        if sub_intent == "compliment":
            return self._pick_social_variant(language, "compliment", seed_text) or self.i18n.get("chitchat_compliment", language)
        if sub_intent == "how_are_you":
            return self._pick_social_variant(language, "how_are_you", seed_text) or self.i18n.get("chitchat_how_are_you", language)
        if sub_intent == "confusion":
            return self.i18n.get("chitchat_confusion_generic", language)
        if sub_intent == "cancel_command_hint":
            return self.i18n.get("chitchat_cancel_command_hint", language)
        return self._pick_social_variant(language, "greeting", seed_text) or self.i18n.get("chitchat_greeting", language)

    def _current_time(self, language: str) -> str:
        now = datetime.now()
        hhmm = now.strftime("%H:%M")
        return self.i18n.get("current_time_template", language).format(time=hhmm)

