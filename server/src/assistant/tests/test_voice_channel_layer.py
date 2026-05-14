"""Sesli kanal bilgi katmanı — finalize ve sadeleştirme."""

from assistant.core.chatbot_languages import CHATBOT_UI_LANG_SET
from assistant.schemas.response import ChatMeta, ChatResponse
from assistant.services.voice_channel_layer import (
    VOICE_OUT_OF_SCOPE_PREMIUM_TEXT,
    finalize_voice_channel_response,
    sanitize_message_for_voice,
)


def test_voice_out_of_scope_premium_text_has_exactly_ten_ui_languages():
    """Premium yönlendirme: `js/lang-registry` / Azure UI dilleri ile anahtar kümesi birebir aynı olmalı."""
    assert set(VOICE_OUT_OF_SCOPE_PREMIUM_TEXT) == set(CHATBOT_UI_LANG_SET)
    assert len(VOICE_OUT_OF_SCOPE_PREMIUM_TEXT) == 10
    for code, text in VOICE_OUT_OF_SCOPE_PREMIUM_TEXT.items():
        assert text.strip(), f"empty premium string for {code}"


def test_sanitize_removes_markdown_bold():
    out = sanitize_message_for_voice("Merhaba **Kalın** metin", "tr")
    assert "**" not in out
    assert "Kalın" in out


def test_sanitize_strips_module_cta_lines_multilingual():
    tr = "Özet. Aşağıdaki düğmeyle modülü açabilirsiniz."
    assert "düğmeyle" not in sanitize_message_for_voice(tr, "tr")
    en = "Summary. Use the button below to open it."
    assert "button below" not in sanitize_message_for_voice(en, "en")
    de = "Kurz. Öffnen Sie ihn über die Schaltfläche unten."
    assert "Schaltfläche unten" not in sanitize_message_for_voice(de, "de")
    pl = "Podsumowanie. Możesz to otworzyć przyciskiem poniżej."
    assert "przycisk" not in sanitize_message_for_voice(pl, "pl").lower()


def test_finalize_empty_message_uses_fallback():
    meta = ChatMeta(
        intent="hotel_info",
        confidence=1.0,
        language="tr",
        ui_language="tr",
        source="rule",
    )
    resp = ChatResponse(type="inform", message="", meta=meta)
    fin = finalize_voice_channel_response(resp, "tr")
    assert fin.message.strip()
    assert "yazılı" in fin.message or "sohbet" in fin.message


def test_extra_ui_lang_voice_uses_native_assets_and_strips_cta():
    """nl: yerel sesli metin + EN modül kalıntısı strip (ikinci geçiş)."""
    nl = "Info. Open de module met de knop hieronder."
    out = sanitize_message_for_voice(nl, "nl")
    assert "knop" not in out.lower()
    mixed = "Kort. Use the button below to open it."
    out2 = sanitize_message_for_voice(mixed, "nl")
    assert "button below" not in out2.lower()
    meta = ChatMeta(
        intent="hotel_info",
        confidence=1.0,
        language="nl",
        ui_language="nl",
        source="rule",
    )
    resp = ChatResponse(type="inform", message="", meta=meta)
    fin = finalize_voice_channel_response(resp, "nl")
    assert fin.message.strip()
    assert "tekstchat" in fin.message.lower() or "text" in fin.message.lower()


def test_ru_voice_empty_message_fallback_is_russian():
    meta = ChatMeta(
        intent="hotel_info",
        confidence=1.0,
        language="ru",
        ui_language="ru",
        source="rule",
    )
    resp = ChatResponse(type="inform", message="", meta=meta)
    fin = finalize_voice_channel_response(resp, "ru")
    assert fin.message.strip()
    assert "чат" in fin.message.lower() or "текст" in fin.message.lower()


def test_coerce_voice_v2_replaces_chitchat_with_premium():
    from assistant.services.voice_channel_layer import coerce_voice_channel_v2_response

    meta = ChatMeta(
        intent="chitchat",
        confidence=0.9,
        language="en",
        ui_language="en",
        source="rule",
    )
    resp = ChatResponse(type="inform", message="Hello there!", meta=meta)
    out = coerce_voice_channel_v2_response(resp, "en")
    assert out.meta.intent == "hotel_info"
    assert out.meta.action is None
    assert "text chat" in out.message.lower()


def test_coerce_voice_v2_rule_hotel_info_becomes_premium():
    from assistant.services.voice_channel_layer import VOICE_OUT_OF_SCOPE_PREMIUM_TEXT, coerce_voice_channel_v2_response

    meta = ChatMeta(
        intent="hotel_info",
        confidence=1.0,
        language="tr",
        ui_language="tr",
        source="rule",
    )
    resp = ChatResponse(type="inform", message="Havuz 09–19.", meta=meta)
    out = coerce_voice_channel_v2_response(resp, "tr")
    assert out.message.strip() == VOICE_OUT_OF_SCOPE_PREMIUM_TEXT["tr"].strip()
    assert out.meta.intent == "hotel_info"
    assert out.meta.action is None


def test_coerce_voice_v2_recommendation_becomes_premium():
    from assistant.services.voice_channel_layer import VOICE_OUT_OF_SCOPE_PREMIUM_TEXT, coerce_voice_channel_v2_response

    meta = ChatMeta(
        intent="recommendation",
        confidence=0.95,
        language="en",
        ui_language="en",
        source="rule",
    )
    resp = ChatResponse(type="answer", message="Try the terrace at sunset.", meta=meta)
    out = coerce_voice_channel_v2_response(resp, "en")
    assert out.message.strip() == VOICE_OUT_OF_SCOPE_PREMIUM_TEXT["en"].strip()
    assert out.type == "inform"


def test_coerce_voice_v2_hotel_info_rag_with_action_becomes_premium():
    from assistant.services.voice_channel_layer import VOICE_OUT_OF_SCOPE_PREMIUM_TEXT, coerce_voice_channel_v2_response

    meta = ChatMeta(
        intent="hotel_info",
        confidence=1.0,
        language="de",
        ui_language="de",
        source="rag",
        action=ChatMeta.ChatAction(kind="open_where_module"),
    )
    resp = ChatResponse(type="answer", message="Karte hier.", meta=meta)
    out = coerce_voice_channel_v2_response(resp, "de")
    assert out.message.strip() == VOICE_OUT_OF_SCOPE_PREMIUM_TEXT["de"].strip()


def test_finalize_clears_action_and_exit_timer():
    meta = ChatMeta(
        intent="reservation",
        confidence=1.0,
        language="tr",
        ui_language="tr",
        source="rule",
        action=ChatMeta.ChatAction(kind="open_reservation_form"),
        exit_chat_after_ms=5000,
    )
    resp = ChatResponse(type="inform", message="Test **x**", meta=meta)
    fin = finalize_voice_channel_response(resp, "tr")
    assert fin.meta.action is None
    assert fin.meta.exit_chat_after_ms is None
    assert "**" not in fin.message
