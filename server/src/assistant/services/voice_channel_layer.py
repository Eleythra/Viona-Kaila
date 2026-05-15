"""
Sesli asistan katmanı — metin sohbetinden ayrı kanal (channel=voice).

- v2: Seslide bilgi tabanı (RAG) yanıtı, saat (`current_time`) ve kısa selam / sohbet (`chitchat`, aksiyonsuz);
  modül/form/aksiyon veya diğer niyetler `coerce_voice_channel_v2_response` ile kısa premium yönlendirme
  (metin sohbet + ön büro).
- TTS çıkışı: sadeleştirilmiş metin, meta.action ve exit_chat_after_ms temizlenir (`finalize_voice_channel_response`).
"""

from __future__ import annotations

import re

from assistant.core.chatbot_languages import voice_dict_lang
from assistant.schemas.response import ChatResponse

# Ses v2: bilgi tabanı dışı / form / işlem — tek premium cümle (TTS); metin sohbet + ön büro.
VOICE_OUT_OF_SCOPE_PREMIUM_TEXT: dict[str, str] = {
    "tr": "Bunun tam yanıtı bilgi tabanımda veya yazılı kanalda; metin sohbetine geçmenizi ya da ön büroya danışmanızı içtenlikle rica ederim.",
    "en": "For the full answer—whether from our knowledge base or a form—please use text chat or visit the front desk; I will gladly assist you there in writing.",
    "de": "Die vollständige Antwort dazu finden Sie im Textchat oder an der Rezeption — bitte wechseln Sie dorthin; dort helfe ich Ihnen gern schriftlich weiter.",
    "pl": "Pełnej odpowiedzi udzielę w czacie tekstowym lub poproszę recepcję — przejdź tam; chętnie pomogę na piśmie.",
    "ru": "Полный ответ — в текстовом чате или на ресепшене; перейдите туда, с удовольствием помогу письменно.",
    "da": "Det fulde svar får du i tekstchatten eller i receptionen — skift dertil; jeg hjælper dig gerne skriftligt der.",
    "nl": "Het volledige antwoord vindt u in de tekstchat of bij de receptie — schakel over; ik help u daar graag schriftelijk.",
    "cs": "Úplnou odpověď získáte v textovém chatu nebo na recepci — přejděte tam; rád vám pomohu písemně.",
    "ro": "Răspunsul complet este în chatul text sau la recepție — comutați acolo; vă ajut cu plăcere în scris.",
    "sk": "Úplnú odpoveď dostanete v textovom chate alebo na recepcii — prepnite sa tam; rád pomôžem písomne.",
}

# Geriye dönük: orchestrator `_voice_operational_redirect` bu adı import eder.
VOICE_OPERATIONAL_USE_TEXT = VOICE_OUT_OF_SCOPE_PREMIUM_TEXT

def _voice_response_allowed_for_tts(response: ChatResponse) -> bool:
    """Ses: RAG bilgisi, saat veya aksiyonsuz chitchat (selam vb.); modül/form için meta.action yok, mesaj dolu."""
    intent = str(response.meta.intent or "").strip()
    source = str(response.meta.source or "").strip().lower()
    if response.meta.action is not None:
        return False
    msg = (response.message or "").strip()
    if not msg:
        return False
    if intent == "hotel_info" and source == "rag":
        return True
    if intent == "current_time":
        return True
    if intent == "chitchat":
        return True
    return False


def coerce_voice_channel_v2_response(response: ChatResponse, reply_lang: str) -> ChatResponse:
    """Ses v2: RAG, saat veya chitchat (aksiyonsuz); aksi halde premium yönlendirme (metin + resepsiyon)."""
    if _voice_response_allowed_for_tts(response):
        return response
    lg = voice_dict_lang(reply_lang)
    msg = VOICE_OUT_OF_SCOPE_PREMIUM_TEXT.get(lg, VOICE_OUT_OF_SCOPE_PREMIUM_TEXT["tr"])
    meta = response.meta.model_copy(update={"intent": "hotel_info", "action": None, "exit_chat_after_ms": None})
    return response.model_copy(update={"type": "inform", "message": msg, "meta": meta})

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
    "pl": (
        "W sprawie pobytu i ogólnych rezerwacji recepcja wskaże najlepszą ścieżkę — zwróć się do zespołu osobiście."
    ),
    "ru": (
        "По вопросам проживания и общих бронирований ресепшн подскажет оптимальный маршрут — обратитесь к коллегам лично."
    ),
    "da": (
        "Ved ophold og generelle reservationer hjælper receptionen med den rette vej — få personlig assistance der."
    ),
    "nl": (
        "Voor verblijf en algemene reserveringen coördineert de receptie de juiste route — laat u persoonlijk helpen."
    ),
    "cs": (
        "U pobytu a obecných rezervací recepce doporučí nejvhodnější postup — obraťte se na ni osobně."
    ),
    "ro": (
        "Pentru sejur și rezervări generale, recepția coordonează cea mai bună cale — adresați-vă echipei personal."
    ),
    "sk": (
        "Pri pobyte a všeobecných rezerváciách recepcia nastaví najvhodnejší postup — obráťte sa na ňu osobne."
    ),
}
VOICE_SPA_BOOKING_HINT: dict[str, str] = {
    "tr": "Spa, masaj ve ücretli ritüeller için La Serenite Spa ekibiyle doğrudan görüşmenizi öneririm; resepsiyon da sessizce bağlayabilir. Otel içi sabit hat: 5025.",
    "en": "For spa, massage, and paid rituals, our La Serenite Spa hosts will refine every detail — reception can connect you discreetly. In-house line: 5025.",
    "de": "Für Spa, Massage und Anwendungen betreut Sie das La Serenite Spa persönlich — die Rezeption verbindet Sie auf Wunsch diskret. Hotel-Innenanschluss: 5025.",
    "pl": "W sprawie spa, masażu i płatnych rytuałów skontaktuj się z zespołem La Serenite Spa — recepcja może dyskretnie połączyć. Numer wewnętrzny hotelu: 5025.",
    "ru": "По вопросам спа, массажа и платных ритуалов обратитесь к команде La Serenite Spa; ресепшн при желании соединит дискретно. Внутренний номер: 5025.",
    "da": "Til spa, massage og betalende ritualer: kontakt La Serenite Spa — receptionen kan diskret sætte dig igennem. Hotellets interne nummer: 5025.",
    "nl": "Voor spa, massage en betaalde rituelen: neem contact op met La Serenite Spa — de receptie verbindt u desgewenst discreet. Huisnummer: 5025.",
    "cs": "Pro spa, masáže a placené rituály kontaktujte La Serenite Spa — recepce vás na přání nenápadně spojí. Vnitřní linka: 5025.",
    "ro": "Pentru spa, masaj și ritualuri plătite, adresați-vă echipei La Serenite Spa — recepția vă poate conecta discret. Linie internă: 5025.",
    "sk": "Pre spa, masáž a platené rituály kontaktujte La Serenite Spa — recepcia vás na žiadosť diskrétne spojí. Interná linka: 5025.",
}
VOICE_ALACARTE_RESERVATION_HINT: dict[str, str] = {
    "tr": "Ücretli à la carte masalar Misafir İlişkileri’nde özenle planlanır; doğrudan onlarla görüşmenizi rica ederim.",
    "en": "À la carte dining is curated by Guest Relations — please reach out to them directly for the finest tables.",
    "de": "À-la-carte-Tische koordiniert die Gästebetreuung mit besonderer Sorgfalt — wenden Sie sich bitte direkt dorthin.",
    "pl": "Stoliki à la carte organizuje Guest Relations — zwróć się do nich bezpośrednio w sprawie najlepszych miejsc.",
    "ru": "Столики à la carte курирует Guest Relations — для лучших мест обратитесь к ним напрямую.",
    "da": "À la carte-borde koordineres af Guest Relations — kontakt dem direkte for de fineste borde.",
    "nl": "À-la-carte-tafels worden door Guest Relations verzorgd — neem rechtstreeks contact op voor de mooiste plaatsen.",
    "cs": "À la carte stoly koordinuje Guest Relations — obraťte se na ně přímo ohledně nejlepších míst.",
    "ro": "Mese à la carte sunt coordonate de Guest Relations — contactați-i direct pentru cele mai bune locuri.",
    "sk": "Stoly à la carte koordinuje Guest Relations — obráťte sa na nich priamo ohľadom najlepších miest.",
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
        "Open the module with the button below.",
    ],
    "de": [
        "Sie können ihn über die Schaltfläche unten öffnen.",
        "Die Schaltfläche unten öffnet dieses Formular direkt.",
        "Öffnen Sie ihn über die Schaltfläche unten.",
        "Öffnen Sie das Modul über die Schaltfläche unten.",
    ],
    "pl": [
        "Możesz to otworzyć przyciskiem poniżej.",
        "Przycisk poniżej otwiera ten formularz bezpośrednio.",
        "Przycisk poniżej otwiera ten formularz od razu.",
        "Otwórz to przyciskiem poniżej.",
        "Przejdź przyciskiem poniżej.",
        "Otwórz moduł przyciskiem poniżej.",
    ],
    "ru": [
        "Кнопка ниже открывает эту форму напрямую.",
        "Кнопка ниже открывает форму напрямую.",
        "Откройте модуль кнопкой ниже.",
        "Откройте этот модуль кнопкой ниже.",
    ],
    "da": [
        "Knappen herunder åbner formularen direkte.",
        "Åbn modulet med knappen herunder.",
        "Brug knappen herunder til at åbne den.",
    ],
    "nl": [
        "De knop hieronder opent dit formulier direct.",
        "Open de module met de knop hieronder.",
        "Gebruik de knop hieronder om te openen.",
    ],
    "cs": [
        "Tlačítko níže otevře tento formulář přímo.",
        "Modul otevřete tlačítkem níže.",
        "Otevřete modul tlačítkem níže.",
    ],
    "ro": [
        "Butonul de mai jos deschide direct acest formular.",
        "Deschideți modulul cu butonul de mai jos.",
        "Folosiți butonul de mai jos pentru a deschide.",
    ],
    "sk": [
        "Tlačidlo nižšie otvorí tento formulár priamo.",
        "Modul otvoríte tlačidlom nižšie.",
        "Otvorte modul tlačidlom nižšie.",
    ],
}

# Dil-spesifik strip yoksa: oda servisi CTA satırları (tüm UI dilleri).
_VOICE_STRIP_ROOM_SERVICE_CTA_ANY_LANG: tuple[str, ...] = (
    "Откройте модуль кнопкой ниже.",
    "Åbn modulet med knappen herunder.",
    "Open de module met de knop hieronder.",
    "Modul otevřete tlačítkem níže.",
    "Deschideți modulul cu butonul de mai jos.",
    "Modul otvoríte tlačidlom nižšie.",
)

# Sadeleştirme tüm metni sildiyse TTS boş kalmasın.
VOICE_EMPTY_FALLBACK: dict[str, str] = {
    "tr": "Kısa bir kesinti oldu; yazılı sohbetten tekrar dener misiniz? Size yardımcı olmaktan memnuniyet duyarım.",
    "en": "A brief hiccup occurred — please try once more in text chat. I'm glad to assist you.",
    "de": "Kurze Unterbrechung — bitte versuchen Sie es im Textchat erneut. Ich helfe Ihnen gern weiter.",
    "pl": "Wystąpiła krótka przerwa — spróbuj ponownie w czacie tekstowym. Chętnie pomogę.",
    "ru": "Краткий сбой — повторите, пожалуйста, в текстовом чате. Рада помочь.",
    "da": "Et kort afbrud — prøv igen i tekstchatten. Jeg hjælper gerne.",
    "nl": "Korte storing — probeer het opnieuw in de tekstchat. Ik help u graag.",
    "cs": "Krátký výpadek — zkuste to prosím znovu v textovém chatu. Ráda pomohu.",
    "ro": "Întrerupere scurtă — încercați din nou în chatul text. Cu plăcere vă ajut.",
    "sk": "Krátka prerušenie — skúste to znova v textovom chate. Radi pomôžem.",
}


def sanitize_message_for_voice(text: str, lang: str) -> str:
    s = (text or "").strip()
    s = re.sub(r"\*\*([^*]+)\*\*", r"\1", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    lg = voice_dict_lang(lang)
    for phrase in _VOICE_STRIP_BY_LANG.get(lg, _VOICE_STRIP_BY_LANG["tr"]):
        s = s.replace(phrase, "").strip()
    # ru, da, … arayüzünde bazen İngilizce modül CTA’sı kalır; TTS’ten ikinci geçiş.
    if lg not in ("tr", "en", "de", "pl"):
        for phrase in _VOICE_STRIP_BY_LANG["en"]:
            s = s.replace(phrase, "").strip()
    for phrase in _VOICE_STRIP_ROOM_SERVICE_CTA_ANY_LANG:
        s = s.replace(phrase, "").strip()
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()


def finalize_voice_channel_response(response: ChatResponse, reply_lang: str) -> ChatResponse:
    """Sesli kanal çıkışı: söylenebilir metin, UI aksiyonları kaldırılır."""
    lg = voice_dict_lang(reply_lang)
    msg = sanitize_message_for_voice(response.message, reply_lang)
    if not msg.strip():
        msg = VOICE_EMPTY_FALLBACK.get(lg, VOICE_EMPTY_FALLBACK["tr"])
    meta = response.meta.model_copy(update={"action": None, "exit_chat_after_ms": None})
    return response.model_copy(update={"message": msg, "meta": meta})
