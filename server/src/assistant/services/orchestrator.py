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

from assistant.services.chat_form_state import ChatFormState, InMemoryChatFormStore, OperationType
from assistant.services.voice_channel_layer import VOICE_RESERVATION_HINT
from assistant.services.hotel_room_numbers import is_valid_hotel_room_number


def _reset_chat_form_to_category(state: ChatFormState) -> None:
    """Serbest metin / oda hatası sonrası kategori seçimine dönmek için form alanlarını sıfırlar."""
    state.step = "category"
    state.category = None
    state.subcategory = None
    state.quantity = None
    state.description = ""
    state.full_name = None
    state.room = None
    state.details = {}
    state.current_detail_field = None
    state.pending_detail_fields = []
from assistant.services.form_schema import (
    REQUEST_CATEGORIES,
    REQUEST_DETAIL_FIELDS,
    COMPLAINT_CATEGORIES,
    FAULT_CATEGORIES,
    FAULT_LOCATIONS,
    FAULT_URGENCIES,
    GUEST_NOTIFICATION_BY_GROUP,
    guest_notification_categories_for_group,
)
from assistant.services.form_labels import category_label, field_label, value_label

logger = get_logger("assistant.orchestrator")

# RuleEngine sub_intent → sohbet formu notif_group (kategori adımında konu değişiminde kullanılır).
_GUEST_NOTIF_SUB_TO_GROUP: dict[str, str | None] = {
    "notif_group_celebration": "celebration",
    "notif_group_health": "health",
    "notif_group_diet": "diet",
    "notif_group_reception": "reception",
    "notif_group_all": None,
}

GUEST_NOTIF_DESC_REQUIRED = frozenset(
    {"food_sensitivity_general", "other_health", "other_celebration"},
)


def _guest_notification_description_lead(category: str, reply_language: str) -> str:
    """Kategori seçiminden sonra açıklama adımı: zorunlu / isteğe bağlı (web formu ile aynı mantık)."""
    need = (category or "") in GUEST_NOTIF_DESC_REQUIRED
    if reply_language == "en":
        if need:
            return "Please write a short description for this notice category (required)."
        return (
            "Optional: add any details for the team. If you have nothing to add, reply with “-” or “no”; "
            "your first message in this chat may also be kept as context."
        )
    if reply_language == "de":
        if need:
            return "Bitte eine kurze Beschreibung zu dieser Kategorie (erforderlich)."
        return (
            "Optional: ergänzen Sie Details. Wenn nichts hinzukommt, antworten Sie mit „-“ oder „nein“; "
            "Ihre erste Nachricht in diesem Chat kann als Kontext dienen."
        )
    if reply_language == "ru":
        if need:
            return "Пожалуйста, кратко опишите выбранную категорию (обязательно)."
        return (
            "По желанию добавьте детали. Если добавить нечего, ответьте «-» или «нет»; "
            "первое сообщение в этом чате также может использоваться как контекст."
        )
    if need:
        return "Bu konu için kısa bir açıklama yazmanız gerekir (zorunlu)."
    return (
        "İsteğe bağlı: ekip için ek not ekleyebilirsiniz. Eklemeyecekseniz “-” veya “yok” yazın; "
        "sohbetteki ilk mesajınız da bağlam olarak kullanılabilir."
    )


_VALID_LANG = frozenset({"tr", "en", "de", "ru"})
def _valid_conversation_language(value: str | None) -> str | None:
    if not value:
        return None
    v = str(value).lower().strip()
    return v if v in _VALID_LANG else None


_RESERVATION_REDIRECT_TEXT: dict[str, str] = {
    "tr": "Rezervasyonunuzla ilgili işlemler için lütfen ana sayfadaki Rezervasyonlar bölümünden devam edin. Aşağıdaki butona dokunarak açabilirsiniz.",
    "en": "For your reservation requests, please continue via the Reservations section on the main screen. You can open it using the button below.",
    "de": "Für Ihre Reservierungsanfragen nutzen Sie bitte den Bereich „Reservierungen“ auf der Hauptseite. Sie können ihn über die Schaltfläche unten öffnen.",
    "ru": "Для запросов по бронированию, пожалуйста, перейдите в раздел «Резервации» на главном экране. Вы можете открыть его с помощью кнопки ниже.",
}

# Geç çıkış: rezervasyon değil — Talepler → Misafir bildirimleri (ön büro / resepsiyon).
_LATE_CHECKOUT_GUEST_NOTIF_REDIRECT_TEXT: dict[str, str] = {
    "tr": (
        "Geç çıkış talebiniz ön büro / resepsiyon tarafından değerlendirilir. "
        "Ana sayfada İstekler → Misafir bildirimleri içindeki geç çıkış formunu kullanın. "
        "Aşağıdaki buton bu formu doğrudan açar."
    ),
    "en": (
        "Late check-out is arranged by the front desk. "
        "Use the late check-out form inside Requests → Guest notices on the main screen. "
        "The button below opens that form directly."
    ),
    "de": (
        "Ein späterer Check-out wird an der Rezeption geklärt. "
        "Nutzen Sie das Formular für den späten Check-out unter Anfragen → Gästemeldungen. "
        "Die Schaltfläche unten öffnet dieses Formular direkt."
    ),
    "ru": (
        "Поздний выезд согласуется на ресепшене. "
        "Заполните форму позднего выезда в разделе «Запросы» → «Уведомления гостя». "
        "Кнопка ниже открывает эту форму сразу."
    ),
}


def _guest_notification_category_prompt(notif_group: str | None, reply_language: str) -> str:
    if reply_language == "en":
        heads = {
            "diet": "Diet / sensitivity:",
            "health": "Health / special situation:",
            "celebration": "Celebration / special occasion:",
            "reception": "Front desk / reception:",
        }
        lead = "Please choose a category (reply with the number):\n"
    elif reply_language == "de":
        heads = {
            "diet": "Ernährung / Unverträglichkeit:",
            "health": "Gesundheit / besondere Situation:",
            "celebration": "Feier / besonderer Anlass:",
            "reception": "Rezeption:",
        }
        lead = "Bitte wählen Sie eine Kategorie (Antwort mit Nummer):\n"
    elif reply_language == "ru":
        heads = {
            "diet": "Питание / чувствительность:",
            "health": "Здоровье / особая ситуация:",
            "celebration": "Праздник / особый случай:",
            "reception": "Ресепшен:",
        }
        lead = "Выберите категорию (ответьте номером):\n"
    else:
        heads = {
            "diet": "Beslenme / hassasiyet:",
            "health": "Sağlık / özel durum:",
            "celebration": "Kutlama / özel gün:",
            "reception": "Ön büro / resepsiyon:",
        }
        lead = "Lütfen bir kategori seçiniz (numara ile yanıtlayın):\n"

    if notif_group is None:
        lines: list[str] = []
        n = 1
        for gkey in ("diet", "health", "celebration"):
            lines.append(heads[gkey])
            for c in GUEST_NOTIFICATION_BY_GROUP[gkey]:
                lines.append(f"{n}. {category_label('guest_notification', c, reply_language)}")
                n += 1
        return lead + "\n".join(lines)

    cats = guest_notification_categories_for_group(notif_group)
    opts = [f"{i}. {category_label('guest_notification', c, reply_language)}" for i, c in enumerate(cats, 1)]
    return lead + "\n".join(opts)


# Python tarafında, JS `guest-requests.service.js` ile aynı enum değerlerini kullanarak
# istek detayları için sabit seçenekleri tanımlıyoruz. Böylece oluşturulan payload
# doğrudan Node tarafındaki validasyondan geçer.
_REQUEST_ENUM_OPTIONS: dict[str, dict[str, list[str]]] = {
    "towel": {
        "itemType": ["bath_towel", "hand_towel"],
    },
    "bedding": {
        "itemType": ["pillow", "duvet_cover", "blanket"],
    },
    "room_cleaning": {
        "requestType": ["general_cleaning", "towel_change", "room_check"],
        "timing": ["now", "later"],
    },
    "minibar": {
        "requestType": ["refill", "missing_item_report", "check_request"],
    },
    "baby_equipment": {
        "itemType": ["baby_bed", "high_chair", "other"],
    },
    "room_equipment": {
        "itemType": ["bathrobe", "slippers", "hanger", "kettle", "other"],
    },
}


def _request_field_kind(category: str, field: str) -> str | None:
    """REQUEST_DETAIL_FIELDS şemasından ilgili alanın türünü ('enum' / 'int') döndür."""
    fields = REQUEST_DETAIL_FIELDS.get(category) or ()
    for fd in fields:
        if fd.name == field:
            return fd.kind
    return None


def _request_enum_values(category: str, field: str) -> list[str]:
    """İlgili kategori + alan için seçilebilir enum değerlerini döndür."""
    return list((_REQUEST_ENUM_OPTIONS.get(category) or {}).get(field) or [])


def _enum_options_for_detail(
    state: ChatFormState,
    category: str,
    field_name: str,
    reply_language: str,
) -> list[tuple[int, str, str]]:
    raw_values: list[str] = []
    if state.operation == "fault" and field_name == "location":
        raw_values = list(FAULT_LOCATIONS)
    elif state.operation == "fault" and field_name == "urgency":
        raw_values = list(FAULT_URGENCIES)
    elif state.operation == "request":
        raw_values = _request_enum_values(category, field_name)
    options: list[tuple[int, str, str]] = []
    for idx, v in enumerate(raw_values, start=1):
        lbl = value_label(field_name, v, reply_language)
        if not lbl or lbl == v:
            fld = field_label(field_name, reply_language)
            lbl = f"{fld}: {v}" if fld != field_name else v
        options.append((idx, v, lbl))
    return options


# Bu alt niyetler chat formu yerine ResponseComposer yönlendirme metni kullanır (öğle paketi, transfer, …).
_REQUEST_CHAT_FORM_EXEMPT_SUBINTENTS = frozenset(
    {
        "lunch_box_request",
        "reception_contact_request",
        "guest_relations_contact_request",
        "transfer_request",
    }
)


def _form_record_type_label(kind: str, reply_language: str) -> str:
    k = (kind or "").strip()
    if reply_language == "en":
        m = {
            "fault": "Fault report",
            "request": "Room request",
            "complaint": "Complaint",
            "guest_notification": "Guest notice",
        }
    elif reply_language == "de":
        m = {
            "fault": "Störmeldung",
            "request": "Zimmeranfrage",
            "complaint": "Beschwerde",
            "guest_notification": "Gästemeldung",
        }
    elif reply_language == "ru":
        m = {
            "fault": "Неисправность",
            "request": "Запрос в номер",
            "complaint": "Жалоба",
            "guest_notification": "Уведомление для отеля",
        }
    else:
        m = {
            "fault": "Arıza bildirimi",
            "request": "Oda talebi",
            "complaint": "Şikayet",
            "guest_notification": "Misafir bildirimi",
        }
    return m.get(k, k)


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
        form_store: InMemoryChatFormStore | None = None,
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
        self.form_store = form_store or InMemoryChatFormStore(settings.chat_form_ttl_seconds)

    def _voice_operational_redirect(self, reply_lang: str, ui_language: str):
        """Sesli kanal: form / kayıt yok; yazılı kanala yönlendirme metni."""
        from assistant.services.voice_channel_layer import VOICE_OPERATIONAL_USE_TEXT

        text = VOICE_OPERATIONAL_USE_TEXT.get(reply_lang, VOICE_OPERATIONAL_USE_TEXT["tr"])
        return self.response_service.build(
            "inform",
            text,
            "hotel_info",
            1.0,
            reply_lang,
            ui_language,
            "rule",
            action=None,
        )

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

        # Rezervasyonla ilgili çok net kısa mesajlar için doğrudan Rezervasyonlar modülüne yönlendirme.
        # Rule engine / LLM'e gitmeden deterministik davranır.
        norm_lower = normalized.lower()
        if any(
            key in norm_lower
            for key in (
                "rezervasyon",
                "rezrvasyon",
                "reservation",
                "a la carte rezervasyon",
                "alacarte rezervasyon",
                "a la carte reservation",
            )
        ):
            if payload.channel == "voice":
                vtext = VOICE_RESERVATION_HINT.get(reply_base, VOICE_RESERVATION_HINT["tr"])
                return self.response_service.build(
                    "inform",
                    vtext,
                    "reservation",
                    1.0,
                    reply_base,
                    ui_language,
                    "rule",
                    action=None,
                )
            text = _RESERVATION_REDIRECT_TEXT.get(reply_base, _RESERVATION_REDIRECT_TEXT["tr"])
            action = self._action_for_intent("reservation", None, None)
            return self.response_service.build(
                "inform",
                text,
                "reservation",
                1.0,
                reply_base,
                ui_language,
                "rule",
                action=action,
            )

        # If there is an ongoing chat form flow for this user/channel, continue it first.
        # Sesli kanal ayrı anahtar (voice); yazılı form yarım kalsa bile sesli turda devam ettirilmez.
        form_state = (
            None
            if payload.channel == "voice"
            else self.form_store.get(payload.channel, payload.user_id, payload.session_id)
        )
        if form_state is not None:
            decision_path.append("chat_form_continue")
            response = self._continue_form_flow(
                payload=payload,
                state=form_state,
                reply_language=reply_base,
                ui_language=ui_language,
            )
            logger.info(
                "chat_request chat_form_continue input=%r intent=%s op=%s reply_lang=%s ui_lang=%s decision_path=%s",
                payload.message,
                response.meta.intent,
                getattr(response.meta.action, "operation", None) if response.meta.action else None,
                response.meta.language,
                response.meta.ui_language,
                " > ".join(decision_path),
            )
            return response

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
            # Operasyonel niyetler: chat formu (istek / arıza / şikayet / misafir bildirimi).
            if rule_intent.intent in ("request", "fault_report", "complaint", "guest_notification"):
                if payload.channel == "voice":
                    exempt_voice = (
                        rule_intent.intent == "request"
                        and rule_intent.sub_intent in _REQUEST_CHAT_FORM_EXEMPT_SUBINTENTS
                    )
                    if not exempt_voice:
                        decision_path.append("voice_info_layer_operational")
                        return self._voice_operational_redirect(reply_lang, ui_language)
                if (
                    rule_intent.intent == "request"
                    and rule_intent.sub_intent in _REQUEST_CHAT_FORM_EXEMPT_SUBINTENTS
                ):
                    decision_path.append("compose_request_redirect")
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
                    response = self._attach_action(
                        response=response,
                        intent=rule_intent.intent,
                        sub_intent=rule_intent.sub_intent,
                        entity=rule_intent.entity,
                    )
                    logger.info(
                        "chat_request compose_request_redirect input=%r sub_intent=%s decision_path=%s",
                        payload.message,
                        rule_intent.sub_intent,
                        " > ".join(decision_path),
                    )
                    return response

                decision_path.append("chat_form_start")
                notif_group_param: str | None = None
                if rule_intent.intent == "guest_notification":
                    notif_group_param = {
                        "notif_group_celebration": "celebration",
                        "notif_group_health": "health",
                        "notif_group_diet": "diet",
                        "notif_group_reception": "reception",
                        "notif_group_all": None,
                    }.get(rule_intent.sub_intent or "")
                init_req_cat = None
                if rule_intent.intent == "request":
                    init_req_cat = self.rule_engine.extract_request_category(normalized)
                response = self._start_form_flow(
                    payload=payload,
                    intent=rule_intent.intent,
                    reply_language=reply_lang,
                    ui_language=ui_language,
                    notif_group=notif_group_param,
                    initial_request_category=init_req_cat,
                )
                logger.info(
                    "chat_request chat_form_start input=%r intent=%s reply_lang=%s ui_lang=%s decision_path=%s",
                    payload.message,
                    rule_intent.intent,
                    reply_lang,
                    ui_language,
                    " > ".join(decision_path),
                )
                return response

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
            # Çok kısa / belirsiz mesajlarda sert fallback yerine nazik karşılama dön.
            short_norm = (normalized or "").strip()
            if len(short_norm) <= 20:
                greet = self.localization_service.get("chitchat_greeting", reply_base)
                resp = self.response_service.build(
                    "inform",
                    greet,
                    "chitchat",
                    1.0,
                    reply_base,
                    ui_language,
                    "fallback",
                )
            else:
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

        # LLM sınıflandırıcısı da operasyonel intent bulursa chat form akışını kullan.
        if llm_intent.intent in ("request", "fault_report", "complaint", "guest_notification"):
            if payload.channel == "voice":
                decision_path.append("voice_info_layer_operational_llm")
                return self._voice_operational_redirect(reply_base, ui_language)
            decision_path.append("chat_form_start_llm")
            init_req_cat = None
            llm_notif_group: str | None = None
            if llm_intent.intent == "request":
                init_req_cat = self.rule_engine.extract_request_category(normalized)
            elif llm_intent.intent == "guest_notification":
                llm_notif_group = self.rule_engine.infer_guest_notification_group(normalized)
            response = self._start_form_flow(
                payload=payload,
                intent=llm_intent.intent,
                reply_language=reply_base,
                ui_language=ui_language,
                notif_group=llm_notif_group,
                initial_request_category=init_req_cat,
            )
            logger.info(
                "chat_request chat_form_start_llm input=%r intent=%s reply_lang=%s ui_lang=%s decision_path=%s",
                payload.message,
                llm_intent.intent,
                reply_base,
                ui_language,
                " > ".join(decision_path),
            )
            return response

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
            # Rezervasyon taleplerinde misafiri web arayüzündeki Rezervasyonlar modülüne
            # yönlendiriyoruz; resepsiyon fallback metnine gerek yok.
            text = _RESERVATION_REDIRECT_TEXT.get(reply_language, _RESERVATION_REDIRECT_TEXT["tr"])
            return self.response_service.build(
                "inform",
                text,
                intent,
                1.0,
                reply_language,
                ui_language,
                "rule",
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

        if policy == "compose_guest_notification":
            if self.rule_engine.matches_late_checkout_guest_notif(normalize_text(message)):
                text = _LATE_CHECKOUT_GUEST_NOTIF_REDIRECT_TEXT.get(
                    reply_language, _LATE_CHECKOUT_GUEST_NOTIF_REDIRECT_TEXT["tr"]
                )
                return self.response_service.build(
                    "inform",
                    text,
                    "guest_notification",
                    confidence,
                    reply_language,
                    ui_language,
                    source or "rule",
                    action={"kind": "open_guest_notifications_form"},
                )
            hint = self.localization_service.get("guest_notification_policy_hint", reply_language)
            return self.response_service.build(
                "inform",
                hint,
                "guest_notification",
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
            if fixed_entity_key == "fixed_alanya_discover_intro":
                fixed_text = self.localization_service.get(fixed_entity_key, reply_language)
                return self.response_service.build(
                    "answer",
                    fixed_text,
                    intent,
                    confidence,
                    reply_language,
                    ui_language,
                    "rule",
                    action={"kind": "open_alanya_module"},
                )
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
                nm = normalize_text(message)
                rq_soft = self.rule_engine.extract_request_category(nm)
                if rq_soft and not self.rule_engine.is_strong_service_item_request(nm):
                    _soft_key = f"hotel_info_soft_followup_{rq_soft}"
                    suffix = self.localization_service.get(_soft_key, reply_language).strip()
                    if not suffix or suffix == _soft_key:
                        _gen = "hotel_info_soft_followup_generic"
                        suffix = self.localization_service.get(_gen, reply_language).strip()
                        if suffix == _gen:
                            suffix = ""
                    if suffix:
                        rag_answer = rag_answer.rstrip() + "\n\n" + suffix
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

    def _emit_after_category_selected(
        self,
        *,
        payload: ChatRequest,
        state: ChatFormState,
        chosen_category: str,
        reply_language: str,
        ui_language: str,
        intent: str,
    ) -> ChatResponse:
        state.category = chosen_category
        self.form_store.upsert(payload.channel, payload.user_id, payload.session_id, state)

        if state.operation == "fault":
            state.step = "location"
            self.form_store.upsert(payload.channel, payload.user_id, payload.session_id, state)
            opts = _enum_options_for_detail(state, chosen_category, "location", reply_language)
            lines = [f"{idx}. {lbl}" for idx, _val, lbl in opts] or []
            if reply_language == "en":
                msg = "Where is the fault located?\n" + "\n".join(lines)
            elif reply_language == "de":
                msg = "Wo befindet sich die Störung?\n" + "\n".join(lines)
            elif reply_language == "ru":
                msg = "Где находится неисправность?\n" + "\n".join(lines)
            else:
                msg = "Arızanın bulunduğu yeri seçiniz:\n" + "\n".join(lines)
            return self.response_service.build(
                "inform",
                msg,
                intent,
                1.0,
                reply_language,
                ui_language,
                "rule",
                action={"kind": "chat_form", "operation": state.operation, "step": "location"},
            )

        if state.operation == "request" and state.pending_detail_fields:
            next_field = state.pending_detail_fields.pop(0)
            state.current_detail_field = next_field
            kind = _request_field_kind(chosen_category, next_field) or "enum"
            state.step = "detail_int" if kind == "int" else "detail_enum"
            self.form_store.upsert(payload.channel, payload.user_id, payload.session_id, state)
            if state.step == "detail_enum":
                opts = _enum_options_for_detail(state, chosen_category, next_field, reply_language)
                lines = [f"{idx}. {lbl}" for idx, _val, lbl in opts] or []
                fld_label = field_label(next_field, reply_language)
                if reply_language == "en":
                    msg = f"Please choose an option for {fld_label}:\n" + "\n".join(lines)
                elif reply_language == "de":
                    msg = f"Bitte wählen Sie eine Option für {fld_label}:\n" + "\n".join(lines)
                elif reply_language == "ru":
                    msg = f"Пожалуйста, выберите вариант для {fld_label}:\n" + "\n".join(lines)
                else:
                    msg = f"Lütfen {fld_label} için bir seçim yapınız:\n" + "\n".join(lines)
            else:
                fld_label = field_label(next_field, reply_language)
                if reply_language == "en":
                    msg = f"Please enter a number for {fld_label}."
                elif reply_language == "de":
                    msg = f"Bitte geben Sie eine Zahl für {fld_label} ein."
                elif reply_language == "ru":
                    msg = f"Пожалуйста, введите число для поля {fld_label}."
                else:
                    msg = f"Lütfen {fld_label} için bir sayı giriniz."
            return self.response_service.build(
                "inform",
                msg,
                intent,
                1.0,
                reply_language,
                ui_language,
                "rule",
                action={
                    "kind": "chat_form",
                    "operation": state.operation,
                    "step": state.step,
                },
            )

        state.step = "description"
        self.form_store.upsert(payload.channel, payload.user_id, payload.session_id, state)
        if state.operation == "guest_notification":
            msg = _guest_notification_description_lead(chosen_category, reply_language)
        elif reply_language == "en":
            msg = "Please briefly describe your request/issue."
        elif reply_language == "de":
            msg = "Bitte beschreiben Sie Ihr Anliegen kurz."
        elif reply_language == "ru":
            msg = "Пожалуйста, кратко опишите вашу просьбу или проблему."
        else:
            msg = "Lütfen talebinizi veya sorununuzu kısaca açıklayın."
        return self.response_service.build(
            "inform",
            msg,
            intent,
            1.0,
            reply_language,
            ui_language,
            "rule",
            action={"kind": "chat_form", "operation": state.operation, "step": "description"},
        )

    def _start_form_flow(
        self,
        *,
        payload: ChatRequest,
        intent: str,
        reply_language: str,
        ui_language: str,
        notif_group: str | None = None,
        initial_request_category: str | None = None,
    ) -> ChatResponse:
        if intent == "request":
            op: OperationType = "request"
        elif intent == "fault_report":
            op = "fault"
        elif intent == "guest_notification":
            op = "guest_notification"
        else:
            op = "complaint"

        if op == "guest_notification" and notif_group == "reception":
            text = _LATE_CHECKOUT_GUEST_NOTIF_REDIRECT_TEXT.get(
                reply_language, _LATE_CHECKOUT_GUEST_NOTIF_REDIRECT_TEXT["tr"]
            )
            return self.response_service.build(
                "inform",
                text,
                "guest_notification",
                1.0,
                reply_language,
                ui_language,
                "rule",
                action={"kind": "open_guest_notifications_form"},
            )

        state = ChatFormState(
            operation=op,
            language=reply_language,
            ui_language=ui_language,
            notif_group=notif_group if op == "guest_notification" else None,
            step="category",
            initial_message=payload.message,
        )
        if (
            op == "request"
            and initial_request_category
            and initial_request_category in REQUEST_CATEGORIES
        ):
            ic = initial_request_category.strip()
            fields = REQUEST_DETAIL_FIELDS.get(ic) or ()
            state.category = ic
            state.pending_detail_fields = [f.name for f in fields]
            state.current_detail_field = None
            self.form_store.upsert(payload.channel, payload.user_id, payload.session_id, state)
            return self._emit_after_category_selected(
                payload=payload,
                state=state,
                chosen_category=ic,
                reply_language=reply_language,
                ui_language=ui_language,
                intent="request",
            )

        self.form_store.upsert(payload.channel, payload.user_id, payload.session_id, state)

        if op == "guest_notification":
            prompt = _guest_notification_category_prompt(notif_group, reply_language)
            meta_intent = "guest_notification"
        else:
            if op == "request":
                categories = REQUEST_CATEGORIES
            elif op == "fault":
                categories = FAULT_CATEGORIES
            else:
                categories = COMPLAINT_CATEGORIES

            options: list[str] = []
            for idx, cat in enumerate(categories, start=1):
                cat_intent = "request" if op == "request" else ("fault" if op == "fault" else "complaint")
                label = category_label(cat_intent, cat, reply_language)
                options.append(f"{idx}. {label}")

            if reply_language == "en":
                prompt = "Please choose a category:\n" + "\n".join(options)
            elif reply_language == "de":
                prompt = "Bitte wählen Sie eine Kategorie:\n" + "\n".join(options)
            elif reply_language == "ru":
                prompt = "Пожалуйста, выберите категорию:\n" + "\n".join(options)
            else:
                prompt = "Lütfen bir kategori seçiniz:\n" + "\n".join(options)
            meta_intent = "request" if op == "request" else ("fault_report" if op == "fault" else "complaint")

        return self.response_service.build(
            "inform",
            prompt,
            meta_intent,
            1.0,
            reply_language,
            ui_language,
            "rule",
            action={
                "kind": "chat_form",
                "operation": op,
                "step": "category",
            },
        )

    def _continue_form_flow(
        self,
        *,
        payload: ChatRequest,
        state: ChatFormState,
        reply_language: str,
        ui_language: str,
    ) -> ChatResponse:
        text = (payload.message or "").strip()
        normalized = normalize_text(text)
        intent = (
            "fault_report"
            if state.operation == "fault"
            else (
                "complaint"
                if state.operation == "complaint"
                else ("guest_notification" if state.operation == "guest_notification" else "request")
            )
        )

        # Bağlamsal güncelleme: form ortasındayken kullanıcı güçlü bir şekilde
        # yeni bir operasyonel niyet (ör. yeni arıza) veya sosyal selamlaşma
        # yazarsa, mevcut formu kapatıp uygun akışa dön.
        # "description" ve benzeri serbest metin adımlarında yeniden rule match yapma;
        # aksi halde "su akmıyor" gibi metinler başka intent ile eşlenip kategori başa sarıyor.
        if text and state.step not in (
            "full_name",
            "room",
            "confirm",
            "description",
            "detail_enum",
            "detail_int",
            "location",
            "urgency",
        ):
            re_intent = self.rule_engine.match(normalized)
            if re_intent:
                # Aynı misafir bildirimi akışında konu değişti (ör. alerjen → kutlama): grubu güncelle.
                if (
                    state.operation == "guest_notification"
                    and state.step == "category"
                    and re_intent.intent == "guest_notification"
                ):
                    sub = re_intent.sub_intent or ""
                    if sub in _GUEST_NOTIF_SUB_TO_GROUP:
                        ng_new = _GUEST_NOTIF_SUB_TO_GROUP[sub]
                        if state.notif_group != ng_new:
                            self.form_store.clear(payload.channel, payload.user_id, payload.session_id)
                            return self._start_form_flow(
                                payload=payload,
                                intent="guest_notification",
                                reply_language=reply_language,
                                ui_language=ui_language,
                                notif_group=ng_new,
                                initial_request_category=None,
                            )
                if (
                    re_intent.intent in ("request", "fault_report", "complaint", "guest_notification")
                    and re_intent.intent != intent
                ):
                    # Farklı operasyonel intent: mevcut formu bırak, yeni formu başlat.
                    self.form_store.clear(payload.channel, payload.user_id, payload.session_id)
                    if (
                        re_intent.intent == "request"
                        and re_intent.sub_intent in _REQUEST_CHAT_FORM_EXEMPT_SUBINTENTS
                    ):
                        response = self._apply_policy(
                            intent=re_intent.intent,
                            sub_intent=re_intent.sub_intent,
                            entity=re_intent.entity,
                            confidence=re_intent.confidence,
                            source=re_intent.source,
                            message=payload.message,
                            reply_language=reply_language,
                            ui_language=ui_language,
                            needs_rag=re_intent.needs_rag,
                            response_mode=re_intent.response_mode,
                        )
                        return self._attach_action(
                            response=response,
                            intent=re_intent.intent,
                            sub_intent=re_intent.sub_intent,
                            entity=re_intent.entity,
                        )
                    ng_switch: str | None = None
                    if re_intent.intent == "guest_notification":
                        ng_switch = {
                            "notif_group_celebration": "celebration",
                            "notif_group_health": "health",
                            "notif_group_diet": "diet",
                            "notif_group_reception": "reception",
                            "notif_group_all": None,
                        }.get(re_intent.sub_intent or "")
                    init_sw = None
                    if re_intent.intent == "request":
                        init_sw = self.rule_engine.extract_request_category(normalized)
                    return self._start_form_flow(
                        payload=payload,
                        intent=re_intent.intent,
                        reply_language=reply_language,
                        ui_language=ui_language,
                        notif_group=ng_switch,
                        initial_request_category=init_sw,
                    )
                if re_intent.intent == "chitchat":
                    # Selamlaşma / sohbet: formu iptal et ve sıcak karşılama yanıtı ver.
                    self.form_store.clear(payload.channel, payload.user_id, payload.session_id)
                    greet = self.localization_service.get("chitchat_greeting", reply_language)
                    return self.response_service.build(
                        "inform",
                        greet,
                        "chitchat",
                        1.0,
                        reply_language,
                        ui_language,
                        "rule",
                    )

        # Yardımcı: hatalı girişte kategori listesini tekrar göster.
        def _category_prompt(op: OperationType) -> str:
            if op == "guest_notification":
                return _guest_notification_category_prompt(state.notif_group, reply_language)
            if op == "request":
                categories = REQUEST_CATEGORIES
            elif op == "fault":
                categories = FAULT_CATEGORIES
            else:
                categories = COMPLAINT_CATEGORIES
            lines: list[str] = []
            for idx, cat in enumerate(categories, start=1):
                cat_intent = "request" if op == "request" else ("fault" if op == "fault" else "complaint")
                lbl = category_label(cat_intent, cat, reply_language)
                lines.append(f"{idx}. {lbl}")
            if reply_language == "en":
                return "Please choose a category:\n" + "\n".join(lines)
            if reply_language == "de":
                return "Bitte wählen Sie eine Kategorie:\n" + "\n".join(lines)
            if reply_language == "ru":
                return "Пожалуйста, выберите категорию:\n" + "\n".join(lines)
            return "Lütfen bir kategori seçiniz:\n" + "\n".join(lines)

        # Yardımcı: geçerli kategori listesini verir.
        def _current_categories(op: OperationType):
            if op == "guest_notification":
                return guest_notification_categories_for_group(state.notif_group)
            if op == "request":
                return REQUEST_CATEGORIES
            if op == "fault":
                return FAULT_CATEGORIES
            return COMPLAINT_CATEGORIES

        # Kategori adımı: kullanıcı bir kategori seçer ve detay akışı hazırlanır.
        if state.step == "category":
            categories = list(_current_categories(state.operation))
            if not text:
                msg = _category_prompt(state.operation)
                return self.response_service.build(
                    "inform",
                    msg,
                    intent,
                    1.0,
                    reply_language,
                    ui_language,
                    "rule",
                    action={"kind": "chat_form", "operation": state.operation, "step": "category"},
                )
            chosen_category: str | None = None
            # Önce sayı ile seçim (1,2,3,...)
            try:
                idx = int(text)
                if 1 <= idx <= len(categories):
                    chosen_category = categories[idx - 1]
            except ValueError:
                chosen_category = None
            # İleride label üzerinden doğrudan metin eşleme eklenebilir; şimdilik sadece index.
            if not chosen_category:
                msg = _category_prompt(state.operation)
                return self.response_service.build(
                    "inform",
                    msg,
                    intent,
                    1.0,
                    reply_language,
                    ui_language,
                    "rule",
                    action={"kind": "chat_form", "operation": state.operation, "step": "category"},
                )

            picked = chosen_category
            state.pending_detail_fields = []
            state.current_detail_field = None
            if state.operation == "request":
                fields = REQUEST_DETAIL_FIELDS.get(picked) or ()
                state.pending_detail_fields = [f.name for f in fields]
            self.form_store.upsert(payload.channel, payload.user_id, payload.session_id, state)
            return self._emit_after_category_selected(
                payload=payload,
                state=state,
                chosen_category=picked,
                reply_language=reply_language,
                ui_language=ui_language,
                intent=intent,
            )

        # Enum detay alanı: kullanıcı listeden bir seçenek seçer.
        if state.step == "detail_enum":
            category = state.category or ""
            field_name = state.current_detail_field or ""
            options = _enum_options_for_detail(state, category, field_name, reply_language)
            if not options:
                # Beklenmedik durum: detay alanı tanımlı değil; açıklamaya atla.
                state.step = "description"
                self.form_store.upsert(payload.channel, payload.user_id, payload.session_id, state)
                if reply_language == "en":
                    msg = "Please briefly describe your request/issue."
                elif reply_language == "de":
                    msg = "Bitte beschreiben Sie Ihr Anliegen kurz."
                elif reply_language == "ru":
                    msg = "Пожалуйста, кратко опишите вашу просьбу или проблему."
                else:
                    msg = "Lütfen talebinizi veya sorununuzu kısaca açıklayın."
                return self.response_service.build(
                    "inform",
                    msg,
                    intent,
                    1.0,
                    reply_language,
                    ui_language,
                    "rule",
                    action={"kind": "chat_form", "operation": state.operation, "step": "description"},
                )

            if not text:
                lines = [f"{idx}. {lbl}" for idx, _val, lbl in options]
                fld_label = field_label(field_name, reply_language)
                if reply_language == "en":
                    msg = f"Please choose an option for {fld_label}:\n" + "\n".join(lines)
                elif reply_language == "de":
                    msg = f"Bitte wählen Sie eine Option für {fld_label}:\n" + "\n".join(lines)
                elif reply_language == "ru":
                    msg = f"Пожалуйста, выберите вариант для поля {fld_label}:\n" + "\n".join(lines)
                else:
                    msg = f"Lütfen {fld_label} için bir seçim yapınız:\n" + "\n".join(lines)
                return self.response_service.build(
                    "inform",
                    msg,
                    intent,
                    1.0,
                    reply_language,
                    ui_language,
                    "rule",
                    action={"kind": "chat_form", "operation": state.operation, "step": "detail_enum"},
                )

            chosen_value: str | None = None
            try:
                idx = int(text)
                for i, val, _lbl in options:
                    if i == idx:
                        chosen_value = val
                        break
            except ValueError:
                chosen_value = None
            if not chosen_value:
                # Geçersiz seçim, aynı listeyi tekrar göster.
                lines = [f"{idx}. {lbl}" for idx, _val, lbl in options]
                fld_label = field_label(field_name, reply_language)
                if reply_language == "en":
                    msg = f"Please choose a valid option for {fld_label}:\n" + "\n".join(lines)
                elif reply_language == "de":
                    msg = f"Bitte wählen Sie eine gültige Option für {fld_label}:\n" + "\n".join(lines)
                elif reply_language == "ru":
                    msg = f"Пожалуйста, выберите допустимый вариант для поля {fld_label}:\n" + "\n".join(lines)
                else:
                    msg = f"Lütfen {fld_label} için geçerli bir seçim yapınız:\n" + "\n".join(lines)
                return self.response_service.build(
                    "inform",
                    msg,
                    intent,
                    1.0,
                    reply_language,
                    ui_language,
                    "rule",
                    action={"kind": "chat_form", "operation": state.operation, "step": "detail_enum"},
                )

            state.details[field_name] = chosen_value

            # Sıradaki detaya veya açıklamaya geç.
            if state.pending_detail_fields:
                next_field = state.pending_detail_fields.pop(0)
                state.current_detail_field = next_field
                kind = _request_field_kind(state.category or "", next_field) or "enum"
                state.step = "detail_int" if kind == "int" else "detail_enum"
                self.form_store.upsert(payload.channel, payload.user_id, payload.session_id, state)
                if state.step == "detail_enum":
                    opts = _enum_options_for_detail(state, state.category or "", next_field, reply_language)
                    lines = [f"{idx}. {lbl}" for idx, _val, lbl in opts] or []
                    fld_label = field_label(next_field, reply_language)
                    if reply_language == "en":
                        msg = f"Please choose an option for {fld_label}:\n" + "\n".join(lines)
                    elif reply_language == "de":
                        msg = f"Bitte wählen Sie eine Option für {fld_label}:\n" + "\n".join(lines)
                    elif reply_language == "ru":
                        msg = f"Пожалуйста, выберите вариант для поля {fld_label}:\n" + "\n".join(lines)
                    else:
                        msg = f"Lütfen {fld_label} için bir seçim yapınız:\n" + "\n".join(lines)
                else:
                    fld_label = field_label(next_field, reply_language)
                    if reply_language == "en":
                        msg = f"Please enter a number for {fld_label}."
                    elif reply_language == "de":
                        msg = f"Bitte geben Sie eine Zahl für {fld_label} ein."
                    elif reply_language == "ru":
                        msg = f"Пожалуйста, введите число для поля {fld_label}."
                    else:
                        msg = f"Lütfen {fld_label} için bir sayı giriniz."
                return self.response_service.build(
                    "inform",
                    msg,
                    intent,
                    1.0,
                    reply_language,
                    ui_language,
                    "rule",
                    action={"kind": "chat_form", "operation": state.operation, "step": state.step},
                )

            # Başka detay yok; arıza ise lokasyona, diğer durumlarda açıklamaya geç.
            if state.operation == "fault":
                state.step = "location"
                self.form_store.upsert(payload.channel, payload.user_id, payload.session_id, state)
                opts = _enum_options_for_detail(state, state.category or "", "location", reply_language)
                lines = [f"{idx}. {lbl}" for idx, _val, lbl in opts] or []
                if reply_language == "en":
                    msg = "Where is the fault located?\n" + "\n".join(lines)
                elif reply_language == "de":
                    msg = "Wo befindet sich die Störung?\n" + "\n".join(lines)
                elif reply_language == "ru":
                    msg = "Где находится неисправность?\n" + "\n".join(lines)
                else:
                    msg = "Arızanın bulunduğu yeri seçiniz:\n" + "\n".join(lines)
                return self.response_service.build(
                    "inform",
                    msg,
                    intent,
                    1.0,
                    reply_language,
                    ui_language,
                    "rule",
                    action={"kind": "chat_form", "operation": state.operation, "step": "location"},
                )

            state.step = "description"
            self.form_store.upsert(payload.channel, payload.user_id, payload.session_id, state)
            if reply_language == "en":
                msg = "Please briefly describe your request/issue."
            elif reply_language == "de":
                msg = "Bitte beschreiben Sie Ihr Anliegen kurz."
            elif reply_language == "ru":
                msg = "Пожалуйста, кратко опишите вашу просьбу или проблему."
            else:
                msg = "Lütfen talebinizi veya sorununuzu kısaca açıklayın."
            return self.response_service.build(
                "inform",
                msg,
                intent,
                1.0,
                reply_language,
                ui_language,
                "rule",
                action={"kind": "chat_form", "operation": state.operation, "step": "description"},
            )

        # Sayısal detay alanı (quantity vb.).
        if state.step == "detail_int":
            field_name = state.current_detail_field or ""
            if not text:
                fld_label = field_label(field_name, reply_language)
                if reply_language == "en":
                    msg = f"Please enter a number for {fld_label}."
                elif reply_language == "de":
                    msg = f"Bitte geben Sie eine Zahl für {fld_label} ein."
                elif reply_language == "ru":
                    msg = f"Пожалуйста, введите число для поля {fld_label}."
                else:
                    msg = f"Lütfen {fld_label} için bir sayı giriniz."
                return self.response_service.build(
                    "inform",
                    msg,
                    intent,
                    1.0,
                    reply_language,
                    ui_language,
                    "rule",
                    action={"kind": "chat_form", "operation": state.operation, "step": "detail_int"},
                )
            try:
                qty = int(text)
            except ValueError:
                qty = 0
            if qty <= 0:
                fld_label = field_label(field_name, reply_language)
                if reply_language == "en":
                    msg = f"Please enter a positive number for {fld_label}."
                elif reply_language == "de":
                    msg = f"Bitte geben Sie eine positive Zahl für {fld_label} ein."
                elif reply_language == "ru":
                    msg = f"Пожалуйста, введите положительное число для поля {fld_label}."
                else:
                    msg = f"Lütfen {fld_label} için pozitif bir sayı giriniz."
                return self.response_service.build(
                    "inform",
                    msg,
                    intent,
                    1.0,
                    reply_language,
                    ui_language,
                    "rule",
                    action={"kind": "chat_form", "operation": state.operation, "step": "detail_int"},
                )

            state.quantity = qty
            state.details[field_name] = qty

            # Sıradaki detaya veya açıklamaya geç.
            if state.pending_detail_fields:
                next_field = state.pending_detail_fields.pop(0)
                state.current_detail_field = next_field
                kind = _request_field_kind(state.category or "", next_field) or "enum"
                state.step = "detail_int" if kind == "int" else "detail_enum"
                self.form_store.upsert(payload.channel, payload.user_id, payload.session_id, state)
                if state.step == "detail_enum":
                    opts = _enum_options_for_detail(state, state.category or "", next_field, reply_language)
                    lines = [f"{idx}. {lbl}" for idx, _val, lbl in opts] or []
                    fld_label = field_label(next_field, reply_language)
                    if reply_language == "en":
                        msg = f"Please choose an option for {fld_label}:\n" + "\n".join(lines)
                    elif reply_language == "de":
                        msg = f"Bitte wählen Sie eine Option für {fld_label}:\n" + "\n".join(lines)
                    elif reply_language == "ru":
                        msg = f"Пожалуйста, выберите вариант для поля {fld_label}:\n" + "\n".join(lines)
                    else:
                        msg = f"Lütfen {fld_label} için bir seçim yapınız:\n" + "\n".join(lines)
                else:
                    fld_label = field_label(next_field, reply_language)
                    if reply_language == "en":
                        msg = f"Please enter a number for {fld_label}."
                    elif reply_language == "de":
                        msg = f"Bitte geben Sie eine Zahl für {fld_label} ein."
                    elif reply_language == "ru":
                        msg = f"Пожалуйста, введите число для поля {fld_label}."
                    else:
                        msg = f"Lütfen {fld_label} için bir sayı giriniz."
                return self.response_service.build(
                    "inform",
                    msg,
                    intent,
                    1.0,
                    reply_language,
                    ui_language,
                    "rule",
                    action={"kind": "chat_form", "operation": state.operation, "step": state.step},
                )

            if state.operation == "fault":
                state.step = "location"
                self.form_store.upsert(payload.channel, payload.user_id, payload.session_id, state)
                opts = _enum_options_for_detail(state, state.category or "", "location", reply_language)
                lines = [f"{idx}. {lbl}" for idx, _val, lbl in opts] or []
                if reply_language == "en":
                    msg = "Where is the fault located?\n" + "\n".join(lines)
                elif reply_language == "de":
                    msg = "Wo befindet sich die Störung?\n" + "\n".join(lines)
                elif reply_language == "ru":
                    msg = "Где находится неисправность?\n" + "\n".join(lines)
                else:
                    msg = "Arızanın bulunduğu yeri seçiniz:\n" + "\n".join(lines)
                return self.response_service.build(
                    "inform",
                    msg,
                    intent,
                    1.0,
                    reply_language,
                    ui_language,
                    "rule",
                    action={"kind": "chat_form", "operation": state.operation, "step": "location"},
                )

            state.step = "description"
            self.form_store.upsert(payload.channel, payload.user_id, payload.session_id, state)
            if reply_language == "en":
                msg = "Please briefly describe your request/issue."
            elif reply_language == "de":
                msg = "Bitte beschreiben Sie Ihr Anliegen kurz."
            elif reply_language == "ru":
                msg = "Пожалуйста, кратко опишите вашу просьбу или проблему."
            else:
                msg = "Lütfen talebinizi veya sorununuzu kısaca açıklayın."
            return self.response_service.build(
                "inform",
                msg,
                intent,
                1.0,
                reply_language,
                ui_language,
                "rule",
                action={"kind": "chat_form", "operation": state.operation, "step": "description"},
            )

        # Arıza için lokasyon adımı.
        if state.step == "location":
            opts = _enum_options_for_detail(state, state.category or "", "location", reply_language)
            if not opts:
                state.step = "description"
                self.form_store.upsert(payload.channel, payload.user_id, payload.session_id, state)
                if reply_language == "en":
                    msg = "Please briefly describe your request/issue."
                elif reply_language == "de":
                    msg = "Bitte beschreiben Sie Ihr Anliegen kurz."
                elif reply_language == "ru":
                    msg = "Пожалуйста, кратко опишите вашу просьбу или проблему."
                else:
                    msg = "Lütfen talebinizi veya sorununuzu kısaca açıklayın."
                return self.response_service.build(
                    "inform",
                    msg,
                    intent,
                    1.0,
                    reply_language,
                    ui_language,
                    "rule",
                    action={"kind": "chat_form", "operation": state.operation, "step": "description"},
                )
            if not text:
                lines = [f"{idx}. {lbl}" for idx, _val, lbl in opts]
                if reply_language == "en":
                    msg = "Where is the fault located?\n" + "\n".join(lines)
                elif reply_language == "de":
                    msg = "Wo befindet sich die Störung?\n" + "\n".join(lines)
                elif reply_language == "ru":
                    msg = "Где находится неисправность?\n" + "\n".join(lines)
                else:
                    msg = "Arızanın bulunduğu yeri seçiniz:\n" + "\n".join(lines)
                return self.response_service.build(
                    "inform",
                    msg,
                    intent,
                    1.0,
                    reply_language,
                    ui_language,
                    "rule",
                    action={"kind": "chat_form", "operation": state.operation, "step": "location"},
                )
            chosen: str | None = None
            try:
                idx = int(text)
                for i, val, _lbl in opts:
                    if i == idx:
                        chosen = val
                        break
            except ValueError:
                chosen = None
            if not chosen:
                lines = [f"{idx}. {lbl}" for idx, _val, lbl in opts]
                if reply_language == "en":
                    msg = "Please choose a valid location:\n" + "\n".join(lines)
                elif reply_language == "de":
                    msg = "Bitte wählen Sie einen gültigen Ort:\n" + "\n".join(lines)
                elif reply_language == "ru":
                    msg = "Пожалуйста, выберите допустимую локацию:\n" + "\n".join(lines)
                else:
                    msg = "Lütfen geçerli bir lokasyon seçiniz:\n" + "\n".join(lines)
                return self.response_service.build(
                    "inform",
                    msg,
                    intent,
                    1.0,
                    reply_language,
                    ui_language,
                    "rule",
                    action={"kind": "chat_form", "operation": state.operation, "step": "location"},
                )

            state.details["location"] = chosen
            state.step = "urgency"
            self.form_store.upsert(payload.channel, payload.user_id, payload.session_id, state)
            uopts = _enum_options_for_detail(state, state.category or "", "urgency", reply_language)
            lines = [f"{idx}. {lbl}" for idx, _val, lbl in uopts] or []
            if reply_language == "en":
                msg = "How urgent is the fault?\n" + "\n".join(lines)
            elif reply_language == "de":
                msg = "Wie dringend ist die Störung?\n" + "\n".join(lines)
            elif reply_language == "ru":
                msg = "Насколько срочная эта неисправность?\n" + "\n".join(lines)
            else:
                msg = "Arızanın aciliyetini seçiniz:\n" + "\n".join(lines)
            return self.response_service.build(
                "inform",
                msg,
                intent,
                1.0,
                reply_language,
                ui_language,
                "rule",
                action={"kind": "chat_form", "operation": state.operation, "step": "urgency"},
            )

        # Arıza için aciliyet adımı.
        if state.step == "urgency":
            opts = _enum_options_for_detail(state, state.category or "", "urgency", reply_language)
            if not opts:
                state.step = "description"
                self.form_store.upsert(payload.channel, payload.user_id, payload.session_id, state)
                if reply_language == "en":
                    msg = "Please briefly describe your request/issue."
                elif reply_language == "de":
                    msg = "Bitte beschreiben Sie Ihr Anliegen kurz."
                elif reply_language == "ru":
                    msg = "Пожалуйста, кратко опишите вашу просьбу или проблему."
                else:
                    msg = "Lütfen talebinizi veya sorununuzu kısaca açıklayın."
                return self.response_service.build(
                    "inform",
                    msg,
                    intent,
                    1.0,
                    reply_language,
                    ui_language,
                    "rule",
                    action={"kind": "chat_form", "operation": state.operation, "step": "description"},
                )
            if not text:
                lines = [f"{idx}. {lbl}" for idx, _val, lbl in opts]
                if reply_language == "en":
                    msg = "How urgent is the fault?\n" + "\n".join(lines)
                elif reply_language == "de":
                    msg = "Wie dringend ist die Störung?\n" + "\n".join(lines)
                elif reply_language == "ru":
                    msg = "Насколько срочная эта неисправность?\n" + "\n".join(lines)
                else:
                    msg = "Arızanın aciliyetini seçiniz:\n" + "\n".join(lines)
                return self.response_service.build(
                    "inform",
                    msg,
                    intent,
                    1.0,
                    reply_language,
                    ui_language,
                    "rule",
                    action={"kind": "chat_form", "operation": state.operation, "step": "urgency"},
                )
            chosen: str | None = None
            try:
                idx = int(text)
                for i, val, _lbl in opts:
                    if i == idx:
                        chosen = val
                        break
            except ValueError:
                chosen = None
            if not chosen:
                lines = [f"{idx}. {lbl}" for idx, _val, lbl in opts]
                if reply_language == "en":
                    msg = "Please choose a valid urgency:\n" + "\n".join(lines)
                elif reply_language == "de":
                    msg = "Bitte wählen Sie eine gültige Dringlichkeit:\n" + "\n".join(lines)
                elif reply_language == "ru":
                    msg = "Пожалуйста, выберите допустимую срочность:\n" + "\n".join(lines)
                else:
                    msg = "Lütfen geçerli bir aciliyet seçiniz:\n" + "\n".join(lines)
                return self.response_service.build(
                    "inform",
                    msg,
                    intent,
                    1.0,
                    reply_language,
                    ui_language,
                    "rule",
                    action={"kind": "chat_form", "operation": state.operation, "step": "urgency"},
                )

            state.details["urgency"] = chosen
            state.step = "description"
            self.form_store.upsert(payload.channel, payload.user_id, payload.session_id, state)
            if reply_language == "en":
                msg = "Please briefly describe your request/issue."
            elif reply_language == "de":
                msg = "Bitte beschreiben Sie Ihr Anliegen kurz."
            elif reply_language == "ru":
                msg = "Пожалуйста, кратко опишите вашу просьбу или проблему."
            else:
                msg = "Lütfen talebinizi veya sorununuzu kısaca açıklayın."
            return self.response_service.build(
                "inform",
                msg,
                intent,
                1.0,
                reply_language,
                ui_language,
                "rule",
                action={"kind": "chat_form", "operation": state.operation, "step": "description"},
            )

        # Açıklama → isim → oda adımları (ortak alanlar).
        if state.step == "description":
            cat = state.category or ""
            if not text:
                if (
                    state.operation == "guest_notification"
                    and cat
                    and cat not in GUEST_NOTIF_DESC_REQUIRED
                ):
                    state.description = (state.initial_message or "").strip()
                    state.step = "full_name"
                    self.form_store.upsert(payload.channel, payload.user_id, payload.session_id, state)
                    if reply_language == "en":
                        msg = "Thank you. May I have your full name?"
                    elif reply_language == "de":
                        msg = "Danke. Wie ist Ihr vollständiger Name?"
                    elif reply_language == "ru":
                        msg = "Спасибо. Напишите, пожалуйста, ваше имя и фамилию."
                    else:
                        msg = "Teşekkürler. Adınızı ve soyadınızı yazar mısınız?"
                    return self.response_service.build(
                        "inform",
                        msg,
                        intent,
                        1.0,
                        reply_language,
                        ui_language,
                        "rule",
                        action={
                            "kind": "chat_form",
                            "operation": state.operation,
                            "step": "full_name",
                        },
                    )
                if state.operation == "guest_notification" and cat in GUEST_NOTIF_DESC_REQUIRED:
                    msg = _guest_notification_description_lead(cat, reply_language)
                elif reply_language == "en":
                    msg = "Please write a short description so I can help you."
                elif reply_language == "de":
                    msg = "Bitte schreiben Sie eine kurze Beschreibung, damit ich Ihnen helfen kann."
                elif reply_language == "ru":
                    msg = "Пожалуйста, напишите короткое описание, чтобы я могла помочь."
                else:
                    msg = "Size yardımcı olabilmem için lütfen kısa bir açıklama yazın."
                return self.response_service.build(
                    "inform",
                    msg,
                    intent,
                    1.0,
                    reply_language,
                    ui_language,
                    "rule",
                    action={
                        "kind": "chat_form",
                        "operation": state.operation,
                        "step": "description",
                    },
                )
            state.description = text
            state.step = "full_name"
            self.form_store.upsert(payload.channel, payload.user_id, payload.session_id, state)
            if reply_language == "en":
                msg = "Thank you. May I have your full name?"
            elif reply_language == "de":
                msg = "Danke. Wie ist Ihr vollständiger Name?"
            elif reply_language == "ru":
                msg = "Спасибо. Напишите, пожалуйста, ваше имя и фамилию."
            else:
                msg = "Teşekkürler. Adınızı ve soyadınızı yazar mısınız?"
            return self.response_service.build(
                "inform",
                msg,
                intent,
                1.0,
                reply_language,
                ui_language,
                "rule",
                action={
                    "kind": "chat_form",
                    "operation": state.operation,
                    "step": "full_name",
                },
            )

        if state.step == "full_name":
            if not text:
                if reply_language == "en":
                    msg = "Please write your full name."
                elif reply_language == "de":
                    msg = "Bitte schreiben Sie Ihren vollständigen Namen."
                elif reply_language == "ru":
                    msg = "Пожалуйста, напишите ваше имя и фамилию."
                else:
                    msg = "Lütfen adınızı ve soyadınızı yazın."
                return self.response_service.build(
                    "inform",
                    msg,
                    intent,
                    1.0,
                    reply_language,
                    ui_language,
                    "rule",
                    action={
                        "kind": "chat_form",
                        "operation": state.operation,
                        "step": "full_name",
                    },
                )
            state.full_name = text
            state.step = "room"
            self.form_store.upsert(payload.channel, payload.user_id, payload.session_id, state)
            if reply_language == "en":
                msg = "Finally, could you share your room number?"
            elif reply_language == "de":
                msg = "Zum Schluss: Wie lautet Ihre Zimmernummer?"
            elif reply_language == "ru":
                msg = "И напоследок, напишите, пожалуйста, номер вашей комнаты."
            else:
                msg = "Son olarak oda numaranızı yazar mısınız?"
            return self.response_service.build(
                "inform",
                msg,
                intent,
                1.0,
                reply_language,
                ui_language,
                "rule",
                action={
                    "kind": "chat_form",
                    "operation": state.operation,
                    "step": "room",
                },
            )

        if state.step == "room":
            if not text:
                if reply_language == "en":
                    msg = "Please write your room number."
                elif reply_language == "de":
                    msg = "Bitte schreiben Sie Ihre Zimmernummer."
                elif reply_language == "ru":
                    msg = "Пожалуйста, напишите номер вашей комнаты."
                else:
                    msg = "Lütfen oda numaranızı yazın."
                return self.response_service.build(
                    "inform",
                    msg,
                    intent,
                    1.0,
                    reply_language,
                    ui_language,
                    "rule",
                    action={
                        "kind": "chat_form",
                        "operation": state.operation,
                        "step": "room",
                    },
                )
            room_clean = text.strip()
            if not is_valid_hotel_room_number(room_clean):
                _reset_chat_form_to_category(state)
                self.form_store.upsert(payload.channel, payload.user_id, payload.session_id, state)
                if reply_language == "en":
                    err = (
                        "Please enter a valid room number for this hotel. "
                        "Let's start again from category selection."
                    )
                elif reply_language == "de":
                    err = (
                        "Bitte geben Sie eine gültige Zimmernummer für dieses Hotel ein. "
                        "Wir beginnen erneut mit der Kategorieauswahl."
                    )
                elif reply_language == "ru":
                    err = (
                        "Пожалуйста, введите действительный номер комнаты этого отеля. "
                        "Начнём снова с выбора категории."
                    )
                else:
                    err = "Lütfen geçerli bir oda numarası girin. Kategori seçiminden yeniden başlayalım."
                msg = err + "\n\n" + _category_prompt(state.operation)
                return self.response_service.build(
                    "inform",
                    msg,
                    intent,
                    1.0,
                    reply_language,
                    ui_language,
                    "rule",
                    action={"kind": "chat_form", "operation": state.operation, "step": "category"},
                )
            state.room = room_clean
            # Oda alındı; şimdi özet + onay adımına geç.
            state.step = "confirm"
            self.form_store.upsert(payload.channel, payload.user_id, payload.session_id, state)

            guest_type = (
                "fault"
                if state.operation == "fault"
                else (
                    "complaint"
                    if state.operation == "complaint"
                    else ("guest_notification" if state.operation == "guest_notification" else "request")
                )
            )
            category = state.category or "other"
            details = dict(state.details or {})
            location = details.get("location") if guest_type == "fault" else None
            urgency = details.get("urgency") if guest_type == "fault" else None
            cat_intent = (
                "guest_notification"
                if guest_type == "guest_notification"
                else (
                    "request"
                    if guest_type == "request"
                    else ("fault" if guest_type == "fault" else "complaint")
                )
            )
            category_display = category_label(cat_intent, category, reply_language)
            type_display = _form_record_type_label(guest_type, reply_language)

            # Özet metni (kayıt açılmadan önce).
            if reply_language == "en":
                header = "Please confirm the record details:\n"
                type_label = "Type"
                cat_label = "Category"
                loc_label = "Location"
                urg_label = "Urgency"
                desc_label = "Description"
                name_label = "Name"
                room_label = "Room"
                confirm_line = "\nPlease choose:\n1. Confirm and create record\n2. Cancel"
            elif reply_language == "de":
                header = "Bitte bestätigen Sie die folgenden Angaben:\n"
                type_label = "Typ"
                cat_label = "Kategorie"
                loc_label = "Ort"
                urg_label = "Dringlichkeit"
                desc_label = "Beschreibung"
                name_label = "Name"
                room_label = "Zimmer"
                confirm_line = "\nBitte wählen Sie:\n1. Bestätigen und Eintrag erstellen\n2. Abbrechen"
            elif reply_language == "ru":
                header = "Пожалуйста, подтвердите данные заявки:\n"
                type_label = "Тип"
                cat_label = "Категория"
                loc_label = "Локация"
                urg_label = "Срочность"
                desc_label = "Описание"
                name_label = "Имя"
                room_label = "Номер"
                confirm_line = "\nПожалуйста, выберите:\n1. Подтвердить и создать заявку\n2. Отменить"
            else:
                header = "Lütfen aşağıdaki kayıt özetini kontrol edin:\n"
                type_label = "Tip"
                cat_label = "Kategori"
                loc_label = "Lokasyon"
                urg_label = "Aciliyet"
                desc_label = "Açıklama"
                name_label = "Ad Soyad"
                room_label = "Oda"
                confirm_line = "\nLütfen seçin:\n1. Onayla ve kayıt aç\n2. İptal et"

            lines = [header.rstrip()]
            lines.append(f"- {type_label}: {type_display}")
            lines.append(f"- {cat_label}: {category_display}")
            if location:
                loc_disp = value_label("location", location, reply_language) or location
                lines.append(f"- {loc_label}: {loc_disp}")
            if urgency:
                urg_disp = value_label("urgency", urgency, reply_language) or urgency
                lines.append(f"- {urg_label}: {urg_disp}")
            lines.append(f"- {desc_label}: {state.description or state.initial_message or ''}")
            lines.append(f"- {name_label}: {state.full_name or ''}")
            lines.append(f"- {room_label}: {state.room or ''}")
            lines.append(confirm_line.strip())
            msg = "\n".join(lines)

            return self.response_service.build(
                "inform",
                msg,
                intent,
                1.0,
                reply_language,
                ui_language,
                "rule",
                action={
                    "kind": "chat_form",
                    "operation": state.operation,
                    "step": "confirm",
                },
            )

        if state.step == "confirm":
            # Kullanıcının onayı: 1/Evet -> kayıt aç, 2/Hayır -> formu iptal et.
            if not text:
                if reply_language == "en":
                    msg = "Please choose:\n1. Confirm and create record\n2. Cancel"
                elif reply_language == "de":
                    msg = "Bitte wählen Sie:\n1. Bestätigen und Eintrag erstellen\n2. Abbrechen"
                elif reply_language == "ru":
                    msg = "Пожалуйста, выберите:\n1. Подтвердить и создать заявку\n2. Отменить"
                else:
                    msg = "Lütfen seçin:\n1. Onayla ve kayıt aç\n2. İptal et"
                return self.response_service.build(
                    "inform",
                    msg,
                    intent,
                    1.0,
                    reply_language,
                    ui_language,
                    "rule",
                    action={
                        "kind": "chat_form",
                        "operation": state.operation,
                        "step": "confirm",
                    },
                )

            lowered = text.strip().lower()
            is_yes = lowered in ("1", "evet", "onay", "onaylıyorum", "ok", "tamam")
            is_no = lowered in ("2", "hayır", "hayir", "iptal", "vazgeç", "vazgec")

            if not (is_yes or is_no):
                # Sayı yerine serbest bir mesaj yazıldıysa formu güvenli şekilde iptal et
                # ve normal sohbet akışına dön.
                self.form_store.clear(payload.channel, payload.user_id, payload.session_id)
                if reply_language == "en":
                    msg = "Okay, I have cancelled this form. You can ask a new question or report another issue."
                elif reply_language == "de":
                    msg = "In Ordnung, ich habe dieses Formular storniert. Sie können eine neue Frage stellen oder eine weitere Störung melden."
                elif reply_language == "ru":
                    msg = "Хорошо, я отменила эту форму. Вы можете задать новый вопрос или сообщить о другой проблеме."
                else:
                    msg = "Tamam, bu formu iptal ettim. Yeni bir soru sorabilir veya farklı bir arıza/talep bildirebilirsiniz."
                return self.response_service.build(
                    "inform",
                    msg,
                    intent,
                    1.0,
                    reply_language,
                    ui_language,
                    "rule",
                )

            if is_no:
                # Form iptal; state temizle.
                self.form_store.clear(payload.channel, payload.user_id, payload.session_id)
                if reply_language == "en":
                    msg = "Okay, I have cancelled this record. You can start a new request or fault report anytime."
                elif reply_language == "de":
                    msg = "In Ordnung, ich habe diesen Eintrag storniert. Sie können jederzeit eine neue Anfrage oder Störungsmeldung starten."
                elif reply_language == "ru":
                    msg = "Хорошо, я отменила эту заявку. Вы можете в любое время начать новый запрос или сообщить о неисправности."
                else:
                    msg = "Tamam, bu kaydı iptal ettim. İstediğiniz zaman yeni bir talep veya arıza bildirimi yapabilirsiniz."
                return self.response_service.build(
                    "inform",
                    msg,
                    intent,
                    1.0,
                    reply_language,
                    ui_language,
                    "rule",
                )

            # Onaylandı: kayıt payload'unu üret ve misafir kaydını aç.
            guest_type = (
                "fault"
                if state.operation == "fault"
                else (
                    "complaint"
                    if state.operation == "complaint"
                    else ("guest_notification" if state.operation == "guest_notification" else "request")
                )
            )
            category = state.category or "other"
            categories = [category]
            details = dict(state.details or {})
            location = details.get("location") if guest_type == "fault" else None
            urgency = details.get("urgency") if guest_type == "fault" else None

            action_payload = {
                "type": guest_type,
                "category": category,
                "categories": categories,
                "details": details,
                "location": location,
                "urgency": urgency,
                "description": state.description or state.initial_message or "",
                "name": state.full_name or "",
                "room": state.room or "",
                "nationality": "-",
                "language": reply_language,
            }

            self.form_store.clear(payload.channel, payload.user_id, payload.session_id)

            if reply_language == "en":
                msg = "Thank you. I have recorded your request and will forward it to the relevant team."
            elif reply_language == "de":
                msg = "Vielen Dank. Ich habe Ihr Anliegen erfasst und leite es an das zuständige Team weiter."
            elif reply_language == "ru":
                msg = "Спасибо. Я зарегистрировала вашу просьбу и передам её соответствующей команде."
            else:
                msg = "Teşekkürler. Talebinizi kaydettim ve ilgili ekibe iletiyorum."

            exit_after = 1800 if getattr(payload, "channel", None) == "web" else None
            return self.response_service.build(
                "inform",
                msg,
                intent,
                1.0,
                reply_language,
                ui_language,
                "rule",
                action={
                    "kind": "create_guest_request",
                    "operation": state.operation,
                    "payload": action_payload,
                },
                exit_chat_after_ms=exit_after,
            )

        # Beklenmeyen step durumunda formu sıfırla ve güvenli fallback üret.
        self.form_store.clear(payload.channel, payload.user_id, payload.session_id)
        return self._fallback_response(
            intent,
            0.0,
            reply_language,
            ui_language,
            fallback_reason="chat_form_invalid_state",
        )

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
        if intent == "reservation":
            text = _RESERVATION_REDIRECT_TEXT.get(reply_language, _RESERVATION_REDIRECT_TEXT["tr"])
            return self.response_service.build(
                "inform",
                text,
                "reservation",
                1.0,
                reply_language,
                ui_language,
                "fallback",
                action=self._action_for_intent("reservation", None, None),
            )
        return self.response_service.build(
            "fallback",
            self.localization_service.canonical_fallback(reply_language, reason="safe"),
            "unknown"
            if intent
            not in (
                "recommendation",
                "hotel_info",
                "fault_report",
                "complaint",
                "request",
                "reservation",
                "special_need",
                "guest_notification",
            )
            else intent,
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
        _safety = frozenset({"special_need", "guest_notification"})
        if primary.meta.intent in _safety or secondary.meta.intent in _safety:
            # Güvenlik: özel diyet / misafir bildirimi varken restoran önerisi eklenmez.
            chosen = primary if primary.meta.intent in _safety else secondary
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
            "guest_notification": 87,
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
        # Chatbot üzerinden gelen istek/şikayet/arıza ve özel ihtiyaçlar Supabase üzerinde
        # guest request/fault/complaint kaydına dönüşürken, rezervasyonlar için ayrı bir
        # Rezervasyonlar modülü formuna yönlendirme tercih edilir.
        if intent == "reservation":
            # Frontend, bu action'ı alıp uygun Rezervasyonlar formunu açabilir.
            return {
                "kind": "open_reservation_form",
                "sub_intent": sub_intent,
                "entity": entity,
            }
        if intent in ("fault_report", "complaint", "request", "special_need"):
            department = "guest_relations" if intent in ("complaint", "special_need") else "reception"
            priority = "medium"
            if intent in ("complaint", "special_need"):
                priority = "high"
            elif intent == "request":
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

