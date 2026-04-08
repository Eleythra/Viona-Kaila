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

# Rezervasyon — yüz yüze ekip yönlendirmesi; spa / à la carte / genel resepsiyon ayrımı (TTS).
VOICE_RECEPTION_RESERVATION_HINT: dict[str, str] = {
    "tr": (
        "Konaklama ve genel rezervasyon taleplerinizde ön büro veya resepsiyon ekibimiz, sizi en doğru birime zarifçe yönlendirir; "
        "şahsen ilgilenmelerini rica ederim."
    ),
    "en": (
        "For stays and general reservations, our front desk will arrange the finest routing — please let them assist you in person."
    ),
    "de": (
        "Für Aufenthalt und allgemeine Reservierungen koordiniert die Rezeption die passende Weiterleitung — "
        "lassen Sie sich dort gern persönlich betreuen."
    ),
    "ru": (
        "По проживанию и общим бронированиям ресепшн подберёт лучшее направление — обратитесь к команде лично."
    ),
}
VOICE_SPA_BOOKING_HINT: dict[str, str] = {
    "tr": "Spa, masaj ve ücretli ritüeller için La Serenite Spa ekibiyle doğrudan görüşmenizi öneririm; resepsiyon da sessizce bağlayabilir. Otel içi sabit hat: 5025.",
    "en": "For spa, massage, and paid rituals, our La Serenite Spa hosts will refine every detail — reception can connect you discreetly. In-house line: 5025.",
    "de": "Für Spa, Massage und Anwendungen betreut Sie das La Serenite Spa persönlich — die Rezeption verbindet Sie auf Wunsch diskret. Hotel-Innenanschluss: 5025.",
    "ru": "По спа, массажу и платным ритуалам обратитесь к команде La Serenite Spa — ресепшн при желании деликатно соединит. Внутренний номер отеля: 5025.",
}
VOICE_ALACARTE_RESERVATION_HINT: dict[str, str] = {
    "tr": "Ücretli à la carte masalar Misafir İlişkileri’nde özenle planlanır; doğrudan onlarla görüşmenizi rica ederim.",
    "en": "À la carte dining is curated by Guest Relations — please reach out to them directly for the finest tables.",
    "de": "À-la-carte-Tische koordiniert die Gästebetreuung mit besonderer Sorgfalt — wenden Sie sich bitte direkt dorthin.",
    "ru": "Столы à la carte оформляет служба по работе с гостями — обратитесь к ним напрямую для лучших мест.",
}

# Geriye dönük uyumluluk (eski importlar).
VOICE_RESERVATION_HINT = VOICE_RECEPTION_RESERVATION_HINT

# TTS için buton / UI ifadelerini kırpmak (metin sohbetinde kalan uzun yönlendirmeler).
_VOICE_STRIP_BY_LANG: dict[str, list[str]] = {
    "tr": [
        "Aşağıdaki butona dokunarak açabilirsiniz.",
        "Aşağıdaki buton bu formu doğrudan açar.",
        "Aşağıdaki düğmeyle modülü açabilirsiniz.",
        "Modülü açmak için aşağıdaki düğmeyi kullanabilirsiniz.",
    ],
    "en": [
        "You can open it using the button below.",
        "The button below opens that form directly.",
        "Use the button below to open it.",
    ],
    "de": [
        "Sie können ihn über die Schaltfläche unten öffnen.",
        "Die Schaltfläche unten öffnet dieses Formular direkt.",
        "Öffnen Sie ihn über die Schaltfläche unten.",
    ],
    "ru": [
        "Вы можете открыть его с помощью кнопки ниже.",
        "Кнопка ниже открывает эту форму напрямую.",
        "Кнопка ниже открывает эту форму сразу.",
        "Откройте его кнопкой ниже.",
        "Перейдите по кнопке ниже.",
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
