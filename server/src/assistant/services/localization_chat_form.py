"""Sohbet formu kısa metinleri — tüm UI dilleri (tr…sk). `localization_service.TRANSLATIONS` içine enjekte edilir."""

from __future__ import annotations

from typing import Any

# Kategori listesi başlığı (arıza / şikâyet adımı).
CHAT_FORM_CATEGORY_PROMPT_LEAD: dict[str, str] = {
    "tr": "Lütfen aşağıdan bir kategori seçiniz:",
    "en": "Please choose a category:",
    "de": "Bitte wählen Sie eine Kategorie:",
    "pl": "Proszę wybrać kategorię:",
    "da": "Vælg venligst en kategori:",
    "nl": "Kies een categorie:",
    "cs": "Vyberte prosím kategorii:",
    "ro": "Alegeți o categorie:",
    "sk": "Vyberte kategóriu:",
    "ru": "Выберите категорию:",
}

# Misafir bildirimi: grup başlıkları + numaralı seçim cümlesi.
GUEST_NOTIF_PROMPTS: dict[str, dict[str, str]] = {
    "tr": {
        "guest_notif_choose_lead_numbered": "Lütfen bir kategori seçiniz (numara ile yanıtlayın):\n",
        "guest_notif_head_diet": "Beslenme / hassasiyet:",
        "guest_notif_head_health": "Sağlık / özel durum:",
        "guest_notif_head_celebration": "Kutlama / özel gün:",
        "guest_notif_head_reception": "Ön büro / resepsiyon:",
    },
    "en": {
        "guest_notif_choose_lead_numbered": "Please choose a category (reply with the number):\n",
        "guest_notif_head_diet": "Diet / sensitivity:",
        "guest_notif_head_health": "Health / special situation:",
        "guest_notif_head_celebration": "Celebration / special occasion:",
        "guest_notif_head_reception": "Front desk / reception:",
    },
    "de": {
        "guest_notif_choose_lead_numbered": "Bitte wählen Sie eine Kategorie (Antwort mit Nummer):\n",
        "guest_notif_head_diet": "Ernährung / Unverträglichkeit:",
        "guest_notif_head_health": "Gesundheit / besondere Situation:",
        "guest_notif_head_celebration": "Feier / besonderer Anlass:",
        "guest_notif_head_reception": "Rezeption:",
    },
    "pl": {
        "guest_notif_choose_lead_numbered": "Wybierz kategorię (odpowiedz numerem):\n",
        "guest_notif_head_diet": "Dieta / wrażliwość:",
        "guest_notif_head_health": "Zdrowie / szczególna sytuacja:",
        "guest_notif_head_celebration": "Świętowanie / szczególna okazja:",
        "guest_notif_head_reception": "Recepcja:",
    },
    "da": {
        "guest_notif_choose_lead_numbered": "Vælg venligst en kategori (svar med nummeret):\n",
        "guest_notif_head_diet": "Kost / følsomhed:",
        "guest_notif_head_health": "Sundhed / særlig situation:",
        "guest_notif_head_celebration": "Fejring / særlig lejlighed:",
        "guest_notif_head_reception": "Reception:",
    },
    "nl": {
        "guest_notif_choose_lead_numbered": "Kies een categorie (antwoord met het nummer):\n",
        "guest_notif_head_diet": "Dieet / gevoeligheid:",
        "guest_notif_head_health": "Gezondheid / bijzondere situatie:",
        "guest_notif_head_celebration": "Feest / bijzondere gelegenheid:",
        "guest_notif_head_reception": "Receptie:",
    },
    "cs": {
        "guest_notif_choose_lead_numbered": "Vyberte prosím kategorii (odpovězte číslem):\n",
        "guest_notif_head_diet": "Strava / citlivost:",
        "guest_notif_head_health": "Zdraví / zvláštní situace:",
        "guest_notif_head_celebration": "Oslava / zvláštní příležitost:",
        "guest_notif_head_reception": "Recepce:",
    },
    "ro": {
        "guest_notif_choose_lead_numbered": "Alegeți o categorie (răspundeți cu numărul):\n",
        "guest_notif_head_diet": "Dietă / sensibilitate:",
        "guest_notif_head_health": "Sănătate / situație specială:",
        "guest_notif_head_celebration": "Sărbătoare / ocazie specială:",
        "guest_notif_head_reception": "Recepție:",
    },
    "sk": {
        "guest_notif_choose_lead_numbered": "Vyberte kategóriu (odpovedzte číslom):\n",
        "guest_notif_head_diet": "Strava / citlivosť:",
        "guest_notif_head_health": "Zdravie / špeciálna situácia:",
        "guest_notif_head_celebration": "Oslava / špeciálna príležitosť:",
        "guest_notif_head_reception": "Recepcia:",
    },
    "ru": {
        "guest_notif_choose_lead_numbered": "Выберите категорию (ответьте номером):\n",
        "guest_notif_head_diet": "Питание / чувствительность:",
        "guest_notif_head_health": "Здоровье / особая ситуация:",
        "guest_notif_head_celebration": "Праздник / особый случай:",
        "guest_notif_head_reception": "Ресепшн:",
    },
}

# İstek sohbet formu: kategori listesinden önceki giriş paragrafı (uygulama İstekler sekmesiyle uyumlu).
REQUEST_CATEGORY_PROMPT_LEAD: dict[str, str] = {
    "tr": (
        "Lütfen talep türünü seçiniz (numara ile yanıtlayın). "
        "İsterseniz tür adını da yazabilirsiniz (ör. bornoz, yastık). "
        "Gruplar uygulamadaki İstekler sekmesiyle aynıdır:\n\n"
    ),
    "en": (
        "Please choose a request type (reply with the number). "
        "You may also type the item name (e.g. bathrobe, pillow). "
        "Groups match the Requests tab in the app:\n\n"
    ),
    "de": (
        "Bitte wählen Sie eine Art der Anfrage (Antwort mit Nummer). "
        "Sie können auch den Namen nennen (z. B. Bademantel, Kissen). "
        "Die Gruppen entsprechen dem Reiter «Anfragen» in der App:\n\n"
    ),
    "pl": (
        "Wybierz rodzaj prośby (odpowiedz numerem). "
        "Możesz napisać nazwę (np. szlafrok, poduszka). "
        "Grupy odpowiadają zakładce „Prośby” w aplikacji:\n\n"
    ),
    "da": (
        "Vælg venligst en type forespørgsel (svar med nummeret). "
        "Du kan også skrive navnet (f.eks. badekåbe, pude). "
        "Grupperne svarer til fanen «Forespørgsler» i appen:\n\n"
    ),
    "nl": (
        "Kies een type verzoek (antwoord met het nummer). "
        "U kunt ook de naam typen (bijv. badjas, kussen). "
        "De groepen komen overeen met het tabblad «Verzoeken» in de app:\n\n"
    ),
    "cs": (
        "Vyberte typ požadavku (odpovězte číslem). "
        "Můžete také napsat název (např. župan, polštář). "
        "Skupiny odpovídají záložce «Požadavky» v aplikaci:\n\n"
    ),
    "ro": (
        "Alegeți tipul cererii (răspundeți cu numărul). "
        "Puteți scrie și numele (ex. halat de baie, pernă). "
        "Grupurile corespund filei «Cereri» din aplicație:\n\n"
    ),
    "sk": (
        "Vyberte typ požiadavky (odpovedzte číslom). "
        "Môžete napísať aj názov (napr. župan, vankúš). "
        "Skupiny zodpovedajú karte «Požiadavky» v aplikácii:\n\n"
    ),
    "ru": (
        "Выберите тип запроса (ответьте номером). "
        "Можно также написать название (например, халат, подушка). "
        "Группы соответствуют вкладке «Запросы» в приложении:\n\n"
    ),
}

# İstek sohbet formu — önce bölüm (requestSections); numaralı yanıt.
CHAT_FORM_REQUEST_SECTION_PROMPT_LEAD: dict[str, str] = {
    "tr": (
        "Lütfen önce talep grubunu seçiniz (numara ile yanıtlayın). "
        "İsterseniz doğrudan ürün adını da yazabilirsiniz (ör. terlik, ek yatak). "
        "Gruplar uygulamadaki İstekler sekmesiyle aynıdır:\n\n"
    ),
    "en": (
        "Please first choose a request group (reply with the number). "
        "You may also type the item directly (e.g. slippers, extra bed). "
        "Groups match the Requests tab in the app:\n\n"
    ),
    "de": (
        "Bitte wählen Sie zuerst eine Anfragengruppe (Antwort mit Nummer). "
        "Sie können auch direkt den Artikel nennen (z. B. Hausschuhe, Zustellbett). "
        "Die Gruppen entsprechen dem Reiter «Anfragen» in der App:\n\n"
    ),
    "pl": (
        "Najpierw wybierz grupę prośby (odpowiedz numerem). "
        "Możesz też od razu wpisać nazwę (np. kapcie, dostawka). "
        "Grupy odpowiadają zakładce „Prośby” w aplikacji:\n\n"
    ),
    "da": (
        "Vælg først en forespørgselsgruppe (svar med nummeret). "
        "Du kan også skrive varen direkte (f.eks. hjemmesko, ekstra seng). "
        "Grupperne svarer til fanen «Forespørgsler» i appen:\n\n"
    ),
    "nl": (
        "Kies eerst een aanvraaggroep (antwoord met het nummer). "
        "U kunt ook direct de naam van het item typen (bijv. pantoffels, extra bed). "
        "De groepen komen overeen met het tabblad «Verzoeken» in de app:\n\n"
    ),
    "cs": (
        "Nejprve vyberte skupinu požadavků (odpovězte číslem). "
        "Můžete také přímo napsat název položky (např. přezůvky, přistýlka). "
        "Skupiny odpovídají záložce «Požadavky» v aplikaci:\n\n"
    ),
    "ro": (
        "Alegeți mai întâi grupul cererii (răspundeți cu numărul). "
        "Puteți scrie și direct articolul (ex. papuci de casă, pat suplimentar). "
        "Grupurile corespund filei «Cereri» din aplicație:\n\n"
    ),
    "sk": (
        "Najprv vyberte skupinu požiadavky (odpovedzte číslom). "
        "Môžete napísať aj priamo názov položky (napr. papuče, prístelok). "
        "Skupiny zodpovedajú karte «Požiadavky» v aplikácii:\n\n"
    ),
    "ru": (
        "Сначала выберите группу запроса (ответьте номером). "
        "Можно сразу написать название (например, тапочки, дополнительная кровать). "
        "Группы соответствуют вкладке «Запросы» в приложении:\n\n"
    ),
}

# Arıza sohbet formu — önce teknik bölüm (faultSections).
CHAT_FORM_FAULT_SECTION_PROMPT_LEAD: dict[str, str] = {
    "tr": (
        "Lütfen önce arıza grubunu seçiniz (numara ile yanıtlayın). "
        "İsterseniz arıza türünü doğrudan yazarak da ilerleyebilirsiniz. "
        "Gruplar uygulamadaki Arıza bölümüyle aynıdır:\n\n"
    ),
    "en": (
        "Please first choose a fault group (reply with the number). "
        "You may also describe the fault type in your own words. "
        "Groups match the fault section in the app:\n\n"
    ),
    "de": (
        "Bitte wählen Sie zuerst eine Störungsgruppe (Antwort mit Nummer). "
        "Sie können die Störung auch direkt beschreiben. "
        "Die Gruppen entsprechen dem Bereich «Störung» in der App:\n\n"
    ),
    "pl": (
        "Najpierw wybierz grupę awarii (odpowiedz numerem). "
        "Możesz też od razu opisać usterkę. "
        "Grupy odpowiadają sekcji awarii w aplikacji:\n\n"
    ),
    "da": (
        "Vælg først en fejlgruppe (svar med nummeret). "
        "Du kan også beskrive fejlen med egne ord. "
        "Grupperne svarer til fejlsektionen i appen:\n\n"
    ),
    "nl": (
        "Kies eerst een storingsgroep (antwoord met het nummer). "
        "U kunt de storing ook direct beschrijven. "
        "De groepen komen overeen met de storingssectie in de app:\n\n"
    ),
    "cs": (
        "Nejprve vyberte skupinu závady (odpovězte číslem). "
        "Závadu můžete také popsat vlastními slovy. "
        "Skupiny odpovídají části závad v aplikaci:\n\n"
    ),
    "ro": (
        "Alegeți mai întâi grupul defecțiunii (răspundeți cu numărul). "
        "Puteți descrie și direct defecțiunea. "
        "Grupurile corespund secțiunii de defecțiuni din aplicație:\n\n"
    ),
    "sk": (
        "Najprv vyberte skupinu poruchy (odpovedzte číslom). "
        "Poruchu môžete opísať aj priamo. "
        "Skupiny zodpovedajú časti porúch v aplikácii:\n\n"
    ),
    "ru": (
        "Сначала выберите группу неисправности (ответьте номером). "
        "Можно сразу описать тип поломки. "
        "Группы соответствуют разделу неисправностей в приложении:\n\n"
    ),
}

# Onay özeti: açıklama yok / yalnızca tire vb.
CHAT_FORM_CONFIRM_DESCRIPTION_EMPTY: dict[str, str] = {
    "tr": "Ek not yok",
    "en": "No extra note",
    "de": "Keine Zusatznotiz",
    "pl": "Bez dodatkowej notatki",
    "da": "Ingen ekstra note",
    "nl": "Geen extra opmerking",
    "cs": "Bez další poznámky",
    "ro": "Fără notă suplimentară",
    "sk": "Bez dodatočnej poznámky",
    "ru": "Без дополнительной заметки",
}

# Misafir bildirimi — açıklama adımı (zorunlu / isteğe bağlı).
GUEST_NOTIF_DESCRIPTION: dict[str, dict[str, str]] = {
    "tr": {
        "required": "Bu konu için kısa bir açıklama yazmanız gerekir (zorunlu).",
        "optional": (
            "İsteğe bağlı: ekip için ek not ekleyebilirsiniz. Eklemeyecekseniz “-” veya “yok” yazın; "
            "sohbetteki ilk mesajınız da bağlam olarak kullanılabilir. "
            "Tüm bildirimi iptal etmek için «iptal», «formu iptal» veya «talebi iptal et» yazın — «yok» yalnızca ek not istemediğinizi belirtir."
        ),
    },
    "en": {
        "required": "Please write a short description for this notice category (required).",
        "optional": (
            "Optional: add any details for the team. If you have nothing to add, reply with “-” or “no”; "
            "your first message in this chat may also be kept as context. "
            "To cancel the whole notice, type “cancel form” or “cancel”—“no” here only means no extra note."
        ),
    },
    "de": {
        "required": "Bitte eine kurze Beschreibung zu dieser Kategorie (erforderlich).",
        "optional": (
            "Optional: ergänzen Sie Details. Wenn nichts hinzukommt, antworten Sie mit „-“ oder „nein“; "
            "Ihre erste Nachricht in diesem Chat kann als Kontext dienen. "
            "Um die ganze Meldung abzubrechen, schreiben Sie „Abbrechen“ oder „Formular abbrechen“ — „nein“ bedeutet hier nur keine Zusatznotiz."
        ),
    },
    "pl": {
        "required": "Proszę krótko opisać wybraną kategorię (wymagane).",
        "optional": (
            "Możesz dodać szczegóły. Jeśli nie ma nic do dodania, odpowiedz „-” lub „nie”; "
            "pierwsza wiadomość w tym czacie może też służyć jako kontekst. "
            "Aby anulować całe zgłoszenie, napisz „anuluj formularz” lub „anuluj” — „nie” oznacza tu tylko brak dodatkowej notatki."
        ),
    },
    "da": {
        "required": "Skriv venligst en kort beskrivelse for denne kategori (påkrævet).",
        "optional": (
            "Valgfrit: tilføj detaljer til teamet. Hvis du ikke har noget at tilføje, svar med «-» eller «nej»; "
            "din første besked i chatten kan også bruges som kontekst. "
            "For at annullere hele meddelelsen skriv «annuller» eller «afbryd formularen» — «nej» betyder her kun ingen ekstra note."
        ),
    },
    "nl": {
        "required": "Schrijf een korte omschrijving voor deze categorie (verplicht).",
        "optional": (
            "Optioneel: voeg details toe voor het team. Als u niets wilt toevoegen, antwoord met «-» of «nee»; "
            "uw eerste bericht in deze chat kan ook als context worden gebruikt. "
            "Annuleer de volledige melding met «annuleren» of «formulier annuleren» — «nee» betekent hier alleen geen extra opmerking."
        ),
    },
    "cs": {
        "required": "Napište prosím krátký popis této kategorie (povinné).",
        "optional": (
            "Volitelné: doplňte podrobnosti pro tým. Pokud nic nepřidáváte, odpovězte «-» nebo «ne»; "
            "vaše první zpráva v tomto chatu může sloužit jako kontext. "
            "Pro zrušení celého oznámení napište «zrušit» nebo «zrušit formulář» — «ne» zde znamená jen žádnou dodatečnou poznámku."
        ),
    },
    "ro": {
        "required": "Vă rugăm să scrieți o scurtă descriere pentru această categorie (obligatoriu).",
        "optional": (
            "Opțional: adăugați detalii pentru echipă. Dacă nu aveți nimic de adăugat, răspundeți cu «-» sau «nu»; "
            "primul mesaj din acest chat poate servi și ca context. "
            "Pentru a anula întregul mesaj scrieți «anulare» sau «anulează formularul» — «nu» înseamnă aici doar fără notă suplimentară."
        ),
    },
    "sk": {
        "required": "Napíšte prosím krátky popis tejto kategórie (povinné).",
        "optional": (
            "Voliteľné: doplňte podrobnosti pre tím. Ak nič nepridávate, odpovedzte «-» alebo «nie»; "
            "vaša prvá správa v tomto chate môže slúžiť ako kontext. "
            "Zrušiť celé oznámenie môžete slovami «zrušiť» alebo «zrušiť formulár» — «nie» tu znamená len bez dodatočnej poznámky."
        ),
    },
    "ru": {
        "required": "Пожалуйста, кратко опишите выбранную категорию (обязательно).",
        "optional": (
            "По желанию: добавьте детали для команды. Если добавлять нечего, ответьте «-» или «нет»; "
            "ваше первое сообщение в этом чате также может использоваться как контекст. "
            "Чтобы отменить всё уведомление, напишите «отмена» или «отменить форму» — «нет» здесь означает только отсутствие дополнительной заметки."
        ),
    },
}


def inject_chat_form_strings(translations: dict[str, dict[str, Any]]) -> None:
    for lang, lead in CHAT_FORM_CATEGORY_PROMPT_LEAD.items():
        if lang in translations:
            translations[lang]["chat_form_category_prompt_lead"] = lead
    for lang, text in CHAT_FORM_REQUEST_SECTION_PROMPT_LEAD.items():
        if lang in translations:
            translations[lang]["chat_form_request_section_prompt_lead"] = text
    for lang, text in CHAT_FORM_FAULT_SECTION_PROMPT_LEAD.items():
        if lang in translations:
            translations[lang]["chat_form_fault_section_prompt_lead"] = text
    for lang, text in CHAT_FORM_CONFIRM_DESCRIPTION_EMPTY.items():
        if lang in translations:
            translations[lang]["chat_form_confirm_description_empty"] = text
    for lang, text in REQUEST_CATEGORY_PROMPT_LEAD.items():
        if lang in translations:
            translations[lang]["chat_request_category_prompt_lead"] = text
    for lang, pair in GUEST_NOTIF_DESCRIPTION.items():
        if lang not in translations:
            continue
        translations[lang]["guest_notif_description_required"] = pair["required"]
        translations[lang]["guest_notif_description_optional"] = pair["optional"]
    for lang, pack in GUEST_NOTIF_PROMPTS.items():
        if lang not in translations:
            continue
        translations[lang].update(pack)
