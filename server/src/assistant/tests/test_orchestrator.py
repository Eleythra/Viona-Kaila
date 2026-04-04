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
from assistant.services.rule_engine import RuleEngine  # noqa: E402
from assistant.services.throttle_service import ThrottleService  # noqa: E402


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
    def __init__(self):
        self.called = False

    def answer(self, _message, _language):
        self.called = True
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
        assert res.type == "redirect"
        assert res.meta.intent == "fault_report"


def test_fault_sub_intent_is_preserved():
    orch, _, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="duşum bozuldu", ui_language="tr", locale="tr"))
    assert res.type == "redirect"
    assert res.meta.intent == "fault_report"
    assert "Duş arızası" in res.message

    res = orch.handle(ChatRequest(message="kart çalışmıyor", ui_language="tr", locale="tr"))
    assert res.type == "redirect"
    assert res.meta.intent == "fault_report"
    assert "Kart arızası" in res.message


def test_special_need_cases():
    orch, _, _ = build_orchestrator()
    for msg in ["veganım", "çölyağım", "gluten yiyemem", "süt dokunuyor", "alerjim var"]:
        res = orch.handle(ChatRequest(message=msg, ui_language="tr", locale="tr"))
        assert res.meta.intent == "guest_notification"
        assert res.type == "inform"
        assert res.meta.action and res.meta.action.kind == "chat_form"


def test_special_need_multilang_examples():
    orch, _, _ = build_orchestrator()
    examples = [
        ("veganım", "tr"),
        ("I am vegetarian", "en"),
        ("Ich bin Vegetarier", "de"),
        ("я вегетарианец", "ru"),
        ("laktozum var", "tr"),
        ("I need baby food", "en"),
        ("Ich brauche Rollstuhl Hilfe", "de"),
        ("мне нужно детское питание", "ru"),
    ]
    for msg, loc in examples:
        res = orch.handle(ChatRequest(message=msg, ui_language=loc, locale=loc))
        assert res.meta.intent == "guest_notification"
        assert res.meta.language == loc
        assert res.meta.action and res.meta.action.kind == "chat_form"


def test_request_and_complaint_cases():
    orch, _, _ = build_orchestrator()
    req = orch.handle(ChatRequest(message="havlu", ui_language="tr", locale="tr"))
    cmp_ = orch.handle(ChatRequest(message="çok kötü", ui_language="tr", locale="tr"))
    assert req.meta.intent == "request"
    assert req.type == "redirect"
    assert cmp_.meta.intent == "complaint"
    assert cmp_.type == "redirect"


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


def test_bored_suggests_animation_multilang():
    orch, _, _ = build_orchestrator()
    examples = [
        ("otelde canım sıkıldı", "tr"),
        ("I am bored", "en"),
        ("mir ist langweilig", "de"),
        ("мне скучно", "ru"),
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
        ("привет", "ru"),
        ("wer bist du", "de"),
        ("кто ты", "ru"),
    ]
    for msg, loc in examples:
        res = orch.handle(ChatRequest(message=msg, ui_language=loc, locale=loc))
        assert res.meta.intent == "chitchat"
        assert res.type == "inform"
        assert res.meta.source == "rule"


def test_social_thanks_is_rule_based_without_llm_dependency():
    orch, _, intent = build_orchestrator()
    for msg, loc in [("teşekkürler", "tr"), ("thanks", "en"), ("danke", "de"), ("спасибо", "ru")]:
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
    res = orch.handle(ChatRequest(message="qzxw 123 ???", ui_language="tr", locale="tr"))
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


def test_russian_chitchat_multiword_rule():
    orch, _, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="привет как дела", ui_language="ru", locale="ru"))
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
            message="havlu",
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


def test_russian_meta_phrase_switch_to_english():
    orch, _, intent = build_orchestrator()
    res = orch.handle(ChatRequest(message="говори по-английски", ui_language="ru", locale="ru"))
    assert res.meta.intent == "chitchat"
    assert res.meta.language == "en"
    assert "English" in res.message
    assert intent.calls == 0


def test_russian_short_phrase_po_angliyski():
    orch, _, intent = build_orchestrator()
    res = orch.handle(ChatRequest(message="по-английски", ui_language="ru", locale="ru"))
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


def test_german_meta_switch_to_russian():
    orch, _, intent = build_orchestrator()
    res = orch.handle(ChatRequest(message="auf russisch wechseln", ui_language="de", locale="de"))
    assert res.meta.intent == "chitchat"
    assert res.meta.language == "ru"
    assert "русски" in res.message.lower() or "Далее" in res.message
    assert intent.calls == 0


def test_german_sprich_englisch():
    orch, _, intent = build_orchestrator()
    res = orch.handle(ChatRequest(message="sprich englisch", ui_language="de", locale="de"))
    assert res.meta.intent == "chitchat"
    assert res.meta.language == "en"
    assert intent.calls == 0


def test_russian_meta_switch_to_german():
    orch, _, intent = build_orchestrator()
    res = orch.handle(ChatRequest(message="говори по-немецки", ui_language="ru", locale="ru"))
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
    assert "air conditioner" in res.message.lower()


def test_current_time_tr_contains_hhmm():
    orch, _, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="saat kaç", ui_language="tr", locale="tr"))
    assert res.meta.intent == "current_time"
    assert res.type == "answer"
    assert re.search(r"\d{2}:\d{2}", res.message)


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
    assert "Duş" in res.message


def test_where_is_lobby_does_not_fallback():
    orch, rag, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="where is the lobby", ui_language="en", locale="en"))
    assert res.meta.intent == "hotel_info"
    assert res.type == "answer"
    assert rag.called is True


def test_zoliakie_is_special_need():
    orch, _, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="Ich habe Zöliakie", ui_language="de", locale="de"))
    assert res.meta.intent == "guest_notification"


def test_russian_towel_request():
    orch, _, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="мне нужно полотенце", ui_language="ru", locale="ru"))
    assert res.meta.intent == "request"


def test_late_checkout_reservation():
    orch, _, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="I want late checkout", ui_language="en", locale="en"))
    assert res.meta.intent == "reservation"


def test_hotel_info_uses_rag():
    orch, rag, _ = build_orchestrator()
    res = orch.handle(ChatRequest(message="spa saatleri nedir", ui_language="tr", locale="tr"))
    assert rag.called is True
    assert res.meta.intent == "hotel_info"
    assert res.type == "answer"


def test_rule_match_does_not_call_llm():
    orch, _, intent = build_orchestrator()
    res = orch.handle(ChatRequest(message="televizyonum bozuldu", ui_language="tr", locale="tr"))
    assert res.meta.intent == "fault_report"
    assert intent.calls == 0


def test_same_input_same_output():
    orch, _, _ = build_orchestrator()
    one = orch.handle(ChatRequest(message="havlu lazım", ui_language="tr", locale="tr"))
    two = orch.handle(ChatRequest(message="havlu lazım", ui_language="tr", locale="tr"))
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
    assert coffee.meta.intent == "recommendation"
    assert "Mare" in fish.message
    assert "Sinton" in meat.message
    assert ("Libum" in coffee.message) or ("Lobby Bar" in coffee.message)
    assert intent.calls == 0


def test_routing_housekeeping_transfer_and_lunch_box():
    orch, _, intent = build_orchestrator()
    hk = orch.handle(ChatRequest(message="oda temizliği istiyorum", ui_language="tr", locale="tr"))
    trf = orch.handle(ChatRequest(message="transfer istiyorum", ui_language="tr", locale="tr"))
    lbox = orch.handle(ChatRequest(message="lunch box istiyorum", ui_language="tr", locale="tr"))
    assert hk.meta.intent == "request"
    assert trf.meta.intent == "request"
    assert lbox.meta.intent == "request"
    assert "housekeeping" in hk.message.lower() or "temizliği" in hk.message.lower()
    assert "transfer" in trf.message.lower()
    assert "20:00" in lbox.message
    assert intent.calls == 0


def test_routing_guest_relations_contact_and_generic_problem():
    orch, _, intent = build_orchestrator()
    gr = orch.handle(ChatRequest(message="misafir ilişkilerine bağlanmak istiyorum", ui_language="tr", locale="tr"))
    prob = orch.handle(ChatRequest(message="bir sorunum var", ui_language="tr", locale="tr"))
    assert gr.meta.intent == "request"
    assert "misafir" in gr.message.lower()
    assert prob.meta.intent == "complaint"
    assert ("misafir" in prob.message.lower()) or ("guest relations" in prob.message.lower())
    assert intent.calls == 0


def test_fault_internet_and_minibar_variants():
    orch, _, intent = build_orchestrator()
    internet = orch.handle(ChatRequest(message="internet çekmiyor", ui_language="tr", locale="tr"))
    minibar = orch.handle(ChatRequest(message="minibar soğutmuyor", ui_language="tr", locale="tr"))
    assert internet.meta.intent == "fault_report"
    assert minibar.meta.intent == "fault_report"
    assert internet.type == "redirect"
    assert minibar.type == "redirect"
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
    assert "Restaurant" in res.message or "restoran" in res.message.lower()
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

