from assistant.schemas.chat import ChatRequest
from assistant.schemas.response import ChatResponse
from assistant.services.language_service import LanguageService
from assistant.services.localization_service import LocalizationService
from assistant.services.rule_engine import RuleEngine
from assistant.services.intent_service import IntentService
from assistant.services.policy_service import PolicyService
from assistant.services.rag_service import RagService
from assistant.services.response_service import ResponseService
from assistant.services.throttle_service import ThrottleService
from assistant.services.device_extractor import DeviceExtractor
from assistant.services.response_composer import ResponseComposer
from assistant.utils.text_normalizer import normalize_text
from assistant.core.config import Settings
from assistant.core.logger import get_logger

logger = get_logger("assistant.orchestrator")

_VALID_LANG = frozenset({"tr", "en", "de", "ru"})


def _valid_conversation_language(value: str | None) -> str | None:
    if not value:
        return None
    v = str(value).lower().strip()
    return v if v in _VALID_LANG else None


class ChatOrchestrator:
    def __init__(
        self,
        settings: Settings,
        language_service: LanguageService,
        localization_service: LocalizationService,
        rule_engine: RuleEngine,
        intent_service: IntentService,
        policy_service: PolicyService,
        rag_service: RagService,
        response_service: ResponseService,
        throttle_service: ThrottleService,
        device_extractor: DeviceExtractor,
        response_composer: ResponseComposer,
    ):
        self.settings = settings
        self.language_service = language_service
        self.localization_service = localization_service
        self.rule_engine = rule_engine
        self.intent_service = intent_service
        self.policy_service = policy_service
        self.rag_service = rag_service
        self.response_service = response_service
        self.throttle_service = throttle_service
        self.device_extractor = device_extractor
        self.response_composer = response_composer

    def handle(self, payload: ChatRequest) -> ChatResponse:
        normalized = normalize_text(payload.message)
        ui_language = payload.ui_language or "tr"
        if ui_language not in ("tr", "en", "de", "ru"):
            ui_language = "tr"
        conv = _valid_conversation_language(payload.conversation_language)
        # Primary reply language must follow selected session/app language.
        # Message-level detection is only a backup when selected language is absent.
        selected_lang = conv or ui_language
        msg_detect = self.language_service.detect(normalized, fallback=selected_lang or "tr")
        msg_detect = self.language_service.coerce_reply_language(normalized, msg_detect, selected_lang)
        reply_base = selected_lang if selected_lang in ("tr", "en", "de", "ru") else msg_detect

        if self.throttle_service.is_limited(payload.user_id):
            resp = self._fallback_response("unknown", 0.0, reply_base, ui_language)
            logger.info(
                "chat_request throttled user_id=%s reply_lang=%s ui_lang=%s type=%s",
                payload.user_id,
                reply_base,
                ui_language,
                resp.type,
            )
            return resp

        if not normalized:
            resp = self._fallback_response("unknown", 0.0, reply_base, ui_language)
            logger.info(
                "chat_request empty_input reply_lang=%s ui_lang=%s type=%s",
                reply_base,
                ui_language,
                resp.type,
            )
            return resp

        rule_intent = self.rule_engine.match(normalized)
        if rule_intent:
            reply_lang = reply_base
            if (
                rule_intent.intent == "chitchat"
                and rule_intent.sub_intent == "language_switch"
                and rule_intent.entity in ("tr", "en", "de", "ru")
            ):
                reply_lang = rule_intent.entity
            response = self._apply_policy(
                intent=rule_intent.intent,
                sub_intent=rule_intent.sub_intent,
                entity=rule_intent.entity,
                confidence=rule_intent.confidence,
                source=rule_intent.source,
                message=payload.message,
                reply_language=reply_lang,
                ui_language=ui_language,
                needs_rag=rule_intent.needs_rag,
                response_mode=rule_intent.response_mode,
            )
            rag_used = response.meta.source == "rag"
            logger.info(
                "chat_request input=%r reply_lang=%s ui_lang=%s rule=%s intent=%s needs_rag=%s response_mode=%s rag_used=%s final_type=%s",
                payload.message,
                reply_lang,
                ui_language,
                rule_intent.intent,
                rule_intent.intent,
                rule_intent.needs_rag,
                rule_intent.response_mode,
                rag_used,
                response.type,
            )
            return response

        llm_intent = self.intent_service.classify(payload.message)
        logger.info(
            "classifier_called intent=%s needs_rag=%s response_mode=%s confidence=%.2f",
            llm_intent.intent,
            llm_intent.needs_rag,
            llm_intent.response_mode,
            llm_intent.confidence,
        )
        if llm_intent.confidence < self.settings.low_confidence_fallback_threshold:
            resp = self._fallback_response(llm_intent.intent, llm_intent.confidence, reply_base, ui_language)
            logger.info(
                "chat_request input=%r reply_lang=%s ui_lang=%s rule=%s intent=%s needs_rag=%s response_mode=%s rag_used=%s final_type=%s",
                payload.message,
                reply_base,
                ui_language,
                "none",
                llm_intent.intent,
                llm_intent.needs_rag,
                llm_intent.response_mode,
                False,
                resp.type,
            )
            return resp

        response = self._apply_policy(
            intent=llm_intent.intent,
            sub_intent=llm_intent.sub_intent,
            entity=llm_intent.entity,
            confidence=llm_intent.confidence,
            source=llm_intent.source,
            message=payload.message,
            reply_language=reply_base,
            ui_language=ui_language,
            needs_rag=llm_intent.needs_rag,
            response_mode=llm_intent.response_mode,
        )
        rag_used = response.meta.source == "rag"
        logger.info(
            "chat_request input=%r reply_lang=%s ui_lang=%s rule=%s intent=%s needs_rag=%s response_mode=%s rag_used=%s final_type=%s",
            payload.message,
            reply_base,
            ui_language,
            "none",
            llm_intent.intent,
            llm_intent.needs_rag,
            llm_intent.response_mode,
            rag_used,
            response.type,
        )
        return response

    def _apply_policy(
        self,
        intent: str,
        sub_intent: str | None,
        entity: str | None,
        confidence: float,
        source: str,
        message: str,
        reply_language: str,
        ui_language: str,
        *,
        needs_rag: bool = True,
        response_mode: str = "fallback",
    ) -> ChatResponse:
        policy = self.policy_service.choose(
            intent,
            confidence,
            self.settings.intent_confidence_threshold,
            source,
        )

        if policy == "compose_fault":
            # Preserve rule/classifier sub_intent for deterministic fault routing.
            # If entity is missing or not precise, ResponseComposer will still map from sub_intent.
            extracted_entity = entity or self.rule_engine.extract_entity(normalize_text(message))
            composed = self.response_composer.compose(
                intent,
                sub_intent or "room_equipment_fault",
                extracted_entity,
                reply_language,
            )
            return self.response_service.build(
                "redirect",
                composed,
                intent,
                1.0,
                reply_language,
                ui_language,
                source,
            )

        if policy == "compose_complaint":
            extracted_entity = entity or self.rule_engine.extract_entity(normalize_text(message))
            composed = self.response_composer.compose(
                intent,
                sub_intent or self._guess_complaint_sub_intent(message),
                extracted_entity,
                reply_language,
            )
            return self.response_service.build(
                "redirect",
                composed,
                intent,
                confidence,
                reply_language,
                ui_language,
                source,
            )

        if policy == "compose_request":
            extracted_entity = entity or self.rule_engine.extract_entity(normalize_text(message))
            composed = self.response_composer.compose(
                intent,
                None,
                extracted_entity,
                reply_language,
            )
            return self.response_service.build(
                "redirect",
                composed,
                intent,
                confidence,
                reply_language,
                ui_language,
                source,
            )

        if policy == "compose_reservation":
            extracted_entity = entity or self.rule_engine.extract_entity(normalize_text(message))
            composed = self.response_composer.compose(
                intent,
                sub_intent or self._guess_reservation_sub_intent(message),
                extracted_entity,
                reply_language,
            )
            return self.response_service.build(
                "redirect",
                composed,
                intent,
                confidence,
                reply_language,
                ui_language,
                source,
            )

        if policy == "compose_special_need":
            extracted_entity = entity or self.rule_engine.extract_entity(normalize_text(message))
            composed = self.response_composer.compose(
                intent,
                sub_intent or self._guess_special_sub_intent(message),
                extracted_entity,
                reply_language,
            )
            return self.response_service.build(
                "inform",
                composed,
                intent,
                confidence,
                reply_language,
                ui_language,
                source,
            )

        if policy == "compose_chitchat":
            composed = self.response_composer.compose(
                intent,
                sub_intent,
                entity,
                reply_language,
                seed_text=message,
            )
            return self.response_service.build(
                "inform",
                composed,
                intent,
                1.0,
                reply_language,
                ui_language,
                source,
            )

        if policy == "compose_current_time":
            composed = self.response_composer.compose(
                intent,
                sub_intent,
                entity,
                reply_language,
            )
            return self.response_service.build(
                "answer",
                composed,
                intent,
                1.0,
                reply_language,
                ui_language,
                source,
            )

        if policy == "answer_hotel_info":
            fixed_entity_key = (entity or "").strip()
            if fixed_entity_key in (
                "fixed_restaurant_info",
                "fixed_pool_beach_info",
                "fixed_spa_info",
                "fixed_animation_info",
            ):
                fixed_text = self.localization_service.get(fixed_entity_key, reply_language)
                return self.response_service.build(
                    "answer",
                    fixed_text,
                    intent,
                    confidence,
                    reply_language,
                    ui_language,
                    "rule",
                )
            if source == "llm" and not needs_rag:
                logger.info(
                    "hotel_info_skip_rag classifier_needs_rag=false response_mode=%s",
                    response_mode,
                )
                return self._fallback_response(intent, confidence, reply_language, ui_language)
            logger.info(
                "hotel_info_path rag_called=true intent=%s needs_rag=%s response_mode=%s source=%s",
                intent,
                needs_rag,
                response_mode,
                source,
            )
            rag_answer = self.rag_service.answer(message, reply_language)
            if rag_answer:
                return self.response_service.build(
                    "answer",
                    rag_answer,
                    intent,
                    confidence,
                    reply_language,
                    ui_language,
                    "rag",
                )
            logger.info("hotel_info_path fallback_reason=rag_no_result")

        return self._fallback_response(intent, confidence, reply_language, ui_language)

    def _fallback_response(self, intent: str, confidence: float, reply_language: str, ui_language: str) -> ChatResponse:
        return self.response_service.build(
            "fallback",
            self.localization_service.get("reception_fallback_message", reply_language),
            "unknown" if intent not in ("hotel_info", "fault_report", "complaint", "request", "reservation", "special_need") else intent,
            confidence,
            reply_language,
            ui_language,
            "fallback",
        )

    @staticmethod
    def _guess_complaint_sub_intent(message: str) -> str:
        t = (message or "").lower()
        if "gürültü" in t or "gurultu" in t or "noise" in t:
            return "noise_complaint"
        if "temizlik" in t or "clean" in t:
            return "cleanliness_complaint"
        if "personel" in t or "staff" in t:
            return "staff_complaint"
        if "oda" in t or "room" in t:
            return "room_condition_complaint"
        return "service_complaint"

    @staticmethod
    def _guess_reservation_sub_intent(message: str) -> str:
        t = (message or "").lower()
        if "erken giriş" in t or "erken giris" in t or "early checkin" in t:
            return "early_checkin_request"
        if "geç çıkış" in t or "gec cikis" in t or "late checkout" in t:
            return "late_checkout_request"
        if "oda değiş" in t or "oda degis" in t or "room change" in t:
            return "room_change_request"
        if "görünmüyor" in t or "gorunmuyor" in t or "not found" in t:
            return "reservation_issue"
        if "uzat" in t or "extend" in t or "iki gece daha" in t:
            return "extension_request"
        return "new_reservation"

    @staticmethod
    def _guess_special_sub_intent(message: str) -> str:
        t = (message or "").lower()
        # Dietary preference
        if "vegan" in t or "vejetaryen" in t or "vegetarian" in t or "vegetarier" in t:
            return "dietary_preference"
        # Medical dietary restrictions (celiac/gluten/lactose)
        if (
            "çölya" in t
            or "çölyak" in t
            or "colyak" in t
            or "gluten" in t
            or "hassasiyet" in t
            or "kein gluten" in t
            or "laktoz" in t
            or "laktose" in t
            or "lactose" in t
            or "süt dokunuyor" in t
            or "milk" in t
            or "dairy" in t
            or "лактоз" in t
            or "молоко" in t
        ):
            return "dietary_medical_restriction"
        # Allergy (including peanut/nut)
        if (
            "alerji" in t
            or "alerjen" in t
            or "allergy" in t
            or "allergie" in t
            or "peanut" in t
            or "fıstık" in t
            or "erdnuss" in t
            or "арахис" in t
            or "nuts" in t
            or "аллергия" in t
        ):
            return "allergy"
        if (
            "bebek" in t
            or "bebeğim" in t
            or "bebeği" in t
            or "mama" in t
            or "baby food" in t
            or "babynahrung" in t
            or "детское питание" in t
        ):
            return "baby_need"
        if (
            "erişilebilirlik" in t
            or "erisilebilirlik" in t
            or "accessibility" in t
            or "wheelchair" in t
            or "rollstuhl" in t
            or "доступность" in t
            or "доступ" in t
            or "коляска" in t
        ):
            return "accessibility_need"
        return "other_special_need"

