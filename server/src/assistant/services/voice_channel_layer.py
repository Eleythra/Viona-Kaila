"""
Sesli asistan katmanı — metin sohbetinden ayrı kanal (channel=voice).

- İşlem / form gerektiren niyetler: kısa yönlendirme (yazılı sohbet / menü).
- Bilgi yanıtları: TTS için sadeleştirilmiş metin, meta.action ve exit_chat_after_ms temizlenir.
"""

from __future__ import annotations

import re

from assistant.schemas.response import ChatResponse

# Talep / şikâyet / arıza / misafir bildirimi — sesli kanalda form yok; zarif yönlendirme (premium ton).
VOICE_OPERATIONAL_USE_TEXT: dict[str, str] = {
    "tr": (
        "Bu konuda kaydınızın eksiksiz iletilmesi için ana menüden İstekler bölümüne veya yazılı "
        "sohbetimize geçmenizi rica ederim; ekibimiz böylece her ayrıntıyı anında görebilir. "
        "Otel, hizmetler ve konaklamanızla ilgili sorularınızda sesli olarak yanınızda olmaya devam ederim."
    ),
    "en": (
        "So our team receives every detail, please continue through Requests or text chat from the main menu. "
        "I'm happy to keep answering by voice anything about the hotel, our services, and your stay."
    ),
    "de": (
        "Damit Ihr Anliegen vollständig bei unserem Team ankommt, wählen Sie bitte im Hauptmenü „Anfragen“ "
        "oder den Textchat. Über die Sprachassistentin beantworte ich Ihre Fragen zum Hotel, zu den Services "
        "und Ihrem Aufenthalt weiterhin gern."
    ),
    "ru": (
        "Чтобы обращение дошло до команды со всеми деталями, продолжите, пожалуйста, в разделе «Запросы» "
        "или в текстовом чате главного меню. По голосу с удовольствием отвечу на вопросы об отеле, услугах "
        "и вашем отдыхе."
    ),
}

# Rezervasyon anahtar kelimesi — kısa, premium yönlendirme.
VOICE_RESERVATION_HINT: dict[str, str] = {
    "tr": "Rezervasyonlarınız için ana ekrandaki Rezervasyonlar bölümü size özel adımlarla en uygun yolu sunar.",
    "en": "For reservations, open Reservations on the main screen — it guides you smoothly through each step.",
    "de": "Für Reservierungen öffnen Sie „Reservierungen“ auf dem Hauptbildschirm — dort führt Sie der Ablauf Schritt für Schritt.",
    "ru": "Для бронирования откройте на главном экране раздел «Бронирования» — вас проведут по шагам с заботой.",
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
        "Кнопка ниже открывает эту форму сразу.",
    ],
}

# Sadeleştirme tüm metni sildiyse TTS boş kalmasın.
VOICE_EMPTY_FALLBACK: dict[str, str] = {
    "tr": "Kısa bir kesinti oldu; yazılı sohbetten tekrar dener misiniz? Size yardımcı olmaktan memnuniyet duyarım.",
    "en": "A brief hiccup occurred — please try once more in text chat. I'm glad to assist you.",
    "de": "Kurze Unterbrechung — bitte versuchen Sie es im Textchat erneut. Ich helfe Ihnen gern weiter.",
    "ru": "Случился короткий сбой — повторите, пожалуйста, в текстовом чате. Буду рада помочь.",
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
    lg = (reply_lang or "tr").lower() if (reply_lang or "").lower() in ("tr", "en", "de", "ru") else "tr"
    msg = sanitize_message_for_voice(response.message, lg)
    if not msg.strip():
        msg = VOICE_EMPTY_FALLBACK.get(lg, VOICE_EMPTY_FALLBACK["tr"])
    meta = response.meta.model_copy(update={"action": None, "exit_chat_after_ms": None})
    return response.model_copy(update={"message": msg, "meta": meta})
