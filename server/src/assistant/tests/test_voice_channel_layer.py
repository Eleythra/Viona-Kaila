"""Sesli kanal bilgi katmanı — finalize ve sadeleştirme."""

from assistant.schemas.response import ChatMeta, ChatResponse
from assistant.services.voice_channel_layer import (
    finalize_voice_channel_response,
    sanitize_message_for_voice,
)


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


def test_extra_ui_lang_voice_maps_to_english_voice_assets():
    """ru/nl vb. sözlükte yok: voice_dict_lang → en (TTS tutarlı, TR sürpriz yok)."""
    nl = "Info. Use the button below to open it."
    out = sanitize_message_for_voice(nl, "nl")
    assert "button below" not in out.lower()
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
    assert "text chat" in fin.message.lower() or "chat" in fin.message.lower()


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
