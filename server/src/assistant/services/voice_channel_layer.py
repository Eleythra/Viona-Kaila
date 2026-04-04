"""
Sesli asistan katmanı — metin sohbetinden ayrı kanal (channel=voice).

- İşlem / form gerektiren niyetler: kısa yönlendirme (yazılı sohbet / menü).
- Bilgi yanıtları: TTS için sadeleştirilmiş metin, meta.action ve exit_chat_after_ms temizlenir.
"""

from __future__ import annotations

import re

from assistant.schemas.response import ChatResponse

# Talep / şikâyet / arıza / misafir bildirimi — sesli kanalda form açılmaz.
VOICE_OPERATIONAL_USE_TEXT: dict[str, str] = {
    "tr": (
        "Bu tür talepler için lütfen yazılı sohbeti veya ana menüdeki İstekler bölümünü kullanın. "
        "Sesli asistan yalnızca genel otel bilgisi verir."
    ),
    "en": (
        "For this kind of request, please use text chat or the Requests section in the main menu. "
        "The voice assistant only shares general hotel information."
    ),
    "de": (
        "Für solche Anliegen nutzen Sie bitte den Text-Chat oder den Bereich „Anfragen“ im Hauptmenü. "
        "Die Sprachassistentin gibt nur allgemeine Hotelinformationen."
    ),
    "ru": (
        "Для таких обращений используйте текстовый чат или раздел «Запросы» в главном меню. "
        "Голосовой ассистент сообщает только общую информацию об отеле."
    ),
}

# Rezervasyon anahtar kelimesi — sesli kanalda buton yok, kısa sözlü yönlendirme.
VOICE_RESERVATION_HINT: dict[str, str] = {
    "tr": "Rezervasyonlar için ana ekrandaki Rezervasyonlar bölümünü kullanabilirsiniz.",
    "en": "For reservations, please use the Reservations section on the main screen.",
    "de": "Für Reservierungen nutzen Sie bitte den Bereich „Reservierungen“ auf dem Hauptbildschirm.",
    "ru": "Для бронирования откройте раздел «Бронирования» на главном экране.",
}

# TTS için buton / UI ifadelerini kırpmak (metin sohbetinde kalan uzun yönlendirmeler).
_VOICE_STRIP_BY_LANG: dict[str, list[str]] = {
    "tr": [
        "Aşağıdaki butona dokunarak açabilirsiniz.",
        "Aşağıdaki buton bu formu doğrudan açar.",
    ],
    "en": [
        "You can open it using the button below.",
        "The button below opens that form directly.",
    ],
    "de": [
        "Sie können ihn über die Schaltfläche unten öffnen.",
        "Die Schaltfläche unten öffnet dieses Formular direkt.",
    ],
    "ru": [
        "Вы можете открыть его с помощью кнопки ниже.",
        "Кнопка ниже открывает эту форму напрямую.",
    ],
}


def sanitize_message_for_voice(text: str, lang: str) -> str:
    s = (text or "").strip()
    s = re.sub(r"\*\*([^*]+)\*\*", r"\1", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    lg = (lang or "tr").lower() if (lang or "").lower() in ("tr", "en", "de", "ru") else "tr"
    for phrase in _VOICE_STRIP_BY_LANG.get(lg, _VOICE_STRIP_BY_LANG["tr"]):
        s = s.replace(phrase, "").strip()
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()


def finalize_voice_channel_response(response: ChatResponse, reply_lang: str) -> ChatResponse:
    """Sesli kanal çıkışı: söylenebilir metin, UI aksiyonları kaldırılır."""
    msg = sanitize_message_for_voice(response.message, reply_lang)
    meta = response.meta.model_copy(update={"action": None, "exit_chat_after_ms": None})
    return response.model_copy(update={"message": msg, "meta": meta})
