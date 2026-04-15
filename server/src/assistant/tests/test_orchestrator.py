import sys
import re
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from assistant.core.config import Settings  # noqa: E402
from assistant.schemas.chat import ChatRequest  # noqa: E402
from assistant.services.device_extractor import DeviceExtractor  # noqa: E402
from assistant.services.language_service import LanguageService  # noqa: E402
from assistant.services.localization_service import LocalizationService  # noqa: E402
from assistant.services.orchestrator import ChatOrchestrator  # noqa: E402
from assistant.services.policy_service import PolicyService  # noqa: E402
from assistant.services.response_composer import ResponseComposer  # noqa: E402
from assistant.services.response_service import ResponseService  # noqa: E402
from assistant.services.rule_engine import (  # noqa: E402
    RuleEngine,
    _adjust_water_entity_for_supply_context,
    extract_request_category_from_text,
)
from assistant.utils.text_normalizer import normalize_text  # noqa: E402
from assistant.services.throttle_service import ThrottleService  # noqa: E402
from assistant.services.chat_form_state import ChatFormState  # noqa: E402


class DummyIntentService:
    def __init__(self):
        self.calls = 0

    def classify(self, _message):
        self.calls += 1
        from assistant.schemas.intent import IntentResult
        return IntentResult(
            intent="unknown",
            sub_intent=None,
            entity=None,
            department=None,
            needs_rag=False,
            response_mode="fallback",
            confidence=0.0,
            source="llm",
        )


class DummyRagService:
    """Stub RAG: generic hotel_info → one line; wayfinding → short location or None (miss)."""

    def __init__(self):
        self.called = False

    def answer(self, message, language):
        self.called = True
        t = (message or "").lower()
        lang = language if language in ("tr", "en", "de", "pl") else "tr"
        is_wf = any(
            m in t
            for m in (
                "nerede",
                "nerde",
                "nereye",
                "nasıl gider",
                "nasil gider",
                "where is",
                "where can i find",
                "where do i find",
                "how do i get",
                "how to get",
                "konum",
                "yeri neresi",
                "wo ist",
                "wie komme",
                "wie gelange",
                "gdzie jest",
                "jak dojść",
                "jak dojsc",
                "lokalizacja",
            )
        )
        if is_wf:
            if "ana restoran" in t or "main restaurant" in t:
                return {
                    "tr": "Ana restoran B Block'ta, havuz tarafı teras katındadır.",
                    "en": "The main restaurant is on the pool-side terrace in Block B.",
                    "de": "Das Hauptrestaurant liegt terrassenseitig am Pool in Block B.",
                    "pl": "Główna restauracja jest na tarasie od strony basenu, blok B.",
                }[lang]
            if "moss" in t:
                return {
                    "tr": "Moss Bar, alt geçitten sahile çıkıldığında sağ-ileride, sahil alanındadır.",
                    "en": "Moss Bar is on the beach, ahead to the right after the underpass to the shore.",
                    "de": "Die Moss Bar liegt am Strand, rechts-vorne nach dem Durchgang zum Strand.",
                    "pl": "Moss Bar jest na plaży, w prawo za przejściem w stronę morza.",
                }[lang]
            if "lobi" in t or "lobby" in t:
                return {
                    "tr": "Lobi (Lobby) A Block giriş katındadır.",
                    "en": "The lobby is on the ground floor at the Block A entrance.",
                    "de": "Die Lobby ist im Erdgeschoss am Eingang von Block A.",
                    "pl": "Lobby jest na parterze przy wejściu do bloku A.",
                }[lang]
            if "bilinmeyen_test_yeri" in t:
                return None
            return None

        return "Spa 08:30-19:00 saatleri arasında açıktır."


def build_orchestrator():
    settings = Settings()
    rag = DummyRagService()
    intent = DummyIntentService()
    orch = ChatOrchestrator(
        settings=settings,
        language_service=LanguageService(),
        localization_service=LocalizationService(),
        rule_engine=RuleEngine(Path(__file__).resolve().parents[1] / "rules" / "routing_rules.yaml"),
        intent_service=intent,
        policy_service=PolicyService(),
        rag_service=rag,
        response_service=ResponseService(),
        throttle_service=ThrottleService(window_seconds=10, max_messages=9999),
        device_extractor=DeviceExtractor(),
        response_composer=ResponseComposer(LocalizationService()),
    )
    return orch, rag, intent


def test_fault_cases():
    orch, _, _ = build_orchestrator()
    for msg in ["televizyonum bozuldu", "duşum bozuldu", "kart çalışmıyor", "klima soğutmuyor", "ışık yanmıyor"]:
        res = orch.handle(ChatRequest(message=msg, ui_language="tr", locale="tr"))
        assert res.type == "inform"
        assert res.meta.intent == "fault_report"
        assert res.meta.action and res.meta.action.kind == "chat_form"


def test_fault_sub_intent_is_preserved():
    orch, _, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="duşum bozuldu", ui_language="tr", locale="tr"))
    assert res.type == "inform"
    assert res.meta.intent == "fault_report"
    assert "kategori" in res.message.lower()
    assert "Su" in res.message or "Banyo" in res.message

    res = orch.handle(ChatRequest(message="kart çalışmıyor", ui_language="tr", locale="tr"))
    assert res.type == "inform"
    assert res.meta.intent == "fault_report"
    assert "kategori" in res.message.lower()
    assert "Kapı" in res.message or "kilidi" in res.message.lower()


def test_special_need_cases():
    orch, _, _ = build_orchestrator()
    for msg in ["veganım", "çölyağım", "gluten yiyemem", "süt dokunuyor", "alerjim var"]:
        res = orch.handle(ChatRequest(message=msg, ui_language="tr", locale="tr"))
        assert res.meta.intent == "guest_notification"
        assert res.type == "inform"
        assert res.meta.action and res.meta.action.kind == "chat_form"


def test_kutlama_and_kkutlama_are_celebration_not_diet():
    """Yazım hatası veya kısaltma ile beslenme listesi yerine kutlama kategorileri gelmeli."""
    orch, _, _ = build_orchestrator()
    for msg in ["kutlama", "kkutlama"]:
        res = orch.handle(ChatRequest(message=msg, ui_language="tr", locale="tr"))
        assert res.meta.intent == "guest_notification"
        assert res.type == "inform"
        assert "doğum" in res.message.lower()
        assert "alerjen bildirimi" not in res.message.lower()


def test_havlu_rag_appends_pool_vs_room_towel_note_not_form_redirect():
    orch, rag, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="havlu", ui_language="tr", locale="tr"))
    assert rag.called is True
    assert res.meta.intent == "hotel_info"
    assert res.type == "answer"
    assert "plaj" in res.message.lower() or "havuz" in res.message.lower()
    assert "istek formu" not in res.message.lower()
    assert "talep ediyorum" not in res.message.lower()


def test_bornoz_single_word_rag_appends_request_form_hint_not_chat_form():
    """Tek kelime tedarik → bilgi (RAG); arkada talep formu / net ifade ipucu."""
    orch, rag, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="bornoz", ui_language="tr", locale="tr"))
    assert rag.called is True
    assert res.meta.intent == "hotel_info"
    assert res.type == "answer"
    low = res.message.lower()
    assert "sohbette" in low or "uygulamada" in low or "talep" in low
    assert not (res.meta.action and res.meta.action.kind == "chat_form")


def test_bornoz_lazim_opens_request_chat_form_not_only_rag():
    orch, rag, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="bornoz lazım", ui_language="tr", locale="tr"))
    assert res.meta.intent == "request"
    assert res.meta.action and res.meta.action.kind == "chat_form"


def test_minibar_rag_has_no_chat_form_suffix():
    orch, rag, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="minibar", ui_language="tr", locale="tr"))
    assert rag.called is True
    assert res.meta.intent == "hotel_info"
    assert res.type == "answer"
    assert "havlu talep" not in res.message.lower()
    assert "istek formu" not in res.message.lower()


def test_minibar_empty_opens_request_form_not_reception_fallback():
    orch, _, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="minibarın içi boş", ui_language="tr", locale="tr"))
    assert res.meta.intent == "request"
    assert res.type == "inform"
    assert res.meta.action and res.meta.action.kind == "chat_form"


def test_minibar_yok_stays_hotel_info_not_request():
    orch, rag, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="minibar yok", ui_language="tr", locale="tr"))
    assert res.meta.intent == "hotel_info"
    assert res.type == "answer"
    assert rag.called is True


def test_terlik_yok_odamda_is_supply_request_not_soft_rag():
    """«terlik yok odamda» bilgi değil; envanter + yok → istek formu (minibar yok gibi değil)."""
    orch, rag, _ = build_orchestrator()
    res = orch.handle(
        ChatRequest(message="terlik yok odamda", ui_language="tr", locale="tr", user_id="u-slip", session_id="s-slip")
    )
    assert res.meta.intent == "request"
    assert res.type == "inform"
    assert res.meta.action and res.meta.action.kind == "chat_form"
    assert rag.called is False


def test_kettle_yok_stays_hotel_info_not_request():
    orch, rag, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="kettle yok", ui_language="en", locale="en"))
    assert res.meta.intent == "hotel_info"
    assert res.type == "answer"
    assert rag.called is True


def test_su_isiticim_yok_is_kettle_request_not_rag():
    """«su ısıtıcım yok» bilgi sorusu değil — oda eksikliği; uzun RAG yerine istek formu."""
    orch, rag, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="su ısıtıcım yok", ui_language="tr", locale="tr"))
    assert res.meta.intent == "request"
    assert res.type == "inform"
    assert res.meta.action and res.meta.action.kind == "chat_form"
    assert rag.called is False


def test_kettle_prefilled_from_message_skips_redundant_description_asks_name():
    """Kategori net + yapılandırılmış detay yok: «neye ihtiyaç» tekrarı yok, doğrudan isim."""
    orch, _, _ = build_orchestrator()
    uid, sid = "u-kettle-prefill", "s-kettle-prefill"
    res = orch.handle(
        ChatRequest(
            message="su ısıtıcı lazım",
            ui_language="tr",
            locale="tr",
            user_id=uid,
            session_id=sid,
        )
    )
    assert res.meta.intent == "request"
    low = res.message.lower()
    assert "neye ihtiyaç duyduğunuzu" not in low
    assert "adınızı" in low or "soyadınızı" in low
    assert "talebiniz" in low or "aldık" in res.message or "su ısıtıcı" in res.message.lower()
    assert res.meta.action and res.meta.action.step == "full_name"


def test_kettle_typo_with_need_opens_request_form():
    orch, _, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="kettele ihtiyacım var", ui_language="tr", locale="tr"))
    assert res.meta.intent == "request"
    assert res.type == "inform"
    assert res.meta.action and res.meta.action.kind == "chat_form"


def test_baby_bed_need_opens_request_not_diet_guest_notification():
    orch, _, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="bebek yatağına ihtiyacım var", ui_language="tr", locale="tr"))
    assert res.meta.intent == "request"
    assert res.type == "inform"
    assert res.meta.action and res.meta.action.kind == "chat_form"
    assert "alerjen" not in res.message.lower()
    assert "gluten" not in res.message.lower()


def test_pregnant_with_baby_bed_need_is_request_not_health_guest_notification():
    """Hamilelik sağlık bildirimi, bebek yatağı talebinden önce gelmemeli."""
    orch, _, _ = build_orchestrator()
    res = orch.handle(
        ChatRequest(message="hamileyim bebek yatağına ihtiyacım var", ui_language="tr", locale="tr")
    )
    assert res.meta.intent == "request"
    assert res.type == "inform"
    assert res.meta.action and res.meta.action.kind == "chat_form"


def test_balayi_phrase_with_empty_minibar_is_supply_request_not_celebration():
    """Balayı kelimesi kutlamadan önce minibar tedarik talebi yakalanmalı."""
    orch, _, _ = build_orchestrator()
    res = orch.handle(
        ChatRequest(message="balayı odasındayız minibarın içi boş", ui_language="tr", locale="tr")
    )
    assert res.meta.intent == "request"
    assert res.type == "inform"
    assert res.meta.action and res.meta.action.kind == "chat_form"


def test_baby_bed_lazim_opens_request_form():
    orch, _, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="bebek yatağı lazım", ui_language="tr", locale="tr"))
    assert res.meta.intent == "request"
    assert res.meta.action and res.meta.action.kind == "chat_form"


def test_baby_bed_gerekli_opens_request_form_not_soft_rag():
    """«Gerekli» bilinen istek kategorisiyle güçlü talep sayılır (yalnız RAG bilgi değil)."""
    orch, rag, intent = build_orchestrator()
    res = orch.handle(ChatRequest(message="bebek yatağı gerekli", ui_language="tr", locale="tr"))
    assert res.meta.intent == "request"
    assert res.meta.action and res.meta.action.kind == "chat_form"
    assert rag.called is False
    assert intent.calls == 0


def test_tamam_nasil_after_baby_bed_info_opens_baby_request_form():
    """Bilgi cevabından sonra «tamam nasıl» genel karşılama yerine bebek ekipmanı istek adımına gider."""
    orch, rag, intent = build_orchestrator()
    uid, sid = "u-baby-how", "s-baby-how"
    r1 = orch.handle(
        ChatRequest(message="bebek yatağı var mı", ui_language="tr", locale="tr", user_id=uid, session_id=sid)
    )
    assert r1.meta.intent == "hotel_info"
    assert rag.called is True
    r2 = orch.handle(ChatRequest(message="tamam nasıl", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    assert r2.meta.intent == "request"
    assert r2.meta.action and r2.meta.action.kind == "chat_form"
    low = r2.message.lower()
    assert "merhaba, ben viona" not in low
    assert "bebek" in low or "baby" in low or "ekipman" in low or "item" in low or "tür" in low or "type" in low


def test_minibar_lazim_opens_request_form():
    orch, _, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="minibar lazım", ui_language="tr", locale="tr"))
    assert res.meta.intent == "request"
    assert res.meta.action and res.meta.action.kind == "chat_form"


def test_critical_routing_regression_matrix():
    """Kural motoru: doğru niyet + sohbet formu (regresyon tablosu). Her satır ayrı oturum."""
    n = 0

    def isolate():
        nonlocal n
        n += 1
        return f"routing-reg-{n}", f"routing-reg-{n}"

    def req(msg: str) -> None:
        uid, sid = isolate()
        orch, _, _ = build_orchestrator()
        r = orch.handle(
            ChatRequest(message=msg, ui_language="tr", locale="tr", user_id=uid, session_id=sid)
        )
        assert r.meta.intent == "request", msg
        assert r.meta.action and r.meta.action.kind == "chat_form", msg

    def gn(msg: str) -> None:
        uid, sid = isolate()
        orch, _, _ = build_orchestrator()
        r = orch.handle(
            ChatRequest(message=msg, ui_language="tr", locale="tr", user_id=uid, session_id=sid)
        )
        assert r.meta.intent == "guest_notification", msg
        assert r.meta.action and r.meta.action.kind == "chat_form", msg

    def gr_contact(msg: str) -> None:
        """Bebek maması talebi → Misafir İlişkileri yönlendirmesi (bebek ekipmanı formu değil)."""
        uid, sid = isolate()
        orch, _, _ = build_orchestrator()
        r = orch.handle(
            ChatRequest(message=msg, ui_language="tr", locale="tr", user_id=uid, session_id=sid)
        )
        assert r.meta.intent == "request", msg
        assert r.type in ("inform", "redirect"), msg
        low = r.message.lower()
        assert "misafir" in low or "ilişkiler" in low or "guest relations" in low, msg

    def fault(msg: str) -> None:
        uid, sid = isolate()
        orch, _, _ = build_orchestrator()
        r = orch.handle(
            ChatRequest(message=msg, ui_language="tr", locale="tr", user_id=uid, session_id=sid)
        )
        assert r.meta.intent == "fault_report", msg
        assert r.meta.action and r.meta.action.kind == "chat_form", msg

    def hi(msg: str) -> None:
        uid, sid = isolate()
        orch, rag, _ = build_orchestrator()
        r = orch.handle(
            ChatRequest(message=msg, ui_language="tr", locale="tr", user_id=uid, session_id=sid)
        )
        assert r.meta.intent == "hotel_info", msg
        assert r.type == "answer", msg
        assert rag.called is True, msg

    req("temizlik istiyorum")
    req("minibarın içi boş")
    req("bebek yatağına ihtiyacım var")
    gn("gluten hassasiyetim var")
    gr_contact("bebek maması ihtiyacım var")
    fault("klima çalışmıyor")
    hi("temizlik")
    hi("minibar yok")


def test_guest_notification_switch_from_diet_to_kutlama_at_category_step():
    orch, _, _ = build_orchestrator()
    uid, sid = "u-switch-1", "s-switch-1"
    r1 = orch.handle(ChatRequest(message="alerjen", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    assert r1.meta.intent == "guest_notification"
    assert "alerjen bildirimi" in r1.message.lower() or "gluten" in r1.message.lower()
    r2 = orch.handle(ChatRequest(message="kutlama", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    assert r2.meta.intent == "guest_notification"
    assert "doğum" in r2.message.lower()
    assert "alerjen bildirimi" not in r2.message.lower()


def test_special_need_multilang_examples():
    orch, _, _ = build_orchestrator()
    examples = [
        ("veganım", "tr"),
        ("I am vegetarian", "en"),
        ("Ich bin Vegetarier", "de"),
        ("jestem wegetarianinem", "pl"),
        ("laktozum var", "tr"),
        ("Ich brauche Rollstuhl Hilfe", "de"),
    ]
    for msg, loc in examples:
        res = orch.handle(ChatRequest(message=msg, ui_language=loc, locale=loc))
        assert res.meta.intent == "guest_notification"
        assert res.meta.language == loc
        assert res.meta.action and res.meta.action.kind == "chat_form"


def test_baby_food_need_routes_guest_relations_not_baby_equipment_form():
    orch, _, _ = build_orchestrator()
    for msg, loc in [
        ("mama lazım", "tr"),
        ("I need baby food", "en"),
        ("potrzebuję jedzenia dla niemowląt", "pl"),
    ]:
        res = orch.handle(ChatRequest(message=msg, ui_language=loc, locale=loc))
        assert res.meta.intent == "request", msg
        low = res.message.lower()
        assert (
            "misafir" in low
            or "guest relations" in low
            or "gästebetreuung" in low
            or "gość" in low
            or "obslug" in low
        ), msg


def test_mama_sandalyesi_lazim_still_baby_equipment_request_form():
    orch, _, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="mama sandalyesi lazım", ui_language="tr", locale="tr"))
    assert res.meta.intent == "request"
    assert res.meta.action and res.meta.action.kind == "chat_form"


def test_su_isitici_eksik_opens_kettle_request_form():
    orch, _, _ = build_orchestrator()
    for i, msg in enumerate(("su ısıtıcısı eksik", "su isiticisi eksik")):
        res = orch.handle(
            ChatRequest(message=msg, ui_language="tr", locale="tr", user_id=f"u-kettle-{i}", session_id=f"s-kettle-{i}")
        )
        assert res.meta.intent == "request", msg
        assert res.meta.action and res.meta.action.kind == "chat_form", msg
        low = res.message.lower()
        assert "içme suyu" not in low, msg
        assert res.meta.action.step == "full_name" or (
            "ısıtıcı" in low or "kettle" in low or "isitici" in low or "su ısıtıcı" in low
        ), msg


def test_su_isitici_without_si_suffix_need_not_reception_drinking_water():
    """«su ısıtıcı» (sı yok) + ihtiyaç: içme suyu resepsiyon metnine düşmesin, kettle istek formu."""
    orch, _, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="su ısıtıcı ihtiyacım var", ui_language="tr", locale="tr"))
    assert res.meta.intent == "request"
    assert res.meta.action and res.meta.action.kind == "chat_form"
    low = res.message.lower()
    assert "içme suyu" not in low
    assert res.meta.action.step == "full_name" or ("ısıtıcı" in low or "kettle" in low or "isitici" in low)


def test_adjust_water_entity_for_supply_context_kettle_and_bottled():
    """Genel «su»→water düzeltmesi: kettle/şişe su alt dizgeleri envanter kaçırsa da entity temizlensin."""
    assert _adjust_water_entity_for_supply_context("su ısıtıcı rica", "water") is None
    assert _adjust_water_entity_for_supply_context("water bottle order", "water") is None
    assert _adjust_water_entity_for_supply_context("odaya su gönderin", "water") == "water"


def test_request_and_complaint_cases():
    orch, _, _ = build_orchestrator()
    req = orch.handle(
        ChatRequest(message="havlu talep ediyorum", ui_language="tr", locale="tr", user_id="u-req", session_id="s-req")
    )
    cmp_ = orch.handle(
        ChatRequest(message="çok kötü", ui_language="tr", locale="tr", user_id="u-cmp", session_id="s-cmp")
    )
    assert req.meta.intent == "request"
    assert req.type == "inform"
    assert req.meta.action and req.meta.action.kind == "chat_form"
    assert "havlu" in req.message.lower() or "banyo" in req.message.lower()
    assert cmp_.meta.intent == "complaint"
    assert cmp_.type == "inform"
    assert cmp_.meta.action is None
    assert "resepsiyon" in cmp_.message.lower()
    assert "şikayet" in cmp_.message.lower() or "form" in cmp_.message.lower()


def test_bare_cikis_is_hotel_info_not_reservation():
    orch, rag, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="çıkış", ui_language="tr", locale="tr"))
    assert res.meta.intent == "hotel_info"
    assert res.type == "answer"
    assert rag.called is True


def test_alanya_where_to_visit_opens_discover_module():
    orch, _, _ = build_orchestrator()
    res = orch.handle(
        ChatRequest(message="alanyada nereleri gezeyim", ui_language="tr", locale="tr")
    )
    assert res.meta.intent == "hotel_info"
    assert res.type == "answer"
    assert res.meta.source == "rule"
    assert res.meta.action is not None
    assert res.meta.action.kind == "open_alanya_module"
    low = res.message.lower()
    assert "kleopatra" in low or "kale" in low or "alanya" in low


def test_reservation_and_hotel_info_multilang():
    orch, rag, _ = build_orchestrator()

    res = orch.handle(ChatRequest(message="çıkış saat kaçta", ui_language="tr", locale="tr"))
    assert res.meta.intent == "hotel_info"
    assert res.type == "answer"
    assert rag.called is True

    rag.called = False
    res = orch.handle(ChatRequest(message="where is the lobby", ui_language="en", locale="en"))
    assert res.meta.intent == "hotel_info"
    assert res.type == "answer"
    assert rag.called is True
    assert res.meta.source == "rag"
    assert "lobby" in res.message.lower()


def test_bored_suggests_animation_multilang():
    orch, _, _ = build_orchestrator()
    examples = [
        ("otelde canım sıkıldı", "tr"),
        ("I am bored", "en"),
        ("mir ist langweilig", "de"),
        ("nudzi mi się", "pl"),
    ]
    for msg, loc in examples:
        res = orch.handle(ChatRequest(message=msg, ui_language=loc, locale=loc))
        assert res.meta.intent == "hotel_info"
        assert res.type == "answer"
        assert res.meta.source == "rule"


def test_chitchat_multilang():
    orch, _, _ = build_orchestrator()
    examples = [
        ("naber", "tr"),
        ("hello", "en"),
        ("hallo", "de"),
        ("cześć", "pl"),
        ("wer bist du", "de"),
        ("kim jesteś", "pl"),
    ]
    for msg, loc in examples:
        res = orch.handle(ChatRequest(message=msg, ui_language=loc, locale=loc))
        assert res.meta.intent == "chitchat"
        assert res.type == "inform"
        assert res.meta.source == "rule"


def test_social_thanks_is_rule_based_without_llm_dependency():
    orch, _, intent = build_orchestrator()
    for msg, loc in [("teşekkürler", "tr"), ("thanks", "en"), ("danke", "de"), ("dziękuję", "pl")]:
        res = orch.handle(ChatRequest(message=msg, ui_language=loc, locale=loc))
        assert res.meta.intent == "chitchat"
        assert res.type == "inform"
        assert res.meta.source == "rule"
    assert intent.calls == 0


def test_selected_language_has_priority_for_social_intents():
    orch, _, intent = build_orchestrator()
    tr_res = orch.handle(ChatRequest(message="thanks", ui_language="tr", locale="tr"))
    en_res = orch.handle(ChatRequest(message="teşekkürler", ui_language="en", locale="en"))
    assert tr_res.meta.language == "tr"
    assert any(x in tr_res.message.lower() for x in ("rica ederim", "ne demek", "ben teşekkür ederim"))
    assert en_res.meta.language == "en"
    assert any(x in en_res.message.lower() for x in ("you're very welcome", "glad to help", "my pleasure"))
    assert intent.calls == 0


def test_identity_is_introduced_but_thanks_is_not_robotic_intro():
    orch, _, _ = build_orchestrator()
    identity = orch.handle(ChatRequest(message="sen kimsin", ui_language="tr", locale="tr"))
    thanks = orch.handle(ChatRequest(message="teşekkür ederim", ui_language="tr", locale="tr"))
    assert "viona" in identity.message.lower()
    assert any(x in thanks.message.lower() for x in ("rica ederim", "ne demek", "ben teşekkür ederim"))
    assert "ben viona" not in thanks.message.lower()


def test_persona_fallback_message_is_warm_and_guiding():
    orch, _, _ = build_orchestrator()
    res = orch.handle(
        ChatRequest(
            message="qzxw 123 ??? xxxxx foobar nonsense phrase invalid",
            ui_language="tr",
            locale="tr",
        )
    )
    assert res.type == "fallback"
    assert res.meta.source == "fallback"
    assert ("daha kısa" in res.message.lower()) or ("doğrulanmış bilgi" in res.message.lower())


def test_social_intents_still_work_when_classifier_always_unknown():
    orch, _, intent = build_orchestrator()
    res = orch.handle(ChatRequest(message="görüşürüz", ui_language="tr", locale="tr"))
    assert res.meta.intent == "chitchat"
    assert res.meta.source == "rule"
    assert res.type == "inform"
    assert intent.calls == 0


def test_social_token_plus_hotel_question_routes_to_hotel_info():
    orch, _, intent = build_orchestrator()
    res_tr = orch.handle(ChatRequest(message="merhaba restoran saatleri", ui_language="tr", locale="tr"))
    res_en = orch.handle(ChatRequest(message="thanks restaurant hours", ui_language="en", locale="en"))
    assert res_tr.meta.intent == "hotel_info"
    assert res_tr.type == "answer"
    assert res_en.meta.intent == "hotel_info"
    assert res_en.type == "answer"
    # These are fixed hotel-info entries; they should still bypass social chitchat path.
    assert res_tr.meta.source == "rule"
    assert res_en.meta.source == "rule"
    # deterministic rule path should avoid classifier for these common queries
    assert intent.calls == 0


def test_social_reply_uses_selected_ui_language_first():
    orch, _, intent = build_orchestrator()
    res_tr = orch.handle(ChatRequest(message="thanks", ui_language="tr", locale="tr"))
    res_en = orch.handle(ChatRequest(message="teşekkürler", ui_language="en", locale="en"))
    assert res_tr.meta.language == "tr"
    assert any(x in res_tr.message.lower() for x in ("rica ederim", "ne demek", "ben teşekkür ederim"))
    assert res_en.meta.language == "en"
    assert any(x in res_en.message.lower() for x in ("you're very welcome", "glad to help", "my pleasure"))
    assert intent.calls == 0


def test_how_are_you_phrase_nasil_gidiyor_routes_to_social_rule():
    orch, _, intent = build_orchestrator()
    res = orch.handle(ChatRequest(message="nasıl gidiyor", ui_language="tr", locale="tr"))
    assert res.meta.intent == "chitchat"
    assert res.meta.source == "rule"
    assert res.meta.language == "tr"
    assert any(x in res.message.lower() for x in ("iyiyim", "gayet iyiyim"))
    assert intent.calls == 0


def test_social_variation_is_deterministic_for_same_input():
    orch, _, intent = build_orchestrator()
    r1 = orch.handle(ChatRequest(message="teşekkürler", ui_language="tr", locale="tr"))
    r2 = orch.handle(ChatRequest(message="teşekkürler", ui_language="tr", locale="tr"))
    assert r1.message == r2.message
    assert r1.meta.intent == "chitchat"
    assert intent.calls == 0


def test_social_variation_respects_selected_language_for_same_meaning():
    orch, _, intent = build_orchestrator()
    tr = orch.handle(ChatRequest(message="thanks", ui_language="tr", locale="tr"))
    en = orch.handle(ChatRequest(message="teşekkürler", ui_language="en", locale="en"))
    assert tr.meta.language == "tr"
    assert en.meta.language == "en"
    assert ("konaklama" in tr.message.lower()) or ("kaila beach hotel" in tr.message.lower())
    assert ("your stay" in en.message.lower()) or ("kaila beach hotel" in en.message.lower())
    assert intent.calls == 0


def test_polish_chitchat_multiword_rule():
    orch, _, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="cześć jak się masz", ui_language="pl", locale="pl"))
    assert res.meta.intent == "chitchat"
    assert res.type == "inform"
    assert res.meta.source == "rule"


def test_please_speak_english_is_rule_chitchat_no_classifier():
    orch, _, intent = build_orchestrator()
    res = orch.handle(ChatRequest(message="please speak english", ui_language="tr", locale="tr"))
    assert res.meta.intent == "chitchat"
    assert res.meta.language == "en"
    assert "I'll reply in English" in res.message
    assert "resepsiyon" not in res.message.lower()
    assert intent.calls == 0


def test_turkish_ui_ingilizce_konus_switches_reply_to_english():
    orch, _, intent = build_orchestrator()
    res = orch.handle(ChatRequest(message="ingilizce konuş", ui_language="tr", locale="tr"))
    assert res.meta.intent == "chitchat"
    assert res.meta.language == "en"
    assert "I'll reply in English" in res.message
    assert "resepsiyon" not in res.message.lower()
    assert intent.calls == 0


def test_turkish_capital_ingilizce_konus_switches_reply_to_english():
    """İ (U+0130) must normalize like lowercase i for phrase matching."""
    orch, _, intent = build_orchestrator()
    res = orch.handle(ChatRequest(message="İngilizce konuş", ui_language="tr", locale="tr"))
    assert res.meta.intent == "chitchat"
    assert res.meta.language == "en"
    assert "I'll reply in English" in res.message
    assert intent.calls == 0


def test_german_ui_switch_to_turkish():
    orch, _, intent = build_orchestrator()
    res = orch.handle(ChatRequest(message="bitte türkisch", ui_language="de", locale="de"))
    assert res.meta.intent == "chitchat"
    assert res.meta.language == "tr"
    assert "Türkçe" in res.message
    assert intent.calls == 0


def test_conversation_language_persists_reply_after_switch():
    """Session dil (conversation_language) ile sonraki mesajlar aynı dilde şablon üretir."""
    orch, _, intent = build_orchestrator()
    r1 = orch.handle(ChatRequest(message="ingilizce konuş", ui_language="tr", locale="tr"))
    assert r1.meta.language == "en"
    r2 = orch.handle(
        ChatRequest(
            message="havlu talep ediyorum",
            ui_language="tr",
            locale="tr",
            conversation_language="en",
        )
    )
    assert r2.meta.intent == "request"
    assert r2.meta.language == "en"
    assert "towel" in r2.message.lower()
    assert intent.calls == 0


def test_nfd_turkish_s_composes_to_match_language_switch():
    """NFD 'konuş' (s + combining cedilla) must NFC-normalize to match 'ingilizce konuş'."""
    orch, _, intent = build_orchestrator()
    nfd_msg = "ingilizce konu" + "\u0073\u0327"  # NFD ş
    res = orch.handle(ChatRequest(message=nfd_msg, ui_language="tr", locale="tr"))
    assert res.meta.intent == "chitchat"
    assert res.meta.language == "en"
    assert "English" in res.message
    assert intent.calls == 0


def test_single_word_ingilizce_is_language_switch():
    orch, _, intent = build_orchestrator()
    res = orch.handle(ChatRequest(message="ingilizce", ui_language="tr", locale="tr"))
    assert res.meta.intent == "chitchat"
    assert res.meta.language == "en"
    assert intent.calls == 0


def test_ingilizce_konusur_musun_is_language_switch_not_request():
    orch, _, intent = build_orchestrator()
    res = orch.handle(ChatRequest(message="ingilizce konuşur musun", ui_language="tr", locale="tr"))
    assert res.meta.intent == "chitchat"
    assert res.meta.language == "en"
    assert "I'll reply in English" in res.message
    assert "resepsiyon" not in res.message.lower()
    assert intent.calls == 0


def test_typo_iniglizce_konus_is_language_switch():
    orch, _, intent = build_orchestrator()
    res = orch.handle(ChatRequest(message="iniglizce konuş", ui_language="tr", locale="tr"))
    assert res.meta.intent == "chitchat"
    assert res.meta.language == "en"
    assert intent.calls == 0


def test_polish_meta_phrase_switch_to_english():
    orch, _, intent = build_orchestrator()
    res = orch.handle(ChatRequest(message="mów po angielsku", ui_language="pl", locale="pl"))
    assert res.meta.intent == "chitchat"
    assert res.meta.language == "en"
    assert "English" in res.message
    assert intent.calls == 0


def test_polish_short_phrase_po_angielsku():
    orch, _, intent = build_orchestrator()
    res = orch.handle(ChatRequest(message="po angielsku", ui_language="pl", locale="pl"))
    assert res.meta.intent == "chitchat"
    assert res.meta.language == "en"
    assert intent.calls == 0


def test_german_meta_switch_to_english():
    orch, _, intent = build_orchestrator()
    res = orch.handle(ChatRequest(message="auf englisch wechseln", ui_language="de", locale="de"))
    assert res.meta.intent == "chitchat"
    assert res.meta.language == "en"
    assert "English" in res.message
    assert intent.calls == 0


def test_german_meta_switch_to_polish():
    orch, _, intent = build_orchestrator()
    res = orch.handle(ChatRequest(message="auf polnisch wechseln", ui_language="de", locale="de"))
    assert res.meta.intent == "chitchat"
    assert res.meta.language == "pl"
    assert "polski" in res.message.lower() or "polsku" in res.message.lower() or "Polish" in res.message
    assert intent.calls == 0


def test_german_sprich_englisch():
    orch, _, intent = build_orchestrator()
    res = orch.handle(ChatRequest(message="sprich englisch", ui_language="de", locale="de"))
    assert res.meta.intent == "chitchat"
    assert res.meta.language == "en"
    assert intent.calls == 0


def test_polish_meta_switch_to_german():
    orch, _, intent = build_orchestrator()
    res = orch.handle(ChatRequest(message="mów po niemiecku", ui_language="pl", locale="pl"))
    assert res.meta.intent == "chitchat"
    assert res.meta.language == "de"
    assert "Deutsch" in res.message or "Ich antworte" in res.message
    assert intent.calls == 0


def test_language_switch_overrides_conversation_language():
    """Aynı turda dil değiştirme ifadesi, mevcut oturum dilinden önceliklidir."""
    orch, _, intent = build_orchestrator()
    res = orch.handle(
        ChatRequest(
            message="türkçe konuş",
            ui_language="tr",
            locale="tr",
            conversation_language="en",
        )
    )
    assert res.meta.intent == "chitchat"
    assert res.meta.language == "tr"
    assert "Türkçe" in res.message or "yanıtlıyorum" in res.message
    assert intent.calls == 0


def test_en_fault_template_no_bad_article_before_air_conditioner():
    orch, _, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="The AC is broken", ui_language="en", locale="en"))
    assert res.meta.intent == "fault_report"
    assert "a Air" not in res.message
    assert "hvac" in res.message.lower() or "air" in res.message.lower() or "climate" in res.message.lower()


def test_current_time_tr_contains_hhmm():
    orch, _, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="saat kaç", ui_language="tr", locale="tr"))
    assert res.meta.intent == "current_time"
    assert res.type == "answer"
    assert re.search(r"\d{2}:\d{2}", res.message)


def test_dry_cleaning_typos_return_fixed_laundry_info_not_fault():
    orch, rag, _ = build_orchestrator()
    for msg in (
        "kuru temilzeme",
        "kuru temizlme",
        "kuru temizleme hizmetinden nasıl yararlanabilirim",
    ):
        res = orch.handle(ChatRequest(message=msg, ui_language="tr", locale="tr"))
        assert res.meta.intent == "hotel_info", msg
        assert res.type == "answer", msg
        assert rag.called is False, msg
        assert "ücretli" in res.message.lower() or "resepsiyon" in res.message.lower(), msg


def test_temizlik_istiyorum_opens_request_not_complaint():
    orch, _, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="temizlik istiyorum", ui_language="tr", locale="tr"))
    assert res.meta.intent == "request"
    assert res.type == "inform"
    assert res.meta.action and res.meta.action.kind == "chat_form"


def test_bare_temizlik_is_hotel_info_rag_not_housekeeping_form():
    orch, rag, _ = build_orchestrator()
    for msg in ("temizlik", "temzilik"):
        rag.called = False
        res = orch.handle(ChatRequest(message=msg, ui_language="tr", locale="tr"))
        assert res.meta.intent == "hotel_info", msg
        assert res.type == "answer", msg
        assert rag.called is True, msg
        assert res.meta.action is None, msg


def test_kettle_single_word_rag_skips_redundant_room_equipment_suffix():
    orch, rag, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="kettle", ui_language="en", locale="en"))
    assert rag.called is True
    assert res.meta.intent == "hotel_info"
    assert "extra in-room" not in res.message.lower()
    assert "room equipment" not in res.message.lower()


def test_oda_ekipmani_typo_is_hanger_not_baby():
    assert (
        extract_request_category_from_text(normalize_text("oda ekipmanıı"))
        == "hanger"
    )


def test_temizlik_kotu_still_complaint():
    orch, _, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="temizlik kötü", ui_language="tr", locale="tr"))
    assert res.meta.intent == "complaint"
    assert res.meta.action and res.meta.action.kind == "open_complaint_form"
    assert res.type == "inform"


def test_mini_disco_schedule_uses_fixed_animation_not_recommendation():
    orch, rag, _ = build_orchestrator()
    for msg in ("mini disco kaçta", "mini disco saat kaçta", "mini club ne zaman", "mini disco saat kaç"):
        res = orch.handle(ChatRequest(message=msg, ui_language="tr", locale="tr"))
        assert res.meta.intent == "hotel_info", msg
        assert res.type == "answer", msg
        assert rag.called is False, msg
        assert "20:45" in res.message or "mini disco" in res.message.lower(), msg


def test_checkout_quick_time_is_hotel_info():
    orch, rag, _ = build_orchestrator()
    # should be treated as hotel check-out time => hotel_info => rag
    res = orch.handle(ChatRequest(message="çıkış kaçta", ui_language="tr", locale="tr"))
    assert res.meta.intent == "hotel_info"
    assert res.type == "answer"
    assert rag.called is True


def test_fault_bathroom_fault_message():
    orch, _, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="duşum bozuldu", ui_language="tr", locale="tr"))
    assert res.meta.intent == "fault_report"
    assert "Su" in res.message or "Banyo" in res.message


def test_where_is_lobby_does_not_fallback():
    orch, rag, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="where is the lobby", ui_language="en", locale="en"))
    assert res.meta.intent == "hotel_info"
    assert res.type == "answer"
    assert rag.called is True
    assert res.meta.source == "rag"
    assert "lobby" in res.message.lower()


def test_zoliakie_is_special_need():
    orch, _, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="Ich habe Zöliakie", ui_language="de", locale="de"))
    assert res.meta.intent == "guest_notification"


def test_polish_towel_request():
    orch, _, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="potrzebuję ręcznika", ui_language="pl", locale="pl"))
    assert res.meta.intent == "request"


def test_late_checkout_opens_guest_notifications_not_reservation():
    orch, _, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="I want late checkout", ui_language="en", locale="en"))
    assert res.meta.intent == "guest_notification"
    assert res.meta.action is not None
    assert res.meta.action.kind == "open_guest_notifications_form"


def test_spa_hours_fixed_answer_opens_spa_module_not_rag():
    orch, rag, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="spa saatleri nedir", ui_language="tr", locale="tr"))
    assert rag.called is False
    assert res.meta.intent == "hotel_info"
    assert res.type == "answer"
    assert res.meta.action is not None
    assert res.meta.action.kind == "open_spa_module"
    assert "la serenite" in res.message.lower() or "09:00" in res.message


def test_spa_massage_price_redirect_opens_spa_module_no_rag():
    orch, rag, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="masaj fiyatları nedir", ui_language="tr", locale="tr"))
    assert rag.called is False
    assert res.meta.intent == "hotel_info"
    assert res.meta.action and res.meta.action.kind == "open_spa_module"
    low = res.message.lower()
    assert "sohbette" in low or "chat" in low or "liste" in low or "module" in low or "modül" in low


def test_moss_menu_redirect_opens_restaurants_module():
    orch, rag, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="Moss restaurant menüsü var mı", ui_language="tr", locale="tr"))
    assert rag.called is False
    assert res.meta.intent == "hotel_info"
    assert res.meta.action and res.meta.action.kind == "open_restaurants_bars_module"


def test_lobby_bar_drink_prices_redirect_opens_restaurants_module():
    orch, rag, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="lobby bar içki fiyat listesi", ui_language="tr", locale="tr"))
    assert rag.called is False
    assert res.meta.action and res.meta.action.kind == "open_restaurants_bars_module"


def test_oda_servisi_routes_hotel_info_rag_not_request_form():
    orch, rag, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="oda servisi", ui_language="tr", locale="tr"))
    assert res.meta.intent == "hotel_info"
    assert res.type == "answer"
    assert rag.called is True
    assert not (res.meta.action and res.meta.action.kind == "chat_form")


def test_oda_servisi_istiyorum_routes_hotel_info_like_plain_room_service():
    orch, rag, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="oda servisi istiyorum", ui_language="tr", locale="tr"))
    assert res.meta.intent == "hotel_info"
    assert res.type == "answer"
    assert rag.called is True
    assert not (res.meta.action and res.meta.action.kind == "chat_form")


def test_fault_category_yok_degilmis_soft_retract_not_repeat_list():
    orch, _, _ = build_orchestrator()
    uid, sid = "u-retract", "s-retract"
    orch.handle(ChatRequest(message="televizyon bozuk", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    r = orch.handle(ChatRequest(message="yok değilmiş", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    assert "kategori seçiniz" not in r.message.lower()
    assert "anladım" in r.message.lower() or "iyi oldu" in r.message.lower()
    assert r.meta.action is None


def test_fault_category_iptal_still_hard_cancel_ack():
    orch, _, _ = build_orchestrator()
    uid, sid = "u-iptal-cat", "s-iptal-cat"
    orch.handle(ChatRequest(message="televizyon bozuk", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    r = orch.handle(ChatRequest(message="iptal", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    assert "iptal ettim" in r.message.lower()


def test_bare_menu_word_opens_restaurants_module_not_restaurant_hours_blob():
    """Yalnız «menü» / «menu» → Restaurant & barlar modülü; uzun restoran saatleri sabit metni değil."""
    orch, rag, _ = build_orchestrator()
    for msg in ("menü", "- menü", "menu"):
        rag.called = False
        res = orch.handle(ChatRequest(message=msg, ui_language="tr", locale="tr"))
        assert res.meta.action and res.meta.action.kind == "open_restaurants_bars_module", msg
        assert rag.called is False, msg
        assert "07:00" not in res.message, msg


def test_menu_with_app_hint_opens_restaurants_module_even_if_longer():
    orch, rag, _ = build_orchestrator()
    msg = "tüm restoran ve bar yemek menülerini uygulamada pdf olarak görmek istiyorum"
    assert len(msg) > 56
    rag.called = False
    res = orch.handle(ChatRequest(message=msg, ui_language="tr", locale="tr"))
    assert res.meta.action and res.meta.action.kind == "open_restaurants_bars_module"
    assert rag.called is False
    assert "07:00" not in res.message


def test_minibar_menu_does_not_trigger_restaurants_bar_redirect():
    orch, rag, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="minibar menüsü", ui_language="tr", locale="tr"))
    assert res.meta.action is None or res.meta.action.kind != "open_restaurants_bars_module"


def test_spa_ucretli_ne_var_is_information_not_price_only_redirect():
    """«Ücretli ne var» bilgi sorusu; yalnız fiyat/tarife sorusunda kısa fiyat yönlendirmesi."""
    orch, rag, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="spa ücretli ne var", ui_language="tr", locale="tr"))
    assert rag.called is False
    assert res.meta.action and res.meta.action.kind == "open_spa_module"
    low = res.message.lower()
    assert "ücretsiz" in low or "free" in low or "ücretli" in low or "paid" in low or "la serenite" in low


def test_bar_menu_typo_opens_restaurants_module():
    orch, rag, _ = build_orchestrator()
    r1 = orch.handle(ChatRequest(message="bar mneü", ui_language="tr", locale="tr"))
    assert r1.meta.action and r1.meta.action.kind == "open_restaurants_bars_module"
    r2 = orch.handle(ChatRequest(message="ar menü", ui_language="tr", locale="tr"))
    assert r2.meta.action and r2.meta.action.kind == "open_restaurants_bars_module"
    r3 = orch.handle(ChatRequest(message="armenü", ui_language="tr", locale="tr"))
    assert r3.meta.action and r3.meta.action.kind == "open_restaurants_bars_module"
    r4 = orch.handle(ChatRequest(message="barmenu", ui_language="tr", locale="tr"))
    assert r4.meta.action and r4.meta.action.kind == "open_restaurants_bars_module"


def test_battiye_typo_var_mi_routes_hotel_info_not_request_form():
    orch, rag, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="battiye var mı", ui_language="tr", locale="tr"))
    assert res.meta.intent == "hotel_info"
    assert not (res.meta.action and res.meta.action.kind == "chat_form")
    assert rag.called is True


def test_iptal_et_is_cancel_hint_not_meat_recommendation():
    """«İptal et» içindeki «et» BBQ önerisi tetiklemesin (kural + net açıklama)."""
    orch, _, intent = build_orchestrator()
    res = orch.handle(ChatRequest(message="iptal et", ui_language="tr", locale="tr"))
    assert res.meta.intent == "chitchat"
    low = res.message.lower()
    assert "sinton" not in low and "bbq" not in low
    assert "iptal" in low or "form" in low or "rezervasyon" in low
    assert intent.calls == 0


def test_odaya_su_gonder_reception_redirect_not_category_menu():
    orch, _, intent = build_orchestrator()
    res = orch.handle(ChatRequest(message="odaya su gönder", ui_language="tr", locale="tr"))
    assert res.meta.intent == "request"
    assert res.type == "redirect"
    assert res.meta.action and res.meta.action.kind == "create_guest_request"
    assert "kategori seçiniz" not in res.message.lower()
    assert "su" in res.message.lower() or "resepsiyon" in res.message.lower()
    assert intent.calls == 0


def test_canonical_room_fault_phrases_all_open_fault_form():
    """Oda / banyo / elektrik tipik arıza cümleleri — hepsi arıza formu (regresyon)."""
    orch, _, _ = build_orchestrator()
    phrases = [
        "Klima çalışmıyor",
        "Klima su akıtıyor",
        "TV sinyal yok",
        "TV açılmıyor",
        "WiFi bağlantı yok",
        "Priz çalışmıyor",
        "Işık yanmıyor",
        "Ampul patlak",
        "Sıcak su yok",
        "Su basıncı düşük",
        "Duş gider tıkalı",
        "Lavabo tıkalı",
        "Klozet sifon bozuk",
        "Kapı kartı çalışmıyor",
        "Kapı kilit arızalı",
        "Mini bar çalışmıyor",
        "Kasa açılmıyor",
        "Telefon çalışmıyor",
        "Perde mekanizması bozuk",
        "Saç kurutma makinesi çalışmıyor",
    ]
    for msg in phrases:
        res = orch.handle(ChatRequest(message=msg, ui_language="tr", locale="tr"))
        assert res.meta.intent == "fault_report", msg
        assert res.type == "inform", msg
        assert res.meta.action and res.meta.action.kind == "chat_form", msg


def test_canonical_tr_guest_request_phrases_open_request_chat_form():
    """Resepsiyon / HK sık talep cümleleri — istek sohbet formu (kategori envanteri)."""
    orch, _, _ = build_orchestrator()
    phrases = [
        "Ek havlu talebi",
        "Yatak düzenleme isteği",
        "Çarşaf değişim talebi",
        "Yastık ek talebi",
        "Battaniye talebi",
        "Oda temizliği isteği",
        "Terlik talebi",
        "Bornoz talebi",
        "Mini bar dolum",
        "Su şişe talebi",
        "Çay kahve seti",
        "Tuvalet kağıdı talebi",
        "Şampuan sabun talebi",
        "Klima ayar isteği",
        "Oda kokusu talebi",
        "Ek askı talebi",
    ]
    for msg in phrases:
        res = orch.handle(ChatRequest(message=msg, ui_language="tr", locale="tr"))
        assert res.meta.intent == "request", msg
        assert res.meta.action and res.meta.action.kind == "chat_form", msg


def test_gec_cikis_talebi_stays_guest_notification_not_request_form():
    orch, _, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="Geç çıkış talebi", ui_language="tr", locale="tr"))
    assert res.meta.intent == "guest_notification"
    assert res.meta.action and res.meta.action.kind == "open_guest_notifications_form"


def test_oda_servisi_talebi_routes_hotel_info_not_request_chat_form():
    orch, rag, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="Oda servisi talebi", ui_language="tr", locale="tr"))
    assert res.meta.intent == "hotel_info"
    assert res.type == "answer"
    assert rag.called is True
    assert not (res.meta.action and res.meta.action.kind == "chat_form")


def test_utu_talebi_routes_fixed_laundry_info_not_request_chat_form():
    orch, rag, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="Ütü talebi", ui_language="tr", locale="tr"))
    assert res.meta.intent == "hotel_info"
    assert res.type == "answer"
    assert rag.called is False
    assert "ütü" in res.message.lower() or "resepsiyon" in res.message.lower() or "housekeeping" in res.message.lower()
    assert not (res.meta.action and res.meta.action.kind == "chat_form")


def test_utu_calismiyor_is_fault_not_hotel_info():
    """Ütü kuru temizleme bilgisinde; arıza ifadesi varsa RAG/sabit bilgi değil arıza formu."""
    orch, rag, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="ütü çalışmıyor", ui_language="tr", locale="tr"))
    assert res.meta.intent == "fault_report"
    assert rag.called is False
    assert res.meta.action and res.meta.action.kind == "chat_form"


def test_fault_words_block_early_room_supply_and_inventory_request():
    """Arıza sinyali varken erken minibar/kettle veya envanter+istek yolu istek formunu öne almasın."""
    orch, _, _ = build_orchestrator()
    for msg in (
        "Minibar dolum istiyorum çalışmıyor",
        "su ısıtıcısı istiyorum bozuk",
        "Please refill minibar, not working",
    ):
        r = orch.handle(ChatRequest(message=msg, ui_language="en", locale="en"))
        assert r.meta.intent == "fault_report", msg
        assert r.meta.action and r.meta.action.kind == "chat_form", msg


def test_multilingual_priority_fault_phrases_open_fault_form():
    """Su basıncı / gider / TV sinyal / ampul / Wi‑Fi bağlantı — EN·DE·PL eşdeğerleri arıza formu."""
    orch, _, _ = build_orchestrator()
    cases = [
        ("en", "no hot water"),
        ("en", "wifi no connection"),
        ("de", "abfluss verstopft"),
        ("de", "waschbecken verstopft"),
        ("de", "fernseher kein signal"),
        ("pl", "brak ciepłej wody"),
        ("pl", "telewizor brak sygnału"),
        ("pl", "zatkany prysznic"),
    ]
    for ui, msg in cases:
        res = orch.handle(ChatRequest(message=msg, ui_language=ui, locale=ui))
        assert res.meta.intent == "fault_report", (ui, msg)
        assert res.meta.action and res.meta.action.kind == "chat_form", (ui, msg)


def test_odam_su_akityor_is_fault_not_water_request():
    """«Su» tek başına içme suyu talebi; «su akıtıyor» / kaçak → arıza formu (Su/Banyo)."""
    orch, _, intent = build_orchestrator()
    res = orch.handle(ChatRequest(message="odam su akıtıyor", ui_language="tr", locale="tr"))
    assert res.meta.intent == "fault_report"
    assert res.type == "inform"
    assert res.meta.action and res.meta.action.kind == "chat_form"
    low = res.message.lower()
    assert "kategori" in low
    assert "su" in res.message.lower() or "banyo" in low
    assert intent.calls == 0


def test_ceiling_water_leak_en_fault():
    orch, _, intent = build_orchestrator()
    res = orch.handle(ChatRequest(message="water dripping from the ceiling in my room", ui_language="en", locale="en"))
    assert res.meta.intent == "fault_report"
    assert res.type == "inform"
    assert res.meta.action and res.meta.action.kind == "chat_form"
    assert intent.calls == 0


def test_priz_kivilcim_priority_fault_not_request():
    orch, _, intent = build_orchestrator()
    res = orch.handle(ChatRequest(message="prizden kıvılcım çıkıyor", ui_language="tr", locale="tr"))
    assert res.meta.intent == "fault_report"
    assert res.meta.action and res.meta.action.kind == "chat_form"
    assert intent.calls == 0


def test_yarin_after_animation_program_gets_context_followup_not_greeting():
    orch, rag, _ = build_orchestrator()
    uid, sid = "u-anim-yar", "s-anim-yar"
    r1 = orch.handle(
        ChatRequest(message="animasyon programı", ui_language="tr", locale="tr", user_id=uid, session_id=sid)
    )
    assert r1.meta.intent == "hotel_info"
    assert rag.called is False
    r2 = orch.handle(ChatRequest(message="yarın", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    assert r2.meta.intent == "hotel_info"
    low = r2.message.lower()
    assert "merhaba, ben viona" not in low
    assert "resepsiyon" in low or "program" in low or "animasyon" in low or "sezon" in low


def test_yarin_after_animation_wins_over_reservation_session_hint():
    """Rezervasyon modülüne girdikten sonra bile son tur animasyon programıysa «yarın» animasyon takibinde kalmalı."""
    orch, rag, _ = build_orchestrator()
    uid, sid = "u-anim-res", "s-anim-res"
    orch.handle(ChatRequest(message="rezervasyon", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    orch.handle(
        ChatRequest(message="animasyon programı", ui_language="tr", locale="tr", user_id=uid, session_id=sid)
    )
    r3 = orch.handle(ChatRequest(message="yarın", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    assert r3.meta.intent == "hotel_info"
    low = r3.message.lower()
    assert "rezervasyonlar bölüm" not in low
    assert "merhaba, ben viona" not in low
    assert "gündüz" in low or "animasyon" in low or "resepsiyon" in low or "program" in low


def test_polish_animation_program_uses_fixed_animation_not_rag():
    orch, rag, _ = build_orchestrator()
    res = orch.handle(
        ChatRequest(
            message="program animacji hotelu",
            ui_language="pl",
            locale="pl",
            user_id="u-pl-anim",
            session_id="s-pl",
        )
    )
    assert res.meta.intent == "hotel_info"
    assert rag.called is False


def test_rule_match_does_not_call_llm():
    orch, _, intent = build_orchestrator()
    res = orch.handle(ChatRequest(message="televizyonum bozuldu", ui_language="tr", locale="tr"))
    assert res.meta.intent == "fault_report"
    assert intent.calls == 0


def test_same_input_same_output():
    orch, _, _ = build_orchestrator()
    one = orch.handle(
        ChatRequest(message="havlu lazım", ui_language="tr", locale="tr", user_id="u-a", session_id="s-a")
    )
    two = orch.handle(
        ChatRequest(message="havlu lazım", ui_language="tr", locale="tr", user_id="u-b", session_id="s-b")
    )
    assert one.type == two.type
    assert one.message == two.message
    assert one.meta.intent == two.meta.intent


def test_turkish_gluten_allergen_label_not_detected_as_english():
    ls = LanguageService()
    assert ls.detect("alerjen- gluten hassasiyeti", "en") == "tr"
    assert ls.detect("Alerjen Gluten Hassasiyeti", "en") == "tr"
    assert ls.detect("i have gluten sensitivity", "tr") == "en"
    assert ls.detect("glutenfrei bitte", "en") == "de"


def test_special_need_gluten_tr_even_when_ui_locale_is_english():
    """Selected UI/session language should have priority for reply language."""
    orch, _, _ = build_orchestrator()
    res = orch.handle(
        ChatRequest(
            message="Alerjen- Gluten Hassasiyeti",
            ui_language="en",
            locale="en",
        )
    )
    assert res.meta.intent == "guest_notification"
    assert res.meta.language == "en"
    assert "category" in res.message.lower() or "Beslenme" in res.message or "Diet" in res.message

    res2 = orch.handle(
        ChatRequest(
            message="alerjen ve gluten hassasiyetim var",
            ui_language="en",
            locale="en",
        )
    )
    assert res2.meta.intent == "guest_notification"
    assert res2.meta.language == "en"
    assert "category" in res2.message.lower() or "Beslenme" in res2.message


def test_single_token_special_need_labels_in_tr():
    orch, _, _ = build_orchestrator()
    for msg in ["alerjen", "hassasiyet", "gluten"]:
        res = orch.handle(ChatRequest(message=msg, ui_language="tr", locale="tr"))
        assert res.meta.intent == "guest_notification"
        assert res.meta.language == "tr"


def test_recommendation_short_food_inputs():
    orch, _, intent = build_orchestrator()
    fish = orch.handle(ChatRequest(message="balık", ui_language="tr", locale="tr"))
    meat = orch.handle(ChatRequest(message="en sevdiğim şey et", ui_language="tr", locale="tr"))
    coffee = orch.handle(ChatRequest(message="kahve istiyorum", ui_language="tr", locale="tr"))
    assert fish.meta.intent == "recommendation"
    assert meat.meta.intent == "recommendation"
    assert coffee.meta.intent == "request"
    assert coffee.meta.action and coffee.meta.action.kind == "chat_form"
    assert "Mare" not in fish.message
    assert "Moss" in fish.message or "La Terrace" in fish.message or "Terrace" in fish.message
    assert "Sinton" in meat.message
    low_c = coffee.message.lower()
    assert (
        "kahve" in low_c
        or "çay" in low_c
        or "tea" in low_c
        or "coffee" in low_c
        or (coffee.meta.action.step == "full_name" and "teşekkür" in low_c)
    )
    assert intent.calls == 0


def test_routing_housekeeping_transfer_and_lunch_box():
    orch, _, intent = build_orchestrator()
    hk = orch.handle(
        ChatRequest(
            message="oda temizliği istiyorum",
            ui_language="tr",
            locale="tr",
            user_id="u-hk",
            session_id="s-hk",
        )
    )
    trf = orch.handle(
        ChatRequest(
            message="transfer istiyorum",
            ui_language="tr",
            locale="tr",
            user_id="u-trf",
            session_id="s-trf",
        )
    )
    lbox = orch.handle(
        ChatRequest(
            message="lunch box istiyorum",
            ui_language="tr",
            locale="tr",
            user_id="u-lb",
            session_id="s-lb",
        )
    )
    assert hk.meta.intent == "request"
    assert trf.meta.intent == "hotel_info"
    assert lbox.meta.intent == "request"
    hk_low = hk.message.lower()
    assert (
        "housekeeping" in hk_low
        or "temizliği" in hk_low
        or "oda temizliği" in hk_low
        or "genel temizlik" in hk_low
        or "general_cleaning" in hk_low
        or "towel_change" in hk_low
        or "room_check" in hk_low
        or "zaman" in hk_low
        or "şimdi" in hk_low
        or "timing" in hk_low
    )
    assert "transfer" in trf.message.lower()
    assert trf.meta.action and trf.meta.action.kind == "open_transfer_module"
    assert "20:00" in lbox.message
    assert intent.calls == 0


def test_transfer_module_not_opened_for_english_transferred():
    """«transferred» içinde «transfer» alt dizgisi vardı; yanlışlıkla transfer modülü açılmasın."""
    orch, _, intent = build_orchestrator()
    r = orch.handle(
        ChatRequest(
            message="I was transferred to another room",
            ui_language="en",
            locale="en",
        )
    )
    kind = getattr(r.meta.action, "kind", None) if r.meta.action else None
    assert kind != "open_transfer_module"


def test_transfer_routing_helper_rejects_transferred_substring():
    from assistant.services.rule_engine import _text_matches_transfer_routing_intent
    from assistant.utils.text_normalizer import normalize_text

    assert not _text_matches_transfer_routing_intent(normalize_text("I was transferred to another room"))
    assert _text_matches_transfer_routing_intent(normalize_text("transfer"))
    assert _text_matches_transfer_routing_intent(normalize_text("transfer istiyorum"))


def test_transfer_standalone_word_still_opens_transfer_module():
    orch, _, intent = build_orchestrator()
    r = orch.handle(ChatRequest(message="transfer", ui_language="tr", locale="tr"))
    assert r.meta.action and r.meta.action.kind == "open_transfer_module"
    assert intent.calls == 0


def test_routing_guest_relations_contact_and_generic_problem():
    orch, _, intent = build_orchestrator()
    gr = orch.handle(ChatRequest(message="misafir ilişkilerine bağlanmak istiyorum", ui_language="tr", locale="tr"))
    prob = orch.handle(ChatRequest(message="bir sorunum var", ui_language="tr", locale="tr"))
    assert gr.meta.intent == "request"
    assert "misafir" in gr.message.lower()
    assert prob.meta.intent == "complaint"
    assert prob.meta.action is None
    assert "resepsiyon" in prob.message.lower()
    assert intent.calls == 0


def test_fault_internet_and_minibar_variants():
    orch, _, intent = build_orchestrator()
    internet = orch.handle(ChatRequest(message="internet çekmiyor", ui_language="tr", locale="tr"))
    minibar = orch.handle(ChatRequest(message="minibar soğutmuyor", ui_language="tr", locale="tr"))
    assert internet.meta.intent == "fault_report"
    assert minibar.meta.intent == "fault_report"
    assert internet.type == "inform"
    assert minibar.type == "inform"
    assert intent.calls == 0


def test_fault_tv_ses_gelmiyor_and_technical_problem_en():
    orch, _, intent = build_orchestrator()
    tr = orch.handle(ChatRequest(message="televizyon ses gelmiyor", ui_language="tr", locale="tr"))
    en = orch.handle(ChatRequest(message="The TV has a technical problem", ui_language="en", locale="en"))
    assert tr.meta.intent == "fault_report"
    assert en.meta.intent == "fault_report"
    assert intent.calls == 0


def test_request_battaniye_gerekiyor_and_getirebilir_misiniz():
    orch, _, intent = build_orchestrator()
    g = orch.handle(ChatRequest(message="battaniye gerekiyor", ui_language="tr", locale="tr"))
    s = orch.handle(ChatRequest(message="ek havlu getirebilir misiniz", ui_language="tr", locale="tr"))
    assert g.meta.intent == "request"
    assert s.meta.intent == "request"
    assert g.meta.action and g.meta.action.kind == "chat_form"
    assert s.meta.action and s.meta.action.kind == "chat_form"
    assert intent.calls == 0


def test_gluten_typo_guluten_maps_to_special_need():
    orch, _, intent = build_orchestrator()
    res = orch.handle(ChatRequest(message="guluten yiyemem", ui_language="tr", locale="tr"))
    assert res.meta.intent == "guest_notification"
    assert res.type == "inform"
    assert intent.calls == 0


def test_please_speakig_english_typo_switch():
    orch, _, intent = build_orchestrator()
    res = orch.handle(ChatRequest(message="Please speakig English", ui_language="tr", locale="tr"))
    assert res.meta.intent == "chitchat"
    assert res.meta.language == "en"
    assert "English" in res.message
    assert intent.calls == 0


def test_implicit_drift_disabled_by_default():
    orch, _, intent = build_orchestrator()
    res = orch.handle(
        ChatRequest(
            message="thanks",
            ui_language="tr",
            locale="tr",
            conversation_language="tr",
        )
    )
    assert res.meta.intent == "chitchat"
    assert res.meta.language == "tr"
    assert intent.calls == 0


def test_explicit_language_switch_can_be_disabled_with_config():
    orch, _, intent = build_orchestrator()
    orch.settings.allow_explicit_language_switch = False
    res = orch.handle(ChatRequest(message="ingilizce konuş", ui_language="tr", locale="tr"))
    assert res.meta.intent == "chitchat"
    assert res.meta.language == "tr"
    assert "I'll reply in English" not in res.message
    assert intent.calls == 0


def test_lunch_box_phrase_not_misrouted_as_transfer():
    orch, _, intent = build_orchestrator()
    res = orch.handle(ChatRequest(message="lunch box istiyorum", ui_language="tr", locale="tr"))
    assert res.meta.intent == "request"
    assert "20:00" in res.message
    assert "transfer" not in res.message.lower()
    assert intent.calls == 0


def test_operational_phrase_not_misrouted_as_recommendation():
    orch, _, intent = build_orchestrator()
    res = orch.handle(ChatRequest(message="resepsiyonla görüşmek istiyorum", ui_language="tr", locale="tr"))
    assert res.meta.intent == "request"
    assert res.type == "redirect"
    assert "resepsiyon" in res.message.lower()
    assert "Mare" not in res.message
    assert intent.calls == 0


def test_allergy_phrase_not_misrouted_as_food_recommendation():
    orch, _, intent = build_orchestrator()
    res = orch.handle(ChatRequest(message="gluten alerjim var", ui_language="tr", locale="tr"))
    assert res.meta.intent == "guest_notification"
    assert res.type == "inform"
    assert "kategori" in res.message.lower() or "Beslenme" in res.message
    assert "Mare" not in res.message
    assert intent.calls == 0


def test_multi_clause_fault_and_recommendation_returns_combined_answer():
    orch, _, intent = build_orchestrator()
    res = orch.handle(
        ChatRequest(
            message="klima bozuk ayrıca akşam yemek için önerin var mı",
            ui_language="tr",
            locale="tr",
        )
    )
    assert res.meta.intent == "fault_report"
    assert res.type == "redirect"
    assert "Klima arızası" in res.message
    assert (
        "Restaurant" in res.message
        or "restoran" in res.message.lower()
        or "Spa" in res.message
        or "spa" in res.message.lower()
    )
    assert res.meta.multi_intent is True
    assert res.meta.action is not None
    assert res.meta.action.kind == "create_guest_request"
    assert intent.calls == 0


def test_food_decision_and_romantic_queries_route_to_recommendation():
    orch, _, intent = build_orchestrator()
    undecided = orch.handle(ChatRequest(message="bugün ne yesem karar veremedim", ui_language="tr", locale="tr"))
    romantic = orch.handle(ChatRequest(message="akşam romantik bir yemek istiyorum ne önerirsin", ui_language="tr", locale="tr"))
    assert undecided.meta.intent == "recommendation"
    assert romantic.meta.intent == "recommendation"
    assert "Restaurant" in romantic.message or "restoran" in romantic.message.lower()
    assert intent.calls == 0


def test_kid_night_food_and_early_departure_queries_are_routed_deterministically():
    orch, _, intent = build_orchestrator()
    kid = orch.handle(ChatRequest(message="çocuğum var 5 yaşında onun için ne var", ui_language="tr", locale="tr"))
    night_food = orch.handle(ChatRequest(message="gece 12 de yemek var mı", ui_language="tr", locale="tr"))
    early = orch.handle(ChatRequest(message="yarın sabah erken çıkacağım bana ne önerirsin", ui_language="tr", locale="tr"))
    assert kid.meta.intent == "recommendation"
    assert "Mini Club" in kid.message or "Çocuk" in kid.message
    assert night_food.meta.intent == "hotel_info"
    assert "23:30-00:00" in night_food.message
    assert early.meta.intent == "request"
    assert "20:00" in early.message
    assert intent.calls == 0


def test_outside_hotel_tired_and_seafood_dislike_cases():
    orch, _, intent = build_orchestrator()
    outside = orch.handle(ChatRequest(message="otel dışında bir şey önerir misin", ui_language="tr", locale="tr"))
    tired = orch.handle(ChatRequest(message="çok yorgunum bana uygun bir aktivite öner", ui_language="tr", locale="tr"))
    seafood = orch.handle(ChatRequest(message="eşim deniz ürünü sevmiyor bana ne önerirsin", ui_language="tr", locale="tr"))
    assert outside.meta.intent == "hotel_info"
    assert ("3 km" in outside.message) or ("resepsiyon" in outside.message.lower())
    assert tired.meta.intent == "hotel_info"
    assert "Spa" in tired.message or "spa" in tired.message
    assert tired.meta.action is not None and tired.meta.action.kind == "open_spa_module"
    assert seafood.meta.intent == "recommendation"
    assert "Sinton" in seafood.message
    assert intent.calls == 0


def test_stomach_sensitive_routes_to_special_need():
    orch, _, intent = build_orchestrator()
    res = orch.handle(ChatRequest(message="midem hassas ne yemeliyim", ui_language="tr", locale="tr"))
    assert res.meta.intent == "guest_notification"
    assert "kategori" in res.message.lower() or "Beslenme" in res.message
    assert intent.calls == 0


def test_gluten_plus_pizza_prioritizes_special_need_safety():
    orch, _, intent = build_orchestrator()
    res = orch.handle(ChatRequest(message="gluten hassasiyetim var ama pizza yemek istiyorum", ui_language="tr", locale="tr"))
    assert res.meta.intent == "guest_notification"
    assert "kategori" in res.message.lower() or "Beslenme" in res.message
    assert res.meta.multi_intent is True
    assert "Dolphin Snack" not in res.message
    assert intent.calls == 0


def test_child_plus_adult_activity_multi_intent_contains_both_sides():
    orch, _, intent = build_orchestrator()
    res = orch.handle(
        ChatRequest(
            message="çocuk var ama akşam yetişkin aktivitesi de yapmak istiyorum",
            ui_language="tr",
            locale="tr",
        )
    )
    assert res.meta.intent in ("recommendation", "hotel_info")
    assert ("Mini Club" in res.message) or ("Çocuk" in res.message)
    assert ("Akşam" in res.message) or ("animasyon" in res.message.lower()) or ("DJ" in res.message)
    assert intent.calls == 0


def test_short_thanks_does_not_fall_back_to_greeting():
    orch, _, intent = build_orchestrator()
    res = orch.handle(ChatRequest(message="teşekkür", ui_language="tr", locale="tr"))
    assert res.meta.intent == "chitchat"
    assert res.meta.multi_intent is False
    assert any(x in res.message.lower() for x in ("rica ederim", "teşekkür", "ne demek"))
    assert "merhaba" not in res.message.lower()
    assert intent.calls == 0


def test_ice_cream_phrases_use_fixed_hotel_info_without_llm_or_rag():
    orch, rag, intent = build_orchestrator()
    for msg in (
        "canım dondurma çekti",
        "dondurma",
        "dondurma var mı otelde",
    ):
        res = orch.handle(ChatRequest(message=msg, ui_language="tr", locale="tr"))
        assert res.meta.intent == "hotel_info"
        assert res.type == "answer"
        assert "15:00" in res.message and "17:00" in res.message
        assert "Havuz Bar" in res.message or "havuz bar" in res.message.lower()
        assert intent.calls == 0
    assert rag.called is False


def test_ice_cream_german_eis_token_uses_fixed_info():
    orch, _, intent = build_orchestrator()
    res = orch.handle(
        ChatRequest(
            message="ich möchte eis",
            ui_language="de",
            locale="de",
            conversation_language="de",
        )
    )
    assert res.meta.intent == "hotel_info"
    assert res.type == "answer"
    assert "15:00" in res.message and "17:00" in res.message
    assert intent.calls == 0


def test_sweet_craving_phrase_routes_to_dessert_recommendation():
    orch, _, intent = build_orchestrator()
    res = orch.handle(ChatRequest(message="canım tatlı çekti", ui_language="tr", locale="tr"))
    assert res.meta.intent == "recommendation"
    assert res.type == "answer"
    assert intent.calls == 0


def test_full_operational_routing_matrix():
    """Muaf istek, rezervasyon, geç çıkış, şikâyet, misafir bildirimi alt grupları ve arıza — doğru aksiyon."""
    n = 0

    def run(msg: str, *, ui="tr", loc="tr"):
        nonlocal n
        n += 1
        orch, rag, intent = build_orchestrator()
        r = orch.handle(
            ChatRequest(
                message=msg,
                ui_language=ui,
                locale=loc,
                user_id=f"full-op-{n}",
                session_id=f"full-op-{n}",
            )
        )
        return r, rag, intent

    # Geç çıkış → uygulama misafir bildirimi formu (sohbet adımı yok).
    r, _, intent = run("geç çıkış istiyorum")
    assert r.meta.intent == "guest_notification"
    assert r.meta.action and r.meta.action.kind == "open_guest_notifications_form"
    assert "geç çıkış" in r.message.lower()
    assert intent.calls == 0

    # Transfer → sabit bilgi + Transfer modülü düğmesi (misafir kaydı create_guest_request değil).
    r, _, intent = run("transfer istiyorum")
    assert r.meta.intent == "hotel_info"
    assert r.type == "answer"
    assert r.meta.action and r.meta.action.kind == "open_transfer_module"
    assert "transfer" in r.message.lower()
    assert intent.calls == 0

    for phrase, needle in (
        ("öğle paketi istiyorum", "20:00"),
        ("resepsiyonla görüşmek istiyorum", "resepsiyon"),
    ):
        r, _, intent = run(phrase)
        assert r.meta.intent == "request", phrase
        assert r.type == "redirect", phrase
        assert r.meta.action and r.meta.action.kind == "create_guest_request", phrase
        assert needle in r.message.lower(), phrase
        assert intent.calls == 0

    r, _, intent = run("misafir ilişkilerine bağlanmak istiyorum")
    assert r.meta.intent == "request"
    assert r.type == "redirect"
    assert r.meta.action and r.meta.action.kind == "create_guest_request"
    assert "misafir" in r.message.lower()
    assert intent.calls == 0

    # Erken giriş → yalnız premium resepsiyon metni (buton yok).
    r, _, intent = run("erken giriş talep ediyorum")
    assert r.meta.intent == "reservation"
    assert r.type == "inform"
    assert r.meta.action is None
    assert "resepsiyon" in r.message.lower() or "ön büro" in r.message.lower()
    assert intent.calls == 0

    r, _, intent = run("rezervasyon yaptırmak istiyorum")
    assert r.meta.intent == "reservation"
    assert r.type == "inform"
    assert r.meta.action is None
    assert "resepsiyon" in r.message.lower() or "ön büro" in r.message.lower()
    assert intent.calls == 0

    # Şikâyet → yönlendirme metni, sohbet formu yok.
    for phrase in ("komşu çok gürültülü şikayet", "oda pis şikayetçiyim"):
        r, _, intent = run(phrase)
        assert r.meta.intent == "complaint", phrase
        assert r.type == "inform", phrase
        assert r.meta.action and r.meta.action.kind == "open_complaint_form", phrase
        assert intent.calls == 0

    # Misafir bildirimi (tüm kategoriler) → sohbet formu, birleşik kategori ağacı.
    r, _, intent = run("misafir bildirimi doldurmak istiyorum")
    assert r.meta.intent == "guest_notification"
    assert r.meta.action and r.meta.action.kind == "chat_form"
    assert r.meta.action.operation == "guest_notification"
    low = r.message.lower()
    assert "beslenme / hassasiyet:" in low and "sağlık / özel durum:" in low
    assert intent.calls == 0

    # Sağlık grubu — kutlama listesi değil.
    r, _, intent = run("hamileyim bilgi vermek istiyorum")
    assert r.meta.intent == "guest_notification"
    assert r.meta.action and r.meta.action.kind == "chat_form"
    assert r.meta.action.operation == "guest_notification"
    assert "doğum günü" not in r.message.lower()
    assert intent.calls == 0

    # Kutlama grubu — diyet listesi değil.
    r, _, intent = run("evlilik yıldönümü kutlaması")
    assert r.meta.intent == "guest_notification"
    assert r.meta.action and r.meta.action.kind == "chat_form"
    assert "alerjen bildirimi" not in r.message.lower()
    assert intent.calls == 0

    # İstek formu örnekleri.
    for phrase in ("battaniye lazım", "kettle istiyorum"):
        r, _, intent = run(phrase)
        assert r.meta.intent == "request", phrase
        assert r.meta.action and r.meta.action.kind == "chat_form", phrase
        assert r.meta.action.operation == "request", phrase
        assert intent.calls == 0

    r, _, intent = run("priz çalışmıyor")
    assert r.meta.intent == "fault_report"
    assert r.meta.action and r.meta.action.kind == "chat_form"
    assert r.meta.action.operation == "fault"
    assert intent.calls == 0


def test_multilingual_operational_routing_matrix_en_de_pl():
    """İngilizce öncelikli: aynı operasyonel ağaç EN/DE/PL’de doğru niyet + yanıt dili + aksiyon."""
    n = 0

    def run(msg: str, lang: str):
        nonlocal n
        n += 1
        orch, _, intent = build_orchestrator()
        r = orch.handle(
            ChatRequest(
                message=msg,
                ui_language=lang,
                locale=lang,
                conversation_language=lang,
                user_id=f"i18n-op-{n}",
                session_id=f"i18n-op-{n}",
            )
        )
        assert r.meta.language == lang, msg
        assert r.meta.ui_language == lang, msg
        assert intent.calls == 0, msg
        return r

    # —— English ——
    r = run("late checkout please", "en")
    assert r.meta.intent == "guest_notification"
    assert r.meta.action and r.meta.action.kind == "open_guest_notifications_form"
    assert "late" in r.message.lower()

    r = run("I need towels", "en")
    assert r.meta.intent == "request"
    assert r.meta.action and r.meta.action.kind == "chat_form"
    assert r.meta.action.operation == "request"

    orch_chk, rag_chk, _ = build_orchestrator()
    r_chk = orch_chk.handle(
        ChatRequest(
            message="I need to know what time checkout is",
            ui_language="en",
            locale="en",
            conversation_language="en",
            user_id="i18n-checkout",
            session_id="i18n-checkout",
        )
    )
    assert r_chk.meta.intent == "hotel_info"
    assert r_chk.type == "answer"
    assert rag_chk.called is True

    r = run("minibar is empty", "en")
    assert r.meta.intent == "request"
    assert r.meta.action and r.meta.action.kind == "chat_form"

    r = run("airport transfer please", "en")
    assert r.meta.intent == "hotel_info"
    assert r.type == "answer"
    assert r.meta.action and r.meta.action.kind == "open_transfer_module"

    for phrase in ("lunch box please", "speak to front desk"):
        r = run(phrase, "en")
        assert r.meta.intent == "request"
        assert r.type == "redirect"
        assert r.meta.action and r.meta.action.kind == "create_guest_request"

    r = run("connect me to guest relations", "en")
    assert r.meta.intent == "request"
    assert r.type == "redirect"
    assert r.meta.action and r.meta.action.kind == "create_guest_request"

    r = run("early check-in request", "en")
    assert r.meta.intent == "reservation"
    assert r.type == "inform"
    assert r.meta.action is None
    assert "reception" in r.message.lower() or "front desk" in r.message.lower()

    r = run("I want to make a reservation", "en")
    assert r.meta.intent == "reservation"
    assert r.type == "inform"
    assert r.meta.action is None
    assert "reception" in r.message.lower() or "front desk" in r.message.lower()

    for phrase in ("awful noise from neighbors", "the cleaning is terrible"):
        r = run(phrase, "en")
        assert r.meta.intent == "complaint"
        assert r.meta.action and r.meta.action.kind == "open_complaint_form"

    r = run("I want to fill out a guest notification", "en")
    assert r.meta.intent == "guest_notification"
    assert r.meta.action and r.meta.action.kind == "chat_form"
    low = r.message.lower()
    assert "diet / sensitivity:" in low and "health / special situation:" in low

    r = run("I am pregnant", "en")
    assert r.meta.intent == "guest_notification"
    assert r.meta.action and r.meta.action.kind == "chat_form"
    assert "birthday" not in r.message.lower()

    r = run("honeymoon celebration", "en")
    assert r.meta.intent == "guest_notification"
    assert r.meta.action and r.meta.action.kind == "chat_form"
    assert "allergen" not in r.message.lower()

    r = run("can i get a crib", "en")
    assert r.meta.intent == "request"
    assert r.meta.action and r.meta.action.kind == "chat_form"

    r = run("shower is broken", "en")
    assert r.meta.intent == "fault_report"
    assert r.meta.action and r.meta.action.kind == "chat_form"
    assert r.meta.action.operation == "fault"

    # —— German ——
    r = run("später check-out bitte", "de")
    assert r.meta.intent == "guest_notification"
    assert r.meta.action and r.meta.action.kind == "open_guest_notifications_form"
    assert "check" in r.message.lower()

    r = run("ich brauche handtücher", "de")
    assert r.meta.intent == "request"
    assert r.meta.action and r.meta.action.kind == "chat_form"

    r = run("Beschwerde wegen Lärm", "de")
    assert r.meta.intent == "complaint"
    assert r.meta.action and r.meta.action.kind == "open_complaint_form"

    r = run("Ich bin vegan", "de")
    assert r.meta.intent == "guest_notification"
    assert r.meta.action and r.meta.action.kind == "chat_form"

    # —— Polish ——
    r = run("późne wymeldowanie", "pl")
    assert r.meta.intent == "guest_notification"
    assert r.meta.action and r.meta.action.kind == "open_guest_notifications_form"

    r = run("potrzebuję ręcznika", "pl")
    assert r.meta.intent == "request"
    assert r.meta.action and r.meta.action.kind == "chat_form"

    r = run("skarga na hałas", "pl")
    assert r.meta.intent == "complaint"
    assert r.meta.action and r.meta.action.kind == "open_complaint_form"


def test_request_form_detail_enum_allows_switch_before_valid_choice():
    """detail_enum adımında geçerli seçim yokken başka talebe geçilebilir (oda temizliği zamanı → battaniye)."""
    orch, _, _ = build_orchestrator()
    uid, sid = "u-lock-timing", "s-lock-timing"
    r1 = orch.handle(
        ChatRequest(
            message="oda temizliği istiyorum",
            ui_language="tr",
            locale="tr",
            user_id=uid,
            session_id=sid,
        )
    )
    assert r1.meta.action and r1.meta.action.step == "detail_enum"
    low1 = r1.message.lower()
    assert "zaman" in low1 or "şimdi" in low1 or "sonra" in low1 or "timing" in low1
    r2 = orch.handle(
        ChatRequest(message="battaniye lazım", ui_language="tr", locale="tr", user_id=uid, session_id=sid)
    )
    assert r2.meta.intent == "request"
    assert r2.meta.action and r2.meta.action.step in ("detail_int", "detail_enum", "description")
    low = r2.message.lower()
    assert "battaniye" in low or "blanket" in low
    assert "zaman" not in low and "şimdi" not in low and "sonra" not in low


def test_request_form_detail_enum_off_topic_can_answer_hotel_info():
    orch, rag, _ = build_orchestrator()
    uid, sid = "u-lock-mb", "s-lock-mb"
    r1 = orch.handle(
        ChatRequest(
            message="oda temizliği istiyorum",
            ui_language="tr",
            locale="tr",
            user_id=uid,
            session_id=sid,
        )
    )
    assert r1.meta.action and r1.meta.action.step == "detail_enum"
    rag.called = False
    r2 = orch.handle(ChatRequest(message="havuz saatleri", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    assert r2.meta.intent == "hotel_info"
    assert rag.called is True


def test_request_form_locks_after_valid_enum_choice_on_detail_int():
    """detail_int adımında sayı yerine serbest metin girilirse konu değişmez; pozitif sayı istenir."""
    orch, rag, _ = build_orchestrator()
    uid, sid = "u-lock-post", "s-lock-post"
    r1 = orch.handle(
        ChatRequest(message="havlu talep ediyorum", ui_language="tr", locale="tr", user_id=uid, session_id=sid)
    )
    assert r1.meta.action and r1.meta.action.step == "detail_int"
    rag.called = False
    r3 = orch.handle(
        ChatRequest(message="battaniye lazım", ui_language="tr", locale="tr", user_id=uid, session_id=sid)
    )
    assert r3.meta.intent == "request"
    assert r3.meta.action and r3.meta.action.step == "detail_int"
    mlow = r3.message.lower()
    assert (
        "pozitif" in mlow
        or "sayı" in mlow
        or "positive" in mlow
        or "number" in mlow
        or "zahl" in mlow
    )
    assert rag.called is False


def test_guest_notification_category_step_allows_temizlik_info_switch():
    """Yalnız kategori listesindeyken «temizlik» bilgi sorusuna geçilebilir."""
    orch, rag, _ = build_orchestrator()
    uid, sid = "u-cat-tem", "s-cat-tem"
    r1 = orch.handle(
        ChatRequest(
            message="misafir bildirimi doldurmak istiyorum",
            ui_language="tr",
            locale="tr",
            user_id=uid,
            session_id=sid,
        )
    )
    assert r1.meta.intent == "guest_notification"
    assert r1.meta.action and r1.meta.action.step == "category"
    rag.called = False
    r2 = orch.handle(ChatRequest(message="temizlik", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    assert r2.meta.intent == "hotel_info"
    assert rag.called is True


def test_sikayetciyim_with_noise_gets_complaint_form_button():
    orch, _, _ = build_orchestrator()
    res = orch.handle(
        ChatRequest(message="gürültüden şikayetçiyim", ui_language="tr", locale="tr", user_id="u-sn", session_id="s-sn")
    )
    assert res.meta.intent == "complaint"
    assert res.meta.action and res.meta.action.kind == "open_complaint_form"


def test_full_name_rejects_ah_requires_two_words():
    orch, _, _ = build_orchestrator()
    uid, sid = "u-fn-ah", "s-fn-ah"
    for m in ("priz çalışmıyor", "2", "1", "1", "not"):
        orch.handle(ChatRequest(message=m, ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    r = orch.handle(ChatRequest(message="ah", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    assert r.meta.action and r.meta.action.step == "full_name"
    assert "iki kelime" in r.message.lower() or "two words" in r.message.lower()


def test_reservation_short_followup_after_redirect_links_context():
    orch, _, _ = build_orchestrator()
    uid, sid = "u-rsv", "s-rsv"
    r1 = orch.handle(ChatRequest(message="rezervasyon", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    assert r1.meta.intent == "reservation"
    r2 = orch.handle(ChatRequest(message="yarınki", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    assert r2.meta.intent == "reservation"
    low = r2.message.lower()
    assert (
        "resepsiyon" in low
        or "misafir" in low
        or "spa" in low
        or "rezervasyon" in low
        or "uygulama" in low
        or "app" in low
    )


def test_spa_booking_handoff_inform_no_module_action():
    orch, _, _ = build_orchestrator()
    r = orch.handle(
        ChatRequest(message="spa masaj randevusu almak istiyorum", ui_language="tr", locale="tr")
    )
    assert r.meta.intent == "request"
    assert r.type == "inform"
    assert r.meta.action is None
    low = r.message.lower()
    assert "spa" in low or "serenite" in low
    assert "5025" in r.message


def test_kuafor_hizmeti_fixed_contact_answer():
    orch, rag, _ = build_orchestrator()
    r = orch.handle(ChatRequest(message="kuaför hizmeti var mı fiyat almak istiyorum", ui_language="tr", locale="tr"))
    assert r.meta.intent == "hotel_info"
    assert "546" in r.message.replace(" ", "") or "+90" in r.message
    assert "608" in r.message.replace(" ", "")
    assert rag.called is False


def test_spa_where_gets_fixed_spa_info_not_wayfinding_rag():
    """Spa + konum sorusu → sabit spa metni (RAG değil); wayfinding genel kuralından önce eşleşir."""
    orch, rag, _ = build_orchestrator()
    r = orch.handle(
        ChatRequest(message="şimdi spa nerede nasıl giderim", ui_language="tr", locale="tr", user_id="u-map", session_id="s-map")
    )
    assert r.meta.intent == "hotel_info"
    assert r.type == "answer"
    assert rag.called is False
    low = r.message.lower()
    assert "spa" in low or "serenite" in low
    assert "5025" in r.message
    assert r.meta.action and r.meta.action.kind == "open_spa_module"


def test_main_restaurant_where_is_rag_not_full_campus_list():
    orch, rag, _ = build_orchestrator()
    r = orch.handle(
        ChatRequest(message="where is the main restaurant", ui_language="en", locale="en", user_id="u-map2", session_id="s-map2")
    )
    assert r.meta.intent == "hotel_info"
    assert rag.called is True
    assert r.meta.source == "rag"
    low = r.message.lower()
    assert "block b" in low or "block" in low
    assert "• lobby" not in low and "• lobi" not in low


def test_ana_restoran_where_short_rag_answer_no_bullet_campus_map():
    orch, rag, _ = build_orchestrator()
    r = orch.handle(
        ChatRequest(message="ana restoran nerede", ui_language="tr", locale="tr", user_id="u-anar", session_id="s-anar")
    )
    assert r.meta.intent == "hotel_info"
    assert r.type == "answer"
    assert rag.called is True
    assert r.meta.source == "rag"
    assert r.meta.action is None
    low = r.message.lower()
    assert "b block" in low or "block" in low
    assert "• lobi" not in low


def test_moss_beach_where_is_wayfinding_rag_not_restaurants_module():
    """«Moss beach nerde» → tek satır konum (RAG); Restaurants modülü PDF ipucu değil."""
    orch, rag, _ = build_orchestrator()
    r = orch.handle(
        ChatRequest(message="Moss beach nerde", ui_language="tr", locale="tr", user_id="u-mossw", session_id="s-mossw")
    )
    assert r.meta.intent == "hotel_info"
    assert r.type == "answer"
    assert rag.called is True
    assert r.meta.source == "rag"
    assert "uzun metin olarak gösterilmez" not in r.message
    assert r.meta.action is None or getattr(r.meta.action, "kind", None) != "open_restaurants_bars_module"
    low = r.message.lower()
    assert "moss" in low
    assert "alt geçit" in low or "sahil" in low


def test_wayfinding_rag_miss_guest_relations_opens_where_module():
    orch, rag, _ = build_orchestrator()
    r = orch.handle(
        ChatRequest(
            message="bilinmeyen_test_yeri nerede",
            ui_language="tr",
            locale="tr",
            user_id="u-wfmiss",
            session_id="s-wfmiss",
        )
    )
    assert r.meta.intent == "hotel_info"
    assert r.type == "answer"
    assert rag.called is True
    assert r.meta.source == "rule"
    assert r.meta.action and r.meta.action.kind == "open_where_module"
    # Türkçe İ/i — .lower() güvenilir değil; metinde sabit ifadeler
    assert "Misafir İlişkileri" in r.message or "«Misafir İlişkileri»" in r.message


def test_la_terrace_reservation_handoff_guest_relations_redirect():
    orch, _, _ = build_orchestrator()
    r = orch.handle(ChatRequest(message="la terrace rezervasyon", ui_language="tr", locale="tr"))
    assert r.meta.intent == "request"
    assert r.type == "redirect"
    assert r.meta.action and r.meta.action.kind == "create_guest_request"
    assert "misafir" in r.message.lower() or "ilişkiler" in r.message.lower()


def test_premium_table_reservation_handoff_reception_redirect():
    orch, _, _ = build_orchestrator()
    r = orch.handle(ChatRequest(message="premium masa rezervasyonu istiyorum", ui_language="tr", locale="tr"))
    assert r.meta.intent == "request"
    assert r.type == "redirect"
    assert r.meta.action and r.meta.action.kind == "create_guest_request"
    assert "resepsiyon" in r.message.lower() or "ön büro" in r.message.lower()


def test_tamam_after_form_cancel_short_ack_not_generic_greeting():
    orch, _, _ = build_orchestrator()
    uid, sid = "u-ack", "s-ack"
    for m in ("priz çalışmıyor", "2", "1", "1", "x"):
        orch.handle(ChatRequest(message=m, ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    orch.handle(ChatRequest(message="Test User", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    orch.handle(ChatRequest(message="1001", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    orch.handle(ChatRequest(message="2", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    r = orch.handle(ChatRequest(message="tamam", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    assert r.meta.intent == "chitchat"
    assert "merhaba, ben viona" not in r.message.lower()
    assert "anlaşıldı" in r.message.lower() or "yardımcı" in r.message.lower()


def test_tamam_after_cancel_then_hotel_info_not_cancel_ack():
    """Konu değişince iptal bağlamı silinir; RAG sonrası «tamam» iptal onayı gibi yanıtlanmaz."""
    orch, rag, _ = build_orchestrator()
    uid, sid = "u-ack-hotel", "s-ack-hotel"
    for m in ("priz çalışmıyor", "2", "1", "1", "x"):
        orch.handle(ChatRequest(message=m, ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    orch.handle(ChatRequest(message="Test User", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    orch.handle(ChatRequest(message="1001", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    orch.handle(ChatRequest(message="2", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    rag.called = False
    orch.handle(ChatRequest(message="temizlik", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    assert rag.called is True
    r = orch.handle(ChatRequest(message="tamam", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    low = r.message.lower()
    assert "başka bir konuda yardımcı" not in low


def test_second_tamam_after_cancel_ack_not_cancel_ack_again():
    """İlk «tamam» iptal bağlamını kapatır; ikinci «tamam» aynı kısa onayı tekrarlamaz."""
    orch, _, _ = build_orchestrator()
    uid, sid = "u-ack2", "s-ack2"
    for m in ("priz çalışmıyor", "2", "1", "1", "x"):
        orch.handle(ChatRequest(message=m, ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    orch.handle(ChatRequest(message="Test User", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    orch.handle(ChatRequest(message="1001", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    orch.handle(ChatRequest(message="2", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    r1 = orch.handle(ChatRequest(message="tamam", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    assert "başka bir konuda yardımcı" in r1.message.lower()
    r2 = orch.handle(ChatRequest(message="tamam", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    assert "başka bir konuda yardımcı" not in r2.message.lower()


def test_fault_form_description_talebi_iptal_et_cancels_with_fault_ack():
    """Açıklama adımında «talebi iptal et» isim sorusuna gitmeden arıza iptal metnini verir."""
    orch, _, _ = build_orchestrator()
    uid, sid = "u-abort-desc", "s-abort-desc"
    for m in ("priz çalışmıyor", "2", "1", "1"):
        orch.handle(ChatRequest(message=m, ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    r = orch.handle(ChatRequest(message="talebi iptal et", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    assert r.meta.action is None
    low = r.message.lower()
    assert "adınızı" not in low
    assert "soyadınızı" not in low
    assert "arıza bildirimini iptal" in low


def test_guest_notification_description_abort_matches_guest_ack():
    orch, _, _ = build_orchestrator()
    uid, sid = "u-gn-abort", "s-gn-abort"
    orch.handle(
        ChatRequest(
            message="misafir bildirimi doldurmak istiyorum",
            ui_language="tr",
            locale="tr",
            user_id=uid,
            session_id=sid,
        )
    )
    orch.handle(ChatRequest(message="1", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    r = orch.handle(ChatRequest(message="talebi iptal et", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    low = r.message.lower()
    assert "misafir bildirimini iptal" in low
    assert "adınızı" not in low


def test_anlamadim_after_form_cancel_uses_context_not_only_greeting():
    orch, _, _ = build_orchestrator()
    uid, sid = "u-cx", "s-cx"
    for m in ("priz çalışmıyor", "2", "1", "1", "arıza metni"):
        orch.handle(ChatRequest(message=m, ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    orch.handle(ChatRequest(message="Test User", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    orch.handle(ChatRequest(message="1001", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    c = orch.handle(ChatRequest(message="2", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    assert "iptal" in c.message.lower()
    r = orch.handle(ChatRequest(message="anlamadım", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    assert r.meta.intent == "chitchat"
    low = r.message.lower()
    assert "özet" in low or "onay" in low
    assert "merhaba, ben viona" not in low


def test_bare_sikayet_opens_complaint_form_button():
    orch, _, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="şikayet", ui_language="tr", locale="tr", user_id="u-sk", session_id="s-sk"))
    assert res.meta.intent == "complaint"
    assert res.meta.action and res.meta.action.kind == "open_complaint_form"
    assert "kategori" not in res.message.lower()


def test_lost_property_routes_complaint_form_with_policy_text():
    """Kayıp eşya: üstte saklama bilgisi + şikâyet formu butonu (diğer kategorili şikâyetlerle aynı CTA)."""
    orch, _, _ = build_orchestrator()
    r = orch.handle(ChatRequest(message="odamda telefonumu kaybettim", ui_language="tr", locale="tr"))
    assert r.meta.intent == "complaint"
    assert r.meta.action and r.meta.action.kind == "open_complaint_form"
    low = r.message.lower()
    assert "kayıp eşya" in low or "yönetimi" in low
    assert "1 yıl" in low or "bir yıl" in low
    assert "6 ay" in low
    assert "misafir" in low or "resepsiyon" in low
    assert "şikâyet" in low or "şikayet" in low


def test_lost_property_turkish_inflected_glasses_opens_complaint_form():
    """«gözlük» kökü «gözlüğüm» içinde alt dizgi olarak yok; yine de kayıp eşya akışına düşmeli."""
    orch, _, _ = build_orchestrator()
    r = orch.handle(ChatRequest(message="gözlüğüm kayboldu", ui_language="tr", locale="tr"))
    assert r.meta.intent == "complaint"
    assert r.meta.action and r.meta.action.kind == "open_complaint_form"


def test_lost_property_kayboldu_typo_kaybioldu_not_diet_guest_notification():
    """«kaybıoldu» (ı/o) sözlükte yoktu → kural eşleşmezdi, LLM yanlışlıkla beslenme bildirimi veriyordu."""
    orch, _, _ = build_orchestrator()
    r = orch.handle(ChatRequest(message="*gözlüğüm kaybıoldu", ui_language="tr", locale="tr"))
    assert r.meta.intent == "complaint"
    assert r.meta.action and r.meta.action.kind == "open_complaint_form"
    low = r.message.lower()
    assert "beslenme" not in low and "hassasiyet:" not in low


def test_lost_property_kayboldu_typo_kaybldu_leading_hyphen_opens_complaint_form():
    """«kaybldu» (o düşmüş) ve baştaki «-»; misafir bildirimi diyet listesine düşmesin."""
    orch, _, _ = build_orchestrator()
    r = orch.handle(ChatRequest(message="-gözlüğüm kaybldu", ui_language="tr", locale="tr"))
    assert r.meta.intent == "complaint"
    assert r.meta.action and r.meta.action.kind == "open_complaint_form"
    low = r.message.lower()
    assert "beslenme" not in low and "hassasiyet:" not in low


def test_lost_property_kayboldu_typo_ayboldu_opens_complaint_form():
    """«k» düşmüş «ayboldu» yazımı."""
    orch, _, _ = build_orchestrator()
    r = orch.handle(ChatRequest(message="gözlüğüm ayboldu", ui_language="tr", locale="tr"))
    assert r.meta.intent == "complaint"
    assert r.meta.action and r.meta.action.kind == "open_complaint_form"


def test_lost_property_kayboldu_typo_kyboldu_opens_complaint_form():
    """«a» düşmüş «kyboldu» yazımı."""
    orch, _, _ = build_orchestrator()
    r = orch.handle(ChatRequest(message="kyboldu kolyem", ui_language="tr", locale="tr"))
    assert r.meta.intent == "complaint"
    assert r.meta.action and r.meta.action.kind == "open_complaint_form"


def test_lost_property_kaybol_regex_avoids_mayboldu_substring_false_positive():
    from assistant.services.rule_engine import text_suggests_lost_property_not_room_complaint
    from assistant.utils.text_normalizer import normalize_text

    assert not text_suggests_lost_property_not_room_complaint(normalize_text("mayboldu gözlük"))


def test_lost_property_place_only_kaybioldu_opens_complaint_form():
    """Nesne adı yokken yer + «kaybıoldu» yine kayıp eşya (deniz/plaj vb.)."""
    orch, _, _ = build_orchestrator()
    r = orch.handle(ChatRequest(message="denizde kaybıoldu", ui_language="tr", locale="tr"))
    assert r.meta.intent == "complaint"
    assert r.meta.action and r.meta.action.kind == "open_complaint_form"


def test_lost_property_bulamyorum_typo_opens_complaint_form():
    orch, _, _ = build_orchestrator()
    r = orch.handle(ChatRequest(message="bulamyorum gözlüğüm", ui_language="tr", locale="tr"))
    assert r.meta.intent == "complaint"
    assert r.meta.action and r.meta.action.kind == "open_complaint_form"


def test_lost_property_necklace_beach_turkish_opens_complaint_form():
    orch, _, _ = build_orchestrator()
    r = orch.handle(ChatRequest(message="kolyem denizde kayboldu", ui_language="tr", locale="tr"))
    assert r.meta.intent == "complaint"
    assert r.meta.action and r.meta.action.kind == "open_complaint_form"


def test_lost_property_watch_cant_find_turkish_opens_complaint_form():
    orch, _, _ = build_orchestrator()
    r = orch.handle(ChatRequest(message="saatimi bulamıyorum", ui_language="tr", locale="tr"))
    assert r.meta.intent == "complaint"
    assert r.meta.action and r.meta.action.kind == "open_complaint_form"


def test_lost_and_found_phrase_opens_complaint_form():
    orch, _, _ = build_orchestrator()
    r = orch.handle(ChatRequest(message="kayıp eşya", ui_language="tr", locale="tr"))
    assert r.meta.intent == "complaint"
    assert r.meta.action and r.meta.action.kind == "open_complaint_form"


def test_lost_found_policy_question_still_complaint_form_with_info():
    orch, _, _ = build_orchestrator()
    r = orch.handle(ChatRequest(message="kayıp eşya ne kadar süre saklanır", ui_language="tr", locale="tr"))
    assert r.meta.intent == "complaint"
    assert r.meta.action and r.meta.action.kind == "open_complaint_form"
    assert "6 ay" in r.message.lower()


def test_lost_in_room_english_opens_complaint_form():
    orch, _, _ = build_orchestrator()
    r = orch.handle(ChatRequest(message="I lost my wallet in the room", ui_language="en", locale="en"))
    assert r.meta.intent == "complaint"
    assert r.meta.action and r.meta.action.kind == "open_complaint_form"
    assert "year" in r.message.lower() or "six months" in r.message.lower()


def test_invalid_room_stays_on_room_step_not_category():
    """Geçersiz oda numarası formu sıfırlamaz; oda adımında kalınır."""
    orch, _, _ = build_orchestrator()
    uid, sid = "u-rm-bad", "s-rm-bad"
    for m in ("priz çalışmıyor", "2", "1", "1", "kısa"):
        orch.handle(ChatRequest(message=m, ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    orch.handle(ChatRequest(message="Ali Yılmaz", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    r = orch.handle(ChatRequest(message="10000", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    assert r.meta.action and r.meta.action.step == "room"
    assert "kategori seçim" not in r.message.lower()
    assert "geçerli" in r.message.lower() or "gecersiz" in r.message.lower() or "valid" in r.message.lower()


def test_chat_form_full_name_rejects_digits_stays_on_step():
    """Adım: rakam içeren metin kabul edilmez; aynı adımda kalınır."""
    orch, _, _ = build_orchestrator()
    uid, sid = "u-fn-dig", "s-fn-dig"
    for m in ("priz çalışmıyor", "2", "1", "1", "arıza özeti"):
        orch.handle(ChatRequest(message=m, ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    r = orch.handle(ChatRequest(message="Ali 123", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    assert r.meta.action and r.meta.action.step == "full_name"
    assert "rakam" in r.message.lower() or "digit" in r.message.lower()


def test_chat_form_full_name_help_then_valid_advances_to_room():
    orch, _, _ = build_orchestrator()
    uid, sid = "u-fn-hlp", "s-fn-hlp"
    for m in ("priz çalışmıyor", "2", "1", "1", "kısa not"):
        orch.handle(ChatRequest(message=m, ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    h = orch.handle(ChatRequest(message="ne yazayım", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    assert h.meta.action and h.meta.action.step == "full_name"
    assert "oda" in h.message.lower()
    r = orch.handle(ChatRequest(message="Ali Yılmaz", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    assert r.meta.action and r.meta.action.step == "room"


def test_chat_form_full_name_invisible_only_treated_as_empty():
    orch, _, _ = build_orchestrator()
    uid, sid = "u-fn-zw", "s-fn-zw"
    for m in ("priz çalışmıyor", "2", "1", "1", "not"):
        orch.handle(ChatRequest(message=m, ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    r = orch.handle(ChatRequest(message="\u200b\u200b", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    assert r.meta.action and r.meta.action.step == "full_name"
    assert "yaz" in r.message.lower()


def test_chat_form_full_name_single_letter_stays_on_step():
    orch, _, _ = build_orchestrator()
    uid, sid = "u-fn-1c", "s-fn-1c"
    for m in ("priz çalışmıyor", "2", "1", "1", "not"):
        orch.handle(ChatRequest(message=m, ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    r = orch.handle(ChatRequest(message="A", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    assert r.meta.action and r.meta.action.step == "full_name"
    assert "kısa" in r.message.lower() or "short" in r.message.lower() or "kurz" in r.message.lower()


def test_request_form_category_step_bornoz_keeps_form_not_hotel_info():
    """Tek başına «bornoz» kuralda hotel_info (soft) olsa bile kategori adımında talep türü seçilir."""
    orch, rag, _ = build_orchestrator()
    uid, sid = "u-req-bornoz", "s-req-bornoz"
    orch.form_store.upsert(
        "web",
        uid,
        sid,
        ChatFormState(operation="request", language="tr", ui_language="tr", step="category", initial_message=""),
    )
    rag.called = False
    r = orch.handle(ChatRequest(message="bornoz", ui_language="tr", locale="tr", user_id=uid, session_id=sid))
    assert r.meta.intent == "request"
    assert r.meta.action and r.meta.action.kind == "chat_form"
    assert r.meta.action.step == "detail_int"
    low = r.message.lower()
    assert "bornoz" in low or "bademantel" in low or "adet" in low
    assert rag.called is False


def test_request_form_category_step_minibar_price_leaves_for_hotel_info():
    """«ne kadar» bilgi sorusu — form terk edilip bilgi yolu açılabilir."""
    orch, rag, _ = build_orchestrator()
    uid, sid = "u-req-mb-nk", "s-req-mb-nk"
    orch.form_store.upsert(
        "web",
        uid,
        sid,
        ChatFormState(operation="request", language="tr", ui_language="tr", step="category", initial_message=""),
    )
    rag.called = False
    r = orch.handle(
        ChatRequest(message="minibar ne kadar", ui_language="tr", locale="tr", user_id=uid, session_id=sid)
    )
    assert r.meta.intent == "hotel_info"
    assert rag.called is True


def test_orch_reply_lang_normalizes_case_and_unknown():
    from assistant.services.orchestrator import _orch_reply_lang

    assert _orch_reply_lang(None) == "tr"
    assert _orch_reply_lang("") == "tr"
    assert _orch_reply_lang("  EN  ") == "en"
    assert _orch_reply_lang("De") == "de"
    assert _orch_reply_lang("fr") == "tr"
    assert _orch_reply_lang("pl") == "pl"


def test_full_name_ack_prompts_four_locales_consistency():
    """İstek ön-doldurma / açıklama sonrası / misafir bildirimi — tr en de pl şablonları eksiksiz."""
    from assistant.services.orchestrator import (
        _localized_full_name_prompt_after_description_step,
        _localized_full_name_prompt_guest_notif_skip_description,
        _localized_full_name_prompt_request_prefill,
    )

    tr = _localized_full_name_prompt_request_prefill("kettle", "tr")
    assert "aldık" in tr or "aldik" in tr.lower()
    assert "su ısıtıcı" in tr.lower() or "Su ısıtıcı" in tr

    en = _localized_full_name_prompt_request_prefill("kettle", "en")
    assert "kettle" in en.lower()
    assert "full name" in en.lower()

    de = _localized_full_name_prompt_request_prefill("kettle", "de")
    assert "wasserkocher" in de.lower() or "anfrage" in de.lower()

    pl = _localized_full_name_prompt_request_prefill("kettle", "pl")
    assert "czajnik" in pl.lower() or "prośb" in pl.lower() or "prosb" in pl.lower()

    en_after = _localized_full_name_prompt_after_description_step("request", "kettle", "en")
    assert "we have noted" in en_after.lower()

    de_after = _localized_full_name_prompt_after_description_step("request", "kettle", "de")
    assert "wir haben" in de_after.lower()

    pl_after = _localized_full_name_prompt_after_description_step("request", "kettle", "pl")
    assert "zapisali" in pl_after.lower()

    de_gn = _localized_full_name_prompt_guest_notif_skip_description("pregnancy", "de")
    assert "schwangerschaft" in de_gn.lower()
    assert "mitteilung" in de_gn.lower() or "erhalten" in de_gn.lower()

