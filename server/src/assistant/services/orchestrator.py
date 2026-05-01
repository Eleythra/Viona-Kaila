from assistant.schemas.chat import ChatRequest
from assistant.schemas.intent import IntentResult
from assistant.schemas.response import ChatMeta, ChatResponse
from assistant.services.language_service import LanguageService
from assistant.services.localization_service import LocalizationService
from assistant.services.rule_engine import (
    RuleEngine,
    extract_request_category_from_text,
    extract_room_supply_request_entity,
)
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
from assistant.core.chatbot_languages import (
    CHATBOT_UI_LANG_SET,
    normalize_chatbot_lang,
    orchestrator_branch_lang as _tpl_lang,
    voice_dict_lang,
)
import re

from assistant.services.chat_form_state import ChatFormState, InMemoryChatFormStore, OperationType
from assistant.services.conversation_session import InMemoryConversationSessionStore
from assistant.services.voice_channel_layer import (
    VOICE_ALACARTE_RESERVATION_HINT,
    VOICE_OPERATIONAL_USE_TEXT,
    VOICE_RECEPTION_RESERVATION_HINT,
    VOICE_SPA_BOOKING_HINT,
)
from assistant.services.hotel_room_numbers import is_valid_hotel_room_number
from assistant.services.form_name_input import (
    is_chat_form_full_name_help_request,
    is_full_name_input_effectively_empty,
    normalize_full_name_for_storage,
    validate_chat_form_full_name,
)

from datetime import datetime
from zoneinfo import ZoneInfo


def operational_quiet_hours_active(now: datetime | None = None) -> bool:
    """Europe/Istanbul 00:00–07:59 — operasyonel form kaydı kapalı (08:00 dahil açık)."""
    tz = ZoneInfo("Europe/Istanbul")
    t = now.astimezone(tz) if now else datetime.now(tz)
    return (t.hour * 60 + t.minute) < 8 * 60



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
    REQUEST_CATEGORY_CHAT_SECTIONS,
    REQUEST_DETAIL_FIELDS,
    COMPLAINT_CATEGORIES,
    FAULT_CATEGORIES,
    FAULT_LOCATIONS,
    FAULT_URGENCIES,
    GUEST_NOTIFICATION_BY_GROUP,
    guest_notification_categories_for_group,
    request_categories_for_chat_ui,
)
from assistant.services.form_labels import category_label, field_label, request_section_label, value_label

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
    _loc = LocalizationService()
    key = "guest_notif_description_required" if need else "guest_notif_description_optional"
    return _loc.get(key, reply_language)


_VALID_LANG = CHATBOT_UI_LANG_SET


def _valid_conversation_language(value: str | None) -> str | None:
    if not value:
        return None
    v = str(value).lower().strip()
    return v if v in _VALID_LANG else None


# Erken giriş: Rezervasyonlar modülü değil; ön büro — nazik, net resepsiyon yönlendirmesi (yalnız metin).
_EARLY_CHECKIN_RECEPTION_TEXT: dict[str, str] = {
    "tr": (
        "Erken giriş, o günkü doluluk ve oda hazırlığına bağlıdır; en doğru bilgi ve yardımı "
        "ön büro / resepsiyon ekibimiz verir. İsterseniz doğrudan resepsiyona uğrayabilir veya "
        "telefonla arayabilirsiniz; talebinizi kısaca iletmeniz yeterli — ekibimiz sizi memnuniyetle yönlendirir."
    ),
    "en": (
        "Early check-in is subject to availability and housekeeping on the day of arrival. "
        "Our front desk team will gladly confirm what is possible and arrange the details. "
        "Please stop by reception or call us when you arrive — we are here to help."
    ),
    "de": (
        "Ein früherer Check-in hängt von Belegung und Zimmerbereitung am Anreisetag ab. "
        "Unser Rezeptionsteam informiert Sie zuverlässig und hilft bei der Organisation. "
        "Sprechen Sie uns bitte direkt an der Rezeption an oder rufen Sie uns an — wir unterstützen Sie gern."
    ),
    "pl": (
        "Wcześniejsze zameldowanie zależy od obłożenia i przygotowania pokoju w dniu przyjazdu. "
        "Aktualne informacje i pomoc uzyskasz u zespołu recepcji. "
        "Zajrzyj do recepcji lub zadzwoń — chętnie podpowiemy możliwe opcje."
    ),
}


def _is_early_checkin_reception_handoff(normalized: str, sub_intent: str | None, entity: str | None) -> bool:
    tl = (normalized or "").lower()
    if (entity or "").strip() == "early_checkin":
        return True
    if (sub_intent or "").strip() == "early_checkin_request":
        return True
    needles = (
        "erken giriş",
        "erken giris",
        "erken giriş istiyorum",
        "erken giris istiyorum",
        "early check-in",
        "early checkin",
        "earlier check-in",
        "earlier check in",
        "want early check",
        "wants early check",
        "would like early check",
        "früher einchecken",
        "frueher einchecken",
        "früher check-in",
        "fruher check-in",
        "wcześniejsze zameldowanie",
        "wcześniejszego zameldowania",
    )
    if any(n in tl for n in needles):
        return True
    return False


# Şikayet: kategorisi net olanlar için uygulama şikayet formu butonu (open_complaint_form); genel “sorunum var” yalnız metin.
_COMPLAINT_GUIDANCE_TEXT: dict[str, str] = {
    "tr": (
        "Şikayetinizi Viona uygulamasındaki şikayet formu ile iletebilirsiniz. "
        "Kayıp eşya bildirimleri için formda «Kayıp eşya» başlığı da yer alır. "
        "Aşağıdaki buton formu açar; dilerseniz resepsiyona da başvurabilirsiniz."
    ),
    "en": (
        "You can submit your complaint using the complaint form in the Viona app. "
        "The form includes a dedicated «Lost property» category. "
        "The button below opens the form; you can also speak with reception."
    ),
    "de": (
        "Sie können Ihre Beschwerde über das Beschwerdeformular in der Viona-App senden. "
        "Dort gibt es eine eigene Kategorie «Fundsachen / verlorenes Eigentum». "
        "Die Schaltfläche unten öffnet das Formular; alternativ erreichen Sie die Rezeption."
    ),
    "pl": (
        "Reklamację możesz przesłać przez formularz w aplikacji Viona. "
        "W formularzu jest osobna kategoria „Zgubione rzeczy”. "
        "Przycisk poniżej otwiera formularz; możesz też udać się do recepcji."
    ),
}

_COMPLAINT_GUIDANCE_TEXT_GENERIC: dict[str, str] = {
    "tr": (
        "Yaşadığınız durumu netleştirmek için lütfen resepsiyon ile görüşün veya uygulamadaki şikayet formunu kullanın."
    ),
    "en": ("Please contact reception or use the complaint form in the app so the team can help you."),
    "de": ("Bitte wenden Sie sich an die Rezeption oder nutzen Sie das Beschwerdeformular in der App."),
    "pl": ("Skontaktuj się z recepcją lub użyj formularza reklamacji w aplikacji."),
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
    "pl": (
        "Późniejsze wymeldowanie uzgadnia się na recepcji. "
        "Wypełnij formularz w sekcji „Prośby” → „Powiadomienia gościa”. "
        "Przycisk poniżej otwiera ten formularz od razu."
    ),
}


def _guest_notification_category_prompt(notif_group: str | None, reply_language: str) -> str:
    _loc = LocalizationService()
    heads = {
        "diet": _loc.get("guest_notif_head_diet", reply_language),
        "health": _loc.get("guest_notif_head_health", reply_language),
        "celebration": _loc.get("guest_notif_head_celebration", reply_language),
        "reception": _loc.get("guest_notif_head_reception", reply_language),
    }
    lead = _loc.get("guest_notif_choose_lead_numbered", reply_language)

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


def _localized_request_detail_int_prompt(
    category: str,
    field_name: str,
    reply_language: str,
    *,
    positive_only_invalid: bool = False,
) -> str:
    """İstek formu adet adımında hangi talep türü için sorulduğunu netleştirir (uygulama formuyla uyum)."""
    fld_label = field_label(field_name, reply_language)
    cat_raw = (category or "").strip()
    cat_lbl = category_label("request", cat_raw, reply_language) if cat_raw else ""
    if not cat_lbl:
        if positive_only_invalid:
            if _tpl_lang(reply_language) == "en":
                return f"Please enter a positive number for {fld_label}."
            if _tpl_lang(reply_language) == "de":
                return f"Bitte geben Sie eine positive Zahl für {fld_label} ein."
            if _tpl_lang(reply_language) == "pl":
                return f"Proszę podać dodatnią liczbę dla pola {fld_label}."
            return f"Lütfen {fld_label} için pozitif bir sayı giriniz."
        if _tpl_lang(reply_language) == "en":
            return f"Please enter a number for {fld_label}."
        if _tpl_lang(reply_language) == "de":
            return f"Bitte geben Sie eine Zahl für {fld_label} ein."
        if _tpl_lang(reply_language) == "pl":
            return f"Proszę podać liczbę dla pola {fld_label}."
        return f"Lütfen {fld_label} için bir sayı giriniz."
    if positive_only_invalid:
        if _tpl_lang(reply_language) == "en":
            return f"Please enter a positive number for {fld_label} («{cat_lbl}»)."
        if _tpl_lang(reply_language) == "de":
            return f"Bitte geben Sie eine positive Zahl für {fld_label} ein («{cat_lbl}»)."
        if _tpl_lang(reply_language) == "pl":
            return f"Proszę podać dodatnią liczbę dla {fld_label} («{cat_lbl}»)."
        return f"Lütfen «{cat_lbl}» için {fld_label} alanına pozitif bir sayı giriniz."
    if _tpl_lang(reply_language) == "en":
        return f"For «{cat_lbl}», please enter a number for {fld_label}."
    if _tpl_lang(reply_language) == "de":
        return f"Für «{cat_lbl}» bitte eine Zahl für {fld_label} eingeben."
    if _tpl_lang(reply_language) == "pl":
        return f"Dla „{cat_lbl}” podaj liczbę dla pola {fld_label}."
    return f"«{cat_lbl}» talebi için lütfen {fld_label} olarak bir sayı giriniz."


def _request_chat_category_prompt(reply_language: str) -> str:
    """İstek sohbet formu: uygulamadaki İstekler sekmesiyle aynı bölüm başlıkları ve sıra."""
    lines: list[str] = []
    n = 1
    for section_key, cats in REQUEST_CATEGORY_CHAT_SECTIONS:
        lines.append(request_section_label(section_key, reply_language) + ":")
        for cat in cats:
            lbl = category_label("request", cat, reply_language)
            lines.append(f"{n}. {lbl}")
            n += 1
    body = "\n".join(lines)
    lead = LocalizationService().get("chat_request_category_prompt_lead", reply_language)
    return lead + body


_REQUEST_CATEGORY_RESOLVE_INFO_MARKERS: tuple[str, ...] = (
    "var mı",
    "varmi",
    "var mi",
    "varmı",
    "ne kadar",
    "nakadar",
    "fiyat",
    "ücret",
    "ucret",
    "ücretsiz",
    "ucretsiz",
    "bedava",
    "how much",
    "is there",
    "do you have",
    "what time",
    "what are the",
    "wieviel",
    "kostet",
    "gibt es",
    "ile",
    "czy jest",
    "o której",
)


def _message_looks_like_service_info_query_for_request_form(normalized: str) -> bool:
    """Kategori adımında fiyat / var mı / saat gibi saf bilgi sorusu mu (talep türü seçimi değil)."""
    tl = (normalized or "").lower()
    return any(n in tl for n in _REQUEST_CATEGORY_RESOLVE_INFO_MARKERS)


def _request_resolve_category_at_form_step(normalized: str) -> str | None:
    """
    İstek sohbet formu kategori adımı: numara dışında «bornoz», «yastık» gibi tür adı.
    Bilgi sorusu gibi görünen metinde yanlışlıkla minibar_refill vb. seçilmesin.
    """
    if not (normalized or "").strip():
        return None
    if _message_looks_like_service_info_query_for_request_form(normalized):
        return None
    g = extract_request_category_from_text(normalized)
    if g and g in REQUEST_CATEGORIES:
        return g
    return None


def _request_description_lead(category_id: str, reply_language: str) -> str:
    """İstek formu açıklama adımı — seçilen türü hatırlatır."""
    cid = (category_id or "").strip()
    if not cid:
        if _tpl_lang(reply_language) == "en":
            return "Please briefly describe what you need."
        if _tpl_lang(reply_language) == "de":
            return "Bitte beschreiben Sie kurz, was Sie benötigen."
        if _tpl_lang(reply_language) == "pl":
            return "Krótko opisz, czego potrzebujesz."
        return "Lütfen kısaca neye ihtiyaç duyduğunuzu yazın."
    cat_lbl = category_label("request", cid, reply_language)
    if _tpl_lang(reply_language) == "en":
        return f"For «{cat_lbl}», please briefly describe what you need."
    if _tpl_lang(reply_language) == "de":
        return f"Zu «{cat_lbl}»: Bitte beschreiben Sie kurz, was Sie benötigen."
    if _tpl_lang(reply_language) == "pl":
        return f"W prośbie „{cat_lbl}” krótko opisz, czego potrzebujesz."
    return f"«{cat_lbl}» talebiniz için lütfen kısaca neye ihtiyaç duyduğunuzu yazın."


def _orch_reply_lang(lang: str | None) -> str:
    """Orchestrator içi yanıt / form dili: geçersiz veya boş → ``tr``."""
    return normalize_chatbot_lang(lang)


def _form_category_display_label(operation: str, category_id: str, reply_language: str) -> str:
    cid = (category_id or "").strip()
    if not cid:
        return ""
    intent_map = {
        "request": "request",
        "guest_notification": "guest_notification",
        "fault": "fault",
        "complaint": "complaint",
    }
    cat_intent = intent_map.get(operation, "request")
    return (category_label(cat_intent, cid, reply_language) or "").strip()


def _localized_full_name_prompt_request_prefill(category_id: str, reply_language: str) -> str:
    """Adet/zaman adımı yokken ilk mesaj açıklama sayılır — havlu akışındaki gibi talep türü + onay."""
    lang = _orch_reply_lang(reply_language)
    cat_lbl = _form_category_display_label("request", category_id, reply_language)
    if not cat_lbl:
        if _tpl_lang(lang) == "en":
            return "Thank you — we've noted your request. May I have your full name?"
        if _tpl_lang(lang) == "de":
            return "Danke — wir haben Ihre Anfrage erfasst. Wie ist Ihr vollständiger Name?"
        if _tpl_lang(lang) == "pl":
            return "Dziękujemy — zapisaliśmy Twoją prośbę. Napisz proszę imię i nazwisko."
        return "Teşekkürler — talebinizi aldık. Adınızı ve soyadınızı yazar mısınız?"
    if _tpl_lang(lang) == "en":
        return f'We have received your «{cat_lbl}» request. Thank you. May I have your full name?'
    if _tpl_lang(lang) == "de":
        return f'Wir haben Ihre Anfrage «{cat_lbl}» erhalten. Vielen Dank. Wie ist Ihr vollständiger Name?'
    if _tpl_lang(lang) == "pl":
        return f'Otrzymaliśmy Twoją prośbę „{cat_lbl}”. Dziękujemy. Napisz proszę imię i nazwisko.'
    return f"«{cat_lbl}» talebinizi aldık. Teşekkürler. Adınızı ve soyadınızı yazar mısınız?"


def _localized_full_name_prompt_after_description_step(
    operation: str, category_id: str, reply_language: str
) -> str:
    """Açıklama yazıldıktan sonra isim adımı — kısa not alındı onayı (kategori görünür)."""
    lang = _orch_reply_lang(reply_language)
    cat_lbl = _form_category_display_label(operation, category_id, reply_language)
    if not cat_lbl:
        if _tpl_lang(lang) == "en":
            return "Thank you. May I have your full name?"
        if _tpl_lang(lang) == "de":
            return "Danke. Wie ist Ihr vollständiger Name?"
        if _tpl_lang(lang) == "pl":
            return "Dziękujemy. Napisz proszę imię i nazwisko."
        return "Teşekkürler. Adınızı ve soyadınızı yazar mısınız?"
    if _tpl_lang(lang) == "en":
        return f'Thank you — we have noted your message for «{cat_lbl}». May I have your full name?'
    if _tpl_lang(lang) == "de":
        return f'Vielen Dank — wir haben Ihre Angaben zu «{cat_lbl}» notiert. Wie ist Ihr vollständiger Name?'
    if _tpl_lang(lang) == "pl":
        return f'Dziękujemy — zapisaliśmy wiadomość dla „{cat_lbl}”. Napisz proszę imię i nazwisko.'
    return f"Teşekkürler — «{cat_lbl}» için notunuzu aldım. Adınızı ve soyadınızı yazar mısınız?"


def _localized_full_name_prompt_guest_notif_skip_description(
    category_id: str, reply_language: str
) -> str:
    """Misafir bildirimi: açıklama zorunlu değilse ilk mesaj kullanılır — bildirim türü + onay."""
    lang = _orch_reply_lang(reply_language)
    cat_lbl = _form_category_display_label("guest_notification", category_id, reply_language)
    if not cat_lbl:
        if _tpl_lang(lang) == "en":
            return "Thank you. May I have your full name?"
        if _tpl_lang(lang) == "de":
            return "Danke. Wie ist Ihr vollständiger Name?"
        if _tpl_lang(lang) == "pl":
            return "Dziękujemy. Napisz proszę imię i nazwisko."
        return "Teşekkürler. Adınızı ve soyadınızı yazar mısınız?"
    if _tpl_lang(lang) == "en":
        return f'We have received your «{cat_lbl}» notification. Thank you. May I have your full name?'
    if _tpl_lang(lang) == "de":
        return f'Wir haben Ihre Mitteilung «{cat_lbl}» erhalten. Vielen Dank. Wie ist Ihr vollständiger Name?'
    if _tpl_lang(lang) == "pl":
        return f'Otrzymaliśmy Twoje powiadomienie „{cat_lbl}”. Dziękujemy. Napisz proszę imię i nazwisko.'
    return f"«{cat_lbl}» bildiriminizi aldık. Teşekkürler. Adınızı ve soyadınızı yazar mısınız?"


def _initial_message_substantive_for_request_prefill(msg: str) -> bool:
    """Kategori numarası veya çok kısa yanıtları açıklama ön-doldurma için kullanma."""
    s = (msg or "").strip()
    if len(s) < 5:
        return False
    if s.isdigit():
        return False
    return True


def _request_category_prefills_description_from_first_message(category_id: str) -> bool:
    """
    Şemada miktar/zaman seçimi yoksa ve kategori net değilse («other») ilk mesajı
    açıklama kabul edip doğrudan isim adımına geçilebilir.
    """
    cid = (category_id or "").strip()
    if cid == "other":
        return False
    return not (REQUEST_DETAIL_FIELDS.get(cid) or ())


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


# Liste ekranında (detay enum) geçerli numara seçilmeden kategori gibi başka konuya geçilebilir.
# Adet (detail_int) ve sonrası adımlar seçim yapıldıktan sonra kilitlidir.
_FORM_TOPIC_SWITCH_STEPS = frozenset({"category", "detail_enum"})


def _request_choice_text_matches_current_step(
    state: ChatFormState,
    text: str,
    reply_language: str,
) -> bool:
    """Talep formu detail_enum adımında metin geçerli bir seçim numarası ise True (bağlam değiştirme yapılmaz)."""
    t = (text or "").strip()
    if not t or state.operation != "request" or state.step != "detail_enum":
        return False
    field_name = state.current_detail_field or ""
    if not field_name:
        return False
    try:
        idx = int(t)
    except ValueError:
        return False
    opts = _enum_options_for_detail(state, state.category or "", field_name, reply_language)
    return 1 <= idx <= len(opts)


# Bu alt niyetler chat formu yerine ResponseComposer yönlendirme metni kullanır (öğle paketi, transfer, …).
_REQUEST_CHAT_FORM_EXEMPT_SUBINTENTS = frozenset(
    {
        "lunch_box_request",
        "reception_contact_request",
        "guest_relations_contact_request",
    }
)


def _request_rule_uses_reception_redirect_not_chat_form(sub_intent: str | None, entity: str | None) -> bool:
    """İstek kuralı: sohbet kategori listesi yerine doğrudan resepsiyon yönlendirmesi (su ↔ minibar formu karışmasın)."""
    if (sub_intent or "") in _REQUEST_CHAT_FORM_EXEMPT_SUBINTENTS:
        return True
    if (sub_intent or "") == "extra_item_request" and (entity or "").strip() == "water":
        return True
    return False


# Kayıt özeti satırı — `orchestrator_branch_lang` ile değil, gerçek UI dilinde gösterilir.
_FORM_RECORD_TYPE_LABELS: dict[str, dict[str, str]] = {
    "tr": {
        "fault": "Arıza bildirimi",
        "request": "Oda talebi",
        "complaint": "Şikayet",
        "guest_notification": "Misafir bildirimi",
    },
    "en": {
        "fault": "Fault report",
        "request": "Room request",
        "complaint": "Complaint",
        "guest_notification": "Guest notice",
    },
    "de": {
        "fault": "Störmeldung",
        "request": "Zimmeranfrage",
        "complaint": "Beschwerde",
        "guest_notification": "Gästemeldung",
    },
    "pl": {
        "fault": "Zgłoszenie awarii",
        "request": "Prośba do pokoju",
        "complaint": "Reklamacja",
        "guest_notification": "Powiadomienie dla hotelu",
    },
    "da": {
        "fault": "Fejlrapport",
        "request": "Værelsesanmodning",
        "complaint": "Klage",
        "guest_notification": "Gæstenotifikation",
    },
    "nl": {
        "fault": "Storingsmelding",
        "request": "Kamerverzoek",
        "complaint": "Klacht",
        "guest_notification": "Gastmelding",
    },
    "cs": {
        "fault": "Hlášení závady",
        "request": "Požadavek na pokoj",
        "complaint": "Reklamace",
        "guest_notification": "Oznámení hosta",
    },
    "ro": {
        "fault": "Raport de defecțiune",
        "request": "Cerere cameră",
        "complaint": "Reclamație",
        "guest_notification": "Notificare oaspete",
    },
    "sk": {
        "fault": "Hlásenie poruchy",
        "request": "Požiadavka na izbu",
        "complaint": "Reklamácia",
        "guest_notification": "Oznámenie hosťa",
    },
    "ru": {
        "fault": "Сообщение о неисправности",
        "request": "Запрос в номер",
        "complaint": "Жалоба",
        "guest_notification": "Уведомление гостя",
    },
}


def _form_record_type_label(kind: str, reply_language: str) -> str:
    k = (kind or "").strip()
    lang = normalize_chatbot_lang(reply_language)
    row = _FORM_RECORD_TYPE_LABELS.get(lang) or _FORM_RECORD_TYPE_LABELS["tr"]
    return row.get(k, k)


# Onay adımı: kısa doğal dil (oturum durumu + form step ile birlikte yorumlanır).
_CONFIRM_YES_PHRASES = frozenset(
    {
        "1",
        "evet",
        "onay",
        "onaylıyorum",
        "onayliyorum",
        "ok",
        "okay",
        "tamam",
        "olur",
        "kabul",
        "evet onaylıyorum",
        "yes",
        "confirm",
        "ja",
        "oké",
        "oke",
        "tak",
        "potwierdzam",
        "bekræft",
        "bekraft",
        "jeg bekræfter",
        "jeg bekrafter",
        "gerne",
        "bevestig",
        "ik bevestig",
        "potvrzuji",
        "potvrzujem",
        "confirmă",
        "confirma",
        "potvrdzujem",
        "подтверждаю",
        "да",
        "согласен",
        "согласна",
    }
)
_CONFIRM_NO_PHRASES = frozenset(
    {
        "2",
        "hayır",
        "hayir",
        "yok",
        "iptal",
        "vazgeç",
        "vazgec",
        "vazgeçtim",
        "vazgecim",
        "boşver",
        "bosver",
        "gerek yok",
        "olmaz",
        "no",
        "cancel",
        "abbrechen",
        "nein",
        "anuluj",
        "nie",
        "nej",
        "nee",
        "annuller",
        "annuleer",
        "zrušit",
        "zrusit",
        "anulovať",
        "anulovat",
        "нет",
        "отмена",
        "отменить",
    }
)

# Sohbet formu: serbest metin adımlarında «talebi iptal et» vb. (onay özetindeki 2 = iptal ile karışmaması için yalnız «2» hariç).
_FORM_ABORT_EXTRA_EXACT = frozenset(
    {
        "talebi iptal et",
        "talebi iptal",
        "formu iptal et",
        "formu iptal",
        "kaydı iptal et",
        "kaydi iptal et",
        "kaydı iptal",
        "kayit iptal",
        "bildirimi iptal et",
        "bildirimi iptal",
        "misafir bildirimini iptal et",
        "misafir bildirimini iptal",
        "vazgeçiyorum",
        "vazgeciyorum",
        "cancel form",
        "stop form",
        "formular abbrechen",
        "abbrechen bitte",
        "anuluj wniosek",
        "anuluj formularz",
        "annuller anmodningen",
        "annuller anmodning",
        "afbestil formularen",
        "annuleer het formulier",
        "annuleer formulier",
        "zrušit formulář",
        "zrusit formular",
        "anulează formularul",
        "anuleaza formularul",
        "zrušiť formulár",
        "zrusit formular",
        "отменить форму",
        "отмена формы",
    }
)
_FORM_ABORT_SUBSTRINGS = (
    "talebi iptal",
    "formu iptal",
    "kaydı iptal",
    "kayit iptal",
    "bildirimi iptal",
    "misafir bildirimini iptal",
    "arıza iptal",
    "ariza iptal",
    "talep iptal",
    "şikayeti iptal",
    "sikayeti iptal",
    "anuluj form",
    "annuller form",
    "annuleer form",
    "zrus formular",
    "anuleaza formularul",
    "отменить форму",
)

_SESSION_ACK_AFTER_CANCEL = frozenset(
    {
        "tamam",
        "tm",
        "ok",
        "okay",
        "anladım",
        "anladim",
        "peki",
        "tamamdır",
        "tamamdir",
        "sağ ol",
        "sagol",
        "anlaşıldı",
        "anlasildi",
        "eyvallah",
        "teşekkürler",
        "tesekkurler",
        "thanks",
        "thank you",
        "danke",
        "dziękuję",
        "tak skal du have",
        "mange tak",
        "dank je",
        "bedankt",
        "děkuji",
        "dekuji",
        "mulțumesc",
        "multumesc",
        "ďakujem",
        "dakujem",
        "спасибо",
        "благодарю",
    }
)
_SESSION_VAZGECTIM_AFTER_CANCEL = frozenset(
    {
        "vazgeçtim",
        "vazgecim",
        "vazgeçiyorum",
        "vazgeciyorum",
        "boşver",
        "bosver",
        "gerek yok",
        "iptal etmekten vazgeçtim",
        "iptal etmekten vazgecim",
    }
)
_RESERVATION_SHORT_FOLLOWUPS = frozenset(
    {
        "yarın",
        "yarin",
        "yarınki",
        "yarinki",
        "tomorrow",
        "tmrw",
        "morgen",
        "jutro",
        "öbürü",
        "oburu",
        "bu",
        "şu",
        "su",
        "iptal",
        "değiştir",
        "degistir",
    }
)
# Rezervasyon kısa takipten ayrı: yalnızca animasyon programı cevabından sonra «yarın» bağlamı.
_ANIMATION_SCHEDULE_SHORT_FOLLOWUPS = frozenset(
    {
        "yarın",
        "yarin",
        "yarınki",
        "yarinki",
        "tomorrow",
        "tmrw",
        "morgen",
        "jutro",
    }
)
# Follow-up registry (genişletme): followup_kind (conversation_session) + bu ifadeler + _start_form_flow / metin.
# Yeni konu: kind ekle, touch_actionable_followup çağrısını record_turn’da bağla, gerekirse buraya tetikleyici ekle.
_FOLLOWUP_HOW_NORMALIZED_PHRASES = frozenset(
    {
        "tamam nasıl",
        "tamam nasil",
        "peki nasıl",
        "peki nasil",
        "nasıl alırım",
        "nasil alirim",
        "nasıl alirim",
        "nasıl talep ederim",
        "nasil talep ederim",
        "nasıl talep",
        "nasil talep",
        "nasıl yaparım",
        "nasil yaparim",
        "nasıl yapalım",
        "nasil yapalim",
        "how do i get it",
        "how do i get",
        "how can i get",
        "how can i request",
        "wie bekomme ich das",
        "wie bestelle ich",
        "jak zamówić",
        "jak dostać",
        "hvordan bestiller jeg",
        "hvordan får jeg",
        "hoe kan ik bestellen",
        "hoe vraag ik",
        "jak si objednat",
        "jak objednat",
        "cum pot comanda",
        "cum solicit",
        "ako si to objednám",
        "ako si to objednam",
        "ako objednať",
        "ako objednat",
        "как заказать",
        "как получить",
    }
)


def _is_short_how_followup_message(normalized_lower: str) -> bool:
    t = (normalized_lower or "").strip().lower()
    return t in _FOLLOWUP_HOW_NORMALIZED_PHRASES


_CHAT_FORM_LIST_SELECTION_STEPS = frozenset({"category", "detail_enum", "detail_int", "location", "urgency"})

# Liste adımında «hayır» benzeri = genelde «arıza yok»; form iptali sayma.
_CHAT_FORM_LIST_STEP_NO_LIKE = frozenset(
    {
        "hayır",
        "hayir",
        "yok",
        "no",
        "nope",
        "nein",
        "nie",
        "nej",
        "nee",
        "нет",
    }
)


def _user_wants_chat_form_abort_message(normalized: str, *, at_list_selection_step: bool = False) -> bool:
    """Kategori / detay / açıklama / isim / oda adımlarında formu iptal ifadesi (menüde «2» seçimi ile karışmaz)."""
    t = (normalized or "").strip()
    if not t:
        return False
    if t == "2":
        return False
    if t in _CONFIRM_NO_PHRASES:
        # Liste adımında «hayır» / «yok» genelde «arıza yok» anlamı; bağlamlı geri çekilme ayrı işlenir.
        if at_list_selection_step and t in _CHAT_FORM_LIST_STEP_NO_LIKE:
            return False
        return True
    if t in _FORM_ABORT_EXTRA_EXACT:
        return True
    if len(t) <= 48:
        for s in _FORM_ABORT_SUBSTRINGS:
            if s in t:
                return True
    return False


def _user_wants_chat_form_soft_retract(normalized: str) -> bool:
    """Kategori / enum / lokasyon / aciliyet listesinde: sorun yok, yanlış alarm, düzeldi vb."""
    t = (normalized or "").strip()
    if not t:
        return False
    if t in _CHAT_FORM_LIST_STEP_NO_LIKE:
        return True
    retract_markers = (
        "yok değilmiş",
        "yok degilmis",
        "yokmuş",
        "yokmus",
        "bozuk değil",
        "bozuk degil",
        "bozuk değilmiş",
        "bozuk degilmis",
        "sorun yok",
        "arıza yok",
        "ariza yok",
        "yanlışlıkla",
        "yanlislikla",
        "yanlış söyledim",
        "yanlis soyledim",
        "düzeldi",
        "duzeldi",
        "çalışıyormuş",
        "calisiyormus",
        "çalışıyor aslında",
        "calisiyor aslinda",
        "sanırım sorun yok",
        "sanirim sorun yok",
        "aslında bozuk değil",
        "aslinda bozuk degil",
        "sorun yokmuş",
        "sorun yokmus",
        "pardon yanlış",
        "pardon yanlis",
        "not broken",
        "false alarm",
        "works now",
        "kein problem mehr",
        "problem rozwiązany",
        "nie zepsute",
        "det virker alligevel",
        "het werkt weer",
        "werkt nu wel",
        "už to funguje",
        "uz to funguje",
        "funcționează acum",
        "functioneaza acum",
        "už to ide",
        "uz to ide",
        "уже работает",
        "теперь работает",
    )
    if any(p in t for p in retract_markers):
        return True
    if t.startswith("pardon") and len(t) <= 40:
        return True
    return False


def _assistant_excerpt_suggests_animation_schedule(excerpt: str) -> bool:
    low = (excerpt or "").lower()
    return any(
        m in low
        for m in (
            "animasyon",
            "aqua gym",
            "dart",
            "su topu",
            "mini disco",
            "dj ",
            "şov",
            "etkinlik",
            "jammies",
            "kids club",
            "çocuk oyun",
            "radyo",
            "program",
            "acrobat",
            "evening entertainment",
            "animation",
            "daily program",
            "10:00",
            "10:30",
            "14:45",
        )
    )


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
        conversation_session_store: InMemoryConversationSessionStore | None = None,
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
        self.conversation_session_store = conversation_session_store or InMemoryConversationSessionStore(
            ttl_seconds=settings.chat_form_ttl_seconds,
        )

    def _operational_quiet_hours_reception_response(
        self, reply_language: str, ui_language: str, meta_intent: str
    ) -> ChatResponse:
        text = self.localization_service.get("after_hours_reception_redirect", reply_language)
        if not text or text == "after_hours_reception_redirect":
            text = self.localization_service.get("after_hours_reception_redirect", "tr")
        return self.response_service.build(
            "inform",
            text,
            meta_intent,
            1.0,
            reply_language,
            ui_language,
            "rule",
            action=None,
        )

    def _maybe_quiet_hours_strip_operational_actions(
        self, payload: ChatRequest, response: ChatResponse
    ) -> ChatResponse:
        if not operational_quiet_hours_active():
            return response
        act = response.meta.action
        if act is None:
            return response
        if act.kind == "open_complaint_form":
            self.form_store.clear(payload.channel, payload.user_id, payload.session_id)
            return self._operational_quiet_hours_reception_response(
                response.meta.language, response.meta.ui_language, "complaint"
            )
        if act.kind == "chat_form" and act.operation in (
            "request",
            "complaint",
            "fault",
            "guest_notification",
        ):
            self.form_store.clear(payload.channel, payload.user_id, payload.session_id)
            op = act.operation or "request"
            meta_intent = (
                "fault_report"
                if op == "fault"
                else (
                    "complaint"
                    if op == "complaint"
                    else ("guest_notification" if op == "guest_notification" else "request")
                )
            )
            return self._operational_quiet_hours_reception_response(
                response.meta.language, response.meta.ui_language, meta_intent
            )
        if act.kind == "create_guest_request" and act.payload and isinstance(act.payload, dict):
            ptype = str((act.payload or {}).get("type") or "").strip()
            if ptype in ("request", "complaint", "fault", "guest_notification"):
                self.form_store.clear(payload.channel, payload.user_id, payload.session_id)
                meta_map = {
                    "request": "request",
                    "complaint": "complaint",
                    "fault": "fault_report",
                    "guest_notification": "guest_notification",
                }
                return self._operational_quiet_hours_reception_response(
                    response.meta.language,
                    response.meta.ui_language,
                    meta_map.get(ptype, "request"),
                )
        return response

    def _voice_operational_redirect(self, reply_lang: str, ui_language: str):
        """Sesli kanal: form / kayıt yok; yazılı kanala yönlendirme metni."""
        text = VOICE_OPERATIONAL_USE_TEXT.get(
            voice_dict_lang(reply_lang), VOICE_OPERATIONAL_USE_TEXT["tr"]
        )
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

    def _build_confusion_chitchat_response(
        self,
        payload: ChatRequest,
        reply_lang: str,
        ui_language: str,
        source: str,
    ) -> ChatResponse:
        sess = self.conversation_session_store.get(payload.channel, payload.user_id, payload.session_id)
        had_cancel = sess.consume_post_cancel_followup()
        key = (
            "chitchat_confusion_after_form_cancel"
            if had_cancel
            else "chitchat_confusion_generic"
        )
        text = self.localization_service.get(key, reply_lang)
        if not text or text == key:
            text = self.localization_service.get(key, "tr")
        return self.response_service.build(
            "inform",
            text,
            "chitchat",
            1.0,
            reply_lang,
            ui_language,
            source,
        )

    def handle(self, payload: ChatRequest) -> ChatResponse:
        response = self._handle_chat_request(payload)
        response = self._maybe_quiet_hours_strip_operational_actions(payload, response)
        self._conversation_session_record_turn(payload, response)
        return response

    def _conversation_session_record_turn(self, payload: ChatRequest, response: ChatResponse) -> None:
        st = self.conversation_session_store.get(payload.channel, payload.user_id, payload.session_id)
        st.record_turn(
            payload.message or "",
            response.message or "",
            str(response.meta.intent or ""),
        )
        st.sync_from_form(
            None
            if payload.channel == "voice"
            else self.form_store.get(payload.channel, payload.user_id, payload.session_id),
            payload.channel == "voice",
        )
        intent = str(response.meta.intent or "")
        if intent in ("fault_report", "complaint", "request", "guest_notification"):
            st.clear_actionable_followup()
        elif intent == "hotel_info":
            nu = normalize_text(payload.message or "")
            if self.rule_engine.extract_request_category(nu) == "baby_bed" or self.rule_engine.is_baby_equipment_intent(
                nu
            ):
                st.touch_actionable_followup(
                    "baby_equipment_how",
                    ttl_seconds=300,
                    request_category="baby_bed",
                )
            else:
                st.clear_actionable_followup()
        else:
            st.clear_actionable_followup()

    def _session_try_early_reply(
        self,
        payload: ChatRequest,
        normalized: str,
        reply_base: str,
        ui_language: str,
    ) -> ChatResponse | None:
        if payload.channel == "voice":
            return None
        form_early = self.form_store.get(payload.channel, payload.user_id, payload.session_id)
        sess = self.conversation_session_store.get(payload.channel, payload.user_id, payload.session_id)
        sess.sync_from_form(form_early, False)
        nl = (normalized or "").strip().lower()
        if not nl:
            return None
        # Rezervasyon kısa takibinden önce: son tur animasyon programıysa «yarın» vb. bağlamı koru.
        if (
            form_early is None
            and nl in _ANIMATION_SCHEDULE_SHORT_FOLLOWUPS
            and sess.turns
            and _assistant_excerpt_suggests_animation_schedule(sess.turns[-1].assistant_excerpt)
        ):
            text = self.localization_service.get("session_animation_schedule_followup", reply_base)
            if not text or text == "session_animation_schedule_followup":
                text = self.localization_service.get("session_animation_schedule_followup", "tr")
            return self.response_service.build(
                "inform",
                text,
                "hotel_info",
                1.0,
                reply_base,
                ui_language,
                "rule",
            )
        if form_early is None and sess.reservation_followup_alive() and nl in _RESERVATION_SHORT_FOLLOWUPS:
            text = self.localization_service.get("session_reservation_followup_short", reply_base)
            if not text or text == "session_reservation_followup_short":
                text = self.localization_service.get("session_reservation_followup_short", "tr")
            return self.response_service.build(
                "inform",
                text,
                "reservation",
                1.0,
                reply_base,
                ui_language,
                "rule",
                action=None,
            )
        if (
            form_early is None
            and sess.actionable_followup_alive()
            and _is_short_how_followup_message(nl)
            and sess.followup_kind == "baby_equipment_how"
        ):
            cat = sess.followup_request_category or "baby_bed"
            sess.clear_actionable_followup()
            return self._start_form_flow(
                payload=payload,
                intent="request",
                reply_language=reply_base,
                ui_language=ui_language,
                initial_request_category=cat,
            )
        if form_early is not None:
            return None
        if nl in _SESSION_ACK_AFTER_CANCEL and sess.last_notable_event == "form_cancelled":
            sess.clear_misleading_cancel_context()
            text = self.localization_service.get("session_ack_after_cancel", reply_base)
            if not text or text == "session_ack_after_cancel":
                text = self.localization_service.get("session_ack_after_cancel", "tr")
            return self.response_service.build(
                "inform",
                text,
                "chitchat",
                1.0,
                reply_base,
                ui_language,
                "rule",
            )
        if nl in _SESSION_VAZGECTIM_AFTER_CANCEL and sess.last_notable_event == "form_cancelled":
            sess.clear_misleading_cancel_context()
            text = self.localization_service.get("session_vazgectim_after_cancel", reply_base)
            if not text or text == "session_vazgectim_after_cancel":
                text = self.localization_service.get("session_vazgectim_after_cancel", "tr")
            return self.response_service.build(
                "inform",
                text,
                "chitchat",
                1.0,
                reply_base,
                ui_language,
                "rule",
            )
        return None

    def _session_try_followup_how_reply(
        self,
        payload: ChatRequest,
        normalized: str,
        reply_base: str,
        ui_language: str,
    ) -> ChatResponse | None:
        """Düşük güven / kısa mesaj dalında: erken yanıt atlanmışsa bile «tamam nasıl» + followup → form."""
        if payload.channel == "voice":
            return None
        form_early = self.form_store.get(payload.channel, payload.user_id, payload.session_id)
        if form_early is not None:
            return None
        sess = self.conversation_session_store.get(payload.channel, payload.user_id, payload.session_id)
        sess.sync_from_form(form_early, False)
        nl = (normalized or "").strip().lower()
        if (
            sess.actionable_followup_alive()
            and _is_short_how_followup_message(nl)
            and sess.followup_kind == "baby_equipment_how"
        ):
            cat = sess.followup_request_category or "baby_bed"
            sess.clear_actionable_followup()
            return self._start_form_flow(
                payload=payload,
                intent="request",
                reply_language=reply_base,
                ui_language=ui_language,
                initial_request_category=cat,
            )
        return None

    def _touch_reservation_context(self, payload: ChatRequest) -> None:
        if payload.channel == "voice":
            return
        self.conversation_session_store.get(
            payload.channel, payload.user_id, payload.session_id
        ).touch_reservation_module_hint()

    def _session_on_form_abandoned_clear_cancel_context(self, payload: ChatRequest) -> None:
        """Form konu değişimi / sıfırlama ile silindiğinde eski iptal bağlamı kısa cevaplara yansımasın."""
        if payload.channel == "voice":
            return
        self.conversation_session_store.get(
            payload.channel, payload.user_id, payload.session_id
        ).clear_misleading_cancel_context()

    def _handle_chat_request(self, payload: ChatRequest) -> ChatResponse:
        decision_path: list[str] = ["request_context", "normalization", "language_context"]
        openai_path_used = False
        vector_store_used = False
        normalized = normalize_text(payload.message)
        ui_language = _orch_reply_lang(payload.ui_language or "tr")
        conv = _valid_conversation_language(payload.conversation_language)
        # Primary reply language must follow selected session/app language.
        # Message-level detection is only a backup when selected language is absent.
        selected_lang = conv or ui_language
        msg_detect = self.language_service.detect(normalized, fallback=selected_lang or "tr")
        msg_detect = self.language_service.coerce_reply_language(normalized, msg_detect, selected_lang)
        if self.settings.allow_implicit_language_drift:
            reply_base = msg_detect
        else:
            reply_base = selected_lang if selected_lang in CHATBOT_UI_LANG_SET else msg_detect
        reply_base = _orch_reply_lang(reply_base)

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

        early_sess = self._session_try_early_reply(payload, normalized, reply_base, ui_language)
        if early_sess is not None:
            return early_sess

        # Rezervasyon anahtar kelimesi — uygulama modülü yok; spa / à la carte / premium / genel resepsiyon ayrımı.
        norm_lower = normalized.lower()
        if any(
            key in norm_lower
            for key in (
                "rezervasyon",
                "rezrvasyon",
                "reservation",
                "reservierung",
                "rezerwacja",
                "rezerwować",
                "booking",
                "randevu",
                "a la carte rezervasyon",
                "alacarte rezervasyon",
                "a la carte reservation",
            )
        ):
            if payload.channel == "voice":
                if RuleEngine.is_spa_reservation_handoff(normalized):
                    vtext = VOICE_SPA_BOOKING_HINT.get(
                        voice_dict_lang(reply_base), VOICE_SPA_BOOKING_HINT["tr"]
                    )
                elif RuleEngine.is_ala_carte_reservation_handoff(normalized):
                    vtext = VOICE_ALACARTE_RESERVATION_HINT.get(
                        voice_dict_lang(reply_base), VOICE_ALACARTE_RESERVATION_HINT["tr"]
                    )
                else:
                    vtext = VOICE_RECEPTION_RESERVATION_HINT.get(
                        voice_dict_lang(reply_base), VOICE_RECEPTION_RESERVATION_HINT["tr"]
                    )
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
            self._touch_reservation_context(payload)
            if RuleEngine.is_spa_reservation_handoff(normalized):
                text = self.response_composer.compose(
                    "request", "spa_contact_request", "spa_contact", reply_base
                )
                return self.response_service.build(
                    "inform",
                    text,
                    "request",
                    1.0,
                    reply_base,
                    ui_language,
                    "rule",
                    action=None,
                )
            if RuleEngine.is_ala_carte_reservation_handoff(normalized):
                text = self.response_composer.compose(
                    "request", "guest_relations_contact_request", "ala_carte_reservation", reply_base
                )
                act = self._action_for_intent(
                    "request", "guest_relations_contact_request", "ala_carte_reservation"
                )
                return self.response_service.build(
                    "redirect",
                    text,
                    "request",
                    1.0,
                    reply_base,
                    ui_language,
                    "rule",
                    action=act,
                )
            if RuleEngine.is_premium_reservation_reception_handoff(normalized):
                text = self.response_composer.compose(
                    "request", "reception_contact_request", "premium_table_reservation", reply_base
                )
                act = self._action_for_intent(
                    "request", "reception_contact_request", "premium_table_reservation"
                )
                return self.response_service.build(
                    "redirect",
                    text,
                    "request",
                    1.0,
                    reply_base,
                    ui_language,
                    "rule",
                    action=act,
                )
            text = self.response_composer.compose(
                "reservation",
                self._guess_reservation_sub_intent(payload.message),
                None,
                reply_base,
            )
            return self.response_service.build(
                "inform",
                text,
                "reservation",
                1.0,
                reply_base,
                ui_language,
                "rule",
                action=None,
            )

        # If there is an ongoing chat form flow for this user/channel, continue it first.
        # Sesli kanal ayrı anahtar (voice); yazılı form yarım kalsa bile sesli turda devam ettirilmez.
        form_state = (
            None
            if payload.channel == "voice"
            else self.form_store.get(payload.channel, payload.user_id, payload.session_id)
        )
        if form_state is not None:
            # Form adımlarında oda no / rakam / kısa onay metni dil tespitinde «tr»ye kaymasın;
            # ayrıca eski conversation_language kilidi UI dilinden (pl vb.) farklı olsa bile form dili korunsun.
            reply_base = _orch_reply_lang(form_state.language)
            ui_language = _orch_reply_lang(form_state.ui_language)
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
                and rule_intent.entity in CHATBOT_UI_LANG_SET
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
            # Operasyonel niyetler — sohbette yalnızca: istek, arıza, misafir bildirimi (şikayet → modül).
            if rule_intent.intent in ("request", "fault_report", "guest_notification"):
                if payload.channel == "voice":
                    exempt_voice = rule_intent.intent == "request" and (
                        _request_rule_uses_reception_redirect_not_chat_form(
                            rule_intent.sub_intent, rule_intent.entity
                        )
                        or (rule_intent.sub_intent or "") == "spa_contact_request"
                    )
                    if not exempt_voice:
                        decision_path.append("voice_info_layer_operational")
                        return self._voice_operational_redirect(reply_lang, ui_language)
                if rule_intent.intent == "request" and rule_intent.sub_intent == "spa_contact_request":
                    decision_path.append("compose_spa_booking_inform")
                    text = self.response_composer.compose(
                        "request",
                        rule_intent.sub_intent,
                        rule_intent.entity,
                        reply_lang,
                    )
                    return self.response_service.build(
                        "inform",
                        text,
                        "request",
                        rule_intent.confidence,
                        reply_lang,
                        ui_language,
                        "rule",
                        action=None,
                    )
                if rule_intent.intent == "request" and _request_rule_uses_reception_redirect_not_chat_form(
                    rule_intent.sub_intent, rule_intent.entity
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

            if rule_intent.intent == "chitchat" and effective_sub_intent == "confusion":
                decision_path.append("chitchat_confusion_followup")
                response = self._build_confusion_chitchat_response(
                    payload, reply_lang, ui_language, rule_intent.source or "rule"
                )
            else:
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
                if rule_intent.intent == "reservation" and _is_early_checkin_reception_handoff(
                    normalized, rule_intent.sub_intent, rule_intent.entity
                ):
                    text = _EARLY_CHECKIN_RECEPTION_TEXT.get(
                        _tpl_lang(reply_lang), _EARLY_CHECKIN_RECEPTION_TEXT["tr"]
                    )
                    response = self.response_service.build(
                        "inform",
                        text,
                        "reservation",
                        rule_intent.confidence,
                        reply_lang,
                        ui_language,
                        "rule",
                        action=None,
                    )
                else:
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
            if rule_intent.intent in ("hotel_info", "recommendation"):
                self._session_on_form_abandoned_clear_cancel_context(payload)
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
                if RuleEngine.is_confusion_followup_social(normalized):
                    decision_path.append("low_confidence_confusion_followup")
                    resp = self._build_confusion_chitchat_response(
                        payload, reply_base, ui_language, "fallback"
                    )
                else:
                    ff = self._session_try_followup_how_reply(payload, normalized, reply_base, ui_language)
                    if ff is not None:
                        decision_path.append("low_confidence_followup_how")
                        resp = ff
                    else:
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

        _sup_ent = extract_room_supply_request_entity(normalized)
        if (
            llm_intent.intent == "guest_notification"
            and RuleEngine.is_strong_service_item_request(normalized)
            and (
                RuleEngine.is_baby_equipment_intent(normalized)
                or _sup_ent is not None
            )
        ):
            _sub = (
                RuleEngine.sub_intent_for_room_request_entity(_sup_ent)
                if _sup_ent
                else "room_supply_request"
            )
            llm_intent = IntentResult(
                intent="request",
                sub_intent=_sub,
                entity=_sup_ent,
                department="reception",
                reason="operational_supply_not_guest_notif",
                needs_rag=False,
                response_mode="guided",
                confidence=max(llm_intent.confidence, 0.95),
                source="rule",
            )

        # LLM: sohbet formu yalnız istek / arıza / misafir bildirimi (şikayet ayrı modül).
        if llm_intent.intent in ("request", "fault_report", "guest_notification"):
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
        if llm_intent.intent == "reservation" and _is_early_checkin_reception_handoff(
            normalized, llm_intent.sub_intent, llm_intent.entity
        ):
            text = _EARLY_CHECKIN_RECEPTION_TEXT.get(
                _tpl_lang(reply_base), _EARLY_CHECKIN_RECEPTION_TEXT["tr"]
            )
            response = self.response_service.build(
                "inform",
                text,
                "reservation",
                llm_intent.confidence,
                reply_base,
                ui_language,
                llm_intent.source or "rule",
                action=None,
            )
        else:
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
        if llm_intent.intent in ("hotel_info", "recommendation"):
            self._session_on_form_abandoned_clear_cancel_context(payload)
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
            if (sub_intent or "") == "lost_property_complaint":
                text = self.localization_service.get("complaint_lost_property", reply_language)
            elif (sub_intent or "") == "service_complaint":
                text = _COMPLAINT_GUIDANCE_TEXT_GENERIC.get(
                    _tpl_lang(reply_language), _COMPLAINT_GUIDANCE_TEXT_GENERIC["tr"]
                )
            else:
                text = _COMPLAINT_GUIDANCE_TEXT.get(
                    _tpl_lang(reply_language), _COMPLAINT_GUIDANCE_TEXT["tr"]
                )
            return self.response_service.build(
                "inform",
                text,
                intent,
                confidence,
                reply_language,
                ui_language,
                source or "rule",
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
            guessed_sub = sub_intent or self._guess_reservation_sub_intent(message)
            text = self.response_composer.compose(
                intent,
                guessed_sub,
                entity,
                reply_language,
            )
            return self.response_service.build(
                "inform",
                text,
                intent,
                1.0,
                reply_language,
                ui_language,
                source or "rule",
                action=None,
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
                    _tpl_lang(reply_language), _LATE_CHECKOUT_GUEST_NOTIF_REDIRECT_TEXT["tr"]
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
            if fixed_entity_key == "wayfinding_location_rag":
                logger.info("hotel_info_path wayfinding_rag entity=wayfinding_location_rag")
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
                miss_text = self.localization_service.get(
                    "wayfinding_rag_miss_guest_relations", reply_language
                )
                return self.response_service.build(
                    "answer",
                    miss_text,
                    intent,
                    confidence,
                    reply_language,
                    ui_language,
                    "rule",
                    action={"kind": "open_where_module"},
                )
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
            if fixed_entity_key == "fixed_spa_info":
                fixed_text = self.localization_service.get(fixed_entity_key, reply_language)
                return self.response_service.build(
                    "answer",
                    fixed_text,
                    intent,
                    confidence,
                    reply_language,
                    ui_language,
                    "rule",
                    action={"kind": "open_spa_module"},
                )
            if fixed_entity_key == "fixed_spa_prices_module_hint":
                fixed_text = self.localization_service.get(fixed_entity_key, reply_language)
                return self.response_service.build(
                    "answer",
                    fixed_text,
                    intent,
                    confidence,
                    reply_language,
                    ui_language,
                    "rule",
                    action={"kind": "open_spa_module"},
                )
            if fixed_entity_key == "fixed_restaurants_bars_module_hint":
                fixed_text = self.localization_service.get(fixed_entity_key, reply_language)
                return self.response_service.build(
                    "answer",
                    fixed_text,
                    intent,
                    confidence,
                    reply_language,
                    ui_language,
                    "rule",
                    action={"kind": "open_restaurants_bars_module"},
                )
            if fixed_entity_key == "fixed_transfer_module_hint":
                fixed_text = self.localization_service.get(fixed_entity_key, reply_language)
                return self.response_service.build(
                    "answer",
                    fixed_text,
                    intent,
                    confidence,
                    reply_language,
                    ui_language,
                    "rule",
                    action={"kind": "open_transfer_module"},
                )
            if fixed_entity_key in (
                "fixed_restaurant_info",
                "fixed_ice_cream_info",
                "fixed_laundry_dry_cleaning_info",
                "fixed_pool_beach_info",
                "fixed_animation_info",
                "fixed_outside_hotel_info",
                "fixed_kuafor_info",
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
                strong_rq = self.rule_engine.is_strong_service_item_request(nm)
                # Tek kelime / zayıf niyet → bilgi (RAG); havlu ayrımı + diğer oda tedarikleri için talep formu ipucu.
                suffix = ""
                if rq_soft in ("towel", "towel_extra", "room_towel") and not strong_rq:
                    s = self.localization_service.get(
                        "hotel_info_soft_followup_towel", reply_language
                    ).strip()
                    if s and s != "hotel_info_soft_followup_towel":
                        suffix = s
                elif rq_soft and rq_soft in REQUEST_CATEGORIES and not strong_rq:
                    s = self.localization_service.get(
                        "hotel_info_soft_followup_request_form_hint", reply_language
                    ).strip()
                    if s and s != "hotel_info_soft_followup_request_form_hint":
                        suffix = s
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
            if _tpl_lang(reply_language) == "en":
                msg = "Where is the fault located?\n" + "\n".join(lines)
            elif _tpl_lang(reply_language) == "de":
                msg = "Wo befindet sich die Störung?\n" + "\n".join(lines)
            elif _tpl_lang(reply_language) == "pl":
                msg = "Gdzie znajduje się awaria?\n" + "\n".join(lines)
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
                if _tpl_lang(reply_language) == "en":
                    msg = f"Please choose an option for {fld_label}:\n" + "\n".join(lines)
                elif _tpl_lang(reply_language) == "de":
                    msg = f"Bitte wählen Sie eine Option für {fld_label}:\n" + "\n".join(lines)
                elif _tpl_lang(reply_language) == "pl":
                    msg = f"Proszę wybrać opcję dla {fld_label}:\n" + "\n".join(lines)
                else:
                    msg = f"Lütfen {fld_label} için bir seçim yapınız:\n" + "\n".join(lines)
            else:
                msg = _localized_request_detail_int_prompt(
                    chosen_category, next_field, reply_language, positive_only_invalid=False
                )
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

        # Kettle / minibar dolum vb.: kullanıcı türü ilk mesajda söylediyse tekrar «neye ihtiyaç» sorma.
        first_turn = (state.initial_message or payload.message or "").strip()
        if (
            state.operation == "request"
            and _request_category_prefills_description_from_first_message(chosen_category)
            and _initial_message_substantive_for_request_prefill(first_turn)
        ):
            state.step = "full_name"
            state.description = first_turn
            self.form_store.upsert(payload.channel, payload.user_id, payload.session_id, state)
            msg = _localized_full_name_prompt_request_prefill(chosen_category, reply_language)
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

        state.step = "description"
        self.form_store.upsert(payload.channel, payload.user_id, payload.session_id, state)
        if state.operation == "guest_notification":
            msg = _guest_notification_description_lead(chosen_category, reply_language)
        elif state.operation == "request":
            msg = _request_description_lead(chosen_category, reply_language)
        elif _tpl_lang(reply_language) == "en":
            msg = "Please briefly describe your request/issue."
        elif _tpl_lang(reply_language) == "de":
            msg = "Bitte beschreiben Sie Ihr Anliegen kurz."
        elif _tpl_lang(reply_language) == "pl":
            msg = "Proszę krótko opisać prośbę lub problem."
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

        if operational_quiet_hours_active():
            # Geç çıkış → Misafir bildirimleri sekmesi (resepsiyon grubu): form akışı açık kalmalı.
            if not (op == "guest_notification" and notif_group == "reception"):
                intent_meta = (
                    "fault_report"
                    if op == "fault"
                    else (
                        "complaint"
                        if op == "complaint"
                        else ("guest_notification" if op == "guest_notification" else "request")
                    )
                )
                return self._operational_quiet_hours_reception_response(
                    reply_language, ui_language, intent_meta
                )

        if op == "guest_notification" and notif_group == "reception":
            text = _LATE_CHECKOUT_GUEST_NOTIF_REDIRECT_TEXT.get(
                _tpl_lang(reply_language), _LATE_CHECKOUT_GUEST_NOTIF_REDIRECT_TEXT["tr"]
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
        elif op == "request":
            prompt = _request_chat_category_prompt(reply_language)
            meta_intent = "request"
        else:
            if op == "fault":
                categories = FAULT_CATEGORIES
            else:
                categories = COMPLAINT_CATEGORIES

            options: list[str] = []
            for idx, cat in enumerate(categories, start=1):
                cat_intent = "fault" if op == "fault" else "complaint"
                label = category_label(cat_intent, cat, reply_language)
                options.append(f"{idx}. {label}")

            lead = self.localization_service.get("chat_form_category_prompt_lead", reply_language)
            prompt = lead + "\n" + "\n".join(options)
            meta_intent = "fault_report" if op == "fault" else "complaint"

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

    def _localized_chat_form_cancel_ack(self, operation: str | None, reply_language: str) -> str:
        op = operation or "request"
        key = {
            "fault": "chat_form_cancel_ack_fault",
            "request": "chat_form_cancel_ack_request",
            "complaint": "chat_form_cancel_ack_complaint",
            "guest_notification": "chat_form_cancel_ack_guest_notification",
        }.get(op, "chat_form_cancel_ack_request")
        return self.localization_service.get(key, reply_language)

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

        if text and _user_wants_chat_form_abort_message(
            normalized,
            at_list_selection_step=state.step in _CHAT_FORM_LIST_SELECTION_STEPS,
        ):
            self.form_store.clear(payload.channel, payload.user_id, payload.session_id)
            self.conversation_session_store.get(
                payload.channel, payload.user_id, payload.session_id
            ).mark_form_cancelled(state.operation or "")
            msg = self._localized_chat_form_cancel_ack(state.operation, reply_language)
            return self.response_service.build(
                "inform",
                msg,
                intent,
                1.0,
                reply_language,
                ui_language,
                "rule",
            )

        if text and state.step in _CHAT_FORM_LIST_SELECTION_STEPS and _user_wants_chat_form_soft_retract(
            normalized
        ):
            self.form_store.clear(payload.channel, payload.user_id, payload.session_id)
            self.conversation_session_store.get(
                payload.channel, payload.user_id, payload.session_id
            ).mark_form_cancelled(state.operation or "")
            msg = self.localization_service.get("chat_form_context_retract_ack", reply_language)
            return self.response_service.build(
                "inform",
                msg,
                intent,
                1.0,
                reply_language,
                ui_language,
                "rule",
            )

        if operational_quiet_hours_active():
            self.form_store.clear(payload.channel, payload.user_id, payload.session_id)
            self._session_on_form_abandoned_clear_cancel_context(payload)
            return self._operational_quiet_hours_reception_response(
                reply_language, ui_language, intent
            )

        # Bağlamsal güncelleme: kategori veya talep detay listesinde / adet sorulurken geçerli numara girilmediyse
        # başka soruya veya bilgiye geçilebilir. Geçerli seçim yapıldıktan sonra (açıklama, isim, oda, onay vb.)
        # form kilitli kalır; yanlış yanıtta aynı soru tekrar sorulur.
        _skip_topic_switch = state.step != "category" and _request_choice_text_matches_current_step(
            state, text, reply_language
        )
        if text and state.step in _FORM_TOPIC_SWITCH_STEPS and not _skip_topic_switch:
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
                            self._session_on_form_abandoned_clear_cancel_context(payload)
                            return self._start_form_flow(
                                payload=payload,
                                intent="guest_notification",
                                reply_language=reply_language,
                                ui_language=ui_language,
                                notif_group=ng_new,
                                initial_request_category=None,
                            )
                if re_intent.intent == "hotel_info" and state.operation in (
                    "request",
                    "fault",
                    "guest_notification",
                ):
                    # İstek formu kategori adımında «bornoz» vb. kuralda hotel_info (soft) düşer;
                    # bağlamda talep türü seçimi say — formu bozma.
                    if (
                        state.operation == "request"
                        and state.step == "category"
                        and _request_resolve_category_at_form_step(normalized)
                    ):
                        pass
                    else:
                        self.form_store.clear(payload.channel, payload.user_id, payload.session_id)
                        self._session_on_form_abandoned_clear_cancel_context(payload)
                        return self.handle(payload)
                if re_intent.intent == "recommendation":
                    self.form_store.clear(payload.channel, payload.user_id, payload.session_id)
                    self._session_on_form_abandoned_clear_cancel_context(payload)
                    return self.handle(payload)
                if state.operation == "request" and re_intent.intent == "request":
                    new_cat = extract_request_category_from_text(normalized)
                    cur = (state.category or "").strip()
                    if new_cat and new_cat != cur:
                        self.form_store.clear(payload.channel, payload.user_id, payload.session_id)
                        self._session_on_form_abandoned_clear_cancel_context(payload)
                        return self.handle(payload)
                if (
                    re_intent.intent in ("request", "fault_report", "guest_notification", "complaint", "reservation")
                    and re_intent.intent != intent
                ):
                    # Farklı operasyonel intent: mevcut formu bırak; şikayet/rezervasyon → modül yönlendirmesi.
                    self.form_store.clear(payload.channel, payload.user_id, payload.session_id)
                    self._session_on_form_abandoned_clear_cancel_context(payload)
                    if re_intent.intent == "complaint":
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
                    if re_intent.intent == "reservation":
                        if _is_early_checkin_reception_handoff(
                            normalized, re_intent.sub_intent, re_intent.entity
                        ):
                            self.form_store.clear(payload.channel, payload.user_id, payload.session_id)
                            self._session_on_form_abandoned_clear_cancel_context(payload)
                            text = _EARLY_CHECKIN_RECEPTION_TEXT.get(
                                _tpl_lang(reply_language), _EARLY_CHECKIN_RECEPTION_TEXT["tr"]
                            )
                            return self.response_service.build(
                                "inform",
                                text,
                                "reservation",
                                re_intent.confidence,
                                reply_language,
                                ui_language,
                                "rule",
                                action=None,
                            )
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
                    if (
                        re_intent.intent == "request"
                        and _request_rule_uses_reception_redirect_not_chat_form(
                            re_intent.sub_intent, re_intent.entity
                        )
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
                    self._session_on_form_abandoned_clear_cancel_context(payload)
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
                return _request_chat_category_prompt(reply_language)
            if op == "fault":
                categories = FAULT_CATEGORIES
            else:
                categories = COMPLAINT_CATEGORIES
            lines: list[str] = []
            for idx, cat in enumerate(categories, start=1):
                cat_intent = "fault" if op == "fault" else "complaint"
                lbl = category_label(cat_intent, cat, reply_language)
                lines.append(f"{idx}. {lbl}")
            lead = self.localization_service.get("chat_form_category_prompt_lead", reply_language)
            return lead + "\n" + "\n".join(lines)

        # Yardımcı: geçerli kategori listesini verir.
        def _current_categories(op: OperationType):
            if op == "guest_notification":
                return guest_notification_categories_for_group(state.notif_group)
            if op == "request":
                return list(request_categories_for_chat_ui())
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
            if not chosen_category and state.operation == "request":
                guessed = _request_resolve_category_at_form_step(normalized)
                if guessed:
                    chosen_category = guessed
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
                if state.operation == "request":
                    msg = _request_description_lead(category, reply_language)
                elif _tpl_lang(reply_language) == "en":
                    msg = "Please briefly describe your request/issue."
                elif _tpl_lang(reply_language) == "de":
                    msg = "Bitte beschreiben Sie Ihr Anliegen kurz."
                elif _tpl_lang(reply_language) == "pl":
                    msg = "Proszę krótko opisać prośbę lub problem."
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
                if _tpl_lang(reply_language) == "en":
                    msg = f"Please choose an option for {fld_label}:\n" + "\n".join(lines)
                elif _tpl_lang(reply_language) == "de":
                    msg = f"Bitte wählen Sie eine Option für {fld_label}:\n" + "\n".join(lines)
                elif _tpl_lang(reply_language) == "pl":
                    msg = f"Proszę wybrać opcję dla pola {fld_label}:\n" + "\n".join(lines)
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
                if _tpl_lang(reply_language) == "en":
                    msg = f"Please choose a valid option for {fld_label}:\n" + "\n".join(lines)
                elif _tpl_lang(reply_language) == "de":
                    msg = f"Bitte wählen Sie eine gültige Option für {fld_label}:\n" + "\n".join(lines)
                elif _tpl_lang(reply_language) == "pl":
                    msg = f"Proszę wybrać dozwoloną opcję dla pola {fld_label}:\n" + "\n".join(lines)
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
                    if _tpl_lang(reply_language) == "en":
                        msg = f"Please choose an option for {fld_label}:\n" + "\n".join(lines)
                    elif _tpl_lang(reply_language) == "de":
                        msg = f"Bitte wählen Sie eine Option für {fld_label}:\n" + "\n".join(lines)
                    elif _tpl_lang(reply_language) == "pl":
                        msg = f"Proszę wybrać opcję dla pola {fld_label}:\n" + "\n".join(lines)
                    else:
                        msg = f"Lütfen {fld_label} için bir seçim yapınız:\n" + "\n".join(lines)
                else:
                    msg = _localized_request_detail_int_prompt(
                        state.category or "",
                        next_field,
                        reply_language,
                        positive_only_invalid=False,
                    )
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
                if _tpl_lang(reply_language) == "en":
                    msg = "Where is the fault located?\n" + "\n".join(lines)
                elif _tpl_lang(reply_language) == "de":
                    msg = "Wo befindet sich die Störung?\n" + "\n".join(lines)
                elif _tpl_lang(reply_language) == "pl":
                    msg = "Gdzie znajduje się awaria?\n" + "\n".join(lines)
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
            if _tpl_lang(reply_language) == "en":
                msg = "Please briefly describe your request/issue."
            elif _tpl_lang(reply_language) == "de":
                msg = "Bitte beschreiben Sie Ihr Anliegen kurz."
            elif _tpl_lang(reply_language) == "pl":
                msg = "Proszę krótko opisać prośbę lub problem."
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
            cat_for_prompt = state.category or ""
            if not text:
                msg = _localized_request_detail_int_prompt(
                    cat_for_prompt, field_name, reply_language, positive_only_invalid=False
                )
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
                msg = _localized_request_detail_int_prompt(
                    cat_for_prompt, field_name, reply_language, positive_only_invalid=True
                )
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
                    if _tpl_lang(reply_language) == "en":
                        msg = f"Please choose an option for {fld_label}:\n" + "\n".join(lines)
                    elif _tpl_lang(reply_language) == "de":
                        msg = f"Bitte wählen Sie eine Option für {fld_label}:\n" + "\n".join(lines)
                    elif _tpl_lang(reply_language) == "pl":
                        msg = f"Proszę wybrać opcję dla pola {fld_label}:\n" + "\n".join(lines)
                    else:
                        msg = f"Lütfen {fld_label} için bir seçim yapınız:\n" + "\n".join(lines)
                else:
                    msg = _localized_request_detail_int_prompt(
                        state.category or "",
                        next_field,
                        reply_language,
                        positive_only_invalid=False,
                    )
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
                if _tpl_lang(reply_language) == "en":
                    msg = "Where is the fault located?\n" + "\n".join(lines)
                elif _tpl_lang(reply_language) == "de":
                    msg = "Wo befindet sich die Störung?\n" + "\n".join(lines)
                elif _tpl_lang(reply_language) == "pl":
                    msg = "Gdzie znajduje się awaria?\n" + "\n".join(lines)
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
            if _tpl_lang(reply_language) == "en":
                msg = "Please briefly describe your request/issue."
            elif _tpl_lang(reply_language) == "de":
                msg = "Bitte beschreiben Sie Ihr Anliegen kurz."
            elif _tpl_lang(reply_language) == "pl":
                msg = "Proszę krótko opisać prośbę lub problem."
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
                if _tpl_lang(reply_language) == "en":
                    msg = "Please briefly describe your request/issue."
                elif _tpl_lang(reply_language) == "de":
                    msg = "Bitte beschreiben Sie Ihr Anliegen kurz."
                elif _tpl_lang(reply_language) == "pl":
                    msg = "Proszę krótko opisać prośbę lub problem."
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
                if _tpl_lang(reply_language) == "en":
                    msg = "Where is the fault located?\n" + "\n".join(lines)
                elif _tpl_lang(reply_language) == "de":
                    msg = "Wo befindet sich die Störung?\n" + "\n".join(lines)
                elif _tpl_lang(reply_language) == "pl":
                    msg = "Gdzie znajduje się awaria?\n" + "\n".join(lines)
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
                if _tpl_lang(reply_language) == "en":
                    msg = "Please choose a valid location:\n" + "\n".join(lines)
                elif _tpl_lang(reply_language) == "de":
                    msg = "Bitte wählen Sie einen gültigen Ort:\n" + "\n".join(lines)
                elif _tpl_lang(reply_language) == "pl":
                    msg = "Proszę wybrać dozwoloną lokalizację:\n" + "\n".join(lines)
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
            if _tpl_lang(reply_language) == "en":
                msg = "How urgent is the fault?\n" + "\n".join(lines)
            elif _tpl_lang(reply_language) == "de":
                msg = "Wie dringend ist die Störung?\n" + "\n".join(lines)
            elif _tpl_lang(reply_language) == "pl":
                msg = "Jak pilna jest ta awaria?\n" + "\n".join(lines)
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
                if _tpl_lang(reply_language) == "en":
                    msg = "Please briefly describe your request/issue."
                elif _tpl_lang(reply_language) == "de":
                    msg = "Bitte beschreiben Sie Ihr Anliegen kurz."
                elif _tpl_lang(reply_language) == "pl":
                    msg = "Proszę krótko opisać prośbę lub problem."
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
                if _tpl_lang(reply_language) == "en":
                    msg = "How urgent is the fault?\n" + "\n".join(lines)
                elif _tpl_lang(reply_language) == "de":
                    msg = "Wie dringend ist die Störung?\n" + "\n".join(lines)
                elif _tpl_lang(reply_language) == "pl":
                    msg = "Jak pilna jest ta awaria?\n" + "\n".join(lines)
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
                if _tpl_lang(reply_language) == "en":
                    msg = "Please choose a valid urgency:\n" + "\n".join(lines)
                elif _tpl_lang(reply_language) == "de":
                    msg = "Bitte wählen Sie eine gültige Dringlichkeit:\n" + "\n".join(lines)
                elif _tpl_lang(reply_language) == "pl":
                    msg = "Proszę wybrać dozwoloną pilność:\n" + "\n".join(lines)
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
            if _tpl_lang(reply_language) == "en":
                msg = "Please briefly describe your request/issue."
            elif _tpl_lang(reply_language) == "de":
                msg = "Bitte beschreiben Sie Ihr Anliegen kurz."
            elif _tpl_lang(reply_language) == "pl":
                msg = "Proszę krótko opisać prośbę lub problem."
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
                    msg = _localized_full_name_prompt_guest_notif_skip_description(cat, reply_language)
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
                elif _tpl_lang(reply_language) == "en":
                    msg = "Please write a short description so I can help you."
                elif _tpl_lang(reply_language) == "de":
                    msg = "Bitte schreiben Sie eine kurze Beschreibung, damit ich Ihnen helfen kann."
                elif _tpl_lang(reply_language) == "pl":
                    msg = "Proszę napisać krótki opis, abym mogła pomóc."
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
            msg = _localized_full_name_prompt_after_description_step(state.operation, cat, reply_language)
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
            if not text or is_full_name_input_effectively_empty(text):
                if _tpl_lang(reply_language) == "en":
                    msg = "Please write your full name."
                elif _tpl_lang(reply_language) == "de":
                    msg = "Bitte schreiben Sie Ihren vollständigen Namen."
                elif _tpl_lang(reply_language) == "pl":
                    msg = "Proszę napisać imię i nazwisko."
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
            if is_chat_form_full_name_help_request(text):
                if _tpl_lang(reply_language) == "en":
                    msg = (
                        "Please type your first and last name as shown on your ID or passport "
                        "(letters, spaces, hyphens and apostrophes are fine). "
                        "Do not use digits in this field—I will ask for your room number in the next step."
                    )
                elif _tpl_lang(reply_language) == "de":
                    msg = (
                        "Bitte geben Sie Vor- und Nachnamen wie im Ausweis/Reisepass ein "
                        "(Buchstaben, Leerzeichen, Bindestriche und Apostrophe sind in Ordnung). "
                        "Keine Ziffern im Namen—die Zimmernummer erfrage ich im nächsten Schritt."
                    )
                elif _tpl_lang(reply_language) == "pl":
                    msg = (
                        "Podaj imię i nazwisko jak w dokumencie "
                        "(dozwolone litery, spacje, myślniki i apostrof). "
                        "Bez cyfr w imieniu — numer pokoju zapytam w następnym kroku."
                    )
                else:
                    msg = (
                        "Kimlik veya pasaportta göründüğü gibi adınızı ve soyadınızı yazın "
                        "(harf, boşluk, tire ve kesme işareti kullanılabilir). "
                        "Bu alanda rakam kullanmayın; oda numaranızı bir sonraki adımda soracağım."
                    )
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
            name_err = validate_chat_form_full_name(text)
            if name_err:
                if name_err == "has_digit":
                    if _tpl_lang(reply_language) == "en":
                        msg = "Names cannot contain digits. Please use letters only (first and last name)."
                    elif _tpl_lang(reply_language) == "de":
                        msg = "Namen dürfen keine Ziffern enthalten. Bitte nur Buchstaben (Vor- und Nachname)."
                    elif _tpl_lang(reply_language) == "pl":
                        msg = "W imieniu nie powinno być cyfr. Podaj imię i nazwisko literami."
                    else:
                        msg = "Ad ve soyadda rakam kullanılamaz. Lütfen yalnızca harflerle yazın."
                elif name_err == "no_letters":
                    if _tpl_lang(reply_language) == "en":
                        msg = "Please enter a readable first and last name using letters."
                    elif _tpl_lang(reply_language) == "de":
                        msg = "Bitte geben Sie einen lesbaren Vor- und Nachnamen mit Buchstaben ein."
                    elif _tpl_lang(reply_language) == "pl":
                        msg = "Proszę podać imię i nazwisko literami."
                    else:
                        msg = "Lütfen harflerle okunabilir bir ad ve soyad yazın."
                elif name_err == "need_first_last":
                    if _tpl_lang(reply_language) == "en":
                        msg = "Please type your first name and last name as two words (e.g. Jane Smith), as on your ID."
                    elif _tpl_lang(reply_language) == "de":
                        msg = "Bitte schreiben Sie Vor- und Nachname in zwei Wörtern (z. B. Anna Müller), wie im Ausweis."
                    elif _tpl_lang(reply_language) == "pl":
                        msg = "Podaj imię i nazwisko dwoma słowami (np. Anna Kowalska), jak w dokumencie."
                    else:
                        msg = (
                            "Lütfen adınızı ve soyadınızı kimlikteki gibi iki kelime olarak yazın "
                            "(örnek: Ayşe Yılmaz). Tek harf veya tek kelime yeterli değildir."
                        )
                elif name_err == "too_short":
                    if _tpl_lang(reply_language) == "en":
                        msg = "That looks too short. Please write your first and last name."
                    elif _tpl_lang(reply_language) == "de":
                        msg = "Das ist zu kurz. Bitte schreiben Sie Vor- und Nachname."
                    elif _tpl_lang(reply_language) == "pl":
                        msg = "Zbyt krótko. Napisz imię i nazwisko."
                    else:
                        msg = "Çok kısa görünüyor. Lütfen adınızı ve soyadınızı yazın."
                elif name_err == "too_long":
                    if _tpl_lang(reply_language) == "en":
                        msg = "Please shorten your name to first and last name only (max. 120 characters)."
                    elif _tpl_lang(reply_language) == "de":
                        msg = "Bitte kürzen Sie auf Vor- und Nachname (max. 120 Zeichen)."
                    elif _tpl_lang(reply_language) == "pl":
                        msg = "Skróć do imienia i nazwiska (nie więcej niż 120 znaków)."
                    else:
                        msg = "Lütfen yalnızca ad ve soyadınızı yazın (en fazla 120 karakter)."
                else:
                    if _tpl_lang(reply_language) == "en":
                        msg = "Please write your first and last name."
                    elif _tpl_lang(reply_language) == "de":
                        msg = "Bitte schreiben Sie Vor- und Nachname."
                    elif _tpl_lang(reply_language) == "pl":
                        msg = "Napisz imię i nazwisko."
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
            state.full_name = normalize_full_name_for_storage(text)
            state.step = "room"
            self.form_store.upsert(payload.channel, payload.user_id, payload.session_id, state)
            if _tpl_lang(reply_language) == "en":
                msg = "Finally, could you share your room number?"
            elif _tpl_lang(reply_language) == "de":
                msg = "Zum Schluss: Wie lautet Ihre Zimmernummer?"
            elif _tpl_lang(reply_language) == "pl":
                msg = "Na koniec napisz proszę numer swojego pokoju."
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
                if _tpl_lang(reply_language) == "en":
                    msg = "Please write your room number."
                elif _tpl_lang(reply_language) == "de":
                    msg = "Bitte schreiben Sie Ihre Zimmernummer."
                elif _tpl_lang(reply_language) == "pl":
                    msg = "Proszę podać numer pokoju."
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
                self.form_store.upsert(payload.channel, payload.user_id, payload.session_id, state)
                if _tpl_lang(reply_language) == "en":
                    err = (
                        "That room number is not valid for this hotel. "
                        "Please enter your four-digit room number as on your key card."
                    )
                elif _tpl_lang(reply_language) == "de":
                    err = (
                        "Diese Zimmernummer ist in diesem Hotel ungültig. "
                        "Bitte geben Sie Ihre vierstellige Zimmernummer wie auf der Schlüsselkarte ein."
                    )
                elif _tpl_lang(reply_language) == "pl":
                    err = (
                        "Taki numer pokoju w tym hotelu jest nieważny. "
                        "Podaj czterocyfrowy numer jak na karcie pokojowej."
                    )
                else:
                    err = (
                        "Bu oda numarası otelimiz için geçerli değil. "
                        "Lütfen anahtar kartınızdaki dört haneli oda numaranızı yazın."
                    )
                return self.response_service.build(
                    "inform",
                    err,
                    intent,
                    1.0,
                    reply_language,
                    ui_language,
                    "rule",
                    action={"kind": "chat_form", "operation": state.operation, "step": "room"},
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
            if _tpl_lang(reply_language) == "en":
                header = "Please confirm the record details:\n"
                type_label = "Type"
                cat_label = "Category"
                loc_label = "Location"
                urg_label = "Urgency"
                desc_label = "Description"
                name_label = "Name"
                room_label = "Room"
                confirm_line = "\nPlease choose:\n1. Confirm and create record\n2. Cancel"
            elif _tpl_lang(reply_language) == "de":
                header = "Bitte bestätigen Sie die folgenden Angaben:\n"
                type_label = "Typ"
                cat_label = "Kategorie"
                loc_label = "Ort"
                urg_label = "Dringlichkeit"
                desc_label = "Beschreibung"
                name_label = "Name"
                room_label = "Zimmer"
                confirm_line = "\nBitte wählen Sie:\n1. Bestätigen und Eintrag erstellen\n2. Abbrechen"
            elif _tpl_lang(reply_language) == "pl":
                header = "Proszę potwierdzić podsumowanie zgłoszenia:\n"
                type_label = "Typ"
                cat_label = "Kategoria"
                loc_label = "Lokalizacja"
                urg_label = "Pilność"
                desc_label = "Opis"
                name_label = "Imię i nazwisko"
                room_label = "Pokój"
                confirm_line = "\nWybierz:\n1. Potwierdź i utwórz wpis\n2. Anuluj"
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
                if _tpl_lang(reply_language) == "en":
                    msg = "Please choose:\n1. Confirm and create record\n2. Cancel"
                elif _tpl_lang(reply_language) == "de":
                    msg = "Bitte wählen Sie:\n1. Bestätigen und Eintrag erstellen\n2. Abbrechen"
                elif _tpl_lang(reply_language) == "pl":
                    msg = "Wybierz:\n1. Potwierdź i utwórz wpis\n2. Anuluj"
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
            is_yes = lowered in _CONFIRM_YES_PHRASES
            is_no = lowered in _CONFIRM_NO_PHRASES or _user_wants_chat_form_abort_message(normalized)

            if not (is_yes or is_no):
                # Sayı yerine serbest bir mesaj yazıldıysa formu güvenli şekilde iptal et
                # ve normal sohbet akışına dön.
                self.form_store.clear(payload.channel, payload.user_id, payload.session_id)
                self.conversation_session_store.get(
                    payload.channel, payload.user_id, payload.session_id
                ).mark_form_cancelled(state.operation or "")
                msg = self._localized_chat_form_cancel_ack(state.operation, reply_language)
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
                self.conversation_session_store.get(
                    payload.channel, payload.user_id, payload.session_id
                ).mark_form_cancelled(state.operation or "")
                msg = self._localized_chat_form_cancel_ack(state.operation, reply_language)
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
            self.conversation_session_store.get(
                payload.channel, payload.user_id, payload.session_id
            ).mark_form_submitted(state.operation or "")

            if _tpl_lang(reply_language) == "en":
                msg = "Thank you. I have recorded your request and will forward it to the relevant team."
            elif _tpl_lang(reply_language) == "de":
                msg = "Vielen Dank. Ich habe Ihr Anliegen erfasst und leite es an das zuständige Team weiter."
            elif _tpl_lang(reply_language) == "pl":
                msg = "Dziękuję. Zapisałam Twoją prośbę i przekażę ją odpowiedniemu zespołowi."
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
        self._session_on_form_abandoned_clear_cancel_context(payload)
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
            text = self.response_composer.compose("reservation", "new_reservation", None, reply_language)
            return self.response_service.build(
                "inform",
                text,
                "reservation",
                1.0,
                reply_language,
                ui_language,
                "fallback",
                action=None,
            )
        lang_fb = _orch_reply_lang(reply_language)
        _explicit_chat_fallbacks = {
            "throttled": "chat_fallback_throttled",
            "validation_error": "chat_fallback_validation_error",
            "chat_form_invalid_state": "chat_form_invalid_state_hint",
        }
        fb_key = _explicit_chat_fallbacks.get(fallback_reason)
        if fb_key:
            text = self.localization_service.get(fb_key, lang_fb)
            if not text or text == fb_key:
                text = self.localization_service.get(fb_key, "tr")
            meta_intent = (
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
                else intent
            )
            return self.response_service.build(
                "fallback",
                text,
                meta_intent,
                confidence,
                reply_language,
                ui_language,
                "fallback",
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
        # hotel_info / current_time vb. için _action_for_intent None döner; policy’nin verdiği meta.action korunur.
        action = self._action_for_intent(intent=intent, sub_intent=sub_intent, entity=entity)
        if action is None:
            return response
        response.meta.action = ChatMeta.ChatAction.model_validate(action)
        return response

    @staticmethod
    def _action_for_intent(intent: str, sub_intent: str | None, entity: str | None) -> dict | None:
        # Rezervasyon modülü uygulamada kaldırıldı; yanıt metni yönlendirme, ayrı buton yok.
        if intent == "reservation":
            return None
        if intent in ("fault_report", "request", "special_need"):
            department = "guest_relations" if intent == "special_need" else "reception"
            priority = "medium"
            if intent == "special_need":
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
                "fish_pref": "la_terrace_a_la_carte",
                "meat_bbq_pref": "sinton_bbq",
                "pizza_snack_pref": "snack_restaurant",
                "coffee_dessert_pref": "libum_cafe",
                "kids_activity_pref": "kids_club",
                "romantic_dinner_pref": "la_terrace_a_la_carte",
                "general_dining_pref": "sinton_bbq",
            }
            return {
                "kind": "suggest_venue",
                "venue_id": venue_map.get((entity or "").strip(), "libum_cafe"),
                "entity": entity,
                "sub_intent": sub_intent,
            }
        if intent == "complaint" and sub_intent and sub_intent != "service_complaint":
            return {
                "kind": "open_complaint_form",
                "sub_intent": sub_intent,
                "entity": entity,
            }
        return None

    @staticmethod
    def _guess_complaint_sub_intent(message: str) -> str:
        t = (message or "").lower()
        if (
            "gürültü" in t
            or "gurultu" in t
            or "noise" in t
            or "lärm" in t
            or "laerm" in t
            or "hałas" in t
        ):
            return "noise_complaint"
        if "temizlik" in t or "clean" in t:
            return "cleanliness_complaint"
        if "personel" in t or "staff" in t:
            return "staff_complaint"
        if "oda" in t or "room" in t:
            return "room_condition_complaint"
        if (
            "şikayetçiyim" in t
            or "şikayetciyim" in t
            or "sikayetciyim" in t
            or "şikayet ediyorum" in t
            or "sikayet ediyorum" in t
            or "complaining about" in t
        ):
            if (
                "gürültü" in t
                or "gurultu" in t
                or "noise" in t
                or "lärm" in t
                or "laerm" in t
                or "hałas" in t
                or "rahatsız" in t
                or "rahatsiz" in t
            ):
                return "noise_complaint"
            if (
                "temizlik" in t
                or "kirli" in t
                or "pis" in t
                or "clean" in t
                or "dirty" in t
                or "schmutz" in t
                or "brudn" in t
            ):
                return "cleanliness_complaint"
            if "personel" in t or "staff" in t or "obsługa" in t:
                return "staff_complaint"
            if "oda" in t or "room" in t or "zimmer" in t or "pokój" in t:
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
            or "laktoza" in t
            or "mleko" in t
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
            or "orzeszki" in t
            or "nuts" in t
            or "alergia" in t
        ):
            return "allergy"
        if (
            "bebek" in t
            or "bebeğim" in t
            or "bebeği" in t
            or "mama" in t
            or "baby food" in t
            or "babynahrung" in t
            or "karmienie dziecka" in t
        ):
            return "baby_need"
        if (
            "erişilebilirlik" in t
            or "erisilebilirlik" in t
            or "accessibility" in t
            or "wheelchair" in t
            or "rollstuhl" in t
            or "dostępność" in t
            or "dostęp" in t
            or "wózek" in t
        ):
            return "accessibility_need"
        return "other_special_need"

