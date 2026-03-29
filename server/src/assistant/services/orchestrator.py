from assistant.schemas.chat import ChatRequest
from assistant.schemas.response import ChatMeta, ChatResponse
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
from assistant.services.metadata_catalog import domain_for_intent, metadata_for_intent
from assistant.utils.text_normalizer import normalize_text
from assistant.core.config import Settings
from assistant.core.logger import get_logger
import re

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
        decision_path: list[str] = ["request_context", "normalization", "language_context"]
        openai_path_used = False
        vector_store_used = False
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
        if self.settings.allow_implicit_language_drift:
            reply_base = msg_detect
        else:
            reply_base = selected_lang if selected_lang in ("tr", "en", "de", "ru") else msg_detect

        if self.throttle_service.is_limited(payload.user_id):
            decision_path.append("throttle")
            resp = self._fallback_response("unknown", 0.0, reply_base, ui_language, fallback_reason="throttled")
            logger.info(
                "chat_request throttled user_id=%s reply_lang=%s ui_lang=%s type=%s decision_path=%s fallback_reason=%s",
                payload.user_id,
                reply_base,
                ui_language,
                resp.type,
                " > ".join(decision_path),
                "throttled",
            )
            return resp

        if not normalized:
            decision_path.append("empty_input")
            resp = self._fallback_response("unknown", 0.0, reply_base, ui_language, fallback_reason="validation_error")
            logger.info(
                "chat_request empty_input reply_lang=%s ui_lang=%s type=%s decision_path=%s fallback_reason=%s",
                reply_base,
                ui_language,
                resp.type,
                " > ".join(decision_path),
                "validation_error",
            )
            return resp

        multi_clause_response = self._try_multi_clause_rule_path(
            normalized=normalized,
            original_message=payload.message,
            reply_language=reply_base,
            ui_language=ui_language,
        )
        if multi_clause_response is not None:
            decision_path.append("multi_clause_rule")
            logger.info(
                "chat_request input=%r reply_lang=%s ui_lang=%s intent=%s domain=%s route_type=%s action_type=%s decision_path=%s final_type=%s",
                payload.message,
                multi_clause_response.meta.language,
                ui_language,
                multi_clause_response.meta.intent,
                domain_for_intent(multi_clause_response.meta.intent),
                metadata_for_intent(multi_clause_response.meta.intent).get("route_type", "none"),
                metadata_for_intent(multi_clause_response.meta.intent).get("action_type", "fallback"),
                " > ".join(decision_path),
                multi_clause_response.type,
            )
            return multi_clause_response

        rule_intent = self.rule_engine.match(normalized)
        if rule_intent:
            decision_path.append("rule_engine")
            reply_lang = reply_base
            effective_sub_intent = rule_intent.sub_intent
            effective_entity = rule_intent.entity
            if (
                self.settings.allow_explicit_language_switch
                and
                rule_intent.intent == "chitchat"
                and rule_intent.sub_intent == "language_switch"
                and rule_intent.entity in ("tr", "en", "de", "ru")
            ):
                reply_lang = rule_intent.entity
            if (
                not self.settings.allow_explicit_language_switch
                and rule_intent.intent == "chitchat"
                and rule_intent.sub_intent == "language_switch"
            ):
                # Keep session-language-first behavior: do not apply switch phrases when disabled.
                effective_sub_intent = "greeting"
                effective_entity = None
            language_switch_applied = reply_lang != reply_base
            response = self._apply_policy(
                intent=rule_intent.intent,
                sub_intent=effective_sub_intent,
                entity=effective_entity,
                confidence=rule_intent.confidence,
                source=rule_intent.source,
                message=payload.message,
                reply_language=reply_lang,
                ui_language=ui_language,
                needs_rag=rule_intent.needs_rag,
                response_mode=rule_intent.response_mode,
            )
            response = self._attach_action(
                response=response,
                intent=rule_intent.intent,
                sub_intent=effective_sub_intent,
                entity=effective_entity,
            )
            rag_used = response.meta.source == "rag"
            if rag_used:
                vector_store_used = bool((self.settings.openai_vector_store_id or "").strip())
            logger.info(
                "chat_request input=%r selected_language=%s detected_language=%s reply_lang=%s ui_lang=%s language_switch_applied=%s rule=%s intent=%s domain=%s route_type=%s action_type=%s needs_rag=%s response_mode=%s rag_used=%s openai_path_used=%s vector_store_used=%s decision_path=%s social_shortcut_hit=%s final_type=%s",
                payload.message,
                selected_lang,
                msg_detect,
                reply_lang,
                ui_language,
                language_switch_applied,
                rule_intent.intent,
                rule_intent.intent,
                domain_for_intent(rule_intent.intent),
                metadata_for_intent(rule_intent.intent).get("route_type", "none"),
                metadata_for_intent(rule_intent.intent).get("action_type", "fallback"),
                rule_intent.needs_rag,
                rule_intent.response_mode,
                rag_used,
                openai_path_used,
                vector_store_used,
                " > ".join(decision_path + [f"policy:{response.meta.source}"]),
                rule_intent.intent == "chitchat",
                response.type,
            )
            return response

        decision_path.append("llm_classifier")
        openai_path_used = True
        llm_intent = self.intent_service.classify(payload.message)
        logger.info(
            "classifier_called intent=%s needs_rag=%s response_mode=%s confidence=%.2f reason=%s",
            llm_intent.intent,
            llm_intent.needs_rag,
            llm_intent.response_mode,
            llm_intent.confidence,
            llm_intent.reason,
        )
        if llm_intent.confidence < self.settings.low_confidence_fallback_threshold:
            low_confidence_reason = llm_intent.reason or "low_confidence"
            resp = self._fallback_response(
                llm_intent.intent,
                llm_intent.confidence,
                reply_base,
                ui_language,
                fallback_reason=low_confidence_reason,
            )
            logger.info(
                "chat_request input=%r reply_lang=%s ui_lang=%s rule=%s intent=%s domain=%s route_type=%s action_type=%s needs_rag=%s response_mode=%s rag_used=%s openai_path_used=%s vector_store_used=%s decision_path=%s fallback_reason=%s final_type=%s",
                payload.message,
                reply_base,
                ui_language,
                "none",
                llm_intent.intent,
                domain_for_intent(llm_intent.intent),
                metadata_for_intent(llm_intent.intent).get("route_type", "none"),
                metadata_for_intent(llm_intent.intent).get("action_type", "fallback"),
                llm_intent.needs_rag,
                llm_intent.response_mode,
                False,
                openai_path_used,
                vector_store_used,
                " > ".join(decision_path),
                low_confidence_reason,
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
        response = self._attach_action(
            response=response,
            intent=llm_intent.intent,
            sub_intent=llm_intent.sub_intent,
            entity=llm_intent.entity,
        )
        rag_used = response.meta.source == "rag"
        if rag_used:
            vector_store_used = bool((self.settings.openai_vector_store_id or "").strip())
        logger.info(
            "chat_request input=%r selected_language=%s detected_language=%s reply_lang=%s ui_lang=%s language_switch_applied=%s rule=%s intent=%s domain=%s route_type=%s action_type=%s needs_rag=%s response_mode=%s rag_used=%s openai_path_used=%s vector_store_used=%s decision_path=%s social_shortcut_hit=%s final_type=%s",
            payload.message,
            selected_lang,
            msg_detect,
            reply_base,
            ui_language,
            False,
            "none",
            llm_intent.intent,
            domain_for_intent(llm_intent.intent),
            metadata_for_intent(llm_intent.intent).get("route_type", "none"),
            metadata_for_intent(llm_intent.intent).get("action_type", "fallback"),
            llm_intent.needs_rag,
            llm_intent.response_mode,
            rag_used,
            openai_path_used,
            vector_store_used,
            " > ".join(decision_path + [f"policy:{response.meta.source}"]),
            False,
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

        if policy == "compose_recommendation":
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
                confidence,
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
                "fixed_ice_cream_info",
                "fixed_pool_beach_info",
                "fixed_spa_info",
                "fixed_animation_info",
                "fixed_outside_hotel_info",
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
                return self._fallback_response(
                    intent,
                    confidence,
                    reply_language,
                    ui_language,
                    fallback_reason="classifier_needs_rag_false",
                )
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
            rag_reason = getattr(self.rag_service, "last_reason", "rag_no_result")
            logger.info("hotel_info_path fallback_reason=rag_%s", rag_reason)
            return self._fallback_response(
                intent,
                confidence,
                reply_language,
                ui_language,
                fallback_reason=f"rag_{rag_reason}",
            )

        return self._fallback_response(intent, confidence, reply_language, ui_language, fallback_reason="rag_no_result")

    def _fallback_response(
        self,
        intent: str,
        confidence: float,
        reply_language: str,
        ui_language: str,
        fallback_reason: str = "safe",
    ) -> ChatResponse:
        logger.info(
            "fallback_response intent=%s domain=%s reply_language=%s ui_language=%s fallback_reason=%s",
            intent,
            domain_for_intent(intent),
            reply_language,
            ui_language,
            fallback_reason,
        )
        return self.response_service.build(
            "fallback",
            self.localization_service.canonical_fallback(reply_language, reason="safe"),
            "unknown" if intent not in ("recommendation", "hotel_info", "fault_report", "complaint", "request", "reservation", "special_need") else intent,
            confidence,
            reply_language,
            ui_language,
            "fallback",
        )

    def _try_multi_clause_rule_path(
        self,
        *,
        normalized: str,
        original_message: str,
        reply_language: str,
        ui_language: str,
    ) -> ChatResponse | None:
        clauses = self._split_multi_intent_clauses(normalized)
        if len(clauses) != 2:
            return None

        first_intent = self.rule_engine.match(clauses[0])
        second_intent = self.rule_engine.match(clauses[1])
        if first_intent and not second_intent:
            second_intent = self._synthetic_recommendation_intent(clauses[1])
        if second_intent and not first_intent:
            first_intent = self._synthetic_recommendation_intent(clauses[0])
        if not first_intent or not second_intent:
            return None
        if first_intent.intent == second_intent.intent:
            return None

        first_response = self._apply_policy(
            intent=first_intent.intent,
            sub_intent=first_intent.sub_intent,
            entity=first_intent.entity,
            confidence=first_intent.confidence,
            source=first_intent.source,
            message=clauses[0],
            reply_language=reply_language,
            ui_language=ui_language,
            needs_rag=first_intent.needs_rag,
            response_mode=first_intent.response_mode,
        )
        first_response = self._attach_action(
            response=first_response,
            intent=first_intent.intent,
            sub_intent=first_intent.sub_intent,
            entity=first_intent.entity,
        )

        second_response = self._apply_policy(
            intent=second_intent.intent,
            sub_intent=second_intent.sub_intent,
            entity=second_intent.entity,
            confidence=second_intent.confidence,
            source=second_intent.source,
            message=clauses[1],
            reply_language=reply_language,
            ui_language=ui_language,
            needs_rag=second_intent.needs_rag,
            response_mode=second_intent.response_mode,
        )
        second_response = self._attach_action(
            response=second_response,
            intent=second_intent.intent,
            sub_intent=second_intent.sub_intent,
            entity=second_intent.entity,
        )

        primary, secondary = self._pick_primary_secondary(first_response, second_response)
        if primary.meta.intent == "special_need" or secondary.meta.intent == "special_need":
            # Safety rule: when special need/allergy exists, do not append venue/food recommendations.
            chosen = primary if primary.meta.intent == "special_need" else secondary
            action_payload = None
            if chosen.meta.action:
                action_payload = (
                    chosen.meta.action.model_dump()
                    if hasattr(chosen.meta.action, "model_dump")
                    else chosen.meta.action
                )
            return self.response_service.build(
                chosen.type,
                chosen.message,
                chosen.meta.intent,
                chosen.meta.confidence,
                chosen.meta.language,
                chosen.meta.ui_language,
                chosen.meta.source,
                action=action_payload,
                multi_intent=True,
            )
        combined_message = f"{primary.message}\n\n{secondary.message}"
        action_payload = None
        if primary.meta.action:
            action_payload = (
                primary.meta.action.model_dump()
                if hasattr(primary.meta.action, "model_dump")
                else primary.meta.action
            )
        return self.response_service.build(
            primary.type,
            combined_message,
            primary.meta.intent,
            max(primary.meta.confidence, secondary.meta.confidence),
            primary.meta.language,
            primary.meta.ui_language,
            primary.meta.source,
            action=action_payload,
            multi_intent=True,
        )

    @staticmethod
    def _split_multi_intent_clauses(normalized: str) -> list[str]:
        text = (normalized or "").strip()
        if not text:
            return []
        match = re.search(r"\s(?:ayrica|ayrıca|ama|fakat|but|also)\s", text)
        if not match:
            return [text]
        left = text[: match.start()].strip(" ,;")
        right = text[match.end() :].strip(" ,;")
        if not left or not right:
            return [text]
        return [left, right]

    @staticmethod
    def _pick_primary_secondary(first: ChatResponse, second: ChatResponse) -> tuple[ChatResponse, ChatResponse]:
        priority = {
            "fault_report": 100,
            "complaint": 90,
            "special_need": 85,
            "request": 80,
            "reservation": 70,
            "hotel_info": 50,
            "recommendation": 45,
            "current_time": 40,
            "chitchat": 10,
            "unknown": 0,
        }
        first_p = priority.get(first.meta.intent, 0)
        second_p = priority.get(second.meta.intent, 0)
        if second_p > first_p:
            return second, first
        return first, second

    @staticmethod
    def _synthetic_recommendation_intent(clause: str):
        t = (clause or "").lower()
        recommendation_markers = (
            "oner",
            "öner",
            "yemek",
            "aksam",
            "akşam",
            "restaurant",
            "restoran",
            "bbq",
            "balik",
            "balık",
            "et",
            "kahve",
            "tatli",
            "tatlı",
            "pizza",
            "snack",
        )
        if not any(marker in t for marker in recommendation_markers):
            return None

        entity = "pizza_snack_pref"
        if ("aksam" in t or "akşam" in t) and "yemek" in t:
            entity = "meat_bbq_pref"
        if "balik" in t or "balık" in t or "fish" in t:
            entity = "fish_pref"
        elif "bbq" in t or "et" in t or "meat" in t:
            entity = "meat_bbq_pref"
        elif "kahve" in t or "coffee" in t or "tatli" in t or "tatlı" in t or "dessert" in t:
            entity = "coffee_dessert_pref"
        return type(
            "SyntheticIntent",
            (),
            {
                "intent": "recommendation",
                "sub_intent": "venue_recommendation",
                "entity": entity,
                "confidence": 0.85,
                "source": "rule",
                "needs_rag": False,
                "response_mode": "answer",
            },
        )()

    def _attach_action(self, response: ChatResponse, intent: str, sub_intent: str | None, entity: str | None) -> ChatResponse:
        action = self._action_for_intent(intent=intent, sub_intent=sub_intent, entity=entity)
        if action is None:
            return response
        response.meta.action = ChatMeta.ChatAction.model_validate(action)
        return response

    @staticmethod
    def _action_for_intent(intent: str, sub_intent: str | None, entity: str | None) -> dict | None:
        if intent in ("fault_report", "complaint", "request", "reservation", "special_need"):
            department = "guest_relations" if intent in ("complaint", "special_need") else "reception"
            priority = "medium"
            if intent in ("complaint", "special_need"):
                priority = "high"
            elif intent in ("reservation", "request"):
                priority = "low"
            issue_type = None
            if intent == "fault_report":
                issue_type = f"{(entity or sub_intent or 'general').strip()}_fault"
            if intent == "special_need":
                issue_type = "special_need"
            return {
                "kind": "create_guest_request",
                "target_department": department,
                "priority": priority,
                "sub_intent": sub_intent,
                "entity": entity,
                "issue_type": issue_type,
                "policy_hint": "route_via_frontdesk_policy" if department == "reception" else "guest_relations_first_policy",
            }
        if intent == "recommendation":
            venue_map = {
                "fish_pref": "mare_restaurant",
                "meat_bbq_pref": "sinton_bbq",
                "pizza_snack_pref": "snack_restaurant",
                "coffee_dessert_pref": "libum_cafe",
                "kids_activity_pref": "kids_club",
                "romantic_dinner_pref": "mare_restaurant",
                "general_dining_pref": "sinton_bbq",
            }
            return {
                "kind": "suggest_venue",
                "venue_id": venue_map.get((entity or "").strip(), "libum_cafe"),
                "entity": entity,
                "sub_intent": sub_intent,
            }
        return None

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

